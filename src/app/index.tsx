import { useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBoard } from '@/game/AmbientBoard';
import { FIRST_LEVEL, LAST_LEVEL, LEVELS } from '@/game/difficulty';
import { MAX_STARS } from '@/game/scoring';
import { leaderboardReady } from '@/net/leaderboard';
import { isUnlocked, recordFor, useProgress } from '@/state/useProgress';
import type { LevelRecord } from '@/state/useProgress';
import { Button } from '@/ui/components/Button';
import { color, font, motion, space, type } from '@/ui/tokens';

/** The furthest level that is open, so continue always lands somewhere playable. */
function nextLevel(records: Record<number, LevelRecord>): number {
  let candidate = FIRST_LEVEL;
  while (candidate < LAST_LEVEL && isUnlocked(records, candidate + 1, FIRST_LEVEL)) {
    candidate += 1;
  }
  return candidate;
}

function totals(records: Record<number, LevelRecord>): { stars: number; done: number } {
  let stars = 0;
  let done = 0;
  for (const level of LEVELS) {
    const record = recordFor(records, level.id);
    stars += record.bestStars;
    if (record.bestStars > 0) {
      done += 1;
    }
  }
  return { stars, done };
}

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const records = useProgress((state) => state.records);
  const seenTutorial = useProgress((state) => state.seenTutorial);
  const preferReducedMotion = useProgress((state) => state.settings.reducedMotion);
  const reducedMotion = preferReducedMotion || useReducedMotion();

  const target = nextLevel(records);
  const { stars, done } = totals(records);
  const started = done > 0 || recordFor(records, FIRST_LEVEL).attempts > 0;
  const finished = done === LEVELS.length;

  const rise = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) {
      rise.value = 1;
      return;
    }
    rise.value = withDelay(120, withTiming(1, { duration: motion.slow }));
  }, [reducedMotion, rise]);

  const mastheadStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 14 }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: rise.value }));

  const onPlay = useCallback(() => {
    if (finished) {
      router.push('/finale');
      return;
    }
    router.push(seenTutorial ? `/play/${target}` : '/how-to-play');
  }, [finished, seenTutorial, target]);

  return (
    <View style={styles.root}>
      <AmbientBoard width={width} height={height} reducedMotion={reducedMotion} />
      <View style={styles.wash} pointerEvents="none" />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <Animated.View style={[styles.masthead, mastheadStyle]}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Windies
          </Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>One needle. Everything else is not.</Text>
        </Animated.View>

        <Animated.View style={[styles.actions, actionsStyle]}>
          {started ? (
            <Text
              style={styles.progress}
              accessibilityLabel={`${done} of ${LEVELS.length} levels finished, ${stars} of ${LEVELS.length * MAX_STARS} stars`}
            >
              {`${done}/${LEVELS.length} levels · ${stars}/${LEVELS.length * MAX_STARS} stars`}
            </Text>
          ) : (
            <Text style={styles.progress}>{`${LEVELS.length} levels. One needle in each.`}</Text>
          )}

          <Button
            label={finished ? 'Results' : started ? 'Continue' : 'Start'}
            note={finished ? 'All hundred found' : started ? `Level ${target}` : undefined}
            tone="primary"
            accessibilityLabel={
              finished
                ? 'Open your results for all hundred levels'
                : started
                  ? `Continue at level ${target}`
                  : 'Start level one'
            }
            onPress={onPlay}
            style={styles.wide}
          />
          <View style={styles.row}>
            <Button label="Levels" onPress={() => router.push('/levels')} style={styles.half} />
            {leaderboardReady() ? (
              <Button
                label="Board"
                accessibilityLabel="Leaderboard"
                onPress={() => router.push('/leaderboard')}
                style={styles.half}
              />
            ) : (
              <Button
                label="How to play"
                onPress={() => router.push('/how-to-play')}
                style={styles.half}
              />
            )}
          </View>
          <Button
            label="Settings"
            onPress={() => router.push('/settings')}
            style={styles.wide}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
  /** Sits the type off the pile without hiding it. */
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.wash,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
  },
  masthead: { alignItems: 'center', gap: space.md, marginTop: space.xxxl },
  wordmark: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.display + 8,
    letterSpacing: 3,
  },
  rule: { width: 54, height: 1, backgroundColor: color.goldDim },
  tagline: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.body,
    textAlign: 'center',
  },
  actions: { alignSelf: 'stretch', gap: space.sm },
  progress: {
    color: color.goldDim,
    fontFamily: font.mono,
    fontSize: type.caption,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  row: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1 },
  wide: { alignSelf: 'stretch' },
});
