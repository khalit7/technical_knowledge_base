// ---- Scene (section 5, Fig. 6): what each token stores. Six released models as rows, one box per layer, its height the bytes that layer keeps
// per token (AG.by[...].per by mixer code, read from the configs); layers that keep nothing per token (linear, FFN-only blocks) are flat hollow
// tiles. Step 1 shows one layer's entry, step 2 every layer that grows (the row's area is the card figure, AG row .kv), step 3 the spread
// from the front, step 4 DeepSeek V3.2's indexer keys (AG row .idx, 128 numbers per layer) on top of V3's MLA entries. ----
(function () {
  if (!document.getElementById('stg-store') || !window.AGS) return;
  const { tw, la, lab, mc, B, nm, row, KiB } = AGS;
  const N = ['Nemotron 3.5 Lightning 30B-A3B', 'DeepSeek V3', 'GPT-OSS 120B', 'Qwen3 235B-A22B', 'Llama 3.1 70B', 'Gemma 4 31B'], M = N.map(row), V32 = row('DeepSeek V3.2');
  const DX = .064, X0 = -3.05, YS = .09 / KiB, Z = m => 2.3 - m * .92, x = i => X0 + i * DX, idxL = V32.idx / V32.L;
  const grows = (r, i) => !!r.per[r.mix[i]];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 3.6, -2.9, 2.9, .5);
    const fill = tw(st, e, s => s >= 1 ? 1 : 0), ia = tw(st, e, s => s === 3 ? 1 : 0), lt = la(st, e, s => s >= 1 ? 1 : 0), l0 = la(st, e, s => s === 0 ? 1 : 0);
    M.forEach((r, m) => {
      const z = Z(m), dim = k === 3 && m !== 1 ? .3 : 1;
      for (let i = 0; i < r.L; i++) {
        const c = r.mix[i], on = i === 0 || fill >= 1 || (fill > 0 && i / r.L <= fill * 1.05);
        if (!grows(r, i)) { R.box([x(i), 0, z], [DX * .78, .012, .5], { fill: P.paper, fa: .1, ec: mc(P, c), ea: .7, a: .8 * dim, shadow: false, lw: .6 }); continue; }
        const h = r.per[c] * YS, first = i === [...r.mix].findIndex((q, j) => grows(r, j));
        if (on || first) R.box([x(i), 0, z], [DX * .78, h, .5], { fill: mc(P, c), a: dim, shadow: false, lw: .55 });
        else R.box([x(i), 0, z], [DX * .78, h, .5], { fill: P.paper, fa: .05, ec: P.line, ea: .6, a: .7, shadow: false, lw: .5 });
        if (m === 1 && ia > .01) R.box([x(i), h, z], [DX * .78, idxL * YS * ia, .5], { fill: P.c4, a: ia, shadow: false, lw: .55 });
      }
      // one token's entries written across the row
      if (lt > .01) R.flow([[x(0) - .3, .02, z + .32], [x(r.L - 1) + .1, .02, z + .32]], { c: mc(P, r.mix[[...r.mix].findIndex((q, j) => grows(r, j))]), a: lt * .7 * dim, r: .04, n: 8, speed: 1.4 });
      const bb = v => v % 1024 ? AGS.int(v) + ' B' : B(v), per = [...new Set([...r.mix].filter(c => r.per[c]).map(c => r.per[c]))].sort((a, b) => b - a).map(bb).join(' or ');
      const nmA = dim < 1 ? .45 : 1, name = nm(m === 1 && k === 3 ? V32.n : r.n);
      lab(R, [x(0) - .12, 0, z], name, { fs: 12.5, b: 1, al: 'right', dx: -6, c: P.ink, a: nmA * (1 - l0), wide: 1 });
      lab(R, [x(0) - .12, 0, z], name + ' · ' + per, { fs: 12.5, b: 1, al: 'right', dx: -6, c: P.ink, a: l0, wide: 1 });
      const tot = m === 1 && k === 3 ? B(r.kv) + ' + ' + (V32.idx / KiB) + ' KiB indexer' : B(r.kv);
      lab(R, [x(93) + .16, 0, z], tot, { mono: true, fs: 12.5, b: 1, al: 'left', dx: 6, c: m === 1 && k === 3 ? P.c4 : P.acc, a: lt * (dim < 1 ? .5 : 1), wide: 1 });
    });
  }
  const full = { cam: [.42, .45], bounds: [[-3.3, 0, -2.5], [3.3, 1.5, 2.6]] };
  S3.stage({ id: 'stg-store', list: 'sx-store', fig: 'Fig. 6 · bytes per token, layer by layer, six released models', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1600, hold: 5200, draw,
    margin: w => w < 520 ? [14, 8, 14, 8] : [14, 66, 14, 150],
    view: k => k === 0 ? { cam: [.6, .5], bounds: [[-3.6, 0, -2.6], [-1.4, 1.5, 2.7]] } : k === 2 ? { cam: [.22, .78], bounds: [[-3.3, 0, -2.5], [3.3, 1.5, 2.6]] } : full });
})();
