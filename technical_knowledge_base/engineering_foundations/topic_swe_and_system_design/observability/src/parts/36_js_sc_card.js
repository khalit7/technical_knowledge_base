// ---- Scene: Fig. 3, cardinality (stg-card). One latency histogram with the calculator's defaults below it (10 buckets, 5 routes, 4 status
// codes, 10 instances), one cube per time series, multiplied one label at a time; then a 100-value label and a 10,000-value label.
// The counts, samples per second and disk per day use the calculator's own formula (window.OBS_CARD, also used by the step-list check):
// series = (buckets + 2) x routes x status codes x instances x extra; samples/s = series / 15; disk/day = samples x 86,400 x 1.5 bytes. ----
window.OBS_CARD = { B: 10, R: 5, S: 4, I: 10, series: (x) => (10 + 2) * 5 * 4 * 10 * (x || 1), sps: s => s / 15, gbDay: s => s / 15 * 86400 * 1.5 / 1e9 };
(function () {
  if (!document.getElementById('stg-card') || !window.OBS3) return;
  const { mix } = S3, { lab, win, fmt } = OBS3, C = OBS_CARD, NB = C.B + 2;
  const U = .2, CU = .16, BW = NB * U, BH = C.S * U, BD = C.R * U;                 // one cube per series; a block of 240 is 12 x 4 x 5 cubes
  const SET = [[-1.35, -2.6], [1.35, -2.6], [-1.35, -1.3], [1.35, -1.3], [-1.35, 0], [1.35, 0], [-1.35, 1.3], [1.35, 1.3], [-1.35, 2.6], [1.35, 2.6]]; // ten instances, 2 x 5
  const O = SET[0]; // the first instance's block is built cube by cube where it will stand
  const SX = 5.4, SZ = 6.5, PX = 6.2, PZ = 7.3;                                     // one instance set's footprint, and its pitch in the 10 x 10 field
  const disk = s => { const g = C.gbDay(s); return g < 1 ? fmt(g * 1000, 1) + ' MB' : fmt(g, g < 10 ? 2 : 1) + ' GB'; };
  // two lines under the field: the count, then its samples and disk
  // (steps 5 and 6 hang them under the field's nearest corner, so they sit on the floor and not over the cells)
  const say = (R, p, s, head, c, a, al) => { lab(R, p, (head || '') + fmt(s) + ' series', { b: 1, fs: 15, mono: 1, c, dy: 18, a, al }); lab(R, p, fmt(C.sps(s)) + ' samples/s · ' + disk(s) + ' a day', { fs: 12.5, mono: 1, c: R.P.mute, dy: 37, a, al }); };
  function draw(R, k, e) {
    const P = R.P;
    if (k <= 3) R.grid(-3.6, 3.6, -3.6, 3.6, .4); else if (k === 4) R.grid(-8, 64, -8, 76, 4); else R.grid(-40, 660, -40, 780, 40);
    // steps 1 to 3: one cube per series, a new label's copies fading in
    if (k <= 3) { const ka = k === 3 ? 1 - win(e, .1, .5) : 1;
      for (let s = 0; s < C.S; s++) for (let r = 0; r < C.R; r++) for (let b = 0; b < NB; b++) {
        if (k === 0 && (s || r)) continue; if (k === 1 && s) continue;
        const na = k === 0 ? win(e, b * .05, b * .05 + .2) : k === 1 && r ? win(e, r * .12, r * .12 + .3) : k === 2 && s ? win(e, s * .18, s * .18 + .3) : 1;
        const a = na * ka * (k === 3 ? 1 : 1); if (a <= .01) continue;
        const c = b >= C.B ? P.c5 : P.c1;
        R.box([O[0] - BW / 2 + (b + .5) * U, s * U, O[1] - BD / 2 + (r + .5) * U], [CU, CU, CU], { fill: mix(P.paper, c, .25 + .5 * (k === 0 ? 1 : k === 1 ? (r ? .6 : 1) : s ? .6 : 1)), a, shadow: false, lw: .6 });
      }
      if (k <= 2) { lab(R, [O[0], k === 2 ? BH : U, O[1] - BD / 2], k === 0 ? fmt(C.series() / C.R / C.S / C.I) + ' series' : k === 1 ? fmt(NB * C.R) + ' series' : fmt(NB * C.R * C.S) + ' series', { b: 1, fs: 15, mono: 1, c: P.acc, dy: -18 });
        lab(R, [O[0] + BW / 2, 0, O[1] + BD / 2 + .05], C.B + ' buckets + _sum + _count', { fs: 12.5, c: P.mute, al: 'right', dy: 16, wide: 1 });
        if (k >= 1) lab(R, [O[0] + BW / 2 + .05, 0, O[1]], '× ' + C.R + ' routes', { fs: 12.5, c: P.mute, al: 'left', dx: 8, wide: 1 });
        if (k >= 2) lab(R, [O[0] - BW / 2 - .05, BH / 2, O[1] + BD / 2], '× ' + C.S + ' status codes', { fs: 12.5, c: P.mute, al: 'right', dx: -8, wide: 1 }); } }
    // step 4: ten instances, each the same block of 240
    if (k === 3 || k === 4) { const a0 = k === 3 ? win(e, .3, .7) : 1 - win(e, .1, .5);
      SET.forEach(([x, z], i) => { const a = a0 * (k === 3 && i ? win(e, .35 + i * .05, .55 + i * .05) : 1); if (a <= .01) return;
        R.box([x, 0, z], [BW, BH, BD], { fill: mix(P.paper, P.c1, i ? .4 : .6), a, lw: .8 }); });
      if (k === 3) { say(R, [0, 0, 3.3], C.series(), '', P.acc, win(e, .5, .9));
        lab(R, [2.8, 0, 0], '× ' + C.I + ' instances', { fs: 12.5, c: P.mute, al: 'left', dx: 8, wide: 1, a: win(e, .5, .9) }); } }
    // step 5: a model label with 100 values: 100 copies of the whole 2,400
    if (k === 4 || k === 5) { const a0 = k === 4 ? win(e, .3, .6) : 1 - win(e, .1, .5);
      for (let i = 0; i < 100; i++) { const gx = i % 10, gz = Math.floor(i / 10), a = a0 * (k === 4 && i ? win(e, .35 + i * .005, .6 + i * .005) : 1); if (a <= .01) continue;
        R.box([gx * PX, 0, gz * PZ], [SX, BH * 3, SZ], { fill: mix(P.paper, P.c2, i ? .4 : .7), a, shadow: false, lw: .6 }); }
      if (k === 4) { say(R, [9 * PX + SX / 2, 0, 9 * PZ + SZ / 2], C.series(100), '+ model: ', P.c2, win(e, .5, .9));
        lab(R, [0, BH * 3, 0], 'one cell = all 2,400', { fs: 12.5, c: P.mute, dy: -12, wide: 1, a: win(e, .4, .8) }); } }
    // step 6: tenant_id with 10,000 values instead: a field of 100 x 100 cells, the model field above is the shaded corner of 10 x 10
    if (k === 5) { const a = win(e, .3, .7), W = 100 * PX, D = 100 * PZ, o0 = [-PX / 2, .5, -PZ / 2];
      R.glass(o0, [W, 0, 0], [0, 0, D], { c: P.c6, a, nu: 100, nv: 100, th: .5 });
      R.quad([[o0[0], .6, o0[2]], [o0[0] + 10 * PX, .6, o0[2]], [o0[0] + 10 * PX, .6, o0[2] + 10 * PZ], [o0[0], .6, o0[2] + 10 * PZ]], { fill: P.c2, fa: .8, a });
      lab(R, [o0[0] + 10 * PX, .6, o0[2] + 5 * PZ], 'step 5: 100 cells', { fs: 12.5, c: P.c2, b: 1, al: 'left', dx: 8, a, wide: 1 });
      say(R, [o0[0] + W, .5, o0[2] + D], C.series(1e4), '+ tenant_id: ', P.bad, win(e, .5, .9)); }
  }
  // bounds grow with the step: the full view (the stage's distance) is the largest, so close views stay free of distortion
  const v0 = (y) => [[O[0] - 1.6, 0, O[1] - .7], [O[0] + 1.6, y, O[1] + .9]];
  const V = [v0(.3), v0(.3), v0(.9), [[-3, 0, -3.4], [3, .9, 4.2]], [[-4, 0, -4.5], [58, 3, 92]], [[-5, 0, -6], [618, 3, 960]]];   // the extra depth in front leaves floor for the two lines
  S3.stage({ id: 'stg-card', list: 'sx-card', fig: 'Fig. 3 · one cube per time series', cam: [.6, .62], bounds: V[5], aspect: .62, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [34, 10, 14, 10] : [40, 18, 22, 18],
    view: k => ({ cam: k >= 4 ? [.6, .82] : [.6, .55], bounds: V[k] }) });
})();
