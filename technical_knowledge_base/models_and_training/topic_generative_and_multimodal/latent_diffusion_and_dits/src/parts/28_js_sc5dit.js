// ---- Scene (section 4, Fig. 5): DiT-XL/2 as the authors' 512 model (facebookresearch/DiT at ed81ce2, counted on meta tensors: LD.stages.dit):
// the 64 x 64 x 4 latent, 2 x 2 patches to 1,024 tokens of 1,152, the condition c turned by each block's modulation layer into six vectors
// (shift, scale, gate for attention and for the MLP; the gates start at zero), one block, the 28 identical blocks, and the final layer to
// 64 x 64 x 8 (noise and learned variance). The six vectors are drawn as slabs, not values. ----
(function () {
  if (!document.getElementById('stg-dit') || !window.LDK) return;
  const U = LDU, { mix } = S3, { tw, la, lab, seg, arcPts, win, plates, wall, f1 } = LDK, D = U.L.stages.dit, NB = 28;
  const bp = D.params['blocks.0'], bf = D.flops['blocks.0'];
  const X = { lat: -5.2, tok: -2.3, blk: 1.2, out: 4.6 }, S = 1.8, ZC = -2.4;
  const MOD = [['shift', 'c2'], ['scale', 'c5'], ['gate', 'c4'], ['shift', 'c2'], ['scale', 'c5'], ['gate', 'c4']];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6.6, 6.2, -3.4, 2.4, .5);
    // 1. the latent
    plates(R, X.lat, 0, S, S, 4, P.c1, tw(st, e, q => q === 0 ? 1 : q === 5 ? .5 : .3), { nu: 8, gap: .08 });
    lab(R, [X.lat, .05, S / 2], '64 × 64 × 4 latent', { mono: 1, fs: 12.5, b: 1, c: P.c1, dy: 16, a: la(st, e, q => q === 0 ? 1 : 0) });
    // 2. patchify: 2 x 2 patches become 1,024 tokens of 1,152 (a 32 x 32 grid of tokens), plus fixed 2-D sine-cosine positions
    const pa = tw(st, e, q => q < 1 ? 0 : q === 1 ? 1 : q === 2 ? .35 : .5);
    if (pa > .01) { R.glass([X.tok - S / 2, .1, -S / 2], [S, 0, 0], [0, 0, S], { c: P.acc, a: pa * (k === 1 && st.pk < 1 ? win(e, .3, .8) : 1), nu: 32, nv: 32, th: .05 });
      R.box([X.tok, .16, 0], [S, .06, S], { fill: mix(P.paper, P.acc, .35), a: pa * .5, fa: .4, shadow: false }); }
    if (k === 1) R.flow(arcPts(R, [X.lat + S / 2, .35, 0], [X.tok - S / 2, .25, 0], .5, 14), { c: P.acc, r: .07, a: e, speed: 1.3 });
    lab(R, [X.tok, .1, S / 2], '1,024 tokens × 1,152', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: 16, a: la(st, e, q => q === 1 ? 1 : 0) });
    lab(R, [X.tok, .25, -S / 2], '+ 2-D sine-cosine positions', { fs: 12, c: P.mute, dy: -12, a: la(st, e, q => q === 1 ? 1 : 0) });
    // 3. the condition: timestep + class into c; each block's modulation layer gives six vectors (gates start at zero)
    const ca = tw(st, e, q => q === 2 ? 1 : q === 3 ? .8 : q === 4 ? .35 : 0);
    if (ca > .01) {
      R.box([X.tok - .5, 0, ZC], [.5, .3, .4], { fill: mix(P.paper, P.c6, .6), a: ca }); R.box([X.tok + .5, 0, ZC], [.5, .3, .4], { fill: mix(P.paper, P.c6, .6), a: ca });
      R.box([X.tok + 1.9, 0, ZC], [.6, .5, .5], { fill: mix(P.paper, P.c6, .85), a: ca });
      wall(R, X.tok + 3.0, ZC - .4, .7, .9, P.c6, ca, { nu: 3, nv: 6 });
      MOD.forEach(([n, c], i) => { const x = X.blk + .2 + i * .42, h = n === 'gate' ? .02 : .45;
        R.box([x, 0, ZC], [.3, h, .3], { fill: mix(P.paper, P[c], .75), a: ca });
        if (n === 'gate') R.glow([x, .05, ZC], .25, { c: P[c], a: ca * .6 });
        lab(R, [x, h, ZC], n, { fs: 12, c: P[c], dy: -12 - (i % 2) * 15, wide: 1, a: la(st, e, q => q === 2 ? 1 : 0) }); });
      if (k === 2) { R.flow(seg([X.tok - .5, .3, ZC], [X.tok + 1.6, .3, ZC], 10), { c: P.c6, r: .06, a: e, speed: 1.1 }); R.flow(seg([X.tok + 2.2, .3, ZC], [X.blk + .1, .25, ZC], 12), { c: P.c6, r: .06, a: e, speed: 1.2 }); }
      lab(R, [X.tok - .5, .3, ZC], 'timestep', { fs: 12, c: P.c6, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) });
      lab(R, [X.tok + .5, .3, ZC], 'class', { fs: 12, c: P.c6, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) });
      lab(R, [X.tok + 1.9, .5, ZC], 'c', { serif: 1, fs: 15, b: 1, c: P.c6, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) });
      lab(R, [X.tok + 3.0, 1.0, ZC - .4], 'SiLU, linear: 1,152 → 6 × 1,152', { mono: 1, fs: 12, c: P.c6, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) });
      lab(R, [X.blk + 1.25, 0, ZC + .2], 'gates start at 0', { fs: 12.5, b: 1, c: P.c4, dy: 18, a: la(st, e, q => q === 2 ? 1 : 0) }); }
    // 4. one block: attention then the MLP, each modulated, gated and added back
    const ba = tw(st, e, q => q === 3 ? 1 : 0);
    if (ba > .01) { wall(R, X.blk + .5, 0, 1.2, 1.1, P.q, ba, { nu: 6, nv: 6 }); wall(R, X.blk + 2.0, 0, 1.2, 1.1, P.c3, ba, { nu: 6, nv: 6 });
      lab(R, [X.blk + .5, 1.2, 0], 'attention', { fs: 12.5, b: 1, c: P.q, dy: -12, a: la(st, e, q => q === 3 ? 1 : 0) });
      lab(R, [X.blk + 2.0, 1.2, 0], 'MLP', { fs: 12.5, b: 1, c: P.c3, dy: -12, a: la(st, e, q => q === 3 ? 1 : 0) });
      if (k === 3) { R.flow(seg([X.tok + S / 2, .5, 0], [X.blk + 2.9, .5, 0], 20), { c: P.acc, r: .07, a: e, speed: 1.3 });
        [0, 1, 2].forEach(i => R.flowArc([X.blk + .2 + i * .42, .45, ZC], [X.blk + .5, .6, 0], .5, { c: P[MOD[i][1]], r: .05, n: 4, speed: 1.1, a: e * .8 }));
        [3, 4, 5].forEach(i => R.flowArc([X.blk + .2 + i * .42, .45, ZC], [X.blk + 2.0, .6, 0], .5, { c: P[MOD[i][1]], r: .05, n: 4, speed: 1.1, a: e * .8 })); }
      R.arc([X.tok + S / 2, .3, .5], [X.blk + 2.9, .3, .5], .5, { c: P.mute, w: 1.4, a: ba * .8 });
      lab(R, [X.blk + 1.25, .55, .5], 'residual', { fs: 12, c: P.mute, dy: 14, a: la(st, e, q => q === 3 ? 1 : 0) }); }
    // 5. the 28 identical blocks
    const sa = tw(st, e, q => q === 4 ? 1 : q === 5 ? .4 : 0);
    if (sa > .01) { for (let i = 0; i < NB; i++) R.glass([X.blk - .1, .1 + i * .07, -.8], [1.6, 0, 0], [0, 0, 1.6], { c: P.acc, a: sa * .55 * (k === 4 && st.pk < 4 ? win(e, i / NB * .7, i / NB * .7 + .2) : 1), nu: 4, nv: 4, th: .015 });
      if (k === 4) R.flow(seg([X.blk + .7, .1, .9], [X.blk + .7, .1 + NB * .07, .9], 14), { c: P.acc, r: .06, a: e, speed: 1.2 });
      lab(R, [X.blk + 1.6, .1 + NB * .07, 0], NB + ' blocks', { fs: 12.5, b: 1, c: P.ink, al: 'left', dx: 8, a: la(st, e, q => q === 4 ? 1 : 0) });
      lab(R, [X.blk + 1.6, .1 + NB * .07, 0], f1(bp / 1e6) + 'M · ' + f1(bf / 1e9) + ' GFLOP each', { mono: 1, fs: 12, c: P.mute, al: 'left', dx: 8, dy: 16, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    // 6. the final layer: each token back to 2 x 2 x 8, the 64 x 64 x 8 output (noise, then the learned variance)
    const oa = tw(st, e, q => q === 5 ? 1 : 0);
    if (oa > .01) { for (let i = 0; i < 8; i++) R.glass([X.out - S / 2, .05 + i * .08, -S / 2], [S, 0, 0], [0, 0, S], { c: i < 4 ? P.c1 : P.c5, a: oa * (k === 5 ? win(e, .3 + i * .06, .55 + i * .06) : 1), nu: 8, nv: 8, th: .02 });
      if (k === 5) R.flow(arcPts(R, [X.blk + 1.2, 1.2, 0], [X.out - S / 2, .4, 0], .5, 16), { c: P.acc, r: .07, a: e, speed: 1.3 });
      lab(R, [X.out, .05, S / 2], '64 × 64 × 8', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: 16, a: la(st, e, q => q === 5 ? 1 : 0) });
      lab(R, [X.out + S / 2, .2, 0], 'noise', { fs: 12, c: P.c1, al: 'left', dx: 8, a: la(st, e, q => q === 5 ? 1 : 0) });
      lab(R, [X.out + S / 2, .55, 0], 'variance', { fs: 12, c: P.c5, al: 'left', dx: 8, dy: -6, a: la(st, e, q => q === 5 ? 1 : 0) }); }
  }
  const full = { cam: [.18, .62], bounds: [[-6.3, 0, -3.0], [6.0, 2.2, 1.9]] };
  S3.stage({ id: 'stg-dit', list: 'sx-dit', fig: 'Fig. 5 · DiT-XL/2 at 512 pixels', cam: full.cam, bounds: full.bounds, aspect: .55, dur: 1500, hold: 4800, draw, margin: LDK.margin,
    view: k => k <= 1 ? { cam: [.18, .7], bounds: [[-6.3, 0, -1.3], [-1.2, .6, 1.6]] } : k === 2 ? { cam: [.15, .6], bounds: [[-3.4, 0, -3.2], [4.4, 1.2, .4]] } : k === 3 ? { cam: [.22, .45], bounds: [[-3.4, 0, -3.0], [4.4, 1.4, 1.2]] } : full });
})();
