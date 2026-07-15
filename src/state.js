// Central app state + the regenerate pipeline. This module owns data only —
// main.js is the orchestrator that turns state changes into audio/viz/midi.
//
// Multi-voice: the app holds an array of `voices` (1..MAX_VOICES), each a full
// engine instance. `state.genId/genParams/instrument/notes` are backward-compat
// proxies to the FOCUSED voice so single-voice code keeps working; later phases
// give viz/audio explicit per-voice awareness.
import { registry, getGenerator, defaultParams } from './generators/index.js';
import { humanize, foldPitch } from './music.js';

let _vseq = 0;
const vid = () => `v${++_vseq}`;
export const MAX_VOICES = 4;
export const PALETTE = ['#0f0', '#0ff', '#f0f', '#ff0'];   // stable per-voice colours

export function makeVoice(genId = 'molecular', over = {}) {
  const genParams = {};
  for (const g of registry) genParams[g.id] = defaultParams(g);   // per-voice param bag (independent)
  return {
    id: vid(),
    genId,
    genParams,
    instrument: 'synth',
    mono: false,
    octave: 0,               // register shift (window-fold), in octaves
    mute: false, solo: false, shown: true,
    colorIdx: 0,             // stable palette slot
    notes: [],
    ...over,
  };
}

export const state = {
  // GLOBAL music theory + tempo + humanize; voices share these.
  shared: { root: 48, scale: 'minor', meter: 4, loopLength: 4, seqLength: 4, lockLength: true, floorDown: 24, ceilingUp: 24, base: '1/16' },
  bpm: 120,
  human: { swing: 0, velVar: 0, strum: 0 },
  voices: [makeVoice('molecular', { colorIdx: 0 })],
  focused: 0,
  playing: false,
  tool: 'off',            // piano-roll editor: 'off' | 'draw' | 'erase'
  editSnap: 1,
};

export const focusedVoice = () => state.voices[state.focused];

// Backward-compat proxies → the focused voice (single-voice code keeps working).
Object.defineProperties(state, {
  genId:      { get() { return focusedVoice().genId; }, set(v) { focusedVoice().genId = v; } },
  genParams:  { get() { return focusedVoice().genParams; } },
  instrument: { get() { return focusedVoice().instrument; }, set(v) { focusedVoice().instrument = v; } },
  notes:      { get() { return focusedVoice().notes; }, set(v) { focusedVoice().notes = v; } },
});

// effective sequence length in bars (follows the loop when locked) — global for now
export function seqLen() { return state.shared.lockLength ? state.shared.loopLength : state.shared.seqLength; }
export function seqBeats() { return state.shared.meter * seqLen(); }
export function loopBeats() { return state.shared.meter * state.shared.loopLength; }
export function totalBeats() { return loopBeats(); }   // "total" == the loop, for playback/export

// keep one note per onset (lowest pitch = bass-friendly), then clip so nothing overlaps
function collapseMono(notes) {
  if (notes.length < 2) return notes;
  const byOnset = new Map();
  for (const n of notes) {
    const k = Math.round(n.startBeat * 1000);
    const cur = byOnset.get(k);
    if (!cur || n.pitch < cur.pitch) byOnset.set(k, n);
  }
  const seq = [...byOnset.values()].sort((a, b) => a.startBeat - b.startBeat);
  for (let i = 0; i < seq.length - 1; i++) {
    const gap = seq[i + 1].startBeat - seq[i].startBeat;
    seq[i] = { ...seq[i], durationBeats: Math.max(0.05, Math.min(seq[i].durationBeats, gap)) };
  }
  return seq;
}

// run one voice's generator -> humanize -> fold/clamp (per-voice octave window) -> voice.notes
export function regenerateVoice(v) {
  const gen = getGenerator(v.genId);
  const genShared = { ...state.shared, loopLength: seqLen() };   // fill the sequence
  let notes = [];
  try {
    notes = gen.generate(genShared, v.genParams[v.genId], { genParams: v.genParams }) || [];
  } catch (e) {
    console.error('generator error', v.genId, e);
    notes = [];
  }
  notes = humanize(notes, state.human);
  const sb = seqBeats();
  const { root, floorDown, ceilingUp } = state.shared;
  const oct = (v.octave || 0) * 12;                              // shift the fold WINDOW, not the pitch
  const floor = root - floorDown + oct, ceiling = root + ceilingUp + oct;
  let out = notes
    .filter((n) => n.startBeat < sb)
    .map((n) => ({
      pitch: foldPitch(n.pitch, floor, ceiling),
      startBeat: Math.max(0, n.startBeat),
      durationBeats: Math.max(0.05, n.durationBeats),
      velocity: Math.max(1, Math.min(127, Math.round(n.velocity))),
    }));
  if (v.mono) out = collapseMono(out);
  v.notes = out;
  return out;
}

export const regenerateAll = () => { for (const v of state.voices) regenerateVoice(v); };
export function regenerate() { return regenerateVoice(focusedVoice()); }   // compat shim (focused voice)
