// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): labels drawn only while their anchor is on the canvas, blocks with a name,
// flat glass plates, path helpers for flows. Scenes take every number from window.TQ (the recorded runs, built by gen_data.py) and TQ.calc
// (derived in 40_js_read.js, checked against recompute.py); window.TQN collects what each scene computes so check_stages.mjs can compare it
// with the step lists. ----
window.TQK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a label only when its anchor is on the canvas; on a phone (canvas under 520 px) only labels marked ph:1 are drawn, the step text names the rest
  function lab(R, p, text, o) { o = o || {}; if (text == null || R.W < 520 && !o.ph) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a block standing on the floor (or at p[1]) with its name above it
  function block(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .3 : o.t), a, fa: o.fa, shadow: o.shadow });
    if (txt) lab(R, up(p, p[1] + s[1]), txt, { b: 1, mono: o.mono, fs: o.fs || 12.5, dy: o.dy == null ? -11 : o.dy, dx: o.dx, al: o.al, c: o.lc || P.ink, a: Math.max(o.amin == null ? .35 : o.amin, a), ph: o.ph }); }
  // a flat glass plate at height y: centre c (x, z), size w along x by d along z
  function plate(R, x, y, z, w, d, col, a, o) { o = o || {}; if (a <= .01) return;
    R.glass([x - w / 2, y, z - d / 2], [w, 0, 0], [0, 0, d], { c: col, a, nu: o.nu || 6, nv: o.nv || 3, th: o.th == null ? .03 : o.th }); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const poly = (ps, n) => { const o = [ps[0]]; for (let i = 1; i < ps.length; i++) seg(ps[i - 1], ps[i], n || 8).slice(1).forEach(p => o.push(p)); return o; };
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  // the part of a path a moving thing has covered by t in [0,1] (a ball rising to where it is caught)
  const along = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  window.TQN = window.TQN || {};
  return { up, lab, block, plate, win, seg, poly, arcPts, along, margin };
})();
