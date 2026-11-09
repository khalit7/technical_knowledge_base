// ---- Fig. 2 (section 2): three schedules as columns of variance, signal share abar (bottom) and noise share 1 - abar (top) at eleven
// timesteps, from the page's own schedule code (DZC.sched: diffusers v0.41.0's formulas, checked by check_toy.mjs against recompute.py);
// then the last step close up, what one latent value and its channel average keep there (SD 1.5, 64 x 64 values per channel), and the
// zero-terminal-SNR rescale (DZC.sched(..., {zt: true}), Lin et al. 2023, Algorithm 1). ----
(function () {
  if (!document.getElementById('stg-sched') || !window.S3 || !window.DZC) return;
  const TS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 999], ROWS = [['linear', 'linear (DDPM; the tiny model)'], ['cosine', 'cosine'], ['scaled', 'scaled-linear (SD 1.5)']];
  const AB = { linear: DZC.sched('linear'), cosine: DZC.sched('cosine'), scaled: DZC.sched('scaled'), zt: DZC.sched('scaled', { zt: true }) };
  const cross = k => { const a = AB[k]; for (let t = 0; t < 1000; t++) if (a[t] / (1 - a[t]) < 1) return t; return -1 };
  const NV = 64 * 64, snr = a => a / (1 - a), snrMean = a => NV * snr(a);   // averaging 4,096 values divides the noise variance by 4,096
  const XS = .62, x = j => (j - 5) * XS, z = r => (r - 1) * 1.5, HMAX = 1.3, BW = .4, BD = .5;
  window.DZS2 = { cross: { linear: cross('linear'), cosine: cross('cosine'), scaled: cross('scaled') }, sqLast: { linear: Math.sqrt(AB.linear[999]), cosine: Math.sqrt(AB.cosine[999]), scaled: Math.sqrt(AB.scaled[999]) },
    snrLast: snr(AB.scaled[999]), snrMean: snrMean(AB.scaled[999]) };
  function column(R, c, a, al, hi, P) {   // a column of total variance 1: signal share a at the bottom, noise share on top
    const hs = Math.max(.004, a * HMAX), hn = Math.max(.004, (1 - a) * HMAX);
    R.box([c[0], 0, c[2]], [BW, hs, BD], { fill: hi ? P.c1 : S3.mix(P.paper, P.c1, .55), a: al, shadow: al > .5 });
    R.box([c[0], hs, c[2]], [BW, hn, BD], { fill: S3.mix(P.paper, P.mute, .25), a: al * .9, shadow: false, fa: .85 });
  }
  function draw(R, k, e) {
    const P = R.P; R.grid(-4.6, 4.6, -2.4, 2.4, .5);
    const rowA = r => { if (k <= 2) return r === k ? 1 : .13; if (k === 3) return 1; return r === 2 ? .3 : .1; };
    ROWS.forEach(([key, name], r) => { const al = rowA(r), grow = k === r ? e : 1, src = k === 5 && r === 2 ? AB.zt : AB[key];
      TS.forEach((t, j) => { if (k === 4 && r === 2 && j === 10) return;   // that column moves to the comparison below
        const a0 = k === 5 && r === 2 ? AB.scaled[t] : src[t], a1 = src[t], a = k === 5 && r === 2 ? S3.lerp(a0, a1, e) : a1;
        column(R, [x(j), 0, z(r)], 1 - (1 - a) * grow, al, k <= 3 || r === 2, P); });
      if (al > .5 && k !== 3) R.label([x(0) - .35, 0, z(r)], name, { al: 'right', dx: -6, fs: 12, b: 1, c: P.ink, a: al, wide: 1 });
      // the step where SNR falls below 1 (signal share 0.5): a thin marker across the row
      const ct = cross(key), xc = x(0) + (ct / 100) * XS;
      if (k <= 2 && k === r) { R.quad([[xc, 0, z(r) - .33], [xc, HMAX + .05, z(r) - .33], [xc, HMAX + .05, z(r) + .33], [xc, 0, z(r) + .33]], { fill: P.c5, a: al * (k === r ? e : 1) * .35, ec: P.c5 });
        R.label([xc, HMAX + .05, z(r) - .33], 'SNR = 1 at t = ' + ct, { fs: 12, mono: 1, dy: -9, c: P.c5, b: 1, a: al * (k === r ? e : 1) }); } });
    if (k <= 2) TS.forEach((t, j) => { if (j % 2 === 0 || j === 10) R.label([x(j), 0, z(k) + .35], 't ' + t, { fs: 12, mono: 1, dy: 12, c: P.mute, a: .9 }); });
    // the last step, close up: what survives of each value's amplitude
    if (k === 3) ROWS.forEach(([key, name], r) => { const s = Math.sqrt(AB[key][999]);
      R.label([x(10) + .25, HMAX * .5, z(r)], ['linear', 'cosine', 'SD 1.5'][r] + ', t = 999: √ā = ' + s.toPrecision(2), { al: 'left', dx: 8, fs: 12.5, b: 1, mono: 1, c: P.ink, a: e > .8 ? (e - .8) * 5 : 0 }); });
    // one latent value against its channel's average at SD 1.5's last step: share of the variance that is signal, SNR / (1 + SNR)
    if (k >= 4) { const a1 = k === 5 ? S3.lerp(AB.scaled[999], AB.zt[999], e) : AB.scaled[999], sm = snrMean(a1), cA = [3.0, 0, 3.0], cB = [4.3, 0, 3.0], gA = k === 4 ? e : 1;
      column(R, cA, a1, gA, true, P); column(R, cB, sm / (1 + sm), gA, true, P);
      R.label([cA[0], HMAX + .05, cA[2]], 'one value', { fs: 12, b: 1, dy: -22, c: P.ink, a: gA });
      R.label([cA[0], HMAX + .05, cA[2]], 'SNR ' + (k === 5 && e > .99 ? '0' : snr(a1).toFixed(4)), { fs: 12, mono: 1, dy: -8, c: P.ink, a: gA });
      R.label([cB[0], HMAX + .05, cB[2]], 'its channel’s average', { fs: 12, b: 1, dy: -22, c: P.c1, a: gA });
      R.label([cB[0], HMAX + .05, cB[2]], 'SNR ' + (k === 5 && e > .99 ? '0' : sm.toFixed(1)), { fs: 12, mono: 1, dy: -8, c: P.c1, b: 1, a: gA });
      // 4,096 values of one channel (a 64 x 64 latent, drawn as a gridded glass plate) streaming into their average
      const g0 = [.9, .02, 3.5]; R.glass(g0, [1, 0, 0], [0, 0, -1], { c: P.c6, a: gA * .8, nu: 8, nv: 8, th: .02 });
      R.label([1.4, 0, 3.55], 'one channel: 64 × 64 values', { fs: 12, mono: 1, dy: 12, c: P.mute, a: gA });
      for (let i = 0; i < 4; i++) R.flowArc([1.1 + .2 * i, .05, 2.8 + .15 * (i % 2)], [cB[0], .9, cB[2]], .6, { c: P.c1, r: .05, n: 5, speed: 1.2, a: gA * .9 });
      R.flowArc([1.7, .05, 3.1], [cA[0], .9, cA[2]], .4, { c: P.mute, r: .05, n: 4, speed: 1.2, a: gA * .7 }); }
  }
  const full = { cam: [.3, .5], bounds: [[-4.4, 0, -2.3], [3.9, 1.4, 2.3]] };
  S3.stage({ id: 'stg-sched', list: 'sx-sched', fig: 'Fig. 2 · where each schedule spends its 1,000 steps', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [16, 10, 14, 10] : [26, 16, 16, 170],
    view: k => k <= 2 ? { cam: [.3, .5], bounds: [[-3.6, 0, z(k) - .6], [3.6, 1.4, z(k) + .7]] } : k === 3 ? { cam: [.55, .45], bounds: [[2, 0, -2.3], [6.5, 1.4, 2.3]] } : { cam: [.25, .42], bounds: [[.6, 0, 2.2], [5, 1.5, 3.7]] } });
})();
