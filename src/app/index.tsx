import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIRST_LEVEL } from '@/game/difficulty';
import { color, font, layout, radius, space, type } from '@/ui/tokens';

/** A placeholder front door. The real home screen arrives in phase 4. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <Text style={styles.wordmark}>Haystack</Text>
      <Text style={styles.tagline}>One needle. Everything else is not.</Text>
      <Link href={`/play/${FIRST_LEVEL}`} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Start level one" style={styles.button}>
          <Text style={styles.buttonLabel}>Start</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  wordmark: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.display,
    letterSpacing: 1,
  },
  tagline: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.body,
    marginBottom: space.xl,
  },
  button: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  buttonLabel: {
    color: color.gold,
    fontFamily: font.body,
    fontSize: type.heading,
  },
});
