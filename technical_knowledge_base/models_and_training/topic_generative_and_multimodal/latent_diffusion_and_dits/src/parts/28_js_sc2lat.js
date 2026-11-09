// ---- Scene (section 1, Fig. 2): a 512 x 512 x 3 image and its 64 x 64 x 4 SD latent drawn to scale (one world unit = 128 pixels), then one SD 1.5
// U-Net pass on each as columns to scale. FLOPs from the page's counted formula (LD.flops.sd15: exact quadratic in the top-level positions N,
// 77 text tokens); the darker part of a column is the formula's N^2 term (attention scores). ----
(function () {
  if (!document.getElementById('stg-lat') || !window.LDK) return;
  const U = LDU, { mix } = S3, { tw, la, lab, arcPts, win, f1 } = LDK;
  const T = U.L.flops.sd15.T, k3 = U.L.flops.sd15.fit[3];
  const C = [{ N: 512 * 512, nm: 'pixels' }, { N: 64 * 64, nm: 'latent' }].map(c => ({ ...c, f: U.flops('sd15', c.N, T), q: k3 * c.N * c.N }));
  const S = 4, s = S / 8, XI = -2.6, XL = 1.7, ZC = -3.2, H = 3.2;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6, 4.6, -4.2, 2.6, .5);
    // 1. the image: three colour planes, grid every 32 pixels
    const ia = tw(st, e, q => q <= 1 ? 1 : .35);
    [P.bad, P.good, P.c1].forEach((c, i) => R.glass([XI - S / 2, .05 + i * .24, -S / 2], [S, 0, 0], [0, 0, S], { c, a: ia * .8 * (k === 0 && st.pk === 0 ? win(e, i * .2, i * .2 + .5) : 1), nu: 16, nv: 16, th: .02 }));
    lab(R, [XI, .05, S / 2], '512 × 512 × 3 = 786,432 numbers', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: 18, a: la(st, e, q => q <= 1 ? 1 : 0) });
    // 2. the latent, to scale: an eighth of the side, four channels
    const lt = tw(st, e, q => q < 1 ? 0 : 1);
    for (let i = 0; i < 4; i++) R.glass([XL - s / 2, .05 + i * .1, -s / 2], [s, 0, 0], [0, 0, s], { c: P.acc, a: lt * (k === 1 && st.pk < 1 ? win(e, .35 + i * .12, .6 + i * .1) : 1), nu: 8, nv: 8, th: .02 });
    if (k === 1) R.flow(arcPts(R, [XI + S / 2 - .3, .5, 0], [XL - s / 2, .3, 0], .9, 22), { c: P.acc, r: .07, a: e, speed: 1.4 });
    lab(R, [XL, .05, s / 2], '64 × 64 × 4 = 16,384 numbers', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: 18, a: la(st, e, q => q === 1 ? 1 : 0) });
    lab(R, [XL, .45, 0], 'latent', { fs: 12.5, b: 1, c: P.acc, dy: -14, a: la(st, e, q => q >= 2 ? 1 : 0) });
    lab(R, [XI, .45, -S / 2], 'pixels', { fs: 12.5, b: 1, c: P.ink, dy: -14, a: la(st, e, q => q >= 2 ? 1 : 0) });
    // 3. one U-Net pass on each, columns to scale; 4. the N^2 part of each column
    const ca = tw(st, e, q => q >= 2 ? 1 : 0);
    if (ca > .01) {
      const g = k === 2 && st.pk < 2 ? win(e, 0, .8) : 1, sp = tw(st, e, q => q >= 3 ? 1 : 0);
      C.forEach((c, i) => { const x = i ? XL : XI, h = Math.max(.02, H * c.f / C[0].f * g), hq = h * c.q / c.f, col = i ? P.acc : P.c2;
        R.box([x, 0, ZC], [.9, h, .9], { fill: mix(P.paper, col, .7), a: ca * (1 - .6 * sp) });
        if (sp > .01) R.box([x, 0, ZC], [.92, Math.max(.02, hq), .92], { fill: mix(P.paper, P.c4, .8), a: ca * sp });
        lab(R, [x, h, ZC], f1(c.f / 1e12, c.f > 1e13 ? 0 : 2) + ' TFLOP a pass', { mono: 1, fs: 12.5, b: 1, c: col, dy: -14, a: la(st, e, q => q >= 2 ? 1 : 0) * (k === 2 ? win(e, .5, 1) : 1) });
        lab(R, [x + .5, i ? .02 : hq * .5, ZC + .45], Math.round(100 * c.q / c.f) + '% N²', { mono: 1, fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 8, dy: i ? -2 : 0, a: la(st, e, q => q >= 3 ? 1 : 0) }); });
      lab(R, [(XI + XL) / 2, H * .55, ZC], C[0].f / C[1].f > 100 ? Math.round(C[0].f / C[1].f) + ' times' : '', { mono: 1, fs: 13, b: 1, c: P.ink, a: la(st, e, q => q === 2 ? 1 : 0) * (k === 2 ? win(e, .6, 1) : 1) });
    }
  }
  const full = { cam: [.22, .6], bounds: [[-4.8, 0, -3.8], [3.4, 2.4, 2.2]] };
  S3.stage({ id: 'stg-lat', list: 'sx-lat', fig: 'Fig. 2 · one image, pixels against latent, to scale', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 4600, draw, margin: LDK.margin,
    view: k => k <= 1 ? { cam: [.22, .78], bounds: [[-4.8, 0, -2.2], [3.6, .7, 2.3]] } : k === 2 ? { cam: [.22, .45], bounds: [[-4.8, 0, -3.8], [3.4, 3.4, 2.2]] } : { cam: [.22, .45], bounds: [[-4.8, 0, -3.8], [3.4, 3.4, 2.2]] } });
})();
