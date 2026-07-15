// Export voices as Standard MIDI Files with rich, regen-able filenames and the
// full patch embedded as a text meta event (so loading a file can restore it).
import { Midi } from '@tonejs/midi';
import { pitchName } from './music.js';
import { voiceLoopBeats } from './state.js';

const slug = (s) => String(s).replace(/[^\w.-]+/g, '-');

// short human-readable digest of a voice's main params (for the filename)
function digest(v) {
  const p = v.genParams[v.genId] || {};
  switch (v.genId) {
    case 'molecular': return `iA${p.intervalA}-iB${p.intervalB}-it${p.iterations}-${p.collision}`;
    case 'euclidean': return `p${p.pulses}-r${p.rotation}-${p.pitch}`;
    case 'arp': return `${p.chord}-${p.pattern}-${p.octaves}oct`;
    case 'herd': return `sz${p.size}-sd${p.seed}`;
    case 'mixed': return `${p.sourceA}x${p.sourceB}-${p.mode}`;
    default: return v.genId;
  }
}
function voiceTag(v) { return slug(`${v.genId}_${digest(v)}${v.mono ? '-mono' : ''}${v.octave ? `_o${v.octave}` : ''}_${v.length}bar`); }
function baseName(S, bpm) { return slug(`notes_${pitchName(S.root)}-${S.scale}_${bpm}bpm_${S.base}`); }

// full patch → JSON (superset needed to fully restore a session)
function patchMeta(voices, S, bpm, human) {
  return JSON.stringify({
    app: 'notes', ver: 2, bpm, shared: S, human,
    voices: voices.map((v) => ({ genId: v.genId, params: v.genParams[v.genId], instrument: v.instrument, mono: v.mono, octave: v.octave, length: v.length })),
  });
}

function buildMidi(voices, S, bpm, human) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const spb = 60 / bpm;
  voices.forEach((v, i) => {
    const t = midi.addTrack();
    t.name = voiceTag(v);
    t.channel = i;                                   // one channel per voice
    const loop = voiceLoopBeats(v);
    for (const n of v.notes) if (n.startBeat < loop) {   // each voice's own loop window
      t.addNote({ midi: n.pitch, time: n.startBeat * spb, duration: n.durationBeats * spb, velocity: n.velocity / 127 });
    }
  });
  if (!midi.header.meta) midi.header.meta = [];
  midi.header.meta.push({ ticks: 0, type: 'text', text: patchMeta(voices, S, bpm, human) });   // embedded patch
  return midi;
}

function download(midi, name) {
  const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// one voice, one track
export function exportVoice(v, S, bpm, human) {
  download(buildMidi([v], S, bpm, human), `${baseName(S, bpm)}_${voiceTag(v)}.mid`);
}
// all voices as a linked multitrack file (one channel/track each)
export function exportSet(voices, S, bpm, human) {
  download(buildMidi(voices, S, bpm, human), `${baseName(S, bpm)}_set-${voices.length}v.mid`);
}

export { buildMidi, patchMeta };   // for tests / future import-patch
