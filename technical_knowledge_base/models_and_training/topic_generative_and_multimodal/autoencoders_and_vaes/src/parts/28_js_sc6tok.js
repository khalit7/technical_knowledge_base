// ---- Scene (section 10, Fig. 6): how many tokens a 512 x 512 image costs. Each plate covers the same image; its grid is one cell per latent
// position at downsampling factor f. The grids of the two measured tokenizers come from the page's own round trips (AVD.tok.m: Kandinsky 2.2's
// MoVQ at f = 8 and aMUSEd's VQGAN at f = 16, latent_shape and codebook K); f = 32 is (512 / 32)^2, derived. Token bars are to scale;
// attention pairs are tokens squared, derived. ----
(function () {
  if (!document.getElementById('stg-tok') || !window.AVK || !window.AVD) return;
  const { mix } = S3, { lab, seg, win, arcPts, f0 } = AVK, T = AVD.tok.m;
  const G = [{ f: 8, n: T.movq_fp32.latent_shape[1], K: T.movq_fp32.K, nm: 'MoVQ, f = 8' }, { f: 16, n: T.amused_fp32.latent_shape[1], K: T.amused_fp32.K, nm: 'aMUSEd VQGAN, f = 16' }, { f: 32, n: 512 / 32, K: null, nm: 'f = 32' }];
  const X = [-5.1, -1.7, 1.7, 5.1], S = 2.9, ZB = -2.2;
  function draw(R, k, e) {
    const P = R.P; R.grid(-7, 7, -2.4, 3.6, .5);
    // the image: three channels of 512 x 512 (grid drawn every 32 pixels)
    const ia = k === 0 ? 1 : .55;
    for (let c = 0; c < 3; c++) R.glass([X[0] - S / 2, .04 + c * .14, -S / 2], [S, 0, 0], [0, 0, S], { c: [P.bad, P.good, P.c1][c], a: ia * (k === 0 ? win(e, c * .2, c * .2 + .5) : 1), nu: 16, nv: 16, th: .02 });
    lab(R, [X[0], 0, S / 2], '512 × 512 × 3', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: 16, a: ia });
    if (k === 0) lab(R, [X[0], 0, S / 2], '786,432 numbers', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: 34, a: win(e, .5, 1) });
    // one latent grid per factor, appearing at its step
    G.forEach((g, i) => { const on = k === i + 1, a = k < i + 1 ? 0 : on ? win(e, 0, .6) : k === 4 ? .7 : .45; if (a <= .01) return;
      R.glass([X[i + 1] - S / 2, .04, -S / 2], [S, 0, 0], [0, 0, S], { c: P.acc, a, nu: g.n, nv: g.n, th: .03 });
      if (on) R.flow(arcPts(R, [X[0] + S / 2, .5, 0], [X[i + 1] - S / 2, .1, 0], .6 + .25 * i, 22), { c: P.acc, r: .07, a, speed: 1.5 });
      lab(R, [X[i + 1], .06, S / 2], g.n + ' × ' + g.n, { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: 16, a: Math.max(.5, a) });
      if (on) lab(R, [X[i + 1], 0, S / 2], g.nm, { fs: 12.5, b: 1, c: P.ink, dy: 34, a: win(e, .4, 1) }); });
    // the cost: tokens to scale, and attention pairs (tokens squared)
    if (k === 4) G.forEach((g, i) => { const n = g.n * g.n, h = 1.9 * n / 4096 * win(e, 0, .7) + .02;
      R.box([X[i + 1], 0, ZB], [.9, h, .5], { fill: mix(P.paper, P.acc, .7) });
      lab(R, [X[i + 1], h, ZB], f0(n) + ' tokens', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: -12, a: win(e, .7, 1) });
      lab(R, [X[i + 1], h, ZB], f0(n * n) + ' pairs', { mono: 1, fs: 12, c: P.ink, dy: -28, a: win(e, .7, 1) }); });
  }
  const full = { cam: [.1, .62], bounds: [[-6.7, 0, -2.6], [6.7, 1.9, 2.2]] };
  S3.stage({ id: 'stg-tok', list: 'sx-tok', fig: 'Fig. 6 · one 512 × 512 image at f = 8, 16, 32', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4600, draw, margin: AVK.margin,
    view: k => k === 0 ? { cam: [.1, .8], bounds: [[-6.8, 0, -1.6], [-1.6, .5, 1.6]] } : full });
})();
