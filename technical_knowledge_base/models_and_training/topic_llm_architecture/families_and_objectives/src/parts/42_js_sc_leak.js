// ---- Scene (section 3, Fig. 4): why the causal mask is not optional. Eight tokens of the running sequence (FOD.rs.pieces) with one query
// (position 2, an illustrative choice) asked for the next token; the causal wall, then the leak once it is gone; then the measured run
// (FOD.masks): attention on the key one to the right in each of the 6 layers before and after the 150 leak steps, the training loss
// collapsing (the recorded curve at every 25 steps), and the leaky model's loss under the causal mask that generation must use. ----
(function () {
  if (!document.getElementById('stg-leak') || !window.FOS) return;
  const { mix } = S3, { tw, la, lab, tok, col } = FOS, D = FOD, M = D.masks, L = M.leak, REF = M.swap.causal.held_out;
  const W8 = D.rs.pieces.slice(1, 9).map(tok), QI = 2, XT = j => -2.8 + j * .8, ZT = 1.5, YO = 1.25;
  const UNI = 6.01; // the unigram loss the topic's Block lab measured, as section 3 states
  const CUR = L.curve.filter((p, i) => p[0] % 25 === 0 || i === L.curve.length - 1);
  const ZB = -1.2, HL = 1.7 / .25, HS = 1.7 / 7.2;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4, 4, -2.4, 2.6, .5);
    const ra = tw(st, e, s => s <= 1 ? 1 : 0), rla = la(st, e, s => s <= 1 ? 1 : 0);
    // the sequence; the query's output box above position i asks for token i+1
    W8.forEach((w, j) => { const tg = j === QI + 1, q = j === QI;
      R.box([XT(j), 0, ZT], [.62, .16, .5], { fill: q ? mix(P.paper, P.acc, .5) : tg ? mix(P.paper, P.bad, .45) : P.paper, a: ra });
      lab(R, [XT(j), 0, ZT + .25], w, { mono: true, fs: 12.5, b: q || tg, c: q ? P.acc : tg ? P.bad : P.ink, dy: 12, a: rla }); });
    const ob = [XT(QI), YO, ZT];
    R.box([ob[0], YO - .14, ZT], [.62, .28, .5], { fill: mix(P.paper, P.acc, .25), a: ra * rla + .001, shadow: false });
    lab(R, [ob[0], YO + .14, ZT], 'predict token i+1', { fs: 12.5, b: 1, c: P.acc, dy: -12, a: rla });
    // the causal wall between i and i+1
    const wa = tw(st, e, s => s === 0 ? 1 : 0);
    if (wa > .01) { R.glass([XT(QI) + .4, 0, ZT - .45], [0, 1.15, 0], [0, 0, .9], { c: P.bad, a: wa, nu: 4, nv: 3 });
      lab(R, [XT(QI) + .4, 1.15, ZT], 'causal mask', { fs: 12.5, b: 1, c: P.bad, dy: -12, a: la(st, e, s => s === 0 ? 1 : 0) }); }
    // keys the query may read stream into it; with the wall gone, the answer streams in from one position to the right
    if (rla > .01) for (let j = 0; j <= QI; j++) R.flowArc([XT(j), .2, ZT], [ob[0], YO - .14, ZT], .25 + .12 * (QI - j), { c: P.acc, a: rla * .8, r: .05, n: 6, speed: 1.3 });
    const lk = la(st, e, s => s === 1 ? 1 : 0);
    if (lk > .01) { R.flowArc([XT(QI + 1), .2, ZT], [ob[0] + .12, YO - .14, ZT], .45, { c: P.bad, a: lk, r: .09, n: 10, speed: 1.6 });
      lab(R, [XT(QI + 1) + .3, .7, ZT], 'the answer, one to the right', { fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 8, a: lk }); }
    // step 3: attention on the key at i+1, per layer, before and after the leak steps
    const aa = tw(st, e, s => s === 2 ? 1 : 0), al2 = la(st, e, s => s === 2 ? 1 : 0);
    if (aa > .01) for (let l = 0; l < 6; l++) { const x = -2.6 + l * 1.05, b0 = M.swap.attn_next_causal_model[l], b1 = L.attn_next[l];
      col(R, [x - .2, 0, ZB], b0 * HL * aa, .3, { fill: mix(P.paper, P.c1, .7), a: aa, shadow: false });
      col(R, [x + .2, 0, ZB], b1 * HL * aa, .3, { fill: mix(P.paper, P.bad, .75), a: aa, shadow: false });
      lab(R, [x, 0, ZB + .3], 'layer ' + (l + 1), { fs: 12, c: P.mute, dy: 12, a: al2 });
      if (l === 0) { lab(R, [x + .2, b1 * HL + .06, ZB], b1.toFixed(3), { mono: true, fs: 12.5, b: 1, c: P.bad, dy: -10, a: al2 }); lab(R, [x - .2, b0 * HL + .06, ZB], b0.toFixed(3), { mono: true, fs: 12, c: P.c1, al: 'right', dx: -4, dy: -10, a: al2 }); } }
    if (al2 > .01) { lab(R, [-2.6 + 5 * 1.05 + .5, .9, ZB], 'after 150 leak steps', { fs: 12.5, b: 1, c: P.bad, al: 'left', a: al2, wide: 1 }); lab(R, [-2.6 + 5 * 1.05 + .5, .6, ZB], 'before (same mask)', { fs: 12.5, c: P.c1, al: 'left', a: al2, wide: 1 }); }
    // step 4: the training loss under the leaky mask, every 25 steps, against the honest model's held-out loss
    const ca = tw(st, e, s => s === 3 ? 1 : 0), cl3 = la(st, e, s => s === 3 ? 1 : 0);
    if (ca > .01) { CUR.forEach((p, i) => { const x = -2.7 + i * .9, h = p[1] * HS * ca; col(R, [x, 0, ZB], h, .42, { fill: mix(P.paper, P.bad, .3 + .6 * i / (CUR.length - 1)), a: ca, shadow: false });
        lab(R, [x, h + .06, ZB], p[1].toFixed(2), { mono: true, fs: 12, b: 1, c: P.ink, dy: -10, a: cl3 }); lab(R, [x, 0, ZB + .3], 'step ' + p[0], { fs: 12, c: P.mute, dy: 12, a: cl3 }); });
      const y = REF * HS + .05; R.glass([-3.1, y, ZB - .35], [6.2, 0, 0], [0, 0, .7], { c: P.good, a: ca * .8, nu: 8, nv: 1, th: .01 });
      lab(R, [-3.1, y, ZB], 'honest causal model ' + REF.toFixed(3), { fs: 12.5, b: 1, c: P.good, al: 'right', dx: -6, a: cl3, wide: 1 }); }
    // step 5: what generation sees: the causal mask, under which the leaky model is worse than ignoring context
    const ga = tw(st, e, s => s === 4 ? 1 : 0), gl = la(st, e, s => s === 4 ? 1 : 0);
    if (ga > .01) { [[REF, 'honest model', P.good], [UNI, 'no context (unigram)', P.mute], [L.held_out_causal, 'leak model', P.bad]].forEach(([v, nm, c], i) => { const x = -1.6 + i * 1.6, h = v * HS * ga;
        col(R, [x, 0, ZB], h, .55, { fill: mix(P.paper, c, .7), a: ga, shadow: false }); lab(R, [x, h + .06, ZB], v.toFixed(2), { mono: true, fs: 12.5, b: 1, c: P.ink, dy: -10, a: gl }); lab(R, [x, 0, ZB + .35], nm, { fs: 12.5, b: 1, c, dy: 13, a: gl }); });
      lab(R, [3.4, 0, ZB + .35], 'held-out, causal mask', { fs: 12, c: P.mute, al: 'right', dy: 30, a: gl, wide: 1 }); }
  }
  const back = { cam: [.08, .42], bounds: [[-4.6, 0, -1.6], [3.3, 1.2, -.7]] };
  S3.stage({ id: 'stg-leak', list: 'sx-leak', fig: 'Fig. 4 · the leak, measured on the tiny GPT', cam: [.15, .55], bounds: [[-3.5, 0, -1.7], [3.6, 1.8, 2.2]], aspect: .62, dur: 1400, hold: 4800, draw,
    margin: w => w < 520 ? [26, 8, 30, 8] : [34, 18, 34, 18],
    view: k => k <= 1 ? { cam: [.1, .5], bounds: [[-3.3, 0, .9], [3.6, 1.45, 2.2]] } : k === 2 ? { cam: [.08, .42], bounds: [[-3.1, 0, -1.6], [5.0, 1.5, -.7]] } : back });
})();
