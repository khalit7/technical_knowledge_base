// ---- Scene (section 6, Fig. 4): posterior collapse as KL per latent dimension. Row 1 is the ordinary-decoder VAE (AVL.runs.vae16_b1p0.kl_per_dim);
// rows 2 to 4 are the PixelCNN-decoder VAE trained three ways (AVD.pc.runs: c_b1 plain ELBO, c_anneal KL annealing, c_freebits free bits),
// 16 columns each at the end of training (test set, nats). The column on the left of each PixelCNN row replays that run's recorded KL during
// training (minibatch averages every 100 steps), on a log scale, while its step plays; the annealed run's KL weight is the gauge beside it.
// The last step's boxes are each run's measured "code's worth" (how much worse the reconstruction gets when every image gets another's code). ----
(function () {
  if (!document.getElementById('stg-col') || !window.AVK || !window.AVD) return;
  const { mix } = S3, { lab, seg, win, arcPts } = AVK, PC = AVD.pc.runs;
  const ROWS = [['VAE, ordinary decoder', AVL.runs.vae16_b1p0.kl_per_dim, null], ['PixelCNN, plain ELBO', PC.c_b1.kl_per_dim, PC.c_b1], ['PixelCNN, KL annealing', PC.c_anneal.kl_per_dim, PC.c_anneal], ['PixelCNN, free bits', PC.c_freebits.kl_per_dim, PC.c_freebits]];
  const Z = [-2.4, -.8, .8, 2.4], X0 = -1.2, DX = .4, U = .5, XT = 6.9, XW = 7.6, XG = 6.9;
  const logH = v => .34 * Math.log2(1 + Math.max(0, v));
  const cur = (run, e) => { const c = run.curve, i = Math.min(c.length - 1, Math.round(e * (c.length - 1))); return c[i]; };
  function draw(R, k, e) {
    const P = R.P; R.grid(-4.4, 7.2, -3.4, 3.4, .5);
    ROWS.forEach(([nm, kl, run], r) => {
      const on = r === Math.min(k, 3), seen = r <= k, a = k === 4 ? (r ? .9 : .45) : on ? 1 : seen ? .35 : .12;
      const c = r === 0 ? P.c1 : r === 3 ? P.good : P.c5;
      // the end-of-training KL of each dimension, only once its run has finished playing
      const grow = on && k < 4 ? (r === 0 ? win(e, 0, .6) : win(e, .85, 1)) : seen ? 1 : 0;
      R.box([X0 + 7.5 * DX, 0, Z[r]], [16 * DX + .2, .04, .5], { a, shadow: false });
      kl.forEach((v, j) => { const x = X0 + j * DX, h = v * U * grow;
        if (h < .01) { R.quad([[x - DX * .36, .045, Z[r] - .17], [x + DX * .36, .045, Z[r] - .17], [x + DX * .36, .045, Z[r] + .17], [x - DX * .36, .045, Z[r] + .17]], { a: a * .8, ec: c, dash: [3, 3], dz: -.2 }); return; }
        R.box([x, .04, Z[r]], [DX * .72, h, .34], { fill: mix(P.paper, c, .75), a, shadow: false, lw: .7 }); });
      const sum = kl.reduce((s, v) => s + v, 0);
      lab(R, [X0 - .4, .05, Z[r]], nm + (grow >= 1 ? ': ' + (sum < .005 ? '0' : sum.toFixed(2)) + ' nats' : ''), { fs: 12.5, b: 1, c, al: 'right', dx: -4, a: Math.max(.4, a), grp: 'rows', wide: 1 });
      // the run's KL during training, replayed while its step plays (log scale)
      if (run && (on || seen) && k < 4) { const pt = on && k < 4 ? cur(run, win(e, 0, .85)) : run.curve[run.curve.length - 1], h = logH(pt[1]);
        R.box([XT, 0, Z[r]], [.42, Math.max(.012, h), .34], { fill: mix(P.paper, P.bad, .55), a: on ? 1 : .35, shadow: false });
        if (on && k < 4) lab(R, [XT, h, Z[r]], 'step ' + pt[0].toLocaleString('en-GB') + ': ' + (pt[1] >= 10 ? pt[1].toFixed(0) : pt[1].toFixed(2)) + ' nats', { mono: 1, fs: 12, b: 1, c: P.bad, dy: -12 });
        if (r === 2 && on && k < 4) { const w = pt[3]; R.box([XW, 0, Z[r]], [.14, 1.4, .14], { fill: P.paper, a: .5, shadow: false }); R.box([XW, 0, Z[r]], [.16, Math.max(.01, 1.4 * w), .16], { fill: mix(P.paper, P.acc, .75), shadow: false });
          lab(R, [XW, 0, Z[r] + .2], 'weight ' + w.toFixed(2), { mono: 1, fs: 12, c: P.acc, b: 1, dy: 16, al: 'left', dx: -4 }); }
        if (on && k < 4) R.flow(arcPts(R, [X0 + 15 * DX + .3, .2, Z[r]], [XT - .25, .3, Z[r]], .25, 10), { c: P.bad, r: .05, n: 4, a: .7 }); }
      // the free-bits floor: lambda = 0.5 nats per dimension
      if (r === 3 && seen && k >= 3) R.glass([X0 - .2, .04 + .5 * U, Z[r] - .25], [16 * DX + .0, 0, 0], [0, 0, .5], { c: P.good, a: k === 3 ? win(e, .2, .7) : .5, nu: 16, nv: 1, th: .01 });
      if (r === 3 && k === 3) lab(R, [X0 + 2 * DX, .04 + .5 * U, Z[r] - .25], 'floor λ = 0.5', { mono: 1, fs: 12, c: P.good, dy: -12, a: win(e, .4, .8) });
      // the price, on the last step: what the code is worth, and the true negative ELBO
      if (k === 4 && run) { const g = run.z_gain_nats, h = Math.max(.02, g * .22 * win(e, 0, .7));
        R.box([XG, 0, Z[r]], [.5, h, .36], { fill: mix(P.paper, P.good, .65), shadow: false });
        lab(R, [XG, h, Z[r]], 'worth ' + g.toFixed(2), { mono: 1, fs: 12, b: 1, c: P.good, dy: -10, a: win(e, .6, 1) }); }
    });
  }
  const full = { cam: [.14, .72], bounds: [[-4.4, 0, -2.8], [8.4, 1.5, 2.8]] };
  S3.stage({ id: 'stg-col', list: 'sx-col', fig: 'Fig. 4 · KL per latent dimension, four runs', cam: full.cam, bounds: full.bounds, aspect: .55, dur: 3200, hold: 4800, draw, margin: AVK.margin });
})();
