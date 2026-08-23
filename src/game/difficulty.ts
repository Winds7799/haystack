import { boardPalette, type BoardPaletteName } from '@/ui/tokens';
import type { DecoyKind } from './types';

/**
 * The level curve, and the only place it is described.
 *
 * The rule this table obeys: difficulty comes from decoy similarity, not from
 * straw. Straw count barely moves across a world — it only changes how long a
 * sweep takes. What changes is which decoys are on the board and how close
 * they are to a needle. Reach for a new decoy before reaching for more straw.
 *
 * Phase 1 ships the first world. The remaining four are added in phase 3.
 */

export interface DecoySpec {
  kind: DecoyKind;
  count: number;
}

export interface LevelConfig {
  id: number;
  /** Display name of the world this level belongs to. */
  world: string;
  ground: BoardPaletteName;
  strawCount: number;
  decoys: readonly DecoySpec[];
  /**
   * How buried the needle is allowed to be, as the fraction of its length that
   * straw covers. The generator searches placements until it lands in the band.
   */
  occlusion: readonly [min: number, max: number];
}

const BARN = 'Barn';

export const LEVELS: readonly LevelConfig[] = [
  {
    id: 1,
    world: BARN,
    ground: 'barn',
    strawCount: 26000,
    decoys: [],
    occlusion: [0, 0.1],
  },
  {
    id: 2,
    world: BARN,
    ground: 'barn',
    strawCount: 28000,
    decoys: [],
    occlusion: [0.06, 0.2],
  },
  {
    id: 3,
    world: BARN,
    ground: 'barn',
    strawCount: 30000,
    decoys: [{ kind: 'nail', count: 5 }],
    occlusion: [0.1, 0.24],
  },
  {
    id: 4,
    world: BARN,
    ground: 'barn',
    strawCount: 31000,
    decoys: [
      { kind: 'nail', count: 7 },
      { kind: 'pin', count: 3 },
    ],
    occlusion: [0.12, 0.28],
  },
  {
    id: 5,
    world: BARN,
    ground: 'barn',
    strawCount: 32000,
    decoys: [
      { kind: 'nail', count: 8 },
      { kind: 'pin', count: 7 },
    ],
    occlusion: [0.16, 0.32],
  },
  {
    id: 6,
    world: BARN,
    ground: 'barn',
    strawCount: 33000,
    decoys: [
      { kind: 'nail', count: 9 },
      { kind: 'pin', count: 11 },
    ],
    occlusion: [0.2, 0.36],
  },
];

export const FIRST_LEVEL = LEVELS[0].id;
export const LAST_LEVEL = LEVELS[LEVELS.length - 1].id;

export function findLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function groundFor(config: LevelConfig): { centre: string; edge: string } {
  return boardPalette[config.ground];
}
