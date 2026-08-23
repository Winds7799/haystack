import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Canvas, FilterMode, Group, Image, MipmapMode } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { Viewport } from './camera';
import { useCamera } from './useCamera';
import type { Point, World } from './types';

/** Mipmaps keep the pile from shimmering when the board is zoomed out. */
const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;

interface BoardProps {
  world: World;
  texture: SkImage;
  viewport: Viewport;
  onTap: (point: Point) => void;
}

export function Board({ world, texture, viewport, onTap }: BoardProps) {
  const camera = useCamera(viewport, world.size, onTap);
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
        </Group>
      </Canvas>
    </GestureDetector>
  );
}
