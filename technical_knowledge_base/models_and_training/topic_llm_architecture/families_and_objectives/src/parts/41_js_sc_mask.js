// ---- Scene (section 1, Fig. 2): one block, four masks. The first 12 tokens of the running sequence (FOD.rs.pieces) as a 12 x 12 field:
// row i is query i (back to front), column j key j; a raised cell may be read (blue: self-attention, purple: cross-attention to the encoder),
// a flat cell is masked. Dots stream from every key the marked query may read. Step 5 is the measured mask swap (FOD.masks.swap):
// the reference tiny GPT, trained causally, evaluated under three masks, first and last 128 positions of each 256-token window. ----
(function () {
  if (!document.getElementById('stg-mask') || !window.FOS) return;
  const { mix } = S3, { tw, la, lab, tok } = FOS, D = FOD, SW = D.masks.swap;
  const P12 = D.rs.pieces.slice(0, 12).map(tok), n = 12, CS = .42, X0 = -(n - 1) / 2 * CS, x = j => X0 + j * CS, z = i => X0 + i * CS, HC = .34;
  const PRE = 5, ENC = 6;
  // which keys query q may read under each mask: 0 masked, 1 self-attention, 2 cross-attention
  const MODE = ['causal', 'bidir', 'prefix', 'encdec', 'causal'];
  function cell(m, q, k) { if (m === 'causal') return k <= q ? 1 : 0; if (m === 'bidir') return 1; if (m === 'prefix') return (k <= q || k < PRE) ? 1 : 0;
    if (q < ENC) return k < ENC ? 1 : 0; return k < ENC ? 2 : (k <= q ? 1 : 0); }
  const QS = [9, 2, 2, 9, 9];                       // the marked query per step (illustrative choice)
  const CNT = m => { let c = 0; for (let q = 0; q < n; q++) for (let k = 0; k < n; k++) c += cell(m, q, k) ? 1 : 0; return c; };
  const NOTE = ['causal · ' + CNT('causal') + ' of 144 cells', 'bidirectional · ' + CNT('bidir') + ' of 144 cells', 'prefix LM, prefix 5 · ' + CNT('prefix') + ' of 144 cells', 'encoder-decoder · encoder 6, decoder 6', ''];
  // the mask swap: three masks, first and last 128 positions, to one scale
  const GR = [['causal', 'causal (as trained)'], ['bidir', 'bidirectional'], ['prefix128', 'prefix 128']], LX = g => 3.55 + g * 1.05, HS = 1.9 / 4.6;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.4, 6.4, -2.9, 2.9, .5);
    const ga = tw(st, e, s => s === 4 ? 0 : 1), gl = la(st, e, s => s === 4 ? 0 : 1), qq = QS[k], qp = QS[st.pk == null ? k : st.pk];
    // the field: heights glide from the last step's mask to this one's
    for (let q = 0; q < n; q++) for (let j = 0; j < n; j++) {
      const c0 = cell(MODE[st.pk == null ? k : st.pk], q, j), c1 = cell(MODE[k], q, j), h = e >= 1 ? (c1 ? HC : 0) : (c0 ? HC : 0) + ((c1 ? HC : 0) - (c0 ? HC : 0)) * e;
      const kind = c1 || c0, hot = q === qq, base = kind === 2 ? P.c4 : P.acc;
      if (h > .02) R.box([x(j), 0, z(q)], [CS * .86, h, CS * .86], { fill: mix(P.paper, base, hot ? .85 : .42), a: ga, shadow: false, lw: .6 });
      else R.box([x(j), 0, z(q)], [CS * .86, .015, CS * .86], { fill: P.soft, a: ga * .9, shadow: false, ea: .25, lw: .5 });
    }
    // the boundary of the prompt (prefix LM) or of the encoder input (encoder-decoder)
    const bd = tw(st, e, s => s === 2 ? PRE : s === 3 ? ENC : 0), ba = la(st, e, s => s === 2 || s === 3 ? 1 : 0) * ga;
    if (ba > .01 && bd > 0) { const b = X0 + (bd - .5) * CS; R.line([[b, .01, z(0) - CS / 2], [b, .01, z(n - 1) + CS / 2]], { c: P.bad, w: 2, dash: [5, 4], a: ba }); R.line([[x(0) - CS / 2, .01, b], [x(n - 1) + CS / 2, .01, b]], { c: P.bad, w: 2, dash: [5, 4], a: ba }); }
    // keys along the back, queries down the left
    P12.forEach((w, j) => lab(R, [x(j), 0, z(0) - CS * 2.4], w, { mono: true, fs: 12, c: P.mute, dy: j % 2 ? -16 : 0, a: gl, wide: 1 }));
    P12.forEach((w, q) => lab(R, [x(0) - CS * 1.15, 0, z(q)], w, { mono: true, fs: 12, al: 'right', c: q === qq && ga > .5 ? P.ink : P.mute, b: q === qq && ga > .5, a: gl, grp: 'rows' }));
    lab(R, [x(n - 1) + CS * .6, 0, z(0) - CS * 1.2], 'keys →', { fs: 12, al: 'left', c: P.mute, a: gl, wide: 1 });
    // the marked query: a ball at its row's left end; dots stream to it from every key it may read
    const fa = (e < 1 && qp !== qq ? Math.max(0, 2 * e - 1) : 1) * (k === 4 ? 0 : 1) * (st.pk === 4 && e < 1 ? e : 1);
    if (fa > .01) { const tgt = [x(0) - CS * .55, HC + .12, z(qq)]; R.ball(tgt, .09, { c: P.bad, a: fa });
      for (let j = 0; j < n; j++) { const c = cell(MODE[k], qq, j); if (!c) continue; R.flowArc([x(j), HC + .05, z(0) - CS * .5], tgt, .55 + .03 * j, { c: c === 2 ? P.c4 : P.acc, a: fa * .9, r: .05, n: 6, speed: 1.4 }); } }
    [...new Set([st.pk == null ? k : st.pk, k])].forEach(s => { const a = la(st, e, t => t === s ? 1 : 0); if (a > .01 && NOTE[s]) lab(R, [0, 0, z(n - 1) + CS * .6], NOTE[s], { fs: 13, b: 1, c: P.ink, dy: 16, a: a * ga }); });
    // step 5: the same weights under three masks, measured
    const ca = tw(st, e, s => s === 4 ? 1 : 0), cla = la(st, e, s => s === 4 ? 1 : 0);
    if (ca > .01) {
      GR.forEach(([key, nm], g) => { const v = SW[key];
        [['held_out_first128', P.c1, -.2], ['held_out_last128', P.c6, .2]].forEach(([f, c, dx]) => { const h = v[f] * HS * ca;
          FOS.col(R, [LX(g) + dx, 0, 0], h, .32, { fill: mix(P.paper, c, .75), a: ca, shadow: false });
          lab(R, [LX(g) + dx, h + .06, 0], v[f].toFixed(2), { mono: true, fs: 12, b: 1, c: P.ink, dy: -9, a: cla }); });
        lab(R, [LX(g), 0, .3], nm, { fs: 12.5, b: 1, c: key === 'causal' ? P.good : P.ink, dy: 14, a: cla }); });
      const yh = SW.causal.held_out * HS; R.glass([LX(0) - .5, yh + .05, -.35], [LX(2) - LX(0) + 1, 0, 0], [0, 0, .7], { c: P.good, a: ca * .8, nu: 6, nv: 1, th: .01 });
      lab(R, [LX(0) - .5, yh + .05, 0], 'as trained ' + SW.causal.held_out.toFixed(3), { fs: 12, c: P.good, al: 'right', dx: -6, a: cla, wide: 1 });
      lab(R, [LX(0) - .5, 0, 0], 'first 128', { fs: 12, c: P.c1, al: 'right', dx: -6, dy: -26, a: cla, wide: 1 });
      lab(R, [LX(0) - .5, 0, 0], 'last 128', { fs: 12, c: P.c6, al: 'right', dx: -6, dy: -10, a: cla, wide: 1 });
    }
  }
  const full = { cam: [.18, .78], bounds: [[-3.6, 0, -2.9], [2.8, .5, 2.9]] };
  S3.stage({ id: 'stg-mask', list: 'sx-mask', fig: 'Fig. 2 · one block, four masks, 12 tokens', cam: full.cam, bounds: [[-3.6, 0, -2.9], [6.3, 2, 2.9]], aspect: .72, dur: 1400, hold: 4800, draw,
    margin: w => w < 520 ? [26, 8, 30, 8] : [34, 18, 40, 18],
    view: k => k === 4 ? { cam: [.12, .32], bounds: [[2.0, 0, -.6], [6.2, 2.0, .6]] } : full });
})();
