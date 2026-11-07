// ---- Scene: Fig. 5 (stg-shut): SIGTERM with three things in flight, replayed from the recording (API_DATA.runs.shutdown[0] uvicorn's default,
// [1] --timeout-graceful-shutdown 1; run_experiments.py, 2026-10-24). Every time is the run's own clock (ms from the start of the run, the same
// clock for server and clients); each step plays one stretch of it. The idle keep-alive connection is drawn closing when uvicorn logs
// "Shutting down" (its Server.shutdown asks every connection to close then); the run itself records only the failed request on it. ----
(function () {
  if (!document.getElementById('stg-shut') || !window.BAK || !window.API_DATA) return;
  const { mix, cl } = S3, { party, stagePlate, cross, tick, win, seg, clock, fmt, chips , lab } = BAK;
  const RUN = window.API_DATA.runs.shutdown;
  let v = 0;
  const ev = (s, n) => (s.server_events.find(e => e.ev.startsWith(n)) || {}).ms, lg = (s, n) => (s.uvicorn_log.find(e => e.log.includes(n)) || {}).ms;
  function T(s) { const c = s.clients; return { keep1: c.keepalive_first.done_ms, slow0: c.slow_request.sent_ms, slowH: ev(s, 'slow request: handler starts'), slow1: c.slow_request.done_ms,
    slowOk: c.slow_request.result === 200, bg0: ev(s, 'job: background work starts'), bgResp: c.bg_job.done_ms, bg1: ev(s, 'job: background work done') || ev(s, 'job: background work cancelled'),
    bgOk: !!ev(s, 'job: background work done'), term: s.sigterm_ms, down: lg(s, 'Shutting down'), wait: lg(s, 'Waiting for connections'), newc: c.new_connection_after_sigterm.sent_ms,
    keep2: c.keepalive_after_sigterm.sent_ms, cancel: lg(s, 'Cancel'), life: ev(s, 'lifespan shutdown'), exit: s.exit_ms } }
  // the stretches of each run: [from, to] in ms
  function stretches(i) { const t = T(RUN[i]);
    return i === 0 ? [[0, t.term - 3], [t.term - 3, t.wait + 5], [t.wait + 5, t.keep2 + 15], [t.keep2 + 15, t.slow1 + 4], [t.slow1 + 4, t.bg1 + 4], [t.bg1 + 4, t.exit + 6]]
      : [[0, t.term - 3], [t.term - 3, t.wait + 5], [t.wait + 5, t.keep2 + 15], [t.keep2 + 15, t.slow1 + 4], [t.slow1 + 4, t.exit + 6]] }
  window.BA_SHUT = { T: i => T(RUN[i]), stretches };   // read by src/check_stages.mjs
  const SRV = [1.4, 0, 0], LST = -.3, KEEP = [-4.2, 0, -1.9], SLOW = [-4.2, 0, 0], NEWC = [-4.2, 0, 1.9], HSL = [1.3, 0, 0], JOB = [1.3, 0, 1.4], POOL = [2.9, 0, .7], MID = -2.3;
  const TL0 = -4.6, TL1 = 3.8, TZ = 3.25, MAXT = 3600, tx = t => TL0 + (TL1 - TL0) * cl(t, 0, MAXT) / MAXT;
  function draw(R, k, e) {
    const P = R.P, W = stretches(v), t = clock(W, k, e), s = RUN[v], A = T(s), gone = t >= A.exit;
    R.grid(-5.6, 4.4, -2.8, 3.8, .5);
    // the process: its floor, the listening socket in front (open, then closed), a handler slot, a background job, the pool
    R.quad([[LST + .1, 0, -2.3], [3.8, 0, -2.3], [3.8, 0, 2.1], [LST + .1, 0, 2.1]], { fill: mix(P.paper, P.c1, .06), fa: gone ? .2 : .6, ea: .5, dash: [5, 4] });
    lab(R, [3.8, 0, -2.3], gone ? 'process exited' : 'uvicorn + the app', { al: 'right', dx: -4, dy: -12, fs: 12.5, b: 1, c: gone ? P.bad : P.mute });
    const open = t < A.down;
    stagePlate(R, LST, 0, open ? P.good : P.bad, gone ? .3 : .9, null, { d: 4.0, h: 1.0, nu: 6, nv: 3 });
    lab(R, [LST, 0, 2.0], open ? 'listening socket' : 'socket closed', { fs: 12.5, b: 1, c: open ? P.good : P.bad, dy: 14 });
    // the clients and their connections
    party(R, KEEP, [.9, .5, .7], P.c6, 'keep-alive client', { grp: 'cl', fs: 12 });
    party(R, SLOW, [.9, .5, .7], P.c5, '3 s request', { grp: 'cl', fs: 12 });
    party(R, NEWC, [.9, .5, .7], P.c2, 'new connection', { grp: 'cl', fs: 12, a: t >= A.newc - 150 ? 1 : .35 });
    // keep-alive: answered early, then idle on an open connection until shutdown closes it; a request on it later fails
    const kOpen = t >= A.keep1 && t < A.down;
    if (t < A.keep1) R.flow(seg([KEEP[0] + .5, .3, KEEP[2]], [LST, .3, KEEP[2]], 10), { c: P.c6, r: .06, n: 5, speed: 1.4 });
    R.line([[KEEP[0] + .5, .3, KEEP[2]], [LST, .3, KEEP[2]]], { c: P.c6, w: kOpen ? 2 : 1.2, a: kOpen ? .8 : .3, dash: kOpen ? null : [4, 4] });
    if (kOpen) lab(R, [MID, .3, KEEP[2]], 'idle, kept open', { fs: 12, c: P.c6, dy: -12, wide: 1 });
    if (t >= A.keep2) { cross(R, [MID, .3, KEEP[2]], 1); lab(R, [MID, .1, KEEP[2]], 'RemoteDisconnected', { fs: 12, b: 1, mono: 1, c: P.bad, dy: 16, wide: 1 }) }
    // the slow request: a stream while it is in flight, its handler filling for 3 s, then an answer or a cut
    const sl = t >= A.slow0 && t < A.slow1;
    if (sl) R.flow(seg([SLOW[0] + .5, .32, SLOW[2]], [HSL[0] - .5, .32, HSL[2]], 18), { c: P.c5, r: .065, n: 8, speed: 1.2, a: .9 });
    const prog = cl((Math.min(t, A.slow1) - A.slowH) / 3000, 0, 1);
    R.box(HSL, [1.0, .5, .6], { fill: mix(P.paper, P.c5, .18), a: gone ? .3 : 1 });
    if (t >= A.slowH) R.box([HSL[0] - .5 + .5 * prog, .5, HSL[2]], [prog, .06, .6], { fill: mix(P.paper, P.c5, .8), shadow: false, a: gone ? .3 : 1 });
    lab(R, [HSL[0], .56, HSL[2]], 'handler · 3 s', { fs: 12, b: 1, dy: -12, c: P.ink, a: gone ? .4 : 1, grp: 'in' });
    if (t >= A.slow1) { if (A.slowOk) { tick(R, [MID, .36, SLOW[2]], 1); lab(R, [MID, .1, SLOW[2]], '200 OK', { fs: 12, b: 1, mono: 1, c: P.good, dy: 16, wide: 1 }) }
      else { cross(R, [MID, .32, SLOW[2]], 1); lab(R, [MID, .1, SLOW[2]], 'no response', { fs: 12, b: 1, c: P.bad, dy: 16, wide: 1 }) } }
    // the background job: answered at once, the work runs on in the process; uvicorn waits for it, or cancels it at the timeout
    const jp = cl((Math.min(t, A.bg1) - A.bg0) / 3000, 0, 1);
    R.box(JOB, [1.0, .4, .6], { fill: mix(P.paper, P.c4, .18), a: gone ? .3 : t >= A.bg0 ? 1 : .35 });
    if (t >= A.bg0) R.box([JOB[0] - .5 + .5 * jp, .4, JOB[2]], [jp, .06, .6], { fill: mix(P.paper, P.c4, .8), shadow: false, a: gone ? .3 : 1 });
    lab(R, [JOB[0], .46, JOB[2]], 'background job · 3 s', { fs: 12, b: 1, dy: -12, c: P.ink, a: gone ? .4 : t >= A.bg0 ? 1 : .4, grp: 'in' });
    if (t >= A.bg1) (A.bgOk ? tick : cross)(R, [JOB[0] + .75, .3, JOB[2]], 1);
    // the pool, opened by the lifespan at startup and closed by it at the end
    const pOpen = t < A.life;
    R.box(POOL, [.9, .35, .7], { fill: mix(P.paper, P.c3, pOpen ? .35 : .05), a: gone ? .3 : 1 });
    lab(R, [POOL[0], .35, POOL[2]], pOpen ? 'pool open' : 'pool closed', { fs: 12, b: 1, dy: -12, c: pOpen ? P.c3 : P.mute, grp: 'in' });
    // a new connection after SIGTERM is refused at the closed socket
    if (t >= A.newc) { const u = win((t - A.newc) / Math.max(1, (W[k][1] - W[k][0]) * .2), 0, 1); const p = [lerpN(NEWC[0] + .5, LST - .15, u), .3, NEWC[2]];
      R.ball(p, .09, { c: P.c2 }); if (u >= 1) { cross(R, [LST - .35, .45, NEWC[2]], 1); lab(R, [LST - .35, .1, NEWC[2]], 'ConnectionRefusedError', { fs: 12, b: 1, mono: 1, c: P.bad, dy: 16, wide: 1 }) } }
    // the run's clock along the front: SIGTERM, shutdown, exit
    R.box([(TL0 + TL1) / 2, 0, TZ], [TL1 - TL0, .04, .14], { fill: P.paper, shadow: false });
    R.box([(TL0 + tx(t)) / 2, .04, TZ], [Math.max(.01, tx(t) - TL0), .04, .14], { fill: mix(P.paper, P.acc, .7), shadow: false });
    [[A.term, 'SIGTERM', P.bad], [A.exit, 'exit', P.ink]].forEach(([m, l, c]) => { if (t >= m) { R.line([[tx(m), .02, TZ - .2], [tx(m), .02, TZ + .2]], { c, w: 2 }); lab(R, [tx(m), 0, TZ + .2], l + ' ' + fmt(m), { fs: 12, b: 1, mono: 1, c, dy: 13, grp: 'tl' }) } });
    lab(R, [TL0, .05, TZ], 't = ' + fmt(t) + ' ms', { fs: 14, b: 1, mono: 1, al: 'left', dy: -14, c: P.ink });
  }
  const lerpN = (a, b, u) => a + (b - a) * u;
  const st = S3.stage({ id: 'stg-shut', list: 'sx-shut-0', fig: 'Fig. 5 · SIGTERM with three things in flight', cam: [.5, .62], bounds: [[-5.0, 0, -2.4], [4.0, 1.1, 3.5]], aspect: .6, dur: 2400, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [28, 14, 18, 14] });
  chips(document.getElementById('shut-mode'), 'sx-shut-', st, m => { v = +m; });
})();
