// ---- Scene (section 2, Fig. 3): SD 1.5's U-Net read from its config (LD.arch sd15 config: block_out_channels [320, 640, 1280, 1280],
// layers_per_block 2, CrossAttnDownBlock2D x 3 then DownBlock2D, UpBlock2D then CrossAttnUpBlock2D x 3). Each stage is a stack of glass plates,
// one per 160 channels, its width growing with the grid side (square-root scale), deeper levels nearer the front (lower on the screen). The twelve skips are wired as diffusers
// pops them (last saved, first used); the 16 cross-attention blocks are the purple cubes. Parameters and FLOPs per stage: LD.stages.sd15 (counted). ----
(function () {
  if (!document.getElementById('stg-unet') || !window.LDK) return;
  const U = LDU, { mix } = S3, { tw, la, lab, seg, path, win, plates } = LDK, SG = U.L.stages.sd15, cfg = U.byKey.sd15.config, ch = cfg.block_out_channels;
  const ST = [['conv_in', 64, 4, 0], ['down_blocks.0', 64, ch[0], 2], ['down_blocks.1', 32, ch[1], 2], ['down_blocks.2', 16, ch[2], 2], ['down_blocks.3', 8, ch[3], 0], ['mid_block', 8, ch[3], 1],
    ['up_blocks.0', 8, ch[3], 0], ['up_blocks.1', 16, ch[2], 3], ['up_blocks.2', 32, ch[1], 3], ['up_blocks.3', 64, ch[0], 3], ['conv_out', 64, 4, 0]].map(([n, side, c, xa], i) => {
    const lv = Math.round(Math.log2(64 / side)), w = .3 + .85 * Math.sqrt(side / 64), np = Math.max(1, c / 160);
    return { n, side, c, xa, i, x: -6.25 + i * 1.25, z: -1.25 + lv * 1.05, w, np, top: .05 + (np - 1) * .08 + .02, pp: SG.params[n] / U.byKey.sd15.params, pf: SG.flops[n] / SG.total }; });
  // skips: conv_in, then per down level two ResNets and (first three levels) a downsampler; each up level consumes three, last saved first
  const SAVE = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4], SK = []; { const stack = SAVE.slice(); [6, 7, 8, 9].forEach(u => { for (let j = 0; j < 3; j++) SK.push([stack.pop(), u, j]); }); }
  const top = s => [s.x, s.top + .05, s.z];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-7, 7, -3.6, 2.6, .5);
    const show = s => q => { if (q === 5) return .22; if (s.i === 0 || s.i === 10) return q === 0 || q === 6 ? 1 : .5; if (s.i <= 4) return q >= 1 ? (q === 1 ? 1 : .7) : .12;
      if (s.i === 5) return q >= 2 ? (q === 2 ? 1 : .7) : .12; return q >= 3 ? (q === 3 ? 1 : .7) : .12; };
    ST.forEach(s => { const a = tw(st, e, show(s)), c = s.c === 4 ? P.c5 : P.acc;
      plates(R, s.x, s.z, s.w, s.w, s.np, c, a, { nu: Math.min(8, s.side / 8), gap: .08 }); });
    // resolution x channels, on the stages of the current step
    const lbl = s => q => (q === 0 && s.i === 0) || (q === 1 && s.i >= 1 && s.i <= 4) || (q === 2 && s.i === 5) || (q === 3 && s.i >= 6 && s.i <= 9) || (q === 6 && s.i === 10) ? 1 : 0;
    ST.forEach(s => lab(R, [s.x, .05, s.z + s.w / 2], s.side + '² × ' + s.c.toLocaleString('en-GB'), { mono: 1, fs: 12, b: 1, c: s.c === 4 ? P.c5 : P.acc, dy: 16, a: la(st, e, lbl(s)) }));
    lab(R, [ST[0].x, .2, ST[0].z - .5], 'noisy latent', { fs: 12.5, b: 1, c: P.c5, dy: -16, a: la(st, e, q => q === 0 ? 1 : 0) });
    lab(R, [ST[10].x, .2, ST[10].z - .5], 'predicted noise', { fs: 12.5, b: 1, c: P.c5, dy: -16, a: la(st, e, q => q === 6 ? 1 : 0) });
    // data moving along the U for the step's part of it
    const run = (a, b) => path(ST.slice(a, b + 1).map(top));
    if (k === 0) R.flow(run(0, 1), { c: P.c5, r: .07, a: e, speed: 1.2 });
    if (k === 1) R.flow(run(0, 4), { c: P.acc, r: .07, a: e, speed: 1.4 });
    if (k === 2) R.flow(run(4, 6), { c: P.acc, r: .07, a: e, speed: 1.2 });
    if (k === 3) R.flow(run(5, 9), { c: P.acc, r: .07, a: e, speed: 1.4 });
    if (k === 6) R.flow(run(8, 10), { c: P.c5, r: .07, a: e, speed: 1.2 });
    // the twelve skips: concatenated across, each drawn as an arc from where it was saved to the up level that uses it
    const sa = tw(st, e, q => q === 3 ? 1 : q === 4 ? .18 : q === 5 ? .1 : 0);
    if (sa > .01) SK.forEach(([a, b, j], m) => { const A = ST[a], B = ST[b], dz = (j - 1) * .12, h = .5 + .12 * (b - a), t = k === 3 && st.pk < 3 ? win(e, m / 12 * .6, m / 12 * .6 + .4) : 1;
      R.arc([A.x, A.top + .05, A.z + dz], [B.x, B.top + .05, B.z + dz], h, { c: P.c6, w: 1.6, t, a: sa });
      if (k === 3) R.flowArc([A.x, A.top + .05, A.z + dz], [B.x, B.top + .05, B.z + dz], h, { c: P.c6, r: .05, n: 5, speed: 1.3, a: sa * t }); });
    lab(R, [0, 1.75, -.2], '12 skips, concatenated', { fs: 12.5, b: 1, c: P.c6, a: la(st, e, q => q === 3 ? 1 : 0) });
    // cross-attention: one cube per transformer block; the 77 text vectors at the back feed every one
    const xa = tw(st, e, q => q === 4 ? 1 : q === 5 ? .12 : 0);
    if (xa > .01) { const ZT = -3.1; R.glass([-5.2, .05, ZT - .3], [10.4, 0, 0], [0, 0, .6], { c: P.c3, a: xa, nu: 14, nv: 2, th: .03 });
      lab(R, [0, .05, ZT - .3], '77 × 768 text vectors', { mono: 1, fs: 12, b: 1, c: P.c3, dy: -12, a: la(st, e, q => q === 4 ? 1 : 0) });
      ST.forEach(s => { for (let j = 0; j < s.xa; j++) { const p = [s.x - (s.xa - 1) * .14 + j * .28, 0, s.z + s.w / 2 + .3]; R.box(p, [.2, .2, .2], { fill: mix(P.paper, P.c4, .7), a: xa });
        if (k === 4) R.flowArc([p[0], .05, ZT], [p[0], .22, p[2] - .05], .5, { c: P.c3, r: .045, n: 4, speed: 1.1, a: xa * .9 }); } });
      lab(R, [ST[5].x, 0, ST[5].z + ST[5].w / 2 + .45], '16 cross-attention blocks', { fs: 12.5, b: 1, c: P.c4, dy: 22, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    // parameters against FLOPs per stage, to scale
    const ca = tw(st, e, q => q === 5 ? 1 : 0);
    if (ca > .01) { const g = k === 5 ? win(e, 0, .8) : 1, HS = 2.3 / .31;
      ST.slice(1, 10).forEach(s => { const hp = Math.max(.02, s.pp * HS * g), hf = Math.max(.02, s.pf * HS * g);
        R.box([s.x - .2, 0, s.z], [.34, hp, .34], { fill: mix(P.paper, P.c2, .75), a: ca }); R.box([s.x + .2, 0, s.z], [.34, hf, .34], { fill: mix(P.paper, P.c1, .75), a: ca });
        if (['down_blocks.0', 'up_blocks.1', 'up_blocks.3'].includes(s.n)) lab(R, [s.x, Math.max(hp, hf), s.z], (100 * s.pp).toFixed(1) + '% · ' + (100 * s.pf).toFixed(1) + '%', { mono: 1, fs: 12, b: 1, c: P.ink, dy: -14, a: la(st, e, q => q === 5 ? 1 : 0) * win(e, .5, 1) }); });
      lab(R, [-6.4, 2.2, -1.6], 'parameters', { fs: 12.5, b: 1, c: P.c2, al: 'left', a: la(st, e, q => q === 5 ? 1 : 0) });
      lab(R, [-6.4, 2.2, -1.6], 'FLOPs', { fs: 12.5, b: 1, c: P.c1, al: 'left', dy: 18, a: la(st, e, q => q === 5 ? 1 : 0) }); }
  }
  const full = { cam: [.12, .72], bounds: [[-6.9, 0, -3.4], [6.9, 1.4, 2.9]] };
  S3.stage({ id: 'stg-unet', list: 'sx-unet', fig: 'Fig. 3 · SD 1.5 U-Net from its config', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 1500, hold: 4800, draw, margin: LDK.margin,
    view: k => k === 0 ? { cam: [.2, .62], bounds: [[-7.1, 0, -2.2], [-1.6, 1, 1.4]] } : k === 5 ? { cam: [.12, .42], bounds: [[-6.9, 0, -2.2], [6.9, 2.4, 2.9]] } : k === 6 ? { cam: [.05, .62], bounds: [[1.6, 0, -2.2], [7.1, 1, 1.4]] } : full });
})();
