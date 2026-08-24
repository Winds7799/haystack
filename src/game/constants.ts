import type { ObjectKind } from './types';

/** Board geometry, in world units. One world unit is one straw-width-ish. */

/**
 * The board is a tall rectangle, not a square, so that it fills a phone screen
 * at every zoom instead of letterboxing against black. The area is held at the
 * square board's 3.24 million square units, which is what keeps the straw
 * counts, occlusion bands and clearances in the level curve meaningful.
 *
 * Two to one covers every phone: taller screens pan a little horizontally,
 * shorter ones a little vertically, and neither ever sees past an edge.
 */
export const WORLD_WIDTH = 1270;
export const WORLD_HEIGHT = 2550;

/** The scale distances in this file are quoted against. */
export const WORLD_REFERENCE = WORLD_WIDTH;

/**
 * Straw is allowed to spill this far past the edge, and the texture is baked
 * that much larger than the board. Rotating the pile then never uncovers a
 * corner: a 2.5 degree turn moves the far edge by about 56 units, well inside
 * this margin.
 */
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

/** Pixels a board texture may use, however that board is shaped. */
export const TEXTURE_BUDGET = 2048 * 2048;

/**
 * Pixels per world unit to aim for. A full board hits the budget long before
 * this, which is why it is soft at full magnification; the small boards the
 * tutorial uses come out crisp.
 */
const TEXTURE_DENSITY = 2.2;

export interface Extent {
  width: number;
  height: number;
}

/**
 * Budgets by total pixels rather than by side, so a tall board is no more
 * expensive to hold in memory than a square one of the same area.
 */
/** The board plus its bleed — what actually gets drawn into a texture. */
export function outerOf({ width, height }: Extent): Extent {
  return { width: width + WORLD_BLEED * 2, height: height + WORLD_BLEED * 2 };
}

export function textureFor({ width, height }: Extent): Extent {
  const wanted = Math.min(TEXTURE_DENSITY, Math.sqrt(TEXTURE_BUDGET / (width * height)));
  const density = Math.max(0.5, wanted);
  return { width: Math.round(width * density), height: Math.round(height * density) };
}

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
