import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { ComposedGesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';
import type { Transforms3d } from '@shopify/react-native-skia';
import { MAX_ZOOM } from './constants';
import {
  clampOffset,
  clampZoom,
  coverZoom,
  offsetBounds,
  offsetFor,
  screenToWorld,
  type Viewport,
} from './camera';
import type { Extent } from './constants';
import type { Point } from './types';

/** A tap is a tap only if the finger barely moved and barely lingered. */
const TAP_TRAVEL = 8;
const TAP_DURATION = 420;

/** Settle for the win move: firm, no overshoot to speak of. */
const FOCUS_SPRING = { damping: 22, stiffness: 130, mass: 1 } as const;

export interface Camera {
  transform: DerivedValue<Transforms3d>;
  gesture: ComposedGesture;
  minZoom: number;
  zoom: SharedValue<number>;
  /** Where the finger last was, in screen points. Drives the lantern. */
  touchX: SharedValue<number>;
  touchY: SharedValue<number>;
  /** Frames a world point in the middle of the screen at the given zoom. */
  focusOn: (point: Point, zoom: number, animated: boolean) => void;
}

export function useCamera(
  viewport: Viewport,
  world: Extent | null,
  onTap: (point: Point) => void,
  onPanStart: () => void,
  interactive: boolean
): Camera {
  const zoom = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);

  const { width, height } = viewport;
  // A board with no size yet still needs a valid camera, so stand in with the
  // viewport itself: zoom one, nothing to pan, nothing to divide by zero.
  const worldWidth = world?.width ?? width;
  const worldHeight = world?.height ?? height;
  const minZoom = useMemo(
    () => coverZoom({ width, height }, { width: worldWidth, height: worldHeight }),
    [width, height, worldWidth, worldHeight]
  );

  const tapRef = useRef(onTap);
  useEffect(() => {
    tapRef.current = onTap;
  }, [onTap]);
  // Stable across renders, so changing the handler never rebuilds the gestures.
  const handleTap = useCallback((point: Point) => tapRef.current(point), []);
  const panRef = useRef(onPanStart);
  useEffect(() => {
    panRef.current = onPanStart;
  }, [onPanStart]);
  const handlePanStart = useCallback(() => panRef.current(), []);

  useEffect(() => {
    // A new viewport means a new fit, so frame the whole board again.
    cancelAnimation(offsetX);
    cancelAnimation(offsetY);
    zoom.value = minZoom;
    offsetX.value = clampOffset(0, minZoom, width, worldWidth);
    offsetY.value = clampOffset(0, minZoom, height, worldHeight);
    touchX.value = width / 2;
    touchY.value = height / 2;
  }, [minZoom, width, height, worldWidth, worldHeight, zoom, offsetX, offsetY, touchX, touchY]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(interactive)
      .onStart(() => {
        cancelAnimation(offsetX);
        cancelAnimation(offsetY);
        startX.value = offsetX.value;
        startY.value = offsetY.value;
        runOnJS(handlePanStart)();
      })
      .onUpdate((event) => {
        touchX.value = event.x;
        touchY.value = event.y;
        offsetX.value = clampOffset(startX.value + event.translationX, zoom.value, width, worldWidth);
        offsetY.value = clampOffset(
          startY.value + event.translationY,
          zoom.value,
          height,
          worldHeight
        );
      })
      .onEnd((event) => {
        const horizontal = offsetBounds(zoom.value, width, worldWidth);
        const vertical = offsetBounds(zoom.value, height, worldHeight);
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
      .enabled(interactive)
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
        touchX.value = event.focalX;
        touchY.value = event.focalY;
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
          worldWidth
        );
        offsetY.value = clampOffset(
          pinnedY + (event.focalY - anchorY.value),
          next,
          height,
          worldHeight
        );
      });

    const tap = Gesture.Tap()
      .enabled(interactive)
      .numberOfTaps(1)
      .maxDuration(TAP_DURATION)
      .maxDistance(TAP_TRAVEL)
      .onEnd((event, success) => {
        touchX.value = event.x;
        touchY.value = event.y;
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
    handlePanStart,
    interactive,
    width,
    height,
    worldWidth,
    worldHeight,
    minZoom,
    zoom,
    offsetX,
    offsetY,
    startZoom,
    startX,
    startY,
    anchorX,
    anchorY,
    touchX,
    touchY,
  ]);

  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: offsetX.value },
    { translateY: offsetY.value },
    { scale: zoom.value },
  ]);

  const focusOn = useCallback(
    (point: Point, target: number, animated: boolean) => {
      const next = clampZoom(target, minZoom, MAX_ZOOM);
      const x = clampOffset(offsetFor(point.x, width / 2, next), next, width, worldWidth);
      const y = clampOffset(offsetFor(point.y, height / 2, next), next, height, worldHeight);
      cancelAnimation(offsetX);
      cancelAnimation(offsetY);
      cancelAnimation(zoom);
      if (!animated) {
        zoom.value = next;
        offsetX.value = x;
        offsetY.value = y;
        return;
      }
      zoom.value = withSpring(next, FOCUS_SPRING);
      offsetX.value = withSpring(x, FOCUS_SPRING);
      offsetY.value = withSpring(y, FOCUS_SPRING);
    },
    [minZoom, width, height, worldWidth, worldHeight, zoom, offsetX, offsetY]
  );

  return useMemo(
    () => ({ transform, gesture, minZoom, zoom, touchX, touchY, focusOn }),
    [transform, gesture, minZoom, zoom, touchX, touchY, focusOn]
  );
}
