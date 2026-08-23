import { strawHsl } from '@/ui/tokens';

/**
 * Straw is drawn from a fixed palette so that thousands of stalks can be
 * batched into one path per colour. Lightness tracks depth — stalks lower in
 * the pile are darker — and tone varies freely within each lightness step.
 */

export const LIGHT_STEPS = 10;
export const TONE_STEPS = 7;

function hslToRgba(hue: number, sat: number, light: number): Float32Array {
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const base = light - chroma / 2;
  const rgb: [number, number, number] =
    sector < 1
      ? [chroma, second, 0]
      : sector < 2
        ? [second, chroma, 0]
        : sector < 3
          ? [0, chroma, second]
          : sector < 4
            ? [0, second, chroma]
            : sector < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];
  return Float32Array.of(rgb[0] + base, rgb[1] + base, rgb[2] + base, 1);
}

function buildStrawPalette(): Float32Array[] {
  const [hueLow, hueHigh] = strawHsl.hue;
  const [satLow, satHigh] = strawHsl.saturation;
  const [lightLow, lightHigh] = strawHsl.lightness;
  const entries: Float32Array[] = [];
  for (let light = 0; light < LIGHT_STEPS; light++) {
    const l = lightLow + ((lightHigh - lightLow) * light) / (LIGHT_STEPS - 1);
    for (let tone = 0; tone < TONE_STEPS; tone++) {
      const t = tone / (TONE_STEPS - 1);
      // Cooler straw reads as damper straw, so it also reads as less saturated.
      entries.push(hslToRgba(hueLow + (hueHigh - hueLow) * t, satHigh - (satHigh - satLow) * t, l));
    }
  }
  return entries;
}

export const STRAW_PALETTE: readonly Float32Array[] = buildStrawPalette();

/** Packs a lightness step and a tone step into one palette index. */
export function strawColorIndex(lightStep: number, toneStep: number): number {
  return lightStep * TONE_STEPS + toneStep;
}

/** Parses a token hex string into the rgba float form Skia paints expect. */
export function rgbaFromHex(hex: string, alpha = 1): Float32Array {
  const value = Number.parseInt(hex.slice(1), 16);
  return Float32Array.of(
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255,
    alpha
  );
}

/** Same colour, dimmer, without touching its hue. */
export function shade(rgba: Float32Array, factor: number): Float32Array {
  return Float32Array.of(rgba[0] * factor, rgba[1] * factor, rgba[2] * factor, rgba[3]);
}

/** Blends two token colours, for pulling a decoy's metal towards a needle's. */
export function mixHex(from: string, to: string, amount: number): Float32Array {
  const a = rgbaFromHex(from);
  const b = rgbaFromHex(to);
  return Float32Array.of(
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
    1
  );
}
