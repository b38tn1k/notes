// Orchestrator: wires UI + state + audio + viz. State changes flow through
// dispatch() → regenerate → reschedule (per voice) → redraw.
import './styles.css';
import { state, regenerateAll, regenerateVoice, focusedVoice, makeVoice, MAX_VOICES, PALETTE,
         audibleVoices, voiceLoopBeats, totalBeats } from './state.js';
import { renderHarmony, renderTime, renderFeelTray, renderVoiceStrip, renderChannelStrip, renderMidiVoices } from './ui.js';
import * as audio from './audio.js';
import * as midiout from './midiout.js';
import { exportVoice, exportEach } from './export.js';
import { initViz, resize, draw } from './viz.js';
import { initEditor } from './editor.js';
import { shuffleColors } from './sprites.js';
import { registry, getGenerator } from './generators/index.js';
import { SCALE_NAMES, BASE_NAMES } from './music.js';

const $ = (id) => document.getElementById(id);

// General MIDI programs for per-voice external routing (shown in the MIDI tray)
const GM = [['grand piano', 0], ['rhodes', 4], ['music box', 10], ['vibraphone', 11], ['nylon guitar', 24], ['fingered bass', 33], ['synth bass', 38], ['strings', 48], ['brass', 61], ['square lead', 80], ['saw lead', 81], ['warm pad', 88]];

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
  $('export-count').textContent = `×${state.voices.length}`;
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

function applyAll() { regenerateAll(); refresh(); }                          // regen every voice
function applyVoice() { regenerateVoice(focusedVoice()); refresh(); }        // regen only the focused voice

const renderStrip = () => renderVoiceStrip($('voicestrip'), state, dispatch);
const renderChannel = () => renderChannelStrip($('channel-strip'), focusedVoice(), state, dispatch, { instruments: audio.INSTRUMENTS });
const renderMidi = () => renderMidiVoices($('midi-voices'), state, { gm: GM, onProg: (v) => { if (midiout.isEnabled()) midiout.programChange(v.gm, v.colorIdx); } });
function syncFocusUI() {
  renderStrip();
  renderChannel();
  renderMidi();
  document.documentElement.style.setProperty('--vcf', PALETTE[focusedVoice().colorIdx % PALETTE.length]);   // tint the per-voice rails
  $('edit-label').textContent = `EDIT V${state.focused + 1}`;
}

// generic disclosure toggle: flip a tray + swap the arrow glyph in its button label
function toggleTray(btn, trayId, label) {
  const tray = $(trayId);
  tray.hidden = !tray.hidden;
  btn.textContent = `${label} ${tray.hidden ? '▸' : '▾'}`;
}
const onFeel = (btn) => toggleTray(btn, 'feel-tray', 'FEEL');

// re-render the global top-rail clusters + trays (used at init and after a dice roll)
function renderGlobals() {
  renderHarmony($('top-globals'), state, dispatch, onFeel);
  renderTime($('top-time'), state, dispatch);
  renderFeelTray($('feel-tray'), state, dispatch);
}

// ---- dice: shuffle everything into a fresh idea ----
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const biasLow = (n) => Math.min(n, Math.floor(Math.pow(Math.random(), 2.2) * (n + 1)));   // skew toward the low end of 0..n

function randomizeParams(P, gen) {
  for (const s of gen.params) {
    if (s.type === 'range') {
      const n = Math.round((s.max - s.min) / s.step);
      const idx = s.key === 'iterations' ? biasLow(n) : randInt(0, n);   // iterations gets busy at the top — keep it modest
      P[s.key] = +(s.min + s.step * idx).toFixed(4);
    }
    else if (s.type === 'steps') P[s.key] = pick(s.values);
    else if (s.type === 'select') P[s.key] = pick(s.options);
    else if (s.type === 'toggle') P[s.key] = Math.random() < 0.5;
  }
}
function randomizeVoice(v, genId) {
  v.genId = genId;
  v.length = pick([1, 2, 4, 8]);
  v.octave = randInt(-2, 2);
  v.mono = Math.random() < 0.4;
  randomizeParams(v.genParams[v.genId], getGenerator(v.genId));
}

// engine picker: every non-arp engine appears at most once per roll (no euclid×euclid);
// arp may repeat (two arps in different registers is musical).
const REPEATABLE = new Set(['arp']);
function makeEnginePicker() {
  const engines = registry.filter((g) => g.id !== 'mixed').map((g) => g.id);
  const usedOnce = new Set();
  return () => {
    const avail = engines.filter((id) => REPEATABLE.has(id) || !usedOnce.has(id));
    const id = pick(avail.length ? avail : engines);
    if (!REPEATABLE.has(id)) usedOnce.add(id);
    return id;
  };
}

function randomizeAll() {
  const S = state.shared;
  S.root = randInt(45, 57);
  S.scale = pick(SCALE_NAMES);
  S.meter = randInt(3, 5);
  S.base = pick(BASE_NAMES);
  state.bpm = randInt(72, 140);
  for (const v of state.voices) audio.disposeVoice(v.id);        // free old Tone nodes
  state.voices = [];
  const n = randInt(1, MAX_VOICES);
  const insts = shuffle(audio.INSTRUMENTS);                       // distinct instrument per voice (6 available, ≤4 voices)
  const nextEngine = makeEnginePicker();
  for (let i = 0; i < n; i++) {
    const v = makeVoice('molecular', { colorIdx: i });
    randomizeVoice(v, nextEngine());
    v.instrument = insts[i % insts.length];
    state.voices.push(v);
  }
  state.focused = 0;
  audio.setBpm(state.bpm);
  regenerateAll();
  renderGlobals();
  syncFocusUI();
  refresh();
}

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
    case 'switch': renderChannel(); applyVoice(); return;   // generator changed → re-render its params
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

// Surface "audio is blocked/suspended" on the PLAY button (dashed = tap to enable).
// The device can't tell us it's muted or turned down, but it CAN tell us the context
// is suspended/interrupted (autoplay gate, iOS backgrounding, a phone call) — reflect that.
function reflectAudio() {
  const b = $('play');
  if (!b) return;
  const off = audio.isSuspended();
  b.classList.toggle('sound-off', off);
  b.title = off ? 'tap to enable sound' : '';
}

async function onPlay() {
  await audio.unlock();
  reflectAudio();
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

  renderGlobals();
  renderStrip();
  syncFocusUI();

  setupMidiOut();
  $('midi-toggle').addEventListener('click', () => toggleTray($('midi-toggle'), 'midi-tray', 'MIDI'));

  // mobile tab bar: show one panel at a time (CSS keys off body[data-mtab]; desktop ignores it)
  const mtabs = [...document.querySelectorAll('#mobile-tabs button')];
  const setMtab = (t) => {
    document.body.dataset.mtab = t;
    mtabs.forEach((b) => b.classList.toggle('active', b.dataset.mtab === t));
    if (t === 'roll') { resize(); redraw(); }   // canvas was display:none — re-measure it
  };
  mtabs.forEach((b) => b.addEventListener('click', () => setMtab(b.dataset.mtab)));
  setMtab('transport');

  const aboutModal = $('about-modal');
  const openAbout = () => { aboutModal.hidden = false; };
  $('about-tab').addEventListener('click', openAbout);       // desktop corner button
  $('about-open').addEventListener('click', openAbout);      // mobile TRANSPORT tab button
  $('about-close').addEventListener('click', () => { aboutModal.hidden = true; });
  aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.hidden = true; });

  $('play').addEventListener('click', onPlay);
  $('stop').addEventListener('click', onStop);
  // mobile/iOS gate the AudioContext until a user gesture. onPlay unlocks it too, but
  // warm it on the FIRST tap/key anywhere so playback is instant and never depends on
  // one code path (a stray await, etc.). once:true — fires a single time then detaches.
  const warmAudio = () => audio.unlock().then(reflectAudio);
  window.addEventListener('pointerdown', warmAudio, { once: true });
  window.addEventListener('keydown', warmAudio, { once: true });
  audio.onAudioStateChange(reflectAudio);                       // context suspend/resume (iOS backgrounding, call interruptions)
  document.addEventListener('visibilitychange', reflectAudio);  // returning to the tab may leave it suspended
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault(); togglePlay();
  });
  $('regen').addEventListener('click', () => applyAll());
  $('dice').addEventListener('click', randomizeAll);
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
