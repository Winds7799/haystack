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

/** The zoom at which the whole board is visible. Also the minimum zoom. */
export function fitZoom(viewport: Viewport, worldSize: number): number {
  'worklet';
  return Math.min(viewport.width, viewport.height) / worldSize;
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
