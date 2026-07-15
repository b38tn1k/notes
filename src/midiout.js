// Web MIDI output. Sends the loop to a connected device on its own timed loop
// (parallel to the internal Tone.js audio). Program-change gives GM instrument
// selection on the external path.
let access = null;
let out = null;
let loopTimer = null;

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

export function startLoop(notes, { bpm, totalBeats }, ch = 0) {
  stopTimerOnly();
  if (!out) return;
  const spb = 60000 / bpm;            // ms per beat
  const loopMs = totalBeats * spb;
  const fire = () => {
    if (!out) return;
    const t0 = performance.now();
    for (const n of notes) {
      out.send([0x90 | (ch & 0x0f), clampP(n.pitch), clampV(n.velocity)], t0 + n.startBeat * spb);
      out.send([0x80 | (ch & 0x0f), clampP(n.pitch), 0], t0 + (n.startBeat + n.durationBeats) * spb);
    }
    loopTimer = setTimeout(fire, loopMs);
  };
  fire();
}

export function reschedule(notes, cfg, ch = 0) {
  if (out && loopTimer) startLoop(notes, cfg, ch);
}

export function stopLoop() { stopTimerOnly(); allNotesOff(); }

function stopTimerOnly() { if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; } }
function allNotesOff() { if (out) for (let ch = 0; ch < 16; ch++) out.send([0xB0 | ch, 123, 0]); }
