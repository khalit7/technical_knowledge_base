// ---- Scene (Reading 8, Fig. 8): a shuffle buffer over a shard stream. The 11 shards are the measured corpus of section 8 (one Nemotron-CC bucket each,
// 200 documents); the output cells are the first three batches of 32 actually read under each scheme (window.SL.shuf.orders, recorded by
// src/scripts/shuffle.py with the real libraries) and the bars their measured shards per batch (SL.shuf.m). The 20-slot buffer that fills and
// empties is illustrative: each slot stands for 50 documents, so it holds five shards' worth, as B = 1,000 over 200-document shards does. ----
(function () {
  if (!document.getElementById('stg-buf') || !window.SLK || !window.SL) return;
  const { mix, lerp } = S3, { lab, plate, bar, win, arcPts, seg, f0, CAT } = SLK, SH = SL.shuf, K = SH.K, B = SH.batch;
  const dec = s => Array.from(s, c => parseInt(c, 36)), O = { none: dec(SH.orders.none), so: dec(SH.orders.hf_buf1_mbis1), buf: dec(SH.orders.hf_buf1000_mbis1) };
  const first = o => { const seen = []; o.forEach(x => { if (!seen.includes(x)) seen.push(x); }); for (let i = 0; i < K; i++) if (!seen.includes(i)) seen.push(i); return seen; };
  const SO = first(O.so), rank = new Array(K); SO.forEach((sh, i) => rank[sh] = i);   // the shuffled shard order, as the recorded run read it
  const M = k => SH.m[k].batch_distinct_mean;
  const XS = -4.6, ZS = i => -2.4 + i * .46, XB = -1.3, XO = 2.6, NB = 3;
  // the illustrative buffer: 20 slots, 4 slots per shard, filled from the shuffled shard order, then 12 emits with a seeded generator
  const NSL = 20, PERSH = 4, stream = []; SO.forEach(sh => { for (let j = 0; j < PERSH; j++) stream.push(sh); });
  const emits = []; { let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const buf = stream.slice(0, NSL); let nx = NSL; for (let i = 0; i < 12; i++) { const j = Math.floor(rnd() * NSL); emits.push([j, buf[j], stream[nx]]); buf[j] = stream[nx++]; } }
  const slotXZ = j => [XB + (j % 4 - 1.5) * .42, (Math.floor(j / 4) - 2) * .42];
  const BARS = [['none', 'in order'], ['hf_buf1_mbis1', 'shard order'], ['hf_buf100_mbis1', 'B = 100'], ['dl4_hf_buf1000_mbis1', 'B = 1,000, 4 workers'], ['hf_buf1000_mbis1', 'B = 1,000'], ['global', 'global']];
  window.SLSC = window.SLSC || {}; SLSC.buf = { so: M('hf_buf1_mbis1'), none: M('none'), buf: M('hf_buf1000_mbis1'), shards: SO };
  function out(R, P, ord, a, k, e) { const C = CAT(P);
    for (let b = 0; b < NB; b++) for (let i = 0; i < B; i++) { const p = b * B + i, x = XO + (i % 8 - 3.5) * .27, z = -1.9 + b * 1.35 + Math.floor(i / 8) * .27, t = k === null ? 1 : win(e, p / (NB * B) * .7, p / (NB * B) * .7 + .25);
      R.box([x, .02, z], [.22, .12, .22], { fill: mix(P.paper, C[ord[p]], .7), a: a * t, shadow: false, lw: .35 }); }
    for (let b = 0; b < NB; b++) lab(R, [XO - 1.15, .05, -1.9 + b * 1.35 + .4], 'batch ' + (b + 1), { fs: 12, al: 'right', dx: -4, c: P.mute, a, wide: 1 }); }
  function draw(R, k, e) {
    const P = R.P, C = CAT(P);
    R.grid(-5.6, 5.4, -3.2, 3.2, .5);
    // the shards: sorted (one bucket each), then in the shuffled order the run read them in
    const mv = k === 0 ? 0 : k === 1 ? win(e, 0, .6) : 1, sa = k === 4 ? 1 - win(e, 0, .4) : 1;
    for (let i = 0; i < K; i++) { const z = lerp(ZS(i), ZS(rank[i]), mv), cur = k === 0 ? i === 0 : k === 1 ? rank[i] === 0 : k >= 2 && k <= 3 ? rank[i] < 6 : false;
      plate(R, [XS, 0, z], 1.5, .36, C[i], sa * (cur ? 1 : .55), { nu: 5 });
      R.box([XS, .03, z], [1.3, .1, .22], { fill: mix(P.paper, C[i], .6), a: sa * (cur ? 1 : .5), shadow: false, lw: .4 }); }
    lab(R, [XS, 0, ZS(0) - .3], k === 0 ? '11 shards, one quality bucket each' : '11 shards, shuffled order', { fs: 12.5, b: 1, dy: -10, a: sa, wide: 1 });
    // the output: what the real library emitted, first three batches of 32
    if (k === 0) { R.flow(arcPts(R, [XS + .75, .15, ZS(0)], [XO - 1, .2, -1.6], .5), { c: C[0], r: .07, n: 8, speed: 1.3, a: e }); out(R, P, O.none, 1, 0, e); }
    if (k === 1) { const s0 = SO[0]; R.flow(arcPts(R, [XS + .75, .15, ZS(0)], [XO - 1, .2, -1.6], .5), { c: C[s0], r: .07, n: 8, speed: 1.3, a: win(e, .5, 1) }); out(R, P, O.so, 1, 1, e); }
    lab(R, [XO, .1, -2.25], k === 0 ? 'read: ' + M('none').toFixed(1) + ' shards per batch' : k === 1 ? 'read: ' + M('hf_buf1_mbis1').toFixed(1) + ' shards per batch' : k >= 3 && k < 4 ? 'read: ' + M('hf_buf1000_mbis1').toFixed(1) + ' shards per batch' : null,
      { fs: 12.5, b: 1, dy: -12, c: P.acc, a: k === 1 ? win(e, .5, 1) : k === 3 ? win(e, .4, 1) : 1, wide: 1 });
    // the buffer: a tray of slots, filled from the stream, then emptied one random slot at a time and refilled with the next document
    if (k >= 2 && k <= 3) { plate(R, [XB, 0, 0], 2.0, 2.4, P.c5, 1, { nu: 4, th: .05 });
      lab(R, [XB, .05, -1.25], 'shuffle buffer', { fs: 12.5, b: 1, c: P.c5, dy: -12 });
      const nE = k === 3 ? Math.min(emits.length, Math.floor(e * emits.length * 1.05)) : 0, buf = stream.slice(0, NSL); for (let i = 0; i < nE; i++) buf[emits[i][0]] = emits[i][2];
      for (let j = 0; j < NSL; j++) { const [x, z] = slotXZ(j), t = k === 2 ? win(e, j / NSL * .7, j / NSL * .7 + .2) : 1, curE = k === 3 && nE < emits.length && emits[nE][0] === j;
        R.box([x, .03, z], [.32, .16, .32], { fill: mix(P.paper, C[buf[j]], .7), a: t, shadow: false, lw: .5 }); if (curE) R.glow([x, .2, z], .3, { c: P.c5, a: .9 }); }
      if (k === 2) R.flow(arcPts(R, [XS + .75, .15, ZS(2)], [XB - .8, .2, 0], .5), { c: P.c5, r: .07, n: 8, speed: 1.4, a: e });
      if (k === 3) { R.flow(arcPts(R, [XS + .75, .15, ZS(6)], [XB - .8, .2, .4], .4), { c: P.c5, r: .06, n: 6, speed: 1.2, a: .8 });
        R.flow(arcPts(R, [XB + .9, .25, 0], [XO - 1.1, .2, -.5], .5), { c: P.acc, r: .07, n: 8, speed: 1.4, a: .9 }); out(R, P, O.buf, 1, 3, e); }
      if (k === 2) out(R, P, O.buf, .12, null, e); }
    // the measured mix of every scheme
    if (k === 4) BARS.forEach(([key, nm], i) => { const v = M(key), x = -3.4 + i * 1.35;
      bar(R, [x, 0, .9], v, .2, key === 'global' ? P.good : P.acc, win(e, i * .08, i * .08 + .4), { w: .6, d: .6, val: v.toFixed(1), name: nm, fs: 13, nwide: 1 }); });
    if (k === 4) lab(R, [-.0, 2.4, .9], 'shards per batch of 32, out of 11 (measured)', { fs: 12.5, b: 1, c: P.ink, a: win(e, .3, .8), wide: 1 });
  }
  const full = { cam: [.15, .8], bounds: [[-5.4, 0, -2.8], [3.8, .4, 3.0]] };
  S3.stage({ id: 'stg-buf', list: 'sx-buf', fig: 'Fig. 8 · a shuffle buffer over 11 sorted shards', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1600, hold: 5000, draw, margin: SLK.margin,
    view: k => k === 4 ? { cam: [.12, .55], bounds: [[-4.2, 0, .2], [4.0, 2.4, 1.8]] } : full });
})();
