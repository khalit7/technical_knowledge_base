// ---- Scene (Fig. 1, the hero and section 2): one sentence of the running story through the running example's real tokenizer. The bytes,
// the eight pre-tokenizer chunks, each chunk's merges and the 11 ids are TKN.pipe (recorded from the library by src/bpe/inspect_bpe.py; the ids
// equal TKN.pipe.ids_from_library and src/code/snippets.py's output); the table is the tiny GPT's 4,096 x 256 tied embedding, rows placed by id. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.TKS) return;
  const { la, lab, vis, layout, tiles, tile } = TKS, { mix, at } = S3, N = TKN, W = N.pipe.words, piece = TKR.piece;
  const V = 4096, D = 256, U = .32, G = .34, ZT = 2.35, NB = W.reduce((s, w) => s + w.bytes.length, 0);
  const plen = id => N.bpe.hex[id].length / 2;
  // the tiles of the sentence at a stage: 'text' (one slab), 'bytes' (no chunk gaps), 'chunks', or merge progress m in [0,1] (fraction of each chunk's trace)
  function state(kind, m) { const out = []; let c = 0;
    W.forEach((w, wi) => { if (kind === 'bytes' || kind === 'chunks') w.bytes.forEach(b => out.push({ s: String.fromCharCode(b), n: 1, c: kind === 'bytes' ? 0 : wi, id: null, byte: 1 }));
      else { const T = w.trace, j = Math.min(T.length - 1, Math.floor(m * (T.length - 1) + 1e-9)); T[j].forEach(id => { const p = piece(id); out.push({ s: p.s != null ? p.s : '?', n: plen(id), c: wi, id, byte: id >= 1 && id <= 256 }); }); } });
    return out; }
  const x0 = -(NB * U + (W.length - 1) * G) / 2;
  function lay(k, e) { // tiles for step k at progress e (the merge step plays its merges during the step)
    if (k <= 1) return layout(state('bytes'), U, 0, -NB * U / 2);
    if (k === 2) return layout(state('chunks'), U, G * e, -(NB * U + (W.length - 1) * G * e) / 2);
    if (k === 3) return layout(state('m', e), U, G, x0);
    return layout(state('m', 1), U, G, x0); }
  const ZP0 = -.15, DP = 3.3, XP = 3.3, zRow = id => ZP0 - DP * (id + .5) / V;
  function draw(R, k, e, st) {
    const P = R.P, L = f => la(st, e, f); R.grid(-7, 7, -3.6, 3.2, .5);
    const fillOf = t => t.byte ? (k >= 3 ? mix(P.paper, P.c2, .42) : P.paper) : mix(P.paper, P.c1, .4);
    // 1. the text as one slab, then the bytes
    if (k === 0 || (k === 1 && e < 1)) { const a = k === 0 ? 1 : 1 - e;
      R.box([0, 0, ZT], [NB * U, .3, .62], { a, fill: P.paper, lw: .8 });
      lab(R, [0, .3, ZT], N.pipe.sentence, { mono: true, fs: 14, dy: -14, b: 1, a: k === 0 ? 1 : Math.max(0, 1 - 2 * e) });
      lab(R, [0, 0, ZT + .31], NB + ' characters', { fs: 12.5, dy: 14, c: P.mute, a: L(kk => kk === 0 ? 1 : 0) }); }
    if (k >= 1) { const cur = lay(k, e);
      if (k === 1) cur.forEach(t => tile(R, t, ZT, { a: e, fill: P.paper, fs: 12.5, h: .3, wide: 1 }));
      else tiles(R, cur, null, ZT, 1, { style: t => ({ fill: fillOf(t), h: t.byte ? .3 : .42, b: !t.byte }), fs: 12.5, wide: 1 });
      // the ids under the tiles once the merges are done
      if (k >= 4) { const gs = []; cur.forEach(t => { const g = gs[gs.length - 1]; if (t.byte && g && g.byte && g.c === t.c) { g.ids.push(t.id); g.x1 = t.x; } else gs.push({ byte: t.byte, c: t.c, ids: [t.id], x0: t.x, x1: t.x }); });
        gs.forEach(g => lab(R, [(g.x0 + g.x1) / 2, 0, ZT + .31], g.ids.join(' '), { mono: true, fs: 12.5, dy: 14, b: 1, c: g.byte ? P.c2 : P.c1, a: L(kk => kk >= 4 ? 1 : 0) })); }
      lab(R, [x0 - .1, .15, ZT], k === 1 ? 'UTF-8 bytes' : k === 2 ? '8 chunks' : k === 3 ? 'merges' : '11 tokens', { al: 'right', dx: -8, fs: 12.5, c: P.mute, grp: 'side' });
      if (k >= 1 && k <= 2) lab(R, [0, 0, ZT + .31], NB + ' bytes, ids 1 to 256', { fs: 12.5, dy: 14, c: P.mute, a: L(kk => kk === 1 || kk === 2 ? 1 : 0) });
    }
    // 2. the embedding table: 4,096 rows of 256 numbers, the 256 byte rows at the front, the merges behind in the order learned
    const pa = k >= 5 ? (k === 5 ? .2 + .8 * e : 1) : .2;
    if (pa > 0) { const z1 = ZP0 - DP;
      R.glass([-XP, .03, ZP0], [2 * XP, 0, 0], [0, 0, -DP], { c: P.c1, a: pa * (k === 6 ? .9 : .75), nu: 8, nv: 16, th: .04 });
      R.quad([[-XP, .05, ZP0], [XP, .05, ZP0], [XP, .05, zRow(256)], [-XP, .05, zRow(256)]], { fill: P.c2, fa: .35, a: pa, edge: false });
      lab(R, [XP, .05, (ZP0 + zRow(256)) / 2], 'rows 1 to 256: bytes', { al: 'left', dx: 8, fs: 12.5, c: P.c2, grp: 'pl', a: pa > .3 ? pa : 0 });
      lab(R, [XP, .05, (zRow(256) + z1) / 2], 'rows 257 to 4,095: merges, in order', { al: 'left', dx: 8, fs: 12.5, c: P.c1, grp: 'pl', a: pa > .3 ? pa : 0 });
      lab(R, [0, .05, z1], 'E · 4,096 rows × 256', { fs: 13, b: 1, dy: -12, c: P.c1, a: L(kk => kk >= 5 ? 1 : .35) });
      const cur = lay(6, 1);
      cur.forEach((t, i) => { const zr = zRow(t.id), c = t.byte ? P.c2 : P.c1, xr = Math.max(-XP + .3, Math.min(XP - .3, t.x * .5));
        R.line([[-XP, .07, zr], [XP, .07, zr]], { c, w: 2.4, a: pa * (k === 6 ? .55 : 1) });
        if (k === 5) R.flow([[t.x, .3, ZT - .3], [xr, .3, (ZT + zr) / 2], [xr, .08, zr]], { c, a: e, r: .05, n: 6, speed: 1.2 }); });
    }
    // 3. the output layer: after the blocks, the same matrix scores every row
    if (k === 6) { const bx = 5.3, bz = -2, last = lay(6, 1).slice(-1)[0];
      R.box([bx, 0, bz], [1.5, 1.05, 1.5], { a: e, fill: P.paper });
      lab(R, [bx, 1.05, bz], '6 blocks', { fs: 13, b: 1, dy: -12, a: L(kk => kk === 6 ? 1 : 0) });
      R.flow([[last.x, .3, ZT - .3], [bx, .6, bz + .8]], { c: P.ink, a: e * .8, r: .05, n: 7, speed: 1.1 });
      for (let i = 0; i < 9; i++) { const zr = ZP0 - DP * (i + .5) / 9; R.flowArc([bx - .75, .9, bz], [XP * (i % 2 ? .4 : -.2), .08, zr], .7, { c: P.c1, a: e * .7, r: .04, n: 6, speed: 1.3 }); }
      lab(R, [XP, .05, ZP0 - DP], 'scores all 4,096 rows: 2Vd = 2.10M FLOPs', { al: 'left', dx: 8, dy: 8, fs: 12.5, b: 1, c: P.c1, a: L(kk => kk === 6 ? 1 : 0), wide: 1 }); }
  }
  const close = { cam: [.08, .7], bounds: [[-6.5, 0, -1.6], [6.5, .8, 3]] }, full = { cam: [.22, .8], bounds: [[-6.6, 0, -3.5], [6.8, 1.1, 3]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one sentence through the running example’s tokenizer', cam: full.cam, bounds: full.bounds, aspect: .4, dur: 1500, hold: 4600, draw,
    view: k => k <= 4 ? close : full, margin: w => w < 520 ? [16, 10, 18, 10] : [22, 170, 26, 90] });
})();
