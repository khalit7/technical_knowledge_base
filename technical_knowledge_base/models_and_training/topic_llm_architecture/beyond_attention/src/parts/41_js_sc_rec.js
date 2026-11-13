// ---- Scene (section 1, Fig. 1): one attention layer against one recurrent layer at Qwen3-Next-80B-A3B's shapes, read from its config in BAD.mem
// (attention: num_key_value_heads x head_dim, keys and values, per token; Gated DeltaNet: linear_num_value_heads x linear_key_head_dim x linear_value_head_dim).
// Volumes to scale: one state plate is one head's 128 x 128 matrix, one cache brick is one token's 1,024 numbers (1/16 of a plate), so the cache
// tower reaches the state's height at the crossover. The 8 words are illustrative; the counts are the config's. Replaces the 2D stepper (2026-11-09). ----
(function () {
  if (!document.getElementById('stg-rec') || !window.BAS || !window.BAD) return;
  const { mix } = S3, { tw, la, lab, brick, plate, topGrid, int, bytes, win } = BAS;
  const c = BAS.model('qwen3-next-80b-a3b').cfg, PER = 2 * c.num_key_value_heads * c.head_dim, NH = c.linear_num_value_heads,
    HK = c.linear_key_head_dim, HV = c.linear_value_head_dim, STATE = NH * HK * HV, CROSS = STATE / PER, PERPLATE = HK * HV / PER;
  const TOK = ['Once', 'upon', 'a', 'time', ',', 'a', 'little', 'girl'];
  const S = 2.0, G = .075, XC = -1.7, XS = 1.9, T = S / Math.sqrt(PERPLATE), BALL = [-.15, .8, 1.5];
  // tokens held after this step's motion: 1, then 8, then the crossover, then twice it
  const nAt = (k, e) => k === 0 ? 1 : k === 1 ? 1 + Math.floor(7 * win(e, .05, .8) + 1e-9) : k === 2 ? 8 : k === 3 ? Math.round(8 + (CROSS - 8) * win(e, 0, .85)) : Math.round(CROSS + CROSS * win(e, 0, .85));
  const tile = t => { const l = Math.floor(t / PERPLATE), i = t % PERPLATE, n = Math.sqrt(PERPLATE); return [XC - S / 2 + T * (i % n + .5), l * G, S / 2 - T * (Math.floor(i / n) + .5)]; };
  function cache(R, n, a, P) {
    const full = Math.floor(n / PERPLATE), rest = n % PERPLATE;
    for (let l = 0; l < full; l++) { brick(R, [XC, l * G, 0], [S, G * .92, S], a, { shadow: l === 0 }); if (l === full - 1 && !rest) topGrid(R, [XC, l * G, 0], [S, G * .92, S], 4, 4, a, P.paper); }
    for (let t = full * PERPLATE; t < n; t++) brick(R, tile(t), [T * .94, G * .92, T * .94], a, { shadow: t < PERPLATE });
    // the rest of the first layer, dashed, so the layout is whole from the first step
    if (n < PERPLATE) for (let t = n; t < PERPLATE; t++) { const p = tile(t), h = T * .47; R.quad([[p[0] - h, .003, p[2] - h], [p[0] + h, .003, p[2] - h], [p[0] + h, .003, p[2] + h], [p[0] - h, .003, p[2] + h]], { fill: P.soft, a: .6 * a, ea: .45, lw: .8, dash: [3, 3] }); }
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 3.6, -1.8, 2.6, .5);
    const n = nAt(k, e), sa = tw(st, e, q => q >= 2 ? 1 : 0), top = Math.ceil(n / PERPLATE) * G;
    cache(R, n, 1, P);
    // the new token, its key and value written into the cache, its query reading every entry
    const word = n <= 8 ? TOK[n - 1] : 'token ' + int(n);
    R.glow(BALL, .32, { c: P.q, a: .55 }); R.ball(BALL, .13, { c: P.q });
    lab(R, BALL, word, { fs: 13.5, b: 1, c: P.q, dy: -20, serif: n <= 8 });
    if (n <= 8) { R.flowArc(BALL, [tile(n - 1)[0], G, tile(n - 1)[2]], .4, { c: P.k, a: .9, r: .06, n: 7, speed: 1.4 });
      if (k >= 1) for (let t = 0; t < n - 1; t++) R.flowArc([tile(t)[0], G, tile(t)[2]], BALL, .55, { c: P.q, a: .75, r: .045, n: 5, speed: 1.6 }); }
    else for (let i = 0; i < 4; i++) { const p = [XC - .5 + .35 * i, top * (i + .5) / 4, S / 2]; R.flowArc(p, BALL, .3, { c: P.q, a: .8, r: .05, n: 6, speed: 1.6 }); }
    // the recurrent layer: one plate per head, the same size at every token
    if (sa > .01) { for (let h = 0; h < NH; h++) plate(R, [XS - S / 2, .04 + h * G, -S / 2], S, S, sa * (h === NH - 1 ? .9 : P.dark ? .07 : .32), /* lighter in dark mode, where 32 stacked plates read as a solid block */ { nu: h === NH - 1 ? 8 : 1, nv: h === NH - 1 ? 8 : 1, th: .02 });
      R.flowArc(BALL, [XS, NH * G * .6, .2], .35, { c: P.q, a: sa, r: .06, n: 7, speed: 1.3 });
      R.flowArc([XS - .3, NH * G * .4, .4], BALL, .25, { c: P.c1, a: sa, r: .055, n: 6, speed: 1.3 }); }
    // labels: what each object holds, one set per step
    const L = j => la(st, e, q => q === j ? 1 : 0), l0 = L(0), l1 = L(1), l2 = L(2), l3 = L(3), l4 = L(4);
    lab(R, [XC - S / 2, G, S / 2], 'keys and values: ' + c.num_key_value_heads + ' KV heads × ' + c.head_dim + ' × 2 = ' + int(PER) + ' numbers', { fs: 12.5, b: 1, c: P.ink, al: 'left', dy: 20, a: l0 });
    lab(R, [tile(0)[0] - T / 2, G, tile(0)[2]], 'one token, one brick', { fs: 12, c: P.mute, al: 'right', dx: -10, a: l0, wide: 1 });
    lab(R, [XC, G, S / 2], int(n) + ' tokens: ' + int(n * PER) + ' numbers, all read', { fs: 12.5, b: 1, c: P.ink, dy: 20, a: l1 });
    lab(R, [XS, NH * G, -S / 2], 'state: ' + NH + ' heads × ' + HK + ' × ' + HV + ' = ' + int(STATE) + ' numbers', { fs: 12.5, b: 1, c: P.c1, dy: -14, a: l2 });
    lab(R, [XS, 0, S / 2], 'overwritten in place at every token', { fs: 12, c: P.mute, dy: 18, a: l2, wide: 1 });
    lab(R, [XC, 0, S / 2], 'KV cache, ' + int(n) + ' tokens', { fs: 12.5, b: 1, c: P.ink, dy: 18, a: l2 });
    lab(R, [XC, top, -S / 2], int(n) + ' × ' + int(PER) + ' = ' + int(n * PER), { fs: 12.5, b: 1, c: P.ink, dy: -14, a: l3 });
    lab(R, [XS, NH * G, -S / 2], 'state ' + int(STATE), { fs: 12.5, b: 1, c: P.c1, dy: -14, a: la(st, e, q => q >= 3 ? 1 : 0) });
    lab(R, [0, 0, S / 2 + .3], n >= CROSS && k === 3 ? 'equal at ' + int(CROSS) + ' tokens' : null, { fs: 13, b: 1, c: P.acc, dy: 26, a: l3 });
    lab(R, [XC, top, -S / 2], int(n) + ' tokens: ' + (n / CROSS).toFixed(n >= 2 * CROSS ? 0 : 1) + '× the state', { fs: 12.5, b: 1, c: P.ink, dy: -14, a: l4 });
    lab(R, [0, 0, S / 2 + .3], 'at 131,072 tokens: ' + bytes(PER * 131072 * 2) + ' of cache, ' + bytes(STATE * 2) + ' of state (bf16)', { fs: 12.5, b: 1, c: P.acc, dy: 26, a: l4 });
  }
  const full = { cam: [.42, .5], bounds: [[-2.9, 0, -1.2], [3.1, 2.5, 2.3]] };
  S3.stage({ id: 'stg-rec', list: 'sx-rec', fig: 'Fig. 1 · one layer of each, Qwen3-Next-80B-A3B', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1600, hold: 4800, draw, margin: BAS.margin,
    view: k => k <= 1 ? { cam: [.3, .58], bounds: [[-2.8, 0, -1.1], [.15, .9, 1.7]] } : k === 4 ? { cam: [.42, .42], bounds: [[-2.9, 0, -1.2], [3.1, 4.9, 2.3]] } : full });
})();
