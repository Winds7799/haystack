import type { DecoyKind } from './types';
import {
  BARN,
  BLACKOUT,
  CHAFF,
  DUSK,
  GRANARY,
  LOFT,
  NIGHTFALL,
  RAFTERS,
  STORM,
  THRESHER,
  type WorldSpec,
} from './worlds';

/**
 * The level curve, and the only place it is described.
 *
 * The rule this table obeys: difficulty comes from decoy similarity, not from
 * straw. Straw count barely moves — it only changes how long a sweep takes.
 * What changes is `similarity`, which pulls every decoy's colour and thickness
 * towards the needle's, and then, once that is exhausted, the number and kind
 * of things you have to rule out.
 *
 * A hundred levels is too many to write by hand without a typo becoming a
 * difficulty cliff, so the curve is expressed as ten bands of ten and expanded
 * below. Each band states where it starts and where it ends; every level in
 * between is interpolated. Tune a band, not a level.
 */

/** Extra rules a level can run under. */
export type Modifier = 'drift' | 'lantern' | 'haze' | 'twin';

export interface DecoySpec {
  kind: DecoyKind;
  count: number;
}

export interface LevelConfig {
  id: number;
  world: WorldSpec;
  strawCount: number;
  /**
   * 0 leaves each decoy its own colour and thickness; 1 gives it the needle's.
   * The main difficulty lever, and it is spent by level fifty.
   */
  similarity: number;
  decoys: readonly DecoySpec[];
  occlusion: readonly [min: number, max: number];
  par: readonly [three: number, two: number];
  modifier?: Modifier;
  /** Only the tutorial sets these; every real level uses the standard board. */
  worldWidth?: number;
  worldHeight?: number;
}

interface Band {
  world: WorldSpec;
  /** Similarity at the first and last level of the band. */
  similarity: readonly [number, number];
  /** Straw at the first and last level of the band. */
  straw: readonly [number, number];
  /** Occlusion floor at the first and last level. The band is always 0.16 wide. */
  occlusion: readonly [number, number];
  /** Three-star par at the first and last level, in seconds. */
  par: readonly [number, number];
  /** Which decoy kinds this band draws from, and how many in total. */
  kinds: readonly DecoyKind[];
  decoys: readonly [number, number];
  /**
   * Modifier for each level of the band, by position. `null` means none.
   * Ten entries, so the rhythm of a world is visible at a glance.
   */
  rhythm: readonly (Modifier | null)[];
}

const NONE = null;
const D = 'drift';
const L = 'lantern';
const H = 'haze';
const T = 'twin';

const BANDS: readonly Band[] = [
  // Barn. What a needle looks like, then what a nail looks like beside one.
  {
    world: BARN,
    similarity: [0, 0.22],
    straw: [26000, 30000],
    occlusion: [0, 0.18],
    par: [20, 55],
    kinds: ['nail', 'pin'],
    decoys: [0, 16],
    rhythm: [NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE, NONE],
  },
  // Loft. Wire, splinters and staples, closing on the needle's own colour.
  {
    world: LOFT,
    similarity: [0.26, 0.5],
    straw: [30000, 33000],
    occlusion: [0.18, 0.24],
    par: [55, 80],
    kinds: ['wire', 'splinter', 'staple', 'nail'],
    decoys: [12, 26],
    rhythm: [NONE, NONE, NONE, NONE, T, NONE, NONE, NONE, NONE, T],
  },
  // Dusk. The broken needle arrives. From here the eye is the whole game.
  {
    world: DUSK,
    similarity: [0.54, 0.74],
    straw: [33000, 35000],
    occlusion: [0.24, 0.28],
    par: [80, 105],
    kinds: ['brokenNeedle', 'wire', 'splinter'],
    decoys: [14, 30],
    rhythm: [NONE, H, NONE, H, NONE, NONE, H, NONE, H, NONE],
  },
  // Storm. The pile will not hold still. Motion, not density.
  {
    world: STORM,
    similarity: [0.76, 0.9],
    straw: [35000, 36500],
    occlusion: [0.28, 0.32],
    par: [105, 130],
    kinds: ['brokenNeedle', 'wire', 'staple'],
    decoys: [18, 34],
    rhythm: [D, D, NONE, D, T, D, NONE, D, D, D],
  },
  // Nightfall. You can only ever see the patch under your thumb.
  {
    world: NIGHTFALL,
    similarity: [0.92, 1],
    straw: [36500, 38000],
    occlusion: [0.32, 0.35],
    par: [130, 155],
    kinds: ['brokenNeedle', 'wire', 'splinter', 'staple'],
    decoys: [20, 38],
    rhythm: [L, L, L, L, T, L, L, L, L, L],
  },
  // Thresher. Similarity is spent. From here the pressure is sheer number:
  // every level is a longer list of things that are nearly right.
  {
    world: THRESHER,
    similarity: [1, 1],
    straw: [38000, 39000],
    occlusion: [0.35, 0.38],
    par: [155, 180],
    kinds: ['brokenNeedle', 'wire', 'splinter', 'staple', 'pin'],
    decoys: [34, 52],
    rhythm: [NONE, D, NONE, H, T, NONE, D, NONE, H, NONE],
  },
  // Granary. Broken needles outnumber everything else.
  {
    world: GRANARY,
    similarity: [1, 1],
    straw: [39000, 40000],
    occlusion: [0.38, 0.4],
    par: [180, 205],
    kinds: ['brokenNeedle', 'brokenNeedle', 'wire', 'staple'],
    decoys: [44, 62],
    rhythm: [H, NONE, D, NONE, T, H, NONE, D, NONE, H],
  },
  // Rafters. Drift becomes the norm rather than the exception.
  {
    world: RAFTERS,
    similarity: [1, 1],
    straw: [40000, 41000],
    occlusion: [0.4, 0.42],
    par: [205, 230],
    kinds: ['brokenNeedle', 'brokenNeedle', 'wire', 'splinter', 'staple'],
    decoys: [52, 70],
    rhythm: [D, D, H, D, T, D, D, H, D, D],
  },
  // Blackout. The lantern returns, and it never leaves.
  {
    world: BLACKOUT,
    similarity: [1, 1],
    straw: [41000, 42000],
    occlusion: [0.42, 0.44],
    par: [230, 255],
    kinds: ['brokenNeedle', 'brokenNeedle', 'wire', 'splinter', 'staple', 'pin'],
    decoys: [58, 78],
    rhythm: [L, L, L, L, T, L, L, L, L, L],
  },
  // Chaff. Everything at once, and two needles more often than not.
  {
    world: CHAFF,
    similarity: [1, 1],
    straw: [42000, 44000],
    occlusion: [0.44, 0.46],
    par: [255, 285],
    kinds: ['brokenNeedle', 'brokenNeedle', 'brokenNeedle', 'wire', 'splinter', 'staple', 'pin'],
    decoys: [66, 92],
    rhythm: [L, T, D, H, T, L, D, T, H, T],
  },
];

const PER_BAND = 10;
/** How wide an occlusion band is. Wide enough that the search always lands. */
const OCCLUSION_WIDTH = 0.16;

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Spreads a total across the band's kinds, heaviest on the first. */
function spread(kinds: readonly DecoyKind[], total: number): DecoySpec[] {
  const weights = kinds.map((_, index) => kinds.length - index);
  const sum = weights.reduce((a, b) => a + b, 0);
  const merged = new Map<DecoyKind, number>();
  kinds.forEach((kind, index) => {
    const count = Math.max(1, Math.round((total * weights[index]) / sum));
    merged.set(kind, (merged.get(kind) ?? 0) + count);
  });
  return [...merged].map(([kind, count]) => ({ kind, count }));
}

function expand(): LevelConfig[] {
  const levels: LevelConfig[] = [];
  BANDS.forEach((band, bandIndex) => {
    for (let step = 0; step < PER_BAND; step++) {
      const t = step / (PER_BAND - 1);
      const floor = lerp(band.occlusion[0], band.occlusion[1], t);
      const three = Math.round(lerp(band.par[0], band.par[1], t));
      const modifier = band.rhythm[step] ?? undefined;
      const total = Math.round(lerp(band.decoys[0], band.decoys[1], t));
      levels.push({
        id: bandIndex * PER_BAND + step + 1,
        world: band.world,
        strawCount: Math.round(lerp(band.straw[0], band.straw[1], t) / 500) * 500,
        similarity: Number(lerp(band.similarity[0], band.similarity[1], t).toFixed(3)),
        decoys: total > 0 ? spread(band.kinds, total) : [],
        occlusion: [Number(floor.toFixed(3)), Number((floor + OCCLUSION_WIDTH).toFixed(3))],
        // A twin level asks for two finds, so it gets proportionally longer.
        par: modifier === 'twin' ? [Math.round(three * 1.4), Math.round(three * 2.3)] : [three, Math.round(three * 1.7)],
        modifier,
      });
    }
  });
  return levels;
}

export const LEVELS: readonly LevelConfig[] = expand();

export const FIRST_LEVEL = LEVELS[0].id;
export const LAST_LEVEL = LEVELS[LEVELS.length - 1].id;

/** How many needles a level hides. */
export function needleCount(config: LevelConfig): number {
  return config.modifier === 'twin' ? 2 : 1;
}

export function findLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((level) => level.id === id);
}
