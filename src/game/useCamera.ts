import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { ComposedGesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import type { DerivedValue } from 'react-native-reanimated';
import type { Transforms3d } from '@shopify/react-native-skia';
import { MAX_ZOOM } from './constants';
import {
  clampOffset,
  clampZoom,
  fitZoom,
  offsetBounds,
  screenToWorld,
  type Viewport,
} from './camera';
import type { Point } from './types';

/** A tap is a tap only if the finger barely moved and barely lingered. */
const TAP_TRAVEL = 8;
const TAP_DURATION = 420;

export interface Camera {
  transform: DerivedValue<Transforms3d>;
  gesture: ComposedGesture;
  minZoom: number;
}

export function useCamera(viewport: Viewport, worldSize: number, onTap: (point: Point) => void): Camera {
  const zoom = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);

  const { width, height } = viewport;
  const minZoom = useMemo(() => fitZoom({ width, height }, worldSize), [width, height, worldSize]);

  const tapRef = useRef(onTap);
  useEffect(() => {
    tapRef.current = onTap;
  }, [onTap]);
  // Stable across renders, so changing the handler never rebuilds the gestures.
  const handleTap = useCallback((point: Point) => tapRef.current(point), []);

  useEffect(() => {
    // A new viewport means a new fit, so frame the whole board again.
    cancelAnimation(offsetX);
    cancelAnimation(offsetY);
    zoom.value = minZoom;
    offsetX.value = clampOffset(0, minZoom, width, worldSize);
    offsetY.value = clampOffset(0, minZoom, height, worldSize);
  }, [minZoom, width, height, worldSize, zoom, offsetX, offsetY]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart(() => {
        cancelAnimation(offsetX);
        cancelAnimation(offsetY);
        startX.value = offsetX.value;
        startY.value = offsetY.value;
      })
      .onUpdate((event) => {
        offsetX.value = clampOffset(startX.value + event.translationX, zoom.value, width, worldSize);
        offsetY.value = clampOffset(
          startY.value + event.translationY,
          zoom.value,
          height,
          worldSize
        );
      })
      .onEnd((event) => {
        const horizontal = offsetBounds(zoom.value, width, worldSize);
        const vertical = offsetBounds(zoom.value, height, worldSize);
        offsetX.value = withDecay({
          velocity: event.velocityX,
          clamp: [horizontal.low, horizontal.high],
          rubberBandEffect: true,
          deceleration: 0.994,
        });
        offsetY.value = withDecay({
          velocity: event.velocityY,
          clamp: [vertical.low, vertical.high],
          rubberBandEffect: true,
          deceleration: 0.994,
        });
      });

    const pinch = Gesture.Pinch()
      .onStart((event) => {
        cancelAnimation(offsetX);
        cancelAnimation(offsetY);
        startZoom.value = zoom.value;
        startX.value = offsetX.value;
        startY.value = offsetY.value;
        anchorX.value = event.focalX;
        anchorY.value = event.focalY;
      })
      .onUpdate((event) => {
        const next = clampZoom(startZoom.value * event.scale, minZoom, MAX_ZOOM);
        const growth = next / startZoom.value;
        // Hold the world point under the fingers still, then let the fingers
        // drag the board as they travel.
        const pinnedX = anchorX.value - (anchorX.value - startX.value) * growth;
        const pinnedY = anchorY.value - (anchorY.value - startY.value) * growth;
        zoom.value = next;
        offsetX.value = clampOffset(
          pinnedX + (event.focalX - anchorX.value),
          next,
          width,
          worldSize
        );
        offsetY.value = clampOffset(
          pinnedY + (event.focalY - anchorY.value),
          next,
          height,
          worldSize
        );
      });

    const tap = Gesture.Tap()
      .numberOfTaps(1)
      .maxDuration(TAP_DURATION)
      .maxDistance(TAP_TRAVEL)
      .onEnd((event, success) => {
        if (!success) {
          return;
        }
        const point = screenToWorld(event.x, event.y, offsetX.value, offsetY.value, zoom.value);
        runOnJS(handleTap)(point);
      });

    // A pinch or a pan wins outright, so lifting off either never reads as a tap.
    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [
    handleTap,
    width,
    height,
    worldSize,
    minZoom,
    zoom,
    offsetX,
    offsetY,
    startZoom,
    startX,
    startY,
    anchorX,
    anchorY,
  ]);

  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: offsetX.value },
    { translateY: offsetY.value },
    { scale: zoom.value },
  ]);

  return { transform, gesture, minZoom };
}
