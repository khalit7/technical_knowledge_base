// ---- Fig. 1 (the idea): 300 two-moons points noised in closed form on five glass plates (t = 0, 250, 500, 750, 1,000; the tiny
// model's linear schedule, one fixed noise draw), then walked back by the trained noise-prediction network: DDIM, 50 calls, from where
// the forward process ended (DZSC.hero, recorded by make_scene_data.mjs with the page's own sampler). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.DZK) return;
  const K = DZK, H = DZSC.hero, TS = [0, 250, 500, 750, 1000], W = 2.6, GAP = 3.05, cx = i => (i - 2) * GAP, C = i => [cx(i), 0, 0];
  const BACK = { 1000: K.noised(1000) }; H.back.forEach(f => BACK[f.w] = K.dec('hb' + f.w, f.X));
  const TRACK = [3, 40, 77, 120, 151, 188, 230, 262];    // points whose path is drawn as flows (four per moon)
  const sq = t => Math.sqrt(K.ab(t));
  const sub = t => { const v = sq(t); return '√ā = ' + (t === 0 ? '1' : v < .1 ? v.toPrecision(2) : v.toFixed(2)) };
  function draw(R, k, e) {
    const P = R.P, moon = i => K.D.Y[i] ? P.c2 : P.c1;
    R.grid(-8, 8, -2, 2, .5);
    // the five plates: all drawn faintly from the first step, so the layout is visible before the noise arrives
    TS.forEach((t, i) => { const on = k === 0 ? (i === 0 ? 1 : .18) : k === 1 ? (i === 0 ? 1 : i < 4 ? .25 + .75 * S3.cl(e * 3 - (i - 1), 0, 1) : .18) : k === 2 ? (i === 4 ? 1 : .45) : k === 3 ? 1 : (i === 0 ? 1 : .3);
      K.plate(R, C(i), W, i === 0 ? P.c3 : P.c6, on, 't = ' + t.toLocaleString('en-GB'), sub(t)); });
    // forward: the data, then each plate's closed-form noisy copy (the same eps for every t)
    const fwdA = k <= 2 ? 1 : k === 3 ? 1 - .75 * e : .25;
    K.cloud(R, C(0), K.D.X, moon, k >= 3 ? (k === 3 ? 1 - .7 * e : .3) : 1, { grow: k === 0 ? e : 1 });
    for (let i = 1; i < 5; i++) { const g = k === 0 ? 0 : k === 1 ? (i < 4 ? S3.cl(e * 3 - (i - 1), 0, 1) : 0) : k === 2 && i === 4 ? e : 1;
      if (g <= 0) continue; K.cloud(R, C(i), K.noised(TS[i]), moon, k >= 3 && i === 4 ? (k === 3 ? 1 : .4) : fwdA, { every: k >= 3 && i < 4 ? 3 : 1, grow: g }); }
    // flows: tracked points travelling plate to plate (forward in step 2, back in step 4)
    if (k === 1 || k === 2) { for (let i = 0; i < (k === 1 ? 3 : 4); i++) TRACK.forEach(j => { const a = i === 0 ? K.D.X : K.noised(TS[i]), b = K.noised(TS[i + 1]);
      R.flowArc(K.at(C(i), a[2 * j], a[2 * j + 1], .07), K.at(C(i + 1), b[2 * j], b[2 * j + 1], .07), .55, { c: moon(j), r: .05, n: 5, speed: 1.4, a: k === 1 ? Math.min(1, e * 2) : (i === 3 ? e : .35) }); }); }
    // back: the network's DDIM path, recorded at the plates it passes (after 13, 25, 37 and 50 calls)
    if (k >= 3) { const acc = P.c4;
      for (let i = 3; i >= 0; i--) { const g = k === 3 ? S3.cl(e * 4 - (3 - i), 0, 1) : 1; if (g <= 0) continue;
        K.cloud(R, C(i), BACK[TS[i]], acc, k === 4 && i > 0 ? .35 : 1, { grow: g, h: .09, r: i === 0 ? .05 : .045 }); }
      if (k === 3) for (let i = 4; i > 0; i--) TRACK.forEach(j => { const a = BACK[TS[i]], b = BACK[TS[i - 1]];
        R.flowArc(K.at(C(i), a[2 * j], a[2 * j + 1], .1), K.at(C(i - 1), b[2 * j], b[2 * j + 1], .1), .55, { c: acc, r: .05, n: 5, speed: 1.4, a: .9 }); });
      R.label([cx(2), .5, -1.45], k === 3 ? '← the network, 50 calls (DDIM)' : '', { fs: 12.5, b: 1, c: acc, a: k === 3 ? Math.min(1, e * 2) : 0, wide: 1 }); }
    if (k === 1) R.label([cx(2), .5, -1.45], 'add noise in one line, no network →', { fs: 12.5, b: 1, c: P.ink, a: Math.min(1, e * 2), wide: 1 });
    if (k === 4) R.label(K.at(C(0), 0, 1.55, .1), 'samples: ' + K.pc(H.on) + ' on the moons', { fs: 12.5, b: 1, c: P.c4, a: e > .85 ? (e - .85) / .15 : 0 });
  }
  const full = { cam: [.1, .95], bounds: [[-7.6, 0, -1.5], [7.6, .4, 1.6]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · noise in one line, back in 50 network calls', cam: full.cam, bounds: full.bounds, aspect: .34, dur: 1700, hold: 4600, draw, margin: K.margin,
    view: k => k === 0 ? { cam: [.15, .78], bounds: [[-7.6, 0, -1.6], [-1.4, .6, 1.9]] } : k === 2 ? { cam: [-.15, .8], bounds: [[1.4, 0, -1.6], [7.6, .6, 1.9]] } : k === 4 ? { cam: [.15, .8], bounds: [[-7.6, 0, -1.7], [-1.4, .6, 1.9]] } : full });
})();
