// The loop visualization: a chunky pixel grid overlaying all shown voices.
// Focused voice = filled blocks; others = outlined (dim via outline, not alpha).
// Hard blocks only — no shadowBlur, no smoothing.
import { colors } from './sprites.js';
import { PALETTE, focusedVoice } from './state.js';

let canvas, ctx;

export function initViz(cv) {
  canvas = cv;
  ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  resize();
}

export function resize() {
  if (!canvas) return;
  const w = Math.max(64, Math.floor(canvas.clientWidth));
  const h = Math.max(64, Math.floor(canvas.clientHeight));
  if (w === canvas.width && h === canvas.height) return;   // guard the ResizeObserver feedback loop
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
}

// union pitch range across the given voices
function pitchRange(voices) {
  let lo = Infinity, hi = -Infinity;
  for (const v of voices) for (const n of v.notes) { if (n.pitch < lo) lo = n.pitch; if (n.pitch > hi) hi = n.pitch; }
  if (lo === Infinity) return { lo: 48, hi: 60 };
  lo -= 1; hi += 1;
  if (hi - lo < 6) { const mid = (hi + lo) >> 1; lo = mid - 3; hi = mid + 3; }
  return { lo, hi };
}

export function geometry(state) {
  const meter = state.shared.meter;
  const shown = state.voices.filter((v) => v.shown !== false);
  const vs = shown.length ? shown : state.voices;
  const tb = meter * Math.max(1, ...vs.map((v) => v.length));   // master grid = longest voice
  const { lo, hi } = pitchRange(vs);
  const rows = hi - lo + 1;
  const W = canvas.width, H = canvas.height;
  return { tb, lo, hi, rows, W, H, cellW: W / tb, rowH: H / rows, meter };
}

export function draw(state, playBeat = -1) {
  if (!ctx) return;
  const g = geometry(state);
  const { W, H, cellW, rowH, tb, hi, meter } = g;

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, W, H);

  // beat + bar gridlines (flat colours, no alpha)
  for (let b = 0; b <= tb; b++) {
    const x = Math.floor(b * cellW);
    ctx.fillStyle = b % meter === 0 ? colors.fg : '#0a3a1a';
    ctx.fillRect(x, 0, b % meter === 0 ? 2 : 1, H);
  }

  const fv = focusedVoice();
  const blocks = (v) => {
    const col = PALETTE[v.colorIdx % PALETTE.length];
    const focused = v === fv;
    const vLen = meter * v.length;                 // tile the voice's loop across the master grid → phasing
    for (let off = 0; off < tb - 1e-6; off += vLen) {
      for (const n of v.notes) {
        const sb = n.startBeat + off;
        if (sb >= tb) continue;
        const x = Math.floor(sb * cellW);
        const w = Math.max(3, Math.floor(n.durationBeats * cellW) - 1);
        const y = Math.floor((hi - n.pitch) * rowH);
        const h = Math.max(3, Math.floor(rowH) - 1);
        if (focused) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
        else { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1)); }
      }
    }
  };
  // non-focused first (outlines), focused last (fills on top)
  for (const v of state.voices) if (v.shown !== false && v !== fv) blocks(v);
  if (fv && fv.shown !== false) blocks(fv);

  // per-voice loop boundaries (thin bright ticks where each voice repeats)
  for (const v of state.voices) {
    if (v.shown === false) continue;
    const vLen = meter * v.length;
    for (let b = vLen; b < tb - 1e-6; b += vLen) { ctx.fillStyle = PALETTE[v.colorIdx % PALETTE.length]; ctx.fillRect(Math.floor(b * cellW), 0, 1, H); }
  }

  // playhead
  if (playBeat >= 0) { const x = Math.floor((playBeat % tb) * cellW); ctx.fillStyle = '#fff'; ctx.fillRect(x, 0, Math.max(2, Math.floor(cellW * 0.15)), H); }
}
