// ---- Scene (section 10, Fig. 14): stack shape. Step 1: five ordinary stacks to scale, height the layer count (AG row .L) and footprint the
// hidden size (row .D). Steps 2 to 4: the three shapes that break "one layer, one cache": Ouro's 4 passes (row .passes), Gemma 4 E2B's
// shared layers (row .shared; in transformers' modeling_gemma4.py the last unshared layer of each type keeps the keys and values the shared
// layers of that type read), LongCat-Flash-Lite's two MLA sublayers per config layer (row .L counts sublayers, fields.num_layers the
// config's layers). Step 5: config layers against caches per token for the five cases of the old 2D chart. ----
(function () {
  if (!document.getElementById('stg-stack') || !window.AGS) return;
  const { lab, mc, B, nm, row, int, cl, tw, la } = AGS;
  const BASE = ['Llama 3.1 8B', 'Gemma 3 27B', 'DeepSeek V3', 'Llama 3.1 70B', 'Kimi K3'].map(row);
  const OURO = row('Ouro-Thinking 2.6B'), E2B = row('Gemma 4 E2B'), LC = row('LongCat-Flash-Lite 68.5B-A3B');
  const CASES = [['Ouro-Thinking 2.6B', '4 passes'], ['Nanbeige 4.2 3B', '2 passes'], ['LongCat-Flash-Lite 68.5B-A3B', '2 sublayers'], ['Gemma 4 E4B', 'last 18 shared'], ['Gemma 4 E2B', 'last 20 shared']].map(([n, w]) => [row(n), w]);
  const cfgL = r => (r.fields && (r.fields.num_hidden_layers || r.fields.num_layers)) || r.L, kept = r => (r.L - (r.shared || 0)) * (r.passes || 1);
  const DY = .036, TH = .026, WS = 1.5 / 8192, side = r => Math.max(.24, r.D * WS);
  function base(R, P, a) {
    const X = [-3.6, -1.9, 0, 1.9, 3.8];
    BASE.forEach((r, m) => { const s = side(r), x = X[m];
      for (let i = 0; i < r.L; i++) R.box([x, i * DY, 0], [s, TH, s], { fill: mc(P, r.mix[i]), a, shadow: i === 0, lw: .5 });
      const sg = R.W < 520 && m % 2 ? 42 : 0;   // on a phone, every other name sits lower so neighbours never overlap
      lab(R, [x, 0, s / 2 + .2], nm(r.n), { fs: 12.5, b: 1, dy: 14 + sg, c: P.ink, a });
      lab(R, [x, 0, s / 2 + .2], r.L + ' × ' + int(r.D), { mono: true, fs: 12, dy: 30 + sg, c: P.mute, a }); });
    lab(R, [-4.4, 3.35, 0], 'height: layers · width: hidden size', { fs: 12.5, al: 'left', c: P.mute, a });
  }
  function ouro(R, P, a) {
    const r = OURO, s = side(r) * 1.6, top = r.L * DY, x0 = -1.2;
    for (let i = 0; i < r.L; i++) R.box([x0, i * DY, 0], [s, TH, s], { fill: mc(P, 'G'), a, shadow: i === 0, lw: .5 });
    const z1 = s / 2 + .12, z0 = -s / 2 - .12;
    R.flow([[x0, .02, z1], [x0, top, z1], [x0, top + .18, 0], [x0, top, z0], [x0, .02, z0], [x0, -.0, 0], [x0, .02, z1]], { c: P.acc, a: a * .9, r: .045, n: 26, speed: 1.6 });
    lab(R, [x0, top, 0], '48 layers, run 4 times per token', { fs: 12.5, b: 1, dy: -26, c: P.ink, a });
    for (let p = 0; p < r.passes; p++) { const x = .4 + p * .62; for (let i = 0; i < r.L; i++) R.box([x, i * DY, 0], [.34, TH, .34], { fill: P.c1, a: a * (.55 + .15 * p), shadow: i === 0, lw: .4 });
      lab(R, [x, 0, .3], 'pass ' + (p + 1), { fs: 12, dy: 14, c: P.mute, a });
      R.flowArc([x0 + s / 2, top * (p + .5) / r.passes, 0], [x, top * (p + .5) / r.passes, 0], .2, { c: P.c1, a: a * .7, r: .035, n: 5, speed: 1.2 }); }
    lab(R, [1.33, top, 0], r.passes + ' × ' + B(r.kv / r.passes) + ' = ' + B(r.kv) + ' per token', { mono: true, fs: 12.5, b: 1, dy: -26, c: P.c1, a });
  }
  function e2b(R, P, a) {
    const r = E2B, s = side(r) * 2.4, own = r.L - r.shared, x0 = -.6, lastOf = c => r.mix.slice(0, own).lastIndexOf(c);
    for (let i = 0; i < r.L; i++) { const c = r.mix[i], y = i * DY * 1.4;
      if (i < own) R.box([x0, y, 0], [s, TH, s], { fill: mc(P, c), a, shadow: i === 0, lw: .5 });
      else { R.box([x0, y, 0], [s, TH, s], { fill: P.paper, fa: .1, ec: mc(P, c), ea: .85, a, shadow: false, lw: .6 });
        const j = lastOf(c); R.flowArc([x0 + s / 2, y + TH / 2, 0], [x0 + s / 2, j * DY * 1.4 + TH / 2, 0], .0, { c: mc(P, c), a: a * .55, r: .03, n: 3, speed: .8 }); } }
    lab(R, [x0 + s / 2, (own + r.shared / 2) * DY * 1.4, 0], r.shared + ' layers read an earlier cache (hollow)', { fs: 12.5, al: 'left', dx: 26, c: P.ink, a, wide: 1 });
    lab(R, [x0 + s / 2, own / 2 * DY * 1.4, 0], own + ' layers keep their own: ' + B(r.kv) + ' per token', { fs: 12.5, b: 1, al: 'left', dx: 26, c: P.c6, a, wide: 1 });
  }
  function longcat(R, P, a) {
    const r = LC, n = cfgL(r), s = side(r) * 1.8, x0 = -.6, H = .17;
    for (let i = 0; i < n; i++) { const y = i * (H + .05);
      R.box([x0, y, 0], [s + .12, H, s + .12], { fill: P.paper, fa: .08, ec: P.mute, ea: .6, a, shadow: i === 0, lw: .6 });
      R.box([x0 - s / 4, y + .03, 0], [s / 2 - .04, H - .06, s], { fill: mc(P, 'M'), a, shadow: false, lw: .5 });
      R.box([x0 + s / 4, y + .03, 0], [s / 2 - .04, H - .06, s], { fill: mc(P, 'M'), a, shadow: false, lw: .5 }); }
    lab(R, [x0 + s / 2 + .1, n * (H + .05) * .6, 0], n + ' layers in the config, two MLA sublayers each', { fs: 12.5, al: 'left', dx: 14, c: P.ink, a, wide: 1 });
    lab(R, [x0 + s / 2 + .1, n * (H + .05) * .4, 0], r.L + ' caches × ' + int(r.per.M) + ' B = ' + B(r.kv) + ' per token', { mono: true, fs: 12.5, b: 1, al: 'left', dx: 14, c: P.c3, a, wide: 1 });
  }
  function totals(R, P, a) {
    const YS = 2.6 / 200;
    CASES.forEach(([r, why], m) => { const x = -3.2 + m * 1.6, c0 = cfgL(r), c1 = kept(r);
      AGS.col(R, [x - .25, 0, 0], c0 * YS, .36, { fill: P.mute, a });
      AGS.col(R, [x + .25, 0, 0], c1 * YS, .36, { fill: P.c1, a });
      lab(R, [x - .25, c0 * YS + .05, 0], String(c0), { mono: true, fs: 12, dy: -10, c: P.mute, a });
      lab(R, [x + .25, c1 * YS + .05, 0], String(c1), { mono: true, fs: 12.5, b: 1, dy: -10, c: P.c1, a });
      const sg = R.W < 520 && m % 2 ? 30 : 0;
      lab(R, [x, 0, .5], nm(r.n), { fs: 12, b: 1, dy: 12 + sg, c: P.ink, a }); lab(R, [x, 0, .5], why, { fs: 12, dy: 28, c: P.mute, a, wide: 1 }); });
    lab(R, [-4.2, 3.4, 0], 'grey: layers in the config · blue: caches per token', { fs: 12.5, al: 'left', c: P.ink, a });
  }
  const SC = [base, ouro, e2b, longcat, totals];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.8, 4.8, -1.6, 1.8, .5);
    if (st.pk === k || e >= 1) SC[k](R, P, 1); else if (e < .5) SC[st.pk](R, P, 1 - 2 * e); else SC[k](R, P, cl(2 * e - 1, 0, 1));
  }
  const views = [{ cam: [.18, .26], bounds: [[-4.6, 0, -.8], [4.8, 3.4, 1.2]] }, { cam: [.4, .3], bounds: [[-2.2, 0, -.6], [3.4, 2.1, .9]] },
    { cam: [.45, .3], bounds: [[-1.4, 0, -.8], [2.9, 1.75, .9]] }, { cam: [.45, .35], bounds: [[-1.4, 0, -.8], [3.0, 3.1, .9]] }, { cam: [.2, .3], bounds: [[-4.4, 0, -.6], [4.2, 3.45, 1.2]] }];
  S3.stage({ id: 'stg-stack', list: 'sx-stack', fig: 'Fig. 14 · layers in the config are not caches per token', cam: views[0].cam, bounds: views[0].bounds, aspect: .62, dur: 1800, hold: 5200, draw,
    margin: w => w < 520 ? [16, 8, 80, 8] : [24, 30, 56, 30], view: k => views[k] });
})();
