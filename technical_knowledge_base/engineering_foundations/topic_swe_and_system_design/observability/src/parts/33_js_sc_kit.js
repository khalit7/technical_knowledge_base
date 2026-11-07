// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): services as blocks on the floor, signal stores and pipeline
// stages as glass plates, counts as bars on white plinths, and a few path helpers for flows. Everything a scene draws comes from window.DEMO. ----
window.OBS3 = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, so names a close view leaves out would pile up on its edges)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a service or a store: a block with its name above it (and an optional second line)
  function party(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .3 : o.t), a, fa: o.fa });
    if (txt) lab(R, up(p, s[1]), txt, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.35, a), wide: o.wide, grp: o.grp });
    if (o.sub) lab(R, up(p, s[1]), o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.35, a), wide: 1 }); }
  // a flat glass plate on the floor (a signal store): centre c, size w x d
  function floorPlate(R, c, w, d, col, a, o) { o = o || {}; if (a <= .01) return; const y = o.y == null ? .02 : o.y;
    R.glass([c[0] - w / 2, y, c[2] - d / 2], [w, 0, 0], [0, 0, d], { c: col, a, nu: o.nu || 6, nv: o.nv || 4, th: .03 }); }
  // an upright glass plate across a path along x (a pipeline stage), label above it
  function gate(R, x, z, c, a, txt, o) { o = o || {}; if (a <= .01) return; const d = o.d || 1, h = o.h || .9, y0 = o.y0 == null ? .04 : o.y0;
    R.glass([x, y0, z - d / 2], [0, 0, d], [0, h, 0], { c, nu: o.nu || 3, nv: o.nv || 4, a, th: .03 });
    if (o.glow) R.glow([x, y0 + h / 2, z], .6, { c: o.glow, a: a * (o.gl == null ? 1 : o.gl) });
    if (txt) lab(R, [x, y0 + h, z], txt, { fs: o.fs || 12.5, b: 1, c: o.lc || c, dy: o.dy == null ? -10 : o.dy, a: Math.max(o.amin == null ? .3 : o.amin, a), grp: o.grp, wide: o.wide, mono: o.mono }); }
  // a count as a bar on a white plinth, its number above it
  function bar(R, p, n, unit, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .5, d = o.d || .5, h = Math.max(.02, n * unit);
    R.box([p[0], 0, p[2]], [w + .16, .05, d + .16], { a, shadow: false });
    if (n > 0) R.box([p[0], .05, p[2]], [w, h, d], { fill: mix(P.paper, c, .7), a, shadow: false });
    lab(R, [p[0], .05 + (n > 0 ? h : 0), p[2]], o.lab == null ? fmt(n) : o.lab, { fs: o.fs || 13, b: 1, c: o.lc || P.ink, dy: -10, a, mono: 1, grp: o.grp, wide: o.wide });
    if (o.name) lab(R, [p[0], 0, p[2] + d / 2 + .1], o.name, { fs: 12, c: P.mute, dy: 12, a: Math.max(.4, a), wide: o.nwide }); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const poly = (ps, n) => { const o = [ps[0]]; for (let i = 1; i < ps.length; i++) seg(ps[i - 1], ps[i], n || 8).slice(1).forEach(p => o.push(p)); return o; };
  // the point a fraction t along a path
  const along = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  const trace = id => DEMO.traces.find(t => t.id === id);
  const span = (t, name) => t.sp.find(s => s[0] === name);
  // a trace's spans with their nesting depth (parent index in s[2])
  function depths(t) { return t.sp.map(s => { let d = 0, p = s[2]; while (p >= 0) { d++; p = t.sp[p][2]; } return d; }); }
  return { up, fmt, lab, party, floorPlate, gate, bar, win, arcPts, seg, poly, along, trace, span, depths };
})();
