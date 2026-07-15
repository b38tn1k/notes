// Generator registry. Each module: { id, label, blurb, params[], generate(shared, p) }.
// markov, mixed and herd are added by their own modules once wired.
import molecular from './molecular.js';
import euclidean from './euclidean.js';
import drunkwalk from './drunkwalk.js';
import noise from './noise.js';
import arp from './arp.js';
import markov from './markov.js';
import mixed from './mixed.js';
import herd from './herd.js';

export const registry = [molecular, euclidean, drunkwalk, noise, arp, markov, mixed, herd];

export function getGenerator(id) {
  return registry.find((g) => g.id === id) || registry[0];
}

export function defaultParams(gen) {
  const p = {};
  for (const spec of gen.params) p[spec.key] = spec.default;
  return p;
}
