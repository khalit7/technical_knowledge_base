// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from window.VE
// (the page's runs, 20_js_ve_0data.js) or window.VEL (the root's vision recordings, 20_js_ve_1lab.js); images are the page's own
// test-image thumbnails, read back as pixel colours; anything illustrative is said so on the figure and in its step. ----
window.VEK = (function () {
  if (!window.S3 || !window.VE) return null;
  const { lerp, lerp3, cl } = S3;
  // smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  // a test image as n x n colours (0..255), read back from its thumbnail once it has decoded; null until then (the scene redraws on load)
  const IM = {}, waiters = [];
  function pix(key, n) {
    const id = key + ':' + n; if (IM[id]) return IM[id].d;
    IM[id] = { d: null }; const im = new Image();
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, n, n);
      const a = x.getImageData(0, 0, n, n).data, d = []; for (let i = 0; i < n * n; i++) d.push([a[4 * i], a[4 * i + 1], a[4 * i + 2]]); IM[id].d = d; waiters.forEach(f => f()); } catch (e) { } };
    im.src = VE.thumbs[key]; return null;
  }
  const onImage = f => waiters.push(f);
  // an image lying flat, centred on (x, z) at height y, side S, as n x n tiles; with g patches a side, o.gap opens a gap between patches;
  // o.N, o.i0, o.j0 crop: draw n x n tiles from an N x N reading starting at row i0, column j0; o.hide(r, c) hides a patch (MAE's mask), o.lift(r, c) raises one, o.a alpha, o.hl [r, c] outlines one patch
  function image(R, key, n, x, z, S, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const N = o.N || n, i0 = o.i0 || 0, j0 = o.j0 || 0, d = pix(key, N), g = o.g || n, m = n / g, gap = o.gap || 0, y = o.y == null ? .03 : o.y;
    const ps = (S - gap * (g - 1)) / g, ts = ps / m, x0 = x - S / 2, z0 = z - S / 2;
    for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) {
      if (o.hide && o.hide(r, c)) { R.quad([[x0 + c * (ps + gap), y, z0 + r * (ps + gap)], [x0 + c * (ps + gap) + ps, y, z0 + r * (ps + gap)], [x0 + c * (ps + gap) + ps, y, z0 + r * (ps + gap) + ps], [x0 + c * (ps + gap), y, z0 + r * (ps + gap) + ps]], { fill: R.P.soft || R.P.paper, a: a * .7, ea: .25, lw: .6, dash: [3, 3] }); continue; }
      const ly = y + (o.lift ? o.lift(r, c) : 0);
      for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
        const px0 = x0 + c * (ps + gap) + j * ts, pz0 = z0 + r * (ps + gap) + i * ts, col = d ? d[(i0 + r * m + i) * N + j0 + c * m + j] : [170, 170, 170];
        R.quad([[px0, ly, pz0], [px0 + ts, ly, pz0], [px0 + ts, ly, pz0 + ts], [px0, ly, pz0 + ts]], { fill: col, a, edge: false });
      }
      if (o.hl && o.hl[0] === r && o.hl[1] === c) { const X = x0 + c * (ps + gap), Z = z0 + r * (ps + gap); R.line([[X, ly + .01, Z], [X + ps, ly + .01, Z], [X + ps, ly + .01, Z + ps], [X, ly + .01, Z + ps], [X, ly + .01, Z]], { c: o.hc || R.P.c5, w: 2.4, a, top: 1 }); }
    }
  }
  // the centre of patch (r, c) of such an image
  const cell = (g, x, z, S, gap, r, c) => { const ps = (S - (gap || 0) * (g - 1)) / g; return [x - S / 2 + c * (ps + (gap || 0)) + ps / 2, z - S / 2 + r * (ps + (gap || 0)) + ps / 2, ps]; };
  const f2 = (v, d) => Number(v).toFixed(d == null ? 2 : d);
  const int = v => Math.round(v).toLocaleString('en-GB');
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  // the image chosen in a chip row (shared by the scenes that offer one)
  function chips(el, keys, i0, f) { if (!el) return; el.innerHTML = keys.map((k, i) => '<button data-i="' + i + '"' + (i === i0 ? ' class="on"' : '') + '>' + k.replace(/^[a-z]\d\d_/, '').replace(/_/g, ' ') + '</button>').join('');
    el.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); f(+b.dataset.i); }); }
  return { tw, la, lab, seg, arcPts, win, pix, onImage, image, cell, f2, int, margin, chips };
})();
