// ---- Scene (section 3, Fig. 3): where each condition enters a video denoiser. Wan 2.1 1.3B's default clip as its 21 noisy latent frames
// (VAU.calc), its 512 umT5 text tokens (one box per 16) reaching every frame through cross-attention, a first frame encoded alone into latent
// frame 0, and an audio latent stream aligned in time (LTX-2's design; one audio segment per latent frame is illustrative, said in the step). ----
(function () {
  if (!document.getElementById('stg-cond') || !window.VAK) return;
  const U = VAU, { mix } = S3, { tw, la, lab, seg, arcPts, win, int } = VAK;
  const m = U.mById.wan13, c = U.calc(m), LF = c.lf, NT = 512, TB = NT / 16;
  const W = 1.3, H = .75, Y0 = .3, X = g => -2.6 + g * 5.2 / (LF - 1), ZT = -1.9, YT = 1.55, ZA = 1.45;
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const NOISE = []; for (let g = 0; g < LF; g++) for (let i = 0; i < 9; i++) NOISE.push([g, Y0 + .06 + rnd() * (H - .12), -W / 2 + .08 + rnd() * (W - .16)]);
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 3.6, -2.6, 2.4, .4);
    const clean0 = tw(st, e, q => q >= 2 ? 1 : 0);
    // the noisy video latent: 21 frames; frame 0 turns clean when a first frame is given
    for (let g = 0; g < LF; g++) {
      const col = g === 0 ? mix(P.c1, P.c4, clean0) : P.c1;
      R.glass([X(g), Y0, W / 2], [0, 0, -W], [0, H, 0], { c: col, a: g === 0 ? .7 + .3 * clean0 : .7, nu: 4, nv: 3, th: .03 });
    }
    NOISE.forEach(([g, y, z]) => { const a = g === 0 ? 1 - clean0 : 1; if (a > .02) R.ball([X(g) - .03, y, z], .025, { c: P.mute, a: .8 * a }); });
    lab(R, [X(LF - 1), Y0 + H, -W / 2], LF + ' noisy latent frames · ' + int(c.N) + ' tokens', { fs: 12.5, b: 1, mono: 1, c: P.c1, al: 'left', dx: 8, a: la(st, e, q => q === 0 ? 1 : 0) });
    // text: 512 umT5 tokens, read by every block's cross-attention
    const ta = tw(st, e, q => q === 0 ? 0 : q === 1 ? 1 : .35);
    if (ta > .01) {
      for (let i = 0; i < TB; i++) R.box([-2.6 + (i + .5) * 5.2 / TB, YT, ZT], [5.2 / TB * .8, .16, .22], { fill: mix(P.paper, P.c5, .6), a: ta, shadow: false });
      lab(R, [-2.6, YT + .16, ZT], NT + ' umT5 text tokens', { fs: 12.5, b: 1, mono: 1, c: P.c5, al: 'right', dx: -8, a: la(st, e, q => q === 1 ? 1 : 0) });
      if (k === 1) [1, 5, 9, 13, 17].forEach((g, i) => R.flowArc([-2.6 + (4 + i * 6 + .5) * 5.2 / TB, YT, ZT], [X(g), Y0 + H * .8, -W / 4], .35, { c: P.c5, r: .06, n: 9, speed: 1.2, a: e }));
      lab(R, [0, YT, ZT], 'cross-attention in every block', { fs: 12.5, c: P.ink, dy: -18, a: la(st, e, q => q === 1 ? 1 : 0) });
    }
    // a first frame: encoded alone by the causal VAE into latent frame 0
    const ia = tw(st, e, q => q === 2 ? 1 : q === 3 ? .35 : 0);
    if (ia > .01) { const xi = -4.0, wi = 1.6, hi = .92, zi = .2;
      R.glass([xi - wi / 2, .15, zi], [wi, 0, 0], [0, hi, 0], { c: P.c4, a: ia, nu: 8, nv: 5, th: .02 });
      lab(R, [xi, .15 + hi, zi], 'first frame, 480 × 832', { fs: 12.5, b: 1, c: P.c4, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) });
      if (k === 2) R.flow(arcPts(R, [xi + wi / 2, .6, zi], [X(0) - .05, Y0 + H / 2, 0], .3, 18), { c: P.c4, r: .08, a: e, speed: 1.2 });
      lab(R, [(xi + wi / 2 + X(0)) / 2, .2, zi], 'VAE, frame alone', { fs: 12.5, c: P.ink, dy: 16, a: la(st, e, q => q === 2 ? 1 : 0) });
    }
    // sound: a second latent stream on its own time positions, each segment meeting its own frames
    const aa = tw(st, e, q => q === 3 ? 1 : 0);
    if (aa > .01) {
      for (let g = 0; g < LF; g++) { const h = .1 + .16 * Math.abs(Math.sin(g * 1.7 + .4));
        R.box([X(g), 0, ZA], [.18, h * (k === 3 && st.pk < 3 ? win(e, g / LF * .6, g / LF * .6 + .3) : 1), .3], { fill: mix(P.paper, P.c3, .7), a: aa });
        if (k === 3 && g % 2 === 0) R.flow(seg([X(g), .2, ZA - .1], [X(g) - .02, Y0 + .1, W / 2 - .05], 8), { c: P.c3, r: .05, n: 4, speed: .7, a: e }); }
      lab(R, [X(0) - .15, .1, ZA], 'audio latent, aligned in time', { fs: 12.5, b: 1, c: P.c3, al: 'right', dx: -8, a: la(st, e, q => q === 3 ? 1 : 0) });
    }
  }
  const full = { cam: [-.5, .4], bounds: [[-4.4, 0, -2.2], [3.2, 1.9, 1.9]] };
  S3.stage({ id: 'stg-cond', list: 'sx-cond', fig: 'Fig. 3 · where text, a first frame and sound enter', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 5200, draw, margin: VAK.margin });
})();
