// ---- Fig. 6: the model's head and the loss, for the running sequence's token "o" at position 157 (trained tiny GPT). The targets are the inputs
// shifted by one (TZD.pieces); "o"'s stream after block 6 through the final norm; the token table again (tied) gives 4,096 logits; softmax; the loss.
// Vectors, the logit range and the top 10 probabilities are the trace's (TZS); the other 4,086 tokens are drawn as one flat strip. ----
(function () {
  if (!document.getElementById('stg-out') || !window.TZK) return; const K = TZK, S = TZS, { lerp, mix } = S3;
  const IN = [152, 153, 154, 155, 156, 157], TX = i => -3.9 + i * 1.0, ZI = 2.2, ZT = 1.15;
  const XV = -3.6, XLN = -2.2, XF = -.9, ZV = -.6, XU = 2.0, ZU = -1.6, UW = 2.4, UH = 2.5, PX = r => .95 + r * .25, PZ = -.15, PS = 2.3;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.8, 5.4, -2.2, 2.9, .5);
    // 1. inputs and targets: position t is scored on token t + 1
    const sA = K.tw(st, e, s => s === 0 ? 1 : s === 4 ? .6 : .25);
    IN.forEach((j, i) => { const last = i === IN.length - 1;
      K.tile(R, [TX(i), 0, ZI], null, { w: .85, d: .4, a: sA, fill: last ? mix(P.paper, P.c2, .25) : P.paper });
      K.tile(R, [TX(i), 0, ZT], null, { w: .85, d: .4, a: sA, fill: last ? mix(P.paper, P.c2, .55) : mix(P.paper, P.c6, .25) });
      K.lab(R, [TX(i), .1, ZI - .2], K.piece(j).replace(/^ /, '␣'), { serif: true, fs: 13, b: last, dy: -10, a: K.la(st, e, s => s === 0 ? 1 : 0) });
      K.lab(R, [TX(i), .1, ZT - .2], K.piece(j + 1).replace(/^ /, '␣'), { serif: true, fs: 13, b: last, dy: -10, a: K.la(st, e, s => s === 0 ? 1 : 0) });
      if (k === 0) R.flow([[TX(i), .12, ZI - .2], [TX(i), .12, ZT + .2]], { c: last ? P.c2 : P.c6, a: e, r: .045, n: 3, speed: .8 }); });
    K.lab(R, [TX(0) - .45, .1, ZI], 'input t', { mono: true, fs: 12, c: P.mute, al: 'right', dx: -6, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    K.lab(R, [TX(0) - .45, .1, ZT], 'target t + 1', { mono: true, fs: 12, c: P.mute, al: 'right', dx: -6, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    // 2. "o"'s last stream vector through the final LayerNorm
    const vA = K.tw(st, e, s => s === 1 ? 1 : s === 2 ? .45 : s === 0 ? 0 : .25);
    K.comb(R, [XV, .55, ZV], S.l6_out, { wd: 1.5, h: .35, c: P.c1, a: vA, legs: 1 });
    K.plateX(R, XLN, .1, ZV, 1.0, .85, { c: P.c5, a: vA, nu: 3, nv: 4 });
    K.comb(R, [XF, .55, ZV], S.norm_f, { wd: 1.5, h: .35, c: P.c5, a: K.tw(st, e, s => s === 1 || s === 2 ? 1 : s === 0 ? 0 : .3), legs: 1 });
    if (k === 1) R.flow([[XV + .6, .6, ZV], [XLN, .55, ZV], [XF - .6, .6, ZV]], { c: P.c5, a: .9, r: .05, n: 6 });
    K.lab(R, [XV, 1.0, ZV], 'after block 6 · ' + S.l6_out_norm.toFixed(1), { mono: true, fs: 12, b: 1, c: P.c1, dy: -6, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [XF, 1.0, ZV], 'final norm · ' + S.norm_f_norm.toFixed(1), { mono: true, fs: 12, b: 1, c: P.c5, dy: -6, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    // 3. the token table again: one logit per row
    const uA = K.tw(st, e, s => s === 2 ? 1 : s === 0 ? 0 : s === 1 ? .2 : .35);
    K.plateZ(R, XU, .1, ZU, UW, UH, { c: P.c1, a: uA, nu: 8, nv: 16 });
    if (k === 2) for (let r = 0; r < 6; r++) R.flow([[XF + .4, .65, ZV], [XU - UW / 2 + .2 + r * .4, .2 + (r % 3) * .8 + .3, ZU + .05]], { c: P.c1, a: .85, r: .045, n: 5, speed: 1.3 });
    K.lab(R, [XU, .1 + UH, ZU], 'token table (4,096, 256), tied', { mono: true, fs: 12, b: 1, c: P.c1, dy: -10, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    K.lab(R, [XU, .1, ZU], '4,096 logits: ' + S.logit_min.toFixed(2) + ' to ' + S.logit_max.toFixed(2), { mono: true, fs: 12.5, b: 1, dy: 16, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    // 4. softmax: the top 10 as columns, the other 4,086 as one flat strip
    const pA = K.tw(st, e, s => s >= 3 ? 1 : 0), grow = k === 3 ? e : k > 3 ? 1 : 0;
    if (pA > .01) { S.top.forEach(([t, p], r) => R.box([PX(r), 0, PZ], [.17, Math.max(.012, p * PS * grow), .3], { fill: r === 0 ? P.c2 : mix(P.paper, P.c1, .3), a: pA }));
      R.quad([[PX(10) + .05, .004, PZ - .15], [PX(10) + 1.7, .004, PZ - .15], [PX(10) + 1.7, .004, PZ + .15], [PX(10) + .05, .004, PZ + .15]], { fill: mix(P.paper, P.c1, .3), a: pA, ea: .5 }); }
    K.lab(R, [PX(0), S.top[0][1] * PS, PZ], '"x" ' + (S.top[0][1] * 100).toFixed(2) + '%', { mono: true, fs: 13, b: 1, c: P.c2, dy: -12, a: K.la(st, e, s => s === 3 || s === 4 ? 1 : 0) });
    K.lab(R, [PX(5), .3, PZ], 'next nine: ' + ((S.top10_sum - S.p_next) * 100).toFixed(1) + '%', { mono: true, fs: 12, dy: -10, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    K.lab(R, [PX(10) + .9, 0, PZ], '4,086 others: ' + ((1 - S.top10_sum) * 100).toFixed(1) + '%', { mono: true, fs: 12, dy: 16, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    // 5. the loss at this position
    K.lab(R, [PX(0), S.top[0][1] * PS, PZ], 'loss = −ln ' + S.p_next + ' = ' + S.loss_here.toFixed(3), { mono: true, fs: 13, b: 1, al: 'left', dx: 14, dy: -34, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    if (k === 4) R.flowArc([TX(5), .15, ZT], [PX(0), S.top[0][1] * PS, PZ], .6, { c: P.c2, a: .9, r: .05, n: 8 });
  }
  const full = { cam: [.18, .55], bounds: [[-4.7, 0, -1.7], [5.3, 2.7, 2.6]] };
  S3.stage({ id: 'stg-out', list: 'sx-out', fig: 'Fig. 6 · from the last vector to the loss', cam: full.cam, bounds: full.bounds, aspect: .62, margin: K.margin, dur: 1500, hold: 4600, draw,
    view: k => k === 0 ? { cam: [.1, .62], bounds: [[-4.8, 0, .7], [1.6, .8, 2.6]] } : k === 1 ? { cam: [.25, .45], bounds: [[-4.6, 0, -1.2], [-.1, 1.4, .5]] } : k === 3 ? { cam: [.12, .45], bounds: [[.4, 0, -1.8], [4.6, 2.6, .6]] } : k === 4 ? { cam: [.15, .5], bounds: [[-4.4, 0, -1.2], [4.8, 2.4, 2.6]] } : full });
})();
