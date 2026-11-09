// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-09. Every number a scene draws comes from the page's data:
// window.BAD (recorded runs, configs and probes, 22_js_rd_0data.js), BA_WR (the write-rule toy, 23_js_rd_write.js, equal to src/state/state_rules.py)
// and MM (cache and state from real configs, 31_js_mm_1core.js); anything illustrative is said so in the figure and its step.
// Colours on every scene: a recurrent state is blue glass (P.c1); a KV cache entry is a solid brick, keys teal in front and values purple behind
// (P.k, P.v, as on Attention variants); a query or the new token is orange (P.q). ----
window.BAS = (function () {
  if (!window.S3) return null;
  const { lerp, cl, mix } = S3;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone by mid-transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 2 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // grid lines on the top face of a thin box (one cell = a fixed count of numbers)
  function topGrid(R, c, s, nu, nv, a, gc) {
    const y = c[1] + s[1] + .001, x0 = c[0] - s[0] / 2, z0 = c[2] - s[2] / 2, L = [];
    for (let i = 1; i < nu; i++) L.push([[x0 + s[0] * i / nu, y, z0], [x0 + s[0] * i / nu, y, z0 + s[2]]]);
    for (let j = 1; j < nv; j++) L.push([[x0, y, z0 + s[2] * j / nv], [x0 + s[0], y, z0 + s[2] * j / nv]]);
    const pp = L.map(([p, q]) => [R.p(p), R.p(q)]), z = R.p([c[0], c[1] + s[1] / 2, c[2]])[2] - .002;
    R.q.push({ z, f: cx => { cx.globalAlpha = a * .5; cx.strokeStyle = 'rgb(' + gc.map(Math.round).join(',') + ')'; cx.lineWidth = .7; cx.beginPath(); pp.forEach(([p, q]) => { cx.moveTo(p[0], p[1]); cx.lineTo(q[0], q[1]) }); cx.stroke() } });
  }
  // one KV cache entry: a brick, keys (teal) in front and values (purple) behind; c the centre of its bottom face, s [w, h, d]
  function brick(R, c, s, a, o) {
    o = o || {}; if (a <= .01) return; const P = R.P;
    R.box([c[0], c[1], c[2] + s[2] / 4], [s[0], s[1], s[2] / 2], { fill: mix(P.paper, P.k, o.lite ? .45 : .72), a, lw: .7, shadow: o.shadow });
    R.box([c[0], c[1], c[2] - s[2] / 4], [s[0], s[1], s[2] / 2], { fill: mix(P.paper, P.v, o.lite ? .4 : .62), a, lw: .7, shadow: o.shadow });
  }
  // a recurrent state: a blue glass plate lying flat (corner o0, width w along x, depth d along z), nu x nv cells
  function plate(R, o0, w, d, a, o) { o = o || {}; R.glass(o0, [w, 0, 0], [0, 0, d], { c: o.c || R.P.c1, a, nu: o.nu || 8, nv: o.nv || 8, th: o.th == null ? .03 : o.th }); }
  // a vector as signed bars on a white plinth, along x: positive bars stand on it, negative ones hang below (the reference scene's comb)
  function comb(R, c, vals, m, col, a, hmax, wd) {
    if (a <= .01) return; const nb = vals.length, bw = wd / nb;
    R.box([c[0], c[1] - .045, c[2]], [wd + .14, .045, .3], { a, shadow: false });
    vals.forEach((v, i) => { const h = Math.max(.012, Math.abs(v) / m * hmax), bx = c[0] - wd / 2 + bw * (i + .5);
      R.box([bx, v >= 0 ? c[1] : c[1] - .045 - h, c[2]], [bw * .7, h, .1], { fill: col, a, shadow: false, lw: .6 }); });
  }
  // a matrix as a bar field on a glass plate: M[r][c] (rows along z, columns along x), positive up, negative hanging below
  function field(R, cx, y, cz, M, m, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P, nr = M.length, nc = M[0].length, cs = o.cs || .24, W = nc * cs, D = nr * cs;
    plate(R, [cx - W / 2, y, cz - D / 2], W, D, a * (o.pa == null ? .8 : o.pa), { nu: nc, nv: nr, c: o.c });
    const hm = o.hmax || .9, pos = o.pos || mix(P.paper, P.c1, .75), neg = o.neg || mix(P.paper, P.c5, .78);
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) { const v = M[r][c]; if (!isFinite(v)) continue; const h = Math.abs(v) / m * hm; if (h < .004) continue;
      R.box([cx - W / 2 + cs * (c + .5), v >= 0 ? y + .03 : y - h, cz - D / 2 + cs * (r + .5)], [cs * .62, h, cs * .62], { fill: v >= 0 ? pos : neg, a, shadow: false, lw: .5, ea: .5 }); }
  }
  const int = v => Math.round(v).toLocaleString('en-GB');
  const bytes = b => { const a = Math.abs(b); if (a >= 2 ** 30) return (b / 2 ** 30).toFixed(2).replace(/\.?0+$/, '') + ' GiB'; if (a >= 2 ** 20) return (b / 2 ** 20).toFixed(1).replace(/\.0$/, '') + ' MiB'; if (a >= 1024) return (b / 1024).toFixed(a >= 100 * 1024 ? 0 : 1).replace(/\.0$/, '') + ' KiB'; return Math.round(b) + ' B'; };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const margin = w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18];
  const model = key => (window.BAD && BAD.mem.models.find(m => m.key === key)) || null;
  // a model's sequence of mixer layers from its config: 'a' attention (any kind), 'r' recurrent, 'p' both in parallel (Falcon-H1)
  function mixers(key) {
    const m = model(key); if (!m) return null; const c = m.cfg.text_config || m.cfg, t = c.model_type, n = c.num_hidden_layers;
    if (t === 'llama') return 'a'.repeat(n);
    if (t === 'jamba') { let s = ''; for (let i = 0; i < n; i++) s += i % c.attn_layer_period === c.attn_layer_offset ? 'a' : 'r'; return s; }
    if (t === 'nemotron_h') return [...c.hybrid_override_pattern].filter(x => x === 'M' || x === '*').map(x => x === '*' ? 'a' : 'r').join('');
    if (t === 'granitemoehybrid') return c.layer_types.map(x => x === 'attention' ? 'a' : 'r').join('');
    if (t === 'qwen3_next') { let s = ''; for (let i = 0; i < n; i++) s += (i + 1) % c.full_attention_interval === 0 ? 'a' : 'r'; return s; }
    if (t === 'qwen3_5_moe_text' || t === 'qwen3_5_text') return c.layer_types.map(x => x === 'full_attention' ? 'a' : 'r').join('');
    if (t === 'kimi_linear') { const f = new Set(c.linear_attn_config.full_attn_layers); let s = ''; for (let i = 1; i <= n; i++) s += f.has(i) ? 'a' : 'r'; return s; }
    if (t === 'falcon_h1') return 'p'.repeat(n);
    return null;
  }
  // chips: a row of buttons inside el, data-v values; f(v) on a click
  function chips(el, f) { if (!el) return; el.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false') }); f(b.dataset.v); }); }
  return { tw, la, lab, topGrid, brick, plate, comb, field, int, bytes, win, margin, model, mixers, chips };
})();
