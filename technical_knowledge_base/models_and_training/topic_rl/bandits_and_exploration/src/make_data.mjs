// Precompute the Reading tab's static figures with the page's own engine (parts/21_js_bx_engine.js), so nothing
// is computed or drawn progressively before the reader acts. Writes parts/22_js_bx_0data.js (window.BXD).
// usage (from this folder): node make_data.mjs           write the data part (about 30 s)
//                           node make_data.mjs --check   recompute and compare with the data part already written
// What it holds:
//   rg:   expected regret of greedy, epsilon-greedy (0.1), UCB1 and Thompson sampling at the regret chart's log marks,
//         200 runs of 10,000 pulls, both presets (the chart's default view; other run counts are computed live on request)
//   hero: the same four methods on the far preset at linear marks every 200 pulls (the hero figure), and the left panel's
//         three illustrative arms with their UCB1 indices and Thompson's choice probabilities
//   ab:   an A/B test (explore-then-commit: m visitors per variant, then the winner for everyone) against Thompson
//         sampling on the same two Bernoulli variants and the same reward stream, 1,000 runs; plus the exact
//         probability that the A/B test picks the wrong variant (two binomials) and the expected regret it implies,
//         m*gap + (n - 2m)*gap*P(wrong) (Lattimore and Szepesvari, eq. 6.4 with the exact probability).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis; (0, eval)(fs.readFileSync(path.resolve(here, 'parts/21_js_bx_engine.js'), 'utf8'));
const B = globalThis.BX, R = (v, d) => +v.toFixed(d);
const M = ['greedy', 'eps', 'ucb1', 'ts'], PRE = { close: [0.6, 0.5, 0.45, 0.4, 0.3], far: [0.9, 0.8, 0.6, 0.5] }, T = 10000, RUNS = 200;

function means(p, marks) {
  const o = {};
  for (const k of M) { const acc = new Float64Array(marks.length); for (let r = 0; r < RUNS; r++) B.brRun({ kind: k, eps: 0.1 }, p, T, r, marks, acc); o[k] = [...acc].map(v => R(v / RUNS, 2)) }
  return o;
}
const rgMarks = B.logMarks(T, 20), rg = {};
for (const k of Object.keys(PRE)) rg[k] = means(PRE[k], rgMarks);
const heroMarks = []; for (let t = 200; t <= T; t += 200) heroMarks.push(t);
const hero = { p: PRE.far, marks: heroMarks, m: means(PRE.far, heroMarks) };
// the hero's left panel: three arms after t = 65 pulls (illustrative counts); how often Thompson sampling would pick each,
// from 100,000 seeded draws of the three Beta(1 + wins, 1 + losses) posteriors
hero.arms = { t: 65, n: [40, 5, 20], w: [25, 2, 6] };
{ const r = B.rng(4242), c = [0, 0, 0], K = 100000, a = hero.arms;
  for (let i = 0; i < K; i++) { const v = a.n.map((n, k) => B.betaS(1 + a.w[k], 1 + n - a.w[k], r)); c[B.argmaxR(v, r)]++ }
  hero.arms.ts = c.map(v => R(v / K, 3)); hero.arms.ucb = a.n.map((n, k) => R(a.w[k] / n + Math.sqrt(2 * Math.log(a.t) / n), 3)) }

// ---- A/B test against Thompson sampling, two variants (illustrative conversion rates) ----
const AB = { p: [0.10, 0.12], n: 20000, m: 2000, runs: 1000, block: 500 };
function abRuns() {
  const { p, n, m, runs, block } = AB, gap = Math.abs(p[1] - p[0]), best = p[1] > p[0] ? 1 : 0, nb = n / block;
  const shareE = new Float64Array(nb), shareT = new Float64Array(nb), regE = new Float64Array(nb), regT = new Float64Array(nb);
  let wrong = 0, worseT_end = 0, worseT_at2m = 0;
  for (let r = 0; r < runs; r++) {
    // the same reward stream for both: visitor t converts on variant a when u_t < p[a]
    const nr = B.rng(8000000 + r), u = new Float64Array(n); for (let t = 0; t < n; t++) u[t] = nr();
    // A/B test: alternate variants for the first 2m visitors, then commit to the higher conversion count (ties by a coin)
    const S = [0, 0]; for (let t = 0; t < 2 * m; t++) { const a = t % 2; S[a] += u[t] < p[a] ? 1 : 0 }
    const c = S[1] > S[0] ? 1 : S[0] > S[1] ? 0 : (B.rng(8500000 + r)() < 0.5 ? 1 : 0); if (c !== best) wrong++;
    let re = 0; for (let t = 0; t < n; t++) { const a = t < 2 * m ? t % 2 : c; if (a !== best) { re += gap; shareE[Math.floor(t / block)] += 1 } if ((t + 1) % block === 0) regE[(t + 1) / block - 1] += re }
    // Thompson sampling, Beta(1, 1) priors
    const pr = B.rng(9000000 + r), N = [0, 0], W = [0, 0], V = [0, 0]; let rt = 0;
    for (let t = 0; t < n; t++) {
      V[0] = B.betaS(1 + W[0], 1 + N[0] - W[0], pr); V[1] = B.betaS(1 + W[1], 1 + N[1] - W[1], pr); const a = B.argmaxR(V, pr);
      N[a]++; W[a] += u[t] < p[a] ? 1 : 0; if (a !== best) { rt += gap; shareT[Math.floor(t / block)] += 1 }
      if (t + 1 === 2 * m) worseT_at2m += N[1 - best];
      if ((t + 1) % block === 0) regT[(t + 1) / block - 1] += rt;
    }
    worseT_end += N[1 - best];
  }
  const avg = (a, d) => [...a].map(v => R(v / runs / d, 4));
  return { shareE: avg(shareE, block), shareT: avg(shareT, block), regE: avg(regE, 1), regT: avg(regT, 1),
    wrong: R(wrong / runs, 3), worseT_end: R(worseT_end / runs, 0), worseT_at2m: R(worseT_at2m / runs, 0) };
}
// exact probability that the higher count belongs to the worse variant (ties split), binomial(m, p) each
function pWrong() {
  const { p, m } = AB, lf = [0]; for (let i = 1; i <= m; i++) lf[i] = lf[i - 1] + Math.log(i);
  const pmf = q => { const o = new Float64Array(m + 1); for (let k = 0; k <= m; k++) o[k] = Math.exp(lf[m] - lf[k] - lf[m - k] + k * Math.log(q) + (m - k) * Math.log(1 - q)); return o };
  const lo = pmf(Math.min(...p)), hi = pmf(Math.max(...p)); let w = 0;
  // P(hi < lo) + 0.5 P(hi = lo): sum over hi count k of P(hi = k) * (P(lo > k) + 0.5 P(lo = k))
  const tail = new Float64Array(m + 2); for (let k = m; k >= 0; k--) tail[k] = tail[k + 1] + lo[k];
  for (let k = 0; k <= m; k++) w += hi[k] * (tail[k + 1] + 0.5 * lo[k]);
  return w;
}
const ab = { ...AB, ...abRuns() }; ab.pWrongExact = R(pWrong(), 4);
const gap = Math.abs(AB.p[1] - AB.p[0]);
ab.regEExact = R(AB.m * gap + (AB.n - 2 * AB.m) * gap * ab.pWrongExact, 1);
// 95% interval half-width on the difference in conversion rates, from the samples each design holds (normal approximation)
const hw = (n0, n1) => 1.96 * Math.sqrt(AB.p[0] * (1 - AB.p[0]) / n0 + AB.p[1] * (1 - AB.p[1]) / n1);
ab.hwE = R(100 * hw(AB.m, AB.m), 2); ab.hwT_at2m = R(100 * hw(ab.worseT_at2m, 2 * AB.m - ab.worseT_at2m), 2);
ab.hwT_end = R(100 * hw(ab.worseT_end, AB.n - ab.worseT_end), 2);

const D = { rgMarks, rgRuns: RUNS, rg, hero, ab };
const file = path.resolve(here, 'parts/22_js_bx_0data.js');
const text = '// Generated by src/make_data.mjs from the page\'s engine; do not edit by hand.\nwindow.BXD=' + JSON.stringify(D) + ';\n';
if (process.argv.includes('--check')) {
  const old = fs.readFileSync(file, 'utf8'); console.log(old === text ? 'data part matches the engine: 0 differences' : 'DATA PART DIFFERS from a fresh run'); process.exit(old === text ? 0 : 1);
}
fs.writeFileSync(file, text);
console.log('wrote', path.relative(here, file), text.length, 'bytes');
console.log('rg at 10,000:', Object.fromEntries(Object.keys(rg).map(k => [k, Object.fromEntries(M.map(m => [m, rg[k][m].at(-1)]))])));
console.log('hero arms:', JSON.stringify(hero.arms));
console.log('ab:', JSON.stringify({ wrong: ab.wrong, pWrongExact: ab.pWrongExact, regE: ab.regE.at(-1), regEExact: ab.regEExact, regT: ab.regT.at(-1), worseT_at2m: ab.worseT_at2m, worseT_end: ab.worseT_end, hwE: ab.hwE, hwT_at2m: ab.hwT_at2m, hwT_end: ab.hwT_end }));
