import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, FilterMode, Group, Image, MipmapMode } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { Transforms3d } from '@shopify/react-native-skia';
import { BARN } from './worlds';
import { generateWorld } from './generate';
import { WORLD_BLEED, outerOf } from './constants';
import { rasterizeWorld } from './render';

/**
 * The pile behind the home screen. Decorative only: a small cheap board that
 * turns slowly at low opacity, and holds still entirely under reduced motion.
 */

const AMBIENT_SIZE = 900;
/**
 * Deliberately small. This board is decorative, sits at a third opacity and
 * never stops moving, so detail here would only cost the home screen its
 * first second.
 */
const AMBIENT_TEXTURE = 768;
const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;
/** One full turn every few minutes — slow enough to read as stillness. */
const PERIOD = 240000;

export function AmbientBoard({
  width,
  height,
  reducedMotion,
}: {
  width: number;
  height: number;
  reducedMotion: boolean;
}) {
  const [texture, setTexture] = useState<SkImage | null>(null);
  const spin = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    // A timer, not requestAnimationFrame, for the same reason the level board
    // uses one: rAF is suspended while the app is hidden, and a landing screen
    // opened in the background would never get its backdrop.
    const frame = setTimeout(() => {
      if (cancelled) {
        return;
      }
      try {
        const world = generateWorld(
          {
            id: 0,
            world: BARN,
            strawCount: 5200,
            worldWidth: AMBIENT_SIZE,
            worldHeight: AMBIENT_SIZE,
            similarity: 0,
            decoys: [],
            occlusion: [0, 1],
            par: [1, 2],
          },
          1,
          false
        );
        setTexture(rasterizeWorld(world, { width: AMBIENT_TEXTURE, height: AMBIENT_TEXTURE }));
      } catch {
        // A missing backdrop is not worth blocking the home screen for.
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(frame);
    };
  }, []);

  const frame = useFrameCallback((info) => {
    spin.value += ((info.timeSincePreviousFrame ?? 0) / PERIOD) * Math.PI * 2;
  }, false);

  useEffect(() => {
    frame.setActive(!reducedMotion && texture !== null);
  }, [frame, reducedMotion, texture]);

  // Cover the screen at any rotation: the board is square, so its inscribed
  // circle has to reach the far corner.
  const cover = Math.hypot(width, height) / AMBIENT_SIZE;
  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: width / 2 },
    { translateY: height / 2 },
    { rotate: spin.value },
    { scale: cover },
    { translateX: -AMBIENT_SIZE / 2 },
    { translateY: -AMBIENT_SIZE / 2 },
  ]);

  if (!texture) {
    return null;
  }
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={transform} opacity={0.32}>
        <Image
          image={texture}
          x={-WORLD_BLEED}
          y={-WORLD_BLEED}
          width={AMBIENT_SIZE + WORLD_BLEED * 2}
          height={AMBIENT_SIZE + WORLD_BLEED * 2}
          fit="fill"
          sampling={SAMPLING}
        />
      </Group>
    </Canvas>
  );
}
