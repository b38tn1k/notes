// Renders controls from declarative specs. Generators declare their params,
// so there is no per-generator UI code. Native inputs only.
import { SCALE_NAMES, BASE_NAMES, pitchName } from './music.js';
import { registry, getGenerator, defaultParams } from './generators/index.js';
import { MAX_VOICES, PALETTE } from './state.js';

function el(tag, props = {}) { return Object.assign(document.createElement(tag), props); }

// Voice strip: colour-coded V1..V4 chips — a big focus button with M/S stacked
// beside it — plus add/remove. Each chip carries its own colour via --vc.
export function renderVoiceStrip(container, state, dispatch) {
  container.innerHTML = '';
  state.voices.forEach((v, i) => {
    const chip = el('div', { className: 'voicechip' + (i === state.focused ? ' focused' : '') });
    chip.style.setProperty('--vc', PALETTE[v.colorIdx % PALETTE.length]);
    const lab = el('button', { className: 'vlabel', title: 'focus voice' });
    lab.append(el('span', { className: 'vname', textContent: `V${i + 1}` }), el('span', { className: 'vbadge', textContent: `${v.notes.length}n` }));
    lab.addEventListener('click', () => { state.focused = i; dispatch('focus'); });
    const togs = el('div', { className: 'vtogs' });
    const m = el('button', { className: 'vtog vmute' + (v.mute ? ' on' : ''), textContent: 'M', title: 'mute' });
    m.addEventListener('click', () => { v.mute = !v.mute; dispatch('voice-mix'); });
    const s = el('button', { className: 'vtog vsolo' + (v.solo ? ' on' : ''), textContent: 'S', title: 'solo' });
    s.addEventListener('click', () => { v.solo = !v.solo; dispatch('voice-mix'); });
    togs.append(m, s);
    chip.append(lab, togs);
    container.append(chip);
  });
  if (state.voices.length < MAX_VOICES) { const b = el('button', { className: 'vadd', textContent: '+', title: 'add voice' }); b.addEventListener('click', () => dispatch('voice-add')); container.append(b); }
  if (state.voices.length > 1) { const b = el('button', { className: 'vadd', textContent: '−', title: 'remove focused voice' }); b.addEventListener('click', () => dispatch('voice-remove')); container.append(b); }
}

function nearestIdx(values, v) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < values.length; i++) { const d = Math.abs(values[i] - v); if (d < bd) { bd = d; best = i; } }
  return best;
}

// spec: { label, type:'range'|'select'|'toggle', min,max,step,options,fmt, get(), set(v) }
function makeControl(spec, onChange) {
  const wrap = el('div', { className: `ctl ctl-${spec.type}` });   // ctl-select/-range/-steps/-toggle: lets CSS pair selects
  const lab = el('label', { textContent: spec.label });

  if (spec.type === 'range') {
    const val = el('span', { className: 'val' });
    const fmt = spec.fmt || ((v) => v);
    val.textContent = fmt(spec.get());
    lab.append(val);
    const input = el('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step, value: spec.get() });
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      spec.set(v); val.textContent = fmt(v); onChange();
    });
    wrap.append(lab, input);
  } else if (spec.type === 'steps') {
    // slider that snaps to a curated list of values, showing each value's label
    const val = el('span', { className: 'val' });
    const values = spec.values;
    const labels = spec.labels || values.map(String);
    let idx = nearestIdx(values, spec.get());
    val.textContent = labels[idx];
    lab.append(val);
    const input = el('input', { type: 'range', min: 0, max: values.length - 1, step: 1, value: idx });
    input.addEventListener('input', () => {
      idx = parseInt(input.value, 10);
      spec.set(values[idx]); val.textContent = labels[idx]; onChange();
    });
    wrap.append(lab, input);
  } else if (spec.type === 'select') {
    const input = el('select');
    for (const o of spec.options) input.append(el('option', { value: o, textContent: o }));
    input.value = spec.get();
    input.addEventListener('change', () => { spec.set(input.value); onChange(); });
    wrap.append(lab, input);
  } else if (spec.type === 'toggle') {
    const input = el('input', { type: 'checkbox', checked: !!spec.get() });
    input.addEventListener('change', () => { spec.set(input.checked); onChange(); });
    lab.append(' ', input);
    wrap.append(lab);
  }
  return wrap;
}

// Top rail — HARMONY/MELODY cluster: key · scale + the FEEL disclosure toggle.
export function renderHarmony(container, state, dispatch, onFeel) {
  container.innerHTML = '';
  const S = state.shared;
  const add = (spec, onChange) => container.append(makeControl(spec, onChange));
  const regen = () => dispatch('regen-all');

  add({ label: 'Key', type: 'range', min: 36, max: 72, step: 1, fmt: pitchName, get: () => S.root, set: (v) => (S.root = v) }, regen);
  add({ label: 'Scale', type: 'select', options: SCALE_NAMES, get: () => S.scale, set: (v) => (S.scale = v) }, regen);
  const feel = el('button', { className: 'more-toggle', textContent: 'FEEL ▸', title: 'floor / ceiling / swing / strum / velocity' });
  feel.addEventListener('click', () => onFeel(feel));
  container.append(feel);
}

// Top rail — TIME cluster: everything that sets the base clock (bpm · beats/bar · gen grid).
export function renderTime(container, state, dispatch) {
  container.innerHTML = '';
  const S = state.shared;
  const add = (spec, onChange) => container.append(makeControl(spec, onChange));
  const regen = () => dispatch('regen-all');

  add({ label: 'BPM', type: 'range', min: 40, max: 200, step: 1, get: () => state.bpm, set: (v) => (state.bpm = v) }, () => dispatch('bpm'));
  add({ label: 'Beats/bar', type: 'range', min: 2, max: 8, step: 1, get: () => S.meter, set: (v) => (S.meter = v) }, regen);
  add({ label: 'Gen grid', type: 'select', options: BASE_NAMES, get: () => S.base, set: (v) => (S.base = v) }, regen);
}

// FEEL tray — GLOBAL, neutral: register window + humanize (set-and-forget).
export function renderFeelTray(container, state, dispatch) {
  container.innerHTML = '';
  const S = state.shared;
  const add = (spec, onChange) => container.append(makeControl(spec, onChange));
  const regen = () => dispatch('regen-all');

  add({ label: 'Floor (semitones below root)', type: 'range', min: 0, max: 48, step: 1, fmt: (v) => `-${v}`, get: () => S.floorDown, set: (v) => (S.floorDown = v) }, regen);
  add({ label: 'Ceiling (semitones above root)', type: 'range', min: 0, max: 48, step: 1, fmt: (v) => `+${v}`, get: () => S.ceilingUp, set: (v) => (S.ceilingUp = v) }, regen);
  add({ label: 'Swing', type: 'range', min: 0, max: 0.6, step: 0.05, get: () => state.human.swing, set: (v) => (state.human.swing = v) }, regen);
  add({ label: 'Strum (− down / + up)', type: 'range', min: -0.15, max: 0.15, step: 0.01, get: () => state.human.strum, set: (v) => (state.human.strum = v) }, regen);
  add({ label: 'Vel jitter', type: 'range', min: 0, max: 40, step: 5, get: () => state.human.velVar, set: (v) => (state.human.velVar = v) }, regen);
}

// MIDI tray — per-voice external routing (lives here, NOT the channel strip, and never
// touches the exported .mid). Each voice → its own stable channel + GM program.
// opts: { gm: [name, prog][], onProg(voice) }
export function renderMidiVoices(container, state, opts = {}) {
  container.innerHTML = '';
  const gm = opts.gm || [];
  state.voices.forEach((v, i) => {
    container.append(makeControl({
      label: `V${i + 1} → ch ${v.colorIdx + 1}`, type: 'select', options: gm.map(([name]) => name),
      get: () => (gm.find(([, p]) => p === v.gm) || gm[0] || ['', 0])[0],
      set: (name) => { const hit = gm.find(([n]) => n === name); v.gm = hit ? hit[1] : 0; },
    }, () => opts.onProg && opts.onProg(v)));
  });
}

// Channel strip — PER-VOICE, tinted: the focused voice's whole kit in one place.
// instrument + register/character/length + external MIDI program + generator + export.
// opts: { instruments: string[], gm: [name, prog][] }
export function renderChannelStrip(container, voice, state, dispatch, opts = {}) {
  container.innerHTML = '';
  const idx = state.voices.indexOf(voice);
  const add = (spec, onChange) => container.append(makeControl(spec, onChange));
  const regen = () => dispatch('regen-voice');

  // no "▸ V{n}" header — the focused voice is already shown by the filled chip above
  // and the channel strip's tinted top border; repeating it just wastes a row.

  // voice character — sound + mono/poly (both compact; pair 2-up on desktop)
  add({ label: 'Instrument', type: 'select', options: opts.instruments || [], get: () => voice.instrument, set: (v) => (voice.instrument = v) }, () => dispatch('instrument'));
  add({ label: 'Mono', type: 'toggle', get: () => voice.mono, set: (v) => (voice.mono = v) }, regen);

  // register + loop length
  add({ label: 'Length (bars)', type: 'range', min: 1, max: 8, step: 1, get: () => voice.length, set: (v) => (voice.length = v) }, regen);
  add({ label: 'Octave', type: 'range', min: -3, max: 3, step: 1, fmt: (v) => (v > 0 ? `+${v}` : `${v}`), get: () => voice.octave, set: (v) => (voice.octave = v) }, regen);

  // generator select + its params
  const genRow = el('div', { className: 'gen-select-row' });
  const genSel = el('select', { className: 'gen-select' });
  genRow.append(genSel);
  container.append(genRow);
  renderGenSelect(genSel, state, dispatch);
  const genCtrls = el('div', { className: 'gen-controls' });
  container.append(genCtrls);
  renderGenParams(genCtrls, state, dispatch);

  // per-voice export
  const exp = el('button', { className: 'voiceexport', textContent: `⭳ EXPORT V${idx + 1}` });
  exp.addEventListener('click', () => dispatch('export-voice'));
  container.append(exp);
}

export function renderGenSelect(select, state, dispatch) {
  select.innerHTML = '';
  for (const g of registry) select.append(el('option', { value: g.id, textContent: g.label }));
  select.value = state.genId;
  select.addEventListener('change', () => { state.genId = select.value; dispatch('switch'); });
}

export function renderGenParams(container, state, dispatch) {
  if (state.genId === 'mixed') { renderMixer(container, state, dispatch); return; }
  container.innerHTML = '';
  const gen = getGenerator(state.genId);
  const P = state.genParams[state.genId];
  if (gen.blurb) container.append(el('p', { className: 'blurb', textContent: gen.blurb }));
  if (state.genId === 'molecular') container.append(el('p', { className: 'blurb genstats' }));   // live COLLISIONS readout (filled by refreshStatus)
  for (const spec of gen.params) {
    container.append(makeControl({ ...spec, get: () => P[spec.key], set: (v) => (P[spec.key] = v) }, () => dispatch('regen-voice')));
  }
}

let mixerSubTab = 'a';   // 'a' | 'b' | 'mix' — persists across re-renders

// Mixer gets its own sub-tabbed panel: SOURCE A / SOURCE B / MIXING.
function renderMixer(container, state, dispatch) {
  container.innerHTML = '';
  const gen = getGenerator('mixed');
  const P = state.genParams.mixed;
  const regen = () => dispatch('regen-voice');

  const bar = el('div', { className: 'btnrow subtabs' });
  for (const [key, label] of [['a', 'SOURCE A'], ['b', 'SOURCE B'], ['mix', 'MIXING']]) {
    const btn = el('button', { className: 'tab' + (mixerSubTab === key ? ' active' : ''), textContent: label });
    btn.addEventListener('click', () => { mixerSubTab = key; renderMixer(container, state, dispatch); });
    bar.append(btn);
  }
  container.append(bar);

  const pane = el('div');
  container.append(pane);

  if (mixerSubTab === 'a' || mixerSubTab === 'b') {
    const srcKey = mixerSubTab === 'a' ? 'sourceA' : 'sourceB';
    const slotKey = mixerSubTab === 'a' ? 'slotA' : 'slotB';
    const spec = gen.params.find((s) => s.key === srcKey);
    // changing the source re-renders (to swap the slot's controls)
    pane.append(makeControl({ ...spec, label: 'Source', get: () => P[srcKey], set: (v) => (P[srcKey] = v) }, () => { renderMixer(container, state, dispatch); regen(); }));
    appendSlotParams(pane, state, dispatch, slotKey, P[srcKey]);
  } else {
    for (const spec of gen.params) {
      if (spec.key === 'sourceA' || spec.key === 'sourceB') continue;
      pane.append(makeControl({ ...spec, get: () => P[spec.key], set: (v) => (P[spec.key] = v) }, regen));
    }
  }
}

// A Mixer slot's controls, editing that slot's OWN params (so two of the same
// source are independent). Re-inits the slot when its source changes.
function appendSlotParams(container, state, dispatch, slotKey, subId) {
  const sub = getGenerator(subId);
  if (!sub) return;
  const P = state.genParams.mixed;
  if (!P[slotKey] || P[slotKey]._gen !== subId) {
    const keepBase = P[slotKey] ? P[slotKey]._base : 'inherit';   // keep base override across source change
    P[slotKey] = defaultParams(sub);
    P[slotKey]._gen = subId;
    P[slotKey]._base = keepBase || 'inherit';
  }
  const SP = P[slotKey];
  // per-slot base override (independent of the global THEORY base)
  container.append(makeControl({ label: 'Base override', type: 'select', options: ['inherit', ...BASE_NAMES], get: () => SP._base, set: (v) => (SP._base = v) }, () => dispatch('regen-voice')));
  for (const spec of sub.params) {
    container.append(makeControl({ ...spec, get: () => SP[spec.key], set: (v) => (SP[spec.key] = v) }, () => dispatch('regen-voice')));
  }
}
