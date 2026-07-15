// Canvas palette, ported from lumpy's shuffleColors. Pure maxed RGB, re-rolled
// each regen (forced-different bg/fg) so every generation is a new pairing.
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
