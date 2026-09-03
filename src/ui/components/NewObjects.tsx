import { Canvas, Image } from '@shopify/react-native-skia';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KIND_BLURB } from '@/game/copy';
import { plateImage } from '@/game/plate';
import type { ObjectKind } from '@/game/types';
import { color, font, radius, space, type } from '../tokens';
import { Button } from './Button';

interface NewObjectsProps {
  /** Kinds appearing for the first time, needle first. */
  kinds: readonly ObjectKind[];
  /** The level's similarity, so each is drawn exactly as it will appear. */
  similarity: number;
  colourBlindSafe: boolean;
  onDismiss: () => void;
}

const PLATE_WIDTH = 240;
const PLATE_HEIGHT = 44;

/**
 * Shown the first time a level puts a new kind of thing on the board, and
 * never again. Each is drawn from the same art the board uses, at the same
 * similarity, so what you study here is what you will actually be hunting.
 */
export function NewObjects({ kinds, similarity, colourBlindSafe, onDismiss }: NewObjectsProps) {
  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {kinds.length > 2 ? 'New on this board' : 'New on this board'}
        </Text>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {kinds.map((kind) => (
            <View key={kind} style={styles.entry}>
              <Plate kind={kind} similarity={similarity} colourBlindSafe={colourBlindSafe} />
              <Text style={styles.name}>{KIND_BLURB[kind].title}</Text>
              <Text style={styles.tell}>{KIND_BLURB[kind].tell}</Text>
            </View>
          ))}
        </ScrollView>
        <Button label="Start" tone="primary" onPress={onDismiss} style={styles.button} />
      </View>
    </View>
  );
}

function Plate({
  kind,
  similarity,
  colourBlindSafe,
}: {
  kind: ObjectKind;
  similarity: number;
  colourBlindSafe: boolean;
}) {
  const image = plateImage(kind, similarity, colourBlindSafe, PLATE_WIDTH, PLATE_HEIGHT);
  return (
    <Canvas style={styles.plate} accessibilityLabel={`${KIND_BLURB[kind].title}, drawn to scale`}>
      <Image image={image} x={0} y={0} width={PLATE_WIDTH} height={PLATE_HEIGHT} fit="fill" />
    </Canvas>
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
    paddingHorizontal: space.xl,
    backgroundColor: color.scrim,
  },
  panel: {
    maxHeight: '84%',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: { color: color.text, fontFamily: font.display, fontSize: type.heading },
  list: { gap: space.lg, paddingBottom: space.sm },
  entry: { alignItems: 'center', gap: space.xs },
  plate: { width: PLATE_WIDTH, height: PLATE_HEIGHT },
  name: { color: color.text, fontFamily: font.body, fontSize: type.body },
  tell: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.label,
    textAlign: 'center',
    maxWidth: PLATE_WIDTH,
  },
  button: { alignSelf: 'stretch' },
});
