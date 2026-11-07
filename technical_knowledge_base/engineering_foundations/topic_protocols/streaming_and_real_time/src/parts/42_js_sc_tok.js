// ---- Scene: Fig. 4, an LLM token stream over one held response (stg-tok). The running answer over SSE on the 50 ms path, the median
// of 7 runs (SDATA.fw['50'].SSE): the POST, the 200 head with message_start, the stand-in think, the five tokens at their recorded
// arrival times and message_stop. Arrivals drop onto a time ruler in front, drawn to scale. The last step (an error event after the
// start) is illustrative: no failing stream was recorded. ----
(function () {
  if (!document.getElementById('stg-tok') || !window.S3 || !window.STK || !window.SDATA) return;
  const { mix, lerp } = S3, { party, slab, plate, msg, cross, at, win, ms, fmt } = STK;
  const r = SDATA.fw['50'].SSE, A = r.arr, OW = .025, XC = -4.1, XS = 4.1, ZR = 1.55, TM = .42, xt = t => -3.6 + t / TM * 7.2;
  const toks = A.filter(x => x[0] === 'content_block_delta').map(x => x[1]), gaps = toks.slice(1).map((t, i) => ms(t - toks[i]));
  const TOK = ['The', 'sky', 'is', 'blue', '.'];
  window.ST_TOK = { head: ms(A[0][1]), first: ms(r.med_first_token), gaps, last: ms(A[A.length - 1][1]), up: r.up, down: r.down };   // read by check_stages.mjs
  // the run's clock for each step: [from, to] seconds, played over the step's progress
  const W = [[0, .06], [.06, .16], [.16, .19], [.19, .38], [.38, .4], [.4, .4]];
  function draw(R, k, e, st) {
    const P = R.P, E = st.e, t = lerp(W[k][0], W[k][1], E);
    R.grid(-6, 6, -2, 3, .5);
    party(R, [XC - .45, 0, 0], [.9, .8, 1.6], P.c2, 'client');
    party(R, [XS + .45, 0, 0], [.9, .8, 1.6], P.c1, 'server');
    // the request and the response head
    const p = at([XC, .5, .25], [XS, .5, .25], 0, OW, t); if (p) msg(R, p, 325, P.c2, 1, { lab: 'POST · 117-byte body', mono: 1 });
    const open = t >= A[0][1] - OW;
    if (open) slab(R, XC + .05, XS - .05, .28, 0, .7, P.c1, k === 1 ? .55 : 1, { lab: 'one response, held open', at: [0, .28, -.35], al: 'center', dx: 0, dy: -10, wide: 1 });
    const sa = k === 0 ? win(E, .7, 1) : k === 5 ? .6 : k <= 2 ? 1 : .45;
    plate(R, [XS - .6, .8, -.35], P.good, open ? sa : 0, k === 5 ? '200, still' : '200 · text/event-stream', { w: .5, h: .38, glow: k === 0 || k === 5 ? P.good : null, mono: 1 });
    // the think: nothing to write
    if (k === 1) { R.glow([XS + .45, .9, 0], 1.0, { c: P.c5, a: .5 + .3 * Math.sin(E * 6.28) * 0 }); R.label([XS + .45, .8, 0], 'thinking: nothing to send', { fs: 12, b: 1, c: P.c5, dy: -26, a: win(E, .1, .3) }); }
    // events in flight along the held response, and their arrivals on the ruler
    R.line([[xt(0), .01, ZR], [xt(TM), .01, ZR]], { c: P.mute, w: 1.2 });
    for (let g = 0; g <= .4001; g += .1) { R.line([[xt(g), .01, ZR - .08], [xt(g), .01, ZR + .08]], { c: P.mute, w: 1 }); R.label([xt(g), 0, ZR + .1], ms(g) + (g === 0 ? ' ms' : ''), { fs: 12, c: P.mute, dy: 14, mono: 1 }); }
    let j = 0;
    A.forEach(([ev, ta]) => {
      const tok = ev === 'content_block_delta', c = tok ? P.c1 : P.mute, jj = tok ? j++ : -1;
      const q = at([XS, .42, -.1], [XC, .42, -.1], ta - OW, ta, t); if (q) { R.glow(q, .3, { c, a: .7 }); R.ball(q, .1, { c }); }
      if (t >= ta - 1e-6) { const h = tok ? .55 : .28, a = k === 5 ? .5 : 1;
        R.box([xt(ta), 0, ZR], [.14, h, .3], { fill: mix(P.paper, c, .7), a, shadow: false, lw: .7 });
        R.label([xt(ta), h, ZR], tok ? TOK[jj] : ev, { fs: 12, b: tok ? 1 : 0, mono: 1, c: tok ? P.ink : P.mute, dy: -9, a, wide: tok ? 0 : 1 }); }
    });
    if (k >= 2 && t >= toks[0]) {   // TTFT, from sending to the first token
      const y = .02, z = ZR + .55, a = k === 2 ? win(E, .5, 1) : .9;
      R.line([[xt(0), y, z], [xt(toks[0]), y, z]], { c: P.acc, w: 2.4, a, head: 7 });
      R.label([(xt(0) + xt(toks[0])) / 2, y, z], 'TTFT ' + ms(r.med_first_token) + ' ms', { fs: 12.5, b: 1, c: P.acc, dy: 16, a, mono: 1 }); }
    if (k >= 3) gaps.forEach((g, i) => { if (t < toks[i + 1]) return; R.label([(xt(toks[i]) + xt(toks[i + 1])) / 2, .55, ZR], g + ' ms', { fs: 12, mono: 1, c: P.mute, dy: -4, a: k === 3 ? 1 : .8, wide: 1 }); });
    if (k >= 3 && k <= 4) R.flow([[XS - .2, .4, -.1], [XC + .2, .4, -.1]], { c: P.c1, r: .06, n: 8, speed: 1.3, a: k === 3 ? win(E, .1, .3) : .35 });
    if (k === 4) R.label([0, .9, 0], '1 request · ' + r.up + ' B up · ' + fmt(r.down) + ' B down', { fs: 12.5, b: 1, mono: 1, c: P.ink, dy: -10, a: win(E, .4, 1), wide: 1 });
    if (k === 5) { const q = at([XS, .42, -.1], [XC, .42, -.1], 0, 1, Math.min(1, E * 1.2));
      if (q) { R.glow(q, .35, { c: P.bad, a: .8 }); R.ball(q, .11, { c: P.bad }); }
      if (E > .8) R.label([XC + .9, .6, -.1], 'event: error · overloaded_error', { fs: 12, b: 1, mono: 1, c: P.bad, al: 'left', dx: 6, dy: -14, a: win(E, .8, 1) });
      R.label([0, .9, 0], 'illustrative: not a recorded run', { fs: 12, c: P.mute, dy: -30, a: win(E, 0, .2), wide: 1 }); }
  }
  const full = { cam: [0, .6], bounds: [[-5, 0, -.8], [5, .9, 2.3]] };
  S3.stage({ id: 'stg-tok', list: 'sx-tok', fig: 'Fig. 4 · one held response, tokens at their recorded times', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 2600, hold: 4600, draw,
    margin: w => w < 520 ? [18, 8, 16, 8] : [22, 16, 22, 16],
    view: k => k === 2 ? { cam: [0, .56], bounds: [[-5, 0, -.6], [1.6, .9, 2.4]] } : null });
})();
