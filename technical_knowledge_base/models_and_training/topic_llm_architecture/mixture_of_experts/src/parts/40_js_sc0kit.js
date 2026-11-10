// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from window.MXD
// (the recorded runs, analyses and configs written by src/make_page_data.py) through window.MX; anything chosen for teaching is labelled
// illustrative in the step text and on the figure. ----
window.MXS = (function () {
  if (!window.S3 || !window.MX || !window.MXD) return null;
  const { lerp, cl, rgb } = S3, M = window.MX, D = window.MXD;
  // the expert colours of the page's 2D visuals (Tableau-style), so expert 3 is the same colour in every figure
  const EC = M.EC.map(c => rgb(c));
  const ec = i => EC[i % EC.length];
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // router outputs of tokens 1..n of the running sequence in one layer of a recorded run: scores (softmax, or sigmoid for the sigmoid run), the k chosen, the first gate
  function routing(run, lay, n) {
    const r = D.runs[run].seq, E = r.E, k = r.k, a = M.unb64(r.scores64_b64[lay]);
    return Array.from({ length: n }, (_, j) => { const t = j + 1;
      return { t, piece: M.piece(t), sc: Array.from({ length: E }, (_, e) => a[t * E + e] / 255), top: r.top[lay].slice(t * k, t * k + k).split('').map(c => parseInt(c, 16)), w1: r.w1[lay][t] }; });
  }
  // a token piece as shown on a figure: spaces as middle dots are noisy at this size, so trim and quote
  const tok = p => '"' + String(p).trim() + '"';
  const int = v => Math.round(v).toLocaleString('en-GB');
  // a value column on a white plinth: c the centre of its foot, h its height, w its width; o.fill colour, o.a alpha
  function col(R, c, h, w, o) { o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box([c[0], 0, c[2]], [w + .14, .04, (o.d || w) + .14], { a, shadow: o.shadow });
    R.box([c[0], .04, c[2]], [w, Math.max(.012, h), o.d || w], { fill: o.fill, a, shadow: false, lw: .8 }); }
  return { M, D, EC, ec, tw, la, lab, routing, tok, int, col, cl, lerp };
})();
