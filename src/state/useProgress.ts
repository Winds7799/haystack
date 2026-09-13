import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from './storage';

export interface LevelRecord {
  /** Best finish, in seconds, penalties included. */
  bestTime: number;
  bestStars: number;
  /** Every start counts, finished or not. */
  attempts: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  /** Mirrors the game chrome, so the hint and pause buttons fall under a left thumb. */
  leftHanded: boolean;
  /** Gives decoys shape emphasis rather than relying on colour alone. */
  colourBlindSafe: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  reducedMotion: false,
  leftHanded: false,
  colourBlindSafe: false,
};

interface ProgressState {
  records: Record<number, LevelRecord>;
  settings: Settings;
  /** Set once how-to-play has been seen, so it only opens itself once. */
  seenTutorial: boolean;
  /** The one purchase. Written only when the store confirms it. */
  unlimitedHints: boolean;
  /** Decoy kinds already introduced, so each is shown exactly once. */
  seenKinds: string[];
  /** Reading from disk is asynchronous; until this is true, records are unknown. */
  hydrated: boolean;
  beginAttempt: (levelId: number) => void;
  recordFinish: (levelId: number, seconds: number, stars: number) => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  markTutorialSeen: () => void;
  grantUnlimitedHints: () => void;
  markKindsSeen: (kinds: readonly string[]) => void;
  reset: () => void;
}

const EMPTY: LevelRecord = { bestTime: Number.POSITIVE_INFINITY, bestStars: 0, attempts: 0 };

export function recordFor(records: Record<number, LevelRecord>, levelId: number): LevelRecord {
  return records[levelId] ?? EMPTY;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      records: {},
      settings: DEFAULT_SETTINGS,
      seenTutorial: false,
      unlimitedHints: false,
      seenKinds: [],
      hydrated: false,
      beginAttempt: (levelId) =>
        set((state) => {
          const record = recordFor(state.records, levelId);
          return {
            records: { ...state.records, [levelId]: { ...record, attempts: record.attempts + 1 } },
          };
        }),
      recordFinish: (levelId, seconds, stars) =>
        set((state) => {
          const record = recordFor(state.records, levelId);
          return {
            records: {
              ...state.records,
              [levelId]: {
                attempts: record.attempts,
                bestTime: Math.min(record.bestTime, seconds),
                bestStars: Math.max(record.bestStars, stars),
              },
            },
          };
        }),
      set: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
      markTutorialSeen: () => set({ seenTutorial: true }),
      grantUnlimitedHints: () => set({ unlimitedHints: true }),
      markKindsSeen: (kinds) =>
        set((state) => ({ seenKinds: [...new Set([...state.seenKinds, ...kinds])] })),
      reset: () => set({ records: {}, seenKinds: [] }),
    }),
    {
      name: 'progress',
      storage: createJSONStorage(() => deviceStorage),
      partialize: ({ records, settings, seenTutorial, seenKinds }) => ({ records, settings, seenTutorial, seenKinds }) as Partial<ProgressState>,
      onRehydrateStorage: () => () => {
        useProgress.setState({ hydrated: true });
      },
    }
  )
);

/**
 * Finishing a level opens the next one. Failing the same level four times also
 * opens the next one: being stuck is not a reason to be locked out.
 */
export const MERCY_ATTEMPTS = 4;

export function isUnlocked(
  records: Record<number, LevelRecord>,
  levelId: number,
  firstLevel: number
): boolean {
  if (levelId <= firstLevel) {
    return true;
  }
  const previous = recordFor(records, levelId - 1);
  return previous.bestStars > 0 || previous.attempts >= MERCY_ATTEMPTS;
}
