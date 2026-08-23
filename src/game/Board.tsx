import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Canvas, FilterMode, Group, Image, MipmapMode } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { motion } from '@/ui/tokens';
import type { Viewport } from './camera';
import { Glint, Spotlight, Vignette } from './Overlays';
import { OBJECT_LENGTH } from './constants';
import type { Camera } from './useCamera';
import type { BoardObject, Point, World } from './types';

/** Mipmaps keep the pile from shimmering when the board is zoomed out. */
const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;

/** How much of the board the win spotlight leaves lit, in world units. */
const WIN_HALO = 210;

interface BoardProps {
  world: World;
  texture: SkImage;
  camera: Camera;
  viewport: Viewport;
  needle: BoardObject;
  /** Centre of the hint halo while a hint is showing, otherwise null. */
  hint: { centre: Point; radius: number } | null;
  /** Bumped on every miss. Drives the vignette pulse. */
  missSerial: number;
  celebrating: boolean;
  reducedMotion: boolean;
}

export function Board({
  world,
  texture,
  camera,
  viewport,
  needle,
  hint,
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

  return (
    <GestureDetector gesture={camera.gesture}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={camera.transform}>
          <Image
            image={texture}
            x={0}
            y={0}
            width={world.size}
            height={world.size}
            fit="fill"
            sampling={SAMPLING}
          />
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
        <Vignette width={viewport.width} height={viewport.height} opacity={missOpacity} />
      </Canvas>
    </GestureDetector>
  );
}
