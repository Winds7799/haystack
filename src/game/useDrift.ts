import { useEffect } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';
import type { Transforms3d } from '@shopify/react-native-skia';

/**
 * Storm levels rock the whole pile. Driving it from accumulated frame time
 * rather than a repeating animation means the motion can be stopped and picked
 * up again — for a pause, or for the moment after a needle is found — without
 * the board ever snapping back to where the cycle started.
 *
 * A sine of this amplitude and period peaks at about 1.1 degrees a second.
 */
const AMPLITUDE = (2.5 * Math.PI) / 180;
const HALF_PERIOD = 7000;

export interface Drift {
  /** Current rotation in radians, readable from either thread. */
  angle: SharedValue<number>;
  transform: DerivedValue<Transforms3d>;
}

export function useDrift(active: boolean, reducedMotion: boolean, frozen: boolean): Drift {
  const angle = useSharedValue(0);
  const elapsed = useSharedValue(0);

  const frame = useFrameCallback((info) => {
    elapsed.value += info.timeSincePreviousFrame ?? 0;
    angle.value = AMPLITUDE * Math.sin((elapsed.value / HALF_PERIOD) * Math.PI);
  }, false);

  const running = active && !reducedMotion && !frozen;

  useEffect(() => {
    frame.setActive(running);
  }, [running, frame]);

  useEffect(() => {
    if (!active || reducedMotion) {
      elapsed.value = 0;
      angle.value = 0;
    }
  }, [active, reducedMotion, angle, elapsed]);

  const transform = useDerivedValue<Transforms3d>(() => [{ rotate: angle.value }]);
  return { angle, transform };
}
