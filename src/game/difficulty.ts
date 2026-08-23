import { boardPalette } from '@/ui/tokens';
import type { DecoyKind } from './types';
import { BARN, DUSK, LOFT, NIGHTFALL, STORM, type WorldSpec } from './worlds';

/**
 * The level curve, and the only place it is described.
 *
 * The rule this table obeys: difficulty comes from decoy similarity, not from
 * straw. Straw count barely moves after world one — it only changes how long a
 * sweep takes. What changes is `similarity`, which pulls every decoy's colour
 * and thickness towards the needle's until a nail is nearly a needle and a
 * broken needle is one in every respect but the eye. Reach for similarity, or
 * for a new decoy kind, before reaching for more straw.
 *
 * Modifiers are seasoning. Never two on one level.
 */

/** Extra rules a level can run under. Exactly one, or none. */
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
   * The main difficulty lever.
   */
  similarity: number;
  decoys: readonly DecoySpec[];
  /**
   * How buried a needle is allowed to be, as the fraction of its length that
   * straw covers. The generator searches placements until it lands in the band.
   */
  occlusion: readonly [min: number, max: number];
  /**
   * Seconds. Three stars at or under the first, two at or under the second,
   * one for finishing at all. Penalties count towards the total.
   */
  par: readonly [three: number, two: number];
  modifier?: Modifier;
}

const decoy = (kind: DecoyKind, count: number): DecoySpec => ({ kind, count });

export const LEVELS: readonly LevelConfig[] = [
  // Barn. What a needle looks like, then what a nail looks like next to one.
  { id: 1, world: BARN, strawCount: 26000, similarity: 0, decoys: [], occlusion: [0, 0.1], par: [20, 45] },
  { id: 2, world: BARN, strawCount: 28000, similarity: 0, decoys: [], occlusion: [0.06, 0.2], par: [28, 60] },
  { id: 3, world: BARN, strawCount: 30000, similarity: 0.05, decoys: [decoy('nail', 5)], occlusion: [0.1, 0.24], par: [35, 72] },
  { id: 4, world: BARN, strawCount: 31000, similarity: 0.1, decoys: [decoy('nail', 7), decoy('pin', 3)], occlusion: [0.12, 0.28], par: [42, 84] },
  { id: 5, world: BARN, strawCount: 32000, similarity: 0.16, decoys: [decoy('nail', 8), decoy('pin', 7)], occlusion: [0.16, 0.32], par: [50, 98] },
  { id: 6, world: BARN, strawCount: 33000, similarity: 0.22, decoys: [decoy('nail', 9), decoy('pin', 11)], occlusion: [0.2, 0.36], par: [58, 112] },

  // Loft. Wire, splinters and staples, closing on the needle's own colour.
  { id: 7, world: LOFT, strawCount: 32000, similarity: 0.28, decoys: [decoy('wire', 6), decoy('nail', 4)], occlusion: [0.16, 0.32], par: [46, 92] },
  { id: 8, world: LOFT, strawCount: 33000, similarity: 0.34, decoys: [decoy('wire', 7), decoy('splinter', 5)], occlusion: [0.18, 0.34], par: [52, 100] },
  { id: 9, world: LOFT, strawCount: 33000, similarity: 0.4, decoys: [decoy('staple', 6), decoy('wire', 6), decoy('pin', 5)], occlusion: [0.2, 0.36], par: [58, 108] },
  { id: 10, world: LOFT, strawCount: 34000, similarity: 0.46, decoys: [decoy('splinter', 8), decoy('wire', 7), decoy('nail', 5)], occlusion: [0.22, 0.38], par: [64, 116] },
  { id: 11, world: LOFT, strawCount: 34000, similarity: 0.52, decoys: [decoy('wire', 9), decoy('staple', 8), decoy('splinter', 6)], occlusion: [0.24, 0.4], par: [70, 124] },
  { id: 12, world: LOFT, strawCount: 35000, similarity: 0.56, decoys: [decoy('wire', 8), decoy('splinter', 7), decoy('staple', 6)], occlusion: [0.24, 0.4], par: [86, 150], modifier: 'twin' },

  // Dusk. The broken needle arrives. From here the eye is the whole game.
  { id: 13, world: DUSK, strawCount: 34000, similarity: 0.6, decoys: [decoy('brokenNeedle', 3), decoy('wire', 6)], occlusion: [0.22, 0.38], par: [62, 118] },
  { id: 14, world: DUSK, strawCount: 34000, similarity: 0.64, decoys: [decoy('brokenNeedle', 4), decoy('splinter', 6), decoy('wire', 5)], occlusion: [0.24, 0.4], par: [72, 132], modifier: 'haze' },
  { id: 15, world: DUSK, strawCount: 35000, similarity: 0.68, decoys: [decoy('brokenNeedle', 6), decoy('staple', 6), decoy('wire', 6)], occlusion: [0.24, 0.4], par: [74, 134] },
  { id: 16, world: DUSK, strawCount: 35000, similarity: 0.73, decoys: [decoy('brokenNeedle', 7), decoy('wire', 8), decoy('splinter', 6)], occlusion: [0.26, 0.42], par: [84, 148], modifier: 'haze' },
  { id: 17, world: DUSK, strawCount: 36000, similarity: 0.78, decoys: [decoy('brokenNeedle', 9), decoy('wire', 8), decoy('staple', 7)], occlusion: [0.26, 0.42], par: [86, 152] },
  { id: 18, world: DUSK, strawCount: 36000, similarity: 0.82, decoys: [decoy('brokenNeedle', 11), decoy('wire', 9), decoy('splinter', 8), decoy('pin', 6)], occlusion: [0.28, 0.44], par: [98, 168], modifier: 'haze' },

  // Storm. The pile will not hold still. Motion, not density.
  { id: 19, world: STORM, strawCount: 35000, similarity: 0.84, decoys: [decoy('brokenNeedle', 8), decoy('wire', 8)], occlusion: [0.26, 0.42], par: [88, 156], modifier: 'drift' },
  { id: 20, world: STORM, strawCount: 35000, similarity: 0.86, decoys: [decoy('brokenNeedle', 10), decoy('splinter', 7), decoy('wire', 6)], occlusion: [0.28, 0.44], par: [94, 164], modifier: 'drift' },
  { id: 21, world: STORM, strawCount: 36000, similarity: 0.88, decoys: [decoy('brokenNeedle', 9), decoy('wire', 8), decoy('staple', 7)], occlusion: [0.28, 0.44], par: [120, 200], modifier: 'twin' },
  { id: 22, world: STORM, strawCount: 36000, similarity: 0.9, decoys: [decoy('brokenNeedle', 12), decoy('wire', 9), decoy('splinter', 7)], occlusion: [0.3, 0.46], par: [104, 178], modifier: 'drift' },
  { id: 23, world: STORM, strawCount: 36000, similarity: 0.92, decoys: [decoy('brokenNeedle', 13), decoy('staple', 9), decoy('wire', 8)], occlusion: [0.3, 0.46], par: [110, 186], modifier: 'drift' },
  { id: 24, world: STORM, strawCount: 37000, similarity: 0.94, decoys: [decoy('brokenNeedle', 15), decoy('wire', 10), decoy('splinter', 8)], occlusion: [0.32, 0.48], par: [118, 198], modifier: 'drift' },

  // Nightfall. You can only ever see the patch under your thumb.
  { id: 25, world: NIGHTFALL, strawCount: 35000, similarity: 0.95, decoys: [decoy('brokenNeedle', 9), decoy('wire', 7)], occlusion: [0.28, 0.44], par: [110, 190], modifier: 'lantern' },
  { id: 26, world: NIGHTFALL, strawCount: 35000, similarity: 0.96, decoys: [decoy('brokenNeedle', 11), decoy('splinter', 7), decoy('wire', 7)], occlusion: [0.3, 0.46], par: [118, 200], modifier: 'lantern' },
  { id: 27, world: NIGHTFALL, strawCount: 36000, similarity: 0.97, decoys: [decoy('brokenNeedle', 13), decoy('wire', 9), decoy('staple', 8)], occlusion: [0.3, 0.46], par: [126, 212], modifier: 'lantern' },
  { id: 28, world: NIGHTFALL, strawCount: 36000, similarity: 0.98, decoys: [decoy('brokenNeedle', 14), decoy('wire', 10), decoy('splinter', 8)], occlusion: [0.32, 0.48], par: [134, 224], modifier: 'lantern' },
  { id: 29, world: NIGHTFALL, strawCount: 37000, similarity: 0.99, decoys: [decoy('brokenNeedle', 16), decoy('wire', 10), decoy('staple', 9), decoy('pin', 6)], occlusion: [0.32, 0.48], par: [142, 236], modifier: 'lantern' },
  { id: 30, world: NIGHTFALL, strawCount: 38000, similarity: 1, decoys: [decoy('brokenNeedle', 18), decoy('wire', 11), decoy('splinter', 9), decoy('staple', 8)], occlusion: [0.34, 0.5], par: [155, 255], modifier: 'lantern' },
];

export const FIRST_LEVEL = LEVELS[0].id;
export const LAST_LEVEL = LEVELS[LEVELS.length - 1].id;

/** How many needles a level hides. */
export function needleCount(config: LevelConfig): number {
  return config.modifier === 'twin' ? 2 : 1;
}

export function findLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function groundFor(config: LevelConfig): { centre: string; edge: string } {
  return boardPalette[config.world.ground];
}
