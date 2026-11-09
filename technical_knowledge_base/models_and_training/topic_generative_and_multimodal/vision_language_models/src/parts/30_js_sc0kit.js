// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js). Every number a scene draws comes from window.VM_DATA
// (20_js_vm_0data.js: the recorded runs and processor outputs, written by runs/make_data.py); real images are the page's own
// (the processors' decoded views, the synthetic inputs, scikit-image's public-domain and CC0 photos). Anything illustrative says so. ----
window.VMK = (function () {
  if (!window.S3 || !window.VM_DATA) return null;
  const { lerp, lerp3, cl, mix } = S3, D = window.VM_DATA;
  // images from data URIs; a stage that drew before an image loaded is redrawn once it has
  const IM = {}, WANT = new Set();
  function pic(uri) {
    if (!uri) return null; let e = IM[uri];
    if (!e) { e = IM[uri] = { im: new Image(), ok: false }; e.im.onload = () => { e.ok = true; WANT.forEach(f => { try { f() } catch (x) { } }); }; e.im.src = uri; }
    return e.ok ? e.im : null;
  }
  const onPic = f => WANT.add(f);
  // a resampled copy of an image (the processor's scale applied in the browser: smooth when shrinking), cached per scale
  const RS = {};
  function resampled(uri, s) {
    const k = uri + '@' + s; if (RS[k]) return RS[k]; const im = pic(uri); if (!im) return null;
    const w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s)), c = document.createElement('canvas');
    c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
    return RS[k] = c;
  }
  // an image on a plate: corner o0 (the image's bottom-left), edge vectors u (along its width) and v (up its height); drawn as n x n affine pieces
  // so perspective holds; o.crop [sx, sy, sw, sh] in source pixels, o.smooth false for visible pixels, o.rim draws a white backing
  function img(R, src, o0, u, v, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P;
    if (o.rim !== false) { const g = o.rim || .04, nu = S3_n(u), nv = S3_n(v), du = u.map(x => x / nu * g), dv = v.map(x => x / nv * g);
      R.quad([sub3(sub3(o0, du), dv), add3(add3(o0, u), sub3(du, dv)), add3(add3(add3(o0, u), v), add3(du, dv)), add3(add3(o0, v), sub3(dv, du))].map(p => add3(p, mulN(u, v, -.004))), { fill: P.paper, a, ec: P.edge, dz: .02 }); }
    if (!src) { R.quad([o0, add3(o0, u), add3(add3(o0, u), v), add3(o0, v)], { fill: P.soft, a, edge: false }); return; }
    const W = src.naturalWidth || src.width, H = src.naturalHeight || src.height, cr = o.crop || [0, 0, W, H], n = o.sub || 6;
    const pts = []; for (let j = 0; j <= n; j++) { const row = []; for (let i = 0; i <= n; i++) row.push(R.p(add3(add3(o0, u.map(x => x * i / n)), v.map(x => x * (1 - j / n))))); pts.push(row); }
    const z = (pts[0][0][2] + pts[n][n][2] + pts[0][n][2] + pts[n][0][2]) / 4 + (o.dz || 0), sw = cr[2] / n, sh = cr[3] / n;
    R.q.push({ z, f: cx => { cx.save(); cx.globalAlpha = a; cx.imageSmoothingEnabled = o.smooth !== false;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p0 = pts[j][i], p1 = pts[j][i + 1], p2 = pts[j + 1][i], sx = cr[0] + i * sw, sy = cr[1] + j * sh;
        const A = (p1[0] - p0[0]) / sw, B = (p1[1] - p0[1]) / sw, C = (p2[0] - p0[0]) / sh, E = (p2[1] - p0[1]) / sh;
        cx.save(); cx.transform(A, B, C, E, p0[0] - A * sx - C * sy, p0[1] - B * sx - E * sy); cx.drawImage(src, sx, sy, sw + (i < n - 1 ? .6 : 0), sh + (j < n - 1 ? .6 : 0), sx, sy, sw + (i < n - 1 ? .6 : 0), sh + (j < n - 1 ? .6 : 0)); cx.restore(); }
      cx.restore();
      if (o.grid) { const [gu, gv, gc, ga] = o.grid, Q = (i, j) => R.p(add3(add3(o0, u.map(x => x * i)), v.map(x => x * j))); cx.globalAlpha = a * ga; cx.strokeStyle = css(gc); cx.lineWidth = o.gw || .5; cx.beginPath();
        for (let i = 1; i < gu; i++) { const p = Q(i / gu, 0), r = Q(i / gu, 1); cx.moveTo(p[0], p[1]); cx.lineTo(r[0], r[1]); }
        for (let j = 1; j < gv; j++) { const p = Q(0, j / gv), r = Q(1, j / gv); cx.moveTo(p[0], p[1]); cx.lineTo(r[0], r[1]); } cx.stroke(); cx.globalAlpha = 1; }
      (o.boxes || (o.box ? [o.box] : [])).forEach(bb => { if (!bb) return; const [bx0, by0, bx1, by1, bc, bw, bd, ba] = bb, Q = (i, j) => R.p(add3(add3(o0, u.map(x => x * i)), v.map(x => x * (1 - j)))); cx.globalAlpha = a * (ba == null ? 1 : ba); cx.strokeStyle = css(bc); cx.lineWidth = bw || 2; if (bd) cx.setLineDash(bd);
        cx.beginPath(); [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].forEach((t, i) => { const p = Q(t[0], t[1]); i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]); }); cx.closePath(); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1; });
    } });
  }
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const S3_n = a => Math.hypot(a[0], a[1], a[2]) || 1, mulN = (u, v, s) => { const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = S3_n(n); return n.map(x => x / l * s); };
  // an upright image facing +z: bottom-left corner at (x, y, z), width w, height h
  const imgUp = (R, src, x, y, z, w, h, o) => img(R, src, [x, y, z], [w, 0, 0], [0, h, 0], o);
  // lines of a grid of nu x nv cells on an upright rectangle (bottom-left x, y at depth z)
  function gridUp(R, x, y, z, w, h, nu, nv, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const c = o.c || R.P.ink, lw = o.w || .7, zz = z + .004;
    for (let i = 1; i < nu; i++) R.line([[x + w * i / nu, y, zz], [x + w * i / nu, y + h, zz]], { c, w: lw, a });
    for (let j = 1; j < nv; j++) R.line([[x, y + h * j / nv, zz], [x + w, y + h * j / nv, zz]], { c, w: lw, a });
  }
  // a wall of n token squares facing +z, cols wide, filled row by row from the top-left: one square per token, side s, the same in every scene.
  // Drawn as one item (backing, then squares) so depth sorting never hides squares behind their own backing. o.rows fixes the backing's height.
  function wall(R, x, y, z, n, cols, s, col, a, o) {
    o = o || {}; if (a <= .01 || n <= 0) return; const P = R.P, g = s * .18, c = css(mix(P.paper, col, o.k == null ? .78 : o.k)), rows = o.rows || Math.ceil(n / cols), top = y + rows * s;
    const bk = [[x - g, y - g, z - .01], [x + cols * s + g, y - g, z - .01], [x + cols * s + g, top + g, z - .01], [x - g, top + g, z - .01]].map(p => R.p(p));
    const sq = []; for (let k = 0; k < n; k++) { const i = k % cols, j = Math.floor(k / cols), x0 = x + i * s + g / 2, y1 = top - j * s - g / 2;
      sq.push([[x0, y1 - s + g, z], [x0 + s - g, y1 - s + g, z], [x0 + s - g, y1, z], [x0, y1, z]].map(p => R.p(p)).concat([o.colOf ? css(o.colOf(k)) : c, o.alphaOf ? o.alphaOf(k) : 1])); }
    const zz = R.p([x + cols * s / 2, y + rows * s / 2, z])[2] + (o.dz || 0), ed = css(P.edge), pap = css(P.paper);
    R.q.push({ z: zz, f: cx => { const poly = q => { cx.beginPath(); for (let i = 0; i < 4; i++) i ? cx.lineTo(q[i][0], q[i][1]) : cx.moveTo(q[i][0], q[i][1]); cx.closePath(); };
      cx.globalAlpha = a * .92; cx.fillStyle = pap; poly(bk); cx.fill(); cx.globalAlpha = a * .5; cx.strokeStyle = ed; cx.lineWidth = .8; cx.stroke();
      sq.forEach(q => { cx.globalAlpha = a * q[5]; cx.fillStyle = q[4]; poly(q); cx.fill(); }); cx.globalAlpha = 1; } });
  }
  const css = c => 'rgb(' + c.map(v => Math.round(v)).join(',') + ')';
  // a label only when its anchor is on the canvas
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // smooth value between the previous step's target and this step's: f(step) gives the target
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const int = v => Math.round(v).toLocaleString('en-GB');
  const margin = w => w < 520 ? [24, 8, 14, 8] : [30, 18, 20, 18];
  const iou = (a, b) => { const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])), I = ix * iy;
    const U = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - I; return U > 0 ? I / U : 0; };
  const saw = k => (D.saw && D.saw.images || []).find(x => x.key === k);
  return { D, pic, onPic, resampled, img, imgUp, gridUp, wall, lab, tw, la, seg, arcPts, win, int, margin, iou, saw, mix, lerp, cl };
})();
