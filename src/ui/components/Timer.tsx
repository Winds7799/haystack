import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatTime } from '@/game/scoring';
import { readElapsed } from '@/state/useRun';
import { color, font, type } from '../tokens';

/** Ticks on its own so the rest of the screen does not re-render with it. */
export function Timer({ running }: { running: boolean }) {
  const [label, setLabel] = useState(() => formatTime(readElapsed()));

  useEffect(() => {
    setLabel(formatTime(readElapsed()));
    if (!running) {
      return;
    }
    const id = setInterval(() => setLabel(formatTime(readElapsed())), 100);
    return () => clearInterval(id);
  }, [running]);

  return (
    <Text style={styles.text} accessibilityRole="text" accessibilityLabel={`Elapsed ${label}`}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: color.text,
    fontFamily: font.mono,
    fontSize: type.heading,
    fontVariant: ['tabular-nums'],
  },
});
