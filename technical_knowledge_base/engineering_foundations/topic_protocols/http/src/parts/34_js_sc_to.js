// ---- Scene: Fig. 6, the measured timeout runs (stg-to, section 9). Data: window.HD.timeouts (raw/timeouts.json: curl through nginx 1.31.6 with
// proxy_read_timeout 2s, recorded 2026-10-05) for what happened, and window.TCHAIN_V (the same cases as inputs to the section 9 model) for when
// each byte left the server. Each step replays one case over its measured duration: the head, pings and tokens travel from the lab server through
// nginx to curl; nginx's idle timer (and, in step 5, curl's total limit) is a glass column that fills with silence and empties on every byte. ----
(function () {
  if (!document.getElementById('stg-to') || !window.S3 || !window.HTK || !window.HD || !window.TCHAIN || !window.TCHAIN_V) return;
  const { mix } = S3, { up, node, lane, chunk, slot, timer, cut, along } = HTK, C = HD.timeouts.cases, V = TCHAIN_V;
  const CASE = [0, 1, 2, 3, 4, 5];                       // one step per nginx case, in the order of the table
  const CX = -4, NX = 0, SX = 4, ZT = -1.75, HT = 1.8;
  const sec = s => s.toFixed(2) + ' s';
  function draw(R, k, e) {
    const P = R.P, ci = CASE[k], c = C[ci], m = c.curl, [, hops, r] = V[ci], res = TCHAIN.run(hops, r), b = res.b;
    const T = m.seconds, t = T * e, cutAt = res.best ? res.at : null, done = cutAt !== null && t >= cutAt - 1e-9;
    R.grid(-5.4, 5.4, -2.2, 1.6, .5);
    node(R, [CX, 0, 0], [1.2, .62, 1.0], P.acc, 'curl', { sub: k === 4 ? '--max-time 5' : null, subWide: 1 });
    node(R, [NX, 0, 0], [1.2, .62, 1.0], P.c6, 'nginx', { sub: 'proxy_read_timeout 2s', subWide: 1 });
    node(R, [SX, 0, 0], [1.2, .62, 1.0], P.good, 'Lab server', { sub: r.stream ? 'think ' + r.think + ' s, then ' + r.ntok + ' tokens' + (r.gap >= 1 ? ' ' + r.gap + ' s apart' : '') : 'not streamed: one answer after ' + r.think + ' s', subWide: 1 });
    lane(R, CX + .6, NX - .6, 0, .55, P.c1, 1); lane(R, NX + .6, SX - .6, 0, .55, P.c3, 1);
    // nginx's idle timer: the time since the last byte from upstream, against 2 s; curl's total limit in step 5
    let last = 0; b.times.forEach(x => { if (x <= Math.min(t, cutAt == null ? 1e9 : cutAt) + 1e-9) last = x });
    const idleT = done && res.best.kind === 'idle' ? 2 : Math.min(2, Math.min(t, cutAt == null ? 1e9 : cutAt) - last);
    const ngFired = done && hops[res.best.hop].key === 'ing';
    timer(R, [NX, 0, ZT], ngFired ? 1 : (r.stream ? idleT : Math.min(t, 2)) / 2, HT, P.c3, 1, 'idle ' + (ngFired ? '2.00' : (r.stream ? idleT : Math.min(t, 2)).toFixed(2)) + ' of 2 s', { fired: ngFired });
    if (k === 4) { const cf = done && hops[res.best.hop].key === 'client'; timer(R, [CX, 0, ZT], cf ? 1 : t / 5, HT, P.c5, 1, 'total ' + (cf ? '5.00' : t.toFixed(2)) + ' of 5 s', { fired: cf }) }
    // the bytes: the head (purple), pings (yellow), tokens (blue), each crossing both links shortly after it leaves the server
    const TR = Math.max(.08, T * .07), y = .02;
    const kinds = r.stream ? b.times.map((x, i) => i === 0 ? 'head' : x < r.think - 1e-9 ? 'ping' : 'tok') : ['body'];
    b.times.forEach((x, i) => { const kd = kinds[i], col = kd === 'head' ? P.c4 : kd === 'ping' ? P.c5 : P.c1;
      if (cutAt !== null && x >= cutAt - 1e-9) return;               // never sent: the connection was closed first
      if (t < x || t > x + TR) return; const u = (t - x) / TR;
      chunk(R, along([SX - .7, y, 0], [CX + .7, y, 0], u), col, 1, { s: kd === 'ping' ? [.16, .14, .16] : [.26, .2, .26] }) });
    // what curl has received: the head and a slot per token
    const got = b.tokens.filter(x => x <= t + 1e-9 && (cutAt === null || x < cutAt - 1e-9)).length;
    if (r.stream) { const headIn = t >= TR; chunk(R, [CX - .2, y, .95], P.c4, headIn ? 1 : .15, { s: [.3, .24, .3] }); if (headIn) R.label([CX - .2, .24, .95], '200', { mono: true, fs: 12, b: 1, c: P.c4, dy: -12 });
      for (let j = 0; j < r.ntok; j++) { const p = [CX + .25 + j * .3, y, .95]; if (j < got) chunk(R, p, P.c1, 1, { s: [.22, .18, .22] }); else slot(R, p, .22, .22) } }
    R.label([NX, HT + 1.15, ZT], 't = ' + t.toFixed(2) + ' s', { mono: true, fs: 13, b: 1 });
    if (done) {
      const hop = hops[res.best.hop];
      if (!r.stream) { chunk(R, along([NX - .7, y, 0], [CX + .7, y, 0], Math.min(1, (t - cutAt) / TR)), P.bad, 1, { s: [.36, .28, .36] });
        R.label([CX - .6, 0, 1.45], m.http + ' Gateway Time-out · ' + sec(m.seconds), { fs: 12.5, b: 1, c: P.bad, al: 'left', dy: 16 }) }
      else { cut(R, [hop.key === 'client' ? CX + 1.0 : (NX + SX) / 2, .35, 0], 1);
        R.label([CX - .6, 0, 1.45], 'curl exit ' + m.exit + ' · ' + sec(m.seconds) + ' · ' + m.tokens + ' tokens', { fs: 12.5, b: 1, c: P.bad, al: 'left', dy: 16 }) }
    } else if (e > .985) R.label([CX - .6, 0, 1.45], 'complete · ' + sec(m.seconds) + ' · ' + m.tokens + ' tokens', { fs: 12.5, b: 1, c: P.good, al: 'left', dy: 16 });
  }
  const full = { cam: [.18, .5], bounds: [[-4.9, 0, ZT - .3], [4.9, HT + 1.15, 1.7]] };
  S3.stage({ id: 'stg-to', list: 'sx-to', fig: 'Fig. 6 · six measured runs through nginx', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 4200, hold: 4200, draw,
    margin: w => w < 520 ? [36, 8, 22, 8] : [48, 16, 26, 16] });
})();
