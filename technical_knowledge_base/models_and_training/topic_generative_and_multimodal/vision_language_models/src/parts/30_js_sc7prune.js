// ---- Scene (section 8a, Fig. 7): SmolVLM's 1,088 image tokens for the 512 x 512 cat (16 tiles and the global view, 64 tokens each, over
// the processor's own views) cut before the language model without retraining: FastV's attention ranking at a quarter (the 272 tokens it
// kept for "How many cats are in this image?", VM_DATA.runs.smol.reduce.attn_keep_cat), 2 x 2 average pooling, dropping the global view,
// then the right answers of 30 under every setting (reduce.right). ----
(function () {
  if (!document.getElementById('stg-prune') || !window.VMK) return;
  const K = VMK, { tw, la, lab, img, mix, lerp } = K, D = K.D, RD = D.runs.smol && D.runs.smol.reduce; if (!RD) return;
  const cat = K.saw('p01_cat'), th = cat.smol[0].thumbs, kept = new Set(RD.attn_keep_cat.kept), right = RD.right;
  const TS = .9, TG = .1, X0 = -3.9, Z0 = -2.1, GX = 1.0, GZ = -.45;
  const per = new Array(17).fill(0); RD.attn_keep_cat.kept.forEach(i => per[Math.floor(i / 64)]++);
  const first4 = per[0] + per[1] + per[2] + per[3];
  // view v's corner (x, z of its top-left on the floor)
  const corner = v => v < 16 ? [X0 + (v % 4) * (TS + TG), Z0 + Math.floor(v / 4) * (TS + TG)] : [GX, GZ];
  const COLS = [['full', 'all 1,088', 'acc'], ['random 50%', 'random ½', 'c5'], ['random 25%', 'random ¼', 'c5'], ['random 12.5%', 'random ⅛', 'c5'], ['attention 50%', 'attention ½', 'c4'],
    ['attention 25%', 'attention ¼', 'c4'], ['attention 12.5%', 'attention ⅛', 'c4'], ['pool 2x2', 'pool 2 × 2', 'c3'], ['tiles only', 'no global', 'c2']];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 4.8, -2.6, 3.4, .5);
    const base = tw(st, e, s => s === 4 ? .18 : 1), u = st.pk === k ? 1 : e;
    // each view: the processor's view under its 8 x 8 tokens (4 x 4 when pooled)
    for (let v = 0; v < 17; v++) { const [x, z] = corner(v), glob = v === 16, gone = s => glob && s === 3 ? 1 : 0, lift = lerp(gone(st.pk), gone(k), u);
      const y = .03 + lift * 1.4, va = base * (1 - .85 * lift);
      img(R, K.pic(th[v]), [x, y, z + TS], [TS, 0, 0], [0, 0, -TS], { a: va * .9, sub: 2, rim: .03 });
      const pool = s => s === 2 ? 1 : 0, pl = lerp(pool(st.pk), pool(k), u), n = pl > .5 ? 4 : 8, cs = TS / n, c = glob ? P.c5 : P.acc;
      for (let i = 0; i < n * n; i++) { const r = Math.floor(i / n), cc = i % n, idx = v * 64 + r * 8 + cc;
        const out = s => s === 1 && !kept.has(idx) ? 1 : 0, lo = n === 8 ? lerp(out(st.pk), out(k), u) : 0, yy = y + .01 + lo * .9, a = va * (1 - .9 * lo);
        if (a <= .02) continue; const x0 = x + cc * cs + cs * .1, z0 = z + r * cs + cs * .1, w = cs * .8;
        R.quad([[x0, yy, z0], [x0 + w, yy, z0], [x0 + w, yy, z0 + w], [x0, yy, z0 + w]], { fill: mix(P.paper, c, .75), a: a * .78, edge: false, dz: -.02 }); } }
    const l = s => la(st, e, q => q === s ? 1 : 0), top = [X0 + 2 * (TS + TG) - TG / 2, 1.3, Z0 - .2];
    lab(R, top, '16 tiles + global view = 1,088 tokens: ' + right.full + ' of 30 right', { fs: 13, b: 1, c: P.acc, dy: -14, a: l(0) });
    lab(R, top, 'attention-ranked quarter: 272 kept, ' + first4 + ' in the first 4 tiles: ' + right['attention 25%'] + ' of 30', { fs: 13, b: 1, c: P.c4, dy: -14, a: l(1) });
    lab(R, top, '2 × 2 average pooling: 272 tokens, ' + right['pool 2x2'] + ' of 30', { fs: 13, b: 1, c: P.c3, dy: -14, a: l(2) });
    lab(R, top, 'global view dropped, 1,024 tile tokens kept: ' + right['tiles only'] + ' of 30', { fs: 13, b: 1, c: P.c2, dy: -14, a: l(3) });
    lab(R, [GX + TS / 2, .05, GZ + TS], 'global view', { fs: 12, c: P.c5, dy: 14, a: tw(st, e, s => s === 0 ? 1 : 0) });
    lab(R, [GX + TS / 2, .05, GZ + TS], per[16] + ' kept', { fs: 12, b: 1, c: P.c5, dy: 14, a: l(1) });
    // the right answers of 30 under every setting
    const ca = tw(st, e, s => s === 4 ? 1 : 0);
    if (ca > .01) COLS.forEach(([key, name, c], i) => { const x = -3.9 + i * .95, h = right[key] / 30 * 2.2 * (st.pk < 4 ? e : 1);
      R.box([x, 0, 2.6], [.55, Math.max(.02, h), .55], { fill: mix(P.paper, P[c], .7), a: ca });
      lab(R, [x, h, 2.6], String(right[key]), { mono: 1, fs: 13, b: 1, c: P[c], dy: -14, a: l(4) });
      lab(R, [x, 0, 2.9], name, { fs: 12, dy: i % 2 ? 30 : 14, a: l(4) }); });
  }
  const st = S3.stage({ id: 'stg-prune', list: 'sx-prune', fig: 'Fig. 7 · SmolVLM’s 1,088 image tokens, cut four ways', cam: [.3, .85], bounds: [[-4, 0, -2.2], [2.1, 1.3, 1.9]], aspect: .62, dur: 1500, hold: 4800, draw, margin: K.margin,
    view: k => k === 4 ? { cam: [.12, .38], bounds: [[-4.3, 0, 2.2], [4.0, 2.5, 3.1]] } : null });
  K.onPic(() => st && st.draw());
})();
