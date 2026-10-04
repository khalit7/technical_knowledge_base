// Runs the page's engine (parts/21_js_vb_engine.js) in Node and compares every value with checks/expected.json,
// which checks/recompute.py writes independently. Run from src/: node checks/check_engine.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'parts', '21_js_vb_engine.js'), 'utf8');
new Function(src)();
const E = globalThis.VBE;
const X = JSON.parse(fs.readFileSync(path.join(here, 'expected.json'), 'utf8'));
const F4 = JSON.parse(fs.readFileSync(path.join(here, '..', 'inputs', 'rainbow_fig4_decoded.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(a, b, where, tol = 1e-9) {
  if (Array.isArray(a)) { if (a.length !== b.length) { bad++; console.log('length', where, a.length, b.length); return } a.forEach((v, i) => cmp(v, b[i], where + '[' + i + ']', tol)); return }
  n++; const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst = Math.max(worst, d);
  if (!(d <= tol)) { bad++; if (bad < 20) console.log('MISMATCH', where, a, b) }
}
for (const [k, v] of Object.entries(X.triad)) { const [g, a, m] = k.split('|'); cmp(E.triad(+g, +a, m, 30), v, 'triad ' + k) }
for (const dist of ['uniform', 'on']) { const h = E.baird(0.01, 1000, dist); cmp(X.baird[dist].map((_, i) => h[i * 50]), X.baird[dist], 'baird ' + dist) }
for (const [k, v] of Object.entries(X.tnet)) { const [g, d1, a, C] = k.split('|').map(Number); cmp(E.tnet(g, d1 === 0.6667 ? 2 / 3 : d1, a, C, 120), v, 'tnet ' + k, 1e-8) }
for (const [k, v] of Object.entries(X.fig2)) {
  const [fun, deg] = k.split('|'); const r = E.fig2(fun, +deg);
  cmp(r.fits, v.fits, 'fig2 fits ' + k, 1e-7); cmp(r.avgMax, v.avgMax, 'fig2 avgMax ' + k, 1e-9); cmp(r.avgDbl, v.avgDbl, 'fig2 avgDbl ' + k, 1e-9);
  if (v.emax) { cmp(r.emax.filter((_, i) => i % 50 === 0), v.emax, 'fig2 emax ' + k, 1e-9); cmp(r.edbl.filter((_, i) => i % 50 === 0), v.edbl, 'fig2 edbl ' + k, 1e-9) }
}
for (const [k, v] of Object.entries(X.c51)) {
  const [N, r, g] = k.split('|').map(Number); const p = E.c51Next(N, -10, 10);
  cmp(p, v.p, 'c51 p ' + k); cmp(E.c51Project(p, N, -10, 10, r, g, 'eq7'), v.eq7, 'c51 eq7 ' + k); cmp(E.c51Project(p, N, -10, 10, r, g, 'alg1'), v.alg1, 'c51 alg1 ' + k);
}
const D = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.5, 3.0];
for (const [k, v] of Object.entries(X.per)) { const [vr, a, b] = k.split('|'); cmp(E.per(D, +a, +b, vr), v, 'per ' + k) }
for (const [k, v] of Object.entries(X.fig4)) { const s = E.fig4Stats(F4.rows[k], F4.hi[k]); for (const q of ['median', 'mean', 'hurt', 'helped', 'strongest']) cmp(s[q], v[q], 'fig4 ' + k + ' ' + q) }
cmp([-100, -1, 0, 1, 10, 100, 1000].map(E.hRescale), X.worked.hRescale, 'h rescale');
console.log(`compared ${n} values, ${bad} mismatches, worst relative difference ${worst.toExponential(2)}`);
process.exit(bad ? 1 : 0);
