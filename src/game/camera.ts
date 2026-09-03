import { MIN_ZOOM_SLACK } from './constants';
import type { Extent } from './constants';
import type { Point } from './types';

/**
 * Camera model. Screen point = world point * zoom + offset. Every function
 * here is a worklet so the gesture handlers can call them on the UI thread.
 */

export interface Viewport {
  width: number;
  height: number;
}

export interface OffsetBounds {
  low: number;
  high: number;
}

/**
 * The smallest zoom the camera will go to. Taking the larger of the two ratios
 * is why the board never shows a black band, and the slack on top is why it
 * can still be panned once it is there.
 */
export function coverZoom(viewport: Viewport, world: Extent): number {
  'worklet';
  const cover = Math.max(viewport.width / world.width, viewport.height / world.height);
  return cover * MIN_ZOOM_SLACK;
}

/**
 * How far the board may be pushed along one axis. When the board is narrower
 * than the screen on that axis there is nothing to pan, so it stays centred.
 */
export function offsetBounds(zoom: number, extent: number, worldSize: number): OffsetBounds {
  'worklet';
  const span = worldSize * zoom;
  if (span <= extent) {
    const centred = (extent - span) / 2;
    return { low: centred, high: centred };
  }
  return { low: extent - span, high: 0 };
}

export function clampOffset(
  offset: number,
  zoom: number,
  extent: number,
  worldSize: number
): number {
  'worklet';
  const bounds = offsetBounds(zoom, extent, worldSize);
  return Math.min(bounds.high, Math.max(bounds.low, offset));
}

export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  'worklet';
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Point {
  'worklet';
  return { x: (screenX - offsetX) / zoom, y: (screenY - offsetY) / zoom };
}

/** The offset that puts a world point at a given screen point. */
export function offsetFor(worldValue: number, screenValue: number, zoom: number): number {
  'worklet';
  return screenValue - worldValue * zoom;
}
