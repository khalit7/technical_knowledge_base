// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), adapted from Latent diffusion and DiTs' kit. Every number a scene
// draws comes from window.VA (the page's configs, recorded codec runs and counts, 22_js_va_0data.js) through window.VAU (the same token and FLOPs
// formulas as calc/recompute.py); anything illustrative is said so on the figure and in its step. ----
window.VAK = (function () {
  if (!window.S3 || !window.VAU) return null;
  const { lerp, lerp3, cl } = S3;
  // smooth value between the previous step's target and this step's: f(step) gives the target, e the eased progress
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const path = ps => { const o = []; for (let i = 0; i < ps.length - 1; i++) seg(ps[i], ps[i + 1], 8).forEach((p, j) => { if (i === 0 || j) o.push(p); }); return o; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  // an upright frame plate in the y-z plane at time position x (a video frame or latent frame): w along z, h along y, bottom at y0
  function frame(R, x, w, h, c, a, o) { o = o || {}; if (a <= .01) return; const y0 = o.y0 == null ? .05 : o.y0;
    R.glass([x, y0, w / 2], [0, 0, -w], [0, h, 0], { c, a, nu: o.nu || 1, nv: o.nv || 1, th: o.th == null ? .015 : o.th }); }
  const int = v => Math.round(v).toLocaleString('en-GB');
  const f1 = (v, d) => Number(v).toFixed(d == null ? 1 : d);
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  return { tw, la, lab, seg, arcPts, path, win, frame, int, f1, margin };
})();
