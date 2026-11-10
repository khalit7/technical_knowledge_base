// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-10. Every number a scene draws comes from the page's data:
// window.TZS (the trained tiny GPT traced on the running sequence's token "o" at position 157, 26_js_tz_scene.js), window.TZD (the page's runs and
// the running sequence's tokens, 22_js_tz_0data.js); anything not to scale is said so in the figure's caption and its steps. ----
window.TZK = (function () {
  if (!window.S3 || !window.TZS || !window.TZD) return null;
  const { lerp, cl, mix } = S3;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone a third of the way through a transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 3 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const f2 = v => v.toFixed(2), pct = v => (v * 100).toFixed(v >= .1 ? 0 : 1) + '%';
  // a vector as signed bars on a white plinth (positive up, negative hanging below), along x (dir 'x') or along z (dir 'z');
  // c: centre of the plinth's top, wd: its length, m: the value drawn at hmax (each vector is drawn to its own scale unless m is shared)
  function comb(R, c, vals, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P, n = vals.length, wd = o.wd || 2, hmax = o.h || .5, dz = o.dir === 'z';
    const m = o.m || Math.max(1e-9, ...vals.map(Math.abs)), bw = wd / n, dep = o.dep || .12, col = o.c || P.paper;
    if (o.plinth !== false) R.box([c[0], c[1] - .04, c[2]], dz ? [dep + .1, .04, wd + .1] : [wd + .1, .04, dep + .1], { a, shadow: false, fill: o.pc || P.paper });
    if (o.legs && c[1] > .12) [-1, 1].forEach(s => R.box(dz ? [c[0], 0, c[2] + s * wd / 2] : [c[0] + s * wd / 2, 0, c[2]], [.025, c[1] - .05, .025], { a: a * .8, shadow: false }));
    const fill = Array.isArray(col) || typeof col === 'string' ? col : null;
    for (let i = 0; i < n; i++) {
      const v = vals[i], h = Math.max(.008, Math.min(1.4, Math.abs(v) / m) * hmax), off = -wd / 2 + bw * (i + .5);
      const p = dz ? [c[0], v >= 0 ? c[1] : c[1] - .04 - h, c[2] + off] : [c[0] + off, v >= 0 ? c[1] : c[1] - .04 - h, c[2]];
      R.box(p, dz ? [dep, h, bw * .78] : [bw * .78, h, dep], { fill: fill || col(i), a, shadow: false, lw: n > 64 ? .25 : .6, ea: n > 64 ? .25 : undefined });
    }
  }
  // a field of thin upright bars (a row of attention weights or probabilities): flat quads facing the viewer, cheaper than boxes when there are hundreds
  function bars(R, x0, dx, z, y0, hs, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const w = (o.w || .8) * dx / 2;
    hs.forEach((h, j) => { if (h < (o.min || .004)) return; const x = x0 + j * dx; R.quad([[x - w, y0, z], [x + w, y0, z], [x + w, y0 + h, z], [x - w, y0 + h, z]], { fill: typeof o.c === 'function' ? o.c(j) : o.c, a, ea: .3, lw: .4 }); });
  }
  // a token as a white tile with its text
  function tile(R, c, text, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const w = o.w || .8;
    R.box(c, [w, o.h || .1, o.d || .42], { a, fill: o.fill || R.P.paper, shadow: o.shadow });
    if (text != null) lab(R, [c[0], c[1] + (o.h || .1), c[2] + (o.d || .42) / 2], text, { serif: true, fs: o.fs || 13, dy: o.dy == null ? 11 : o.dy, a: Math.max(a, o.la || 0), c: o.tc, b: o.b, grp: o.grp });
  }
  // an outline box: the edges of a box with no faces
  function frame(R, c, s, o) {
    o = o || {}; const x0 = c[0] - s[0] / 2, x1 = c[0] + s[0] / 2, y0 = c[1], y1 = c[1] + s[1], z0 = c[2] - s[2] / 2, z1 = c[2] + s[2] / 2, P = { c: o.c, w: o.w || 1.1, a: o.a == null ? 1 : o.a, dash: o.dash };
    [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y0, z0]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [x0, y1, z0]],
      [[x0, y0, z0], [x0, y1, z0]], [[x1, y0, z0], [x1, y1, z0]], [[x1, y0, z1], [x1, y1, z1]], [[x0, y0, z1], [x0, y1, z1]]].forEach(pts => R.line(pts, P));
  }
  // a weight matrix standing across a path that runs along x (rows up, columns along z), or across one along z
  function plateX(R, x, y0, z, w, h, o) { o = o || {}; R.glass([x, y0, z - w / 2], [0, 0, w], [0, h, 0], { c: o.c, a: o.a == null ? 1 : o.a, nu: o.nu || 6, nv: o.nv || 6 }); }
  function plateZ(R, x, y0, z, w, h, o) { o = o || {}; R.glass([x - w / 2, y0, z], [w, 0, 0], [0, h, 0], { c: o.c, a: o.a == null ? 1 : o.a, nu: o.nu || 6, nv: o.nv || 6 }); }
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  // the eight heads: a muted Tableau set
  const HC = ['#4e79a7', '#f28e2b', '#59a14f', '#b07aa1', '#d4a72c', '#76b7b2', '#e15759', '#9c755f'].map(S3.rgb);
  const piece = i => i === 0 ? '<|endoftext|>' : (TZD.pieces[i] || '').replace(/\n/g, '↵');
  const show = i => '"' + piece(i).replace(/^ /, '␣') + '"';
  return { tw, la, lab, f2, pct, comb, bars, tile, frame, plateX, plateZ, margin, HC, piece, show, cl, lerp, mix };
})();
