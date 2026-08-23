import { BlurStyle, Skia, StrokeCap, StrokeJoin, TileMode } from '@shopify/react-native-skia';
import type { SkPaint, SkPath } from '@shopify/react-native-skia';
import { color } from '@/ui/tokens';
import { OBJECT_LENGTH, OBJECT_WIDTH } from './constants';
import { mixHex, rgbaFromHex } from './palette';
import type { ObjectKind } from './types';

const METAL: Record<ObjectKind, { bright: string; deep: string }> = {
  needle: { bright: color.steel, deep: color.steelDeep },
  brokenNeedle: { bright: color.steel, deep: color.steelDeep },
  nail: { bright: color.steelDeep, deep: color.steelDark },
  pin: { bright: color.steel, deep: color.steelDeep },
  wire: { bright: color.steelDeep, deep: color.steelDark },
  splinter: { bright: color.wood, deep: color.goldDim },
  staple: { bright: color.steelDeep, deep: color.steelDark },
};

/**
 * A decoy's own colour and thickness, pulled towards the needle's by the
 * level's similarity. Length is never pulled: it stays a real cue, and it is
 * the one the player learns to read first. A broken needle is already a needle
 * in everything but the eye, so similarity does not apply to it.
 */
function resolve(kind: ObjectKind, similarity: number) {
  const blend = kind === 'brokenNeedle' ? 1 : Math.max(0, Math.min(1, similarity));
  const metal = METAL[kind];
  const needle = METAL.needle;
  return {
    length: OBJECT_LENGTH[kind],
    width: OBJECT_WIDTH[kind] + (OBJECT_WIDTH.needle - OBJECT_WIDTH[kind]) * blend,
    bright: mixHex(metal.bright, needle.bright, blend),
    deep: mixHex(metal.deep, needle.deep, blend),
  };
}

type Metrics = ReturnType<typeof resolve>;

export interface ObjectArt {
  length: number;
  body: SkPath;
  /** Drawn dark over the body — the needle's eye, and nothing else. */
  detail: SkPath | null;
  bodyPaint: SkPaint;
  detailPaint: SkPaint;
  shadowPaint: SkPaint;
}

function needleBody(metrics: Metrics, broken: boolean): SkPath {
  const half = metrics.length / 2;
  const hw = metrics.width / 2;
  const shaftEnd = half * 0.52;
  const path = Skia.Path.Make();
  path.moveTo(-half + hw, -hw);
  path.lineTo(shaftEnd, -hw);
  path.quadTo(half * 0.88, -hw * 0.42, half, 0);
  path.quadTo(half * 0.88, hw * 0.42, shaftEnd, hw);
  path.lineTo(-half + hw, hw);
  if (broken) {
    // Snapped clean off just past where the eye would have been.
    path.lineTo(-half + hw * 0.2, hw * 0.3);
    path.lineTo(-half + hw * 0.9, -hw * 0.35);
    path.lineTo(-half + hw * 0.35, -hw);
  } else {
    path.quadTo(-half - hw * 0.6, 0, -half + hw, -hw);
  }
  path.close();
  return path;
}

function needleEye(metrics: Metrics): SkPath {
  const cx = -metrics.length / 2 + metrics.length * 0.17;
  const rx = metrics.length * 0.062;
  const ry = metrics.width * 0.29;
  return Skia.Path.Make().addOval(Skia.XYWHRect(cx - rx, -ry, rx * 2, ry * 2));
}

function nailBody(metrics: Metrics): SkPath {
  const half = metrics.length / 2;
  const hw = metrics.width / 2;
  const path = Skia.Path.Make();
  path.moveTo(-half, -hw);
  path.lineTo(half * 0.62, -hw);
  path.lineTo(half, 0);
  path.lineTo(half * 0.62, hw);
  path.lineTo(-half, hw);
  path.close();
  path.addRRect(Skia.RRectXY(Skia.XYWHRect(-half - 2.6, -hw * 1.9, 3.6, hw * 3.8), 1.2, 1.2));
  return path;
}

function pinBody(metrics: Metrics): SkPath {
  const half = metrics.length / 2;
  const hw = metrics.width / 2;
  const path = Skia.Path.Make();
  path.moveTo(-half, -hw);
  path.lineTo(half * 0.66, -hw * 0.9);
  path.lineTo(half, 0);
  path.lineTo(half * 0.66, hw * 0.9);
  path.lineTo(-half, hw);
  path.close();
  path.addCircle(-half - hw * 1.1, 0, hw * 2.3);
  return path;
}

function wireBody(metrics: Metrics): SkPath {
  const half = metrics.length / 2;
  const centreline = Skia.Path.Make();
  centreline.moveTo(-half, 4.2);
  centreline.cubicTo(-half * 0.35, -5.4, half * 0.3, 5.2, half, -3.6);
  const stroked = centreline.stroke({
    width: metrics.width,
    cap: StrokeCap.Butt,
    join: StrokeJoin.Round,
  });
  return stroked ?? centreline;
}

function stapleBody(metrics: Metrics): SkPath {
  const half = metrics.length / 2;
  const centreline = Skia.Path.Make();
  centreline.moveTo(-half, 5.4);
  centreline.lineTo(-half, -3.8);
  centreline.lineTo(half, -3.8);
  centreline.lineTo(half, 5.4);
  const stroked = centreline.stroke({
    width: metrics.width,
    cap: StrokeCap.Butt,
    join: StrokeJoin.Miter,
  });
  return stroked ?? centreline;
}

function splinterBody(metrics: Metrics): SkPath {
  const half = metrics.length / 2;
  const hw = metrics.width / 2;
  const path = Skia.Path.Make();
  path.moveTo(-half, hw * 0.1);
  path.lineTo(-half * 0.52, -hw * 0.95);
  path.lineTo(0, -hw * 0.5);
  path.lineTo(half * 0.56, -hw * 0.85);
  path.lineTo(half, -hw * 0.05);
  path.lineTo(half * 0.38, hw * 0.55);
  path.lineTo(-half * 0.24, hw);
  path.close();
  return path;
}

function buildBody(kind: ObjectKind, metrics: Metrics): SkPath {
  switch (kind) {
    case 'needle':
      return needleBody(metrics, false);
    case 'brokenNeedle':
      return needleBody(metrics, true);
    case 'nail':
      return nailBody(metrics);
    case 'pin':
      return pinBody(metrics);
    case 'wire':
      return wireBody(metrics);
    case 'staple':
      return stapleBody(metrics);
    case 'splinter':
      return splinterBody(metrics);
  }
}

function buildArt(kind: ObjectKind, similarity: number): ObjectArt {
  const metrics = resolve(kind, similarity);
  const half = metrics.length / 2;

  const bodyPaint = Skia.Paint();
  bodyPaint.setAntiAlias(true);
  bodyPaint.setShader(
    Skia.Shader.MakeLinearGradient(
      Skia.Point(-half, 0),
      Skia.Point(half, 0),
      [metrics.deep, metrics.bright, metrics.deep],
      [0, 0.42, 1],
      TileMode.Clamp
    )
  );

  const detailPaint = Skia.Paint();
  detailPaint.setAntiAlias(true);
  detailPaint.setColor(rgbaFromHex(color.shadow, 0.92));

  const shadowPaint = Skia.Paint();
  shadowPaint.setAntiAlias(true);
  shadowPaint.setColor(rgbaFromHex(color.shadow, 0.5));
  shadowPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 1.5, false));

  return {
    length: metrics.length,
    body: buildBody(kind, metrics),
    detail: kind === 'needle' ? needleEye(metrics) : null,
    bodyPaint,
    detailPaint,
    shadowPaint,
  };
}

const cache = new Map<string, ObjectArt>();

/** Art is built once per kind and similarity, then reused across boards. */
export function objectArt(kind: ObjectKind, similarity: number): ObjectArt {
  const key = `${kind}:${Math.round(similarity * 100)}`;
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const built = buildArt(kind, similarity);
  cache.set(key, built);
  return built;
}

/** How far a drop shadow falls, in world units. */
export const SHADOW_OFFSET = { x: 1.1, y: 1.8 } as const;
