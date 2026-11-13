// ---- Scene (top of page, Fig. 1): the encoder-decoder hourglass of the topic's ConvAE (root src/data/nets.py: two stride-2 convolutions,
// 32 x 32 x 1 to 16 x 16 x 32 to 8 x 8 x 64, then the bottleneck, then the mirror image) with three bottlenecks. The input tile and the three
// reconstructions are the root Latent lab's recorded tiles (AVL.img.rec, test image 1 of the topic's 16); the 16 code numbers, means and spreads
// and the 64 tokens are that image's recorded codes (AVSC, from the root's tiny.json; AVD.quant for the tokens); PSNR is that image's. Glass
// plates stand for the channels (one plate per 8), drawn to the grid's size. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.AVK || !window.AVSC) return;
  const { mix, lerp } = S3, { pixels, tileFlat, bars, lab, seg, win, f0 } = AVK, SC = AVSC, I = 0;
  const RK = AVL.img.rec.rows, tileOf = row => RK[row] * 16 + SC.pick[I];
  const TOK = AVD.quant.runs.vq_restart.tokens16[SC.pick[I]];
  const X = { img: -5.6, e1: -3.25, e2: -1.65, lat: .6, d2: 2.85, d1: 4.45, out: 6.8 }, S = 2;
  const ROW = ['ae16', 'vae16_b1p0', 'vq_restart'], NAME = ['plain autoencoder', 'VAE', 'VQ-VAE'];
  let st = null; const redraw = () => st && st.draw();
  // a feature map: plates of a square grid, one plate per 8 channels, stacked upwards
  function fmap(R, x, side, n, ch, c, a) { if (a <= .01) return; const k = ch / 8;
    for (let i = 0; i < k; i++) R.glass([x - side / 2, .06 + i * .11, -side / 2], [side, 0, 0], [0, 0, side], { c, a, nu: Math.min(n, 16), nv: Math.min(n, 16), th: .02 }); }
  const hue = t => { const h = (t * 137.508) % 360; return 'hsl(' + h.toFixed(0) + ',42%,62%)'; };
  function draw(R, k, e) {
    const P = R.P; R.grid(-7, 8.2, -2, 2, .5);
    const src = pixels('rec', tileOf('orig'), redraw);
    // 1. the image: 1,024 numbers
    tileFlat(R, [X.img, 0, 0], S, src, k === 0 ? 1 : k === 5 ? .45 : .85);
    lab(R, [X.img, 0, S / 2 + .1], k === 0 ? 'image · 32 × 32 = 1,024 numbers' : 'image', { fs: 12.5, b: 1, dy: 16, c: P.ink });
    // 2. the encoder: two stride-2 convolutions halve the grid twice and add channels
    const ea = k === 0 ? .14 : k === 1 ? e : k === 5 ? .3 : .75;
    fmap(R, X.e1, 1.45, 16, 32, P.c1, ea * (k === 1 ? win(e, 0, .5) : 1)); fmap(R, X.e2, .78, 8, 64, P.c1, ea * (k === 1 ? win(e, .35, .85) : 1));
    if (k === 1) { lab(R, [X.e1, .5, 0], '16 × 16 × 32', { mono: 1, fs: 12, dy: -30, c: P.c1, a: k === 1 ? win(e, .3, .7) : .9 });
      lab(R, [X.e2, .95, 0], '8 × 8 × 64', { mono: 1, fs: 12, dy: -18, c: P.c1, a: k === 1 ? win(e, .6, 1) : .9 }); }
    if (k >= 1 && k <= 4) R.flow(seg([X.img + S / 2, .25, 0], [X.e2 - .4, .55, 0], 16), { c: P.c1, r: .07, a: k === 1 ? e : .6, speed: 1.4 });
    // decoder: the mirror image, faint until a bottleneck is decoded
    const da = k <= 1 ? .14 : k === 5 ? .3 : .75;
    fmap(R, X.d2, .78, 8, 64, P.c4, da); fmap(R, X.d1, 1.45, 16, 32, P.c4, da);
    if (k >= 2 && k <= 4) lab(R, [(X.d2 + X.d1) / 2, 0, .85], 'decoder', { fs: 12.5, b: 1, c: P.c4, dy: 16 });
    if (k >= 1 && k <= 4) lab(R, [(X.e1 + X.e2) / 2, 0, .85], 'encoder', { fs: 12.5, b: 1, c: P.c1, dy: 16, a: k === 1 ? e : 1 });
    // 3 to 5. the bottleneck: what the latent is allowed to be
    const m = k >= 2 ? Math.min(2, k - 2) : -1, g = m >= 0 && k <= 4 ? win(e, 0, .55) : 1, ee = k === 5 ? 1 : e;
    if (m === 0) { const v = SC.ae16_code[I], mx = Math.max(...v.map(Math.abs));
      bars(R, [X.lat, .45, 0], v, mx, mix(P.paper, P.c2, .75), 1, { w: 2, h: .6, grow: g });
      lab(R, [X.lat, 1.1, 0], '16 numbers', { mono: 1, fs: 12, c: P.c2, dy: -14, b: 1, a: win(e, .2, .6) }); }
    if (m === 1) { const mu = SC.vae_mu[I], sg = SC.vae_sigma[I], mx = Math.max(...mu.map(Math.abs));
      bars(R, [X.lat, .62, -.32], mu, mx, mix(P.paper, P.acc, .75), 1, { w: 2, h: .45, grow: g });
      bars(R, [X.lat, .2, .32], sg, mx, mix(P.paper, P.c5, .7), 1, { w: 2, h: .45, grow: g, legs: false });
      lab(R, [X.lat, 1.12, -.32], 'μ, 16 means', { mono: 1, fs: 12, c: P.acc, dy: -10, b: 1, a: win(e, .2, .6) });
      lab(R, [X.lat, 0, .5], 'σ, 16 spreads', { mono: 1, fs: 12, c: P.c5, dy: 16, b: 1, a: win(e, .2, .6) }); }
    if (m === 2) { const cs = .21;
      TOK.forEach((t, i) => { const r = Math.floor(i / 8), c = i % 8, x = X.lat - 3.5 * cs + c * cs, z = -3.5 * cs + r * cs, gi = win(ee, i / 64 * .5, i / 64 * .5 + .2);
        if (gi > 0) R.box([x, 0, z], [cs * .86, .08 + .06 * gi, cs * .86], { fill: S3.rgb(hue(t)), a: gi, shadow: false, lw: .6 }); });
            lab(R, [X.lat, .2, 0], '64 tokens', { mono: 1, fs: 12, c: P.ink, dy: -34, b: 1, a: k === 5 ? 0 : win(e, .4, .8) }); }
    if (k === 5) { R.glow([X.lat, .2, 0], 1.5, { c: P.acc, a: .45 * e });
      lab(R, [X.lat, .5, 0], 'the generator works here', { fs: 13, b: 1, c: P.acc, dy: -34, a: e }); }
    if (m >= 0 && k <= 4) { R.flow(seg([X.e2 + .4, .55, 0], [X.lat - .8, .5, 0], 8), { c: P.c1, r: .07, a: .8, speed: 1.3 });
      R.flow(seg([X.lat + .8, .5, 0], [X.out - S / 2, .25, 0], 18), { c: P.c4, r: .07, a: win(e, .3, .7), speed: 1.4 });
      // the reconstruction of this bottleneck, and its PSNR on this image, once the decoder has drawn it
      const ra = win(e, .45, .85);
      tileFlat(R, [X.out, 0, 0], S, pixels('rec', tileOf(ROW[m]), redraw), Math.max(.15, ra));
      lab(R, [X.out, 0, S / 2 + .1], NAME[m] + ', ' + SC.psnr[ROW[m]][I].toFixed(1) + ' dB', { fs: 12.5, b: 1, dy: 16, c: P.c4, a: win(e, .7, 1) }); }
    else if (k === 5) tileFlat(R, [X.out, 0, 0], S, pixels('rec', tileOf('vq_restart'), redraw), .45);
    else tileFlat(R, [X.out, 0, 0], S, null, .14);
  }
  const full = { cam: [.1, .55], bounds: [[-6.7, 0, -1.2], [7.9, 1.1, 1.4]] };
  st = S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one image, three bottlenecks', cam: full.cam, bounds: full.bounds, aspect: .3, dur: 1500, hold: 4800, draw, margin: AVK.margin,
    view: k => k === 0 ? { cam: [.12, .9], bounds: [[-6.8, 0, -1.3], [-4.4, .3, 1.5]] } : k === 1 ? { cam: [.12, .6], bounds: [[-6.8, 0, -1.3], [-.9, 1.2, 1.5]] } : full });
})();
