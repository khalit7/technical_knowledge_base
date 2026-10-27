// Check the in-browser Approach 3 fit (parts/21_js_fit.js) against SciPy's (fit.py -> inputs/fit.json).
// usage: node check_fit.mjs      (about a minute: the paper's 4,500-start grid three times, plus the page's quick grid)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(here, 'parts/21_js_fit.js'), 'utf8'));
const F = globalThis.FIT, J = JSON.parse(fs.readFileSync(path.join(here, 'inputs/fit.json')));
const pts = fs.readFileSync(path.join(here, 'inputs/epoch_fig4_points.csv'), 'utf8').split('\n').filter(l => /^\d/.test(l)).map(l => l.split(',').map(Number));
const L = pts.map(p => p[2]).slice().sort((a, b) => a - b), cut = L[L.length - 5];
const kept = pts.filter(p => p[2] < cut);
const out = {};
for (const [nm, P, mean, full] of [['sum', kept, false, true], ['mean', kept, true, true], ['all', pts, false, true], ['sum_quick', kept, false, false], ['mean_quick', kept, true, false]]) {
  const t0 = Date.now(); let res;
  F.fitStarts(F.prep(P), F.grid(full), { delta: 1e-3, mean, sync: true }, null, b => { res = b });
  const f = F.named(res.x), ref = J.fits[nm.replace('_quick', '')];
  out[nm] = { A: f.A, B: f.B, E: f.E, alpha: f.alpha, beta: f.beta, a_exp: f.a_exp, tpp_gopher: F.frontier(f, 5.76e23).tpp, ms: Date.now() - t0, starts: F.grid(full).length };
  console.log(nm.padEnd(10), 'JS', ['A', 'B', 'E', 'alpha', 'beta', 'a_exp'].map(k => k + '=' + f[k].toPrecision(4)).join(' '), 'tpp', out[nm].tpp_gopher.toFixed(1), (Date.now() - t0) + ' ms');
  console.log(''.padEnd(10), 'Py', ['A', 'B', 'E', 'alpha', 'beta', 'a_exp'].map(k => k + '=' + ref[k].toPrecision(4)).join(' '), 'tpp', ref.tpp_gopher.toFixed(1));
}
fs.writeFileSync(path.join(here, 'inputs/check_fit.json'), JSON.stringify(out, null, 1));
