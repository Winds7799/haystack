/** Every object kind that can appear on the board. */
export const OBJECT_KINDS = [
  'needle',
  'nail',
  'pin',
  'wire',
  'splinter',
  'staple',
  'brokenNeedle',
] as const;

export type ObjectKind = (typeof OBJECT_KINDS)[number];

export type DecoyKind = Exclude<ObjectKind, 'needle'>;

export interface Point {
  x: number;
  y: number;
}

/**
 * Straw is held as parallel arrays rather than objects: a board carries tens of
 * thousands of stalks, and this keeps generation allocation-free and the draw
 * loop cache friendly. Index `i` is one stalk in every array.
 *
 * `depth` is implicit — stalk `i` is drawn after stalk `i - 1`, so the index is
 * the draw order, and `i / count` is the stalk's height in the pile.
 */
export interface StrawField {
  count: number;
  /** Centre of the stalk. */
  x: Float32Array;
  y: Float32Array;
  /** Radians. */
  angle: Float32Array;
  length: Float32Array;
  width: Float32Array;
  /** How far the middle of the stalk bends off the line between its ends. */
  bow: Float32Array;
  /** Index into STRAW_PALETTE. */
  color: Uint8Array;
}

/** The needle, and anything meant to be mistaken for it. */
export interface BoardObject {
  kind: ObjectKind;
  x: number;
  y: number;
  /** Radians. */
  angle: number;
  /** Multiplier on the kind's nominal length. */
  scale: number;
  /**
   * Height in the pile, always a multiple of 1 / DEPTH_SLICES: the object is
   * drawn between two straw layers, never inside one.
   */
  depth: number;
  /** 0 = lying in the open, 1 = completely buried. Measured at generation. */
  occlusion: number;
}

export interface Ground {
  centre: string;
  edge: string;
}

export interface World {
  seed: number;
  /** The play area, in world units. */
  width: number;
  height: number;
  straw: StrawField;
  /** Sorted by depth, ascending. Includes every needle. */
  objects: readonly BoardObject[];
  ground: Ground;
  /** How close this level's decoys are drawn to a needle. */
  similarity: number;
  /** Decoys drawn with shape emphasis instead of relying on colour alone. */
  colourBlindSafe: boolean;
}
