// ---- Scene (section 4, Fig. 4): the perfect model only copies its training set, on the toy. 60 seeded noises (FMF.noise, seed 11) through
// the exact field of the whole ring (FMF.exact), then through the exact field of an illustrative training set of 16 points drawn from the ring
// (FMF.sampleData, seed 77), the same closed form fm_memo.py uses for the 55,000 Fashion-MNIST images: on the straight path x_t given point j is
// Gaussian around t y_j with spread 1 - t, the weights are a softmax over the points, u = (E[x1 | x] - x) / (1 - t). 50 Euler steps each. ----
(function () {
  if (!document.getElementById('stg-memo') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K, Z = F.noise(60, 11), Y = F.sampleData(16, 77), N = 50;
  let C = null;
  function emp(x, y, t) { const v = 1 - t; let m = -1e300; const l = Y.map(p => { const q = -((x - t * p[0]) ** 2 + (y - t * p[1]) ** 2) / (2 * v * v); if (q > m) m = q; return q; });
    let z = 0, ex = 0, ey = 0; l.forEach((q, j) => { const w = Math.exp(q - m); z += w; ex += w * Y[j][0]; ey += w * Y[j][1]; }); return [(ex / z - x) / v, (ey / z - y) / v]; }
  function compute() {
    if (C) return C;
    const em = Z.map(p => { let x = p[0], y = p[1]; const q = [[0, x, y]]; for (let k = 0; k < N; k++) { const t = k / N, u = emp(x, y, t); x += u[0] / N; y += u[1] / N; q.push([(k + 1) / N, x, y]); } return q; });
    // where each sample ends: its nearest training point and the distance to it
    const near = em.map(q => { const e = q[N]; let b = 0, d = 1e9; Y.forEach((p, j) => { const h = Math.hypot(e[1] - p[0], e[2] - p[1]); if (h < d) { d = h; b = j; } }); return { j: b, d }; });
    const hits = {}; near.forEach(n => hits[n.j] = (hits[n.j] || 0) + 1); const top = +Object.keys(hits).sort((a, b) => hits[b] - hits[a])[0];
    return C = { pop: K.paths({ kind: 'exact', path: 'linear' }, Z, N), em, near, used: Object.keys(hits).length, top, topN: hits[top], dmax: Math.max(...near.map(n => n.d)) };
  }
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute(); K.floor(R);
    K.plate(R, 0, { c: c.noise, lab: 't = 0 · noise', lc: c.noise, grp: 'pl' }); K.plate(R, 1, { c: c.data, lab: 't = 1', lc: c.data, grp: 'pl' });
    K.cloud(R, 0, Z, c.noise, .9, .04);
    // 1. the whole ring's exact field: the ends spread over every blob
    const pa = k === 0 ? 1 : k === 1 ? .3 : 0;
    if (pa > 0) { T.pop.forEach((q, i) => { K.path(R, k === 0 ? K.part(q, e) : q, { c: c.u, w: 1.2, a: pa * .8 }); if (k === 0 && i % 5 === 0 && e > .5) K.flow(R, q, { c: c.u, a: .9, r: .05, n: 8 }); });
      T.pop.forEach(q => R.ball(W(1, [q[N][1], q[N][2]]), .04, { c: c.u, a: pa * K.win(k === 0 ? e : 1, .8, 1) })); }
    if (k === 0) K.lab(R, W(.6, [0, 4.75]), 'the ring: ends spread over the blobs', { fs: 13, b: 1, c: c.u, a: K.win(e, .5, 1) });
    // 2. the training set: 16 points; the loss only ever sees these
    if (k >= 1) { const a = k === 1 ? e : 1; Y.forEach((p, j) => { R.ball(W(1, p), .075, { c: c.data, a }); if (k === 3 && j === T.top) R.glow(W(1, p), .3, { c: c.data, a: .8 }); });
      if (k === 1) K.lab(R, W(1, [0, 4.6]), 'a training set: 16 points', { fs: 13, b: 1, c: c.data, a: K.win(e, .4, 1) }); }
    // 3. the exact field of the training set: every path ends on a training point
    if (k >= 2) T.em.forEach((q, i) => { const hl = k === 3 && T.near[i].j === T.top; K.path(R, k === 2 ? K.part(q, e) : q, { c: hl ? P.ink : c.step, w: hl ? 1.8 : 1.2, a: k === 3 ? (hl ? .95 : .12) : .8 });
      if (k === 2 && i % 5 === 0 && e > .5) K.flow(R, q, { c: c.step, a: .9, r: .05, n: 8 }); if (hl && i % 2 === 0) K.flow(R, q, { c: c.step, a: .9, r: .05, n: 8 }); });
    if (k === 2) K.lab(R, W(.6, [0, 4.75]), 'its exact field: all ' + Z.length + ' land on ' + T.used + ' training points', { fs: 13, b: 1, c: c.step, a: K.win(e, .5, 1) });
    if (k === 3) K.lab(R, W(1, Y[T.top]), T.topN + ' samples, one training point', { al: 'left', dx: 14, dy: -14, fs: 13, b: 1, c: P.ink });
  }
  S3.stage({ id: 'stg-memo', list: 'sx-memo', fig: 'Fig. 4 · the exact field of a 16-point training set', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20],
    view: k => k === 3 ? { cam: [-1.05, .28], bounds: [[TX(.55), 0, -K.HS], [TX(1) + .2, K.YC + K.HS + .2, K.HS]] } : K.full});
  // what the step list states, for check_stages.mjs: the farthest end from its training point, the points used, and the ring's own median distance
  { const T = compute(), pd = T.pop.map(q => Math.min(...Y.map(p => Math.hypot(q[N][1] - p[0], q[N][2] - p[1])))).sort((a, b) => a - b);
    (window.FMS = window.FMS || {}).memo = { n: Z.length, used: T.used, top: T.topN, dmax: T.dmax, popMed: pd[Math.floor(pd.length / 2)] }; }
})();
