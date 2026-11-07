// ---- Shared pieces for this page's 3D scenes (renderer v2, 28_js_s3.js): labels hidden when their anchor leaves the canvas, a count as a bar
// on a white plinth, a request as a small cube, straight and arched paths for flows. Every number a scene draws comes from window.CPD (the
// page's measured runs and recompute_out.json, written by gen_data.py) or from window.CP (the page's model, checked against model.py). ----
window.CPK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, so a close view would pile them up at the edges)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a party: a block with its name above it and an optional second line
  function party(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .3 : o.t), a, fa: o.fa });
    if (txt) lab(R, [p[0], s[1] + (o.ly || 0), p[2]], txt, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.35, a), wide: o.wide, al: o.al, dx: o.dx });
    if (o.sub) lab(R, [p[0], s[1] + (o.ly || 0), p[2]], o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.35, a), wide: 1, al: o.al, dx: o.dx }); }
  // a value as a bar on a white plinth, with its label above
  function bar(R, p, h, c, a, text, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .5, d = o.d || .5;
    R.box([p[0], 0, p[2]], [w + .16, .05, d + .16], { a, shadow: false });
    if (h > .001) R.box([p[0], .05, p[2]], [w, h, d], { fill: mix(P.paper, c, o.t == null ? .75 : o.t), a, shadow: false });
    if (text != null) lab(R, [p[0], .05 + Math.max(0, h), p[2]], text, { fs: o.fs || 12.5, b: 1, c: o.lc || P.ink, dy: o.dy == null ? -14 : o.dy, a: Math.max(.3, a), mono: o.mono, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx }); }
  // a request: a small cube
  function req(R, p, c, a, s) { s = s || .17; if (a <= .01) return; R.box(p, [s, s, s], { fill: c, a, shadow: false, lw: .6 }); }
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const poly = (ps, n) => { const o = [ps[0]]; for (let i = 1; i < ps.length; i++) seg(ps[i - 1], ps[i], n || 8).slice(1).forEach(p => o.push(p)); return o; };
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const fmt = v => Math.round(v).toLocaleString('en-US');
  return { lab, party, bar, req, seg, poly, arcPts, win, fmt };
})();
