// The heritage engine. Faithful port of notes.py's notes() loop — the
// Molecular Music Box. Two modes (A/B), each with its own jump interval AND note
// length; a collision (landing where a note already started) toggles the mode, so
// the interval and length switch together. Jump/length = value × base step (1/16
// → a bar is 16 in 4/4; T = triplet); values can be fractional (3.5). Notes hold
// for their length, so folded passes overlap into layered harmony. Occupancy is
// tracked on a 1/144-beat grid. Integer intervals reproduce the 2015 pitch+timing
// when base = 1/4 (see test/molecular.test.mjs).
import { makeScaleWalker } from '../music.js';

// base step size in beats (1 beat = a quarter note). T = triplet.
const BASES = { '1/4': 1, '1/8': 1 / 2, '1/8T': 1 / 3, '1/16': 1 / 4, '1/16T': 1 / 6 };

// interval/length values: 1…16 with 1/4, 1/3, 1/2, 2/3, 3/4 sub-steps.
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
  blurb: 'Two modes (interval + note length); a collision switches mode, so interval and length toggle together. Jump/length = value × base step; fractional ok (3.5).',
  params: [
    { key: 'base', label: 'Base step', type: 'select', options: Object.keys(BASES), default: '1/16' },
    { key: 'intervalA', label: 'Interval A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 5 },
    { key: 'lengthA', label: 'Length A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 5 },
    { key: 'intervalB', label: 'Interval B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 7 },
    { key: 'lengthB', label: 'Length B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 7 },
    { key: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 24, step: 1, default: 6 },
    { key: 'startNote', label: 'Start note', type: 'range', min: 1, max: 8, step: 1, default: 1 },
    { key: 'startBeat', label: 'Start beat', type: 'range', min: 0, max: 16, step: 1, default: 0 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;
    const baseBeats = BASES[p.base] ?? 1;                 // absent (port test) -> quarter, = heritage
    const a = p.intervalA * baseBeats;
    const b = p.intervalB * baseBeats;
    const la = (p.lengthA ?? p.intervalA) * baseBeats;    // length defaults to legato (= interval)
    const lb = (p.lengthB ?? p.intervalB) * baseBeats;

    const Q = 144;
    const cellOf = (bt) => Math.round(bt * Q);
    const visited = new Map();
    const notes = [];

    let usingA = true;
    let beat = (p.startBeat || 0) % totalBeats;           // where the pattern begins / wraps
    let iterations = p.iterations;

    const nextStep = makeScaleWalker(root, scale);
    let current = root;
    for (let i = 1; i < (p.startNote || 1); i++) current = nextStep(current);

    let guard = 200000;
    while (iterations > 0 && guard-- > 0) {
      const k = cellOf(beat);
      if ((visited.get(k) || 0) > 0) usingA = !usingA;    // collision -> switch mode (interval + length)
      visited.set(k, (visited.get(k) || 0) + 1);

      const jump = usingA ? a : b;
      const len = usingA ? la : lb;
      if (jump <= 0) break;

      const dur = Math.max(0.05, Math.min(len, totalBeats - beat));  // hold for its length, clipped to loop end
      notes.push({ pitch: current, startBeat: beat, durationBeats: dur, velocity: 100 });
      current = nextStep(current);

      beat += jump;
      if (beat >= totalBeats - 1e-9) { iterations -= 1; beat -= totalBeats; }  // notes.py:161 wrap
      if (notes.length > 4000) break;
    }
    return notes;
  },
};
