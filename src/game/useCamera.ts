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
  // Where each gesture last was, so every event applies only what changed
  // since the one before. Pan and pinch both move the same offset, and with
  // deltas they add up instead of fighting over whose baseline is right.
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastScale = useSharedValue(1);
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
      .onStart((event) => {
        cancelAnimation(offsetX);
        cancelAnimation(offsetY);
        // The board follows from here. The distance the finger crossed to
        // count as a pan at all is not replayed as a jump on the first frame.
        lastX.value = event.translationX;
        lastY.value = event.translationY;
        runOnJS(handlePanStart)();
      })
      .onUpdate((event) => {
        touchX.value = event.x;
        touchY.value = event.y;
        const dx = event.translationX - lastX.value;
        const dy = event.translationY - lastY.value;
        lastX.value = event.translationX;
        lastY.value = event.translationY;
        offsetX.value = clampOffset(offsetX.value + dx, zoom.value, width, worldWidth);
        offsetY.value = clampOffset(offsetY.value + dy, zoom.value, height, worldHeight);
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
        lastScale.value = event.scale;
      })
      .onUpdate((event) => {
        touchX.value = event.focalX;
        touchY.value = event.focalY;
        const change = lastScale.value > 0 ? event.scale / lastScale.value : 1;
        lastScale.value = event.scale;
        const next = clampZoom(zoom.value * change, minZoom, MAX_ZOOM);
        const growth = next / zoom.value;
        // Only the scale is applied here, about the point under the fingers.
        // Their travel across the screen is the pan's, which tracks the same
        // two fingers, so the board neither jumps nor lags between the two.
        zoom.value = next;
        offsetX.value = clampOffset(
          event.focalX - (event.focalX - offsetX.value) * growth,
          next,
          width,
          worldWidth
        );
        offsetY.value = clampOffset(
          event.focalY - (event.focalY - offsetY.value) * growth,
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
    lastX,
    lastY,
    lastScale,
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
