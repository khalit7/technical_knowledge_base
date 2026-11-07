// ---- Scene: Fig. 2, a connection's life (stg-life, section 3): the running request's handshake, stream and close between the two kernels, each
// segment a block crossing the path, each kernel's TCP state above it. The connect() times are the page's twelve recorded connections
// (window.NF.path.runs); addresses are the documentation ranges of the 5-tuple figure; the states and their order are RFC 9293's. ----
(function () {
  if (!document.getElementById('stg-life') || !window.S3 || !window.NFK || !window.NF) return;
  const { mix } = S3, { up, node, lane, chunk, slot, timer, path, win, arcPts, fmt } = NFK;
  const conn = NF.path.runs.filter(r => !r.error).map(r => r.connect_ms), cMin = Math.min(...conn), cMax = Math.max(...conn);
  window.NF_LIFE = { cMin, cMax };   // read by src/check_stages.mjs
  const XC = -3.0, XS = 3.0, QX = XS + 1.45;
  // [client state, server state, message {d: 'c2s' | 's2c', lab, kind}]
  const ST = [['CLOSED', 'LISTEN', null], ['SYN_SENT', 'LISTEN', { d: 'c2s', lab: 'SYN · seq x · MSS, wscale, SACK, TS', kind: 'ctl' }],
    ['SYN_SENT', 'SYN_RECEIVED', { d: 's2c', lab: 'SYN-ACK · seq y · ack x+1', kind: 'ctl' }], ['ESTABLISHED', 'ESTABLISHED', { d: 'c2s', lab: 'ACK + request · 277 B', kind: 'ctl' }],
    ['ESTABLISHED', 'ESTABLISHED', { d: 's2c', lab: 'head 244 B, then one write per token', kind: 'data' }], ['ESTABLISHED', 'FIN_WAIT_1', { d: 's2c', lab: 'FIN', kind: 'fin' }],
    ['CLOSE_WAIT', 'FIN_WAIT_2', { d: 'c2s', lab: 'ACK of the FIN', kind: 'ack' }], ['LAST_ACK', 'FIN_WAIT_2', { d: 'c2s', lab: 'FIN', kind: 'fin' }],
    ['CLOSED', 'TIME_WAIT', { d: 's2c', lab: 'ACK of the FIN', kind: 'ack' }], ['CLOSED', 'CLOSED', null]];
  function draw(R, k, e) {
    const P = R.P, col = { ctl: P.acc, data: P.c3, fin: P.c2, ack: P.good }, hot = s => s === 'CLOSE_WAIT' || s === 'TIME_WAIT' ? P.bad : s === 'ESTABLISHED' ? P.good : P.ink;
    R.grid(-5.2, 5.2, -2.2, 1.8, .5);
    node(R, [XC, 0, 0], [1.9, .7, 1.6], P.acc, 'client kernel', { sub: k >= 1 ? '192.0.2.10 : 51234' : 'no socket yet' });
    node(R, [XS, 0, 0], [1.9, .7, 1.6], P.c6, 'server kernel', { sub: '203.0.113.5 : 443' });
    lane(R, XC + .95, XS - .95, 0, .9, P.acc, .8);
    const [cs, ss, m] = ST[k], prev = ST[Math.max(0, k - 1)];
    // each kernel's state, the one that just changed glowing
    [[XC, cs, prev[0]], [XS, ss, prev[1]]].forEach(([x, s, s0]) => { const ch = k > 0 && s !== s0, a = ch ? win(e, .55, .9) : 1;
      if (ch) { R.glow([x, .78, 0], .9, { c: hot(s), a: .5 * a }); R.label([x, .7, .8], s0, { mono: true, fs: 13, b: 1, c: P.mute, dy: 18, a: 1 - a }); }
      R.label([x, .7, .8], s, { mono: true, fs: 14, b: 1, c: hot(s), dy: 18, a: ch ? a : 1 }); });
    // the SYN queue and the accept queue beside the server (section 8)
    const qa = k >= 2 && k <= 3 ? 1 : .25;
    if (k >= 1 && k <= 4) { slot(R, [QX, 0, -.5], .6, .4, qa); slot(R, [QX, 0, .35], .6, .4, qa);
      R.label([QX, 0, -.5], 'SYN queue', { fs: 12, c: P.acc, dy: -14, a: Math.max(.45, qa) }); R.label([QX, 0, .35], 'accept queue', { fs: 12, c: P.good, dy: 20, a: Math.max(.45, qa) }); }
    if (k === 2) chunk(R, [QX, 0, -.5], P.acc, win(e, .7, 1), { s: [.46, .14, .3], lab: 'half-open', al: 'left', dx: 26, dy: 0, wide: 1 });
    if (k === 3) chunk(R, [QX, 0, -.5 + .85 * win(e, .7, 1)], P.good, 1, { s: [.46, .14, .3], lab: 'waits for accept()', al: 'left', dx: 26, dy: 0, wide: 1 });
    // the segment of this step crossing the path
    if (m) { const c2s = m.d === 'c2s', a0 = [c2s ? XC + .95 : XS - .95, .7, 0], b0 = [c2s ? XS - .95 : XC + .95, .7, 0], pts = arcPts(R, a0, b0, .5, 24), c = col[m.kind];
      R.flow(pts, { c, r: .07, n: m.kind === 'data' ? 14 : 8, speed: 1.4, a: m.kind === 'data' ? 1 : .7 });
      if (m.kind === 'data') [0, 1, 2, 3].forEach(j => { const u = win(e, j * .15, .5 + j * .15); if (u > 0 && u < 1) chunk(R, path(pts, u), c, 1, { s: [.2, .14, .2] }); });
      else chunk(R, path(pts, win(e, .05, .8)), c, 1, { s: [.4, .16, .34] });
      R.label([0, 1.25, 0], m.lab, { mono: true, fs: 12.5, b: 1, c, dy: -6 }); }
    if (k === 3) { R.label([XC, 0, 1.25], 'connect() returns after one round trip', { fs: 12.5, b: 1, c: P.acc, dy: 4, a: win(e, .6, 1) });
      R.label([XC, 0, 1.25], 'measured ' + fmt(cMin, 1) + ' to ' + fmt(cMax, 1) + ' ms', { fs: 12, c: P.mute, dy: 20, a: win(e, .7, 1), wide: 1 }); }
    // TIME_WAIT: a timer at the server that keeps the 5-tuple for 2 MSL
    if (k >= 8) { const f = k === 8 ? win(e, .6, 1) * .35 : .35 + .65 * win(e, 0, .8);
      timer(R, [QX, 0, .7], f, 1.0, P.bad, k === 9 ? 1 - .7 * win(e, .8, 1) : 1, k === 8 ? 'TIME_WAIT · 60 s on Linux' : '60 s later', { fired: k === 9 && e > .8 }); }
    if (k === 0) R.label([XS, 0, 1.25], 'listening on port 443', { fs: 12.5, b: 1, c: P.c6, dy: 4 });
  }
  const full = { cam: [.12, .55], bounds: [[-4.1, 0, -1.0], [5.0, 1.4, 1.5]] };
  S3.stage({ id: 'stg-life', list: 'sx-life', fig: 'Fig. 2 · open, talk, close, wait', cam: full.cam, bounds: full.bounds, aspect: .42, dur: 1700, hold: 4400, draw,
    margin: w => w < 520 ? [22, 8, 16, 8] : [30, 16, 22, 16],
    view: k => k === 2 || k === 3 ? { cam: [.18, .6], bounds: full.bounds } : null });
})();
