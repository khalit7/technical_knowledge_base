// ---- Fig. 4: many heads in one matrix multiply, layer 1 of the trained tiny GPT, row 157 ("o"). One (256, 256) W_q makes all 8 heads' queries;
// .view cuts the 256 numbers into 8 heads of 32; .transpose stacks the heads as a batch, each with its own weights over the 158 keys (TZS.l1_attn);
// each head's 32-number output; the merge and W_o into attention's output (TZS.l1.head_out, attn_out). Every number is the trace's. ----
(function () {
  if (!document.getElementById('stg-heads') || !window.TZK) return; const K = TZK, S = TZS, { lerp, lerp3, mix } = S3;
  const NH = 8, hd = 32, nk = S.pos + 1, HC = K.HC, Wq = 2.6;
  const XQ = -2.6, ZIN = .9, ZPL = 1.85, ZQ = 2.85, LX = -4.15, LZ = h => -.4 - h * .6, FX0 = -3.55, FDX = 5.6 / nk, OX = 2.85, MX = 3.4, MZ = .9, ZO = 1.85, ZA = 2.85, HS = 1.25;
  const q = S.l1.q, ho = S.l1.head_out, wmax = Math.max(...S.l1_attn.flat()), mq = Math.max(...q.map(Math.abs)), mo = Math.max(...ho.map(Math.abs));
  const seg = h => q.slice(h * hd, h * hd + hd), oseg = h => ho.slice(h * hd, h * hd + hd);
  const sw = Wq / NH, gap = .12, segX = (h, g) => XQ + (h - (NH - 1) / 2) * (sw + g);
  const desc = h => { const a = S.l1_attn[h], j = a.indexOf(Math.max(...a)), ent = S.l1_entropy[h];
    if (h === 4) return 'h4: the earlier "x" tokens ' + Math.round(a.reduce((s, x, i) => s + (TZD.pieces[i] === 'x' ? x : 0), 0) * 100) + '%';
    return ent > 6 ? 'h' + h + ': spread, ' + ent.toFixed(1) + ' bits' : 'h' + h + ': ' + K.show(j) + ' ' + Math.round(a[j] * 100) + '%'; };
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.2, 5.4, -5.2, 3.6, .5);
    // 1. LN(x) through one (256, 256) W_q into the 256 queries of all 8 heads
    const iA = K.tw(st, e, s => s === 0 ? 1 : s === 1 ? .3 : 0);
    K.comb(R, [XQ, .45, ZIN], S.l1.norm1, { wd: Wq, h: .3, a: iA * .8, legs: 1 });
    K.plateZ(R, XQ, .1, ZPL, Wq, Wq * .7, { c: P.q, a: K.tw(st, e, s => s === 0 ? 1 : s === 1 ? .35 : 0), nu: 8, nv: 8 });
    K.lab(R, [XQ, .1 + Wq * .7, ZPL], 'W_q (256, 256): all 8 heads', { mono: true, fs: 12, b: 1, c: P.q, dy: -8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    K.lab(R, [XQ + Wq / 2, .45, ZIN], 'LN(x) of "o": 256', { mono: true, fs: 12, al: 'left', dx: 8, a: K.la(st, e, s => s === 0 ? 1 : 0) });
    if (k === 0) R.flow([[XQ, .6, ZIN + .1], [XQ, .7, ZPL], [XQ, .6, ZQ - .1]], { c: P.q, a: e, r: .06, n: 8 });
    // 2-3. the queries: one vector, cut into 8 segments, which then move into 8 lanes (the head axis next to the batch axis)
    for (let h = 0; h < NH; h++) {
      const g = K.tw(st, e, s => s >= 1 ? gap : 0), lane = K.tw(st, e, s => s >= 2 ? 1 : 0), back = K.tw(st, e, s => s >= 4 ? 1 : 0);
      const c0 = [segX(h, g), .5, ZQ], c1 = [LX, .45, LZ(h)], c = lerp3(c0, c1, lane), col = K.tw(st, e, s => s >= 1 ? 1 : 0);
      const qa = K.tw(st, e, s => s <= 2 ? 1 : s === 3 ? .7 : 0) * (k === 0 ? e : 1);
      K.comb(R, c, seg(h), { wd: sw * .92, h: .3, m: mq, c: mix(P.c2, HC[h], col), a: qa, plinth: true });
      // the head's weights over the 158 keys (real), then its output
      const wA = K.tw(st, e, s => s === 2 || s === 3 ? 1 : 0) * (k === 2 ? Math.max(0, 2 * e - 1) : 1);
      if (wA > .01) K.bars(R, FX0, FDX, LZ(h), 0, S.l1_attn[h].map(x => Math.sqrt(x / wmax) * HS), { c: HC[h], a: wA, min: Math.sqrt(.003 / wmax) * HS });
      const oA = K.tw(st, e, s => s === 3 ? 1 : 0);
      const oc = lerp3([OX, .45, LZ(h)], [MX + (h - (NH - 1) / 2) * sw, .5, MZ], back);
      const ob = K.tw(st, e, s => s === 3 || s === 4 ? 1 : s === 5 ? 0 : 0);
      if (ob > .01) K.comb(R, oc, oseg(h), { wd: sw * .92, h: .3, m: mo, c: HC[h], a: ob });
      if (k === 3) { const a = S.l1_attn[h], top = a.map((x, j) => [x, j]).sort((u, v) => v[0] - u[0]).slice(0, 3);
        top.slice(0, 2).forEach(([x, j]) => R.flowArc([FX0 + j * FDX, Math.sqrt(x / wmax) * HS + .02, LZ(h)], [OX - .1, .55, LZ(h)], .25, { c: HC[h], a: .3 + .7 * Math.min(1, x * 2), r: .035 + .04 * x, n: 4 + Math.round(x * 6), speed: 1.3 })); }
      K.lab(R, [FX0 + nk * FDX, .1, LZ(h)], desc(h), { mono: true, fs: 12, c: HC[h], b: 1, al: 'left', dx: 6, grp: 'lanes', a: K.la(st, e, s => s === 2 ? 1 : 0) });
    }
    K.lab(R, [XQ, .9, ZQ], 'q: 256 = 8 heads × 32', { mono: true, fs: 12.5, b: 1, dy: -10, a: K.la(st, e, s => s === 1 ? 1 : 0) });
    K.lab(R, [LX, .1, LZ(0)], '(1, 8, 256, 32)', { mono: true, fs: 12, dy: 18, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    K.lab(R, [FX0, 0, LZ(7)], 'keys 0 to 157 \u00b7 height \u221d \u221aweight', { mono: true, fs: 12, c: P.mute, al: 'left', dy: -14, a: K.la(st, e, s => s === 2 ? 1 : 0) });
    K.lab(R, [OX, .8, LZ(0)], 'each head: 32 numbers', { mono: true, fs: 12, b: 1, dy: -8, a: K.la(st, e, s => s === 3 ? 1 : 0) });
    // 5. merged, then W_o into attention's output for "o"
    const mA = K.tw(st, e, s => s === 4 ? 1 : 0) * (k === 4 ? Math.max(0, 2 * e - 1) : 1);
    if (mA > .01) { K.plateZ(R, MX, .1, ZO, Wq, Wq * .7, { c: P.c4, a: mA, nu: 8, nv: 8 });
      K.comb(R, [MX, .5, ZA], S.l1.attn_out, { wd: Wq, h: .35, c: P.c4, a: mA, legs: 1 });
      R.flow([[MX, .6, MZ + .1], [MX, .7, ZO], [MX, .6, ZA - .1]], { c: P.c4, a: mA, r: .06, n: 8 }); }
    K.lab(R, [MX - Wq / 2, .5, MZ], 'concat: 256', { mono: true, fs: 12, al: 'right', dx: -8, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    K.lab(R, [MX, .1 + Wq * .7, ZO], 'W_o (256, 256)', { mono: true, fs: 12, b: 1, c: P.c4, dy: -8, a: K.la(st, e, s => s === 4 ? 1 : 0) });
    K.lab(R, [MX + Wq / 2, .5, ZA], 'out · norm ' + S.l1_norm.attn_out.toFixed(2), { mono: true, fs: 12, b: 1, c: P.c4, al: 'left', dx: 8, a: K.la(st, e, s => s === 4 ? 1 : 0) });
  }
  const full = { cam: [.22, .62], bounds: [[-4.6, 0, -4.8], [5, 1.4, 3.2]] };
  S3.stage({ id: 'stg-heads', list: 'sx-heads', fig: 'Fig. 4 \u00b7 8 heads of layer 1, row 157', cam: full.cam, bounds: full.bounds, aspect: .72, margin: w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18], dur: 1500, hold: 4800, draw,
    view: k => k <= 1 ? { cam: [.25, .5], bounds: [[-4.3, 0, .4], [-.9, 1.6, 3.3]] } : k === 2 || k === 3 ? { cam: [.12, .7], bounds: [[-4.6, 0, -4.8], [4.4, 1.3, -.1]] } : k === 4 ? { cam: [.2, .5], bounds: [[1.4, 0, .2], [5.2, 1.6, 3.3]] } : full });
})();
