// The toy engine: a two-token distillation task with exact token-level forward and reverse KL, the paper's
// rollout-policy spectrum (Section 5.2, Appendix D.5) and Adam with global-norm clipping (Table 3).
// Runs in the browser (window.OPD) and in node (module.exports), so toy_sweep.mjs and check_engine.mjs use this file.
(function (root) {
  'use strict';
  var P = 12, K = 5, A = 5;                    // prompts, routes (first token), answers (second token)
  var ALPHA = 0.2, CLIP = 2 * Math.log(3);     // Appendix D.5: plausibility mask alpha, log-ratio clip c
  function rng(seed) {                          // mulberry32
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function logsoftmax(z, T) {
    var n = z.length, m = -Infinity, i, out = new Array(n), s = 0;
    for (i = 0; i < n; i++) m = Math.max(m, z[i] / T);
    for (i = 0; i < n; i++) s += Math.exp(z[i] / T - m);
    var ls = m + Math.log(s);
    for (i = 0; i < n; i++) out[i] = z[i] / T - ls;
    return out;
  }
  function softmax(z, T) { return logsoftmax(z, T || 1).map(Math.exp); }

  // The world: a fixed teacher and the student's starting logits. Teacher logits are divided by its temperature
  // 0.5 and the student's by 1.0, as in the paper (Appendix D.2.2).
  function world(seed) {
    var r = rng(seed), p, k, a, W = { P: P, K: K, A: A, tT: 0.5, tS: 1.0, troutes: [], habit: [], correct: [], zT1: [], zT2: [], zS1: [], zS2: [] };
    for (p = 0; p < P; p++) {
      var perm = [0, 1, 2, 3, 4];
      for (k = K - 1; k > 0; k--) { var j = Math.floor(r() * (k + 1)), t = perm[k]; perm[k] = perm[j]; perm[j] = t; }
      var tA = perm[0], tB = perm[1], h = perm[2];
      W.troutes.push([tA, tB]); W.habit.push(h);
      var c = [], zt1 = [], zs1 = [], zt2 = [], zs2 = [];
      for (k = 0; k < K; k++) c.push(Math.floor(r() * A));
      for (k = 0; k < K; k++) {
        zt1.push(0.5 * gauss(r) + (k === tA ? 2.0 : k === tB ? 1.4 : 0));
        zs1.push(0.5 * gauss(r) + (k === h ? 2.0 : 0));
        var rt = [], rs = [];
        for (a = 0; a < A; a++) {
          rt.push(0.5 * gauss(r) + (a === c[k] ? (k === tA || k === tB ? 2.0 : 1.0) : 0));
          rs.push(0.7 * gauss(r) + (a === c[k] && k === h ? 0.8 : 0));
        }
        zt2.push(rt); zs2.push(rs);
      }
      W.correct.push(c); W.zT1.push(zt1); W.zS1.push(zs1); W.zT2.push(zt2); W.zS2.push(zs2);
    }
    return W;
  }
  // Two students. 'table': one free logit per (prefix, token) (run 1 of the design log). 'mlp': the shared-parameter
  // student used on the page: x = one-hot(prompt) + one-hot(route, or a start slot), h = tanh(W1 x + b1),
  // route logits = Wr h + br at the empty prefix, answer logits = Wa h + ba after a route.
  var H = 6, NIN = P + K + 1;
  var NMLP = H * NIN + H + K * H + K + A * H + A;
  function mlpIdx() { var o = 0, r = {}; r.W1 = o; o += H * NIN; r.b1 = o; o += H; r.Wr = o; o += K * H; r.br = o; o += K; r.Wa = o; o += A * H; r.ba = o; o += A; r.n = o; return r; }
  var MI = mlpIdx();
  function hidden(th, p, k) {
    var h = new Array(H), j;
    for (j = 0; j < H; j++) { var a = th[MI.b1 + j] + th[MI.W1 + j * NIN + p] + th[MI.W1 + j * NIN + P + (k < 0 ? K : k)]; h[j] = Math.tanh(a); }
    return h;
  }
  function logitsS(W, M, th, p, k) {           // k = -1: the route position; otherwise the answer position after route k
    if (M === 'table') { if (k < 0) return th.slice(p * K, p * K + K); var o = P * K + (p * K + k) * A; return th.slice(o, o + A); }
    var h = hidden(th, p, k), n = k < 0 ? K : A, Wo = k < 0 ? MI.Wr : MI.Wa, bo = k < 0 ? MI.br : MI.ba, z = new Array(n), i, j;
    for (i = 0; i < n; i++) { var s = th[bo + i]; for (j = 0; j < H; j++) s += th[Wo + i * H + j] * h[j]; z[i] = s; }
    return z;
  }
  function addGrad(W, M, th, p, k, gz, sc, G) {   // G += sc * d(logits)/d(theta)^T gz
    var i, j;
    if (M === 'table') { var o = k < 0 ? p * K : P * K + (p * K + k) * A; for (i = 0; i < gz.length; i++) G[o + i] += sc * gz[i]; return; }
    var h = hidden(th, p, k), n = gz.length, Wo = k < 0 ? MI.Wr : MI.Wa, bo = k < 0 ? MI.br : MI.ba, gh = new Array(H).fill(0);
    for (i = 0; i < n; i++) { G[bo + i] += sc * gz[i]; for (j = 0; j < H; j++) { G[Wo + i * H + j] += sc * gz[i] * h[j]; gh[j] += gz[i] * th[Wo + i * H + j]; } }
    for (j = 0; j < H; j++) { var ga = sc * gh[j] * (1 - h[j] * h[j]); G[MI.b1 + j] += ga; G[MI.W1 + j * NIN + p] += ga; G[MI.W1 + j * NIN + P + (k < 0 ? K : k)] += ga; }
  }
  function nParams(M) { return M === 'table' ? P * K + P * K * A : NMLP; }
  function tableTheta(W) { var o = []; W.zS1.forEach(function (r) { o.push.apply(o, r); }); W.zS2.forEach(function (r) { r.forEach(function (x) { o.push.apply(o, x); }); }); return o; }
  // The mlp student's starting point: fitted to the table student's distributions (forward KL over every prefix).
  var MLP0 = null;
  function initTheta(W, M) {
    if (M === 'table') return tableTheta(W);
    if (MLP0 && MLP0.W === W) return MLP0.th.slice();
    var r = rng(7), th = new Array(NMLP), i, n = NMLP;
    for (i = 0; i < n; i++) th[i] = 0.5 * gauss(r);
    var m = new Array(n).fill(0), v = new Array(n).fill(0);
    for (var s = 1; s <= 400; s++) {
      var G = new Array(n).fill(0), p, k;
      for (p = 0; p < P; p++) {
        addGrad(W, 'mlp', th, p, -1, gradLogits('f', logsoftmax(logitsS(W, 'mlp', th, p, -1), 1), logsoftmax(W.zS1[p], W.tS)), 1 / P, G);
        for (k = 0; k < K; k++) addGrad(W, 'mlp', th, p, k, gradLogits('f', logsoftmax(logitsS(W, 'mlp', th, p, k), 1), logsoftmax(W.zS2[p][k], W.tS)), 1 / P / K, G);
      }
      adam(th, G, m, v, s, 0.05);
    }
    MLP0 = { W: W, th: th.slice() };
    return th;
  }
  function adam(th, g, m, v, s, eta) {
    var c1 = 1 - Math.pow(0.9, s), c2 = 1 - Math.pow(0.999, s);
    for (var i = 0; i < th.length; i++) { m[i] = 0.9 * m[i] + 0.1 * g[i]; v[i] = 0.999 * v[i] + 0.001 * g[i] * g[i]; th[i] -= eta * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-8); }
  }

  // Token-level divergences over the full vocabulary and their gradients with respect to the student logits
  // (Eq. 4 and 5; Appendix B): forward KL(T||S) -> pS - pT ; reverse KL(S||T) -> pS * (log pS/pT - D).
  function kl(kind, lS, lT) {
    var d = 0, i;
    if (kind === 'f') for (i = 0; i < lS.length; i++) d += Math.exp(lT[i]) * (lT[i] - lS[i]);
    else for (i = 0; i < lS.length; i++) d += Math.exp(lS[i]) * (lS[i] - lT[i]);
    return d;
  }
  function gradLogits(kind, lS, lT) {
    var n = lS.length, g = new Array(n), i;
    if (kind === 'f') { for (i = 0; i < n; i++) g[i] = Math.exp(lS[i]) - Math.exp(lT[i]); return g; }
    var D = kl('r', lS, lT);
    for (i = 0; i < n; i++) g[i] = Math.exp(lS[i]) * (lS[i] - lT[i] - D);
    return g;
  }

  // The rollout-policy spectrum (Section 5.2; Appendix D.5, Eq. 75 to 80): lambda -1 is the teacher, +1 the student.
  function lambdaLogits(lS, lT, lam) {
    var n = lS.length, z = new Array(n), i;
    if (Math.abs(lam) <= 1) { for (i = 0; i < n; i++) z[i] = (1 + lam) / 2 * lS[i] + (1 - lam) / 2 * lT[i]; return z; }
    var mS = Math.max.apply(null, lS), mT = Math.max.apply(null, lT);
    for (i = 0; i < n; i++) {
      var rv = lS[i] - lT[i];
      if (lam > 1) { var bS = (lS[i] >= mS + Math.log(ALPHA)) ? Math.min(Math.max(rv, 0), CLIP) : 0; z[i] = lS[i] + (lam - 1) / 2 * bS; }
      else { var bT = (lT[i] >= mT + Math.log(ALPHA)) ? Math.min(Math.max(-rv, 0), CLIP) : 0; z[i] = lT[i] + (-lam - 1) / 2 * bT; }
    }
    return z;
  }
  function lambdaProbs(lS, lT, lam) { return softmax(lambdaLogits(lS, lT, lam), 1); }

  function logS1(W, M, th, p) { return logsoftmax(logitsS(W, M, th, p, -1), W.tS); }
  function logT1(W, p) { return logsoftmax(W.zT1[p], W.tT); }
  function logS2(W, M, th, p, k) { return logsoftmax(logitsS(W, M, th, p, k), W.tS); }
  function logT2(W, p, k) { return logsoftmax(W.zT2[p][k], W.tT); }
  function sample(pr, u) { var c = 0; for (var i = 0; i < pr.length; i++) { c += pr[i]; if (u < c) return i; } return pr.length - 1; }

  // Sample one batch of rollout prefixes: prompt uniform, first token from pi_lambda at the empty prefix.
  // Gradients are stopped through sampling (the semi-gradient of Appendix C, Eq. 19).
  function batch(W, M, th, lam, B, r) {
    var out = [];
    for (var b = 0; b < B; b++) {
      var p = Math.floor(r() * P);
      var y1 = sample(lambdaProbs(logS1(W, M, th, p), logT1(W, p), lam), r());
      out.push([p, y1]);
    }
    return out;
  }
  // Loss and gradient on a batch: mean over rollouts of (1/L)(D at position 1 + D at position 2), L = 2.
  function lossGrad(W, M, th, kind, bt) {
    var G = new Array(nParams(M)).fill(0), loss = 0, B = bt.length;
    bt.forEach(function (e) {
      var p = e[0], k = e[1];
      var l1S = logS1(W, M, th, p), l1T = logT1(W, p), l2S = logS2(W, M, th, p, k), l2T = logT2(W, p, k);
      loss += (kl(kind, l1S, l1T) + kl(kind, l2S, l2T)) / 2 / B;
      addGrad(W, M, th, p, -1, gradLogits(kind, l1S, l1T), 1 / W.tS / 2 / B, G);
      addGrad(W, M, th, p, k, gradLogits(kind, l2S, l2T), 1 / W.tS / 2 / B, G);
    });
    return { loss: loss, g: G };
  }
  // Exact expected semi-gradient under pi_lambda (every prompt, every first token, weighted by its probability).
  function expectedGrad(W, M, th, kind, lam) {
    var G = new Array(nParams(M)).fill(0), p, k;
    for (p = 0; p < P; p++) {
      var l1S = logS1(W, M, th, p), l1T = logT1(W, p), pr = lambdaProbs(l1S, l1T, lam);
      addGrad(W, M, th, p, -1, gradLogits(kind, l1S, l1T), 1 / W.tS / 2 / P, G);
      for (k = 0; k < K; k++) addGrad(W, M, th, p, k, gradLogits(kind, logS2(W, M, th, p, k), logT2(W, p, k)), pr[k] / W.tS / 2 / P, G);
    }
    return G;
  }
  // Total-variation distance between the sequence distributions two rollout policies induce, averaged over prompts
  // (Theorem C.1 uses exactly this distance). Second tokens are drawn from pi_lambda at the same lambda.
  function seqDist(W, M, th, lam, p) {
    var pr = lambdaProbs(logS1(W, M, th, p), logT1(W, p), lam), out = [];
    for (var k = 0; k < K; k++) { var p2 = lambdaProbs(logS2(W, M, th, p, k), logT2(W, p, k), lam); for (var a = 0; a < A; a++) out.push(pr[k] * p2[a]); }
    return out;
  }
  function seqTV(W, M, th, lamA, lamB) {
    var s = 0;
    for (var p = 0; p < P; p++) { var x = seqDist(W, M, th, lamA, p), y = seqDist(W, M, th, lamB, p), t = 0; for (var i = 0; i < x.length; i++) t += Math.abs(x[i] - y[i]); s += t / 2; }
    return s / P;
  }
  function norm(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i] * v[i]; return Math.sqrt(s); }
  function diffNorm(x, y) { var s = 0; for (var i = 0; i < x.length; i++) s += (x[i] - y[i]) * (x[i] - y[i]); return Math.sqrt(s); }

  // Evaluation, exact: the student samples a route then an answer at temperature T (logits divided by T).
  function evalLogits(W, f, T) {
    var acc = 0, p10 = 0, dist = 0, ent = 0, p, k, routes = [];
    for (p = 0; p < P; p++) {
      var pr = softmax(f(p, -1), T), a = 0, d = 0, e = 0, pc = [];
      for (k = 0; k < K; k++) {
        var c = softmax(f(p, k), T)[W.correct[p][k]]; pc.push(c);
        a += pr[k] * c; d += 1 - Math.pow(1 - pr[k] * c, 10);
        if (pr[k] > 0) e -= pr[k] * Math.log(pr[k]);
      }
      acc += a / P; p10 += (1 - Math.pow(1 - a, 10)) / P; dist += d / P; ent += e / P; routes.push({ route: pr, right: pc });
    }
    return { pass1: acc, pass10: p10, distinct10: dist, routeEntropy: ent, routes: routes };
  }
  function evaluate(W, M, th, T) { return evalLogits(W, function (p, k) { return logitsS(W, M, th, p, k).map(function (z) { return z / W.tS; }); }, T); }
  function teacherEval(W, T) { return evalLogits(W, function (p, k) { return (k < 0 ? W.zT1[p] : W.zT2[p][k]).map(function (z) { return z / W.tT; }); }, T); }

  // One training run: Adam (beta 0.9, 0.999, eps 1e-8, no weight decay), constant learning rate after 10 linear
  // warm-up steps, global gradient-norm clipping at 1.0 (Table 3), B rollouts per step, fresh rollouts every step.
  function train(W, opt) {
    var M = opt.model || 'mlp', kind = opt.kind, lam = opt.lam, lr = opt.lr, steps = opt.steps || 150, B = opt.B || 32, clip = opt.clip === undefined ? 1.0 : opt.clip;
    var r = rng(opt.seed), th = initTheta(W, M), n = th.length, m = new Array(n).fill(0), v = new Array(n).fill(0), log = [], s, i;
    for (s = 1; s <= steps; s++) {
      var bt = batch(W, M, th, lam, B, r), lg = lossGrad(W, M, th, kind, bt), g = lg.g, gn = norm(g);
      if (clip && gn > clip) for (i = 0; i < n; i++) g[i] *= clip / gn;
      adam(th, g, m, v, s, lr * Math.min(1, s / 10));
      if (opt.logEvery && (s % opt.logEvery === 0 || s === 1)) log.push([s, lg.loss, gn, evaluate(W, M, th, 1).pass1]);
      if (opt.onStep) opt.onStep(s, th);
    }
    return { theta: th, log: log };
  }

  var OPD = { P: P, K: K, A: A, H: H, ALPHA: ALPHA, CLIP: CLIP, rng: rng, world: world, initTheta: initTheta, nParams: nParams, logitsS: logitsS, addGrad: addGrad,
    softmax: softmax, logsoftmax: logsoftmax, kl: kl, gradLogits: gradLogits, lambdaLogits: lambdaLogits, lambdaProbs: lambdaProbs,
    logS1: logS1, logT1: logT1, logS2: logS2, logT2: logT2, batch: batch, lossGrad: lossGrad, expectedGrad: expectedGrad, seqTV: seqTV, seqDist: seqDist,
    norm: norm, diffNorm: diffNorm, evaluate: evaluate, teacherEval: teacherEval, train: train };
  if (typeof module !== 'undefined' && module.exports) module.exports = OPD; else root.OPD = OPD;
})(typeof window !== 'undefined' ? window : this);
