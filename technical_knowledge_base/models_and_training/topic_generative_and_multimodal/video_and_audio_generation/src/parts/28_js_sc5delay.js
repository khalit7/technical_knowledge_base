// ---- Scene (section 8, Fig. 5): in what order a codec language model emits 4 codebooks (MusicGen's setting, 50 frames a second). A grid of
// 6 frames by 4 codebook levels; each token is a column whose height is the step at which it is generated, filled in order during the step:
// flatten (t * 4 + k), parallel (t), delay (t + k). The flows show what a token can see of its own frame when it is generated. ----
(function () {
  if (!document.getElementById('stg-delay') || !window.VAK) return;
  const { mix } = S3, { tw, la, lab, seg, win } = VAK;
  const NFR = 6, NK = 4, X = t => -2.5 + t * 1.0, Z = k => 1.3 - k * .85, BW = .62, BD = .5, hs = s => .1 + .085 * s;
  const ORD = [null, (t, k) => t * NK + k + 1, (t, k) => t + 1, (t, k) => t + k + 1], MAXS = [0, NFR * NK, NFR, NFR + NK - 1];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 3.6, -2.2, 2.2, .4);
    const lev = [P.c1, P.c4, P.c3, P.c5];
    for (let kk = 0; kk < NK; kk++) {
      lab(R, [X(0) - .5, 0, Z(kk)], 'codebook ' + (kk + 1) + (kk === 0 ? ' (coarse)' : kk === NK - 1 ? ' (fine)' : ''), { fs: 12.5, b: 1, c: lev[kk], al: 'right', dx: -4 });
      for (let t = 0; t < NFR; t++) { const x = X(t), z = Z(kk);
        R.quad([[x - BW / 2, .005, z - BD / 2], [x + BW / 2, .005, z - BD / 2], [x + BW / 2, .005, z + BD / 2], [x - BW / 2, .005, z + BD / 2]], { ec: P.mute, ea: .5, dash: [4, 3], lw: 1 });
        if (!k) continue;
        const s = ORD[k](t, kk), M = MAXS[k], fresh = st.pk !== k, g = fresh ? win(e * 1.08, (s - 1) / M, s / M) : 1;
        if (g <= .01) continue;
        const h = hs(s) * g;
        R.box([x, 0, z], [BW, h, BD], { fill: mix(P.paper, lev[kk], .7), a: Math.min(1, g * 1.5), shadow: false });
        lab(R, [x, h, z], String(s), { fs: 12, b: 1, mono: 1, c: P.ink, dy: -9, a: g > .9 ? 1 : 0 });
      }
    }
    for (let t = 0; t < NFR; t++) lab(R, [X(t), 0, Z(0) + BD / 2], 'frame ' + (t + 1), { fs: 12, c: P.mute, dy: 14 });
    // what the token sees of its own frame: the earlier codebooks (flatten, delay); nothing (parallel)
    const T = 2;
    if (k === 1 || k === 3) for (let kk = 0; kk < NK - 1; kk++) { const s0 = ORD[k](T, kk), s1 = ORD[k](T, kk + 1);
      R.flow(seg([X(T), hs(s0) + .05, Z(kk)], [X(T), hs(s1) + .05, Z(kk + 1)], 8), { c: P.c2, r: .06, n: 4, speed: .6, a: e }); }
    const tot = { 1: '24 steps for 6 frames · 200 a second', 2: '6 steps · 50 a second · levels independent', 3: '9 steps (6 + 3) · about 50 a second' };
    [1, 2, 3].forEach(q => lab(R, [0, 0, Z(0) + .75], tot[q], { fs: 13, b: 1, mono: 1, c: P.ink, dy: 42, a: la(st, e, z => z === q ? 1 : 0) }));
    lab(R, [0, 0, Z(0) + .75], "height = the step at which a token is generated", { fs: 12.5, c: P.mute, dy: 42, a: la(st, e, z => z === 0 ? 1 : 0) });
  }
  const full = { cam: [-.38, .55], bounds: [[-3.4, 0, -1.8], [3.0, 1.4, 2.4]] };
  S3.stage({ id: 'stg-delay', list: 'sx-delay', fig: 'Fig. 5 · three orders for 4 codebooks', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 2600, hold: 5200, draw, margin: VAK.margin,
    view: k => k === 1 ? { cam: [-.38, .45], bounds: [[-3.4, 0, -1.8], [3.0, 2.3, 2.4]] } : full });
})();
