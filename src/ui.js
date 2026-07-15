// Renders controls from declarative specs. Generators declare their params,
// so there is no per-generator UI code. Native inputs only.
import { SCALE_NAMES, pitchName } from './music.js';
import { registry, getGenerator } from './generators/index.js';

function el(tag, props = {}) { return Object.assign(document.createElement(tag), props); }

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

export function renderShared(container, state, dispatch) {
  container.innerHTML = '';
  const S = state.shared;
  const specs = [
    { label: 'Key (root)', type: 'range', min: 36, max: 72, step: 1, fmt: pitchName, get: () => S.root, set: (v) => (S.root = v), kind: 'regen' },
    { label: 'Scale', type: 'select', options: SCALE_NAMES, get: () => S.scale, set: (v) => (S.scale = v), kind: 'regen' },
    { label: 'Meter (beats/bar)', type: 'range', min: 2, max: 8, step: 1, get: () => S.meter, set: (v) => (S.meter = v), kind: 'regen' },
    { label: 'Loop length (bars)', type: 'range', min: 1, max: 8, step: 1, get: () => S.loopLength, set: (v) => (S.loopLength = v), kind: 'regen' },
    { label: 'BPM', type: 'range', min: 40, max: 200, step: 1, get: () => state.bpm, set: (v) => (state.bpm = v), kind: 'bpm' },
    { label: 'Swing', type: 'range', min: 0, max: 0.6, step: 0.05, get: () => state.human.swing, set: (v) => (state.human.swing = v), kind: 'regen' },
    { label: 'Vel jitter', type: 'range', min: 0, max: 40, step: 5, get: () => state.human.velVar, set: (v) => (state.human.velVar = v), kind: 'regen' },
  ];
  for (const s of specs) container.append(makeControl(s, () => dispatch(s.kind)));
}

export function renderGenSelect(select, state, dispatch) {
  select.innerHTML = '';
  for (const g of registry) select.append(el('option', { value: g.id, textContent: g.label }));
  select.value = state.genId;
  select.addEventListener('change', () => { state.genId = select.value; dispatch('switch'); });
}

export function renderGenParams(container, state, dispatch) {
  container.innerHTML = '';
  const gen = getGenerator(state.genId);
  const P = state.genParams[state.genId];
  if (gen.blurb) container.append(el('p', { className: 'blurb', textContent: gen.blurb, style: 'font-size:10px;opacity:1;margin:4px 0 8px' }));
  for (const spec of gen.params) {
    container.append(makeControl({
      ...spec,
      get: () => P[spec.key],
      set: (v) => (P[spec.key] = v),
    }, () => dispatch('regen')));
  }
}
