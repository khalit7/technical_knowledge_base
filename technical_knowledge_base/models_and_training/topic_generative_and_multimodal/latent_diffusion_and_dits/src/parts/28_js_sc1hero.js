// ---- Scene (top of page, Fig. 1): one image from Stable Diffusion 1.5 at the topic's settings. The prompt is encoded once by CLIP (123.1M
// parameters, root src/data/README.md), the U-Net (parameters and FLOPs per pass counted from its config: LD.arch, LD.flops) runs 25 steps x 2
// guided passes on the 64 x 64 x 4 latent, the VAE decoder (83.7M) runs once. Times are the topic's diffusion runs on the M1 Pro (0.610 s per
// guided step, 0.488 s per decode), drawn as columns to scale. Sizes of the latent and the image are not to scale here (Fig. 2 draws them so). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.LDK) return;
  const U = LDU, { mix } = S3, { tw, la, lab, seg, arcPts, plates, wall, f1, win } = LDK;
  const unetP = U.byKey.sd15.params, fl = U.grid('sd15', 512)[2], STEPS = 25, PASSES = 2, STEP_S = 0.610, DEC_S = 0.488, DEN_S = STEPS * STEP_S;
  const X = { tok: -6.3, enc: -4.7, vec: -3.1, lat: 0, dec: 3.3, img: 5.6 }, NT = 13;
  function draw(R, k, e, st) {
    const P = R.P, TX = P.c3, IMG = P.c1; R.grid(-7.5, 7.2, -3.2, 2.6, .5);
    // 1. the prompt: 13 real positions of the running example's first prompt (start, 11 word pieces, end), then 64 padding positions, faint
    const ta = tw(st, e, s => s === 0 ? 1 : .3);
    for (let i = 0; i < NT; i++) R.box([X.tok, 0, -1.5 + i * .25], [.36, .14, .18], { fill: i === 0 ? mix(P.paper, P.c2, .55) : mix(P.paper, TX, .5), a: ta * (k === 0 && st.pk === 0 ? win(e, i / NT * .5, i / NT * .5 + .3) : 1), shadow: false });
    for (let i = 0; i < 6; i++) R.box([X.tok, 0, 1.75 + i * .2], [.36, .06, .14], { fill: P.paper, a: ta * .35, shadow: false });
    lab(R, [X.tok, 0, 2.85], 'prompt · 77 tokens', { fs: 12.5, b: 1, c: TX, dy: 16, a: la(st, e, s => s === 0 ? 1 : 0) });
    // the text encoder, once per prompt
    for (let i = 0; i < 3; i++) R.glass([X.enc - .6, .05, -.5 + i * .45], [1.2, 0, 0], [0, 1.0, 0], { c: TX, a: ta * .9, nu: 6, nv: 4, th: .03 });
    lab(R, [X.enc, 1.1, -.5], 'CLIP text encoder · 123.1M', { fs: 12.5, b: 1, c: TX, dy: -12, a: la(st, e, s => s === 0 ? 1 : 0) });
    lab(R, [X.enc, 1.1, -.5], 'once per prompt', { fs: 12, c: P.mute, dy: -28, a: la(st, e, s => s === 0 ? 1 : 0) });
    if (k === 0) R.flow(seg([X.tok + .25, .1, 0], [X.vec - .6, .1, 0], 12), { c: TX, r: .07, a: e, speed: 1.3 });
    // its output: 77 vectors of 768, read by every denoiser pass
    const va = tw(st, e, s => s === 0 ? 1 : s === 2 ? .9 : .35);
    plates(R, X.vec, 0, .9, 2.8, 1, TX, va * (k === 0 && st.pk === 0 ? win(e, .4, .9) : 1), { nu: 6, nv: 14, th: .03 });
    lab(R, [X.vec, .05, 1.5], '77 × 768 text vectors', { mono: 1, fs: 12, c: TX, dy: 16, a: la(st, e, s => s === 0 || s === 2 ? 1 : 0) });
    // 2. the latent: 4 channels of 64 x 64, noise at the start
    const lt = tw(st, e, s => s < 1 ? .12 : s === 4 ? .5 : 1);
    plates(R, X.lat, 0, 1.7, 1.7, 4, IMG, lt, { nu: 8, gap: .08 });
    lab(R, [X.lat, .05, .95], '64 × 64 × 4 latent', { mono: 1, fs: 12.5, b: 1, c: IMG, dy: 16, a: la(st, e, s => s >= 1 && s <= 3 ? 1 : 0) });
    lab(R, [X.lat, .05, .95], '16,384 numbers', { mono: 1, fs: 12, c: P.mute, dy: 32, a: la(st, e, s => s === 1 ? 1 : 0) });
    // 3. the U-Net above it, 50 passes: the latent goes up into the denoiser and comes back, step after step
    const ua = tw(st, e, s => s < 2 ? 0 : s === 2 ? 1 : .45);
    if (ua > .01) { R.box([X.lat, .85, 0], [1.9, .9, 1.5], { fill: mix(P.paper, P.acc, .3), a: ua, fa: .55, shadow: false });
      plates(R, X.lat, 0, 1.3, 1.1, 3, P.acc, ua * .8, { y0: .95, gap: .3, nu: 4 }); }
    if (k === 2) { R.flow(arcPts(R, [X.lat - .55, .4, .3], [X.lat - .55, .95, .3], .0, 8).concat(arcPts(R, [X.lat - .55, 1.7, .3], [X.lat + .55, 1.7, .3], .45, 14)).concat(seg([X.lat + .55, .95, .3], [X.lat + .55, .4, .3], 6)), { c: P.acc, r: .07, speed: 1.6, n: 9 });
      R.flow(arcPts(R, [X.vec + .4, .1, 0], [X.lat - .95, 1.2, 0], .6, 18), { c: TX, r: .06, a: .8, speed: 1.3 }); }
    const pass = k === 2 ? Math.max(1, Math.round(50 * e)) : 50;
    lab(R, [X.lat, 1.75, -.75], 'U-Net denoiser', { fs: 13, b: 1, c: P.acc, dy: -34, a: la(st, e, s => s === 2 ? 1 : 0) });
    lab(R, [X.lat, 1.75, -.75], 'pass ' + pass + ' of ' + (STEPS * PASSES) + ' · ' + STEPS + ' steps × ' + PASSES, { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: -16, a: la(st, e, s => s === 2 ? 1 : 0) });
    lab(R, [X.lat + 1, .9, 0], U.M(unetP) + ' · ' + f1(fl / 1e12, 2) + ' TFLOP a pass', { mono: 1, fs: 12, c: P.mute, al: 'left', dx: 10, a: la(st, e, s => s === 2 ? 1 : 0) });
    // 4. the VAE decoder, once, and the image
    const da = tw(st, e, s => s < 3 ? 0 : s === 3 ? 1 : .5);
    for (let i = 0; i < 3; i++) R.glass([X.dec - .6, .05, -.5 + i * .45], [1.2, 0, 0], [0, .9, 0], { c: P.c4, a: da * .9, nu: 4, nv: 4, th: .03 });
    lab(R, [X.dec, 1.0, -.5], 'VAE decoder · 83.7M', { fs: 12.5, b: 1, c: P.c4, dy: -12, a: la(st, e, s => s === 3 ? 1 : 0) });
    lab(R, [X.dec, 1.0, -.5], 'once · ' + DEC_S + ' s', { fs: 12, c: P.mute, dy: -28, a: la(st, e, s => s === 3 ? 1 : 0) });
    [P.bad, P.good, P.c1].forEach((c, i) => R.glass([X.img - 1, .05 + i * .12, -1], [2, 0, 0], [0, 0, 2], { c, a: da * (k === 3 && st.pk < 3 ? win(e, .4 + i * .15, .7 + i * .1) : 1), nu: 8, nv: 8, th: .02 }));
    lab(R, [X.img, .05, 1.05], '512 × 512 × 3 image', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: 16, a: la(st, e, s => s === 3 ? 1 : 0) });
    if (k === 3) R.flow(arcPts(R, [X.lat + .9, .3, 0], [X.img - 1, .3, 0], .7, 22), { c: P.c4, r: .07, a: e, speed: 1.5 });
    // 5. where the time goes: columns to scale, 25 x 0.610 s of denoising against one 0.488 s decode
    const ca = tw(st, e, s => s === 4 ? 1 : 0);
    if (ca > .01) { const H = 2.4, g = k === 4 ? win(e, 0, .8) : 1, ZC = -2.4;
      R.box([X.lat, 0, ZC], [1.1, H * g, .7], { fill: mix(P.paper, P.acc, .75), a: ca });
      R.box([X.dec, 0, ZC], [1.1, Math.max(.02, H * DEC_S / DEN_S * g), .7], { fill: mix(P.paper, P.c4, .75), a: ca });
      lab(R, [X.lat, H * g, ZC], 'denoising ' + STEPS + ' × ' + STEP_S.toFixed(3) + ' s = ' + f1(DEN_S) + ' s', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: -12, a: la(st, e, s => s === 4 ? 1 : 0) * win(e, .5, 1) });
      lab(R, [X.dec, .1, ZC], 'decode ' + DEC_S + ' s', { mono: 1, fs: 12.5, b: 1, c: P.c4, dy: -16, a: la(st, e, s => s === 4 ? 1 : 0) * win(e, .5, 1) }); }
  }
  const full = { cam: [.18, .62], bounds: [[-6.8, 0, -2.9], [6.7, 1.9, 2.4]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one image from SD 1.5', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 4600, draw, margin: LDK.margin,
    view: k => k === 0 ? { cam: [.3, .55], bounds: [[-6.9, 0, -1.9], [-2.4, 1.3, 2.9]] } : k === 1 ? { cam: [.2, .62], bounds: [[-3.8, 0, -1.6], [1.6, 1.0, 1.9]] } : k === 2 ? { cam: [.2, .5], bounds: [[-3.8, 0, -1.7], [2.6, 1.9, 1.8]] } : full });
})();
