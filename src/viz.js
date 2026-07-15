// The loop visualization: a chunky pixel grid of the notes + a playhead.
// Critters are drawn by an injected renderer (critters.js) so viz stays decoupled.
// Hard blocks only — no shadowBlur, no smoothing.
import { colors } from './sprites.js';

let canvas, ctx;
let critterRenderer = null;   // (ctx, geom, playBeat, state) => void

export function initViz(cv) {
  canvas = cv;
  ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
}

export function setCritterRenderer(fn) { critterRenderer = fn; }

export function resize() {
  if (!canvas) return;
  // integer pixels, NO devicePixelRatio upscaling — let it look blocky
  canvas.width = Math.max(64, Math.floor(canvas.clientWidth));
  canvas.height = Math.max(64, Math.floor(canvas.clientHeight));
  ctx.imageSmoothingEnabled = false;
}

function pitchRange(notes) {
  if (!notes.length) return { lo: 48, hi: 60 };
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) { if (n.pitch < lo) lo = n.pitch; if (n.pitch > hi) hi = n.pitch; }
  lo -= 1; hi += 1;
  if (hi - lo < 6) { const mid = (hi + lo) >> 1; lo = mid - 3; hi = mid + 3; }
  return { lo, hi };
}

export function geometry(state) {
  const tb = state.shared.meter * state.shared.loopLength;
  const { lo, hi } = pitchRange(state.notes);
  const rows = hi - lo + 1;
  const W = canvas.width, H = canvas.height;
  return { tb, lo, hi, rows, W, H, cellW: W / tb, rowH: H / rows, meter: state.shared.meter };
}

export function draw(state, playBeat = -1) {
  if (!ctx) return;
  const g = geometry(state);
  const { W, H, cellW, rowH, tb, hi, meter } = g;

  // background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, W, H);

  // beat + bar gridlines (flat colors, no alpha)
  for (let b = 0; b <= tb; b++) {
    const x = Math.floor(b * cellW);
    ctx.fillStyle = b % meter === 0 ? colors.fg : '#0a3a1a';
    ctx.fillRect(x, 0, b % meter === 0 ? 2 : 1, H);
  }

  // notes as chunky blocks, colored by pitch class
  for (const n of state.notes) {
    const x = Math.floor(n.startBeat * cellW);
    const w = Math.max(3, Math.floor(n.durationBeats * cellW) - 1);
    const y = Math.floor((hi - n.pitch) * rowH);
    const h = Math.max(3, Math.floor(rowH) - 1);
    ctx.fillStyle = colors.accents[n.pitch % colors.accents.length] || colors.fg;
    ctx.fillRect(x, y, w, h);
    // a brighter 2px cap so louder notes read a touch stronger (no alpha, just a mark)
    if (n.velocity > 90) { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 2); }
  }

  // playhead
  if (playBeat >= 0) {
    const x = Math.floor((playBeat % tb) * cellW);
    ctx.fillStyle = colors.accents[1] || '#f0f';
    ctx.fillRect(x, 0, Math.max(2, Math.floor(cellW * 0.15)), H);
  }

  if (critterRenderer) critterRenderer(ctx, g, playBeat, state);
}
