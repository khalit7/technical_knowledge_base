// ---- Scene (top, Fig. 1): one token through one MoE layer, from the recorded router logits of the trained moe8top2 tiny GPT
// (token 1 of the running sequence, "Once", layer 1: MXD.runs.moe8.seq.logits8[0][0]); softmax, top 2, gates renormalised over the two.
// Expert sizes are the tiny GPT's (2 x 256 x 512 = 262,144 weights each). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.MXS) return;
  const { D, ec, la, lab, int, M } = MXS, { mix } = S3;
  const r = D.runs.moe8.seq, lg = r.logits8[0][0], E = lg.length, K = r.k, mx = Math.max(...lg), Z = lg.reduce((a, v) => a + Math.exp(v - mx), 0);
  const p = lg.map(v => Math.exp(v - mx) / Z), pm = Math.max(...p), top = [...p.keys()].sort((a, b) => p[b] - p[a]).slice(0, K);
  const sp = top.reduce((a, i) => a + p[i], 0), g = top.map(i => p[i] / sp);
  const W1 = 2 * 256 * 512, word = M.piece(1).trim();
  const X = i => (i - (E - 1) / 2) * 1.2, ZE = -1.1, ZB = .9, ZR = 2.6, ZT = 3.9, TOK = [-1.7, .32, ZT], OUT = [1.7, .32, ZT];
  const on = i => top.includes(i);
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.6, 5.6, -2.2, 4.4, .5);
    const L = f => la(st, e, f);
    // the experts: all eight stored; from step 3 the two chosen are coloured and the rest recede until the last step
    for (let i = 0; i < E; i++) {
      const lit = k >= 2 && on(i), a = k === 1 ? .55 : k >= 2 && k < 4 && !on(i) ? .3 : 1;
      R.box([X(i), 0, ZE], [.86, .86, .86], { fill: lit ? mix(P.paper, ec(i), .8) : P.paper, a });
      lab(R, [X(i), .86, ZE], 'E' + i, { fs: 12.5, b: lit, dy: -10, c: lit ? P.ink : P.mute, a: L(kk => kk === 1 || kk === 2 ? 0 : kk === 3 && !on(i) ? .5 : 1) });
    }
    lab(R, [X(0) - .5, .43, ZE], '8 experts · ' + int(W1) + ' weights each', { al: 'right', dx: -8, fs: 12.5, c: P.mute, a: L(kk => kk === 0 ? 1 : 0), wide: 1 });
    // the token, and later its output
    R.ball(TOK, .2, { c: P.acc });
    lab(R, TOK, '"' + word + '" · h, 256 numbers', { fs: 12.5, b: 1, dy: 24, c: P.acc });
    // the router: a 256 x 8 glass plate; dots carry h through it to the eight scores
    const ga = L(kk => kk === 1 ? 1 : kk === 2 ? .35 : 0);
    if (ga > .01) { R.glass([-2.3, .1, ZR], [4.6, 0, 0], [0, .5, 0], { c: P.c1, a: ga, nu: 8, nv: 4 });
      lab(R, [2.3, .35, ZR], 'router Wᵣ · 256 × 8', { al: 'left', dx: 10, fs: 12.5, b: 1, c: P.c1, a: L(kk => kk === 1 ? 1 : 0), wide: 1 }); }
    if (k === 1) for (let i = 0; i < E; i++) R.flow([TOK, [X(i) * .5, .35, ZR], [X(i), .3, ZB + .2]], { c: P.c1, a: e, r: .045, n: 7, speed: 1.3 });
    // the eight scores as bars in front of their experts
    const ba = k >= 1 && k <= 3 ? 1 : 0;
    for (let i = 0; i < E; i++) {
      const hh = 1.05 * p[i] / pm * (k === 1 ? e : 1), keep = on(i), a = k === 1 ? 1 : keep ? (k === 3 ? .5 : 1) : .22;
      if (ba) R.box([X(i), 0, ZB], [.5, Math.max(.02, hh), .32], { fill: k === 1 || keep ? mix(P.paper, ec(i), k === 1 ? .55 : .9) : P.paper, a, shadow: false });
      lab(R, [X(i), hh, ZB], (k === 2 && keep ? 'E' + i + ' ' : '') + p[i].toFixed(2), { mono: true, fs: 12, b: keep, dy: -11, c: keep ? P.ink : P.mute, a: L(kk => kk === 1 && (keep || R.W >= 520) ? 1 : kk === 2 && keep ? 1 : 0) });
    }
    lab(R, [X(0) - .4, .3, ZB], 'softmax scores', { al: 'right', dx: -8, fs: 12.5, c: P.mute, a: L(kk => kk === 1 || kk === 2 ? 1 : 0), wide: 1 });
    // dispatch to the two chosen experts and combine their outputs, the dots' density following the gate weights
    if (k >= 3) {
      const fa = k === 3 ? Math.min(1, e * 1.5) : .55;
      top.forEach((i, j) => {
        R.flowArc(TOK, [X(i), .86, ZE], 1.1, { c: P.acc, a: fa, r: .05, n: 10, speed: 1.5 });
        R.flowArc([X(i), .86, ZE], OUT, 1.3, { c: ec(i), a: fa * (.35 + .65 * g[j]), r: .04 + .05 * g[j], n: Math.round(4 + 14 * g[j]), speed: 1.3 });
        lab(R, [X(i), .86, ZE], 'g ' + g[j].toFixed(2), { mono: true, fs: 12.5, b: 1, dy: -28, c: P.ink, a: L(kk => kk >= 3 ? 1 : 0) });
      });
      R.ball(OUT, .2, { c: P.acc, a: k === 3 ? e : 1 });
    }
    lab(R, OUT, 'y = h + ' + g[0].toFixed(2) + ' · E' + top[0] + '(h) + ' + g[1].toFixed(2) + ' · E' + top[1] + '(h)', { mono: true, fs: 12.5, b: 1, dy: R.W < 520 ? 44 : 24, c: P.ink, a: L(kk => kk === 3 ? 1 : 0) });
    // the bill: memory pays for all eight, compute for two
    const ba2 = L(kk => kk === 4 ? 1 : 0);
    if (ba2 > .01) {
      const y0 = .02, z0 = ZE + .75;
      R.line([[X(0) - .45, y0, z0], [X(E - 1) + .45, y0, z0]], { c: P.mute, w: 1.5, a: ba2 });
      lab(R, [0, 0, z0], 'stored: all 8 = ' + int(E * W1) + ' weights', { fs: 12.5, b: 1, dy: 16, c: P.mute, a: ba2 });
      lab(R, OUT, 'computed: 2 = ' + int(K * W1) + ', the dense FFN', { fs: 12.5, b: 1, dy: R.W < 520 ? 44 : 24, c: P.acc, a: ba2 });
    }
  }
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one recorded token, one MoE layer', cam: [.22, .62], bounds: [[-5.1, 0, -1.6], [5.1, 1.2, 4.2]], aspect: .47, dur: 1500, hold: 4600, draw,
    view: k => { const ph = (document.getElementById('stg-hero') || {}).clientWidth < 520; // on a phone the camera turns the row into depth so the experts draw larger
      return k === 1 || k === 2 ? { cam: ph ? [.42, .66] : [.12, .5], bounds: [[-5, 0, -.2], [5, 1.2, 4.1]] } : ph ? { cam: [.42, .72] } : null; },
    margin: w => w < 520 ? [14, 10, 18, 10] : [30, 16, 30, 110] });
})();
