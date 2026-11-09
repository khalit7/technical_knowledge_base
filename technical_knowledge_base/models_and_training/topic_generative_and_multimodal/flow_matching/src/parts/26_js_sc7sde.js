// ---- Scene (section 12, Fig. 7): stochastic sampling with the same marginals, on the exact field (straight path). 150 seeded noises
// (FMF.noise, seed 11); the ODE (noise level 0) and the SDE dx = (u + eps/2 score) dt + sqrt(eps) dW with eps = 1 (Euler-Maruyama, the engine's
// seeded Brownian increments, seed 14), 64 steps, then the SDE with 4 steps. 40 paths are drawn; the clouds use all 150. ----
(function () {
  if (!document.getElementById('stg-sde') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K, Z = F.noise(150, 11), NP = 40;
  let C = null;
  function compute() {
    if (C) return C; const ode = K.paths({ kind: 'exact', path: 'linear', eps: 0 }, Z, 64), sde = K.paths({ kind: 'exact', path: 'linear', eps: 1 }, Z, 64, 'euler', 14), s4 = K.paths({ kind: 'exact', path: 'linear', eps: 1 }, Z, 4, 'euler', 14), o4 = K.paths({ kind: 'exact', path: 'linear', eps: 0 }, Z, 4);
    const at = (L, j) => L.map(q => [q[j][1], q[j][2]]);
    C = { ode, sde, s4, o4, om: at(ode, 32), sm: at(sde, 32) };
    (window.FMS = window.FMS || {}).sde = { n: Z.length, ode64: K.share(ode), sde64: K.share(sde), ode4: K.share(o4), sde4: K.share(s4) }; return C;
  }
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute(); K.floor(R);
    K.plate(R, 0, { c: c.noise, lab: 't = 0', lc: c.noise, grp: 'pl' }); K.plate(R, 1, { c: c.data, lab: 't = 1', lc: c.data, grp: 'pl' });
    K.cloud(R, 0, Z, c.noise, .8, .035);
    const tr = (L, o, f) => L.slice(0, NP).forEach((q, i) => { K.path(R, f < 1 ? K.part(q, f) : q, o); if (o.fl && i % 5 === 0 && e > .5) K.flow(R, q, { c: o.c, a: .9, r: .05, n: 8 }); });
    const ends = (L, col, a) => L.forEach(q => R.ball(W(1, [q[q.length - 1][1], q[q.length - 1][2]]), .035, { c: col, a }));
    // 1. the ODE: smooth, deterministic paths
    if (k !== 4) tr(T.ode, { c: c.u, w: 1.3, a: k === 0 ? .85 : k === 1 ? .3 : .2, fl: k === 0 }, k === 0 ? e : 1);
    if (k === 0) K.lab(R, W(.55, [0, 4.75]), 'ODE, noise 0: smooth paths', { fs: 13, b: 1, c: c.u, a: K.win(e, .5, 1) });
    // 2. the SDE from the same noises: every path wanders
    if (k >= 1 && k <= 3) tr(T.sde, { c: c.step, w: 1.2, a: k === 1 ? .85 : .2, fl: k === 1 }, k === 1 ? e : 1);
    if (k === 1) K.lab(R, W(.55, [0, 4.75]), 'SDE, noise 1: the same noises wander', { fs: 13, b: 1, c: c.step, a: K.win(e, .5, 1) });
    // 3. the same distribution at t = 0.5: both clouds of positions, all 150 noises
    if (k === 2) { K.plate(R, .5, { a: e, c: P.mute, ga: .35, lab: 't = 0.5 · both clouds', lc: P.ink, grp: 'pl' });
      T.om.forEach(p => R.ball(W(.5, p), .04, { c: c.u, a: e * .85 })); T.sm.forEach(p => R.ball(W(.5, p), .04, { c: c.step, a: e * .85 }));
      K.lab(R, W(.5, [0, 4.75]), 'different points, the same spread', { fs: 13, b: 1, c: P.ink, a: K.win(e, .4, 1) }); }
    // 4. both end on the ring
    if (k === 3) { ends(T.ode, c.u, e * .9); ends(T.sde, c.step, e * .9);
      K.lab(R, W(1, [0, 4.6]), 'on a blob: ODE ' + K.share(T.ode) + ', SDE ' + K.share(T.sde) + ' of 150', { fs: 13, b: 1, c: P.ink, a: K.win(e, .4, 1) }); }
    // 5. with 4 steps the noise is not removed in time
    if (k === 4) { tr(T.s4, { c: c.step, w: 1.5, a: .9, fl: true }, e); ends(T.s4, c.step, K.win(e, .8, 1)); tr(T.o4, { c: c.u, w: 1, a: .2 }, 1);
      K.lab(R, W(.55, [0, 4.75]), '4 steps: SDE ' + K.share(T.s4) + ' of 150 on a blob, ODE ' + K.share(T.o4), { fs: 13, b: 1, c: c.step, a: K.win(e, .5, 1) }); }
  }
  const mid = { cam: [-1.3, .2], bounds: [[TX(.5) - .5, K.YC - K.HS - .3, -K.HS - .1], [TX(.5) + .5, K.YC + K.HS + .25, K.HS + .1]] };
  S3.stage({ id: 'stg-sde', list: 'sx-sde', fig: 'Fig. 7 · ODE against SDE on the exact field', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20], view: k => k === 2 ? mid : k === 3 ? { cam: [-1.2, .24], bounds: [[TX(.6), 0, -K.HS], [TX(1) + .2, K.YC + K.HS + .2, K.HS]] } : K.full });
  compute();
})();
