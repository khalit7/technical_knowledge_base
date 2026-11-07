// ---- Scene: Fig. 6, bulkheads (stg-bulk): the before design's 20 workers as one shared pool (RE.P.before) and as two pools of 10, one for
// requests that call the provider and one for the rest (RE.P.bulk_msg and RE.P.bulk_hist, each pool run on its own at 50 requests a second),
// through the same 3 s provider slowdown. Workers held, queues and failure counts are those runs' numbers; the layout is a schematic. ----
(function () {
  if (!document.getElementById('stg-bulk') || !window.RS3 || !window.RE) return;
  const { mix, lerp } = S3, { party, pool, stack, lab, win, seg, arcPts, fmt, margin } = RS3;
  const B = RE.sim(RE.P.before), M = RE.sim(RE.P.bulk_msg), H = RE.sim(RE.P.bulk_hist), sum = a => a.reduce((x, y) => x + y, 0);
  const N = { W: RE.P.before.W, Wp: RE.P.bulk_msg.W, rate: RE.P.bulk_msg.rate, own: RE.P.before.own, wSlow: B.S.wdep[10], failB: sum(B.S.failB), qB: Math.max(...B.S.q),
    mW: M.S.wdep[10], mNorm: Math.max(...M.S.wdep.slice(0, 10)), mFail: M.tot.fail, mQ: Math.max(...M.S.q), hFail: H.tot.fail, hReq: H.tot.req, hBusy: RE.P.bulk_hist.rate * RE.P.bulk_hist.own / 1000 };
  RSN.bulk = N;
  const IN = [-5.6, 0, 0], ONE = [-1.2, 0, 0], PM = [-1.2, 0, -1.15], PH = [-1.2, 0, 1.15], PRO = [3.4, 0, -1.15], DB = [3.4, 0, 1.15], Q1 = [-3.3, 0, 0], QM = [-3.3, 0, -1.15];
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.6, 4.8, -2.6, 2.8, .5);
    const split = k >= 2, a1 = split ? 0 : 1, a2 = k === 2 ? win(e, .3, .7) : split ? 1 : 0;
    party(R, IN, [.8, .5, .8], P.c4, '100 requests a second', { wide: 1 });
    party(R, PRO, [1.1, .8, .9], k === 1 || k === 3 ? P.bad : P.c3, k === 1 || k === 3 ? 'provider · 3 s a call' : 'model provider', { wide: 1 });
    party(R, DB, [1.0, .5, .9], P.c6, 'history: our own 5 ms', { wide: 1 });
    // one shared pool (steps 1 and 2)
    if (a1 > .01) { const busy = k === 0 ? Math.max(...B.S.wdep.slice(0, 10)) : Math.round(lerp(6, N.wSlow, win(e, .1, .5)));
      pool(R, ONE, 5, 4, busy, k === 1 ? P.bad : P.c4, a1 * (k === 2 ? 1 - win(e, 0, .3) : 1), { plate: P.c1 });
      lab(R, [ONE[0], .3, ONE[2] - .9], 'one pool · ' + busy + ' of ' + N.W + ' busy', { ph: 1, b: 1, fs: 13, c: k === 1 ? P.bad : P.ink, dy: -14 });
      R.flow(seg([IN[0] + .45, .3, -.2], [ONE[0] - 1.1, .3, -.2], 14), { c: P.c4, r: .07, n: 6, speed: 1.3 });
      R.flow(seg([IN[0] + .45, .3, .2], [ONE[0] - 1.1, .3, .2], 14), { c: P.c6, r: .07, n: 6, speed: 1.3 });
      R.flowArc([ONE[0] + 1.05, .3, -.3], [PRO[0] - .6, .4, PRO[2]], .3, { c: k === 1 ? P.bad : P.c4, r: .07, n: k === 1 ? 3 : 7, speed: k === 1 ? .25 : 1.4 });
      if (k === 0) R.flowArc([ONE[0] + 1.05, .3, .3], [DB[0] - .55, .3, DB[2]], .25, { c: P.c6, r: .07, n: 7, speed: 1.4 });
      if (k === 1) { const q = Math.round(N.qB * win(e, .2, .9)); stack(R, Q1, q, P.bad, 1, { txt: 'queue ' + fmt(q) });
        R.flow(seg([Q1[0] - .4, .2, .5], [IN[0] + .4, .2, .5], 8), { c: P.bad, r: .08, n: 5, speed: 1.1, a: win(e, .4, .6) });
        lab(R, [IN[0], .2, .9], N.failB + ' history loads failed', { b: 1, fs: 13, c: P.bad, dy: 22, a: win(e, .5, .8) }); } }
    // two pools (steps 3 to 5), a glass wall between them
    if (a2 > .01) { const slow = k === 3, mb = k === 3 ? Math.round(lerp(N.mNorm, N.mW, win(e, .1, .5))) : N.mNorm, hb = 0;
      pool(R, PM, 5, 2, mb, slow ? P.bad : P.c4, a2, { plate: P.c1 }); pool(R, PH, 5, 2, hb, P.c6, a2, { plate: P.c6 });
      R.glass([ONE[0] - 1.1, .02, 0], [2.2, 0, 0], [0, .7, 0], { c: P.ink, a: a2 * .6, nu: 4, nv: 2, th: .02 });
      lab(R, [PM[0], .3, PM[2] - .5], 'provider pool · ' + mb + ' of ' + N.Wp, { ph: 1, b: 1, fs: 13, c: slow ? P.bad : P.ink, dy: -14, a: a2 });
      lab(R, [PH[0], .05, PH[2] + .5], 'everything else · ' + N.Wp + ' workers', { b: 1, fs: 13, c: P.c6, dy: 16, a: a2 });
      R.flowArc([IN[0] + .45, .3, -.2], [PM[0] - 1.1, .3, PM[2]], .2, { c: P.c4, r: .07, n: 6, speed: 1.3, a: a2 });
      R.flowArc([IN[0] + .45, .3, .2], [PH[0] - 1.1, .3, PH[2]], .2, { c: P.c6, r: .07, n: 6, speed: 1.3, a: a2 });
      R.flow(seg([PM[0] + 1.1, .3, PM[2]], [PRO[0] - .6, .35, PRO[2]], 14), { c: slow ? P.bad : P.c4, r: .07, n: slow ? 3 : 7, speed: slow ? .25 : 1.4, a: a2 });
      R.flow(seg([PH[0] + 1.1, .3, PH[2]], [DB[0] - .55, .3, DB[2]], 14), { c: P.c6, r: .07, n: 7, speed: 1.4, a: a2 });
      if (k === 3) { const q = Math.round(N.mQ * win(e, .2, .9)); stack(R, QM, q, P.bad, 1, { txt: 'queue ' + fmt(q) });
        lab(R, [IN[0], .5, -.6], N.mFail + ' message requests failed', { b: 1, fs: 13, c: P.bad, dy: -30, a: win(e, .5, .8), wide: 1 });
        lab(R, [DB[0], 0, DB[2] + .45], N.hFail + ' of ' + fmt(N.hReq) + ' history loads failed', { b: 1, fs: 13, c: P.good, dy: 16, a: win(e, .5, .8) }); }
      if (k === 4) lab(R, [PH[0], .3, PH[2]], 'busy on average: ' + fmt(N.hBusy, 2) + ' of a worker', { b: 1, fs: 13, c: P.c6, dy: -30, a: win(e, .2, .5) }); }
  }
  const full = { cam: [.25, .74], bounds: [[-6.2, 0, -2.0], [4.4, 1.0, 2.3]] };
  S3.stage({ id: 'stg-bulk', list: 'sx-bulk', fig: 'Fig. 6 · one pool, then two', cam: full.cam, bounds: full.bounds, aspect: .58, dur: 1800, hold: 4600, draw, margin });
})();
