import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TutorialBoard } from '@/game/TutorialBoard';
import { TUTORIAL } from '@/game/tutorial';
import { missFeedback, winFeedback } from '@/game/feedback';
import { useProgress } from '@/state/useProgress';
import { Button } from '@/ui/components/Button';
import { color, font, space, type } from '@/ui/tokens';

/** Widest a board gets, so it still fits on a 375pt screen with margins. */
const BOARD_MARGIN = space.xl * 2;
const BOARD_MAX = 320;

export default function HowToPlayScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const settings = useProgress((state) => state.settings);
  const reducedMotion = settings.reducedMotion || useReducedMotion();

  const [index, setIndex] = useState(0);
  const [found, setFound] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);

  const step = TUTORIAL[index];
  const last = index === TUTORIAL.length - 1;
  const boardSize = Math.min(BOARD_MAX, width - BOARD_MARGIN);

  const finish = useCallback(() => {
    useProgress.getState().markTutorialSeen();
    router.replace('/play/1');
  }, []);

  const onHit = useCallback(
    (kind: string | null) => {
      if (found) {
        return;
      }
      if (kind === 'needle') {
        winFeedback();
        setFound(true);
        setNudge(null);
        return;
      }
      missFeedback();
      setNudge(kind === null ? 'That was straw. Look for the eye.' : 'That is the nail. Try again.');
    },
    [found]
  );

  const advance = useCallback(() => {
    if (last) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
    setFound(false);
    setNudge(null);
  }, [last, finish]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
    >
      <View style={styles.head}>
        <Text style={styles.count}>{`${index + 1} of ${TUTORIAL.length}`}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {step.title}
        </Text>
        <Text style={styles.detail}>{step.detail}</Text>
      </View>

      <TutorialBoard
        config={step.config}
        size={boardSize}
        colourBlindSafe={settings.colourBlindSafe}
        reducedMotion={reducedMotion}
        onHit={onHit}
        found={found}
      />

      <Text style={[styles.nudge, !nudge && styles.nudgeHidden]} accessibilityLiveRegion="polite">
        {nudge ?? ' '}
      </Text>

      <View style={styles.actions}>
        <Button
          label={last ? 'Play' : 'Next'}
          tone="primary"
          disabled={!found}
          accessibilityLabel={found ? (last ? 'Start level one' : 'Next screen') : 'Find the needle first'}
          onPress={advance}
        />
        <Button label="Skip" onPress={finish} />
      </View>

      <Text style={styles.legal} onPress={() => router.push('/legal')}>
        By playing you accept the terms. Tap to read them.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    backgroundColor: color.ink,
  },
  head: { alignItems: 'center', gap: space.xs },
  count: { color: color.goldDim, fontFamily: font.mono, fontSize: type.caption },
  title: { color: color.text, fontFamily: font.display, fontSize: type.title },
  detail: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.label,
    textAlign: 'center',
  },
  nudge: { color: color.gold, fontFamily: font.body, fontSize: type.label, textAlign: 'center' },
  nudgeHidden: { opacity: 0 },
  actions: { flexDirection: 'row', gap: space.md },
  legal: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.caption,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
