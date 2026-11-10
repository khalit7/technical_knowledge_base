// ---- Scene (section 7, Fig. 9): one trained MoE layer run expert-parallel over four processes. Every count is recorded from
// torch.distributed.all_to_all_single on gloo (MXD.ep: send_matrix[a][b] = token copies rank a sent to rank b, local_copies, the check
// against one process); dot streams are proportional to those counts. ----
(function () {
  if (!document.getElementById('stg-ep') || !window.MXS || !MXS.D.ep) return;
  const { D, la, lab } = MXS, { mix } = S3, ep = D.ep, W = ep.world, S = ep.send_matrix;
  const sent = S.map(r => r.reduce((a, b) => a + b, 0)), recv = S[0].map((_, b) => S.reduce((a, r) => a + r[b], 0));
  const mean = recv.reduce((a, b) => a + b, 0) / W, busy = Math.max(...recv), mxc = Math.max(...S.flat());
  const RX = r => (r - (W - 1) / 2) * 2.6, ZTK = .55, ZEX = -.45, HS = 1.3 / Math.max(...sent), HR = 1.3 / busy;
  const RC = (P, r) => [P.c1, P.c2, P.c3, P.c4][r];
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.4, 5.4, -2, 3.4, .5);
    const L = f => la(st, e, f);
    for (let r = 0; r < W; r++) {
      const x = RX(r), c = RC(P, r);
      R.glass([x - 1.05, .004, -1.25], [2.1, 0, 0], [0, 0, 2.5], { c, a: .55, nu: 2, nv: 2, th: .03 });
      lab(R, [x, 0, 1.25], 'rank ' + r, { fs: 13, b: 1, dy: 16, c });
      // its two experts
      for (let j = 0; j < ep.experts_per_rank; j++) { const ex = r * ep.experts_per_rank + j, xx = x - .45 + j * .9;
        const hh = .25;
        R.box([xx, 0, ZEX], [.62, hh, .62], { fill: k === 4 && recv[r] === busy ? mix(P.paper, P.acc, .5) : P.paper, lw: .8 });
        lab(R, [xx, hh, ZEX], 'E' + ex, { fs: 12, dy: -10, c: P.mute, a: L(kk => kk === 4 ? 0 : 1) }); }
      // its 64 tokens' 128 assignments, stacked by the rank that owns the chosen expert
      if (k >= 1 && k !== 4) { let y = 0; S[r].forEach((n, d) => { const h = n * HS * (k === 1 ? e : 1);
          R.box([x, y, ZTK], [.5, Math.max(.01, h), .5], { fill: RC(P, d), a: k === 3 || k === 5 ? .55 : 1, shadow: y === 0, lw: .6 }); y += h; });
        lab(R, [x, 0, 1.25], 'sends ' + S[r].join(' · '), { mono: true, fs: 12, dy: 34, c: P.ink, a: L(kk => kk === 1 ? 1 : 0) }); }
      else R.box([x, 0, ZTK], [.5, .12, .5], { fill: P.paper, a: .9 });
      if (k === 0) lab(R, [x, .12, ZTK], ep.tokens_per_rank + ' tokens', { fs: 12, dy: 18, dx: 0, c: P.ink });
    }
    // step 3: the counts all-to-all, W integers per rank, drawn as a small matrix in front
    if (k === 2) for (let a = 0; a < W; a++) for (let b = 0; b < W; b++) { const x = -1.5 + b * 1, z = 2.75 + a * .62;
      const hb = S[a][b] / mxc * .4 * e; R.box([x, 0, z], [.5, hb, .3], { fill: RC(P, b), shadow: false, lw: .5 }); lab(R, [x, hb, z], String(S[a][b]), { mono: true, fs: 12, dy: -9, c: P.ink, a: Math.max(0, 2 * e - 1), wide: 1 });
      R.flow([[RX(a), .2, .9], [x, .3, z]], { c: RC(P, a), a: .4, r: .025, n: 2, speed: 1.5 }); }
    if (k === 2) lab(R, [-2, 0, 3.7], 'sender ↓ · receiver →', { al: 'right', fs: 12, dx: -8, c: P.mute, wide: 1 });
    // dispatch and combine: every assignment's hidden state travels, dots proportional to the count; local copies stay home
    if (k === 3 || k === 5) for (let a = 0; a < W; a++) for (let b = 0; b < W; b++) {
      const n = Math.max(2, Math.round(S[a][b] / 4)), src = [RX(a), .9, ZTK], dst = [RX(b) + (a - 1.5) * .12, .3, ZEX];
      if (k === 3) R.flowArc(src, dst, a === b ? .35 : .9 + .25 * Math.abs(a - b), { c: RC(P, a), a: .8, r: .045, n, speed: 1.6 });
      else R.flowArc(dst, src, a === b ? .35 : .9 + .25 * Math.abs(a - b), { c: RC(P, a), a: .7, r: .04, n, speed: 1.6 }); }
    // compute: rows received per rank; the busiest sets the pace; the glass sheet is the mean
    if (k >= 4) { for (let r = 0; r < W; r++) { const h = recv[r] * HR * (k === 4 ? e : 1);
        R.box([RX(r), 0, ZEX + .75], [.42, Math.max(.01, h), .42], { fill: recv[r] === busy ? P.acc : mix(P.paper, P.ink, .3), a: k === 5 ? .4 : 1, lw: .7 });
        lab(R, [RX(r), recv[r] * HR, ZEX + .75], 'receives ' + recv[r], { mono: true, fs: 12, b: recv[r] === busy, dy: -12, c: recv[r] === busy ? P.acc : P.ink, a: L(kk => kk === 4 ? 1 : 0) }); }
      R.glass([RX(0) - .4, mean * HR, ZEX + .45], [RX(W - 1) - RX(0) + .8, 0, 0], [0, 0, .6], { c: P.ink, a: L(kk => kk === 4 ? .6 : .15), nu: 4, nv: 1, th: .005 });
      lab(R, [RX(0) - .4, mean * HR, ZEX + .75], 'mean ' + mean, { al: 'right', dx: -8, fs: 12, c: P.mute, a: L(kk => kk === 4 ? 1 : 0), wide: 1 }); }
    if (k === 5) lab(R, [0, 1.6, ZEX], 'output = one-process layer, maximum difference ' + ep.max_abs_diff_vs_one_process.toFixed(1), { fs: 12.5, b: 1, c: P.ink, a: e });
  }
  S3.stage({ id: 'stg-ep', list: 'sx-ep', fig: 'Fig. 9 · one MoE layer over four ranks, recorded', cam: [.16, .72], bounds: [[-4.9, 0, -1.3], [4.9, 1.4, 2.3]], aspect: .46,
    view: k => k === 2 ? { cam: [.08, 1.12], bounds: [[-4.9, 0, -1.3], [4.9, .6, 4.9]] } : null, dur: 1600, hold: 5000, draw,
    margin: w => w < 520 ? [16, 8, 28, 8] : [24, 70, 30, 30] });
})();
