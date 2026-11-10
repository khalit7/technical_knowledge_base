// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-10. Every number a scene draws comes from the page's
// own data and engines: window.TKN (recorded runs, written by src/make_page_data.py), window.TD (export_data.py), window.TKG (the page's
// BPE encoder, equal to the library at 13 checkpoints) and window.TOKALG (the page's trainers, checked by check_algos.mjs). ----
window.TKS = (function () {
  if (!window.S3 || !window.TKN || !window.TKR || !window.TKV) return null;
  const { lerp, mix } = S3;
  // label alpha across a step change: an outgoing label is gone by mid-transition and an incoming one starts after it, so two never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a token as written on a tile: a leading space as ␣
  const vis = s => String(s).replace(/ /g, '␣').replace(/\n/g, '↵');
  const int = v => Math.round(v).toLocaleString('en-US');
  // a row of token tiles: toks = [{s (text), n (bytes), id?}], laid out left to right in bytes (u world units per byte),
  // with a gap of g between pre-tokenizer chunks (chunk index per token). Returns [{x (centre), w, s, n, c (chunk), b0 (first byte)}]
  function layout(toks, u, g, x0) { let x = x0, b = 0, lastC = toks.length ? toks[0].c : 0; return toks.map(t => { if (t.c !== lastC) { x += g; lastC = t.c; }
    const w = t.n * u, o = Object.assign({}, t, { x: x + w / 2, w, b0: b }); x += w; b += t.n; return o; }); }
  // one tile: a box standing on the floor with its text above it; o.fill, o.a, o.h, o.d, o.fs, o.lab (false: no text), o.c (text colour), o.wide (hide the text on a phone)
  function tile(R, t, z, o) { o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P, h = o.h || .34, d = o.d || .62;
    R.box([t.x, o.y || 0, z], [Math.max(.04, t.w - (o.pad == null ? .05 : o.pad)), h, d], { fill: o.fill || P.paper, a, shadow: o.shadow, lw: .8 });
    if (o.lab !== false) lab(R, [t.x, (o.y || 0) + h, z], o.text != null ? o.text : vis(t.s), { mono: true, fs: o.fs || 12.5, dy: o.dy == null ? -10 : o.dy, b: o.b, c: o.c || P.ink, a: o.la == null ? a : o.la, wide: o.wide }); }
  // tiles of a merge state: o.prev the previous state's tiles (same bytes); tiles present in both stay, new (fused) tiles rise during e and the pieces they replace sink
  function tiles(R, cur, prev, z, e, o) { o = o || {}; const key = t => t.b0 + ':' + t.n, had = new Set((prev || cur).map(key)), has = new Set(cur.map(key));
    if (prev && e < 1) prev.forEach(t => { if (!has.has(key(t))) tile(R, t, z, Object.assign({}, o.old ? o.old(t) : o, { a: (o.a == null ? 1 : o.a) * (1 - e), la: (1 - Math.min(1, 2 * e)) * (o.a == null ? 1 : o.a) })); });
    cur.forEach(t => { const fresh = prev && !had.has(key(t)), base = o.style ? o.style(t, fresh) : {};
      tile(R, t, z, Object.assign({}, o, base, fresh ? { a: (o.a == null ? 1 : o.a) * (e < 1 ? e : 1), la: (o.a == null ? 1 : o.a) * Math.max(0, 2 * e - 1), h: (base.h || o.h || .34) * (.55 + .45 * e) } : {})); }); }
  return { la, tw, lab, vis, int, layout, tile, tiles, mix, lerp };
})();
