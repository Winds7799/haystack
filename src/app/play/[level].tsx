import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { AppState, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Board } from '@/game/Board';
import { MAX_ZOOM } from '@/game/constants';
import { FIRST_LEVEL, findLevel } from '@/game/difficulty';
import { missMessage, progressMessage } from '@/game/copy';
import { missBuzz, tapBuzz, winBuzz } from '@/game/feedback';
import { findNeedles, hintHalo, hitTest, rotateAbout, unrotate } from '@/game/hit';
import { starsFor } from '@/game/scoring';
import type { BoardObject, Point } from '@/game/types';
import { useBoard } from '@/game/useBoard';
import { useCamera } from '@/game/useCamera';
import { useDrift } from '@/game/useDrift';
import type { Viewport } from '@/game/camera';
import { isUnlocked, recordFor, useProgress } from '@/state/useProgress';
import { HINT_DURATION, elapsedOf, useRun } from '@/state/useRun';
import { Button } from '@/ui/components/Button';
import { Hud } from '@/ui/components/Hud';
import { Message } from '@/ui/components/Message';
import { PauseSheet } from '@/ui/components/PauseSheet';
import { Results } from '@/ui/components/Results';
import { Toast } from '@/ui/components/Toast';
import { color, space } from '@/ui/tokens';

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
  const found = useRun((state) => state.found);
  const preferReducedMotion = useProgress((state) => state.settings.reducedMotion);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = preferReducedMotion || systemReducedMotion;

  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [hint, setHint] = useState<{ centre: Point; radius: number } | null>(null);
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
    if (board.status !== 'ready') {
      return;
    }
    useProgress.getState().beginAttempt(levelId);
    useRun.getState().begin(levelId, attempt);
    setHint(null);
    setFinish(null);
    setCelebrating(false);
    setTarget(null);
    setToast(null);
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

  const ready = board.status === 'ready' ? board : null;
  const world = ready?.world ?? null;
  const needles = useMemo(() => (world ? findNeedles(world) : []), [world]);
  const foundPoints = useMemo(
    () => (world ? found.map((index) => world.objects[index]) : []),
    [world, found]
  );
  const drift = useDrift(config?.modifier === 'drift', reducedMotion, status !== 'playing');

  const onTap = useCallback(
    (point: Point) => {
      const state = useRun.getState();
      if (!world || !config || state.status !== 'playing') {
        return;
      }
      const struck = hitTest(world, unrotate(point, drift.angle.value, world.size));
      if (struck?.kind !== 'needle') {
        missBuzz();
        state.miss(struck?.kind ?? null);
        say(missMessage(struck?.kind ?? null));
        return;
      }

      const index = world.objects.indexOf(struck);
      if (state.found.includes(index)) {
        return;
      }
      if (state.found.length + 1 < needles.length) {
        tapBuzz();
        state.markFound(index);
        say(progressMessage(state.found.length + 1, needles.length));
        return;
      }

      const milliseconds = elapsedOf(state);
      const previousBest = recordFor(useProgress.getState().records, levelId).bestTime;
      const stars = starsFor(config, milliseconds / 1000, state.hintUsed);
      winBuzz();
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

  const camera = useCamera(
    viewport,
    world?.size ?? 1,
    onTap,
    !celebrating && finish === null && status !== 'paused'
  );
  const { focusOn } = camera;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  }, []);

  // Frame the needle once it is found, where the drifting pile actually put it.
  useEffect(() => {
    if (!celebrating || !target || !world) {
      return;
    }
    focusOn(rotateAbout(target, drift.angle.value, world.size), MAX_ZOOM, !reducedMotion);
  }, [celebrating, target, world, focusOn, reducedMotion, drift]);

  const onHint = useCallback(() => {
    const state = useRun.getState();
    if (!world || state.hintUsed || state.status !== 'playing') {
      return;
    }
    const pending = needles.find((needle) => !state.found.includes(world.objects.indexOf(needle)));
    if (!pending) {
      return;
    }
    state.takeHint();
    setHint(hintHalo(world, pending));
    later(() => setHint(null), HINT_DURATION);
  }, [world, needles, later]);

  const onRestart = useCallback(() => setAttempt((current) => current + 1), []);
  const onQuit = useCallback(() => router.replace('/'), []);
  const onNext = useCallback(() => router.replace(`/play/${levelId + 1}`), [levelId]);
  const onPause = useCallback(() => useRun.getState().pause(), []);
  const onResume = useCallback(() => useRun.getState().resume(), []);

  if (!config) {
    return (
      <View style={styles.root}>
        <Message title="This level does not exist" detail={`There is no level ${params.level}.`} />
        <View style={styles.escape}>
          <Button label="Home" tone="primary" onPress={onQuit} />
        </View>
      </View>
    );
  }

  if (!isUnlocked(useProgress.getState().records, levelId, FIRST_LEVEL)) {
    return (
      <View style={styles.root}>
        <Message
          title="Locked"
          detail={`Finish level ${levelId - 1} to open this one. Four tries at it will also do.`}
        />
        <View style={styles.escape}>
          <Button label="Home" tone="primary" onPress={onQuit} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      {board.status === 'loading' ? <Message title="Building the pile" busy /> : null}
      {board.status === 'error' ? (
        <Message title="This board could not be built" detail={board.message} />
      ) : null}

      {ready && needles.length > 0 ? (
        <>
          <Board
            world={ready.world}
            texture={ready.texture}
            camera={camera}
            drift={drift}
            viewport={viewport}
            needle={target ?? needles[0]}
            modifier={config.modifier}
            hint={hint}
            found={foundPoints}
            missSerial={lastMiss?.serial ?? 0}
            celebrating={celebrating}
            reducedMotion={reducedMotion}
          />
          {finish ? null : (
            <Hud
              levelId={levelId}
              world={config.world.name}
              misses={misses}
              running={status === 'playing'}
              hintUsed={hintUsed}
              onHint={onHint}
              onPause={onPause}
            />
          )}
          <Toast message={toast?.text ?? null} serial={toast?.serial ?? 0} />
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
  escape: { alignItems: 'center', paddingBottom: space.xxxl },
});
