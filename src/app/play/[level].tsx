import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Board } from '@/game/Board';
import type { Viewport } from '@/game/camera';
import { useBoard } from '@/game/useBoard';
import type { Point } from '@/game/types';
import { Message } from '@/ui/components/Message';
import { color, font, radius, space, type } from '@/ui/tokens';

export default function PlayScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ level?: string }>();
  const levelId = Number.parseInt(params.level ?? '', 10);
  const board = useBoard(levelId, 1);

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [lastTap, setLastTap] = useState<Point | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((current) =>
      current && current.width === width && current.height === height ? current : { width, height }
    );
  }, []);

  const onTap = useCallback((point: Point) => setLastTap(point), []);

  return (
    <View style={styles.root} onLayout={onLayout}>
      {board.status === 'loading' ? <Message title="Building the pile" busy /> : null}
      {board.status === 'error' ? (
        <Message title="This board could not be built" detail={board.message} />
      ) : null}
      {board.status === 'ready' && viewport ? (
        <Board world={board.world} texture={board.texture} viewport={viewport} onTap={onTap} />
      ) : null}
      {__DEV__ && lastTap ? (
        <View style={styles.readout} pointerEvents="none">
          <Text style={styles.readoutText}>
            {`${Math.round(lastTap.x)}, ${Math.round(lastTap.y)}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.ink,
  },
  readout: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
  },
  readoutText: {
    color: color.textMuted,
    fontFamily: font.mono,
    fontSize: type.caption,
  },
});
