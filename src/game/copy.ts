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

/** What to look for, and what gives each one away. Shown once, on first sight. */
export const KIND_BLURB: Record<ObjectKind, { title: string; tell: string }> = {
  needle: { title: 'Needle', tell: 'What you are looking for. The eye near the blunt end is the only sure sign.' },
  nail: { title: 'Nail', tell: 'A flat head instead of an eye, and thicker through the shaft.' },
  pin: { title: 'Pin', tell: 'A round bead where a needle has its eye. Thinner, and shorter.' },
  wire: { title: 'Wire', tell: 'Bent along its length, and cut square at both ends. Never tapers.' },
  splinter: { title: 'Splinter', tell: 'Wood, not steel. Ragged edges and no straight line anywhere.' },
  staple: { title: 'Staple', tell: 'Two legs off one bridge. Nothing else on the board turns a corner.' },
  brokenNeedle: { title: 'Broken needle', tell: 'A needle with the eye snapped off. Shorter, and the butt is jagged rather than round.' },
};
