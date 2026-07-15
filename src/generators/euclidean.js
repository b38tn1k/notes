// Euclidean rhythm (Bjorklund): spread `pulses` as evenly as possible over `steps`.
import { makeScaleWalker, baseBeats } from '../music.js';

export function bjorklund(steps, pulses) {
  pulses = Math.max(0, Math.min(pulses, steps));
  if (pulses === 0) return new Array(steps).fill(0);
  if (pulses === steps) return new Array(steps).fill(1);
  let a = Array.from({ length: pulses }, () => [1]);
  let b = Array.from({ length: steps - pulses }, () => [0]);
  while (b.length > 1) {
    const n = Math.min(a.length, b.length);
    const na = [], nb = [];
    for (let i = 0; i < n; i++) na.push(a[i].concat(b[i]));
    for (let i = n; i < a.length; i++) nb.push(a[i]);
    for (let i = n; i < b.length; i++) nb.push(b[i]);
    a = na; b = nb;
  }
  return a.concat(b).flat();
}

export default {
  id: 'euclidean',
  label: 'Euclidean Rhythm',
  blurb: 'Evenly-spread pulses over the base-step grid. Rotate to taste. Great for drums.',
  params: [
    { key: 'pulses', label: 'Pulses', type: 'range', min: 1, max: 32, step: 1, default: 30 },
    { key: 'rotation', label: 'Rotate', type: 'range', min: 0, max: 32, step: 1, default: 0 },
    { key: 'pitch', label: 'Pitch', type: 'select', options: ['root', 'octaveUp', 'climb', 'kick+snare'], default: 'root' },
    { key: 'gate', label: 'Gate', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const bb = baseBeats(shared.base);
    const steps = Math.max(1, Math.round((meter * loopLength) / bb));   // one step per base unit
    const pat = bjorklund(steps, p.pulses);
    const rot = ((p.rotation % steps) + steps) % steps;
    const walk = makeScaleWalker(root, scale);
    const notes = [];
    let deg = root;
    let drum = 36;
    for (let i = 0; i < steps; i++) {
      if (!pat[(i + rot) % steps]) continue;
      let pitch;
      if (p.pitch === 'root') pitch = root;
      else if (p.pitch === 'octaveUp') pitch = root + 12;
      else if (p.pitch === 'kick+snare') { pitch = drum; drum = drum === 38 ? 36 : 38; }
      else { deg = walk(deg); pitch = deg; }
      notes.push({ pitch, startBeat: i * bb, durationBeats: p.gate * bb, velocity: 100 });
    }
    return notes;
  },
};
