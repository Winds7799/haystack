import { MISS_PENALTY } from '@/state/useRun';
import type { ObjectKind } from './types';

const NAMES: Record<ObjectKind, string> = {
  needle: 'a needle',
  nail: 'a nail',
  pin: 'a pin',
  wire: 'a piece of wire',
  splinter: 'a splinter',
  staple: 'a staple',
  brokenNeedle: 'a needle with no eye',
};

/** Names what the player hit and what it cost. Dry, never scolding. */
export function missMessage(kind: ObjectKind | null): string {
  const cost = `+${MISS_PENALTY / 1000}s`;
  return kind === null ? `just straw — ${cost}` : `that’s ${NAMES[kind]} — ${cost}`;
}

/** Twin levels: how many needles are still out there. */
export function progressMessage(found: number, total: number): string {
  const left = total - found;
  return left === 1 ? 'one found, one to go' : `${found} found, ${left} to go`;
}
