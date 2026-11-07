// ---- Scene: Fig. 3 (stg-pool): connection pools and the arithmetic that runs them out (SQLAlchemy's default 5 + 10 per process,
// 20 pods, a deploy that runs old and new together, Postgres's max_connections default of 100), then one request holding its connection
// across the model call against borrowing twice. Steps 4 and 5 are a schematic (five connections, requests queueing), not a run. ----
(function () {
  if (!document.getElementById('stg-pool') || !window.BAK) return;
  const { mix } = S3, { party, plate, bar, win, seg, arcPts , lab } = BAK;
  const POOL = 5, OVER = 10, PODS = 20, MAXC = 100, U = .003;   // bar height: world units per connection
  window.BA_POOL = { POOL, OVER, PODS, MAXC, one: PODS * (POOL + OVER), deploy: 2 * PODS * (POOL + OVER) };   // read by src/check_stages.mjs
  const PG = [2.8, 0, 0], BARS = [4.7, 0, -.55], BARM = [4.7, 0, .55], MODEL = [-.6, 0, -2.3];
  const podAt = (i, g) => [-4.6 + (i % 4) * .62 + (g ? .3 : 0), 0, -1.6 + Math.floor(i / 4) * .8 + (g ? .3 : 0)];
  // one process, drawn large: the pool as five open connections (solid) and ten that may open on demand (faint)
  const BIG = [-3.2, 0, 0], slot = i => [BIG[0] + .75, .22 + (i % 5) * .2, BIG[2] - .45 + Math.floor(i / 5) * .45];
  function draw(R, k, e) {
    const P = R.P; R.grid(-6, 5, -3.2, 2.6, .5);
    party(R, PG, [1.3, 1.0, 1.4], P.c3, 'Postgres', { sub: 'max_connections 100 (default)', t: .35 });
    if (k === 0) {   // one process and its pool
      party(R, BIG, [1.3, 1.2, 1.4], P.c1, 'one service process', { sub: 'pool: 5 open, up to 10 more' });
      for (let i = 0; i < POOL + OVER; i++) { const p = slot(i), open = i < POOL;
        R.box([p[0] + .12, p[1] - .06, p[2]], [.3, .15, .3], { fill: open ? mix(P.paper, P.c3, .8) : P.paper, a: open ? 1 : .35, shadow: false, lw: .6 });
        if (open) { R.line([[p[0] + .25, p[1], p[2]], [PG[0] - .66, .3 + i * .1, 0]], { c: P.c3, w: 1.2, a: .45 });
          R.flow(seg([p[0] + .25, p[1], p[2]], [PG[0] - .66, .3 + i * .1, 0], 10), { c: P.c3, r: .055, n: 4, speed: 1.0, a: win(e, i * .1, i * .1 + .3) }); } }
    }
    if (k === 1 || k === 2) {   // twenty processes, then a deploy that runs a second set beside them
      for (let i = 0; i < PODS; i++) { R.box(podAt(i), [.44, .42, .44], { fill: mix(P.paper, P.c1, .32), a: k === 1 ? win(e, i * .03, i * .03 + .3) : 1, lw: .7 });
        if (k === 2) R.box(podAt(i, 1), [.44, .42, .44], { fill: mix(P.paper, P.c2, .4), a: win(e, i * .025, i * .025 + .3) * .9, lw: .7 }); }
      lab(R, [-3.7, .42, -1.6], k === 1 ? '20 processes × 15' : '20 old + 20 new during a deploy', { fs: 12.5, b: 1, c: k === 1 ? P.c1 : P.c2, dy: -30 });
      [[-.8, P.c1, 0], [0, P.c1, .3], [.8, P.c1, .6]].forEach(([z, c, d]) => R.flow(seg([-2.3, .25, z], [PG[0] - .66, .45, z * .4], 14), { c, r: .07, n: 7, speed: 1.4, a: win(e, d * .5, d * .5 + .3) }));
      if (k === 2) R.flow(seg([-2.0, .5, 1.3], [PG[0] - .66, .6, .4], 14), { c: P.c2, r: .07, n: 7, speed: 1.4, a: win(e, .3, .6) });
      const asked = k === 1 ? PODS * (POOL + OVER) * Math.min(1, e * 1.4) : PODS * (POOL + OVER) * (1 + Math.min(1, e * 1.4));
      bar(R, BARS, Math.round(asked), U, k === 2 ? P.c2 : P.c1, 1, { lab: Math.round(asked) + ' asked for', w: .55, d: .55 });
      bar(R, BARM, MAXC, U, P.c3, 1, { lab: MAXC + ' allowed', w: .55, d: .55 });
      R.line([[BARS[0] - .5, .05 + MAXC * U, BARS[2] - .4], [BARM[0] + .5, .05 + MAXC * U, BARM[2] + .4]], { c: P.bad, w: 1.6, dash: [5, 4], a: .9 });
    }
    if (k >= 3) {   // one process, five connections, a model call that takes seconds (schematic)
      party(R, BIG, [1.3, 1.2, 1.4], P.c1, 'one process', { t: .2 });
      party(R, MODEL, [1.2, .7, .9], P.c4, 'model provider', { sub: 'seconds per call' });
      const hold = k === 3;
      for (let i = 0; i < POOL; i++) { const p = slot(i), busy = hold ? win(e, i * .08, i * .08 + .2) : 0;
        R.box([p[0] + .12, p[1] - .06, p[2]], [.3, .15, .3], { fill: busy > .5 ? mix(P.paper, P.bad, .7) : mix(P.paper, P.good, .55), shadow: false, lw: .6 });
        R.line([[p[0] + .25, p[1], p[2]], [PG[0] - .66, .3 + i * .12, 0]], { c: busy > .5 ? P.bad : P.c3, w: busy > .5 ? 2 : 1.2, a: busy > .5 ? .8 : .4 }); }
      lab(R, [slot(4)[0] + .2, slot(4)[1] + .1, slot(4)[2]], hold ? 'all 5 held, idle' : 'free between borrows', { fs: 12, b: 1, c: hold ? P.bad : P.good, al: 'left', dx: 10, dy: -8, wide: 1 });
      // requests: in the model call (dots streaming to and from the provider) and, when holding, a queue waiting for a connection
      R.flow(arcPts(R, [BIG[0], 1.2, BIG[2] - .3], [MODEL[0], .7, MODEL[2]], .6), { c: P.c4, r: .07, n: 8, speed: 1.1, a: win(e, .2, .5) });
      if (hold) { for (let i = 0; i < 6; i++) R.ball([BIG[0] - 1.1 - (i % 3) * .26, .1 + Math.floor(i / 3) * .22, BIG[2] + .9], .1, { c: P.c2, a: win(e, .45 + i * .06, .55 + i * .06) });
        lab(R, [BIG[0] - 1.36, .4, BIG[2] + .9], 'waiting for a connection', { fs: 12, b: 1, c: P.c2, dy: -14, a: win(e, .6, .8), wide: 1 }); }
      else { [0, 2].forEach((i, j) => R.flow(seg([slot(i)[0] + .25, slot(i)[1], slot(i)[2]], [PG[0] - .66, .3 + i * .12, 0], 10), { c: P.good, r: .06, n: 3, speed: 1.6, a: win(e, .2 + j * .3, .35 + j * .3) }));
        lab(R, [PG[0], 0, PG[2] + .7], 'read the history · save the reply', { fs: 12, c: P.good, b: 1, dy: 16, a: win(e, .4, .7), wide: 1 }); }
    }
  }
  const full = { cam: [.25, .62], bounds: [[-5.4, 0, -2.6], [4.8, 1.3, 2.2]] }, fleet = { cam: [.3, .5], bounds: [[-5.2, 0, -2.0], [5.6, 2.1, 1.6]] };
  S3.stage({ id: 'stg-pool', list: 'sx-pool', fig: 'Fig. 3 · where the connections go', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [32, 14, 18, 14],
    view: k => k === 1 || k === 2 ? fleet : k === 0 ? { cam: [.3, .5], bounds: [[-4.2, 0, -1.2], [3.6, 1.5, 1.2]] } : k >= 3 ? { cam: [.25, .6], bounds: [[-5.0, 0, -2.9], [3.6, 1.5, 1.6]] } : null });
})();
