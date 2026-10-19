// Every toy number on the page: node src/toy_sweep.mjs   (from the page folder or anywhere; about 10 s)
// Runs the PTGS toy (parts/22_js_toy.js, the page's own engine) for SEEDS seeds x four arms, as the authors' toy does:
// base (untrained), fixed (T = 1), globalT (one hotter T, matched to PTGS's mean temperature on a seed-0 probe), ptgs (tau = 1.5).
// Writes inputs/toy.json and parts/_gen_toydata.js (window.TOYD), which the page shows and check_page.mjs compares against.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(HERE, 'parts/22_js_toy.js'), 'utf8'));
const T = globalThis.TOY, SEEDS = 10, K = 128, KS = [1, 2, 4, 8, 16, 32, 64, 128], TAU = 1.5;
const r4 = v => Math.round(v * 1e4) / 1e4;
const probe = T.train(T.makeTasks(T.CFG, 0), 'ptgs', 0, { tau: TAU });
const gT = probe.tr.temp.reduce((a, b) => a + b, 0) / probe.tr.temp.length;
const arms = ['base', 'fixed', 'globalT', 'ptgs'], per = {}, traces = {};
arms.forEach(a => { per[a] = []; traces[a] = [] });
for (let s = 0; s < SEEDS; s++) {
  const tk = T.makeTasks(T.CFG, s);
  for (const a of arms) {
    const run = a === 'base' ? { W: tk.W0 } : T.train(tk, a, s, { tau: TAU, globalT: gT });
    const c = T.evaluate(tk, run.W, s), cv = T.curves(c, K, K), sc = T.scal(cv.cov, K);
    per[a].push({ seed: s, c, cov: KS.map(k => r4(cv.cov[k - 1])), con: KS.map(k => r4(cv.con[k - 1])), A: sc.A, S: sc.S,
      cat: [c.filter(v => v === K).length, c.filter(v => v > 0 && v < K).length, c.filter(v => v === 0).length] });
    if (run.tr) traces[a].push(run.tr);
  }
}
const mean = v => v.reduce((a, b) => a + b, 0) / v.length, sd = v => { const m = mean(v); return Math.sqrt(mean(v.map(x => (x - m) ** 2))) };
const summary = {};
for (const a of arms) {
  const P = per[a];
  summary[a] = { p1: r4(mean(P.map(p => p.cov[0]))), p1sd: r4(sd(P.map(p => p.cov[0]))), pK: r4(mean(P.map(p => p.cov[7]))), pKsd: r4(sd(P.map(p => p.cov[7]))),
    conK: r4(mean(P.map(p => p.con[7]))), cov: KS.map((_, i) => r4(mean(P.map(p => p.cov[i])))), con: KS.map((_, i) => r4(mean(P.map(p => p.con[i])))),
    cat: [0, 1, 2].map(i => r4(mean(P.map(p => p.cat[i] / 96)))) };
  if (a !== 'base') { const tx = P.map((p, i) => per.base[i].S - p.S); summary[a].taxS = r4(mean(tx)); summary[a].taxSsd = r4(sd(tx));
    const d1 = per.ptgs.map((p, i) => p.cov[0] - P[i].cov[0]), dk = per.ptgs.map((p, i) => p.cov[7] - P[i].cov[7]);
    summary[a].vsPtgs = { d1: r4(mean(d1)), d1sd: r4(sd(d1)), dK: r4(mean(dk)), dKsd: r4(sd(dk)), won1: d1.filter(v => v > 0).length, wonK: dk.filter(v => v > 0).length } }
}
// training traces, averaged over seeds and smoothed over 9 steps (as the paper's Figure 40 does)
const sm = v => v.map((_, i) => { const a = Math.max(0, i - 4), b = Math.min(v.length, i + 5); return mean(v.slice(a, b)) });
const trace = {};
for (const a of ['fixed', 'globalT', 'ptgs']) { trace[a] = {}; for (const f of ['any', 'mixed', 'temp', 'ent']) { const m = traces[a][0][f].map((_, i) => mean(traces[a].map(t => t[f][i]))); trace[a][f] = sm(m).map(r4) } }
const last50 = {}; for (const a of ['fixed', 'globalT', 'ptgs']) last50[a] = { any: r4(mean(traces[a].map(t => mean(t.any.slice(-50))))), mixed: r4(mean(traces[a].map(t => mean(t.mixed.slice(-50))))), temp: r4(mean(traces[a].map(t => mean(t.temp.slice(-50))))) };
// the before/after snapshot: seed 0, the PTGS run's batch at step 100
// the step is chosen by a fixed rule, not by eye: among steps 40, 44, ..., 160 of seed 0, the batch with the most even mix of
// prompts the policy solves often (p at T = 1 above 0.5) and prompts it almost never solves (below 0.05); ties go to the earlier step
const tk0 = T.makeTasks(T.CFG, 0);
let best = null;
for (let st = 40; st <= 160; st += 4) { const b = T.train(tk0, 'ptgs', 0, { tau: TAU, snapAt: st }).snap.batch, hi = b.filter(x => x.p1 > 0.5).length, lo = b.filter(x => x.p1 < 0.05).length, sc = Math.min(hi, lo) * 10 + hi + lo; if (!best || sc > best.sc) best = { st, sc } }
const snapRun = T.train(tk0, 'ptgs', 0, { tau: TAU, snapAt: best.st });
const snap = { step: best.st, pivot: r4(snapRun.snap.pivot), batch: snapRun.snap.batch.map(b => ({ x: b.x, a: r4(b.a), b: r4(b.b), pHat: r4(b.pHat), T: r4(b.T), p1: r4(b.p1), pT: r4(b.pT), k: b.k, nexc: b.nexc })) };
// eval of the fixed arm at hotter test temperatures (the paper's Appendix C.4 question, asked of the toy)
const hot = {}; for (const Te of [1.0, 1.3, 1.6]) { const v1 = [], vk = []; for (let s = 0; s < SEEDS; s++) { const tk = T.makeTasks(T.CFG, s), W = T.train(tk, 'fixed', s, {}).W, c = T.evaluate(tk, W, s, Te), cv = T.curves(c, K, K); v1.push(cv.cov[0]); vk.push(cv.cov[K - 1]) } hot[Te] = { p1: r4(mean(v1)), pK: r4(mean(vk)) } }
// sensitivity: rerun the global-T arm with its temperature rounded to 4 decimals; how far does one seed's pass@128 move?
let sens = 0; for (let s = 0; s < SEEDS; s++) { const tk = T.makeTasks(T.CFG, s), c = T.evaluate(tk, T.train(tk, 'globalT', s, { globalT: r4(gT) }).W, s); sens = Math.max(sens, Math.abs(T.curves(c, K, K).cov[K - 1] - per.globalT[s].cov[7])) }
const out = { sens: { dT: Math.abs(gT - r4(gT)), dPassK: r4(sens) }, engine: 'parts/22_js_toy.js', seeds: SEEDS, tau: TAU, globalT: r4(gT), globalTfull: gT, KS, summary, last50, trace, snap, hot,
  perSeed: Object.fromEntries(arms.map(a => [a, per[a].map(p => ({ seed: p.seed, cov: p.cov, S: r4(p.S), cat: p.cat }))])) };
fs.writeFileSync(path.join(HERE, 'inputs/toy.json'), JSON.stringify(out));
fs.writeFileSync(path.join(HERE, 'parts/_gen_toydata.js'), '// Generated by toy_sweep.mjs from parts/22_js_toy.js; do not edit by hand.\nwindow.TOYD=' + JSON.stringify(out) + ';\n');
console.log('globalT', r4(gT)); for (const a of arms) console.log(a.padEnd(8), JSON.stringify({ p1: summary[a].p1, pK: summary[a].pK, conK: summary[a].conK, taxS: summary[a].taxS, cat: summary[a].cat }));
console.log('vs ptgs', JSON.stringify({ fixed: summary.fixed.vsPtgs, globalT: summary.globalT.vsPtgs })); console.log('last50', JSON.stringify(last50)); console.log('hot', JSON.stringify(hot));
console.log('snap', JSON.stringify(snap));
