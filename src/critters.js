// The performer creatures. One critter per voice hops to whatever note is
// sounding, snapping cell-to-cell (no interpolation), leaving a chunky trail.
// Also home to the Critter Herd simulation used by generators/herd.js.
import { genSprite, colors } from './sprites.js';
import { degreeToPitch, rng } from './music.js';

let critters = [];
let trail = [];

export function makeCritters(state, seed) {
  // one performer per voice: mixed = 2 sources, herd = a small pack, else 1
  const n = state.genId === 'mixed' ? 2 : state.genId === 'herd' ? Math.min(4, state.genParams.herd.size) : 1;
  critters = [];
  for (let k = 0; k < n; k++) {
    const color = colors.accents[(k + 1) % colors.accents.length] || colors.fg;
    critters.push({ sprite: genSprite(4, 5, color, (seed || 1) * 97 + k * 131), color, cell: null });
  }
  trail = [];
}

export function renderCritters(ctx, geom, playBeat, state) {
  if (!critters.length || !state.notes.length) return;
  ctx.imageSmoothingEnabled = false;
  const { cellW, rowH, hi, tb } = geom;

  if (playBeat < 0) {
    // parked: sit each critter on an early note so they're visible when stopped
    critters.forEach((c, i) => { const n = state.notes[i % state.notes.length]; c.cell = { beat: n.startBeat, pitch: n.pitch }; });
  } else {
    const pb = ((playBeat % tb) + tb) % tb;
    const active = state.notes.filter((n) => n.startBeat <= pb && pb < n.startBeat + n.durationBeats);
    const src = active.length ? active : [nearestNote(state.notes, pb)];
    src.forEach((n, i) => { critters[i % critters.length].cell = { beat: n.startBeat, pitch: n.pitch }; });
    for (const c of critters) if (c.cell) trail.push({ beat: c.cell.beat, pitch: c.cell.pitch, color: c.color });
    if (trail.length > 20) trail.splice(0, trail.length - 20);
  }

  // trail: chunky footprints
  for (const t of trail) {
    ctx.fillStyle = t.color;
    const s = Math.max(2, Math.floor(Math.min(cellW, rowH) * 0.35));
    ctx.fillRect(Math.floor(t.beat * cellW), Math.floor((hi - t.pitch) * rowH), s, s);
  }

  // critters
  for (const c of critters) {
    if (!c.cell) continue;
    const spr = c.sprite;
    const h = Math.max(12, Math.floor(rowH * 1.8));
    const w = Math.floor(h * spr.width / spr.height);
    const x = Math.floor(c.cell.beat * cellW + cellW / 2 - w / 2);
    const y = Math.floor((hi - c.cell.pitch) * rowH + rowH / 2 - h / 2);
    ctx.drawImage(spr, x, y, w, h);
  }
}

function nearestNote(notes, pb) {
  let best = notes[0], bd = Infinity;
  for (const n of notes) { const d = Math.abs(n.startBeat - pb); if (d < bd) { bd = d; best = n; } }
  return best;
}

// --- Critter Herd simulation (used by generators/herd.js) ---
// A herd of creatures walks a grid. Each creature's column = beat, row = scale
// degree. Every step it takes places a note. Traits (from a seed) bias the walk.
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
    // cull to keep the loop from turning to mush
    if (herd.length > p.size * 2) herd = herd.slice(0, p.size * 2);
  }
  return notes;
}

function mut(v, amount, rand) { return Math.max(0, Math.min(1, v + (rand() * 2 - 1) * amount)); }
