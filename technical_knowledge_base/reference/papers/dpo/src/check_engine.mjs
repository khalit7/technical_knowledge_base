// Dump the JS engine's losses, gradients and exact evaluations on fixed inputs, for check_engine.py
// (PyTorch autograd) to recompute independently. usage (from src/): node check_engine.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const T = require('./parts/22_js_dpo.js');
const R = T.rng(11), th = T.LREF.slice().map(v => v + (R() - .5) * 2); // a perturbed policy
const data = T.makeData({ groups: 200, seed: 5 }), idx = [...Array(64).keys()];
const lp = T.logSoftmax(th), cases = {};
for (const [k, o] of Object.entries({ dpo: { method: 'dpo', beta: 0.1 }, dpo1: { method: 'dpo', beta: 1 }, ipo: { method: 'dpo', loss: 'ipo', beta: 0.1 }, cdpo: { method: 'dpo', loss: 'cdpo', beta: 0.1, eps: 0.1 }, hinge: { method: 'dpo', loss: 'hinge', beta: 0.5 }, simpo: { method: 'dpo', loss: 'simpo', beta: 2, gamma: 1 }, ul: { method: 'unlikelihood', alpha: 0.5 }, sft: { method: 'sft' } })) {
  const r = T.pairGrad(th, lp, data, idx, o); cases[k] = { o, loss: r.loss, grad: [...r.g] } }
// reward-model gradient on the same batch (Eq. 2)
const phi = [...Array(T.NP)].map(() => (R() - .5)); const g = new Array(T.NP).fill(0); let rl = 0;
for (const i of idx) { const [a, b] = data[i]; const d = T.rmScore(phi, a) - T.rmScore(phi, b); rl += -T.lsig(d); const c = -T.sig(-d) / idx.length; let pa = 0, pb = 0; for (let t = 0; t < 4; t++) { const wa = T.WS[a * 4 + t], wb = T.WS[b * 4 + t]; g[T.row(t, pa) + wa] += c; g[T.row(t, pb) + wb] -= c; pa = wa; pb = wb } }
// one PPO inner step's surrogate gradient on fixed samples and advantages
const ys = [...Array(32)].map(() => T.sample(lp, R)), A = ys.map(() => R() * 2 - 1), lo = ys.map(y => T.seqLogp(T.LREF, y));
const gp = new Float64Array(T.NP), rowc = {};
for (let i = 0; i < ys.length; i++) { const rho = Math.exp(T.seqLogp(lp, ys[i]) - lo[i]); const clipped = (A[i] > 0 && rho > 1.2) || (A[i] < 0 && rho < 0.8); if (!clipped) T.addGrad(gp, lp, ys[i], -rho * A[i] / ys.length, rowc) }
T.finishGrad(gp, lp, rowc);
const ev = T.evaluate(th), opt = [0.05, 0.5, 5].map(b => [b, T.optimal(T.RSTAR, b)]);
fs.writeFileSync(new URL('./model/check_in.json', import.meta.url), JSON.stringify({ V: T.V, L: T.L, NP: T.NP, theta: [...th], lref: [...T.LREF], rstar: [...T.RSTAR], pairs: idx.map(i => data[i]), cases, rm: { phi, loss: rl / idx.length, grad: g }, ppo: { ys, A, lo, grad: [...gp] }, eval: { reward: ev.reward, kl: ev.kl }, optimal: opt.map(([b, o]) => ({ beta: b, kl: o.kl, reward: o.reward })), words: T.W }));
console.log('wrote model/check_in.json');
