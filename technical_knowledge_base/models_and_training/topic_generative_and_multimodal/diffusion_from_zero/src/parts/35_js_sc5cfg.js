// ---- Fig. 5 (section 6): classifier-free guidance on the two-moons toy. At one noisy point (t = 400) the trained network's unconditional
// and conditional ("upper moon") answers, drawn as where each says the point came from (-sqrt(1 - abar) eps hat), and the guided answer
// eps_u + (1 + w)(eps_c - eps_u) at w = 4, all computed live (DZM.guided); then 600 samples asked for the upper moon at w = 0, 1 and 4
// (DDPM, 100 calls) and at w = 4 with DDIM (DZSC.cfg, recorded with the page's sampler; numbers asserted equal to the measured table). ----
(function () {
  if (!document.getElementById('stg-cfg') || !window.DZK) return;
  const K = DZK, G = DZSC.cfg, T = 400, WG = 4, W = 2.6, GAP = 3.05, C = i => [(i - 1.5) * GAP, 0, 0];
  const PT = [0.6, -1.6];   // the noisy point the arrows start from: below the lower moon
  const NG = 9, grid = (() => { const X = new Float64Array(2 * NG * NG); for (let a = 0; a < NG; a++) for (let b = 0; b < NG; b++) { X[2 * (a * NG + b)] = -2.4 + 4.8 * b / (NG - 1); X[2 * (a * NG + b) + 1] = -2.4 + 4.8 * a / (NG - 1); } return X })();
  let A = null;
  function compute() { if (A) return A; const s = Math.sqrt(1 - K.ab(T)), X = Float64Array.from(PT), u = K.epsAt(X, T, 2), c = K.epsAt(X, T, 0), g = K.epsAt(X, T, 0, WG);
    const fu = K.epsAt(grid, T, 2), fg = K.epsAt(grid, T, 0, WG), d = v => [-s * v[0], -s * v[1]];
    A = { u: d(u), c: d(c), g: d(g), fu: fu.map(v => -s * v), fg: fg.map(v => -s * v), ends: { p0: K.dec('g0', G.p0.end), p1: K.dec('g1', G.p1.end), p4: K.dec('g4', G.p4.end), i4: K.dec('i4', G.i4.end) } };
    // the guided arrow is the extrapolation u + (1 + w)(c - u): check it against the network's own guided call
    window.DZS5 = { u: A.u, c: A.c, g: A.g, gx: [A.u[0] + (1 + WG) * (A.c[0] - A.u[0]), A.u[1] + (1 + WG) * (A.c[1] - A.u[1])] }; return A; }
  function field(R, c, d, a, col) { for (let i = 0; i < NG * NG; i++) { const x = grid[2 * i], y = grid[2 * i + 1], dx = d[2 * i] * .5, dy = d[2 * i + 1] * .5;
      R.line([K.at(c, x, y, .07), K.at(c, x + dx, y + dy, .07)], { c: col, w: 1.4, head: 5, a }); } }
  const KEYS = ['p0', 'p1', 'p4', 'i4'], TTL = ['w = 0', 'w = 1', 'w = 4', 'w = 4, DDIM'], SUBS = ['DDPM, 100 calls', 'DDPM, 100 calls', 'DDPM, 100 calls', 'deterministic'];
  function draw(R, k, e) {
    const P = R.P, D = compute(), grey = S3.mix(P.paper, P.mute, .55), moon = i => K.D.Y[i] ? P.c2 : P.c1;
    R.grid(-6.8, 6.8, -2, 2, .5);
    // plate 1 carries the arrows in steps 1 to 3; the four plates carry the samples in steps 4 and 5
    KEYS.forEach((key, i) => { const a = k <= 2 ? (i === 0 ? 1 : .15) : k === 3 ? (i < 3 ? 1 : .2) : 1;
      K.plate(R, C(i), W, i === 3 ? P.c5 : P.c6, a, k <= 2 && i === 0 ? 't = ' + T + ', one noisy point' : TTL[i], k <= 2 && i === 0 ? '' : SUBS[i]); });
    const c0 = C(0), at = (x, y) => K.at(c0, x, y, .09), X = at(PT[0], PT[1]);
    if (k <= 2) { K.cloud(R, c0, K.D.X, moon, .4, { every: 2, r: .03, h: .04 });
      field(R, c0, k === 2 ? D.fg : D.fu, (k === 2 ? e : 1) * .18, k === 2 ? P.c4 : P.mute);
      R.ball(X, .08, { c: P.ink }); R.label(X, 'xₜ', { fs: 12.5, b: 1, dy: 16, c: P.ink });
      const tip = v => at(PT[0] + v[0], PT[1] + v[1]);
      R.line([X, tip(D.u)], { c: P.mute, w: 2.6, head: 9, a: 1 }); R.label(tip(D.u), 'unconditional', { fs: 12.5, b: 1, al: 'right', dx: -10, dy: 6, c: P.mute });
      if (k >= 1) { R.line([X, tip(D.c)], { c: P.c1, w: 2.6, head: 9, a: k === 1 ? e : 1 }); R.label(tip(D.c), '"upper moon"', { fs: 12.5, b: 1, al: 'left', dx: 10, c: P.c1, a: k === 1 ? e : 1 }); }
      if (k === 2) { const gt = tip(D.g), ct = tip(D.c), ut = tip(D.u);
        R.line([ut, ct, S3.lerp3(ct, gt, e)], { c: P.c4, w: 1.2, a: .8 });
        R.line([X, S3.lerp3(X, gt, e)], { c: P.c4, w: 3, head: 10 });
        R.label(gt, 'guided, w = ' + WG, { fs: 12.5, b: 1, dy: -14, c: P.c4, a: e > .9 ? (e - .9) * 10 : 0 }); } }
    // the samples: every point asked for the upper moon, at growing guidance
    if (k >= 3) KEYS.forEach((key, i) => { if (i === 3 && k === 3) return; const g = (k === 3 && i < 3) || (k === 4 && i === 3) ? e : 1;
      K.cloud(R, C(i), K.D.X, grey, .35, { every: 2, r: .028, h: .04 });
      K.cloud(R, C(i), D.ends[key], P.c4, 1, { r: .033, h: .07, grow: g });
      if (g >= 1 || e > .9) { const o = { fs: 12, mono: 1, c: i === 3 ? P.c5 : P.c4, b: 1, a: g >= 1 ? 1 : (e - .9) * 10 }, an = [C(i)[0], 0, W / 2 + .05];
        R.label(an, 'spread ' + G[key].sd.toFixed(2), Object.assign({ dy: 48 }, o)); R.label(an, K.pc(G[key].on) + ' on data', Object.assign({ dy: 64 }, o)); } });
  }
  const full = { cam: [.06, .9], bounds: [[-6.3, 0, -1.6], [6.3, .3, 1.6]] };
  function near() { const D = compute(), c = C(0), p = [[0, 0], D.u, D.c, D.g].map(v => K.at(c, PT[0] + v[0], PT[1] + v[1], 0)), xs = p.map(q => q[0]), zs = p.map(q => q[2]);
    return [[Math.min(...xs) - .7, 0, Math.min(...zs) - .45], [Math.max(...xs) + .7, .3, Math.max(...zs) + .45]] }
  S3.stage({ id: 'stg-cfg', list: 'sx-cfg', fig: 'Fig. 5 · guidance: extrapolate past the condition', cam: full.cam, bounds: full.bounds, aspect: .4, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [12, 8, 30, 8] : [16, 14, 70, 14],
    view: k => k <= 2 ? { cam: [.1, .95], bounds: near() } : k === 3 ? { cam: [.06, .9], bounds: [[-6.3, 0, -1.6], [3.1, .3, 1.6]] } : full });
})();
