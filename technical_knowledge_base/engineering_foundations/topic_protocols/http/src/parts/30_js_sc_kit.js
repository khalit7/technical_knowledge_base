// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): parties as blocks on the floor, connections as glass strips
// lying on the floor between them, frames and tokens as small blocks that travel along a connection, timers as glass columns that fill. ----
window.HTK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a party (client, proxy, server): a block with its name above it; o.a fades it when the step is about something else
  function node(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .26 : o.t), a });
    if (lab) R.label(up(p, s[1]), lab, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.45, a) });
    if (o.sub) R.label(up(p, s[1]), o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.45, a), wide: o.subWide }); }
  // a connection: a tinted glass strip on the floor from x0 to x1, centred on z, w wide
  function lane(R, x0, x1, z, w, c, a, o) { o = o || {}; if (a <= .01) return;
    R.glass([x0, .015, z - w / 2], [x1 - x0, 0, 0], [0, 0, w], { c, a, nu: o.nu || 10, nv: o.nv || 1, th: .02 }); }
  // a frame or token in flight or at rest: a small block whose bottom centre is p
  function chunk(R, p, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, s = o.s || [.26, .2, .26];
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .62 : o.t), a, shadow: false, lw: .8 }); }
  // an empty slot still to be filled: a dashed outline on the floor
  function slot(R, p, w, d, a) { const P = R.P, y = .02;
    R.line([[p[0] - w / 2, y, p[2] - d / 2], [p[0] + w / 2, y, p[2] - d / 2], [p[0] + w / 2, y, p[2] + d / 2], [p[0] - w / 2, y, p[2] + d / 2], [p[0] - w / 2, y, p[2] - d / 2]], { c: P.mute, w: 1, dash: [3, 3], a: (a == null ? 1 : a) * .7 }); }
  // a timer: a glass column of height H whose fill rises with frac (0..1); red once it has fired
  function timer(R, p, frac, H, c, a, lab, o) { o = o || {}; if (a <= .01) return; const P = R.P, f = cl(frac, 0, 1), fired = !!o.fired;
    R.box(p, [.34, H, .34], { fill: P.paper, fa: .18, a: a * .9, shadow: false });
    if (f > .004) R.box(p, [.26, Math.max(.01, H * f), .26], { fill: mix(P.paper, fired ? P.bad : c, fired ? .8 : .62), a, shadow: false, lw: .6 });
    if (lab) R.label(up(p, H), lab, { mono: true, fs: 12, dy: -10, c: fired ? P.bad : (o.lc || P.ink), b: fired, a: Math.max(.5, a), grp: o.grp, wide: o.wide }); }
  // a cut: a red cross at p
  function cut(R, p, a, d) { const P = R.P; d = d || .2; if (a <= .01) return;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); }
  const along = (a, b, t) => lerp3(a, b, cl(t, 0, 1));
  // the part of a step's progress e that belongs to the window [a, b]
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  return { up, node, lane, chunk, slot, timer, cut, along, win };
})();
