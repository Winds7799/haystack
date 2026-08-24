import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { starFeedback } from '@/game/feedback';
import { MAX_STARS } from '@/game/scoring';
import { color, font, motion, space, type } from '../tokens';

interface StarsProps {
  earned: number;
  size?: number;
  /** Bring them in one at a time. Off for lists, where they are just data. */
  stagger?: boolean;
  reducedMotion?: boolean;
}

const STEP = 220;

export function Stars({ earned, size = type.title, stagger = false, reducedMotion = false }: StarsProps) {
  return (
    <Animated.View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${earned} of ${MAX_STARS} stars`}
    >
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <Star
          key={index}
          filled={index < earned}
          size={size}
          delay={stagger && !reducedMotion ? index * STEP : 0}
        />
      ))}
    </Animated.View>
  );
}

function Star({ filled, size, delay }: { filled: boolean; size: number; delay: number }) {
  const shown = useSharedValue(delay > 0 ? 0 : 1);

  useEffect(() => {
    if (delay === 0) {
      return;
    }
    shown.value = withDelay(delay, withTiming(1, { duration: motion.normal }));
    // Only an earned star is worth a sound; the empty ones arrive silently.
    if (!filled) {
      return;
    }
    const tick = setTimeout(starFeedback, delay);
    return () => clearTimeout(tick);
  }, [delay, filled, shown]);

  const animated = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: 0.7 + shown.value * 0.3 }],
  }));

  return (
    <Animated.Text
      style={[styles.star, { fontSize: size }, filled ? styles.on : styles.off, animated]}
    >
      {filled ? '★' : '☆'}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  star: { fontFamily: font.mono },
  on: { color: color.gold },
  off: { color: color.goldDim },
});
