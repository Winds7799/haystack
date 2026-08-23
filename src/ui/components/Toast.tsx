import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, motion, radius, space, type } from '../tokens';

interface ToastProps {
  message: string | null;
  /** Bumped for every message, so two identical messages both show. */
  serial: number;
}

const HOLD = 1400;

/** Names what the player just hit, then gets out of the way. */
export function Toast({ message, serial }: ToastProps) {
  const opacity = useSharedValue(0);
  const lift = useSharedValue(8);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (serial === 0 || !message) {
      return;
    }
    opacity.value = withSequence(
      withTiming(1, { duration: motion.quick }),
      withDelay(HOLD, withTiming(0, { duration: motion.normal }))
    );
    lift.value = withSequence(
      withTiming(0, { duration: motion.quick }),
      withDelay(HOLD, withTiming(8, { duration: motion.normal }))
    );
  }, [serial, message, opacity, lift]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  if (!message) {
    return null;
  }
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.root, { bottom: insets.bottom + space.xxxl + space.xl }, animated]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  text: { color: color.text, fontFamily: font.body, fontSize: type.label },
});
