// Arpeggiator: build a chord from the scale and cycle it, stepping on the base grid.
import { degreeToPitch, baseBeats } from '../music.js';

const SHAPES = { triad: [0, 2, 4], seventh: [0, 2, 4, 6], sus: [0, 3, 4], power: [0, 4] };

export default {
  id: 'arp',
  label: 'Arpeggiator',
  blurb: 'Roll a chord up, down, or both, across octaves — one step per base unit.',
  params: [
    { key: 'chord', label: 'Chord', type: 'select', options: Object.keys(SHAPES), default: 'triad' },
    { key: 'pattern', label: 'Pattern', type: 'select', options: ['up', 'down', 'updown', 'random'], default: 'updown' },
    { key: 'octaves', label: 'Octaves', type: 'range', min: 1, max: 3, step: 1, default: 2 },
    { key: 'gate', label: 'Gate', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.6 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;
    const shape = SHAPES[p.chord];
    // chord degrees across octaves
    let degs = [];
    for (let o = 0; o < p.octaves; o++) for (const s of shape) degs.push(s + o * 7);
    if (p.pattern === 'down') degs = degs.slice().reverse();
    else if (p.pattern === 'updown') degs = degs.concat(degs.slice(1, -1).reverse());

    const stepBeats = baseBeats(shared.base);        // one arp step per base unit
    const nSteps = Math.max(1, Math.round(totalBeats / stepBeats));
    const notes = [];
    for (let i = 0; i < nSteps; i++) {
      const deg = p.pattern === 'random'
        ? degs[Math.floor((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * degs.length)]
        : degs[i % degs.length];
      notes.push({
        pitch: degreeToPitch(root, scale, deg),
        startBeat: i * stepBeats,
        durationBeats: stepBeats * p.gate,
        velocity: 100,
      });
    }
    return notes;
  },
};
