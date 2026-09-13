import { create } from 'zustand';
import type { ObjectKind } from '@/game/types';

export type RunStatus = 'playing' | 'paused' | 'won';

/** What a miss costs, in milliseconds. */
export const MISS_PENALTY = 5000;

/**
 * What a hint costs, as a share of the level's three-star par. A flat ten
 * seconds was nothing on a five-minute level and everything on a twenty-second
 * one; a quarter of par bites the same everywhere and bites harder the deeper
 * you go, which is the escalation without ever taking hints away.
 */
export const HINT_COST_OF_PAR = 0.25;

/**
 * Hints a level allows without the purchase. One is enough to be rescued once
 * and not enough to lean on, which is what leaves something worth buying. The
 * purchase lifts this cap and nothing else — every hint still costs time and
 * the third star, so the leaderboard stays honest.
 */
export const FREE_HINTS = 1;
/** How long the hint halo stays on the board. */
export const HINT_DURATION = 1500;

export interface Miss {
  /** null when the tap landed on nothing but straw. */
  kind: ObjectKind | null;
  /** Bumped on every miss so repeats of the same kind still show a toast. */
  serial: number;
}

interface RunState {
  levelId: number;
  attempt: number;
  status: RunStatus;
  /** Milliseconds banked from earlier segments of this run. */
  banked: number;
  /** When the running segment started, or null while the clock is stopped. */
  since: number | null;
  /** Milliseconds added by misses and hints. */
  penalty: number;
  misses: number;
  /** How many hints this run has taken. Any at all caps the level at two stars. */
  hints: number;
  /** When the hint halo should disappear, or null when no hint is showing. */
  hintUntil: number | null;
  lastMiss: Miss | null;
  finishedAt: number | null;
  /** Indices into the board's object list, for needles already found. */
  found: readonly number[];

  begin: (levelId: number, attempt: number) => void;
  pause: () => void;
  resume: () => void;
  miss: (kind: ObjectKind | null) => void;
  markFound: (index: number) => void;
  takeHint: (penaltyMs: number) => void;
  win: () => void;
}

function stop(state: RunState): { banked: number; since: null } {
  return {
    banked: state.banked + (state.since === null ? 0 : Date.now() - state.since),
    since: null,
  };
}

export const useRun = create<RunState>()((set, get) => ({
  levelId: 0,
  attempt: 1,
  status: 'playing',
  banked: 0,
  since: null,
  penalty: 0,
  misses: 0,
  hints: 0,
  hintUntil: null,
  lastMiss: null,
  finishedAt: null,
  found: [],

  begin: (levelId, attempt) =>
    set({
      levelId,
      attempt,
      status: 'playing',
      banked: 0,
      since: Date.now(),
      penalty: 0,
      misses: 0,
      hints: 0,
      hintUntil: null,
      lastMiss: null,
      finishedAt: null,
      found: [],
    }),

  pause: () => {
    const state = get();
    if (state.status !== 'playing') {
      return;
    }
    set({ ...stop(state), status: 'paused', hintUntil: null });
  },

  resume: () => {
    if (get().status !== 'paused') {
      return;
    }
    set({ status: 'playing', since: Date.now() });
  },

  miss: (kind) =>
    set((state) =>
      state.status !== 'playing'
        ? state
        : {
            misses: state.misses + 1,
            penalty: state.penalty + MISS_PENALTY,
            lastMiss: { kind, serial: (state.lastMiss?.serial ?? 0) + 1 },
          }
    ),

  markFound: (index) =>
    set((state) =>
      state.status !== 'playing' || state.found.includes(index)
        ? state
        : { found: [...state.found, index] }
    ),

  takeHint: (penaltyMs) =>
    set((state) =>
      state.status !== 'playing'
        ? state
        : {
            hints: state.hints + 1,
            penalty: state.penalty + penaltyMs,
            hintUntil: Date.now() + HINT_DURATION,
          }
    ),

  win: () => {
    const state = get();
    if (state.status !== 'playing') {
      return;
    }
    set({ ...stop(state), status: 'won', hintUntil: null, finishedAt: Date.now() });
  },
}));

/** Total elapsed milliseconds, penalties included. */
export function elapsedOf(state: RunState): number {
  const running = state.since === null ? 0 : Date.now() - state.since;
  return state.banked + running + state.penalty;
}

export function readElapsed(): number {
  return elapsedOf(useRun.getState());
}
