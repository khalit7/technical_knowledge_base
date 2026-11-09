// ---- Scene (section 7, Fig. 4): the position wall, measured. The topic's tiny GPT (trained on 256-token windows) reads 24 held-out windows of
// 2,048 tokens; each column is the loss at 64 positions (EFD.past.runs[].curve, from src/past/out/past.json), one row per run, heights to one
// scale from zero. The glass plate at 256 is the trained length; the second plate (step 5) is the 1,024 tokens two runs continued training at. ----
(function () {
  if (!document.getElementById('stg-past') || !window.LCS || !window.EFD || !EFD.past) return;
  const { mix } = S3, { tw, la, lab, int } = LCS, E = EFD.past;
  const g = (m, s) => E.runs.find(r => r.model === m && r.scaling === s);
  const RUNS = [[g('at_mha', 'plain'), 'plain RoPE', 'bad'], [g('at_mha', 'linear x4'), 'linear x4 (PI)', 'c5'], [g('at_mha', 'ntk x8'), 'NTK-aware x8', 'c4'],
    [g('at_mha', 'yarn x8'), 'YaRN x8', 'c3'], [g('lc_pi_ft', 'linear x4'), 'PI x4 + 300 steps', 'c1'], [g('lc_plain_ft', 'plain'), 'plain + 300 steps', 'c6'],
    [g('at_swa64', 'plain'), 'window 64 (trained)', 'mute']].filter(r => r[0]);
  const SHOW = [[0], [1], [2], [3], [4, 5], [6]], first = i => SHOW.findIndex(s => s.includes(i));
  const NB = E.length / E.bin, LX = 8.96, X0 = -4.5, X = pos => X0 + LX * pos / E.length, CW = LX / NB, Z0 = -3.0, DZ = 1.0, z = i => Z0 + i * DZ, HS = .45;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.4, 5.4, -3, 3.4, .5);
    RUNS.forEach(([r, name, col], i) => {
      const f = first(i), a = tw(st, e, q => q < f ? 0 : SHOW[q].includes(i) ? 1 : i === 0 ? .5 : .22), c = mix(P.paper, P[col], .72);
      if (f > k) { R.quad([[X0, .002, z(i) - .2], [X0 + LX, .002, z(i) - .2], [X0 + LX, .002, z(i) + .2], [X0, .002, z(i) + .2]], { fill: P.soft, a: .5, ea: .35, dash: [3, 3] }); }
      if (a > .01) r.curve.forEach((v, b) => R.box([X0 + (b + .5) * CW, 0, z(i)], [CW * .82, v * HS, .34], { fill: (b + .5) * E.bin < E.trained_ctx ? mix(P.paper, P[col], .4) : c, a, lw: .5, ea: .4, shadow: false }));
      const ln = la(st, e, q => q < f ? 0 : SHOW[q].includes(i) ? 1 : 0), lr = la(st, e, q => q < f ? 0 : SHOW[q].includes(i) || i === 0 ? 1 : .0);
      lab(R, [X0, .1, z(i)], ln > .01 ? name + ' · ' + r['0-255'].toFixed(2) + ' in range' : name, { fs: 12.5, b: SHOW[k].includes(i), c: P[col], al: 'right', dx: -8, a: Math.max(lr, ln), grp: 'runs' });
      if (ln > .01) { const near = r['0-255'], far = r['1024-2047'], last = r.curve[NB - 1];
        lab(R, [X0 + LX - CW / 2, last * HS, z(i)], far.toFixed(2) + ' at 1,024 to 2,047', { fs: 12.5, b: 1, c: P[col], al: 'left', dx: 8, a: ln }); } });
    // the trained length, and the new length of the continued runs
    const zs = Z0 - .35, zd = (RUNS.length - 1) * DZ + .7;
    R.glass([X(E.trained_ctx), 0, zs], [0, 0, zd], [0, 2.0, 0], { c: P.c1, a: .55, nu: 1, nv: 4 });
    lab(R, [X(E.trained_ctx), 2.0, zs], 'trained length ' + E.trained_ctx, { fs: 12.5, b: 1, c: P.c1, dy: -12 });
    const pa = tw(st, e, q => q === 4 ? 1 : 0);
    if (pa > .01) { R.glass([X(1024), 0, zs], [0, 0, zd], [0, 2.0, 0], { c: P.c6, a: pa * .55, nu: 1, nv: 4 }); lab(R, [X(1024), 2.0, zs], 'continued at 1,024', { fs: 12.5, b: 1, c: P.c6, dy: -12, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    lab(R, [X0, 0, z(RUNS.length - 1) + .3], 'position 0', { fs: 12, c: P.mute, dy: 14, wide: 1 }); lab(R, [X0 + LX, 0, z(RUNS.length - 1) + .3], int(E.length), { fs: 12, c: P.mute, dy: 14 });
    lab(R, [X0 + LX / 2, 0, z(RUNS.length - 1) + .3], 'column height: loss per token (nats), 64 positions each', { fs: 12, c: P.mute, dy: 30, wide: 1 });
  }
  const full = { cam: [.36, .56], bounds: [[-4.6, 0, -3.4], [4.6, 2.0, 3.3]] };
  S3.stage({ id: 'stg-past', list: 'sx-past', fig: 'Fig. 4 · the tiny GPT past its trained length', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 5200, draw,
    margin: w => w < 520 ? [24, 8, 30, 8] : [30, 150, 48, 215],
    view: k => { const rows = SHOW[k], lo = Math.max(0, Math.min(...rows) - 1), hi = Math.max(...rows); return k === 0 ? { cam: [.36, .5], bounds: [[-4.6, 0, z(0) - .5], [4.6, 2.0, z(1) + .3]] } : k === 5 ? full : { cam: [.36, .54], bounds: [[-4.6, 0, z(0) - .5], [4.6, 2.0, z(hi) + .4]] }; } });
})();
