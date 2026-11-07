// ---- Scene: Fig. 1, the hero (stg-hero): the incident's slow request abb78623 (DEMO.highlight.slow) passing through the demo's services,
// and the three records it leaves. Timings are the trace's own spans; the histogram bars are the incident minute's real bucket counts
// (DEMO.buckets_incident, made non-cumulative); the log lines are the two lines the services wrote for it (DEMO.xlogs). Steps 1 to 3 replay
// the trace's clock (0 to 3.65 ms, to 915.31 ms, to 1,497 ms). Layout is a schematic. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.OBS3) return;
  const { mix, lerp } = S3, { party, floorPlate, lab, win, arcPts, seg, poly, along, trace, span, depths, fmt } = OBS3;
  const T = trace(DEMO.highlight.slow), DEP = depths(T), END = T.sp[0][4];
  const cli = span(T, 'GET retrieval /search'), mdl = span(T, 'model call (simulated)'), look = span(T, 'vector index lookup');
  const B = DEMO.buckets_incident, BK = B.slice(2, 7).map((b, i) => [b[0], b[1] - B[i + 1][1]]); // 0.25, 0.5, 0.75, 1.0, 1.5 s
  const BMAX = Math.max(...BK.map(b => b[1])), HIT = BK.findIndex(b => b[0] === 1.5), TOT = B[B.length - 1][1];
  const LG = [-5.1, 0, 1.5], API = [-2.0, 0, 1.5], MOD = [-2.0, 0, 3.15], RET = [1.3, 0, 1.5];
  const REP = [['r1', [3.55, 0, .55]], ['r2', [3.55, 0, 1.5]], ['r3-cold', [3.55, 0, 2.45]]];
  const MP = [-3.7, 0, -1.55], TP = [0, 0, -1.55], LP = [3.7, 0, -1.55], PW = 3.1, PD = 2.3;
  // the replayed clock of steps 1 to 3 (ms since the request arrived)
  const CLK = [[0, cli[3]], [cli[3], mdl[3]], [mdl[3], END]];
  function draw(R, k, e) {
    const P = R.P, A = (...ks) => ks.indexOf(k) >= 0 ? 1 : .25, sig = k >= 3, rq = k <= 2 || k === 6 ? 1 : .3;
    R.grid(-6.2, 5.2, -3.2, 4, .5);
    // the services, front row
    party(R, LG, [1.0, .5, .8], P.c2, 'load generator', { a: k === 0 || k === 2 ? 1 : .3 * (sig ? 1 : 1.6), grp: 'svc' });
    party(R, API, [1.4, .8, 1.1], P.c1, 'chat-api', { a: k <= 2 ? 1 : k === 6 || k === 3 || k === 4 || k === 5 ? .75 : .4, grp: 'svc' });
    party(R, MOD, [1.1, .45, .8], P.c4, 'model call', { a: k === 2 ? 1 : .3, grp: 'svc' });
    party(R, RET, [1.3, .7, 1.0], P.c3, 'retrieval', { a: k === 1 ? 1 : k === 4 || k === 5 ? .75 : .35, grp: 'svc' });
    REP.forEach(([nm, p]) => { const hot = nm === 'r3-cold'; party(R, p, [.75, .42, .62], hot ? P.bad : P.c3, k === 1 ? nm : null, { a: k === 1 ? (hot ? 1 : .35) : .22, t: hot ? .4 : .2, lc: hot ? P.bad : P.mute });
      if (hot && k === 1) R.glow([p[0], .5, p[2]], .7, { c: P.bad, a: .5 * win(e, .1, .5) }); });
    // the replayed clock (steps 1 to 3)
    if (k <= 2) { const t = lerp(CLK[k][0], CLK[k][1], e); lab(R, [API[0], .8, API[2]], '+' + fmt(t) + ' ms', { mono: 1, b: 1, fs: 13, dy: -30, c: k === 2 && e > .98 ? P.bad : P.ink }); }
    // 1. in: load generator to chat-api
    if (k === 0) R.flow(seg([LG[0] + .5, .3, LG[2]], [API[0] - .7, .3, API[2]], 20), { c: P.c2, r: .08, n: 9, speed: 1.6, a: Math.min(1, e * 2) });
    // 2. the call to retrieval carries the trace ID in traceparent (the large dot), then the lookup on r3-cold
    if (k === 1) { const path = seg([API[0] + .7, .5, API[2]], [RET[0] - .65, .5, RET[2]], 20);
      R.flow(path, { c: P.c3, r: .06, n: 7, speed: 1.4, a: .7 });
      const tp = along(path, win(e, 0, .35)); R.ball(tp, .13, { c: P.acc, top: 1 }); R.glow(tp, .4, { c: P.acc, a: .7, top: 1 });
      lab(R, tp, 'traceparent', { mono: 1, fs: 12, b: 1, c: P.acc, dy: -18, a: win(e, 0, .2) });
      R.flow(arcPts(R, [RET[0] + .65, .4, RET[2]], [REP[2][1][0] - .4, .3, REP[2][1][2]], .25), { c: P.bad, r: .07, n: 6, speed: 1.2, a: win(e, .3, .5) });
      lab(R, [REP[2][1][0], .42, REP[2][1][2]], fmt(look[4]) + ' ms lookup', { mono: 1, fs: 12.5, b: 1, c: P.bad, dy: -28, a: win(e, .35, .6) }); }
    // 3. the model call, then the answer back to the client after 1,497 ms with status 200
    if (k === 2) { R.flow(arcPts(R, [API[0] + .2, .5, API[2] + .55], [MOD[0] + .2, .45, MOD[2] - .4], .3), { c: P.c4, r: .07, n: 6, speed: 1.2, a: 1 - win(e, .75, .9) });
      R.flow(seg([API[0] - .7, .25, API[2] + .25], [LG[0] + .5, .25, LG[2] + .25], 20), { c: P.c1, r: .08, n: 9, speed: 1.6, a: win(e, .8, 1) });
      lab(R, [LG[0], 0, LG[2] + .45], 'status 200 after ' + fmt(END) + ' ms', { b: 1, fs: 12.5, c: P.bad, dy: 16, a: win(e, .85, 1) }); }
    // the three stores, back row
    const pa = [k === 3 || k === 6 ? 1 : .35, k === 4 || k === 6 ? 1 : .35, k === 5 || k === 6 ? 1 : .35];
    floorPlate(R, MP, PW, PD, P.c1, sig ? pa[0] : .3, { nu: 5, nv: 3 });
    floorPlate(R, TP, PW, PD, P.c3, sig ? pa[1] : .3, { nu: 6, nv: 3 });
    floorPlate(R, LP, PW, PD, P.c5, sig ? pa[2] : .3, { nu: 4, nv: 3 });
    [[MP, 'metrics', P.c1], [TP, 'traces', P.c3], [LP, 'logs', P.c5]].forEach(([c, t, col], i) => lab(R, [c[0] - PW / 2 + .1, .05, c[2] + PD / 2], t, { b: 1, fs: 13.5, c: col, dy: 14, al: 'left', a: sig ? Math.max(.5, pa[i]) : .5, grp: 'store' }));
    // 4. metrics: the request is one count in the 1.0 to 1.5 s bucket; the ringed dot is its exemplar
    const ma = k > 3 ? pa[0] : k === 3 ? win(e, .25, .7) : 0;
    if (k === 3) R.flow(arcPts(R, [API[0] - .5, .8, API[2] - .3], [MP[0] + 1.0, .5, MP[2] + .2], .6), { c: P.c1, r: .07, n: 7, speed: 1.3, a: 1 - win(e, .85, 1) });
    BK.forEach((b, i) => { const x = MP[0] - 1.2 + i * .6, h = Math.max(.02, b[1] / BMAX * 1.25), hit = i === HIT;
      if (ma <= .01) return; R.box([x, .05, MP[2] + .2], [.42, h * (k === 3 ? win(e, .25, .7) : 1), .5], { fill: hit ? mix(P.paper, P.bad, .65) : mix(P.paper, P.c1, .55), a: ma, shadow: false });
      if (k === 3) lab(R, [x, .05, MP[2] + .45], '≤' + b[0], { mono: 1, fs: 12, c: P.mute, dy: 12, a: ma * win(e, .75, 1), wide: 1 });
      if (hit) { const ex = [x, .05 + h + .22, MP[2] + .2]; R.ball(ex, .09, { c: P.bad, a: ma }); R.glow(ex, .32, { c: P.bad, a: ma * .6 });
        if (k === 3) lab(R, ex, fmt(b[1]) + ' of ' + fmt(TOT), { mono: 1, b: 1, fs: 12.5, c: P.bad, dy: -14, a: ma * win(e, .6, .9) }); } });
    // 5. traces: eight spans from two processes, time along x, chat-api in front, retrieval behind, nesting as height
    const ta = k > 4 ? pa[1] : k === 4 ? 1 : 0;
    if (k === 4) { R.flow(arcPts(R, [API[0] + .4, .8, API[2] - .4], [TP[0] - .6, .4, TP[2] + .5], .6), { c: P.c1, r: .07, n: 7, speed: 1.3, a: 1 - win(e, .85, 1) });
      R.flow(arcPts(R, [RET[0], .7, RET[2] - .4], [TP[0] + .4, .4, TP[2] - .4], .5), { c: P.c3, r: .07, n: 6, speed: 1.3, a: 1 - win(e, .85, 1) }); }
    if (ta > .01) T.sp.forEach((s, i) => { const x0 = TP[0] - PW / 2 + .15 + s[3] / END * (PW - .3), w = Math.max(.04, s[4] / END * (PW - .3)), rt = s[1] === 'retrieval';
      const ai = k === 4 ? win(e, i * .08, i * .08 + .2) : 1, slow = s === look || s === cli || s[0] === 'GET /search';
      R.box([x0 + w / 2, .04 + DEP[i] * .13, TP[2] + (rt ? -.55 : .45)], [w, .11, .55], { fill: mix(P.paper, slow ? P.bad : rt ? P.c3 : P.c1, slow ? .55 : .45), a: ta * ai, shadow: false, lw: .6 }); });
    if (ta > .01 && k === 4) { lab(R, [TP[0] + PW / 2, .05, TP[2] + .45], 'chat-api', { fs: 12, c: P.c1, al: 'left', dx: 6, a: ta, wide: 1 });
      lab(R, [TP[0] + PW / 2, .05, TP[2] - .55], 'retrieval', { fs: 12, c: P.c3, al: 'left', dx: 6, a: ta, wide: 1 });
      if (k === 4) lab(R, [TP[0] - PW / 2 + .15 + (look[3] + look[4] / 2) / END * (PW - .3), .5, TP[2] - .55], 'lookup ' + fmt(look[4]) + ' ms', { mono: 1, b: 1, fs: 12.5, c: P.bad, dy: -8, a: win(e, .5, .8) }); }
    // 6. logs: one JSON line from each service
    const la = k > 5 ? pa[2] : k === 5 ? 1 : 0, LOGS = DEMO.xlogs[T.id].map(l => JSON.parse(l));
    if (k === 5) [[API, P.c1, .6], [RET, P.c3, .3]].forEach(([p, c, h]) => R.flow(arcPts(R, [p[0] + .3, .7, p[2] - .4], [LP[0] - .8, .3, LP[2]], h + .4), { c, r: .07, n: 6, speed: 1.3, a: 1 - win(e, .85, 1) }));
    if (la > .01) LOGS.forEach((L, i) => { const z = LP[2] + .45 - i * .9, ai = k === 5 ? win(e, .2 + i * .25, .45 + i * .25) : 1, c = L.service === 'retrieval' ? P.c3 : P.c1;
      R.box([LP[0], .03, z], [PW - .3, .06, .45], { fill: mix(P.paper, c, .25), a: la * ai, shadow: false, lw: .6 });
      if (k === 5) lab(R, [LP[0] - PW / 2 + .2, .09, z], L.service + ' · ' + L.msg + ' · ' + L.duration_ms + ' ms', { mono: 1, fs: 12, al: 'left', c: P.ink, a: la * ai, wide: 1 }); });
    // 7. the join: one trace ID in the exemplar, the spans and the log lines; the burn-rate alert sits on the metrics
    if (k === 6) { const ex = [MP[0] - 1.2 + HIT * .6, .05 + 1.25 * BK[HIT][1] / BMAX + .22, MP[2] + .2], sp = [TP[0], .35, TP[2]], lg = [LP[0] - 1, .12, LP[2] + .45];
      const thr = poly([ex, [MP[0] + 1.6, 1.15, MP[2]], sp, [LP[0] - 1.6, 1.0, LP[2]], lg], 12);
      R.line(thr.slice(0, Math.max(2, Math.round(thr.length * win(e, 0, .6)))), { c: P.acc, w: 2.2, a: .9, top: 1 });
      R.flow(thr, { c: P.acc, r: .07, n: 14, speed: 1.4, a: win(e, .4, .8), top: 1 });
      lab(R, [TP[0], 1.15, TP[2]], 'trace_id abb78623…', { mono: 1, b: 1, fs: 13, c: P.acc, dy: -14, a: win(e, .2, .5) });
      const bell = [MP[0] - 1.95, 0, MP[2] + .6]; R.box(bell, [.34, .34, .34], { fill: mix(P.paper, P.bad, .7), a: win(e, .5, .8) });
      lab(R, up3(bell, .34), 'burn-rate alert', { b: 1, fs: 12.5, c: P.bad, dy: -10, a: win(e, .5, .8), wide: 1 }); }
  }
  const up3 = (p, y) => [p[0], y, p[2]];
  const full = { cam: [.12, .78], bounds: [[-5.8, 0, -2.9], [5.4, .5, 3.6]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one real request, three records', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 16, 18, 16],
    // on a phone (under 520 px) the camera looks along the services' row, so the long scene fills the tall card
    view: k => { const v = desk(k); return innerWidth < 520 ? { cam: [1.5708, .78], bounds: v ? v.bounds : full.bounds } : v; } });
  function desk(k) { return k === 1 ? { cam: [.5, .6], bounds: [[-2.8, 0, .2], [4.1, 1.1, 3.0]] }
      : k === 3 ? { cam: [.45, .62], bounds: [[-5.4, 0, -2.8], [-1.2, 1.6, 2.2]] }
      : k === 4 ? { cam: [.3, .68], bounds: [[-1.9, 0, -2.8], [2.3, .9, 2.2]] }
      : k === 5 ? { cam: [.3, .66], bounds: [[1.9, 0, -2.8], [5.4, .8, 1.4]] } : null; }
})();
