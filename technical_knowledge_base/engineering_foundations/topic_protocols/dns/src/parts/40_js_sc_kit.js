// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): servers as blocks on the floor, a cache as a stack of entry slabs
// whose length is the share of its TTL still left, and DNS messages as small glass plates riding the flows between parties. ----
window.DNK = (function () {
  if (!window.S3) return null;
  const { mix, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a party: a block with its name above it (o.sub: a second, muted line); o.a fades it when the step is about something else
  function party(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .28 : o.t), a });
    if (o.dead) { const y = s[1] + .02, d = Math.min(s[0], s[2]) * .38; R.line([[p[0] - d, y, p[2] - d], [p[0] + d, y, p[2] + d]], { c: P.bad, w: 3, a }); R.line([[p[0] - d, y, p[2] + d], [p[0] + d, y, p[2] - d]], { c: P.bad, w: 3, a }); }
    if (lab) R.label(up(p, s[1]), lab, { b: 1, fs: o.fs || 13, dy: o.sub ? -24 : -10, c: o.lc || P.ink, a: Math.max(.45, a) });
    if (o.sub) R.label(up(p, s[1]), o.sub, { fs: 12, dy: -9, c: P.mute, a: Math.max(.45, a), wide: o.subWide }); }
  // a cache entry: a slab lying on top of a resolver at height y; its length is the share of the TTL left (frac), the full length drawn faintly
  function entry(R, p, y, len, frac, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a; if (a <= .01) return;
    const f = cl(frac, 0, 1), d = o.d || .62, h = o.h || .13, x0 = p[0] - len / 2;
    R.box([p[0], y, p[2]], [len, h * .5, d], { fill: P.paper, a: a * .35, shadow: false, lw: .6 });
    if (f > .003) R.box([x0 + len * f / 2, y, p[2]], [len * f, h, d], { fill: mix(P.paper, c, .55), a, shadow: false });
    if (lab) R.label([x0 + len + .08, y + h / 2, p[2]], lab, { al: 'left', dx: 6, fs: 12, mono: true, b: o.b, c: o.lc || P.ink, a, grp: o.grp, wide: o.wide }); }
  // a message: a small upright glass plate at p (bottom centre)
  function msg(R, p, c, a, lab, o) { o = o || {}; if (a <= .01) return; const w = o.w || .46, h = o.h || .5;
    R.glass([p[0] - w / 2, p[1], p[2]], [w, 0, 0], [0, h, 0], { c, nu: 2, nv: 3, a, th: .03 });
    if (lab) R.label([p[0], p[1] + h, p[2]], lab, { fs: o.fs || 12, mono: o.mono !== false, b: 1, c: o.lc || c, dy: -9, a, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx }); }
  // a crossed-out mark
  function refuse(R, p, a) { const P = R.P, d = .2; if (a <= .01) return;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c: P.bad, w: 3, a, top: 1 }); }
  // one exchange between two anchors during a step: the question rides out in the first half of e, the reply back in the second
  function exchange(R, a, b, h, e, cq, cr, labQ, labR, o) { o = o || {};
    const goOut = e < .5, t = goOut ? e * 2 : (e - .5) * 2;
    R.flowArc(a, b, h, { c: cq, r: .06, n: 7, speed: 1.4, a: goOut ? 1 : .35 });
    if (!goOut) R.flowArc(b, a, h * .8, { c: cr, r: .065, n: 7, speed: 1.4 });
    const p = goOut ? R.arcPt(a, b, h, t) : R.arcPt(b, a, h * .8, t);
    if (goOut || t < .98) msg(R, [p[0], Math.max(0, p[1] - .25), p[2]], goOut ? cq : cr, 1, goOut ? labQ : labR, o);
    return goOut; }
  return { up, party, entry, msg, refuse, exchange };
})();
