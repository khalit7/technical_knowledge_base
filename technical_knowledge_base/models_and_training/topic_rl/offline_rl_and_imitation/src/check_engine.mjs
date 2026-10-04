// Run the page's engine (parts/21_js_of_engine.js) in Node and compare every output with expected.json,
// written by the independent Python implementation recompute.py.  usage: python3 recompute.py && node check_engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis; (0, eval)(fs.readFileSync(path.resolve(here, 'parts/21_js_of_engine.js'), 'utf8'));
const E = globalThis.OF, X = JSON.parse(fs.readFileSync(path.resolve(here, 'expected.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(label, a, b, tol = 1e-9) {
  if (Array.isArray(b)) { a = Array.from(a || []); if (a.length !== b.length) { bad++; console.log('length', label, a.length, b.length); return } b.forEach((v, i) => cmp(label + '[' + i + ']', a[i], v, tol)); return }
  if (b && typeof b === 'object') { for (const k of Object.keys(b)) cmp(label + '.' + k, a[k], b[k], tol); return }
  n++; const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst = Math.max(worst, d);
  if (!(d <= tol)) { bad++; if (bad < 15) console.log('MISMATCH', label, a, b) }
}
for (const key of Object.keys(X.drive)) { const [eps, T] = key.split(' ').map(Number); const ds = E.dagger(eps, T, 8, 5, 7);
  X.drive[key].forEach((exp, r) => { const ex = E.exact(ds[r], eps, T); cmp(`drive ${key} round ${r + 1}`, { data: ds[r], J: ex.J, per: ex.per, unl: ex.unl }, exp) }) }
for (const T of Object.keys(X.horizon)) { const ds = E.dagger(0.02, +T, 8, 5, 7);
  cmp('horizon ' + T, { bc: E.exact(ds[0], 0.02, +T).J, dagger: E.exact(ds[ds.length - 1], 0.02, +T).J, nd: ds[ds.length - 1].length }, X.horizon[T]) }
for (const key of Object.keys(X.x)) { const [seed, beta, meth, par] = key.split(' '); const o = { beta: +beta };
  if (meth === 'cql') o.alpha = +par; if (meth === 'iql') o.tau = +par;
  const r = E.runX(meth, +seed, o), e = X.x[key];
  cmp('x ' + key, { A: r.A, R: r.R, mu: r.mu, sd: r.sd, beh: r.beh, bestSup: r.bestSup, wlast: r.hist[r.hist.length - 1].w, hist: r.hist.map(h => ({ bel: h.bel, true: h.true, t: h.t, mode: h.mode })) },
    { A: e.A, R: e.R, mu: e.mu, sd: e.sd, beh: e.beh, bestSup: e.bestSup, wlast: e.wlast, hist: e.hist }, 1e-7) }
console.log(`compared ${n} values, mismatches ${bad}, worst relative difference ${worst.toExponential(2)}`);
process.exit(bad ? 1 : 0);
