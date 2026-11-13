// ---- Scene (section 1, Fig. 2): five connectors on the same photo, one design per step, then the tokens each puts in the context.
// Grids and counts: LLaVA-1.5 576 (24 x 24 patches of 14 at 336, config), BLIP-2 32 queries over 257 vectors (paper), Flamingo 64 latents
// outside the sequence (paper), SmolVLM 17 views x 1,024 patches to 1,088 tokens and Qwen3.5 1,024 patches to 256 tokens (measured on the
// 512 x 512 cat: VM_DATA.saw). One square is one token, the same size in every step. Flamingo's feature grid is drawn schematically. ----
(function () {
  if (!document.getElementById('stg-conn') || !window.VMK) return;
  const K = VMK, { tw, la, lab, seg, arcPts, imgUp, wall, int, mix } = K;
  const cat = K.saw('p01_cat'); if (!cat) return;
  const sm = cat.smol[0], qw = cat.qwen.find(x => x.budget === '256') || cat.qwen[0];
  const PX = -4.9, PS = 2, CX = -1.55, WX = -.3, TS = .066, COLS = 32;
  const DES = [
    { n: 'LLaVA-1.5', g: 24, out: 576, ctx: 576, col: 'c2' },
    { n: 'BLIP-2', g: 16, out: 32, ctx: 32, col: 'c6' },
    { n: 'Flamingo', g: 12, out: 64, ctx: 0, col: 'c5' },
    { n: 'SmolVLM', g: 32, out: sm.imgTok, ctx: sm.imgTok, col: 'acc' },
    { n: 'Qwen3.5', g: 32, out: qw.imgTok, ctx: qw.imgTok, col: 'c4' }];
  const on = (st, e, d) => tw(st, e, s => s === d ? 1 : 0), lo = (st, e, d) => la(st, e, s => s === d ? 1 : 0);
  // learned queries or latents: balls in a small grid floating at height y
  function balls(R, n, cols, x, y, z, gap, c, a) { if (a <= .01) return; for (let i = 0; i < n; i++) { const cx = x + (i % cols) * gap, cz = z - Math.floor(i / cols) * gap; R.ball([cx, y, cz], .055, { c, a }); } }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6, 4.6, -3, 2.6, .5);
    const photo = K.pic(K.D.catThumb), pBase = tw(st, e, s => s < 5 ? 1 : .25);
    // the encoder's patch grid on the photo: one plate per design (SmolVLM's is its 17 views)
    DES.forEach((d, i) => { const a = on(st, e, i) * pBase; if (a <= .01) return; const C = P[d.col];
      if (i === 3) { const ts = .45, tg = .04; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
          imgUp(R, K.pic(sm.thumbs[r * 4 + c]), PX + c * (ts + tg) - .1, .15 + (3 - r) * (ts + tg), 0, ts, ts, { a, sub: 2, rim: .03, grid: [8, 8, P.paper, .8], gw: .5, box: r === 0 && c === 0 ? [0, 0, .125, .125, C, 2] : null });
        imgUp(R, K.pic(sm.thumbs[16]), PX + 4 * (ts + tg), .15, 0, .55, .55, { a, sub: 3, rim: .03, grid: [8, 8, P.paper, .8], gw: .5 }); }
      else imgUp(R, i === 4 ? K.pic(qw.picture) : photo, PX, .15, 0, PS, PS, { a, grid: [d.g, d.g, P.paper, i === 2 ? .45 : .7], gw: .5, box: i === 4 ? [0, 0, 1 / 16, 1 / 16, C, 2] : null }); });
    const pl = [['24 × 24 = 576 patch vectors of 1,024', 0], ['16 × 16 patches + [CLS] = 257 vectors', 1], ['feature grid (schematic)', 2], ['17 views; a cell = 4 × 4 patches', 3], ['32 × 32 = 1,024 patches; one 2 × 2 block outlined', 4]];
    pl.forEach(([t, i]) => lab(R, [PX + PS / 2, .15, 0], t, { fs: 12, c: P.mute, dy: 14, a: lo(st, e, i) }));
    // the connectors
    const Y = 1.15;
    { const a = on(st, e, 0), C = P.c2; if (a > .01) { R.glass([CX - .35, .15, -.5], [0, 0, 1], [0, 1.6, 0], { c: C, a, nu: 4, nv: 8 }); R.glass([CX + .25, .15, -.5], [0, 0, 1], [0, 1.6, 0], { c: C, a, nu: 4, nv: 8 });
      if (k === 0) { R.flow(seg([PX + PS, Y, 0], [CX - .35, Y, 0], 10), { c: C, a, r: .07 }); R.flow(seg([CX + .3, Y, 0], [WX, Y, 0], 8), { c: C, a, r: .07 }); }
      lab(R, [CX, 1.75, -.5], '2-layer MLP, each patch alone', { fs: 12.5, b: 1, c: C, dy: R.W < 520 ? -34 : -14, al: R.W < 520 ? 'left' : 'center', dx: R.W < 520 ? -14 : 0, a: lo(st, e, 0) }); /* on a phone: higher and to the right, clear of the photo */ } }
    { const a = on(st, e, 1), C = P.c6; if (a > .01) { balls(R, 32, 8, CX - .4, 1.9, .3, .13, C, a);
      if (k === 1) [[-3.9, .5], [-3.2, 1.2], [-4.2, 1.7], [-3, .4], [-3.6, 1.5]].forEach(([x, y], j) => R.flowArc([x, y + .15, 0], [CX - .4 + (j % 4) * .26, 1.9, .2 - (j % 3) * .13], .45, { c: C, a: a * .8, r: .05, n: 5, speed: 1.4 }));
      if (k === 1) R.flow(arcPts(R, [CX + .6, 1.9, 0], [WX + .3, .5, 0], .2, 14), { c: C, a, r: .07 });
      lab(R, [CX + .05, 1.9, .3], '32 learned queries cross-attend', { fs: 12.5, b: 1, c: C, dy: -30, a: lo(st, e, 1) }); } }
    { const a = on(st, e, 2), C = P.c5; if (a > .01) { balls(R, 64, 8, CX - .5, 1.95, .45, .12, C, a);
      if (k === 2) [[-3.9, .6], [-3.1, 1.3], [-4.3, 1.6]].forEach(([x, y]) => R.flowArc([x, y + .15, 0], [CX - .1, 1.95, 0], .4, { c: C, a: a * .8, r: .05, n: 5, speed: 1.4 }));
      // the language model as a stack: frozen layers (grey) with new gated cross-attention layers (gold) between them; only text tokens enter
      for (let L = 0; L < 6; L++) R.glass([WX, .2 + L * .26, -.7], [2.2, 0, 0], [0, 0, 1.4], { c: L % 2 ? C : P.mute, a: a * (L % 2 ? .9 : .55), nu: 6, nv: 3, th: .02 });
      if (k === 2) [1, 3, 5].forEach(L => R.flowArc([CX + .4, 1.95, 0], [WX + .2, .2 + L * .26, 0], .25, { c: C, a: a * .8, r: .05, n: 4, speed: 1.2 }));
      lab(R, [CX + .0, 1.95, .45], '64 latents (Perceiver Resampler)', { fs: 12.5, b: 1, c: C, dy: -30, a: lo(st, e, 2) });
      lab(R, [WX + 1.1, 1.75, -.7], 'gold: gated cross-attention, tanh(α), α = 0 at start', { fs: 12, c: C, dy: -12, a: lo(st, e, 2), wide: 1 });
      lab(R, [WX + 1.1, .2, .7], 'grey: frozen language-model layers', { fs: 12, c: P.mute, dy: 16, a: lo(st, e, 2), wide: 1 }); } }
    { const a = on(st, e, 3), C = P.acc; if (a > .01) { R.box([CX, 1.0, 0], [1.1, .09, .09], { fill: mix(P.paper, C, .7), a, shadow: false }); R.glass([CX - .25, .15, -.45], [0, 0, .9], [0, .75, 0], { c: C, a, nu: 3, nv: 5 });
      if (k === 3) { R.flowArc([PX + .1, 2.0, 0], [CX - .55, 1.05, 0], .35, { c: C, a, r: .06 }); R.flow(seg([CX + .1, .5, 0], [WX, .5, 0], 8), { c: C, a, r: .07 }); }
      lab(R, [CX, 1.1, 0], '4 × 4 side by side: 12,288 numbers', { fs: 12, b: 1, c: C, dy: -14, a: lo(st, e, 3) });
      lab(R, [CX, .15, .45], 'one matrix to 960', { fs: 12, c: C, dy: 16, a: lo(st, e, 3) }); } }
    { const a = on(st, e, 4), C = P.c4; if (a > .01) { R.box([CX, 1.0, 0], [.6, .09, .09], { fill: mix(P.paper, C, .7), a, shadow: false });
      R.glass([CX - .25, .15, -.45], [0, 0, .9], [0, .75, 0], { c: C, a, nu: 3, nv: 5 }); R.glass([CX + .15, .15, -.45], [0, 0, .9], [0, .75, 0], { c: C, a, nu: 3, nv: 5 });
      if (k === 4) { R.flowArc([PX + .06, 2.1, 0], [CX - .3, 1.05, 0], .35, { c: C, a, r: .06 }); R.flow(seg([CX + .2, .5, 0], [WX, .5, 0], 8), { c: C, a, r: .07 }); }
      lab(R, [CX, 1.1, 0], '2 × 2 side by side: 3,072', { fs: 12, b: 1, c: C, dy: -14, a: lo(st, e, 4) });
      lab(R, [CX, .15, .45], 'MLP to 1,024', { fs: 12, c: C, dy: 16, a: lo(st, e, 4) }); } }
    // the tokens that come out, as walls: one square per token
    DES.forEach((d, i) => { if (i === 2) return; const a = on(st, e, i), C = P[d.col]; if (a <= .01) return; const rows = Math.ceil(d.out / COLS);
      wall(R, WX, .2, 0, d.out, COLS, TS, C, a);
      lab(R, [WX + COLS * TS / 2, .2 + rows * TS, 0], int(d.out) + ' image tokens' + (i === 4 ? ', 3-D positions' : ''), { fs: 13, b: 1, c: C, dy: -12, a: lo(st, e, i) }); });
    lab(R, [WX + 1.1, .2, .7], 'the sequence holds text only: 0 image tokens', { fs: 12.5, b: 1, c: P.c5, dy: 34, a: lo(st, e, 2) });
    // 6. what each design puts in the context, as columns (Flamingo's 64 stay outside it)
    const ca = tw(st, e, s => s === 5 ? 1 : 0);
    if (ca > .01) DES.forEach((d, i) => { const x = -3.5 + i * 1.45, h = Math.max(.02, d.ctx / 1088 * 2.2) * (st.pk < 5 ? e : 1), C = P[d.col];
      if (d.ctx) R.box([x, 0, .6], [.7, h, .7], { fill: mix(P.paper, C, .7), a: ca });
      else R.quad([[x - .35, 0, .25], [x + .35, 0, .25], [x + .35, 0, .95], [x - .35, 0, .95]], { fill: mix(P.paper, C, .25), a: ca, dash: [4, 3] });
      lab(R, [x, h, .6], d.ctx ? int(d.ctx) : '0 (64 outside)', { mono: 1, fs: 13, b: 1, c: C, dy: -18, a: lo(st, e, 5) });
      lab(R, [x, 0, .95], d.n, { fs: 12.5, b: 1, dy: 14, a: lo(st, e, 5) }); });
  }
  const full = { cam: [.26, .42], bounds: [[-5.1, 0, -.8], [2.1, 2.2, .9]] };
  const st = S3.stage({ id: 'stg-conn', list: 'sx-conn', fig: 'Fig. 2 · five connectors, one photo', cam: full.cam, bounds: full.bounds, aspect: .47, dur: 1500, hold: 5000, draw, margin: K.margin,
    view: k => k === 5 ? { cam: [.2, .5], bounds: [[-4.2, 0, .1], [2.6, 2.3, 1.2]] } : k === 2 ? { cam: [.32, .5], bounds: [[-5.1, 0, -.9], [2.2, 2.2, 1]] } : full });
  K.onPic(() => st && st.draw());
})();
