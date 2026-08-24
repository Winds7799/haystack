import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LEVELS, type Modifier } from '@/game/difficulty';
import { Message } from '@/ui/components/Message';
import { Screen } from '@/ui/components/Screen';
import { color, font, layout, radius, space, type } from '@/ui/tokens';

type Choice = Modifier | 'none' | 'as-built';

const CHOICES: readonly Choice[] = ['as-built', 'none', 'drift', 'lantern', 'haze', 'twin'];

/**
 * Jump to any level and force any modifier. Development builds only — in a
 * release build this route exists but refuses to do anything.
 */
export default function DebugScreen() {
  const [choice, setChoice] = useState<Choice>('as-built');

  if (!__DEV__) {
    return (
      <Screen title="Debug" onBack={() => router.back()} scroll={false}>
        <Message title="Not available in this build" />
      </Screen>
    );
  }

  const open = (id: number) => {
    router.push(choice === 'as-built' ? `/play/${id}` : `/play/${id}?modifier=${choice}`);
  };

  return (
    <Screen title="Debug" lede="Development build only." onBack={() => router.back()}>
      <Text style={styles.heading}>Force modifier</Text>
      <View style={styles.row}>
        {CHOICES.map((entry) => (
          <Pressable
            key={entry}
            accessibilityRole="radio"
            accessibilityState={{ selected: choice === entry }}
            accessibilityLabel={`Force ${entry}`}
            onPress={() => setChoice(entry)}
            style={[styles.chip, choice === entry && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, choice === entry && styles.chipLabelOn]}>{entry}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.heading}>Jump to level</Text>
      <View style={styles.row}>
        {LEVELS.map((level) => (
          <Pressable
            key={level.id}
            accessibilityRole="button"
            accessibilityLabel={`Level ${level.id}, ${level.world.name}`}
            onPress={() => open(level.id)}
            style={styles.tile}
          >
            <Text style={styles.number}>{level.id}</Text>
            <Text style={styles.note}>{level.modifier ?? '—'}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: color.gold,
    fontFamily: font.display,
    fontSize: type.heading,
    marginBottom: space.sm,
    marginTop: space.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipOn: { borderColor: color.goldDim, backgroundColor: color.surfaceHigh },
  chipLabel: { color: color.textMuted, fontFamily: font.mono, fontSize: type.label },
  chipLabelOn: { color: color.gold },
  tile: {
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  number: { color: color.text, fontFamily: font.monoMedium, fontSize: type.label },
  note: { color: color.textMuted, fontFamily: font.mono, fontSize: type.caption },
});
