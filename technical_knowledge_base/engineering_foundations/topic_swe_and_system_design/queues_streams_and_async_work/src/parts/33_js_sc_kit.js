// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): systems as blocks on the floor, queues, logs and tables as glass
// plates, messages as small boxes standing on them, counts as bars on white plinths, and path helpers for flows. Scenes take their numbers from
// the measured lab (window.LABDATA), the Queue lab's simulator (window.QSIM) and Kafka's partitioner (window.KMURMUR); see each scene's header. ----
window.QS3 = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, so names a close view leaves out would pile up on its edges)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a system: a block with its name above it (and an optional second line)
  function party(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .3 : o.t), a, fa: o.fa });
    if (txt) lab(R, up(p, s[1]), txt, { b: 1, fs: o.fs || 13, dy: o.dy == null ? -11 : o.dy, c: o.lc || P.ink, a: Math.max(o.amin == null ? .35 : o.amin, a), wide: o.wide, grp: o.grp });
    if (o.sub) lab(R, up(p, s[1]), o.sub, { fs: 12, dy: (o.dy == null ? -11 : o.dy) - 16, c: o.sc || P.mute, a: Math.max(.35, a), wide: 1 }); }
  // a flat glass plate on the floor (a queue, a log, a table): centre c, size w (along x) by d (along z)
  function plate(R, c, w, d, col, a, o) { o = o || {}; if (a <= .01) return; const y = o.y == null ? .02 : o.y;
    R.glass([c[0] - w / 2, y, c[2] - d / 2], [w, 0, 0], [0, 0, d], { c: col, a, nu: o.nu || 6, nv: o.nv || 2, th: .03 }); }
  // a message: a small box standing on a plate, optionally labelled on its top
  function msg(R, p, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, s = o.s || [.5, .22, .5], y = p[1] == null ? .05 : p[1];
    R.box([p[0], y, p[2]], s, { fill: mix(P.paper, c, o.t == null ? .7 : o.t), a, shadow: false, lw: .7, fa: o.fa });
    if (o.txt) lab(R, [p[0], y + s[1], p[2]], o.txt, { mono: 1, fs: 12, b: o.b, c: o.lc || P.ink, al: o.al, dx: o.al === 'left' ? 16 : 0, dy: o.ldy == null ? (o.al === 'left' ? -4 : -9) : o.ldy, a: Math.max(.3, a), grp: o.grp, wide: o.wide }); }
  // a count as a bar on a white plinth, its number above it and its name below
  function bar(R, p, n, unit, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .6, d = o.d || .6, h = Math.max(.02, n * unit);
    R.box([p[0], 0, p[2]], [w + .16, .05, d + .16], { a, shadow: false });
    if (n > 0) R.box([p[0], .05, p[2]], [w, h, d], { fill: mix(P.paper, c, .7), a, shadow: false });
    lab(R, [p[0], .05 + (n > 0 ? h : 0), p[2]], o.lab == null ? fmt(n) : o.lab, { fs: o.fs || 13, b: 1, c: o.lc || P.ink, dy: -11, a, mono: 1, wide: o.lwide });
    if (o.name) lab(R, [p[0], 0, p[2] + d / 2 + .1], o.name, { fs: 12, c: P.mute, dy: 14, a: Math.max(.4, a), wide: o.nwide }); }
  // a crash mark: red glow on a block, and a label
  function crash(R, p, h, a, txt) { if (a <= .01) return; const P = R.P; R.glow([p[0], h * .6, p[2]], .9, { c: P.bad, a: .6 * a }); if (txt !== null) lab(R, [p[0], h, p[2]], txt || '✕ crash', { b: 1, fs: 13, c: P.bad, dy: -28, a }); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const along = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  // the margin every scene uses: room for labels above, smaller on a phone
  const margin = w => w < 520 ? [22, 8, 14, 8] : [34, 18, 22, 18];
  return { up, fmt, lab, party, plate, msg, bar, crash, win, arcPts, seg, along, margin };
})();
