// The heritage engine, grown into the real Molecular Music Box. Two modes (A/B),
// each with its own jump interval AND note length; a collision toggles the mode,
// switching interval and length together. Collision modes:
//   overlap — a note collides if its onset lands while another note is still
//             sounding (the real MMB: length drives how often the mode switches).
//   onset   — a note collides only if its start-cell was a previous start (the
//             2015 behavior; length is then just sustain). Reproduces notes.py.
// Jump/length = value × base step (1/16 → a bar is 16 in 4/4; T = triplet); values
// can be fractional (3.5). Occupancy tracked on a 1/144-beat grid. Integer
// intervals reproduce the 2015 pitch+timing at base 1/4, onset (test/…).
import { makeScaleWalker, baseBeats } from '../music.js';

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
  blurb: 'Two intervals; a collision flips between them. Overlap = real MMB, onset = 2015 mode.',
  params: [
    { key: 'intervalA', label: 'Interval A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 10 },
    { key: 'lengthA', label: 'Length A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 4 },
    { key: 'intervalB', label: 'Interval B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 3.5 },
    { key: 'lengthB', label: 'Length B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 5 },
    { key: 'collision', label: 'Collision', type: 'select', options: ['overlap', 'onset'], default: 'overlap' },
    { key: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 24, step: 1, default: 4 },
    { key: 'startNote', label: 'Start note', type: 'range', min: 1, max: 8, step: 1, default: 1 },
    { key: 'startBeat', label: 'Start beat', type: 'range', min: 0, max: 16, step: 1, default: 0 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;
    const bb = baseBeats(shared.base);                    // absent (port test) -> quarter, = heritage
    const a = p.intervalA * bb;
    const b = p.intervalB * bb;
    const la = (p.lengthA ?? p.intervalA) * bb;           // length defaults to legato (= interval)
    const lb = (p.lengthB ?? p.intervalB) * bb;
    const overlap = (p.collision ?? 'onset') === 'overlap';   // absent (port test) -> onset = heritage

    const Q = 144;
    const cellOf = (bt) => Math.round(bt * Q);
    const prev = new Map();                              // coverage from COMPLETED passes (the looping patterns)
    let cur = new Map();                                 // this pass's coverage (not yet collidable)
    const notes = [];

    let usingA = true;
    let beat = (p.startBeat || 0) % totalBeats;
    let iterations = p.iterations;

    const nextStep = makeScaleWalker(root, scale);
    let current = root;
    for (let i = 1; i < (p.startNote || 1); i++) current = nextStep(current);

    let guard = 200000;
    while (iterations > 0 && guard-- > 0) {
      const k = cellOf(beat);
      if ((prev.get(k) || 0) > 0) usingA = !usingA;      // collide with a PREVIOUS pass -> switch mode

      const jump = usingA ? a : b;
      const len = usingA ? la : lb;
      if (jump <= 0) break;

      const dur = Math.max(0.05, Math.min(len, totalBeats - beat));
      notes.push({ pitch: current, startBeat: beat, durationBeats: dur, velocity: 100 });

      // record this pass's coverage: whole note incl. its end cell (overlap, so a note landing
      // exactly where one ended still counts as touching) or just the onset (onset mode)
      if (overlap) { const end = cellOf(beat + dur); for (let c = k; c <= end; c++) cur.set(c, 1); }
      else cur.set(k, 1);

      current = nextStep(current);
      beat += jump;
      if (beat >= totalBeats - 1e-9) {                    // notes.py:161 wrap — this pass is now "previous"
        iterations -= 1;
        beat -= totalBeats;
        for (const c of cur.keys()) prev.set(c, 1);
        cur = new Map();
      }
      if (notes.length > 4000) break;
    }
    return notes;
  },
};
