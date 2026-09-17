import { LEVELS } from './difficulty';
import { MAX_STARS } from './scoring';
import { recordFor, type LevelRecord } from '@/state/useProgress';

/**
 * The closing card after the hundredth needle. It is scored on the player's
 * best records, not on the last run, so replaying a level to a better time
 * moves the rank the next time the card opens.
 */

export type Rank = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface FinaleSummary {
  levelsDone: number;
  levelsTotal: number;
  stars: number;
  starsTotal: number;
  /** Sum of best times across finished levels, in milliseconds. */
  totalMs: number;
  attempts: number;
  /** Levels finished on the first try. */
  firstTries: number;
  rank: Rank;
  /** The one line under the card. */
  verdict: string;
}

const RANK_FLOOR: readonly [Rank, number][] = [
  ['S+', 1],
  ['S', 0.95],
  ['A', 0.85],
  ['B', 0.7],
  ['C', 0.5],
  ['D', 0],
];

const VERDICT: Record<Rank, string> = {
  'S+': 'Not a straw out of place.',
  S: 'The pile never stood a chance.',
  A: 'Sharp eyes, steady hands.',
  B: 'Every needle found.',
  C: 'Found them all. Some took a while.',
  D: 'A hundred needles, one at a time.',
};

export function rankFor(stars: number, starsTotal: number): Rank {
  const share = starsTotal > 0 ? stars / starsTotal : 0;
  return RANK_FLOOR.find(([, floor]) => share >= floor)?.[0] ?? 'D';
}

export function summarise(records: Record<number, LevelRecord>): FinaleSummary {
  let levelsDone = 0;
  let stars = 0;
  let totalMs = 0;
  let attempts = 0;
  let firstTries = 0;
  for (const level of LEVELS) {
    const record = recordFor(records, level.id);
    attempts += record.attempts;
    if (record.bestStars > 0) {
      levelsDone += 1;
      stars += record.bestStars;
      totalMs += Number.isFinite(record.bestTime) ? record.bestTime * 1000 : 0;
      if (record.attempts <= 1) {
        firstTries += 1;
      }
    }
  }
  const starsTotal = LEVELS.length * MAX_STARS;
  const rank = rankFor(stars, starsTotal);
  return {
    levelsDone,
    levelsTotal: LEVELS.length,
    stars,
    starsTotal,
    totalMs,
    attempts,
    firstTries,
    rank,
    verdict: VERDICT[rank],
  };
}

/** h:mm:ss for the whole hundred; the tenths that matter per level do not here. */
export function formatDuration(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}
