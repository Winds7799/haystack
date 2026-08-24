/**
 * Synthesises the four sounds the game uses, straight to 16-bit mono WAV.
 *
 * Everything is generated rather than sampled: it keeps the repository free of
 * licensed audio, keeps the bundle small, and means a sound can be re-tuned by
 * editing a number here instead of finding a new recording.
 *
 *   node tools/make-audio.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

function wav(samples) {
  const body = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    body.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + body.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(body.length, 40);
  return Buffer.concat([header, body]);
}

/** Deterministic noise, so re-running this produces byte-identical files. */
function noise(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** An unlit barn: moving air, a low hum in the timbers, the odd creak. */
function barn() {
  const seconds = 8;
  const total = seconds * RATE;
  const rng = noise(0xba21);
  const out = new Float32Array(total);
  let brown = 0;
  let low = 0;
  for (let i = 0; i < total; i++) {
    const t = i / RATE;
    // Brown noise for air, then a second pole to take the hiss off it.
    brown = brown * 0.985 + rng() * 0.06;
    low = low * 0.9 + brown * 0.1;
    // Two slow swells that never line up, so the loop does not feel metrical.
    const swell = 0.6 + 0.25 * Math.sin(2 * Math.PI * 0.125 * t) + 0.15 * Math.sin(2 * Math.PI * 0.375 * t);
    const hum = 0.02 * Math.sin(2 * Math.PI * 62.5 * t) + 0.012 * Math.sin(2 * Math.PI * 125 * t);
    out[i] = (low * 7 * swell + hum) * 0.5;
  }
  // A few timbers settling.
  for (const [at, pitch] of [
    [1.4, 210],
    [3.9, 168],
    [6.2, 260],
  ]) {
    const start = Math.floor(at * RATE);
    const span = Math.floor(0.5 * RATE);
    for (let i = 0; i < span && start + i < total; i++) {
      const p = i / span;
      const env = Math.sin(Math.PI * p) ** 2 * 0.05;
      out[start + i] += env * Math.sin(2 * Math.PI * pitch * (1 - p * 0.25) * (i / RATE));
    }
  }
  // Crossfade the tail over the head so the loop has no seam.
  const fade = Math.floor(0.6 * RATE);
  const loop = out.slice(0, total - fade);
  for (let i = 0; i < fade; i++) {
    const p = i / fade;
    loop[i] = loop[i] * p + out[total - fade + i] * (1 - p);
  }
  return loop;
}

/** Dry straw moving under a hand. */
function rustle() {
  const total = Math.floor(0.42 * RATE);
  const rng = noise(0x57a1);
  const out = new Float32Array(total);
  let slow = 0;
  let fast = 0;
  for (let i = 0; i < total; i++) {
    const p = i / total;
    const sample = rng();
    slow = slow * 0.82 + sample * 0.18;
    fast = fast * 0.35 + sample * 0.65;
    // The difference of two poles leaves a band, which is where straw lives.
    const band = fast - slow;
    // Grain, so it reads as many stalks rather than one hiss.
    const grain = 0.7 + 0.3 * Math.sin(2 * Math.PI * 47 * (i / RATE));
    out[i] = band * Math.exp(-p * 5.5) * grain * 0.85;
  }
  return out;
}

/** A decoy: blunt, dull, unmistakably not the right sound. */
function clack() {
  const total = Math.floor(0.11 * RATE);
  const rng = noise(0xc1ac0);
  const out = new Float32Array(total);
  let low = 0;
  for (let i = 0; i < total; i++) {
    const p = i / total;
    low = low * 0.72 + rng() * 0.28;
    const thud = Math.sin(2 * Math.PI * 172 * (i / RATE)) * Math.exp(-p * 14);
    out[i] = (low * 0.5 + thud * 0.6) * Math.exp(-p * 6);
  }
  return out;
}

/**
 * A button. Wooden rather than electronic — a short pluck with a little body,
 * so it belongs in a barn and never sounds like a system alert. Quiet enough
 * to hear fifty times without noticing it.
 */
function tap() {
  const total = Math.floor(0.055 * RATE);
  const rng = noise(0x7a9);
  const out = new Float32Array(total);
  let body = 0;
  for (let i = 0; i < total; i++) {
    const p = i / total;
    const t = i / RATE;
    body = body * 0.55 + rng() * 0.45;
    const knock =
      Math.sin(2 * Math.PI * 940 * t) * 0.5 + Math.sin(2 * Math.PI * 1410 * t) * 0.18;
    out[i] = (knock + body * 0.22) * Math.exp(-p * 11) * 0.55;
  }
  return out;
}

/** The find. One clean tone, a fifth under it, nothing else. */
function find() {
  const total = Math.floor(1.15 * RATE);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / RATE;
    const p = i / total;
    const attack = Math.min(1, t / 0.012);
    const decay = Math.exp(-p * 4.2);
    out[i] =
      attack *
      decay *
      (0.5 * Math.sin(2 * Math.PI * 784 * t) +
        0.22 * Math.sin(2 * Math.PI * 1176 * t) +
        0.08 * Math.sin(2 * Math.PI * 1568 * t)) *
      0.8;
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries({ barn, rustle, clack, find, tap })) {
  const data = wav(make());
  writeFileSync(join(OUT, `${name}.wav`), data);
  console.log(`${name}.wav  ${(data.length / 1024).toFixed(0)} KB`);
}
