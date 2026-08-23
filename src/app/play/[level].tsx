import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { AppState, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Board } from '@/game/Board';
import { MAX_ZOOM } from '@/game/constants';
import { findLevel } from '@/game/difficulty';
import { missMessage } from '@/game/copy';
import { missBuzz, winBuzz } from '@/game/feedback';
import { findNeedle, hintHalo, hitTest } from '@/game/hit';
import { starsFor } from '@/game/scoring';
import type { Point } from '@/game/types';
import { useBoard } from '@/game/useBoard';
import { useCamera } from '@/game/useCamera';
import type { Viewport } from '@/game/camera';
import { recordFor, useProgress } from '@/state/useProgress';
import { HINT_DURATION, elapsedOf, useRun } from '@/state/useRun';
import { Hud } from '@/ui/components/Hud';
import { Message } from '@/ui/components/Message';
import { PauseSheet } from '@/ui/components/PauseSheet';
import { Results } from '@/ui/components/Results';
import { Toast } from '@/ui/components/Toast';
import { color } from '@/ui/tokens';

/** How long the found-it moment is held before the result appears. */
const CELEBRATION = 700;

interface Finish {
  milliseconds: number;
  stars: number;
  misses: number;
  hintUsed: boolean;
  previousBest: number;
}

export default function PlayScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ level?: string }>();
  const levelId = Number.parseInt(params.level ?? '', 10);
  const config = findLevel(levelId);

  const [attempt, setAttempt] = useState(
    () => recordFor(useProgress.getState().records, levelId).attempts + 1
  );
  const board = useBoard(levelId, attempt);
  const status = useRun((state) => state.status);
  const misses = useRun((state) => state.misses);
  const hintUsed = useRun((state) => state.hintUsed);
  const lastMiss = useRun((state) => state.lastMiss);
  const preferReducedMotion = useProgress((state) => state.settings.reducedMotion);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = preferReducedMotion || systemReducedMotion;

  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [hint, setHint] = useState<{ centre: Point; radius: number } | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((run: () => void, delay: number) => {
    timers.current.push(setTimeout(run, delay));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    []
  );

  // A new board is a new run.
  useEffect(() => {
    if (board.status !== 'ready') {
      return;
    }
    useProgress.getState().beginAttempt(levelId);
    useRun.getState().begin(levelId, attempt);
    setHint(null);
    setFinish(null);
    setCelebrating(false);
  }, [board.status, levelId, attempt]);

  // The clock never runs while the app is in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        useRun.getState().pause();
      }
    });
    return () => subscription.remove();
  }, []);

  const onTap = useCallback(
    (point: Point) => {
      if (board.status !== 'ready' || useRun.getState().status !== 'playing') {
        return;
      }
      const struck = hitTest(board.world, point);
      if (struck?.kind !== 'needle') {
        missBuzz();
        useRun.getState().miss(struck?.kind ?? null);
        return;
      }

      const state = useRun.getState();
      const milliseconds = elapsedOf(state);
      const previousBest = recordFor(useProgress.getState().records, levelId).bestTime;
      const stars = config ? starsFor(config, milliseconds / 1000, state.hintUsed) : 1;
      winBuzz();
      state.win();
      setHint(null);
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
    [board, config, levelId, later]
  );

  const worldSize = board.status === 'ready' ? board.world.size : 1;
  const camera = useCamera(viewport, worldSize, onTap, !celebrating && finish === null);
  const { focusOn } = camera;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  }, []);

  const needle = board.status === 'ready' ? findNeedle(board.world) : null;

  // Frame the needle once it is found.
  useEffect(() => {
    if (celebrating && needle) {
      focusOn(needle, MAX_ZOOM, !reducedMotion);
    }
  }, [celebrating, needle, focusOn, reducedMotion]);

  const onHint = useCallback(() => {
    if (board.status !== 'ready' || !needle) {
      return;
    }
    const state = useRun.getState();
    if (state.hintUsed || state.status !== 'playing') {
      return;
    }
    state.takeHint();
    setHint(hintHalo(board.world, needle));
    later(() => setHint(null), HINT_DURATION);
  }, [board, needle, later]);

  const onRestart = useCallback(() => setAttempt((current) => current + 1), []);
  const onQuit = useCallback(() => router.replace('/'), []);
  const onNext = useCallback(() => router.replace(`/play/${levelId + 1}`), [levelId]);
  const onPause = useCallback(() => useRun.getState().pause(), []);
  const onResume = useCallback(() => useRun.getState().resume(), []);

  if (!config) {
    return (
      <View style={styles.root}>
        <Message title="This level does not exist" detail={`There is no level ${params.level}.`} />
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      {board.status === 'loading' ? <Message title="Building the pile" busy /> : null}
      {board.status === 'error' ? (
        <Message title="This board could not be built" detail={board.message} />
      ) : null}

      {board.status === 'ready' && needle ? (
        <>
          <Board
            world={board.world}
            texture={board.texture}
            camera={camera}
            viewport={viewport}
            needle={needle}
            hint={hint}
            missSerial={lastMiss?.serial ?? 0}
            celebrating={celebrating}
            reducedMotion={reducedMotion}
          />
          {finish ? null : (
            <Hud
              levelId={levelId}
              world={config.world}
              misses={misses}
              running={status === 'playing'}
              hintUsed={hintUsed}
              onHint={onHint}
              onPause={onPause}
            />
          )}
          <Toast
            message={lastMiss ? missMessage(lastMiss.kind) : null}
            serial={lastMiss?.serial ?? 0}
          />
          {status === 'paused' ? (
            <PauseSheet
              levelId={levelId}
              onResume={onResume}
              onRestart={onRestart}
              onQuit={onQuit}
            />
          ) : null}
          {finish ? (
            <Results
              levelId={levelId}
              milliseconds={finish.milliseconds}
              stars={finish.stars}
              misses={finish.misses}
              hintUsed={finish.hintUsed}
              previousBest={finish.previousBest}
              onRetry={onRestart}
              onNext={onNext}
              onQuit={onQuit}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
});
