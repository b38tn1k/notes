// Critter Herd simulation for generators/herd.js. A herd of creatures walks a
// grid — each creature's column = beat, row = scale degree — and every step it
// takes places a note. Traits are seeded, so a loop reproduces.
import { degreeToPitch, rng } from './music.js';

export function simulateHerd(shared, p) {
  const { meter, loopLength, root, scale } = shared;
  const beats = meter * loopLength;
  const rows = p.rows;
  const rand = rng((p.seed || 1) * 2654435761);
  const notes = [];

  // spawn the herd with random traits
  let herd = Array.from({ length: p.size }, () => ({
    row: Math.floor(rand() * rows),
    dir: rand() < 0.5 ? 1 : -1,
    intent: rand(),          // how likely to keep moving vs rest
    creativity: rand(),      // how likely to jump octave / breed
    vel: 70 + Math.floor(rand() * 50),
  }));

  for (let beat = 0; beat < beats; beat++) {
    const next = [];
    for (const c of herd) {
      if (rand() < c.intent) {                       // it moves -> it plays
        c.row += c.dir * (1 + (rand() < c.creativity ? Math.floor(rand() * p.wander * 3) : 0));
        if (c.row < 0) { c.row = 0; c.dir = 1; }
        if (c.row >= rows) { c.row = rows - 1; c.dir = -1; }
        if (rand() < 0.15) c.dir *= -1;              // occasional turn
        notes.push({ pitch: degreeToPitch(root, scale, c.row), startBeat: beat, durationBeats: 1, velocity: c.vel });
      }
      // breeding: spawn a mutated offspring, capped by grid pressure
      if (rand() < p.breed * c.creativity && herd.length + next.length < p.size * 3) {
        next.push({ row: c.row, dir: -c.dir, intent: mut(c.intent, p.mutation, rand), creativity: mut(c.creativity, p.mutation, rand), vel: c.vel });
      }
    }
    herd = herd.concat(next);
    if (herd.length > p.size * 2) herd = herd.slice(0, p.size * 2);  // cull so it doesn't turn to mush
  }
  return notes;
}

function mut(v, amount, rand) { return Math.max(0, Math.min(1, v + (rand() * 2 - 1) * amount)); }
