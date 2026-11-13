// ---- Scene: Fig. 2, head-of-line blocking at the HTTP layer (stg-hol, section 5). Data: window.HD.hol, the measured runs of src/lab/hol_app.py
// (A: the running request with a 1 s think; B: GET /health sent 10 ms later; three runs per mode; medians). One connection is a glass strip on the
// floor between the client and the server; requests and answers are blocks that travel it; the times written on the scene are the medians. ----
(function () {
  if (!document.getElementById('stg-hol') || !window.S3 || !window.HTK || !window.HD) return;
  const { at } = S3, { up, node, lane, chunk, along, win } = HTK, D = HD.hol.runs;
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] };
  const M = {}; Object.keys(D).forEach(k => { M[k] = {}; ['A_first', 'A_last', 'B_first', 'B_last'].forEach(x => M[k][x] = med(D[k].map(o => o[x]))) });
  window.HOL_MED = M;   // for src/check_stages.mjs
  const f1 = v => (Math.round(v * 10) / 10).toLocaleString('en-US');
  const CX = -4, SX = 4, Z1 = 0, Z2 = -1.7;
  function draw(R, k, e) {
    const P = R.P, A = P.c1, B = P.c2; R.grid(-5.4, 5.4, -2.8, 1.4, .5);
    node(R, [CX, 0, -.85], [.9, .55, 2.5], P.acc, 'Client', { sub: 'one process' });
    node(R, [SX, 0, -.85], [.9, .55, 2.5], P.good, 'Lab server', { sub: 'hypercorn' });
    const two = k === 2, h2 = k === 3;
    lane(R, CX + .55, SX - .55, Z1, .7, h2 ? P.c6 : P.c1, 1);
    lane(R, CX + .55, SX - .55, Z2, .7, P.c2, two ? at(k, e, 2) : 0);
    R.label([0, 0, Z1 + .35], h2 ? 'one TCP connection · stream 1 (A) and stream 3 (B)' : 'connection 1 · HTTP/1.1', { fs: 12.5, c: P.mute, dy: 16 });
    if (two) R.label([0, 0, Z2 + .35], 'connection 2 · its own TCP and TLS handshake', { fs: 12.5, c: P.c2, dy: 16, a: at(k, e, 2) });
    const cl = [CX + .7, .02, Z1], sv = [SX - .7, .02, Z1];
    if (k === 0) {   // A, then B right behind it on the same connection
      chunk(R, along(cl, sv, win(e, 0, .45)), A, 1, { s: [.36, .3, .36] });
      chunk(R, along([cl[0], .02, Z1 - .12], [sv[0] - .45, .02, Z1 - .12], win(e, .15, .6)), B, 1, { s: [.3, .24, .3] });
      R.label(along(cl, sv, win(e, 0, .45)), 'A · POST /v1/messages', { fs: 12.5, b: 1, c: A, dy: -30, a: 1 - win(e, .45, .55) });
      R.label(along([cl[0], .02, Z1], [sv[0] - .45, .02, Z1], win(e, .15, .6)), 'B · GET /health', { fs: 12.5, b: 1, c: B, dy: 22, a: 1 - win(e, .6, .7) });
      const g = win(e, .5, .8); R.glow(up([SX, 0, Z1], .85), .8, { c: A, a: .7 * g }); R.label([SX - .6, .7, Z1 - .2], 'A: thinking 1 s', { fs: 12.5, b: 1, c: A, al: 'right', dx: -10, dy: -10, a: g });
      const q = win(e, .7, 1); chunk(R, [SX - 1.2, .02, Z1 + .05], B, q, { s: [.3, .24, .3], t: .85 });
      R.label([SX - 1.2, 0, Z1 + .4], "B's answer: ready, queued behind A", { fs: 12.5, b: 1, c: B, dy: 18, a: q });
    }
    if (k === 1) {   // A's tokens stream back, then B's answer finally follows
      const ua = win(e, 0, .62), ub = win(e, .62, 1);
      R.flow([[SX - .6, .3, Z1], [CX + .6, .3, Z1]], { c: A, r: .065, n: 12, speed: 1.4, a: ua < 1 ? 1 : .25 });
      chunk(R, along(sv, cl, ua), A, 1, { s: [.36, .3, .36] });
      chunk(R, along([SX - 1.2, .02, Z1 + .05], [cl[0] + .5, .02, Z1 + .05], ub), B, 1, { s: [.3, .24, .3], t: .85 });
      R.label([CX, .7, Z1], 'A done · ' + f1(M.h1_pipelined.A_last) + ' ms', { fs: 12.5, b: 1, c: A, dy: -48, a: ua >= 1 ? 1 : 0 });
      R.label(along([SX - 1.2, .02, Z1], [cl[0] + .5, .02, Z1], ub), 'B · ' + f1(M.h1_pipelined.B_last) + ' ms', { fs: 12.5, b: 1, c: B, dy: 24 });
    }
    if (k === 2) {   // two connections: B never meets A
      R.glow(up([SX, 0, Z1], .85), .8, { c: A, a: .6 });
      chunk(R, [SX - .7, .02, Z1], A, .7, { s: [.36, .3, .36] }); R.label([SX - .7, .3, Z1], 'A, still thinking', { fs: 12.5, c: A, dy: -14, b: 1 });
      const c2 = [CX + .7, .02, Z2], s2 = [SX - .7, .02, Z2], u = win(e, .1, .9), p = u < .5 ? along(c2, s2, u * 2) : along(s2, c2, u * 2 - 1);
      chunk(R, p, B, 1, { s: [.3, .24, .3] });
      if (u > .5) R.flow([[SX - .6, .3, Z2], [CX + .6, .3, Z2]], { c: B, r: .06, n: 10, speed: 1.4, a: .8 });
      R.label([CX + .7, .3, Z2], 'B · ' + f1(M.h1_two_conns.B_last) + ' ms', { fs: 12.5, b: 1, c: B, dy: -14, al: 'left', dx: 22, a: win(e, .85, 1) });
    }
    if (k === 3) {   // HTTP/2: B's frames pass on the same connection while A thinks
      R.glow(up([SX, 0, Z1], .85), .8, { c: A, a: .6 });
      chunk(R, [SX - .7, .02, Z1 + .15], A, .7, { s: [.3, .26, .3] }); R.label([SX - .7, .3, Z1 + .15], 'stream 1: A thinking', { fs: 12.5, c: A, dy: -14, b: 1 });
      const u = win(e, .1, .9);
      [0, 1, 2].forEach(j => { const v = u * 1.2 - j * .1, p = v < .5 ? along([cl[0], .02, Z1 - .15], [sv[0], .02, Z1 - .15], v * 2) : along([sv[0], .02, Z1 - .15], [cl[0], .02, Z1 - .15], v * 2 - 1);
        if (v > 0 && v < 1) chunk(R, p, B, 1, { s: [.2, .16, .2] }) });
      R.flow([[CX + .6, .22, Z1 + .15], [SX - .6, .22, Z1 + .15]], { c: A, r: .05, n: 6, speed: .9, a: .5 });
      R.label([CX + .7, .3, Z1 - .2], 'B (stream 3) · ' + f1(M.h2_one_conn.B_last) + ' ms', { fs: 12.5, b: 1, c: B, dy: 30, al: 'left', dx: 22, a: win(e, .85, 1) });
    }
  }
  const full = { cam: [.16, .66], bounds: [[-4.8, 0, -2.6], [4.8, 1.3, .9]] };
  S3.stage({ id: 'stg-hol', list: 'sx-hol', fig: 'Fig. 2 · A slow, B quick: one connection or two, HTTP/1.1 or 2', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 2600, hold: 4400, draw,
    margin: w => w < 520 ? [30, 8, 24, 8] : [44, 16, 30, 16],
    view: k => k === 2 ? full : { cam: [.14, .6], bounds: [[-4.8, 0, -1.2], [4.8, 1.3, .9]] } });
})();
