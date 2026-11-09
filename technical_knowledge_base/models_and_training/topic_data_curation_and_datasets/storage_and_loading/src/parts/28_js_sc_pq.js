// ---- Scene (Reading 3, Fig. 3): rows against columns. The same small table (12 records of FineWeb's 9 columns, in 3 row groups of 4: a stand-in for
// the real file's 972 row groups of about 1,000 rows, said on the page) laid out on disk two ways: JSON Lines record after record, then Parquet
// column chunk after column chunk inside each row group, with the footer at the end. Byte counts are FineWeb's first CC-MAIN-2024-30 file read by its
// footer (window.SL.fw, measured) and our 2,000-document JSONL (SL.fmt2k). ----
(function () {
  if (!document.getElementById('stg-pq') || !window.SLK || !window.SL) return;
  const { mix, lerp, lerp3, ease } = S3, { lab, plate, party, win, arcPts, seg, f0 } = SLK, FW = SL.fw;
  const COLS = FW.schema, NC = COLS.length, NR = 12, G = 4, NG = NR / G, LS = COLS.indexOf('language_score'), TX = COLS.indexOf('text');
  const CW = COLS.map(c => c === 'text' ? 1.7 : .4), GAPC = .06, TW = CW.reduce((a, b) => a + b, 0) + GAPC * (NC - 1);
  const cx = []; { let x = -TW / 2; CW.forEach(w => { cx.push(x + w / 2); x += w + GAPC; }); }
  const RZ = .3, GG = .32, ZT0 = -3.1;
  const rz = (r, split) => ZT0 + r * RZ + (split ? Math.floor(r / G) * GG : 0);
  // the on-disk strip: every cell in file order, widths proportional to the table's (scaled to fit), at the front
  const SX0 = -5.2, SX1 = 4.4, ZS = 2.2, tot = NR * (TW - GAPC * (NC - 1)), ss = (SX1 - SX0 - .3 * (NG - 1)) / tot;
  function strip(order) { const pos = {}; let x = SX0; order.forEach(([r, c], i) => { if (i && order[i - 1][0] !== r && order === CM && Math.floor(order[i - 1][0] / G) !== Math.floor(r / G)) x += .3;
      const w = CW[c] * ss; pos[r + ',' + c] = [x + w / 2, w]; x += w; }); return pos; }
  const RMO = [], CM = []; for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) RMO.push([r, c]);
  for (let g = 0; g < NG; g++) for (let c = 0; c < NC; c++) for (let r = g * G; r < g * G + G; r++) CM.push([r, c]);
  const PR = strip(RMO), PC = strip(CM), FX = SX1 + .45, RD0 = [0, 0, 3.75];
  const colBytes = Object.values(FW.columns).reduce((a, c) => a + c.comp, 0), mb = b => (b / 1e6).toFixed(2) + ' MB';
  const jsonl = SL.fmt2k.sizes.find(s => s.fmt === 'jsonl').bytes, lsB = FW.columns.language_score.comp, txB = FW.columns.text.comp;
  function colour(P, c) { return c === TX ? P.c1 : c === LS ? P.c2 : [P.c3, P.c4, P.c5, P.c6, P.mute, P.c3, P.c4, P.c5, P.c6][c]; }
  function draw(R, k, e) {
    const P = R.P, split = k >= 1, sp = k === 1 ? e : k > 1 ? 1 : 0;
    R.grid(-6, 6, -3.6, 3.4, .5);
    const lit = c => k === 3 ? c === LS : k === 4 ? c === TX : true, dim = c => (k >= 3 && !lit(c)) ? .22 : 1;
    // the logical table: one row per document, one cell per field
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) { const z = lerp(rz(r, false), rz(r, true), sp);
      R.box([cx[c], .02, z], [CW[c] - .02, .1, RZ - .07], { fill: mix(P.paper, colour(P, c), .5), a: dim(c) * (k === 2 ? .55 : 1), shadow: false, lw: .5 }); }
    // column chunks as glass plates, once the rows are grouped
    if (split) for (let g = 0; g < NG; g++) for (let c = 0; c < NC; c++) { const z0 = rz(g * G, true) - RZ / 2 + .02, z1 = rz(g * G + G - 1, true) + RZ / 2 - .02;
      R.glass([cx[c] - CW[c] / 2 + .01, .15, z0], [CW[c] - .02, 0, 0], [0, 0, z1 - z0], { c: colour(P, c), a: sp * dim(c) * .9, nu: 1, nv: G, th: .03 }); }
    lab(R, [cx[TX], .12, ZT0 - .15], 'text', { mono: 1, fs: 12.5, b: 1, c: P.c1, dy: -12 });
    lab(R, [cx[LS], .12, ZT0 - .15], 'language_score', { mono: 1, fs: 12.5, b: 1, c: P.c2, dy: -12, al: 'left', dx: -10 });
    lab(R, [(cx[1] + cx[6]) / 2, .12, ZT0 - .15], '+ 7 more columns', { mono: 1, fs: 12, c: P.mute, dy: -30, wide: 1 });
    if (split) for (let g = 0; g < NG; g++) lab(R, [TW / 2 + .1, .1, rz(g * G + 1.5, true)], 'row group ' + (g + 1), { fs: 12, al: 'left', dx: 6, c: P.mute, a: sp, wide: 1 });
    else lab(R, [TW / 2 + .1, .1, rz(5.5, false)], '12 records', { fs: 12, al: 'left', dx: 6, c: P.mute, wide: 1 });
    // the bytes on disk, in file order: the same cells, rearranged when the format changes
    const t = k === 0 ? 0 : k === 1 ? ease(win(e, .15, .85)) : 1;
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) { const a0 = PR[r + ',' + c], b0 = PC[r + ',' + c], x = lerp(a0[0], b0[0], t), w = lerp(a0[1], b0[1], t);
      R.box([x, .02, ZS], [Math.max(.02, w - .006), .16, .4], { fill: mix(P.paper, colour(P, c), .6), a: dim(c), shadow: false, lw: .35 }); }
    lab(R, [SX0, .2, ZS - .25], k === 0 ? 'on disk: records' : 'on disk: column chunks', { fs: 12.5, b: 1, al: 'left', dy: -14, c: P.ink, wide: 1 });
    // the reader, and the footer at the end of a Parquet file
    party(R, RD0, [.95, .45, .6], P.acc, 'reader', { a: 1, t: .3, fs: 12.5 });
    const fa = k < 2 ? 0 : k === 2 ? e : 1;
    if (fa > 0) { R.box([FX, .02, ZS], [.5, .3, .5], { fill: mix(P.paper, P.bad, .55), a: fa }); lab(R, [FX, .32, ZS], 'footer', { fs: 12.5, b: 1, c: P.bad, dy: -11, a: fa }); }
    const toR = (x, h) => arcPts(R, [x, .2, ZS], [RD0[0], .35, RD0[2] - .3], h || .5, 14);
    if (k === 0) { R.flow(seg([SX0, .25, ZS], [SX1, .25, ZS], 30), { c: P.acc, r: .06, speed: 1.6, n: 26, a: e });
      lab(R, [RD0[0] + .75, .2, RD0[2]], 'a filter on language_score parses every line: all ' + mb(jsonl), { fs: 12.5, b: 1, al: 'left', dx: 8, c: P.acc, a: e, wide: 1 }); }
    if (k === 2) { R.flow(toR(FX, .7), { c: P.bad, r: .07, n: 8, speed: 1.3, a: e });
      for (let g = 0; g < NG; g++) for (let c = 0; c < NC; c += 4) { const b0 = PC[(g * G) + ',' + c]; R.arc([FX, .32, ZS], [b0[0], .2, ZS], .5 + .1 * g, { c: P.bad, w: 1, a: .45 * e, t: e }); }
      lab(R, [FX, .32, ZS], 'read first: ' + mb(FW.footer_bytes) + ' for ' + f0(FW.row_groups) + ' × ' + NC + ' chunks', { fs: 12.5, c: P.bad, b: 1, dy: 34, al: 'right', dx: 20, a: e, wide: 1 }); }
    if (k >= 3) { const c = k === 3 ? LS : TX, B = k === 3 ? lsB : txB, col = colour(P, c);
      for (let g = 0; g < NG; g++) { const b0 = PC[(g * G + 1) + ',' + c]; R.flow(toR(b0[0], .45 + .1 * g), { c: col, r: .065, n: 6, speed: 1.3, a: Math.min(1, e * 1.6) }); }
      lab(R, [RD0[0] + .75, .2, RD0[2]], k === 3 ? 'reads ' + mb(B) + ' of a ' + (FW.file_bytes / 1e9).toFixed(2) + ' GB file (' + (100 * B / FW.file_bytes).toFixed(2) + '%)' :
        'text is ' + (100 * B / colBytes).toFixed(1) + '% of the bytes: little to skip', { fs: 12.5, b: 1, al: 'left', dx: 8, c: col, a: e, wide: 1 }); }
  }
  const full = { cam: [.12, .8], bounds: [[-5.6, 0, -3.4], [5.4, .5, 4.1]] };
  S3.stage({ id: 'stg-pq', list: 'sx-pq', fig: 'Fig. 3 · the same table as rows and as columns', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1600, hold: 4800, draw, margin: SLK.margin,
    view: k => k === 2 ? { cam: [.28, .8], bounds: [[-5.6, 0, -3.4], [5.6, .5, 4.1]] } : full });
})();
