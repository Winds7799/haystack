import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// Icon and splash art, drawn from the same tokens the app uses. Kept as a
// script so the marks can never drift from the palette.
const INK = [0x0a, 0x07, 0x05];
const GLOW = [0x4a, 0x34, 0x16];
const GOLD = [0xd3, 0x9b, 0x3c];
const STEEL = [0xcf, 0xd6, 0xde];
const STEEL_DEEP = [0x79, 0x83, 0x8f];
const SHADOW = [0x05, 0x04, 0x03];

/**
 * Straw for the icon, sampled from the same hue and lightness ranges the
 * generator uses. Nine stalks, not thirty thousand: the mark has to read at
 * forty pixels, so this is the idea of a haystack, not a picture of one.
 */
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : [x, c, 0];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Each stalk: angle, offset along x, offset along y, length, width,
// lightness, and whether it lies over the needle or under it. Short and
// clustered: long stalks read as a starburst, not a pile.
const STRAW = [
  [-0.55, -300, -180, 520, 30, 0.30, false],
  [0.48, 240, -260, 470, 26, 0.26, false],
  [-1.22, 60, 300, 430, 24, 0.33, false],
  [0.16, -180, 240, 560, 32, 0.23, false],
  [1.28, 320, 120, 400, 22, 0.29, false],
  [-0.32, 340, -60, 490, 28, 0.25, false],
  [0.88, -330, 90, 440, 21, 0.31, false],
  [-0.95, -120, -320, 460, 25, 0.27, false],
  [1.05, 120, 330, 420, 23, 0.32, false],
  [-0.18, -40, -70, 540, 29, 0.21, false],
  [0.66, 300, 300, 380, 20, 0.28, false],
  [-1.4, -320, 260, 400, 22, 0.24, false],
  // The three that half-bury it. Kept dim, so silver still wins the tile.
  [0.92, -140, 140, 430, 19, 0.38, true],
  [-0.72, 170, -110, 470, 22, 0.34, true],
  [1.42, 20, -30, 360, 17, 0.40, true],
];

/** Distance inside a straight tapered stalk, in the same form as the needle. */
function stalkCover(px, py, size, [angle, offsetX, offsetY, length, width]) {
  const s = size / 1024;
  const cx = size / 2 + offsetX * s;
  const cy = size / 2 + offsetY * s;
  const half = (length / 2) * s;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const along = (px - cx) * dx + (py - cy) * dy;
  const across = (px - cx) * -dy + (py - cy) * dx;
  const t = Math.max(0, Math.min(1, (along + half) / (2 * half)));
  // A pointed lens, exactly like the stalks the game draws.
  const halfWidth = (width / 2) * s * Math.sqrt(Math.max(0, 1 - Math.abs(t - 0.5) * 2));
  return halfWidth - Math.abs(across);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function writePng(path, size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * Signed distance to the needle: a capsule from the blunt end to the tip,
 * tapering along its length, with the eye punched out near the butt.
 */
function needleCover(px, py, size) {
  const s = size / 1024;
  // Diagonal, corner to corner, at three quarters of the width.
  const ax = 236 * s;
  const ay = 788 * s;
  const bx = 788 * s;
  const by = 236 * s;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  const dist = Math.hypot(px - cx, py - cy);
  // Uniform shaft, then a taper over the last fifth to a point.
  const halfWidth = (t < 0.8 ? 31 : 31 * (1 - (t - 0.8) / 0.2)) * s;
  const body = halfWidth - dist;

  // The eye: an ellipse along the shaft at a tenth of the way up.
  const eyeT = 0.13;
  const ex = ax + dx * eyeT;
  const ey = ay + dy * eyeT;
  const along = ((px - ex) * dx + (py - ey) * dy) / Math.sqrt(lenSq);
  const across = ((px - ex) * -dy + (py - ey) * dx) / Math.sqrt(lenSq);
  const eye = 1 - Math.hypot(along / (66 * s), across / (11 * s));

  return { body, eye, t };
}

function render(size, { needle = true, glow = true } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const centre = size / 2;
  const reach = size * 0.62;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let rgb = INK;
      if (glow) {
        const falloff = Math.min(1, Math.hypot(px - centre, py - centre * 0.92) / reach);
        rgb = mix(GLOW, INK, falloff ** 0.85);
      }
      if (needle) {
        for (const stalk of STRAW) {
          if (stalk[6]) continue;
          const cover = stalkCover(px, py, size, stalk);
          if (cover > 0) {
            rgb = mix(rgb, hsl(38 + stalk[0] * 6, 0.55, stalk[5]), Math.min(1, cover / (size * 0.002)));
          }
        }
        const { body, eye, t } = needleCover(px, py, size);
        const shadow = needleCover(px - size * 0.012, py - size * 0.012, size).body;
        if (shadow > 0) rgb = mix(rgb, SHADOW, Math.min(1, shadow / (size * 0.004)) * 0.55);
        if (body > 0) {
          const metal = mix(STEEL_DEEP, STEEL, Math.sin(Math.min(1, t) * Math.PI) * 0.9 + 0.1);
          rgb = mix(rgb, metal, Math.min(1, body / (size * 0.0022)));
          if (eye > 0) rgb = mix(rgb, SHADOW, Math.min(1, eye / 0.28) * 0.95);
        }
        // The stalks that half-bury it. This is the whole game in one mark.
        for (const stalk of STRAW) {
          if (!stalk[6]) continue;
          const cover = stalkCover(px, py, size, stalk);
          if (cover > 0) {
            rgb = mix(rgb, hsl(40 + stalk[0] * 5, 0.6, stalk[5]), Math.min(1, cover / (size * 0.002)));
          }
        }
      }
      const at = (y * size + x) * 4;
      pixels[at] = Math.round(rgb[0]);
      pixels[at + 1] = Math.round(rgb[1]);
      pixels[at + 2] = Math.round(rgb[2]);
      pixels[at + 3] = 255;
    }
  }
  return pixels;
}

/** The adaptive foreground is the mark alone on transparency, inset for the mask. */
function renderForeground(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const inset = 0.72;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5 - size / 2) / inset + size / 2;
      const py = (y + 0.5 - size / 2) / inset + size / 2;
      const { body, eye, t } = needleCover(px, py, size);
      const at = (y * size + x) * 4;

      // Straw first, so the mark matches the one on the other platform. The
      // adaptive mask crops it, which is exactly what straw running off an
      // edge should do.
      let rgb = null;
      let alpha = 0;
      for (const stalk of STRAW) {
        if (stalk[6]) continue;
        const cover = stalkCover(px, py, size, stalk);
        if (cover > 0) {
          const weight = Math.min(1, cover / (size * 0.002));
          rgb = rgb ? mix(rgb, hsl(38 + stalk[0] * 6, 0.55, stalk[5]), weight) : hsl(38 + stalk[0] * 6, 0.55, stalk[5]);
          alpha = Math.max(alpha, weight);
        }
      }
      if (body > 0) {
        const metal = mix(STEEL_DEEP, STEEL, Math.sin(Math.min(1, t) * Math.PI) * 0.9 + 0.1);
        const weight = Math.min(1, body / (size * 0.0022));
        rgb = rgb ? mix(rgb, metal, weight) : metal;
        alpha = Math.max(alpha, weight);
        if (eye > 0) rgb = mix(rgb, SHADOW, Math.min(1, eye / 0.28) * 0.95);
      }
      for (const stalk of STRAW) {
        if (!stalk[6]) continue;
        const cover = stalkCover(px, py, size, stalk);
        if (cover > 0) {
          const weight = Math.min(1, cover / (size * 0.002));
          rgb = rgb ? mix(rgb, hsl(40 + stalk[0] * 5, 0.6, stalk[5]), weight) : hsl(40 + stalk[0] * 5, 0.6, stalk[5]);
          alpha = Math.max(alpha, weight);
        }
      }
      if (!rgb) continue;
      pixels[at] = Math.round(rgb[0]);
      pixels[at + 1] = Math.round(rgb[1]);
      pixels[at + 2] = Math.round(rgb[2]);
      pixels[at + 3] = Math.round(255 * alpha);
    }
  }
  return pixels;
}

function renderFlat(size, rgb) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = rgb[0];
    pixels[i * 4 + 1] = rgb[1];
    pixels[i * 4 + 2] = rgb[2];
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}

writePng('assets/images/icon.png', 1024, render(1024));
writePng('assets/images/splash-icon.png', 512, renderForeground(512));
writePng('assets/images/android-icon-foreground.png', 432, renderForeground(432));
writePng('assets/images/android-icon-background.png', 432, render(432, { needle: false }));
writePng('assets/images/android-icon-monochrome.png', 432, renderForeground(432));
writePng('assets/images/favicon.png', 96, render(96));
console.log('icons written');
void GOLD;
