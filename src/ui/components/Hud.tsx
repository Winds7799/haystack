import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adsAvailable } from '@/ads/rewarded';
import { HINT_PENALTY, MAX_HINTS } from '@/state/useRun';
import { STARS_WITH_HINT } from '@/game/scoring';
import { color, font, space, type } from '../tokens';
import { Button } from './Button';
import { Timer } from './Timer';

interface HudProps {
  levelId: number;
  world: string;
  misses: number;
  running: boolean;
  /** True while an ad is on its way. */
  buyingHint: boolean;
  /** How many hints this run has already spent. */
  hintsUsed: number;
  /** Mirrors the bottom row, so hint and pause fall under a left thumb. */
  leftHanded: boolean;
  onHint: () => void;
  onPause: () => void;
}

const HINT_COST = `+${HINT_PENALTY / 1000}s, ${STARS_WITH_HINT} stars max`;

/**
 * Chrome only. It hugs the top and bottom edges inside the safe area so the
 * middle of the screen stays board.
 */
export function Hud({
  levelId,
  world,
  misses,
  running,
  buyingHint,
  hintsUsed,
  leftHanded,
  onHint,
  onPause,
}: HudProps) {
  const left = Math.max(0, MAX_HINTS - hintsUsed);
  const spent = left === 0;
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={[styles.row, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <View>
          <Text style={styles.world}>{world}</Text>
          <Text style={styles.level}>{`Level ${levelId}`}</Text>
        </View>
        <Timer running={running} />
        <Text
          style={styles.misses}
          accessibilityRole="text"
          accessibilityLabel={`${misses} misses`}
        >
          {`${misses} miss${misses === 1 ? '' : 'es'}`}
        </Text>
      </View>

      <View
        style={[
          styles.row,
          styles.bottom,
          leftHanded && styles.mirrored,
          { paddingBottom: insets.bottom + space.md },
        ]}
        pointerEvents="box-none"
      >
        <Button
          label={buyingHint ? 'Loading ad' : 'Hint'}
          note={
            buyingHint
              ? 'one moment'
              : spent
                ? 'none left'
                : `${left} left · ${adsAvailable() ? 'ad, ' : ''}${HINT_COST}`
          }
          accessibilityLabel={
            adsAvailable()
              ? `Watch an ad for a hint. Costs ${HINT_COST}`
              : `Show a hint. Costs ${HINT_COST}`
          }
          disabled={!running || buyingHint || spent}
          onPress={onHint}
        />
        <Button label="Pause" accessibilityLabel="Pause the level" onPress={onPause} />
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
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  bottom: { alignItems: 'flex-end' },
  mirrored: { flexDirection: 'row-reverse' },
  world: { color: color.textMuted, fontFamily: font.body, fontSize: type.caption },
  level: { color: color.text, fontFamily: font.mono, fontSize: type.label },
  misses: { color: color.textMuted, fontFamily: font.mono, fontSize: type.label },
});
