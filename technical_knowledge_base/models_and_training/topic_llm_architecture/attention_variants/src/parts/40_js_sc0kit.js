// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from the page's data:
// window.AVL and AVLC (real configs and the per-layer cache arithmetic, 32_js_ld_*), AVR (the tiny GPT runs, 22_js_rd_0data.js), AVK (SmolLM2's
// attention, 22_js_rd_0keys.js) and AVB (the decode timings, 22_js_rd_0bench.js); anything illustrative is said so in the figure and its step. ----
window.AVS = (function () {
  if (!window.S3) return null;
  const { lerp, cl } = S3;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a flat array drawn as a thin box with a cell grid on its top face (one cell = a fixed count of numbers): c the centre of its bottom face,
  // s [w, h, d], nu x nv cells; o as R.box, plus o.gc grid colour and o.dash for an entry that is computed but never stored
  function slab(R, c, s, nu, nv, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P;
    if (o.dash) { const y = c[1] + s[1], x0 = c[0] - s[0] / 2, x1 = c[0] + s[0] / 2, z0 = c[2] - s[2] / 2, z1 = c[2] + s[2] / 2;
      R.quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], { fill: o.fill, fa: .12, a, ec: o.fill, ea: .9, lw: 1.3, dash: [5, 4] }); return; }
    R.box(c, s, Object.assign({ shadow: false, lw: .8 }, o));
    const y = c[1] + s[1] + .001, x0 = c[0] - s[0] / 2, z0 = c[2] - s[2] / 2, L = [];
    for (let i = 1; i < nu; i++) L.push([[x0 + s[0] * i / nu, y, z0], [x0 + s[0] * i / nu, y, z0 + s[2]]]);
    for (let j = 1; j < nv; j++) L.push([[x0, y, z0 + s[2] * j / nv], [x0 + s[0], y, z0 + s[2] * j / nv]]);
    const pp = L.map(([p, q]) => [R.p(p), R.p(q)]), z = R.p([c[0], c[1] + s[1] / 2, c[2]])[2] - .002, gc = o.gc || P.paper;
    R.q.push({ z, f: cx => { cx.globalAlpha = a * .55; cx.strokeStyle = 'rgb(' + gc.map(Math.round).join(',') + ')'; cx.lineWidth = .7; cx.beginPath(); pp.forEach(([p, q]) => { cx.moveTo(p[0], p[1]); cx.lineTo(q[0], q[1]) }); cx.stroke() } });
  }
  const int = v => Math.round(v).toLocaleString('en-GB');
  const bytes = b => { const a = Math.abs(b); if (a >= 2 ** 30) return (b / 2 ** 30).toFixed(a >= 10 * 2 ** 30 ? 1 : 2).replace(/\.0+$/, '') + ' GiB'; if (a >= 2 ** 20) return (b / 2 ** 20).toFixed(a >= 100 * 2 ** 20 ? 0 : 1).replace(/\.0$/, '') + ' MiB'; if (a >= 1024) return (b / 1024).toFixed(a >= 100 * 1024 ? 0 : 1).replace(/\.0$/, '') + ' KiB'; return Math.round(b) + ' B'; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  // a rung's first layer group from the real configs (AVL), and what one layer stores per token (numbers), from AVLC
  const rung = id => (window.AVL && AVL.rungs.find(r => r.id === id)) || null;
  // the numbers one token's entry holds in one layer, by part: k and v (2 nkv hd), MLA's latent and RoPE key, DSA's indexer key, V4's merged entry per ratio tokens
  const entry = (id, gi) => { const r = rung(id); if (!r) return null; const g = r.groups[gi || 0];
    if (g.kind === 'attn') return { k: g.nkv * g.hd, v: g.nkv * g.hd, tot: 2 * g.nkv * g.hd, g };
    if (g.kind === 'mla') return { lat: g.dc, rope: g.dr, idx: g.idx_dim || 0, tot: g.dc + g.dr, g };
    if (g.kind === 'comp') return { ent: g.entry, ratio: g.ratio, idx: g.idx_dim || 0, tot: g.entry / g.ratio, g };
    return null; };
  // chips: a row of buttons inside el, data-v values; f(v) on a click
  function chips(el, f) { if (!el) return; el.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false') }); f(b.dataset.v); }); }
  return { tw, la, lab, slab, int, bytes, win, margin, rung, entry, chips };
})();
