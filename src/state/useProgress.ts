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
  reducedMotion: boolean;
}

interface ProgressState {
  records: Record<number, LevelRecord>;
  settings: Settings;
  /** Reading from disk is asynchronous; until this is true, records are unknown. */
  hydrated: boolean;
  beginAttempt: (levelId: number) => void;
  recordFinish: (levelId: number, seconds: number, stars: number) => void;
  setReducedMotion: (value: boolean) => void;
}

const EMPTY: LevelRecord = { bestTime: Number.POSITIVE_INFINITY, bestStars: 0, attempts: 0 };

export function recordFor(records: Record<number, LevelRecord>, levelId: number): LevelRecord {
  return records[levelId] ?? EMPTY;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      records: {},
      settings: { reducedMotion: false },
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
      setReducedMotion: (value) =>
        set((state) => ({ settings: { ...state.settings, reducedMotion: value } })),
    }),
    {
      name: 'progress',
      storage: createJSONStorage(() => deviceStorage),
      partialize: ({ records, settings }) => ({ records, settings }) as Partial<ProgressState>,
      onRehydrateStorage: () => () => {
        useProgress.setState({ hydrated: true });
      },
    }
  )
);
