// ---- Scene (section 4, Fig. 5): capacity factors on one real batch. The 64 assignments are the recorded top-2 choices of tokens 1 to 32 of the
// running sequence in layer 1 of the trained moe8top2 (MXD.runs.moe8.seq.top); each expert's buffer holds C = ceil(CF x n x k / E) slots and
// fills first come, first served in token order, as the tiny GPT's code does; assignments past C are dropped. The batch is a teaching choice
// (one short sequence); the measured drop rates on held-out batches are in the text. ----
(function () {
  if (!document.getElementById('stg-cap') || !window.MXS) return;
  const { D, ec, la, lab, routing, cl } = MXS, { mix } = S3;
  const NT = 32, E = 8, K = 2, tk = routing('moe8', 0, NT), load = Array(E).fill(0), slot = [];
  tk.forEach((t, j) => t.top.forEach(e => { slot.push({ j, e, n: load[e] }); load[e]++; }));
  const CF = [null, 2, 1.25, 1, .5, 'dropless'];
  const cap = k => CF[k] === 'dropless' || CF[k] == null ? null : Math.ceil(CF[k] * NT * K / E);
  const stats = k => { const c = cap(k); if (c == null) return { c, drop: 0, pad: 0 };
    return { c, drop: load.reduce((s, v) => s + Math.max(0, v - c), 0), pad: load.reduce((s, v) => s + Math.max(0, c - v), 0) }; };
  const X = e => (e - (E - 1) / 2) * .95, SH = .15, ZF = 2.2;
  window.MXCAP = { load, stats, cap, CF };
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 4.6, -1.6, 2.8, .5);
    const L = f => la(st, e, f), S = stats(k), c = S.c, pc = cap(st.pk);
    for (let ex = 0; ex < E; ex++) {
      // the buffer: empty slots drawn as faint frames (padding the expert computes for nothing)
      const cc = k === 5 ? load[ex] : c, ccPrev = st.pk === 5 ? load[ex] : pc;
      const rack = cc == null ? 0 : (e >= 1 || ccPrev == null ? cc : Math.round(ccPrev + (cc - ccPrev) * e));
      for (let s = load[ex]; s < rack; s++) R.box([X(ex), s * SH, 0], [.5, SH * .9, .44], { fill: P.paper, fa: .12, a: .9, shadow: false, lw: .6, ea: .5 });
      if (rack) R.line([[X(ex) - .3, rack * SH, .25], [X(ex) + .3, rack * SH, .25]], { c: P.bad, w: 2, top: 1 });
      lab(R, [X(ex), 0, .3], 'E' + ex, { fs: 12.5, b: 1, dy: 14, c: ec(ex) });
    }
    slot.forEach(s => { const dropped = c != null && s.n >= c && k !== 5;
      const z = 0, y = s.n * SH + (dropped ? .14 : 0);
      R.box([X(s.e), y, z], [.46, SH * .86, .4], { fill: dropped ? mix(P.paper, P.bad, .45) : ec(s.e), a: dropped ? .6 : 1, fa: dropped ? .55 : 1, shadow: false, lw: .6 }); });
    for (let ex = 0; ex < E; ex++) { const d = c == null || k === 5 ? 0 : Math.max(0, load[ex] - c);
      if (d) lab(R, [X(ex), load[ex] * SH + .14, 0], '−' + d, { mono: true, fs: 12.5, b: 1, dy: -11, c: P.bad });
      else lab(R, [X(ex), Math.max(load[ex], k === 5 || c == null ? 0 : c) * SH, 0], String(load[ex]), { mono: true, fs: 12, dy: -11, c: P.mute }); }
    // the mean load (8) as a glass sheet
    R.glass([X(0) - .35, 8 * SH, -.3], [X(E - 1) - X(0) + .7, 0, 0], [0, 0, .6], { c: P.ink, a: k === 0 ? .6 : .25, nu: 8, nv: 1, th: .005 });
    lab(R, [X(E - 1) + .35, 8 * SH, 0], 'mean 8', { al: 'left', dx: 8, fs: 12, c: P.mute, wide: 1 });
    // the batch arriving: 32 tokens, 64 assignments
    for (let ex = 0; ex < E; ex++) R.flow([[0, .2, ZF], [X(ex), Math.min(load[ex], c || 99) * SH + .1, .2]], { c: ec(ex), a: .5, r: .035, n: Math.max(2, Math.round(load[ex] / 2)), speed: 1.2 });
    R.ball([0, .2, ZF], .14, { c: P.acc });
    const head = k === 0 ? '32 tokens × top 2 = 64 assignments, no buffer yet' : k === 5 ? 'dropless (grouped GEMM): 64 rows, no padding, no drops'
      : 'CF ' + CF[k] + ': C = ⌈' + CF[k] + ' × 32 × 2 / 8⌉ = ' + c + ' · dropped ' + S.drop + ' of 64 · padded ' + S.pad;
    if (R.W >= 560) lab(R, [0, 0, ZF], head, { mono: true, fs: 12.5, b: 1, dy: 24, c: P.ink });
    else { const h2 = k === 0 ? ['64 assignments', 'no buffer yet'] : k === 5 ? ['dropless', 'no padding, no drops'] : ['CF ' + CF[k] + ': C = ' + c, 'dropped ' + S.drop + ' · padded ' + S.pad];
      lab(R, [0, 0, ZF], h2[0], { mono: true, fs: 12.5, b: 1, dy: 22, c: P.ink }); lab(R, [0, 0, ZF], h2[1], { mono: true, fs: 12, dy: 38, c: P.ink }); }
  }
  S3.stage({ id: 'stg-cap', list: 'sx-cap', fig: 'Fig. 5 · fixed buffers on one real batch', cam: [.2, .55], bounds: [[-4, 0, -.4], [4.2, 2.7, 2.6]], aspect: .62, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [16, 8, 36, 8] : [20, 70, 40, 20] });
})();
