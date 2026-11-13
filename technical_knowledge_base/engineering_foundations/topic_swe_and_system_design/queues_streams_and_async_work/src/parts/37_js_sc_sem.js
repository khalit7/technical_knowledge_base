// ---- Scene: Fig. 4, delivery semantics (stg-sem). One message, a worker and the receipt it sends: ack before the work (a crash loses the
// receipt), ack after it (a crash repeats it), and an idempotent receiver (the repeat is caught). The last step is the measured lab
// (LABDATA.redelivery: 1,000 jobs, 4 workers, 5% crash chance, three runs per mode) beside the Queue lab's simulator on the same settings
// (QSIM, the "Lab run: crashes" preset over seeds 1 to 20, as recompute.py does). ----
(function () {
  if (!document.getElementById('stg-sem') || !window.QS3 || !window.LABDATA || !window.QSIM) return;
  const { mix } = S3, { party, plate, msg, bar, crash, lab, win, arcPts, seg, along, fmt } = QS3;
  const red = LABDATA.redelivery, pick = (m, k) => red.filter(r => r.name === m).map(r => r[k]), mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const LOST = pick('at-most-once (delete first), 5% crashes', 'lost'), DUP = pick('at-least-once, 5% crashes', 'duplicates'), HIT = pick('at-least-once + idempotent receiver, 5% crashes', 'dedup_hits'), IDUP = pick('at-least-once + idempotent receiver, 5% crashes', 'duplicates');
  const LAB = { mode: 'backlog', lam: 20, N: 1000, T: 30, C: 4, S: 0.01, dist: 'fixed', V: 2, pc: 0.05, Rs: 0.5, idem: false, M: 0, pp: 0, B: 0, burst: false };
  const SIM = []; for (let s = 1; s <= 20; s++) SIM.push(QSIM.run(Object.assign({}, LAB, { seed: s })).st.duplicates);
  window.QSN = window.QSN || {}; QSN.sem = { lost: LOST, dup: DUP, hit: HIT, idup: IDUP, sim: +mean(SIM).toFixed(1), simMin: Math.min(...SIM), simMax: Math.max(...SIM), expected: 1000 * .05 / .95 };
  const Q0 = -4.2, Q1 = -2.0, QZ = 0, WK = [0, 0, 0], RC = [3.3, 0, .8], PE = [3.3, 0, -1.0];
  const head = [Q1 - .35, .05, QZ];
  function draw(R, k, e) {
    const P = R.P, sc = k === 5, fade = sc ? 1 - win(e, 0, .35) : 1;
    R.grid(-5, 5, -2.6, 2.6, .5);
    if (fade > .01) {
      plate(R, [(Q0 + Q1) / 2, 0, QZ], Q1 - Q0, .9, P.c4, fade * .9, { nu: 4, nv: 1 });
      lab(R, [(Q0 + Q1) / 2, 0, QZ + .5], 'queue', { b: 1, fs: 13, c: P.c4, dy: 14, a: fade });
      [0, 1, 2].forEach(i => { if (i === 0) return; msg(R, [Q1 - .35 - i * .55, .05, QZ], P.c4, fade); });
      const dead = (k === 1 && e > .4) || (k === 2 && e > .4);
      party(R, WK, [1.0, .7, .9], dead ? P.bad : P.c5, 'worker', { a: fade, t: dead ? .4 : .3 });
      plate(R, RC, 1.5, 1.0, P.c6, fade * .9, { nu: 3, nv: 2 });
      lab(R, [RC[0] + .8, 0, RC[2]], 'receipts', { b: 1, fs: 13, c: P.c6, al: 'left', dx: 6, a: fade, grp: 'st' });
      if (k >= 4) { plate(R, PE, 1.5, 1.0, P.c3, fade * (k === 4 ? win(e, 0, .3) : 1) * .9, { nu: 3, nv: 2 });
        lab(R, [PE[0] + .8, 0, PE[2]], 'processed_events', { b: 1, fs: 13, c: P.c3, al: 'left', dx: 6, mono: 1, a: fade * (k === 4 ? win(e, 0, .3) : 1), grp: 'st' }); }
    }
    const toW = seg(head, [WK[0] - .2, .75, WK[2]], 14), work = arcPts(R, [WK[0] + .5, .5, WK[2] + .2], [RC[0] - .5, .2, RC[2]], .35), ack = arcPts(R, [WK[0] - .5, .5, WK[2] - .2], [Q1 - .2, .25, QZ - .1], .35);
    const receipt = (i, c, a) => msg(R, [RC[0] - .3 + i * .6, .05, RC[2]], c, a, { s: [.45, .16, .55], t: .6 });
    // 1. one delivery: the work (send the receipt) and the ack (delete the message)
    if (k === 0) { msg(R, along(toW, win(e, 0, .3)), P.acc, 1, { txt: 'job 17', b: 1, al: 'left' });
      R.flow(work, { c: P.c6, r: .08, n: 6, speed: 1.3, a: win(e, .3, .5) }); lab(R, along(work, .5), 'work', { b: 1, fs: 12.5, c: P.c6, dy: -14, a: win(e, .3, .5) });
      R.flow(ack, { c: P.c4, r: .08, n: 6, speed: 1.3, a: win(e, .55, .75) }); lab(R, along(ack, .5), 'ack', { b: 1, fs: 12.5, c: P.c4, dy: -14, a: win(e, .55, .75) });
      receipt(0, P.c6, win(e, .45, .6)); }
    // 2. at-most-once: ack first, then a crash: the message is gone and no receipt was sent
    if (k === 1) { msg(R, [WK[0] - .2, .75, WK[2]], P.acc, 1 - win(e, .7, .9), { txt: 'job 17', b: 1, al: 'left' });
      R.flow(ack, { c: P.c4, r: .08, n: 6, speed: 1.3, a: 1 - win(e, .3, .4) }); lab(R, along(ack, .5), '1 · ack', { b: 1, fs: 12.5, c: P.c4, dy: -14, a: 1 - win(e, .3, .4) });
      crash(R, WK, .7, win(e, .4, .55), '✕ crash before the work');
      lab(R, [RC[0], .1, RC[2]], 'no receipt: lost', { b: 1, fs: 12.5, c: P.bad, dy: -18, a: win(e, .65, .85) }); }
    // 3. at-least-once: work first, then a crash before the ack: the message is still in the queue, hidden until its timeout runs out
    if (k === 2) { R.flow(work, { c: P.c6, r: .08, n: 6, speed: 1.3, a: 1 - win(e, .3, .4) }); lab(R, along(work, .5), '1 · work', { b: 1, fs: 12.5, c: P.c6, dy: -14, a: 1 - win(e, .3, .4) });
      receipt(0, P.c6, win(e, .1, .25)); crash(R, WK, .7, win(e, .4, .55), '✕ crash before the ack');
      msg(R, head, P.acc, 1, { txt: win(e, .6, .8) < 1 ? 'hidden' : 'visible again', fa: .35 + .65 * win(e, .6, .8), b: 1 });
      R.glass([head[0] - .3, .02, head[2] - .3], [.6, 0, 0], [0, .5, 0], { c: P.c4, a: 1 - win(e, .6, .8), nu: 1, nv: 1 }); }
    // 4. the redelivery: the work runs again, a second receipt
    if (k === 3) { msg(R, along(toW, win(e, 0, .3)), P.acc, 1, { txt: 'job 17 again', b: 1, al: 'left' });
      R.flow(work, { c: P.bad, r: .08, n: 6, speed: 1.3, a: win(e, .3, .5) });
      receipt(0, P.c6, 1); receipt(1, P.bad, win(e, .5, .65));
      lab(R, [RC[0] + .3, .2, RC[2]], 'two receipts', { b: 1, fs: 12.5, c: P.bad, dy: -16, a: win(e, .6, .8) }); }
    // 5. idempotent: the event id goes into processed_events in the same transaction as the receipt; the repeat's insert conflicts and is skipped
    if (k === 4) { msg(R, [WK[0] - .2, .75, WK[2]], P.acc, 1, { txt: 'job 17 again', b: 1, al: 'left' }); receipt(0, P.c6, 1);
      msg(R, [PE[0] - .3, .05, PE[2]], P.c3, win(e, 0, .3), { s: [.45, .16, .55], t: .6 });
      const ins = arcPts(R, [WK[0] + .5, .5, WK[2] - .2], [PE[0] - .5, .25, PE[2]], .35);
      R.flow(ins.slice(0, Math.max(2, Math.round(ins.length * .85))), { c: P.c3, r: .08, n: 5, speed: 1.3, a: win(e, .3, .45) });
      R.glow([PE[0] - .5, .3, PE[2]], .5, { c: P.bad, a: win(e, .5, .65) });
      lab(R, [PE[0] - .4, .3, PE[2]], 'ON CONFLICT: skip, ack', { mono: 1, b: 1, fs: 12.5, c: P.bad, dy: -44, a: win(e, .5, .7) }); }
    // 6. at scale: measured (three runs each) and simulated (20 seeds)
    // on a phone the values stay (smaller, the idempotent bar without its caught counts) and the step text names the bars
    if (sc) { const a = win(e, .3, .7), u = 1 / 40, X = [-3.3, -1.1, 1.1, 3.3], th = R.W < 520, fs = th ? 12 : 13;
      bar(R, [X[0], 0, 0], mean(LOST), u, P.bad, a, { lab: LOST.join(', '), name: 'at-most-once: lost', fs, nwide: 1 });
      bar(R, [X[1], 0, 0], mean(DUP), u, P.c5, a, { lab: DUP.join(', '), name: 'at-least-once: duplicates', fs, nwide: 1 });
      bar(R, [X[2], 0, 0], mean(IDUP), u, P.c3, a, { lab: IDUP.join(', ') + (th ? '' : ' (caught ' + HIT.join(', ') + ')'), name: 'idempotent: duplicates', fs, nwide: 1 });
      bar(R, [X[3], 0, 0], mean(SIM), u, P.mute, a, { lab: QSN.sem.sim.toFixed(1), name: 'model, 20 seeds', fs, nwide: 1 }); }
  }
  const full = { cam: [.25, .72], bounds: [[-4.6, 0, -1.6], [4.6, 1.2, 1.6]] };
  S3.stage({ id: 'stg-sem', list: 'sx-sem', fig: 'Fig. 4 · the work, the ack, and a crash between them', cam: full.cam, bounds: full.bounds, aspect: .44, dur: 1500, hold: 4800, draw, margin: QS3.margin,
    view: k => k === 5 ? { cam: [.12, .45], bounds: innerWidth < 520 ? [[-3.8, 0, -1], [3.8, 1.8, 1.4]] : [[-4.4, 0, -1], [4.4, 1.8, 1.4]] } : full });   // a phone fits the four bars tighter, so their values stand apart
})();
