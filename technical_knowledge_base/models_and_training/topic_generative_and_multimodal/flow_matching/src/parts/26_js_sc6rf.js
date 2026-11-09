// ---- Scene (section 8, Fig. 6): reflow and its one-step student, on the networks the page embeds (int8): the root's 1-RF (random pairs) and
// 2-RF (one reflow), and this page's one-step student of 2-RF. 60 seeded noises (FMF.noise, seed 11, the playground's); fine solves are 24
// midpoint steps. Counts on the canvas are of these 60; the step list's recorded shares are of 2,000 (fm_toy.py). ----
(function () {
  if (!document.getElementById('stg-rf') || !window.FMK) return;
  const K = FMK, F = FMF, { W, TX } = K, Z = F.noise(60, 11), n1 = { kind: 'net', key: 'rf1' }, n2 = { kind: 'net', key: 'rf2' };
  let C = null;
  function compute() {
    if (C) return C; const f1 = K.paths(n1, Z, 24, 'midpoint');
    C = { f1, pairs: f1.map(q => [q[0], [1, q[q.length - 1][1], q[q.length - 1][2]]]), f2: K.paths(n2, Z, 24, 'midpoint'), e1: K.paths(n1, Z, 1), e2: K.paths(n2, Z, 1), st: K.paths({ kind: 'student', key: 'd2' }, Z, 1) };
    (window.FMS = window.FMS || {}).rf = { n: Z.length, rf1: K.share(C.e1), rf2: K.share(C.e2), st: K.share(C.st) }; return C;
  }
  function draw(R, k, e) {
    const P = R.P, c = K.col(P), T = compute(); K.floor(R);
    K.plate(R, 0, { c: c.noise, lab: 't = 0 · noise z', lc: c.noise, grp: 'pl' }); K.plate(R, 1, { c: c.data, lab: 't = 1', lc: c.data, grp: 'pl' });
    K.cloud(R, 0, Z, c.noise, .9, .045); K.cloud(R, 1, F.sampleData(120, 5), c.data, .45);
    const trace = (L, o, f) => L.forEach((q, i) => { K.path(R, f < 1 ? K.part(q, f) : q, o); if (o.fl && i % 5 === 0 && e > .5) K.flow(R, q, { c: o.c, a: .9, r: .05, n: 8 }); });
    // 1. the 1-RF's own paths: curved
    if (k <= 2) trace(T.f1, { c: c.u, w: 1.3, a: k === 0 ? .85 : .2, fl: k === 0 }, k === 0 ? e : 1);
    if (k === 0) K.lab(R, W(.55, [0, 4.75]), '1-RF: curved paths', { fs: 13, b: 1, c: c.u, a: K.win(e, .5, 1) });
    // 2. the new pairs: each noise with the end of its own path, joined by a straight line
    if (k === 1 || k === 2) { trace(T.pairs, { c: P.ink, w: 1.2, a: k === 1 ? .8 : .25, fl: k === 1 }, k === 1 ? e : 1);
      T.pairs.forEach(q => R.ball(W(1, [q[1][1], q[1][2]]), .045, { c: P.ink, a: k === 1 ? K.win(e, .7, 1) : .5 })); }
    if (k === 1) K.lab(R, W(.55, [0, 4.75]), 'new pairs (z, X₁): straight, not crossing', { fs: 13, b: 1, c: P.ink, a: K.win(e, .5, 1) });
    // 3. 2-RF, trained on those pairs: its paths are close to the straight lines
    if (k === 2) { trace(T.f2, { c: c.net, w: 1.4, a: .9, fl: true }, e); K.lab(R, W(.55, [0, 4.75]), '2-RF: nearly straight paths', { fs: 13, b: 1, c: c.net, a: K.win(e, .5, 1) }); }
    // 4. one Euler step of each: 1-RF to the centre, 2-RF onto the blobs
    if (k === 3) { trace(T.e1, { c: c.step, w: 1.3, a: .75, fl: true }, e); trace(T.e2, { c: c.net, w: 1.4, a: .9, fl: true }, e);
      K.lab(R, W(.55, [0, 4.75]), '1 step · 1-RF: ' + K.share(T.e1) + ' of 60 on a blob, 2-RF: ' + K.share(T.e2), { fs: 13, b: 1, c: P.ink, a: K.win(e, .5, 1) }); }
    // 5. the one-step student of 2-RF: one network call per sample
    if (k === 4) { trace(T.f2, { c: c.net, w: 1, a: .2 }, 1); trace(T.st, { c: P.c5, w: 1.5, a: .95, fl: true }, e);
      K.lab(R, W(.55, [0, 4.75]), 'student of 2-RF, one call: ' + K.share(T.st) + ' of 60 on a blob', { fs: 13, b: 1, c: P.c5, a: K.win(e, .5, 1) }); }
  }
  S3.stage({ id: 'stg-rf', list: 'sx-rf', fig: 'Fig. 6 · reflow on the toy networks', cam: K.full.cam, bounds: K.full.bounds, aspect: .58, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [22, 20, 24, 20] });
  compute();
})();
