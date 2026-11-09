// ---- Shared pieces of this page's 3D stages (renderer v2, 25_js_s3.js; prefix fm). The space-time box: time runs along the world x axis
// (t = 0 noise on the left, t = 1 data on the right) and every time slice is an upright glass plate holding the 2-D toy plane (toy x along
// world z, toy y up). Every point, path and arrow is computed in the browser by the page's own engine (24_js_fm_field.js: the exact marginal
// field of the ring and the int8 networks of the root's toy runs and of this page's runs); nothing is made up. ----
window.FMK = (function () {
  if (!window.S3 || !window.FMF) return null;
  const F = FMF, s = .33, YC = 1.62, HS = 1.5, T0 = -2.7, T1 = 2.7;
  const TX = t => T0 + (T1 - T0) * t;
  // a toy point p = [x, y] at time t, in world coordinates
  const W = (t, p) => [TX(t), YC + s * p[1], s * p[0]];
  // a glass plate: the toy plane at time t (half-size HS world units, about 4.5 toy units)
  function plate(R, t, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const x = TX(t) + (o.dx || 0);
    R.glass([x, YC - HS, -HS], [0, 0, 2 * HS], [0, 2 * HS, 0], { c: o.c || R.P.acc, a: a * (o.ga == null ? .5 : o.ga), nu: o.nu || 6, nv: o.nv || 6, th: .02 });
    if (o.lab) R.label([x, YC - HS, HS], o.lab, { mono: true, fs: 12, dy: 13, c: o.lc || R.P.mute, a: Math.max(.6, a), grp: o.grp });
  }
  // a cloud of toy points on the plate at time t
  function cloud(R, t, pts, c, a, r) { if (a <= .01) return; pts.forEach(p => R.ball(W(t, p), r || .034, { c, a })); }
  // a path: a list of [t, x, y] points
  const wp = q => W(q[0], [q[1], q[2]]);
  function path(R, q, o) { if (!q || q.length < 2) return; R.line(q.map(wp), o); }
  function flow(R, q, o) { if (!q || q.length < 2) return; R.flow(q.map(wp), o); }
  // a path drawn up to fraction f of its length (for paths being traced during a step)
  function part(q, f) { if (f >= 1) return q; const n = q.length - 1, u = Math.max(0, f) * n, i = Math.floor(u), r = u - i, out = q.slice(0, i + 1);
    if (i < n) out.push(q[i].map((v, j) => v + (q[i + 1][j] - v) * r)); return out; }
  // an arrow lying in the plate at time t, from toy point p along toy vector v
  function arrow(R, t, p, v, o) { o = o || {}; const a = W(t, p), b = W(t, [p[0] + v[0], p[1] + v[1]]); if (Math.hypot(b[1] - a[1], b[2] - a[2]) < .01) return;
    R.line([a, b], { c: o.c, w: o.w || 1.6, a: o.a, head: o.head == null ? 5 : o.head, top: o.top }); }
  // a solve of the page's engine turned into space-time paths: FMF.solve returns n + 1 points per particle at t = k / n
  function paths(model, pts, n, solver, seed) { return F.solve(model, pts, n, solver || 'euler', seed).map(p => p.map((q, k) => [k / (p.length - 1), q[0], q[1]])); }
  const onBlob = q => F.modeOf(q[q.length - 1][1], q[q.length - 1][2]) >= 0;
  const share = ps => ps.filter(onBlob).length;
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, which would pile off-screen ones at the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < 2 || q[0] > R.W - 2 || q[1] < 2 || q[1] > R.H - 2) return; R.label(p, text, o); }
  const win = (e, a, b) => S3.cl((e - a) / (b - a), 0, 1);
  // the floor and the time axis under the plates
  function floor(R, o) { o = o || {}; R.grid(T0 - 1.6, T1 + 1.6, -1.9, 1.9, .5);
    if (o.axis !== false) { R.line([[T0, .01, HS + .35], [T1 + .25, .01, HS + .35]], { c: R.P.mute, w: 1.2, a: .7, head: 6 });
      lab(R, [(T0 + T1) / 2, 0, HS + .35], 'time t →', { mono: true, fs: 12, dy: 12, c: R.P.mute, grp: 'pl' }); } }
  // full view of the whole box; a close view of one plate
  const full = { cam: [-.95, .3], bounds: [[T0 - .3, 0, -HS - .1], [T1 + .3, YC + HS + .05, HS + .4]] };
  const near = (t, o) => { o = o || {}; const x = TX(t); return { cam: o.cam || [-1.05, .22], bounds: [[x - (o.b || .6), YC - HS - .05, -HS - .05], [x + (o.f || .6), YC + HS + .05, HS + .05]] }; };
  // the colours every stage uses: noise teal, data orange, the marginal field and its paths blue, few-step solves purple, networks green
  const col = P => ({ noise: P.c6, data: P.c2, u: P.acc, step: P.c4, net: P.good, mute: P.mute });
  return { s, YC, HS, T0, T1, TX, W, plate, cloud, path, flow, part, arrow, paths, onBlob, share, lab, win, floor, full, near, col };
})();
