// Pixel-art engine, ported from lumpy's genSprite + shuffleColors.
// Everything here is hard-edged blocks. No smoothing, ever.
import { rng } from './music.js';

// lumpy's exact palette — pure maxed RGB.
export const PALETTE = ['#0f0', '#ff0', '#0ff', '#f0f', '#fff', '#f00', '#00f'];

// canvas colors, re-rolled each regen (lumpy's shuffleColors, forced-different)
export const colors = { bg: '#000', fg: '#0f0', accents: ['#0f0', '#f0f', '#0ff'] };

function pick(rand, exclude = []) {
  let c = PALETTE[Math.floor(rand() * PALETTE.length)];
  let guard = 20;
  while (exclude.includes(c) && guard-- > 0) c = PALETTE[Math.floor(rand() * PALETTE.length)];
  return c;
}

// Re-roll the canvas palette. bg stays dark-ish by biasing away from #fff,
// fg forced different, plus a few distinct accent colors for notes/critters.
export function shuffleColors(seed) {
  const rand = rng(seed || 1);
  // keep bg readable-ish: prefer a dark primary; #000 half the time, else a deep hue
  const darks = ['#000', '#00f', '#f00', '#000'];
  colors.bg = rand() < 0.6 ? '#000' : darks[Math.floor(rand() * darks.length)];
  colors.fg = pick(rand, [colors.bg]);
  const a1 = pick(rand, [colors.bg, colors.fg]);
  const a2 = pick(rand, [colors.bg, colors.fg, a1]);
  const a3 = pick(rand, [colors.bg]);
  colors.accents = [colors.fg, a1, a2, a3];
  return colors;
}

// Generate a symmetric 8-bit critter. Returns a small offscreen canvas
// (1px per cell) to be blitted scaled with imageSmoothingEnabled=false.
// Half is generated, the other half mirrored — same trick as lumpy.
export function genSprite(w, h, color, seed) {
  const rand = rng(seed || 1);
  const grid = [];
  let max = 0;
  for (let i = 0; i < w; i++) {
    grid[i] = [];
    for (let j = 0; j < h; j++) {
      let v = rand() * 2;
      v += Math.sin((Math.PI / 180) * (90 * i / w));       // denser toward the mirror seam
      v += Math.sin((Math.PI / 180) * (180 * (j / h)));    // denser toward vertical center
      grid[i][j] = v;
      if (v > max) max = v;
    }
  }
  let sum = 0, cnt = 0;
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { grid[i][j] /= max; sum += grid[i][j]; cnt++; }
  const thresh = sum / cnt;

  const cv = document.createElement('canvas');
  cv.width = w * 2; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = color;
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      if (grid[i][j] > thresh) {
        g.fillRect(i, j, 1, 1);                 // left half
        g.fillRect(w * 2 - 1 - i, j, 1, 1);     // mirrored right half
      }
    }
  }
  return cv;
}
