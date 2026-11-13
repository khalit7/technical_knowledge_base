// ---- Scene (section 4, Fig. 5): the contrastive loss on a real batch, the first 8 of the root's 16 test images against their 8 captions.
// Cosines are the recorded matrices (VEL.models.*.sim16); each model is shown with its own loss at its own learned scale and bias
// (CLIP: softmax over rows and columns at t = 100; SigLIP 2: one sigmoid per cell at t = 112.67, b = -16.77). The losses are computed
// here with the widget's formulas and match the recorded VEL.loss values. ----
(function () {
  if (!document.getElementById('stg-loss') || !window.VEK || !window.VEL) return;
  const { mix } = S3, { tw, la, lab, seg, image, f2 } = VEK, L = VEL, N = 8, C = .5, X0 = -1.75, Z0 = -1.75, YP = .45, HB = 2.4, HP = 1.3;
  const name = k => k.replace(/^[a-z]\d\d_/, '').replace(/_/g, ' ');
  const lse = v => { const m = Math.max(...v); return m + Math.log(v.reduce((a, x) => a + Math.exp(x - m), 0)); };
  function calc(w) { const S = L.models[w].sim16.slice(0, N).map(r => r.slice(0, N)), t = L.models[w].scale, b = L.models[w].bias;
    const row = S.map(r => { const z = lse(r.map(x => t * x)); return r.map(x => Math.exp(t * x - z)); });
    const col = S.map((_, i) => S.map((_, j) => { const c = S.map(r => r[j]), z = lse(c.map(x => t * x)); return Math.exp(t * S[i][j] - z); }));
    const sig = b == null ? null : S.map(r => r.map(x => 1 / (1 + Math.exp(-(t * x + b)))));
    let soft = 0; for (let i = 0; i < N; i++) soft += -Math.log(row[i][i]) - Math.log(col[i][i]); soft /= 2 * N;
    let sl = 0; if (sig) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) sl += -Math.log(i === j ? sig[i][j] : 1 - sig[i][j]); sl /= N;
    let d = 0, o = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) i === j ? d += S[i][j] : o += S[i][j];
    return { S, row, col, sig, soft, sl, diag: d / N, off: o / (N * N - N), t, b }; }
  const A = { clip: calc('clip'), siglip: calc('siglip') }; window.VE_LOSS8 = A;
  const cx = j => X0 + j * C, cz = i => Z0 + i * C;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.8, 3.2, -3.2, 2.6, .5);
    const w = k >= 4 ? 'siglip' : 'clip', T = A[w], wp = st.pk >= 4 ? 'siglip' : 'clip';
    // the batch: 8 images down the left (rows), their 8 captions along the back (columns)
    L.keys.slice(0, N).forEach((key, i) => { image(R, key, 8, X0 - 1.0, cz(i), .42, { a: 1 });
      lab(R, [X0 - 1.25, .03, cz(i)], (i + 1) + ' ' + name(key), { fs: 12, c: i === 7 ? P.bad : P.ink, al: 'right', dx: -4, a: tw(st, e, q => q <= 3 ? 1 : .75), wide: 1 }); });
    for (let j = 0; j < N; j++) { R.box([cx(j), 0, Z0 - 1.0], [.38, .12, .3], { fill: mix(P.paper, P.c2, .3), a: 1, shadow: false }); lab(R, [cx(j), .12, Z0 - 1.0], 'T' + (j + 1), { mono: 1, fs: 12, c: P.c2, dy: -10, wide: 1 }); }
    lab(R, [X0 - 1.0, 0, Z0 - 1.0], 'captions →', { fs: 12, c: P.c2, al: 'right', dx: 10, wide: 1 });
    if (k === 0) { for (let i = 0; i < N; i++) R.flow(seg([X0 - .78, .1, cz(i)], [X0 - .3, YP, cz(i)], 5), { c: P.acc, r: .045, a: e, n: 3 });
      for (let j = 0; j < N; j++) R.flow(seg([cx(j), .15, Z0 - .85], [cx(j), YP, Z0 - .3], 5), { c: P.c2, r: .045, a: e, n: 3 }); }
    // the matrix plate; cells on it as signed bars (positive up, negative hanging below)
    R.glass([X0 - C / 2, YP, Z0 - C / 2], [N * C, 0, 0], [0, 0, N * C], { c: P.acc, a: .55, nu: N, nv: N, th: .03 });
    const H = (q, i, j) => { const TT = A[q >= 4 ? 'siglip' : 'clip']; return q === 0 ? 0 : q === 1 || q === 4 ? TT.S[i][j] * HB : q === 2 ? TT.row[i][j] * HP : q === 3 ? TT.col[i][j] * HP : TT.sig[i][j] * HP; };
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const h0 = H(st.pk, i, j), h1 = H(k, i, j), h = e >= 1 ? h1 : h0 + (h1 - h0) * e, dg = i === j;
      const win = (k === 2 && T.row[i][j] === Math.max(...T.row[i])) || (k === 3 && T.col[i][j] === Math.max(...T.col.map(r => r[j])));
      const fill = dg ? mix(P.paper, P.acc, .75) : win ? mix(P.paper, P.bad, .7) : P.paper;
      if (Math.abs(h) > .004) R.box([cx(j), h >= 0 ? YP + .03 : YP - Math.abs(h), cz(i)], [C * .62, Math.abs(h), C * .62], { fill, a: 1, shadow: false, lw: .5 }); }
    // normalising: every row (then every column) is one softmax, so dots stream along it into its total of 1
    if (k === 2) for (let i = 0; i < N; i++) R.flow(seg([cx(0) - .2, YP + .08, cz(i)], [cx(N - 1) + .3, YP + .08, cz(i)], 10), { c: P.acc, r: .04, a: e * .8, n: 6, speed: .9 });
    if (k === 3) for (let j = 0; j < N; j++) R.flow(seg([cx(j), YP + .08, cz(0) - .2], [cx(j), YP + .08, cz(N - 1) + .3], 10), { c: P.acc, r: .04, a: e * .8, n: 6, speed: .9 });
    if (k === 5) for (let i = 0; i < N; i++) R.glow([cx(i), YP + T.sig[i][i] * HP, cz(i)], .25, { c: P.acc, a: e * .6 });
    // the headline numbers of each step, at the front of the card
    const F = [X0 + 1.75, 0, cz(N - 1) + .9], m = k >= 4 ? 'SigLIP 2' : 'CLIP';
    const TX = [null, m + ' cosines: true pairs ' + f2(A.clip.diag, 3) + ', others ' + f2(A.clip.off, 3), 'softmax over each row at t = ' + A.clip.t,
      'and over each column: loss ' + f2(A.clip.soft, 3), 'SigLIP 2 cosines: true pairs ' + f2(A.siglip.diag, 3) + ', others ' + f2(A.siglip.off, 3), 'sigmoid per cell, t = ' + A.siglip.t + ', b = ' + A.siglip.b + ': loss ' + f2(A.siglip.sl, 3)];
    for (let q = 1; q < 6; q++) lab(R, F, TX[q], { fs: 12.5, b: 1, c: q >= 4 ? P.c2 : P.acc, dy: 18, a: la(st, e, z => z === q ? 1 : 0) });
    lab(R, F, 'image tower → 8 image vectors · text tower → 8 caption vectors', { fs: 12.5, b: 1, c: P.ink, dy: 18, a: la(st, e, z => z === 0 ? 1 : 0) });
    if (k === 2) { const am = T.row[7].indexOf(Math.max(...T.row[7])); lab(R, [cx(am), YP + T.row[7][am] * HP, cz(7)], 'row 8 picks caption ' + (am + 1), { fs: 12, b: 1, c: P.bad, al: 'left', dx: 10, a: e }); }
  }
  const st = S3.stage({ id: 'stg-loss', list: 'sx-loss', fig: 'Fig. 5 · a real batch of 8 pairs and its loss', cam: [.3, .7], bounds: [[-3.3, -.4, -2.7], [2.0, 2.0, 2.0]], aspect: .7, dur: 1500, hold: 5000, draw, margin: w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 110] });
  VEK.onImage(() => st && st.draw());
})();
