// ---- Scene: Fig. 9, webhooks: the provider calls you (stg-wh). Two recorded runs of src/lab/webhooks.py side by side in depth, the
// naive receiver in front and the careful one behind (SDATA.hooks.delivery: the sender's attempts with the result it got, the
// receiver's answers and every finished piece of work with the status it stored). The schedule is Standard Webhooks' first four delays
// scaled down 60 times; a step reveals one stretch of the run in recorded order. Step 1 shows the recorded signature checks
// (SDATA.hooks.signatures). ----
(function () {
  if (!document.getElementById('stg-wh') || !window.S3 || !window.STK || !window.SDATA) return;
  const { mix } = S3, { party, plate, msg, bar, cross, at, win } = STK;
  const H = SDATA.hooks, L = { naive: H.delivery.naive.log, careful: H.delivery.careful.log }, XR = -4.2, XP = 4.3, Z = { naive: 1.5, careful: -1.5 };
  const WIN = [null, [0, .15], [.15, 3.1], [3.1, 9], [9, 40]];
  const done = m => L[m].filter(r => r.what === 'work done');
  window.ST_WH = { naive: done('naive').length, careful: done('careful').length, naiveFinal: done('naive').slice(-1)[0].status_stored, carefulFinal: done('careful').slice(-1)[0].status_stored,
    sig: H.signatures.standard_webhooks, attempts: L.naive.filter(r => r.sender).length };   // read by check_stages.mjs
  const short = ev => ev.replace(/^job\./, '');
  function lane(R, m, k, E) {
    const P = R.P, z = Z[m], log = L[m];
    party(R, [XR - .4, 0, z], [.8, .7, 1.2], m === 'naive' ? P.c5 : P.c3, m === 'naive' ? 'naive receiver' : 'careful receiver');
    if (k === 0) return;
    const shown = [];
    WIN.forEach((w, s) => { if (!w || s > k) return; const ev = log.filter(r => r.t > w[0] && r.t <= w[1]), n = ev.length;
      ev.forEach((r, j) => { const f = (j + 1) / (n + 1); if (s < k || E >= f - .5 / (n + 1)) shown.push({ r, p: s < k ? 1 : win(E, f - .5 / (n + 1), f + .4 / (n + 1)), cur: s === k }); }); });
    let works = 0, stored = null;
    shown.forEach(({ r, p, cur }) => {
      if (r.sender) { const q = at([XP, .45, z + .2], [XR, .45, z + .2], 0, .6, p);
        if (q && p < .6) msg(R, q, 250, P.c1, 1, { lab: short(r.event) + ' · ' + r.what.replace(/:.*/, ''), mono: 1 });
        const res = r.what.replace(/^attempt \d+: /, ''), q2 = at([XR, .45, z - .2], [XP, .45, z - .2], .6, 1, p);
        if (q2 && p < 1) msg(R, q2, 120, /200/.test(res) ? P.good : /503/.test(res) ? P.bad : P.mute, 1, { lab: /timeout/.test(res) ? 'no answer in 1 s' : res, mono: 1, dy: 20 });
        if (p >= 1 && cur && /timeout/.test(res)) cross(R, [XP - .6, .9, z], .55, P.mute, .12); }
      else if (r.what === 'work done' && p >= 1) { const ok = r.status_stored === 'succeeded';
        bar(R, [XR + 1.0 + works * .42, 0, z - .1], .45, r.event === 'job.succeeded' ? P.good : P.c5, cur ? 1 : .75, { w: .28, d: .28 });
        works++; stored = r.status_stored; }
      else if (/work started/.test(r.what) && p > 0 && p < 1) R.glow([XR - .4, .8, z], .8, { c: P.c5, a: .5 });
      else if (/503/.test(r.what) && p >= 1 && cur) cross(R, [XR + .3, .9, z], .8, P.bad, .14);
    });
    R.label([XR + 1.0, .62, z - .1], 'work ran ' + works + (works === 1 ? ' time' : ' times') + (stored ? ' · stored: ' + stored : ''), { fs: 12.5, b: 1, mono: 1, c: stored === 'running' ? P.bad : P.ink, al: 'left', dx: -10, dy: -12, wide: 1 });
  }
  function draw(R, k, e, st) {
    const P = R.P, E = st.e;
    R.grid(-6, 6, -2.6, 2.8, .5);
    party(R, [XP + .45, 0, 0], [.9, .8, 4.4], P.c1, 'provider');
    lane(R, 'naive', k, E); lane(R, 'careful', k, E);
    if (k === 0) { const sg = H.signatures.standard_webhooks, q = at([XP, .45, 0], [XR + .4, .45, 0], 0, .5, E);
      if (q) { msg(R, q, 300, P.c1, 1, { lab: 'POST · webhook-signature: v1,...', mono: 1 }); plate(R, [q[0], .5, q[2] - .05], P.good, 1, null, { w: .28, h: .26 }); }
      plate(R, [XR + .6, .8, 0], P.good, win(E, .5, .65), 'HMAC over the raw bytes', { w: .5, h: .4, glow: P.good });
      [['raw body', sg.raw_body, P.good], ['re-serialised JSON', sg.reserialised.replace(/^WebhookVerificationError: /, ''), P.bad], ['signed 10 minutes ago', sg.ten_minutes_old.replace(/^WebhookVerificationError: /, ''), P.bad]]
        .forEach(([a, b, c], i) => R.label([XR + 1.3, .9, 0], a + ': ' + b, { fs: 12, mono: 1, b: 1, c, al: 'left', dx: 8, dy: -28 + i * 18, a: win(E, .6 + i * .12, .72 + i * .12), wide: 1 })); }
  }
  S3.stage({ id: 'stg-wh', list: 'sx-wh', fig: 'Fig. 9 · two receivers, one recorded delivery run each', cam: [0, .78], bounds: [[-5.2, 0, -2.3], [5.2, 1.0, 2.4]], aspect: .62, dur: 3600, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 16, 18, 16] });
})();
