// ---- Scene (section 8, Fig. 12): one FFN layer as a field of expert blocks, the count, the experts per token and the shared experts read from
// each config (AG row .E, .k, .sh); total and active parameters are the gallery's lines (row .tot, .act). Every grid is drawn at the same size,
// so more experts means smaller ones. Which experts light up is illustrative (a fixed pseudo-random pick; real routing depends on the token). ----
(function () {
  if (!document.getElementById('stg-moe') || !window.AGS) return;
  const { lab, nm, row, rng, cl, int } = AGS;
  const MS = ['Llama 3.1 8B', 'GPT-OSS 120B', 'DeepSeek V3', 'Kimi K3', 'DeepSeek V3'].map(row), NT = [1, 1, 1, 1, 6];
  const S = 3.2, X0 = -1.2, Z0 = 0, XR = -3.3, XO = 2.9;
  const grid = E => { const c = Math.ceil(Math.sqrt(E)); return [c, Math.ceil(E / c)]; };
  // the illustrative picks: NT tokens, each choosing k distinct experts
  const picks = MS.map((r, s) => { if (!r.E) return [[]]; const g = rng(97 + s * 31), out = [];
    for (let t = 0; t < NT[s]; t++) { const p = new Set(); while (p.size < r.k) p.add(Math.floor(g() * r.E)); out.push([...p]); } return out; });
  const pct = r => (100 * r.act / r.tot).toFixed(1) + '%', P10 = v => v >= 1000 ? (v / 1000).toFixed(1) + 'T' : (v % 1 ? v.toFixed(1) : v) + 'B';
  const TC = ['c2', 'c4', 'c3', 'c6', 'c5', 'c1'];
  function layer(R, P, s, a, e) {
    const r = MS[s], lift = s === 4 ? 1 : cl(e * 1.6, 0, 1);
    R.glass([X0 - S / 2 - .08, .004, Z0 - S / 2 - .08], [S + .16, 0, 0], [0, 0, S + .16], { c: P.c2, a: a * .7, nu: 1, nv: 1, th: .02 });
    lab(R, [X0, 0, Z0 - S / 2], nm(r.n) + (s === 4 ? ', six tokens at once' : ''), { fs: 13, b: 1, dy: -78, c: P.ink, a });
    const line = r.E ? r.E + ' routed experts, ' + r.k + ' per token' + (r.sh ? ' + ' + r.sh + ' shared' : '') : 'one dense FFN: every weight runs';
    lab(R, [X0, 0, Z0 - S / 2], line, { fs: 12.5, dy: -60, c: P.mute, a });
    lab(R, [X0, 0, Z0 - S / 2], P10(r.act) + ' of ' + P10(r.tot) + ' parameters active: ' + pct(r), { mono: true, fs: 12.5, b: 1, dy: -42, c: P.c2, a });
    // the token(s) and the router
    const toks = NT[s], tz = t => toks === 1 ? Z0 : Z0 - 1.2 + 2.4 * t / (toks - 1);
    for (let t = 0; t < toks; t++) R.ball([XR - .9, .25, tz(t)], .12, { c: P[TC[t % TC.length]], a });
    lab(R, [XR - .9, .25, tz(toks - 1)], toks === 1 ? 'token' : '6 tokens', { fs: 12, dy: 20, c: P.mute, a });
    if (!r.E) { R.box([X0, 0, Z0], [S * .92, .4 * lift, S * .92], { fill: P.c2, a, lw: .8 });
      R.flow([[XR - .9, .25, Z0], [X0, .3, Z0], [XO, .25, Z0]], { c: P.c2, a: a * .9, r: .06, n: 14, speed: 1.3 }); R.ball([XO, .25, Z0], .1, { c: P.ink, a }); return; }
    R.box([XR, 0, Z0], [.42, .42, .42], { fill: P.ink, fa: .15, a, lw: .8 }); lab(R, [XR, .42, Z0], 'router', { fs: 12, dy: -12, c: P.ink, a });
    const [nc, nr] = grid(r.E), cx = S / nc, cz = S / nr, cs = Math.min(cx, cz), on = new Map();
    picks[s].forEach((p, t) => p.forEach(i => { if (!on.has(i)) on.set(i, t); }));
    const pos = i => [X0 - S / 2 + cx * (i % nc + .5), Z0 - S / 2 + cz * (Math.floor(i / nc) + .5)];
    for (let i = 0; i < r.E; i++) { const [x, z] = pos(i), t = on.get(i), lit = t != null;
      R.box([x, 0, z], [cs * .78, lit ? .04 + .34 * lift : .035, cs * .78], { fill: lit ? (toks > 1 ? P[TC[t % TC.length]] : P.c2) : P.paper, a, shadow: false, lw: lit ? .7 : .35, ea: lit ? .8 : .35 }); }
    // the shared experts: always on, beside the grid
    for (let j = 0; j < (r.sh || 0); j++) { const z = Z0 - .5 + j * .7, x = X0 + S / 2 + .55;
      R.box([x, 0, z], [.42, .5 * lift, .42], { fill: P.ink, a, lw: .8 }); }
    if (r.sh) lab(R, [X0 + S / 2 + .55, .5, Z0 - .5], r.sh > 1 ? r.sh + ' shared, always on' : 'shared, always on', { fs: 12, b: 1, al: 'left', dx: 14, dy: -6, c: P.ink, a });
    // flows: token to router to each chosen expert, then out
    if (a > .05) {
      for (let t = 0; t < toks; t++) R.flow([[XR - .9, .25, tz(t)], [XR, .25, Z0]], { c: toks > 1 ? P[TC[t % TC.length]] : P.c2, a: a * .8, r: .045, n: 5, speed: 1.2 });
      picks[s].forEach((p, t) => p.forEach(i => { const [x, z] = pos(i); R.flowArc([XR, .42, Z0], [x, .04 + .34 * lift, z], .45, { c: toks > 1 ? P[TC[t % TC.length]] : P.c2, a: a * (toks > 1 ? .45 : .8), r: .035, n: 4, speed: 1.4 }); }));
      for (let j = 0; j < (r.sh || 0); j++) R.flowArc([XR, .42, Z0], [X0 + S / 2 + .55, .5, Z0 - .5 + j * .7], .6, { c: P.ink, a: a * .6, r: .04, n: 6, speed: 1.4 });
    }
    if (toks > 1) lab(R, [X0, 0, Z0 + S / 2], on.size + ' of ' + r.E + ' experts read for these 6 tokens (illustrative picks)', { mono: true, fs: 12.5, b: 1, dy: 34, c: P.ink, a });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5, 4, -2.4, 2.4, .5);
    if (st.pk === k || e >= 1) layer(R, P, k, 1, e >= 1 ? 1 : e);
    else if (e < .5) layer(R, P, st.pk, 1 - 2 * e, 1); else layer(R, P, k, cl(2 * e - 1, 0, 1), 2 * e - 1);
  }
  S3.stage({ id: 'stg-moe', list: 'sx-moe', fig: 'Fig. 12 · one FFN layer: how many experts, how many run', cam: [.3, .85], bounds: [[-4.4, 0, -1.9], [3.2, .6, 1.9]], aspect: .62, dur: 1800, hold: 5000, draw,
    margin: w => w < 520 ? [80, 8, 40, 8] : [96, 120, 44, 20] });
})();
