// ---- Fig. 3 (section 4): the denoiser and the score field on the two-moons toy. One training example (x0, eps, x_t at t = 250), the trained
// network's answer (eps hat, run live: DZM.net), its clean-point guess, then the field of arrows -sqrt(1 - abar) eps hat = (1 - abar) x score
// over a grid at three noise levels (t = 600, 250, 60), drawn at half length. Every arrow is the network's output, computed in the browser. ----
(function () {
  if (!document.getElementById('stg-score') || !window.DZK) return;
  const K = DZK, TS = [600, 250, 60], W = 2.6, GAP = 3.1, C = i => [(i - 1) * GAP, 0, 0], J = 153;   // J: the training example, a point on the lower moon whose loss is close to the median of the 300 at t = 250
  const SC = .3, CAP = 1.1, G = 11, grid = (() => { const X = new Float64Array(2 * G * G); for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) { X[2 * (a * G + b)] = -3 + 6 * b / (G - 1); X[2 * (a * G + b) + 1] = -3 + 6 * a / (G - 1); } return X })();
  let F = null;
  function fields() { if (F) return F; F = {};
    TS.forEach(t => { const e = K.epsAt(grid, t, 2), s = Math.sqrt(1 - K.ab(t)), d = new Float64Array(e.length); for (let i = 0; i < e.length; i++) d[i] = -s * e[i]; F[t] = d; });
    // the training example at t = 250: x_t from the fixed noise draw, the network's eps hat, its clean-point guess, and the loss
    const t = 250, a = K.ab(t), x0 = [K.D.X[2 * J], K.D.X[2 * J + 1]], ep = [K.E[2 * J], K.E[2 * J + 1]], xt = [Math.sqrt(a) * x0[0] + Math.sqrt(1 - a) * ep[0], Math.sqrt(a) * x0[1] + Math.sqrt(1 - a) * ep[1]];
    const eh = K.epsAt(Float64Array.from(xt), t, 2), g = [(xt[0] - Math.sqrt(1 - a) * eh[0]) / Math.sqrt(a), (xt[1] - Math.sqrt(1 - a) * eh[1]) / Math.sqrt(a)];
    F.ex = { x0, ep, xt, eh: [eh[0], eh[1]], g, loss: (eh[0] - ep[0]) ** 2 + (eh[1] - ep[1]) ** 2, a };
    { const Xn = K.noised(250), en = K.epsAt(Xn, 250, 2); let m = 0, lo = 0; for (let p = 0; p < 300; p++) { const l = (en[2 * p] - K.E[2 * p]) ** 2 + (en[2 * p + 1] - K.E[2 * p + 1]) ** 2; m += l; if (l < F.ex.loss) lo++ } F.mean = m / 300; F.below = lo }
    window.DZS3 = { mean: F.mean, below: F.below, loss: F.ex.loss, x0: F.ex.x0, g: F.ex.g, len: TS.map(t => { let m = 0; for (let i = 0; i < G * G; i++) m += Math.hypot(F[t][2 * i], F[t][2 * i + 1]); return m / (G * G) }) };
    return F; }
  function ex0() { const f = fields(), c = C(1), p = [f.ex.x0, f.ex.xt, f.ex.g].map(q => K.at(c, q[0], q[1], 0)), xs = p.map(q => q[0]), zs = p.map(q => q[2]);
    return [[Math.min(...xs) - .5, 0, Math.min(...zs) - .3], [Math.max(...xs) + .5, .3, Math.max(...zs) + .3]] }
  function arrows(R, c, d, a, col) { for (let i = 0; i < G * G; i++) { const x = grid[2 * i], y = grid[2 * i + 1], L = Math.hypot(d[2 * i], d[2 * i + 1]), f = SC * Math.min(1, CAP / (SC * L || 1)), dx = d[2 * i] * f, dy = d[2 * i + 1] * f;
      if (Math.hypot(dx, dy) < .02) continue; R.line([K.at(c, x, y, .07), K.at(c, x + dx, y + dy, .07)], { c: col, w: 1.6, head: 6, a }); } }
  function draw(R, k, e) {
    const P = R.P, f = fields(), ex = f.ex, grey = S3.mix(P.paper, P.mute, .55), moon = i => K.D.Y[i] ? P.c2 : P.c1;
    R.grid(-5, 5, -2, 2, .5);
    const pa = i => k <= 2 ? (i === 1 ? 1 : .2) : k === 3 ? (i === 0 ? 1 : .35) : k === 4 ? (i === 2 ? 1 : .35) : 1;
    TS.forEach((t, i) => { K.plate(R, C(i), W, P.c6, pa(i), pa(i) > .3 ? 't = ' + t : '', pa(i) > .3 ? '√ā = ' + Math.sqrt(K.ab(t)).toFixed(2) : '');
      // the noisy cloud at this level (the fixed noise draw), faint, under the arrows
      if (k >= 2 || i === 1) K.cloud(R, C(i), K.noised(t), k <= 1 ? moon : grey, (k <= 1 ? .25 : .55) * pa(i), { every: 2, r: .035 }); });
    // the data itself, faint on the middle plate, so the arrows' targets are visible
    if (k <= 2) K.cloud(R, C(1), K.D.X, moon, k <= 1 ? .35 : .45, { every: 2, r: .03, h: .04 });
    if (k <= 1) { const c = C(1), A = K.at(c, ex.x0[0], ex.x0[1], .09), X = K.at(c, ex.xt[0], ex.xt[1], .09), E = K.at(c, ex.xt[0] - Math.sqrt(1 - ex.a) * ex.eh[0], ex.xt[1] - Math.sqrt(1 - ex.a) * ex.eh[1], .09);
      R.ball(A, .08, { c: moon(J) }); R.label(A, 'x₀, a real point', { fs: 12.5, b: 1, dy: -17, c: moon(J) });
      R.ball(X, .08, { c: P.ink, a: k === 0 ? e : 1 }); R.label(X, 'xₜ (t = 250)', { fs: 12.5, b: 1, dy: 18, c: P.ink, a: k === 0 ? e : 1 });
      // the noise that was added, drawn from where it took the point (sqrt(abar) x0) to x_t
      const B = K.at(c, Math.sqrt(ex.a) * ex.x0[0], Math.sqrt(ex.a) * ex.x0[1], .09);
      R.flow(K.seg(A, B, 6).concat(K.seg(B, X, 10).slice(1)), { c: P.c5, r: .05, n: 7, speed: 1, a: k === 0 ? e : .6 });
      R.line([B, X], { c: P.c5, w: 2.2, head: 8, a: k === 0 ? e : .7 }); R.label(S3.lerp3(B, X, .5), 'noise √(1 − ā) ε', { fs: 12, mono: 1, dx: 30, al: 'left', c: P.c5, a: k === 0 ? e : .7, wide: 1 });
      if (k === 1) { R.line([X, E], { c: P.c4, w: 2.4, head: 8, a: e }); const Gp = K.at(c, ex.g[0], ex.g[1], .09); R.ball(Gp, .075, { c: P.c4, a: e });
        R.label(Gp, 'its guess of x₀', { grp: 'exl', fs: 12.5, b: 1, al: 'right', dx: -16, dy: 8, c: P.c4, a: e > .8 ? (e - .8) * 5 : 0 }); R.label(E, 'network: −√(1 − ā) ε̂', { grp: 'exl', fs: 12, mono: 1, al: 'right', dx: -14, dy: -8, c: P.c4, a: e > .8 ? (e - .8) * 5 : 0, wide: 1 }); } }
    // the field: at every grid point, where the network says the noisy point came from
    if (k >= 2) TS.forEach((t, i) => { const a = k === 2 ? (i === 1 ? e : 0) : k === 3 ? (i === 0 ? e : i === 1 ? .35 : 0) : k === 4 ? (i === 2 ? e : .35) : 1; if (a > .01) arrows(R, C(i), f[t], a, P.c4); });
  }
  const full = { cam: [.08, .9], bounds: [[-4.5, 0, -1.6], [4.5, .3, 1.6]] }, mid = { cam: [.12, .95], bounds: [[-1.5, 0, -1.5], [1.5, .3, 1.55]] };
  S3.stage({ id: 'stg-score', list: 'sx-score', fig: 'Fig. 3 · the trained network’s arrows, computed in your browser', cam: full.cam, bounds: full.bounds, aspect: .42, dur: 1500, hold: 4800, draw, margin: K.margin,
    view: k => k <= 1 ? { cam: [.12, .95], bounds: ex0() } : k === 2 ? mid : k === 3 ? { cam: [.1, .92], bounds: [[-4.6, 0, -1.5], [1.6, .3, 1.55]] } : k === 4 ? { cam: [.05, .92], bounds: [[-1.6, 0, -1.5], [4.6, .3, 1.55]] } : full });
})();
