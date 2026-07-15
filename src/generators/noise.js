// The idea noise.py never shipped: a value-noise curve, summed over octaves,
// mapped to scale degrees. (No Savitzky-Golay run four times — that stays in the roast.)
import { degreeToPitch, rng } from '../music.js';

// 1-D value noise: random values at integer points, smoothly interpolated.
function valueNoise(seed) {
  const rand = rng(seed);
  const pts = Array.from({ length: 64 }, () => rand());
  const smooth = (t) => t * t * (3 - 2 * t);       // smoothstep
  return (x) => {
    const i = Math.floor(x) % pts.length;
    const j = (i + 1) % pts.length;
    const f = smooth(x - Math.floor(x));
    return pts[i] * (1 - f) + pts[j] * f;
  };
}

export default {
  id: 'noise',
  label: 'Noise Melody',
  blurb: 'Value-noise contour quantized to the scale. noise.py, redeemed.',
  params: [
    { key: 'octaves', label: 'Octaves', type: 'range', min: 1, max: 5, step: 1, default: 3 },
    { key: 'scaleX', label: 'Zoom', type: 'range', min: 0.05, max: 1, step: 0.05, default: 0.35 },
    { key: 'range', label: 'Range', type: 'range', min: 3, max: 15, step: 1, default: 8 },
    { key: 'density', label: 'Density', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.9 },
    { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 99, step: 1, default: 3 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const steps = meter * loopLength;
    const octs = Array.from({ length: p.octaves }, (_, k) => valueNoise(p.seed * 131 + k * 977));
    const gate = rng(p.seed * 17 + 3);
    const notes = [];
    for (let i = 0; i < steps; i++) {
      if (gate() > p.density) continue;
      let v = 0, amp = 1, tot = 0;
      for (let k = 0; k < p.octaves; k++) {
        v += amp * octs[k](i * p.scaleX * (k + 1) * 2);
        tot += amp; amp *= 0.5;
      }
      v /= tot;                                     // 0..1
      const deg = Math.round((v - 0.5) * p.range);
      notes.push({ pitch: degreeToPitch(root, scale, deg), startBeat: i, durationBeats: 1, velocity: 100 });
    }
    return notes;
  },
};
