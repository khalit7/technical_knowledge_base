// ---- Scene (section 3, Fig. 3): the reparameterisation trick on one test image. mu and sigma are the 16-number VAE's (beta = 1) recorded posterior
// for test image 1 of the topic's 16 (AVSC, from the root's tiny.json); epsilon is one illustrative standard-normal draw (seeded here, labelled on the
// page); z = mu + sigma * epsilon is computed from them; the KL bars are the closed form 1/2 (mu^2 + sigma^2 - 1 - log sigma^2) of those mu and sigma.
// The output tile is the same VAE's recorded reconstruction of that image (decoded from mu). ----
(function () {
  if (!document.getElementById('stg-rep') || !window.AVK || !window.AVSC) return;
  const { mix } = S3, { pixels, tileFlat, bars, lab, seg, arcPts, win } = AVK, SC = AVSC;
  const mu = SC.vae_mu[0], sg = SC.vae_sigma[0];
  // one illustrative draw: Box-Muller on a small seeded generator
  let s = 20261109; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const eps = mu.map(() => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); });
  const z = mu.map((m, i) => m + sg[i] * eps[i]);
  const kl = mu.map((m, i) => .5 * (m * m + sg[i] * sg[i] - 1 - Math.log(sg[i] * sg[i]))), KL = kl.reduce((a, b) => a + b, 0);
  const M = Math.max(...mu.concat(z, eps).map(Math.abs)), MK = Math.max(...kl);
  const XE = -4.9, XM = -1.95, XZ = 1.05, XD = 3, XO = 4.75, ZM = -.75, ZS = .55, ZE = 1.95, ZK = -2.1, Y = .5, BW = 1.9;
  let st = null; const redraw = () => st && st.draw();
  function fmap(R, x, side, k, c, a) { for (let i = 0; i < k; i++) R.glass([x - side / 2, .06 + i * .11, -side / 2], [side, 0, 0], [0, 0, side], { c, a, nu: 8, nv: 8, th: .02 }); }
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.2, 7, -3, 3, .5);
    const g = (s0) => k === s0 ? win(e, 0, .6) : k > s0 ? 1 : 0;
    // the encoder and its two outputs
    fmap(R, XE, .9, 6, P.c1, k === 0 ? 1 : .55); lab(R, [XE, .75, 0], 'encoder', { fs: 12.5, b: 1, c: P.c1, dy: -12 });
    const dimMS = k === 5 ? .35 : 1;
    bars(R, [XM, Y, ZM], mu, M, mix(P.paper, P.acc, .75), dimMS, { w: BW, h: .45, grow: g(0) });
    bars(R, [XM, Y, ZS], sg, M, mix(P.paper, P.c5, .7), dimMS, { w: BW, h: .45, grow: g(0) });
    lab(R, [XM - BW / 2 - .1, Y, ZM], 'μ(x)', { mono: 1, fs: 13, b: 1, c: P.acc, al: 'right', dx: -6, a: Math.max(.4, dimMS) });
    lab(R, [XM - BW / 2 - .1, Y, ZS], 'σ(x)', { mono: 1, fs: 13, b: 1, c: P.c5, al: 'right', dx: -6, a: Math.max(.4, dimMS) });
    if (k === 0) [ZM, ZS].forEach(zz => R.flow(arcPts(R, [XE + .5, .7, 0], [XM - BW / 2, Y + .1, zz], .3, 14), { c: P.c1, r: .06, a: e }));
    // epsilon: drawn outside the network, a constant for the backward pass
    const ea = k === 0 ? .14 : k === 1 ? win(e, 0, .6) : k === 5 ? .3 : 1;
    bars(R, [XM, Y, ZE], eps, M, mix(P.paper, P.c3, .7), ea, { w: BW, h: .45 });
    lab(R, [XM - BW / 2 - .1, Y, ZE], 'ε ~ N(0, I)', { mono: 1, fs: 13, b: 1, c: P.c3, al: 'right', dx: -6, a: Math.max(.25, ea) });
    if (k === 1) lab(R, [XM, Y + .55, ZE], 'one draw, illustrative', { fs: 12, c: P.c3, dy: -8, a: win(e, .4, 1) });
    if (k === 4) { lab(R, [XM + BW / 2 + .2, Y, ZE], 'no gradient: a constant', { fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 6, a: e }); }
    // z = mu + sigma * eps
    const za = k < 2 ? 0 : k === 5 ? 0 : 1;
    bars(R, [XZ, Y, 0], k >= 2 ? z : z.map(() => 0), M, mix(P.paper, P.c2, .75), za, { w: BW, h: .45, grow: k === 2 ? win(e, .35, .9) : 1 });
    if (za > 0) lab(R, [XZ, Y + .55, 0], 'z = μ + σ · ε', { mono: 1, fs: 13, b: 1, c: P.c2, dy: -10, a: Math.max(.3, za) });
    if (k === 2) { [ZM, ZS, ZE].forEach((zz, i) => R.flow(arcPts(R, [XM + BW / 2, Y + .15, zz], [XZ - BW / 2, Y + .15, 0], .25, 14), { c: [P.acc, P.c5, P.c3][i], r: .06, a: e })); }
    // decode and score
    const da = k < 2 ? 0 : k < 3 ? .14 : k === 5 ? 0 : .8;
    if (da > 0) { fmap(R, XD, .9, 6, P.c4, da); lab(R, [XD, .75, 0], 'decoder', { fs: 12.5, b: 1, c: P.c4, dy: -12, a: Math.max(.3, da) }); }
    if (k >= 2 && k < 5) { tileFlat(R, [XO, 0, 0], 1.5, k >= 3 ? pixels('rec', AVL.img.rec.rows.vae16_b1p0 * 16 + SC.pick[0], redraw) : null, k < 3 ? .14 : (k === 3 ? win(e, .4, .9) : 1));
    lab(R, [XO, 0, .85], 'x̂', { serif: 1, fs: 14, b: 1, c: P.c4, dy: 14, a: k >= 3 ? 1 : .3 }); }
    if (k >= 3 && k <= 4) { const ls = [XO - .2, 0, -1.6]; R.box(ls, [1.5, .32, .5], { fill: mix(P.paper, P.bad, .25), a: k === 3 ? win(e, .5, 1) : 1 });
      lab(R, [ls[0], .32, ls[2]], 'loss = rec. + β · KL', { fs: 12.5, b: 1, c: P.ink, dy: -12, a: k === 3 ? win(e, .5, 1) : 1 }); }
    if (k === 3) { R.flow(seg([XZ + BW / 2, Y, 0], [XD - .5, .5, 0], 8), { c: P.c2, r: .065, a: e }); R.flow(seg([XD + .5, .4, 0], [XO - .85, .1, 0], 6), { c: P.c4, r: .065, a: e }); }
    // gradients flow back through z to mu and sigma, never into epsilon
    if (k === 4) { const gc = P.bad;
      R.flow(arcPts(R, [XO - .6, .35, -1.6], [XD + .3, .6, -.2], .3, 12).concat(seg([XD - .4, .55, -.1], [XZ + BW / 2, Y + .1, 0], 8)), { c: gc, r: .065, a: e, speed: 1.2 });
      [ZM, ZS].forEach(zz => R.flow(arcPts(R, [XZ - BW / 2, Y + .1, 0], [XM + BW / 2, Y + .1, zz], .25, 14), { c: gc, r: .06, a: e, speed: 1.2 }));
      lab(R, [XD, 0, .6], 'gradient', { fs: 12.5, b: 1, c: gc, dy: 16, a: e }); }
    // the KL charge, number by number
    if (k === 5) { bars(R, [XM, 0.03, ZK], kl, MK, mix(P.paper, P.bad, .55), 1, { w: BW, h: .9, grow: win(e, 0, .7), legs: false });
      lab(R, [XM - BW / 2 - .1, .1, ZK], 'KL per number', { mono: 1, fs: 13, b: 1, c: P.bad, al: 'right', dx: -6, a: e });
      lab(R, [XM + BW / 2 + .15, .4, ZK], 'Σ = ' + KL.toFixed(2) + ' nats', { mono: 1, fs: 13, b: 1, c: P.bad, al: 'right', dx: -6, a: win(e, .7, 1) }); }
  }
  const full = { cam: [.12, .7], bounds: [[-5.6, 0, -2], [5.6, 1.1, 2.4]] };
  st = S3.stage({ id: 'stg-rep', list: 'sx-rep', fig: 'Fig. 3 · z = μ + σ · ε on one test image', cam: full.cam, bounds: full.bounds, aspect: .38, dur: 1500, hold: 4800, draw, margin: AVK.margin,
    view: k => k <= 1 ? { cam: [.12, .7], bounds: [[-5.6, 0, -1.4], [-.6, 1.1, 2.5]] } : k === 5 ? { cam: [.12, .75], bounds: [[-5.6, 0, -2.6], [.4, 1.2, 1.2]] } : full });
  window.AVSC3 = { eps, z, kl, KL };
})();
