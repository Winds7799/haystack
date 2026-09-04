import { useCallback, useEffect, useRef, useState } from 'react';
import { recordFor, useProgress } from '@/state/useProgress';
import { postScore } from '@/net/post';
import { HINT_DURATION, MAX_HINTS, elapsedOf, useRun } from '@/state/useRun';
import type { LevelConfig } from './difficulty';
import { missMessage, progressMessage } from './copy';
import {
  completeFeedback,
  missFeedback,
  partialFeedback,
  strawFeedback,
  winFeedback,
} from './feedback';
import { showRewardedAd } from '@/ads/rewarded';
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
  /** True while an ad is being fetched or shown. */
  buyingHint: boolean;
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
        if (struck) {
          missFeedback();
        } else {
          strawFeedback();
        }
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
      const stars = starsFor(config, milliseconds / 1000, state.hints > 0);
      winFeedback();
      state.markFound(index);
      state.win();
      setHint(null);
      setTarget(struck);
      setCelebrating(true);
      useProgress.getState().recordFinish(levelId, milliseconds / 1000, stars);
      postScore({
        level: levelId,
        seconds: milliseconds / 1000,
        stars,
        hintUsed: state.hints > 0,
      });
      later(() => {
        completeFeedback();
        setFinish({
          milliseconds,
          stars,
          misses: state.misses,
          hintUsed: state.hints > 0,
          previousBest,
        });
      }, CELEBRATION);
    },
    [world, config, needles.length, levelId, later, say, drift]
  );

  const [buyingHint, setBuyingHint] = useState(false);

  /**
   * A hint is paid for with an ad, then with ten seconds, then with the third
   * star. The clock keeps running while the ad plays — a hint should cost
   * something even when it is free to buy.
   */
  const onHint = useCallback(async () => {
    const state = useRun.getState();
    if (!world || state.status !== 'playing' || buyingHint) {
      return;
    }
    if (state.hints >= MAX_HINTS) {
      say('no hints left on this level');
      return;
    }
    // On a twin level the hint points at whichever needle is still out there.
    const pending = needles.find((needle) => !state.found.includes(world.objects.indexOf(needle)));
    if (!pending) {
      return;
    }

    setBuyingHint(true);
    const outcome = await showRewardedAd();
    setBuyingHint(false);

    // Only walking out of the ad forfeits the hint. No ad to show is the
    // game's problem, not the player's.
    if (outcome === 'dismissed') {
      say('no hint — you left the ad early');
      return;
    }
    if (useRun.getState().status !== 'playing') {
      return;
    }

    useRun.getState().takeHint();
    setHint(hintHalo(world, pending));
    later(() => setHint(null), HINT_DURATION);
  }, [world, needles, later, say, buyingHint]);

  return { onTap, onHint, buyingHint, hint, finish, celebrating, target, toast };
}
