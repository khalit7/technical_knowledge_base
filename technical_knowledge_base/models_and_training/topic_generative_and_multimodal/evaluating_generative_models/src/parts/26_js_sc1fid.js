// ---- Scene (section 2, Fig. 1): FID from zero on the page's own runs. The floor is the plane of the two directions along which the real
// Inception features vary most (EV.pca: 300 test images and 300 images of the chosen set, projected); each ball is one image. The glass bells are
// the Gaussians fitted to each cloud (EV.pca.stats, the 2-D mean and covariance of those projections), drawn as density contours at Mahalanobis
// radius 0.5 to 2, so a bell's height is its fitted density (one scale for both). The mean term, covariance term and FID are EV.dec, computed over
// all 2,048 dimensions and all 10,000 images; the drawing shows two of the 2,048 directions. What the scene shows is published in window.EVS.fid. ----
(function () {
  if (!document.getElementById('stg-fid') || !window.EVK) return;
  const { card, col, column, lab, fmt, win, seg } = EVK, E = EV, PC = E.pca, SET = Object.fromEntries(E.sets.map(s => [s.k, s]));
  const SC = .3, X = p => p[0] * SC, Z = p => -p[1] * SC, ZS = -3.5, CX = 3.6;
  let set = 'ddpm', st = null;
  // eigen-decomposition of a 2-D covariance: the contour at Mahalanobis radius r is mu + r (sqrt(l1) cos t v1 + sqrt(l2) sin t v2)
  function eig(c) { const a = c[0][0], b = c[0][1], d = c[1][1], tr = (a + d) / 2, q = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b)), l1 = tr + q, l2 = Math.max(1e-9, tr - q), an = Math.atan2(l1 - a, b || 1e-12);
    return { l1, l2, an, det: a * d - b * b }; }
  const peak = S => 1 / (2 * Math.PI * Math.sqrt(eig(S.cov).det)), H0 = 1.4 / peak(PC.stats.test); // world height per unit of density: the real test bell is 1.4 tall
  function ring(S, r, y) { const g = eig(S.cov), out = []; for (let i = 0; i <= 40; i++) { const t = 2 * Math.PI * i / 40, u = r * Math.sqrt(g.l1) * Math.cos(t), v = r * Math.sqrt(g.l2) * Math.sin(t);
      out.push([X([S.mu[0] + u * Math.cos(g.an) - v * Math.sin(g.an)]), y, Z([0, S.mu[1] + u * Math.sin(g.an) + v * Math.cos(g.an)])]); } return out; }
  // a fitted Gaussian as a glass bell: filled contour layers at heights H0 * density, a rim line on each, and the mean as a post to the peak
  function bell(R, S, c, a, grow, o) { o = o || {}; if (a <= .01) return; const hp = H0 * peak(S) * grow;
    [2, 1.5, 1, .5].forEach((r, i) => { const y = hp * Math.exp(-r * r / 2), pts = ring(S, r, y);
      R.quad(pts, { fill: c, a: a * (.13 + .04 * i), fa: 1, ec: c, ea: .8, lw: r === 2 && o.bold ? 2.6 : 1, dz: -i * .001 }); });
    const m = [X(S.mu), 0, Z(S.mu)]; R.line([m, [m[0], hp, m[2]]], { c, w: 1.6, a }); R.line([[m[0] - .12, .01, m[2]], [m[0] + .12, .01, m[2]]], { c, w: 2.4, a }); R.line([[m[0], .01, m[2] - .12], [m[0], .01, m[2] + .12]], { c, w: 2.4, a });
    return hp; }
  function draw(R, k, e) {
    const P = R.P, S = PC.stats, cs = col(P, SET[set].color), cr = P.dark ? [168, 168, 165] : [112, 112, 108], // the real test cloud: a neutral grey, apart from every set's hue
      d = E.dec[set], fl = E.dec.real;
    R.grid(-4, 5.4, -3.9, 3.2, .5);
    // 1. two sets of images: the real test strip and the chosen set's strip (ten images each, one per class)
    const sa = k === 0 ? 1 : k === 1 ? 1 - .65 * e : k === 2 ? .35 - .15 * e : k === 5 ? .2 * e : 0; // gone in the close views of steps 4 and 5
    card(R, E.ref_strip, [-2.8, 1.05, ZS], 5.6, .56, sa); card(R, SET[set].strip, [-2.8, .3, ZS], 5.6, .56, sa);
    lab(R, [-2.85, 1.33, ZS], 'real test images', { al: 'right', dx: -8, fs: 12.5, b: 1, c: P.ink, a: sa > .01 ? Math.max(.5, sa) : 0, grp: 'strip' });
    lab(R, [-2.85, .58, ZS], SET[set].short, { al: 'right', dx: -8, fs: 12.5, b: 1, c: cs, a: sa > .01 ? Math.max(.5, sa) : 0, grp: 'strip' });
    // 2. every image becomes a point: dots stream from each strip to the floor while its 300 points appear
    if (k === 1) { R.flow([[-.3, 1.05, ZS + .05], [-.3, .9, -1.8], [-.3, .05, -.2]], { c: cr, a: .8, r: .06, n: 9 }); R.flow([[.6, .3, ZS + .05], [.6, .4, -1.8], [.4, .05, .2]], { c: cs, a: .8, r: .06, n: 9 }); }
    const pa = k < 1 ? 0 : k === 1 ? 1 : k === 2 ? 1 - .7 * e : .3, grow = k === 1 ? e : 1;
    if (pa > 0) [['test', cr], [set, cs]].forEach(([n, c]) => PC.pts[n].forEach((p, i) => { if (i / 300 > grow) return; R.ball([X(p), .05, Z(p)], .045, { c, a: pa * (n === 'test' ? .75 : .9) }); }));
    if (k >= 1 && k !== 5) lab(R, [-3.4, 0, 3], 'floor: PC 1 and PC 2 of the real features (' + PC.var_pct + ' of their variance)', { al: 'left', fs: 12, dy: 12, c: P.mute, a: k === 1 ? e : .8, wide: 1 });
    // 3. a Gaussian fitted to each cloud
    if (k >= 2) { const g = k === 2 ? e : 1, ba = k === 3 ? .55 : 1;
      const hr = bell(R, S.test, cr, ba, g, { bold: k === 4 }), hg = bell(R, S[set], cs, ba, g, { bold: k === 4 });
      if (k === 2) { lab(R, [X(S.test.mu) - .1, hr * g, Z(S.test.mu)], 'real: μr, Σr', { al: 'right', dx: -10, dy: -6, fs: 12.5, b: 1, c: P.ink, a: e });
        lab(R, [X(S[set].mu) + .1, hg * g, Z(S[set].mu)], SET[set].short + ': μg, Σg', { al: 'left', dx: 10, dy: -6, fs: 12.5, b: 1, c: cs, a: e }); } }
    // 4. the mean term: the distance between the two centres (drawn: the 2-D part of it; the number: all 2,048 dimensions)
    const mr = [X(S.test.mu), .03, Z(S.test.mu)], mg = [X(S[set].mu), .03, Z(S[set].mu)];
    if (k === 3 || k === 5) { R.line([mr, mg], { c: P.bad, w: 3, a: k === 3 ? e : .8, top: 1 }); if (k === 3) R.flow(seg(mr, mg, 6), { c: P.bad, r: .05, n: 4, a: e, top: 1 }); }
    if (k === 3) lab(R, [(mr[0] + mg[0]) / 2, 0, (mr[2] + mg[2]) / 2 + .2], 'mean term ' + fmt(d.mean, 2), { fs: 13, b: 1, mono: 1, dy: 22, c: P.bad, a: win(e, .3, 1) });
    if (k === 4) lab(R, [X(S[set].mu) - 2.1 * Math.sqrt(eig(S[set].cov).l1) * SC, 0, Z(S[set].mu)], 'covariance term ' + fmt(d.cov, 2), { al: 'right', dx: -8, fs: 13, b: 1, mono: 1, c: cs, a: win(e, .3, 1) });
    // 5. FID = mean term + covariance term, as one stacked column, beside the real set's own (the floor); one height scale for both
    if (k === 5) { const top = Math.max(d.mean + d.cov, fl.mean + fl.cov), hs = 1.9 / top, gx = CX, fx = CX + 1.25, t = e;
      R.box([gx, 0, 0], [.72, Math.max(.012, d.mean * hs * t), .72], { fill: P.bad });
      R.box([gx, d.mean * hs * t, 0], [.72, Math.max(.012, d.cov * hs * t), .72], { fill: S3.mix(P.paper, cs, .75), shadow: false });
      R.box([fx, 0, 0], [.72, Math.max(.012, fl.mean * hs * t), .72], { fill: P.bad }); R.box([fx, fl.mean * hs * t, 0], [.72, Math.max(.012, fl.cov * hs * t), .72], { fill: S3.mix(P.paper, P.mute, .6), shadow: false });
      R.flowArc([(mr[0] + mg[0]) / 2, .1, (mr[2] + mg[2]) / 2], [gx, .05, .3], .7, { c: P.bad, r: .05, n: 8, a: .8 });
      lab(R, [gx, (d.mean + d.cov) * hs * t, 0], 'FID ' + fmt(d.mean + d.cov, 2), { fs: 13, b: 1, mono: 1, dy: -14, c: cs, a: win(e, .5, 1) });
      lab(R, [fx, (fl.mean + fl.cov) * hs * t, 0], 'floor ' + fmt(fl.mean + fl.cov, 2), { fs: 12.5, mono: 1, dy: -14, c: P.ink, a: win(e, .5, 1) });
      lab(R, [gx, 0, .36], SET[set].short, { fs: 12, dy: 14, c: cs, a: win(e, .5, 1) }); lab(R, [fx, 0, .36], 'real', { fs: 12, dy: 14, c: P.ink, a: win(e, .5, 1) }); }
  }
  // the numbers the step list names, for the chosen set (the static text is DDPM's; check_stages.mjs compares them)
  function spans() { const d = E.dec[set], fl = E.dec.real, v = { set: SET[set].short, mean: fmt(d.mean, 2), cov: fmt(d.cov, 2), fid: fmt(d.mean + d.cov, 2), floor: fmt(fl.mean + fl.cov, 2) };
    document.querySelectorAll('#sx-fid [data-fid]').forEach(el => { el.textContent = v[el.dataset.fid]; }); window.EVS = window.EVS || {}; EVS.fid = Object.assign({ k: set }, v); }
  const full = { cam: [-.2, .36], bounds: [[-3.4, 0, -3.4], [4.7, 1.7, 2.9]] };
  st = S3.stage({ id: 'stg-fid', list: 'sx-fid', fig: 'Fig. 1 · FID on 10,000 real and 10,000 generated images', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 14, 10] : [18, 16, 18, 130],
    view: k => k === 0 ? { cam: [0, .3], bounds: [[-3, 0, ZS - .1], [3, 1.7, ZS + .4]] } : k === 3 || k === 4 ? { cam: [-.1, .7], bounds: [[-3, 0, -2.7], [3, 1.6, 2.7]] } : full });
  EVK.onload(() => st && st.draw());
  const pick = document.getElementById('ev-fid-set');
  if (pick) pick.addEventListener('click', ev => { const b = ev.target.closest('button[data-m]'); if (!b) return; set = b.dataset.m;
    pick.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); spans(); st.list('sx-fid'); });
  spans();
})();
