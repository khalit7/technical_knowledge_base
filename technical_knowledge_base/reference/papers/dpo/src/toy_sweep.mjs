// Run every toy experiment the page quotes, with the same engine the page runs (parts/22_js_dpo.js),
// and write inputs/toy.json. Deterministic: seeded generator, so the page's "run the sweep" reproduces it.
// usage (from src/): node toy_sweep.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const T = require('./parts/22_js_dpo.js');
const out = {};
const t0 = Date.now();
// the reference policy
const e0 = T.evaluate(T.LREF);
out.ref = { reward: e0.reward, gram: e0.gram, top: e0.top };
let ng = 0; for (let id = 0; id < T.N; id++) if (T.grammatical(id)) ng++;
out.space = { N: T.N, NP: T.NP, grammatical: ng, eps: T.EPS };
// the exact KL-optimal frontier (Eq. 4 with the true reward, every beta)
out.frontier = [];
for (let lb = -3; lb <= 1.5001; lb += 0.05) { const b = Math.pow(10, lb), o = T.optimal(T.RSTAR, b); out.frontier.push([+b.toPrecision(4), o.kl, o.reward]) }
const F = out.frontier.map(x => [x[1], x[2]]).sort((a, b) => a[0] - b[0]);
const fr = k => { for (let i = 1; i < F.length; i++) if (F[i][0] >= k) { const [a, b] = F[i - 1], [c, d] = F[i]; return b + (d - b) * (k - a) / (c - a) } return F[F.length - 1][1] };
// the data: the paper's IMDb recipe (App. C.1) at toy scale
const data = T.makeData({ groups: 1000, seed: 1 });
const seen = new Set(); data.forEach(([a, b]) => { seen.add(a); seen.add(b) });
let wins = 0; for (const [a, b] of data) if (T.RSTAR[a] > T.RSTAR[b]) wins++;
out.data = { groups: 1000, pairs: data.length, distinct: seen.size, labels: 'deterministic (higher classifier score wins)', consistent: wins / data.length };
// the RLHF reward model (Eq. 2), 3 epochs, best validation epoch, as App. C.1
const rm = T.trainRM(data, { epochs: 3 });
let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
for (let id = 0; id < T.N; id++) { const p = Math.exp(T.seqLogp(T.LREF, id)), x = rm.r[id], y = T.RSTAR[id]; n += p; sx += p * x; sy += p * y; sxx += p * x * x; syy += p * y * y; sxy += p * x * y }
out.rm = { valAcc: rm.valAcc, epoch: rm.epoch, log: rm.log, corrRef: (sxy / n - sx / n * sy / n) / Math.sqrt((sxx / n - (sx / n) ** 2) * (syy / n - (sy / n) ** 2)) };
// Figure 2 at toy scale: the same sweep shape as Section 6.1
const R = (x, k) => Math.round(x * 10 ** (k || 4)) / 10 ** (k || 4);
const slim = tr => tr.map(x => { const o = { s: x.step, kl: R(x.kl), r: R(x.reward), g: R(x.gram, 3) }; if (x.unseen != null) o.u = R(x.unseen, 3); if (x.chosen != null) { o.c = R(x.chosen, 3); o.l = R(x.rejected, 3) } return o });
const SW = [];
for (const b of [0.05, 0.1, 1, 5]) SW.push({ m: 'DPO', p: 'β = ' + b, o: { method: 'dpo', beta: b, data, steps: 600, every: 25 } });
for (const a of [0.05, 0.1, 0.5, 1]) SW.push({ m: 'Unlikelihood', p: 'α = ' + a, o: { method: 'unlikelihood', alpha: a, data, steps: 600, every: 25 } });
for (const s of [1, 2, 3]) SW.push({ m: 'Preferred-FT', p: 'seed ' + s, o: { method: 'sft', data, steps: 600, every: 25, seed: s } });
for (const k of [0.5, 1, 2, 3]) SW.push({ m: 'PPO', p: 'target KL ' + k, o: { method: 'ppo', beta: 0.1, targetKL: k, reward: rm.r, data, steps: 400, every: 25 } });
for (const k of [0.5, 1, 2, 3]) SW.push({ m: 'PPO-GT', p: 'target KL ' + k, o: { method: 'ppo', beta: 0.1, targetKL: k, reward: T.RSTAR, data, steps: 400, every: 25 } });
out.sweep = [];
for (const s of SW) { const r = T.run(s.o); const tr = r.trace; const gaps = tr.slice(1).map(x => fr(x.kl) - x.reward);
  out.sweep.push({ m: s.m, p: s.p, trace: slim(tr), meanGap: gaps.reduce((a, b) => a + b, 0) / gaps.length, maxGap: Math.max(...gaps), samples: r.samples || 0, final: r.trace[r.trace.length - 1] && { kl: tr[tr.length - 1].kl, r: tr[tr.length - 1].reward } }) }
// per method: mean shortfall from the frontier over all evaluations, and the best reward reached at KL <= 1
const meth = [...new Set(out.sweep.map(s => s.m))];
out.byMethod = meth.map(m => { const pts = out.sweep.filter(s => s.m === m).flatMap(s => s.trace.slice(1));
  const g = pts.map(x => fr(x.kl) - x.r); const k1 = pts.filter(x => x.kl <= 1);
  return { m, n: pts.length, meanGap: g.reduce((a, b) => a + b, 0) / g.length, best1: k1.length ? Math.max(...k1.map(x => x.r)) : null } });
out.frontierAt1 = fr(1);
// long runs: train past the sweep (4,000 steps, about 49 epochs)
out.long = [];
for (const [nm, o] of [['DPO β = 0.1', { method: 'dpo', beta: 0.1 }], ['DPO β = 1', { method: 'dpo', beta: 1 }], ['IPO τ = 0.1', { method: 'dpo', loss: 'ipo', beta: 0.1 }], ['IPO τ = 1', { method: 'dpo', loss: 'ipo', beta: 1 }], ['cDPO β = 0.1, ε = 0.1', { method: 'dpo', loss: 'cdpo', beta: 0.1, eps: 0.1 }], ['SimPO β = 2, γ = 1', { method: 'dpo', loss: 'simpo', beta: 2, gamma: 1 }], ['Hinge (SLiC) β = 0.5', { method: 'dpo', loss: 'hinge', beta: 0.5 }], ['Unlikelihood α = 1', { method: 'unlikelihood', alpha: 1 }]]) {
  const r = T.run(Object.assign({ data, steps: 4000, every: 100 }, o)); const e = T.evaluate(r.theta);
  out.long.push({ name: nm, o: Object.assign({}, o), trace: slim(r.trace), top: e.top.slice(0, 5).map(x => ({ t: x.t, p: R(x.p, 4), r: R(x.r, 3) })) }) }
// Theorem 1, measured: with Bradley-Terry labels, minimise the DPO loss over policies and the reward-model
// loss over rewards (both full batch, to convergence); the two reach the same minimum, but nothing pins
// the solution down off the data.
{ const d2 = T.makeData({ groups: 1000, seed: 1, labels: 'bt', k: 8 }), m = d2.length, all = [...Array(m).keys()], beta = 0.5;
  let th = T.LREF.slice(), opt = T.makeOpt('adam', 0.05, 0), ld = [];
  for (let s = 1; s <= 4000; s++) { const lp = T.logSoftmax(th), r = T.pairGrad(th, lp, d2, all, { method: 'dpo', beta }); const d = opt(r.g); for (let i = 0; i < T.NP; i++) th[i] += d[i]; if (s % 500 === 0) ld.push([s, r.loss]) }
  let phi = new Float64Array(T.NP); opt = T.makeOpt('adam', 0.05, 0); const lr = [];
  for (let s = 1; s <= 4000; s++) { const g = new Float64Array(T.NP); let loss = 0;
    for (const [a, b] of d2) { const dd = T.rmScore(phi, a) - T.rmScore(phi, b); loss += -T.lsig(dd); const c = -T.sig(-dd) / m; let pa = 0, pb = 0; for (let t = 0; t < 4; t++) { const wa = T.WS[a * 4 + t], wb = T.WS[b * 4 + t]; g[T.row(t, pa) + wa] += c; g[T.row(t, pb) + wb] -= c; pa = wa; pb = wb } }
    const d = opt(g); for (let i = 0; i < T.NP; i++) phi[i] += d[i]; if (s % 500 === 0) lr.push([s, loss / m]) }
  const s2 = new Set(); d2.forEach(([a, b]) => { s2.add(a); s2.add(b) });
  const lp = T.logSoftmax(th); let un = 0; for (let id = 0; id < T.N; id++) if (!s2.has(id)) un += Math.exp(T.seqLogp(lp, id));
  const ev = T.evaluate(th);
  out.theorem = { beta, pairs: m, dpoLoss: ld, rmLoss: lr, unseenDPO: un, kl: ev.kl, reward: ev.reward, top: ev.top.slice(0, 3).map(x => x.t) } }
// a few training pairs for the Reading tab's examples (the first four distinct pairs of the data)
// the Reading tab's four example pairs: the most frequent grammatical pair of each of the most frequent (chosen reward, rejected reward) kinds, no answer repeated
out.examples = []; { const cnt = new Map(); for (const [a, b] of data) if (T.grammatical(a) && T.grammatical(b)) { const k = a + ',' + b; cnt.set(k, (cnt.get(k) || 0) + 1) }
  const used = new Set(), cls = new Set(); for (const [k, c] of [...cnt.entries()].sort((x, y) => y[1] - x[1])) { const [a, b] = k.split(',').map(Number); const kc = T.RSTAR[a].toFixed(3) + T.RSTAR[b].toFixed(3); if (used.has(a) || used.has(b) || cls.has(kc)) continue; used.add(a); used.add(b); cls.add(kc);
    out.examples.push({ w: T.text(a), l: T.text(b), n: c, rw: R(T.RSTAR[a], 3), rl: R(T.RSTAR[b], 3), pw: Math.exp(T.seqLogp(T.LREF, a)), pl: Math.exp(T.seqLogp(T.LREF, b)) }); if (out.examples.length >= 4) break } }
out.ms = Date.now() - t0;
fs.writeFileSync(new URL('./inputs/toy.json', import.meta.url), JSON.stringify(out));
console.log('toy sweep', out.ms, 'ms; pairs', data.length, 'distinct', seen.size, 'RM val acc', rm.valAcc.toFixed(3));
for (const b of out.byMethod) console.log(b.m.padEnd(13), 'mean shortfall', b.meanGap.toFixed(3), 'best reward at KL<=1', b.best1 && b.best1.toFixed(3));
console.log('frontier at KL 1', out.frontierAt1.toFixed(3));
for (const l of out.long) { const z = l.trace[l.trace.length - 1]; console.log(l.name.padEnd(22), 'KL', z.kl, 'r', z.r, 'gram', z.g, 'unseen', z.u, '|', l.top.slice(0, 2).map(x => x.t).join(' / ')) }
console.log('theorem', JSON.stringify(out.theorem));
