// Orchestrator: wires UI + state + audio + viz. State changes flow through
// dispatch() → regenerate → reschedule (per voice) → redraw.
import './styles.css';
import { state, regenerateAll, regenerateVoice, focusedVoice, makeVoice, MAX_VOICES,
         audibleVoices, voiceLoopBeats, totalBeats } from './state.js';
import { renderTheory, renderFeel, renderGenSelect, renderGenParams, renderVoiceStrip, renderVoiceControls } from './ui.js';
import * as audio from './audio.js';
import * as midiout from './midiout.js';
import { downloadMidi } from './export.js';
import { initViz, resize, draw } from './viz.js';
import { initEditor } from './editor.js';
import { shuffleColors } from './sprites.js';
import { getGenerator } from './generators/index.js';
import { pitchName } from './music.js';

const $ = (id) => document.getElementById(id);
let seedCounter = 1;

// audible voices → the audio scheduling plan (one Part per voice)
const audioPlan = () => audibleVoices().map((v) => ({ id: v.id, name: v.instrument, notes: v.notes, loopBeats: voiceLoopBeats(v) }));
// P1 MIDI-out: merge audible voices onto one channel (P4 = per-channel)
const midiNotes = () => audibleVoices().flatMap((v) => v.notes.filter((n) => n.startBeat < totalBeats()));
const transportCfg = () => ({ bpm: state.bpm, totalBeats: totalBeats() });

function refreshReadout() {
  const S = state.shared;
  const lines = state.voices.map((v, i) => {
    const g = getGenerator(v.genId);
    const cur = i === state.focused ? '▸' : ' ';
    const flags = `${v.mute ? 'M' : '-'}${v.solo ? 'S' : '-'}`;
    return `${cur} V${i + 1} ${flags} ${g.label.padEnd(16)} ${v.notes.length}n`;
  });
  $('readout').textContent =
`KEY ${pitchName(S.root)} ${S.scale}  ${S.meter}/4  ${totalBeats()}bt @ ${state.bpm}bpm\n${lines.join('\n')}`;
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
  if (audio.isPlaying() && midiout.isEnabled()) midiout.reschedule(midiNotes(), transportCfg());
  refreshReadout();
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
function renderEnginePanel() {
  renderVoiceControls($('voice-controls'), focusedVoice(), dispatch);
  renderGenSelect($('gen-select'), state, dispatch);
  renderGenParams($('gen-controls'), state, dispatch);
}
function syncFocusUI() { renderStrip(); renderEnginePanel(); $('inst').value = focusedVoice().instrument; }

function addVoice() {
  if (state.voices.length >= MAX_VOICES) return;
  const v = makeVoice(focusedVoice().genId, { colorIdx: state.voices.length });
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
      if (audio.isPlaying() && midiout.isEnabled()) midiout.reschedule(midiNotes(), transportCfg());
      refreshReadout(); return;
    case 'switch': renderEnginePanel(); applyVoice({ shuffle: true }); return;
    case 'regen-all': applyAll(); return;                        // global theory / feel
    case 'regen-voice': applyVoice(); return;                    // focused voice param / voice control
    case 'focus': syncFocusUI(); refreshReadout(); redraw(); return;   // no regen
    case 'voice-mix': renderStrip(); refresh(); return;          // mute/solo → reschedule, no regen
    case 'voice-add': addVoice(); return;
    case 'voice-remove': removeVoice(); return;
    case 'instrument': audio.setInstrument(focusedVoice().id, focusedVoice().instrument); return;
    default: applyAll();
  }
}

async function onPlay() {
  await audio.unlock();
  if (!audio.isPlaying()) {
    audio.play(audioPlan(), state.bpm);
    if (midiout.isEnabled()) midiout.startLoop(midiNotes(), transportCfg());
  }
}
function onStop() { audio.stop(); midiout.stopLoop(); redraw(); }
async function togglePlay() { if (audio.isPlaying()) onStop(); else await onPlay(); }

function init() {
  const canvas = $('viz');
  initViz(canvas);
  initEditor(canvas, state, refresh);

  // editor toolbar
  const setTool = (t) => {
    state.tool = t;
    document.querySelectorAll('#edit-tools .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    canvas.style.cursor = t === 'off' ? 'default' : t === 'erase' ? 'not-allowed' : 'crosshair';
  };
  document.querySelectorAll('#edit-tools .tool').forEach((b) => b.addEventListener('click', () => setTool(state.tool === b.dataset.tool ? 'off' : b.dataset.tool)));
  $('snap').addEventListener('change', (e) => { state.editSnap = parseFloat(e.target.value); });
  $('clear').addEventListener('click', () => { focusedVoice().notes = []; refresh(); });

  renderTheory($('tab-theory'), state, dispatch);
  renderFeel($('tab-feel'), state, dispatch);
  renderStrip();
  renderEnginePanel();

  // tab switching
  const panes = { theory: $('tab-theory'), engine: $('tab-engine'), feel: $('tab-feel') };
  document.querySelectorAll('#tabbar .tab').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#tabbar .tab').forEach((x) => x.classList.toggle('active', x === b));
    for (const [name, el] of Object.entries(panes)) el.hidden = name !== b.dataset.tab;
  }));

  const inst = $('inst');
  for (const name of audio.INSTRUMENTS) inst.append(Object.assign(document.createElement('option'), { value: name, textContent: name }));
  inst.value = state.instrument;
  inst.addEventListener('change', () => { focusedVoice().instrument = inst.value; dispatch('instrument'); });

  setupMidiOut();

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
  $('export').addEventListener('click', () => {
    const v = focusedVoice();
    downloadMidi(v.notes.filter((n) => n.startBeat < totalBeats()), { bpm: state.bpm, name: `notes-${v.genId}` });
  });

  shuffleColors(1);
  regenerateAll();
  refreshReadout();
  redraw();

  setInterval(() => { if (audio.isPlaying()) redraw(); }, 110);
  new ResizeObserver(() => { resize(); redraw(); }).observe(canvas);
  window.addEventListener('resize', () => { resize(); redraw(); });
}

// General MIDI instruments for program-change on the external path
const GM = [['grand piano', 0], ['rhodes', 4], ['music box', 10], ['vibraphone', 11], ['nylon guitar', 24], ['fingered bass', 33], ['synth bass', 38], ['strings', 48], ['brass', 61], ['square lead', 80], ['saw lead', 81], ['warm pad', 88]];

async function setupMidiOut() {
  const sel = $('midiout');
  if (!midiout.SUPPORTED) { sel.innerHTML = '<option>— web midi unsupported —</option>'; sel.disabled = true; return; }
  const gm = Object.assign(document.createElement('select'), { id: 'gmprog', title: 'GM program (external instrument)' });
  for (const [name, prog] of GM) gm.append(Object.assign(document.createElement('option'), { value: prog, textContent: name }));
  gm.addEventListener('change', () => { if (midiout.isEnabled()) midiout.programChange(parseInt(gm.value, 10)); });
  const gmLabel = Object.assign(document.createElement('label'), { textContent: 'GM ' });
  gmLabel.append(gm);
  sel.closest('.selrow').append(gmLabel);

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
      midiout.selectOutput(sel.value);
      if (midiout.isEnabled()) {
        midiout.programChange(parseInt(gm.value, 10));
        if (audio.isPlaying()) midiout.startLoop(midiNotes(), transportCfg());
      }
    });
  } catch (e) {
    sel.innerHTML = '<option>— midi access denied —</option>'; sel.disabled = true;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
