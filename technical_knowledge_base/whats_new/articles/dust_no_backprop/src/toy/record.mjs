// Write toy/out/toy.json: the toy's recorded curves (mean cosine over seeds 1 to 8 for widths 8, 32 and 128, seed 1 alone,
// the fitted law per method and width, and token 0's estimate at H = 32, seed 1). Uses the page's own code (parts/22_js_du_toy_core.js).
// usage (from this src/ folder): nice -n 15 node toy/record.mjs     (about a minute on one core)
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
vm.runInThisContext(fs.readFileSync(path.join(here, '../parts/22_js_du_toy_core.js'), 'utf8'));
const D = globalThis.DUT, SEEDS = [1, 2, 3, 4, 5, 6, 7, 8], out = { seeds: SEEDS, K: D.KS, T: D.T, DIN: D.DIN, C: D.C, SIG: D.SIG, widths: {} };
const r6 = x => Math.round(x * 1e6) / 1e6;
for (const H of [8, 32, 128]) {
  const runs = SEEDS.map(s => D.run(H, s)), W = { mean: {}, seed1: {}, fit: {} };
  for (const m of ['w', 'a1', 'at']) {
    W.mean[m] = D.KS.map((_, i) => r6(runs.reduce((s, r) => s + r.cos[m][i], 0) / runs.length));
    W.seed1[m] = runs[0].cos[m].map(r6);
    const f = D.fit(D.KS, W.mean[m]); W.fit[m] = { cmax: r6(f.cmax), c: r6(f.c) };
  }
  if (H === 32) out.tok0 = { exact: runs[0].tok0.exact.map(r6), est: runs[0].tok0.est.map(a => a.map(r6)) };
  out.widths[H] = W; console.log('H', H, JSON.stringify(W.fit));
}
fs.writeFileSync(path.join(here, 'out/toy.json'), JSON.stringify(out));
