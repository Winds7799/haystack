import { BlurStyle, Skia, StrokeCap, StrokeJoin, TileMode } from '@shopify/react-native-skia';
import type { SkPaint, SkPath } from '@shopify/react-native-skia';
import { color } from '@/ui/tokens';
import { OBJECT_LENGTH, OBJECT_WIDTH } from './constants';
import { rgbaFromHex } from './palette';
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

export interface ObjectArt {
  length: number;
  body: SkPath;
  /** Drawn dark over the body — the needle's eye, and nothing else so far. */
  detail: SkPath | null;
  bodyPaint: SkPaint;
  detailPaint: SkPaint;
  shadowPaint: SkPaint;
}

function needleBody(kind: 'needle' | 'brokenNeedle'): SkPath {
  const half = OBJECT_LENGTH[kind] / 2;
  const hw = OBJECT_WIDTH[kind] / 2;
  const shaftEnd = half * 0.52;
  const path = Skia.Path.Make();
  path.moveTo(-half + hw, -hw);
  path.lineTo(shaftEnd, -hw);
  path.quadTo(half * 0.88, -hw * 0.42, half, 0);
  path.quadTo(half * 0.88, hw * 0.42, shaftEnd, hw);
  path.lineTo(-half + hw, hw);
  if (kind === 'needle') {
    path.quadTo(-half - hw * 0.6, 0, -half + hw, -hw);
  } else {
    // Snapped clean off just past where the eye would have been.
    path.lineTo(-half + hw * 0.2, hw * 0.3);
    path.lineTo(-half + hw * 0.9, -hw * 0.35);
    path.lineTo(-half + hw * 0.35, -hw);
  }
  path.close();
  return path;
}

function needleEye(): SkPath {
  const length = OBJECT_LENGTH.needle;
  const cx = -length / 2 + length * 0.17;
  const rx = length * 0.062;
  const ry = OBJECT_WIDTH.needle * 0.29;
  return Skia.Path.Make().addOval(Skia.XYWHRect(cx - rx, -ry, rx * 2, ry * 2));
}

function nailBody(): SkPath {
  const half = OBJECT_LENGTH.nail / 2;
  const hw = OBJECT_WIDTH.nail / 2;
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

function pinBody(): SkPath {
  const half = OBJECT_LENGTH.pin / 2;
  const hw = OBJECT_WIDTH.pin / 2;
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

function wireBody(): SkPath {
  const half = OBJECT_LENGTH.wire / 2;
  const centreline = Skia.Path.Make();
  centreline.moveTo(-half, 4.2);
  centreline.cubicTo(-half * 0.35, -5.4, half * 0.3, 5.2, half, -3.6);
  const stroked = centreline.stroke({
    width: OBJECT_WIDTH.wire,
    cap: StrokeCap.Butt,
    join: StrokeJoin.Round,
  });
  return stroked ?? centreline;
}

function stapleBody(): SkPath {
  const half = OBJECT_LENGTH.staple / 2;
  const centreline = Skia.Path.Make();
  centreline.moveTo(-half, 5.4);
  centreline.lineTo(-half, -3.8);
  centreline.lineTo(half, -3.8);
  centreline.lineTo(half, 5.4);
  const stroked = centreline.stroke({
    width: OBJECT_WIDTH.staple,
    cap: StrokeCap.Butt,
    join: StrokeJoin.Miter,
  });
  return stroked ?? centreline;
}

function splinterBody(): SkPath {
  const half = OBJECT_LENGTH.splinter / 2;
  const hw = OBJECT_WIDTH.splinter / 2;
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

function buildBody(kind: ObjectKind): SkPath {
  switch (kind) {
    case 'needle':
    case 'brokenNeedle':
      return needleBody(kind);
    case 'nail':
      return nailBody();
    case 'pin':
      return pinBody();
    case 'wire':
      return wireBody();
    case 'staple':
      return stapleBody();
    case 'splinter':
      return splinterBody();
  }
}

function buildArt(kind: ObjectKind): ObjectArt {
  const half = OBJECT_LENGTH[kind] / 2;
  const metal = METAL[kind];

  const bodyPaint = Skia.Paint();
  bodyPaint.setAntiAlias(true);
  bodyPaint.setShader(
    Skia.Shader.MakeLinearGradient(
      Skia.Point(-half, 0),
      Skia.Point(half, 0),
      [rgbaFromHex(metal.deep), rgbaFromHex(metal.bright), rgbaFromHex(metal.deep)],
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
    length: OBJECT_LENGTH[kind],
    body: buildBody(kind),
    detail: kind === 'needle' ? needleEye() : null,
    bodyPaint,
    detailPaint,
    shadowPaint,
  };
}

const cache = new Map<ObjectKind, ObjectArt>();

/** Art is built once per kind, on first use, and reused for every board. */
export function objectArt(kind: ObjectKind): ObjectArt {
  const existing = cache.get(kind);
  if (existing) {
    return existing;
  }
  const built = buildArt(kind);
  cache.set(kind, built);
  return built;
}

/** How far a drop shadow falls, in world units. */
export const SHADOW_OFFSET = { x: 1.1, y: 1.8 } as const;
