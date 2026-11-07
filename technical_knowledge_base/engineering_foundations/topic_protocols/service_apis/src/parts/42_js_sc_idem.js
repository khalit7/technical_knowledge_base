// ---- Scene: Fig. 3, idempotency keys (stg-idem): the page's toy front door (src/lab/idem_run.py, recorded 2026-11-07) answering one lost reply
// four ways. Parties: the client, the front door, and its store: a glass plate of idempotency keys and a plate of messages and charges.
// Every time, status, message id and total is window.SA.idem; the work time, the client's timeout and the price are the toy's settings. ----
(function () {
  if (!document.getElementById('stg-idem') || !window.S3 || !window.SAK || !window.SA || !SA.idem) return;
  const { mix } = S3, { up, party, plate, msg, bar, cross, path, win, seg, chips } = SAK;
  const RUN = SA.idem.runs, PRICE = SA.idem.price, T = v => v.toFixed(3) + ' s';
  const A = (m, i) => RUN[m].attempts[i], EV = (m, name) => RUN[m].log.find(x => x.ev === name);
  const fp = m => RUN[m].log.filter(x => x.ev === 'request').map(x => x.fp.slice(0, 8));
  // what the store holds at the end of each step: [messages, key status]
  const ST = { nokey: [[0, ''], [1, ''], [1, ''], [2, ''], [2, '']], key: [[0, 'started'], [1, 'done'], [1, 'done'], [1, 'done'], [1, 'done']],
    early: [[0, 'started'], [0, 'started'], [1, 'done'], [1, 'done']], mismatch: [[1, 'done'], [1, 'done'], [1, 'done']] };
  window.SA_IDEM = { ST, RUN, PRICE };   // read by src/check_stages.mjs
  let mode = 'nokey';
  const CL = [-3.9, 0, 0], DR = [0, 0, 0], KP = [3.7, 0, -1.7], LP = [3.7, 0, 1.0];
  const cO = [CL[0] + .75, .4, CL[2] - .25], dI = [DR[0] - .85, .4, DR[2] - .25], dO = [DR[0] + .85, .4, DR[2]], rI = [DR[0] - .85, .3, DR[2] + .45], rO = [CL[0] + .75, .3, CL[2] + .45];
  const toK = [KP[0] - .9, .3, KP[2] + .6], toL = [LP[0] - .9, .35, LP[2] - .2];
  function req(R, a, b, e, lab, c, tag, o) { o = o || {}; const P = R.P, pts = seg(a, b);
    R.flow(pts, { c, r: .07, n: 6, speed: 1.4, a: o.fa == null ? 1 : o.fa });
    msg(R, path(pts, Math.min(1, e)), o.bytes || 60, c, o.ma == null ? 1 : o.ma, { lab, mono: true, tag, dy: o.dy, k: .01 }); }
  function draw(R, k, e) {
    const P = R.P, S = ST[mode], prev = k ? S[k - 1] : [0, ''], cur = S[k], keyed = mode !== 'nokey';
    R.grid(-5.2, 5.4, -2.6, 2.8, .5);
    party(R, CL, [1.4, .7, 1.1], P.c1, 'client', { sub: k === 0 ? 'read timeout ' + SA.idem.client_timeout_s + ' s' : null });
    party(R, DR, [1.6, .85, 1.3], P.c2, 'front door', { sub: k === 0 ? 'the model takes ' + SA.idem.work_s + ' s' : null });
    // the store: two glass plates, keys behind, messages and charges in front
    // the key row, coloured by status; it fades in as it is claimed, and the keys plate's title says what it holds
    const ks = e > .55 ? cur[1] : prev[1] || cur[1], ka = !keyed ? 0 : prev[1] ? 1 : win(e, .4, .8), kd = ks === 'done';
    plate(R, KP, P.c6, keyed ? 1 : .25, ka > .5 ? 'key 7f3c9a0e: ' + (kd ? 'done, 201 stored' : 'started') + (mode === 'mismatch' ? ' · fp ' + fp(mode)[0] : '') : 'idempotency keys',
      { w: 1.5, h: .9, nu: 4, nv: 3, wide: 1, mono: ka > .5, lc: ka > .5 ? (kd ? P.good : P.c5) : P.c6 });
    plate(R, LP, P.c4, 1, 'messages · charges', { w: 1.5, h: .9, nu: 4, nv: 3, wide: 1 });
    if (ka > 0) R.box([KP[0], 0, KP[2] + .75], [1.3, .16, .34], { fill: mix(P.paper, kd ? P.good : P.c5, .7), a: ka, shadow: false });
    // messages: one card each; credits: a bar
    const nm = e > .55 ? cur[0] : prev[0];
    for (let i = 0; i < 2; i++) { const p = [LP[0] - .45 + i * .9, 0, LP[2] + .7], have = i < nm, isNew = i >= prev[0] && i < cur[0];
      R.box(p, [.62, .14, .4], { fill: have ? mix(P.paper, i ? P.bad : P.c4, .6) : P.paper, a: have ? (isNew ? win(e, .5, .8) : 1) : .25, fa: have ? 1 : .2, shadow: false });
      if (have) R.label(up(p, .14), 'msg_' + (i + 1), { fs: 12, b: 1, mono: 1, c: i ? P.bad : P.c4, dy: -9, a: isNew ? win(e, .5, .8) : 1 }); }
    bar(R, [LP[0] + 1.25, 0, LP[2] + .7], nm * PRICE, .035, P.c5, 1, { w: .3, d: .3, lab: nm * PRICE + ' credits' });
    const lost = (a0, t0, gave) => { const pts = seg(rI, rO); R.flow(pts.slice(0, 8), { c: P.c3, r: .06, n: 4, speed: 1.2, a: win(e, .1, .3) });
      cross(R, [(cO[0] + dI[0]) / 2 - .4, .35, rI[2]], win(e, .3, .5)); R.label([CL[0], .7, CL[2]], 'gave up at ' + T(gave), { fs: 12.5, b: 1, c: P.bad, dy: -28, a: win(e, .3, .5) });
      R.label([(cO[0] + dI[0]) / 2, .1, rI[2] + .2], '201 at ' + T(t0) + ': nobody reading', { fs: 12, b: 1, c: P.bad, dy: 18, a: win(e, .5, .7), wide: 1 }); };
    const work = (t, m) => { R.flow(seg(dO, toL), { c: P.c4, r: .07, n: 6, speed: 1.3, a: win(e, 0, .3) });
      R.label([LP[0], .9, LP[2]], 'committed at ' + T(t) + ': ' + m, { fs: 12, b: 1, c: P.c4, dy: -24, a: win(e, .5, .8), wide: 1 }); };
    const claim = () => R.flow(seg(dO, toK), { c: P.c6, r: .065, n: 6, speed: 1.3, a: win(e, .2, .5) });
    const answer = (lab, c, a0) => { const pts = seg(rI, rO); R.flow(pts, { c, r: .07, n: 6, speed: 1.4, a: win(e, a0, a0 + .2) });
      msg(R, path(pts, win(e, a0, 1)), 60, c, win(e, a0, a0 + .1), { lab, mono: true, k: .01, dy: 22 }); };
    const done = (txt, c) => { R.glow([LP[0], .5, LP[2] + .3], 1.1, { c, a: .5 * win(e, 0, .5) }); R.label([LP[0], 0, LP[2] + 1.15], txt, { fs: 14, b: 1, c, dy: 18, a: win(e, .2, .6) }); };
    if (mode === 'nokey') {
      const a0 = A('nokey', 0), a1 = A('nokey', 1), w = RUN.nokey.log.filter(x => x.ev === 'work committed');
      if (k === 0) req(R, cO, dI, e, 'POST /v1/messages · no key', P.c1, null);
      if (k === 1) work(w[0].t, w[0].msg + ', ' + w[0].credits + ' credits');
      if (k === 2) lost(0, w[0].t, a0.got);
      if (k === 3) { req(R, cO, dI, win(e, 0, .4), 'retry at ' + T(a1.sent) + ' · same body', P.c1, null, { fa: win(e, 0, .2) * 1 + .0001 });
        R.flow(seg(dO, toL), { c: P.c4, r: .07, n: 6, speed: 1.3, a: win(e, .35, .55) });
        R.label([LP[0], .9, LP[2]], 'new work: ' + w[1].msg + ' at ' + T(w[1].t), { fs: 12, b: 1, c: P.bad, dy: -24, a: win(e, .5, .8), wide: 1 }); }
      if (k === 4) done(RUN.nokey.messages + ' messages · ' + RUN.nokey.credits + ' credits', P.bad);
    }
    if (mode === 'key') {
      const a0 = A('key', 0), a1 = A('key', 1), w = EV('key', 'work committed');
      if (k === 0) { req(R, cO, dI, win(e, 0, .5), 'POST · Idempotency-Key', P.c1, P.c6); claim(); }
      if (k === 1) work(w.t, w.msg + ' + charge + response, one transaction');
      if (k === 2) lost(0, w.t, a0.got);
      if (k === 3) { req(R, cO, dI, win(e, 0, .35), 'retry ' + T(a1.sent) + ' · same key', P.c1, P.c6);
        R.flow(seg(dO, toK), { c: P.c6, r: .065, n: 6, speed: 1.3, a: win(e, .3, .5) });
        answer(a1.status + ' · Idempotent-Replayed: ' + a1.replayed + ' · ' + a1.msg, P.good, .5); }
      if (k === 4) done(RUN.key.messages + ' message · ' + RUN.key.credits + ' credits', P.good);
    }
    if (mode === 'early') {
      const a0 = A('early', 0), a1 = A('early', 1), a2 = A('early', 2), w = EV('early', 'work committed');
      if (k === 0) { req(R, cO, dI, win(e, 0, .5), 'POST · Idempotency-Key', P.c1, P.c6); claim(); }
      if (k === 1) { req(R, cO, dI, win(e, 0, .35), 'retry ' + T(a1.sent) + ' · same key', P.c1, P.c6);
        R.flow(seg(dO, toK), { c: P.c6, r: .065, n: 6, speed: 1.3, a: win(e, .3, .5) });
        answer(a1.status + ' · in progress, retry later', P.c2, .5); }
      if (k === 2) { work(w.t, w.msg + ', ' + w.credits + ' credits'); lost(0, w.t, a0.got); }
      if (k === 3) { req(R, cO, dI, win(e, 0, .35), 'retry ' + T(a2.sent), P.c1, P.c6);
        answer(a2.status + ' · replayed · ' + a2.msg, P.good, .45); done(RUN.early.messages + ' message · ' + RUN.early.credits + ' credits', P.good); }
    }
    if (mode === 'mismatch') {
      const a0 = A('mismatch', 0), a1 = A('mismatch', 1), f = fp('mismatch');
      if (k === 0) { req(R, cO, dI, win(e, 0, .3), 'POST · Idempotency-Key', P.c1, P.c6); claim(); R.flow(seg(dO, toL), { c: P.c4, r: .07, n: 6, speed: 1.3, a: win(e, .3, .5) });
        answer(a0.status + ' · ' + a0.msg + ' at ' + T(a0.got), P.c3, .6); }
      if (k === 1) { req(R, cO, dI, win(e, 0, .35), 'same key · "What colour is grass?"', P.c1, P.bad);
        R.flow(seg(dO, toK), { c: P.c6, r: .065, n: 6, speed: 1.3, a: win(e, .3, .5) });
        R.label([KP[0], 0, KP[2] + .75], 'fp ' + f[1] + ' ≠ ' + f[0], { fs: 12.5, b: 1, mono: 1, c: P.bad, dy: 18, a: win(e, .4, .6), wide: 1 });
        answer(a1.status + ' · key used with a different request', P.bad, .55); }
      if (k === 2) done(RUN.mismatch.messages + ' message · ' + RUN.mismatch.credits + ' credits', P.good);
    }
  }
  const full = { cam: [.12, .5], bounds: [[-4.8, 0, -2.0], [5.0, 1.1, 2.3]] };
  const st = S3.stage({ id: 'stg-idem', list: 'sx-idem-nokey', fig: 'Fig. 3 · one lost reply, recorded', cam: full.cam, bounds: full.bounds, aspect: .48, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 20, 8] : [28, 16, 26, 16],
    view: k => { const store = mode === 'nokey' ? [1] : mode === 'key' ? [1] : mode === 'early' ? [] : [];
      return store.indexOf(k) >= 0 ? { cam: [.14, .5], bounds: [[-1.2, 0, -2.0], [5.2, 1.1, 2.3]] } : null; } });
  chips(document.getElementById('idem-mode'), 'sx-idem-', st, m => { mode = m; });
})();
