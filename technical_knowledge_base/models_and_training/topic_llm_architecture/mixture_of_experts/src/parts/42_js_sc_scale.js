// ---- Scene (section 1, Fig. 2): total against active, to scale. Each expert is a block whose footprint is proportional to its weights
// (the tiny GPT's presets: dense FFN 524,288; moe8top2 8 x 262,144; moe16top3_shared 17 x 131,072); lit blocks are the experts the trained
// models chose for token 1 ("Once") in layer 1 (MXD.runs.*.seq.top). Columns: weights stored and used per token, routers included;
// model totals from the tiny GPT's param_groups() (MXD.runs.*.log.params). DeepSeek-V3's layer from its config (illustrative choice of 8). ----
(function () {
  if (!document.getElementById('stg-scale') || !window.MXS) return;
  const { D, ec, la, lab, int, col, cl, M } = MXS, { mix, lerp } = S3;
  const pick = run => { const r = D.runs[run].seq, k = r.k; return r.top[0].slice(k, 2 * k).split('').map(c => parseInt(c, 16)); };
  const p8 = pick('moe8'), p16 = pick('moe16s');
  const PR = ['dense', 'moe8', 'moe16s'].map(k => D.runs[k].log.params);
  // per layer: stored (experts + router) and used per token, in weights
  const LAY = [{ st: 524288, us: 524288 }, { st: 8 * 262144 + 2048, us: 2 * 262144 + 2048 }, { st: 17 * 131072 + 4096, us: 4 * 131072 + 4096 }];
  const U = Math.sqrt(1.44 / 524288); // world side per sqrt(weight): the dense FFN is a 1.2 x 1.2 block
  const H = .3, CX = 2.7, CS = 2.1 / (17 * 131072 + 4096);
  // block layouts: [x, z, w, d, lit, kind]
  function blocks(s) {
    if (s === 0) return [[-1.6, 0, 1.2, 1.2, 1, 'd']];
    if (s === 1) { const w = 1.2, d = .6, out = []; for (let i = 0; i < 8; i++) out.push([-3.2 + (i % 4) * (w * .5 + .55) + .3, -.75 + Math.floor(i / 4) * 1.5, w * .5, d * 2, p8.includes(i), i]); return out; }
    const out = []; for (let i = 0; i < 16; i++) out.push([-3.4 + (i % 4) * .95 + .3, -1.4 + Math.floor(i / 4) * .95, .6, .6, p16.includes(i), i]);
    out.push([.55, 0, .6, .6, 1, 's']); return out;
  }
  const names = ['dense FFN, 1,024 wide', '8 experts of 512, top 2', '16 experts of 256 + 1 shared, top 3'];
  function layer(R, P, s, a, e) {
    const bl = blocks(s);
    bl.forEach(([x, z, w, d, lit, kind]) => {
      const fill = kind === 's' ? P.ink : lit ? (kind === 'd' ? P.acc : mix(P.paper, ec(kind), .85)) : P.paper;
      R.box([x, 0, z], [w, H * (lit ? 1.6 : 1), d], { fill, a: a * (lit ? 1 : .8), lw: .8 });
    });
    if (s === 2) lab(R, [.55, H * 1.6, 0], 'shared', { fs: 12, b: 1, dy: -17, c: P.ink, a });
    lab(R, [-1.6, 0, -2], R.W < 520 ? ['dense FFN', '8 experts, top 2', '16 + 1 shared, top 3'][s] : names[s], { fs: 13, b: 1, dy: -16, c: P.ink, a });
    // flows: the token's stream into each lit block
    if (a > .3) bl.filter(b => b[4]).forEach(([x, z]) => R.flowArc([-1.6, .3, 2.4], [x, H * 1.6, z], .6, { c: P.acc, a: a * .8, r: .045, n: 7, speed: 1.3 }));
    if (a > .3) R.ball([-1.6, .3, 2.4], .16, { c: P.acc, a });
    // the two columns: stored and used per token, to one scale
    const L = LAY[s];
    col(R, [CX, 0, 0], L.st * CS * cl(e * 1.4, 0, 1), .55, { fill: mix(P.paper, P.ink, .35), a });
    col(R, [CX + 1.3, 0, 0], L.us * CS, .55, { fill: P.acc, a });
    lab(R, [CX, L.st * CS, 0], int(L.st), { mono: true, fs: 12, b: 1, dy: -17, c: P.ink, a });
    lab(R, [CX + 1.3, L.us * CS, 0], int(L.us), { mono: true, fs: 12, b: 1, dy: -17, c: P.acc, a });
    lab(R, [CX, 0, .45], 'stored', { fs: 12.5, dy: 14, c: P.mute, a });
    lab(R, [CX + 1.3, 0, .45], 'per token', { fs: 12.5, dy: 14, c: P.acc, a });
  }
  // step 4: whole models, total against active, to one scale
  function models(R, P, a, e) {
    const mxT = PR[2].total, S = 2.3 / mxT, nm = ['dense', 'moe8top2', 'moe16top3_shared'];
    PR.forEach((pr, j) => { const x = -3.6 + j * 3;
      col(R, [x, 0, 0], pr.total * S * (j ? cl(e * 1.3, 0, 1) : 1), .6, { fill: mix(P.paper, P.ink, .35), a });
      col(R, [x + 1.1, 0, 0], pr.active * S, .6, { fill: P.acc, a });
      lab(R, [x, pr.total * S, 0], (pr.total / 1e6).toFixed(2) + 'M', { mono: true, fs: 12, b: 1, dy: -17, c: P.ink, a });
      lab(R, [x + 1.1, pr.active * S, 0], (pr.active / 1e6).toFixed(2) + 'M', { mono: true, fs: 12, b: 1, dy: -17, c: P.acc, a });
      lab(R, [x + .55, 0, .5], nm[j], { fs: 12.5, b: 1, dy: 16, c: P.ink, a }); });
    lab(R, [-3.4, 1.2, 0], 'grey: total · blue: active', { fs: 12.5, al: 'left', c: P.mute, a, dy: -40 });
  }
  // step 5: one DeepSeek-V3 MoE layer, 256 routed experts of 44,040,192 weights plus 1 shared, 8 routed per token (illustrative choice)
  const lit5 = new Set([3, 17, 40, 77, 120, 150, 201, 233]);
  function ds(R, P, a, e) {
    const g = .23, x0 = -4, z0 = -1.6;
    for (let i = 0; i < 256; i++) { const x = x0 + (i % 16) * g, z = z0 + Math.floor(i / 16) * g, on = lit5.has(i);
      R.box([x, 0, z], [g * .8, on ? .32 : .1, g * .8], { fill: on ? P.acc : P.paper, a, shadow: false, lw: on ? .7 : .35, ea: on ? .8 : .4 }); }
    R.box([.4, 0, 0], [g * .8, .32, g * .8], { fill: P.ink, a, shadow: false });
    lab(R, [.4, .32, 0], 'shared', { fs: 12, b: 1, dy: -17, c: P.ink, a });
    lab(R, [-2.15, 0, z0], R.W < 520 ? 'DeepSeek-V3: 256 + 1, 8 + 1 per token' : 'DeepSeek-V3, one MoE layer: 256 routed + 1 shared, 8 + 1 per token', { fs: 13, b: 1, dy: -34, c: P.ink, a });
    const S = 2.1 / 11.32e9; col(R, [CX, 0, 0], 11.32e9 * S * cl(e * 1.4, 0, 1), .55, { fill: mix(P.paper, P.ink, .35), a });
    col(R, [CX + 1.3, 0, 0], 9 * 44040192 * S, .55, { fill: P.acc, a });
    lab(R, [CX, 2.1, 0], '11.32B', { mono: true, fs: 12, b: 1, dy: -17, c: P.ink, a });
    lab(R, [CX + 1.3, 9 * 44040192 * S, 0], '396M', { mono: true, fs: 12, b: 1, dy: -17, c: P.acc, a });
    lab(R, [CX, 0, .45], 'stored', { fs: 12.5, dy: 14, c: P.mute, a }); lab(R, [CX + 1.3, 0, .45], 'per token', { fs: 12.5, dy: 14, c: P.acc, a });
  }
  function scene(R, P, s, a, e) { if (s <= 2) layer(R, P, s, a, e); else if (s === 3) models(R, P, a, e); else ds(R, P, a, e); }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5, 5, -2.6, 2.8, .5);
    if (st.pk === k || e >= 1) scene(R, P, k, 1, e >= 1 ? 1 : e);
    else if (e < .5) scene(R, P, st.pk, 1 - 2 * e, 1); else scene(R, P, k, cl(2 * e - 1, 0, 1), 2 * e - 1);
  }
  S3.stage({ id: 'stg-scale', list: 'sx-scale', fig: 'Fig. 2 · stored against computed, to scale', cam: [.28, .72], bounds: [[-4.2, 0, -2], [4.5, 2.2, 2.5]], aspect: .5, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [30, 8, 24, 8] : [40, 16, 30, 16] });
})();
