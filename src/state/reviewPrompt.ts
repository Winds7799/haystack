import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from './storage';

/**
 * The note that asks for a store rating. It waits until five levels are
 * cleared, asks at most three times, and stops for good once the player has
 * gone to the store or asked not to be asked. Nobody can tell whether a
 * rating was really left, so opening the store counts as the answer.
 */

/** Cleared levels before the first ask, by the game's own count. */
const FIRST_ASK = 5;
/** How many more cleared levels "Not now" waits for. */
const ASK_AGAIN = 5;
const MOST_SHOWINGS = 3;

interface ReviewPromptState {
  /** Levels cleared for the first time since the note last showed. */
  clearedSinceShown: number;
  /** Times the note has been shown, answered or not. */
  shown: number;
  /** Gone to rate, or asked never to be asked. Either way, the end of it. */
  done: boolean;
  /** Cleared levels the next showing waits for. */
  nextAt: number;
  /** A level was cleared for the first time. */
  countClear: () => void;
  markShown: () => void;
  askLater: () => void;
  stopAsking: () => void;
}

export const useReviewPrompt = create<ReviewPromptState>()(
  persist(
    (set) => ({
      clearedSinceShown: 0,
      shown: 0,
      done: false,
      nextAt: FIRST_ASK,
      countClear: () => set((state) => ({ clearedSinceShown: state.clearedSinceShown + 1 })),
      markShown: () => set((state) => ({ shown: state.shown + 1, clearedSinceShown: 0 })),
      askLater: () => set({ nextAt: ASK_AGAIN }),
      stopAsking: () => set({ done: true }),
    }),
    {
      name: 'reviewPrompt',
      storage: createJSONStorage(() => deviceStorage),
      partialize: ({ clearedSinceShown, shown, done, nextAt }) =>
        ({ clearedSinceShown, shown, done, nextAt }) as Partial<ReviewPromptState>,
    }
  )
);

/**
 * Whether the note should open over these results. The first ask goes by the
 * game's own count of cleared levels, so a player already deep in the pile
 * when this arrived is not made to clear five more; every later ask counts
 * from the showing before it.
 */
export function reviewDue(cleared: number): boolean {
  const { clearedSinceShown, shown, done, nextAt } = useReviewPrompt.getState();
  if (done || shown >= MOST_SHOWINGS) {
    return false;
  }
  return (shown === 0 ? cleared : clearedSinceShown) >= nextAt;
}
