// Mixed Media: blend two other generators. Layer them, take rhythm from one and
// pitch from the other, or interleave across the bar. Optional grid + key align.
import molecular from './molecular.js';
import euclidean from './euclidean.js';
import herd from './herd.js';
import { snapToScale } from '../music.js';

const SOURCES = { molecular, euclidean, herd };
const IDS = Object.keys(SOURCES);

function defaults(g) { const p = {}; for (const s of g.params) p[s.key] = s.default; return p; }

// Use the source's live, shared params (same object the standalone engine edits)
// so tuning Molecular here == tuning it there. Fall back to defaults if absent.
function runSource(id, shared, ctx) {
  const g = SOURCES[id] || molecular;
  const p = (ctx && ctx.genParams && ctx.genParams[id]) || defaults(g);
  return g.generate(shared, p, ctx) || [];
}

export const MIXED_SOURCES = IDS;

export default {
  id: 'mixed',
  label: 'Mixer',
  blurb: 'Mutate two engines together — layer them, take rhythm from one and pitch from the other, or interleave.',
  params: [
    { key: 'sourceA', label: 'Source A', type: 'select', options: IDS, default: 'molecular' },
    { key: 'sourceB', label: 'Source B', type: 'select', options: IDS, default: 'euclidean' },
    { key: 'mode', label: 'Blend', type: 'select', options: ['layer', 'rhythm+pitch', 'interleave'], default: 'rhythm+pitch' },
    { key: 'quantize', label: 'Quantize', type: 'toggle', default: false },
    { key: 'keyLock', label: 'Key lock', type: 'toggle', default: true },
  ],
  generate(shared, p, ctx) {
    const a = runSource(p.sourceA, shared, ctx);
    const b = runSource(p.sourceB, shared, ctx);
    let out;

    if (p.mode === 'rhythm+pitch') {
      const pitches = b.map((n) => n.pitch);
      out = a.map((n, i) => ({ ...n, pitch: pitches.length ? pitches[i % pitches.length] : n.pitch }));
    } else if (p.mode === 'interleave') {
      // A owns even beats, B owns odd beats
      out = [
        ...a.filter((n) => Math.floor(n.startBeat) % 2 === 0),
        ...b.filter((n) => Math.floor(n.startBeat) % 2 === 1),
      ];
    } else {
      out = [...a, ...b]; // layer
    }

    if (p.quantize) out = out.map((n) => ({ ...n, startBeat: Math.round(n.startBeat * 2) / 2 }));
    if (p.keyLock) out = out.map((n) => ({ ...n, pitch: snapToScale(shared.root, shared.scale, n.pitch) }));
    return out;
  },
};
