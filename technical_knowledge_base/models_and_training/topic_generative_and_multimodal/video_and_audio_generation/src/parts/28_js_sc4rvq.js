// ---- Scene (section 7, Fig. 4): residual vector quantisation in EnCodec 24 kHz, measured on the page's run (VA.codecs.speech, codec/run_codecs.py).
// One frame's 128-number encoder vector, then codebook stages as glass plates the residual flows through; under each stage, the share of the
// encoder vectors' energy the first k stages leave unexplained (over the whole sentence), columns to scale (x 25 from step 3, said on the figure);
// the stage-1 entry shown is the recorded code of the sentence's first frame; last, the spectral error of the reconstructions against Opus. ----
(function () {
  if (!document.getElementById('stg-rvq') || !window.VAK) return;
  const U = VAU, { mix } = S3, { tw, la, lab, seg, win, f1 } = VAK, SP = U.V.codecs.speech, rows = SP.encodec.rows, code0 = SP.encodec.codes_first8_stage1[0];
  const XV = -3.7, xs = j => j <= 8 ? -2.7 + (j - 1) * .52 : 1.35 + (j - 9) * .075, PY = .95, PS = 1.0, ZC = 1.5, HC = 1.5;
  // which stages a step has reached: 0, 1, 2, 8, 32
  const upto = q => [0, 1, 2, 8, 32, 32][q];
  const pct = v => (100 * v).toFixed(v < .001 ? 3 : 2) + '%';
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 4, -1.6, 2.6, .4);
    const n = upto(k), rec = tw(st, e, q => q === 5 ? .12 : 1);
    // the frame's vector: a white block on a plinth
    R.box([XV, 0, 0], [.4, .9, .4], { fill: mix(P.paper, P.c1, .45), a: rec });
    lab(R, [XV, .9, 0], 'one frame: 128 numbers', { fs: 12.5, b: 1, c: P.c1, dy: -14, a: la(st, e, q => q === 0 ? 1 : 0) });
    // the codebook stages
    for (let j = 1; j <= 32; j++) { const on = j <= n, a = tw(st, e, q => j <= upto(q) ? 1 : 0) * rec * (k === 0 ? 0 : 1);
      const fresh = (k === 1 && j === 1) || (k === 2 && j === 2) || (k === 3 && j > 2 && j <= 8) || (k === 4 && j > 8);
      if (a > .01 || (on && rec > .01)) R.glass([xs(j), PY, PS / 2], [0, 0, -PS], [0, PS, 0], { c: fresh ? P.c2 : P.c4, a: Math.max(a, .01) * (j > 8 ? .7 : .85), nu: j > 8 ? 1 : 8, nv: j > 8 ? 1 : 8, th: .02 }); }
    if (k >= 1) { const p = [xs(1) - .02, PY + PS * (1 - 3.5 / 8), -PS / 2 + 5.5 * PS / 8]; R.glow(p, .16, { c: P.c2, a: rec * (k === 1 ? e : .6) });
      lab(R, p, 'entry ' + code0 + ' of 1,024', { fs: 12.5, b: 1, mono: 1, c: P.c2, al: 'right', dx: -14, dy: -18, a: la(st, e, q => q === 1 ? 1 : 0) }); }
    [[1, 'codebook 1'], [2, '2'], [5, '3 to 8'], [20, '9 to 32']].forEach(([j, t], i) => lab(R, [j === 5 ? (xs(3) + xs(8)) / 2 : j === 20 ? (xs(9) + xs(32)) / 2 : xs(j), PY + PS, 0], t, { fs: 12.5, c: P.mute, dy: -12, a: rec * la(st, e, q => upto(q) >= [1, 2, 3, 9][i] && q < 5 ? 1 : 0) }));
    // the residual flowing from stage to stage, thinner as less is left
    if (k >= 1 && k <= 4) { const res = j => rows[j - 1].resid / rows[0].resid;
      R.flow(seg([XV + .2, .6, 0], [xs(1), PY + .5, 0], 10), { c: P.c1, r: .09, n: 8, speed: 1.2, a: k === 1 ? e : 1 });
      for (let j = 1; j < n; j++) { const fr = (k === 2 && j === 1) || (k === 3 && j >= 2) || (k === 4 && j >= 8);
        R.flow(seg([xs(j), PY + .5, 0], [xs(j + 1), PY + .5, 0], 4), { c: P.c2, r: .03 + .05 * Math.sqrt(res(j)), n: j > 8 ? 1 : 3, speed: .6, a: fr ? e : 1 }); } }
    // unexplained energy after the first k stages, to scale; from step 3 the scale is 25 times larger
    const sc = tw(st, e, q => q >= 2 ? 25 : 1), ca = la(st, e, q => q === 5 ? 0 : 1);
    if (ca > .01) {
      const a0 = ca * tw(st, e, q => q >= 2 ? 0 : 1);
      R.box([XV, 0, ZC], [.32, HC, .32], { fill: mix(P.paper, P.c2, .7), a: a0 });
      lab(R, [XV, HC, ZC], '100%', { fs: 12.5, b: 1, mono: 1, c: P.c2, dy: -12, a: a0 * la(st, e, q => q < 2 ? 1 : 0) });
      for (let j = 1; j <= n; j++) { const h = Math.max(.012, HC * rows[j - 1].resid * sc), a = ca * tw(st, e, q => j <= upto(q) ? 1 : 0);
        R.box([xs(j), 0, ZC], [j > 8 ? .055 : .32, h, .32], { fill: mix(P.paper, P.c2, .7), a, shadow: j <= 8 });
        if ([1, 2, 8, 32].includes(j)) lab(R, [xs(j), h, ZC], pct(rows[j - 1].resid), { fs: 12.5, b: 1, mono: 1, c: P.c2, dy: -12, grp: 'res', a: a * la(st, e, q => j <= upto(q) && q < 5 ? 1 : 0) }); }
      lab(R, [XV - .2, 0, ZC + .2], 'unexplained energy' + (sc > 1.5 ? ' (scale × 25)' : ''), { fs: 12.5, c: P.ink, al: 'left', dy: 18, a: la(st, e, q => q >= 1 && q < 5 ? 1 : 0) });
    }
    // what it sounds like: spectral error (log-mel L1) of the reconstructions against Opus, to scale
    const ma = la(st, e, q => q === 5 ? 1 : 0);
    if (ma > .01) { const H = 2.2, mx = Math.max(rows[0].mel_l1, SP.opus6.mel_l1);
      const C = [[1, rows[0].mel_l1, P.c2], [2, rows[1].mel_l1, P.c2], [8, rows[7].mel_l1, P.c2], [32, rows[31].mel_l1, P.c2], [6, SP.opus6.mel_l1, P.c5, 'Opus'], [12, SP.opus12.mel_l1, P.c5, 'Opus']];
      C.forEach(([kk, v, col, op], i) => { const x = -2.9 + i * 1.15 + (op ? .4 : 0), h = H * v / mx * (k === 5 && st.pk < 5 ? win(e, .1 + .08 * i, .6 + .06 * i) : 1);
        R.box([x, 0, ZC], [.55, h, .55], { fill: mix(P.paper, col, .7), a: ma });
        lab(R, [x, h, ZC], f1(v, 2), { fs: 13, b: 1, mono: 1, c: col, dy: -13, a: la(st, e, q => q === 5 ? 1 : 0) });
        lab(R, [x, 0, ZC + .35], op ? op + ' ' + kk + ' kbps' : 'k = ' + kk + ', ' + rows[kk - 1].kbps + ' kbps', { fs: 12, c: P.ink, dy: 14, a: la(st, e, q => q === 5 ? 1 : 0) }); });
      lab(R, [-3.9, H * .55, ZC], 'spectral error', { fs: 12.5, b: 1, c: P.ink, al: 'right', a: la(st, e, q => q === 5 ? 1 : 0) });
    }
  }
  const full = { cam: [-.6, .38], bounds: [[-4.2, 0, -.7], [3.3, 2.1, 2.0]] };
  S3.stage({ id: 'stg-rvq', list: 'sx-rvq', fig: 'Fig. 4 · EnCodec RVQ, stage by stage (measured)', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 5000, draw, margin: VAK.margin,
    view: k => k === 5 ? { cam: [-.25, .38], bounds: [[-4.2, 0, .8], [3.6, 2.4, 2.3]] } : full });
})();
