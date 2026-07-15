// Central app state + the regenerate pipeline. This module owns data only —
// main.js is the orchestrator that turns state changes into audio/viz/midi.
import { registry, getGenerator, defaultParams } from './generators/index.js';
import { humanize } from './music.js';

export const state = {
  genId: 'molecular',
  shared: { root: 48, scale: 'minor', meter: 4, loopLength: 4 },
  bpm: 120,
  human: { swing: 0, velVar: 0 },
  instrument: 'fm',
  genParams: {},          // { [genId]: {...params} }
  notes: [],
  playing: false,
};

// seed per-generator params from their declared defaults
for (const g of registry) state.genParams[g.id] = defaultParams(g);

export function totalBeats() {
  return state.shared.meter * state.shared.loopLength;
}

// run the active generator -> humanize -> store. Pure w.r.t. side effects.
export function regenerate() {
  const gen = getGenerator(state.genId);
  let notes = [];
  try {
    // 3rd arg: full context so a meta-generator (Mixed Media) can read its sources' params
    notes = gen.generate(state.shared, state.genParams[state.genId], { genParams: state.genParams }) || [];
  } catch (e) {
    console.error('generator error', state.genId, e);
    notes = [];
  }
  notes = humanize(notes, state.human);
  // clamp into MIDI range and drop anything off the loop grid
  const tb = totalBeats();
  state.notes = notes
    .filter((n) => n.startBeat < tb)
    .map((n) => ({
      pitch: Math.max(0, Math.min(127, Math.round(n.pitch))),
      startBeat: Math.max(0, n.startBeat),
      durationBeats: Math.max(0.05, n.durationBeats),
      velocity: Math.max(1, Math.min(127, Math.round(n.velocity))),
    }));
  return state.notes;
}
