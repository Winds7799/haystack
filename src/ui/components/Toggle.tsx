import { useCallback } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { tapFeedback } from '@/game/feedback';
import { color, font, layout, space, type } from '../tokens';

interface ToggleProps {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, detail, value, onChange }: ToggleProps) {
  const change = useCallback(
    (next: boolean) => {
      tapFeedback();
      onChange(next);
    },
    [onChange]
  );

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={{ checked: value }}
      onPress={() => change(!value)}
      style={styles.row}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={change}
        trackColor={{ true: color.goldDim, false: color.border }}
        thumbColor={value ? color.gold : color.textMuted}
        ios_backgroundColor={color.border}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.touchTarget,
    gap: space.lg,
    paddingVertical: space.sm,
  },
  text: { flex: 1, gap: 2 },
  label: { color: color.text, fontFamily: font.body, fontSize: type.body },
  detail: { color: color.textMuted, fontFamily: font.body, fontSize: type.caption },
});
