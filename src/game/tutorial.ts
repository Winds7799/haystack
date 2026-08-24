import { BARN } from './worlds';
import type { LevelConfig } from './difficulty';

/**
 * How to play shows rather than tells: three real boards, each adding exactly
 * one thing. A bare needle, then straw over it, then one nail beside it.
 */

/** Small enough to fit a card without panning, big enough to hold real straw. */
const TUTORIAL_SIZE = 640;

export interface TutorialStep {
  title: string;
  detail: string;
  config: LevelConfig;
}

function step(id: number, strawCount: number, nails: number): LevelConfig {
  return {
    id,
    world: BARN,
    strawCount,
    worldSize: TUTORIAL_SIZE,
    similarity: 0,
    decoys: nails > 0 ? [{ kind: 'nail', count: nails }] : [],
    occlusion: strawCount > 0 ? [0.06, 0.3] : [0, 0.1],
    par: [10, 20],
  };
}

export const TUTORIAL: readonly TutorialStep[] = [
  {
    title: 'This is a needle',
    detail: 'Tap it. Note the eye at the blunt end — that is what you are looking for.',
    config: step(-1, 0, 0),
  },
  {
    title: 'Now it is in the straw',
    detail: 'Straw drawn after the needle covers part of it. Tap the needle again.',
    config: step(-2, 1100, 0),
  },
  {
    title: 'And this is a nail',
    detail: 'A nail has a flat head and no eye. Tapping one costs you five seconds.',
    config: step(-3, 1100, 1),
  },
];
