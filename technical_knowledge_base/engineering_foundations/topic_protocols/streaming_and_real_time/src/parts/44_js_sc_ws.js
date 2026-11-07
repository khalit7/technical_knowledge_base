// ---- Scene: Fig. 6, a WebSocket from upgrade to close (stg-ws). Every envelope is one recorded frame of the session in
// src/raw/ws_bytes.json (SDATA.wsb.frames: a raw-socket client against the websockets 17.2 server), its length following its size on
// the wire; orange travels from the client, blue from the server. A step reveals its frames in recorded order. ----
(function () {
  if (!document.getElementById('stg-ws') || !window.S3 || !window.STK || !window.SDATA) return;
  const { mix } = S3, { party, slab, plate, msg, at, win, fmt } = STK;
  const F = SDATA.wsb.frames, XC = -4.1, XS = 4.1, ZU = .32, ZD = -.32;
  const STEP = [[0], [1], [2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15], [16, 17]];
  const up = f => /^client/.test(f.dir), sum = ix => ix.reduce((s, i) => s + F[i].len, 0);
  const LAB = { 0: 'GET Upgrade', 1: '101 Switching Protocols', 2: 'message_start', 8: 'message_stop', 9: '"Stop" · masked', 10: 'echo', 11: 'ping "hb"', 12: 'pong',
    13: '"Hel" FIN 0', 14: '"lo" FIN 1', 15: '"Hello"', 16: 'close 1000 "bye"', 17: 'close echoed' };
  window.ST_WS = { get: F[0].len, r101: F[1].len, down: STEP[2].map(i => F[i].len), downSum: sum(STEP[2]), stop: F[9].len, ping: F[11].len, pong: F[12].len,
    frag: [F[13].len, F[14].len], hello: F[15].len, close: [F[16].len, F[17].len], accept: SDATA.wsb.accept_expected, match: F[1].accept_matches };   // read by check_stages.mjs
  function draw(R, k, e, st) {
    const P = R.P, E = st.e;
    R.grid(-6, 6, -2.2, 2.4, .5);
    party(R, [XC - .45, 0, 0], [.9, .8, 1.8], P.c2, 'client');
    party(R, [XS + .45, 0, 0], [.9, .8, 1.8], P.c1, 'websockets 17.2 server');
    // the connection: an HTTP request on TCP for steps 1 and 2, then a pipe with a lane each way, gone after the close
    const ws = k >= 2, gone = k === 4 ? win(E, .75, 1) : 0;
    if (!ws) slab(R, XC + .05, XS - .05, .2, 0, 1.1, P.mute, .55, { lab: 'HTTP/1.1 on one TCP connection', at: [0, .2, .55], al: 'center', dx: 0, wide: 1 });
    else { const a = (k === 2 ? win(E, 0, .2) : 1) * (1 - gone * .85);
      slab(R, XC + .05, XS - .05, .2, ZD, .5, P.c1, a, { lab: k === 2 ? 'frames, server to client' : null, at: [0, .2, ZD - .25], al: 'center', dx: 0, dy: -16, wide: 1 });
      slab(R, XC + .05, XS - .05, .2, ZU, .5, P.c2, a, { lab: k === 3 ? 'frames, client to server' : null, at: [0, .2, ZU + .25], al: 'center', dx: 0, wide: 1 }); }
    if (k === 1 || (k === 0 && E > .9)) plate(R, [XC + .1, .8, .3], P.c2, k === 0 ? win(E, .9, 1) : .5, 'Sec-WebSocket-Key', { w: .42, h: .34, mono: 1 });
    if (k === 1) { plate(R, [XS - .1, .8, .3], P.good, win(E, .7, .9), 'Accept matches', { w: .42, h: .34, glow: P.good });
      R.label([0, .9, 0], SDATA.wsb.accept_expected, { fs: 12, mono: 1, b: 1, c: P.good, dy: -30, a: win(E, .7, 1), wide: 1 }); }
    // the frames of this step, in recorded order; earlier steps' frames are already delivered
    const ix = STEP[k], n = ix.length;
    ix.forEach((i, j) => { const f = F[i], u = up(f), z = ws ? (u ? ZU : ZD) : (u ? .25 : -.25), a0 = j / n, a1 = (j + .9) / n;
      const p = at(u ? [XC, .36, z] : [XS, .36, z], u ? [XS, .36, z] : [XC, .36, z], a0, a1, E);
      const lab = (LAB[i] ? LAB[i] + ' · ' : '') + f.len + ' B';
      if (p) msg(R, p, f.len, u ? P.c2 : P.c1, 1, { k: .007, lab: n > 4 && !LAB[i] ? f.len + ' B' : lab, mono: 1, dy: u ? -12 : 20 });
    });
    if (k === 2 && E >= .99) R.label([0, .9, 0], '7 messages · ' + sum(ix) + ' B on the wire', { fs: 12.5, b: 1, mono: 1, c: P.c1, dy: -10, wide: 1 });
    if (ws && k < 4) { R.flow([[XS - .3, .3, ZD], [XC + .3, .3, ZD]], { c: P.c1, r: .05, n: 7, speed: 1.1, a: .5 }); if (k === 3) R.flow([[XC + .3, .3, ZU], [XS - .3, .3, ZU]], { c: P.c2, r: .05, n: 7, speed: 1.1, a: .5 }); }
    if (k === 4 && E > .8) R.label([0, .5, 0], 'TCP closes', { fs: 12.5, b: 1, c: P.mute, dy: -20, a: win(E, .8, 1) });
  }
  S3.stage({ id: 'stg-ws', list: 'sx-ws', fig: 'Fig. 6 · one recorded WebSocket, every frame to scale', cam: [0, .62], bounds: [[-5.2, 0, -1.0], [5.2, 1.0, 1.2]], aspect: .42, dur: 3000, hold: 4600, draw,
    margin: w => w < 520 ? [18, 8, 14, 8] : [24, 16, 18, 16] });
})();
