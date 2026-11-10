// ---- Fig. 1 (the hero): the tiny GPT end to end, left to right in the order data flows: ids, the two tables, six pre-norm blocks on one
// residual stream, the final norm, the token table again (tied), the next-token probabilities and the loss. Counts are the page's (accounting.py);
// the stream norms and the probabilities are the trained model's (TZS, the root's trace); the removal losses are the page's ablations (TZD.abl).
// Sizes are not to scale (the token table would be 16 times the position table's height); the steps say so. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.TZK) return; const K = TZK, S = TZS, { at, lerp, mix } = S3;
  const TOK = [153, 154, 155, 156, 157], TX0 = r => -6.75 + r * .5, TZ0 = 1.45, TZ = j => (j - 2) * .42, BX = i => -3.1 + i * 1.22, XK = -6.0, XT = -5.2, XP = -4.5, XF = 3.65, XU = 4.35, XL = 5.25;
  const RY = .32, RH = .08, RD = 1.8, SB = .5;
  const ab = k => { const a = TZD.abl.find(x => x.key === k); return a ? a.val.toFixed(3) : ''; };
  const med = S.norms.stream_median, mi = [0, 2, 4, 6, 8, 10, 12];
  function block(R, i, a, detail, st, e) {
    const P = R.P, x = BX(i), A = a;
    K.frame(R, [x, .02, 0], [1.16, 1.32, 2.0], { c: P.mute, a: A * .7, dash: [4, 4] });
    K.plateX(R, x - .44, SB, 0, 1.2, .5, { c: P.c5, a: A, nu: 3, nv: 3 });
    R.box([x - .2, SB, 0], [.32, .62, 1.3], { fill: mix(P.paper, P.c2, .55), a: A, shadow: false });
    K.plateX(R, x + .08, SB, 0, 1.2, .5, { c: P.c5, a: A, nu: 3, nv: 3 });
    R.box([x + .33, SB, 0], [.32, .62, 1.3], { fill: mix(P.paper, P.c3, .55), a: A, shadow: false });
    if (detail > .01) { // the two branches: read a normalised copy, write back with a sum
      R.flowArc([x - .6, RY + RH, .2], [x - .2, SB + .62, .2], .25, { c: P.c1, a: detail * .9, r: .05, n: 5 });
      R.flowArc([x - .1, SB + .62, -.2], [x + .02, RY + RH, -.2], .2, { c: P.c2, a: detail * .9, r: .05, n: 5 });
      R.flowArc([x - .02, RY + RH, .2], [x + .33, SB + .62, .2], .25, { c: P.c1, a: detail * .9, r: .05, n: 5 });
      R.flowArc([x + .43, SB + .62, -.2], [x + .58, RY + RH, -.2], .2, { c: P.c3, a: detail * .9, r: .05, n: 5 });
    }
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-7.4, 7.4, -1.8, 1.8, .5);
    const fo = (s, on, rest) => K.tw(st, e, t => t === s || (on && on.includes(t)) ? 1 : (rest == null ? .22 : rest));
    // 1. ids and the two tables
    const a1 = fo(0, [5]);
    TOK.forEach((j, r) => K.tile(R, [TX0(r), 0, TZ0], null, { w: .44, d: .34, a: a1 }));
    TOK.forEach((j, r) => K.lab(R, [TX0(r), .1, TZ0], K.piece(j).replace(/^ /, '␣'), { serif: true, fs: 12.5, b: 1, dy: -12, a: K.la(st, e, s => s === 0 ? 1 : 0) }));
    K.plateX(R, XT, .1, 0, RD, 2.2, { c: P.c1, a: a1, nu: 4, nv: 16 });
    K.plateX(R, XP, .1, 0, RD, .55, { c: P.c6, a: a1, nu: 4, nv: 4 });
    if (k === 0) TOK.forEach((j, r) => { R.flow([[TX0(r), .1, TZ0 - .1], [XT, .4 + .3 * r, TZ(r) * .9], [XP, .3, TZ(r)], [XP + .5, RY + .08, TZ(r)]], { c: P.c1, a: e * .85, r: .05, n: 6 }); });
    K.lab(R, [XT, 2.3, 0], 'token table 4,096 × 256', { mono: true, fs: 12, b: 1, c: P.c1, dy: -8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    K.lab(R, [XP, .65, -.9], 'positions 256 × 256', { mono: true, fs: 12, b: 1, c: P.c6, al: 'left', dx: 8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    K.lab(R, [XP + .5, RY + RH, .9], 'x (1, 256, 256)', { mono: true, fs: 12, c: P.c1, al: 'left', dx: 6, dy: 14, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    // the residual stream: one ribbon through every block
    const ra = K.tw(st, e, s => s === 3 ? .8 : s === 0 ? .6 : 1);
    R.box([lerp(XP + .35, XF + .2, .5), RY, 0], [XF + .2 - XP - .35, RH, RD], { fill: mix(P.paper, P.c1, .3), a: ra, shadow: false });
    if (k >= 1 && k <= 3) [-.55, 0, .55].forEach(z => R.flow([[XP + .4, RY + RH + .01, z], [XF + .15, RY + RH + .01, z]], { c: P.c1, a: .5, r: .045, speed: 1.6 }));
    // 2-3. six blocks
    for (let i = 0; i < 6; i++) { const a = i === 0 ? fo(1, [2, 5]) : fo(2, [5]); block(R, i, a, i === 0 ? K.tw(st, e, s => s === 1 ? 1 : 0) : 0, st, e); }
    K.lab(R, [BX(0) - .2, SB + .62, 0], 'attention 262,144', { mono: true, fs: 12, b: 1, c: P.c2, dy: -14, al: 'right', dx: 4, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [BX(0) + .33, SB + .62, 0], 'FFN 524,288', { mono: true, fs: 12, b: 1, c: P.c3, dy: -14, al: 'left', dx: -4, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [BX(0) - .44, SB, -.6], 'LayerNorm', { mono: true, fs: 12, c: P.c5, dy: 12, al: 'right', dx: -4, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [BX(0), 1.34, 0], 'block 1: 786,944', { mono: true, fs: 12, c: P.ink, dy: -36, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [BX(2.5), 1.34, 0], '6 blocks × 786,944 = 4,721,664', { mono: true, fs: 12.5, b: 1, dy: -10, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    // 3. the median token's stream norm after the embedding and after each block (trained model)
    const na = K.tw(st, e, s => s === 2 ? 1 : 0);
    if (na > .01) mi.forEach((m, j) => { const x = j === 0 ? XP + .6 : BX(j - 1) + .6, h = med[m] / med[12] * 1.25;
      R.box([x, RY + RH, .62], [.13, h * (k === 2 ? e : 1), .13], { fill: P.c1, a: na, shadow: false });
      if (j === 0 || j === 6) K.lab(R, [x, RY + RH + h, .62], med[m].toFixed(1), { mono: true, fs: 12, b: 1, c: P.c1, dy: -10, a: na }); });
    // 4. the final norm, then the token table again (tied), then the logits
    const a4 = fo(3, [4, 5]);
    K.plateX(R, XF, SB - .1, 0, 1.2, .5, { c: P.c5, a: a4, nu: 3, nv: 3 });
    K.plateX(R, XU, .1, 0, RD, 2.2, { c: P.c1, a: a4, nu: 4, nv: 16 });
    const ta = K.tw(st, e, s => s === 3 ? 1 : 0);
    if (ta > .01) { R.arc([XT, 2.32, 0], [XU, 2.32, 0], .55, { c: P.c1, w: 1.6, dash: [6, 5], a: ta, t: k === 3 ? e : 1 });
      R.flow([[XF + .2, RY + .3, 0], [XU, 1.2, 0]], { c: P.c1, a: ta, r: .05, n: 6 }); }
    K.lab(R, [lerp(XT, XU, .5), 2.32 + .55, 0], 'the same matrix: 0 new parameters', { mono: true, fs: 12, b: 1, c: P.c1, dy: -10, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    K.lab(R, [XU, 0, 1], 'logits (1, 256, 4,096)', { mono: true, fs: 12, b: 1, c: P.c1, dy: 14, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    K.lab(R, [XF, SB + .45, -.6], 'final LayerNorm', { mono: true, fs: 12, c: P.c5, al: 'right', dx: -6, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    // 5. probabilities for the token after "o" (real top 10) and the loss
    const a5 = K.tw(st, e, s => s === 4 ? 1 : s === 5 ? .5 : 0);
    if (a5 > .01) { S.top.forEach(([t, p], r) => R.box([XL, 0, -.9 + r * .2], [.14, Math.max(.01, p * 2.0) * (k === 4 ? e : 1), .14], { fill: r === 0 ? P.c2 : P.paper, a: a5 }));
      R.flow([[XU + .1, .8, 0], [XL, .3, -.9]], { c: P.c1, a: a5 * (k === 4 ? 1 : 0), r: .05, n: 5 }); }
    K.lab(R, [XL, S.top[0][1] * 2, -.9], '"x" ' + (S.top[0][1] * 100).toFixed(1) + '%', { mono: true, fs: 12.5, b: 1, c: P.c2, dy: -10, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    K.lab(R, [XL, 0, 1.1], 'loss −ln p = ' + S.loss_here.toFixed(3), { mono: true, fs: 12.5, b: 1, dy: 14, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    // 6. what each piece is worth: held-out loss with it removed (retrained at the same budget)
    const L6 = (p, t, o) => K.lab(R, p, t, Object.assign({ mono: true, fs: 12, b: 1, c: P.bad, grp: 'ab', a: K.la(st, e, s => s === 5 ? 1 : 0) }, o || {}));
    L6([XP, .66, 0], 'no positions ' + ab('nopos'), { dy: -40, al: 'right' });
    L6([BX(0) - .2, SB + .62, 0], 'no attention ' + ab('noattn'), { dy: -48 });
    L6([BX(1) - .2, SB + .62, 0], 'one head ' + ab('1head'), { dy: -48 });
    L6([BX(2) + .33, SB + .62, 0], 'no FFN ' + ab('noffn'), { dy: -48 });
    L6([BX(4) - .44, SB + .5, 0], 'no norms ' + ab('nonorm'), { dy: -48 });
    L6([BX(3), RY, RD / 2], 'no residual sum ' + ab('noresid'), { dy: 18, grp: null });
    L6([XU, 2.3, 0], 'full model ' + ab('base'), { dy: -8, c: P.ink, grp: null });
  }
  const full = { cam: [.22, .42], bounds: [[-6.4, 0, -1.1], [5.5, 2.6, 1.1]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 \u00b7 the tiny GPT end to end', cam: full.cam, bounds: full.bounds, aspect: .5, margin: K.margin, dur: 1500, hold: 4600, draw,
    view: k => k === 0 ? { cam: [.3, .4], bounds: [[-7.1, 0, -1.1], [-3, 2.4, 1.8]] } : k === 1 ? { cam: [.45, .42], bounds: [[-4.1, 0, -1.1], [-2, 1.5, 1.1]] }
      : k === 4 ? { cam: [-.2, .4], bounds: [[2.9, 0, -1.2], [5.8, 2.6, 1.2]] } : full });
})();
