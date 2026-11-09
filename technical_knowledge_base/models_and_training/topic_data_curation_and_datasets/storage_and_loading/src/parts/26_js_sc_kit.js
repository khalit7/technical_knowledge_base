// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): files and windows as glass plates, documents and tokens as blocks,
// counts as bars on white plinths, systems (ranks, workers, a reader) as blocks with a name, and path helpers for flows.
// Every number a scene draws comes from window.SL (data/sl_data.json, built by recompute.py from the page's measured runs); see each scene's header. ----
window.SLK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const f0 = v => Math.round(v).toLocaleString('en-US');
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, so names a close view leaves out would pile up on its edges)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a flat glass plate on the floor (a file, a window, a buffer): centre c, size w (along x) by d (along z)
  function plate(R, c, w, d, col, a, o) { o = o || {}; if (a <= .01) return; const y = o.y == null ? .02 : o.y;
    R.glass([c[0] - w / 2, y, c[2] - d / 2], [w, 0, 0], [0, 0, d], { c: col, a, nu: o.nu || 6, nv: o.nv || 1, th: o.th == null ? .03 : o.th }); }
  // a system: a block with its name above it
  function party(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .3 : o.t), a, fa: o.fa, shadow: o.shadow });
    if (txt) lab(R, [p[0], p[1] + s[1], p[2]], txt, { b: 1, fs: o.fs || 13, dy: o.dy == null ? -11 : o.dy, c: o.lc || P.ink, a: Math.max(o.amin == null ? .35 : o.amin, a), wide: o.wide, grp: o.grp, mono: o.mono, al: o.al, dx: o.dx }); }
  // a count as a bar on a white plinth, its value above it and its name below
  function bar(R, p, v, unit, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .5, d = o.d || .5, h = Math.max(.02, v * unit);
    R.box([p[0], 0, p[2]], [w + .14, .045, d + .14], { a, shadow: false });
    R.box([p[0], .045, p[2]], [w, h * (o.grow == null ? 1 : o.grow), d], { fill: mix(P.paper, c, o.t == null ? .7 : o.t), a, shadow: false });
    if (o.val) lab(R, [p[0], .045 + h * (o.grow == null ? 1 : o.grow), p[2]], o.val, { fs: o.fs || 12.5, b: 1, c: o.lc || P.ink, dy: -11, a: Math.max(.3, a), mono: 1, grp: o.vgrp, wide: o.vwide });
    if (o.name) lab(R, [p[0], 0, p[2] + d / 2 + .08], o.name, { fs: 12, c: o.nc || P.mute, dy: 14, a: Math.max(.4, a), wide: o.nwide, grp: o.ngrp }); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const along = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  // twelve calm categorical colours (Tableau 10 and two mixes), resolved per theme from the palette
  const CAT = P => [P.c1, P.c2, P.c3, P.c4, P.c5, P.c6, mix(P.c1, P.c3, .5), mix(P.c2, P.c4, .5), mix(P.c5, P.c6, .5), mix(P.c4, P.c6, .5), mix(P.c1, P.c2, .5), mix(P.c3, P.c5, .5)];
  // the margin every scene uses: room for labels above, smaller on a phone
  const margin = w => w < 520 ? [22, 8, 14, 8] : [34, 18, 22, 18];
  return { f0, lab, plate, party, bar, win, arcPts, seg, along, CAT, margin };
})();
