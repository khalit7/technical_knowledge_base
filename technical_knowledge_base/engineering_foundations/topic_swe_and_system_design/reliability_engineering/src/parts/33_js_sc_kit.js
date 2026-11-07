// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): services as blocks on the floor, worker pools as glass plates with one
// slot per worker, queues as stacks, counts as bars on white plinths, and path helpers for flows. Adapted from the sibling Queues page's kit.
// Scenes take their numbers from the page's simulation engine (window.RE, checked against recompute.py) and the measured runs (window.MEAS);
// window.RSN collects the numbers each scene computes so check_stages.mjs can compare them with the step lists. ----
window.RS3 = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, so names a close view leaves out would pile up on its edges)
  // on a phone (canvas under 520 px) only labels marked ph:1 are drawn, the one or two a step is about; the step text names the rest
  function lab(R, p, text, o) { if (text == null || R.W < 520 && !(o && o.ph)) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a service: a block with its name above it (and an optional second line)
  function party(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .3 : o.t), a, fa: o.fa });
    if (txt) lab(R, up(p, s[1]), txt, { b: 1, fs: o.fs || 13, dy: o.dy == null ? -11 : o.dy, c: o.lc || P.ink, a: Math.max(o.amin == null ? .35 : o.amin, a), wide: o.wide, grp: o.grp });
    if (o.sub) lab(R, up(p, s[1]), o.sub, { fs: 12, dy: (o.dy == null ? -11 : o.dy) - 16, c: o.sc || P.mute, a: Math.max(.35, a), wide: 1 }); }
  // a flat glass plate on the floor: centre c, size w (along x) by d (along z)
  function plate(R, c, w, d, col, a, o) { o = o || {}; if (a <= .01) return; const y = o.y == null ? .02 : o.y;
    R.glass([c[0] - w / 2, y, c[2] - d / 2], [w, 0, 0], [0, 0, d], { c: col, a, nu: o.nu || 6, nv: o.nv || 2, th: .03 }); }
  // a worker pool: a glass plate with cols x rows slots; the first `busy` slots are filled (a worker held), the rest stand empty
  function pool(R, c, cols, rows, busy, col, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, g = o.g || .36, w = cols * g + .2, d = rows * g + .2;
    plate(R, c, w, d, o.plate || P.c1, a * .9, { nu: cols, nv: rows });
    for (let i = 0; i < cols * rows; i++) { const cx = c[0] - w / 2 + .1 + g * (i % cols + .5), cz = c[2] - d / 2 + .1 + g * (Math.floor(i / cols) + .5), on = i < busy;
      R.box([cx, .05, cz], [g * .72, on ? .26 : .05, g * .72], { fill: on ? mix(P.paper, col, .75) : mix(P.paper, P.line, .4), a: a * (on ? 1 : .8), shadow: false, lw: .6 }); }
    return { w, d }; }
  // a queue: a stack of thin layers whose height grows with log2(1 + q / 8), its count above it
  function stack(R, p, q, col, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, h = q > 0 ? .25 * Math.log2(1 + q / 8) * (o.k || 1) : 0, n = Math.max(0, Math.round(h / .09));
    R.box([p[0], 0, p[2]], [.72, .05, .72], { a, shadow: false });
    for (let i = 0; i < n; i++) R.box([p[0], .05 + i * .09, p[2]], [.56, .075, .56], { fill: mix(P.paper, col, .55 + .3 * (i / Math.max(1, n))), a, shadow: false, lw: .5 });
    if (o.txt !== null) lab(R, [p[0], .05 + n * .09, p[2]], o.txt || ('queue ' + fmt(q)), { mono: 1, b: 1, fs: 12.5, c: o.lc || P.ink, dy: -11, a: Math.max(.35, a), grp: o.grp, ph: o.ph }); }
  // a count as a bar on a white plinth, its number above it and its name below
  function bar(R, p, n, unit, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .5, d = o.d || .5, h = Math.max(.02, n * unit);
    R.box([p[0], 0, p[2]], [w + .14, .05, d + .14], { a, shadow: false });
    if (n > 0) R.box([p[0], .05, p[2]], [w, h, d], { fill: mix(P.paper, c, .7), a, shadow: false });
    lab(R, [p[0], .05 + (n > 0 ? h : 0), p[2]], o.lab == null ? fmt(n) : o.lab, { fs: o.fs || 13, b: 1, c: o.lc || P.ink, dy: -11, a, mono: 1, wide: o.lwide, ph: o.ph });
    if (o.name) lab(R, [p[0], 0, p[2] + d / 2 + .1], o.name, { fs: 12, c: P.mute, dy: 14, a: Math.max(.4, a), wide: o.nwide }); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const along = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  // the margin every scene uses: room for labels above, smaller on a phone
  const margin = w => w < 520 ? [24, 8, 14, 8] : [36, 18, 22, 18];
  window.RSN = window.RSN || {};
  return { up, fmt, lab, party, plate, pool, stack, bar, win, arcPts, seg, along, margin };
})();
