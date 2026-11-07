// ---- Scene: Fig. 3, one lost token (stg-loss, section 4). The page's TCP model (window.TCPSIM, the timeline of this section) replays the root's
// recorded stream (the seven writes and their times) on a 100 ms round trip with token 2 lost, timer only or with fast retransmit; every time and
// delay written on the scene and in the step lists is the model's output. The client's receive buffer is a row of slots, the program a glass
// plate above it; a segment that arrives behind the hole waits in its slot until the hole is filled. ----
(function () {
  if (!document.getElementById('stg-loss') || !window.S3 || !window.NFK || !window.TCPSIM) return;
  const { mix } = S3, { node, layer, lane, chunk, slot, timer, cut, path, win, fmt } = NFK;
  const CFG = rec => ({ scn: 'mid', rec, nagle: false, dack: true, rtt: 100 });
  const RUN = {}; ['rto', 'fast'].forEach(m => { const r = TCPSIM.sim(CFG(m)), ideal = t => t.tw + r.R / 2;
    const retx = r.pk.find(p => p.retx), dup = r.pk.filter(p => p.kind === 'ack' && /duplicate/.test(p.lab));
    RUN[m] = { r, retx, dup, extra: r.tok.map(t => t.td - ideal(t)), fire: retx.t0, land: retx.t1 }; });
  window.NF_LOSS = RUN;   // read by src/check_stages.mjs
  let mode = 'rto';
  const X = i => -4.2 + i * .55, XS = 3.4, XL = -.5, YB = .5, YA = 1.4, NAME = ['head', '1', '2', '3', '4', '5', 'end'];
  // a segment's way: off the server, along the path, then down into its slot of the receive buffer
  const route = i => { const pts = [[XS - .75, YB + .05, 0], [XL, YB + .05, 0]]; for (let j = 1; j <= 8; j++) { const u = j / 8; pts.push([XL + (X(i) - XL) * u, YB + .05 + .5 * Math.sin(Math.PI * u), 0]); } return pts; };
  function draw(R, k, e) {
    const P = R.P, D = RUN[mode], C = P.c1, RX = P.c5, AK = P.good, sz = { s: [.42, .18, .5] };
    R.grid(-5, 5, -1.6, 1.8, .5);
    node(R, [X(3), 0, 0], [4.1, YB, 1.1], P.acc, null, { t: .16 }); node(R, [XS, 0, 0], [1.4, YB, 1.1], P.c6, 'server', { t: .2 });
    R.label([X(3), 0, .55], R.W < 520 ? 'client: receive buffer' : 'client: receive buffer, bytes handed over only in order', { fs: 12.5, b: 1, dy: 16 });
    layer(R, [X(3), YA, 0], 4.0, 1.0, P.c4, k >= 4 ? .9 : .55, null);
    R.label([X(0) - .3, YA, 0], 'the program', { fs: 12.5, b: 1, c: P.c4, al: 'right', dx: -6, wide: 1 });
    lane(R, XL, XS - .7, 0, .7, P.acc, .55);
    for (let i = 0; i < 7; i++) { slot(R, [X(i), YB, 0], .44, .52, .9); slot(R, [X(i), YA, 0], .44, .52, .5); }
    if (k >= 1 && k <= 4 && R.W >= 520) NAME.forEach((n, i) => R.label([X(i), YB, .3], n, { fs: 12, mono: true, c: P.mute, dy: 14 }));
    const rise = (i, c, u) => chunk(R, [X(i), YB + (YA - YB) * u + .04, 0], c, 1, sz), lands = (i, c, u0, u1) => { const u = win(e, u0, u1); if (u < 1) chunk(R, path(route(i), u), c, 1, sz); else chunk(R, [X(i), YB + .04, 0], c, 1, sz); };
    for (let i = 0; i < 7; i++) {
      if (i === 0 || (i === 1 && k > 0)) { rise(i, C, 1); continue; }
      if (i === 1) { if (e < .55) lands(1, C, 0, .55); else rise(1, C, win(e, .6, .9)); continue; }
      if (i === 2) {
        if (k === 1) { const u = win(e, 0, .8); if (u < .98) chunk(R, path(route(2), u * .3), C, 1 - win(e, .65, .8), sz); cut(R, [1.2, YB + .25, 0], win(e, .5, .65), .24); R.label([1.2, YB + .4, 0], 'token 2 lost', { fs: 12.5, b: 1, c: P.bad, dy: -18, a: win(e, .55, .75) }); }
        if (k >= 2 && k <= 3) { R.glow([X(2), YB + .1, 0], .45, { c: P.bad, a: .5 }); R.label([X(2), YB + .2, 0], 'hole', { fs: 12.5, b: 1, c: P.bad, dy: -22 }); }
        if (k === 4) { if (e < .55) lands(2, RX, 0, .55); else rise(2, RX, win(e, .6, .9)); }
        if (k === 5) rise(2, RX, 1);
        continue; }
      if (k === 2) lands(i, C, (i - 3) * .12, .45 + (i - 3) * .12);
      if (k === 3) chunk(R, [X(i), YB + .04, 0], C, 1, sz);
      if (k === 4) rise(i, C, win(e, .6, .9));
      if (k === 5) rise(i, C, 1); }
    // duplicate ACKs stream back while the later tokens arrive
    if (k === 2 || k === 3) { R.flow([[XL, .2, .45], [XS - .7, .2, .45]], { c: AK, r: .06, n: 10, speed: 1.3, a: k === 2 ? win(e, .3, .5) : .8 });
      R.label([1.4, .2, .45], 'duplicate ACK ' + D.dup[0].lab.match(/ACK (\d+)/)[1] + ' × ' + D.dup.length, { fs: 12.5, b: 1, c: AK, dy: 16, a: k === 2 ? win(e, .5, .8) : 1 }); }
    if (k === 3) {
      if (mode === 'rto') { timer(R, [XS + 1.05, 0, 0], win(e, 0, .85), 1.1, P.c5, 1, 'timer ' + fmt(D.r.R + 200) + ' ms', { fired: e > .85, wide: 1 });
        R.label([XS, YB, 0], 'fires at ' + fmt(D.fire, 1) + ' ms', { fs: 12.5, b: 1, c: P.bad, dy: -44, a: win(e, .85, 1) }); }
      else { R.glow([XS - .6, YB, .3], .6, { c: AK, a: .6 * win(e, .2, .5) });
        R.label([XS, YB, 0], 'third duplicate: resend at ' + fmt(D.fire, 1) + ' ms', { fs: 12.5, b: 1, c: AK, dy: -44, a: win(e, .3, .6) }); } }
    if (k === 4) R.label([X(4), YA, 0], 'tokens 2 to 5 in one read · ' + fmt(D.land, 1) + ' ms', { fs: 12.5, b: 1, c: P.c4, dy: -34, a: win(e, .75, 1) });
    // the cost: each token's extra wait as a bar standing on the program's plate
    if (k === 5) for (let i = 2; i <= 6; i++) { const v = D.extra[i], h = v / 400 * 1.2 * win(e, 0, .6);
      R.box([X(i), YA + .22, 0], [.26, Math.max(.01, h), .26], { fill: mix(P.paper, P.bad, .7), shadow: false, lw: .7 });
      if (i <= 5) R.label([X(i), YA + .22 + h, 0], (i === 2 ? 'token 2 ' : i === 5 ? 'token 5 ' : '') + '+' + fmt(v, 1) + ' ms', { fs: 12, b: 1, c: P.bad, dy: -10, a: win(e, .5, .9), grp: 'cost' }); }
  }
  const full = { cam: [.12, .5], bounds: [[-4.8, 0, -.8], [4.6, 1.8, 1.0]] };
  const st = S3.stage({ id: 'stg-loss', list: 'sx-loss-rto', fig: 'Fig. 3 · token 2 lost on a 100 ms round trip', cam: full.cam, bounds: full.bounds, aspect: .4, dur: 1900, hold: 4600, draw,
    margin: w => w < 520 ? [20, 8, 18, 8] : [30, 16, 26, 90],
    view: k => k === 5 ? { cam: [.1, .4], bounds: [[-4.6, 0, -.8], [-.4, 2.8, .9]] } : innerWidth < 520 && (k === 2 || k === 4) ? { cam: [.12, .5], bounds: [[-4.7, 0, -.8], [1.6, 1.8, 1.0]] } : null });
  const seg = document.getElementById('loss-mode');
  if (seg && st) seg.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b || b.dataset.m === mode) return; mode = b.dataset.m;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    ['rto', 'fast'].forEach(m => { document.getElementById('sx-loss-' + m).hidden = m !== mode; }); st.list('sx-loss-' + mode); });
})();
