// ---- Scene: Fig. 4, the retry storm as measured (stg-storm): the real runs of src/lab (MEAS, seed 1), one policy per step. In front: the load
// generator, the server's queue and its 4 worker slots, with dots in proportion to the attempts and answers of the second being replayed. Behind:
// one bar per second of the 40 s run (height: HTTP attempts sent; green inside: requests answered), under a glass plane at the 160 a second the
// 4 slots can do, lowered to 40 a second during the 5 s slowdown. ----
(function () {
  if (!document.getElementById('stg-storm') || !window.RS3 || !window.MEAS) return;
  const { mix, lerp } = S3, { party, pool, stack, lab, win, seg, fmt, margin } = RS3;
  const SEED = '1', NS = 41, POL = ['none', 'none', 'naive', 'backoff', 'deadline', 'budget', 'shed'];
  const NAME = { none: 'timeouts, no retries', naive: 'retry at once', backoff: 'backoff + full jitter', deadline: 'retry at once + skip expired work', budget: 'backoff + retry budget', shed: 'retry at once + bounded queue (8)' };
  const run = c => MEAS.runs[c][SEED], sum = a => a.reduce((x, y) => x + y, 0);
  const N = {}; POL.forEach(c => { const r = run(c); N[c] = { success: r.success, att: r.attempts_per_req, rec: r.recovery_s, maxq: r.max_queue, qmax: Math.max(...r.series.q.slice(0, NS)), meanAtt: sum(r.series.att.slice(10, 40)) / 30 }; });
  N.ok10 = sum(run('none').series.ok.slice(0, 10)); N.arr10 = sum(run('none').series.arr.slice(0, 10)); N.cap = 4 * 1000 / 25; N.capSlow = 4 * 1000 / 100;
  RSN.storm = N;
  const U = 2.3 / 350, X = s => -3.7 + s * .26, ZB = 0, LG = [-8.4, 0, .5], QP = [-6.9, 0, .5], SV = [-5.4, 0, .5];
  function draw(R, k, e) {
    const P = R.P, c = POL[k], S = run(c).series; R.grid(-9.2, 7.6, -1.4, 1.8, .5);
    const upto = k === 0 ? Math.round(lerp(1, 10, win(e, .05, .9))) : Math.round(lerp(1, NS, win(e, .1, .95))), s = upto - 1;
    // the bars: attempts per second, the answered share inside them in green
    for (let t = 0; t < upto; t++) { const att = S.att[t], ok = Math.min(att, S.ok[t]), x = X(t);
      if (ok > 0) R.box([x, 0, ZB], [.19, ok * U, .4], { fill: mix(P.paper, P.good, .7), shadow: false, lw: .5 });
      if (att > ok) R.box([x, ok * U, ZB], [.19, (att - ok) * U, .4], { fill: mix(P.paper, P.bad, .6), shadow: false, lw: .5 }); }
    // capacity: 160 a second, 40 during the slowdown (seconds 10 to 15)
    const cap = (x0, x1, y, col, a) => R.glass([x0, y, ZB - .3], [x1 - x0, 0, 0], [0, 0, .6], { c: col, a, nu: Math.max(1, Math.round((x1 - x0) / .52)), nv: 1, th: .01 });
    cap(X(0) - .13, X(10) - .13, N.cap * U, P.acc, .5); if (k > 0) { const g = k === 1 ? win(e, .35, .7) : 1; cap(X(15) - .13, X(40) + .13, N.cap * U, P.acc, .5 * g); cap(X(10) - .13, X(15) - .13, N.capSlow * U, P.bad, .7 * g); }
    lab(R, [X(4.5), N.cap * U, ZB + .3], 'the 4 slots can do 160/s', { mono: 1, b: 1, fs: 12, c: P.acc, dy: -11 });
    lab(R, [X(12.5), N.capSlow * U, ZB - .3], '40/s', { mono: 1, b: 1, fs: 12, c: P.bad, dy: -10, a: k === 0 ? 0 : 1 });
    R.box([X(12.5) - .13, 0, ZB + .4], [5 * .26, .01, .08], { fill: mix(P.paper, P.bad, .5), a: k === 0 ? 0 : .8, shadow: false, edge: false });
    lab(R, [X(0), 0, ZB + .4], '0 s', { mono: 1, fs: 12, c: P.mute, dy: 12 }); if (k > 0) lab(R, [X(40), 0, ZB + .4], '40 s', { mono: 1, fs: 12, c: P.mute, dy: 12 });
    // the system in front, replaying second s
    const att = S.att[s] || 0, ok = S.ok[s] || 0, fail = S.fail[s] || 0, q = S.q[s] || 0;
    party(R, LG, [.8, .5, .7], P.c4, 'load generator', { wide: 1, grp: 'sys' });
    stack(R, QP, q, P.bad, 1, { txt: 'queue ' + fmt(q), k: .5, grp: 'sys' });
    pool(R, SV, 4, 1, q > 0 || att > N.capSlow && s >= 10 && s < 15 ? 4 : Math.min(4, Math.round(4 * att / N.cap)), P.c4, 1, { plate: P.c1, g: .42 });
    lab(R, [SV[0], .3, SV[2] + .35], '4 slots × 25 ms', { fs: 12.5, c: P.mute, dy: 22, wide: 1 });
    R.flow(seg([LG[0] + .45, .3, LG[2] - .15], [QP[0] - .4, .3, QP[2] - .15], 8), { c: P.c4, r: .065, n: 2 + Math.round(att / 45), speed: .6 + att / 200 });
    R.flow(seg([QP[0] + .4, .3, QP[2]], [SV[0] - .95, .3, SV[2]], 6), { c: P.c4, r: .065, n: 2 + Math.round(Math.min(att, N.cap) / 50), speed: 1 });
    if (ok) R.flowArc([SV[0], .4, SV[2] + .3], [LG[0] + .2, .4, LG[2] + .3], .5, { c: P.good, r: .06, n: 1 + Math.round(ok / 25), speed: 1.4 });
    if (fail) R.flowArc([QP[0], .3, QP[2] + .45], [LG[0] + .3, .3, LG[2] + .45], .35, { c: P.bad, r: .07, n: 1 + Math.round(fail / 20), speed: 1.4 });
    lab(R, [QP[0], 0, LG[2] + .9], 'second ' + s + ' · ' + att + ' attempts', { mono: 1, fs: 12.5, c: P.mute, dy: 30, wide: 1 });
    // the policy and its result
    lab(R, [X(20), 2.45, ZB], (k === 0 ? 'before the slowdown' : NAME[c]), { ph: 1, b: 1, fs: 14, c: P.ink, dy: -34 });
    if (k > 0) { const r = N[c], a = win(e, 0, .12);   // the result shows early in the long tween, not only once the 40 s have replayed
      lab(R, [X(20), 2.45, ZB], 'success ' + fmt(100 * r.success, 1) + '% · ' + (r.rec === null ? 'never recovers' : 'recovers ' + r.rec + ' s after'), { ph: 1, mono: 1, b: 1, fs: 13, c: mix(r.rec === null ? P.bad : P.good, P.ink, .3), dy: -14, a }); }
  }
  const full = { cam: [.12, .42], bounds: [[-8.9, 0, -.6], [7.0, 2.5, 1.5]] };
  S3.stage({ id: 'stg-storm', list: 'sx-storm', fig: 'Fig. 4 · the measured storm, seed 1, policy by policy', cam: full.cam, bounds: full.bounds, aspect: .4, dur: 3200, hold: 4200, draw, margin,
    view: k => k === 0 ? { cam: [.2, .5], bounds: [[-8.9, 0, -.6], [-.6, 1.6, 1.5]] } : full });
})();
