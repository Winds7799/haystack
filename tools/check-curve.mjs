// Generates every level and checks the curve holds. Run after touching the
// bands in difficulty.ts:  node --import ./tools/register.mjs tools/check-curve.mjs
import { LEVELS } from '../src/game/difficulty.ts';
import { generateWorld } from '../src/game/generate.ts';
import { findNeedles, hitTest, hintHalo } from '../src/game/hit.ts';

let bandMiss = 0;
let broken = 0;
let hintMiss = 0;
let slowest = 0;
let total = 0;
let worstOcclusion = 0;
let par = 0;
let straw = 0;
let occlusion = -1;
let regressions = 0;

for (const level of LEVELS) {
  if (level.modifier !== 'twin') {
    if (level.par[0] < par) regressions++;
    par = level.par[0];
  }
  if (level.strawCount < straw) regressions++;
  straw = level.strawCount;
  if (level.occlusion[0] < occlusion) regressions++;
  occlusion = level.occlusion[0];

  const started = Date.now();
  const world = generateWorld(level, 1, false);
  const ms = Date.now() - started;
  total += ms;
  slowest = Math.max(slowest, ms);

  const needles = findNeedles(world);
  if (needles.length !== (level.modifier === 'twin' ? 2 : 1)) broken++;
  for (const needle of needles) {
    if (needle.occlusion < level.occlusion[0] || needle.occlusion > level.occlusion[1]) bandMiss++;
    worstOcclusion = Math.max(worstOcclusion, needle.occlusion);
    if (hitTest(world, { x: needle.x, y: needle.y })?.kind !== 'needle') broken++;
    const halo = hintHalo(world, needle);
    if (Math.hypot(halo.centre.x - needle.x, halo.centre.y - needle.y) > halo.radius) hintMiss++;
  }
}

console.log(`${LEVELS.length} levels generated in ${total}ms, slowest ${slowest}ms`);
console.log(`curve regressions: ${regressions}`);
console.log(`occlusion band misses: ${bandMiss}`);
console.log(`needle-count or tap failures: ${broken}`);
console.log(`hint halo failures: ${hintMiss}`);
console.log(`worst occlusion actually placed: ${worstOcclusion.toFixed(2)}`);
