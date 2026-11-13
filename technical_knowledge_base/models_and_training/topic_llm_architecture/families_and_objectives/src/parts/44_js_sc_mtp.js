// ---- Scene (section 7, Fig. 6): multi-token prediction on the tiny GPT. One trunk (6 blocks) over the tokens up to position i reaches h_i;
// the shared head predicts t i+1; a parallel head (one extra block on h_i alone) or DeepSeek-V3's sequential module (h_i plus the embedding
// of the known t i+1, the projection M, one block) predicts t i+2. Every number is FOD.mtpf (the frozen-trunk runs, 128 held-out windows,
// and the self-speculative decoding of the 8 prompts) or FOD.d.spec; the five tokens are the running sequence's opening (illustrative position). ----
(function () {
  if (!document.getElementById('stg-mtp') || !window.FOS) return;
  const { mix } = S3, { tw, la, lab, tok, col, pct, int } = FOS, M = FOD.mtpf, H = M.held_out, SP = FOD.d.spec;
  const T = FOD.rs.pieces.slice(1, 6).map(tok), QI = 2, XT = j => -3.2 + j * .8, ZT = 1.1, XK = -2.4, NB = 6, BY = l => .1 + l * .2, HY = BY(NB) + .12, HP = HY + .32;
  const XM = 1.3, YM = .35, YB = .75, YH = 1.45;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.2, 3.6, -1.4, 2.2, .5);
    const fd = tw(st, e, s => s >= 3 ? 0 : 1), ll = la(st, e, s => s >= 3 ? 0 : 1);
    // the tokens: 0..i are the context; i+1 and i+2 are what is predicted
    T.forEach((w, j) => { const fut = j > QI; R.box([XT(j), 0, ZT], [.62, .14, .45], { fill: fut ? P.soft : P.paper, a: fd, ea: fut ? .35 : .78 });
      lab(R, [XT(j), 0, ZT + .25], w, { mono: true, fs: 12.5, b: j === QI, c: fut ? P.mute : P.ink, dy: 12, a: ll }); });
    // the trunk: 6 blocks, its state at i, the shared head, the prediction of t i+1
    for (let l = 0; l < NB; l++) R.box([XK, BY(l), 0], [2.0, .14, .8], { fill: mix(P.paper, P.acc, .3), a: fd, shadow: l === 0 });
    R.box([XT(QI), HY - .06, 0], [.4, .14, .4], { fill: mix(P.paper, P.acc, .8), a: fd });
    R.glass([XT(QI) - .42, HP, -.42], [.84, 0, 0], [0, 0, .84], { c: P.acc, a: fd, nu: 5, nv: 5 });
    const f0 = la(st, e, s => s === 0 ? 1 : 0);
    if (f0 > .01) { for (let j = 0; j <= QI; j++) R.flow([[XT(j), .15, ZT], [XT(j), .15, .45], [XT(QI), HY, 0]], { c: P.acc, a: f0 * .8, r: .045, n: 8, speed: 1.3 });
      R.flow([[XT(QI), HY + .1, 0], [XT(QI), HP + .5, 0], [XT(QI + 1), HP + .5, .5], [XT(QI + 1), .2, ZT]], { c: P.acc, a: f0, r: .06, n: 10, speed: 1.4 }); }
    lab(R, [XK - 1, BY(2), 0], 'trunk · 6 blocks', { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: -8, a: ll, grp: 'l' });
    lab(R, [XT(QI) - .45, HY, 0], 'h i', { mono: true, fs: 13, b: 1, c: P.acc, al: 'right', dx: -6, a: ll });
    lab(R, [XT(QI), HP + .05, -.42], 'shared head', { fs: 12.5, b: 1, c: P.acc, dy: -12, a: ll });
    [...new Set([st.pk, k])].forEach(s => { const a = la(st, e, t => t === s ? 1 : 0); if (a < .01 || s > 2) return;
      lab(R, s === 0 ? [XT(QI + 1), HP + .5, .5] : [XT(QI + 2), YH + .3, .5], s === 0 ? 't i+1 · top-1 ' + pct(H.main_next.top1) : 't i+2 · top-1 ' + pct(s === 1 ? H.parallel.top1 : H.sequential.top1), { fs: 12.5, b: 1, c: s === 0 ? P.acc : s === 1 ? P.c2 : P.c4, dy: -14, a }); });
    // the extra predictor beside the trunk: a parallel head (step 2) or the sequential module (step 3)
    const pa = tw(st, e, s => s === 1 ? 1 : 0) * fd, sa = tw(st, e, s => s === 2 ? 1 : 0) * fd;
    if (pa > .01) { R.box([XM, YB, 0], [.9, .26, .7], { fill: mix(P.paper, P.c2, .45), a: pa, shadow: false }); R.glass([XM - .42, YH, -.42], [.84, 0, 0], [0, 0, .84], { c: P.acc, a: pa, nu: 5, nv: 5 });
      R.flowArc([XT(QI) + .2, HY, 0], [XM - .45, YB + .2, 0], .3, { c: P.c2, a: pa, r: .055, n: 9, speed: 1.3 });
      R.flow([[XM, YB + .3, 0], [XM, YH + .3, 0], [XT(QI + 2), YH + .3, .5], [XT(QI + 2), .2, ZT]], { c: P.c2, a: pa, r: .06, n: 10, speed: 1.4 });
      lab(R, [XM + .5, YB + .13, 0], 'one extra block · sees h i only', { fs: 12.5, b: 1, c: P.c2, al: 'left', dx: 8, a: la(st, e, s => s === 1 ? 1 : 0), grp: 'r' }); }
    if (sa > .01) { R.glass([XM - .42, YM, -.42], [.84, 0, 0], [0, 0, .84], { c: P.c4, a: sa, nu: 8, nv: 4 }); R.box([XM, YB, 0], [.9, .26, .7], { fill: mix(P.paper, P.c4, .45), a: sa, shadow: false });
      R.glass([XM - .42, YH, -.42], [.84, 0, 0], [0, 0, .84], { c: P.acc, a: sa, nu: 5, nv: 5 });
      R.flowArc([XT(QI) + .2, HY, 0], [XM - .4, YM + .05, 0], .3, { c: P.acc, a: sa, r: .05, n: 9, speed: 1.3 });
      R.flowArc([XT(QI + 1), .16, ZT], [XM, YM, .2], .35, { c: P.c4, a: sa, r: .06, n: 9, speed: 1.3 });
      R.flow([[XM, YM + .05, 0], [XM, YB, 0]], { c: P.c4, a: sa, r: .05, n: 3, speed: .8 });
      R.flow([[XM, YB + .3, 0], [XM, YH + .3, 0], [XT(QI + 2), YH + .3, .5], [XT(QI + 2), .2, ZT]], { c: P.c4, a: sa, r: .06, n: 10, speed: 1.4 });
      const l3 = la(st, e, s => s === 2 ? 1 : 0);
      lab(R, [XM + .5, YM, 0], 'M · 2d to d', { fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 8, a: l3, grp: 'r' });
      lab(R, R.arcPt([XT(QI + 1), .16, ZT], [XM, YM, .2], .35, .5), 'Emb(t i+1), the known token', { fs: 12.5, b: 1, c: P.c4, dy: 30, a: l3 }); // below its own stream
      lab(R, [XM + .5, YB + .13, 0], 'one block (TRM)', { fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 8, a: l3, grp: 'r' }); }
    // step 4: as a draft, on the 8 prompts: acceptance and tokens per forward
    const da = tw(st, e, s => s === 3 ? 1 : 0), dl = la(st, e, s => s === 3 ? 1 : 0);
    if (da > .01) { [['sequential', H.sequential_accept.top1, SP.sequential.tpf, P.c4], ['parallel', H.parallel_accept.top1, SP.parallel.tpf, P.c2]].forEach(([nm, acc, tpf, c], i) => {
        const x = -1.9 + i * .75; col(R, [x, 0, -.2], acc * 1.6 * da, .5, { fill: mix(P.paper, c, .7), a: da }); lab(R, [x, acc * 1.6 + .08, -.2], pct(acc), { mono: true, fs: 12.5, b: 1, c: P.ink, dy: -10, a: dl });
        const x2 = .9 + i * .75; col(R, [x2, 0, -.2], (tpf - 1) * 1.6 * da + .02, .5, { fill: mix(P.paper, c, .7), a: da }); lab(R, [x2, (tpf - 1) * 1.6 + .1, -.2], tpf.toFixed(2), { mono: true, fs: 12.5, b: 1, c: P.ink, dy: -10, a: dl });
        lab(R, [x, 0, .1], nm, { fs: 12, c, dy: 14, a: dl }); lab(R, [x2, 0, .1], nm, { fs: 12, c, dy: 14, a: dl }); });
      lab(R, [-1.52, 0, .1], 'draft accepted', { fs: 12.5, b: 1, c: P.ink, dy: 32, a: dl }); lab(R, [1.27, 0, .1], 'tokens per forward, above 1', { fs: 12.5, b: 1, c: P.ink, dy: 32, a: dl }); }
    // step 5: the parameter bill, to scale (tiny GPT); DeepSeek-V3's for comparison
    const ba = tw(st, e, s => s === 4 ? 1 : 0), bl = la(st, e, s => s === 4 ? 1 : 0);
    if (ba > .01) { const S = 1.6 / M.main_params;
      [['main model', M.main_params, P.acc], ['sequential module', M.params.sequential, P.c4], ['parallel head', M.params.parallel, P.c2]].forEach(([nm, v, c], i) => { const x = -1.6 + i * 1.3, h = v * S * ba;
        col(R, [x, 0, -.2], h, .6, { fill: mix(P.paper, c, .7), a: ba }); lab(R, [x, h + .08, -.2], int(v), { mono: true, fs: 12.5, b: 1, c: P.ink, dy: -10, a: bl }); lab(R, [x, 0, .15], nm, { fs: 12.5, b: 1, c, dy: 14, a: bl }); }); }
  }
  const full = { cam: [.3, .38], bounds: [[-4.2, 0, -.6], [2.9, 2.3, 1.5]] };
  S3.stage({ id: 'stg-mtp', list: 'sx-mtp', fig: 'Fig. 6 · one trunk, a second prediction, tiny GPT', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 5000, draw,
    margin: w => w < 520 ? [26, 8, 30, 8] : [30, 120, 30, 18],
    view: k => k >= 3 ? { cam: [.12, .3], bounds: [[-2.6, 0, -.6], [2.6, 1.8, .6]] } : full });
})();
