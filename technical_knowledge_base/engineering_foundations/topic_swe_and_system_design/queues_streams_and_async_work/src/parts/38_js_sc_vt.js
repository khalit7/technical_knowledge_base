// ---- Scene: Fig. 5, visibility timeouts and the dead-letter queue (stg-vt). A claimed message is hidden for a timeout, drawn as a bar that
// runs down; steps 2 to 4 replay three illustrative timelines (a 45 s job against SQS's default 30 s, the same with a heartbeat every 20 s, and a
// 300 s timeout with a crash); steps 5 and 6 are the Queue lab's simulator (QSIM, presets "Poison, no DLQ" and "Poison + DLQ", seed 1:
// 2% poison messages, 5 s timeout, max receives 0 and 5), the same runs recompute.py mirrors. ----
(function () {
  if (!document.getElementById('stg-vt') || !window.QS3 || !window.QSIM) return;
  const { mix, lerp } = S3, { party, plate, msg, crash, lab, win, arcPts, seg, along, fmt } = QS3;
  const base = { mode: 'rate', lam: 20, N: 1000, T: 120, C: 4, S: 0.15, dist: 'exp', V: 5, pc: 0, Rs: 1, idem: false, M: 0, pp: 0.02, B: 0, burst: false, seed: 1 };
  const PO = QSIM.run(base).st, PD = QSIM.run(Object.assign({}, base, { M: 5 })).st;
  window.QSN = window.QSN || {}; QSN.vt = { poisonRedel: PO.redeliveries, poisonAge: PO.maxAge, dlq: PD.dlq, dlqRedel: PD.redeliveries, dlqAge: PD.maxAge };
  // the three timelines (seconds): claims [worker, from, to], timer resets, crash time, receipts
  const TL = [null,
    { T: 80, V: 30, A: [0, 45], B: [30, 75], hb: [], crash: null, fx: [45, 75] },
    { T: 50, V: 30, A: [0, 45], B: null, hb: [20, 40], crash: null, fx: [45] },
    { T: 360, V: 300, A: [0, 10], B: [300, 345], hb: [], crash: 10, fx: [345] }];
  const Q0 = -4.4, Q1 = -1.8, QZ = 0, WA = [1.2, 0, -1.1], WB = [1.2, 0, 1.1], RC = [4.0, 0, 0], DQ = [-3.1, 0, -2.4], head = [Q1 - .35, .05, QZ];
  function timer(R, frac, V, c, a) { const L = 2.2, x0 = Q0 + .2, z = QZ + .75, P = R.P;
    R.box([x0 + L / 2, .02, z], [L, .06, .16], { fill: P.soft, a: a * .8, shadow: false, lw: .5 });
    if (frac > 0) R.box([x0 + L * frac / 2, .08, z], [L * frac, .1, .16], { fill: mix(P.paper, c, .75), a, shadow: false, lw: .5 }); }
  function draw(R, k, e) {
    const P = R.P;
    R.grid(-5.2, 5.2, -3.4, 2.4, .5);
    plate(R, [(Q0 + Q1) / 2, 0, QZ], Q1 - Q0, 1.0, P.c4, .9, { nu: 5, nv: 1 });
    lab(R, [Q0, 0, QZ], 'queue', { b: 1, fs: 13, c: P.c4, al: 'right', dx: -6 });
    [1, 2, 3].forEach(i => msg(R, [Q1 - .35 - i * .55, .05, QZ], P.c4, k >= 4 ? .4 : .7));
    const tl = TL[k];
    const t = tl ? lerp(0, tl.T, win(e, .05, .95)) : 0;
    const busy = (w, T) => w && T >= w[0] && T < w[1];
    const deadA = tl && tl.crash != null && t >= tl.crash;
    party(R, WA, [.9, .6, .8], deadA ? P.bad : P.c5, 'worker A', { a: k >= 4 ? .3 : 1, grp: 'w', t: deadA ? .4 : busy(tl && tl.A, t) ? .55 : .25 });
    party(R, WB, [.9, .6, .8], P.c5, 'worker B', { a: k >= 4 ? .3 : 1, grp: 'w', t: busy(tl && tl.B, t) ? .55 : .25 });
    plate(R, RC, 1.2, 1.4, P.c6, k >= 4 ? .3 : .9, { nu: 2, nv: 3 });
    lab(R, [RC[0], 0, RC[2] + .75], 'receipts', { b: 1, fs: 13, c: P.c6, dy: 14, a: k >= 4 ? .4 : 1 });
    // 1. a claim hides the message for the timeout; the bar is the time left
    if (k === 0) { msg(R, head, P.acc, 1, { fa: .35, txt: 'hidden', b: 1 }); timer(R, 1, 30, P.acc, win(e, .1, .4));
      R.flow(arcPts(R, [head[0] + .2, .3, head[2]], [WA[0] - .5, .4, WA[2]], .4), { c: P.acc, r: .08, n: 6, speed: 1.3 });
      lab(R, [Q0 + 1.3, .1, QZ + .75], 'hidden for 30 s (SQS default)', { fs: 12.5, b: 1, c: P.acc, dy: 18, a: win(e, .1, .4) }); }
    // 2 to 4. replay a timeline: the timer, who holds the message, receipts as they are sent
    if (tl) { let left, holder;
      if (k === 1) { holder = t < 30 ? 'A' : 'B'; left = t < 30 ? 1 - t / 30 : t < 60 ? 1 - (t - 30) / 30 : 0; }
      if (k === 2) { holder = 'A'; const last = tl.hb.filter(h => h <= t).pop() || 0; left = Math.max(0, 1 - (t - last) / 30); }
      if (k === 3) { holder = t < 300 ? 'A' : 'B'; left = t < 300 ? 1 - t / 300 : 1 - (t - 300) / 300; }
      const done = tl.fx[tl.fx.length - 1] <= t, hidden = !done;
      if (hidden) { msg(R, head, P.acc, 1, { fa: .35 }); timer(R, left, tl.V, left < .15 ? P.bad : P.acc, 1); }
      [['A', WA, tl.A], ['B', WB, tl.B]].forEach(([nm, w, iv]) => { if (!iv || t < iv[0] || t >= iv[1] || (nm === 'A' && deadA)) return;
        R.flow(arcPts(R, [head[0] + .2, .3, head[2]], [w[0] - .5, .4, w[2]], .4), { c: nm === 'B' && k === 1 ? P.bad : P.acc, r: .07, n: 5, speed: 1.3, a: .9 }); });
      if (deadA) crash(R, WA, .6, 1, '✕ crash at ' + tl.crash + ' s');
      tl.hb.forEach(h => { if (t >= h && t < h + 4) lab(R, [WA[0], .6, WA[2]], 'extend', { b: 1, fs: 12.5, c: P.good, dy: -28 }); });
      tl.fx.forEach((f, i) => { if (t < f) return; msg(R, [RC[0], .05 + i * .2, RC[2]], i ? P.bad : P.c6, 1, { s: [.7, .16, .8], t: .6 }); });
      if (k === 1 && t >= 75) lab(R, [RC[0], .4, RC[2]], 'two receipts', { b: 1, fs: 12.5, c: P.bad, dy: -14 });
      if (k === 1 && t >= 30 && t < 36) lab(R, head, 'visible again: B takes it', { b: 1, fs: 12.5, c: P.bad, dy: -30 });
      if (k === 3 && t >= 345) lab(R, [RC[0], .3, RC[2]], 'once, 345 s late', { b: 1, fs: 12.5, c: P.bad, dy: -14 });
      lab(R, [0, 1.25, 0], 't = ' + Math.round(t) + ' s', { mono: 1, b: 1, fs: 13.5, c: P.ink }); }
    // 5. a poison message fails every time and comes back after every timeout
    if (k === 4 || k === 5) { const cyc = (e * (k === 4 ? 4 : 3)) % 1, out = cyc < .5, pth = arcPts(R, [head[0] + .2, .3, head[2]], [WA[0] - .5, .4, WA[2]], .5);
      const n = k === 4 ? Math.min(4, 1 + Math.floor(e * 4)) : Math.min(5, 1 + Math.floor(win(e, 0, .7) * 5)), toDlq = k === 5 && e > .72;
      if (!toDlq) msg(R, along(pth, out ? cyc * 2 : 2 - cyc * 2), P.bad, 1, { txt: 'poison · received ' + n + (k === 5 ? ' of 5' : ''), b: 1, lc: P.bad }); }
    if (k === 4) lab(R, [0, 0, 2.0], 'model: ' + fmt(PO.redeliveries) + ' redeliveries, oldest ' + fmt(PO.maxAge) + ' s', { mono: 1, b: 1, fs: 13, c: P.bad, dy: 10, wide: 1, a: win(e, .3, .6) });
    // 6. after max receives, the next claim moves it to the dead-letter queue
    if (k === 5) { plate(R, DQ, 1.8, .9, P.bad, win(e, 0, .3) * .9, { nu: 3, nv: 1 }); lab(R, [DQ[0], 0, DQ[2] + .5], 'dead-letter queue', { b: 1, fs: 13, c: P.bad, dy: 14, a: win(e, 0, .3) });
      const mv = win(e, .72, .95); if (mv > 0) msg(R, along(arcPts(R, head, [DQ[0], .05, DQ[2]], .6), mv), P.bad, 1, { txt: mv >= 1 ? 'alert on DLQ depth' : null, b: 1, lc: P.bad });
      lab(R, [0, 0, 2.0], 'model: ' + PD.dlq + ' dead-lettered, ' + PD.redeliveries + ' redeliveries, oldest ' + fmt(PD.maxAge, 1) + ' s', { mono: 1, b: 1, fs: 13, c: P.ink, dy: 10, wide: 1, a: win(e, .3, .6) }); }
  }
  const full = { cam: [.25, .72], bounds: [[-5, 0, -2.9], [4.8, 1.3, 1.9]] };
  S3.stage({ id: 'stg-vt', list: 'sx-vt', fig: 'Fig. 5 · a lease on a message, and where poison goes', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 2800, hold: 3800, draw, margin: QS3.margin });   // a long tween so the replayed clock can be read
})();
