// ---- Scene (top of page, Fig. 1): from curated documents to a GPU batch. Bars are bytes per token measured on the running example's first 2,000
// FineWeb documents (window.SL.bpt: Qwen3 tokens, the uint16 bar per GPT-2 token); the token strip is the first documents' real Qwen3 lengths
// (SL.lens2k) to scale; the index plates are drawn from Megatron's real indices on twelve documents (SL.meg); the 640 samples consumed are the stop point
// of the measured resume runs (SL.resume). Four ranks are illustrative. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.SLK || !window.SL) return;
  const { mix, lerp, at } = S3, { lab, plate, party, bar, win, arcPts, seg, f0, CAT } = SLK, S = SL;
  const B = k => S.bpt.find(r => r.what.indexOf(k) === 0).bpt;
  const DOC = [['UTF-8 text', B('UTF-8')], ['JSONL', B('JSONL, unc')], ['JSONL + zstd 3', B('JSONL + zstd')], ['Parquet + zstd 3', B('Parquet')]];
  const TOK = [['uint32 ids', B('Token file, uint32')], ['uint16 ids', B('Token file, uint16')]];
  const U = .3, DX = [-6.3, -5.4, -4.5, -3.6], TX0 = -2.3, TX1 = 1.1, ZT = -.2;
  // the token strip: the first documents' Qwen3 lengths to scale, each followed by an end-of-document mark
  const L = S.lens2k.slice(0, 9), sumL = L.reduce((a, b) => a + b, 0), sc = (TX1 - TX0) / sumL, DS = [];
  { let x = TX0; L.forEach(n => { DS.push([x, n * sc]); x += n * sc; }); }
  const XI = 2.7, ZI = [-1.1, 0, 1.1], IDX = ['document_index', 'sample_index', 'shuffle_index'], XR = 7.3, ZR = [-1.65, -.55, .55, 1.65], CK = [5.6, 0, 2.9];
  const consumed = S.resume.megatron_consumed_samples.stopped_after;
  function draw(R, k, e) {
    const P = R.P, C = CAT(P);
    R.grid(-7.2, 6.8, -2.8, 3.6, .5);
    // 1. the documents: four stored forms, bytes per token to scale
    const da = k === 0 ? 1 : k === 1 ? 1 - .7 * e : .3;
    DOC.forEach(([nm, v], i) => bar(R, [DX[i], 0, 0], v, U, i < 2 ? P.mute : P.c2, da, { w: .55, d: .55, grow: k === 0 ? win(e, i * .15, i * .15 + .5) : 1,
      val: k <= 1 ? v.toFixed(2) + ' B' : null, name: k <= 1 ? nm : null, nwide: 1, t: i < 2 ? .35 : .7 }));
    if (k <= 1) lab(R, [-4.95, 0, .55], 'documents', { fs: 12.5, b: 1, c: P.c2, dy: 40, a: da });
    // 2. tokenize once: documents flow into the token file, a flat strip of fixed-width ids
    const ta = k === 0 ? 0 : k === 1 ? e : k === 2 ? 1 : k === 3 ? .55 : .35;
    if (k === 1) R.flowArc([-3.4, .7, 0], [TX0 + .2, .3, ZT], .8, { c: P.c2, r: .07, n: 9, speed: 1.4, a: e });
    plate(R, [(TX0 + TX1) / 2, 0, ZT], TX1 - TX0 + .2, .7, P.acc, ta, { nu: 1 });
    DS.forEach(([x, w], i) => { const t = k === 1 ? win(e, .2 + i * .06, .5 + i * .06) : 1; if (t <= 0) return;
      R.box([x + w / 2, .03, ZT], [Math.max(.02, w - .035), .16, .42], { fill: mix(P.paper, C[i % 12], .55), a: ta * t, shadow: false, lw: .6 });
      R.box([x + w - .012, .03, ZT], [.03, .22, .44], { fill: P.ink, a: ta * t * .8, shadow: false, edge: false }); });
    if (k >= 1 && k <= 3) lab(R, [(TX0 + TX1) / 2, 0, ZT + .35], 'token file', { fs: 12.5, b: 1, c: P.acc, dy: 14, a: ta });
    TOK.forEach(([nm, v], i) => bar(R, [-1.9 + i * 1.9, 0, -1.25], v, U, P.acc, ta * (k === 1 ? win(e, .5, .9) : 1), { w: .55, d: .45, val: k === 1 ? nm + ' · ' + v.toFixed(2) + ' B' : null, vwide: 1 }));
    // 3. the order is computed, not stored: the seed builds three small index arrays
    const ia = k < 2 ? 0 : k === 2 ? e : k === 3 ? .8 : 1;
    party(R, [XI - 1.35, 0, -2.05], [.6, .3, .45], P.c5, 'seed', { a: ia, fs: 12.5, mono: 1 });
    IDX.forEach((nm, i) => { const t = k === 2 ? win(e, i * .2, i * .2 + .45) : 1;
      plate(R, [XI, .02, ZI[i]], 1.5, .55, P.c5, ia * t, { nu: 8 });
      lab(R, [XI + .8, .02, ZI[i]], nm, { mono: 1, fs: 12, al: 'left', dx: 6, c: P.c5, a: ia * t, wide: 1 });
      if (k === 2) R.flowArc([XI - 1.1, .3, -2.0], [XI - .5, .05, ZI[i]], .35, { c: P.c5, r: .06, n: 5, speed: 1.2, a: t }); });
    // 4. each rank reads its slice: flows from the token file, through the order, to every rank
    const ra = k < 3 ? 0 : k === 3 ? e : 1;
    ZR.forEach((z, i) => { party(R, [XR, 0, z], [.8, .5, .62], P.acc, 'rank ' + i, { a: ra, t: .35, fs: 12.5, grp: 'rk' });
      if (k >= 3) { R.flow(arcPts(R, [TX1, .2, ZT], [XI - .75, .1, ZI[1]], .3, 12).concat(arcPts(R, [XI + .75, .1, ZI[1]], [XR - .45, .3, z], .35, 14)), { c: P.acc, r: .065, n: 10, speed: 1.4, a: ra * (k === 4 ? .45 : .9) }); } });
    if (k === 3) lab(R, [XR, .5, ZR[3] + .35], 'its slice of each global batch', { fs: 12.5, b: 1, c: P.acc, dy: 26, a: e, wide: 1 });
    // 5. the checkpoint saves one integer; a restart rebuilds the same indices and continues at the next sample
    if (k === 4) { const a = e;
      party(R, CK, [1.1, .42, .7], P.good, 'checkpoint', { a, t: .3, fs: 12.5 });
      lab(R, [CK[0], .42, CK[2]], 'samples consumed = ' + f0(consumed), { mono: 1, fs: 12.5, b: 1, c: P.good, dy: 34, a });
      R.flow(arcPts(R, [XR - .2, .4, ZR[3]], [CK[0] + .4, .45, CK[2]], .45), { c: P.good, r: .07, n: 6, speed: 1.1, a });
      R.arc([CK[0] - .4, .35, CK[2] - .3], [XI + .3, .1, ZI[2] + .3], .6, { c: P.good, w: 2, t: win(e, .35, 1), dash: [5, 4], head: 7 });
      lab(R, [CK[0] - .6, .2, CK[2]], 'restart: same indices, next sample', { fs: 12.5, c: P.good, b: 1, al: 'right', dx: -8, a: win(e, .6, 1), wide: 1 }); }
  }
  const full = { cam: [.16, .72], bounds: [[-6.9, 0, -2.3], [7.8, 1.7, 3.3]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · documents, tokens, a computed order', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 4600, draw, margin: SLK.margin,
    view: k => k === 0 ? { cam: [.25, .6], bounds: [[-6.9, 0, -1.0], [-2.8, 1.8, 1.6]] } : k === 1 ? { cam: [.2, .62], bounds: [[-6.4, 0, -1.6], [1.4, 1.4, 1.4]] }
      : k === 2 ? { cam: [.15, .78], bounds: [[-2.6, 0, -2.4], [5.2, .9, 2.0]] } : full });
})();
