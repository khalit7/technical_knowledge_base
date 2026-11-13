// ---- Shared pieces for this page's 3D stages (renderer v2, 25_js_s3.js; prefix ev): real images from window.EV drawn as upright
// picture cards, set colours resolved to RGB, columns with their value on top. Nothing here makes up a number: every height is a value of EV. ----
window.EVK = (function () {
  if (!window.S3 || !window.EV) return null;
  const IM = {}, waiting = [];
  // an <img> for a data URI, loaded once; stages redraw when it arrives
  function im(uri) {
    if (IM[uri]) return IM[uri].ok ? IM[uri].el : null;
    const el = new Image(); IM[uri] = { el, ok: false };
    el.onload = () => { IM[uri].ok = true; waiting.forEach(f => { try { f() } catch (e) { } }); }; el.src = uri; return null;
  }
  // a real image standing upright and facing +z: bottom-left corner c, width w, height h; a white card with an ink edge behind it.
  // The picture is mapped with an affine transform from three projected corners (exact for the camera angles used here to well under a pixel).
  function card(R, uri, c, w, h, a, o) {
    o = o || {}; if (a <= .01) return; const P = R.P, m = o.pad == null ? .05 : o.pad, z = c[2];
    R.quad([[c[0] - m, c[1] - m, z - .01], [c[0] + w + m, c[1] - m, z - .01], [c[0] + w + m, c[1] + h + m, z - .01], [c[0] - m, c[1] + h + m, z - .01]], { fill: P.paper, a, ec: P.edge, dz: .02 });
    const el = im(uri); if (!el) return;
    const tl = R.p([c[0], c[1] + h, z]), tr = R.p([c[0] + w, c[1] + h, z]), bl = R.p([c[0], c[1], z]);
    R.q.push({ z: (tl[2] + tr[2] + bl[2]) / 3, f: cx => { cx.save(); cx.globalAlpha = a; cx.imageSmoothingEnabled = false;
      cx.transform(tr[0] - tl[0], tr[1] - tl[1], bl[0] - tl[0], bl[1] - tl[1], tl[0], tl[1]); cx.drawImage(el, 0, 0, 1, 1); cx.restore(); } });
  }
  // the page's set colours are CSS expressions (var(--c1), a hex); the renderer needs RGB from the current palette
  function col(P, c) { const m = /var\(--([a-z0-9]+)\)/.exec(c || ''); if (m) return P[m[1]] || P.mute; return S3.rgb(c || '#888'); }
  // a column standing on the floor: centre of its foot c, footprint [w, d], height h; its value written above it
  function column(R, c, w, d, h, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box([c[0], 0, c[2]], [w, Math.max(.012, h), d], { fill: o.fill, a, shadow: o.shadow, fa: o.fa });
    if (o.text != null) lab(R, [c[0], Math.max(.012, h), c[2]], o.text, { mono: true, fs: o.fs || 12.5, b: o.b, dy: -20, c: o.tc || R.P.ink, a: o.ta == null ? a : o.ta });
  }
  // numbers are rounded as the page's Python does (the double's exact value, so 10.135 stored as 10.13499... prints 10.13)
  // a label only when its anchor is on the canvas (the renderer clamps labels inside it, which would pile off-screen ones at the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < 2 || q[0] > R.W - 2 || q[1] < 2 || q[1] > R.H - 2) return; R.label(p, text, o); }
  const fmt = (v, dp) => Number(v.toFixed(dp)).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const fid = (k, n) => mean(EV.m[k].fid[EV.ns.indexOf(n)]);
  const win = (e, a, b) => S3.cl((e - a) / (b - a), 0, 1);
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(S3.lerp3(a, b, i / n)); return o; };
  return { im, card, col, column, lab, fmt, mean, fid, win, seg, onload: f => waiting.push(f) };
})();
