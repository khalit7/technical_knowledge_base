// ---- Scene (section 2, Fig. 2): linear attention as a recurrence, on the write-rule toy of section 3 (BA_WR, d_k = d_v = 8, the 12 writes of BAD.wr_writes,
// fixed random unit keys and values, seed 1: illustrative inputs, exact arithmetic, equal to src/state/state_rules.py). The state S = sum of v k^T is a
// glass plate with one bar per entry (rows: value index, columns: key index); the key lies along its columns, the value along its rows.
// The last step computes the same outputs in the parallel (masked T x T) form and prints the largest difference from the recurrence. ----
(function () {
  if (!document.getElementById('stg-lin') || !window.BAS || !window.BA_WR) return;
  const { mix } = S3, { tw, la, lab, comb, field, win } = BAS;
  const D = 8, sim = BA_WR(D, 'linear'), W = BAD.wr_writes, K = sim.keys, V = sim.vals, N = W.length;
  const words = sim.words, last = sim.steps[N - 1];
  const SM = Math.max(...last.S.flat().map(Math.abs)), CS = .27, PW = D * CS, Y0 = .62, ZF = PW / 2 + .75, XL = -PW / 2 - .8, XR = PW / 2 + .8;
  const outer = (v, k) => v.map(vi => k.map(kj => vi * kj));
  const matv = (S, q) => S.map(row => row.reduce((s, x, j) => s + x * q[j], 0));
  const lerpM = (A, B, t) => A.map((r, i) => r.map((x, j) => x + (B[i][j] - x) * t));
  const Z = Array.from({ length: D }, () => Array(D).fill(0));
  const Sat = i => i < 0 ? Z : sim.steps[i].S;
  // the parallel form: o_i = sum_{j<=i} (k_{w_i} . k_{w_j}) v_j for every write i, against S_i k_{w_i}
  const sc = W.map((wi, i) => W.map((wj, j) => j <= i ? K[wi].reduce((s, x, d) => s + x * K[wj][d], 0) : NaN));
  let maxd = 0; W.forEach((wi, i) => { const o = Array(D).fill(0); for (let j = 0; j <= i; j++) V[j].forEach((x, d) => o[d] += sc[i][j] * x); matv(Sat(i), K[wi]).forEach((x, d) => maxd = Math.max(maxd, Math.abs(x - o[d]))); });
  window.BA_LIN = { maxd, cosRoxy4: sim.steps[3].cos.Roxy, mean: Object.values(last.cos).reduce((a, b) => a + b, 0) / words.length };
  // a vector along z (the value side of the plate): signed bars on a plinth
  function combZ(R, x, y, vals, m, col, a) { if (a <= .01) return; R.box([x, y - .045, 0], [.3, .045, PW + .12], { a, shadow: false });
    vals.forEach((v, i) => { const h = Math.max(.012, Math.abs(v) / m * .45), z = -PW / 2 + CS * (i + .5); R.box([x, v >= 0 ? y : y - .045 - h, z], [.1, h, CS * .7], { fill: col, a, shadow: false, lw: .6 }); }); }
  // which write is shown, and how far it has gone in: write 1 at steps 1 and 2, writes 2 to 4 during step 3, 5 to 12 during step 5
  function wAt(k, e) { if (k <= 1) return [0, k === 0 ? 0 : e]; if (k === 3 || k === 5) return [k === 3 ? 3 : N - 1, 1];
    const a = k === 2 ? 1 : 4, n = k === 2 ? 3 : 8, u = n * win(e, .05, .9), i = Math.min(n - 1, Math.floor(u)); return [a + i, u >= n ? 1 : u - i]; }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.2, 4.2, -2.6, 2.8, .5);
    const [w, wt] = wAt(k, e), wd = W[w], fa = tw(st, e, q => q === 5 ? 0 : 1), pa = tw(st, e, q => q === 5 ? 1 : 0);
    // the state: empty, then v k^T growing in, then the running sum write by write
    const S = k === 0 ? Z : lerpM(Sat(w - 1), Sat(w), wt);
    field(R, 0, Y0, 0, S, SM, { a: fa, cs: CS, hmax: .55 });
    // the write: key along the columns (front), value along the rows (left)
    const ka = tw(st, e, q => q <= 2 || q === 4 ? 1 : 0), qa = tw(st, e, q => q === 3 ? 1 : 0);
    if (ka > .01) { comb(R, [0, .3, ZF], K[wd], 1, mix(P.paper, P.k, .75), ka, .4, PW); combZ(R, XL, .3, V[w], 1, mix(P.paper, P.v, .7), ka);
      if (k >= 1 && k !== 3) for (let j = 0; j < D; j += 2) { R.flow([[-PW / 2 + CS * (j + .5), .45, ZF], [-PW / 2 + CS * (j + .5), Y0 + .1, PW / 2 - .1]], { c: P.k, a: ka * .8, r: .045, n: 4, speed: 1 });
        R.flow([[XL, .45, -PW / 2 + CS * (j + .5)], [-PW / 2 + .1, Y0 + .1, -PW / 2 + CS * (j + .5)]], { c: P.v, a: ka * .8, r: .045, n: 4, speed: 1 }); } }
    // the read: query along the columns, output S q along the rows (right), compared with the value stored under that key
    if (qa > .01) { const q = K.Roxy, r = matv(S, q), rm = Math.max(...r.map(Math.abs));
      comb(R, [0, .3, ZF], q, 1, mix(P.paper, P.q, .75), qa, .4, PW); combZ(R, XR, .3, r.map(x => x / rm), 1, mix(P.paper, P.c1, .7), qa); combZ(R, XL, .3, V[0], 1, mix(P.paper, P.v, .7), qa * .9);
      for (let j = 0; j < D; j += 2) R.flow([[-PW / 2 + CS * (j + .5), .45, ZF], [-PW / 2 + CS * (j + .5), Y0 + .1, 0], [XR, .45, -PW / 2 + CS * (j + .5)]], { c: P.q, a: qa * .85, r: .05, n: 6, speed: 1.2 }); }
    // read every key back after all 12 writes: one signed bar per word (cosine with its latest value)
    const ca = tw(st, e, q => q === 4 ? 1 : 0) * (k === 4 ? win(e, .85, 1) : 1);
    if (ca > .01) words.forEach((u, i) => { const v = last.cos[u], z = -PW / 2 - .25 + (PW + .5) * i / (words.length - 1), h = Math.max(.012, Math.abs(v) * .5), x = XR + .2;
      R.box([x, v >= 0 ? .02 : .02 - h, z], [.22, h, .16], { fill: v >= .9 ? P.good : v >= .5 ? mix(P.paper, P.c1, .7) : P.bad, a: ca, shadow: false });
      lab(R, [x + .15, Math.max(0, v) * .5 + .02, z], u + ' ' + v.toFixed(2), { fs: 12, mono: true, al: 'left', dx: 12, c: P.ink, a: ca, grp: 'cos' }); });
    // the parallel form: the T x T masked score matrix, every write's key against every earlier key
    if (pa > .01) { const m = Math.max(...sc.flat().filter(isFinite).map(Math.abs)); field(R, 0, .05, 0, sc, m, { a: pa, cs: .2, hmax: .6, pa: .35, c: P.q, pos: mix(P.paper, P.q, .7), neg: mix(P.paper, P.mute, .55) }); }
    // labels, one set per step
    const L = j => la(st, e, q => q === j ? 1 : 0);
    lab(R, [0, .3, ZF + .15], 'key of "' + wd + '" · 8 numbers', { fs: 12.5, b: 1, c: P.k, dy: 18, a: Math.max(L(0), L(1), L(2), L(4)) });
    lab(R, [XL, .3, PW / 2], 'value · 8', { fs: 12.5, b: 1, c: P.v, dy: 18, a: Math.max(L(0), L(1), L(2), L(4)) });
    lab(R, [0, Y0 + .3, -PW / 2], L(0) > 0 ? 'state S: 8 × 8, empty' : null, { fs: 12.5, b: 1, c: P.c1, dy: -16, a: L(0) });
    lab(R, [0, Y0 + .5, -PW / 2], 'v kᵀ: one write = one 8 × 8 matrix', { fs: 12.5, b: 1, c: P.c1, dy: -16, a: L(1) });
    lab(R, [0, Y0 + .5, -PW / 2], 'S = Σ v kᵀ after ' + (w + 1) + ' writes: still 64 numbers', { fs: 12.5, b: 1, c: P.c1, dy: -16, a: L(2) });
    lab(R, [0, .3, ZF + .15], 'query: the key of "Roxy"', { fs: 12.5, b: 1, c: P.q, dy: 18, a: L(3) });
    lab(R, [XR, .3, PW / 2], 'S q', { fs: 12.5, b: 1, c: P.c1, dy: 18, a: L(3) });
    lab(R, [XL, .3, PW / 2], 'Roxy\'s value', { fs: 12.5, b: 1, c: P.v, dy: 18, a: L(3) });
    lab(R, [0, Y0 + .5, -PW / 2], 'cosine of S q with Roxy\'s value: ' + sim.steps[3].cos.Roxy.toFixed(2), { fs: 12.5, b: 1, c: P.c1, dy: -16, a: L(3) });
    lab(R, [0, Y0 + .5, -PW / 2], 'after ' + (w + 1) + ' writes', { fs: 12.5, b: 1, c: P.c1, dy: -16, a: L(4) });
    lab(R, [0, .75, -1.2], '12 × 12 scores k·k, masked above the diagonal', { fs: 12.5, b: 1, c: P.q, dy: -22, a: L(5) });
    lab(R, [0, 0, 1.25], 'same outputs as the recurrence, to ' + maxd.toExponential(0), { fs: 12.5, b: 1, c: P.ink, dy: 18, a: L(5) });
  }
  const full = { cam: [.5, .62], bounds: [[-2.4, 0, -1.6], [2.4, 1.3, 2.0]] };
  S3.stage({ id: 'stg-lin', list: 'sx-lin', fig: 'Fig. 2 · linear attention, the section 3 toy (d = 8)', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1500, hold: 4800, draw, margin: BAS.margin,
    view: k => k === 4 ? { cam: [.42, .62], bounds: [[-2.4, 0, -1.6], [3.6, 1.3, 2.0]] } : k === 5 ? { cam: [.35, .8], bounds: [[-1.6, 0, -1.4], [1.6, .9, 1.4]] } : full });
})();
