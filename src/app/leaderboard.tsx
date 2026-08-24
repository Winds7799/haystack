import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FIRST_LEVEL, LAST_LEVEL, LEVELS } from '@/game/difficulty';
import { tapFeedback } from '@/game/feedback';
import { formatTime } from '@/game/scoring';
import { fetchBoard, leaderboardReady, type Standing } from '@/net/leaderboard';
import { useIdentity } from '@/state/useIdentity';
import { Message } from '@/ui/components/Message';
import { Screen } from '@/ui/components/Screen';
import { color, font, layout, radius, space, type } from '@/ui/tokens';

type Board =
  | { status: 'loading' }
  | { status: 'ready'; rows: Standing[] }
  | { status: 'error'; message: string };

export default function LeaderboardScreen() {
  const params = useLocalSearchParams<{ level?: string }>();
  const opening = Number.parseInt(params.level ?? '', 10);
  const [level, setLevel] = useState(
    Number.isFinite(opening) && opening >= FIRST_LEVEL && opening <= LAST_LEVEL
      ? opening
      : FIRST_LEVEL
  );
  const [board, setBoard] = useState<Board>({ status: 'loading' });
  const playerId = useIdentity((state) => state.playerId);

  const load = useCallback(
    (target: number) => {
      let cancelled = false;
      setBoard({ status: 'loading' });
      fetchBoard(target, playerId)
        .then((rows) => {
          if (!cancelled) {
            setBoard({ status: 'ready', rows });
          }
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            const message =
              cause instanceof Error ? cause.message : 'The leaderboard could not be reached.';
            setBoard({ status: 'error', message });
          }
        });
      return () => {
        cancelled = true;
      };
    },
    [playerId]
  );

  useEffect(() => load(level), [level, load]);

  if (!leaderboardReady()) {
    return (
      <Screen title="Leaderboard" onBack={() => router.back()} scroll={false}>
        <Message
          title="No board is connected"
          detail="Point the app at a Supabase project in app.json to turn this on. The README has the three steps."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Leaderboard"
      lede="Fastest finishes, penalties included."
      onBack={() => router.back()}
      scroll={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.picker}
      >
        {LEVELS.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`Show level ${entry.id}`}
            accessibilityState={{ selected: entry.id === level }}
            onPress={() => {
              tapFeedback();
              setLevel(entry.id);
            }}
            style={[styles.chip, entry.id === level && styles.chipOn]}
          >
            <Text style={[styles.chipText, entry.id === level && styles.chipTextOn]}>
              {entry.id}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {board.status === 'loading' ? <Message title="Reading the board" busy /> : null}
      {board.status === 'error' ? (
        <Message
          title="The board could not be read"
          detail={board.message}
          action={{ label: 'Try again', onPress: () => load(level) }}
        />
      ) : null}
      {board.status === 'ready' && board.rows.length === 0 ? (
        <Message
          title="Nobody has finished this level yet"
          detail="Post the first time and it will sit here."
        />
      ) : null}
      {board.status === 'ready' && board.rows.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {board.rows.map((row) => (
            <Row key={`${row.rank}-${row.name}`} standing={row} />
          ))}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function Row({ standing }: { standing: Standing }) {
  return (
    <View
      style={[styles.row, standing.mine && styles.mine]}
      accessibilityRole="text"
      accessibilityLabel={`${standing.rank}. ${standing.name}, ${formatTime(standing.seconds * 1000)}${standing.hintUsed ? ', used a hint' : ''}`}
    >
      <Text style={styles.rank}>{standing.rank}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {standing.name}
      </Text>
      {standing.hintUsed ? <Text style={styles.hint}>hint</Text> : null}
      <Text style={styles.time}>{formatTime(standing.seconds * 1000)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: space.xs, paddingBottom: space.md, paddingRight: space.xl },
  chip: {
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
  chipOn: { borderColor: color.gold, backgroundColor: color.surfaceHigh },
  chipText: { color: color.textMuted, fontFamily: font.mono, fontSize: type.label },
  chipTextOn: { color: color.gold },
  list: { paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  mine: { backgroundColor: color.surfaceHigh },
  rank: {
    color: color.textMuted,
    fontFamily: font.mono,
    fontSize: type.label,
    minWidth: 28,
  },
  name: { flex: 1, color: color.text, fontFamily: font.body, fontSize: type.body },
  hint: { color: color.goldDim, fontFamily: font.body, fontSize: type.caption },
  time: { color: color.gold, fontFamily: font.monoMedium, fontSize: type.body },
});
