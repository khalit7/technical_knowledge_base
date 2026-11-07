// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): parties as blocks on the floor, documents, keys and deadlines
// as upright glass plates, requests as flat envelopes whose length is their recorded size, counts as bars on white plinths. ----
window.SAK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a party: a block with its name above it (and an optional second line); o.a fades it when the step is about something else
  function party(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .28 : o.t), a, fa: o.fa });
    if (lab) R.label(up(p, s[1] + (o.ly || 0)), lab, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.35, a), wide: o.wide });
    if (o.sub) R.label(up(p, s[1] + (o.ly || 0)), o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.35, a), wide: 1 }); }
  // an upright glass plate standing at p (bottom centre), facing the camera; label above it
  function plate(R, p, c, a, lab, o) { o = o || {}; if (a <= .01) return; const w = o.w || .62, h = o.h || .78;
    R.glass([p[0] - w / 2, p[1], p[2]], [w, 0, 0], [0, h, 0], { c, nu: o.nu || 2, nv: o.nv || 4, a, th: .03 });
    if (o.glow) R.glow([p[0], p[1] + h / 2, p[2]], .55, { c: o.glow, a: a * .7 });
    if (lab) R.label([p[0], p[1] + h, p[2]], lab, { fs: o.fs || 12, b: 1, c: o.lc || c, dy: -9, a, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx, mono: o.mono }); }
  // a request or reply in flight or at rest: a flat envelope whose length is its size (bytes * k world units)
  function msg(R, p, bytes, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, k = o.k || .012, L = Math.max(.14, bytes * k), d = o.d || .34, h = o.h || .1;
    R.box(p, [L, h, d], { fill: mix(P.paper, c, o.t == null ? .5 : o.t), a, shadow: false, lw: .8 });
    if (o.tag) R.box([p[0] + L / 2 - .09, p[1] + h, p[2]], [.18, .06, d * .8], { fill: mix(P.paper, o.tag, .8), a, shadow: false, lw: .7 });
    if (o.lab) R.label([p[0], p[1] + h, p[2]], o.lab, { fs: o.fs || 12, b: 1, mono: o.mono, c: o.lc || P.ink, dy: o.dy == null ? -12 : o.dy, a, al: o.al, dx: o.dx, grp: o.grp, wide: o.wide }); }
  // a count as a bar on a white plinth, its number above it
  function bar(R, p, n, unit, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .5, d = o.d || .5, h = Math.max(.02, n * unit);
    R.box([p[0], 0, p[2]], [w + .16, .05, d + .16], { a, shadow: false });
    if (n > 0) R.box([p[0], .05, p[2]], [w, h, d], { fill: mix(P.paper, c, .7), a, shadow: false });
    R.label([p[0], .05 + (n > 0 ? h : 0), p[2]], o.lab == null ? String(n) : o.lab, { fs: o.fs || 13, b: 1, c: o.lc || (n ? P.ink : P.mute), dy: -10, a, mono: 1 }); }
  // a refusal or a loss: a cross at p
  function cross(R, p, a, c, d) { const P = R.P; d = d || .2; if (a <= .01) return; c = c || P.bad;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c, w: 3, a, top: 1 }); }
  // a point a fraction t along a polyline, and the part of a step's progress e that belongs to the window [a, b]
  const path = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  // the points of an arc from a to b bowing up by h (for a flow and for the envelope riding it)
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  // a straight path from a to b in n pieces (a flow along a link)
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  // mode chips that swap a stage's step list: el holds <button data-m>, lists are ids prefix+mode
  function chips(el, prefix, st, onMode) { if (!el) return; el.addEventListener('click', ev => { const b = ev.target.closest('button[data-m]'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      el.parentNode.querySelectorAll('ol.sx[id^="' + prefix + '"]').forEach(o => o.hidden = o.id !== prefix + b.dataset.m);
      onMode(b.dataset.m); st.list(prefix + b.dataset.m); }); }
  return { up, party, plate, msg, bar, cross, path, win, arcPts, seg, chips };
})();
