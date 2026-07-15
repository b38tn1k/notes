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

// trackVoices → the tracks written; patchVoices → the patch embedded (default = the
// tracks). Per-voice files pass the FULL set as patchVoices so any one file restores all.
function buildMidi(trackVoices, S, bpm, human, patchVoices = trackVoices) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const spb = 60 / bpm;
  trackVoices.forEach((v, i) => {
    const t = midi.addTrack();
    t.name = voiceTag(v);
    // no forced channel — keep exported files channel-agnostic so they drag cleanly into any DAW/sequencer
    const loop = voiceLoopBeats(v);
    for (const n of v.notes) if (n.startBeat < loop) {   // each voice's own loop window
      t.addNote({ midi: n.pitch, time: n.startBeat * spb, duration: n.durationBeats * spb, velocity: n.velocity / 127 });
    }
  });
  if (!midi.header.meta) midi.header.meta = [];
  midi.header.meta.push({ ticks: 0, type: 'text', text: patchMeta(patchVoices, S, bpm, human) });   // embedded patch
  return midi;
}

function download(midi, name) {
  const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // defer revoke so downloads commit (matters for multi-file)
}

// one voice, one file. `all` (if given) is embedded so the single file still restores the whole set.
export function exportVoice(v, S, bpm, human, all) {
  download(buildMidi([v], S, bpm, human, all || [v]), `${baseName(S, bpm)}_${voiceTag(v)}.mid`);
}
// one file PER voice (multiple downloads) — separate but linked (shared base name + full-set patch in each)
export function exportEach(voices, S, bpm, human) {
  const base = baseName(S, bpm);
  voices.forEach((v, i) => {
    const midi = buildMidi([v], S, bpm, human, voices);
    setTimeout(() => download(midi, `${base}_v${i + 1}-${voiceTag(v)}.mid`), i * 200);   // stagger; browsers drop rapid back-to-back downloads
  });
}

export { buildMidi, patchMeta };   // for tests / future import-patch
