import { StyleSheet, Text, View } from 'react-native';
import { comparedToBest, formatTime } from '@/game/scoring';
import { leaderboardReady } from '@/net/leaderboard';
import { LAST_LEVEL } from '@/game/difficulty';
import { color, font, space, type } from '../tokens';
import { Button } from './Button';
import { Stars } from './Stars';

interface ResultsProps {
  levelId: number;
  milliseconds: number;
  stars: number;
  misses: number;
  hintUsed: boolean;
  /** Best before this run, so the comparison is against what they had. */
  previousBest: number;
  reducedMotion: boolean;
  onBoard: () => void;
  onRetry: () => void;
  onNext: () => void;
  onLevels: () => void;
}

export function Results({
  levelId,
  milliseconds,
  stars,
  misses,
  hintUsed,
  previousBest,
  reducedMotion,
  onBoard,
  onRetry,
  onNext,
  onLevels,
}: ResultsProps) {
  const comparison = comparedToBest(milliseconds / 1000, previousBest);
  const boardReady = leaderboardReady();
  const costs = [
    misses > 0 ? `${misses} miss${misses === 1 ? '' : 'es'}` : null,
    hintUsed ? 'one hint' : null,
  ].filter((entry): entry is string => entry !== null);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Found</Text>
      <Text style={styles.time}>{formatTime(milliseconds)}</Text>
      <Stars earned={stars} stagger reducedMotion={reducedMotion} />
      {comparison ? <Text style={styles.detail}>{comparison}</Text> : null}
      {costs.length > 0 ? <Text style={styles.detail}>{costs.join(', ')}</Text> : null}

      <View style={styles.actions}>
        <Button label="Retry" onPress={onRetry} />
        {levelId < LAST_LEVEL ? (
          <Button label="Next" tone="primary" onPress={onNext} />
        ) : (
          <Button label="Levels" tone="primary" onPress={onLevels} />
        )}
      </View>
      <View style={styles.actions}>
        {levelId < LAST_LEVEL ? <Button label="Levels" onPress={onLevels} /> : null}
        {boardReady ? <Button label="Leaderboard" onPress={onBoard} /> : null}
      </View>
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
    gap: space.sm,
    paddingHorizontal: space.xl,
    backgroundColor: color.scrim,
  },
  title: { color: color.text, fontFamily: font.display, fontSize: type.title },
  time: {
    color: color.gold,
    fontFamily: font.mono,
    fontSize: type.display,
    fontVariant: ['tabular-nums'],
  },
  detail: { color: color.textMuted, fontFamily: font.body, fontSize: type.label },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
});
