// Playback via Tone.js. Note times are scheduled in musical units (quarter
// notes) so a BPM change follows automatically without rescheduling.
import * as Tone from 'tone';

export const INSTRUMENTS = ['fm', 'am', 'synth', 'pluck', 'membrane', 'metal'];

let inst = null;
let part = null;
let currentName = 'fm';

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

function ensureInst() { if (!inst) inst = makeInst(currentName); }

export function setInstrument(name) {
  currentName = name;
  if (inst) { try { inst.dispose(); } catch { /* noop */ } }
  inst = makeInst(name);
}

export async function unlock() { await Tone.start(); }        // must be in a user gesture

export function setBpm(bpm) { Tone.Transport.bpm.value = bpm; }

function trigger(time, n) {
  ensureInst();
  const freq = Tone.Frequency(n.pitch, 'midi').toFrequency();
  try {
    inst.triggerAttackRelease(freq, { '4n': n.durationBeats }, time, n.velocity / 127);
  } catch { /* mono synths occasionally reject overlaps; fine */ }
}

export function schedule(notes, tb) {
  if (part) { part.dispose(); part = null; }
  const events = notes.map((n) => ({ time: { '4n': n.startBeat }, note: n }));
  part = new Tone.Part((time, ev) => trigger(time, ev.note), events);
  part.loop = true;
  part.loopEnd = { '4n': tb };
  part.start(0);
}

export function play(notes, { bpm, totalBeats }) {
  Tone.Transport.bpm.value = bpm;
  schedule(notes, totalBeats);
  Tone.Transport.start();
}

// re-schedule notes while playing (called after regen / grid changes)
export function reschedule(notes, tb) {
  if (isPlaying()) schedule(notes, tb);
}

export function stop() {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  if (part) { part.dispose(); part = null; }
}

export function isPlaying() { return Tone.Transport.state === 'started'; }
export function transportSeconds() { return Tone.Transport.seconds; }
