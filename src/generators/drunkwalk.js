// Drunk walk: wander up and down the scale, one note per beat, with a bias
// toward standing still so it doesn't run off into the weeds.
import { degreeToPitch, rng } from '../music.js';

export default {
  id: 'drunkwalk',
  label: 'Drunk Walk',
  blurb: 'A random walk along the scale. Stumbles, but stays in key.',
  params: [
    { key: 'density', label: 'Density', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.8 },
    { key: 'stepMax', label: 'Max step', type: 'range', min: 1, max: 4, step: 1, default: 2 },
    { key: 'startDeg', label: 'Start degree', type: 'range', min: 0, max: 7, step: 1, default: 0 },
    { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 99, step: 1, default: 7 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const steps = meter * loopLength;
    const rand = rng(p.seed * 1000 + steps);
    const notes = [];
    let deg = p.startDeg;
    for (let i = 0; i < steps; i++) {
      if (rand() > p.density) continue;            // rest
      notes.push({ pitch: degreeToPitch(root, scale, deg), startBeat: i, durationBeats: 1, velocity: 100 });
      // weighted {-step..+step} biased to 0
      const r = rand();
      const step = Math.floor(rand() * p.stepMax) + 1;
      if (r < 0.35) deg += step;
      else if (r < 0.7) deg -= step;
      // else: hold
      deg = Math.max(-7, Math.min(14, deg));       // keep it in a sane register
    }
    return notes;
  },
};
