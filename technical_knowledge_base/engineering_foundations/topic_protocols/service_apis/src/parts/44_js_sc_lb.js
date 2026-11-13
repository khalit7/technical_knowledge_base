// ---- Scene: Fig. 5, load balancing gRPC (stg-lb): where the replica is chosen, and how often. One client channel, a balancer when there is one,
// three replicas; thick lines are TCP connections, dots are calls, bars are the calls each replica answered. Counts from window.SA.lb (lb.json,
// recorded 5 October 2026): the 30-call runs (steps 1 to 4) and the calls after backend-3 joined at 1.5 s (steps 5 to 8). ----
(function () {
  if (!document.getElementById('stg-lb') || !window.S3 || !window.SAK || !window.SA) return;
  const { mix } = S3, { up, party, bar, cross, win, seg } = SAK;
  const B = ['backend-1', 'backend-2', 'backend-3'], cnt = o => B.map(b => o[b] || 0);
  const C30 = re => cnt(SA.lb.counts.find(c => re.test(c.setup)).answers), TL = SA.lb.timelines;
  const STEPS = [
    { bal: 'L4', conn: [0], n: C30(/^L4 balancer \(nginx stream\)/) },
    { bal: 'L7', conn: [0, 1, 2], n: C30(/^L7 balancer/) },
    { bal: null, conn: [0], known: [1, 2], n: C30(/pick_first/) },
    { bal: null, conn: [0, 1, 2], n: C30(/^client, round_robin/) },
    { bal: 'L4', conn: [0], n: cnt(TL[0].after_join), join: TL[0] },
    { bal: 'L4', conn: [0, 1, 2], hop: 1, n: cnt(TL[1].after_join), join: TL[1] },
    { bal: 'L7', conn: [0, 1, 2], n: cnt(TL[2].after_join), join: TL[2] },
    { bal: null, conn: [0, 1], unknown: 2, n: cnt(TL[3].after_join), join: TL[3] }];
  window.SA_LB = { STEPS };   // read by src/check_stages.mjs
  const CL = [-4.4, 0, 0], BL = [-1.2, 0, 0], RP = [[2.6, 0, -1.8], [2.6, 0, 0], [2.6, 0, 1.8]];
  function draw(R, k, e) {
    const P = R.P, s = STEPS[k], joined = k >= 4, unit = joined ? .014 : .045;
    R.grid(-5.6, 5.6, -3.0, 3.0, .5);
    party(R, CL, [1.3, .7, 1.1], P.c1, 'client', { sub: 'one channel' });
    if (s.bal) party(R, BL, [1.0, .85, 1.0], s.bal === 'L4' ? P.c6 : P.c5, s.bal + ' balancer', { sub: s.bal === 'L4' ? 'nginx stream' : 'nginx grpc_pass' });
    RP.forEach((p, i) => { const fresh = i === 2 && joined, a = fresh ? win(e, 0, .4) * .75 + .25 : 1;
      party(R, p, [1.2, .6, 1.0], P.c3, B[i], { a, fs: 12.5 });
      if (fresh) R.glow(up(p, .3), .9, { c: P.c3, a: .5 * (1 - win(e, .3, 1)) }); });
    // connections: thick lines; the client's goes through the balancer when there is one
    const cOut = [CL[0] + .65, .35, CL[2]], bIn = [BL[0] - .5, .35, BL[2]], bOut = [BL[0] + .5, .35, BL[2]], rIn = i => [RP[i][0] - .6, .3, RP[i][2]];
    const thick = (a, b, c, al) => R.line([a, b], { c, w: 4, a: al == null ? .55 : al });
    const src = s.bal ? bOut : cOut;
    if (s.bal) thick(cOut, bIn, P.c1);
    (s.known || []).forEach(i => R.line([cOut, rIn(i)], { c: P.mute, w: 1.2, a: .55, dash: [4, 4] }));
    if (s.unknown != null) R.label([RP[s.unknown][0], 0, RP[s.unknown][2] + .55], 'not in the client\'s list', { fs: 12, b: 1, c: P.bad, dy: 32 });
    const share = s.n.map(v => v / Math.max(1, s.n.reduce((x, y) => x + y, 0)));
    s.conn.forEach((i, j) => {
      // L4 + MAX_CONNECTION_AGE: one connection at a time, closed with GOAWAY and reopened through the balancer, a new choice each time
      const al = s.hop ? .2 + .6 * (Math.floor(e * 6) % 3 === i ? 1 : 0) : .55;
      thick(src, rIn(i), s.bal === 'L7' ? P.c5 : s.bal === 'L4' ? P.c6 : P.c1, al);
      if (s.n[i] > 0) R.flow(seg(src, rIn(i)), { c: P.c2, r: .065, n: Math.max(2, Math.round(2 + 8 * share[i])), speed: 1.4 }); });
    if (s.bal) R.flow(seg(cOut, bIn), { c: P.c2, r: .065, n: 6, speed: 1.4 });
    if (s.hop) R.label([(BL[0] + RP[1][0]) / 2, .6, -2.4], 'GOAWAY about every second · reconnect · a new choice', { fs: 12, b: 1, c: P.c6, wide: 1 });
    RP.forEach((p, i) => bar(R, [p[0] + 1.5, 0, p[2]], s.n[i], unit * win(e, .15, .8) + 1e-6, P.c2, 1, { w: .4, d: .4, lab: String(s.n[i]) }));
    if (!joined) R.label([RP[0][0] + 1.5, 0, RP[0][2] - 1.0], 'calls, of 30', { fs: 12, b: 1, c: P.mute, dy: -4, al: 'left', dx: -20, wide: 1 });
    else R.label([RP[0][0] + 1.5, Math.max(1.4, Math.max(...s.n) * unit * win(e, .15, .8)), RP[0][2]], 'calls after backend-3 joined', { fs: 12, b: 1, c: P.mute, dy: -34, al: 'right', dx: 20, wide: 1 });   // above the tallest bar, clear of it
    if (joined) R.label([RP[2][0], 0, RP[2][2] + .55], 'joined at ' + s.join.backend3_joined_s.toFixed(1) + ' s', { fs: 12, b: 1, c: P.c3, dy: 16, a: win(e, .2, .5) });
  }
  const full = { cam: [.12, .56], bounds: [[-5.2, 0, -2.4], [4.7, 1.3, 2.6]] };
  S3.stage({ id: 'stg-lb', list: 'sx-lb', fig: 'Fig. 5 · who chooses the replica, and how often', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1400, hold: 4600, draw,
    margin: w => w < 520 ? [20, 8, 18, 8] : [26, 16, 22, 16],
    view: () => innerWidth < 520 ? { cam: [.45, .85] } : null });   // phone: turned and steeper, so the parts are larger
})();
