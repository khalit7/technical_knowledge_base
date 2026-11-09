// ---- Scenes (sections 5 and 6, Figs. 6 and 7): text and image tokens as two lanes. Fig. 6 is one MMDiT block of SD3.5 Large at 1024 pixels
// (token counts from LDU.tokens and LD.flops: 4,096 image, 333 text; 38 blocks and 8,056.6M parameters from its config, LD.arch).
// Fig. 7 is FLUX.1 [dev] (19 double-stream blocks holding 6,456.8M, 38 single-stream blocks holding 5,380.5M: LD.arch flux1 top-level counts;
// 4,096 image and 512 text tokens). A few tokens of each kind are drawn; the labels give the real counts. ----
(function () {
  if (!window.LDK) return;
  const U = LDU, { mix } = S3, { tw, la, lab, seg, arcPts, win, wall, f1, int, M1 } = LDK, A = U.byKey;
  const ZI = 1.25, ZT = -1.35, NI = 6, NTX = 4, zi = i => ZI - .6 + i * .3, zt = i => ZT - .45 + i * .3;
  const toks = (R, x, n, z, c, a, o) => { o = o || {}; for (let i = 0; i < n; i++) R.box([x, 0, z(i)], [.5, o.h || .2, .24], { fill: mix(R.P.paper, c, o.m || .55), a: a * (o.g ? o.g(i) : 1), shadow: false }); };
  // ------------------------------------------------ Fig. 6: one MMDiT block
  if (document.getElementById('stg-mm')) {
    const m = A.sd35l, NIm = U.tokens('sd35l', 1024, 1024), T = U.L.flops.sd35l.T, NL = m.config.num_layers;
    const X = { in: -4.1, w: -2.3, att: .4, out: 2.8, end: 4.1 };
    const draw = (R, k, e, st) => {
      const P = R.P, IC = P.c1, TC = P.c3; R.grid(-6.2, 6.2, -2.6, 2.6, .5);
      // 1. two sequences
      const ta = tw(st, e, q => q === 0 ? 1 : q === 4 ? .3 : .6);
      toks(R, X.in, NI, zi, IC, ta, { g: i => k === 0 && st.pk === 0 ? win(e, i / NI * .5, i / NI * .5 + .3) : 1 }); toks(R, X.in, NTX, zt, TC, ta);
      lab(R, [X.in, .16, ZI + .5], int(NIm) + ' image tokens', { fs: 12.5, b: 1, c: IC, dy: 18, a: la(st, e, q => q === 0 ? 1 : 0) });
      lab(R, [X.in, .16, ZT - .5], T + ' text tokens', { fs: 12.5, b: 1, c: TC, dy: -16, a: la(st, e, q => q === 0 ? 1 : 0) });
      // 2. each stream its own Q, K, V projections and modulation
      const wa = tw(st, e, q => q === 0 ? 0 : q === 1 ? 1 : q === 4 ? .25 : .55);
      [[ZI, IC, 'image weights'], [ZT, TC, 'text weights']].forEach(([z, c, nm]) => { [P.q, P.k, P.v].forEach((col, j) => wall(R, X.w - .42 + j * .42, z - .7, .36, 1.2, col, wa, { nu: 2, nv: 5, th: .03 }));
        R.box([X.w + .85, 0, z + .3], [.4, .4, .4], { fill: mix(P.paper, P.c5, .6), a: wa });
        lab(R, [X.w, 1.3, z - .7], nm, { fs: 12.5, b: 1, c, dy: -12, a: la(st, e, q => q === 1 ? 1 : 0) });
        if (k === 1) R.flow(seg([X.in + .2, .1, z], [X.w - .5, .3, z], 10), { c, r: .06, a: e, speed: 1.2 }); });
      lab(R, [X.w + .85, 0, ZI + .5], 'modulation: timestep + pooled text', { fs: 12, c: P.c5, dy: 16, wide: 1, a: la(st, e, q => q === 1 ? 1 : 0) });
      // 3. one attention over the concatenated sequence
      const ja = tw(st, e, q => q < 2 ? 0 : q === 2 ? 1 : q === 3 ? .5 : .2);
      if (ja > .01) { const z0 = ZT - .6, z1 = ZI + .6, w = z1 - z0, sp = (ZT + .2 - z0) / w;
        R.glass([X.att - w / 2, .06, z0], [w, 0, 0], [0, 0, w], { c: P.acc, a: ja, nu: 10, nv: 10, th: .03 });
        R.line([[X.att - w / 2 + sp * w, .1, z0], [X.att - w / 2 + sp * w, .1, z1]], { c: P.ink, w: 1.2, a: ja * .7 }); R.line([[X.att - w / 2, .1, z0 + sp * w], [X.att + w / 2, .1, z0 + sp * w]], { c: P.ink, w: 1.2, a: ja * .7 });
        if (k === 2) { R.flowArc([X.w, .5, ZI], [X.att, .2, ZT + .1], .9, { c: IC, r: .06, n: 7, speed: 1.2, a: e }); R.flowArc([X.w, .5, ZT], [X.att, .2, ZI - .1], .9, { c: TC, r: .06, n: 7, speed: 1.2, a: e });
          R.flowArc([X.w, .5, ZI], [X.att, .2, ZI], .5, { c: IC, r: .06, n: 5, speed: 1.2, a: e }); R.flowArc([X.w, .5, ZT], [X.att, .2, ZT], .5, { c: TC, r: .06, n: 5, speed: 1.2, a: e }); }
        lab(R, [X.att, .1, z1], 'one softmax over ' + int(NIm + T) + ' tokens', { fs: 12.5, b: 1, c: P.acc, dy: 18, a: la(st, e, q => q === 2 ? 1 : 0) }); }
      // 4. split back: each stream its own output projection and MLP
      const oa = tw(st, e, q => q < 3 ? 0 : q === 3 ? 1 : .25);
      [[ZI, IC, 'image MLP'], [ZT, TC, 'text MLP']].forEach(([z, c, nm], s) => { wall(R, X.out, z - .7, 1.0, 1.2, c, oa, { nu: 4, nv: 5 });
        toks(R, X.end, s ? NTX : NI, s ? zt : zi, c, oa, { m: .8, h: .2 });
        lab(R, [X.out, 1.3, z - .7], nm, { fs: 12.5, b: 1, c, dy: -12, a: la(st, e, q => q === 3 ? 1 : 0) });
        if (k === 3) { R.flow(arcPts(R, [X.att + .6, .2, z], [X.out - .5, .4, z], .4, 10), { c, r: .06, a: e, speed: 1.2 }); R.flow(seg([X.out + .5, .3, z], [X.end - .2, .1, z], 8), { c, r: .06, a: e, speed: 1.2 }); } });
      lab(R, [X.end, .2, ZT - .5], 'text rewritten', { fs: 12, c: TC, dy: -16, a: la(st, e, q => q === 3 ? 1 : 0) });
      // 5. 38 such blocks
      const ba = tw(st, e, q => q === 4 ? 1 : 0);
      if (ba > .01) { for (let i = 0; i < NL; i++) { const x = -1.6 + i * .085, g = k === 4 && st.pk < 4 ? win(e, i / NL * .7, i / NL * .7 + .2) : 1;
          R.glass([x, .05, ZI - .6], [0, 0, 1.2], [0, .8, 0], { c: IC, a: ba * g * .45, nu: 2, nv: 2, th: .01 }); R.glass([x, .05, ZT - .6], [0, 0, 1.2], [0, .8, 0], { c: TC, a: ba * g * .45, nu: 2, nv: 2, th: .01 }); }
        lab(R, [0, .9, ZT - .6], NL + ' MMDiT blocks · ' + M1(m.params) + ' parameters', { fs: 12.5, b: 1, c: P.ink, dy: -14, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    };
    const full = { cam: [.15, .62], bounds: [[-4.6, 0, -2.2], [4.6, 1.4, 2.2]] };
    S3.stage({ id: 'stg-mm', list: 'sx-mm', fig: 'Fig. 6 · one MMDiT block, SD3.5 Large', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4800, draw, margin: LDK.margin,
      view: k => k <= 1 ? { cam: [.2, .55], bounds: [[-4.6, 0, -2.2], [.2, 1.4, 2.2]] } : full });
  }
  // ------------------------------------------------ Fig. 7: FLUX.1, double then single stream
  if (document.getElementById('stg-flux')) {
    const m = A.flux1, top = m.top, ND = m.config.num_layers, NS = m.config.num_single_layers, NIm = U.tokens('flux1', 1024, 1024), T = U.L.flops.flux1.T;
    const XD0 = -5.4, XD1 = -1.6, XJ = -.6, XS0 = .6, XS1 = 4.4, XE = 5.4, ZM = -.1, zm = i => ZM - .9 + i * .3;
    const draw = (R, k, e, st) => {
      const P = R.P, IC = P.c1, TC = P.c3; R.grid(-6.4, 6.4, -2.6, 2.6, .5);
      // 1. the 19 double-stream blocks: two lanes of weights, meeting in each block's attention
      const da = tw(st, e, q => q === 0 ? 1 : q === 1 ? .55 : .25);
      for (let i = 0; i < ND; i++) { const x = XD0 + i * (XD1 - XD0) / (ND - 1), g = k === 0 && st.pk === 0 ? win(e, i / ND * .6, i / ND * .6 + .3) : 1;
        R.glass([x, .05, ZI - .6], [0, 0, 1.2], [0, .8, 0], { c: IC, a: da * g * .6, nu: 2, nv: 2, th: .01 }); R.glass([x, .05, ZT - .6], [0, 0, 1.2], [0, .8, 0], { c: TC, a: da * g * .6, nu: 2, nv: 2, th: .01 });
        if (i % 3 === 1 && k === 0) R.flowArc([x, .4, ZI - .6], [x, .4, ZT + .6], .3, { c: P.acc, r: .045, n: 4, speed: .9, a: e * .8 }); }
      toks(R, XD0 - .7, NI, zi, IC, da); toks(R, XD0 - .7, NTX, zt, TC, da);
      lab(R, [(XD0 + XD1) / 2, .85, ZT - .6], ND + ' double-stream blocks · ' + M1(top.transformer_blocks), { fs: 12.5, b: 1, c: P.ink, dy: -14, a: la(st, e, q => q === 0 ? 1 : 0) });
      lab(R, [XD0 - .7, .16, ZI + .5], int(NIm) + ' image', { fs: 12, b: 1, c: IC, dy: 18, a: la(st, e, q => q === 0 ? 1 : 0) });
      lab(R, [XD0 - .7, .16, ZT - .5], T + ' text', { fs: 12, b: 1, c: TC, dy: -16, a: la(st, e, q => q === 0 ? 1 : 0) });
      // 2. concatenate: the two lanes become one sequence
      const ja = tw(st, e, q => q === 0 ? 0 : q === 1 ? 1 : q === 4 ? .3 : .55);
      if (ja > .01) { for (let i = 0; i < 7; i++) R.box([XJ + .3, 0, zm(i)], [.34, .16, .22], { fill: mix(P.paper, i < 2 ? TC : IC, .55), a: ja, shadow: false });
        if (k === 1) { R.flow(arcPts(R, [XD1 + .1, .3, ZI], [XJ + .2, .2, ZM + .5], .2, 10), { c: IC, r: .06, a: e, speed: 1.1 }); R.flow(arcPts(R, [XD1 + .1, .3, ZT], [XJ + .2, .2, ZM - .6], .2, 10), { c: TC, r: .06, a: e, speed: 1.1 }); }
        lab(R, [XJ + .3, .16, zm(6)], int(NIm + T) + ' tokens, one sequence', { fs: 12.5, b: 1, c: P.ink, dy: 18, a: la(st, e, q => q === 1 ? 1 : 0) }); }
      // 3. one parallel block: one norm and modulation, then attention and the MLP side by side, concatenated and projected once
      const pa = tw(st, e, q => q === 2 ? 1 : 0);
      if (pa > .01) { const x0 = XS0 + .6; R.box([x0, 0, ZM], [.35, .45, .5], { fill: mix(P.paper, P.mute, .5), a: pa });
        wall(R, x0 + 1.1, ZM - 1.25, .9, .9, P.q, pa, { nu: 4, nv: 4 }); wall(R, x0 + 1.1, ZM + .35, .9, .9, P.c5, pa, { nu: 4, nv: 4 });
        wall(R, x0 + 2.3, ZM - .6, .5, 1.0, P.acc, pa, { nu: 2, nv: 5 });
        lab(R, [x0, .45, ZM], 'norm + modulation', { fs: 12, c: P.mute, dy: -14, a: la(st, e, q => q === 2 ? 1 : 0) });
        lab(R, [x0 + 1.1, 1.0, ZM - 1.25], 'attention', { fs: 12.5, b: 1, c: P.q, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) });
        lab(R, [x0 + 1.1, .05, ZM + .35], 'MLP', { fs: 12.5, b: 1, c: P.c5, dy: 30, a: la(st, e, q => q === 2 ? 1 : 0) });
        lab(R, [x0 + 2.3, 1.1, ZM - .6], 'one projection', { fs: 12, c: P.acc, dy: -12, al: 'left', dx: -10, a: la(st, e, q => q === 2 ? 1 : 0) });
        if (k === 2) { R.flow(seg([XJ + .5, .25, ZM], [x0 - .2, .25, ZM], 6), { c: P.ink, r: .06, a: e, speed: 1.1 });
          R.flowArc([x0 + .2, .3, ZM], [x0 + .7, .4, ZM - .8], .3, { c: P.q, r: .06, n: 4, speed: 1.1, a: e }); R.flowArc([x0 + .2, .3, ZM], [x0 + .7, .4, ZM + .8], .3, { c: P.c5, r: .06, n: 4, speed: 1.1, a: e });
          R.flowArc([x0 + 1.5, .4, ZM - .8], [x0 + 2.1, .4, ZM - .1], .3, { c: P.q, r: .06, n: 4, speed: 1.1, a: e }); R.flowArc([x0 + 1.5, .4, ZM + .8], [x0 + 2.1, .4, ZM], .3, { c: P.c5, r: .06, n: 4, speed: 1.1, a: e }); } }
      // 4. the 38 single-stream blocks, one set of weights for every token
      const sa = tw(st, e, q => q < 3 ? 0 : q === 3 ? 1 : .35);
      if (sa > .01) { for (let i = 0; i < NS; i++) { const x = XS0 + i * (XS1 - XS0) / (NS - 1), g = k === 3 && st.pk < 3 ? win(e, i / NS * .7, i / NS * .7 + .2) : 1;
          R.glass([x, .05, ZM - .9], [0, 0, 1.8], [0, .6, 0], { c: P.acc, a: sa * g * .5, nu: 2, nv: 2, th: .01 }); }
        if (k === 3) R.flow(seg([XS0 - .3, .3, ZM], [XS1 + .3, .3, ZM], 24), { c: P.ink, r: .06, a: e, speed: 1.3 });
        lab(R, [(XS0 + XS1) / 2, .65, ZM - .9], NS + ' single-stream blocks · ' + M1(top.single_transformer_blocks), { fs: 12.5, b: 1, c: P.acc, dy: -14, a: la(st, e, q => q === 3 ? 1 : 0) }); }
      // 5. discard the text tokens, decode the image tokens
      const ea = tw(st, e, q => q === 4 ? 1 : 0);
      if (ea > .01) { for (let i = 0; i < 7; i++) { const txt = i < 2, drop = txt ? (k === 4 ? win(e, .2, .7) : 1) : 0;
          R.box([XE, 0, zm(i)], [.34, .16, .22], { fill: mix(P.paper, txt ? TC : IC, txt ? .3 : .7), a: ea * (txt ? 1 - .85 * drop : 1), shadow: false }); }
        if (k === 4) R.flow(seg([XS1 + .2, .3, ZM + .2], [XE - .2, .15, ZM + .3], 6), { c: IC, r: .06, a: e, speed: 1.1 });
        lab(R, [XE, .16, zm(0)], 'text dropped', { fs: 12, c: TC, dy: -16, a: la(st, e, q => q === 4 ? 1 : 0) });
        lab(R, [XE, .16, zm(6)], 'image tokens decoded', { fs: 12.5, b: 1, c: IC, dy: 18, al: 'right', dx: 20, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    };
    const full = { cam: [.15, .7], bounds: [[-6.3, 0, -2.3], [5.9, 1.2, 2.3]] };
    S3.stage({ id: 'stg-flux', list: 'sx-flux', fig: 'Fig. 7 · FLUX.1 [dev], double then single stream', cam: full.cam, bounds: full.bounds, aspect: .44, dur: 1500, hold: 4800, draw, margin: LDK.margin,
      view: k => k === 0 ? { cam: [.2, .62], bounds: [[-6.5, 0, -2.2], [-.9, 1.2, 2.3]] } : k === 2 ? { cam: [.2, .6], bounds: [[-1.2, 0, -1.8], [4.0, 1.2, 1.6]] } : full });
  }
})();
