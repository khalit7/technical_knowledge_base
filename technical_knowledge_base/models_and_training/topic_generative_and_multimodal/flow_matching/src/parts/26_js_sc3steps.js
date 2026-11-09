// ---- Scene (section 3, Fig. 3): few steps fail even for a perfect model. 24 seeded noises (FMF.noise, seed 41) through the exact field
// (straight path): a fine solve (64 Euler steps), then 1, 2 and 4 Euler steps, then the root's trained 1-RF network (int8) at 4 steps.
// The plates are the times at which each solver evaluates the field; the counts on the canvas are of these 24, the step list's of 2,000. ----
(function () {
  if (!document.getElementById('stg-steps') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K, Z = F.noise(24, 41), ex = { kind: 'exact', path: 'linear' };
  let C = null;
  const compute = () => C || (C = { fine: K.paths(ex, Z, 64), e1: K.paths(ex, Z, 1), e2: K.paths(ex, Z, 2), e4: K.paths(ex, Z, 4), n4: K.paths({ kind: 'net', key: 'rf1' }, Z, 4) });
  const PL = [[0, 1], [0, 1], [0, .5, 1], [0, .25, .5, .75, 1], [0, .25, .5, .75, 1]];
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute(); K.floor(R);
    PL[k].forEach(t => K.plate(R, t, { a: t === 0 || t === 1 ? 1 : e, c: t === 0 ? c.noise : t === 1 ? c.data : c.step, ga: t === 0 || t === 1 ? .45 : .3,
      lab: t === 0 ? 't = 0' : t === 1 ? 't = 1' : 'evaluate at t = ' + t, lc: t === 0 ? c.noise : t === 1 ? c.data : c.step, grp: 'pl' }));
    K.cloud(R, 1, F.sampleData(120, 5), c.data, .5);
    // the fine solve: full strength in step 1, a faint reference after
    T.fine.forEach((q, i) => { K.path(R, k === 0 ? K.part(q, e) : q, { c: c.u, w: k === 0 ? 1.5 : 1.1, a: k === 0 ? .9 : .25 }); if (k === 0 && i % 3 === 0 && e > .5) K.flow(R, q, { c: c.u, a: .9, r: .05, n: 8 }); });
    T.fine.forEach(q => R.ball(W(0, [q[0][1], q[0][2]]), .045, { c: c.noise, a: .9 }));
    const S = [null, T.e1, T.e2, T.e4, T.e4][k];
    if (S) S.forEach((q, i) => { K.path(R, k === 4 ? q : K.part(q, e), { c: c.step, w: 1.6, a: k === 4 ? .45 : .9 }); if (k < 4 && i % 3 === 0 && e > .5) K.flow(R, q, { c: c.step, a: .9, r: .05, n: 7 });
      q.slice(1, -1).forEach(p => R.ball(wpt(p), .035, { c: c.step, a: (k === 4 ? .45 : 1) * K.win(e, .5, 1) })); R.ball(wpt(q[q.length - 1]), .045, { c: c.step, a: (k === 4 ? .5 : 1) * K.win(e, .8, 1) }); });
    if (k === 4) T.n4.forEach((q, i) => { K.path(R, K.part(q, e), { c: c.net, w: 1.6, a: .95 }); if (i % 3 === 0 && e > .5) K.flow(R, q, { c: c.net, a: .9, r: .05, n: 7 }); });
    const lab = [['fine solve: ' + K.share(T.fine) + ' of 24 on a blob', c.u], ['1 step: ' + K.share(T.e1) + ' of 24', c.step], ['2 steps: ' + K.share(T.e2) + ' of 24', c.step], ['4 steps: ' + K.share(T.e4) + ' of 24', c.step], ['network, 4 steps: ' + K.share(T.n4) + ' of 24', c.net]][k];
    K.lab(R, W(.55, [0, 4.75]), lab[0], { fs: 13, b: 1, c: lab[1], a: K.win(e, .5, 1) });
  }
  const wpt = q => W(q[0], [q[1], q[2]]);
  S3.stage({ id: 'stg-steps', list: 'sx-steps', fig: 'Fig. 3 · Euler steps on the exact field', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20] });
})();
