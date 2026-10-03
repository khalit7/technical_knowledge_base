// Run the page's Reading engine (parts/21_js_rd_engine.js) in Node and compare every output with
// src/read/expected.json, written by the independent Python implementation src/read/recompute.py.
// usage: python3 src/read/recompute.py && node src/read/check_engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math, console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(here, '../parts/21_js_rd_engine.js'), 'utf8'), ctx);
const E = ctx.RDE, X = JSON.parse(fs.readFileSync(path.resolve(here, 'expected.json'), 'utf8'));
let n = 0, bad = 0, worst = 0;
function cmp(label, a, b, tol = 1e-9) {
  if (Array.isArray(b)) { if (!Array.isArray(a) || a.length !== b.length) { bad++; console.log('length', label, a && a.length, b.length); return } b.forEach((v, i) => cmp(label + '[' + i + ']', a[i], v, tol)); return }
  if (b && typeof b === 'object') { for (const k of Object.keys(b)) cmp(label + '.' + k, a[k], b[k], tol); return }
  n++; const d = Math.abs(a - b) / Math.max(1, Math.abs(b)); worst = Math.max(worst, d);
  if (!(d <= tol)) { bad++; if (bad < 15) console.log('MISMATCH', label, a, b) }
}
for (const g of ['0', '0.5', '0.9', '1']) cmp('mrp ' + g, E.mrpValues(+g), X.mrp[g]);
{ const r = E.rng(42); cmp('mrpEp', Array.from({ length: 20 }, () => E.mrpEpisode(0, 0.5, r).G), X.mrpEp) }
{ const u = E.mdpEval([.5, .5, .5, .5], 1); cmp('mdpUnif', [u.V, u.Q], X.mdpUnif) }
{ const u = E.mdpEval([.5, .5, .5, .5], 0.9); cmp('mdpUnif09', [u.V, u.Q], X.mdpUnif09) }
{ const o = E.mdpOptimal(1); cmp('mdpOpt', [o.V, o.Q], X.mdpOpt, 1e-9) }
const strat = { greedy: { kind: 'greedy' }, eps: { kind: 'eps', eps: 0.1 }, opt: { kind: 'greedy', q0: 5, alpha: 0.1 }, ucb: { kind: 'ucb', c: 2 } };
for (const seed of Object.keys(X.bandit)) { const tab = E.banditTable(+seed);
  for (const k of Object.keys(strat)) { const h = E.banditRun(tab, strat[k]), last = h[h.length - 1];
    cmp(`bandit ${seed} ${k}`, { reg: last.reg, N: last.N, Q: last.Q, acts: h.map(x => x.a) }, X.bandit[seed][k], 1e-9) } }
cmp('gwVI', E.gwValueIteration(40), X.gwVI);
{ const s = E.gwQLearning(7, 0.3, [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 3000]); cmp('gwQ', s.map(x => ({ ep: x.ep, samples: x.samples, V: x.V })), X.gwQ, 1e-9) }
const tg = (p, x) => { const t = E.targets(p); cmp('targets', { mc: t.mc, td: t.td, two: t.two, nn: t.nn, lam: t.lam, dp: t.dp, reinforceB: t.reinforceB, delta: t.delta, updMC: t.upd(t.mc), updTD: t.upd(t.td) }, x) };
tg({ g: 0.9, lam: 0.5, n: 2, R: [0, 0, 1], V: [0.2, 0.4, 0.7], alpha: 0.1, pDP: 0.8 }, X.targets);
tg({ g: 0.97, lam: 0.8, n: 1, R: [0.5, -1, 2], V: [0.1, 0.9, -0.3], alpha: 0.3, pDP: 0.6 }, X.targets2);
for (const k of ['grpo', 'drgrpo', 'rloo']) cmp('grpo ' + k, E.groupAdv([1, 0, 0, 0], k).A, X.grpo[k]);
cmp('grpo16 one', E.groupAdv([1, ...Array(15).fill(0)], 'grpo').A, X.grpo16.one);
cmp('grpo16 half', E.groupAdv([...Array(8).fill(1), ...Array(8).fill(0)], 'grpo').A, X.grpo16.half);
for (const l of Object.keys(X.dial)) { const d = E.dial(0.9, 0.5, 0.3, +l); cmp('dial ' + l, { bias: d.bias, var: d.vr, mse: d.mse }, X.dial[l]) }
for (const l of Object.keys(X.dial0)) { const d = E.dial(0.9, 0.5, 0, +l); cmp('dial0 ' + l, { bias: d.bias, var: d.vr, mse: d.mse }, X.dial0[l], 1e-9) }
cmp('triad off', E.triad(0.9, 0.1, 'off', 30), X.triad.off); cmp('triad on', E.triad(0.9, 0.1, 'on', 30), X.triad.on); cmp('triad off04', E.triad(0.4, 0.1, 'off', 30), X.triad.off04);
for (const nn of Object.keys(X.emax)) cmp('emax ' + nn, E.emax(+nn), X.emax[nn], 2e-4);
{ const s = E.pgStats([0, 0, 0], [1, 2, 6]); cmp('pg s0', [s.pi, s.V, s.grad, s.var0, s.varB], X.pg.s0) }
{ const s = E.pgStats([0, 0, 0], [11, 12, 16]); cmp('pg off10', [s.pi, s.V, s.grad, s.var0, s.varB], X.pg.off10) }
cmp('pg run0', E.pgRun([1, 2, 6], 0.1, 60, 5, false).map(h => ({ a: h.a, V: h.V })), X.pg.run0);
cmp('pg runB', E.pgRun([1, 2, 6], 0.1, 60, 5, true).map(h => ({ a: h.a, V: h.V })), X.pg.runB);
for (const k of Object.keys(X.pgSpread)) { const c = parseInt(k.slice(1)), B = k.endsWith('B'); cmp('pgSpread ' + k, E.pgSpread([1 + c, 2 + c, 6 + c], 0.1, 60, B, 100, 200).finals, X.pgSpread[k]) }
const pp = (A, eta, clip) => E.ppoRun(A, 0.2, eta, 10, clip).hist.map(h => ({ r: h.r, L: h.L }));
cmp('ppo clipPos', pp(1, 0.2, true), X.ppo.clipPos); cmp('ppo noclipPos', pp(1, 0.2, false), X.ppo.noclipPos);
cmp('ppo clipNeg', pp(-1, 0.2, true), X.ppo.clipNeg); cmp('ppo noclipNeg', pp(-1, 0.2, false), X.ppo.noclipNeg);
cmp('ppo clipPos05', pp(1, 0.5, true), X.ppo.clipPos05);
console.log(`engine check: ${n} values compared, ${bad} mismatches, largest relative difference ${worst.toExponential(2)}`);
process.exit(bad ? 1 : 0);
