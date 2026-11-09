// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from window.AG
// (the page's own decoded configs, 22_js_ag_0data.js written by src/gen_data.py) through the same cache arithmetic as the rest of the page
// (AG.cache, AG.stateB); anything chosen for teaching (which experts a token picks) is labelled illustrative in the step text. ----
window.AGS = (function () {
  if (!window.S3 || !window.AG) return null;
  const { lerp, cl } = S3, G = window.AG;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // the strip colours of the 2D figures, so a layer is the same colour in every visual on the page
  const MC = { G: 'c1', S: 'c6', M: 'c3', D: 'c4', L: 'c5', H: 'c2', F: 'mute' };
  const mc = (P, c) => P[MC[c] || 'mute'];
  const KiB = 1024, MiB = 2 ** 20, GiB = 2 ** 30;
  const B = v => G.fmtB(v), int = v => Math.round(v).toLocaleString('en-GB');
  const short = { 'Qwen3 Next 80B-A3B': 'Qwen3-Next 80B', 'GPT-OSS 120B': 'gpt-oss-120b', 'Qwen3 235B-A22B': 'Qwen3 235B', 'Nemotron 3 Super 120B-A12B': 'Nemotron 3 Super',
    'Nemotron 3.5 Lightning 30B-A3B': 'Nemotron 3.5 Lightning', 'LongCat-Flash-Lite 68.5B-A3B': 'LongCat-Flash-Lite', 'Ouro-Thinking 2.6B': 'Ouro-Thinking 2.6B', 'Nanbeige 4.2 3B': 'Nanbeige 4.2 3B' };
  const nm = n => short[n] || n;
  const row = n => { const r = G.by[n]; if (!r) throw new Error('scene model missing: ' + n); return r; };
  // a value column on a white plinth: c the centre of its foot, h its height, w its width; o.fill colour, o.a alpha
  function col(R, c, h, w, o) { o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return;
    R.box([c[0], 0, c[2]], [w + .16, .05, w + .16], { a, shadow: o.shadow });
    R.box([c[0], .05, c[2]], [w, Math.max(.012, h), w], { fill: o.fill, a, shadow: false, lw: .8 }); }
  // a tiny deterministic generator for illustrative choices (which experts a token picks), so every load draws the same picture
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  return { G, tw, la, lab, MC, mc, KiB, MiB, GiB, B, int, nm, row, col, rng, cl, lerp };
})();
