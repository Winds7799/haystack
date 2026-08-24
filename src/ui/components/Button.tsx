import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { tapFeedback } from '@/game/feedback';
import type { StyleProp, ViewStyle } from 'react-native';
import { color, font, layout, radius, space, type } from '../tokens';

type Tone = 'primary' | 'quiet';

interface ButtonProps {
  label: string;
  onPress: () => void;
  tone?: Tone;
  /** Defaults to the label, which is usually the right thing to announce. */
  accessibilityLabel?: string;
  /** Shown under the label, for costs and consequences. */
  note?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  tone = 'quiet',
  accessibilityLabel,
  note,
  disabled = false,
  style,
}: ButtonProps) {
  const press = useCallback(() => {
    tapFeedback();
    onPress();
  }, [onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={press}
      style={({ pressed }) => [
        styles.base,
        tone === 'primary' ? styles.primary : styles.quiet,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, tone === 'primary' && styles.primaryLabel]}>{label}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.touchTarget,
    minWidth: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  primary: { backgroundColor: color.surfaceHigh, borderColor: color.goldDim },
  quiet: { backgroundColor: color.surface, borderColor: color.border },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  label: {
    color: color.text,
    fontFamily: font.body,
    fontSize: type.body,
  },
  primaryLabel: { color: color.gold },
  note: {
    color: color.textMuted,
    fontFamily: font.mono,
    fontSize: type.caption,
    marginTop: 2,
  },
});
