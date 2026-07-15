// Renders controls from declarative specs. Generators declare their params,
// so there is no per-generator UI code. Native inputs only.
import { SCALE_NAMES, BASE_NAMES, pitchName } from './music.js';
import { registry, getGenerator, defaultParams } from './generators/index.js';

function el(tag, props = {}) { return Object.assign(document.createElement(tag), props); }

function nearestIdx(values, v) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < values.length; i++) { const d = Math.abs(values[i] - v); if (d < bd) { bd = d; best = i; } }
  return best;
}

// spec: { label, type:'range'|'select'|'toggle', min,max,step,options,fmt, get(), set(v) }
function makeControl(spec, onChange) {
  const wrap = el('div', { className: 'ctl' });
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

// THEORY tab: key, scale, timing, tempo.
export function renderTheory(container, state, dispatch) {
  container.innerHTML = '';
  const S = state.shared;
  const add = (spec, onChange) => container.append(makeControl(spec, onChange));
  const regen = () => dispatch('regen');

  add({ label: 'Key (root)', type: 'range', min: 36, max: 72, step: 1, fmt: pitchName, get: () => S.root, set: (v) => (S.root = v) }, regen);
  add({ label: 'Scale', type: 'select', options: SCALE_NAMES, get: () => S.scale, set: (v) => (S.scale = v) }, regen);
  add({ label: 'Floor (semitones below root)', type: 'range', min: 0, max: 48, step: 1, fmt: (v) => `-${v}`, get: () => S.floorDown, set: (v) => (S.floorDown = v) }, regen);
  add({ label: 'Ceiling (semitones above root)', type: 'range', min: 0, max: 48, step: 1, fmt: (v) => `+${v}`, get: () => S.ceilingUp, set: (v) => (S.ceilingUp = v) }, regen);
  add({ label: 'Beats per bar', type: 'range', min: 2, max: 8, step: 1, get: () => S.meter, set: (v) => (S.meter = v) }, regen);
  add({ label: 'Base step (grid)', type: 'select', options: BASE_NAMES, get: () => S.base, set: (v) => (S.base = v) }, regen);

  // Loop length drives playback/export; when locked, the sequence follows it.
  add({ label: 'Loop length (bars)', type: 'range', min: 1, max: 8, step: 1, get: () => S.loopLength, set: (v) => { S.loopLength = v; if (S.lockLength) S.seqLength = v; } }, regen);
  add({ label: 'Lock sequence to loop', type: 'toggle', get: () => S.lockLength, set: (v) => { S.lockLength = v; if (v) S.seqLength = S.loopLength; } }, () => { renderTheory(container, state, dispatch); regen(); });
  if (!S.lockLength) {
    add({ label: 'Sequence length (bars)', type: 'range', min: 1, max: 16, step: 1, get: () => S.seqLength, set: (v) => (S.seqLength = v) }, regen);
  }

  add({ label: 'BPM', type: 'range', min: 40, max: 200, step: 1, get: () => state.bpm, set: (v) => (state.bpm = v) }, () => dispatch('bpm'));
}

// FEEL tab: humanize.
export function renderFeel(container, state, dispatch) {
  container.innerHTML = '';
  const add = (spec, onChange) => container.append(makeControl(spec, onChange));
  const regen = () => dispatch('regen');

  add({ label: 'Swing', type: 'range', min: 0, max: 0.6, step: 0.05, get: () => state.human.swing, set: (v) => (state.human.swing = v) }, regen);
  add({ label: 'Strum (− down / + up)', type: 'range', min: -0.15, max: 0.15, step: 0.01, get: () => state.human.strum, set: (v) => (state.human.strum = v) }, regen);
  add({ label: 'Vel jitter', type: 'range', min: 0, max: 40, step: 5, get: () => state.human.velVar, set: (v) => (state.human.velVar = v) }, regen);
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
  for (const spec of gen.params) {
    container.append(makeControl({ ...spec, get: () => P[spec.key], set: (v) => (P[spec.key] = v) }, () => dispatch('regen')));
  }
}

let mixerSubTab = 'a';   // 'a' | 'b' | 'mix' — persists across re-renders

// Mixer gets its own sub-tabbed panel: SOURCE A / SOURCE B / MIXING.
function renderMixer(container, state, dispatch) {
  container.innerHTML = '';
  const gen = getGenerator('mixed');
  const P = state.genParams.mixed;
  const regen = () => dispatch('regen');

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
  container.append(makeControl({ label: 'Base override', type: 'select', options: ['inherit', ...BASE_NAMES], get: () => SP._base, set: (v) => (SP._base = v) }, () => dispatch('regen')));
  for (const spec of sub.params) {
    container.append(makeControl({ ...spec, get: () => SP[spec.key], set: (v) => (SP[spec.key] = v) }, () => dispatch('regen')));
  }
}
