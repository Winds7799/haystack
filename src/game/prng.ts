/**
 * Deterministic randomness. Generation never calls Math.random, so a given
 * (level, attempt) pair always produces the same board.
 */

export type Random = () => number;

/** mulberry32 — small, fast, good enough distribution for layout work. */
export function mulberry32(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes any number of integers into one 32-bit seed. */
export function seedFrom(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    h ^= part >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}

export function between(rng: Random, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function intBetween(rng: Random, min: number, maxInclusive: number): number {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

/** Uniform in -1..1. */
export function signed(rng: Random): number {
  return rng() * 2 - 1;
}

/** Roughly normal in -1..1, so values cluster around the middle. */
export function centred(rng: Random): number {
  return (rng() + rng() + rng() - 1.5) / 1.5;
}

export function pickOne<T>(rng: Random, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}
