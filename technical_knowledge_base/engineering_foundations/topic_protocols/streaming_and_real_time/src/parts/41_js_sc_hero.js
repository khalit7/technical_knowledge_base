// ---- Scene: Fig. 1, the hero (stg-hero): one answer, four ways, then the webhook. One client and one server; a lane in depth per
// mechanism. Every request, response and event is placed at the moment the 100 ms round-trip run recorded it (SDATA.fw['100'], the
// median of 7 runs through the relay of section 1), slowed about seven times; the webhook lane replays the first two deliveries of the
// careful receiver's recorded run (SDATA.hooks). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.STK || !window.SDATA) return;
  const { mix } = S3, { party, slab, plate, msg, bar, cross, tile, at, win, ms } = STK;
  const D = SDATA.fw['100'], M = ['short polling', 'long polling', 'SSE', 'WebSocket'], NM = ['Polling', 'Long polling', 'SSE', 'WebSocket'];
  const OW = .05, TM = .6, XC = -4.0, XS = 4.0, ZL = [2.0, .6, -.8, -2.2], ZW = 3.5, TOK = ['The', 'sky', 'is', 'blue', '.'];
  const last = m => D[m].arr[D[m].arr.length - 1][1];
  const CL = SDATA.hooks.delivery.careful.log.filter(r => r.sender && r.event === 'job.running');   // attempt 1: HTTP 503, attempt 2: HTTP 200
  window.ST_HERO = { last: M.map(m => ms(last(m))), req: M.map(m => D[m].requests), down: M.map(m => D[m].down), hook: CL.map(r => r.what) };   // read by check_stages.mjs
  // one lane: requests up (orange), answers and events down (blue), a held request or response as glass; t is the run's clock in seconds
  function lane(R, i, a, t) {
    const P = R.P, m = M[i], r = D[m], z = ZL[i], yU = .5, yD = .5, zu = z + .2, zd = z - .2;
    R.label([XC - 1.1, .2, z], NM[i], { fs: 13, b: 1, al: 'right', dx: -6, a: Math.max(.35, a), c: a > .5 ? P.ink : P.mute, grp: 'lane' });
    if (a < .05) return;
    const held = (x0, x1, c, lab, o) => slab(R, x0, x1, .26, z, .62, c, a, Object.assign({ lab: a > .5 ? lab : null, at: [(x0 + x1) / 2, .26, z - .31], al: 'center', dx: 0, dy: -12, wide: 1 }, o || {}));
    if (m === 'short polling' || m === 'long polling') {
      r.req.forEach((q, n) => {
        const p = at([XC, yU, zu], [XS, yU, zu], q[0], q[0] + OW, t); if (p) msg(R, p, 160, P.c2, a, { lab: n ? null : 'GET', mono: 1 });
        if (m === 'long polling' && t > q[0] + OW && t < q[1] - OW + .004) R.box([XS - .35, .06, z], [.5, .5, .5], { fill: mix(P.paper, P.c5, .5), a: a * .9, shadow: false });
        const d = at([XS, yD, zd], [XC, yD, zd], q[1] - OW, q[1], t); if (d) msg(R, d, 120 * Math.max(1, q[2]), P.c1, a, { lab: q[2] + (q[2] === 1 ? ' event' : ' events'), mono: 1, dy: 18 });
      });
      if (m === 'long polling' && a > .5 && t > .1 && t < .44) R.label([XS - .35, .56, z], 'held', { fs: 12, c: P.c5, b: 1, dy: -8, a });
    } else {
      const p = at([XC, yU, zu], [XS, yU, zu], 0, OW, t); if (p) msg(R, p, 200, P.c2, a, { lab: m === 'SSE' ? 'POST' : 'GET Upgrade', mono: 1 });
      if (m === 'WebSocket') { const b = at([XS, yD, zd], [XC, yD, zd], OW, 2 * OW, t); if (b) msg(R, b, 160, P.mute, a, { lab: '101', mono: 1, dy: 18 }); }
      if (t > OW) held(XC + .05, XS - .05, m === 'SSE' ? P.c1 : P.c4, m === 'SSE' ? 'one response, held open' : 'one connection, both ways');
      if (t >= TM - .001 && a > .5) { R.flow([[XS - .2, .38, z - .12], [XC + .2, .38, z - .12]], { c: P.c1, r: .06, n: 9, speed: 1.2, a });
        if (m === 'WebSocket') R.flow([[XC + .2, .38, z + .14], [XS - .2, .38, z + .14]], { c: P.c2, r: .06, n: 6, speed: 1.2, a }); }
    }
    // events: blue balls on their way, tiles at the client once they have arrived
    let k = 0;
    r.arr.forEach(([ev, ta]) => {
      const tok = ev === 'content_block_delta', j = tok ? k++ : -1;
      if (m === 'SSE' || m === 'WebSocket') { const p = at([XS, .42, zd], [XC, .42, zd], ta - OW, ta, t); if (p) { R.glow(p, .26, { c: tok ? P.c1 : P.mute, a: a * .7 }); R.ball(p, .085, { c: tok ? P.c1 : P.mute, a }); } }
      if (tok && t >= ta) tile(R, [XC + .55 + j * .62, .02, z + .55], TOK[j], P.c1, a, { w: .56, wide: 1 });
    });
    if (t >= last(m) && a > .5) R.label([XC + 4.1, .02, z + .55], 'last token ' + ms(last(m)) + ' ms · ' + r.requests + (r.requests === 1 ? ' request' : ' requests'), { fs: 12, b: 1, mono: 1, c: P.ink, al: 'left', dx: 8, dy: -4, a, wide: 1 });
  }
  function draw(R, k, e, st) {
    const P = R.P, t = (k <= 3 ? st.e : 1) * TM;
    R.grid(-6, 7, -3.2, 4.6, .5);
    party(R, [XC - .45, 0, -.1], [.9, .45, 5.6], P.c2, 'client', { a: k === 4 ? .3 : 1 });
    party(R, [XS + .45, 0, -.1], [.9, .45, 5.6], P.c1, 'server · stand-in model', { a: k === 4 ? .3 : 1 });
    M.forEach((m, i) => { const a = k === i ? 1 : k < i ? .12 : k === 5 ? .35 : .22; lane(R, i, a, k === i ? t : k < i ? 0 : TM); });
    // step 5: the webhook reverses the roles; the provider opens a POST to your public URL when the event happens, and retries until 2xx
    const aw = k === 4 ? 1 : k === 5 ? .3 : .1;
    party(R, [XC - .45, 0, ZW], [.9, .75, 1.1], P.c3, k === 4 ? 'your public URL' : null, { a: aw });
    party(R, [XS + .45, 0, ZW], [.9, .75, 1.1], P.c1, k === 4 ? 'provider' : null, { a: aw });
    if (k === 4) {
      const E = st.e, z1 = ZW + .2, z2 = ZW - .2;
      R.label([0, 1.4, ZW], 'hours later: job.running', { fs: 12.5, b: 1, c: P.mute, a: win(E, 0, .1) });
      const p1 = at([XS, .5, z1], [XC, .5, z1], .05, .3, E); if (p1) msg(R, p1, 300, P.c1, 1, { lab: 'POST, signed', mono: 1 });
      const r1 = at([XC, .5, z2], [XS, .5, z2], .3, .45, E); if (r1) msg(R, r1, 120, P.bad, 1, { lab: CL[0].what.replace(/^attempt 1: /, ''), mono: 1, dy: 18 });
      if (E > .3) cross(R, [XC + .3, 1.05, ZW], win(E, .3, .36) * (E < .55 ? 1 : .4));
      const p2 = at([XS, .5, z1], [XC, .5, z1], .5, .72, E); if (p2) msg(R, p2, 300, P.c1, 1, { lab: 'retry', mono: 1 });
      const r2 = at([XC, .5, z2], [XS, .5, z2], .78, .92, E); if (r2) msg(R, r2, 120, P.good, 1, { lab: CL[1].what.replace(/^attempt 2: /, ''), mono: 1, dy: 18 });
      plate(R, [XC - .6, 1.0, ZW + .2], P.good, win(E, .72, .8), 'signature checked', { w: .42, h: .36, glow: P.good });
      if (E >= 1) R.flow([[XS - .2, .4, ZW], [XC + .2, .4, ZW]], { c: P.c1, r: .06, n: 7, speed: 1.1 });
    }
    // step 6: side by side, the last token's arrival as bars at the client end of each lane
    if (k === 5) M.forEach((m, i) => bar(R, [.9, 0, ZL[i] - .1], last(m) * 2.4 * e, i < 2 ? P.c5 : P.c1, 1, { lab: ms(last(m)) + ' ms', w: .4, d: .4 }));
  }
  const full = { cam: [.04, .74], bounds: [[-6.2, 0, -2.9], [5.2, 1, 4.2]] };
  const laneV = z => ({ cam: [.04, .66], bounds: [[-6.2, 0, z - .9], [5.2, 1, z + 1.0]] });
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one answer, four ways, then a webhook', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 4000, hold: 4600, draw,
    margin: w => w < 520 ? [20, 8, 12, 8] : [24, 16, 16, 16],
    view: k => k <= 3 ? laneV(ZL[k]) : k === 4 ? laneV(ZW) : full });
})();
