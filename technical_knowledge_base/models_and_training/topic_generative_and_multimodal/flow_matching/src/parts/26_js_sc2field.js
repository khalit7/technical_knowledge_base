// ---- Scene (section 2, Fig. 2): the marginal field the network learns, as arrows on stacked glass plates at five times. Each arrow is
// 0.45 (1 - t) u(x, t) of the exact field (FMF.exact, straight path), so it points from x towards the field's current guess of the end point,
// E[x1 | x] = x + (1 - t) u; the last two steps add the root's trained 1-RF network (int8) beside the exact field at t = 0.1 and 0.95. ----
(function () {
  if (!document.getElementById('stg-field') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K, TS = [0, .25, .5, .75, .95], SC = .45;
  const G = []; for (let x = -4; x <= 4.01; x += 1) for (let y = -4; y <= 4.01; y += 1) if (Math.hypot(x, y) <= 4.3) G.push([x, y]);
  let C = null;
  function compute() {
    if (C) return C; const net = F.getNet('rf1');
    const ar = t => G.map(p => { const u = F.exact(p[0], p[1], t).u; return [p, [SC * (1 - t) * u[0], SC * (1 - t) * u[1]]]; });
    const nr = t => G.map(p => { const v = net(p[0], p[1], t); return [p, [SC * (1 - t) * v[0], SC * (1 - t) * v[1]]]; });
    return C = { A: TS.map(ar), a01: ar(.1), n01: nr(.1), n95: nr(.95), ode: K.paths({ kind: 'exact', path: 'linear' }, F.noise(16, 23), 48) };
  }
  // the step each plate belongs to (steps 1 to 4 are about one plate each; plate 0.75 shares step 4 with 0.95)
  const focus = [0, 1, 2, 4];
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute(); K.floor(R, { axis: k === 4 });
    TS.forEach((t, i) => {
      // steps 1 to 4 are close views of one plate (step 4: 0.75 and 0.95); the other plates nearly vanish
      const mine = k < 4 ? (i === focus[k] || (k === 3 && i === 3)) : false, a = mine ? 1 : k === 4 ? .7 : 0;
      if (k < 5 || t !== (k === 5 ? .1 : .95)) K.plate(R, t, { a: Math.max(a, k === 4 ? .3 : .12), c: c.u, ga: mine ? .5 : .3, lab: k !== 4 && !mine ? null : 't = ' + t, lc: mine ? c.u : P.mute, grp: 'pl' });
      const aa = mine && i === focus[k] ? e : a;
      if (aa > .01 && k < 5) T.A[i].forEach(([p, v]) => K.arrow(R, t, p, v, { c: c.u, w: mine ? 1.7 : 1.2, a: aa * (mine ? .95 : .6), head: mine ? 5 : 3.5 }));
    });
    // the data on the t = 1 plate, for reference, in the views that show it
    if (k >= 3) { K.plate(R, 1, { a: .5, c: c.data, ga: .25 }); K.cloud(R, 1, F.sampleData(120, 5), c.data, .6); }
    const hl = { 0: 'every arrow points at the empty centre', 1: 'arrows start to turn', 2: 'eight basins, one per blob', 3: 'short arrows into the nearest blob' }[k];
    if (hl) { const t = TS[focus[k]]; K.lab(R, W(t, [0, 4.75]), hl, { fs: 13, b: 1, c: c.u, a: K.win(e, .3, 1) }); }
    // 5. the paths thread the plates: they are the field's lines across time
    if (k === 4) T.ode.forEach((q, i) => { K.path(R, K.part(q, e), { c: P.ink, w: 1.4, a: .75 }); if (i % 2 === 0 && e > .5) K.flow(R, q, { c: c.u, a: .9, r: .05, n: 8 }); });
    // 6 and 7. the trained network (green) against the exact field (blue), close up: at t = 0.1, then at t = 0.95 drawn four times longer
    if (k >= 5) {
      const t = k === 5 ? .1 : .95, m = k === 5 ? 1 : 4, A = k === 5 ? T.a01 : T.A[4], N = k === 5 ? T.n01 : T.n95;
      K.plate(R, t, { a: 1, c: c.u, ga: .45, lab: 't = ' + t + (m > 1 ? ' · arrows 4 times longer' : ''), lc: c.u, grp: 'pl' });
      // step 7: the exact field steps back and the network's arrows are drawn heavier, so the miss reads
      A.forEach(([p, v]) => K.arrow(R, t, p, [v[0] * m, v[1] * m], { c: c.u, w: k === 6 ? 1.5 : 1.8, a: k === 6 ? .9 - .45 * e : .9 }));
      N.forEach(([p, v]) => K.arrow(R, t, p, [v[0] * m, v[1] * m], { c: c.net, w: k === 6 ? 2.4 : 1.8, a: (k === 6 ? 1 : .9) * e, head: k === 6 ? 6 : undefined }));
      K.lab(R, W(t, [0, 4.75]), k === 5 ? 'network (green) on top of the exact field' : 'network off the exact field near the data', { fs: 13, b: 1, c: c.net, a: K.win(e, .4, 1) });
    }
  }
  const one = t => ({ cam: [-1.42, .14], bounds: [[TX(t) - .5, K.YC - K.HS - .3, -K.HS - .1], [TX(t) + .5, K.YC + K.HS + .25, K.HS + .1]] });
  S3.stage({ id: 'stg-field', list: 'sx-field', fig: 'Fig. 2 · the exact marginal field at five times', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20],
    view: k => k < 3 ? one(TS[k]) : k === 3 ? { cam: [-1.2, .22], bounds: [[TX(.75) - .4, 0, -K.HS], [TX(1) + .2, K.YC + K.HS + .25, K.HS]] } : k === 5 ? one(.1) : k === 6 ? one(.95) : K.full });
})();
