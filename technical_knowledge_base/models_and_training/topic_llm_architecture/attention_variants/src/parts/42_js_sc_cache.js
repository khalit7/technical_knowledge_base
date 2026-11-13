// ---- Scene (section 1, Fig. 2): the KV cache as a block of layers by KV heads by tokens, at Llama 3.1 8B's shape (AVL 'llama31': 32 layers,
// 8 KV heads of 128, 32 query heads), growing one brick per token (12 drawn, illustrative), every brick read once per decoded token; then FLOPs
// per byte against the H100's balance point (AVL.gpu), and the measured decode times at 32,768 tokens (AVB, from the root's decode_bench.json). ----
(function () {
  if (!document.getElementById('stg-cache') || !window.AVS || !window.AVL || !window.AVB) return;
  const { mix } = S3, { tw, la, lab, int, bytes } = AVS;
  const g = AVS.rung('llama31').groups[0], NL = g.n, NKV = g.nkv, HD = g.hd, NQ = g.nq, BPN = AVL.bytes_per_number;
  const perTok = 2 * NKV * HD * NL, perTokB = perTok * BPN, fpb = NQ / NKV, gpu = AVL.gpu, bal = gpu.bf16_dense_tflops * 1e12 / (gpu.hbm_tb_s * 1e12);
  const N = 12, BW = .4, BH = 1.92, BD = 1.92, X = i => -4.3 + i * .5, DIE = [3.3, 0, 0];
  const B = AVB.rows, name = { mha: 'MHA', gqa8: 'GQA-8', mla_absorbed: 'MLA', mqa: 'MQA' }, BR = B.filter(r => name[r.variant]);
  const numsPer = r => r.cache_bytes / (AVB.ctx * AVB.batch) / BPN;
  // one token's brick: keys in front (teal), values behind (purple); a line per layer on the front face and per head on the top
  function brick(R, x, a, P, last) {
    R.box([x, 0, BD / 4], [BW, BH, BD / 2], { fill: mix(P.paper, P.k, .72), a, lw: .8 });
    R.box([x, 0, -BD / 4], [BW, BH, BD / 2], { fill: mix(P.paper, P.v, .62), a, lw: .8 });
    const L = [], f = BD / 2 + .001, yt = BH + .001;
    for (let l = 1; l < NL; l++) L.push([[x - BW / 2, l * BH / NL, f], [x + BW / 2, l * BH / NL, f]]);
    // the newest brick also shows its layers along its side face, keys and values
    if (last) for (let l = 1; l < NL; l++) L.push([[x + BW / 2 + .001, l * BH / NL, -BD / 2], [x + BW / 2 + .001, l * BH / NL, BD / 2]]);
    for (let h = 1; h < 2 * NKV; h++) L.push([[x - BW / 2, yt, -BD / 2 + h * BD / (2 * NKV)], [x + BW / 2, yt, -BD / 2 + h * BD / (2 * NKV)]]);
    const pp = L.map(([p, q]) => [R.p(p), R.p(q)]), z = R.p([x + (last ? BW / 2 : 0), BH / 2, last ? 0 : BD / 2])[2] - .01;
    R.q.push({ z, f: cx => { cx.globalAlpha = a * .5; cx.strokeStyle = 'rgb(' + P.paper.map(Math.round).join(',') + ')'; cx.lineWidth = .7; cx.beginPath(); pp.forEach(([p, q]) => { cx.moveTo(p[0], p[1]); cx.lineTo(q[0], q[1]) }); cx.stroke() } });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.4, 7.6, -2, 2, .5);
    const n = k === 0 ? 1 : k === 1 ? 1 + Math.floor((N - 1) * Math.min(1, e * 1.15)) : N, ba = tw(st, e, q => q === 3 ? .22 : q === 4 ? 0 : 1);
    // HBM under the bricks, the GPU die on the right
    const ha = tw(st, e, q => q === 2 ? 1 : q === 3 ? .35 : 0);
    if (ha > .01) { R.box([(X(0) + X(N - 1)) / 2, 0, 0], [N * .5 + .4, .04, BD + .5], { fill: mix(P.paper, P.c5, .22), a: ha, shadow: false });
      R.box(DIE, [1.1, .32, 1.1], { fill: mix(P.paper, P.ink, .55), a: ha });
      lab(R, [(X(0) + X(N - 1)) / 2, 0, BD / 2 + .25], 'HBM: where the cache lives', { fs: 12.5, c: P.c5, b: 1, dy: 14, a: la(st, e, q => q === 2 ? 1 : 0) });
      lab(R, [DIE[0], 0, DIE[2] + .55], 'GPU die', { fs: 12.5, b: 1, c: P.ink, dy: 14, a: la(st, e, q => q === 2 ? 1 : 0) }); }
    for (let i = 0; i < n; i++) brick(R, X(i), ba, P, i === n - 1);
    // the slots still to come, so the layout is whole from the first step
    for (let i = n; i < N; i++) R.quad([[X(i) - BW / 2, .003, -BD / 2], [X(i) + BW / 2, .003, -BD / 2], [X(i) + BW / 2, .003, BD / 2], [X(i) - BW / 2, .003, BD / 2]], { fill: P.soft, a: .7 * ba, ea: .5, lw: .8, dash: [3, 3] });
    const l0 = la(st, e, q => q === 0 ? 1 : 0);
    lab(R, [X(0) - BW / 2, BH * .6, BD / 2], NL + ' layers', { fs: 12.5, b: 1, c: P.ink, al: 'right', dx: -10, a: l0 });
    lab(R, [X(0) - BW / 2, BH * .3, BD / 2], 'keys · ' + NKV + ' heads × ' + HD, { fs: 12.5, b: 1, c: P.k, al: 'right', dx: -10, a: l0 });
    lab(R, [X(0), BH, -BD / 2], 'values · ' + NKV + ' heads × ' + HD, { fs: 12.5, b: 1, c: P.v, al: 'left', dx: 10, dy: -12, a: l0 });
    lab(R, [X(0), 0, BD / 2], '2 × ' + NKV + ' × ' + HD + ' × ' + NL + ' = ' + int(perTok) + ' numbers = ' + bytes(perTokB), { fs: 12.5, b: 1, c: P.acc, dy: 18, a: l0 });
    const l1 = la(st, e, q => q === 1 ? 1 : 0);
    lab(R, [X(N - 1), BH, 0], n + ' tokens × ' + bytes(perTokB) + ' = ' + bytes(n * perTokB), { fs: 12.5, b: 1, c: P.acc, al: 'left', dx: 12, dy: -12, a: l1 });
    lab(R, [X(0), 0, BD / 2], 'computed once per token, then only read', { fs: 12, c: P.mute, al: 'left', dy: 18, a: l1, wide: 1 });
    // decode: every brick streams into the die once per new token
    const fa = tw(st, e, q => q === 2 ? 1 : 0);
    if (fa > .01) { for (let i = 0; i < N; i++) R.flowArc([X(i), BH + .05, 0], [DIE[0] - .2, .4, 0], .35 + .04 * (N - i), { c: P.acc, a: fa * .8, r: .05, n: 6, speed: 1.5 });
      R.glow([DIE[0], .7, 0], .5, { c: P.q, a: fa * .5 }); R.ball([DIE[0], .7, 0], .16, { c: P.q, a: fa });
      lab(R, [DIE[0], .9, 0], 'new token: reads all ' + bytes(N * perTokB), { fs: 12.5, b: 1, c: P.q, dy: -30, a: la(st, e, q => q === 2 ? 1 : 0) }); }
    // FLOPs per byte: what decode attention does against what the H100 can do
    const fb = tw(st, e, q => q === 3 ? 1 : 0), HC = 2.3;
    if (fb > .01) { const c1 = [4.8, 0, .55], c2 = [5.7, 0, .55];
      R.box(c1, [.5, Math.max(.02, HC * fpb / bal), .5], { fill: mix(P.paper, P.acc, .8), a: fb }); R.box(c2, [.5, HC, .5], { fill: mix(P.paper, P.mute, .35), a: fb });
      const l3 = la(st, e, q => q === 3 ? 1 : 0);
      lab(R, [c1[0], .05, c1[2]], fpb + ' FLOPs per byte', { fs: 12.5, b: 1, c: P.acc, dy: -16, a: l3 });
      lab(R, [c2[0], HC, c2[2]], 'H100: about ' + Math.round(bal), { fs: 12.5, b: 1, c: P.ink, dy: -12, a: l3 });
      lab(R, [c1[0], 0, c1[2]], 'decode waits on memory', { fs: 12, c: P.mute, dy: 18, al: 'left', dx: -20, a: l3 }); }
    // measured: one attention layer at this shape, 32,768 tokens, batch 4; time follows the bytes cached
    const fm = tw(st, e, q => q === 4 ? 1 : 0);
    if (fm > .01) { const m0 = BR[0], l4 = la(st, e, q => q === 4 ? 1 : 0);
      BR.forEach((r, i) => { const x = 1.2 + i * 1.5, hb = 2.0 * numsPer(r) / numsPer(m0), hm = 2.0 * r.ms_median / m0.ms_median;
        R.box([x - .27, 0, 0], [.45, Math.max(.02, hb), .5], { fill: mix(P.paper, P.k, .7), a: fm }); R.box([x + .27, 0, 0], [.45, Math.max(.02, hm), .5], { fill: mix(P.paper, P.q, .75), a: fm });
        lab(R, [x, 0, .3], name[r.variant], { fs: 12.5, b: 1, c: P.ink, dy: 14, a: l4 });
        lab(R, [x + .27, hm, 0], r.ms_median.toFixed(2) + ' ms', { fs: 12, c: P.q, dy: -10, al: 'left', dx: -4, b: 1, a: l4 });
        lab(R, [x - .27, hb, 0], int(numsPer(r)), { fs: 12, c: P.k, dy: -10, al: 'right', dx: 4, a: l4 }); });
      lab(R, [.6, 1.8, 0], 'teal: numbers per token per layer', { fs: 12, c: P.k, al: 'right', dx: -6, a: l4, wide: 1 });
      lab(R, [.6, 1.8, 0], 'orange: measured ms per step', { fs: 12, c: P.q, al: 'right', dx: -6, dy: 16, a: l4, wide: 1 }); }
  }
  const full = { cam: [.42, .5], bounds: [[-4.9, 0, -1.3], [7.6, 2.4, 1.3]] };
  S3.stage({ id: 'stg-cache', list: 'sx-cache', fig: 'Fig. 2 · the cache of one sequence, Llama 3.1 8B', cam: full.cam, bounds: full.bounds, aspect: .58, dur: 1500, hold: 4800, draw, margin: AVS.margin,
    view: k => k === 0 ? { cam: [.62, .42], bounds: [[-5.2, 0, -1.3], [-2.6, 2.2, 1.3]] } : k === 3 ? { cam: [.3, .45], bounds: [[-1.5, 0, -1.3], [7.4, 2.4, 1.3]] } : k === 4 ? { cam: [.2, .4], bounds: [[-2.2, 0, -.6], [7.2, 2.3, .6]] } : full });
})();
