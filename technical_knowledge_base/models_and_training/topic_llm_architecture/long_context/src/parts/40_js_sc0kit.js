// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from the page's data:
// window.KC and KCD (the calculator's engine and data, 19_js_kc_*), LCF (the run and prose facts, 22_js_rd_0facts.js), EVD (the eviction runs,
// 32_js_ev_0data.js) and EFD (the position runs, 33_js_ef_0data.js); anything illustrative is said so in the figure's caption and its steps. ----
window.LCS = (function () {
  if (!window.S3) return null;
  const { lerp, cl } = S3;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone a third of the way through a transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 3 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const int = v => Math.round(v).toLocaleString('en-GB');
  const gib = b => (b / 2 ** 30).toFixed(b >= 10 * 2 ** 30 ? 1 : 2).replace(/\.0+$/, '') + ' GiB';
  const gb = b => (b / 1e9).toFixed(b >= 1e11 ? 0 : 2) + ' GB';
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  // an outline box: the edges of a box with no faces (a slot still to fill, a capacity)
  function frame(R, c, s, o) {
    o = o || {}; const x0 = c[0] - s[0] / 2, x1 = c[0] + s[0] / 2, y0 = c[1], y1 = c[1] + s[1], z0 = c[2] - s[2] / 2, z1 = c[2] + s[2] / 2, P = { c: o.c, w: o.w || 1.2, a: o.a == null ? 1 : o.a, dash: o.dash };
    [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y0, z0]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [x0, y1, z0]],
      [[x0, y0, z0], [x0, y1, z0]], [[x1, y0, z0], [x1, y1, z0]], [[x1, y0, z1], [x1, y1, z1]], [[x0, y0, z1], [x0, y1, z1]]].forEach(pts => R.line(pts, P));
  }
  return { tw, la, lab, int, gib, gb, margin, frame, cl };
})();
