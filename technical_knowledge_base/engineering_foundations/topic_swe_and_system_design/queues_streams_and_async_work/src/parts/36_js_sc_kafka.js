// ---- Scene: Fig. 3, Kafka partitions, keys and consumer groups (stg-kafka). The twelve chat messages of the partitioner widget below, keyed by
// user id, placed by Kafka's real default partitioner (window.KMURMUR: murmur2(key) mod 3, checked against Kafka's test vectors by check_sim.mjs);
// partitions dealt to consumers round-robin as in the widget; committed offsets are illustrative. ----
(function () {
  if (!document.getElementById('stg-kafka') || !window.QS3 || !window.KMURMUR) return;
  const { mix, lerp } = S3, { party, plate, msg, lab, win, arcPts, seg, along } = QS3;
  const SEQ = ['user-1', 'user-4', 'user-1', 'user-6', 'user-8', 'user-4', 'user-1', 'user-6', 'user-6', 'user-8', 'user-4', 'user-1'], NP = 3;
  const part = u => (KMURMUR(u) & 0x7fffffff) % NP, nth = {}, rec = SEQ.map((u, i) => { nth[u] = (nth[u] || 0) + 1; return { u, n: nth[u], p: part(u), i }; });
  const lanes = [[], [], []]; rec.forEach(r => { r.o = lanes[r.p].length; lanes[r.p].push(r); });
  window.QSN = window.QSN || {}; QSN.kafka = { part: { 'user-1': part('user-1'), 'user-4': part('user-4'), 'user-6': part('user-6'), 'user-8': part('user-8') }, lens: lanes.map(l => l.length) };
  const COL = P => ({ 'user-1': P.c1, 'user-4': P.c2, 'user-6': P.c3, 'user-8': P.c4 });
  const ZP = p => 1.6 - p * 1.6, X0 = -2.3, DX = .7, xr = o => X0 + o * DX, XE = X0 + 6.6 * DX, PR = [-4.7, 0, 0];
  const OFF = [1, 2, 4], OFF2 = [0, 1, 2];   // committed offsets of the two groups (illustrative)
  const CZ = [1.95, .65, -.65, -1.95], CX = 4.9, AN = [CX, 0, -3.6];
  const owner = (p, C) => p % C;   // the widget's round-robin picture
  function draw(R, k, e) {
    const P = R.P, C = COL(P), nC = k <= 1 ? 0 : k === 2 ? 2 : k === 3 ? 3 : 4;
    R.grid(-5.6, 6, -4.4, 2.8, .5);
    party(R, PR, [.9, .6, .9], P.c5, 'producer', { a: k === 0 ? 1 : k === 5 ? .3 : 0 });
    for (let p = 0; p < NP; p++) { const a = k === 1 && p !== part('user-1') ? 0 : 1;   // the close view on P2 leaves the others out
      plate(R, [(X0 + XE) / 2 - .05, 0, ZP(p)], XE - X0 + .5, .75, P.c3, a * .9, { nu: 7, nv: 1 });
      if (a > .01) lab(R, [X0 - .45, 0, ZP(p)], 'P' + p, { b: 1, fs: 13.5, mono: 1, c: P.c3, al: 'right', dx: -4, a: Math.max(.4, a) }); }
    // 1. keys hash to partitions: each message flies to murmur2(key) mod 3
    rec.forEach(r => { const t0 = r.i / 12 * .85, t = k === 0 ? win(e, t0, t0 + .15) : 1, dim = k === 1 ? (r.p !== part('user-1') ? 0 : r.u !== 'user-1' ? .2 : 1) : 1;
      if (k === 0 && t > 0 && t < 1) { const pts = arcPts(R, [PR[0] + .4, .6, 0], [xr(r.o), .1, ZP(r.p)], .8); msg(R, along(pts, t), C[r.u], 1, { s: [.42, .2, .42] }); return; }
      if (t <= 0) return;
      msg(R, [xr(r.o), .05, ZP(r.p)], C[r.u], dim, { s: [.5, .22, .5], txt: k === 1 && r.u === 'user-1' ? 'u1 #' + r.n : null, b: 1 }); });
    if (k === 0) R.flow(arcPts(R, [PR[0] + .4, .6, 0], [X0, .3, 0], .5), { c: P.c5, r: .06, n: 5, speed: 1.3, a: .5 });
    if (k === 0) [['user-8', 0], ['user-4', 1], ['user-1, user-6', 2]].forEach(([t, p]) => lab(R, [XE + .2, 0, ZP(p)], t, { fs: 12.5, c: P.mute, al: 'left', dx: 4, a: win(e, .85, 1), wide: 1 }));
    // 3 to 5. one consumer group: each partition owned by one consumer; flows from its committed offset onwards
    for (let c = 0; c < 4; c++) { const live = c < nC, idle = live && c >= NP, born = (k === 3 && c === 2) || (k === 4 && c === 3), a = live ? (born ? win(e, 0, .3) : 1) : 0;
      if (a <= .01) continue;
      party(R, [CX, 0, CZ[c]], [.85, .5, .7], idle ? P.mute : P.acc, 'c' + (c + 1) + (idle ? ' · idle' : ''), { a: a * (k === 5 ? .35 : 1), t: idle ? .15 : .35, lc: idle ? P.mute : P.ink, grp: 'cons', fs: 12.5 }); }
    if (nC) for (let p = 0; p < NP; p++) { const c = owner(p, Math.min(nC, 4)), z = ZP(p), re = k === 3 ? win(e, .35, .6) : 1, a = k === 5 ? .3 : re;
      R.box([xr(OFF[p]) - DX / 2, .02, z], [.05, .7, .7], { fill: P.acc, a: a * .9, shadow: false });
      R.flow(arcPts(R, [XE, .2, z], [CX - .45, .3, CZ[c]], .2), { c: P.acc, r: .07, n: 5, speed: 1.2, a: a * .9 }); }
    if (k === 2) lab(R, [xr(OFF[2]) - DX / 2, .72, ZP(2)], 'committed offset', { fs: 12.5, c: P.acc, b: 1, dy: -10, a: win(e, .3, .6) });
    if (k === 3) lab(R, [CX, 0, -2.7], 'rebalance', { b: 1, fs: 13, c: P.bad, dy: -10, a: 1 - win(e, .45, .7) });
    // 6. a second group reads everything again, at its own offsets
    if (k === 5) { party(R, AN, [1.3, .5, .8], P.c5, 'group analytics', { t: .35, a: win(e, 0, .3) });
      for (let p = 0; p < NP; p++) { const z = ZP(p);
        R.box([xr(OFF2[p]) - DX / 2, .02, z], [.05, .7, .7], { fill: P.c5, a: win(e, .2, .5), shadow: false });
        R.flow(arcPts(R, [XE, .25, z], [AN[0] - .5, .3, AN[2] + .2], .3), { c: P.c5, r: .07, n: 6, speed: 1.2, a: win(e, .25, .55) }); } }
  }
  const full = { cam: [.25, .8], bounds: [[-5.4, 0, -4], [5.6, .8, 2.5]] };
  S3.stage({ id: 'stg-kafka', list: 'sx-kafka', fig: 'Fig. 3 · partitions, keys and one consumer group', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1500, hold: 4800, draw, margin: QS3.margin,
    view: k => k === 1 ? { cam: [.3, .7], bounds: [[-3.4, 0, -2.4], [3.0, .9, -.8]] } : k === 0 ? { cam: [.25, .8], bounds: [[-5.4, 0, -2.4], [3.6, .8, 2.4]] } : k === 5 ? full : { cam: [.25, .8], bounds: [[-3.4, 0, -2.5], [5.6, .8, 2.5]] } });
})();
