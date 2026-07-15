// The heritage engine. Faithful port of notes.py's notes() loop — the
// Molecular Music Box — extended so the two jump intervals can be musical note
// divisions (⅛, ⅙, ¼, ⅓ … as well as whole beats), not just integers.
// Occupancy is tracked on a 1/96-beat grid so fractional jumps land cleanly.
// Integer intervals reproduce the 2015 output exactly (see test/molecular.test.mjs).
import { makeScaleWalker } from '../music.js';

// Every 1/8 and 1/6 division across whole beats, from 1/8 up to 16 (1 beat = a
// quarter note). Union of the eighth and sixth grids, so 3.5, 3⅓, 3⅛ … all exist.
const FRACS = [
  [0, ''], [1 / 8, '1/8'], [1 / 6, '1/6'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'],
  [1 / 2, '1/2'], [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [5 / 6, '5/6'], [7 / 8, '7/8'],
];
const IVS = [];
for (let i = 0; i <= 16; i++) {
  for (const [f, fl] of FRACS) {
    const v = i + f;
    if (v < 1 / 8 - 1e-9 || v > 16 + 1e-9) continue;      // skip 0; cap at 16
    IVS.push([v, i > 0 ? (fl ? `${i} ${fl}` : `${i}`) : fl]);
  }
}
export const IV_VALUES = IVS.map((x) => x[0]);
export const IV_LABELS = IVS.map((x) => x[1]);

export default {
  id: 'molecular',
  label: 'Molecular Music Box',
  blurb: 'Two intervals; switch whenever paths collide. The 2015 heritage algorithm — now with note-division jumps.',
  params: [
    { key: 'intervalA', label: 'Interval A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 5 },
    { key: 'intervalB', label: 'Interval B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 7 },
    { key: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 24, step: 1, default: 6 },
    { key: 'firstNote', label: 'Start degree', type: 'range', min: 1, max: 8, step: 1, default: 1 },
    { key: 'drums', label: 'Drums mode', type: 'toggle', default: false },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;
    const Q = 96;                                 // occupancy grid: cells per beat (÷ 8,6,4,3,2)
    const cell = (b) => Math.round(b * Q);
    const visited = new Map();                    // grid cell -> visit count
    const notes = [];

    let beat = 0;
    let processInterval = p.intervalA;
    let iterations = p.iterations;

    const nextStep = makeScaleWalker(root, scale);
    let current = root;
    for (let i = 1; i < p.firstNote; i++) current = nextStep(current);

    let drum = 36;                                // 36 kick / 38 snare (GM)
    let guard = 200000;

    while (iterations > 0 && guard-- > 0) {
      if (processInterval <= 0) break;            // a zero jump would loop forever
      const k = cell(beat);
      if ((visited.get(k) || 0) > 0) {            // collision -> toggle interval
        processInterval = processInterval === p.intervalA ? p.intervalB : p.intervalA;
      }
      visited.set(k, (visited.get(k) || 0) + 1);

      // sub-beat jumps get proportionally shorter notes; jumps >= 1 stay 1 beat
      // (so integer intervals match the heritage exactly).
      const dur = Math.min(1, processInterval);
      if (p.drums) {
        notes.push({ pitch: drum, startBeat: beat, durationBeats: dur, velocity: 100 });
        drum = drum === 38 ? 36 : 38;
      } else {
        notes.push({ pitch: current, startBeat: beat, durationBeats: dur, velocity: 100 });
        current = nextStep(current);
      }

      beat += processInterval;
      if (beat >= totalBeats - 1e-9) { iterations -= 1; beat -= totalBeats; }  // notes.py:161 wrap
      if (notes.length > 4000) break;             // safety on very fine intervals
    }
    return notes;
  },
};
