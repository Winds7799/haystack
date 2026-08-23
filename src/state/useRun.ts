import { create } from 'zustand';
import type { ObjectKind } from '@/game/types';

export type RunStatus = 'playing' | 'paused' | 'won';

/** What a miss costs, and what a hint costs, in milliseconds. */
export const MISS_PENALTY = 5000;
export const HINT_PENALTY = 15000;
/** How long the hint halo stays on the board. */
export const HINT_DURATION = 2000;

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
  hintUsed: boolean;
  /** When the hint halo should disappear, or null when no hint is showing. */
  hintUntil: number | null;
  lastMiss: Miss | null;
  finishedAt: number | null;

  begin: (levelId: number, attempt: number) => void;
  pause: () => void;
  resume: () => void;
  miss: (kind: ObjectKind | null) => void;
  takeHint: () => void;
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
  hintUsed: false,
  hintUntil: null,
  lastMiss: null,
  finishedAt: null,

  begin: (levelId, attempt) =>
    set({
      levelId,
      attempt,
      status: 'playing',
      banked: 0,
      since: Date.now(),
      penalty: 0,
      misses: 0,
      hintUsed: false,
      hintUntil: null,
      lastMiss: null,
      finishedAt: null,
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

  takeHint: () =>
    set((state) =>
      state.status !== 'playing' || state.hintUsed
        ? state
        : {
            hintUsed: true,
            penalty: state.penalty + HINT_PENALTY,
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
