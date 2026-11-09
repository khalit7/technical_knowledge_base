// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from window.FOD
// (22_js_fo_0data.js: the page's own runs) or from a published table printed on this page (said so in the scene and its step list);
// token positions chosen for teaching are labelled illustrative in the step text. ----
window.FOS = (function () {
  if (!window.S3 || !window.FOD) return null;
  const { lerp, cl } = S3;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const tok = s => (s === '' ? '<eot>' : s.replace(/\n/g, '↵')).trim() || '␣';
  const int = v => Math.round(v).toLocaleString('en-GB');
  const pct = v => (100 * v).toFixed(1) + '%';
  // a value column on a white plinth: c the centre of its foot, h its height, w its width; o.fill colour, o.a alpha
  function col(R, c, h, w, o) { o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box([c[0], 0, c[2]], [w + .16, .05, w + .16], { a, shadow: o.shadow });
    R.box([c[0], .05, c[2]], [w, Math.max(.012, h), w], { fill: o.fill, a, shadow: false, lw: .8 }); }
  return { tw, la, lab, win, tok, int, pct, col };
})();
