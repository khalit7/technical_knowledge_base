// ---- Scene: Fig. 3, retries multiply layer by layer (stg-amp): one tap, then 3 tries at each of the app, our API and the provider's gateway,
// one stream per attempt, and a bar per layer with its count (3, 9, 27: the page's own example, 3 to the power of the layers that retry);
// then retries at one layer only. Counts are arithmetic, not a measurement. ----
(function () {
  if (!document.getElementById('stg-amp') || !window.RS3) return;
  const { mix } = S3, { party, bar, lab, win, fmt, margin } = RS3;
  const L = [[-5.4, 0, 0], [-2.7, 0, 0], [0, 0, 0], [2.7, 0, 0], [5.4, 0, 0]], NAMES = ['user taps send', 'phone app', 'our API', 'provider gateway', 'model'];
  const TRIES = 3, N = { layers: 3, calls: Math.pow(TRIES, 3), five: Math.pow(TRIES, 5) };
  RSN.amp = N;
  // calls into layer j+1 when the layers in `retry` each try TRIES times
  const count = (j, retry) => { let n = 1; for (let i = 1; i < j; i++) if (retry.indexOf(i) >= 0) n *= TRIES; return n; };
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.4, 6.4, -2.2, 2.6, .5);
    const retry = k === 3 ? [2] : [1, 2, 3].slice(0, k + 1);
    L.forEach((p, i) => party(R, p, i ? [1.0, .6, .9] : [.6, .4, .6], i === 4 ? P.c3 : i === 3 ? P.c4 : P.c1, NAMES[i], { a: 1, t: retry.indexOf(i) >= 0 ? .45 : .2, wide: 1 }));
    // streams between layer i and i+1: one per attempt, fanned out in depth
    for (let i = 0; i < 4; i++) {
      const n = count(i + 1, retry), grow = i === k + 1 && k < 3 ? win(e, .1, .8) : 1;
      if (i > k + 1 && k < 3) continue;
      const m = Math.max(1, Math.round(n * grow)), spread = Math.min(2.4, .16 * (n - 1));
      for (let s = 0; s < m; s++) { const z = n === 1 ? 0 : -spread / 2 + spread * s / (n - 1), hot = n >= 9;
        R.flowArc([L[i][0] + .5, .35, z * .35], [L[i + 1][0] - .5, .35, z], .25 + .02 * s, { c: hot ? P.bad : P.c4, r: n > 9 ? .045 : .06, n: n > 9 ? 3 : 5, speed: 1.3, a: n > 9 ? .8 : 1 }); }
    }
    // a bar per layer: calls it receives
    for (let i = 1; i <= 4; i++) { if (k < 3 && i > k + 2) continue; const n = count(i, retry), a = k < 3 && i === k + 2 ? win(e, .4, .8) : 1;
      bar(R, [L[i][0], 0, 2.4], n, .055, n >= 9 ? P.bad : P.c4, a, { lab: fmt(n) + (n === 1 ? ' call' : ' calls'), ph: 1, w: .45, d: .45 }); }
    if (k === 2) lab(R, [L[4][0] - .45, .6, 2.4], 'five layers: ' + N.five, { b: 1, fs: 13, c: P.bad, al: 'right', dx: -8, a: win(e, .6, .9), wide: 1 });
    if (k === 3) lab(R, [L[2][0], .6, 0], 'the only layer that retries', { b: 1, fs: 13, c: P.acc, dy: -30, a: win(e, .2, .5) });
  }
  const full = { cam: [.2, .74], bounds: [[-6.0, 0, -1.3], [6.0, 1.7, 3.0]] };
  S3.stage({ id: 'stg-amp', list: 'sx-amp', fig: 'Fig. 3 · retries at every layer multiply', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 1500, hold: 4400, draw, margin });
})();
