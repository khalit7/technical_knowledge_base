// ---- Scene (Reading 7, Fig. 7): splitting the data across files, ranks and workers. 11 shard files (the count of the shuffle experiment's corpus,
// section 8) dealt round robin to 2 ranks, then to each rank's 4 loader workers; then an index-based loader taking its slice of one seeded global
// batch of 16; then Hugging Face's fallback when the shard count is not a multiple of the world size (datasets 5.0.1, distributed.py lines 21-23).
// The dealing rule is the one the page states; the 16-sample order is illustrative, said on the page. ----
(function () {
  if (!document.getElementById('stg-shard') || !window.SLK) return;
  const { mix } = S3, { lab, plate, party, win, arcPts, seg, f0 } = SLK;
  const NS = 11, NRk = 2, NW = 4, SX = i => (i - (NS - 1) / 2) * .98, ZS = -2.3, RX = [-2.7, 2.7], ZR = 1.7, WX = w => (w - (NW - 1) / 2) * 1.05;
  const mine = r => { const o = []; for (let i = r; i < NS; i += NRk) o.push(i); return o; };
  const deal = []; for (let r = 0; r < NRk; r++) for (let w = 0; w < NW; w++) deal.push({ r, w, sh: mine(r).filter((_, j) => j % NW === w) });
  const busy2 = deal.filter(d => d.sh.length > 1).length;
  const PERM = [13, 2, 9, 6, 0, 15, 11, 4, 8, 1, 14, 7, 3, 12, 5, 10], ZT = -.5;
  window.SLSC = window.SLSC || {}; SLSC.shard = { busy2, idle2: NRk * NW - busy2, r0: mine(0).length, r1: mine(1).length };
  function draw(R, k, e) {
    const P = R.P, RC = [P.c1, P.c4];
    R.grid(-6.2, 6.2, -3.2, 3.2, .5);
    const sa = k === 4 ? .18 : 1;
    // the shard files
    for (let i = 0; i < NS; i++) { const t = k === 0 ? win(e, i * .05, i * .05 + .4) : 1, r = i % NRk, tint = k >= 1 && k !== 4 ? (k === 1 ? e : 1) : 0;
      const c = mix(P.mute, RC[r], tint), live = k === 3 ? deal.some(d => d.sh[1] === i) : true;
      plate(R, [SX(i), 0, ZS], .8, .6, c, t * sa * (k === 3 && !live ? .3 : 1), { nu: 4, th: .05 });
      R.box([SX(i), .06, ZS], [.62, .12, .42], { fill: mix(P.paper, c, .35), a: t * sa * (k === 3 && !live ? .3 : 1), shadow: false, lw: .5 });
      lab(R, [SX(i), .2, ZS - .3], 's' + i, { mono: 1, fs: 12, c: k >= 1 && k !== 4 ? RC[r] : P.mute, dy: -8, a: Math.max(.3, t * sa) }); }
    if (k === 0) lab(R, [SX(NS - 1) + .5, .1, ZS], f0(NS) + ' shard files', { fs: 12.5, b: 1, al: 'left', dx: 6, c: P.ink, a: win(e, .5, 1), wide: 1 });
    // the ranks and their loader workers
    const ra = k === 0 ? 0 : k === 1 ? e : 1;
    for (let r = 0; r < NRk; r++) { plate(R, [RX[r], 0, ZR], 4.5, 1.3, RC[r], ra * .8, { nu: 4 });
      lab(R, [RX[r] - 2.25, 0, ZR - .65], 'rank ' + r, { fs: 13, b: 1, c: RC[r], al: 'left', dy: -12, a: ra, wide: 1 }); }
    deal.forEach(d => { const p = [RX[d.r] + WX(d.w), .03, ZR], idle = k === 3 && d.sh.length < 2, wa = k < 2 ? 0 : k === 2 ? win(e, 0, .35) : 1;
      const cur = k === 2 ? d.sh[0] : k === 3 ? d.sh[1] : null;
      party(R, p, [.72, .38, .55], idle ? P.mute : RC[d.r], 'w' + d.w, { a: wa, t: idle ? .12 : .35, fs: 12, lc: idle ? P.mute : P.ink, dy: -10, mono: 1 });
      if (idle || cur != null) lab(R, [p[0], .03, p[2] + .3], idle ? 'idle' : 's' + cur, { mono: 1, fs: 12, b: 1, c: idle ? P.mute : RC[d.r], dy: 12, a: win(e, .3, .6), wide: 1 });
      if (cur != null) { R.flow(arcPts(R, [SX(cur), .15, ZS + .2], [p[0], .45, p[2] - .2], .55, 18), { c: RC[d.r], r: .065, n: 7, speed: 1.3, a: win(e, .2, .5) });
      } });
    if (k === 1) for (let i = 0; i < NS; i++) { const r = i % NRk; R.flow(arcPts(R, [SX(i), .15, ZS + .2], [RX[r] + (i - 5) * .12, .1, ZR - .5], .45, 16), { c: RC[r], r: .055, n: 4, speed: 1.2, a: e * .8 }); }
    // index-based: one seeded global order; every rank computes it and takes its own slice of each global batch
    if (k === 4) { const a = win(e, 0, .4);
      plate(R, [0, 0, ZT], 8.3, .7, P.c5, a, { nu: 16 });
      PERM.forEach((v, i) => { const x = (i - 7.5) * .52, r = i < 8 ? 0 : 1, t = win(e, .1 + i * .02, .4 + i * .02);
        R.box([x, .03, ZT], [.44, .18, .44], { fill: mix(P.paper, RC[r], .55), a: t, shadow: false, lw: .5 });
        lab(R, [x, .21, ZT], String(v), { mono: 1, fs: 12, dy: -9, a: t, wide: 1 }); });
      lab(R, [0, .2, ZT - .35], 'one global batch of 16, in the seeded order', { fs: 12.5, b: 1, c: P.c5, dy: -24, a, wide: 1 });
      for (let r = 0; r < NRk; r++) R.flow(arcPts(R, [(r ? 2 : -2), .2, ZT + .3], [RX[r], .35, ZR - .4], .35, 14), { c: RC[r], r: .07, n: 8, speed: 1.2, a: win(e, .45, .8) });
      lab(R, [0, .2, ZT + .35], 'samples 1 to 8 to rank 0, 9 to 16 to rank 1', { fs: 12.5, c: P.ink, dy: 22, a: win(e, .5, .9), wide: 1 }); }
    // the fallback when 11 shards do not divide by 2 ranks: every rank reads every shard and keeps one example in two
    if (k === 5) { for (let i = 0; i < NS; i++) for (let r = 0; r < NRk; r++) {
        R.flow(arcPts(R, [SX(i), .15, ZS + .2], [RX[r] + (i - 5) * .12, .1, ZR - .5], .4 + .05 * r, 16), { c: RC[r], r: .05, n: 4, speed: 1.1, a: e * .55 }); }
      lab(R, [0, .3, (ZS + ZR) / 2], 'each rank reads all ' + f0(NS) + ' shards, keeps 1 example in 2', { fs: 12.5, b: 1, c: P.bad, dy: -16, a: win(e, .3, .8), wide: 1 }); }
  }
  const full = { cam: [.1, .82], bounds: [[-5.8, 0, -2.8], [5.8, .5, 2.6]] };
  S3.stage({ id: 'stg-shard', list: 'sx-shard', fig: 'Fig. 7 · 11 shards, 2 ranks, 4 workers each', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 4800, draw, margin: SLK.margin,
    // on a phone the long row of shards turns into depth, so the files and workers come out larger
    view: k => { const nw = document.getElementById('stg-shard').clientWidth < 520;
      return k === 2 || k === 3 ? { cam: nw ? [.62, .9] : [.1, .72], bounds: [[-5.8, 0, -2.7], [5.8, .5, 2.6]] } : nw ? { cam: [.62, 1.0], bounds: full.bounds } : full; } });
})();
