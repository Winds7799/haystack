import { useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CREATOR, PUBLISHER } from '@/legal/documents';
import { color, font, motion, radius, space, type } from '../tokens';
import { Button } from './Button';

interface FollowProps {
  reducedMotion: boolean;
  onClose: () => void;
}

/**
 * The one ask in the game, made once the hundredth needle is found and the
 * results monitor has been read: follow the maker for whatever comes next.
 * Both links leave the app; "Not now" costs nothing and asks nothing again
 * until the results are reopened.
 */
export function Follow({ reducedMotion, onClose }: FollowProps) {
  const shown = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      shown.value = withTiming(1, { duration: motion.normal, easing: Easing.out(Easing.cubic) });
    }
  }, [reducedMotion, shown]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 16 }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.panel, panelStyle]}>
        <Text style={styles.caption}>{`Made by ${PUBLISHER.name}`}</Text>
        <Text style={styles.title} accessibilityRole="header">
          Thank you for playing
        </Text>
        <Text style={styles.detail}>
          A hundred needles, all yours. More is on the way — follow along and you will be the
          first to know.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Follow on Instagram"
            note={CREATOR.instagram.handle}
            tone="primary"
            accessibilityLabel={`Follow ${PUBLISHER.name} on Instagram, ${CREATOR.instagram.handle}`}
            onPress={() => {
              void Linking.openURL(CREATOR.instagram.url);
            }}
            style={styles.wide}
          />
          <Button
            label="Subscribe on YouTube"
            note={CREATOR.youtube.handle}
            tone="primary"
            accessibilityLabel={`Subscribe to ${PUBLISHER.name} on YouTube, ${CREATOR.youtube.handle}`}
            onPress={() => {
              void Linking.openURL(CREATOR.youtube.url);
            }}
            style={styles.wide}
          />
          <Button label="Not now" onPress={onClose} style={styles.wide} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    backgroundColor: color.scrim,
  },
  panel: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
    marginHorizontal: 'auto',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  caption: {
    color: color.goldDim,
    fontFamily: font.mono,
    fontSize: type.caption,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.title,
    textAlign: 'center',
  },
  detail: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.label,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    marginTop: space.sm,
    gap: space.sm,
  },
  wide: { alignSelf: 'stretch' },
});
