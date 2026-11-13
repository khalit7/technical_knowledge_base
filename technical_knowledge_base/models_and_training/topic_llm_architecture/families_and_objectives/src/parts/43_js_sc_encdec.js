// ---- Scene (section 5, Fig. 5): the encoder-decoder. An encoder stack reads six input tokens (the running sequence's opening, FOD.rs.pieces)
// both ways; its output, keys and values computed once per input, is a glass plate that feeds every decoder layer through cross-attention;
// the decoder writes one token per forward while its own cache grows and the cross cache stays fixed. Four layers are drawn per stack
// (illustrative; T5's compared models have 12 each). The last step is T5 Table 2 (published, as printed in this section's table). ----
(function () {
  if (!document.getElementById('stg-encdec') || !window.FOS) return;
  const { mix } = S3, { tw, la, lab, tok, col } = FOS;
  const IN = FOD.rs.pieces.slice(1, 7).map(tok), NL = 4, LY = l => .28 + l * .34, XE = -2.4, XD = 2.4, SW = 2.6, SD = .9, TOP = LY(NL - 1) + .3;
  const XI = j => XE - SW / 2 + .22 + j * (SW - .44) / 5, XO = j => XD - SW / 2 + .22 + j * (SW - .44) / 5;
  const T5 = [['encoder-decoder', '2P params · M FLOPs', 83.28], ['prefix LM', 'P · M', 81.82], ['causal decoder', 'P · M', 74.70]]; // T5 Table 2, GLUE
  function stack(R, x, a, c, P) { for (let l = 0; l < NL; l++) R.box([x, LY(l) - .12, 0], [SW, .16, SD], { fill: mix(P.paper, c, .32), a, shadow: l === 0 }); }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 4.6, -2, 2, .5);
    const fade = tw(st, e, s => s === 4 ? 0 : 1), ll = la(st, e, s => s === 4 ? 0 : 1);
    // the encoder and its input, read both ways
    stack(R, XE, fade, P.acc, P);
    IN.forEach((w, j) => { R.box([XI(j), 0, .9], [.34, .1, .3], { a: fade }); lab(R, [XI(j), 0, 1.05], w, { mono: true, fs: 12, c: P.ink, dy: 12, a: la(st, e, s => s <= 1 ? 1 : 0) }); });
    const f0 = la(st, e, s => s === 0 ? 1 : 0);
    if (f0 > .01) { IN.forEach((_, j) => R.flow([[XI(j), .1, .9], [XI(j), .1, .45], [XI(j), TOP, .45]], { c: P.acc, a: f0 * .8, r: .045, n: 7, speed: 1.2 }));
      [[0, 4], [5, 1], [2, 3], [4, 2]].forEach(([a, b]) => R.flowArc([XI(a), LY(0) + .05, .1], [XI(b), LY(0) + .05, .1], .25, { c: P.acc, a: f0 * .7, r: .04, n: 5, speed: 1.1 })); }
    lab(R, [XE - SW / 2, LY(1), 0], 'encoder · reads both ways', { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: -8, a: ll, grp: 'l' });
    // its output: keys and values for cross-attention, computed once per input
    const pa = tw(st, e, s => s >= 1 ? 1 : 0) * fade, pl = la(st, e, s => s === 1 || s === 3 ? 1 : 0);
    if (pa > .01) { R.glass([XE - SW / 2 + .1, TOP + .08, -.42], [SW - .2, 0, 0], [0, 0, .4], { c: P.k, a: pa, nu: 6, nv: 2 }); R.glass([XE - SW / 2 + .1, TOP + .08, .02], [SW - .2, 0, 0], [0, 0, .4], { c: P.v, a: pa, nu: 6, nv: 2 });
      lab(R, [XE, TOP + .1, -.45], k === 3 ? 'cross K, V · fixed' : 'encoder output · K, V computed once', { fs: 12.5, b: 1, c: P.k, dy: -12, a: pl }); }
    // the decoder: every layer reads the plate through cross-attention
    const da = tw(st, e, s => s >= 2 ? 1 : 0) * fade;
    if (da > .01) { stack(R, XD, da, P.c4, P); lab(R, [XD + SW / 2, LY(1), 0], 'decoder · causal', { fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 8, a: ll * da, grp: 'r' }); }
    const fx = la(st, e, s => s === 2 || s === 3 ? 1 : 0);
    if (fx > .01) for (let l = 0; l < NL; l++) R.flowArc([XE + SW / 2 - .2, TOP + .1, 0], [XD - SW / 2, LY(l), 0], .35 + .12 * (NL - l), { c: P.c4, a: fx * .85, r: .05, n: 9, speed: 1.4 });
    if (fx > .01 && k === 2) lab(R, [0, TOP + .5, 0], 'cross-attention in every decoder layer', { fs: 12.5, b: 1, c: P.c4, dy: -14, a: fx });
    // writing: one output per forward, the decoder's own cache grows beside it
    const nOut = k < 3 ? 0 : k > 3 ? 6 : Math.min(6, Math.floor(e * 6.99)), wa = la(st, e, s => s === 3 ? 1 : 0);
    for (let j = 0; j < 6; j++) { const on = j < nOut;
      R.box([XO(j), TOP + .02, 0], [.32, .16, .3], { fill: on ? mix(P.paper, P.c4, .75) : P.soft, a: da * (on ? 1 : .45), shadow: false, ea: on ? .8 : .3 }); }
    if (k >= 3) { const h = .12 * nOut, xc = XD + SW / 2 - .2; R.box([xc, 0, .95], [.3, Math.max(.02, h), .3], { fill: mix(P.paper, P.k, .6), a: fade });
      lab(R, [xc, 0, 1.1], 'self K, V · ' + nOut + ' of 6', { fs: 12.5, b: 1, c: P.k, dy: 14, a: wa });
      lab(R, [XD, TOP + .2, 0], 'one output token per forward', { fs: 12.5, b: 1, c: P.c4, dy: -14, a: wa }); }
    // T5 Table 2: twice the parameters, the same FLOPs, and the GLUE scores (published)
    const ca = tw(st, e, s => s === 4 ? 1 : 0), cl4 = la(st, e, s => s === 4 ? 1 : 0);
    if (ca > .01) T5.forEach(([nm, pf, v], i) => { const x = -1.6 + i * 1.6, h = v / 90 * 1.5 * ca;
      col(R, [x, 0, 1.1], h, .55, { fill: mix(P.paper, i === 0 ? P.c4 : i === 1 ? P.acc : P.mute, .7), a: ca });
      lab(R, [x, h + .06, 1.1], v.toFixed(2), { mono: true, fs: 13, b: 1, c: P.ink, dy: -10, a: cl4 });
      lab(R, [x, 0, 1.45], nm, { fs: 12.5, b: 1, c: P.ink, dy: 12, a: cl4 }); lab(R, [x, 0, 1.45], pf, { fs: 12, c: P.mute, dy: 28, a: cl4 }); });
  }
  const full = { cam: [.2, .5], bounds: [[-3.6, 0, -.6], [3.8, 1.75, 1.1]] };
  S3.stage({ id: 'stg-encdec', list: 'sx-encdec', fig: 'Fig. 5 · encoder-decoder: read once, cross-attend everywhere', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 5000, draw,
    margin: w => w < 520 ? [26, 8, 30, 8] : [30, 110, 30, 130],
    view: k => k === 0 ? { cam: [.25, .45], bounds: [[-4.8, 0, -.6], [.4, 1.7, 1.3]] } : k === 4 ? { cam: [.1, .32], bounds: [[-2.7, 0, .7], [2.7, 1.45, 1.6]] } : full });
})();
