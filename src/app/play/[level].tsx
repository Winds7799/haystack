import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AppState, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { startAmbience, stopAmbience } from '@/audio';
import { Board } from '@/game/Board';
import { MAX_ZOOM } from '@/game/constants';
import { FIRST_LEVEL, findLevel, type Modifier } from '@/game/difficulty';
import { hintPenaltyFor } from '@/game/scoring';
import { panFeedback } from '@/game/feedback';
import { findNeedles, rotateAbout } from '@/game/hit';
import { useBoard } from '@/game/useBoard';
import { useCamera } from '@/game/useCamera';
import { useDrift } from '@/game/useDrift';
import { useLevelRun } from '@/game/useLevelRun';
import type { Viewport } from '@/game/camera';
import type { ObjectKind } from '@/game/types';
import { isUnlocked, recordFor, useProgress } from '@/state/useProgress';
import { useRun } from '@/state/useRun';
import { claimHeldScore, dropHeldScore, onPending } from '@/net/post';
import { HintOffer } from '@/ui/components/HintOffer';
import { Hud } from '@/ui/components/Hud';
import { Message } from '@/ui/components/Message';
import { PauseSheet } from '@/ui/components/PauseSheet';
import { Results } from '@/ui/components/Results';
import { NamePrompt } from '@/ui/components/NamePrompt';
import { NewObjects } from '@/ui/components/NewObjects';
import { Toast } from '@/ui/components/Toast';
import { color } from '@/ui/tokens';

const MODIFIERS: readonly (Modifier | 'none')[] = ['none', 'drift', 'lantern', 'haze', 'twin'];

function readModifier(value: string | undefined): Modifier | 'none' | undefined {
  return MODIFIERS.find((entry) => entry === value);
}

const KEEP_AWAKE = 'haystack-level';

export default function PlayScreen() {
  // Screens must not sleep mid-level. There is no such thing in a browser tab,
  // and asking for it there only throws into the console.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    activateKeepAwakeAsync(KEEP_AWAKE).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE).catch(() => undefined);
    };
  }, []);
  const params = useLocalSearchParams<{ level?: string; modifier?: string }>();
  const levelId = Number.parseInt(params.level ?? '', 10);
  const listed = findLevel(levelId);
  // The debug menu can force a modifier on any level. Development builds only.
  const override = __DEV__ ? readModifier(params.modifier) : undefined;
  const config =
    listed && override !== undefined
      ? { ...listed, modifier: override === 'none' ? undefined : override }
      : listed;

  const [attempt, setAttempt] = useState(
    () => recordFor(useProgress.getState().records, levelId).attempts + 1
  );
  const settings = useProgress((state) => state.settings);
  const board = useBoard(levelId, attempt, settings.colourBlindSafe, override);
  const status = useRun((state) => state.status);
  const misses = useRun((state) => state.misses);
  const hintsUsed = useRun((state) => state.hints);
  const unlimitedHints = useProgress((state) => state.unlimitedHints);
  const [offering, setOffering] = useState(false);
  const lastMiss = useRun((state) => state.lastMiss);
  const found = useRun((state) => state.found);
  const reducedMotion = settings.reducedMotion || useReducedMotion();

  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [needsName, setNeedsName] = useState(false);
  // Kinds this board introduces. Captured once, when the run begins, so
  // marking them seen does not make the plate vanish mid-read.
  const [introducing, setIntroducing] = useState<ObjectKind[] | null>(null);

  useEffect(() => {
    onPending((pending) => setNeedsName(pending !== null));
    return () => onPending(null);
  }, []);

  useEffect(() => {
    startAmbience();
    return stopAmbience;
  }, []);

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
  useEffect(() => {
    if (board.status !== 'ready' || !config) {
      return;
    }
    const seen = new Set(useProgress.getState().seenKinds);
    const fresh = config.decoys.map((entry) => entry.kind).filter((kind) => !seen.has(kind));
    // The needle leads the first plate, so level one explains the target too.
    const withNeedle: ObjectKind[] = seen.has('needle') ? fresh : ['needle', ...fresh];
    if (withNeedle.length === 0) {
      return;
    }
    setIntroducing(withNeedle);
    useRun.getState().pause();
  }, [board.status, config, levelId, attempt]);

  const onIntroDone = useCallback(() => {
    const kinds = introducing ?? [];
    useProgress.getState().markKindsSeen(kinds);
    setIntroducing(null);
    useRun.getState().resume();
  }, [introducing]);

  const drift = useDrift(config?.modifier === 'drift', reducedMotion, status !== 'playing');
  const run = useLevelRun(config, world, needles, drift, levelId, attempt);

  const camera = useCamera(
    viewport,
    world,
    run.onTap,
    panFeedback,
    !run.celebrating && run.finish === null && status !== 'paused'
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
    if (!run.celebrating || !run.target || !world) {
      return;
    }
    focusOn(rotateAbout(run.target, drift.angle.value, world), MAX_ZOOM, !reducedMotion);
  }, [run.celebrating, run.target, world, focusOn, reducedMotion, drift]);

  const onRestart = useCallback(() => setAttempt((current) => current + 1), []);
  const onQuit = useCallback(() => router.replace('/'), []);
  const onLevels = useCallback(() => router.replace('/levels'), []);
  const onBoard = useCallback(() => router.push(`/leaderboard?level=${levelId}`), [levelId]);
  const onNext = useCallback(() => router.replace(`/play/${levelId + 1}`), [levelId]);
  const onPause = useCallback(() => useRun.getState().pause(), []);
  const onResume = useCallback(() => useRun.getState().resume(), []);

  if (!config) {
    return (
      <Message
        title="This level does not exist"
        detail={`There is no level ${params.level}.`}
        action={{ label: 'Home', onPress: onQuit }}
      />
    );
  }

  if (!isUnlocked(useProgress.getState().records, levelId, FIRST_LEVEL)) {
    return (
      <Message
        title="Locked"
        detail={`Finish level ${levelId - 1} to open this one. Four tries at it will also do.`}
        action={{ label: 'Home', onPress: onQuit }}
      />
    );
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      {board.status === 'loading' ? <Message title="Building the pile" busy /> : null}
      {board.status === 'error' ? (
        <Message
          title="This board could not be built"
          detail={board.message}
          action={{ label: 'Retry', onPress: onRestart }}
        />
      ) : null}

      {ready && needles.length > 0 ? (
        <>
          <Board
            world={ready.world}
            texture={ready.texture}
            camera={camera}
            drift={drift}
            viewport={viewport}
            needle={run.target ?? needles[0]}
            modifier={config.modifier}
            hint={run.hint}
            found={foundPoints}
            missSerial={lastMiss?.serial ?? 0}
            celebrating={run.celebrating}
            reducedMotion={reducedMotion}
          />
          {run.finish ? null : (
            <Hud
              levelId={levelId}
              world={config.world.name}
              misses={misses}
              running={status === 'playing'}
              hintsUsed={hintsUsed}
              hintCost={hintPenaltyFor(config) / 1000}
              unlimitedHints={unlimitedHints}
              onOffer={() => setOffering(true)}
              leftHanded={settings.leftHanded}
              onHint={run.onHint}
              onPause={onPause}
            />
          )}
          <Toast message={run.toast?.text ?? null} serial={run.toast?.serial ?? 0} />
          {offering ? <HintOffer onClose={() => setOffering(false)} /> : null}
          {status === 'paused' && !introducing ? (
            <PauseSheet
              levelId={levelId}
              onResume={onResume}
              onRestart={onRestart}
              onQuit={onQuit}
            />
          ) : null}
          {run.finish ? (
            <Results
              levelId={levelId}
              milliseconds={run.finish.milliseconds}
              stars={run.finish.stars}
              misses={run.finish.misses}
              hintUsed={run.finish.hintUsed}
              previousBest={run.finish.previousBest}
              reducedMotion={reducedMotion}
              onBoard={onBoard}
              onRetry={onRestart}
              onNext={onNext}
              onLevels={onLevels}
            />
          ) : null}
          {introducing ? (
            <NewObjects
              kinds={introducing}
              similarity={config.similarity}
              colourBlindSafe={settings.colourBlindSafe}
              onDismiss={onIntroDone}
            />
          ) : null}
          {run.finish && needsName ? (
            <NamePrompt
              onSubmit={(name) => {
                claimHeldScore(name);
                setNeedsName(false);
              }}
              onSkip={() => {
                dropHeldScore();
                setNeedsName(false);
              }}
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
