import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import { Canvas, FilterMode, Group, Image, MipmapMode } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { color, motion, radius } from '@/ui/tokens';
import type { LevelConfig } from './difficulty';
import { generateWorld } from './generate';
import { findNeedle, hitTest } from './hit';
import { FoundMark, Spotlight } from './Overlays';
import { rasterizeWorld } from './render';
import { textureFor } from './constants';
import type { Point, World } from './types';

const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;
const TAP_TRAVEL = 8;
const TAP_DURATION = 420;
const FOUND_RING = 34;

interface TutorialBoardProps {
  config: LevelConfig;
  size: number;
  colourBlindSafe: boolean;
  reducedMotion: boolean;
  onHit: (kind: string | null) => void;
  found: boolean;
}

/**
 * A real board, small enough to fit a card whole so there is nothing to pan or
 * pinch. Tapping it is the same act as tapping the game.
 */
export function TutorialBoard({
  config,
  size,
  colourBlindSafe,
  reducedMotion,
  onHit,
  found,
}: TutorialBoardProps) {
  const [built, setBuilt] = useState<{ world: World; texture: SkImage } | null>(null);
  const halo = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      try {
        const world = generateWorld(config, 1, colourBlindSafe);
        setBuilt({ world, texture: rasterizeWorld(world, textureFor(world.size)) });
      } catch {
        setBuilt(null);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [config, colourBlindSafe]);

  useEffect(() => {
    halo.value = found ? withTiming(1, { duration: reducedMotion ? 0 : motion.normal }) : 0;
  }, [found, reducedMotion, halo]);

  const world = built?.world ?? null;
  const needle = useMemo(() => (world ? findNeedle(world) : null), [world]);
  const scale = world ? size / world.size : 1;

  const report = useCallback(
    (x: number, y: number) => {
      if (!world) {
        return;
      }
      const struck = hitTest(world, { x, y } satisfies Point);
      onHit(struck?.kind ?? null);
    },
    [world, onHit]
  );

  const gesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(TAP_DURATION)
        .maxDistance(TAP_TRAVEL)
        .onEnd((event, success) => {
          if (!success) {
            return;
          }
          runOnJS(report)(event.x / scale, event.y / scale);
        }),
    [scale, report]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.frame, { width: size, height: size }]}>
        {built ? (
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={[{ scale }]}>
              <Image
                image={built.texture}
                x={0}
                y={0}
                width={built.world.size}
                height={built.world.size}
                fit="fill"
                sampling={SAMPLING}
              />
              {needle && found ? (
                <>
                  <Spotlight
                    worldSize={built.world.size}
                    centre={needle}
                    radius={built.world.size * 0.34}
                    opacity={halo}
                  />
                  <FoundMark at={needle} radius={FOUND_RING} />
                </>
              ) : null}
            </Group>
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
});
