// ---- Fig. 2: tokens to vectors. The running sequence's token "o" (id 79, position 157) picks row 79 of the token table and row 157 of the
// position table; the two rows (real, the trained checkpoint: TZS.emb) lift out as signed bars and add into x, the stream block 1 reads.
// Last step: every "o" of the running sequence (TZD.pieces) reads the same row. The two tables are drawn at about the same height, not to scale. ----
(function () {
  if (!document.getElementById('stg-emb') || !window.TZK) return; const K = TZK, S = TZS, { at, lerp, lerp3, mix } = S3;
  const XT = -2.9, XP = 2.9, W = 3.0, ZT = -1.3, TH = 2.3, PH = 1.4, Y0 = 1.15;
  const yRow = (r, n, h) => Y0 + h * (1 - (r + .5) / n), RT = yRow(S.token_id, 4096, TH), RP = yRow(S.pos, 256, PH);
  const CT = [XT, .5, .7], CP = [XP, .5, .7], CX = [0, .5, 2.0], ZS = 2.75, SX = j => -4.6 + (j + .5) * 9.2 / 256;
  const os = TZD.pieces.map((p, j) => p === 'o' ? j : -1).filter(j => j >= 0);
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.2, 5.2, -1.8, 3.4, .5);
    const tA = K.tw(st, e, s => s === 0 || s === 1 || s === 4 ? 1 : .3), pA = K.tw(st, e, s => s === 2 ? 1 : s === 3 ? .3 : .2);
    K.plateZ(R, XT, Y0, ZT, W, TH, { c: P.c1, a: tA, nu: 8, nv: 16 });
    K.plateZ(R, XP, Y0, ZT, W, PH, { c: P.c6, a: pA, nu: 8, nv: 8 });
    K.lab(R, [XT, Y0 + TH, ZT], 'token table (4,096, 256)', { mono: true, fs: 12, b: 1, c: P.c1, dy: -10, a: K.la(st, e, s => s === 0 || s === 4 ? 1 : 0) });
    K.lab(R, [XP, Y0 + PH, ZT], 'position table (256, 256)', { mono: true, fs: 12, b: 1, c: P.c6, dy: -10, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    // the looked-up rows glow on their tables
    const rowA = K.tw(st, e, s => s <= 1 || s === 4 ? 1 : .4), prA = K.tw(st, e, s => s === 2 ? 1 : s === 3 ? .4 : 0);
    R.quad([[XT - W / 2, RT - .025, ZT - .01], [XT + W / 2, RT - .025, ZT - .01], [XT + W / 2, RT + .025, ZT - .01], [XT - W / 2, RT + .025, ZT - .01]], { fill: P.c2, a: rowA, edge: false });
    R.quad([[XP - W / 2, RP - .025, ZT - .01], [XP + W / 2, RP - .025, ZT - .01], [XP + W / 2, RP + .025, ZT - .01], [XP - W / 2, RP + .025, ZT - .01]], { fill: P.c2, a: prA, edge: false });
    K.lab(R, [XT + W / 2, RT, ZT], 'row 79', { mono: true, fs: 12, b: 1, c: P.c2, al: 'left', dx: 8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    K.lab(R, [XP - W / 2, RP, ZT], 'row 157', { mono: true, fs: 12, b: 1, c: P.c2, al: 'right', dx: -8, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    // 1. the id: a tile for "o", its id, and dots running to the row
    const idA = K.tw(st, e, s => s === 0 ? 1 : s <= 2 ? .4 : 0), TXI = XT - 1.25, TXP = XP + 1.25, TZI = 1.6;
    K.tile(R, [TXI, 0, TZI], null, { w: 1.1, d: .5, a: idA });
    K.lab(R, [TXI, .1, TZI + .25], '"o" · id 79', { serif: true, fs: 13.5, b: 1, dy: 20, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    if (k === 0) R.flow([[TXI, .12, TZI - .2], [lerp(TXI, XT, .6), RT * .6, .1], [XT, RT, ZT + .05]], { c: P.c2, a: e, r: .06, speed: 1.4 });
    // 2. the token row comes out of its table
    const u1 = K.tw(st, e, s => s >= 1 ? 1 : 0), c1 = lerp3([XT, RT, ZT + .1], CT, u1), a1 = K.tw(st, e, s => s === 0 || s === 4 ? 0 : s === 1 || s === 3 ? 1 : .45);
    K.comb(R, c1, S.emb.tok, { wd: W * .95, h: .42, c: P.c1, a: a1 });
    K.lab(R, [CT[0], 0, CT[2]], 'token row: 256 numbers · norm ' + S.emb_norm.tok.toFixed(2), { mono: true, fs: 12, c: P.c1, b: 1, dy: 18, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    // 3. the position row comes out of its table
    const u2 = K.tw(st, e, s => s >= 2 ? 1 : 0), c2 = lerp3([XP, RP, ZT + .1], CP, u2), a2 = K.tw(st, e, s => s < 2 || s === 4 ? 0 : 1);
    K.comb(R, c2, S.emb.pos, { wd: W * .95, h: .42, m: Math.max(...S.emb.tok.map(Math.abs)), c: P.c6, a: a2 });
    K.lab(R, [CP[0], 0, CP[2]], 'position row · norm ' + S.emb_norm.pos.toFixed(2), { mono: true, fs: 12, c: P.c6, b: 1, dy: 18, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    K.tile(R, [TXP, 0, TZI], null, { w: 1.3, d: .5, a: K.tw(st, e, s => s === 2 ? 1 : 0) });
    K.lab(R, [TXP, .1, TZI + .25], 'position 157', { serif: true, fs: 13.5, b: 1, dy: 20, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    if (k === 2) R.flow([[TXP, .12, TZI - .2], [lerp(TXP, XP, .6), RP * .7, .1], [XP, RP, ZT + .05]], { c: P.c2, a: e, r: .06, speed: 1.4 });
    // 4. their sum: what block 1 reads
    const a3 = K.tw(st, e, s => s === 3 ? 1 : 0);
    if (a3 > .01) { K.comb(R, CX, S.emb.x, { wd: W * .95, h: .42, c: mix(P.c1, P.c6, .5), a: a3 });
      if (k === 3) { R.flow([[CT[0] + .9, CT[1] - .1, CT[2]], [CX[0] - .9, CX[1] + .1, CX[2]]], { c: P.c1, a: .9, r: .06 }); R.flow([[CP[0] - .9, CP[1] - .1, CP[2]], [CX[0] + .9, CX[1] + .1, CX[2]]], { c: P.c6, a: .9, r: .06 }); } }
    K.lab(R, [CX[0], 0, CX[2]], 'x = token + position · norm ' + S.emb_norm.x.toFixed(2), { mono: true, fs: 12.5, b: 1, dy: 18, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    // 5. the running sequence as a strip of 256 cells: every "o" reads row 79
    const sA = K.tw(st, e, s => s === 4 ? 1 : 0);
    if (sA > .01) { for (let j = 0; j < 256; j++) { const o = os.includes(j), w = 9.2 / 256 * .42;
        R.quad([[SX(j) - w, .01, ZS - .14], [SX(j) + w, .01, ZS - .14], [SX(j) + w, .01, ZS + .14], [SX(j) - w, .01, ZS + .14]], { fill: o ? P.c2 : mix(P.paper, P.ink, .25), a: sA * (o ? 1 : .7), edge: false }); }
      os.forEach(j => R.flow([[XT + (SX(j) - XT) * .15, RT, ZT + .05], [lerp(XT, SX(j), .5), RT * .7, .6], [SX(j), .05, ZS]], { c: P.c2, a: sA * .8, r: .045, n: 7, speed: 1.3 })); }
    K.lab(R, [SX(255), 0, ZS], 'the running sequence: ' + os.length + ' tokens are "o"', { mono: true, fs: 12.5, b: 1, c: P.c2, al: 'right', dy: 18, a: K.la(st, e, s => s === 4 ? 1 : 0) });
  }
  const full = { cam: [.1, .42], bounds: [[-4.9, 0, -1.4], [4.9, 3.5, 2.6]] };
  S3.stage({ id: 'stg-emb', list: 'sx-emb', fig: 'Fig. 2 · "o" at position 157 becomes a vector', cam: full.cam, bounds: full.bounds, aspect: .62, margin: K.margin, dur: 1500, hold: 4600, draw,
    view: k => k <= 1 ? { cam: [.3, .38], bounds: [[-4.8, 0, -1.4], [-.6, 3.5, 2.2]] } : k === 2 ? { cam: [-.3, .38], bounds: [[.6, 0, -1.4], [4.8, 3.5, 2.2]] } : k === 4 ? { cam: [.08, .62], bounds: [[-4.9, 0, -1.4], [4.9, 3.5, 3.1]] } : full });
})();
