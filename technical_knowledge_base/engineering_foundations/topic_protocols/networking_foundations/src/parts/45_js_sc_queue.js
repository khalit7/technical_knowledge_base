// ---- Scene: Fig. 5, the accept queue (stg-queue, section 8). Steps 1 to 5 replay the recorded experiment (window.NF.local.backlog: listen(2),
// eight clients 50 ms apart, the server calling accept() only after all have written); step 6 is Linux's documented behaviour (not measured here)
// and step 7 an illustrative SO_REUSEPORT layout with four workers. ----
(function () {
  if (!document.getElementById('stg-queue') || !window.S3 || !window.NF || !window.NFK) return;
  const { mix } = S3, { node, chunk, slot, cut, timer, arcPts, path, win } = NFK;
  const BL = NF.local.backlog, CL = BL.clients, N = CL.length, QN = BL.listen_backlog;
  const conn = CL.filter(c => c.connect === 'ok'), served = CL.filter(c => c.reply === 'ok');
  window.NF_QUEUE = { conn: conn.length, n: N, served: served.map(c => c.client), reset: CL.filter(c => c.connect !== 'ok').map(c => c.client), backlog: QN };   // read by src/check_stages.mjs
  const XC = -3.6, XS = 3.3, Z = i => -1.96 + i * .56, QX = i => 1.45 + i * .55;
  function draw(R, k, e) {
    const P = R.P, OK = P.good, BAD = P.bad, A = P.acc;
    R.grid(-5, 5, -2.4, 2.4, .5);
    const workers = k === 6;
    if (!workers) node(R, [XS, 0, 0], [1.5, .7, 1.8], P.c6, 'server', { sub: k <= 3 ? 'busy: no accept() yet' : k === 4 ? 'calls accept()' : 'Linux, queue full' });
    else [-1.35, -.45, .45, 1.35].forEach((z, j) => { node(R, [XS, 0, z], [1.3, .45, .7], P.c6, null, { t: .3 }); R.label([XS + .65, .45, z], 'worker ' + (j + 1), { fs: 12, b: 1, al: 'left', dx: 6, grp: 'w' });
      [0, 1].forEach(q => slot(R, [XS - 1.05 - q * .45, 0, z], .38, .5, .8)); });
    if (!workers) { [0, 1].forEach(q => slot(R, [QX(q), 0, 0], .44, .9, 1)); R.label([QX(.5), 0, .45], 'accept queue · ' + QN + ' places', { fs: 12.5, b: 1, c: OK, dy: 18 }); }
    // the eight clients, each coloured by what happened to it so far
    CL.forEach((c, i) => { const z = Z(i), started = k >= 2 || (k === 1 && i < 2), refused = c.connect !== 'ok';
      let col = P.mute, t = .12; if (started) { col = refused ? BAD : A; t = .35; } if (k >= 3 && !refused && c.send !== 'ok') { col = BAD; t = .5; } if (k >= 4 && c.reply === 'ok') { col = OK; t = .55; }
      if (workers) { col = A; t = .3; }
      node(R, [XC, 0, z], [.7, .34, .36], col, null, { t });
      R.label([XC - .35, .17, z], 'client ' + c.client, { fs: 12, mono: true, al: 'right', dx: -12, c: P.ink, grp: 'cl' }); });
    const from = i => [XC + .35, .3, Z(i)];
    if (k === 1 || k === 2) { const set = CL.filter((c, i) => k === 1 ? i < 2 : i >= 2);
      set.forEach((c, j) => { const i = c.client, pts = arcPts(R, from(i), [QX(Math.min(1, i)) - .2, .2, 0], .4, 18), u = win(e, j * .08, .5 + j * .08);
        R.flow(pts, { c: c.connect === 'ok' ? A : BAD, r: .05, n: 6, speed: 1.4, a: .7 });
        if (c.connect !== 'ok') cut(R, path(pts, .5), win(e, .5, .7), .16); });
      R.label([0, .8, -1.9], k === 1 ? 'handshakes completed by the kernel' : 'connect() returned ok for ' + conn.length + ' of ' + N, { fs: 12.5, b: 1, c: A, a: win(e, .3, .7) }); }
    // the two queued connections (clients 0 and 1) wait in the queue until accept()
    const inQ = q => { if (k === 1) return win(e, .5 + q * .08, .7 + q * .08); if (k >= 2 && k <= 3) return 1; if (k === 4) return 1 - win(e, .1, .5); return 0; };
    [0, 1].forEach(q => { const a = inQ(q); if (a > .01) chunk(R, [QX(q), 0, 0], A, a, { s: [.36, .2, .7], lab: String(q), dy: -8 }); });
    if (k === 3) CL.forEach((c, i) => { if (c.connect !== 'ok') return; const ok = c.send === 'ok', pts = arcPts(R, from(i), ok ? [QX(Math.min(1, i)), .25, 0] : [XS - .75, .35, Z(i) * .3], .35, 18);
      R.flow(pts, { c: ok ? A : BAD, r: .05, n: 6, speed: 1.4, a: .8 }); if (!ok) cut(R, path(pts, .62), win(e, .45, .65), .14);
      R.label([XC + .35, .34, Z(i)], ok ? 'sent' : 'BrokenPipeError', { fs: 12, c: ok ? A : BAD, al: 'left', dx: 14, a: win(e, .5, .8), wide: 1 }); });
    if (k === 4) { [0, 1].forEach(q => { const u = win(e, .1, .5); if (u > 0 && u < 1) chunk(R, [QX(q) + (XS - .6 - QX(q)) * u, 0, 0], A, 1, { s: [.36, .2, .7] }); });
      CL.forEach((c, i) => { if (c.connect !== 'ok') return; const ok = c.reply === 'ok';
        if (ok) R.flow(arcPts(R, [XS - .75, .4, 0], from(i), .45, 20), { c: OK, r: .055, n: 7, speed: 1.4, a: win(e, .45, .6) });
        R.label([XC + .35, .34, Z(i)], ok ? 'reply "ok"' : 'connection reset', { fs: 12, b: ok, c: ok ? OK : BAD, al: 'left', dx: 14, a: win(e, .55, .85), wide: 1 }); }); }
    if (k === 5) { [0, 1].forEach(q => chunk(R, [QX(q), 0, 0], A, 1, { s: [.36, .2, .7] }));
      const pts = arcPts(R, from(3), [QX(0) - .3, .25, 0], .35, 18); R.flow(pts, { c: BAD, r: .05, n: 6, speed: 1.4, a: .8 }); cut(R, path(pts, .9), win(e, .2, .4), .16);
      R.label([QX(0) - .3, .3, 0], 'SYN dropped', { fs: 12.5, b: 1, c: BAD, dy: -22, a: win(e, .3, .5) });
      timer(R, [-1.4, 0, Z(3)], win(e, .3, .65) * 1 / 3 + win(e, .65, 1) * 2 / 3, 1.1, P.c5, 1, e < .65 ? 'resend after 1 s' : 'then 2 s more: 3 s', { wide: 1 }); }
    if (workers) CL.forEach((c, i) => { const w = i % 4, z = [-1.35, -.45, .45, 1.35][w];
      R.flow(arcPts(R, from(i), [XS - 1.05 - (i < 4 ? 0 : .45), .2, z], .3, 16), { c: A, r: .045, n: 5, speed: 1.4, a: .6 });
      if (win(e, .3 + i * .05, .5 + i * .05) > .99) chunk(R, [XS - 1.05 - (i < 4 ? 0 : .45), 0, z], A, 1, { s: [.3, .18, .4] }); });
  }
  const full = { cam: [.12, .78], bounds: [[-4.6, 0, -2.2], [4.4, 1.0, 2.2]] };
  S3.stage({ id: 'stg-queue', list: 'sx-queue', fig: 'Fig. 5 · listen(2) and eight clients', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1700, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 18, 8] : [30, 16, 22, 80],
    view: () => innerWidth < 520 ? { cam: [.35, 1.0] } : null });   // phone: turned and steeper, so the scene fills more of the card
})();
