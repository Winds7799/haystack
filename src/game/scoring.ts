import { HINT_COST_OF_PAR } from '@/state/useRun';
import type { LevelConfig } from './difficulty';

export const MAX_STARS = 3;
/** A hint answers most of the level, so it costs the third star outright. */
export const STARS_WITH_HINT = 2;

export function starsFor(config: LevelConfig, seconds: number, hintUsed: boolean): number {
  const [three, two] = config.par;
  const earned = seconds <= three ? 3 : seconds <= two ? 2 : 1;
  return hintUsed ? Math.min(earned, STARS_WITH_HINT) : earned;
}

/** m:ss.t — monospaced digits, so nothing shifts as the clock runs. */
export function formatTime(milliseconds: number): string {
  const total = Math.max(0, milliseconds);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

/** "2.4s faster than your best", or null when there is nothing to compare to. */
export function comparedToBest(seconds: number, best: number): string | null {
  if (!Number.isFinite(best)) {
    return null;
  }
  const delta = best - seconds;
  if (Math.abs(delta) < 0.05) {
    return 'the same as your best';
  }
  const size = Math.abs(delta).toFixed(1);
  return delta > 0 ? `${size}s faster than your best` : `${size}s slower than your best`;
}

/** What one hint adds to the clock on this level, in milliseconds. */
export function hintPenaltyFor(config: LevelConfig): number {
  return Math.round(config.par[0] * HINT_COST_OF_PAR) * 1000;
}
