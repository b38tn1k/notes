// Music theory core. Faithful port of scales.py's next_step, plus the
// humanization the 2015 code was "too lazy" to write.

// The modes (dorian/phrygian/…) are just the major scale started on a different
// degree — you already get them via root + major. Kept the list to the ones
// worth a dedicated button.
export const SCALES = {
  minor:     [0, 2, 3, 5, 7, 8, 10],   // natural minor (heritage default)
  major:     [0, 2, 4, 5, 7, 9, 11],
  pentMinor: [0, 3, 5, 7, 10],
  pentMajor: [0, 2, 4, 7, 9],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const SCALE_NAMES = Object.keys(SCALES);

// Base step: the sequencing grid resolution in beats (1 beat = a quarter note).
// T = triplet. Shared across engines, set in THEORY.
export const BASES = { '1/4': 1, '1/8': 1 / 2, '1/8T': 1 / 3, '1/16': 1 / 4, '1/16T': 1 / 6 };
export const BASE_NAMES = Object.keys(BASES);
export function baseBeats(name) { return BASES[name] ?? 1; }

// scales.py:37 next_step — step UP to the next diatonic degree; when we climb
// past root+24, drop two octaves and keep going. Always ascending, always in key.
export function makeScaleWalker(root, scaleName) {
  const degs = SCALES[scaleName] || SCALES.minor;
  const SPAN = 24;
  const inScale = (p) => degs.includes(((p - root) % 12 + 12) % 12);
  return (pitch) => {
    let n = pitch + 1;
    while (!inScale(n)) n++;
    if (n > root + SPAN) n -= SPAN;
    return n;
  };
}

// Nearest in-scale pitch at/above p (used by generators that quantize to scale).
export function snapToScale(root, scaleName, p) {
  const degs = SCALES[scaleName] || SCALES.minor;
  const inScale = (x) => degs.includes(((x - root) % 12 + 12) % 12);
  let n = Math.round(p);
  for (let d = 0; d < 12; d++) { if (inScale(n + d)) return n + d; if (inScale(n - d)) return n - d; }
  return n;
}

// Absolute pitch for a scale-degree index (0 = root, can go negative / past an octave).
export function degreeToPitch(root, scaleName, degreeIndex) {
  const degs = SCALES[scaleName] || SCALES.minor;
  const n = degs.length;
  const octave = Math.floor(degreeIndex / n);
  const step = ((degreeIndex % n) + n) % n;
  return root + octave * 12 + degs[step];
}

// The headline upgrade over 2015: velocity jitter + swing, applied AFTER
// generation so every generator's core stays pure.
export function humanize(notes, { swing = 0, velVar = 0, strum = 0 } = {}) {
  if (!swing && !velVar && !strum) return notes;
  const out = notes.map((n) => ({ ...n }));
  if (strum) applyStrum(out, strum);
  return out.map((n) => {
    // push notes that land on an off-eighth later, up to swing/2 of a beat
    const eighth = Math.round(n.startBeat * 2);
    const onOff = swing && eighth % 2 === 1 ? swing * 0.5 : 0;
    const jitter = velVar ? Math.round(seededSign(n.startBeat + n.pitch) * Math.random() * velVar) : 0;
    return { ...n, startBeat: Math.max(0, n.startBeat + onOff), velocity: clampVel(n.velocity + jitter) };
  });
}

// Strum: spread notes that land on the same beat across a short window, ordered
// by pitch. Positive = up-strum (low note leads); negative = down-strum (high leads).
function applyStrum(notes, amount) {
  const groups = new Map();
  for (const n of notes) {
    const k = Math.round(n.startBeat * 8) / 8;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(n);
  }
  const step = Math.abs(amount);
  const up = amount >= 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) => a.pitch - b.pitch);
    g.forEach((n, i) => { n.startBeat += (up ? i : g.length - 1 - i) * step; });
  }
}

// Fold a pitch by octaves into [floor, ceiling] — above the ceiling drops an
// octave, below the floor rises one. Applied globally after generation.
export function foldPitch(p, floor, ceiling) {
  let x = Math.round(p);
  if (ceiling > floor) {
    while (x > ceiling) x -= 12;
    while (x < floor) x += 12;
    if (x > ceiling) x = ceiling;   // range narrower than an octave: clamp
  }
  return Math.max(0, Math.min(127, x));
}

function clampVel(v) { return Math.max(1, Math.min(127, Math.round(v))); }
function seededSign(x) { return (Math.sin(x * 99.7) > 0 ? 1 : -1); }

// Tiny deterministic PRNG (mulberry32) so seeded generators reproduce.
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function pitchName(p) { return NOTE_NAMES[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1); }
