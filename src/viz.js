// The loop visualization: a chunky pixel grid of the notes + a playhead.
// Hard blocks only — no shadowBlur, no smoothing.
import { colors } from './sprites.js';

let canvas, ctx;

export function initViz(cv) {
  canvas = cv;
  ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
}

export function resize() {
  if (!canvas) return;
  // integer pixels, NO devicePixelRatio upscaling — let it look blocky
  const w = Math.max(64, Math.floor(canvas.clientWidth));
  const h = Math.max(64, Math.floor(canvas.clientHeight));
  if (w === canvas.width && h === canvas.height) return;   // guard the ResizeObserver feedback loop
  canvas.width = w;
  canvas.height = h;
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
  const meter = state.shared.meter;
  const loopL = state.shared.loopLength;
  const seqL = state.shared.lockLength ? loopL : state.shared.seqLength;
  const tb = meter * Math.max(loopL, seqL);      // grid shows the longer of the two
  const loopBeats = meter * loopL;
  const { lo, hi } = pitchRange(state.notes);
  const rows = hi - lo + 1;
  const W = canvas.width, H = canvas.height;
  return { tb, loopBeats, lo, hi, rows, W, H, cellW: W / tb, rowH: H / rows, meter };
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

  // loop-end marker (only when the sequence is longer than the loop)
  if (g.loopBeats < tb) {
    const x = Math.floor(g.loopBeats * cellW);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 1, 0, 3, H);
  }

  // playhead
  if (playBeat >= 0) {
    const x = Math.floor((playBeat % tb) * cellW);
    ctx.fillStyle = colors.accents[1] || '#f0f';
    ctx.fillRect(x, 0, Math.max(2, Math.floor(cellW * 0.15)), H);
  }
}
