// Orchestrator: wires UI + state + audio + viz. State changes flow through
// dispatch() → regenerate → reschedule (per voice) → redraw.
import './styles.css';
import { state, regenerateAll, regenerateVoice, focusedVoice, makeVoice, MAX_VOICES, PALETTE,
         audibleVoices, voiceLoopBeats, totalBeats } from './state.js';
import { renderTopGlobals, renderTempo, renderMoreTray, renderVoiceStrip, renderChannelStrip } from './ui.js';
import * as audio from './audio.js';
import * as midiout from './midiout.js';
import { exportVoice, exportEach } from './export.js';
import { initViz, resize, draw } from './viz.js';
import { initEditor } from './editor.js';
import { shuffleColors } from './sprites.js';

const $ = (id) => document.getElementById(id);
let seedCounter = 1;

// audible voices → the audio scheduling plan (one Part per voice)
const audioPlan = () => audibleVoices().map((v) => ({ id: v.id, name: v.instrument, notes: v.notes, loopBeats: voiceLoopBeats(v) }));
// audible voices → the MIDI-out plan: each voice on its OWN channel + its own GM program.
// channel = colorIdx (a stable per-voice slot) so removing a voice never reshuffles the
// survivors onto channels a different voice just vacated.
const midiPlan = () => audibleVoices().map((v) => ({
  id: v.id,
  notes: v.notes.filter((n) => n.startBeat < voiceLoopBeats(v)),
  loopBeats: voiceLoopBeats(v),
  channel: v.colorIdx & 0x0f,
  program: v.gm | 0,
}));

// MIDI reschedule is a full stop-and-refire; coalesce rapid edits (slider/note drags fire
// ~60/s) so we don't machine-gun the external device. Audio (Tone) reschedule stays immediate.
let midiReschedTimer = null;
function midiResched() {
  if (!(audio.isPlaying() && midiout.isEnabled())) return;
  clearTimeout(midiReschedTimer);
  midiReschedTimer = setTimeout(() => midiout.reschedule(midiPlan(), { bpm: state.bpm }), 120);
}

// derived status: export button count + per-chip note badges
function refreshStatus() {
  $('export').textContent = `⭳ .MID ×${state.voices.length}`;
  const chips = document.querySelectorAll('#voicestrip .voicechip');
  state.voices.forEach((v, i) => { const b = chips[i] && chips[i].querySelector('.vbadge'); if (b) b.textContent = `${v.notes.length}n`; });
}

function playBeat() {
  if (!audio.isPlaying()) return -1;
  const spb = 60 / state.bpm;
  const loopSec = totalBeats() * spb;
  return (audio.transportSeconds() % loopSec) / spb;   // continuous; 8fps tick makes it choppy
}

function redraw() { draw(state, playBeat()); }

// reschedule audio + midi from current notes; no regen (used after edits + mix toggles)
function refresh() {
  audio.reschedule(audioPlan());
  midiResched();
  refreshStatus();
  redraw();
}

function applyAll({ shuffle = false } = {}) {
  if (shuffle) { seedCounter++; shuffleColors(seedCounter); }
  regenerateAll();
  refresh();
}
function applyVoice({ shuffle = false } = {}) {   // regen only the focused voice
  if (shuffle) { seedCounter++; shuffleColors(seedCounter); }
  regenerateVoice(focusedVoice());
  refresh();
}

const renderStrip = () => renderVoiceStrip($('voicestrip'), state, dispatch);
const renderChannel = () => renderChannelStrip($('channel-strip'), focusedVoice(), state, dispatch, { instruments: audio.INSTRUMENTS });
function syncFocusUI() {
  renderStrip();
  renderChannel();
  document.documentElement.style.setProperty('--vcf', PALETTE[focusedVoice().colorIdx % PALETTE.length]);   // tint the per-voice rails
  $('edit-label').textContent = `EDIT V${state.focused + 1}`;
}

// generic disclosure toggle: flip a tray + swap the arrow glyph in its button label
function toggleTray(btn, trayId, label) {
  const tray = $(trayId);
  tray.hidden = !tray.hidden;
  btn.textContent = `${label} ${tray.hidden ? '▸' : '▾'}`;
}
const onMore = (btn) => toggleTray(btn, 'more-tray', 'MORE');

function addVoice() {
  if (state.voices.length >= MAX_VOICES) return;
  const used = new Set(state.voices.map((v) => v.colorIdx));   // smallest free palette slot (MAX_VOICES === PALETTE.length → one always free)
  let ci = 0; while (used.has(ci)) ci++;
  const v = makeVoice(focusedVoice().genId, { colorIdx: ci });
  state.voices.push(v);
  state.focused = state.voices.length - 1;
  regenerateVoice(v);
  syncFocusUI(); refresh();
}
function removeVoice() {
  if (state.voices.length <= 1) return;
  const [rm] = state.voices.splice(state.focused, 1);
  audio.disposeVoice(rm.id);
  state.focused = Math.min(state.focused, state.voices.length - 1);
  syncFocusUI(); refresh();
}

function dispatch(kind) {
  switch (kind) {
    case 'bpm':
      audio.setBpm(state.bpm);
      midiResched();
      refreshStatus(); return;
    case 'switch': renderChannel(); applyVoice({ shuffle: true }); return;   // generator changed → re-render its params
    case 'regen-all': applyAll(); return;                        // global theory / feel
    case 'regen-voice': applyVoice(); return;                    // focused voice param / voice control
    case 'focus': syncFocusUI(); refreshStatus(); redraw(); return;   // no regen
    case 'voice-mix': renderStrip(); refresh(); return;          // mute/solo → reschedule, no regen
    case 'voice-add': addVoice(); return;
    case 'voice-remove': removeVoice(); return;
    case 'instrument': audio.setInstrument(focusedVoice().id, focusedVoice().instrument); return;
    case 'export-voice': exportVoice(focusedVoice(), state.shared, state.bpm, state.human, state.voices); return;
    default: applyAll();
  }
}

async function onPlay() {
  await audio.unlock();
  if (!audio.isPlaying()) {
    audio.play(audioPlan(), state.bpm);
    if (midiout.isEnabled()) midiout.startLoop(midiPlan(), { bpm: state.bpm });
  }
}
function onStop() { audio.stop(); midiout.stopLoop(); redraw(); }
async function togglePlay() { if (audio.isPlaying()) onStop(); else await onPlay(); }

function init() {
  const canvas = $('viz');
  initViz(canvas);
  initEditor(canvas, state, refresh);

  // editor toolbar (in its own dock under the canvas)
  const setTool = (t) => {
    state.tool = t;
    document.querySelectorAll('#edit-dock .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    canvas.style.cursor = t === 'off' ? 'default' : t === 'erase' ? 'not-allowed' : 'crosshair';
  };
  document.querySelectorAll('#edit-dock .tool').forEach((b) => b.addEventListener('click', () => setTool(state.tool === b.dataset.tool ? 'off' : b.dataset.tool)));
  $('snap').addEventListener('change', (e) => { state.editSnap = parseFloat(e.target.value); });
  $('clear').addEventListener('click', () => { focusedVoice().notes = []; refresh(); });

  renderTopGlobals($('top-globals'), state, dispatch, onMore);
  renderTempo($('tempo'), state, dispatch);
  renderMoreTray($('more-tray'), state, dispatch);
  renderStrip();
  syncFocusUI();

  setupMidiOut();
  $('midi-toggle').addEventListener('click', () => toggleTray($('midi-toggle'), 'midi-tray', 'MIDI'));

  const aboutModal = $('about-modal');
  $('about-tab').addEventListener('click', () => { aboutModal.hidden = false; });
  $('about-close').addEventListener('click', () => { aboutModal.hidden = true; });
  aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.hidden = true; });

  $('play').addEventListener('click', onPlay);
  $('stop').addEventListener('click', onStop);
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault(); togglePlay();
  });
  $('regen').addEventListener('click', () => applyAll({ shuffle: true }));
  $('export').addEventListener('click', () => exportEach(state.voices, state.shared, state.bpm, state.human));

  shuffleColors(1);
  regenerateAll();
  refreshStatus();
  redraw();

  setInterval(() => { if (audio.isPlaying()) redraw(); }, 110);
  new ResizeObserver(() => { resize(); redraw(); }).observe(canvas);
  window.addEventListener('resize', () => { resize(); redraw(); });
}

async function setupMidiOut() {
  const sel = $('midiout');
  if (!midiout.SUPPORTED) { sel.innerHTML = '<option>— web midi unsupported —</option>'; sel.disabled = true; return; }
  const fill = (devices) => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">— none —</option>';
    for (const d of devices) sel.append(Object.assign(document.createElement('option'), { value: d.id, textContent: d.name }));
    sel.value = cur;
  };
  try {
    const devices = await midiout.init();
    fill(devices || []);
    sel.addEventListener('change', () => {
      midiout.selectOutput(sel.value);   // one global device; per-voice channel + GM come from midiPlan()
      if (midiout.isEnabled() && audio.isPlaying()) midiout.startLoop(midiPlan(), { bpm: state.bpm });
    });
  } catch (e) {
    sel.innerHTML = '<option>— midi access denied —</option>'; sel.disabled = true;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
