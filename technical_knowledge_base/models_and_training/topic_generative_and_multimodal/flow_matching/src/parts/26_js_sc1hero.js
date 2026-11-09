// ---- Scene (top, Fig. 1): the whole idea in space-time. 150 seeded noises (FMF.noise, seed 11, the playground's) and 150 points of the
// ring (FMF.sampleData, seed 5); random pairs and their straight lines; the lines through one point and their average, the exact field u;
// the exact field's paths; one Euler step of it; one Euler step of the root's reflowed network (2-RF, int8 weights). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K;
  const Z = F.noise(150, 11), D = F.sampleData(150, 5), N = 40;
  const ex = { kind: 'exact', path: 'linear' };
  let C = null;
  function compute() {
    if (C) return C;
    const z = Z.slice(0, N);
    // the lines through one point x at t = 0.5: for each data point p, the noise whose straight line passes through x, and the line's posterior weight
    const T = .5, X = [1.39, .57];
    let lw = D.slice(0, 60).map(p => -((X[0] - T * p[0]) ** 2 + (X[1] - T * p[1]) ** 2) / (2 * (1 - T) ** 2)); const m = Math.max(...lw);
    let w = lw.map(l => Math.exp(l - m)); const zs = w.reduce((a, b) => a + b, 0); w = w.map(v => v / zs);
    const thru = D.slice(0, 60).map((p, i) => ({ x0: [(X[0] - T * p[0]) / (1 - T), (X[1] - T * p[1]) / (1 - T)], p, w: w[i] }));
    return C = {
      pairs: Z.slice(0, 18).map((z0, i) => [[0, z0[0], z0[1]], [1, D[i][0], D[i][1]]]),
      T, X, thru, u: F.exact(X[0], X[1], T).u,
      ode: K.paths(ex, z, 48), e1: K.paths(ex, z, 1), rf2: K.paths({ kind: 'net', key: 'rf2' }, z, 1)
    };
  }
  // the illustrative pair of section 1: x0 = (0.5, -1.2), x1 = (3, 0), t = 0.3
  const x0 = [.5, -1.2], x1 = [3, 0], t3 = .3, xt = [x0[0] + t3 * (x1[0] - x0[0]), x0[1] + t3 * (x1[1] - x0[1])];
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute();
    K.floor(R);
    // the two end plates and their clouds
    const pa = k === 2 ? .35 : 1;
    K.plate(R, 0, { a: pa, c: c.noise, lab: 't = 0 · noise x₀', lc: c.noise, grp: 'pl' }); K.plate(R, 1, { a: pa, c: c.data, lab: 't = 1 · data x₁', lc: c.data, grp: 'pl' });
    const ca = k === 0 ? e : k === 2 ? .25 : k >= 3 ? .45 : 1;
    K.cloud(R, 0, Z, c.noise, ca * .9); K.cloud(R, 1, D, c.data, ca * .9);
    if (k === 0) { K.lab(R, W(0, [0, 3.2]), '150 noises', { fs: 12.5, b: 1, c: c.noise, a: e, dy: -8 }); K.lab(R, W(1, [0, 3.6]), 'ring of 8 blobs', { fs: 12.5, b: 1, c: c.data, a: e, dy: -8 }); }
    // 2. random pairs: one straight line each; the illustrative pair in front, its point at t = 0.3 and its constant target velocity
    if (k === 1 || k === 2) {
      const la = k === 1 ? e : .18;
      T.pairs.forEach((q, i) => { K.path(R, q, { c: c.mute, w: 1, a: la * .7 }); if (k === 1 && i % 3 === 0) K.flow(R, q, { c: c.mute, a: la * .7, r: .045, n: 6 }); });
      if (k === 1) {
        const q = [[0, x0[0], x0[1]], [1, x1[0], x1[1]]];
        K.plate(R, t3, { a: e * .5, c: P.acc, ga: .35 }); K.path(R, q, { c: P.ink, w: 2.2, a: e }); K.flow(R, q, { c: P.acc, a: e, r: .06, n: 7 });
        R.ball(W(0, x0), .06, { c: c.noise, a: e }); R.ball(W(1, x1), .06, { c: c.data, a: e }); R.ball(W(t3, xt), .065, { c: P.ink, a: e });
        const h = .28, tip = W(t3 + h, [xt[0] + h * (x1[0] - x0[0]), xt[1] + h * (x1[1] - x0[1])]);
        R.line([W(t3, xt), tip], { c: P.acc, w: 4, a: K.win(e, .4, 1), head: 9, top: 1 });
        K.lab(R, W(t3, xt), 'point at t = 0.3', { al: 'right', dx: -10, dy: 12, fs: 12.5, c: P.ink, a: K.win(e, .3, 1) });
        K.lab(R, tip, 'target x₁ − x₀ = (2.5, 1.2)', { al: 'left', dx: 8, dy: -6, fs: 12.5, b: 1, c: P.acc, a: K.win(e, .4, 1) });
      }
    }
    // 3. the lines through one point at t = 0.5, each as strong as its weight, and their average: the exact field u
    if (k === 2) {
      K.plate(R, T.T, { a: e, c: P.acc, ga: .4, lab: 't = 0.5', lc: P.acc, grp: 'pl' });
      T.thru.forEach(l => { if (l.w < .004) return; const q = [[0, l.x0[0], l.x0[1]], [1, l.p[0], l.p[1]]]; K.path(R, q, { c: c.data, w: 1 + 2.5 * l.w, a: e * Math.min(1, .2 + l.w * 5) }); });
      R.ball(W(T.T, T.X), .07, { c: P.ink, a: e });
      const h = .3, tip = W(T.T + h, [T.X[0] + h * T.u[0], T.X[1] + h * T.u[1]]); R.line([W(T.T, T.X), tip], { c: P.acc, w: 4.5, a: K.win(e, .4, 1), head: 10, top: 1 });
      K.lab(R, tip, 'u(x, t): their average', { al: 'left', dx: 8, fs: 13, b: 1, c: P.acc, a: K.win(e, .5, 1) });
      K.lab(R, W(T.T, T.X), 'x', { al: 'right', dx: -9, fs: 13, b: 1, c: P.ink, a: e });
    }
    // 4. following u: the exact field's paths bend and land on the blobs
    if (k === 3 || k === 4) {
      const a = k === 3 ? 1 : .3, f = k === 3 ? e : 1;
      T.ode.forEach((q, i) => { K.path(R, K.part(q, f), { c: c.u, w: 1.3, a: a * .8 }); if (k === 3 && i % 4 === 0 && e > .6) K.flow(R, q, { c: c.u, a: .9, r: .05, n: 8 }); });
      if (k === 3) K.lab(R, W(.62, [0, 4.1]), 'paths of u: curved', { fs: 13, b: 1, c: c.u, a: K.win(e, .5, 1) });
    }
    // 5. one Euler step of the exact field: every point moves along its first arrow, to the ring's centre
    if (k === 4) {
      T.e1.forEach((q, i) => { K.path(R, K.part(q, e), { c: c.step, w: 1.4, a: .85 }); if (i % 4 === 0 && e > .6) K.flow(R, q, { c: c.step, a: .9, r: .05, n: 7 }); });
      R.glow(W(1, [0, 0]), .22, { c: c.step, a: K.win(e, .6, 1) });
      K.lab(R, W(1, [0, 0]), '1 step: all on the centre', { al: 'left', dx: 14, dy: -14, fs: 13, b: 1, c: c.step, a: K.win(e, .6, 1) });
    }
    // 6. one Euler step of the reflowed network: straight lines that end on the blobs
    if (k === 5) {
      T.ode.forEach(q => K.path(R, q, { c: c.u, w: 1, a: .18 }));
      T.rf2.forEach((q, i) => { K.path(R, K.part(q, e), { c: c.net, w: 1.5, a: .9 }); if (i % 4 === 0 && e > .6) K.flow(R, q, { c: c.net, a: .9, r: .05, n: 7 }); });
      const n = K.share(T.rf2); K.lab(R, W(.55, [0, 4.1]), 'after reflow, 1 step: ' + n + ' of ' + N + ' on a blob', { fs: 13, b: 1, c: c.net, a: K.win(e, .5, 1) });
    }
  }
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · the toy in space-time: time runs left to right', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20],
    view: k => k === 2 ? { cam: [-1.1, .28], bounds: [[TX(.2), 0, -K.HS], [TX(.8), K.YC + K.HS, K.HS + .4]] } : K.full });
})();
