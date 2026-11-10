// ---- Scene (section 7, Fig. 5): massive activations in SmolLM2-135M, layer by layer on the running text (the root's Inside lab, measured on
// Apple M1 Pro, window.NSS.smol): the median |entry| of the stream (front row), its largest |entry| (middle row) and the attention weight on
// token 0 (back row; the lab's layers count from 0, so the stream at layer j is what layer j reads and layer j's sink stands behind it), from the embedding to after the final norm. Then the reference tiny GPT's largest and median entries (NSS.tiny, this page's
// inspect run), and the same numbers on a linear scale. Heights of the first two rows (and the tiny GPT's) are log10 against the glass wall
// behind, one decade per band, until the last step; the sink row is linear from 0 to 1. ----
(function () {
  if (!document.getElementById('stg-ma') || !window.NSK || !window.NSS) return;
  const { mix } = S3, { tw, la, lab, fmt: fmt0 } = NSK, fmt = v => v >= 1000 ? Math.floor(v).toLocaleString('en-GB') : fmt0(v), Sm = NSS.smol, Ti = NSS.tiny, N = Sm.max_abs.length, BL = Sm.big_layer, TOP = Sm.max_abs[BL];
  const DX = .3, X = j => (j - (N - 1) / 2) * DX, HM = 2.1, Hl = v => Math.max(.02, (Math.log10(v) + 2) / 7 * HM), Hn = v => Math.max(.006, v / TOP * HM);
  const ZT = 2.5, ZM = 1.25, ZL = 0, ZS = -1.25, ZW = -2.0, BW = .2;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.2, 5.6, -2.4, 3.0, .5);
    const lin = tw(st, e, q => q === 6 ? 1 : 0), H = v => S3.lerp(Hl(v), Hn(v), lin);
    // the wall: decades 0.01 to 100,000 (log); on the linear step the bands are 3,000 apart
    R.glass([X(0) - .3, 0, ZW], [X(N - 1) - X(0) + .6, 0, 0], [0, HM, 0], { c: P.mute, a: .5, nu: 1, nv: 7 });
    const lg = 1 - lin;
    ['0.01', '', '1', '', '100', '', '10,000', ''].forEach((t, d) => t && lab(R, [X(N - 1) + .3, d / 7 * HM, ZW], t, { fs: 12, c: P.mute, al: 'left', dx: 6, a: lg > .5 ? lg : 0 }));
    [0, 10000, 20000].forEach(v => lab(R, [X(N - 1) + .3, Hn(v || .001), ZW], v ? v.toLocaleString('en-GB') : '0', { fs: 12, c: P.mute, al: 'left', dx: 6, a: lin > .5 ? lin : 0 }));
    // which rows a step is about
    const aM = tw(st, e, q => q === 0 || q === 2 || q === 6 ? 1 : .3), aL = tw(st, e, q => q === 0 ? .0 : q === 4 ? .35 : 1), aS = tw(st, e, q => q === 4 ? 1 : q >= 5 ? .3 : 0), aT = tw(st, e, q => q === 5 ? 1 : 0);
    const upto = k === 1 ? Math.min(BL - 1, Math.floor(e * (BL - 1) + .5)) : k === 2 ? BL : N - 1, rideFrom = k === 3 && st.pk === 2 ? BL + e * (N - 1 - BL) : N - 1;
    for (let j = 0; j < N; j++) {
      R.box([X(j), 0, ZM], [BW, H(Sm.median_abs[j]), BW], { fill: mix(P.paper, P.c6, .6), a: aM, shadow: false, lw: .7 });
      const showL = k === 0 ? 0 : j <= upto && j <= rideFrom ? 1 : k === 1 ? 0 : 0;
      if (showL && aL > .01) R.box([X(j), 0, ZL], [BW, H(Sm.max_abs[j]), BW], { fill: mix(P.paper, j === BL ? P.bad : P.c2, .6), a: aL, shadow: false, lw: .7 });
      if (j < Sm.sink.length && aS > .01) R.box([X(j), 0, ZS], [BW, Sm.sink[j] * 1.2, BW], { fill: mix(P.paper, P.c4, .6), a: aS, shadow: false, lw: .7 });
    }
    lab(R, [X(0) - .2, .05, ZM], 'median |entry|', { fs: 12.5, b: 1, c: P.c6, al: 'right', dx: -6, a: Math.max(.45, aM), grp: 'rows' });
    lab(R, [X(0) - .2, .05, ZL], 'largest |entry|', { fs: 12.5, b: 1, c: P.c2, al: 'right', dx: -6, a: Math.max(.45, aL), grp: 'rows' });
    lab(R, [X(0) - .2, .05, ZS], 'weight on token 0', { fs: 12.5, b: 1, c: P.c4, al: 'right', dx: -6, a: Math.max(.3, aS), grp: 'rows' });
    lab(R, [X(0), 0, ZM + .3], k === 0 ? 'embedding: ' + fmt(Sm.median_abs[0]) : 'embedding', { fs: 12, b: k === 0, c: k === 0 ? P.c6 : P.mute, dy: 14, a: 1 - aT });
    lab(R, [X(BL), 0, ZM + .3], 'layer ' + BL, { fs: 12, b: 1, c: P.mute, dy: 14, a: 1 - aT });
    lab(R, [X(N - 1), 0, ZM + .3], 'final norm', { fs: 12, c: P.mute, dy: 14, a: 1 - aT });
    // step labels
    const L0 = la(st, e, q => q === 0 ? 1 : 0), L1 = la(st, e, q => q === 1 ? 1 : 0), L2 = la(st, e, q => q === 2 ? 1 : 0), L3 = la(st, e, q => q === 3 ? 1 : 0), L4 = la(st, e, q => q === 4 ? 1 : 0), L6 = la(st, e, q => q === 6 ? 1 : 0);
    lab(R, [X(N - 1), H(Sm.median_abs[N - 1]), ZM], fmt(Sm.median_abs[N - 1]), { fs: 12.5, b: 1, c: P.c6, al: 'left', dx: 8, a: L0 });
        lab(R, [X(6), H(Sm.max_abs[6]), ZL], 'channel ' + Sm.max_dim[6] + ' of token ' + Sm.max_tok[6] + ' ("' + Sm.tok[Sm.max_tok[6]] + '"): about ' + Math.round(Sm.max_abs[3] / 10) * 10, { fs: 12.5, b: 1, c: P.c2, dy: -14, a: L1 });
    lab(R, [X(BL), H(TOP), ZL], fmt(TOP) + ' · channel ' + Sm.max_dim[BL] + ' of token 0', { fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 10, dy: -6, a: L2 });
    lab(R, [X(BL), H(Sm.median_abs[BL]), ZM], 'median ' + fmt(Sm.median_abs[BL]), { fs: 12.5, b: 1, c: P.c6, al: 'right', dx: -10, a: L2 });
    lab(R, [X(N - 2), H(Sm.max_abs[N - 2]), ZL], fmt(Sm.max_abs[N - 2]), { fs: 12, b: 1, c: P.c2, al: 'right', dx: -8, dy: -8, a: L3 });
    lab(R, [X(N - 1), H(Sm.max_abs[N - 1]), ZL], fmt(Sm.max_abs[N - 1]) + ' after the final norm', { fs: 12, b: 1, c: P.c2, al: 'right', dx: -6, dy: 30, a: L3 });
    lab(R, [X(BL + 8), H(Sm.max_abs[BL + 8]), ZL], 'about 20,000 to layer 28', { fs: 12.5, b: 1, c: P.bad, dy: -14, a: L3 });
    lab(R, [X(BL), Sm.sink[BL] * 1.2, ZS], 'sink on: ' + Sm.sink[BL].toFixed(2), { fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 10, dy: -8, a: L4 });
    lab(R, [X(BL - 2), .3, ZS], 'at most ' + Math.max(...Sm.sink.slice(0, BL)).toFixed(3) + ' before', { fs: 12, b: 1, c: P.c4, al: 'right', dx: -6, dy: -14, a: L4 });
    lab(R, [X(BL), H(TOP), ZL], fmt(TOP) + ' = ' + Math.round(TOP / Sm.median_abs[BL]).toLocaleString('en-GB') + ' × the median', { fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 10, dy: -6, a: L6 });
    // the reference tiny GPT (step 6): 13 points (embedding and 12 sub-layers), largest and median entries, on the same scale
    if (aT > .01) {
      const n = Ti.max_abs.length, Xt = j => X(0) + j * DX * 2;
      for (let j = 0; j < n; j++) { R.box([Xt(j) - .06, 0, ZT], [.16, H(Ti.max_abs[j]), .2], { fill: mix(P.paper, P.c1, .6), a: aT, shadow: false, lw: .7 });
        R.box([Xt(j) + .12, 0, ZT], [.12, H(Ti.median_abs[j]), .2], { fill: mix(P.paper, P.c6, .45), a: aT, shadow: false, lw: .7 }); }
      const mx = Ti.max_abs.indexOf(Math.max(...Ti.max_abs));
      lab(R, [Xt(0) - .2, .05, ZT], 'tiny GPT', { fs: 12.5, b: 1, c: P.c1, al: 'right', dx: -6, a: aT, grp: 'rows' });
      lab(R, [Xt(mx), H(Ti.max_abs[mx]), ZT], 'largest ' + fmt(Ti.max_abs[mx]) + ', median ' + fmt(Ti.median_abs[mx]), { fs: 12.5, b: 1, c: P.c1, al: 'left', dx: 10, dy: -8, a: la(st, e, q => q === 5 ? 1 : 0) });
    }
  }
  const full = { cam: [.25, .62], bounds: [[-4.8, 0, -2.0], [4.8, 2.1, 2.8]] };
  S3.stage({ id: 'stg-ma', list: 'sx-ma', fig: 'Fig. 5 · SmolLM2-135M’s stream, layer by layer', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 70, 20, 120] });
})();
