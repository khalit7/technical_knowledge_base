// ---- Scene: Fig. 3, the two transports (stg-tp, section 4). Back row: stdio, a host and its child process joined by two pipes (stdin, stdout) with
// stderr dropping to a log tray. Front row: Streamable HTTP, a client, a gateway that reads only headers, and the server's one /mcp endpoint.
// Data from window.MCPD (recorded 5 October 2026, SDK 2.3.0, loopback on one laptop): cold and warm times per transport (tr), the progress events of
// the evaluate_checkpoint stream (prog), and the hostile requests' statuses (wc). The last step stands the warm medians up as columns. ----
(function () {
  if (!document.getElementById('stg-tp') || !window.S3 || !window.MCK || !window.MCPD) return;
  const { mix } = S3, { up, party, msg, refuse, path, win, arcPts } = MCK, D = MCPD;
  const tr = n => D.tr.find(r => r.name.indexOf(n) === 0), wc = n => D.wc.find(c => c.case.indexOf(n) === 0);
  const SP = tr('stdio, 2026-07-28'), SL = tr('stdio, legacy'), HS = tr('Streamable HTTP, 2026-07-28 (server'), HJ = tr('Streamable HTTP, 2026-07-28 (json'), HL = tr('Streamable HTTP, legacy');
  const ms2 = v => v.toFixed(2), cold = Math.round(SP.cold);
  const BAD = [['browser page', 'Origin: http://evil.example'], ['DNS rebinding', 'Host: rebind.evil.example'], ['Mcp-Name says', 'Mcp-Name ≠ body']].map(([c, l]) => { const x = wc(c), m = x.resp.match(/"code":(-?\d+)/); return { st: x.st, code: m ? m[1] : null, l }; });
  window.MCP_TP = { cold, SP, SL, HS, HJ, HL, BAD, prog: D.prog.seen };   // read by src/check_stages.mjs
  const ZS = -1.7, ZH = 1.5, HO = [-4.3, 0, ZS], CH = [.2, 0, ZS], LOG = [.2, 0, ZS + 1.25], CL = [-4.3, 0, ZH], GW = [-.6, 0, ZH], SV = [3.4, 0, ZH], EV = [-.6, 0, ZH + 1.9];
  function pipe(R, x0, x1, y, z, c, a) { R.box([(x0 + x1) / 2, y - .09, z], [x1 - x0, .18, .2], { fill: mix(R.P.paper, c, .35), fa: .25, a, shadow: false, lw: .8 }); }
  function draw(R, k, e) {
    const P = R.P, A = P.acc, S = P.c6, sOn = k <= 1 ? 1 : k === 5 ? .12 : .22, hOn = k >= 2 && k <= 4 ? 1 : k === 5 ? .12 : .22;
    R.grid(-5.4, 5, -3, 3.9, .5);
    // stdio row
    party(R, HO, [1.4, .8, 1.0], A, 'host', { a: sOn, sub: k === 0 ? 'starts the server' : null });
    party(R, CH, [1.4, .8, 1.0], S, 'ckpt-tools', { a: sOn * (k === 0 ? win(e, .3, .8) : 1), sub: 'child process' });
    pipe(R, HO[0] + .7, CH[0] - .7, .62, ZS - .22, A, sOn); pipe(R, HO[0] + .7, CH[0] - .7, .3, ZS + .22, S, sOn);
    R.label([(HO[0] + CH[0]) / 2, .62, ZS - .22], 'stdin', { fs: 12, b: 1, c: A, dy: -12, a: sOn });
    R.label([(HO[0] + CH[0]) / 2, .3, ZS + .22], 'stdout', { fs: 12, b: 1, c: S, dy: 16, a: sOn });
    R.box(LOG, [1.1, .08, .55], { fill: mix(P.paper, P.mute, .25), a: sOn * (k >= 1 ? 1 : .4) }); R.label([LOG[0] + .6, .08, LOG[2]], 'stderr: logs', { fs: 12, c: P.mute, al: 'left', dx: 8, a: sOn });
    // HTTP row
    party(R, CL, [1.4, .8, 1.0], A, 'client', { a: hOn });
    party(R, GW, [1.2, .55, 1.0], P.c5, 'gateway', { a: k === 3 || k === 4 ? .25 : hOn, sub: k === 2 ? 'reads headers only' : null });
    party(R, SV, [1.4, .8, 1.0], S, 'ckpt-tools /mcp', { a: hOn, sub: k === 2 ? 'one URL, one POST per message' : null });
    const cl = [CL[0] + .7, .55, ZH], gw = up(GW, .7), sv = [SV[0] - .7, .55, ZH];
    if (k === 0) { R.flowArc([HO[0] + .4, .85, ZS], [CH[0] - .3, .85, ZS], .5, { c: P.mute, r: .06, n: 7, speed: 1.1, a: .7 });
      R.label(up(CH, 0), 'cold: ' + cold + ' ms to the first result', { fs: 12.5, b: 1, c: S, dy: 4, a: win(e, .6, 1) }); }
    if (k === 1) { const u = win(e, 0, .5), v = win(e, .45, .95);
      R.flow([[HO[0] + .7, .62, ZS - .22], [CH[0] - .7, .62, ZS - .22]], { c: A, r: .06, n: 9, speed: 1.6 });
      R.flow([[CH[0] - .7, .3, ZS + .22], [HO[0] + .7, .3, ZS + .22]], { c: S, r: .06, n: 9, speed: 1.6, a: v > 0 ? 1 : .3 });
      R.flow([[CH[0] + .2, .1, ZS + .5], [LOG[0], .12, LOG[2]]], { c: P.mute, r: .045, n: 4, speed: .8, a: .7 });
      msg(R, [HO[0] + 1.0 + (CH[0] - HO[0] - 2) * u, .72, ZS - .22], SP.up, A, u > 0 && u < 1 ? 1 : 0, { k: .0012, d: .16, h: .07 });
      msg(R, [CH[0] - 1.0 - (CH[0] - HO[0] - 2) * v, .4, ZS + .22], SP.down, S, v > 0 && v < 1 ? 1 : 0, { k: .0012, d: .16, h: .07 });
      R.label([(HO[0] + CH[0]) / 2, .9, ZS - .22], 'one JSON-RPC message per line', { fs: 12.5, b: 1, c: P.ink, dy: -26 });
      R.label(up(HO, 0), 'warm: ' + ms2(SP.med) + ' ms median', { fs: 12.5, b: 1, c: A, dy: 4 }); }
    if (k === 2) { const p1 = [cl, gw], p2 = [gw, sv], u = win(e, 0, .45), v = win(e, .45, .75), w = win(e, .75, 1);
      R.flow(p1, { c: A, r: .065, n: 8, speed: 1.4 }); R.flow(p2, { c: A, r: .065, n: 8, speed: 1.4, a: v > 0 ? 1 : .3 });
      const q = u < 1 ? path(p1, u) : path(p2, v);
      if (w <= 0) { msg(R, [q[0], q[1] - .1, q[2]], HS.up, A, 1, { k: .0011, d: .3, h: .08 }); R.box([q[0], q[1] - .02, q[2]], [.34, .05, .3], { fill: mix(P.paper, P.c5, .8), shadow: false });
        R.label([q[0], q[1] + .05, q[2]], 'POST · Mcp-Method: tools/call · Mcp-Name: list_checkpoints', { fs: 12, b: 1, mono: true, c: P.ink, dy: -16 }); }
      R.glow(up(GW, .55), .6, { c: P.c5, a: .6 * (u >= 1 ? 1 : 0) });
      if (w > 0) { R.flow([sv, cl], { c: S, r: .065, n: 10, speed: 1.6 }); msg(R, path([sv, cl], w * .7), HS.down, S, 1, { k: .0011, d: .3, h: .08, lab: 'application/json · ' + ms2(HS.med) + ' ms warm', mono: true, dy: -16 }); } }
    if (k === 3) { R.flow([cl, sv], { c: A, r: .06, n: 8, speed: 1.4, a: .4 });
      const ev = D.prog.seen.map(s => s[2]).concat(['result']);
      ev.forEach((t, j) => { const u = win(e, j * .18, j * .18 + .4); if (u <= 0) return; const p = path([[sv[0] - .3, .55, ZH + .8], [cl[0] + .3, .55, ZH + .8]], u * (.86 - j * .2));
        msg(R, [p[0], .3, p[2]], j < 3 ? 140 : 700, j < 3 ? P.c5 : S, 1, { k: .0016, d: .22, h: .1, lab: j < 3 ? 'progress · ' + t : 'result', mono: true, fs: 12, dy: j % 2 ? 20 : -14, grp: 'ev' }); });
      R.flow([[sv[0], .45, ZH + .8], [cl[0], .45, ZH + .8]], { c: P.c5, r: .065, n: 12, speed: 1.4 });
      R.label(up(SV, 0), 'text/event-stream for this one request', { fs: 12.5, b: 1, c: P.c5, dy: 4, a: win(e, .2, .5), wide: 1 }); }
    if (k === 4) { party(R, EV, [1.1, .6, .8], P.bad, 'hostile sender', { t: .2 });
      BAD.forEach((b, j) => { const z = ZH + .9 - j * .45, a0 = [EV[0] + .5, .5, EV[2] - .3], tip = [SV[0] - .75, .5, z], u = win(e, j * .22, j * .22 + .4);
        if (u <= 0) return; const pts = arcPts(R, a0, tip, .3); R.flow(pts, { c: P.bad, r: .055, n: 7, speed: 1.4, a: .8 });
        refuse(R, tip, win(u, .8, 1), .14);
        R.label(tip, b.st + (b.code ? ' · ' + b.code : '') + ' · ' + b.l, { fs: 12.5, b: 1, mono: true, c: P.bad, al: 'left', dx: 16, a: win(u, .8, 1), grp: 'bad' }); }); }
    if (k === 5) { // warm medians as columns at the end of each row
      const col = (x, r, c, lab) => { const h = Math.max(.02, r.med * .55); R.box([x, 0, -.1], [.55, h, .55], { fill: mix(P.paper, c, .6) }); R.label([x, h, -.1], ms2(r.med) + ' ms', { fs: 12.5, b: 1, mono: true, dy: -11, c }); R.label([x, 0, .18], lab, { fs: 12, c: P.ink, dy: 14 }); };
      col(-4.0, SP, A, 'stdio'); col(-2.6, SL, A, 'stdio legacy'); col(-.6, HS, S, 'HTTP'); col(.9, HJ, S, 'HTTP json'); col(2.4, HL, S, 'HTTP session');
      R.label([-1, 1.7, -.1], 'warm median of ' + SP.n + ' calls each', { fs: 13, b: 1, c: P.ink }); }
  }
  const full = { cam: [.18, .7], bounds: [[-5.1, 0, -2.6], [5.0, 1.3, 3.6]] };
  S3.stage({ id: 'stg-tp', list: 'sx-tp', fig: 'Fig. 3 · two pipes to a child process; one POST per message', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1700, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 16, 8] : [28, 16, 22, 16],
    view: k => k <= 1 ? { cam: [.14, .7], bounds: [[-5.1, 0, -2.6], [1.6, 1.2, 0]] } : k <= 3 ? { cam: [.14, .7], bounds: [[-5.1, 0, .6], [4.3, 1.2, 2.4]] }
      : k === 4 ? { cam: [.14, .72], bounds: [[-2.4, 0, .4], [5.0, 1.2, 3.8]] } : { cam: [.1, .62], bounds: [[-4.8, 0, -1.4], [3.2, 1.8, 1.2]] } });
})();
