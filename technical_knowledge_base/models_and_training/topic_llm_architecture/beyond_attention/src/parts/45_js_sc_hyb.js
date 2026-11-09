// ---- Scene (section 7, Fig. 5): hybrids as layer patterns, read from each model's config in BAD.mem (BAS.mixers: Jamba's period and offset,
// Nemotron's hybrid_override_pattern, Granite's and Qwen3.5's layer_types, Qwen3-Next's full_attention_interval, Kimi's full_attn_layers).
// Recurrent layers are blue plates, attention layers white blocks; a cache column rises on each attention layer with the context, and the totals
// (MM.cache: KV in bf16, state in fp32, one sequence) stand at the end of the row. Each row is drawn to the same width, so the ratio is the density. ----
(function () {
  if (!document.getElementById('stg-hyb') || !window.BAS || !window.MM || !window.BAD) return;
  const { mix } = S3, { tw, la, lab, brick, int, bytes, win } = BAS;
  const ROWS = ['jamba-v0.1', 'nemotron-h-8b', 'granite-4.0-h-small', 'qwen3-next-80b-a3b', 'qwen3.5-397b-a17b', 'kimi-linear-48b', 'kimi-k3', 'nemotron-3-super'];
  const M = {}; [...ROWS, 'llama-3.1-8b', 'falcon-h1-34b'].forEach(k => { const m = BAS.model(k); M[k] = { m, s: BAS.mixers(k) }; });
  const NH = M['nemotron-h-8b'], LL = M['llama-3.1-8b'], X1 = NH.m.kv_equals_state_at, C128 = 131072;
  const tot = (k, c) => MM.cache(M[k].m.cfg, c);
  window.BA_HYB = { cross: X1, nh128: tot('nemotron-h-8b', C128), ll128: tot('llama-3.1-8b', C128), nhX: tot('nemotron-h-8b', X1), rows: ROWS.map(k => [M[k].m.label, M[k].s]) };
  const WR = 8.4, z0 = 0, zr = i => 2.6 - i * .78, xi = (n, i) => -WR / 2 + (i + .5) * WR / n;
  const ratio = s => { const a = [...s].filter(x => x === 'a').length, r = s.length - a; return (r / a).toFixed(r % a ? 1 : 0) + ' : 1'; };
  // one row of layers; ca: cache column height on attention layers (world units), al: alpha
  function row(R, s, z, al, ch, P, o) {
    o = o || {}; const n = s.length, w = WR / n;
    for (let i = 0; i < n; i++) { const x = xi(n, i), t = s[i];
      if (t === 'r' || t === 'p') R.glass([x - w * .4, .05, z - .3], [w * .8, 0, 0], [0, 0, t === 'p' ? .3 : .6], { c: P.c1, a: al * .9, nu: 1, nv: 2, th: .03 });
      if (t === 'a' || t === 'p') { const zz = t === 'p' ? z + .15 : z; R.box([x, 0, zz], [w * .7, .14, t === 'p' ? .28 : .5], { a: al, shadow: false, lw: .6 });
        if (ch > .005) brick(R, [x, .14, zz], [w * .55, ch, t === 'p' ? .22 : .4], al, { shadow: false, lite: n > 40 }); } }
  }
  function totals(R, x, z, kvH, stH, al, P) {
    if (al <= .01) return;
    R.box([x, 0, z], [.42, Math.max(.02, stH), .42], { fill: mix(P.paper, P.c1, .6), a: al });
    brick(R, [x + .55, 0, z], [.42, Math.max(.02, kvH), .42], al, {});
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6, 6.5, -3.6, 3.8, .5);
    // the context drawn: none, rising to the crossover, then to 131,072 tokens
    const ctx = k === 0 ? 0 : k === 1 ? X1 * win(e, .05, .85) : k === 2 ? X1 + (C128 - X1) * win(e, .05, .85) : C128;
    const nh = tot('nemotron-h-8b', Math.max(1, ctx)), ll = tot('llama-3.1-8b', Math.max(1, ctx));
    // heights: per-layer columns on a 512 MiB scale (one attention layer at 131,072 tokens), totals on the crossover's scale, then on 16 GiB
    const perL = c => .62 * c / C128, TS = k <= 1 ? 1.2 / tot('nemotron-h-8b', X1).state : 2.4 / tot('llama-3.1-8b', C128).total, rescale = k === 2 && st.pk <= 1 && e < 1 ? win(e, .25, .45) : 1;
    const one = tw(st, e, q => q <= 2 ? 1 : 0), many = tw(st, e, q => q === 3 ? 1 : q === 4 ? .12 : 0), fal = tw(st, e, q => q === 4 ? 1 : 0), lla = tw(st, e, q => q === 2 ? 1 : 0);
    // steps 1 to 3: Nemotron-H 8B in front, Llama 3.1 8B behind it at step 3
    if (one > .01) { const zN = .9, zL = -.5, XT = WR / 2 + .75;
      row(R, NH.s, zN, one, perL(ctx), P); totals(R, XT, zN, nh.kv * TS, nh.state * TS, one * rescale * tw(st, e, q => q >= 1 && q <= 2 ? 1 : 0), P);
      if (lla > .01) { const T2 = 2.4 / tot('llama-3.1-8b', C128).total; row(R, LL.s, zL, lla, perL(ctx), P); totals(R, XT, zL, ll.kv * T2, ll.state * T2, lla, P); }
      const L = j => la(st, e, q => q === j ? 1 : 0);
      lab(R, [-WR / 2, .1, zN + .55], NH.m.label + ': ' + NH.s.length + ' mixers, 4 attention (' + ratio(NH.s) + ')', { fs: 12.5, b: 1, c: P.ink, al: 'left', dy: 20, a: Math.max(L(0), L(1), L(2)) });
      lab(R, [xi(NH.s.length, NH.s.indexOf('a')), .14, zN], 'attention: keeps a cache', { fs: 12, b: 1, c: P.v, dy: -34, a: L(0) });
      lab(R, [xi(NH.s.length, 14), .05, zN + .3], 'Mamba-2: a fixed state each', { fs: 12, b: 1, c: P.c1, dy: 22, a: L(0) });
      lab(R, [XT, nh.state * TS, zN], 'state ' + bytes(nh.state), { fs: 12, b: 1, c: P.c1, dy: -12, al: 'right', dx: 4, a: (L(1) + L(2)) * rescale, wide: k === 2 });
      lab(R, [XT + .55, nh.kv * TS, zN], 'KV ' + bytes(nh.kv), { fs: 12, b: 1, c: P.v, dy: -12, al: 'left', dx: -4, a: (L(1) + L(2)) * rescale, wide: k === 2 });
      lab(R, [0, 0, zN + .4], int(ctx) + ' tokens', { fs: 13, b: 1, c: P.acc, dy: 40, a: L(1) + L(2) });
      lab(R, [-WR / 2, .1, zL - .3], LL.m.label + ': 32 attention layers', { fs: 12.5, b: 1, c: P.ink, al: 'left', dy: -26, a: L(2) });
      lab(R, [XT + .55, ll.kv * 2.4 / tot('llama-3.1-8b', C128).total, zL], 'KV ' + bytes(ll.kv), { fs: 12, b: 1, c: P.v, dy: -12, al: 'left', dx: -4, a: L(2) }); }
    // steps 4 and 5: every published pattern, one row each, the same width
    if (many > .01) ROWS.forEach((key, i) => { const r = M[key]; row(R, r.s, zr(i), many, 0, P);
      lab(R, [-WR / 2 - .15, .05, zr(i)], r.m.label + ' · ' + ratio(r.s), { fs: 12, mono: true, al: 'right', dx: -4, c: P.ink, a: la(st, e, q => q === 3 ? 1 : 0), grp: 'rows' }); });
    if (fal > .01) { const f = M['falcon-h1-34b'], z = zr(ROWS.length) - .1; row(R, f.s, z, fal, .18, P);
      lab(R, [-WR / 2 - .15, .05, z], f.m.label + ' · parallel', { fs: 12, mono: true, b: 1, al: 'right', dx: -4, c: P.ink, a: la(st, e, q => q === 4 ? 1 : 0), grp: 'rows' });
      lab(R, [0, .3, z - .3], '72 layers, attention and Mamba-2 side by side in each', { fs: 12.5, b: 1, c: P.ink, dy: -20, a: la(st, e, q => q === 4 ? 1 : 0) }); }
  }
  const full = { cam: [.3, .62], bounds: [[-6.4, 0, -4.2], [5.2, 1.4, 3.2]] };
  S3.stage({ id: 'stg-hyb', list: 'sx-hyb', fig: 'Fig. 5 · hybrid layer patterns, from the configs', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1700, hold: 5200, draw, margin: w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 20],
    view: k => k === 0 ? { cam: [.55, .62], bounds: [[-4.4, 0, .2], [4.4, .9, 1.6]] } : k === 1 ? { cam: [.45, .58], bounds: [[-4.4, 0, .2], [5.9, 1.4, 1.6]] } : k === 2 ? { cam: [.28, .55], bounds: [[-4.6, 0, -1.0], [6.0, 2.6, 1.6]] } : k === 4 ? { cam: [.3, .5], bounds: [[-5.6, 0, -4.4], [4.6, .9, -2.6]] } : full });
})();
