// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): real 28 x 28 tiles from the page's own sprites
// (window.NM.img: one row of tiles per sprite, written by make_data.py from the recorded runs) drawn as pixel plates,
// token chips, and path helpers for flows. Colours follow the page's legend: text gold (c5), input image blue (c1),
// generated output green (c3), encoder vectors purple (c4), separate models grey. Nothing here invents a number. ----
window.NMK = (function () {
  if (!window.S3 || !window.NM || !NM.img) return null;
  const { mix, lerp3, cl } = S3;
  const PIX = {}, WAIT = {};
  // the grey values (0..255) of tile k of sprite name; cb runs once the sprite has loaded
  function pixels(name, k, cb) {
    const key = name + ':' + k; if (PIX[key]) return PIX[key];
    const uri = NM.img[name]; if (!uri) throw new Error('nm: no sprite ' + name);
    if (!WAIT[name]) { WAIT[name] = { cbs: [], im: new Image() }; const W = WAIT[name];
      W.im.onload = () => { W.ok = true; W.cbs.splice(0).forEach(f => f()); }; W.im.src = uri; }
    const W = WAIT[name], read = () => {
      const c = document.createElement('canvas'); c.width = 28; c.height = 28; const x = c.getContext('2d');
      x.drawImage(W.im, k * 28, 0, 28, 28, 0, 0, 28, 28);
      const d = x.getImageData(0, 0, 28, 28).data, g = new Uint8Array(784); for (let i = 0; i < 784; i++) g[i] = d[i * 4];
      PIX[key] = { w: 28, g };
    };
    if (W.ok) { read(); return PIX[key]; }
    W.cbs.push(() => { read(); if (cb) cb(); }); return null;
  }
  // a tile standing upright and facing the camera (+z): bottom centre c, side s; o.tint maps grey to a colour (an illustrative recolouring)
  function tileUp(R, c, s, px, a, o) {
    o = o || {}; if (a <= .01) return; const P = R.P, y0 = c[1], x0 = c[0] - s / 2, z = c[2];
    R.quad([[x0 - .06, y0 - .06, z - .012], [x0 + s + .06, y0 - .06, z - .012], [x0 + s + .06, y0 + s + .06, z - .012], [x0 - .06, y0 + s + .06, z - .012]], { fill: P.paper, a, ec: P.edge });
    R.quad([[x0, y0, z], [x0 + s, y0, z], [x0 + s, y0 + s, z], [x0, y0 + s, z]], { fill: [0, 0, 0], a, edge: false, dz: -.3 });
    if (!px) return; const n = px.w, d = s / n, g = px.g, tint = o.tint;
    for (let r = 0; r < n; r++) { let j = 0; while (j < n) { const v = g[r * n + j]; let e = j + 1; while (e < n && Math.abs(g[r * n + e] - v) < 6) e++;
      if (v > 10) { const xa = x0 + j * d, xb = x0 + e * d, yt = y0 + s - r * d, yb = yt - d, f = tint ? mix([0, 0, 0], tint, v / 255) : [v, v, v];
        R.quad([[xa, yb, z + .002], [xb, yb, z + .002], [xb, yt, z + .002], [xa, yt, z + .002]], { fill: f, a, edge: false, dz: -.6 }); }
      j = e; } }
  }
  // a tile lying flat on the floor (x-z plane), centre c, side s
  function tileFlat(R, c, s, px, a) {
    if (a <= .01) return; const P = R.P, y = (c[1] || 0) + .03;
    R.box([c[0], c[1] || 0, c[2]], [s + .12, .03, s + .12], { a, fill: P.paper, shadow: !(c[1] > .05) });
    R.quad([[c[0] - s / 2, y + .002, c[2] - s / 2], [c[0] + s / 2, y + .002, c[2] - s / 2], [c[0] + s / 2, y + .002, c[2] + s / 2], [c[0] - s / 2, y + .002, c[2] + s / 2]], { fill: [0, 0, 0], a, edge: false, dz: -.3 });
    if (!px) return; const n = px.w, d = s / n, g = px.g;
    for (let r = 0; r < n; r++) { let j = 0; while (j < n) { const v = g[r * n + j]; let e = j + 1; while (e < n && Math.abs(g[r * n + e] - v) < 6) e++;
      if (v > 10) { const x0 = c[0] - s / 2 + j * d, x1 = c[0] - s / 2 + e * d, z0 = c[2] - s / 2 + r * d, z1 = z0 + d;
        R.quad([[x0, y + .004, z0], [x1, y + .004, z0], [x1, y + .004, z1], [x0, y + .004, z1]], { fill: [v, v, v], a, edge: false, dz: -.6 }); }
      j = e; } }
  }
  // a token: a small block on the floor (or at height c[1]) with its text above it
  function chip(R, c, text, col, a, o) {
    o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .62, h = o.h || .16, d = o.d || .4;
    R.box(c, [w, h, d], { fill: mix(P.paper, col, o.k == null ? .55 : o.k), a, shadow: o.shadow, lw: .8 });
    if (text != null && !o.nolab) lab(R, [c[0], c[1] + h, c[2]], text, { mono: 1, fs: o.fs || 12, c: o.tc || P.ink, dy: o.dy == null ? -10 : o.dy, a, b: o.b, wide: o.wide });
  }
  // a label only when its anchor is on the canvas
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const f0 = v => Math.round(v).toLocaleString('en-GB');
  const mf = v => (v / 1e6).toFixed(0) + ' MFLOP', gf = v => (v / 1e9).toFixed(2) + ' GFLOP';
  const margin = w => w < 520 ? [24, 8, 14, 8] : [34, 18, 22, 18];
  const CL = ['T-shirt', 'trouser', 'pullover', 'dress', 'coat', 'sandal', 'shirt', 'sneaker', 'bag', 'ankle boot'];
  return { pixels, tileUp, tileFlat, chip, lab, arcPts, seg, win, f0, mf, gf, margin, CL, mix };
})();
