// ---- Fig. 5: one pre-norm block, "o" through block 1 of the trained tiny GPT. The stream runs straight along the front rail; each sub-layer reads a
// normalised copy on the lane behind and adds its result back. Vectors are the trace's (TZS.l1: x_in, norm1, attn_out, x_mid, norm2, ffn_up, ffn_act,
// ffn_out, x_out), each drawn to its own scale with its norm as its label; the FFN's 1,024 hidden numbers run behind, four times as long. ----
(function () {
  if (!document.getElementById('stg-blk') || !window.TZK) return; const K = TZK, S = TZS, { lerp, lerp3, mix } = S3;
  const L1 = S.l1, N = S.l1_norm, RY = .55, RZ = .9, LZ = -.9, CW = 1.15;
  const XI = -4.6, XA1 = -3.35, XN1 = -2.45, XAT = -1.35, XAO = -.3, XM = .5, XA2 = 1.35, XN2 = 2.2, XUP = 3.35, XDN = 5.35, XFO = 5.85, XO = 6.75, ZU = -2.75, UW = 3.4;
  const plus = (R, x, a) => { R.box([x, 0, RZ], [.26, RY - .04, .26], { a, fill: R.P.paper }); };
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.4, 7.6, -3.6, 2, .5);
    // the rail: the residual stream, straight through
    const rA = K.tw(st, e, s => s === 5 ? .5 : 1);
    R.box([lerp(-5.2, 7.4, .5), 0, RZ], [12.6, .08, .5], { fill: mix(P.paper, P.c1, .35), a: rA, shadow: false });
    if (k !== 5) R.flow([[-5.1, .1, RZ], [7.3, .1, RZ]], { c: P.c1, a: .55, r: .05, speed: 1.4 });
    // 1. the stream arrives
    const xA = K.tw(st, e, s => s === 0 ? 1 : s === 2 ? .6 : .3);
    K.comb(R, [XI, RY, RZ], L1.x_mid.map((_, i) => S.emb.x[i]), { wd: CW, h: .35, c: P.c1, a: xA, legs: 1 });
    K.lab(R, [XI, RY + .45, RZ], 'x · ' + N.x_in.toFixed(2), { mono: true, fs: 12, b: 1, c: P.c1, dy: -6, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    // 2. attention's branch: norm a copy, attend, its output
    const bA = K.tw(st, e, s => s === 1 ? 1 : s === 2 ? .45 : s === 5 ? .2 : .25);
    if (k === 1) R.flowArc([XA1 - .5, .12, RZ], [XA1, .3, LZ], .3, { c: P.c1, a: .9, r: .05, n: 6 });
    K.plateX(R, XA1, .1, LZ, 1.0, .8, { c: P.c5, a: bA, nu: 3, nv: 4 });
    K.comb(R, [XN1, RY, LZ], L1.norm1, { wd: CW * .8, h: .35, c: P.c5, a: bA, legs: 1 });
    R.box([XAT, 0, LZ], [.75, .7, .75], { fill: mix(P.paper, P.c2, .5), a: bA });
    K.comb(R, [XAO, RY, LZ], L1.attn_out, { wd: CW * .8, h: .35, c: P.c2, a: bA, legs: 1 });
    if (k === 1) R.flow([[XN1 + .5, .5, LZ], [XAT, .5, LZ], [XAO - .5, .5, LZ]], { c: P.c2, a: .9, r: .05, n: 6 });
    K.lab(R, [XA1, .9, LZ - .5], 'LayerNorm', { mono: true, fs: 12, c: P.c5, b: 1, al: 'right', dx: -2, dy: -8, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [XN1 + CW * .4, RY + .3, LZ], 'copy · ' + N.norm1.toFixed(1), { mono: true, fs: 12, c: P.c5, b: 1, al: 'left', dx: 4, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [XAT, .7, LZ], 'attention', { mono: true, fs: 12, b: 1, c: P.c2, dy: -10, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [XAO, RY + .45, LZ], N.attn_out.toFixed(2), { mono: true, fs: 12, b: 1, c: P.c2, dy: -6, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    // 3. add it back
    const pA = K.tw(st, e, s => s === 2 ? 1 : s === 5 ? .2 : .3);
    plus(R, XM - .75, pA);
    if (k === 2) R.flowArc([XAO, .3, LZ], [XM - .75, RY, RZ], .35, { c: P.c2, a: .95, r: .06, n: 7 });
    K.comb(R, [XM, RY, RZ], L1.x_mid, { wd: CW, h: .35, c: P.c1, a: K.tw(st, e, s => s === 2 ? 1 : s === 3 ? .6 : s >= 1 ? .3 : .15) });
    K.lab(R, [XM, RY + .45, RZ], 'x + attn · ' + N.x_mid.toFixed(2), { mono: true, fs: 12, b: 1, c: P.c1, dy: -6, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    // 4. the FFN's branch: norm a copy, widen to 1,024 (in depth), GELU
    const fA = K.tw(st, e, s => s === 3 ? 1 : s === 4 ? .45 : s === 5 ? .2 : .2);
    if (k === 3) R.flowArc([XA2 - .5, .12, RZ], [XA2, .3, LZ], .3, { c: P.c1, a: .9, r: .05, n: 6 });
    K.plateX(R, XA2, .1, LZ, 1.0, .8, { c: P.c5, a: fA, nu: 3, nv: 4 });
    K.comb(R, [XN2, RY, LZ], L1.norm2, { wd: CW * .8, h: .35, c: P.c5, a: fA, legs: 1 });
    K.plateZ(R, XUP, .1, (LZ + ZU) / 2, UW, .85, { c: P.c3, a: fA, nu: 8, nv: 3 });
    const actPhase = k === 3 ? Math.max(0, 2 * e - 1) : k > 3 ? 1 : 0;
    K.comb(R, [XUP, RY, ZU], L1.ffn_up.map((u, i) => lerp(u, L1.ffn_act[i], actPhase)), { wd: UW, h: .35, m: Math.max(...L1.ffn_up.map(Math.abs)), c: P.c3, a: fA, legs: 1 });
    K.plateX(R, XDN, .1, (LZ + ZU) / 2, 1.2, .85, { c: P.c3, a: K.tw(st, e, s => s === 4 ? 1 : s === 3 ? .45 : .2), nu: 3, nv: 3 });
    if (k === 3) R.flow([[XN2 + .4, .5, LZ], [XUP - .8, .5, (LZ + ZU) / 2], [XUP - .4, .55, ZU + .1]], { c: P.c3, a: .9, r: .05, n: 7 });
    K.lab(R, [XA2, .9, LZ - .5], 'LayerNorm', { mono: true, fs: 12, c: P.c5, b: 1, al: 'right', dx: -2, dy: -8, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    K.lab(R, [XN2 + CW * .4, RY + .3, LZ], 'copy · ' + N.norm2.toFixed(1), { mono: true, fs: 12, c: P.c5, b: 1, al: 'left', dx: 4, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    K.lab(R, [XUP, RY + .45, ZU], 'W_up: 1,024 numbers, then GELU', { mono: true, fs: 12, b: 1, c: P.c3, dy: -8, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    // 5. back down to 256 and add: the stream leaves the block
    const dA = K.tw(st, e, s => s === 4 ? 1 : s === 5 ? .2 : 0);
    K.comb(R, [XFO, RY, LZ], L1.ffn_out, { wd: CW * .8, h: .35, c: P.c3, a: dA, legs: 1 });
    if (k === 4) { R.flow([[XUP + UW / 2, .55, ZU], [XDN, .5, (LZ + ZU) / 2], [XFO - .45, .5, LZ]], { c: P.c3, a: .9, r: .05, n: 6 }); R.flowArc([XFO, .3, LZ], [XO - .75, RY, RZ], .35, { c: P.c3, a: .95, r: .06, n: 7 }); }
    plus(R, XO - .75, K.tw(st, e, s => s === 4 ? 1 : .25));
    K.comb(R, [XO, RY, RZ], L1.x_out, { wd: CW, h: .35, c: P.c1, a: K.tw(st, e, s => s === 4 ? 1 : s === 5 ? .7 : s >= 3 ? .3 : .12), legs: 1 });
    K.lab(R, [XDN, .95, (LZ + ZU) / 2], 'W_down → 256', { mono: true, fs: 12, b: 1, c: P.c3, dy: -8, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    K.lab(R, [XFO, RY + .45, LZ], N.ffn_out.toFixed(1), { mono: true, fs: 12, b: 1, c: P.c3, dy: -6, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    K.lab(R, [XO, RY + .45, RZ], 'out · ' + N.x_out.toFixed(1), { mono: true, fs: 12, b: 1, c: P.c1, dy: -6, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    // 6. six blocks: the same structure five more times
    const sA = K.tw(st, e, s => s === 5 ? 1 : 0);
    if (sA > .01) { for (let b = 0; b < 6; b++) { const x = -4.2 + b * 2.05;
        K.frame(R, [x, .02, 0], [1.6, 1.15, 4.0], { c: b ? P.mute : P.ink, a: sA * (b ? .6 : .9), dash: b ? [4, 4] : null });
        R.box([x - .35, .1, LZ + .2], [.45, .5, .5], { fill: mix(P.paper, P.c2, .5), a: sA, shadow: false }); R.box([x + .35, .1, LZ + .2], [.45, .5, .5], { fill: mix(P.paper, P.c3, .5), a: sA, shadow: false });
        K.lab(R, [x, 1.17, 0], 'block ' + (b + 1), { mono: true, fs: 12, b: b === 0, dy: -8, a: K.la(st, e, s => s === 5 ? 1 : 0) }); }
      R.flow([[-5.1, .12, RZ], [7.3, .12, RZ]], { c: P.c1, a: sA * .8, r: .05, speed: 1.6 }); }
    K.lab(R, [1.0, 0, RZ + .3], '786,944 parameters each: 262,144 + 524,288 + 512', { mono: true, fs: 12.5, b: 1, dy: 30, a: K.la(st, e, s => s === 5 ? 1 : 0) });
  }
  const full = { cam: [.2, .62], bounds: [[-5.3, 0, -3.3], [7.4, 1.5, 1.3]] };
  S3.stage({ id: 'stg-blk', list: 'sx-blk', fig: 'Fig. 5 \u00b7 "o" through block 1', cam: full.cam, bounds: full.bounds, aspect: .55, margin: K.margin, dur: 1500, hold: 4600, draw,
    view: k => k === 0 ? { cam: [.3, .5], bounds: [[-5.3, 0, -1.4], [-1.2, 1.3, 1.4]] } : k === 1 || k === 2 ? { cam: [.3, .58], bounds: [[-4.8, 0, -1.6], [1.4, 1.4, 1.4]] }
      : k === 3 || k === 4 ? { cam: [.15, .6], bounds: [[.9, 0, -3.2], [7.4, 1.4, 1.4]] } : full });
})();
