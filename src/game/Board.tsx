import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Canvas, FilterMode, Group, Image, MipmapMode, vec } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { motion } from '@/ui/tokens';
import type { Viewport } from './camera';
import { FoundMark, Glint, Haze, Lantern, Spotlight, Vignette } from './Overlays';
import { OBJECT_LENGTH } from './constants';
import type { Modifier } from './difficulty';
import type { Drift } from './useDrift';
import type { Camera } from './useCamera';
import type { BoardObject, Point, World } from './types';

/** Mipmaps keep the pile from shimmering when the board is zoomed out. */
const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;

/** How much of the board the win spotlight leaves lit, in world units. */
const WIN_HALO = 210;
/** The lantern's reach, as a fraction of the shorter side of the screen. */
const LANTERN_REACH = 0.34;
/** Ring drawn around a needle already found on a twin level. */
const FOUND_RING = 30;

interface BoardProps {
  world: World;
  texture: SkImage;
  camera: Camera;
  drift: Drift;
  viewport: Viewport;
  /** The needle the win moment frames. */
  needle: BoardObject;
  modifier: Modifier | undefined;
  /** Centre of the hint halo while a hint is showing, otherwise null. */
  hint: { centre: Point; radius: number } | null;
  /** Needles already found, on twin levels. */
  found: readonly Point[];
  /** Bumped on every miss. Drives the vignette pulse. */
  missSerial: number;
  celebrating: boolean;
  reducedMotion: boolean;
}

export function Board({
  world,
  texture,
  camera,
  drift,
  viewport,
  needle,
  modifier,
  hint,
  found,
  missSerial,
  celebrating,
  reducedMotion,
}: BoardProps) {
  const hintOpacity = useSharedValue(0);
  const missOpacity = useSharedValue(0);
  const winOpacity = useSharedValue(0);
  const glintOpacity = useSharedValue(0);
  const glintProgress = useSharedValue(0);

  useEffect(() => {
    hintOpacity.value = withTiming(hint ? 1 : 0, { duration: motion.normal });
  }, [hint, hintOpacity]);

  useEffect(() => {
    if (missSerial === 0) {
      return;
    }
    missOpacity.value = withSequence(
      withTiming(1, { duration: motion.quick }),
      withTiming(0, { duration: motion.slow })
    );
  }, [missSerial, missOpacity]);

  useEffect(() => {
    if (!celebrating) {
      winOpacity.value = 0;
      glintOpacity.value = 0;
      glintProgress.value = 0;
      return;
    }
    if (reducedMotion) {
      // No travel and no fade: one static, highlighted frame.
      winOpacity.value = 1;
      glintProgress.value = 0.5;
      glintOpacity.value = 0.8;
      return;
    }
    winOpacity.value = withTiming(1, { duration: 320 });
    glintProgress.value = withDelay(140, withTiming(1, { duration: 520 }));
    glintOpacity.value = withDelay(
      140,
      withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 380 }))
    );
  }, [celebrating, reducedMotion, winOpacity, glintOpacity, glintProgress]);

  const centre = vec(world.size / 2, world.size / 2);
  // The lantern goes out for the win moment, or the payoff happens in the dark.
  const lanternOn = modifier === 'lantern' && !celebrating;

  return (
    <GestureDetector gesture={camera.gesture}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={camera.transform}>
          <Group transform={drift.transform} origin={centre}>
            <Image
              image={texture}
              x={0}
              y={0}
              width={world.size}
              height={world.size}
              fit="fill"
              sampling={SAMPLING}
            />
            {found.map((point, index) => (
              <FoundMark key={index} at={point} radius={FOUND_RING} />
            ))}
            {hint ? (
              <Spotlight
                worldSize={world.size}
                centre={hint.centre}
                radius={hint.radius}
                opacity={hintOpacity}
              />
            ) : null}
            {celebrating ? (
              <>
                <Spotlight
                  worldSize={world.size}
                  centre={needle}
                  radius={WIN_HALO}
                  opacity={winOpacity}
                />
                <Glint
                  needle={needle}
                  angle={needle.angle}
                  length={OBJECT_LENGTH.needle * needle.scale}
                  progress={glintProgress}
                  opacity={glintOpacity}
                />
              </>
            ) : null}
          </Group>
        </Group>
        {modifier === 'haze' ? <Haze width={viewport.width} height={viewport.height} /> : null}
        {lanternOn ? (
          <Lantern
            width={viewport.width}
            height={viewport.height}
            touchX={camera.touchX}
            touchY={camera.touchY}
            radius={Math.min(viewport.width, viewport.height) * LANTERN_REACH}
          />
        ) : null}
        <Vignette width={viewport.width} height={viewport.height} opacity={missOpacity} />
      </Canvas>
    </GestureDetector>
  );
}
