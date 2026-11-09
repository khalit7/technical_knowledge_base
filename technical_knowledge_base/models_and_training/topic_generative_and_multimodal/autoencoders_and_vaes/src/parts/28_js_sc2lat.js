// ---- Scene (section 2, Fig. 2): the two 2-number latent spaces. Each ball is one of 600 Fashion-MNIST test images (60 per class) at its code in
// the plain autoencoder (run ae2) and its posterior mean in the VAE (run vae2), coloured by class; the rings around the VAE's means are each
// image's own sigma (AVL.scatter.vae2_sigma); the upright tiles are what each decoder draws at the 9 x 9 decode grid's point nearest the origin
// (AVL.img.grid_ae2 and grid_vae2, the root Latent lab's recorded decodes). Each plate is its model's own box (AVL.runs.*.grid). ----
(function () {
  if (!document.getElementById('stg-lat') || !window.AVK) return;
  const { tileUp, lab, arcPts, seg, win, pixels, COL, CLS } = AVK, L = AVL, b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const lb = b64(L.scatter.labels), PT = { ae2: b64(L.scatter.ae2), vae2: b64(L.scatter.vae2) }, SG = b64(L.scatter.vae2_sigma), N = lb.length;
  const W = 4.4, CX = { ae2: -2.7, vae2: 2.7 }, G = { ae2: L.runs.ae2.grid, vae2: L.runs.vae2.grid };
  // the 9 shown decode points are positions round(linspace(0, 19, 9)) of a 20-point grid from lo to hi (rows from high z2 down)
  const SEL = [0, 2, 5, 7, 10, 12, 14, 17, 19], gx = (g, i) => g.lo[0] + (g.hi[0] - g.lo[0]) * i / 19, gy = (g, i) => g.hi[1] - (g.hi[1] - g.lo[1]) * i / 19;
  const near0 = g => { let c = 0, r = 0; SEL.forEach((s, i) => { if (Math.abs(gx(g, s)) < Math.abs(gx(g, SEL[c]))) c = i; if (Math.abs(gy(g, s)) < Math.abs(gy(g, SEL[r]))) r = i; }); return { r, c, z1: gx(g, SEL[c]), z2: gy(g, SEL[r]) }; };
  const T0 = { ae2: near0(G.ae2), vae2: near0(G.vae2) };
  // floor position of a latent point (z1, z2) on model n's plate
  const at = (n, z1, z2) => { const g = G[n]; return [CX[n] + ((z1 - g.lo[0]) / (g.hi[0] - g.lo[0]) - .5) * W, .04, ((g.hi[1] - z2) / (g.hi[1] - g.lo[1]) - .5) * W]; };
  const ptAt = (n, i) => [CX[n] + (PT[n][2 * i] / 255 - .5) * W, .045, (PT[n][2 * i + 1] / 255 - .5) * W];
  const unit = n => W / (G[n].hi[0] - G[n].lo[0]);            // world units per latent unit along z1
  let st = null; const redraw = () => st && st.draw();
  function ring(R, n, rad, o) { const c = at(n, 0, 0), u = unit(n), v = W / (G[n].hi[1] - G[n].lo[1]), pts = [];
    for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2; pts.push([c[0] + Math.cos(t) * rad * u, .05, c[2] - Math.sin(t) * rad * v]); }
    R.line(pts, o); }
  function plate(R, n, a, ttl) { if (a <= .01) return; const P = R.P; R.glass([CX[n] - W / 2, .02, -W / 2], [W, 0, 0], [0, 0, W], { c: n === 'ae2' ? P.c2 : P.acc, a: a * .7, nu: 8, nv: 8, th: .02 });
    const g = G[n], f = v => (Math.abs(v) < 10 ? v.toFixed(0) : Math.round(v)).toString().replace('-', '−');
    lab(R, [CX[n], 0, W / 2 + .05], ttl, { fs: 12.5, b: 1, dy: 15, c: n === 'ae2' ? P.c2 : P.acc, a: Math.max(.35, a) });
    lab(R, [CX[n], 0, W / 2 + .05], 'z₁ ' + f(g.lo[0]) + ' to ' + f(g.hi[0]) + ', z₂ ' + f(g.lo[1]) + ' to ' + f(g.hi[1]), { fs: 12, mono: 1, dy: 32, c: R.P.mute, a: Math.max(.35, a), wide: 1 }); }
  function cloud(R, n, a, grow) { if (a <= .01) return; for (let i = 0; i < N; i++) { const t = win(grow, (i % 60) / 60 * .6, (i % 60) / 60 * .6 + .4); if (t <= 0) continue;
      R.ball(ptAt(n, i), .045, { c: COL[lb[i]], a: a * t }); } }
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.6, 5.6, -2.9, 2.9, .5);
    const aeA = k === 0 ? 1 : k === 1 ? 1 : k === 3 ? 0 : k === 2 ? .35 : .6, vA = k <= 1 ? .14 : 1;
    plate(R, 'ae2', aeA, 'plain autoencoder'); plate(R, 'vae2', vA, 'VAE (the means)');
    cloud(R, 'ae2', aeA, k === 0 ? e : 1);
    // class names at each class's centre, on wide screens
    const names = (n, a) => { for (let c = 0; c < 10; c++) { let x = 0, z = 0, m = 0; for (let i = 0; i < N; i++) if (lb[i] === c) { const p = ptAt(n, i); x += p[0]; z += p[2]; m++; }
      lab(R, [x / m, .06, z / m], CLS[c], { fs: 12, b: 1, c: COL[c], grp: 'cls' + n, a }); } };
    if (k === 0) names('ae2', win(e, .5, 1)); if (k === 2) names('vae2', win(e, .5, 1));
    if (k >= 2) cloud(R, 'vae2', k === 3 ? .5 : 1, k === 2 ? e : 1);
    // where N(0, I) draws land: the radius-2 circle holds 86% of them (1 - e^-2)
    if (k >= 1 && aeA > 0) ring(R, 'ae2', 2, { c: P.ink, w: 2, dash: [4, 3], a: k === 1 ? e : .9 });
    if (k >= 2) ring(R, 'vae2', 2, { c: P.ink, w: 2, dash: [5, 4], a: k === 2 ? e : .9 });
    if (k === 1 || k === 4) { const n = k === 1 ? 'ae2' : 'vae2', c = at(n, 0, 0);
      R.flow(seg([c[0], 1.6, c[2]], [c[0], .1, c[2]], 10), { c: P.ink, r: .06, n: 5, speed: 1.1, a: k === 1 ? e : 1 });
      lab(R, [c[0], 1.6, c[2]], 'z ~ N(0, I)', { mono: 1, fs: 12.5, b: 1, dy: -12, al: n === 'ae2' ? 'left' : 'right', dx: n === 'ae2' ? 4 : -4, c: P.ink, a: k === 1 ? e : 1 }); }
    if (k === 1) lab(R, at('ae2', 0, 0), 'N(0, I) lives in here', { fs: 12, b: 1, al: 'left', dx: 14, dy: 12, c: P.ink, a: win(e, .3, .8) });
    // each VAE code is a small Gaussian: its sigma drawn as a ring around the mean, to scale
    if (k === 3) { for (let i = 0; i < N; i += 3) { const c = ptAt('vae2', i), u = unit('vae2'), sx = SG[2 * i] / 255 * 2 * u, sz = SG[2 * i + 1] / 255 * 2 * u, pts = [];
        for (let j = 0; j <= 16; j++) { const t = j / 16 * Math.PI * 2; pts.push([c[0] + Math.cos(t) * sx, .05, c[2] + Math.sin(t) * sz]); }
        R.line(pts, { c: COL[lb[i]], w: 1.2, a: e * .9 }); } }
    // decoded at the shown grid point nearest the origin
    const tile = (n, a) => { const t = T0[n], c = at(n, t.z1, t.z2), px = pixels('grid_' + n, t.r * 9 + t.c, redraw), top = [c[0], 1.0, c[2] - .2];
      R.flow(arcPts(R, [c[0], .08, c[2]], [top[0], top[1], top[2]], .1, 10), { c: n === 'ae2' ? P.c2 : P.acc, r: .055, n: 4, a });
      tileUp(R, [top[0] + (n === 'ae2' ? -1 : 1), top[1], top[2]], 1.1, px, a);
      lab(R, [top[0] + (n === 'ae2' ? -1 : 1), top[1] + 1.15, top[2]], 'decoded at (' + t.z1.toFixed(1).replace('-', '−') + ', ' + t.z2.toFixed(1).replace('-', '−') + ')', { fs: 12, mono: 1, dy: -10, c: P.ink, a }); };
    if (k === 1) tile('ae2', win(e, .4, 1)); if (k === 4) { tile('ae2', .8); tile('vae2', win(e, .2, .8)); }
  }
  const full = { cam: [.1, .78], bounds: [[-5, 0, -2.3], [5, 1.2, 2.8]] };
  st = S3.stage({ id: 'stg-lat', list: 'sx-lat', fig: 'Fig. 2 · 600 test images, two latent spaces', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 4800, draw, margin: AVK.margin,
    view: k => k === 1 ? { cam: [.15, .7], bounds: [[-4.9, 0, -2.2], [-.3, 2.2, 2.6]] } : k === 3 ? { cam: [.1, .9], bounds: [[.4, 0, -2.3], [5, .2, 2.4]] } : full });
  window.AVSC2 = { T0, CLS };
})();
