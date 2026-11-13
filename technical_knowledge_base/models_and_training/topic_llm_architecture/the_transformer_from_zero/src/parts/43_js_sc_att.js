// ---- Fig. 3: one attention head by hand, on the trained tiny GPT (layer 1, head 4) for the running sequence's token "o" at position 157 ----
// The (T, T) score matrix lies on the floor (keys across, queries in depth) with its causal triangle; query row 157 rises as real columns:
// scaled scores, then softmax weights (TZS.l1_scores[4], TZS.l1_attn[4]); q, k, v and the head's output are the trace's real 32-number slices.
(function () {
  if (!document.getElementById('stg-att') || !window.TZK) return; const K = TZK, S = TZS, { at, off, lerp, mix } = S3;
  const H = 4, hd = 32, QI = S.pos, nk = QI + 1, sl = v => v.slice(H * hd, H * hd + hd);
  const q = sl(S.l1.q), k = sl(S.l1.k), v = sl(S.l1.v), y = sl(S.l1.head_out), sc = S.l1_scores[H], w = S.l1_attn[H];
  const smax = Math.max(...sc.map(Math.abs)), wmax = Math.max(...w), mq = Math.max(...[q, k, v].flat().map(Math.abs));
  const top = w.map((x, j) => [x, j]).sort((a, b) => b[0] - a[0]);
  const KX = j => -4.8 + (j + .5) * 9.6 / 256, QZ = i => -2.4 + (i + .5) * 4.8 / 256, ZR = QZ(QI), E200 = 200;
  const ZN = 2.75, ZP = 3.65, ZC = 4.6, XQ = 4.9, XK = 6.05, XV = 7.2, YX = 6.4, YZ = 1.25, CH = 1.9;
  function draw(R, k0, e, st) {
    const P = R.P, kk = k0; R.grid(-5.4, 8.4, -3, 5.2, .5);
    // the score matrix on the floor: the lower triangle is what attention may read, the upper one the mask
    const mA = kk >= 2 ? 1 : kk === 1 ? .35 + .65 * e : .35, uA = K.tw(st, e, s => s >= 2 ? 1 : .25);
    R.quad([[-4.8, .002, -2.4], [-4.8, .002, 2.4], [4.8, .002, 2.4]], { fill: mix(P.paper, P.c1, .16), a: mA, ea: .5 });
    R.quad([[-4.8, .002, -2.4], [4.8, .002, -2.4], [4.8, .002, 2.4]], { fill: mix(P.paper, P.ink, P.dark ? .55 : .3), a: uA * (kk >= 2 ? .9 : .5), ea: .4 });
    R.line([[-4.8, .004, ZR], [4.8, .004, ZR]], { c: P.q, w: 1.6, a: kk >= 1 && kk <= 4 ? .8 : .35 });
    K.lab(R, [-4.8, 0, ZR], 'query row 157: "o"', { al: 'right', dx: -8, mono: true, fs: 12, c: P.q, a: K.la(st, e, s => s === 1 || s === 2 ? 1 : 0), grp: 'L' });
    K.lab(R, [-4.8, 0, -2.4], 'keys 0 to 255', { al: 'left', dy: -12, mono: true, fs: 12, c: P.mute, a: K.la(st, e, s => s >= 1 && s <= 5 ? 1 : 0), wide: 1 });
    K.lab(R, [1.6, 0, -1.3], 'j > i: masked to −∞', { mono: true, fs: 12.5, b: 1, c: P.ink, a: K.la(st, e, s => s === 2 || s === 3 ? 1 : 0), wide: 1 });
    K.lab(R, [-2.6, 0, 1.6], 'j ≤ i: read', { mono: true, fs: 12.5, b: 1, c: P.c1, a: K.la(st, e, s => s === 2 ? 1 : 0), wide: 1 });
    // 1. the head's three matrices: LN(x) of "o" through Wq, Wk, Wv (256 x 32 each) into q, k, v (32 numbers each)
    const gA = K.tw(st, e, s => s === 0 ? 1 : 0);
    K.comb(R, [XK, .3, ZN], S.l1.norm1, { wd: 2.6, h: .25, a: gA, legs: 1 });
    K.lab(R, [XK + 1.3, .3, ZN], 'LN(x) of "o": 256', { mono: true, fs: 12, al: 'left', dx: 8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    [['Wq', P.q, XQ, q], ['Wk', P.k, XK, k], ['Wv', P.v, XV, v]].forEach(([nm, c, x, vec], i) => {
      K.plateZ(R, x, .62, ZP, .85, .85, { c, a: gA, nu: 4, nv: 8 });
      K.lab(R, [x, 1.47, ZP], nm + ' (256, 32)', { mono: true, fs: 12, b: 1, c, dy: -8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
      if (kk === 0) R.flow([[XK + (x - XK) * .4, .4, ZN - .1], [x, 1.0, ZP], [x, .4, ZC + .1]], { c, a: e, r: .06, speed: 1.1 });
      const ca = i === 0 ? K.tw(st, e, s => s === 0 || s === 1 ? 1 : s === 3 ? 0 : s <= 4 ? .35 : 0) : i === 2 ? K.tw(st, e, s => s === 0 || s === 4 ? 1 : 0) : gA;
      K.comb(R, [x, .28, ZC], vec, { wd: .85, h: .22, m: mq, c, a: kk === 0 ? Math.max(.15, e) * ca : ca, legs: 1 });
      K.lab(R, [x, .05, ZC + .1], ['q', 'k', 'v'][i] + ': 32', { mono: true, fs: 12, b: 1, c, dy: 16, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    });
    // 2-5. row 157 of the scores: real columns over keys 0..157; the 98 later keys are masked slots
    const cA = kk >= 1 ? (kk === 1 ? e : 1) : 0, sm = kk >= 3 ? (kk === 3 ? e : 1) : 0, fadeC = kk === 5 ? .3 : 1;
    if (cA > 0) for (let j = 0; j < nk; j++) {
      const hs = Math.abs(sc[j]) / smax * CH, hw = w[j] / wmax * CH, h = Math.max(.006, lerp(hs, hw, sm));
      const fill = sm > 0 ? mix(sc[j] >= 0 ? P.c5 : mix(P.paper, P.c5, .45), P.q, sm) : sc[j] >= 0 ? P.c5 : mix(P.paper, P.c5, .45);
      R.box([KX(j), 0, ZR], [.03, h * cA, .07], { fill, a: fadeC * (sm > .5 && w[j] < .01 ? .55 : 1), shadow: false, lw: .3, ea: .35 });
    }
    if (kk >= 2) { const ma = kk === 2 ? e : 1; for (let j = nk; j < 256; j += 1) R.quad([[KX(j) - .015, .006, ZR - .035], [KX(j) + .015, .006, ZR - .035], [KX(j) + .015, .006, ZR + .035], [KX(j) - .015, .006, ZR + .035]], { fill: P.mute, a: ma * .5, edge: false }); }
    // query to keys: dots stream from q to the strongest keys while the scores rise
    if (kk === 1) top.slice(0, 6).forEach(([, j]) => R.flowArc([XQ, .5, ZC], [KX(j), .4, ZR], .9, { c: P.q, a: .8, r: .05, speed: 1.6, n: 7 }));
    const sTop = sc.indexOf(Math.max(...sc));
    K.lab(R, [KX(sTop), Math.abs(sc[sTop]) / smax * CH, ZR], K.show(sTop) + ' ' + sc[sTop].toFixed(2), { mono: true, fs: 12.5, dy: -12, a: K.la(st, e, s => s === 1 || s === 2 ? 1 : 0) });
    // softmax: the top four keys named with their weights
    top.slice(0, 4).forEach(([x, j], r) => K.lab(R, [KX(j), x / wmax * CH, ZR], K.show(j) + ' @' + j + ' ' + K.pct(x), { mono: true, fs: 12.5, b: r === 0, c: P.q, dy: -12, grp: 'top', a: K.la(st, e, s => s === 3 || s === 4 ? 1 : 0) }));
    // 5. the output: the values stream into y in proportion to their weights
    if (kk === 4) top.slice(0, 10).forEach(([x, j]) => R.flowArc([KX(j), x / wmax * CH + .05, ZR], [YX, .75, YZ], 1.1, { c: P.v, a: .3 + .7 * Math.min(1, x * 2.5), r: .04 + .06 * x, n: Math.max(2, Math.round(3 + x * 18)), speed: 1.2 }));
    const yA = K.tw(st, e, s => s === 4 ? 1 : s === 5 ? .3 : 0);
    K.comb(R, [YX, .45, YZ], y, { wd: .85, h: .3, c: P.v, a: yA, legs: 1 });
    K.lab(R, [YX, .8, YZ], 'y = Σ wⱼ vⱼ: 32', { mono: true, fs: 12.5, b: 1, c: P.v, dy: -10, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    // 6. the edit test: key 200 lies in the masked triangle for rows 0..199, so editing token 200 cannot move them
    const eA = K.tw(st, e, s => s === 5 ? 1 : 0);
    if (eA > .01) { const x0 = KX(E200) - .05, x1 = KX(E200) + .05, zc = QZ(E200) - .01;
      R.quad([[x0, .01, -2.4], [x1, .01, -2.4], [x1, .01, zc], [x0, .01, zc]], { fill: P.good, a: eA * .85, edge: false });
      R.quad([[x0, .01, zc], [x1, .01, zc], [x1, .01, 2.4], [x0, .01, 2.4]], { fill: P.bad, a: eA * .9, edge: false });
      K.lab(R, [KX(E200), 0, -1.5], 'rows 0 to 199: move 0.0', { mono: true, fs: 12.5, b: 1, c: P.good, al: 'left', dx: 10, a: K.la(st, e, s => s === 5 ? 1 : 0) });
      K.lab(R, [KX(E200), 0, 1.9], 'rows 200 to 255 move', { mono: true, fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 10, a: K.la(st, e, s => s === 5 ? 1 : 0) });
      K.lab(R, [KX(E200), 0, 2.4], 'edit token 200', { mono: true, fs: 12, c: P.ink, dy: 14, a: K.la(st, e, s => s === 5 ? 1 : 0) }); }
  }
  const full = { cam: [.22, .72], bounds: [[-5.2, 0, -2.6], [8, 1.9, 4.9]] };
  S3.stage({ id: 'stg-att', list: 'sx-att', fig: 'Fig. 3 \u00b7 layer 1, head 4 of the trained tiny GPT', cam: full.cam, bounds: full.bounds, aspect: .62, margin: K.margin, dur: 1500, hold: 4800, draw,
    view: k => k === 0 ? { cam: [.12, .6], bounds: [[4.1, 0, 2.4], [8, 1.5, 4.9]] } : k === 1 || k === 3 ? { cam: [.28, .42], bounds: [[-5, 0, -.6], [5.6, 2.1, 3.2]] }
      : k === 4 ? { cam: [.3, .55], bounds: [[-3.5, 0, -.6], [7.6, 2, 3]] } : full });
})();
