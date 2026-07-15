// Orchestrator: wires UI + state + audio + viz. State changes flow through
// dispatch() into regenerate -> reschedule -> redraw.
import './styles.css';
import { state, regenerate, totalBeats } from './state.js';
import { renderShared, renderGenSelect, renderGenParams } from './ui.js';
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

function refreshReadout() {
  const g = getGenerator(state.genId);
  const S = state.shared;
  const lenLine = S.lockLength
    ? `${S.loopLength} bars x ${S.meter} bpb = ${totalBeats()} beats`
    : `loop ${S.loopLength}bars / seq ${S.seqLength}bars @ ${S.meter}bpb`;
  $('readout').textContent =
`> ENGINE  ${g.label}
> KEY     ${pitchName(S.root)} ${S.scale}
> LENGTH  ${lenLine} @ ${state.bpm}bpm
> NOTES   ${state.notes.length}   LOOP ${totalBeats()} beats`;
}

function playBeat() {
  if (!audio.isPlaying()) return -1;
  const spb = 60 / state.bpm;
  const loopSec = totalBeats() * spb;
  return (audio.transportSeconds() % loopSec) / spb;   // continuous; 8fps tick makes it choppy
}

function redraw() { draw(state, playBeat()); }

// refresh after a manual edit — like apply() but WITHOUT regenerating (keeps edits)
function refreshEdited() {
  audio.reschedule(state.notes, totalBeats());
  if (audio.isPlaying() && midiout.isEnabled()) midiout.reschedule(state.notes, transportCfg());
  refreshReadout();
  redraw();
}

function transportCfg() { return { bpm: state.bpm, totalBeats: totalBeats() }; }

function apply({ shuffle = false } = {}) {
  if (shuffle) { seedCounter++; shuffleColors(seedCounter); }
  regenerate();
  audio.reschedule(state.notes, totalBeats());
  if (audio.isPlaying() && midiout.isEnabled()) midiout.reschedule(state.notes, transportCfg());
  refreshReadout();
  redraw();
}

function dispatch(kind) {
  if (kind === 'bpm') {
    audio.setBpm(state.bpm);
    if (audio.isPlaying() && midiout.isEnabled()) midiout.reschedule(state.notes, transportCfg());
    refreshReadout();
    return;
  }
  if (kind === 'switch') { renderGenParams($('gen-controls'), state, dispatch); apply({ shuffle: true }); return; }
  apply();                                    // 'regen' from a slider — colors stay put
}

async function onPlay() {
  await audio.unlock();
  if (!audio.isPlaying()) {
    audio.setInstrument(state.instrument);
    audio.play(state.notes, transportCfg());
    if (midiout.isEnabled()) midiout.startLoop(state.notes, transportCfg());
  }
}

function onStop() { audio.stop(); midiout.stopLoop(); redraw(); }

async function togglePlay() { if (audio.isPlaying()) onStop(); else await onPlay(); }

function init() {
  const canvas = $('viz');
  initViz(canvas);
  initEditor(canvas, state, refreshEdited);

  // editor toolbar
  const setTool = (t) => {
    state.tool = t;
    document.querySelectorAll('#edit-tools .tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    canvas.style.cursor = t === 'off' ? 'default' : t === 'erase' ? 'not-allowed' : 'crosshair';
  };
  // draw/erase toggle: clicking the active tool turns editing off (normal operation)
  document.querySelectorAll('#edit-tools .tool').forEach((b) => b.addEventListener('click', () => setTool(state.tool === b.dataset.tool ? 'off' : b.dataset.tool)));
  $('snap').addEventListener('change', (e) => { state.editSnap = parseFloat(e.target.value); });
  $('clear').addEventListener('click', () => { state.notes = []; refreshEdited(); });

  renderShared($('shared-controls'), state, dispatch);
  renderGenSelect($('gen-select'), state, dispatch);
  renderGenParams($('gen-controls'), state, dispatch);

  const inst = $('inst');
  for (const name of audio.INSTRUMENTS) inst.append(Object.assign(document.createElement('option'), { value: name, textContent: name }));
  inst.value = state.instrument;
  inst.addEventListener('change', () => { state.instrument = inst.value; audio.setInstrument(inst.value); });

  setupMidiOut();

  const aboutModal = $('about-modal');
  $('about-tab').addEventListener('click', () => { aboutModal.hidden = false; });
  $('about-close').addEventListener('click', () => { aboutModal.hidden = true; });
  aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.hidden = true; });

  $('play').addEventListener('click', onPlay);
  $('stop').addEventListener('click', onStop);

  // spacebar toggles play/stop (but not while a form control is focused)
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault();
    togglePlay();
  });
  $('regen').addEventListener('click', () => apply({ shuffle: true }));
  $('export').addEventListener('click', () => {
    const loopNotes = state.notes.filter((n) => n.startBeat < totalBeats());   // export the loop window
    downloadMidi(loopNotes, { bpm: state.bpm, name: `notes-${state.genId}` });
  });

  // initial loop
  shuffleColors(1);
  regenerate();
  refreshReadout();
  redraw();

  // choppy ~8-9fps redraw while playing (the jank is the point)
  setInterval(() => { if (audio.isPlaying()) redraw(); }, 110);

  // responsive canvas
  new ResizeObserver(() => { resize(); redraw(); }).observe(canvas);
  window.addEventListener('resize', () => { resize(); redraw(); });
}

// General MIDI instruments for program-change on the external path
const GM = [['grand piano', 0], ['rhodes', 4], ['music box', 10], ['vibraphone', 11], ['nylon guitar', 24], ['fingered bass', 33], ['synth bass', 38], ['strings', 48], ['brass', 61], ['square lead', 80], ['saw lead', 81], ['warm pad', 88]];

async function setupMidiOut() {
  const sel = $('midiout');
  if (!midiout.SUPPORTED) {
    sel.innerHTML = '<option>— web midi unsupported —</option>';
    sel.disabled = true;
    return;
  }
  // GM program select, injected next to the device select
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
        if (audio.isPlaying()) midiout.startLoop(state.notes, transportCfg());
      }
    });
  } catch (e) {
    sel.innerHTML = '<option>— midi access denied —</option>';
    sel.disabled = true;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
