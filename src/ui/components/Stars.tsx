import { StyleSheet, Text, View } from 'react-native';
import { MAX_STARS } from '@/game/scoring';
import { color, font, space, type } from '../tokens';

interface StarsProps {
  earned: number;
  size?: number;
}

export function Stars({ earned, size = type.title }: StarsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${earned} of ${MAX_STARS} stars`}
    >
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <Text
          key={index}
          style={[styles.star, { fontSize: size }, index < earned ? styles.on : styles.off]}
        >
          {index < earned ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  star: { fontFamily: font.mono },
  on: { color: color.gold },
  off: { color: color.goldDim, opacity: 0.45 },
});
