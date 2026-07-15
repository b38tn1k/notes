// Piano-roll editing: draw / move / resize / erase notes on the canvas.
// Edits mutate state.notes directly; changing a generator param regenerates and
// discards them (that's the deal). Geometry is frozen for the duration of a drag
// so the note tracks the cursor even if the pitch range would otherwise reflow.
import { geometry } from './viz.js';

let canvas, state, onChange;
let drag = null;

export function initEditor(cv, appState, onChangeCb) {
  canvas = cv;
  state = appState;
  onChange = onChangeCb;
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function xy(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / r.width * canvas.width,
    y: (e.clientY - r.top) / r.height * canvas.height,
  };
}
function toCell(x, y, g) { return { beat: x / g.cellW, pitch: g.hi - Math.floor(y / g.rowH) }; }
function snap(b) { const s = state.editSnap || 1; return Math.max(0, Math.round(b / s) * s); }

function noteAt(beat, pitch) {
  for (let i = state.notes.length - 1; i >= 0; i--) {   // topmost (last drawn) first
    const n = state.notes[i];
    if (n.pitch === pitch && beat >= n.startBeat && beat < n.startBeat + n.durationBeats) return n;
  }
  return null;
}

function down(e) {
  if (state.tool === 'off') return;
  e.preventDefault();
  const g = geometry(state);
  const { x, y } = xy(e);
  const { beat, pitch } = toCell(x, y, g);
  const p = Math.max(0, Math.min(127, Math.round(pitch)));
  const hit = noteAt(beat, p);

  if (state.tool === 'erase') { if (hit) { remove(hit); onChange(); } return; }

  // draw tool
  if (hit) {
    const rightEdge = hit.startBeat + hit.durationBeats;
    const onRightEdge = beat > rightEdge - Math.min(hit.durationBeats * 0.4, 0.5);
    drag = onRightEdge ? { note: hit, mode: 'resize', g } : { note: hit, mode: 'move', off: beat - hit.startBeat, g };
  } else {
    const n = { pitch: p, startBeat: snap(beat), durationBeats: state.editSnap || 1, velocity: 100 };
    state.notes.push(n);
    drag = { note: n, mode: 'move', off: 0, g };
    onChange();
  }
  try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
}

function move(e) {
  if (!drag) return;
  const { x, y } = xy(e);
  const { beat, pitch } = toCell(x, y, drag.g);
  if (drag.mode === 'move') {
    drag.note.startBeat = snap(beat - drag.off);
    drag.note.pitch = Math.max(0, Math.min(127, Math.round(pitch)));
  } else {
    const s = state.editSnap || 0.25;
    drag.note.durationBeats = Math.max(s, snap(beat) - drag.note.startBeat);
  }
  onChange();
}

function up() { if (drag) { drag = null; onChange(); } }

function remove(n) { const i = state.notes.indexOf(n); if (i >= 0) state.notes.splice(i, 1); }
