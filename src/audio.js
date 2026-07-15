// Playback via Tone.js. One instrument + one Tone.Part PER VOICE, all sharing the
// single Tone.Transport (so tempo/timing stay unified) — each Part loops at its
// own length so different-length voices phase. Note times are in quarter-note
// units so a BPM change follows without rescheduling.
import * as Tone from 'tone';

export const INSTRUMENTS = ['fm', 'am', 'synth', 'pluck', 'membrane', 'metal'];

const voices = new Map();   // voiceId -> { inst, part, name }

function makeInst(name) {
  switch (name) {
    case 'am': return new Tone.PolySynth(Tone.AMSynth).toDestination();
    case 'synth': return new Tone.PolySynth(Tone.Synth).toDestination();
    case 'pluck': return new Tone.PluckSynth().toDestination();
    case 'membrane': return new Tone.MembraneSynth().toDestination();
    case 'metal': return new Tone.MetalSynth().toDestination();
    case 'fm':
    default: return new Tone.PolySynth(Tone.FMSynth).toDestination();
  }
}

function ensure(id, name) {
  let v = voices.get(id);
  if (!v) { v = { inst: makeInst(name), part: null, name }; voices.set(id, v); }
  else if (v.name !== name) { try { v.inst.dispose(); } catch { /* noop */ } v.inst = makeInst(name); v.name = name; }
  return v;
}

function trigger(inst, time, n) {
  const freq = Tone.Frequency(n.pitch, 'midi').toFrequency();
  try { inst.triggerAttackRelease(freq, { '4n': n.durationBeats }, time, n.velocity / 127); } catch { /* mono synths reject overlaps */ }
}

function scheduleVoice(p) {                       // p = { id, name, notes, loopBeats }
  const v = ensure(p.id, p.name);
  if (v.part) { v.part.dispose(); v.part = null; }
  const events = p.notes.map((n) => ({ time: { '4n': n.startBeat }, note: n }));
  v.part = new Tone.Part((time, ev) => trigger(v.inst, time, ev.note), events);   // reads v.inst live (instrument swap = no reschedule)
  v.part.loop = true;
  v.part.loopEnd = { '4n': p.loopBeats };
  v.part.start(0);
}

// plan = array of audible voices' { id, name, notes, loopBeats }. Drops parts for voices not in the plan (muted/soloed-out/removed).
export function scheduleAll(plan) {
  const keep = new Set(plan.map((p) => p.id));
  for (const [id, v] of voices) if (!keep.has(id) && v.part) { v.part.dispose(); v.part = null; }
  for (const p of plan) scheduleVoice(p);
}

export function play(plan, bpm) { Tone.Transport.bpm.value = bpm; scheduleAll(plan); Tone.Transport.start(); }
export function reschedule(plan) { if (isPlaying()) scheduleAll(plan); }

export function setInstrument(id, name) { ensure(id, name); }   // swaps live; running part picks it up

export function disposeVoice(id) {
  const v = voices.get(id); if (!v) return;
  if (v.part) v.part.dispose();
  try { v.inst.dispose(); } catch { /* noop */ }
  voices.delete(id);
}

export function stop() {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  for (const v of voices.values()) if (v.part) { v.part.dispose(); v.part = null; }
}

export async function unlock() { await Tone.start(); }        // must be in a user gesture
export function setBpm(bpm) { Tone.Transport.bpm.value = bpm; }
export function isPlaying() { return Tone.Transport.state === 'started'; }
export function transportSeconds() { return Tone.Transport.seconds; }
