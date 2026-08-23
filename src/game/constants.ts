import type { ObjectKind } from './types';

/** Board geometry, in world units. One world unit is one straw-width-ish. */

export const WORLD_SIZE = 1800;

/** Straw is allowed to spill this far past the edge so the pile has no seam. */
export const WORLD_BLEED = 96;

export const STRAW_LENGTH: readonly [number, number] = [46, 132];
export const STRAW_WIDTH: readonly [number, number] = [2.4, 6.2];
export const STRAW_BOW: readonly [number, number] = [-11, 11];

/**
 * Straw paths are emitted as integers in quarter units to keep the SVG path
 * strings short; the canvas scales them back down when they are drawn.
 */
export const STRAW_PRECISION = 4;

/**
 * Objects sit between straw layers rather than at an arbitrary depth, so the
 * occlusion the generator measures is exactly the occlusion that gets drawn.
 */
export const DEPTH_SLICES = 12;

/** How far the needle and every decoy stays from the world edge. */
export const OBJECT_MARGIN = 130;

/** Nothing may sit closer to the needle than this. */
export const NEEDLE_CLEARANCE = 170;

/** Nor closer to another decoy than this. */
export const DECOY_CLEARANCE = 96;

/** Screen points per world unit at full magnification. */
export const MAX_ZOOM = 1.25;

/** Side of the square texture the board is rasterised into, in pixels. */
export const TEXTURE_SIZE = 2048;

/** Nominal length along the local x axis, in world units. Tip points at +x. */
export const OBJECT_LENGTH: Record<ObjectKind, number> = {
  needle: 58,
  brokenNeedle: 41,
  nail: 52,
  pin: 46,
  wire: 66,
  splinter: 54,
  staple: 28,
};

/** Nominal thickness, in world units. Straw is 2.4 to 6.2 wide, for scale. */
export const OBJECT_WIDTH: Record<ObjectKind, number> = {
  needle: 4.2,
  brokenNeedle: 4.2,
  nail: 5,
  pin: 2.8,
  wire: 3.4,
  splinter: 5.2,
  staple: 3,
};
