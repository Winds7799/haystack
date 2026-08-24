import { Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkPaint } from '@shopify/react-native-skia';
import { DEPTH_SLICES, STRAW_PRECISION, WORLD_BLEED, outerOf, type Extent } from './constants';
import { STRAW_PALETTE, rgbaFromHex } from './palette';
import { SHADOW_OFFSET, objectArt } from './shapes';
import type { BoardObject, StrawField, World } from './types';

const DEGREES = 180 / Math.PI;

function drawGround(canvas: SkCanvas, world: World): void {
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeRadialGradient(
      // Light falls from a little above the middle of the pile.
      Skia.Point(world.width * 0.5, world.height * 0.42),
      Math.max(world.width, world.height) * 0.62,
      [rgbaFromHex(world.ground.centre), rgbaFromHex(world.ground.edge)],
      [0, 1],
      TileMode.Clamp
    )
  );
  const outer = outerOf(world);
  canvas.drawRect(
    Skia.XYWHRect(-WORLD_BLEED, -WORLD_BLEED, outer.width, outer.height),
    paint
  );
}

/**
 * Straw is emitted as one path per colour rather than one path per stalk:
 * building tens of thousands of paths across the bridge costs far more than
 * building the same geometry as text and handing it over in a few calls.
 */
function drawStrawRange(
  canvas: SkCanvas,
  straw: StrawField,
  from: number,
  to: number,
  paint: SkPaint
): void {
  const buckets = new Map<number, string[]>();
  for (let i = from; i < to; i++) {
    const half = straw.length[i] / 2;
    const along = Math.cos(straw.angle[i]);
    const across = Math.sin(straw.angle[i]);
    const endX = along * half;
    const endY = across * half;
    // The control points sit either side of the bend, which makes the stalk a
    // pointed lens: full width in the middle, tapering to nothing at each end.
    const bendX = straw.x[i] - across * straw.bow[i] * 2;
    const bendY = straw.y[i] + along * straw.bow[i] * 2;
    const spreadX = -across * straw.width[i];
    const spreadY = along * straw.width[i];

    const startX = quantise(straw.x[i] - endX);
    const startY = quantise(straw.y[i] - endY);
    const stopX = quantise(straw.x[i] + endX);
    const stopY = quantise(straw.y[i] + endY);
    const upperX = quantise(bendX + spreadX);
    const upperY = quantise(bendY + spreadY);
    const lowerX = quantise(bendX - spreadX);
    const lowerY = quantise(bendY - spreadY);

    const index = straw.color[i];
    let bucket = buckets.get(index);
    if (!bucket) {
      bucket = [];
      buckets.set(index, bucket);
    }
    bucket.push(
      `M ${startX} ${startY} Q ${upperX} ${upperY} ${stopX} ${stopY} Q ${lowerX} ${lowerY} ${startX} ${startY} Z`
    );
  }

  canvas.save();
  canvas.scale(1 / STRAW_PRECISION, 1 / STRAW_PRECISION);
  for (const [index, parts] of buckets) {
    const path = Skia.Path.MakeFromSVGString(parts.join(''));
    if (!path) {
      continue;
    }
    paint.setColor(STRAW_PALETTE[index]);
    canvas.drawPath(path, paint);
  }
  canvas.restore();
}

function quantise(value: number): number {
  return Math.round(value * STRAW_PRECISION);
}

function drawObject(canvas: SkCanvas, object: BoardObject, world: World): void {
  const art = objectArt(object.kind, world.similarity, world.colourBlindSafe);
  const degrees = object.angle * DEGREES;

  // The shadow is offset in world space, so every object is lit from the same
  // direction no matter which way it happens to lie.
  canvas.save();
  canvas.translate(object.x + SHADOW_OFFSET.x, object.y + SHADOW_OFFSET.y);
  canvas.rotate(degrees, 0, 0);
  canvas.scale(object.scale, object.scale);
  canvas.drawPath(art.body, art.shadowPaint);
  canvas.restore();

  canvas.save();
  canvas.translate(object.x, object.y);
  canvas.rotate(degrees, 0, 0);
  canvas.scale(object.scale, object.scale);
  canvas.drawPath(art.body, art.bodyPaint);
  if (art.detail) {
    canvas.drawPath(art.detail, art.detailPaint);
  }
  canvas.restore();
}

/** Draws the whole board in world units, straw and objects interleaved by depth. */
export function drawWorld(canvas: SkCanvas, world: World): void {
  drawGround(canvas, world);

  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  const { straw, objects } = world;
  let next = 0;
  for (let slice = 0; slice < DEPTH_SLICES; slice++) {
    const from = Math.round((straw.count * slice) / DEPTH_SLICES);
    const to = Math.round((straw.count * (slice + 1)) / DEPTH_SLICES);
    drawStrawRange(canvas, straw, from, to, paint);
    const depth = (slice + 1) / DEPTH_SLICES;
    while (next < objects.length && objects[next].depth <= depth) {
      drawObject(canvas, objects[next], world);
      next += 1;
    }
  }
  while (next < objects.length) {
    drawObject(canvas, objects[next], world);
    next += 1;
  }
}

/**
 * Bakes the board into a single square texture. Everything after this is one
 * image blit per frame, however much straw the level asked for.
 */
export function rasterizeWorld(world: World, texture: Extent): SkImage {
  // A CPU surface, deliberately. MakeOffscreen needs a GPU context, and the
  // only thread that reliably has one is the UI thread — Skia's own offscreen
  // helper is a worklet for exactly that reason. Generation runs here on the JS
  // thread, and the board is wanted as a raster image either way, so a CPU
  // surface is both the safe choice and the honest one.
  const surface = Skia.Surface.Make(texture.width, texture.height);
  if (!surface) {
    throw new Error(`Could not allocate a ${texture.width} by ${texture.height} board texture`);
  }
  const canvas = surface.getCanvas();
  const outer = outerOf(world);
  canvas.scale(texture.width / outer.width, texture.height / outer.height);
  // The texture's origin is the top left of the bleed, not of the board.
  canvas.translate(WORLD_BLEED, WORLD_BLEED);
  drawWorld(canvas, world);
  surface.flush();
  return surface.makeImageSnapshot();
}
