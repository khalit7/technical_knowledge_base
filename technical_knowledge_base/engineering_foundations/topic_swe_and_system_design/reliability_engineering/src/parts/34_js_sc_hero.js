// ---- Scene: Fig. 1, the hero (stg-hero): one chat request's path (phone app, edge, our chat API with its 20 workers, the model provider) under a
// 5 s provider slowdown, without and with the defences. Numbers: the page's engine (RE.sim) on the presets "before" and "after" of section 8, and the
// measured storm (MEAS: attempts per request, retry at once against a retry budget, mean of 3 seeds). Layout is a schematic. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.RS3 || !window.RE || !window.MEAS) return;
  const { mix, lerp } = S3, { party, pool, stack, lab, win, arcPts, seg, fmt, margin } = RS3;
  const B = RE.sim(RE.P.before), A = RE.sim(RE.P.after), sum = a => a.reduce((x, y) => x + y, 0);
  const mAtt = c => sum(['1', '2', '3'].map(s => MEAS.runs[c][s].attempts_per_req)) / 3;
  const N = {
    W: RE.P.before.W, wNorm: Math.max(...B.S.wdep.slice(0, 10)), wSlow: B.S.wdep[10], qMax: Math.max(...B.S.q), fail: B.tot.fail, failB: sum(B.S.failB),
    slowX: RE.P.before.Ls / RE.P.before.Ld, attNaive: mAtt('naive'), attBudget: mAtt('budget'), aFail: A.tot.fail, aDeg: A.tot.deg, aW: Math.max(...A.S.wdep.slice(10, 16)),
    brkN: RE.P.after.brkN, maxQ: RE.P.after.maxQ, rate: RE.P.before.rate
  };
  RSN.hero = N;
  const APP = [-6.3, 0, 0], EDGE = [-4.1, 0, 0], QU = [-2.5, 0, 0], API = [-.6, 0, 0], PRO = [3.4, 0, 0], FB = [3.4, 0, 1.75];
  function draw(R, k, e) {
    // the far-left objects come back only once the camera has glided out from the close view of steps 4 and 5
    const P = R.P, V = (on, dim) => k === 6 || on.indexOf(k) >= 0 ? 1 : dim.indexOf(k) >= 0 ? .25 : 0, late = k === 5 ? S3.cl((e - .6) / .4, 0, 1) : 1;
    R.grid(-7.2, 5.2, -2.2, 2.8, .5);
    party(R, APP, [.6, .45, .6], P.c4, 'phone app', { a: V([0, 1, 2], [5]) * late, wide: 1 });
    party(R, EDGE, [.7, .65, .9], P.c1, 'edge, load balancer', { a: V([0, 6], [1, 2, 5]) * late, wide: 1, t: .18 });
    // the workers: how many wait on the provider in this step
    const busy = k === 0 ? N.wNorm : k === 1 ? Math.round(lerp(N.wNorm, N.wSlow, win(e, .1, .7))) : k === 2 ? N.wSlow : k === 3 ? Math.round(lerp(N.wSlow, N.aW, win(e, .2, .6))) : N.aW;
    pool(R, API, 5, 4, busy, k <= 2 ? P.bad : P.c4, V([0, 1, 2, 3, 4, 5], []), { plate: P.c1 });
    lab(R, [API[0], .35, API[2] - .9], 'our chat API · ' + busy + ' of ' + N.W + ' workers wait', { ph: 1, b: 1, fs: 13, dy: -14, c: k === 1 || k === 2 ? P.bad : P.ink, a: V([0, 1, 2, 3, 4, 5], []) });
    party(R, PRO, [1.1, .85, 1.0], k >= 1 && k <= 4 ? P.bad : P.c3, k >= 1 && k < 5 ? 'model provider · 3 s a call' : 'model provider', { a: V([0, 1, 2, 3, 4, 5], []), wide: 1, t: k >= 1 && k <= 4 ? .35 : .3 });
    // queue in front of the API
    const q = k === 2 ? Math.round(N.qMax * win(e, .05, .9)) : k === 3 ? Math.round(N.qMax * (1 - win(e, .1, .6))) : 0;
    if (k >= 2 && k <= 3 || k === 5 || k === 6) stack(R, QU, q, P.bad, V([2, 3, 5], []), { txt: k >= 5 ? 'queue ≤ ' + N.maxQ : 'queue ' + fmt(q), lc: k === 2 ? P.bad : P.ink });
    // traffic: requests in from the app, through the edge, into the API
    const inA = V([0, 1, 2, 5], []) * late;
    R.flow(seg([APP[0] + .35, .3, -.15], [EDGE[0] - .45, .3, -.15], 12), { c: P.c4, r: .07, n: 6, speed: 1.4, a: inA });
    R.flow(seg([EDGE[0] + .45, .3, -.15], [API[0] - 1.1, .3, -.15], 16), { c: P.c4, r: .07, n: 7, speed: 1.4, a: inA });
    // calls to the provider: brisk when healthy, crawling while it is slow
    const slow = k >= 1 && k <= 4;
    if (k !== 5) { const c = slow ? P.bad : P.c4;
      R.flowArc([API[0] + 1.05, .35, -.2], [PRO[0] - .6, .45, -.2], .35, { c, r: .07, n: slow ? 4 : 8, speed: slow ? .25 : 1.5, a: V([0, 1, 2, 3, 4], []) });
      R.flowArc([PRO[0] - .6, .3, .25], [API[0] + 1.05, .25, .25], .25, { c: P.good, r: .06, n: 6, speed: 1.5, a: k === 0 || k === 6 ? 1 : 0 }); }
    // answers back to the user: green when healthy, orange failures in the cascade
    if (k === 0 || k === 5) R.flow(seg([API[0] - 1.1, .2, .25], [APP[0] + .35, .2, .25], 22), { c: P.good, r: .07, n: 9, speed: 1.5, a: late });
    if (k === 2) { R.flow(seg([QU[0] - .4, .2, .3], [APP[0] + .35, .2, .3], 14), { c: P.bad, r: .08, n: 8, speed: 1.2, a: win(e, .35, .6) });
      lab(R, [(APP[0] + QU[0]) / 2, .2, .3], N.fail + ' failed · ' + N.failB + ' history loads', { b: 1, fs: 13, c: P.bad, dy: 26, a: win(e, .45, .7) }); }
    if (k === 1) lab(R, [API[0], .3, API[2] + .85], 'nothing errors yet', { fs: 12.5, c: P.mute, dy: 22, a: win(e, .5, .8), wide: 1 });
    // 4. bound every wait: a timeout ring on the provider link
    if (k === 3) { const a = win(e, .05, .35);
      R.glass([API[0] + 1.55, .05, -.7], [0, 1.0, 0], [0, 0, 1.4], { c: P.acc, a, nu: 1, nv: 4 });
      lab(R, [API[0] + 1.55, 1.05, 0], 'timeout 100 ms · deadline passed down', { b: 1, fs: 13, c: P.acc, dy: -12, a });
      R.flowArc([API[0] + 1.05, .3, .45], [API[0] + 1.55, .3, .45], .1, { c: P.bad, r: .06, n: 3, speed: .8, a }); }
    // 5. cap the extra work: three retry streams shrink to one
    if (k === 4) { [0, 1, 2].forEach(i => R.flowArc([API[0] + 1.05, .35, -.55 + i * .5], [PRO[0] - .6, .45, -.55 + i * .5], .45 + .2 * i, { c: i ? P.bad : P.c4, r: .07, n: 5, speed: 1.3, a: i ? 1 - win(e, .45, .8) : 1 }));
      lab(R, [(API[0] + PRO[0]) / 2 + .6, 1.35, 0], fmt(N.attNaive, 1) + ' attempts per request → ' + fmt(N.attBudget, 1) + ' with a budget', { b: 1, fs: 13, c: P.ink, dy: -12, a: win(e, .1, .4) }); }
    // 6. refuse or cheapen: the breaker opens and the fallback answers; the queue is bounded
    if (k === 5 || k === 6) { const a = k === 5 ? win(e, .05, .3) : .9;
      R.box([1.5, 0, 0], [.18, .9, 1.1], { fill: mix(P.paper, P.bad, .55), a });
      lab(R, [1.5, .9, 0], 'breaker open', { b: 1, fs: 12.5, c: P.bad, dy: -11, a, grp: k === 6 ? 'pro' : undefined });
      party(R, FB, [.9, .45, .8], P.c5, 'fallback model', { a, wide: 1 });
      R.flowArc([API[0] + 1.05, .3, .6], [FB[0] - .5, .3, FB[2]], .25, { c: P.c5, r: .07, n: 7, speed: 1.3, a });
      if (k === 5) lab(R, [(APP[0] + EDGE[0]) / 2, .2, .3], N.aFail + ' failed · ' + N.aDeg + ' by the fallback', { b: 1, fs: 13, c: P.good, dy: 28, a: win(e, .75, .95) }); }
    // 7. where each defence acts
    if (k === 6) { const a = win(e, .1, .5);
      lab(R, [EDGE[0], .65, 0], 'rate limit: 429', { fs: 12.5, b: 1, c: P.acc, dy: -34, a, grp: 'edge', wide: 1 });
      lab(R, [EDGE[0], .65, 0], 'health checks', { fs: 12.5, c: P.acc, dy: -50, a, grp: 'edge', wide: 1 });
      lab(R, [EDGE[0], .65, 0], 'canary: 5%', { fs: 12.5, c: P.acc, dy: -66, a, grp: 'edge', wide: 1 });
      lab(R, [API[0], .3, API[2] + .9], 'shed early: 503 · bulkheads · 10 s deadline', { fs: 12.5, b: 1, c: P.acc, dy: 24, a, wide: 1 });
      lab(R, [PRO[0], .85, 0], 'timeout = deadline left', { fs: 12.5, b: 1, c: P.acc, dy: -34, a, grp: 'pro', wide: 1 });
      lab(R, [PRO[0], .85, 0], 'retry here only, budgeted', { fs: 12.5, c: P.acc, dy: -50, a, grp: 'pro', wide: 1 });
      lab(R, [APP[0], .45, 0], 'SLIs counted here', { fs: 12.5, b: 1, c: P.acc, dy: -34, a, wide: 1 }); }
  }
  const full = { cam: [.22, .7], bounds: [[-6.8, 0, -1.2], [4.6, 1.2, 2.2]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one provider slowdown, without and with the defences', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 1500, hold: 4800, draw, margin,
    view: k => k === 1 || k === 2 ? { cam: [.25, .66], bounds: [[-6.8, 0, -1.3], [4.2, 1.2, 1.4]] }
      : k === 3 || k === 4 ? { cam: [.3, .62], bounds: [[-2.8, 0, -1.3], [4.2, 1.3, 1.4]] } : full });
})();
