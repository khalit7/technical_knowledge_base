// ---- Scene (section 5, Fig. 6): one decode step under DSA on real data. The 226 cached tokens of the running sequence as a field of entries;
// the scores are SmolLM2-135M's real attention from the last token in layer 18, mean of its 9 heads (AVK rows), standing in for the indexer:
// an oracle, the best any indexer could pick. k = 16 here (V3.2: 2,048). Reads at V3.2's scale from AVL ('dsv3', 'dsv32') at 131,072 tokens. ----
(function () {
  if (!document.getElementById('stg-dsa') || !window.AVS || !window.AVK || !window.AVL) return;
  const { mix } = S3, { tw, la, lab, int } = AVS, K = 16;
  const r = AVK.rows.find(x => x.layer === 18 && x.q === AVK.tokens.length - 1) || AVK.rows[AVK.rows.length - 1];
  const w = Array.from(r.mean, ch => (ch.charCodeAt(0) - 48) / 63 * r.mean_max), n = r.q + 1, mx = Math.max(...w), tot = w.reduce((a, b) => a + b, 0);
  const top = [...Array(n).keys()].sort((a, b) => w[b] - w[a]).slice(0, K), sel = new Set(top); let kept = 0; top.forEach(j => kept += w[j]);
  const COLS = 19, PI = .42, BX = .32, cx = j => (j % COLS - (COLS - 1) / 2) * PI, cz = j => (Math.floor(j / COLS) - 5.5) * PI, QP = [0, 1.25, 3.9];
  const v3 = AVS.entry('dsv3'), v32 = AVS.entry('dsv32'), L = 131072, dense = v3.tot * L, idxR = v32.idx * L, attR = v32.tot * v32.g.topk;
  window.AVDSA = { n, k: K, kept: kept / tot, dense, idxR, attR }; // for check_stages.mjs
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 5.6, -2.9, 3.9, .5);
    const fa = tw(st, e, s => s >= 4 ? .07 : 1), hS = 1.7;
    for (let j = 0; j < n; j++) {
      const hgt = tw(st, e, s => s >= 1 ? Math.max(.04, hS * Math.sqrt(w[j] / mx)) : .1), on = sel.has(j);
      const hot = tw(st, e, s => s >= 2 ? (on ? 1 : 0) : 0), dim = tw(st, e, s => s >= 2 && !on ? .25 : 1);
      const fill = mix(mix(P.paper, P.good, .6), mix(P.paper, P.c5, .85), tw(st, e, s => s >= 1 ? 1 : 0));
      R.box([cx(j), 0, cz(j)], [BX, hgt, BX], { fill: mix(fill, mix(P.paper, P.acc, .85), hot), a: fa * dim, shadow: false, lw: .5 });
      if (k === 0) R.box([cx(j), .1, cz(j) - BX * .3], [BX, .022, BX * .4], { fill: mix(P.paper, P.c5, .9), a: fa * e, shadow: false, edge: false }); }
    // the new token's query, in front
    R.glow(QP, .55, { c: P.q, a: .5 * fa }); R.ball(QP, .18, { c: P.q, a: fa });
    lab(R, QP, 'new token', { fs: 12.5, b: 1, c: P.q, dy: -18, a: fa });
    // the indexer scores every entry (a sample of the streams drawn); attention then reads only the k selected
    if (k === 1) for (let j = 0; j < n; j += 5) R.flowArc(QP, [cx(j), .3, cz(j)], .5, { c: P.c5, a: e * .55, r: .035, n: 3, speed: 1.6 });
    if (k === 3) top.forEach(j => R.flowArc([cx(j), Math.max(.04, hS * Math.sqrt(w[j] / mx)) + .05, cz(j)], QP, .6, { c: P.acc, a: e * (.35 + .65 * Math.min(1, w[j] / top.map(i => w[i])[0])), r: .04 + .05 * w[j] / mx, n: Math.round(3 + 10 * w[j] / mx), speed: 1.3 }));
    const la0 = la(st, e, s => s === 0 ? 1 : 0), la1 = la(st, e, s => s === 1 ? 1 : 0), la23 = la(st, e, s => s === 2 || s === 3 ? 1 : 0);
    lab(R, [cx(COLS - 1) + .2, 0, cz(0)], n + ' cached entries · each MLA entry + indexer key', { fs: 12.5, b: 1, c: P.ink, al: 'right', dy: -18, a: la0 , wide: 1 });
    lab(R, [cx(COLS - 1) + .2, 0, cz(0)], 'height: the score of each entry for this query', { fs: 12.5, b: 1, c: P.c5, al: 'right', dy: -18, a: la1 , wide: 1 });
    lab(R, [cx(COLS - 1) + .2, 0, cz(0)], K + ' of ' + n + ' read · ' + Math.round(100 * kept / tot) + '% of the real attention', { fs: 12.5, b: 1, c: P.acc, al: 'right', dy: -18, a: la23 , wide: 1 });
    // reads at V3.2's scale, per layer per decoded token at 131,072 tokens, to scale
    const ca = tw(st, e, s => s === 4 ? 1 : 0);
    if (ca > .01) { const HC = 2.5, l4 = la(st, e, s => s === 4 ? 1 : 0), cols = [['dense V3', dense, P.good], ['DSA indexer', idxR, P.c5], ['DSA attention', attR, P.acc]];
      cols.forEach(([nm, v, c], i) => { const x = -1.6 + i * 1.6, h = Math.max(.03, HC * v / dense);
        R.box([x, 0, .4], [.8, h, .8], { fill: mix(P.paper, c, .75), a: ca });
        lab(R, [x, h, .4], (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M numbers', { fs: 12.5, b: 1, c: P.ink, dy: -12, a: l4 });
        lab(R, [x, 0, .8], nm, { fs: 12.5, b: 1, c, dy: 14, a: l4 }); });
      lab(R, [3.4, .6, .4], 'together ' + Math.round(100 * (idxR + attR) / dense) + '% of dense', { fs: 12.5, b: 1, c: P.acc, al: 'left', a: l4 }); }
    // the two training stages, to scale in tokens (published)
    const ta = tw(st, e, s => s === 5 ? 1 : 0);
    if (ta > .01) { const HC = 2.5, l5 = la(st, e, s => s === 5 ? 1 : 0), S1 = 2.1, S2 = 943.7;
      R.box([-1.2, 0, .4], [.9, Math.max(.02, HC * S1 / S2), .9], { fill: mix(P.paper, P.c5, .8), a: ta }); R.box([1.2, 0, .4], [.9, HC, .9], { fill: mix(P.paper, P.acc, .75), a: ta });
      lab(R, [-1.2, .02, .4], 'stage 1 · dense warm-up · 2.1B tokens', { fs: 12.5, b: 1, c: P.c5, dy: -18, a: l5 });
      lab(R, [-1.2, 0, .85], 'model frozen, indexer fits attention (KL)', { fs: 12, c: P.mute, dy: 14, a: l5, wide: 1 });
      lab(R, [1.2, HC, .4], 'stage 2 · sparse · 943.7B tokens', { fs: 12.5, b: 1, c: P.acc, dy: -12, a: l5 });
      lab(R, [1.2, 0, .85], 'whole model adapts to top-2,048', { fs: 12, c: P.mute, dy: 14, a: l5, wide: 1 }); }
  }
  S3.stage({ id: 'stg-dsa', list: 'sx-dsa', fig: 'Fig. 6 · one decode step under DSA, real attention as the indexer', cam: [.25, .78], bounds: [[-4.2, 0, -2.6], [4.4, 1.8, 4.2]], aspect: .7, dur: 1500, hold: 5000, draw, margin: AVS.margin,
    view: k => k >= 4 ? { cam: [.25, .45], bounds: [[-2.8, 0, -.4], [4.6, 2.6, 1.2]] } : null });
})();
