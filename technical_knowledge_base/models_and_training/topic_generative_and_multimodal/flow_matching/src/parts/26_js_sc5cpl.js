// ---- Scene (section 7, Fig. 5): couplings. One batch of B = 64 seeded noises (FMF.noise, seed 13) and 64 points of the ring (FMF.sampleData,
// seed 17): random pairs (i with i) against minibatch optimal-transport pairs (the assignment of least total squared distance, solved here by the
// Hungarian algorithm, as fm_toy.py does with scipy's linear_sum_assignment). On the t = 0.5 plate each line's point carries its direction,
// x1 - x0 (drawn at 0.3 of its length). The mean squared lengths are of this batch; the step list's recorded numbers are fm_toy.py's. ----
(function () {
  if (!document.getElementById('stg-cpl') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K, B = 64, Z = F.noise(B, 13), D = F.sampleData(B, 17), TM = .5, AS = .3;
  // minimum-cost assignment (Hungarian algorithm with potentials, O(n^3)); returns col[i], the data point paired with noise i
  function hungarian(c) { const n = c.length, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) { p[0] = i; let j0 = 0; const mv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
      do { used[j0] = true; const i0 = p[j0]; let d = Infinity, j1 = 0;
        for (let j = 1; j <= n; j++) if (!used[j]) { const cur = c[i0 - 1][j - 1] - u[i0] - v[j]; if (cur < mv[j]) { mv[j] = cur; way[j] = j0; } if (mv[j] < d) { d = mv[j]; j1 = j; } }
        for (let j = 0; j <= n; j++) if (used[j]) { u[p[j]] += d; v[j] -= d; } else mv[j] -= d; j0 = j1; } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0); }
    const col = new Array(n); for (let j = 1; j <= n; j++) col[p[j] - 1] = j - 1; return col; }
  let C = null;
  function compute() {
    if (C) return C; const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    const col = hungarian(Z.map(z => D.map(x => d2(z, x))));
    const mk = pi => Z.map((z, i) => { const x = D[pi(i)]; return { q: [[0, z[0], z[1]], [1, x[0], x[1]]], m: [z[0] + TM * (x[0] - z[0]), z[1] + TM * (x[1] - z[1])], v: [x[0] - z[0], x[1] - z[1]], d: d2(z, x) }; });
    const R0 = mk(i => i), R1 = mk(i => col[i]), mean = L => L.reduce((s, l) => s + l.d, 0) / L.length;
    (window.FMS = window.FMS || {}).cpl = { rand: mean(R0), ot: mean(R1) };
    return C = { R0, R1, rand: mean(R0), ot: mean(R1) };
  }
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute(); K.floor(R, { axis: k === 0 || k === 2 });
    const ot = k >= 2, L = ot ? T.R1 : T.R0, col = ot ? c.u : c.mute, mid = k === 1 || k === 3, ea = mid ? .15 : 1;
    // the end plates recede while the close view of the t = 0.5 plate is the subject
    K.plate(R, 0, { a: ea, c: c.noise, lab: mid ? null : 't = 0 · 64 noises', lc: c.noise, grp: 'pl' }); K.plate(R, 1, { a: ea, c: c.data, lab: mid ? null : 't = 1 · 64 data points', lc: c.data, grp: 'pl' });
    K.cloud(R, 0, Z, c.noise, .9 * ea, .045); K.cloud(R, 1, D, c.data, .9 * ea, .045);
    // the lines: drawn while they are the subject, faint while the plate at t = 0.5 is
    L.forEach((l, i) => { K.path(R, k === 0 || k === 2 ? K.part(l.q, e) : l.q, { c: col, w: 1.1, a: mid ? .12 : .8 }); if (!mid && i % 6 === 0 && e > .5) K.flow(R, l.q, { c: col, a: .8, r: .045, n: 6 }); });
    if (k === 0) K.lab(R, W(.5, [0, 4.75]), 'random pairs: mean squared length ' + T.rand.toFixed(2), { fs: 13, b: 1, c: P.ink, a: K.win(e, .5, 1) });
    if (k === 2) K.lab(R, W(.5, [0, 4.75]), 'OT pairs: mean squared length ' + T.ot.toFixed(2), { fs: 13, b: 1, c: c.u, a: K.win(e, .5, 1) });
    // the t = 0.5 plate: each line's point and its direction
    if (mid) { K.plate(R, TM, { a: e, c: col, ga: .45, lab: 't = 0.5 · each line’s direction', lc: col, grp: 'pl' });
      L.forEach(l => { R.ball(W(TM, l.m), .035, { c: P.ink, a: e }); K.arrow(R, TM, l.m, [AS * l.v[0], AS * l.v[1]], { c: col, w: 1.8, a: e, head: 5 }); });
      K.lab(R, W(TM, [0, 4.75]), k === 1 ? 'neighbours point every way' : 'neighbours agree', { fs: 13, b: 1, c: k === 1 ? P.ink : c.u, a: K.win(e, .4, 1) }); }
  }
  const one = { cam: [-1.3, .2], bounds: [[TX(TM) - .5, K.YC - K.HS - .3, -K.HS - .1], [TX(TM) + .5, K.YC + K.HS + .25, K.HS + .1]] };
  S3.stage({ id: 'stg-cpl', list: 'sx-cpl', fig: 'Fig. 5 · one batch of 64: random against optimal-transport pairs', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20], view: k => k === 1 || k === 3 ? one : K.full });
  compute();
})();
