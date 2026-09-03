import { Skia } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { OBJECT_LENGTH } from './constants';
import { objectArt } from './shapes';
import type { ObjectKind } from './types';

/**
 * One object, drawn large on its own, for the plate that introduces it.
 *
 * Rasterised the same way the board is rather than assembled from declarative
 * nodes: it is the path this codebase already trusts, and the picture is
 * identical to what the board will draw because it comes from the same art.
 */

const PIXEL_RATIO = 3;
const cache = new Map<string, SkImage>();

export function plateImage(
  kind: ObjectKind,
  similarity: number,
  emphasis: boolean,
  width: number,
  height: number
): SkImage | null {
  const key = `${kind}:${Math.round(similarity * 100)}:${emphasis ? 'safe' : 'plain'}:${width}x${height}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const surface = Skia.Surface.Make(width * PIXEL_RATIO, height * PIXEL_RATIO);
  if (!surface) {
    return null;
  }
  const canvas = surface.getCanvas();
  canvas.scale(PIXEL_RATIO, PIXEL_RATIO);

  const art = objectArt(kind, similarity, emphasis);
  // Lie the object flat across the plate, filling most of its width.
  const scale = (width * 0.82) / OBJECT_LENGTH[kind];
  canvas.translate(width / 2, height / 2);
  canvas.scale(scale, scale);
  canvas.drawPath(art.body, art.bodyPaint);
  if (art.detail) {
    canvas.drawPath(art.detail, art.detailPaint);
  }

  surface.flush();
  const image = surface.makeImageSnapshot();
  cache.set(key, image);
  return image;
}
