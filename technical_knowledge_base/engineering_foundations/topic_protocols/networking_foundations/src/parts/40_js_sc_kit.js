// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): hosts as blocks on the floor, the protocol layers as stacked glass
// plates, the path between two hosts as a glass strip, segments as small blocks whose length can follow their bytes, timers as glass columns. ----
window.NFK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a host or party: a block with its name above it (and an optional second line); o.a fades it when the step is about something else
  function node(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .26 : o.t), a, fa: o.fa });
    if (lab) R.label(up(p, s[1] + (o.ly || 0)), lab, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.45, a), wide: o.wide });
    if (o.sub) R.label(up(p, s[1] + (o.ly || 0)), o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.45, a), wide: o.subWide == null ? 1 : o.subWide }); }
  // a layer: a horizontal glass plate of size w by d, centred on p (its height p[1])
  function layer(R, p, w, d, c, a, lab, o) { o = o || {}; if (a <= .01) return;
    R.glass([p[0] - w / 2, p[1], p[2] - d / 2], [w, 0, 0], [0, 0, d], { c, a, nu: o.nu || 4, nv: o.nv || 2, th: .04 });
    if (lab) R.label([p[0] + (o.lx == null ? -w / 2 : o.lx), p[1], p[2] + d / 2], lab, { fs: 12, b: 1, c: o.lc || c, al: o.al || 'right', dx: o.dx == null ? -6 : o.dx, a: Math.max(.35, a), grp: o.grp, wide: o.wide }); }
  // the path between two hosts: a tinted glass strip on the floor from x0 to x1, centred on z, w wide
  function lane(R, x0, x1, z, w, c, a, o) { o = o || {}; if (a <= .01) return;
    R.glass([x0, .015, z - w / 2], [x1 - x0, 0, 0], [0, 0, w], { c, a, nu: o.nu || 10, nv: o.nv || 1, th: .02 }); }
  // a segment or packet: a small block whose bottom centre is p; s its size
  function chunk(R, p, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, s = o.s || [.3, .2, .3];
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .62 : o.t), a, shadow: false, lw: .8 });
    if (o.lab) R.label(up(p, p[1] + s[1]), o.lab, { fs: o.fs || 12, b: 1, mono: o.mono, c: o.lc || c, dy: o.dy == null ? -10 : o.dy, a, al: o.al, dx: o.dx, grp: o.grp, wide: o.wide }); }
  // an empty slot still to be filled: a dashed outline on a plane at height y
  function slot(R, p, w, d, a) { const P = R.P, y = p[1] + .02;
    R.line([[p[0] - w / 2, y, p[2] - d / 2], [p[0] + w / 2, y, p[2] - d / 2], [p[0] + w / 2, y, p[2] + d / 2], [p[0] - w / 2, y, p[2] + d / 2], [p[0] - w / 2, y, p[2] - d / 2]], { c: P.mute, w: 1, dash: [3, 3], a: (a == null ? 1 : a) * .7 }); }
  // a timer: a glass column of height H whose fill rises with frac (0..1); red once it has fired
  function timer(R, p, frac, H, c, a, lab, o) { o = o || {}; if (a <= .01) return; const P = R.P, f = cl(frac, 0, 1), fired = !!o.fired;
    R.box(p, [.34, H, .34], { fill: P.paper, fa: .18, a: a * .9, shadow: false });
    if (f > .004) R.box(p, [.26, Math.max(.01, H * f), .26], { fill: mix(P.paper, fired ? P.bad : c, fired ? .8 : .62), a, shadow: false, lw: .6 });
    if (lab) R.label(up(p, H), lab, { mono: true, fs: 12, dy: -10, c: fired ? P.bad : (o.lc || P.ink), b: fired, a: Math.max(.5, a), grp: o.grp, wide: o.wide }); }
  // a loss: a red cross at p
  function cut(R, p, a, d) { const P = R.P; d = d || .2; if (a <= .01) return;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); }
  const along = (a, b, t) => lerp3(a, b, cl(t, 0, 1));
  // a point a fraction t along a polyline; the part of a step's progress e that belongs to the window [a, b]; the points of an arc
  const path = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const fmt = (v, d) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  return { up, node, layer, lane, chunk, slot, timer, cut, along, path, win, arcPts, fmt };
})();
