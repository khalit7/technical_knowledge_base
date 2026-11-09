// ---- Scene (section 2, Fig. 3): MHA, GQA-4, GQA-2 and MQA on the tiny GPT (8 query heads of 32, 6 layers). Query heads are orange glass plates;
// each KV head is a key plate (teal) and a value plate (purple) shared by its group; dots flow from every query head to the KV head it reads.
// The column on the right is one token's entry per layer, to scale (2 x KV heads x 32 numbers); the losses are the trained runs (AVR.runs, 100 windows). ----
(function () {
  if (!document.getElementById('stg-gqa') || !window.AVS || !window.AVR) return;
  const { mix } = S3, { tw, la, lab, int } = AVS, RU = AVR.runs, HQ = 8, DH = 32, NL = 6;
  const V = [{ nm: 'MHA', kv: 8, run: 'at_mha', s1: 'at_mha_s1' }, { nm: 'GQA-4', kv: 4, run: 'at_gqa4' }, { nm: 'GQA-2', kv: 2, run: 'at_gqa2' }, { nm: 'MQA', kv: 1, run: 'at_mqa', s1: 'at_mqa_s1' }];
  const XQ = q => -3.7 + q * 1.0, ZQ = 1.15, ZK = -1.15, PW = .8, PH = 1.25, CX = 4.9, HC = 1.4;
  const xk = (G, i) => { const g = HQ / G; let s = 0; for (let q = i * g; q < (i + 1) * g; q++) s += XQ(q); return s / g; };
  const loss = r => RU[r] ? RU[r].val_loss_100win.toFixed(3) : '';
  const nums = G => 2 * G * DH;
  function kvset(R, G, a, P) { if (a <= .01) return;
    for (let i = 0; i < G; i++) { const x = xk(G, i);
      R.glass([x - .45, .1, ZK], [.42, 0, 0], [0, PH, 0], { c: P.k, a, nu: 2, nv: 5 }); R.glass([x + .03, .1, ZK], [.42, 0, 0], [0, PH, 0], { c: P.v, a, nu: 2, nv: 5 }); } }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.4, 6.2, -2.2, 2.2, .5);
    const vk = Math.min(k, 3), vp = Math.min(st.pk == null ? vk : st.pk, 3), ma = tw(st, e, q => q === 4 ? 0 : 1);
    // query heads: never shared
    for (let q = 0; q < HQ; q++) { R.glass([XQ(q) - PW / 2, .1, ZQ], [PW, 0, 0], [0, PH, 0], { c: P.q, a: ma, nu: 4, nv: 5 }); }
    lab(R, [XQ(0) - PW / 2, .7, ZQ], '8 query heads', { fs: 12.5, b: 1, c: P.q, al: 'right', dx: -8, a: ma, grp: 'side' });
    // KV heads: the old set fades out while the new one fades in
    if (e < 1 && vp !== vk) { kvset(R, V[vp].kv, (1 - e) * ma, P); kvset(R, V[vk].kv, e * ma, P); } else kvset(R, V[vk].kv, ma, P);
    [...new Set([vp, vk])].forEach(v => { const al = la(st, e, q => Math.min(q, 3) === v ? 1 : 0) * ma; if (al > .01) lab(R, [XQ(0) - PW / 2, .7, ZK], V[v].kv + ' KV head' + (V[v].kv > 1 ? 's' : '') + ' · key + value', { fs: 12.5, b: 1, c: P.k, al: 'right', dx: -8, a: al, grp: 'side' }); });
    // each query head reads its group's key and value
    const G = V[vk].kv, fa = ma * (e < 1 && vp !== vk ? Math.max(0, 2 * e - 1) : 1);
    if (fa > .01) for (let q = 0; q < HQ; q++) { const i = Math.floor(q / (HQ / G)); R.flowArc([XQ(q), PH + .12, ZQ - .02], [xk(G, i), PH + .12, ZK + .02], .35, { c: P.q, a: fa * .85, r: .05, n: 7, speed: 1.4 }); }
    // one token's entry in one layer, to scale; and the trained model's loss
    if (k <= 3) { const h = tw(st, e, q => HC * nums(V[Math.min(q, 3)].kv) / nums(8)), al = la(st, e, q => q === k ? 1 : 0);
      R.box([CX, 0, 0], [.7, HC, .7], { fa: 0, ea: .35, shadow: false, lw: .8 });
      R.box([CX, 0, 0], [.7, h / 2, .7], { fill: mix(P.paper, P.k, .75) }); R.box([CX, h / 2, 0], [.7, h / 2, .7], { fill: mix(P.paper, P.v, .68), shadow: false });
      [...new Set([vp, vk])].forEach(v => { const a2 = la(st, e, q => Math.min(q, 3) === v ? 1 : 0); if (a2 <= .01) return;
        lab(R, [CX, 0, .35], int(nums(V[v].kv)) + ' numbers per token per layer', { fs: 12.5, b: 1, c: P.ink, dy: 34, a: a2 , wide: 1 });
        lab(R, [CX, 0, .35], int(nums(V[v].kv) * NL * 2) + ' B per token, 6 layers', { fs: 12, c: P.mute, dy: 51, a: a2 , wide: 1 });
        lab(R, [CX, 0, .35], V[v].nm + ' · held-out loss ' + loss(V[v].run), { fs: 12.5, b: 1, c: P.acc, dy: 16, a: a2 , wide: 1 }); }); }
    // all four side by side: the cache falls 8 times, the loss stays inside the seed spread
    const sa = tw(st, e, q => q === 4 ? 1 : 0);
    if (sa > .01) { const l4 = la(st, e, q => q === 4 ? 1 : 0);
      V.forEach((v, i) => { const x = .6 + i * 1.25, h = HC * nums(v.kv) / nums(8);
        R.box([x, 0, 0], [.7, h / 2, .7], { fill: mix(P.paper, P.k, .75), a: sa }); R.box([x, h / 2, 0], [.7, h / 2, .7], { fill: mix(P.paper, P.v, .68), a: sa, shadow: false });
        lab(R, [x, h, 0], int(nums(v.kv)), { fs: 12.5, b: 1, c: P.ink, dy: -12, a: l4 });
        lab(R, [x, 0, .35], v.nm, { fs: 12.5, b: 1, c: P.ink, dy: 14, a: l4 });
        lab(R, [x, 0, .35], loss(v.run) + (v.s1 ? ' (' + loss(v.s1) + ')' : ''), { fs: 12, c: P.acc, dy: 30, a: l4 }); });
      lab(R, [.0, .3, 0], 'numbers per token per layer', { fs: 12, c: P.mute, al: 'right', dx: -10, a: l4, wide: 1 });
      lab(R, [.0, 0, .35], 'held-out loss (seed 1)', { fs: 12, c: P.acc, al: 'right', dx: -10, dy: 30, a: l4, wide: 1 }); }
  }
  const full = { cam: [.28, .52], bounds: [[-4.3, 0, -1.4], [5.4, 1.5, 1.4]] };
  S3.stage({ id: 'stg-gqa', list: 'sx-gqa', fig: 'Fig. 3 · query heads sharing KV heads, tiny GPT', cam: full.cam, bounds: full.bounds, aspect: .55, dur: 1400, hold: 4600, draw, margin: w => w < 520 ? [22, 8, 30, 8] : [30, 18, 66, 150],
    view: k => k === 4 ? { cam: [.22, .4], bounds: [[-1.2, 0, -1], [5.2, 1.5, 1]] } : full });
})();
