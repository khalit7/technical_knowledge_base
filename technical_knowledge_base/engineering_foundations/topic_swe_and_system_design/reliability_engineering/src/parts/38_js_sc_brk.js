// ---- Scene: Fig. 5, the circuit breaker's three states (stg-brk), on the page's engine run of the "after" design (RE.P.after: 100 ms timeout,
// breaker over the last 20 calls at 50% failures, 2 s open, 5 trial calls, fallback model) through the 3 s provider slowdown. Counts quoted in the
// step list (refused calls, fallback answers, time open, failures) come from that run; the window's cubes and the probe dots are drawn to scale. ----
(function () {
  if (!document.getElementById('stg-brk') || !window.RS3 || !window.RE) return;
  const { mix, lerp } = S3, { party, plate, lab, win, seg, arcPts, along, fmt, margin } = RS3;
  const C = RE.P.after, A = RE.sim(C), sum = a => a.reduce((x, y) => x + y, 0);
  const N = { win: C.brkN, pct: C.brkF, open: C.brkOpen / 1000, half: C.brkHalf, Td: C.Td, refused: A.tot.brkRej, deg: A.tot.deg, fail: A.tot.fail, openS: sum(A.S.open) / 1000, before: RE.sim(RE.P.before).tot.fail };
  RSN.brk = N;
  const API = [-4.6, 0, 0], G = [-1.4, 0, 0], PRO = [2.6, 0, 0], FB = [-1.4, 0, 2.0], WS = [-4.4, 0, 1.9];
  const PAD = { closed: [1.2, 0, 2.1], open: [2.7, 0, 2.1], half: [4.2, 0, 2.1] };
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.8, 5.6, -1.6, 3.4, .5);
    const state = k === 0 ? 'closed' : k === 1 ? (e < .8 ? 'closed' : 'open') : k === 2 ? 'open' : k === 3 ? (e < .3 ? 'open' : e < .7 ? 'half' : 'open') : (e < .3 ? 'half' : 'closed');
    const gc = state === 'closed' ? P.good : state === 'open' ? P.bad : P.c5;
    party(R, API, [1.1, .7, 1.0], P.c1, 'our chat API', { wide: 1 });
    party(R, PRO, [1.1, .8, 1.0], k >= 1 && k <= 3 ? P.bad : P.c3, k >= 1 && k <= 3 ? 'provider · 3 s a call' : 'model provider', { wide: 1 });
    R.box(G, [.22, 1.0, 1.2], { fill: mix(P.paper, gc, .6) });
    lab(R, [G[0], 1.0, 0], 'breaker: ' + (state === 'half' ? 'half-open' : state), { ph: 1, b: 1, fs: 13.5, c: gc, dy: -12 });
    party(R, FB, [1.0, .45, .8], P.c5, 'fallback model', { a: k >= 2 && k <= 3 ? 1 : .25, wide: 1 });
    // the three states as pads; a ball marks the current one
    Object.entries(PAD).forEach(([s, p]) => { const on = s === state, c = s === 'closed' ? P.good : s === 'open' ? P.bad : P.c5;
      R.box(p, [1.0, .06, .7], { fill: mix(P.paper, c, on ? .55 : .15), a: 1, shadow: false });
      lab(R, [p[0], .06, p[2] + .35], s === 'half' ? 'half-open' : s, { fs: 12.5, b: on ? 1 : 0, c: on ? c : P.mute, dy: 14 }); });
    const bp = state === 'half' ? PAD.half : state === 'open' ? PAD.open : PAD.closed, prev = k === 1 ? PAD.closed : k === 3 ? (e < .5 ? PAD.open : PAD.half) : k === 4 ? PAD.half : bp;
    const t = k === 1 ? win(e, .75, .95) : k === 3 ? (e < .5 ? win(e, .25, .35) : win(e, .65, .75)) : k === 4 ? win(e, .25, .4) : 1;
    const bpos = [lerp(prev[0], bp[0], t), .3 + .3 * Math.sin(Math.PI * t), lerp(prev[2], bp[2], t)];
    R.ball(bpos, .14, { c: gc }); R.glow(bpos, .5, { c: gc, a: .5 });
    // the window of the last 20 outcomes
    const nRed = k === 0 || k === 4 && e > .5 ? 0 : k === 1 ? Math.round(N.win * N.pct / 100 * win(e, .1, .8)) : k === 4 ? N.half : Math.round(N.win * N.pct / 100);
    plate(R, WS, 3.4, .5, P.c1, .8, { nu: 20, nv: 1 });
    for (let i = 0; i < N.win; i++) { const red = i >= N.win - nRed; R.box([WS[0] - 1.6 + i * .168 + .084, .03, WS[2]], [.12, red ? .2 : .12, .3], { fill: mix(P.paper, red ? P.bad : P.good, .7), shadow: false, lw: .5 }); }
    lab(R, [WS[0], 0, WS[2] + .25], 'last ' + N.win + ' calls · trips at ' + N.pct + '% failed', { fs: 12.5, c: P.mute, dy: 16, wide: 1 });
    // calls
    const toP = arcPts(R, [API[0] + .55, .4, -.15], [G[0] - .15, .4, -.15], .1).concat(arcPts(R, [G[0] + .15, .4, -.15], [PRO[0] - .55, .45, -.15], .15).slice(1));
    if (k === 0 || k === 4 && e > .3) { R.flow(toP, { c: P.c4, r: .07, n: 10, speed: 1.6 }); R.flowArc([PRO[0] - .55, .3, .25], [API[0] + .55, .3, .25], .3, { c: P.good, r: .06, n: 8, speed: 1.6 }); }
    if (k === 1) { R.flow(toP.slice(0, 20), { c: P.c4, r: .07, n: 6, speed: 1.4 }); R.flowArc([G[0] + .2, .4, .25], [API[0] + .55, .35, .25], .25, { c: P.bad, r: .07, n: 6, speed: 1.4, a: win(e, .1, .3) });
      lab(R, [(G[0] + PRO[0]) / 2, .6, 0], 'timeout ' + N.Td + ' ms', { mono: 1, b: 1, fs: 12.5, c: P.bad, dy: -18, a: win(e, .1, .3) }); }
    if (k === 2 || k === 3) { R.flow(arcPts(R, [API[0] + .55, .4, -.15], [G[0] - .15, .4, -.15], .1), { c: P.c4, r: .07, n: 6, speed: 1.6 });
      R.flowArc([G[0], .3, .6], [FB[0], .45, FB[2] - .4], .2, { c: P.c5, r: .07, n: 6, speed: 1.4 });
      R.flowArc([FB[0] - .5, .3, FB[2]], [API[0] + .4, .3, .5], .25, { c: P.c5, r: .07, n: 6, speed: 1.4 }); }
    if (k === 2) lab(R, [FB[0], 0, FB[2] + .4], N.refused + ' refused · ' + N.deg + ' by the fallback', { b: 1, fs: 13, c: P.c5, dy: 18, a: win(e, .3, .6) });
    if (k === 3) { const pa = win(e, .3, .45) * (1 - win(e, .62, .7)); for (let i = 0; i < N.half; i++) R.ball(along(toP.slice(19), win(e, .32 + i * .03, .6)), .08, { c: P.c5, a: pa });
      lab(R, [PAD.open[0], .1, PAD.open[2]], N.half + ' trial calls fail: open again', { fs: 12.5, b: 1, c: P.bad, dy: -26, a: win(e, .6, .75) });
      lab(R, [FB[0], 0, FB[2] + .4], 'open ' + fmt(N.openS, 1) + ' s in all', { b: 1, fs: 13, c: P.c5, dy: 18, a: win(e, .7, .9) }); }
    if (k === 4) { for (let i = 0; i < N.half; i++) R.ball(along(toP.slice(19), win(e, .05 + i * .03, .3)), .08, { c: P.good, a: 1 - win(e, .3, .35) });
      lab(R, [PAD.closed[0], .1, PAD.closed[2]], N.fail + ' requests failed in the run', { b: 1, fs: 13, c: P.good, dy: -26, a: win(e, .5, .8) }); }
  }
  const full = { cam: [.22, .72], bounds: [[-6.2, 0, -.8], [5.0, 1.1, 2.9]] };
  S3.stage({ id: 'stg-brk', list: 'sx-brk', fig: 'Fig. 5 · closed, open, half-open', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 2200, hold: 4600, draw, margin });
})();
