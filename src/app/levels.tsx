import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FIRST_LEVEL, LEVELS, type LevelConfig } from '@/game/difficulty';
import { MERCY_ATTEMPTS, isUnlocked, recordFor, useProgress } from '@/state/useProgress';
import type { LevelRecord } from '@/state/useProgress';
import { formatTime } from '@/game/scoring';
import { Screen } from '@/ui/components/Screen';
import { Stars } from '@/ui/components/Stars';
import { color, font, layout, radius, space, type } from '@/ui/tokens';

/** Worlds are runs of six, so group by name in table order. */
function bySection(): { name: string; levels: LevelConfig[] }[] {
  const sections: { name: string; levels: LevelConfig[] }[] = [];
  for (const level of LEVELS) {
    const last = sections[sections.length - 1];
    if (last && last.name === level.world.name) {
      last.levels.push(level);
    } else {
      sections.push({ name: level.world.name, levels: [level] });
    }
  }
  return sections;
}

const SECTIONS = bySection();

export default function LevelsScreen() {
  const records = useProgress((state) => state.records);
  return (
    <Screen title="Levels" lede="Best time and stars for each." onBack={() => router.back()}>
      {SECTIONS.map((section) => (
        <View key={section.name} style={styles.section}>
          <Text style={styles.sectionName}>{section.name}</Text>
          <View style={styles.grid}>
            {section.levels.map((level) => (
              <Tile key={level.id} level={level} records={records} />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function Tile({
  level,
  records,
}: {
  level: LevelConfig;
  records: Record<number, LevelRecord>;
}) {
  const record = recordFor(records, level.id);
  const open = isUnlocked(records, level.id, FIRST_LEVEL);
  const tries = recordFor(records, level.id - 1).attempts;
  const best = Number.isFinite(record.bestTime) ? formatTime(record.bestTime * 1000) : '—';

  const label = open
    ? `Level ${level.id}, ${record.bestStars} stars, best ${best}`
    : `Level ${level.id}, locked. Finish level ${level.id - 1}, or try it ${MERCY_ATTEMPTS - tries} more times.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !open }}
      disabled={!open}
      onPress={() => router.push(`/play/${level.id}`)}
      style={({ pressed }) => [styles.tile, !open && styles.locked, pressed && styles.pressed]}
    >
      <Text style={styles.number}>{level.id}</Text>
      {open ? (
        <>
          <Stars earned={record.bestStars} size={type.caption} />
          <Text style={styles.best}>{best}</Text>
        </>
      ) : (
        <Text style={styles.lockNote}>
          {`clear ${level.id - 1}\nor ${Math.max(1, MERCY_ATTEMPTS - tries)} more tries`}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space.xl, gap: space.sm },
  sectionName: {
    color: color.gold,
    fontFamily: font.display,
    fontSize: type.heading,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    minWidth: 96,
    flexGrow: 1,
    flexBasis: '28%',
    minHeight: layout.touchTarget * 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  locked: { backgroundColor: color.ink, borderStyle: 'dashed' },
  pressed: { opacity: 0.7 },
  number: { color: color.text, fontFamily: font.monoMedium, fontSize: type.heading },
  best: { color: color.textMuted, fontFamily: font.mono, fontSize: type.caption },
  lockNote: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.caption,
    textAlign: 'center',
  },
});
