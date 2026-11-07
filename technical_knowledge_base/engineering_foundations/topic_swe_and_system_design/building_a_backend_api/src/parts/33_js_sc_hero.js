// ---- Scene: Fig. 1, the hero (stg-hero): one request through one worker process. The stages it passes are glass plates across its path,
// the handler borrows a pooled connection, the model client and a hand-off; every request shares one event loop and a pool of 40 threads
// (AnyIO's default, printed by run_experiments.py); the process's own life runs along the front. The structure the sections teach; no timings. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.BAK) return;
  const { mix } = S3, { party, stagePlate, plate, ring, win, seg, poly, arcPts , lab } = BAK;
  const PL = [[-4.4, 'uvicorn', '§2'], [-3.3, 'middleware', '§4'], [-2.2, 'router', '§2'], [-1.1, 'dependencies', '§4'], [0, 'validation', '§3']];
  const CL = [-6.1, 0, 0], H = [1.5, 0, 0], POOL = [3.9, 0, -1.25], MOD = [3.9, 0, 0], HAND = [3.9, 0, 1.25];
  const LOOP = [-2.6, .02, -2.25], THR = [.9, 0, -2.25], CFG = [-4.6, 0, -2.25];
  const LIFE = [['startup', 'lifespan opens the pool'], ['serving', '/livez, /readyz'], ['SIGTERM', 'stop accepting, drain'], ['exit', 'lifespan closes the pool']];
  function draw(R, k, e) {
    const P = R.P, A = (...ks) => ks.indexOf(k) >= 0 ? 1 : .22;
    R.grid(-7, 5.4, -3.4, 3.6, .5);
    // the process: a dashed outline on the floor
    R.quad([[-5.1, 0, -3.0], [4.8, 0, -3.0], [4.8, 0, 1.95], [-5.1, 0, 1.95]], { fill: mix(P.paper, P.c1, .05), fa: .5, ea: .5, dash: [5, 4], a: .9 });
    party(R, CL, [.9, .6, .9], P.c2, 'client', { a: A(0, 3) });
    // 1. the stages, lit one after another as the request reaches them
    PL.forEach(([x, nm], i) => { const lit = k === 0 ? win(e, i * .14, i * .14 + .18) : k === 3 && i < 2 ? win(e, .55 - i * .25, .75 - i * .25) : 0;
      stagePlate(R, x, 0, P.c1, k === 0 || k === 3 ? .5 + .5 * lit : .22, nm, { glow: P.acc, gl: lit, grp: 'pl', lc: lit > .5 ? P.acc : P.ink, amin: .45 }); });
    party(R, H, [1.2, .8, 1.1], P.acc, 'handler', { a: A(0, 1, 3), t: .35 });
    const IN = [[CL[0] + .5, .5, 0], [H[0] - .62, .5, 0]];
    if (k === 0) R.flow(seg(IN[0], IN[1], 30), { c: P.c2, r: .075, n: 12, speed: 1.6, a: Math.min(1, e * 2) });
    // 2. what the handler borrows: a pooled connection (5 open + 10 overflow), the model client, somewhere to hand off work
    const ba = A(1);
    party(R, POOL, [1.1, .35, .9], P.c3, 'DB pool · 5 + 10', { a: ba, grp: 'res' });
    for (let i = 0; i < 15; i++) { const x = POOL[0] - .4 + (i % 5) * .2, z = POOL[2] - .2 + Math.floor(i / 5) * .2;
      R.box([x, .35, z], [.13, .13, .13], { fill: i < 5 ? mix(P.paper, P.c3, .8) : P.paper, a: ba * (i < 5 ? 1 : .55), shadow: false, lw: .6 }); }
    party(R, MOD, [1.1, .5, .8], P.c4, 'model client', { a: ba, grp: 'res', sub: k === 1 ? 'async, with a timeout' : null });
    party(R, HAND, [1.1, .4, .8], P.c5, 'hand-off', { a: ba, grp: 'res', sub: k === 1 ? 'BackgroundTasks or a queue' : null });
    if (k === 1) [[POOL, P.c3, 0], [MOD, P.c4, .25], [HAND, P.c5, .5]].forEach(([p, c, d]) =>
      R.flow(arcPts(R, [H[0] + .62, .55, H[2]], [p[0] - .56, .3, p[2]], .25), { c, r: .065, n: 7, speed: 1.3, a: win(e, d, d + .3) }));
    // 3. shared by every request of the process: one event loop, 40 threads, settings read once
    const sa = A(2);
    ring(R, LOOP, .72, P.c6, sa, { flow: k === 2, n: 12, w: 2.2 });
    lab(R, [LOOP[0], .05, LOOP[2] - .72], '1 event loop', { b: 1, fs: 12.5, c: P.c6, dy: -12, a: Math.max(.35, sa) });
    if (k === 2) for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2; R.ball([LOOP[0] + .42 * Math.cos(t), .1, LOOP[2] + .42 * Math.sin(t)], .07, { c: P.c2, a: win(e, i * .05, i * .05 + .2) }) }
    for (let i = 0; i < 40; i++) { const x = THR[0] - .7 + (i % 8) * .2, z = THR[2] - .4 + Math.floor(i / 8) * .2;
      R.box([x, 0, z], [.1, .28, .1], { fill: mix(P.paper, P.c6, .45), a: sa * .9, shadow: false, lw: .5 }); }
    lab(R, [THR[0], .28, THR[2] - .4], 'thread pool · 40', { b: 1, fs: 12.5, c: P.c6, dy: -12, a: Math.max(.35, sa) });
    plate(R, CFG, P.c5, sa, 'settings · read once', { w: .7, h: .5, nu: 1, nv: 3 });
    // 4. the answer goes back out through the middleware, in reverse
    if (k === 3) R.flow(seg([H[0] - .62, .3, .3], [CL[0] + .5, .3, .3], 30), { c: P.c3, r: .075, n: 12, speed: 1.6, a: Math.min(1, e * 2) });
    // 5. the process's own life, along the front: startup, serving, SIGTERM, exit
    const la = A(4);
    LIFE.forEach(([t, s], i) => { const x = -4.0 + i * 2.35, lit = k === 4 ? win(e, i * .2, i * .2 + .2) : 0, c = i === 2 ? P.bad : P.c1;
      R.box([x, 0, 2.75], [2.1, .08, .75], { fill: mix(P.paper, c, .15 + .5 * lit), a: Math.max(.25, la), shadow: false });
      lab(R, [x, .08, 2.75], t, { b: 1, fs: 12.5, c: lit > .5 ? (i === 2 ? P.bad : P.acc) : P.ink, dy: -9, a: Math.max(.35, la) });
      if (k === 4) lab(R, [x, .08, 2.75], s, { fs: 12, c: P.mute, dy: 9, a: Math.max(.3, lit), wide: 1 }); });
    if (k === 4) R.flow(seg([-5.0, .1, 2.75], [4.9, .1, 2.75], 30), { c: P.c1, r: .06, n: 10, speed: 1.4, a: .7 });
  }
  const full = { cam: [.5, .62], bounds: [[-6.6, 0, -3.0], [4.6, 1.2, 3.1]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one request, one worker process', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [20, 8, 14, 8] : [26, 14, 18, 14],
    view: k => k === 1 ? { cam: [.55, .6], bounds: [[.3, 0, -2.0], [4.6, 1.2, 2.0]] }
      : k === 2 ? { cam: [.42, .66], bounds: [[-5.2, 0, -3.1], [1.9, .9, -1.2]] }
      : k === 4 ? { cam: [.35, .7], bounds: [[-5.2, 0, 1.8], [5.0, .5, 3.3]] } : null });
})();
