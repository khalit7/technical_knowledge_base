// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): parties as blocks on the floor, people, and credentials
// (tokens, codes, certificates, keys) as upright glass plates that travel along the flows between parties. ----
window.AUK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a point a fraction t along a polyline
  const path = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  // the same along an arc from a to b bowing up by h
  const arcAt = (R, a, b, h, t) => R.arcPt(a, b, h, cl(t, 0, 1));
  // a party: a block with its name above it; o.a fades it when the step is about something else
  function party(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .28 : o.t), a });
    if (lab) R.label(up(p, s[1]), lab, { b: 1, fs: o.fs || 13, dy: -10, c: o.lc || P.ink, a: Math.max(.4, a) }); }
  // a person: a short column with a head
  function person(R, p, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, [.42, .62, .42], { fill: mix(P.paper, c, .4), a }); R.ball(up(p, .8), .17, { c: mix(P.paper, c, .55), a });
    if (lab) R.label(up(p, 1.0), lab, { b: 1, fs: 12.5, dy: -8, c: o.lc || P.ink, a: Math.max(.4, a) }); }
  // a credential: an upright glass plate standing at p (bottom centre); its label above it
  function tok(R, p, c, a, lab, o) { o = o || {}; if (a <= .01) return; const w = o.w || .62, h = o.h || .78;
    R.glass([p[0] - w / 2, p[1], p[2]], [w, 0, 0], [0, h, 0], { c, nu: o.nu || 2, nv: o.nv || 4, a, th: .03 });
    if (o.glow) R.glow([p[0], p[1] + h / 2, p[2]], .55, { c: o.glow, a: a * .7 });
    if (lab) R.label([p[0], p[1] + h, p[2]], lab, { fs: o.fs || 12, b: 1, c: o.lc || c, dy: -8, a, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx }); }
  // a crossed-out mark: a refusal at p
  function refuse(R, p, a) { const P = R.P, d = .22; if (a <= .01) return;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); }
  return { up, path, arcAt, party, person, tok, refuse };
})();
