import { Blur, Circle, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { color } from '@/ui/tokens';
import { rgbaFromHex } from './palette';
import type { Point } from './types';

const CLEAR = rgbaFromHex(color.ink, 0);
const DIM = rgbaFromHex(color.ink, 0.9);
const FLUSH = rgbaFromHex(color.warning, 0);
const FLARE = rgbaFromHex(color.warning, 0.75);
const LIGHT = rgbaFromHex(color.steel, 0.85);

interface SpotlightProps {
  worldSize: number;
  centre: Point;
  radius: number;
  opacity: SharedValue<number>;
}

/**
 * Darkens the whole board except one circle. Used for the hint halo and again,
 * tighter, for the moment after the needle is found.
 */
export function Spotlight({ worldSize, centre, radius, opacity }: SpotlightProps) {
  return (
    <Rect x={0} y={0} width={worldSize} height={worldSize} opacity={opacity}>
      <RadialGradient
        c={vec(centre.x, centre.y)}
        r={radius}
        colors={[CLEAR, CLEAR, DIM]}
        positions={[0, 0.55, 1]}
      />
    </Rect>
  );
}

interface GlintProps {
  needle: Point;
  angle: number;
  length: number;
  /** 0 at the blunt end, 1 at the tip. */
  progress: SharedValue<number>;
  opacity: SharedValue<number>;
}

/** A soft light travelling the length of the needle. */
export function Glint({ needle, angle, length, progress, opacity }: GlintProps) {
  const along = Math.cos(angle);
  const across = Math.sin(angle);
  const half = length / 2;
  const centre = useDerivedValue(() => {
    const travel = -half + length * progress.value;
    return vec(needle.x + along * travel, needle.y + across * travel);
  });
  return (
    <Group blendMode="plus" opacity={opacity}>
      <Circle c={centre} r={length * 0.16} color={LIGHT}>
        <Blur blur={length * 0.09} />
      </Circle>
    </Group>
  );
}

interface VignetteProps {
  width: number;
  height: number;
  opacity: SharedValue<number>;
}

/** A red pulse at the edges of the screen. Never a full-screen flash. */
export function Vignette({ width, height, opacity }: VignetteProps) {
  return (
    <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
      <RadialGradient
        c={vec(width / 2, height / 2)}
        r={Math.max(width, height) * 0.66}
        colors={[FLUSH, FLUSH, FLARE]}
        positions={[0, 0.5, 1]}
      />
    </Rect>
  );
}
