// ---- Scene: Fig. 1, the hero (stg-hero): one LLM request's journey as eight glass plates, top to bottom in the order the request meets them,
// each naming the child page that owns it. The request flows down as orange dots, the answer back up as green ones; the far party of each step
// (the resolver, the API server, the provider's internal services, an MCP server) sits to the right. Renderer v2 (25_js_s3.js).
// The numbers on the plates are this page's recordings, the same ones the step list quotes (On the wire tab, src/read/code/out/). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3) return;
  const { at, mix } = S3;
  // [short name, protocol, owner page, number shown when the step is about it]
  const PL = [
    ['Name', 'DNS', 'DNS', 'api.anthropic.com → 160.79.104.10'],
    ['Transport', 'TCP or QUIC', 'Networking foundations', 'SYN, SYN-ACK, ACK: 1 round trip'],
    ['Security', 'TLS 1.3', 'TLS and certificates', '1 round trip, about 3.5 KB'],
    ['HTTP', 'POST /v1/messages', 'HTTP', '277 B of HTTP → one 299 B record'],
    ['Auth', 'x-api-key', 'Auth', '401 who are you? 403 not allowed'],
    ['Service APIs', 'gRPC', 'Service APIs', 'a deadline on every call'],
    ['Streaming', 'SSE', 'Streaming and real-time', '146 to 148 B a token, 51 ms apart'],
    ['Agent protocols', 'MCP, A2A', 'MCP, Agent-to-agent', 'tools/call → untrusted text']];
  // round trips spent before the first byte of the answer, after each step, with an uncached name (the old journey's counter)
  const RT = [1, 2, 3, 4, 4, 4, 4, 4, 4];
  const N = PL.length, W = 3.6, D = 1.5, GAP = .74, Y0 = 5.6, y = i => Y0 - GAP * i;
  const XQ = -1.0, XA = 1.0, XS = 3.4;   // request column, answer column, far party
  function plate(R, i, a, on) {
    const P = R.P, c = on ? P.acc : P.mute;
    R.glass([-W / 2, y(i), -D / 2], [W, 0, 0], [0, 0, D], { c, a: a * (on ? 1 : .55), nu: 8, nv: 3, th: .04 });
  }
  function party(R, i, name, a) {   // a far party at plate i's height, on the right
    const P = R.P; if (a <= .01) return;
    R.box([XS, y(i) + .02, 0], [1.1, .5, .8], { fill: mix(P.paper, P.c6, .22), a, shadow: false });
    R.label([XS, y(i) + .52, 0], name, { fs: 12.5, b: 1, dy: -10, a });
  }
  // request dots from above the stack down to plate k, along the request column
  const down = (R, k, a) => R.flow([[XQ, Y0 + .9, 0], [XQ, y(k) + .02, 0]], { c: R.P.c2, r: .07, n: Math.round(6 + 2.2 * (Y0 + .9 - y(k))), speed: 1.3, a });
  const up = (R, from, a, c) => R.flow([[XA, y(from) + .02, 0], [XA, Y0 + .9, 0]], { c: c || R.P.c3, r: .07, n: Math.round(6 + 2.2 * (Y0 + .9 - y(from))), speed: 1.3, a });
  function draw(R, k, e) {
    const P = R.P, last = k === N, nar = R.W < 520;
    R.grid(-4, 5, -2, 2, .5);
    // the plates: the step's plate at full strength, the rest recede (all of them on the last step)
    for (let i = 0; i < N; i++) {
      const on = !last && i === k, a = last ? .85 : on ? 1 : i < k ? .45 : .25;
      plate(R, i, a, on);
      const near = last || Math.abs(i - k) <= 1;
      if (!near) continue;
      const la = last ? 1 : on ? 1 : .6;
      R.label([-W / 2, y(i), 0], (i + 1) + ' · ' + PL[i][0] + ': ' + PL[i][1], { al: 'right', dx: -14, dy: -8, fs: on ? 14 : 12.5, b: 1, c: on ? P.acc : P.ink, a: la, grp: 'pl' });
      R.label([-W / 2, y(i), 0], 'page: ' + PL[i][2], { al: 'right', dx: -14, dy: 9, fs: 12, c: P.mute, a: la, grp: 'pl2' });
    }
    if (!last) R.label([W / 2, y(k), D / 2], PL[k][3], { mono: true, fs: 12.5, b: 1, c: P.acc, al: 'left', dx: -30, dy: 18, a: at(k, e, k) });
    R.label([XQ, Y0 + .9, 0], 'your app', { fs: 12.5, b: 1, dy: -12 });
    R.label([XS + .2, Y0 + .9, 0], 'round trips so far: ' + RT[Math.min(k, 8)], { mono: true, fs: 12.5, b: 1, c: P.c2, dy: -12, al: 'center' });
    // the request goes down as far as this step
    if (k <= 5) down(R, k, 1);
    // 1. DNS: a query out to the resolver and the answer back
    if (k === 0) {
      party(R, 0, nar ? 'resolver' : 'recursive resolver', 1);
      R.flowArc([XQ + .2, y(0) + .05, 0], [XS - .55, y(0), 0], .45, { c: P.c2, r: .065, speed: 1.4, a: 1 });
      R.flowArc([XS - .55, y(0) - .12, 0], [XQ + .2, y(0) - .07, 0], -.3, { c: P.c3, r: .065, speed: 1.4, a: 1 });
    }
    // 2 to 4. one round trip each to the API server: out and back
    if (k >= 1 && k <= 3) {
      party(R, k, 'API server', 1);
      R.flowArc([XQ + .2, y(k) + .05, 0], [XS - .55, y(k), 0], .45, { c: P.c2, r: .065, speed: 1.4, n: k === 3 ? 12 : 8 });
      if (k < 3) R.flowArc([XS - .55, y(k) - .12, 0], [XQ + .2, y(k) - .07, 0], -.3, { c: P.c3, r: .065, speed: 1.4 });
      if (k === 3) R.glass([XQ - .35, y(k) + .1, -.05], [.7, 0, 0], [0, .5, 0], { c: P.c2, nu: 1, nv: 4, th: .03, a: at(k, e, 3) });
    }
    // 5. auth: the credential rides on the request
    if (k === 4) {
      party(R, 4, 'API front door', 1);
      R.box([XQ, y(4) + .05, 0], [.5, .22, .3], { fill: mix(P.paper, P.c5, .7), shadow: false });
      R.label([XQ, y(4) + .27, 0], 'x-api-key', { mono: true, fs: 12, b: 1, c: P.c5, dy: -8 });
      R.flowArc([XQ + .2, y(4) + .05, 0], [XS - .55, y(4), 0], .45, { c: P.c5, r: .065, speed: 1.4 });
    }
    // 6. inside the provider: three services on the plate, called one after another over gRPC
    if (k === 5) {
      const S = [[-.2, 'rate limit'], [1.15, 'router'], [2.5, 'inference']];
      S.forEach(([x, n], j) => { R.box([x + .9, y(5) + .04, 0], [.8, .38, .6], { fill: mix(P.paper, P.c3, .3), shadow: false, a: at(k, e, 5) });
        R.label([x + .9, y(5) + .42, 0], n, { fs: 12, dy: -8, a: at(k, e, 5), wide: 1 }) });
      R.flow([[XQ, y(5) + .2, 0], [S[0][0] + .5, y(5) + .2, 0], [S[2][0] + 1.3, y(5) + .2, 0]], { c: P.c2, r: .06, speed: 1.3 });
    }
    // 7. the answer streams back up through every plate above
    if (k >= 6) {
      if (k === 6) { down(R, 5, .35); up(R, 5, 1);
        for (let j = 0; j < 5; j++) { const yy = y(5) + (Y0 + .6 - y(5)) * (j / 5 + .04);
          R.box([XA + .45, yy, 0], [.18, .14, .18], { fill: mix(P.paper, P.c3, .65), shadow: false, a: at(k, e, 6) * .9 }) }
        R.label([XA + .45, y(2), 0], '5 tokens', { fs: 12, b: 1, c: P.c3, al: 'left', dx: 12, a: at(k, e, 6), wide: 1 });
      }
    }
    // 8. a tool call: out to an MCP server, and its result back up into the model's context as untrusted text
    if (k === 7) {
      party(R, 7, 'MCP server', 1);
      down(R, 7, .4);
      R.flowArc([XQ + .2, y(7) + .05, 0], [XS - .55, y(7), 0], .45, { c: P.c2, r: .065, speed: 1.4 });
      R.flowArc([XS - .55, y(7) - .12, 0], [XA, y(7), 0], -.25, { c: P.c4, r: .07, speed: 1.4 });
      up(R, 7, 1, P.c4);
      R.label([XA, y(4), 0], 'untrusted text, into the context', { fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 12, wide: 1 });
    }
    // 9. the whole path: down through every plate and back up
    if (last) { down(R, 7, 1); up(R, 7, 1) }
  }
  const full = { cam: [.32, .3], bounds: [[-2.1, 0, -1], [4.2, Y0 + 1.1, 1]] };
  // on the tall cards (split layout, phone) the close-ups of the lowest plates aim above the plate, so the canvas is not left empty below the stack
  const close = k => { const tall = innerWidth >= 1100 || innerWidth < 560, c = y(k) + (k >= 5 && tall ? 2.2 : 0); return { cam: [.3, .36], bounds: [[-2.1, c - .9, -1], [4.2, c + .95, 1]] } };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one request, eight protocols, eight pages', cam: full.cam, bounds: full.bounds, aspect: .7, dur: 1500, hold: 5200, draw,
    margin: w => w < 520 ? [26, 10, 18, 10] : [30, 16, 22, 200],
    view: k => k < N ? (k === 0 ? { cam: [.3, .34], bounds: [[-2.1, y(1) - .5, -1], [4.2, Y0 + 1.1, 1]] } : close(k)) : full });
})();
