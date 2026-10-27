// Dump deterministic pieces of the page's toy engine on fixed inputs, for check_toy.py to compare with the authors' numpy code.
// node src/check_toy.mjs > src/model/toy_case.json
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(HERE, 'parts/22_js_toy.js'), 'utf8'));
const T = globalThis.TOY, tk = T.makeTasks(T.CFG, 3), r = T.rng(99), cases = [];
const W = Float64Array.from(tk.W0); for (let i = 0; i < W.length; i++) W[i] += 0.3 * r.n();
for (const [x, Tm] of [[0, 1], [5, 0.7], [17, 1.5], [42, 1.2]]) {
  const P = T.probs(W, tk, x, Tm), g = T.group(P, tk.correct[x], 8, r), m = g.succ.reduce((a, b) => a + b, 0) / 8, adv = g.succ.map(v => v - m + 0.25 * r.n());
  const W1 = Float64Array.from(W); T.pgStep(W1, tk, x, P, g.acts, adv, Tm, 1.0);
  cases.push({ x, T: Tm, phi: Array.from(tk.phi[x]), P: P.map(z => Array.from(z)), acts: g.acts, adv, grad: Array.from(W1).map((v, i) => v - W[i]), pS: T.pSucc(W, tk, x, Tm) });
}
const temps = []; for (const pv of [0.25, 0.3536, 0.5]) for (const tau of [1.2, 1.5]) for (let p = 0; p <= 1.0001; p += 0.05) temps.push([p, pv, tau, T.tempFromP(p, pv, tau, 1)]);
const piv = [0, 50, 100, 199, 200].map(s => [s, T.pivotAt(s, 200, 0.25, 0.5)]);
const counts = Array.from({ length: 50 }, () => Math.floor(r.u() * 129)), cv = T.curves(counts, 128, 128), sc = T.scal(cv.cov, 128);
// Beta sampler: moments of 200,000 draws from three posteriors PTGS actually forms
const beta = [[0.5, 1.5], [1.4616, 48.8045], [33.4532, 16.8128]].map(([a, b]) => { const rr = T.rng(5); let s = 0, s2 = 0; const N = 200000; for (let i = 0; i < N; i++) { const v = rr.beta(a, b); s += v; s2 += v * v } return { a, b, mean: s / N, var: s2 / N - (s / N) ** 2 } });
const W2 = Float64Array.from(W);
console.log(JSON.stringify({ W: Array.from(W), dims: [T.CFG.L, T.CFG.A, tk.d], cases, temps, piv, counts, cov: Array.from(cv.cov), con: Array.from(cv.con), A: sc.A, S: sc.S, beta }));
