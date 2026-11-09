// ---- Scene (section 2, Fig. 2): prefill against decode. Rows are queries, columns keys: one cell is one query-key pair of one head in one layer.
// 12 prompt tokens are drawn (illustrative); every number written is Llama 3.1 8B's at real lengths: the attention shares of FLOPs per token from
// KCD.vis.flops8b (the root's calc.py, columns [tokens, decode share, prefill share]), the cache and weight bytes from KC (config.json). ----
(function () {
  if (!document.getElementById('stg-pd') || !window.LCS || !window.KC || !window.KCD) return;
  const { mix } = S3, { tw, la, lab, gib, gb } = LCS;
  const p = KC.byKey['llama-3.1-8b'], W8 = p.params * 2, F = KCD.vis.flops8b, at = T => F.find(r => r[0] === T), pc = v => Math.round(100 * v) + '%';
  const N = 12, C = .38, X0 = -3.2, Z0 = -2.4, x = j => X0 + (j + .5) * C, z = i => Z0 + (i + .5) * C, ZK = Z0 - .45, XQ = X0 - .5;
  const XW0 = X0 + N * C + .35, LW = 1.15, XP = XW0 + LW + .7, ZP = -.6; // the weight bars, then the weight plate
  const pairs = (131072 * 131073 / 2 / 1e9).toFixed(1);
  function cell(R, i, j, fill, a) { R.box([x(j), 0, z(i)], [C * .84, .05, C * .84], { fill, a, lw: .5, shadow: false, ea: .5 }); }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 5.2, -3.2, 4.0, .5);
    const tri = tw(st, e, q => q <= 1 ? 1 : q <= 3 ? .3 : 0), cq = mix(P.paper, P.c5, .55);
    // the prompt's triangle: row i has i + 1 pairs; in step 1 the rows fill from the back
    for (let i = 0; i < N; i++) { const ra = k === 0 ? Math.min(1, Math.max(0, e * 1.4 * N - i * .9) ) : 1;
      for (let j = 0; j <= i; j++) cell(R, i, j, cq, tri * ra); }
    // keys along the back (the cache), queries down the left
    const nk = k === 3 ? N + 4 : k >= 2 && k < 4 ? N + 1 : N, ka = tw(st, e, q => q === 4 ? 0 : 1);
    for (let j = 0; j < nk; j++) R.box([x(j), 0, ZK], [C * .8, .22, .3], { fill: mix(P.paper, P.k, .65), a: ka * (j >= N ? .9 : 1), lw: .6 });
    for (let i = 0; i < N; i++) R.ball([XQ, .12, z(i)], .09, { c: P.q, a: ka * (k >= 2 ? .35 : 1) });
    lab(R, [x(nk - 1) + .2, .11, ZK], 'keys and values: the cache', { fs: 12.5, b: 1, c: P.k, al: 'left', dx: 10, a: la(st, e, q => q === 4 ? 0 : 1) });
    lab(R, [XQ, .12, z(N / 2)], 'queries', { fs: 12.5, b: 1, c: P.q, al: 'right', dx: -10, a: la(st, e, q => q <= 1 ? 1 : 0) });
    // prefill: each query collects from its row of keys (more pairs, more dots)
    if (k === 0) for (let i = 0; i < N; i += 2) R.flow([[x(i), .08, z(i)], [XQ, .12, z(i)]], { c: P.c5, a: Math.min(1, e * 2), r: .045, n: 2 + Math.round(i / 2), speed: 1.2 });
    const l0 = la(st, e, q => q === 0 ? 1 : 0);
    lab(R, [x(N - 1), 0, z(N - 1) + .2], '12 prompt tokens, all rows at once', { fs: 12, c: P.mute, al: 'right', dy: 16, a: l0 });
    lab(R, [x(N - 1), 0, z(N - 1) + .2], 'T(T+1)/2 pairs: ' + pairs + ' billion per head per layer at 131,072', { fs: 12.5, b: 1, c: P.c5, al: 'right', dy: 34, a: l0 });
    // the weights: the same work for every token
    const wa = tw(st, e, q => q === 1 ? 1 : q <= 3 && q > 1 ? .25 : 0);
    if (wa > .01) for (let i = 0; i < N; i++) R.box([XW0 + LW / 2, 0, z(i)], [LW, .05, C * .84], { fill: mix(P.paper, P.mute, .35), a: wa, lw: .5, shadow: false, ea: .5 });
    const l1 = la(st, e, q => q === 1 ? 1 : 0);
    lab(R, [XW0 + LW, 0, z(N - 1) + .2], 'weights: the same for every token', { fs: 12.5, b: 1, c: P.ink, al: 'right', dy: 34, a: l1 });
    lab(R, [x(N - 1), 0, z(N - 1) + .2], 'attention: ' + pc(at(4096)[2]) + ' of a 4,096-token prefill, ' + pc(at(131072)[2]) + ' of a 131,072-token one', { fs: 12.5, b: 1, c: P.c5, al: 'right', dy: 16, a: l1 });
    // decode: the weight plate, a new row and its query, which reads every key
    const pa = tw(st, e, q => q >= 2 ? 1 : 0);
    if (pa > .01) { R.glass([XP - .6, 0, ZP], [1.2, 0, 0], [0, 1.3, 0], { c: P.c1, a: pa, nu: 6, nv: 6 });
      lab(R, [XP, 1.3, ZP], 'weights ' + gb(W8), { fs: 12.5, b: 1, c: P.c1, dy: -12, wide: 1, a: la(st, e, q => q >= 2 && q < 4 ? 1 : 0) }); }
    const rows = k === 2 ? [N] : k === 3 ? [N, N + 1, N + 2, N + 3] : [], hot = mix(P.paper, P.acc, .7);
    rows.forEach((r, ri) => { const a = ri === 0 ? la(st, e, q => q === 2 || q === 3 ? 1 : 0) : la(st, e, q => q === 3 ? 1 : 0) * (1 - .15 * ri);
      for (let j = 0; j <= r; j++) cell(R, r, j, ri === rows.length - 1 || rows.length === 1 ? hot : mix(P.paper, P.acc, .4), a);
      if (ri === rows.length - 1) { R.glow([XQ, .14, z(r)], .3, { c: P.q, a: a * .5 }); R.ball([XQ, .14, z(r)], .13, { c: P.q, a });
        for (let j = 0; j <= r; j++) R.flowArc([x(j), .22, ZK], [XQ, .16, z(r)], .35 + .02 * j, { c: P.acc, a: a * .75, r: .04, n: 4, speed: 1.6 });
        R.flowArc([XP, .65, ZP], [XQ, .16, z(r)], .9, { c: P.c1, a: a * .8, r: .06, n: 10, speed: 1.8 }); } });
    const l2 = la(st, e, q => q === 2 ? 1 : 0);
    lab(R, [x(N), 0, z(N) + .2], 'new token: reads every cached key and value', { fs: 12.5, b: 1, c: P.acc, al: 'right', dy: 16, a: l2 });
    lab(R, [x(N), 0, z(N) + .2], 'at 128K: ' + gib(KC.seq(p, 131072).total) + ' of cache + ' + gb(W8) + ' of weights per step', { fs: 12, c: P.ink, al: 'right', dy: 33, a: l2, wide: 1 });
    const l3 = la(st, e, q => q === 3 ? 1 : 0);
    lab(R, [x(N + 3), 0, z(N + 3) + .2], 'each step reads one more entry', { fs: 12.5, b: 1, c: P.acc, al: 'right', dy: 16, a: l3 });
    lab(R, [x(N + 3), 0, z(N + 3) + .2], 'decode attention FLOPs: half at about 28,600 tokens, ' + pc(at(131072)[1]) + ' at 131,072', { fs: 12, c: P.ink, al: 'right', dy: 33, a: l3, wide: 1 });
    // batching: four sequences, four caches, one weight read
    const ba = la(st, e, q => q === 4 ? 1 : 0);
    if (ba > .01) { const Zs = [-1.9, -.7, .5, 1.7];
      Zs.forEach((zz, s) => { for (let j = 0; j < N; j++) R.box([x(j), 0, zz], [C * .8, .22, .3], { fill: mix(P.paper, P.k, .65), a: ba, lw: .6 });
        const qp = [x(N) + .25, .16, zz]; R.ball(qp, .13, { c: P.q, a: ba });
        R.flow([[x(0), .3, zz], [qp[0] - .1, .3, zz]], { c: P.acc, a: ba * .8, r: .045, n: 9, speed: 1.4 });
        R.flowArc([XP, .65, ZP], qp, .5, { c: P.c1, a: ba * .55, r: .05, n: 3, speed: 1.8 });
        lab(R, [x(0), .22, zz], 'sequence ' + (s + 1) + ': its own cache', { fs: 12, c: P.k, al: 'right', dx: -10, a: ba, grp: 'seq' }); });
      lab(R, [XP, 1.3, ZP], 'one weight read serves all four', { fs: 12.5, b: 1, c: P.c1, dy: -14, a: ba }); }
  }
  const full = { cam: [.38, .66], bounds: [[-3.9, 0, -3.0], [4.4, 1.3, 2.4]] };
  S3.stage({ id: 'stg-pd', list: 'sx-pd', fig: 'Fig. 2 · prefill squares it, decode reads it', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1600, hold: 5200, draw,
    margin: w => w < 520 ? [22, 8, 30, 8] : [26, 30, 46, 120],
    view: k => k === 3 ? { cam: [.38, .66], bounds: [[-3.9, 0, -3.0], [4.4, 1.3, 3.8]] } : k === 2 ? { cam: [.38, .66], bounds: [[-3.9, 0, -3.0], [4.4, 1.3, 2.9]] } : full });
})();
