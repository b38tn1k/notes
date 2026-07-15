// Critter Herd: the literal "animals control the notes." A herd of creatures
// walks a grid (column = beat, row = scale degree); every step places a note.
// Traits are seeded, so a loop reproduces. Sim lives in critters.js.
import { simulateHerd } from '../critters.js';

export default {
  id: 'herd',
  label: 'Herd',
  blurb: 'A herd wanders the scale; its movement is the music. Size 1 = a lone drunk walk; breed for density, mutation for surprise.',
  params: [
    { key: 'size', label: 'Herd size', type: 'range', min: 1, max: 8, step: 1, default: 3 },
    { key: 'rows', label: 'Range (rows)', type: 'range', min: 4, max: 16, step: 1, default: 8 },
    { key: 'density', label: 'Density', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.85 },
    { key: 'wander', label: 'Wander', type: 'range', min: 0, max: 1, step: 0.1, default: 0.4 },
    { key: 'breed', label: 'Breed rate', type: 'range', min: 0, max: 0.5, step: 0.05, default: 0.1 },
    { key: 'mutation', label: 'Mutation', type: 'range', min: 0, max: 0.5, step: 0.05, default: 0.2 },
    { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 99, step: 1, default: 12 },
  ],
  generate(shared, p) {
    return simulateHerd(shared, p);
  },
};
