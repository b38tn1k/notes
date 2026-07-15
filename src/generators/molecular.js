// The heritage engine. Faithful port of notes.py's notes() loop — the
// Molecular Music Box. This is the correctness anchor (see test/molecular.test.mjs).
import { makeScaleWalker } from '../music.js';

export default {
  id: 'molecular',
  label: 'Molecular Music Box',
  blurb: 'Two intervals; switch whenever paths collide. The 2015 heritage algorithm.',
  params: [
    { key: 'intervalA', label: 'Interval A', type: 'range', min: 1, max: 15, step: 1, default: 5 },
    { key: 'intervalB', label: 'Interval B', type: 'range', min: 1, max: 15, step: 1, default: 7 },
    { key: 'iterations', label: 'Iterations', type: 'range', min: 1, max: 24, step: 1, default: 6 },
    { key: 'firstNote', label: 'Start degree', type: 'range', min: 1, max: 8, step: 1, default: 1 },
    { key: 'drums', label: 'Drums mode', type: 'toggle', default: false },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;        // notes.py: beats_in_loop = meter*loop_length - 1 (max index)
    const maxIndex = totalBeats - 1;
    const processLoop = new Array(totalBeats).fill(0);
    const notes = [];

    let beat = 0;
    let processInterval = p.intervalA;
    let iterations = p.iterations;

    const nextStep = makeScaleWalker(root, scale);
    let current = root;
    // notes.py:126 `for i in range(first_note, 0)` was a no-op; we honor the *intent*
    // (start N degrees up) instead of preserving the bug.
    for (let i = 1; i < p.firstNote; i++) current = nextStep(current);

    let drum = 36;                                 // 36 kick / 38 snare (GM)

    // Guard against pathological params producing runaway loops.
    let guard = 100000;
    while (iterations > 0 && guard-- > 0) {
      if (processLoop[beat] > 0) {                  // collision -> toggle interval
        processInterval = processInterval === p.intervalA ? p.intervalB : p.intervalA;
      }
      processLoop[beat] += 1;

      if (p.drums) {
        notes.push({ pitch: drum, startBeat: beat, durationBeats: 1, velocity: 100 });
        drum = drum === 38 ? 36 : 38;
      } else {
        notes.push({ pitch: current, startBeat: beat, durationBeats: 1, velocity: 100 });
        current = nextStep(current);
      }

      beat += processInterval;
      if (beat > maxIndex) { iterations -= 1; beat -= totalBeats; }  // notes.py:161 wrap
    }
    return notes;
  },
};
