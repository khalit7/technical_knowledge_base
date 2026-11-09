// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js). Every number a scene draws comes from window.LD (the page's counted
// configs, recorded runs and published values, 22_js_ld_0data.js) through window.LDU; anything illustrative is said so on the figure and in its step. ----
window.LDK = (function () {
  if (!window.S3 || !window.LDU) return null;
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
  // a stack of n glass plates lying flat, centred on (x, z), from height y0, gap between plates
  function plates(R, x, z, w, d, n, c, a, o) { o = o || {}; if (a <= .01) return; const y0 = o.y0 == null ? .05 : o.y0, gap = o.gap == null ? .09 : o.gap;
    for (let i = 0; i < n; i++) R.glass([x - w / 2, y0 + i * gap, z - d / 2], [w, 0, 0], [0, 0, d], { c, a, nu: o.nu || 4, nv: o.nv || o.nu || 4, th: o.th == null ? .02 : o.th }); }
  // an upright glass plate facing +z (a weight matrix the tokens pass through)
  function wall(R, x, z, w, h, c, a, o) { o = o || {}; if (a <= .01) return; R.glass([x - w / 2, o.y0 || .05, z], [w, 0, 0], [0, h, 0], { c, a, nu: o.nu || 5, nv: o.nv || 5, th: o.th == null ? .04 : o.th }); }
  const f1 = (v, d) => Number(v).toFixed(d == null ? 1 : d);
  const int = v => Math.round(v).toLocaleString('en-GB');
  const M1 = v => (v / 1e6).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  return { tw, la, lab, seg, arcPts, path, win, plates, wall, f1, int, M1, margin };
})();
