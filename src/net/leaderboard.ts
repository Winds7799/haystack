import Constants from 'expo-constants';

/**
 * The leaderboard talks to Supabase over plain REST. No SDK: the whole surface
 * is two requests, and a client library would cost more than it saves.
 *
 * The anon key is meant to be public — row level security is what protects the
 * table, not the secrecy of this string.
 */

export interface Score {
  name: string;
  level: number;
  seconds: number;
  stars: number;
  hintUsed: boolean;
}

export interface Standing extends Score {
  rank: number;
}

interface Config {
  url: string;
  key: string;
}

function readConfig(): Config | null {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const url = typeof extra?.supabaseUrl === 'string' ? extra.supabaseUrl : '';
  const key = typeof extra?.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '';
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

/** False until the project is pointed at a Supabase instance. */
export function leaderboardReady(): boolean {
  return readConfig() !== null;
}

/** How long any leaderboard request may take before the game gives up on it. */
const TIMEOUT = 8000;

async function call(path: string, init: RequestInit): Promise<Response> {
  const config = readConfig();
  if (!config) {
    throw new Error('The leaderboard is not configured.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw new Error(await describe(response));
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function describe(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `The leaderboard replied ${response.status}.`;
  } catch {
    return `The leaderboard replied ${response.status}.`;
  }
}

/**
 * The fastest times on one level, best first.
 *
 * Deliberately does not select `player`. That id is the only thing standing
 * between a row and anyone who wants to overwrite it, so it never leaves the
 * device that owns it. Your own standing comes from `fetchMine` instead.
 */
export async function fetchBoard(level: number, limit = 50): Promise<Standing[]> {
  const query = new URLSearchParams({
    select: 'name,seconds,stars,hint_used',
    level: `eq.${level}`,
    order: 'seconds.asc',
    limit: String(limit),
  });
  const response = await call(`scores?${query}`, { method: 'GET' });
  const rows = (await response.json()) as {
    name: string;
    seconds: string | number;
    stars: number;
    hint_used: boolean;
  }[];
  return rows.map((row, index) => ({
    rank: index + 1,
    name: row.name,
    level,
    seconds: Number(row.seconds),
    stars: row.stars,
    hintUsed: row.hint_used,
  }));
}

/** This device's own entry on a level, if it has posted one. */
export async function fetchMine(level: number, player: string): Promise<Score | null> {
  const query = new URLSearchParams({
    select: 'name,seconds,stars,hint_used',
    level: `eq.${level}`,
    player: `eq.${player}`,
    limit: '1',
  });
  const response = await call(`scores?${query}`, { method: 'GET' });
  const rows = (await response.json()) as {
    name: string;
    seconds: string | number;
    stars: number;
    hint_used: boolean;
  }[];
  const row = rows[0];
  return row
    ? { name: row.name, level, seconds: Number(row.seconds), stars: row.stars, hintUsed: row.hint_used }
    : null;
}

/** Erases everything this device has posted. Required, not a courtesy. */
export async function deleteMyScores(player: string): Promise<void> {
  await call(`scores?player=eq.${encodeURIComponent(player)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

/** Flags a display name for review. */
export async function reportName(name: string, level: number, reason: string): Promise<void> {
  await call('reports', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{ reported_name: name, level, reason }]),
  });
}

/** How many players are faster than a given time on a level. */
export async function fetchRank(level: number, seconds: number): Promise<number> {
  const query = new URLSearchParams({
    select: 'player',
    level: `eq.${level}`,
    seconds: `lt.${seconds}`,
  });
  const response = await call(`scores?${query}`, {
    method: 'GET',
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const range = response.headers.get('content-range');
  const total = range ? Number(range.split('/')[1]) : Number.NaN;
  return Number.isFinite(total) ? total + 1 : 0;
}

/**
 * Records a finish. One row per player per level, and it only ever moves
 * downwards — a slower run leaves a standing best alone.
 */
export async function submitScore(player: string, score: Score): Promise<void> {
  await call('scores?on_conflict=player,level', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([
      {
        player,
        name: score.name,
        level: score.level,
        seconds: Number(score.seconds.toFixed(2)),
        stars: score.stars,
        hint_used: score.hintUsed,
      },
    ]),
  });
}
