// The heritage engine, grown into the real Molecular Music Box. A single diatonic
// scale-walk (pitch steps +1 per note); each note's length toggles between two
// presets (A/B) whenever it collides with material from an EARLIER, still-looping
// pattern. Two structures:
//   build — the canonical loop-pedal. Every pattern-length the walk fills freezes
//           into a loop and keeps sounding while the walk climbs on above it, so
//           layers stack up one at a time (the real MMB build-up / "fractal" arc).
//   fold  — every pass folds back into one loop window, so you hear the end-state
//           density from bar one (the 2015 heritage; reproduces notes.py).
// Collision modes:
//   onset   — canonical: an onset landing on a cell a previous pattern started on
//             (what the reference ports detect).
//   overlap — variant: collide if the onset lands while a previous note still rings.
// Jump/length = value × base step (1/16 → a bar is 16 in 4/4; T = triplet); values
// can be fractional (3.5). Occupancy on a 1/144-beat grid. Integer intervals at
// base 1/4, onset + fold reproduce the 2015 pitch+timing (test/molecular.test.mjs).
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
  blurb: 'Diatonic walk; a collision flips length. Fold = one dense loop; build = MMB layers stack.',
  params: [
    // default 8: on the 1/16 grid a 10 walks 32 distinct onsets before repeating — more than
    // 4 iterations ever place, so it NEVER collides and the B params sit inert. 8 collides at note 9.
    { key: 'intervalA', label: 'Interval A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 8 },
    { key: 'lengthA', label: 'Length A', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 4 },
    { key: 'intervalB', label: 'Interval B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 3.5 },
    { key: 'lengthB', label: 'Length B', type: 'steps', values: IV_VALUES, labels: IV_LABELS, default: 5 },
    { key: 'structure', label: 'Structure', type: 'select', options: ['fold', 'build'], default: 'fold' },
    { key: 'collision', label: 'Collision', type: 'select', options: ['onset', 'overlap'], default: 'onset' },
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
    const nextStep = makeScaleWalker(root, scale);
    let current = root;
    for (let i = 1; i < (p.startNote || 1); i++) current = nextStep(current);

    // ===== BUILD (canonical loop-pedal): layers enter one per pattern and keep looping =====
    if ((p.structure ?? 'fold') === 'build') {
      const layers = Math.max(1, p.iterations || 1);
      const P = totalBeats / layers;                      // one pattern (layer) length in beats
      const cpp = Math.max(1, Math.round(P * Q));         // cells per pattern (loop period)
      const frozen = new Set();                           // local cells occupied by FROZEN, looping patterns
      let pending = [];                                   // the current pattern's own cells (not yet collidable)
      let curK = 0, usingA = true, collisions = 0;
      let beat = p.startBeat || 0;                        // absolute walk position — continuous, never wraps
      const fresh = [];                                   // freshly-walked notes: {pitch, startBeat, dur, k}

      let guard = 200000;
      while (beat < totalBeats - 1e-9 && guard-- > 0) {
        const cell = cellOf(beat);
        const k = Math.min(layers - 1, Math.floor(cell / cpp));
        if (k > curK) { for (const c of pending) frozen.add(c); pending = []; curK = k; }   // freeze finished patterns
        const local = cell % cpp;
        if (frozen.has(local)) { usingA = !usingA; collisions++; }   // collide with a PREVIOUS (looping) pattern -> flip length
        const jump = usingA ? a : b;
        const len = usingA ? la : lb;
        if (jump <= 0) break;
        const dur = Math.max(0.05, Math.min(len, totalBeats - beat));
        fresh.push({ pitch: current, startBeat: beat, dur, k });
        if (overlap) { const span = Math.min(cpp - 1, Math.round(dur * Q)); for (let c = 0; c <= span; c++) pending.push((local + c) % cpp); }
        else pending.push(local);
        current = nextStep(current);
        beat += jump;
        if (fresh.length > 4000) break;
      }

      // each pattern loops forward across every later block (the loop-pedal build-up)
      const out = [];
      out.collisions = collisions;                        // stat for the UI readout (dead-B patches say why)
      for (const n of fresh) {
        for (let r = 0; r <= layers - 1 - n.k; r++) {
          const sb = n.startBeat + r * P;
          if (sb >= totalBeats - 1e-9) break;
          out.push({ pitch: n.pitch, startBeat: sb, durationBeats: Math.max(0.05, Math.min(n.dur, totalBeats - sb)), velocity: 100 });
          if (out.length > 8000) return out;
        }
      }
      return out;
    }

    // ===== FOLD (2015 heritage): every pass folds into one loop window =====
    const prev = new Map();                              // coverage from COMPLETED passes (the looping patterns)
    let cur = new Map();                                 // this pass's coverage (not yet collidable)
    const notes = [];

    let usingA = true, collisions = 0;
    let beat = (p.startBeat || 0) % totalBeats;
    let iterations = p.iterations;

    let guard = 200000;
    while (iterations > 0 && guard-- > 0) {
      const k = cellOf(beat);
      if ((prev.get(k) || 0) > 0) { usingA = !usingA; collisions++; }   // collide with a PREVIOUS pass -> switch mode

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
    notes.collisions = collisions;                       // stat for the UI readout
    return notes;
  },
};
