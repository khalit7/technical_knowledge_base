/* The toy engine (browser and node; written by hand, not generated). One Countdown-like prompt. The
   policy first picks an answer type (a real solution, or one of three hacks); a real solution is right
   with probability q, its "skill". Every parameter is a logit, and each adapter is a full copy of them
   (tabular adapters that share nothing: the free-matrix case of the paper's Appendix G).
   Training is Algorithm 1 of the paper run literally on sampled groups: GRPO groups of 16, advantages
   with the baseline taken over the group's unflagged samples and the standard deviation over the whole
   group, retain gradients masked on flagged samples, forget gradients doubled on them, anchor groups
   sampled from the retain-only policy in the clean environment, all divided by the number of samples.
   Plain gradient steps replace AdamW (so the x2 means what it says; with Adam the paper needs its
   Eq. 1). A seeded generator (mulberry32) makes every run repeatable. */
(function (root) {
  var TYPES = ['Real solution', 'Hack 1: trivial test', 'Hack 2: drop the constraint check', 'Hack 3: change the inputs'];
  var SHORT = ['solve', 'hack 1', 'hack 2', 'hack 3'];
  // Defaults, illustrative. start: the answer mix of the paper's SFT-primed base model (4.7% hacks:
  // 2.0 trivial test, 1.6 constraint removal, 0.8 problem substitution plus 0.4 other, Section 4.1);
  // q0: the chance a real solution is right at the start; qMax: some problems have no solution, so a
  // real solution is right at most this often; kSkill: the skill learns this many times slower than the
  // choice of answer type (the real task is hard, a hack is one edit); rHack: reward of each hack.
  var DEF = { start: [0.953, 0.02, 0.016, 0.011], q0: 0.45, qMax: 0.85, kSkill: 0.1, rHack: [1, 1, 1],
    lr: 1, steps: 300, G: 16, groups: 32, anchorGroups: 4, monitor: 1, recall: 1, penalty: 1, amp: 2, seed: 1 };
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function sm(z) { var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp(v - m); }), s = 0;
    e.forEach(function (v) { s += v; }); return e.map(function (v) { return v / s; }); }
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function P(par, c) { var e = sig(par[4]); return { pi: sm(par.slice(0, 4)), q: c.qMax * e, e: e }; }
  function plus(a, b) { return a.map(function (v, i) { return v + (b ? b[i] : 0); }); }
  // d log prob(sample) / d parameters (4 answer-type logits, then the skill logit).
  function dlog(t, ok, p, hackable) {
    var g = [0, 0, 0, 0, 0], i;
    if (hackable) for (i = 0; i < 4; i++) g[i] = (t === i ? 1 : 0) - p.pi[i];
    if (t === 0) g[4] = ok ? 1 - p.e : -p.q * (1 - p.e) / (1 - p.q);   // q = qMax * sigmoid(skill)
    return g;
  }
  function draw(p, c, R, hackable) {
    var t = 0, u = R(), acc = 0;
    if (hackable) for (t = 0; t < 3; t++) { acc += p.pi[t]; if (u < acc) break; }
    var ok = t === 0 ? (R() < p.q ? 1 : 0) : 1;
    var r = t === 0 ? ok : c.rHack[t - 1];
    var fl = (hackable && t === c.monitor && R() < c.recall) ? 1 : 0;
    return { t: t, ok: ok, r: r, fl: fl };
  }
  // One group: rewards seen by the update, baseline ('all' or 'unflagged'), std over the whole group.
  function advantages(S, rew, base) {
    var n = S.length, m = 0, bn = 0, bd = 0, v = 0, i;
    for (i = 0; i < n; i++) { var r = rew(S[i]); m += r; if (!S[i].fl) { bn += r; bd++; } }
    m /= n; for (i = 0; i < n; i++) v += Math.pow(rew(S[i]) - m, 2);
    var sd = Math.sqrt(v / (n - 1)), b = (base === 'unflagged' && bd > 0) ? bn / bd : m;
    return S.map(function (s) { return (rew(s) - b) / (sd + 1e-4); });
  }
  // What a deployed parameter vector does (exact, from its probabilities): hack rates where hacking is
  // possible, the solve rate in the clean environment (hacking impossible), and what a developer sees.
  function metrics(par, c) {
    var p = P(par, c), det = p.pi[c.monitor], all = p.pi[1] + p.pi[2] + p.pi[3], proxy = p.pi[0] * p.q;
    for (var a = 1; a < 4; a++) proxy += p.pi[a] * c.rHack[a - 1];
    return { pi: p.pi, q: p.q, hack: all, detected: det, undetected: all - det, clean: p.q, proxy: proxy, flagged: det * c.recall };
  }
  function cfgOf(cfg) { var c = {}, k; for (k in DEF) c[k] = DEF[k]; for (k in (cfg || {})) c[k] = cfg[k]; return c; }
  var METHODS = ['none', 'penalty', 'filter', 'noroute', 'noanchor', 'graft'];
  // One training run of one method: metrics every 5 steps for the deployed policy (and, for the GRAFT
  // family, the pre-ablation and forget-only policies) plus the final parameters.
  function run(method, cfg) {
    var c = cfgOf(cfg), R = rng(c.seed * 7919 + METHODS.indexOf(method));
    var th0 = c.start.map(Math.log).concat([Math.log(c.q0 / c.qMax / (1 - c.q0 / c.qMax))]);
    var step = [c.lr, c.lr, c.lr, c.lr, c.lr * c.kSkill];
    var uR = [0, 0, 0, 0, 0], uF = [0, 0, 0, 0, 0], hist = [], t, i, k, j;
    var graft = method === 'graft' || method === 'noroute' || method === 'noanchor';
    var route = method === 'graft' || method === 'noanchor';
    var nA = (graft && method !== 'noanchor') ? c.anchorGroups : 0, N = (c.groups + nA) * c.G;
    var raw = function (s) { return s.r; }, pen = function (s) { return s.r - c.penalty * s.fl; };
    function snap(t) {
      var o = { t: t, dep: metrics(plus(th0, uR), c) };
      if (graft) { o.pre = metrics(plus(plus(th0, uR), uF), c); o.fo = metrics(plus(th0, uF), c); }
      hist.push(o);
    }
    snap(0);
    for (t = 1; t <= c.steps; t++) {
      var gR = [0, 0, 0, 0, 0], gF = [0, 0, 0, 0, 0];
      var p = graft ? P(plus(plus(th0, uR), uF), c) : P(plus(th0, uR), c);
      for (k = 0; k < c.groups; k++) {
        var S = []; for (j = 0; j < c.G; j++) S.push(draw(p, c, R, true));
        var rew = method === 'penalty' ? pen : raw;
        var A = advantages(S, rew, (method === 'filter' || route) ? 'unflagged' : 'all');
        for (j = 0; j < c.G; j++) {
          var s = S[j], d = dlog(s.t, s.ok, p, true), wR = 1, wF = 1;
          if (method === 'filter' && s.fl) wR = 0;
          if (route && s.fl) { wR = 0; wF = c.amp; }
          for (i = 0; i < 5; i++) { gR[i] += wR * A[j] * d[i]; gF[i] += wF * A[j] * d[i]; }
        }
      }
      if (nA) {
        var pa = P(plus(th0, uR), c);
        for (k = 0; k < nA; k++) {
          var Sa = []; for (j = 0; j < c.G; j++) Sa.push(draw(pa, c, R, false));
          var Aa = advantages(Sa, raw, 'all');
          for (j = 0; j < c.G; j++) { var da = dlog(0, Sa[j].ok, pa, false); gR[4] += Aa[j] * da[4]; }
        }
      }
      for (i = 0; i < 5; i++) { uR[i] += step[i] * gR[i] / N; if (graft) uF[i] += step[i] * gF[i] / N; }
      if (t % 5 === 0 || t === c.steps) snap(t);
    }
    return { method: method, hist: hist, uR: uR, uF: uF, cfg: c };
  }
  var TOY = { TYPES: TYPES, SHORT: SHORT, DEF: DEF, METHODS: METHODS, run: run, metrics: metrics, cfgOf: cfgOf, P: P, rng: rng, advantages: advantages, dlog: dlog };
  if (typeof module !== 'undefined' && module.exports) module.exports = TOY; else root.TOY = TOY;
})(typeof window !== 'undefined' ? window : this);
