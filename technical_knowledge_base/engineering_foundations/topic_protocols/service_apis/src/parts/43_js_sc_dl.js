// ---- Scene: Fig. 4, deadlines and cancellation (stg-dl): the recorded chain client -> gateway -> inference service (raw/deadline.json, 5 October 2026),
// four runs. Each party has 40 token slots (the full answer); slots fill as tokens are generated, forwarded and received. Counts, end times,
// headers and RST_STREAM times are window.SA.deadline; where a token sits along a hop follows the configured schedule (0.12 s, then 0.05 s). ----
(function () {
  if (!document.getElementById('stg-dl') || !window.S3 || !window.SAK || !window.SA) return;
  const { mix } = S3, { up, party, plate, bar, cross, path, win, seg, chips } = SAK;
  const DL = SA.deadline, FIRST = .12, GAP = .05, tt = i => FIRST + GAP * i, made = t => t < FIRST ? 0 : Math.min(40, Math.floor((t - FIRST) / GAP + 1e-9) + 1);
  window.SA_DL = { DL };   // read by src/check_stages.mjs
  let m = 0;
  const C = [-4.2, 0, -.4], G = [0, 0, -.4], I = [4.2, 0, -.4];
  // 40 slots in front of a party: filled ones in its colour, the ones generated for nobody in red, the rest empty outlines
  function slots(R, p, n, col, red, a) { const P = R.P;
    for (let i = 0; i < 40; i++) { const x = p[0] - 1.17 + (i % 10) * .26, z = p[2] + 1.05 + Math.floor(i / 10) * .26, f = i < n;
      R.box([x, 0, z], [.2, f ? .12 : .02, .2], { fill: f ? mix(P.paper, red != null && i >= red ? P.bad : col, .75) : P.paper, a: f ? a : a * .35, fa: f ? 1 : .3, shadow: false, lw: .6 }); } }
  function draw(R, k, e) {
    const P = R.P, r = DL[m], gone = r.client.gave_up_s, inf = r.inference, gw = r.gateway, rec = r.client.tokens_received;
    R.grid(-5.6, 5.8, -2.0, 2.6, .5);
    party(R, C, [1.5, .7, 1.0], P.c1, 'client', { a: k === 3 ? .35 : 1 });
    party(R, G, [1.5, .7, 1.0], P.c5, 'gateway', { a: 1 });
    party(R, I, [1.5, .8, 1.0], P.c3, 'inference', { a: 1, sub: k === 0 ? 'first token 0.12 s, then every 0.05 s' : null });
    const cg = [[C[0] + .75, .45, C[2]], [G[0] - .75, .45, G[2]]], gi = [[G[0] + .75, .45, G[2]], [I[0] - .75, .45, I[2]]];
    R.line(cg, { c: P.mute, w: 1, a: .3, dash: [4, 4] }); R.line(gi, { c: P.mute, w: 1, a: .3, dash: [4, 4] });
    // time on this step's clock
    const t = k === 0 ? 0 : k === 1 ? gone * e : k === 2 ? gone : k === 3 ? gone + (inf.dur_s - gone) * e : inf.dur_s;
    const nI = Math.min(inf.tokens_made, made(t)), nC = Math.min(rec, made(Math.min(t, gone))), nG = Math.min(gw.tokens_forwarded, k >= 3 ? Math.max(nC, Math.min(gw.tokens_forwarded, made(t))) : nC);
    slots(R, I, nI, P.c3, k >= 2 ? rec : null, 1); slots(R, G, nG, P.c5, null, k === 4 ? .5 : 1); slots(R, C, nC, P.c1, null, k === 4 ? .5 : 1);
    R.label([I[0], 0, I[2] + 2.1], nI + ' made', { fs: 12.5, b: 1, mono: 1, c: P.c3, dy: 16 });
    R.label([G[0], 0, G[2] + 2.1], nG + ' forwarded', { fs: 12.5, b: 1, mono: 1, c: P.c5, dy: 16 });
    R.label([C[0], 0, C[2] + 2.1], nC + ' received', { fs: 12.5, b: 1, mono: 1, c: P.c1, dy: 16 });
    if (k === 0) {   // the deadline (or, in run C, none) travels with the call
      const pts = seg(cg[0], cg[1]).concat(seg(gi[0], gi[1]).slice(1)), q = path(pts, e);
      R.flow(seg(cg[0], cg[1]), { c: P.c6, r: .065, n: 6, speed: 1.3 });
      if (r.deadline) plate(R, [C[0], .7, C[2]], P.c6, 1, 'deadline ' + r.deadline + ' s', { w: .5, h: .4, mono: 1 });
      else R.label([C[0], .7, C[2]], 'no deadline · cancels at ' + r.cancel_at + ' s', { fs: 12, b: 1, c: P.c6, dy: -30, wide: 1 });
      if (gw.time_remaining_s != null) R.label([G[0], .7, G[2]], gw.time_remaining_s + ' s left', { fs: 12.5, b: 1, mono: 1, c: P.c6, dy: -30, a: win(e, .3, .5) });
      R.flow(seg(gi[0], gi[1]), { c: P.c6, r: .065, n: 6, speed: 1.3, a: win(e, .4, .6) });
      const h2 = r.hop2_timeout ? 'grpc-timeout: ' + r.hop2_timeout : r.mode === 'propagate' ? 'cancel hook: ctx.add_callback' : 'no grpc-timeout';
      R.label([(G[0] + I[0]) / 2, .45, G[2]], h2, { fs: 12.5, b: 1, mono: 1, c: r.hop2_timeout || r.mode === 'propagate' ? P.c6 : P.bad, dy: -14, a: win(e, .5, .7) });
      if (inf.time_remaining_s != null) R.label([I[0], .8, I[2]], inf.time_remaining_s + ' s left', { fs: 12.5, b: 1, mono: 1, c: P.c6, dy: -44, a: win(e, .7, .9) });
      void q;
    }
    if (k === 1) {   // tokens stream back, one length-prefixed message each
      R.flow(seg(gi[1], gi[0]), { c: P.c3, r: .06, n: 6, speed: 1.4 }); R.flow(seg(cg[1], cg[0]), { c: P.c5, r: .06, n: 6, speed: 1.4 });
      R.label([G[0], .7, G[2]], 't = ' + t.toFixed(2) + ' s', { fs: 12.5, b: 1, mono: 1, c: P.ink, dy: -30 });
    }
    if (k === 2) {   // the client gives up: DEADLINE_EXCEEDED or CANCELLED, and an RST_STREAM to the gateway
      cross(R, [(cg[0][0] + cg[1][0]) / 2, .45, C[2]], win(e, 0, .3));
      R.label([C[0], .7, C[2]], r.client.code + ' at ' + gone + ' s', { fs: 12.5, b: 1, mono: 1, c: P.bad, dy: -30, a: win(e, .1, .4), wide: 1 });
      R.flow(seg(cg[0], cg[1]), { c: P.bad, r: .06, n: 4, speed: 1.6, a: win(e, .3, .6) });
      R.label([(C[0] + G[0]) / 2, .45, C[2]], 'RST_STREAM (CANCEL)', { fs: 12, b: 1, mono: 1, c: P.bad, dy: -14, a: win(e, .4, .7), wide: 1 });
    }
    if (k === 3) {   // what happens below the gateway
      const end = r.hop2_end[0];
      if (end.type === 'RSTSTREAM') { R.flow(seg(gi[0], gi[1]), { c: P.bad, r: .06, n: 4, speed: 1.6, a: win(e, 0, .3) });
        R.label([(G[0] + I[0]) / 2, .45, G[2]], 'RST_STREAM (CANCEL) at ' + end.ms.toFixed(1) + ' ms', { fs: 12, b: 1, mono: 1, c: P.bad, dy: -14, a: win(e, .1, .4), wide: 1 });
        cross(R, [(gi[0][0] + gi[1][0]) / 2, .45, G[2]], win(e, .3, .5)); }
      else { R.flow(seg(gi[1], gi[0]), { c: P.c3, r: .06, n: 7, speed: 1.4 });
        R.label([(G[0] + I[0]) / 2, .45, G[2]], 'the worker thread keeps reading', { fs: 12, b: 1, c: P.bad, dy: -14, wide: 1 }); }
      R.label([I[0], .8, I[2]], 'stopped after ' + inf.tokens_made + ' tokens, ' + inf.dur_s + ' s', { fs: 12.5, b: 1, c: inf.tokens_made > rec ? P.bad : P.good, dy: -30, a: win(e, .7, 1), wide: 1 });
    }
    if (k === 4) {   // the bill
      const waste = inf.tokens_made - rec;
      bar(R, [I[0] - .45, 0, I[2] - 1.15], inf.tokens_made, .03, P.c3, 1, { w: .45, d: .4, lab: inf.tokens_made + ' generated' });
      bar(R, [I[0] + .45, 0, I[2] - 1.15], rec, .03, P.c1, 1, { w: .45, d: .4, lab: rec + ' delivered' });
      R.label([I[0], .8, I[2]], waste ? waste + ' for nobody' : 'nothing for nobody', { fs: 14, b: 1, c: waste ? P.bad : P.good, dy: -30 });
    }
  }
  const full = { cam: [.1, .58], bounds: [[-5.4, 0, -1.4], [5.6, 1.1, 2.6]] };
  const st = S3.stage({ id: 'stg-dl', list: 'sx-dl-0', fig: 'Fig. 4 · one abandoned request', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 18, 8] : [30, 16, 22, 16],
    view: k => k === 3 || k === 4 ? { cam: [.14, .56], bounds: [[-1.4, 0, -1.8], [5.8, 1.2, 2.6]] } : null });
  chips(document.getElementById('dl-mode'), 'sx-dl-', st, v => { m = +v; });
})();
