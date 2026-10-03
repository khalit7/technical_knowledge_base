// ---- The toy pretraining run (also run by node in toy_sweep.mjs and check_engine.mjs) ----
// A student MLP (16 -> 24 tanh -> 8 softmax, 608 parameters) learns a fixed noisy teacher (16 -> 32 tanh -> 8, labels
// sampled from its softmax) from an endless stream of fresh batches, with Adam (beta 0.9 / 0.95 as the paper's AdamW,
// no weight decay). Held-out loss is the exact excess cross-entropy over the teacher's own entropy on 1,024 fixed inputs,
// so 0 is perfect. The data stream depends only on (seed, step): every branch sees the same batches at the same step,
// as the paper's WSD and WSM branches do.
(function (GL) {
function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
const D = 16, HT = 32, K = 8, H = 24, NP = H * D + H + K * H + K;
function makeTeacher(seed, temp) {
  const r = rng(seed), W1 = new Float64Array(HT * D), b1 = new Float64Array(HT), W2 = new Float64Array(K * HT);
  for (let i = 0; i < W1.length; i++) W1[i] = gauss(r) * 1.5 / Math.sqrt(D);
  for (let i = 0; i < HT; i++) b1[i] = gauss(r) * 0.5;
  for (let i = 0; i < W2.length; i++) W2[i] = gauss(r) * 2 / Math.sqrt(HT);
  return function (x) { const h = new Float64Array(HT); for (let j = 0; j < HT; j++) { let s = b1[j]; for (let i = 0; i < D; i++) s += W1[j * D + i] * x[i]; h[j] = Math.tanh(s); }
    const z = new Float64Array(K); let m = -1e9; for (let k = 0; k < K; k++) { let s = 0; for (let j = 0; j < HT; j++) s += W2[k * HT + j] * h[j]; z[k] = s / temp; if (z[k] > m) m = z[k]; }
    let S = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - m); S += z[k]; } for (let k = 0; k < K; k++) z[k] /= S; return z; };
}
function initParams(seed) { const r = rng(seed * 7 + 3), p = new Float64Array(NP); let o = 0;
  for (let i = 0; i < H * D; i++) p[o++] = gauss(r) / Math.sqrt(D); o += H; for (let i = 0; i < K * H; i++) p[o++] = gauss(r) / Math.sqrt(H); return p; }
function forward(p, x, h, q) {
  for (let j = 0; j < H; j++) { let s = p[H * D + j]; for (let i = 0; i < D; i++) s += p[j * D + i] * x[i]; h[j] = Math.tanh(s); }
  const o2 = H * D + H, ob = o2 + K * H; let m = -1e9;
  for (let k = 0; k < K; k++) { let s = p[ob + k]; for (let j = 0; j < H; j++) s += p[o2 + k * H + j] * h[j]; q[k] = s; if (s > m) m = s; }
  let S = 0; for (let k = 0; k < K; k++) { q[k] = Math.exp(q[k] - m); S += q[k]; } for (let k = 0; k < K; k++) q[k] /= S;
}
const TEMP = 0.6, NEVAL = 1024;
let TASK = null;
function task() { if (TASK) return TASK;
  const teacher = makeTeacher(7, TEMP), ev = [], er = rng(424242);
  for (let n = 0; n < NEVAL; n++) { const x = new Float64Array(D); for (let i = 0; i < D; i++) x[i] = gauss(er); ev.push([x, teacher(x)]); }
  let ent = 0; for (const [, pt] of ev) for (let k = 0; k < K; k++) if (pt[k] > 0) ent -= pt[k] * Math.log(pt[k]); ent /= ev.length;
  function batch(seed, step, B) { const r = rng((seed * 1000003 + step * 7919 + 13) >>> 0), xs = [], ys = [];
    for (let n = 0; n < B; n++) { const x = new Float64Array(D); for (let i = 0; i < D; i++) x[i] = gauss(r); const pt = teacher(x); let u = r(), y = 0, c = pt[0]; while (u > c && y < K - 1) { y++; c += pt[y]; } xs.push(x); ys.push(y); }
    return [xs, ys]; }
  function excess(p) { const h = new Float64Array(H), q = new Float64Array(K); let L = 0;
    for (const [x, pt] of ev) { forward(p, x, h, q); for (let k = 0; k < K; k++) L -= pt[k] * Math.log(q[k] + 1e-300); } return L / ev.length - ent; }
  return (TASK = { batch, excess, entropy: ent });
}
function gradBatch(p, xs, ys, g) { g.fill(0); const h = new Float64Array(H), q = new Float64Array(K), dh = new Float64Array(H), o2 = H * D + H, ob = o2 + K * H, B = xs.length; let L = 0;
  for (let n = 0; n < B; n++) { const x = xs[n]; forward(p, x, h, q); L -= Math.log(q[ys[n]]); q[ys[n]] -= 1; dh.fill(0);
    for (let k = 0; k < K; k++) { const d = q[k] / B; g[ob + k] += d; for (let j = 0; j < H; j++) { g[o2 + k * H + j] += d * h[j]; dh[j] += d * p[o2 + k * H + j]; } }
    for (let j = 0; j < H; j++) { const d = dh[j] * (1 - h[j] * h[j]); g[H * D + j] += d; for (let i = 0; i < D; i++) g[j * D + i] += d * x[i]; } }
  return L / B; }
const makeOpt = () => ({ m: new Float64Array(NP), v: new Float64Array(NP), t: 0 });
const cloneSt = s => ({ p: s.p.slice(), opt: { m: s.opt.m.slice(), v: s.opt.v.slice(), t: s.opt.t } });
function adamStep(p, g, o, lr) { o.t++; const b1 = 0.9, b2 = 0.95, c1 = 1 - Math.pow(b1, o.t), c2 = 1 - Math.pow(b2, o.t);
  for (let i = 0; i < NP; i++) { o.m[i] = b1 * o.m[i] + (1 - b1) * g[i]; o.v[i] = b2 * o.v[i] + (1 - b2) * g[i] * g[i]; p[i] -= lr * (o.m[i] / c1) / (Math.sqrt(o.v[i] / c2) + 1e-8); } }
const G0 = new Float64Array(NP);
function step(st, seed, s, lr, B) { const [xs, ys] = task().batch(seed, s, B); const L = gradBatch(st.p, xs, ys, G0); adamStep(st.p, G0, st.opt, lr); return L; }
// Decay shapes w(t), t in [0, 1]: the gradient coefficient (fraction of peak LR) at progress t (Figure 2's four curves)
const SHAPES = { mean: t => 1 - t, '1-sqrt': t => 1 - Math.sqrt(t), cosine: t => (1 + Math.cos(Math.PI * t)) / 2, ema: t => 1 - Math.pow(0.1, 1 - t) };
// Theorem 3.1: merge weights c_0..c_{n-1} for n checkpoints, from w_i = shape(i / n), i = 1..n-1
function mergeWeights(shape, n) { const k = n - 1, w = []; for (let i = 1; i <= k; i++) w.push(SHAPES[shape](i / n));
  const c = new Array(n).fill(0); if (k === 0) { c[0] = 1; return c; } c[k] = w[k - 1]; for (let j = 1; j < k; j++) c[j] = w[j - 1] - w[j]; c[0] = 1 - w[0]; return c; }
function merge(cks, c) { const m = new Float64Array(NP); for (let j = 0; j < cks.length; j++) { const a = cks[j], cj = c[j]; for (let i = 0; i < NP; i++) m[i] += cj * a[i]; } return m; }
// The experiment: shared constant-LR pretraining to S0, then a WSD branch (decay over DUR steps) against WSM (LR stays
// flat, a checkpoint every CK steps, merges of the last n). Every number is measured, nothing fitted.
const DEF = { seed: 1, peak: 5e-3, B: 16, warm: 200, S0: 8000, DUR: 1600, EXT: 2000, CK: 100, FINE: 20, windows: [2, 4, 8, 12, 16, 20], methods: ['mean', '1-sqrt', 'ema', 'cosine'], wsd: ['1-sqrt', 'mean', 'cosine'] };
function* experiment(o) {
  o = Object.assign({}, DEF, o || {}); const T = task(), seed = o.seed, lrc = s => s < o.warm ? o.peak * (s + 1) / o.warm : o.peak;
  const R = { cfg: { seed, peak: o.peak, B: o.B, S0: o.S0, DUR: o.DUR, EXT: o.EXT, CK: o.CK }, pre: [], cons: [], wsd: {}, merge: {}, gran: [], equiv: [] };
  const st = { p: initParams(seed), opt: makeOpt() };
  for (let s = 0; s < o.S0; s++) { step(st, seed, s, lrc(s), o.B); if ((s + 1) % 500 === 0) { R.pre.push([s + 1, T.excess(st.p)]); yield 0.25 * (s + 1) / o.S0; } }
  const base = cloneSt(st);
  // WSM branch: LR stays at peak; fine checkpoints every FINE steps (index 0 = the branch point)
  const fine = [st.p.slice()], states = { 0: cloneSt(st) };
  for (let s = 0; s < o.EXT; s++) { step(st, seed, o.S0 + s, o.peak, o.B); const b = s + 1;
    if (b % o.FINE === 0) fine.push(st.p.slice()); if (b % o.CK === 0) { R.cons.push([b, T.excess(st.p)]); if (b <= o.DUR) states[b] = cloneSt(st); }
    if (b % 200 === 0) yield 0.25 + 0.2 * b / o.EXT; }
  const ck = b => fine[b / o.FINE];
  // WSD branches: same batches, LR decays from peak to 0 over DUR steps with each shape
  for (const sh of o.wsd) { const w = cloneSt(base), out = [];
    for (let s = 0; s < o.DUR; s++) { step(w, seed, o.S0 + s, o.peak * SHAPES[sh]((s + 1) / o.DUR), o.B); if ((s + 1) % o.CK === 0) out.push([s + 1, T.excess(w.p)]); }
    R.wsd[sh] = out; yield 0.45 + 0.15 * (o.wsd.indexOf(sh) + 1) / o.wsd.length; }
  // merges of the last n checkpoints (spaced CK), only checkpoints from inside the branch, as Figure 3 and 4
  for (const m of o.methods) { R.merge[m] = {};
    for (const n of o.windows) { const out = [];
      for (let b = n * o.CK; b <= o.EXT; b += o.CK) { const cks = []; for (let j = n - 1; j >= 0; j--) cks.push(ck(b - j * o.CK)); out.push([b, T.excess(merge(cks, mergeWeights(m, n)))]); }
      R.merge[m][n] = out; }
    yield 0.6 + 0.2 * (o.methods.indexOf(m) + 1) / o.methods.length; }
  // Table 4 analogue: an 80B-equivalent duration (320 steps) ending at DUR, merged at five granularities (mean)
  for (const [iv, n] of [[20, 16], [40, 8], [80, 4], [160, 2], [320, 1]]) { const cks = []; for (let j = n - 1; j >= 0; j--) cks.push(ck(o.DUR - j * iv)); R.gran.push([iv, n, T.excess(merge(cks, mergeWeights('mean', n)))]); }
  // Equivalence test (Eq. 4): the merge of the last n checkpoints against a real run from the oldest of them with LR = peak x w_i
  for (const [m, n] of [["mean", 4], ["mean", 8], ["mean", 16], ["1-sqrt", 16], ["cosine", 16], ["ema", 16]]) {
    const b0 = o.DUR - (n - 1) * o.CK; if (!states[b0] && b0 !== 0) continue;
    const w = cloneSt(states[b0]), c = mergeWeights(m, n), wi = []; for (let i = 1; i < n; i++) { let s = 0; for (let j = i; j < n; j++) s += c[j]; wi.push(s); }
    for (let s = 0; s < (n - 1) * o.CK; s++) step(w, seed, o.S0 + b0 + s, o.peak * wi[Math.floor(s / o.CK)], o.B);
    const cks = []; for (let j = n - 1; j >= 0; j--) cks.push(ck(o.DUR - j * o.CK)); const mg = merge(cks, c);
    let d2 = 0, n2 = 0, mv = 0; for (let i = 0; i < NP; i++) { d2 += (mg[i] - w.p[i]) ** 2; mv += (mg[i] - ck(b0)[i]) ** 2; }
    R.equiv.push({ m, n, from: b0, merged: T.excess(mg), decayRun: T.excess(w.p), dist: Math.sqrt(d2), moved: Math.sqrt(mv) }); }
  yield 1; return R;
}
function runAll(o) { const it = experiment(o); let r; while (!(r = it.next()).done); return r.value; }
GL.TOY = { rng, gauss, task, initParams, forward, gradBatch, adamStep, makeOpt, cloneSt, step, SHAPES, mergeWeights, merge, experiment, runAll, DEF, NP, D, H, K, TEMP, NEVAL };
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.TOY;
