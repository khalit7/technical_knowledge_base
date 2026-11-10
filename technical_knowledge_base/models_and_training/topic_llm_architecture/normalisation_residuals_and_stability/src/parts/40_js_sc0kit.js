// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from the page's data:
// window.NSD (the runs, the stream trace and the probes, 22_js_ns_0data.js) and NSS (the Inside lab's SmolLM2 stream and the reference tiny
// GPT's largest entries, 26_js_ns_scene.js); anything illustrative is said so in the figure's caption and its steps. ----
window.NSK = (function () {
  if (!window.S3) return null;
  const { lerp, cl } = S3;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone a third of the way through a transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 3 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const fmt = v => { const a = Math.abs(v); return a >= 1000 ? Math.round(v).toLocaleString('en-GB') : a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3); };
  // an outline box: the edges of a box with no faces (a slot, a place a norm could sit)
  function frame(R, c, s, o) {
    o = o || {}; const x0 = c[0] - s[0] / 2, x1 = c[0] + s[0] / 2, y0 = c[1], y1 = c[1] + s[1], z0 = c[2] - s[2] / 2, z1 = c[2] + s[2] / 2, P = { c: o.c, w: o.w || 1.2, a: o.a == null ? 1 : o.a, dash: o.dash };
    [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y0, z0]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [x0, y1, z0]],
      [[x0, y0, z0], [x0, y1, z0]], [[x1, y0, z0], [x1, y1, z0]], [[x1, y0, z1], [x1, y1, z1]], [[x0, y0, z1], [x0, y1, z1]]].forEach(pts => R.line(pts, P));
  }
  // a dashed outline of a vertical plate crossing a path that runs along x (where a norm could sit but does not, in this placement)
  function ghostPlate(R, x, y0, z, w, h, o) { o = o || {}; R.line([[x, y0, z - w / 2], [x, y0, z + w / 2], [x, y0 + h, z + w / 2], [x, y0 + h, z - w / 2], [x, y0, z - w / 2]], { c: o.c, w: 1.3, a: o.a == null ? 1 : o.a, dash: [5, 4] }); }
  // a norm: a tinted glass plate standing across a path that runs along x
  function plate(R, x, y0, z, w, h, o) { o = o || {}; R.glass([x, y0, z - w / 2], [0, 0, w], [0, h, 0], { c: o.c, a: o.a == null ? 1 : o.a, nu: o.nu || 3, nv: o.nv || 4 }); }
  // the same plate across a path that runs along z
  function plateZ(R, x, y0, z, w, h, o) { o = o || {}; R.glass([x - w / 2, y0, z], [w, 0, 0], [0, h, 0], { c: o.c, a: o.a == null ? 1 : o.a, nu: o.nu || 4, nv: o.nv || 3 }); }
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  return { tw, la, lab, fmt, frame, ghostPlate, plate, plateZ, margin, cl, lerp };
})();
