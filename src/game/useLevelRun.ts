import { useCallback, useEffect, useRef, useState } from 'react';
import { recordFor, useProgress } from '@/state/useProgress';
import { HINT_DURATION, elapsedOf, useRun } from '@/state/useRun';
import type { LevelConfig } from './difficulty';
import { missMessage, progressMessage } from './copy';
import { missFeedback, partialFeedback, winFeedback } from './feedback';
import { hintHalo, hitTest, unrotate } from './hit';
import { starsFor } from './scoring';
import type { Drift } from './useDrift';
import type { BoardObject, Point, World } from './types';

/** How long the found-it moment is held before the result appears. */
export const CELEBRATION = 700;

export interface Finish {
  milliseconds: number;
  stars: number;
  misses: number;
  hintUsed: boolean;
  previousBest: number;
}

export interface Halo {
  centre: Point;
  radius: number;
}

export interface LevelRun {
  onTap: (point: Point) => void;
  onHint: () => void;
  hint: Halo | null;
  finish: Finish | null;
  celebrating: boolean;
  /** The needle the win moment frames, once one has been found. */
  target: BoardObject | null;
  toast: { text: string; serial: number } | null;
}

/**
 * Everything that happens between a tap and a result: what was hit, what it
 * cost, and what the player is told about it. The screen owns the camera and
 * the layout; this owns the run.
 */
export function useLevelRun(
  config: LevelConfig | undefined,
  world: World | null,
  needles: readonly BoardObject[],
  drift: Drift,
  levelId: number,
  attempt: number
): LevelRun {
  const [hint, setHint] = useState<Halo | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [target, setTarget] = useState<BoardObject | null>(null);
  const [toast, setToast] = useState<{ text: string; serial: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((run: () => void, delay: number) => {
    timers.current.push(setTimeout(run, delay));
  }, []);
  const say = useCallback(
    (text: string) => setToast((current) => ({ text, serial: (current?.serial ?? 0) + 1 })),
    []
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    []
  );

  // A new board is a new run.
  useEffect(() => {
    if (!world) {
      return;
    }
    useProgress.getState().beginAttempt(levelId);
    useRun.getState().begin(levelId, attempt);
    setHint(null);
    setFinish(null);
    setCelebrating(false);
    setTarget(null);
    setToast(null);
  }, [world, levelId, attempt]);

  const onTap = useCallback(
    (point: Point) => {
      const state = useRun.getState();
      if (!world || !config || state.status !== 'playing') {
        return;
      }
      const struck = hitTest(world, unrotate(point, drift.angle.value, world));
      if (struck?.kind !== 'needle') {
        missFeedback();
        state.miss(struck?.kind ?? null);
        say(missMessage(struck?.kind ?? null));
        return;
      }

      const index = world.objects.indexOf(struck);
      if (state.found.includes(index)) {
        return;
      }
      if (state.found.length + 1 < needles.length) {
        partialFeedback();
        state.markFound(index);
        say(progressMessage(state.found.length + 1, needles.length));
        return;
      }

      const milliseconds = elapsedOf(state);
      const previousBest = recordFor(useProgress.getState().records, levelId).bestTime;
      const stars = starsFor(config, milliseconds / 1000, state.hintUsed);
      winFeedback();
      state.markFound(index);
      state.win();
      setHint(null);
      setTarget(struck);
      setCelebrating(true);
      useProgress.getState().recordFinish(levelId, milliseconds / 1000, stars);
      later(
        () =>
          setFinish({
            milliseconds,
            stars,
            misses: state.misses,
            hintUsed: state.hintUsed,
            previousBest,
          }),
        CELEBRATION
      );
    },
    [world, config, needles.length, levelId, later, say, drift]
  );

  const onHint = useCallback(() => {
    const state = useRun.getState();
    if (!world || state.hintUsed || state.status !== 'playing') {
      return;
    }
    // On a twin level the hint points at whichever needle is still out there.
    const pending = needles.find((needle) => !state.found.includes(world.objects.indexOf(needle)));
    if (!pending) {
      return;
    }
    state.takeHint();
    setHint(hintHalo(world, pending));
    later(() => setHint(null), HINT_DURATION);
  }, [world, needles, later]);

  return { onTap, onHint, hint, finish, celebrating, target, toast };
}
