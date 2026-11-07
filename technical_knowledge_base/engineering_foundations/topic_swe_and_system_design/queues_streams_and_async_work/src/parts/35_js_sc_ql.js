// ---- Scene: Fig. 2, queue against log (stg-ql). The same eight messages go into a queue (front lane) and a log (back lane). The queue lends
// each message to one competing worker and deletes it on ack; the log keeps every record and each consumer group keeps its own offset, so a new
// reader can replay from 0. Message counts and offsets are illustrative; the 7-day retention is Kafka's default (retention.ms). ----
(function () {
  if (!document.getElementById('stg-ql') || !window.QS3) return;
  const { mix, lerp } = S3, { party, plate, msg, lab, win, arcPts, seg, along } = QS3;
  const N = 8, X0 = -2.4, DX = .72, xi = i => X0 + i * DX, ZQ = 1.25, ZL = -1.25, PR = [-4.8, 0, 0];
  const WA = [xi(2) - .45, 0, 3.0], WB = [xi(3) + .55, 0, 3.0];
  const GR = [['e-mail group', 6], ['analytics', 3]], GZ = -3.4;
  function draw(R, k, e) {
    const P = R.P, aq = k === 2 || k === 3 ? 0 : 1, al = k === 1 ? .25 : 1;   // the close views leave the other lane out
    R.grid(-5.6, 4.6, -3.8, 3.8, .5);
    party(R, PR, [.9, .6, .9], P.c1, 'producer', { a: k === 0 ? 1 : 0 });
    plate(R, [(xi(0) + xi(N - 1)) / 2, 0, ZQ], N * DX + .3, .9, P.c4, aq, { nu: N, nv: 1 });
    plate(R, [(xi(0) + xi(N - 1)) / 2, 0, ZL], N * DX + .3, .9, P.c3, al, { nu: N, nv: 1 });
    lab(R, [xi(N - 1) + .5, 0, ZQ], 'queue', { b: 1, fs: 13.5, c: P.c4, al: 'left', dx: 6, a: Math.max(.45, aq), grp: 'lane' });
    lab(R, [xi(N - 1) + .5, 0, ZL], 'log', { b: 1, fs: 13.5, c: P.c3, al: 'left', dx: 6, a: Math.max(.45, al), grp: 'lane' });
    // 1. the same eight messages arrive in both
    for (let i = 0; i < N; i++) { const t = k === 0 ? win(e, i / N * .8, i / N * .8 + .2) : 1;
      // queue: m1, m2 deleted on ack (step 2 on), m3 and m4 lent to workers A and B
      const del = k >= 1 && i < 2, held = k >= 1 && (i === 2 || i === 3);
      const aQ = del ? (k === 1 ? 1 - win(e, .1, .45) : 0) : t;
      const lift = held ? (k === 1 ? win(e, .4, .8) : 1) * .5 : 0;
      msg(R, [xi(i), .05 + lift, ZQ], held ? P.acc : P.c4, aQ * aq, { txt: k <= 1 ? 'm' + (i + 1) : null });
      if (del && k >= 1) R.quad([[xi(i) - .25, .03, ZQ - .25], [xi(i) + .25, .03, ZQ - .25], [xi(i) + .25, .03, ZQ + .25], [xi(i) - .25, .03, ZQ + .25]], { ec: P.mute, dash: [3, 3], a: aq * (k === 1 ? win(e, .3, .5) : 1) });
      // log: every record kept, numbered by its offset
      msg(R, [xi(i), .05, ZL], P.c3, t * al, { txt: k === 1 ? null : String(i) }); }
    if (k === 0) { [ZQ, ZL].forEach(z => R.flow(arcPts(R, [PR[0] + .5, .5, 0], [xi(0) - .3, .3, z], .35), { c: z === ZQ ? P.c4 : P.c3, r: .08, n: 7, speed: 1.5 })); }
    // 2. queue: competing workers each take a different message; acked ones are gone
    party(R, WA, [.6, .5, .6], P.acc, 'worker A', { a: k === 1 ? win(e, .2, .5) : 0, t: .35, wide: 1 });
    party(R, WB, [.6, .5, .6], P.acc, 'worker B', { a: k === 1 ? win(e, .2, .5) : 0, t: .35, wide: 1 });
    if (k === 1) { [[2, WA], [3, WB]].forEach(([i, w]) => R.flow(arcPts(R, [xi(i), .65, ZQ + .2], [w[0], .6, w[2] - .4], .4), { c: P.acc, r: .07, n: 5, speed: 1.2, a: win(e, .5, .8) }));
      lab(R, [xi(0) + DX / 2, .05, ZQ], 'acked: deleted', { fs: 12.5, b: 1, c: P.mute, dy: -24, a: win(e, .3, .6) });
      lab(R, [xi(6) + DX / 2, .3, ZQ], 'waiting', { fs: 12.5, c: P.mute, dy: -46, a: win(e, .3, .6) }); }
    // 3. log: each group reads every record at its own offset
    GR.forEach(([nm, off], g) => { const a = k === 2 ? win(e, .1 + g * .2, .4 + g * .2) : k === 3 ? .45 : 0; if (a <= .01) return;
      const gx = xi(off), col = g ? P.c5 : P.acc, pin = [gx, 0, ZL - .5];
      R.box([gx, .02, ZL - .5], [.06, .9, .06], { fill: col, a, shadow: false }); R.ball([gx, .95, ZL - .5], .1, { c: col, a });
      party(R, [gx, 0, GZ], [1.1, .45, .6], col, nm, { a, t: .35, wide: 1 });
      R.flow(arcPts(R, [gx, .3, ZL - .45], [gx, .45, GZ + .3], .2), { c: col, r: .07, n: 4, speed: 1, a });
      lab(R, [gx, .95, ZL - .5], '@' + off, { mono: 1, b: 1, fs: 12.5, c: col, al: 'left', dx: 9, a }); });
    // 4. replay: a new reader starts at offset 0 and walks the whole retained log
    if (k === 3) { const t = lerp(0, N - 1, win(e, .15, .95)), gx = X0 + t * DX, col = P.c2;
      R.box([gx, .02, ZL - .5], [.06, .9, .06], { fill: col, shadow: false }); R.ball([gx, .95, ZL - .5], .11, { c: col }); R.glow([gx, .95, ZL - .5], .4, { c: col, a: .6 });
      lab(R, [gx, .95, ZL - .5], 'new reader @' + Math.round(t), { mono: 1, b: 1, fs: 12.5, c: col, al: 'left', dx: 10, dy: 14 });
      R.flow(seg([xi(0), .3, ZL], [gx, .3, ZL], 12), { c: col, r: .07, n: 6, speed: 1.4, a: .8 });
      lab(R, [xi(0) - .3, 0, ZL + .45], 'retained 7 days (Kafka default)', { fs: 12.5, c: P.c3, al: 'left', dy: 30, a: win(e, .2, .5) }); }
  }
  const full = { cam: [.3, .78], bounds: [[-5.4, 0, -3.5], [4.4, 1, 3.5]] };
  S3.stage({ id: 'stg-ql', list: 'sx-ql', fig: 'Fig. 2 · a queue deletes, a log keeps', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1400, hold: 4600, draw, margin: QS3.margin,
    view: k => k === 1 ? { cam: [.3, .66], bounds: [[-3, 0, .4], [4.4, 1.2, 3.6]] } : k >= 2 ? { cam: [.3, .7], bounds: [[-3, 0, -3.9], [4.6, 1.2, -.5]] } : full });
})();
