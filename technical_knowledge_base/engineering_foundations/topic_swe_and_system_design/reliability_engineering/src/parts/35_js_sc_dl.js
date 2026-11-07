// ---- Scene: Fig. 2, deadline propagation (stg-dl): one request crosses four hops carrying one absolute deadline; a glass column over each hop
// holds the time left. Times (10 s budget, 7 s spent) are the page's illustrative example. Step 4's two bars are measured: the share of useful
// server work with immediate retries, without and with the server skipping expired work (MEAS, mean of 3 seeds). ----
(function () {
  if (!document.getElementById('stg-dl') || !window.RS3 || !window.MEAS) return;
  const { mix, lerp } = S3, { party, bar, lab, win, seg, along, fmt, margin } = RS3;
  const sum = a => a.reduce((x, y) => x + y, 0), mU = c => 100 * sum(['1', '2', '3'].map(s => MEAS.runs[c][s].useful_share)) / 3;
  const N = { budget: 10, spent: 7, left: 3, uNaive: mU('naive'), uDead: mU('deadline') };
  RSN.dl = N;
  const H = [[-4.8, 0, 0], [-1.6, 0, 0], [1.6, 0, 0], [4.8, 0, 0]], NAMES = ['phone app', 'our chat API', 'provider call', 'provider server'], U = .17; // world units per second of time left
  const path = seg([H[0][0], .55, .9], [H[3][0], .55, .9], 40);
  // the time-left column over hop i: a glass tube the height of the full 10 s, filled to the time that remains
  function column(R, i, left, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, p = H[i], x = p[0] + 1.0, z = -.3;
    R.glass([x - .3, .02, z], [0, N.budget * U, 0], [.6, 0, 0], { c: P.mute, a: a * .35, nu: 1, nv: 10, th: .6 });
    if (left > .02) R.box([x, .02, z + .3], [.5, left * U, .5], { fill: mix(P.paper, o.c || P.acc, .65), a, shadow: false });
    lab(R, [x, .02 + N.budget * U, z + .3], o.txt || (fmt(left, left % 1 ? 1 : 0) + ' s left'), { ph: 1, mono: 1, b: 1, fs: 13, c: o.lc || P.acc, dy: -12, a }); }
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.2, 6.4, -1.8, 2.0, .5);
    H.forEach((p, i) => party(R, p, [1.1, .55, .9], i === 3 && k === 3 ? P.bad : i === 1 ? P.c1 : P.c4, NAMES[i], { a: k === 3 && i === 0 ? 0 : k === 3 && i === 1 ? .3 : k === 2 && i === 3 ? win(e, .6, 1) : k === 3 && i === 3 ? 1 : k === 1 && i === 3 ? 0 : 1, t: i === 3 && k === 3 ? .3 : .22 }));
    // the request moving along the hops, carrying its deadline
    const pos = k === 0 ? lerp(0, .02, e) : k === 1 ? lerp(.02, .34, win(e, 0, .25)) : k === 2 ? lerp(.34, .66, win(e, 0, .5)) : lerp(.66, 1, win(e, 0, .5));
    R.ball(along(path, pos), .13, { c: P.acc }); R.glow(along(path, pos), .5, { c: P.acc, a: .6 });
    R.flow(path.slice(0, Math.max(2, Math.round(pos * 40))), { c: P.acc, r: .06, n: 6, speed: 1.2, a: .6 });
    lab(R, along(path, pos), 'one deadline: now + 10 s', { mono: 1, fs: 12.5, c: P.acc, dy: 20, a: k === 0 ? win(e, .2, .6) : k === 3 ? 0 : 1, wide: 1 });
    // columns of time left
    column(R, 0, N.budget, k === 0 ? win(e, .1, .5) : k === 3 ? 0 : .35, { txt: 'now + 10 s' });
    if (k >= 1) { const left = k === 1 ? lerp(N.budget, N.left, win(e, .25, .85)) : N.left; column(R, 1, left, k === 1 ? 1 : .35, { txt: k === 1 ? null : N.spent + ' s spent' });
      if (k === 1) lab(R, [H[1][0], .1, .45], 'history and retrieval: ' + fmt(N.budget - left, 1) + ' s', { fs: 12.5, c: P.mute, dy: 38, a: win(e, .2, .4) }); }
    if (k >= 2) { const a = k === 2 ? win(e, .3, .7) : .35; column(R, 2, N.left, a, { txt: 'timeout = ' + N.left + ' s left' });
      if (k === 2) { R.glass([H[2][0] + 1.7, .02, -.3], [0, N.budget * U, 0], [.6, 0, 0], { c: P.bad, a: a * .5, nu: 1, nv: 10, th: .6 });
        lab(R, [H[2][0] + 2.05, N.budget * U, 0], 'a fresh 10 s: 7 s too long', { fs: 12.5, b: 1, c: P.bad, dy: -34, al: 'left', dx: -10, a }); } }
    if (k === 3) { const a = win(e, .45, .75); column(R, 3, 0, 1, { txt: 'expired: skip the work', c: P.bad, lc: P.bad });
      R.glow([H[3][0], .4, 0], .9, { c: P.bad, a: .5 * a });
      bar(R, [H[3][0] - .55, 0, 1.6], N.uNaive, .02, P.mute, a, { lab: fmt(N.uNaive, 1) + '%', name: 'retry at once', w: .45, d: .45 });
      bar(R, [H[3][0] + .65, 0, 1.6], N.uDead, .02, P.good, a, { lab: fmt(N.uDead, 1) + '%', name: '+ skip expired', w: .45, d: .45 });
      lab(R, [H[3][0] - 1.3, .05, 1.6], 'useful work, measured', { fs: 12.5, c: P.mute, al: 'right', dx: -6, a, wide: 1 }); }
  }
  const full = { cam: [.25, .74], bounds: [[-5.6, 0, -.8], [6.4, 1.9, 2.1]] };
  S3.stage({ id: 'stg-dl', list: 'sx-dl', fig: 'Fig. 2 · one deadline, passed down every hop', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1700, hold: 4600, draw, margin,
    view: k => k === 1 ? { cam: [.3, .7], bounds: [[-5.6, 0, -.8], [2.4, 1.9, 1.8]] } : k === 3 ? { cam: [.3, .7], bounds: [[-.6, 0, -.8], [6.4, 1.9, 2.3]] } : full });
})();
