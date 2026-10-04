// Runs the page's engines (parts/20_js_rd_engine.js, parts/21_js_dpe.js) in Node and compares their outputs with
// recompute.json and recompute_rd.json, written by the independent Python in recompute.py and recompute_rd.py.
// usage (from src/): uv run --with numpy --with scipy python recompute.py && python3 recompute_rd.py && node check_engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math, console }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['20_js_rd_engine.js', '21_js_dpe.js']) vm.runInContext(fs.readFileSync(path.resolve(here, 'parts', f), 'utf8'), ctx);
const D = ctx.DPE, E = ctx.RDE;
const X = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute.json'), 'utf8'));
const XR = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute_rd.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(label, a, b, tol = 1e-9) {
  if (Array.isArray(b)) { if (!Array.isArray(a) || a.length !== b.length) { bad++; console.log('length', label, a && a.length, b.length); return } b.forEach((v, i) => cmp(label + '[' + i + ']', a[i], v, tol)); return }
  if (b && typeof b === 'object') { for (const k of Object.keys(b)) cmp(label + '.' + k, a && a[k], b[k], tol); return }
  if (b === null) { if (a !== null && a !== undefined) { bad++; console.log('MISMATCH', label, a, b) } return }
  n++; const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst = Math.max(worst, d);
  if (!(d <= tol)) { bad++; if (bad < 25) console.log('MISMATCH', label, a, b) }
}
// reused widgets
for (const g of ['0', '0.5', '0.9', '1']) cmp('mrp ' + g, E.mrpValues(+g), XR.mrp[g]);
{ const r = E.rng(42); cmp('mrpEp', Array.from({ length: 20 }, () => E.mrpEpisode(0, 0.5, r).G), XR.mrpEp) }
{ const u = E.mdpEval([.5, .5, .5, .5], 1); cmp('mdpUnif', [u.V, u.Q], XR.mdpUnif) }
{ const u = E.mdpEval([.5, .5, .5, .5], 0.9); cmp('mdpUnif09', [u.V, u.Q], XR.mdpUnif09) }
{ const o = E.mdpOptimal(1); cmp('mdpOpt', [o.V, o.Q], XR.mdpOpt) }
cmp('gwVI', E.gwValueIteration(40), XR.gwVI);
{ const s = E.gwQLearning(7, 0.3, [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 3000]); cmp('gwQ', s.map(x => ({ ep: x.ep, samples: x.samples, V: x.V })), XR.gwQ) }
cmp('student mdp V*', E.mdpOptimal(1).V, X.student.Vs);
cmp('student mdp Vu', E.mdpEval([.5, .5, .5, .5], 1).V, X.student.Vu);

// corridor
{ const s = D.corridorSteps('sync', 0.9, 6); const ends = [s[0].V.slice(0, 3)]; s.forEach(x => { if (x.s === 0) ends.push(x.V.slice(0, 3)) });// sweep order A,B,C: a sweep ends at C, read at the step after
  const bySweep = [s[0].V.slice(0, 3)]; for (let k = 1; k <= 4; k++) { const last = s.filter(x => x.sweep === k).pop(); if (last) bySweep.push(last.V.slice(0, 3)); else bySweep.push(bySweep[bySweep.length - 1]) }
  cmp('corridor vi', bySweep, X.corridor.vi) }
{ const s = D.corridorSteps('pe', 0.9, 4); const by = [s[0].V.slice(0, 3)]; for (let k = 1; k <= 4; k++) by.push(s.filter(x => x.sweep === k).pop().V.slice(0, 3)); cmp('corridor pe', by, X.corridor.pe) }
{ const s = D.corridorSteps('cba', 0.9, 1); cmp('corridor cba', s[3].V.slice(0, 3), X.corridor.cba) }
{ const V = D.evalExact(D.W.corr, D.uniform(D.W.corr), 0.9); cmp('corridor vpi', V.slice(0, 3), X.corridor.vpi) }
// Figure 4.1
{ const w = D.W.sb44, pi = D.uniform(w); let V = D.init(w); const h = { 0: V.slice() };
  for (let k = 1; k <= 10; k++) { V = D.sweep(w, V, 1, 'eval', pi, false).V; h[k] = V.slice() }
  for (const k of ['0', '1', '2', '3', '10']) cmp('fig41 ' + k, h[k], X.fig41[k]);
  cmp('fig41 inf', D.evalExact(w, pi, 1), X.fig41.inf) }
cmp('aima V*', D.vstar(D.W.aima, 1), X.aima_vstar);
// races: look-ups at the first operation within 1e-4 of the target, last cost, improvements
const setups = { sb44: 1, silver: 1, aima: 1, maze: 0.95 };
const meth = { vi: ['vi', {}], vi_ip: ['vi', { inplace: true }], vi_rev: ['vi', { inplace: true, order: 'rev' }], pi: ['pi', {}], mpi3: ['mpi', { k: 3 }], ps: ['ps', {}], pe: ['pe', {}], pe_ip: ['pe', { inplace: true }] };
for (const [key, g] of Object.entries(setups)) { const w = D.W[key], T = D.vstar(w, g), Tpe = D.evalExact(w, D.uniform(w), g);
  for (const [nm, [kind, o]] of Object.entries(meth)) { const ops = D.run(w, g, kind, o, 400000); const tgt = nm.startsWith('pe') ? Tpe : T;
    const hit = ops.find(x => D.maxErr(w, x.V, tgt) < 1e-4); const exp = X.races[key][nm];
    cmp(`race ${key} ${nm} hit`, hit ? { cost: hit.cost, backups: hit.backups, sweeps: hit.sweeps } : null, exp.hit);
    cmp(`race ${key} ${nm} last`, ops[ops.length - 1].cost, exp.last_cost);
    cmp(`race ${key} ${nm} improvements`, Math.max(0, ...ops.map(x => x.pi || 0)), exp.improvements) } }
// contraction rows on the 4x3 world (zeros against the pessimistic start)
for (const g of ['0.5', '0.9', '0.99']) { const w = D.W.aima, a = D.init(w), b = D.init(w).map((v, s) => w.term[s] ? v : -1 / (1 - +g));
  const rows = D.twoRuns(w, +g, 40, a, b).map(r => [r.da, r.db, r.dab]); cmp('contraction ' + g, rows, X.contraction[g], 1e-9) }
// gambler
for (const ph of ['0.4', '0.25', '0.55']) { const r = D.gambler(+ph, 100000, 1e-12); cmp('gambler pol ' + ph, r.pol, X.gambler[ph].pol); cmp('gambler sweeps ' + ph, r.hist.length - 1, X.gambler[ph].sweeps); cmp('gambler V50 ' + ph, r.V[50], X.gambler[ph].V50) }
// arithmetic
cmp('sweeps 0.9', D.sweepsFor(0.9, 1e-3), X.conv.k09); cmp('sweeps 0.99', D.sweepsFor(0.99, 1e-3), X.conv.k099); cmp('bound', D.stopBound(0.99, 0.001), X.conv.bound);
const pyBad = X.checks.filter(c => !c.ok).length;
console.log(`engine check: ${n} values compared, ${bad} mismatches, largest relative difference ${worst.toExponential(2)}; python checks ${X.checks.length - pyBad}/${X.checks.length} pass`);
process.exit(bad || pyBad ? 1 : 0);
