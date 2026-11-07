// ---- Scene: Fig. 1, the hero (stg-hero): the running request through three API styles. Parties: your app, the front door, an L7 router and
// three inference replicas; later a webhook back and the other faces (browsers, agents). Data from window.SA: the request's JSON and protobuf
// sizes (pb.json), the gRPC frame (49 + 5 bytes), the L7 balancer's 30-call counts (lb.json). The rest is the structure the sections teach. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.SAK || !window.SA) return;
  const { mix } = S3, { up, party, plate, msg, bar, path, win, arcPts, seg } = SAK;
  const RQ = SA.pb.request, jsonB = RQ.json_bytes, frameB = RQ.grpc_frame_bytes;
  const l7 = SA.lb.counts.find(c => /^L7/.test(c.setup)).answers, L7C = ['backend-1', 'backend-2', 'backend-3'].map(b => l7[b] || 0);
  window.SA_HERO = { jsonB, pbB: RQ.pb_bytes, frameB, L7C };   // read by src/check_stages.mjs
  const APP = [-4.5, 0, .2], DOOR = [-1.5, 0, .2], RT = [1.4, 0, .2], REP = [[4.4, 0, -1.4], [4.4, 0, .2], [4.4, 0, 1.8]],
    WEB = [-4.5, 0, -2.2], AGT = [-4.5, 0, 2.5];
  function draw(R, k, e) {
    const P = R.P, on = (...ks) => ks.indexOf(k) >= 0 ? 1 : .22;
    R.grid(-5.8, 5.6, -3.2, 3.4, .5);
    party(R, APP, [1.6, .75, 1.1], P.c1, 'your app', { a: on(0, 1, 4, 5), sub: k === 0 ? 'curl, an SDK, a browser' : null });
    party(R, DOOR, [1.8, .95, 1.3], P.c2, 'front door', { a: on(0, 1, 2, 4, 5), sub: k === 0 ? 'auth, limits, keys, translation' : null });
    party(R, RT, [1.3, .75, 1.1], P.c5, 'router (L7)', { a: on(0, 2, 3) });
    REP.forEach((p, i) => party(R, p, [1.2, .6, 1.0], P.c3, i === 0 ? 'inference replicas' : null, { a: on(0, 2, 3), sub: i === 0 && k === 0 ? 'three copies of the model server' : null, wide: 1 }));
    const a1 = [APP[0] + .8, .4, APP[2]], d0 = [DOOR[0] - .9, .4, DOOR[2]], d1 = [DOOR[0] + .9, .45, DOOR[2]], r0 = [RT[0] - .65, .4, RT[2]], r1 = [RT[0] + .65, .4, RT[2]];
    // the links, always drawn faintly
    R.line([a1, d0], { c: P.c1, w: 1.3, a: .3, dash: [4, 4] }); R.line([d1, r0], { c: P.c2, w: 1.3, a: .3, dash: [4, 4] });
    REP.forEach(p => R.line([r1, [p[0] - .6, .3, p[2]]], { c: P.c5, w: 1.1, a: .25, dash: [4, 4] }));
    if (k === 0) {
      R.label([(a1[0] + d0[0]) / 2, .3, APP[2]], 'REST + SSE', { fs: 12, b: 1, c: P.c1, dy: -10 });
      R.label([(d1[0] + r0[0]) / 2, .3, DOOR[2]], 'gRPC', { fs: 12, b: 1, c: P.c2, dy: -10 });
    }
    if (k === 1) {   // REST: the JSON body goes in, the SSE events come back
      const pts = seg(a1, d0); R.flow(pts, { c: P.c1, r: .07, n: 7, speed: 1.3 });
      msg(R, path(pts, Math.min(1, e * 1.3)), jsonB, P.c1, 1, { lab: 'POST /v1/messages · ' + jsonB + ' B of JSON', mono: true, dy: -14 });
      R.flow(seg([d0[0], .12, d0[2] + .3], [a1[0], .12, a1[2] + .3]), { c: P.c4, r: .055, n: 6, speed: 1.1, a: win(e, .5, .7) });
      R.label([(a1[0] + d0[0]) / 2, .1, APP[2] + .35], 'SSE events stream back', { fs: 12, c: P.c4, b: 1, dy: 18, a: win(e, .6, .8) });
    }
    if (k === 2) {   // gRPC: the same request as protobuf behind a 5-byte prefix, one HTTP/2 stream, a deadline that shrinks
      const pts = seg(d1, r0);
      R.flow(seg(d1, r0), { c: P.c2, r: .07, n: 6, speed: 1.3 });
      msg(R, path(pts, Math.min(1, e * 1.2)), frameB, P.c2, 1, { lab: frameB + ' B: protobuf + 5-byte prefix', mono: true, dy: 22 });
      plate(R, [(d1[0] + r0[0]) / 2, 0, DOOR[2] - 1.2], P.c6, win(e, .3, .6), 'grpc-timeout: what is left', { w: .5, h: .45, wide: 1 });
      R.flow(seg([r0[0], .14, r0[2] + .35], [d1[0], .14, d1[2] + .35]), { c: P.c4, r: .05, n: 7, speed: 1.1, a: win(e, .6, .8) });
      R.label([(d1[0] + r0[0]) / 2, 0, DOOR[2] + .9], 'tokens back · the status last, in trailers', { fs: 12, b: 1, c: P.c4, dy: 16, a: win(e, .7, .9), wide: 1 });
    }
    if (k === 3) {   // the router picks a replica per call: the measured 30 calls through the L7 balancer
      REP.forEach((p, i) => { const pp = seg(r1, [p[0] - .6, .3, p[2]]); R.flow(pp, { c: P.c5, r: .065, n: 6, speed: 1.4 });
        bar(R, [p[0] + 1.05, 0, p[2]], L7C[i], .05 * win(e, .2, .9), P.c5, 1, { w: .34, d: .34, lab: String(L7C[i]) }); });
      R.label([RT[0], .55, RT[2]], 'a choice per call', { fs: 12.5, b: 1, c: P.c5, dy: -26 });
    }
    if (k === 4) {   // webhook: the front door calls the app's URL later
      const pts = arcPts(R, [DOOR[0] - .3, .7, DOOR[2] + .1], [APP[0] + .2, .5, APP[2] + .1], .9);
      R.flow(pts, { c: P.c5, r: .07, n: 9, speed: 1.2 });
      plate(R, (q => [q[0], Math.max(0, q[1] - .3), q[2]])(path(pts, e * .85)), P.c5, 1, 'signed event · webhook-id', { w: .42, h: .4, wide: 1 });
      R.label([APP[0], 0, APP[2] + .5], 'a URL your app registered', { fs: 12, b: 1, c: P.c1, dy: 16 });
    }
    if (k === 5) {   // other faces of the same services
      party(R, WEB, [1.5, .55, .9], P.c6, 'browsers, front ends', { sub: 'gRPC-Web, Connect, GraphQL', a: win(e, 0, .35) });
      party(R, AGT, [1.5, .55, .9], P.c4, 'an agent', { sub: 'JSON-RPC: MCP, A2A', a: win(e, .2, .55) });
      R.flow(seg([WEB[0] + .8, .3, WEB[2]], [DOOR[0] - .9, .4, DOOR[2] - .35]), { c: P.c6, r: .06, n: 6, speed: 1.2, a: win(e, .2, .5) });
      R.flow(seg([AGT[0] + .8, .3, AGT[2]], [DOOR[0] - .9, .4, DOOR[2] + .45]), { c: P.c4, r: .06, n: 6, speed: 1.2, a: win(e, .4, .7) });
    }
  }
  const full = { cam: [.1, .6], bounds: [[-5.4, 0, -2.0], [5.2, 1.1, 2.4]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one request, three API styles', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 18, 8] : [28, 16, 22, 16],
    view: k => k === 1 ? { cam: [.08, .6], bounds: [[-5.4, 0, -1.2], [-.4, 1.1, 1.6]] }
      : k === 2 ? { cam: [.1, .6], bounds: [[-2.6, 0, -1.4], [2.4, 1.1, 1.6]] }
      : k === 3 ? { cam: [.14, .6], bounds: [[.6, 0, -2.0], [5.8, 1.6, 2.4]] }
      : k === 4 ? { cam: [.08, .6], bounds: [[-5.4, 0, -1.0], [-.4, 1.5, 1.6]] } : k === 5 ? { cam: [.1, .6], bounds: [[-5.6, 0, -2.8], [0, 1.1, 3.1]] } : null });
})();
