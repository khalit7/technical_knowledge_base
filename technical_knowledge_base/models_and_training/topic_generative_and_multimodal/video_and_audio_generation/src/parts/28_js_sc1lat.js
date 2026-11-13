// ---- Scene (section 1, Fig. 1): Wan 2.1's default clip to space-time tokens. 81 frames of 480 x 832 as upright plates along time, the causal VAE's
// grouping (frame 0 alone, then 4 frames per latent frame), the 8 x 8 spatial shrink, 1 x 2 x 2 patches, then the token counts of three compressors as
// columns to scale. Every count from VAU.calc on the Wan 2.1 1.3B preset (config and pipeline defaults) and the same formula for an image VAE per frame
// and LTX-Video's VAE; the moving disc and the plate sizes after step 2 are illustrative (said in the steps). ----
(function () {
  if (!document.getElementById('stg-lat') || !window.VAK) return;
  const U = VAU, { mix, lerp } = S3, { tw, la, lab, seg, arcPts, win, frame, int } = VAK;
  const m = U.mById.wan13, c = U.calc(m), F = m.F, ct = m.ct, LF = c.lf;
  // the same clip through an image VAE per frame (8 x 8, no time axis) and LTX-Video's 32 x 32 x 8 VAE with 1 x 1 patches
  const img = { N: F * (m.H / 8 / 2) * (m.W / 8 / 2) }, lx = U.mById.ltx, ltx = { N: (1 + (F - 1) / lx.ct) * (m.H / lx.cs) * (m.W / lx.cs) };
  const X0 = -2.6, DX = .06, PW = 2.6, PH = 1.5, LW = 1.04, LH = .6;
  const gOf = f => f === 0 ? 0 : 1 + Math.floor((f - 1) / ct);
  const xF = f => X0 + f * DX, xG = g => g === 0 ? X0 : X0 + (4 * g - 1.5) * DX;
  const disc = f => [.35 + .8 * f / (F - 1), -.95 + 1.9 * f / (F - 1)];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 3.6, -2.2, 2.6, .4);
    const gc = g => g === 0 ? P.c4 : (g % 2 ? P.c1 : P.c2);
    // 1. the 81 frames (fade out while they merge into latent frames)
    const fa = tw(st, e, q => q === 0 ? 1 : 0), grp = tw(st, e, q => q >= 1 ? 1 : 0);
    if (fa > .01) for (let f = 0; f < F; f++) {
      const g = gOf(f), x = lerp(xF(f), xG(g), k === 1 ? win(e, .35, 1) : 0), col = grp > .01 ? mix(P.c1, gc(g), Math.min(1, grp * 2)) : P.c1;
      R.quad([[x, .05, PW / 2], [x, .05, -PW / 2], [x, .05 + PH, -PW / 2], [x, .05 + PH, PW / 2]], { fill: mix(P.paper, col, .35), fa: .05, ec: col, ea: .5, lw: .8, a: fa });
      const d = disc(f); R.ball([x, .05 + d[0] * PH / 1.2, d[1]], .045, { c: P.ink, a: fa * .8 });
    }
    lab(R, [xF(0), .05 + PH, PW / 2], '81 frames · 480 × 832 · 97 million numbers', { fs: 12.5, b: 1, c: P.ink, al: 'left', dy: -14, a: la(st, e, q => q === 0 ? 1 : 0) });
    lab(R, [xF(F - 1), .05, PW / 2], 'time →', { fs: 12.5, c: P.mute, al: 'left', dx: 8, a: la(st, e, q => q === 0 ? 1 : 0) });
    // 2. 21 latent frames: full size while grouping, then shrunk (step 3), gridded into 2 x 2 patches (step 4), receding (step 5)
    const ga = tw(st, e, q => q === 0 ? 0 : q === 4 ? .06 : 1) * (k === 1 && st.pk === 0 ? win(e, .55, 1) : 1);
    const sh = tw(st, e, q => q >= 2 ? 1 : 0), pg = tw(st, e, q => q >= 3 ? 1 : 0);
    if (ga > .01) for (let g = 0; g < LF; g++) {
      const w = lerp(PW, LW, sh), h = lerp(PH, LH, sh), x = xG(g), hot = g === 0 && k >= 3;
      R.glass([x, .05, w / 2], [0, 0, -w], [0, h, 0], { c: gc(g), a: ga * (hot ? 1 : .85), nu: pg > .5 ? c.tw : 1, nv: pg > .5 ? c.th : 1, th: lerp(.015, .05, sh) });
    }
    lab(R, [xG(0), .05 + lerp(PH, LH, sh), lerp(PW, LW, sh) / 2], 'frame 0 alone', { fs: 12.5, b: 1, c: P.c4, al: 'right', dx: -6, dy: -10, a: la(st, e, q => q === 1 || q === 2 ? 1 : 0) });
    lab(R, [xG(LF - 1), .05 + lerp(PH, LH, sh), -lerp(PW, LW, sh) / 2], LF + ' latent frames = 1 + 80 / ' + ct, { fs: 12.5, b: 1, mono: 1, c: P.ink, al: 'left', dx: 8, a: la(st, e, q => q === 1 ? 1 : 0) });
    lab(R, [xG(LF - 1), .05 + LH, -LW / 2], LF + ' × ' + c.lh + ' × ' + c.lw + ' × 16 latent', { fs: 12.5, b: 1, mono: 1, c: P.ink, al: 'left', dx: 8, a: la(st, e, q => q === 2 ? 1 : 0) });
    // 4. one token: a 2 x 2 patch of latent cells on the first latent frame, streaming into the sequence
    if (pg > .01 && k <= 3) {
      const cz = LW / c.tw, cy = LH / c.th, p0 = [xG(0) - .03, .05 + LH - 3.5 * cy, LW / 2 - 6.5 * cz];
      R.box([p0[0] - .04, p0[1] - cy / 2, p0[2]], [.08, cy, cz], { fill: P.c2, a: pg, shadow: false });
      R.glow([p0[0] - .05, p0[1], p0[2]], .12, { c: P.c2, a: pg * .7 });
      lab(R, [xG(0), .05 + LH, LW / 2], c.th + ' × ' + c.tw + ' = ' + int(c.s) + ' tokens a latent frame', { fs: 12.5, b: 1, mono: 1, c: P.c2, al: 'right', dx: -6, dy: -14, a: la(st, e, q => q === 3 ? 1 : 0) });
    }
    // 5. the sequence: tokens of three compressors, columns to scale
    const ca = la(st, e, q => q === 4 ? 1 : 0);
    if (ca > .01) {
      const H = 2.3, cols = [[-1.7, img.N, 'image VAE per frame', P.c5], [0, c.N, 'Wan 2.1 video VAE', P.c1], [1.7, ltx.N, 'LTX-Video VAE', P.c3]];
      cols.forEach(([x, n, nm, col], i) => {
        const h = Math.max(.02, H * n / img.N * (k === 4 && st.pk < 4 ? win(e, .1 + .15 * i, .7 + .1 * i) : 1)), z = 1.55;
        R.box([x, 0, z], [.75, h, .75], { fill: mix(P.paper, col, .75), a: ca });
        lab(R, [x, h, z], int(n) + ' tokens', { fs: 13, b: 1, mono: 1, c: col, dy: -14, a: la(st, e, q => q === 4 ? 1 : 0) });
        lab(R, [x, 0, z + .4], nm, { fs: 12.5, c: P.ink, dy: 14, a: la(st, e, q => q === 4 ? 1 : 0) });
      });
      if (k === 4) R.flow(arcPts(R, [xG(10), .4, 0], [0, .7, 1.55], .5, 20), { c: P.c1, r: .07, a: ca, speed: 1.3 });
    }
  }
  const full = { cam: [-.68, .42], bounds: [[-3, 0, -1.4], [2.4, 1.7, 1.4]] };
  S3.stage({ id: 'stg-lat', list: 'sx-lat', fig: 'Fig. 1 · one clip, from frames to tokens', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1600, hold: 4800, draw, margin: VAK.margin,
    view: k => k <= 1 ? full : k === 2 ? { cam: [-.7, .38], bounds: [[-2.9, 0, -.7], [2.2, .8, .7]] } : k === 3 ? { cam: [-.85, .3], bounds: [[-2.75, 0, -.6], [-1.6, .7, .6]] } : { cam: [-.45, .42], bounds: [[-2.9, 0, -.8], [2.6, 2.4, 2.1]] } });
})();
