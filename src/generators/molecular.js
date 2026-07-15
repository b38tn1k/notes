// The heritage engine. Faithful port of notes.py's notes() loop — the
// Molecular Music Box. Each jump = (interval × base step). The base sets the
// unit (1/16 → a bar is 16 in 4/4; T = triplet); the interval is a *fractional*
// count of that unit, so 3.5, 3⅓ etc. are all reachable. Occupancy is tracked on
// a 1/144-beat grid so every interval×base lands cleanly. Integer intervals
// reproduce the 2015 output when base = 1/4 (see test/molecular.test.mjs).
import { makeScaleWalker } from '../music.js';

// base step size in beats (1 beat = a quarter note). T = triplet.
const BASES = { '1/4': 1, '1/8': 1 / 2, '1/8T': 1 / 3, '1/16': 1 / 4, '1/16T': 1 / 6 };

// interval values: 1…16 with 1/4, 1/3, 1/2, 2/3, 3/4 sub-steps between the whole
// numbers, so you can jump 3.5, 3⅓, etc. (counts of the base step).
const FRACS = [[0, ''], [1 / 4, '1/4'], [1 / 3, '1/3'], [1 / 2, '1/2'], [2 / 3, '2/3'], [3 / 4, '3/4']];
const IVS = [];
for (let i = 1; i <= 16; i++) {
  for (const [f, fl] of FRACS) {
    if (i + f > 16 + 1e-9) continue;
    IVS.push([i + f, fl ? `${i} ${fl}` : `${i}`]);
  }
}
export const IV_VALUES = IVS.map((x) => x[0]);
export const IV_LABELS = IVS.map((x) => x[1]);

export default {
  id: 'molecular',
  label: 'Molecular Music Box',
  blurb: 'Two intervals; switch whenever paths collide. Jump = interval × base step (1/16 → a bar is 16 in 4/4; T = triplet). Intervals can be fractional (3.5).',
  params: [
    { key: 'base', label: 'Base step', type: 'select', options: Object.keys(BASES), default: '1/16' },
    { key: 'intervalA', label: 'Interval A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 5 },
    { key: 'intervalB', label: 'Interval B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 7 },
    { key: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 24, step: 1, default: 6 },
    { key: 'firstNote', label: 'Start degree', type: 'range', min: 1, max: 8, step: 1, default: 1 },
    { key: 'drums', label: 'Drums mode', type: 'toggle', default: false },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;
    const baseBeats = BASES[p.base] ?? 1;         // absent (e.g. port test) -> quarter, = heritage
    const a = p.intervalA * baseBeats;            // jump sizes in beats
    const b = p.intervalB * baseBeats;

    const Q = 144;                                // occupancy grid: cells per beat (÷ 16,18,24)
    const cellOf = (bt) => Math.round(bt * Q);
    const visited = new Map();
    const notes = [];

    let beat = 0;
    let processInterval = a;
    let iterations = p.iterations;

    const nextStep = makeScaleWalker(root, scale);
    let current = root;
    for (let i = 1; i < p.firstNote; i++) current = nextStep(current);

    let drum = 36;                                // 36 kick / 38 snare (GM)
    let guard = 200000;

    while (iterations > 0 && guard-- > 0) {
      if (processInterval <= 0) break;
      const k = cellOf(beat);
      if ((visited.get(k) || 0) > 0) {            // collision -> toggle interval
        processInterval = processInterval === a ? b : a;
      }
      visited.set(k, (visited.get(k) || 0) + 1);

      const dur = Math.min(1, processInterval);   // sub-beat jumps -> shorter notes
      if (p.drums) {
        notes.push({ pitch: drum, startBeat: beat, durationBeats: dur, velocity: 100 });
        drum = drum === 38 ? 36 : 38;
      } else {
        notes.push({ pitch: current, startBeat: beat, durationBeats: dur, velocity: 100 });
        current = nextStep(current);
      }

      beat += processInterval;
      if (beat >= totalBeats - 1e-9) { iterations -= 1; beat -= totalBeats; }  // notes.py:161 wrap
      if (notes.length > 4000) break;
    }
    return notes;
  },
};
