// ---- Scene (section 1, Fig. 2): five tiny GPTs, one per position scheme (src/probe/probe.py -> PE_DATA.probe). Rows are the schemes, columns the
// embedding and blocks 1 to 6. Steps 1 to 3: the permutation test (relative change of token 255's residual stream when the first 255 tokens are
// shuffled); steps 4 and 5: the same columns become the R^2 of a linear probe for absolute position. ----
(function () {
  if (!document.getElementById('stg-why') || !window.PES) return;
  const { mix } = S3, { tw, la, lab, f2 } = PES, PR = PE_DATA.probe;
  const PERM = PR.permutation_rel_change_token255_by_block, R2 = PR.position_probe_r2_by_block;
  // front to back: NoPE first (steps 1 and 2 are about it)
  const ROWS = [['nope', 'NoPE', 'mute'], ['rope', 'RoPE', 'c1'], ['alibi', 'ALiBi', 'c3'], ['sinusoidal', 'sinusoidal (× 16)', 'c2'], ['learned', 'learned table', 'c4']];
  const NB = 7, DX = 1.05, X = j => (j - (NB - 1) / 2) * DX, DZ = 1.0, Z = i => 2.0 - i * DZ, HP = 2.3, HR = 1.6;
  // which rows a step is about, and which bars carry a number
  const FOC = [[0], [0], [0, 1, 2, 3, 4], [0, 3, 4], [1, 2]];
  const VAL = [[[0, 1]], [[0, 2], [0, 6]], [[1, 1], [2, 1], [3, 1], [4, 1]], [[3, 0], [4, 0], [0, 0], [0, 3], [0, 4]], [[1, 2], [2, 3]]];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.4, 4.4, -2.6, 2.8, .5);
    const m = tw(st, e, q => q >= 3 ? 1 : 0);
    ROWS.forEach(([key, name, col], i) => {
      const a = tw(st, e, q => FOC[q].includes(i) ? 1 : .16), c = P[col];
      for (let j = 0; j < NB; j++) {
        const v = PERM[key][j] * HP * (1 - m) + Math.max(0, R2[key][j]) * HR * m, hi = VAL[k].some(([r, b]) => r === i && b === j);
        R.box([X(j), 0, Z(i)], [DX * .62, Math.max(.012, v), .5], { fill: mix(P.paper, c, hi ? .85 : .55), a, lw: .7, shadow: a > .5 });
      }
      lab(R, [X(0) - DX * .45, .05, Z(i)], name, { fs: 12.5, c: c, b: FOC[k].includes(i), al: 'right', dx: -8, a: Math.max(.45, a), grp: 'rows' });
      // the signal through the stack: dots stream along the rows a step is about
      if (FOC[k].includes(i) && k <= 2) R.flow([[X(0), .03, Z(i) + .32], [X(NB - 1), .03, Z(i) + .32]], { c, r: .045, n: 9, speed: .9, a: la(st, e, q => FOC[q].includes(i) && q <= 2 ? .8 : 0) });
    });
    // the numbers this step is about, on top of their bars
    VAL[k].forEach(([i, j]) => {
      const key = ROWS[i][0], pv = PERM[key][j], rv = R2[key][j], v = pv * HP * (1 - m) + Math.max(0, rv) * HR * m;
      const t = k >= 3 ? 'R² ' + f2(rv, 2) : pv < 1e-3 ? (pv * 1e7).toFixed(0) + '×10⁻⁷' : Math.round(pv * 100) + '%';
      lab(R, [X(j), v, Z(i)], t, { fs: 12.5, b: 1, mono: true, grp: "val", c: P[ROWS[i][2]] === P.mute ? P.ink : mix(P.ink, P[ROWS[i][2]], .6), dy: -10, a: la(st, e, q => q === k ? 1 : 0) });
    });
    for (let j = 0; j < NB; j++) lab(R, [X(j), 0, Z(0) + .3], j ? 'block ' + j : 'embedding', { fs: 12, c: P.mute, dy: 14, wide: 1 });
  }
  const full = { cam: [.2, .66], bounds: [[-3.9, 0, -2.3], [3.9, 1.5, 2.4]] };
  S3.stage({ id: 'stg-why', list: 'sx-why', fig: 'Fig. 2 · five tiny GPTs, shuffled and probed', cam: full.cam, bounds: full.bounds, aspect: .58, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [14, 8, 14, 8] : [24, 18, 30, 150],
    view: k => k <= 1 ? { cam: [.2, .5], bounds: [[-3.9, 0, 1.2], [3.9, 1.2, 2.5]] } : full });
})();
