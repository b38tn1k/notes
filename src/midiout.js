// Web MIDI output. Sends each voice to a connected device on ITS OWN timed loop
// and MIDI channel (parallel to the internal Tone.js audio), with a per-voice GM
// program. The device (port) is global — one output — but voices no longer merge:
// V1→ch0, V2→ch1, … each phasing on its own loop length.
let access = null;
let out = null;
let running = false;
const timers = new Map();   // voiceId -> setTimeout handle

export const SUPPORTED = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;

export async function init() {
  if (!SUPPORTED) return null;
  access = await navigator.requestMIDIAccess({ sysex: false });
  return outputs();
}

export function outputs() {
  return access ? [...access.outputs.values()].map((o) => ({ id: o.id, name: o.name })) : [];
}

export function selectOutput(id) {
  stopLoop();
  out = id && access ? access.outputs.get(id) : null;
}

export function isEnabled() { return !!out; }

export function programChange(prog, ch = 0) {
  if (out) out.send([0xC0 | (ch & 0x0f), prog & 0x7f]);
}

const clampP = (p) => Math.max(0, Math.min(127, Math.round(p)));
const clampV = (v) => Math.max(1, Math.min(127, Math.round(v)));

// one voice = { id, notes, loopBeats, channel, program }. Schedule its own looping timer.
function scheduleVoice(v, bpm) {
  const spb = 60000 / bpm;                 // ms per beat
  const loopMs = Math.max(1, v.loopBeats * spb);
  const ch = v.channel & 0x0f;
  const fire = () => {
    if (!out) return;
    const t0 = performance.now();
    for (const n of v.notes) {
      out.send([0x90 | ch, clampP(n.pitch), clampV(n.velocity)], t0 + n.startBeat * spb);
      out.send([0x80 | ch, clampP(n.pitch), 0], t0 + (n.startBeat + n.durationBeats) * spb);
    }
    timers.set(v.id, setTimeout(fire, loopMs));
  };
  fire();
}

// plan = [{id, notes, loopBeats, channel, program}]. Sets each voice's GM program, then loops it.
export function startLoop(plan, { bpm }) {
  running = true;
  stopTimers();
  if (!out) return;
  for (const v of plan) { programChange(v.program || 0, v.channel); scheduleVoice(v, bpm); }
}

export function reschedule(plan, cfg) { if (out && running) startLoop(plan, cfg); }

export function stopLoop() { running = false; stopTimers(); allNotesOff(); }

function stopTimers() { for (const t of timers.values()) clearTimeout(t); timers.clear(); }
function allNotesOff() { if (out) for (let ch = 0; ch < 16; ch++) out.send([0xB0 | ch, 123, 0]); }
