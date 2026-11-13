// ---- Scene: Fig. 1, the hero (stg-hero): accept now, do later. A request is accepted with 202, its message is handed to a broker through an
// outbox, workers do the work and acknowledge, and the three places it goes wrong. Numbers: the measured lab (LABDATA: the naive dual write's lost
// events, the at-least-once receipts with crashes, the idempotent receiver) and the Queue lab's simulator (QSIM, its "Healthy" and "Over capacity"
// presets, seed 1: the backlog and the oldest message's age two minutes in). Layout is a schematic; the message counts drawn are illustrative. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.QS3 || !window.LABDATA || !window.QSIM) return;
  const { mix, lerp } = S3, { party, plate, msg, crash, lab, win, arcPts, seg, along, fmt, margin } = QS3;
  const D = LABDATA, red = D.redelivery, ob = D.outbox;
  const pick = (m, k) => red.filter(r => r.name === m).map(r => r[k]);
  const lost = ob.filter(r => r.mode === 'naive').map(r => r.lost_events), eff = pick('at-least-once, 5% crashes', 'effects'), idem = pick('at-least-once + idempotent receiver, 5% crashes', 'effects');
  const base = { mode: 'rate', lam: 20, N: 1000, T: 120, C: 4, S: 0.15, dist: 'exp', V: 30, pc: 0, Rs: 1, idem: false, M: 0, pp: 0, B: 0, burst: false, seed: 1 };
  const H = QSIM.run(base), O = QSIM.run(Object.assign({}, base, { lam: 30 })), O2 = O.samples[120];
  // the numbers the step list quotes (check_stages.mjs compares them with the text)
  window.QSN = window.QSN || {};
  QSN.hero = { lostMin: Math.min(...lost), lostMax: Math.max(...lost), effMin: Math.min(...eff), effMax: Math.max(...eff), idem: idem, cap: base.C / base.S,
    healthyAge: H.st.maxAge, overDepth: O2.depth, overAge: O2.age, overLeft: O.st.left, rho: 30 * base.S / base.C };
  const CL = [-6.4, 0, 0], API = [-4.5, 0, 0], DB = [-2.3, 0, 0], BX0 = -.6, BX1 = 2.4, BZ = 0, WK = [[3.6, 0, -1.1], [4.5, 0, 0], [5.4, 0, 1.1]], FX = [7.0, 0, 0];
  const slot = i => [BX1 - .35 - i * .5, .05, BZ];
  function draw(R, k, e) {
    // each object is at full strength in the steps about it, faint in the steps beside it, and absent from the close views that leave it out
    const P = R.P, V = (on, dim) => k === 6 || on.indexOf(k) >= 0 ? 1 : dim.indexOf(k) >= 0 ? .25 : 0;
    R.grid(-7.4, 7.8, -2.6, 2.6, .5);
    party(R, CL, [.7, .45, .7], P.c2, 'user', { a: V([0], []), wide: 1 });
    party(R, API, [1.1, .8, 1.0], P.c1, 'order API', { a: V([0, 1], []), wide: 1 });
    party(R, DB, [1.1, .65, 1.0], P.c3, 'Postgres', { a: V([1], [2, 5]), wide: 1 });
    plate(R, [(BX0 + BX1) / 2, 0, BZ], BX1 - BX0, 1.0, P.c4, V([1, 2, 3, 5], [4]) * .9, { nu: 6, nv: 1 });
    lab(R, [(BX0 + BX1) / 2, 0, BZ + .55], 'broker', { b: 1, fs: 13, c: P.c4, dy: 14, a: Math.max(.4, V([2, 5], [1, 3, 4])) });
    WK.forEach((w, i) => party(R, w, [.7, .5, .7], i === 1 && k === 4 ? P.bad : P.c5, i === 0 ? 'workers' : null, { a: V([3, 4], [2, 5]), wide: 1 }));
    party(R, FX, [.9, .3, .9], P.c6, 'receipts', { a: V([3, 4], []), wide: 1 });
    const A = (...ks) => V(ks, [1, 2, 3, 4, 5]);
    // 1. accept: the request in, 202 back at once
    if (k === 0) { R.flow(seg([CL[0] + .4, .3, -.15], [API[0] - .6, .3, -.15], 16), { c: P.c2, r: .08, n: 7, speed: 1.6, a: Math.min(1, e * 2) });
      R.flow(seg([API[0] - .6, .2, .2], [CL[0] + .4, .2, .2], 16), { c: P.good, r: .08, n: 7, speed: 1.6, a: win(e, .45, .7) });
      lab(R, [(CL[0] + API[0]) / 2, .2, .2], '202 Accepted', { mono: 1, b: 1, fs: 13, c: P.good, dy: 22, a: win(e, .45, .7) });
      msg(R, [API[0] + .9, .05, .9], P.c4, win(e, .3, .6), { txt: 'message: embed_document 981', b: 1, ldy: -12 }); }
    // 2. the hand-off: order and outbox row in one transaction, then the relay to the broker
    if (k === 1) { R.flow(arcPts(R, [API[0] + .5, .6, 0], [DB[0] - .5, .55, 0], .25), { c: P.c1, r: .08, n: 7, speed: 1.4, a: Math.min(1, e * 2) });
      lab(R, [DB[0], .65, 0], 'order + outbox row, one commit', { fs: 12.5, b: 1, c: P.c3, dy: -30, a: win(e, .15, .4) });
      R.flow(arcPts(R, [DB[0] + .5, .5, 0], [BX0 + .4, .25, BZ], .3), { c: P.c4, r: .08, n: 7, speed: 1.3, a: win(e, .45, .7) });
      lab(R, [(DB[0] + BX0) / 2, .7, 0], 'relay', { mono: 1, fs: 12, c: P.c4, dy: -6, a: win(e, .45, .7) });
      msg(R, along(seg([BX0 + .3, .05, BZ], slot(0), 10), win(e, .6, 1)), P.c4, win(e, .55, .7)); }
    // 3. messages wait in the broker until a worker takes them
    const nWait = k === 2 ? Math.round(1 + 4 * e) : k === 3 ? Math.round(5 - 4 * e) : k === 4 ? 2 : k === 6 ? 2 : 0;
    if (k >= 2 && k !== 5) for (let i = 0; i < nWait; i++) msg(R, slot(i), P.c4, A(2, 3, 4));
    if (k === 2) R.flow(arcPts(R, [DB[0] + .5, .5, 0], [BX0 + .4, .25, BZ], .3), { c: P.c4, r: .07, n: 6, speed: 1.3 });
    // 4. workers take one each, do the work, acknowledge (the message is deleted)
    if (k === 3 || k === 6) WK.forEach((w, i) => { R.flow(arcPts(R, [BX1, .2, BZ], [w[0] - .45, .35, w[2]], .25), { c: P.c4, r: .07, n: 5, speed: 1.3, a: k === 6 ? .5 : 1 });
      R.flow(arcPts(R, [w[0] + .45, .35, w[2]], [FX[0] - .5, .25, FX[2] + (i - 1) * .25], .2), { c: P.c6, r: .07, n: 5, speed: 1.3, a: k === 6 ? .5 : win(e, .2, .5) }); });
    if (k === 3) lab(R, [WK[0][0], .5, WK[0][2]], 'work, then ack: deleted', { fs: 12.5, b: 1, c: P.c5, dy: -44, a: win(e, .3, .6) });
    const nRc = k === 3 ? Math.round(1 + 3 * e) : k === 4 ? 4 : k === 6 ? 4 : 0;
    for (let i = 0; i < nRc; i++) msg(R, [FX[0], .3 + i * .1, FX[2]], P.c6, A(3, 4), { s: [.6, .08, .6], t: .45 });
    // 5. a crash after the work and before the ack: the message comes back and the work runs again
    if (k === 4) { const w = WK[1]; crash(R, w, .55, win(e, .05, .25), null);   // its label goes low on the left, clear of the first worker and the receipts
      lab(R, [w[0] - .45, .05, w[2] + .25], '✕ crash before ack', { b: 1, fs: 13, c: P.bad, al: 'right', dx: -8, dy: 8, a: win(e, .05, .25) });
      const back = seg([w[0] - .45, .3, w[2]], slot(0), 14); msg(R, along(back, win(e, .3, .55)), P.bad, win(e, .25, .35) * (1 - win(e, .62, .7)));
      R.flow(arcPts(R, [BX1, .2, BZ], [WK[0][0] - .45, .35, WK[0][2]], .25), { c: P.bad, r: .08, n: 5, speed: 1.4, a: win(e, .6, .75) });
      msg(R, [FX[0], .3 + 4 * .1, FX[2]], P.bad, win(e, .8, .95), { s: [.6, .08, .6], t: .7 });
      lab(R, [FX[0], .8, FX[2]], 'receipt twice', { b: 1, fs: 12.5, c: P.bad, dy: -10, a: win(e, .8, .95) }); }
    // 6. arrivals faster than C/S: the backlog grows and nothing errors (the simulator's over-capacity run, two minutes in)
    if (k === 5) { const n = Math.round(lerp(3, 60, e)); for (let i = 0; i < n; i++) { const c = i % 6, r = Math.floor(i / 6) % 2, l = Math.floor(i / 12);
        msg(R, [BX1 - .3 - c * .5, .05 + l * .24, BZ - .22 + r * .44], P.c4, 1, { s: [.42, .2, .4] }); }
      R.flow(arcPts(R, [DB[0] + .5, .5, 0], [BX0 + .4, .4, BZ], .3), { c: P.c4, r: .08, n: 12, speed: 1.6 });
      WK.forEach(w => R.flow(arcPts(R, [BX1, .3, BZ], [w[0] - .45, .35, w[2]], .25), { c: P.c4, r: .06, n: 3, speed: 1.1, a: .7 }));
      lab(R, [(BX0 + BX1) / 2, 1.75, BZ], fmt(Math.round(lerp(0, O2.depth, e))) + ' waiting, oldest ' + fmt(lerp(0, O2.age, e), 0) + ' s', { mono: 1, b: 1, fs: 13, c: P.bad, dy: -10 }); }
    // 7. the three failure points and their fixes
    if (k === 6) { const a = win(e, .1, .5);
      lab(R, [DB[0], .65, 0], '1 · outbox', { b: 1, fs: 13, c: P.bad, dy: -30, a });
      lab(R, [FX[0], .3, 0], '2 · idempotent key', { b: 1, fs: 13, c: P.bad, dy: -34, a });
      lab(R, [(BX0 + BX1) / 2, .3, BZ], '3 · backpressure, age alarm', { b: 1, fs: 13, c: P.bad, dy: -34, a }); }
  }
  const full = { cam: [.18, .72], bounds: [[-6.9, 0, -1.6], [7.6, 1.0, 1.6]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · accept now, do later', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4600, draw, margin,
    view: k => k === 0 ? { cam: [.35, .6], bounds: [[-6.9, 0, -1], [-2.8, 1.2, 1]] }
      : k === 1 ? { cam: [.3, .62], bounds: [[-5.2, 0, -1.2], [2.6, 1.0, 1.2]] }
      : k === 2 || k === 5 ? { cam: [.3, .66], bounds: [[-2.9, 0, -1.5], [5.9, 1.6, 1.5]] }
      : k === 3 || k === 4 ? { cam: [.25, .66], bounds: [[-.8, 0, -1.6], [7.6, 1.0, 1.6]] } : full });
})();
