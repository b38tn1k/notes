// Markov melody. Samples an order-k chain of (pitch-interval, duration) tokens.
// Ships with a hand-seeded default model; if public/models/markov.json exists
// (train it with tools/train_markov.py on your own MIDI), that overrides it.
import { snapToScale, rng } from '../music.js';

// token = "interval:durBucket". Default: single duration bucket (1 beat),
// intervals biased toward stepwise motion — a serviceable melodic model.
const DEFAULT_MODEL = {
  order: 1,
  durations: [1],
  start: { '0:0': 3, '2:0': 4, '-2:0': 3, '3:0': 2, '-3:0': 2, '5:0': 1, '-5:0': 1 },
  trans: {
    '0:0': { '2:0': 3, '-2:0': 3, '0:0': 1, '3:0': 1, '-3:0': 1 },
    '2:0': { '2:0': 3, '0:0': 2, '-2:0': 1, '3:0': 2, '5:0': 1 },
    '-2:0': { '-2:0': 3, '0:0': 2, '2:0': 1, '-3:0': 2, '-5:0': 1 },
    '3:0': { '-2:0': 3, '2:0': 1, '0:0': 1, '-3:0': 1 },
    '-3:0': { '2:0': 3, '-2:0': 1, '0:0': 1, '3:0': 1 },
    '5:0': { '-2:0': 3, '-3:0': 2, '0:0': 1 },
    '-5:0': { '2:0': 3, '3:0': 2, '0:0': 1 },
  },
};

let MODEL = DEFAULT_MODEL;
// Best-effort override with a trained model (no-op if absent).
fetch(`${import.meta.env.BASE_URL}models/markov.json`)
  .then((r) => (r.ok ? r.json() : null))
  .then((m) => { if (m && m.trans) MODEL = m; })
  .catch(() => {});

function parseTok(t) { const [i, d] = t.split(':'); return { interval: parseInt(i, 10), dur: parseInt(d || '0', 10) }; }

// weighted sample with temperature (temp>1 flatter, <1 sharper)
function sample(dist, temp, rand) {
  const keys = Object.keys(dist);
  if (!keys.length) return null;
  const w = keys.map((k) => Math.pow(dist[k], 1 / Math.max(0.05, temp)));
  const total = w.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < keys.length; i++) { r -= w[i]; if (r <= 0) return keys[i]; }
  return keys[keys.length - 1];
}

export default {
  id: 'markov',
  label: 'Markov',
  blurb: 'A chain trained on real MIDI (offline), frozen to JSON, sampled here.',
  params: [
    { key: 'temperature', label: 'Temperature', type: 'range', min: 0.2, max: 2, step: 0.1, default: 1 },
    { key: 'density', label: 'Density', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.9 },
    { key: 'scaleLock', label: 'Snap to scale', type: 'toggle', default: true },
    { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 99, step: 1, default: 5 },
  ],
  generate(shared, p) {
    const { meter, loopLength, root, scale } = shared;
    const totalBeats = meter * loopLength;
    const durations = MODEL.durations && MODEL.durations.length ? MODEL.durations : [1];
    const rand = rng(p.seed * 100003 + totalBeats);
    const notes = [];

    let pitch = root;
    let history = [sample(MODEL.start, p.temperature, rand) || '0:0'];
    let beat = 0;
    let guard = 2000;

    while (beat < totalBeats && guard-- > 0) {
      const tok = parseTok(history[history.length - 1]);
      pitch += tok.interval;
      if (pitch < root - 12) pitch += 12;
      if (pitch > root + 24) pitch -= 12;
      const dur = durations[Math.min(tok.dur, durations.length - 1)] || 1;

      if (rand() <= p.density) {
        const outPitch = p.scaleLock ? snapToScale(root, scale, pitch) : pitch;
        notes.push({ pitch: outPitch, startBeat: beat, durationBeats: Math.min(dur, totalBeats - beat), velocity: 100 });
      }
      beat += dur;

      // advance the chain (order-k stateKey = last k tokens)
      const k = MODEL.order || 1;
      const stateKey = history.slice(-k).join(',');
      const dist = MODEL.trans[stateKey] || MODEL.trans[history[history.length - 1]] || MODEL.start;
      const next = sample(dist, p.temperature, rand) || '0:0';
      history.push(next);
    }
    return notes;
  },
};
