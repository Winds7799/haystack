import {
  DECOY_CLEARANCE,
  DEPTH_SLICES,
  NEEDLE_CLEARANCE,
  OBJECT_LENGTH,
  OBJECT_MARGIN,
  STRAW_BOW,
  STRAW_LENGTH,
  STRAW_WIDTH,
  WORLD_BLEED,
  WORLD_HEIGHT,
  WORLD_REFERENCE,
  WORLD_WIDTH,
} from './constants';
import { needleCount, type LevelConfig } from './difficulty';
import { groundFor } from './ground';
import { LIGHT_STEPS, TONE_STEPS, strawColorIndex } from './palette';
import { between, centred, intBetween, mulberry32, seedFrom, type Random } from './prng';
import type { Extent } from './constants';
import type { BoardObject, ObjectKind, StrawField, World } from './types';

/**
 * How many points along an object are tested when measuring how buried it is.
 * This sets the resolution of the occlusion bands in the level curve: fifteen
 * samples means the generator can hit a band about seven percent wide.
 */
const OCCLUSION_SAMPLES = 15;

/** Placements tried before settling for the closest miss. */
const PLACEMENT_TRIES = 48;

function generateStraw(rng: Random, count: number, world: Extent): StrawField {
  const field: StrawField = {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    angle: new Float32Array(count),
    length: new Float32Array(count),
    width: new Float32Array(count),
    bow: new Float32Array(count),
    color: new Uint8Array(count),
  };
  const spanX = world.width + WORLD_BLEED * 2;
  const spanY = world.height + WORLD_BLEED * 2;
  for (let i = 0; i < count; i++) {
    field.x[i] = -WORLD_BLEED + rng() * spanX;
    field.y[i] = -WORLD_BLEED + rng() * spanY;
    field.angle[i] = rng() * Math.PI * 2;
    field.length[i] = between(rng, STRAW_LENGTH[0], STRAW_LENGTH[1]);
    field.width[i] = between(rng, STRAW_WIDTH[0], STRAW_WIDTH[1]);
    field.bow[i] = centred(rng) * STRAW_BOW[1];
    // Stalks deeper in the pile catch less light, with enough jitter that the
    // eye reads shading rather than layers.
    const lit = (i / count) * 0.72 + rng() * 0.34;
    const lightStep = Math.max(0, Math.min(LIGHT_STEPS - 1, Math.floor(lit * LIGHT_STEPS)));
    field.color[i] = strawColorIndex(lightStep, intBetween(rng, 0, TONE_STEPS - 1));
  }
  return field;
}

/**
 * The fraction of an object's spine that straw drawn above it covers. This is
 * the number the level curve tunes against, and it is measured against exactly
 * the straw the renderer will draw on top.
 */
function measureOcclusion(straw: StrawField, object: BoardObject): number {
  const length = OBJECT_LENGTH[object.kind] * object.scale;
  const half = length / 2;
  const dirX = Math.cos(object.angle);
  const dirY = Math.sin(object.angle);

  const sampleX = new Float32Array(OCCLUSION_SAMPLES);
  const sampleY = new Float32Array(OCCLUSION_SAMPLES);
  for (let s = 0; s < OCCLUSION_SAMPLES; s++) {
    const along = -half + (length * s) / (OCCLUSION_SAMPLES - 1);
    sampleX[s] = object.x + dirX * along;
    sampleY[s] = object.y + dirY * along;
  }

  const hit = new Uint8Array(OCCLUSION_SAMPLES);
  let covered = 0;
  const reach = half + STRAW_LENGTH[1] / 2 + STRAW_WIDTH[1];
  const reachSq = reach * reach;
  const from = Math.round(object.depth * straw.count);

  for (let i = from; i < straw.count && covered < OCCLUSION_SAMPLES; i++) {
    const toX = straw.x[i] - object.x;
    const toY = straw.y[i] - object.y;
    if (toX * toX + toY * toY > reachSq) {
      continue;
    }
    const stalkHalf = straw.length[i] / 2;
    const endX = Math.cos(straw.angle[i]) * stalkHalf;
    const endY = Math.sin(straw.angle[i]) * stalkHalf;
    const ax = straw.x[i] - endX;
    const ay = straw.y[i] - endY;
    const spanSq = 4 * (endX * endX + endY * endY);
    const stalkHalfWidth = straw.width[i] / 2;

    for (let s = 0; s < OCCLUSION_SAMPLES; s++) {
      if (hit[s]) {
        continue;
      }
      const u = Math.max(
        0,
        Math.min(1, ((sampleX[s] - ax) * 2 * endX + (sampleY[s] - ay) * 2 * endY) / spanSq)
      );
      const gapX = sampleX[s] - (ax + 2 * endX * u);
      const gapY = sampleY[s] - (ay + 2 * endY * u);
      // A stalk is a pointed lens, so it is only full width at its middle.
      const taper = stalkHalfWidth * Math.sqrt(Math.max(0, 1 - Math.abs(u - 0.5) * 2));
      if (gapX * gapX + gapY * gapY < taper * taper) {
        hit[s] = 1;
        covered++;
      }
    }
  }
  return covered / OCCLUSION_SAMPLES;
}

/** Margins and clearances are quoted for the full board, so small boards scale them. */
function scaled(distance: number, world: Extent): number {
  return distance * Math.min(1, Math.min(world.width, world.height) / WORLD_REFERENCE);
}

function candidate(rng: Random, kind: ObjectKind, world: Extent): BoardObject {
  const margin = scaled(OBJECT_MARGIN, world);
  return {
    kind,
    x: between(rng, margin, world.width - margin),
    y: between(rng, margin, world.height - margin),
    angle: rng() * Math.PI * 2,
    scale: between(rng, 0.92, 1.08),
    depth: intBetween(rng, 1, DEPTH_SLICES - 1) / DEPTH_SLICES,
    occlusion: 0,
  };
}

function farEnough(
  object: BoardObject,
  placed: readonly BoardObject[],
  slack: number,
  world: Extent
): boolean {
  for (const other of placed) {
    const gap = other.kind === 'needle' ? NEEDLE_CLEARANCE : DECOY_CLEARANCE;
    const required = scaled(gap, world) * slack;
    const dx = other.x - object.x;
    const dy = other.y - object.y;
    if (dx * dx + dy * dy < required * required) {
      return false;
    }
  }
  return true;
}

function place(
  rng: Random,
  straw: StrawField,
  kind: ObjectKind,
  placed: readonly BoardObject[],
  band: readonly [number, number],
  world: Extent
): BoardObject {
  const target = (band[0] + band[1]) / 2;
  let best: BoardObject | null = null;
  let bestMiss = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt++) {
    const next = candidate(rng, kind, world);
    // Clearance relaxes as tries run out, so a crowded board still fills.
    if (!farEnough(next, placed, attempt < PLACEMENT_TRIES / 2 ? 1 : 0.6, world)) {
      continue;
    }
    next.occlusion = measureOcclusion(straw, next);
    if (next.occlusion >= band[0] && next.occlusion <= band[1]) {
      return next;
    }
    const miss = Math.abs(next.occlusion - target);
    if (miss < bestMiss) {
      bestMiss = miss;
      best = next;
    }
  }

  if (best) {
    return best;
  }
  const fallback = candidate(rng, kind, world);
  fallback.occlusion = measureOcclusion(straw, fallback);
  return fallback;
}

function placeObjects(
  rng: Random,
  config: LevelConfig,
  straw: StrawField,
  world: Extent
): BoardObject[] {
  const placed: BoardObject[] = [];
  // Twin levels hide two, and both are held to the same occlusion band.
  for (let n = 0; n < needleCount(config); n++) {
    placed.push(place(rng, straw, 'needle', placed, config.occlusion, world));
  }
  // Decoys must be temptingly visible, so they never hide deeper than the needle.
  const decoyBand: readonly [number, number] = [0, config.occlusion[1]];
  for (const spec of config.decoys) {
    for (let n = 0; n < spec.count; n++) {
      placed.push(place(rng, straw, spec.kind, placed, decoyBand, world));
    }
  }
  return placed.sort((a, b) => a.depth - b.depth);
}

/**
 * A retry gives a different board; replaying the same level at the same attempt
 * gives the same board back.
 */
export function generateWorld(config: LevelConfig, attempt: number, colourBlindSafe: boolean): World {
  const seed = seedFrom(config.id, attempt);
  const rng = mulberry32(seed);
  const world: Extent = {
    width: config.worldWidth ?? WORLD_WIDTH,
    height: config.worldHeight ?? WORLD_HEIGHT,
  };
  // Straw density is quoted for the standard board, so an off-size board takes
  // the same share of stalks per unit of area and reads exactly as dense.
  const density = (world.width * world.height) / (WORLD_WIDTH * WORLD_HEIGHT);
  const straw = generateStraw(rng, Math.round(config.strawCount * density), world);
  return {
    seed,
    width: world.width,
    height: world.height,
    straw,
    objects: placeObjects(rng, config, straw, world),
    ground: groundFor(config),
    similarity: config.similarity,
    colourBlindSafe,
  };
}
