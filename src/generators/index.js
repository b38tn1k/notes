// Generator registry. Each module: { id, label, blurb, params[], generate(shared, p) }.
// markov, mixed and herd are added by their own modules once wired.
import molecular from './molecular.js';
import euclidean from './euclidean.js';
import herd from './herd.js';
import arp from './arp.js';
import mixed from './mixed.js';

// Visible menu. Drunk Walk and Noise are folded into Herd; Markov is hidden for
// now — their files remain in the repo, just off the menu.
export const registry = [molecular, euclidean, herd, arp, mixed];

export function getGenerator(id) {
  return registry.find((g) => g.id === id) || registry[0];
}

export function defaultParams(gen) {
  const p = {};
  for (const spec of gen.params) p[spec.key] = spec.default;
  return p;
}
