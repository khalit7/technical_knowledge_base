// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): parties as blocks on the floor, documents and credentials as upright
// glass plates, JSON-RPC messages as small envelopes (length to scale with their recorded bytes) that ride the flows between parties. ----
window.MCK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a party: a block with its name above it (and an optional second line); o.a fades it when the step is about something else
  function party(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .28 : o.t), a, fa: o.fa });
    if (lab) R.label(up(p, s[1] + (o.ly || 0)), lab, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.4, a), wide: o.wide });
    if (o.sub) R.label(up(p, s[1] + (o.ly || 0)), o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.4, a), wide: 1 }); }
  // a document or credential: an upright glass plate standing at p (bottom centre), facing the camera; label above it
  function plate(R, p, c, a, lab, o) { o = o || {}; if (a <= .01) return; const w = o.w || .62, h = o.h || .78;
    R.glass([p[0] - w / 2, p[1], p[2]], [w, 0, 0], [0, h, 0], { c, nu: o.nu || 2, nv: o.nv || 4, a, th: .03 });
    if (o.glow) R.glow([p[0], p[1] + h / 2, p[2]], .55, { c: o.glow, a: a * .7 });
    if (lab) R.label([p[0], p[1] + h, p[2]], lab, { fs: o.fs || 12, b: 1, c: o.lc || c, dy: -9, a, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx, mono: o.mono }); }
  // a JSON-RPC message in flight or at rest: a flat envelope whose length is its recorded size (bytes * k world units); the _meta part tinted
  function msg(R, p, bytes, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, k = o.k || .0011, L = Math.max(.12, bytes * k), d = o.d || .32, h = o.h || .1;
    const meta = o.meta ? Math.min(L, o.meta * k) : 0, x0 = p[0] - L / 2;
    if (meta > 0) { R.box([x0 + (L - meta) / 2, p[1], p[2]], [L - meta, h, d], { fill: mix(P.paper, c, .45), a, shadow: false, lw: .8 });
      R.box([x0 + L - meta / 2, p[1], p[2]], [meta, h, d], { fill: mix(P.paper, P.acc, .85), a, shadow: false, lw: .8 }); }
    else R.box(p, [L, h, d], { fill: mix(P.paper, c, o.t == null ? .45 : o.t), a, shadow: false, lw: .8 });
    if (o.lab) R.label([p[0], p[1] + h, p[2]], o.lab, { fs: o.fs || 12, b: 1, mono: o.mono, c: o.lc || P.ink, dy: o.dy == null ? -12 : o.dy, a, al: o.al, dx: o.dx, grp: o.grp, wide: o.wide }); }
  // a refusal: a red cross at p
  function refuse(R, p, a, d) { const P = R.P; d = d || .22; if (a <= .01) return;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); }
  // a point a fraction t along a polyline, and the part of a step's progress e that belongs to the window [a, b]
  const path = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  // the points of an arc from a to b bowing up by h (for a flow and for the envelope riding it)
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  return { up, party, plate, msg, refuse, path, win, arcPts };
})();
