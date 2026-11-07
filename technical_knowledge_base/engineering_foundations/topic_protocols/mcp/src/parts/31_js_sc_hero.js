// ---- Scene: Fig. 1, the hero (stg-hero): the roles and one tool call around the agent loop. Parties: the model API, the host (a platform carrying its
// policy and one client per server), a local stdio server, the remote ckpt-tools server and its authorization server. Data from window.MCPD: the size of
// ckpt-tools' tools/list answer and the tools/call it answered (the stdio recording of 5 October 2026); the rest is the structure the specification defines. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.MCK || !window.MCPD) return;
  const { mix } = S3, { up, party, plate, msg, arcPts, path, win } = MCK;
  const pin = MCPD.tr.find(r => r.name.indexOf('stdio, 2026-07-28') === 0).coldmsgs;
  const listB = pin[3].n - 1;   // the tools/list answer: JSON bytes without the newline
  const fmt = n => n.toLocaleString('en-US');
  window.MCP_HERO = { listB };   // read by src/check_stages.mjs
  const MOD = [0, 0, -2.5], HOST = [0, 0, 0], C1 = [-1.9, .26, .05], C2 = [1.9, .26, .05], POL = [0, .26, .25], LS = [-2.6, 0, 2.6], RS = [2.6, 0, 2.6], AS = [4.9, 0, .9];
  function draw(R, k, e) {
    const P = R.P, M = P.c4, A = P.acc, on = (...ks) => ks.indexOf(k) >= 0 ? 1 : .25;
    R.grid(-5.4, 6, -3.4, 3.8, .5);
    party(R, MOD, [2.8, .75, .9], M, 'Model API', { a: on(0, 1, 2, 4), sub: k === 0 ? 'its own tool format; never MCP' : null });
    party(R, HOST, [6.0, .26, 1.9], P.mute, null, { a: 1, t: .1 });
    R.label([-2.95, .26, -.85], 'Host · Claude Code, an IDE, your own agent', { b: 1, fs: 13, al: 'left', dy: -6, a: k === 0 || k === 5 ? 1 : .6, wide: 1 });
    party(R, C1, [1.0, .45, .7], A, 'client 1', { a: on(0, 1, 5), t: .35 });
    party(R, C2, [1.0, .45, .7], A, 'client 2', { a: on(0, 1, 3, 4, 5), t: .35 });
    plate(R, POL, P.good, k === 2 || k === 3 ? 1 : k === 0 ? .8 : .3, k === 0 || k === 3 ? 'policy and consent' : null, { w: .7, h: .55, glow: k === 3 ? P.good : null });
    party(R, LS, [1.7, .7, 1.0], P.c5, 'local server', { a: on(0, 1, 5), sub: k === 0 || k === 5 ? 'child process · stdio' : null });
    party(R, RS, [1.7, .7, 1.0], P.c6, 'ckpt-tools', { a: on(0, 1, 3, 4, 5), sub: k === 0 ? 'remote · Streamable HTTP' : null });
    party(R, AS, [1.3, .8, .9], P.c3, 'authorization server', { a: on(0, 5), wide: 1 });
    // the MCP links: one client to one server (always drawn faintly)
    const c1 = up(C1, .5), c2 = up(C2, .5), ls = [LS[0], .72, LS[2] - .5], rs = [RS[0], .72, RS[2] - .5], mo = [MOD[0], .78, MOD[2] + .45];
    R.line([c1, ls], { c: A, w: 1.4, a: .35, dash: [4, 4] }); R.line([c2, rs], { c: A, w: 1.4, a: .35, dash: [4, 4] });
    if (k === 0) {
      R.label([ (C1[0] + LS[0]) / 2 - .3, .5, (C1[2] + LS[2]) / 2], 'MCP', { fs: 12, b: 1, c: A });
      R.label([ (C2[0] + RS[0]) / 2 + .3, .5, (C2[2] + RS[2]) / 2], 'MCP', { fs: 12, b: 1, c: A });
    }
    if (k === 1) {   // tools/list from both servers; the host copies the definitions into the model's tool list
      R.flowArc(rs, c2, .35, { c: A, r: .07, n: 9, speed: 1.4 }); R.flowArc(ls, c1, .35, { c: A, r: .06, n: 7, speed: 1.4, a: .7 });
      const pts = arcPts(R, c2, mo, .7); R.flow(pts, { c: M, r: .07, n: 10, speed: 1.3, a: win(e, .3, .6) });
      const q = path(arcPts(R, [RS[0], .75, RS[2] - .3], c2, .4).concat(arcPts(R, c2, [mo[0] + .4, .7, mo[2] + .5], .7)), e);
      plate(R, [q[0], Math.max(0, q[1] - .45), q[2]], A, 1, '3 tools · ' + fmt(listB) + ' bytes', { w: .5, h: .55, al: 'left', dx: 20 });
      R.label([MOD[0] + 1.4, .75, MOD[2]], 'tool list: name, description, inputSchema', { fs: 12.5, b: 1, c: M, al: 'left', dx: 10, a: win(e, .7, 1), wide: 1 });
    }
    if (k === 2) {   // the model answers with a tool call in its own format
      const pts = arcPts(R, mo, up(POL, .6), .6); R.flow(pts, { c: M, r: .075, n: 10, speed: 1.4 });
      msg(R, path(pts, e), 120, M, 1, { k: .006, lab: 'tool_use · list_checkpoints({"run": "llama-7b-sft"})', mono: true, dy: -14 });
    }
    if (k === 3) {   // policy says yes; only client 2 sends tools/call, only ckpt-tools hears it
      const pts = arcPts(R, c2, rs, .35); R.flow(pts, { c: A, r: .075, n: 9, speed: 1.5, a: win(e, .35, .5) });
      msg(R, path(pts, win(e, .35, 1) * .85), 302, A, win(e, .3, .4), { lab: 'tools/call · list_checkpoints', mono: true });
      R.label([RS[0], 0, RS[2] + .5], 'sees only this request', { fs: 12.5, b: 1, c: P.c6, dy: 16, a: win(e, .8, 1) });
    }
    if (k === 4) {   // the result's text goes into the next model request as a tool result
      const p1 = arcPts(R, rs, c2, .35), p2 = arcPts(R, c2, mo, .7);
      R.flow(p1, { c: P.c6, r: .075, n: 9, speed: 1.5 }); R.flow(p2, { c: P.c6, r: .07, n: 10, speed: 1.3, a: win(e, .4, .6) });
      msg(R, path(p1.concat(p2), e), 700, P.c6, 1, { lab: 'result · three checkpoints', mono: true });
      R.label([MOD[0] + 1.4, .75, MOD[2]], 'tool result → the model continues', { fs: 12.5, b: 1, c: M, al: 'left', dx: 10, a: win(e, .75, 1), wide: 1 });
    }
    if (k === 5) {   // where each server's credentials come from
      R.glow(up(LS, .75), .7, { c: P.c5, a: .6 }); R.label([LS[0], 0, LS[2] + .5], "the user's rights, credentials from the environment", { fs: 12.5, b: 1, c: P.c5, dy: 16, wide: 1 });
      const pts = arcPts(R, [AS[0] - .4, .7, AS[2] + .3], [RS[0] + .7, .7, RS[2] - .2], .5); R.flow(pts, { c: P.c3, r: .07, n: 8, speed: 1.2 });
      const q = path(pts, e * .8); plate(R, [q[0], Math.max(0, q[1] - .5), q[2]], P.c3, 1, 'token · aud = this server', { w: .45, h: .55, al: 'left', dx: 18 });
      R.label([RS[0], 0, RS[2] + .5], 'an OAuth resource server', { fs: 12.5, b: 1, c: P.c6, dy: 16 });
    }
  }
  const full = { cam: [.12, .72], bounds: [[-3.6, 0, -3.0], [5.6, 1.2, 3.2]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · the host translates and decides', cam: full.cam, bounds: full.bounds, aspect: .7, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [20, 8, 18, 8] : [26, 16, 24, 16],
    view: k => k === 2 || k === 4 ? { cam: [.1, .72], bounds: [[-1.2, 0, -3.0], [3.8, 1.2, 3.1]] }
      : k === 3 ? { cam: [.16, .7], bounds: [[-1.6, 0, -2.0], [4.6, 1.1, 3.3]] }
      : k === 5 ? { cam: [.2, .7], bounds: [[-3.6, 0, -.6], [5.6, 1.1, 3.3]] } : null });
})();
