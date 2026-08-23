import { mulberry32 } from './prng';
import type { BoardObject, Point, World } from './types';

/** Tap forgiveness, in world units, measured from the centre of the object. */
export const NEEDLE_HIT_RADIUS = 34;
export const DECOY_HIT_RADIUS = 30;

export function hitRadius(object: BoardObject): number {
  return object.kind === 'needle' ? NEEDLE_HIT_RADIUS : DECOY_HIT_RADIUS;
}

/**
 * What the player actually hit, or null for straw. Objects never overlap, so
 * the nearest one within its own radius is unambiguous.
 */
export function hitTest(world: World, point: Point): BoardObject | null {
  let best: BoardObject | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const object of world.objects) {
    const dx = object.x - point.x;
    const dy = object.y - point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = hitRadius(object);
    if (distance <= radius && distance < bestDistance) {
      best = object;
      bestDistance = distance;
    }
  }
  return best;
}

export function findNeedle(world: World): BoardObject | null {
  return world.objects.find((object) => object.kind === 'needle') ?? null;
}

/**
 * A soft circle covering about a ninth of the board, always containing the
 * needle but never centred on it — the point is to narrow the search, not to
 * answer it. The offset is drawn from the board seed so the same board always
 * gives the same halo.
 */
const HINT_RADIUS = 0.188;
const HINT_DRIFT = 0.5;

export function hintHalo(world: World, needle: BoardObject): { centre: Point; radius: number } {
  const radius = world.size * HINT_RADIUS;
  const rng = mulberry32(world.seed ^ 0x48494e54);
  const angle = rng() * Math.PI * 2;
  const distance = Math.sqrt(rng()) * radius * HINT_DRIFT;
  return {
    centre: { x: needle.x + Math.cos(angle) * distance, y: needle.y + Math.sin(angle) * distance },
    radius,
  };
}
