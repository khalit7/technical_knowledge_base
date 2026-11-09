// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): real 28 x 28 tiles from the page's sprites as pixel plates,
// vectors as signed bars on white plinths, labels only when their anchor is on the canvas, and path helpers for flows.
// Tiles come from window.AVL.img (the root Latent lab's recorded reconstructions, absorbed by absorb_lab.py); nothing here invents a number. ----
window.AVK = (function () {
  if (!window.S3 || !window.AVL) return null;
  const { mix, lerp3, cl } = S3;
  const PIX = {}, WAIT = {};
  // the grey values (0..255) of tile k of sprite name, read once from the sprite's PNG; cb runs when they are ready
  function pixels(name, k, cb) {
    const key = name + ':' + k; if (PIX[key]) return PIX[key];
    const s = AVL.img[name]; if (!s) throw new Error('av: no sprite ' + name);
    if (!WAIT[name]) {
      WAIT[name] = { cbs: [], im: new Image() }; const W = WAIT[name];
      W.im.onload = () => { W.ok = true; W.cbs.splice(0).forEach(f => f()); }; W.im.src = s.uri;
    }
    const W = WAIT[name], read = () => {
      const c = document.createElement('canvas'); c.width = s.w; c.height = s.w; const x = c.getContext('2d');
      x.drawImage(W.im, (k % s.cols) * s.w, Math.floor(k / s.cols) * s.w, s.w, s.w, 0, 0, s.w, s.w);
      const d = x.getImageData(0, 0, s.w, s.w).data, g = new Uint8Array(s.w * s.w); for (let i = 0; i < g.length; i++) g[i] = d[i * 4];
      PIX[key] = { w: s.w, g };
    };
    if (W.ok) { read(); return PIX[key]; }
    W.cbs.push(() => { read(); if (cb) cb(); }); return null;
  }
  // a tile lying flat on the floor (x-z plane), centre c, side s; horizontal runs of one grey are merged into one quad
  function tileFlat(R, c, s, px, a, o) {
    o = o || {}; if (a <= .01) return; const P = R.P, y = o.y == null ? .025 : o.y;
    R.box([c[0], 0, c[2]], [s + .12, y, s + .12], { a, shadow: o.shadow !== false, fill: P.paper });
    if (!px) { R.quad([[c[0] - s / 2, y + .002, c[2] - s / 2], [c[0] + s / 2, y + .002, c[2] - s / 2], [c[0] + s / 2, y + .002, c[2] + s / 2], [c[0] - s / 2, y + .002, c[2] + s / 2]], { fill: [24, 24, 24], a, edge: false, dz: -.3 }); return; }
    const n = px.w, d = s / n, g = px.g;
    R.quad([[c[0] - s / 2, y + .002, c[2] - s / 2], [c[0] + s / 2, y + .002, c[2] - s / 2], [c[0] + s / 2, y + .002, c[2] + s / 2], [c[0] - s / 2, y + .002, c[2] + s / 2]], { fill: [0, 0, 0], a, edge: false, dz: -.3 });
    for (let r = 0; r < n; r++) { let j = 0; while (j < n) { const v = g[r * n + j]; let e = j + 1; while (e < n && g[r * n + e] === v) e++;
      if (v > 8) { const x0 = c[0] - s / 2 + j * d, x1 = c[0] - s / 2 + e * d, z0 = c[2] - s / 2 + r * d, z1 = z0 + d;
        R.quad([[x0, y + .004, z0], [x1, y + .004, z0], [x1, y + .004, z1], [x0, y + .004, z1]], { fill: [v, v, v], a, edge: false, dz: -.6 }); }
      j = e; } }
  }
  // a tile standing upright, facing +z (the camera's side): bottom centre c, side s
  function tileUp(R, c, s, px, a) {
    if (a <= .01) return; const P = R.P; const y0 = c[1], x0 = c[0] - s / 2;
    R.quad([[x0 - .05, y0 - .05, c[2] - .01], [x0 + s + .05, y0 - .05, c[2] - .01], [x0 + s + .05, y0 + s + .05, c[2] - .01], [x0 - .05, y0 + s + .05, c[2] - .01]], { fill: P.paper, a, ec: P.edge });
    R.quad([[x0, y0, c[2]], [x0 + s, y0, c[2]], [x0 + s, y0 + s, c[2]], [x0, y0 + s, c[2]]], { fill: [0, 0, 0], a, edge: false, dz: -.3 });
    if (!px) return; const n = px.w, d = s / n, g = px.g;
    for (let r = 0; r < n; r++) { let j = 0; while (j < n) { const v = g[r * n + j]; let e = j + 1; while (e < n && g[r * n + e] === v) e++;
      if (v > 8) { const xa = x0 + j * d, xb = x0 + e * d, yt = y0 + s - r * d, yb = yt - d;
        R.quad([[xa, yb, c[2] + .002], [xb, yb, c[2] + .002], [xb, yt, c[2] + .002], [xa, yt, c[2] + .002]], { fill: [v, v, v], a, edge: false, dz: -.6 }); }
      j = e; } }
  }
  // a vector as signed bars on a white plinth along x (positive up, negative hanging below the plinth)
  function bars(R, c, vals, m, col, a, o) {
    o = o || {}; if (a <= .01) return; const P = R.P, n = vals.length, wd = o.w || 1.6, bw = wd / n, hmax = o.h || .5, dd = o.d || .12, grow = o.grow == null ? 1 : o.grow;
    R.box([c[0], c[1] - .045, c[2]], [wd + .14, .045, dd + .22], { a, shadow: false });
    if (c[1] > .12 && o.legs !== false) [-1, 1].forEach(sx => R.box([c[0] + sx * (wd / 2), 0, c[2]], [.03, c[1] - .05, .03], { a: a * .9 }));
    vals.forEach((v, i) => { const hgt = Math.max(.012, Math.abs(v) / m * hmax * grow), bx = c[0] - wd / 2 + bw * (i + .5);
      R.box([bx, v >= 0 ? c[1] : c[1] - .045 - hgt, c[2]], [bw * .7, hgt, dd], { fill: Array.isArray(col) && Array.isArray(col[0]) ? col[i] : col, a: a * (o.fade ? o.fade(i) : 1), shadow: false, lw: .7 }); });
  }
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const f0 = v => Math.round(v).toLocaleString('en-GB');
  // the ten Fashion-MNIST classes in the muted Tableau set the 2-D scatters use
  const CLS = ['T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat', 'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'];
  const COL = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'].map(S3.rgb);
  const margin = w => w < 520 ? [22, 8, 14, 8] : [34, 18, 22, 18];
  return { pixels, tileFlat, tileUp, bars, lab, arcPts, seg, win, f0, CLS, COL, margin, mix };
})();
