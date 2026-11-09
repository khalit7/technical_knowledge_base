// ---- Scene (Reading 6, Fig. 6): packing twelve real documents into 2,048-token windows. Lengths are the running example's first twelve documents in
// Qwen3 tokens (window.SL.pack.demo.lens; packed lengths include one end-of-document token); the concatenate and best-fit layouts are the ones
// src/scripts/packing.py recorded (SL.pack.demo.concat and .bfd); pad and truncate follow the same rules as the page's packing code (33_js_sl_pack.js). ----
(function () {
  if (!document.getElementById('stg-pack') || !window.SLK || !window.SL) return;
  const { mix, lerp } = S3, { lab, plate, win, seg, f0, CAT } = SLK, D = SL.pack.demo, LN = D.lens, L = D.L, ND = LN.length;
  const TW = 4.4, s = TW / L, X0 = -2.2, DZ = .46, Z0 = -2.6, BH = .2;
  // layouts: windows of pieces [doc, start, len, eod]
  const pad = [], trunc = [], lost = [];
  LN.forEach((n, d) => { for (let st = 0; st < n; st += L) pad.push([[d, st, Math.min(L, n - st), false]]); trunc.push([[d, 0, Math.min(n, L), false]]); if (n > L) lost.push([d, n - L]); });
  const mark = W => W.map(w => w.map(([d, st, len]) => [d, st, len, st + len === LN[d] + 1]));
  const LAY = [null, pad, trunc, mark(D.concat), mark(D.bfd)], AW = 3;   // the window whose attention step 6 shows (concatenate's 4th)
  const cutDocs = W => { const c = {}; W.flat().forEach(p => c[p[0]] = (c[p[0]] || 0) + 1); return Object.values(c).filter(v => v > 1).length; };
  // attention in the shown window: share of causal (query, key) pairs that cross a document boundary
  const aw = LAY[3][AW], m = aw.reduce((a, p) => a + p[2], 0), same = aw.reduce((a, p) => a + p[2] * (p[2] + 1) / 2, 0), cross = 1 - same / (m * (m + 1) / 2);
  window.SLSC = window.SLSC || {}; SLSC.pack = { padW: pad.length, truncW: trunc.length, cutConcat: cutDocs(LAY[3]), cutBfd: cutDocs(LAY[4]), awPieces: aw.length, awCross: cross };
  const wz = i => Z0 + i * DZ;
  function pieces(R, P, W, k, e, o) { const C = CAT(P); o = o || {};
    W.forEach((w, i0) => { const i = o.z0 != null ? o.z0 : i0, z = wz(i), ta = k === o.k ? win(e, i * .05, i * .05 + .4) : 1, ga = (o.only != null && i !== o.only) ? .25 : 1;
      plate(R, [X0 + TW / 2, 0, z], TW + .08, DZ - .1, P.acc, ta * ga * .8, { nu: 8 });
      let x = X0; w.forEach(([d, st, len, eod]) => { const wd = len * s;
        R.box([x + wd / 2, .03, z], [Math.max(.02, wd - .01), BH, DZ - .2], { fill: mix(P.paper, C[d], .6), a: ta * ga, shadow: false, lw: .5 });
        if (eod) R.box([x + wd - .015, .03, z], [.03, BH + .07, DZ - .16], { fill: P.ink, a: ta * ga * .85, shadow: false, edge: false });
        const cut = o.cuts && (st > 0 || (st + len < LN[d] + (o.eod ? 1 : 0)));
        if (cut) R.box([st > 0 ? x + .02 : x + wd - .02, .03, z], [.04, BH + .1, DZ - .14], { fill: P.bad, a: ta * ga, shadow: false, edge: false });
        x += wd; });
      if (o.pad && x < X0 + TW - .01) R.box([(x + X0 + TW) / 2, .03, z], [X0 + TW - x - .01, .06, DZ - .2], { fill: P.mute, a: ta * ga * .5, shadow: false, lw: .4 });
      if (!o.noLab) lab(R, [X0 - .08, 0, z], 'w' + (i + 1), { mono: 1, fs: 12, al: 'right', dx: -4, c: P.mute, a: ta * ga, grp: 'win' }); }); }
  function draw(R, k, e) {
    const P = R.P, C = CAT(P);
    R.grid(-3.4, 8, -3.2, 4.4, .5);
    if (k === 0) { // the documents to scale, against one window
      R.quad([[X0, .01, Z0 - .25], [X0 + TW, .01, Z0 - .25], [X0 + TW, .01, Z0 + ND * DZ - .2], [X0, .01, Z0 + ND * DZ - .2]], { ec: P.acc, dash: [5, 4], a: win(e, .4, .9), lw: 1.4 });
      lab(R, [X0 + TW, 0, Z0 + ND * DZ - .2], 'one window: L = ' + f0(L) + ' tokens', { mono: 1, fs: 12.5, b: 1, c: P.acc, al: 'left', dx: 6, dy: 12, a: win(e, .5, 1) });
      LN.forEach((n, d) => { const z = wz(d), t = win(e, d * .04, d * .04 + .4), wd = n * s;
        R.box([X0 + wd / 2, .03, z], [wd, BH, DZ - .2], { fill: mix(P.paper, C[d], .6), a: t, shadow: false, lw: .5 });
        lab(R, [X0 + wd, BH, z], f0(n), { mono: 1, fs: 12, al: 'left', dx: 6, c: P.mute, a: t, wide: 1 }); });
      return; }
    if (k === 1) pieces(R, P, LAY[1], k, e, { k: 1, pad: 1, cuts: 1 });
    if (k === 2) { pieces(R, P, LAY[2], k, e, { k: 2, pad: 1 });
      lost.forEach(([d, n]) => { const z = wz(d), x = X0 + TW, dr = win(e, .45, 1);
        R.box([x + n * s / 2 + .05, .03 - .0 * dr, z], [n * s, BH, DZ - .2], { fill: mix(P.paper, P.bad, .5), a: (1 - .6 * dr) * win(e, .2, .5), shadow: false, lw: .5 });
        lab(R, [x + .15, BH, z], f0(n) + ' tokens thrown away', { fs: 12, al: 'left', dy: -12, c: P.bad, b: 1, a: dr, grp: 'lost' }); }); }
    if (k === 3) pieces(R, P, LAY[3], k, e, { k: 3, cuts: 1, eod: 1 });
    if (k === 4) pieces(R, P, LAY[4], k, e, { k: 4, cuts: 1, eod: 1 });
    if (k === 5) { pieces(R, P, [LAY[3][AW]].map(w => w), k, e, { cuts: 1, eod: 1, noLab: 1, z0: AW });
      // the causal attention of one window, standing behind it: rows are queries (along the window), height is keys
      const z = wz(AW) - DZ / 2 + .02, hs = 2.1 / m, o = []; let acc = 0; aw.forEach(p => { o.push(acc); acc += p[2]; });
      const mk = e, Y0 = .3, pt = (q, kk) => [X0 + q * s, Y0 + kk * hs * m / m, z];
      aw.forEach((pa, a) => aw.forEach((pb, b) => { if (b > a) return; const q0 = o[a], q1 = o[a] + pa[2], k0 = o[b], k1 = o[b] + pb[2];
        const Y = v => Y0 + v * hs;
        if (a === b) R.quad([[X0 + q0 * s, Y(k0), z], [X0 + q1 * s, Y(k0), z], [X0 + q1 * s, Y(k1), z]], { fill: mix(P.paper, C[pa[0]], .55), a: .95, ec: C[pa[0]], lw: .8 });
        else R.quad([[X0 + q0 * s, Y(k0), z], [X0 + q1 * s, Y(k0), z], [X0 + q1 * s, Y(k1), z], [X0 + q0 * s, Y(k1), z]], { fill: mix(P.paper, P.bad, .5), a: 1 - .85 * mk, ec: P.bad, lw: .8, dash: mk > .5 ? [4, 3] : null }); }));
      R.line([[X0, Y0, z], [X0 + TW, Y0, z]], { c: P.mute, w: 1 }); R.line([[X0, Y0, z], [X0, Y0 + 2.1, z]], { c: P.mute, w: 1 });
      lab(R, [X0 + TW, Y0, z], 'query position', { fs: 12, al: 'right', dy: 30, c: P.mute, wide: 1 });
      lab(R, [X0, Y0 + 2.1, z], 'key position', { fs: 12, al: 'left', dx: 6, c: P.mute, wide: 1 });
      lab(R, [X0 + TW * .06, Y0 + 1.9, z], 'red: attention across documents, ' + Math.round(100 * cross) + '% of pairs', { fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 8 });
      lab(R, [X0 + TW * .06, Y0 + 1.9, z], 'the document mask removes them', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 8, dy: 18, a: win(e, .5, 1) }); }
  }
  const full = { cam: [.35, .72], bounds: [[-2.6, 0, -3.0], [2.4, .3, 4.3]] };
  S3.stage({ id: 'stg-pack', list: 'sx-pack', fig: 'Fig. 6 · twelve documents into 2,048-token windows', cam: full.cam, bounds: full.bounds, aspect: .7, dur: 1600, hold: 4800, draw, margin: SLK.margin,
    view: k => k === 0 ? { cam: [.2, 1.0], bounds: [[-2.6, 0, -3.0], [7.4, .3, 2.6]] } : k === 1 ? full : k === 2 ? { cam: [.3, .75], bounds: [[-2.6, 0, -3.0], [7.4, .3, 2.6]] }
      : k === 5 ? { cam: [.08, .22], bounds: [[-2.4, 0, wz(AW) - .3], [2.4, 2.45, wz(AW) + .3]] } : { cam: [.3, .75], bounds: [[-2.6, 0, -3.0], [2.4, .3, wz(6) + .3]] } });
})();
