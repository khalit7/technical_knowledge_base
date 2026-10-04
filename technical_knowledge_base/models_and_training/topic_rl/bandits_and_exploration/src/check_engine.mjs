// Run the page's engine (parts/21_js_bx_engine.js) in Node and compare every output with expected.json,
// written by the independent Python implementation recompute.py.  usage: python3 recompute.py && node check_engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis; (0, eval)(fs.readFileSync(path.resolve(here, 'parts/21_js_bx_engine.js'), 'utf8'));
const B = globalThis.BX, X = JSON.parse(fs.readFileSync(path.resolve(here, 'expected.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(label, a, b, tol = 1e-9) {
  if (Array.isArray(b)) { a = Array.from(a || []); if (a.length !== b.length) { bad++; console.log('length', label, a.length, b.length); return } b.forEach((v, i) => cmp(label + '[' + i + ']', a[i], v, tol)); return }
  if (b && typeof b === 'object') { for (const k of Object.keys(b)) cmp(label + '.' + k, a[k], b[k], tol); return }
  n++; const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst = Math.max(worst, d);
  if (!(d <= tol)) { bad++; if (bad < 15) console.log('MISMATCH', label, a, b) }
}
cmp('emax10 (trapezoid in JS vs Simpson with erf in Python)', B.emax(10), X.emax10, 1e-6);
for (const k of Object.keys(X.emax)) cmp('emax ' + k, B.emax(+k), X.emax[k], 1e-6);
for (const k of Object.keys(X.tbcfg)) { const a = B.tbBatch(X.tbcfg[k], 0, 40, 1000, B.tbNew(1000)); cmp('tb ' + k, { R: a.R, O: a.O, maxq: a.maxq }, X.tb[k]) }
for (const k of Object.keys(X.nscfg)) { const a = B.tbBatch(X.nscfg[k], 0, 5, 3000, B.tbNew(3000)); cmp('ns ' + k, { R: a.R, O: a.O }, X.ns[k]) }
const strat = { greedy: { kind: 'greedy' }, eps: { kind: 'eps', eps: 0.1 }, opt: { kind: 'greedy', q0: 5, alpha: 0.1 }, ucb: { kind: 'ucb', c: 2 }, ts: { kind: 'ts' } };
for (const s of Object.keys(X.bandit)) { const tab = B.banditTable(+s); for (const k of Object.keys(strat)) { const h = B.banditRun(tab, strat[k]), l = h[h.length - 1]; cmp(`bandit ${s} ${k}`, { reg: l.reg, N: l.N, Q: l.Q, acts: h.map(x => x.a) }, X.bandit[s][k]) } }
const presets = { close: [0.6, 0.5, 0.45, 0.4, 0.3], far: [0.9, 0.8, 0.6, 0.5] };
for (const k of Object.keys(presets)) cmp('lr ' + k, B.lrConst(presets[k]), X.lr[k]);
cmp('marks', B.logMarks(2000, 10), X.brMarks);
for (const key of Object.keys(X.br)) { const [pk, kind] = key.split(' '); X.br[key].forEach((exp, r) => { const acc = new Float64Array(X.brMarks.length); B.brRun({ kind, eps: 0.1 }, presets[pk], 2000, r, X.brMarks, acc); cmp(`br ${key} run ${r}`, acc, exp) }) }
for (const m of Object.keys(X.gx)) { const s = B.gxSummary(m, 20, 500); cmp('gx ' + m, { firsts: s.firsts, found: s.found }, { firsts: X.gx[m].firsts, found: X.gx[m].found });
  cmp('gx ends seed1 ' + m, B.gxRun(m, 1, 500, true).map(e => e.end), X.gx[m].ends1) }
console.log(`compared ${n} values, mismatches ${bad}, worst relative difference ${worst.toExponential(2)}`);
process.exit(bad ? 1 : 0);
