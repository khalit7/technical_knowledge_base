// ---- Scene: Fig. 1, the hero (stg-hero, the idea in one screen): one streamed token goes down the server's layers, across two routers and up the
// client's. Sizes from the page: token 1 is 124 bytes on the wire as a Server-Sent Event (the root's recording), TCP's header 32 bytes with
// timestamps, IP's 20, a full segment 1,448 bytes of data in a 1,500-byte MTU. Layers are stacked glass plates; a packet is a block whose length
// is its bytes; flows show it moving. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.NFK) return;
  const { mix } = S3, { up, layer, path, win, arcPts, fmt } = NFK;
  const TOK = 124, TCPH = 32, IPH = 20, MSS = 1448, MTU = 1500;
  window.NF_HERO = { TOK, TCPH, IPH, MSS, MTU, total: TOK + TCPH + IPH };   // read by src/check_stages.mjs
  const XS = 3.7, XC = -3.7, XR = [1.25, -1.25], Y = { link: .25, ip: .85, tcp: 1.45, app: 2.05 }, K = .009;
  // a packet: its parts laid left to right (front first, as it travels left), each as long as its bytes
  function packet(R, p, parts, k, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, L = parts.reduce((s, q) => s + q[0] * k, 0); let x = p[0] - L / 2;
    parts.forEach(q => { const w = q[0] * k; if (w > .004) R.box([x + w / 2, p[1], p[2]], [w, o.h || .16, o.d || .42], { fill: mix(P.paper, q[1], .62), a: a * (q[2] == null ? 1 : q[2]), shadow: false, lw: .8 }); x += w; });
    if (o.lab) R.label([p[0], p[1] + (o.h || .16), p[2]], o.lab, { fs: 12.5, b: 1, c: o.lc || P.ink, dy: o.dy == null ? -12 : o.dy, a, al: o.al, dx: o.dx, wide: o.wide }); }
  function draw(R, k, e) {
    const P = R.P, CA = P.c3, CT = P.acc, CI = P.c2, CL = P.mute;
    R.grid(-5.4, 5.4, -1.6, 3.2, .5);
    const fl = k === 5 ? .22 : 1;   // the last step is about the two packets on the floor: the stacks recede
    // the two hosts: four plates each; the routers: link and IP only
    [[XS, 'server', k <= 2 ? 1 : k === 3 ? .8 : .45], [XC, 'client', k === 4 ? 1 : k === 3 ? .8 : .45]].forEach(([x, nm, a0]) => { const a = a0 * fl;
      R.box([x, 0, 0], [2.0, .1, 1.4], { a: Math.max(.25, a) });
      layer(R, [x, Y.link, 0], 1.9, 1.3, CL, a * .8); layer(R, [x, Y.ip, 0], 1.9, 1.3, CI, a); layer(R, [x, Y.tcp, 0], 1.9, 1.3, CT, a); layer(R, [x, Y.app, 0], 1.9, 1.3, CA, a);
      // a label is drawn only while its object is in the step's view (labels are clamped into the canvas, so an off-view one would hang at the edge)
      if (nm === 'server' ? k !== 4 : k >= 3) R.label([x, Y.app + .05, 0], nm, { b: 1, fs: 13.5, dy: -16, a: Math.max(.4, a) }); });
    const lx = k <= 2 ? XS - .95 : XC - .95;
    if (k < 5) [['application', Y.app, CA], ['TCP', Y.tcp, CT], ['IP', Y.ip, CI], ['link', Y.link, CL]].forEach(([t, y, c]) => R.label([lx, y, .65], t, { fs: 12.5, b: 1, c, al: 'right', dx: -8, grp: 'lay' }));
    XR.forEach((x, i) => { const a = (k === 3 ? 1 : .4) * fl; R.box([x, 0, 0], [1.2, .1, 1.0], { a: Math.max(.25, a) });
      layer(R, [x, Y.link, 0], 1.1, .9, CL, a * .8); layer(R, [x, Y.ip, 0], 1.1, .9, CI, a);
      if (k === 3 || (k === 4 && i === 1)) R.label([x, Y.ip + .05, 0], 'router', { fs: 12.5, b: 1, dy: -14, a: Math.max(.4, a) }); });
    // the token's packet, built and carried step by step
    const hS = up([XS, 0, 0], Y.app + .05);
    if (k === 0) { const a = win(e, 0, .4); packet(R, hS, [[TOK, CA]], K, a, { lab: 'token 1 · 124 B', lc: CA, al: 'left', dx: 30, dy: -2 });
      R.flow(arcPts(R, [XS + .3, Y.app + 1.0, 0], [XS, Y.app + .25, 0], .1, 8), { c: CA, r: .06, n: 4, speed: .8, a: win(e, .2, .6) }); }
    if (k === 1) { const y = Y.app + .05 + (Y.tcp - Y.app) * win(e, 0, .45), g = win(e, .45, .8);
      packet(R, [XS, y, 0], [[TCPH * g, CT], [TOK, CA]], K, 1, { lab: g > .5 ? '+32 B TCP' : null, lc: CT, al: 'left', dx: 30, dy: -2 });
      if (g > .5) R.label([XS + .95, Y.tcp, -.65], 'two ports · byte numbers · ACK · window', { fs: 12.5, c: CT, al: 'left', dx: 8, a: win(e, .6, 1), wide: 1 }); }
    if (k === 2) { const y = Y.tcp + .05 + (Y.ip - Y.tcp) * win(e, 0, .45), g = win(e, .45, .8);
      packet(R, [XS, y, 0], [[IPH * g, CI], [TCPH, CT], [TOK, CA]], K, 1, { lab: g > .5 ? '176 B on the wire' : null, al: 'left', dx: 30, dy: -2 });
      if (g > .5) R.label([XS + .95, Y.ip, -.65], 'two addresses · hop counter', { fs: 12.5, c: CI, al: 'left', dx: 8, a: win(e, .6, 1), wide: 1 }); }
    const route = [[XS, Y.link + .06, 0], [XR[0] + .3, Y.link + .06, 0], [XR[0], Y.ip + .06, 0], [XR[0] - .3, Y.link + .06, 0], [XR[1] + .3, Y.link + .06, 0], [XR[1], Y.ip + .06, 0], [XR[1] - .3, Y.link + .06, 0], [XC, Y.link + .06, 0]];
    const full = [[IPH, CI], [TCPH, CT], [TOK, CA]];
    if (k === 3) { R.flow(route, { c: CI, r: .065, n: 14, speed: 1.4 });
      const p = path(route, e); packet(R, p, full, K, 1, { h: .2, d: .5 });
      XR.forEach(x => { const near = Math.abs(p[0] - x) < .5; if (near) R.glow([x, Y.ip + .1, 0], .6, { c: CI, a: .7 }); R.label([x, 0, .5], 'reads IP only', { fs: 12, b: near, c: CI, dy: 14, a: near ? 1 : .6, wide: 1 }); }); }
    if (k === 4) { const t = e, y = t < .3 ? Y.link + .06 + (Y.ip - Y.link) * win(t, 0, .3) : t < .6 ? Y.ip + .06 + (Y.tcp - Y.ip) * win(t, .3, .6) : Y.tcp + .06 + (Y.app - Y.tcp) * win(t, .6, .9);
      packet(R, [XC, y, 0], [[IPH, CI, 1 - win(t, .25, .4)], [TCPH, CT, 1 - win(t, .55, .7)], [TOK, CA]], K, 1, { lab: t > .85 ? 'the program reads 124 B' : null, lc: CA });
      const ack = arcPts(R, [XC + .8, Y.tcp + .1, .2], [XS - .8, Y.tcp + .1, .2], .7, 24); R.flow(ack, { c: P.good, r: .06, n: 10, speed: 1.4, a: win(e, .5, .7) });
      R.label([0, Y.tcp + .85, .2], 'ACK back to the server', { fs: 12.5, b: 1, c: P.good, a: win(e, .55, .8) }); }
    if (k === 5) { // to scale on the floor: a full segment and the token's packet, the same bytes per unit of length
      const k2 = .006, x0 = -4.5, z1 = 1.7, z2 = 2.6, a = win(e, 0, .5);
      packet(R, [x0 + MTU * k2 / 2, 0, z1], [[IPH, CI], [TCPH, CT], [MSS, CA]], k2, a, { h: .2, d: .5 });
      packet(R, [x0 + (TOK + 52) * k2 / 2, 0, z2], full, k2, a, { h: .2, d: .5 });
      NFK.slot(R, [x0 + 176 * k2 + (MTU - 176) * k2 / 2, 0, z2], (MTU - 176) * k2, .5, a);
      R.line([[x0, .7, z1 - .25], [x0, .8, z1 - .25], [x0 + MTU * k2, .8, z1 - .25], [x0 + MTU * k2, .7, z1 - .25]], { c: P.mute, w: 1.4, a });
      R.label([x0 + MTU * k2 / 2, .8, z1 - .25], 'MTU · 1,500 B', { fs: 12.5, b: 1, c: P.mute, dy: -10, a });
      R.label([x0 + MTU * k2 / 2, .2, z1 - .25], '1,448 B of data (one MSS) + 52 B of headers', { fs: 12.5, b: 1, c: CA, dy: -16, a: win(e, .3, .7) });
      R.label([x0 + 176 * k2, .2, z2], 'token: 176 B', { fs: 12.5, b: 1, al: 'left', dx: 8, a: win(e, .3, .7) });
      R.label([x0 + 176 * k2 + (MTU - 176) * k2 / 2, 0, z2], '1,324 B unused', { fs: 12.5, c: P.mute, dy: 14, a: win(e, .5, .9) }); }
  }
  const full = { cam: [.2, .42], bounds: [[-4.8, 0, -.9], [4.8, 2.3, .9]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one token down the layers and across the path', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1700, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 16, 18, 96],
    view: k => k <= 2 ? { cam: [.28, .4], bounds: [[1.2, 0, -1.0], [6.2, 2.4, 1.0]] }
      : k === 4 ? { cam: [.12, .42], bounds: [[-5.4, 0, -1.0], [0.6, 2.4, 1.0]] }
      : k === 5 ? { cam: [.08, .62], bounds: [[-4.7, 0, 1.2], [4.7, .7, 2.9]] } : innerWidth < 520 ? { cam: [.75, .55], bounds: full.bounds } : full });   // phone: the path turned into depth, so the hosts are larger
})();
