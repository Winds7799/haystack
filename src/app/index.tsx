import { useCallback } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBoard } from '@/game/AmbientBoard';
import { FIRST_LEVEL, LAST_LEVEL } from '@/game/difficulty';
import { isUnlocked, recordFor, useProgress } from '@/state/useProgress';
import type { LevelRecord } from '@/state/useProgress';
import { Button } from '@/ui/components/Button';
import { color, font, space, type } from '@/ui/tokens';

/** The furthest level that is open, so continue always lands somewhere playable. */
function nextLevel(records: Record<number, LevelRecord>): number {
  let candidate = FIRST_LEVEL;
  while (candidate < LAST_LEVEL && isUnlocked(records, candidate + 1, FIRST_LEVEL)) {
    candidate += 1;
  }
  return candidate;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const records = useProgress((state) => state.records);
  const seenTutorial = useProgress((state) => state.seenTutorial);
  const preferReducedMotion = useProgress((state) => state.settings.reducedMotion);
  const reducedMotion = preferReducedMotion || useReducedMotion();

  const target = nextLevel(records);
  const started = recordFor(records, FIRST_LEVEL).attempts > 0;

  const onPlay = useCallback(() => {
    if (!seenTutorial) {
      router.push('/how-to-play');
      return;
    }
    router.push(`/play/${target}`);
  }, [seenTutorial, target]);

  return (
    <View style={styles.root}>
      <AmbientBoard width={width} height={height} reducedMotion={reducedMotion} />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <View style={styles.masthead}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Haystack
          </Text>
          <Text style={styles.tagline}>One needle. Everything else is not.</Text>
        </View>

        <View style={styles.actions}>
          <Button
            label={started ? 'Continue' : 'Start'}
            note={started ? `Level ${target}` : undefined}
            tone="primary"
            accessibilityLabel={started ? `Continue at level ${target}` : 'Start level one'}
            onPress={onPlay}
            style={styles.wide}
          />
          <Button
            label="Levels"
            onPress={() => router.push('/levels')}
            style={styles.wide}
          />
          <Button
            label="Settings"
            onPress={() => router.push('/settings')}
            style={styles.wide}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
  },
  masthead: { alignItems: 'center', gap: space.sm, marginTop: space.xxxl },
  wordmark: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.display,
    letterSpacing: 2,
  },
  tagline: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.body,
    textAlign: 'center',
  },
  actions: { alignSelf: 'stretch', gap: space.sm },
  wide: { alignSelf: 'stretch' },
});
