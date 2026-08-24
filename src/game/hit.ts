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

export function findNeedles(world: World): readonly BoardObject[] {
  return world.objects.filter((object) => object.kind === 'needle');
}

export function findNeedle(world: World): BoardObject | null {
  return findNeedles(world)[0] ?? null;
}

/** Spins a world point about the centre of the board, the way drift does. */
export function rotateAbout(point: Point, angle: number, world: World): Point {
  if (angle === 0) {
    return point;
  }
  const cx = world.width / 2;
  const cy = world.height / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - cx;
  const dy = point.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Undoes the drift rotation, so a tap on a rocking pile lands where the player
 * saw the straw rather than where the straw was generated.
 */
export function unrotate(point: Point, angle: number, world: World): Point {
  return rotateAbout(point, -angle, world);
}

/**
 * A soft circle covering about a ninth of the board, always containing the
 * needle but never centred on it — the point is to narrow the search, not to
 * answer it. The offset is drawn from the board seed so the same board always
 * gives the same halo.
 */
const HINT_SHARE = 0.25;
const HINT_DRIFT = 0.5;

export function hintHalo(world: World, needle: BoardObject): { centre: Point; radius: number } {
  // Measured off the short side, so the halo is the same share of the board
  // however the board is shaped.
  // Sized by area rather than by a side, so a quarter is a quarter whatever
  // shape the board is.
  const radius = Math.sqrt((world.width * world.height * HINT_SHARE) / Math.PI);
  const rng = mulberry32(world.seed ^ 0x48494e54);
  const angle = rng() * Math.PI * 2;
  const distance = Math.sqrt(rng()) * radius * HINT_DRIFT;
  return {
    centre: { x: needle.x + Math.cos(angle) * distance, y: needle.y + Math.sin(angle) * distance },
    radius,
  };
}
