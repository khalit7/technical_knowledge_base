// ---- Scene (section 7, Fig. 8): FLUX's rotary positions. Image tokens get ids (0, row, column) (pipeline_flux.py line 508), text tokens all
// zeros (line 387); each 128-wide head splits by axis as axes_dims_rope [16, 56, 56] (LD.arch flux1 config). A small 3 x 4 packed latent and
// three text tokens are drawn; one channel pair per axis is shown as a dial, at an illustrative frequency (the angle per row or column is not a
// value from the model). ----
(function () {
  if (!document.getElementById('stg-rope') || !window.LDK) return;
  const U = LDU, { mix } = S3, { tw, la, lab, win } = LDK, AX = U.byKey.flux1.config.axes_dims_rope, HEAD = U.byKey.flux1.config.attention_head_dim;
  const NR = 3, NC = 4, DX = 1.35, DZ = 1.15, gx = c => (c - (NC - 1) / 2) * DX, gz = r => -.4 + r * DZ, W = .62, ZT = -2.4, OM = .62;
  const PAIRS = [[[0, 0], [1, 2]], [[1, 1], [2, 3]]];
  function disc(R, c, r, col, a, ang) { if (a <= .01) return; const pts = []; for (let i = 0; i < 18; i++) { const t = i / 18 * 2 * Math.PI; pts.push([c[0] + r * Math.cos(t), c[1], c[2] + r * Math.sin(t)]); }
    R.quad(pts, { fill: mix(R.P.paper, col, .25), a, ec: col, lw: 1 });
    R.line([[c[0], c[1] + .005, c[2]], [c[0] + r * .95 * Math.cos(ang), c[1] + .005, c[2] - r * .95 * Math.sin(ang)]], { c: col, w: 2.4, a, dz: -.6 }); R.ball([c[0], c[1] + .01, c[2]], .03, { c: col, a, top: 1 }); }
  function draw(R, k, e, st) {
    const P = R.P, IC = P.c1, TC = P.c3, RC = P.c4, CC = P.c5; R.grid(-3.6, 3.6, -3.2, 2.6, .5);
    const ra = tw(st, e, q => q >= 1 ? 1 : 0), ca = tw(st, e, q => q >= 2 ? 1 : 0), hi = tw(st, e, q => q === 4 ? 1 : 0);
    const inPair = (r, c) => PAIRS.some(p => p.some(([a, b]) => a === r && b === c));
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) { const x = gx(c), z = gz(r), dim = 1 - .55 * hi * (inPair(r, c) ? 0 : 1);
      R.box([x, 0, z], [1.1, .14, .9], { fill: mix(P.paper, IC, .35 + .3 * hi * (inPair(r, c) ? 1 : 0)), a: dim * (k === 0 && st.pk === 0 ? win(e, (r * NC + c) / 12 * .6, (r * NC + c) / 12 * .6 + .3) : 1) });
      const tr = k === 1 && st.pk < 1 ? e : ra, tc = k === 2 && st.pk < 2 ? e : ca;
      disc(R, [x - .27, .15, z], .22, RC, ra * dim, r * OM * tr); disc(R, [x + .27, .15, z], .22, CC, ca * dim, c * OM * tc);
      lab(R, [x, .14, z + .45], '0, ' + r + ', ' + c, { mono: 1, fs: 12, b: 1, c: IC, dy: 14, wide: 1, a: la(st, e, q => q === 0 || q === 3 ? 1 : 0) }); }
    lab(R, [gx(0) - .6, .15, gz(0)], 'row', { fs: 12.5, b: 1, c: RC, al: 'right', dx: -6, a: la(st, e, q => q === 1 ? 1 : 0) });
    lab(R, [gx(NC - 1) + .6, .15, gz(0)], 'column', { fs: 12.5, b: 1, c: CC, al: 'left', dx: 6, a: la(st, e, q => q === 2 ? 1 : 0) });
    lab(R, [0, .15, gz(NR - 1) + .5], 'image tokens: ids (0, row, column)', { fs: 12.5, b: 1, c: IC, dy: 30, a: la(st, e, q => q === 0 ? 1 : 0) });
    // text tokens, all ids zero: their dials never turn
    const ta = tw(st, e, q => q === 3 ? 1 : q === 4 ? .3 : .15);
    for (let i = 0; i < 3; i++) { const x = (i - 1) * DX; R.box([x, 0, ZT], [1.1, .14, .7], { fill: mix(P.paper, TC, .45), a: ta });
      disc(R, [x - .27, .15, ZT], .2, RC, ta * (ra > .5 ? 1 : 0), 0); disc(R, [x + .27, .15, ZT], .2, CC, ta * (ca > .5 ? 1 : 0), 0); }
    lab(R, [0, .15, ZT - .35], 'text tokens: ids (0, 0, 0), never rotated', { fs: 12.5, b: 1, c: TC, dy: -16, a: la(st, e, q => q === 3 ? 1 : 0) });
    // two pairs with the same offset score alike
    if (hi > .01) PAIRS.forEach(([[r0, c0], [r1, c1]], j) => { const a = [gx(c0), .3, gz(r0)], b = [gx(c1), .3, gz(r1)];
      R.arc(a, b, .7, { c: P.acc, w: 1.6, a: hi }); if (k === 4) R.flowArc(a, b, .7, { c: P.acc, r: .06, n: 6, speed: 1.1, a: hi });
      lab(R, [(a[0] + b[0]) / 2, 1.0, (a[2] + b[2]) / 2], 'offset (' + (r1 - r0) + ', ' + (c1 - c0) + ')', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: -6, a: la(st, e, q => q === 4 ? 1 : 0) }); });
    // one head's 128 channels by axis
    const ha = tw(st, e, q => q === 4 ? 1 : 0);
    if (ha > .01) { let x = -3.2; const L = 6.4 / HEAD; AX.forEach((d, i) => { const col = [P.mute, RC, CC][i];
      R.box([x + d * L / 2, 0, 2.85], [d * L - .05, .12, .3], { fill: mix(P.paper, col, .6), a: ha });
      lab(R, [x + d * L / 2, .12, 2.85], d + ' ' + ['time', 'row', 'column'][i], { mono: 1, fs: 12, b: 1, c: col, dy: 16, a: la(st, e, q => q === 4 ? 1 : 0) }); x += d * L; }); }
  }
  const full = { cam: [.12, .78], bounds: [[-3.4, 0, -2.9], [3.4, .9, 3.1]] };
  S3.stage({ id: 'stg-rope', list: 'sx-rope', fig: 'Fig. 8 · FLUX position ids and rotary angles', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1500, hold: 4800, draw, margin: LDK.margin,
    view: k => k >= 1 && k <= 2 ? { cam: [.12, .95], bounds: [[-3.2, 0, -1.2], [3.2, .4, 2.3]] } : full });
})();
