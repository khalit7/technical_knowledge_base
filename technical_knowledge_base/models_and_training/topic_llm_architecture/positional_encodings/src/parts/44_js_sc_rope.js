// ---- Scene (section 3, Fig. 4): RoPE from zero. Steps 1 and 2: the worked example (one pair, theta = 0.5, q = k = (1, 0), positions 3 and 5, then
// 10 and 12). Steps 3 to 6: a query and a key of the tiny GPT's head shape (32 numbers, 16 pairs, base 10,000; the numbers themselves are seeded
// random, illustrative) as 16 dials, each pair's two hands turned by position x its frequency, and under each dial that pair's share of q . k. ----
(function () {
  if (!document.getElementById('stg-rope') || !window.PES) return;
  const { mix, lerp } = S3, { tw, la, lab, dial, hand, arcPts, f2, TAU } = PES;
  // illustrative q and k: seeded Gaussians (mulberry32 + Box-Muller, as the chart in section 2)
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
  const gauss = r => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) };
  const P0 = PE_DATA.presets.tiny, n = P0.dim / 2, TH = ROPE.baseInv(P0.base, P0.dim);
  const Rq = rng(3), Rk = rng(5), q = [], k = []; for (let i = 0; i < P0.dim; i++) { q.push(gauss(Rq)); k.push(gauss(Rk)); }
  const pq = [...Array(n)].map((_, i) => [Math.hypot(q[2 * i], q[2 * i + 1]), Math.atan2(q[2 * i + 1], q[2 * i])]), pk = [...Array(n)].map((_, i) => [Math.hypot(k[2 * i], k[2 * i + 1]), Math.atan2(k[2 * i + 1], k[2 * i])]);
  const share = (i, m, nn) => pq[i][0] * pk[i][0] * Math.cos(pk[i][1] + nn * TH[i] - pq[i][1] - m * TH[i]);
  const POS = [null, null, [0, 0], [20, 24], [120, 124], [120, 180]];
  const WE = [[3, 5], [10, 12]], th0 = .5;
  const SP = 1.3, r = .52, DC = i => i < 8 ? [(i - 3.5) * SP, 1.0, 0] : [(i - 11.5) * SP, 2.35, -1.4], BX = i => (i - 7.5) * .62, YB = .34, ZB = 2.1, HB = .16, mxL = Math.max(...pq.map(v => v[0]), ...pk.map(v => v[0]));
  const BIG = [0, 1.5, 2.6], RB = 1.05;
  function draw(R, kk, e, st) {
    const P = R.P; R.grid(-6, 6, -2, 3.2, .5);
    // 1 and 2: the worked example on one large dial in front
    const ba = la(st, e, s => s <= 1 ? 1 : 0);   // the big dial is gone a third of the way into step 3, before the row appears
    if (ba > .01) {
      const m = tw(st, e, s => s <= 1 ? WE[s][0] : WE[1][0]), nn = tw(st, e, s => s <= 1 ? WE[s][1] : WE[1][1]), aq = m * th0, ak = nn * th0;
      dial(R, BIG, RB, { a: ba });
      R.line([[BIG[0] - RB, BIG[1], BIG[2]], [BIG[0] + RB, BIG[1], BIG[2]]], { c: P.line, w: 1, a: ba }); R.line([[BIG[0], BIG[1] - RB, BIG[2]], [BIG[0], BIG[1] + RB, BIG[2]]], { c: P.line, w: 1, a: ba });
      R.quad([BIG].concat(arcPts(BIG, RB * .45, aq, ak, 16)), { fill: P.c5, a: ba * .35, edge: false, dz: -.002 });
      hand(R, BIG, RB, aq, { c: P.q, a: ba, w: 3.2 }); hand(R, BIG, RB, ak, { c: P.k, a: ba, w: 3.2 });
      const tq = [BIG[0] + RB * Math.cos(aq), BIG[1] + RB * Math.sin(aq), BIG[2]], tk = [BIG[0] + RB * Math.cos(ak), BIG[1] + RB * Math.sin(ak), BIG[2]];
      const al = la(st, e, s => s <= 1 ? 1 : 0), side = v => Math.cos(v) >= 0 ? ['left', 8] : ['right', -8];
      lab(R, tq, ('q at m = ' + Math.round(m) + ': (' + f2(Math.cos(aq), 4) + ', ' + f2(Math.sin(aq), 4) + ')').replace(/-/g, '−'), { fs: 12.5, b: 1, c: P.q, al: side(aq)[0], dx: side(aq)[1], a: e >= 1 ? al : al * .0 });
      lab(R, tk, ('k at n = ' + Math.round(nn) + ': (' + f2(Math.cos(ak), 4) + ', ' + f2(Math.sin(ak), 4) + ')').replace(/-/g, '−'), { fs: 12.5, b: 1, c: P.k, al: side(ak)[0], dx: side(ak)[1], dy: 14, a: e >= 1 ? al : 0 });
      lab(R, [BIG[0], BIG[1] - RB, BIG[2]], 'q · k = ' + f2(Math.cos(ak - aq), 4) + ' = cos(' + f2((nn - m) * th0, 1) + ')', { fs: 13, b: 1, c: P.ink, dy: 22, a: al });
    }
    // 3 to 6: a head of 16 pairs
    const ra = la(st, e, s => s >= 2 ? 1 : 0);
    if (ra > .01) {
      const m = tw(st, e, s => POS[s] ? POS[s][0] : 0), nn = tw(st, e, s => POS[s] ? POS[s][1] : 0);
      let tot = 0;
      for (let i = 0; i < n; i++) {
        const C = DC(i), sh = share(i, m, nn); tot += sh;
        dial(R, C, r, { a: ra });
        hand(R, C, r, pq[i][1] + m * TH[i], { c: P.q, a: ra, len: r * (.3 + .66 * pq[i][0] / mxL), w: 2.4, br: .035 });
        hand(R, C, r, pk[i][1] + nn * TH[i], { c: P.k, a: ra, len: r * (.3 + .66 * pk[i][0] / mxL), w: 2.4, br: .035 });
        // this pair's share of q . k: a signed bar on a white plinth (positive up, negative hanging below)
        R.box([BX(i), YB - .04, ZB], [.58, .04, .36], { a: ra, shadow: false }); if (i === 0) R.box([BX(0) - .31, 0, ZB], [.03, YB - .04, .03], { a: ra }), R.box([BX(15) + .31, 0, ZB], [.03, YB - .04, .03], { a: ra });
        const h = Math.max(.012, Math.abs(sh) * HB); R.box([BX(i), sh >= 0 ? YB : YB - .04 - h, ZB], [.4, h, .22], { fill: mix(P.paper, P.c5, .8), a: ra, shadow: false, lw: .7 });
        // the pair's product flows down into its share while the rotation changes
        if (kk >= 3) R.flow([[C[0], C[1] - r, C[2]], [BX(i), YB + .25, ZB - .1]], { c: P.c5, r: .03, n: 3, speed: .8, a: la(st, e, s => s >= 3 ? .55 * ra : 0) });
        lab(R, [C[0], C[1] - r, C[2]], String(i), { fs: 12, c: P.mute, dy: 12, wide: 1, a: ra });
      }
      const al = la(st, e, s => s >= 2 ? 1 : 0);
      lab(R, [BX(15) + .4, YB, ZB], 'q · k = ' + f2(tot, 2).replace('-', '−'), { fs: 13.5, b: 1, c: P.c5, al: 'left', dx: 6, a: e >= 1 ? al : al * .5 });
      lab(R, [BX(0) - .4, YB, ZB], 'share of each pair', { fs: 12, c: P.mute, al: 'right', dx: -6, a: al, grp: 'side' });
      lab(R, [DC(0)[0] - r - .1, 1.0, 0], 'pairs 0 to 7', { fs: 12, c: P.mute, al: 'right', dx: -6, a: al, grp: 'side' });
      lab(R, [DC(8)[0] - r - .1, 2.35, -1.4], 'pairs 8 to 15', { fs: 12, c: P.mute, al: 'right', dx: -6, a: al, grp: 'side' });
      lab(R, [0, 2.35 + r, -1.4], POS[kk] ? 'query at ' + Math.round(m) + ', key at ' + Math.round(nn) + (POS[kk][0] ? ', distance ' + Math.round(nn - m) : ', no rotation yet') : '', { fs: 13, b: 1, c: P.ink, dy: -16, a: la(st, e, s => s === kk ? 1 : 0) });
    }
  }
  const row = { cam: [-.06, .46], bounds: [[-5.4, 0, -1.6], [5.4, 2.9, 2.4]] };
  const big = { cam: [-.06, .3], bounds: [[-1.9, .3, 2.3], [1.9, 2.7, 2.9]] };
  S3.stage({ id: 'stg-rope', list: 'sx-rope', fig: 'Fig. 4 · RoPE: a rotation per pair', cam: row.cam, bounds: row.bounds, aspect: .5, dur: 1700, hold: 5000, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [34, 110, 20, 110], view: k => k <= 1 ? big : row });
})();
