// Central app state + the regenerate pipeline. This module owns data only —
// main.js is the orchestrator that turns state changes into audio/viz/midi.
import { registry, getGenerator, defaultParams } from './generators/index.js';
import { humanize, foldPitch } from './music.js';

export const state = {
  genId: 'molecular',
  // loopLength = playback repeat window; seqLength = how much the generator fills.
  // lockLength keeps them equal (the default, and all it was before).
  shared: { root: 48, scale: 'minor', meter: 4, loopLength: 4, seqLength: 4, lockLength: true, floorDown: 24, ceilingUp: 24, base: '1/16' },
  bpm: 120,
  human: { swing: 0, velVar: 0, strum: 0 },
  instrument: 'synth',
  genParams: {},          // { [genId]: {...params} }
  notes: [],
  playing: false,
  tool: 'off',            // piano-roll editor: 'off' | 'draw' | 'erase'
  editSnap: 1,            // beat snap for editing
};

// seed per-generator params from their declared defaults
for (const g of registry) state.genParams[g.id] = defaultParams(g);

// effective sequence length in bars (follows the loop when locked)
export function seqLen() {
  return state.shared.lockLength ? state.shared.loopLength : state.shared.seqLength;
}
export function seqBeats() { return state.shared.meter * seqLen(); }
export function loopBeats() { return state.shared.meter * state.shared.loopLength; }
export function totalBeats() { return loopBeats(); }   // "total" == the loop, for playback/export

// run the active generator -> humanize -> store. Pure w.r.t. side effects.
export function regenerate() {
  const gen = getGenerator(state.genId);
  let notes = [];
  // Generators think in "loopLength"; hand them the sequence length so they fill
  // the sequence, while the app loops/exports over the real loopLength.
  const genShared = { ...state.shared, loopLength: seqLen() };
  try {
    // 3rd arg: full context so a meta-generator (Mixer) can read its sources' params
    notes = gen.generate(genShared, state.genParams[state.genId], { genParams: state.genParams }) || [];
  } catch (e) {
    console.error('generator error', state.genId, e);
    notes = [];
  }
  notes = humanize(notes, state.human);
  // clamp into MIDI range and drop anything past the generated sequence
  const sb = seqBeats();
  const { root, floorDown, ceilingUp } = state.shared;
  const floor = root - floorDown, ceiling = root + ceilingUp;   // range relative to the key
  state.notes = notes
    .filter((n) => n.startBeat < sb)
    .map((n) => ({
      pitch: foldPitch(n.pitch, floor, ceiling),   // octave-fold into the THEORY range
      startBeat: Math.max(0, n.startBeat),
      durationBeats: Math.max(0.05, n.durationBeats),
      velocity: Math.max(1, Math.min(127, Math.round(n.velocity))),
    }));
  return state.notes;
}
