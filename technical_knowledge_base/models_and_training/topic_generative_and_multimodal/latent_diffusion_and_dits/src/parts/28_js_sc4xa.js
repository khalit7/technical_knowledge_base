// ---- Scene (section 3, Fig. 4): how SD 1.5's text reaches the image, from the page's recordings. Tokens: the running example's first prompt
// (LD.xa.g01.tokens, text_enc.py). Attention mass per token at the 16 x 16 layers, averaged over positions, heads, layers and the 25 steps
// (LD.xa.g01.mass['16'], sd_ld.py). The word map: the recorded 16 x 16 cross-attention of "bicycle" at the last step (LD.xa.g01.m16, 8-bit,
// scaled to the token's maximum). The raised query is the map's strongest position. ----
(function () {
  if (!document.getElementById('stg-xa') || !window.LDK || !LDU.L.xa || !LDU.L.xa.g01) return;
  const U = LDU, { mix } = S3, { tw, la, lab, seg, win } = LDK, G = U.L.xa.g01, M = G.mass['16'];
  const TOK = G.tokens.map(s => s.replace('</w>', '').replace('<|startoftext|>', 'start').replace('<|endoftext|>', 'end')), NT = TOK.length;
  const TI = TOK.indexOf('bicycle'), last = String(G.steps[G.steps.length - 1]), MAP = U.b64u8(G.m16[last].b).subarray(TI * 256, (TI + 1) * 256);
  let qi = 0; for (let i = 1; i < 256; i++) if (MAP[i] > MAP[qi]) qi = i;
  const XS = .62, tx = i => (i - (NT - 1) / 2) * XS - .9, ZT = -1.9, C = .2, Z0 = -.4, cx = c => (c - 7.5) * C, cz = r => Z0 + (r + .5) * C;
  const kind = i => i === 0 ? 0 : i >= G.tokens.indexOf('<|endoftext|>') ? 2 : 1;
  function draw(R, k, e, st) {
    const P = R.P, KC = [P.c5, P.c3, P.mute]; R.grid(-6.5, 6.5, -3, 3.4, .5);
    // 1. the 77 positions: 13 real ones and the first padding, then the other 63 padding positions faint
    const ta = tw(st, e, q => q === 2 ? .45 : q === 4 ? .15 : 1);
    TOK.forEach((t, i) => { R.box([tx(i), 0, ZT], [.46, .16, .36], { fill: mix(P.paper, KC[kind(i)], .55), a: ta * (k === 0 && st.pk === 0 ? win(e, i / NT * .6, i / NT * .6 + .3) : 1), shadow: false });
      lab(R, [tx(i), .16, ZT], t, { fs: 12, c: KC[kind(i)], b: kind(i) === 0, dy: i % 2 ? -30 : -14, wide: 1, a: la(st, e, q => q === 0 ? 1 : q === 1 ? .55 : 0) }); });
    for (let i = 0; i < 4; i++) R.box([tx(NT - 1) + XS * (i + 1), 0, ZT], [.46, .08, .3], { fill: P.paper, a: ta * .3, shadow: false });
    lab(R, [tx(NT - 1) + XS * 2.5, .1, ZT], '+ 63 padding', { fs: 12, c: P.mute, dy: -14, a: la(st, e, q => q === 0 ? 1 : 0) });
    // 2. the causal encoder: each position's vector (a glass plate), computed from itself and the positions before it
    const va = tw(st, e, q => q === 0 ? 0 : q === 1 ? 1 : q === 2 ? .3 : q === 3 ? .55 : .1);
    TOK.forEach((t, i) => R.glass([tx(i) - .2, .25, ZT], [.4, 0, 0], [0, .55, 0], { c: KC[kind(i)], a: va * (k === 1 && st.pk < 1 ? win(e, i / NT * .6, i / NT * .6 + .3) : 1), nu: 2, nv: 6, th: .03 }));
    if (k === 1) R.flow(seg([tx(0), .95, ZT], [tx(NT - 1), .95, ZT], 30), { c: P.c3, r: .06, a: e, speed: 1.4 });
    lab(R, [tx(0), .85, ZT], 'the same for every prompt', { fs: 12.5, b: 1, c: P.c5, dy: -16, al: 'left', dx: -12, a: la(st, e, q => q === 1 ? 1 : 0) });
    lab(R, [tx(NT - 1), .85, ZT], '768 each', { mono: 1, fs: 12, c: P.mute, dy: -16, a: la(st, e, q => q === 1 ? 1 : 0) });
    // 3. the image side: 256 positions at a 16 x 16 level, the queries; one of them raised
    const ga = tw(st, e, q => q < 2 ? .12 : 1), lift = tw(st, e, q => q === 2 || q === 3 ? 1 : 0), mp = tw(st, e, q => q === 4 ? 1 : 0);
    if (ga > .01) for (let i = 0; i < 256; i++) { const r = i >> 4, c = i & 15, v = MAP[i] / 255, h = .04 + (i === qi ? .35 * lift : 0) + mp * .95 * v;
      R.box([cx(c), 0, cz(r)], [C * .84, h, C * .84], { fill: mp > .01 ? mix(mix(P.paper, P.q, .25), P.c3, Math.min(1, v * 1.2) * mp) : mix(P.paper, P.q, i === qi ? .85 : .35), a: ga, shadow: false, lw: .5 }); }
    lab(R, [0, .05, Z0 + 16 * C], '256 image positions · queries', { fs: 12.5, b: 1, c: P.q, dy: 16, a: la(st, e, q => q === 2 ? 1 : 0) });
    // 4. one query's softmax over the 77 tokens: streams and columns to scale with the recorded mass
    const ma = tw(st, e, q => q === 3 ? 1 : q === 4 ? .35 : 0);
    if (ma > .01) { const qp = [cx(qi & 15), .45, cz(qi >> 4)];
      TOK.forEach((t, i) => { const w = M.per_token[i] || 0, h = Math.max(.02, 1.7 * w) * (k === 3 && st.pk < 3 ? win(e, 0, .8) : 1);
        R.box([tx(i), .82, ZT + .35], [.3, h, .2], { fill: mix(P.paper, KC[kind(i)], .8), a: ma, shadow: false });
        if (k === 3 && w > .001) R.flowArc(qp, [tx(i), .3, ZT + .2], .8, { c: KC[kind(i)], r: .04 + .07 * Math.sqrt(w), n: Math.max(1, Math.round(26 * w)) + (w > .005 ? 1 : 0), speed: 1.2, a: .35 + .65 * Math.sqrt(w) }); });
      const L = (x, y, t, c, o) => lab(R, [x, y, ZT + .35], t, Object.assign({ mono: 1, fs: 12.5, b: 1, c, dy: -14, a: la(st, e, q => q === 3 ? 1 : 0) }, o || {}));
      L(tx(0), .82 + 1.7 * M.start, 'start ' + Math.round(100 * M.start) + '%', P.c5);
      L(tx(6), 1.0, 'words ' + Math.round(100 * M.words) + '%', P.c3);
      L(tx(NT - 1), 1.0, 'end + padding ' + Math.round(100 * M.end_and_padding) + '%', P.mute, { al: 'right', dx: 20 }); }
    lab(R, [0, .05, Z0 + 16 * C], 'the map of "bicycle" at step ' + (+last + 1), { fs: 12.5, b: 1, c: P.c3, dy: 16, a: la(st, e, q => q === 4 ? 1 : 0) });
  }
  const phone = () => { const h = document.getElementById('stg-xa'); return !!h && h.clientWidth < 520; }; // on a phone the token row turns into depth, so the scene is larger
  const full = { cam: [.15, .7], bounds: [[-5.4, 0, -2.4], [5.4, 1.6, 3.0]] };
  S3.stage({ id: 'stg-xa', list: 'sx-xa', fig: 'Fig. 4 · text in, from SD 1.5\'s recorded attention', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 4800, draw, margin: LDK.margin,
    view: k => k === 4 ? { cam: [.3, .72], bounds: [[-2.2, 0, -.5], [2.2, 1.0, 3.0]] } : phone() ? (k <= 1 ? { cam: [-.7, .42], bounds: [[-5.2, 0, ZT - .4], [3.2, 1.3, ZT + .5]] } : { cam: [-.8, .55], bounds: [[-5.4, 0, -2.4], [3.4, 1.6, 3.0]] }) : full });
})();
