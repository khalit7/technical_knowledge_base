// ---- Scene (top, Fig. 1): one Llama 3.1 8B request's KV cache as a block growing along the context axis, to scale against its weights and one
// 80 GB GPU. Every number is the calculator engine's (KC.seq, KC.redesign, KC.reach on the preset 'llama-3.1-8b' from config.json): 131,072 bytes
// per token, 16.06 GB of bf16 weights, 92% of 80 GB usable. The block's length is tokens (131,072 = the full axis); its cross-section stands for
// one token's entry, the same for the weights block behind it, so lengths compare memory. The MHA row's cross-section is 4 times as large.
// Rows, front to back: this request's cache, the weights, the MHA counterfactual; more requests stack on the first. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.LCS || !window.KC) return;
  const { mix } = S3, { tw, la, lab, int, gib, gb } = LCS;
  const p = KC.byKey['llama-3.1-8b'], mha = KC.redesign(p, 'mha');
  const tok = KC.seq(p, 1).total, tokM = KC.seq(mha, 1).total, W8 = p.params * 2, CAP = 80e9 * 0.92, Tm = 131072;
  const reach = KC.reach(mha, CAP - W8), wTok = W8 / tok, seqB = T => KC.seq(p, T).total, n3 = Math.floor((CAP - W8) / seqB(Tm));
  const X0 = -4.6, LX = 8, X = t => X0 + LX * t / Tm, HG = .28, D = .62, ZW = -1.0, ZM = -2.0, GX = 4.8, GW = .8, GZ = -1.0, HC = 1.5, gy = b => HC * b / 80e9;
  const SH = HG + .03; // the height of one stacked request
  function block(R, T, h, z, c, a, P, y) {
    if (a <= .01 || T <= 0) return; const L = Math.max(.05, X(T) - X0);
    R.box([X0 + L / 2, y || 0, z], [L, h, D], { fill: mix(P.paper, c, .62), a, lw: .8, shadow: !y && a > .5 });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.4, 6, -2.8, 1.2, .5);
    // the context the request has reached at this point of the step
    const T = k === 0 ? 1 : k === 1 ? 32768 * e : k === 2 ? 32768 + (Tm - 32768) * e : Tm;
    const ca = tw(st, e, q => q === 4 ? .3 : 1);
    if (k === 0) { R.box([X0 + .06, 0, 0], [.12, HG / 2, D], { fill: mix(P.paper, P.k, .62), a: 1, lw: .9 }); R.box([X0 + .06, HG / 2, 0], [.12, HG / 2, D], { fill: mix(P.paper, P.v, .55), a: 1, lw: .9, shadow: false }); }
    else block(R, T, HG, 0, P.acc, ca, P);
    // one token, step 1: the slice in close-up, labels clear of it on the right
    const l0 = la(st, e, q => q === 0 ? 1 : 0), xr = X0 + .55;
    lab(R, [xr, HG, 0], '1 token = 2 × 32 × 8 × 128 = ' + int(tok / 2) + ' numbers', { fs: 12.5, b: 1, c: P.acc, al: 'left', dy: -26, a: l0 });
    lab(R, [xr, HG, 0], '= ' + int(tok) + ' bytes in bf16 = ' + tok / 1024 + ' KiB', { fs: 12.5, c: P.acc, al: 'left', dy: -8, a: l0 });
    lab(R, [xr, HG * .75, 0], 'values: 8 heads × 128', { fs: 12, b: 1, c: P.v, al: 'left', dy: 10, a: l0 });
    lab(R, [xr, HG * .25, 0], 'keys: 8 heads × 128', { fs: 12, b: 1, c: P.k, al: 'left', dy: 14, a: l0 });
    lab(R, [X0 + .06, 0, D / 2], 'all 32 layers, front to back', { fs: 12, c: P.mute, dy: 16, a: l0 });
    // the context axis along the front edge; the tick a step is about carries its number
    const ax = la(st, e, q => q === 0 ? 0 : 1), zt = D / 2 + .12, hot = q => q === 1 ? 32768 : q === 2 ? Tm : -1;
    R.line([[X0, .002, zt], [X(Tm), .002, zt]], { c: P.mute, w: 1, a: ax * .8 });
    [0, 32768, 65536, 98304, 131072].forEach(t => { R.line([[X(t), .002, zt - .04], [X(t), .002, zt + .08]], { c: P.mute, w: 1, a: ax });
      const h = la(st, e, q => hot(q) === t ? 1 : 0);
      lab(R, [X(t), 0, zt + .08], t ? int(t) : '0 tokens', { fs: 12, c: P.mute, dy: 12, a: ax * Math.max(0, 1 - 3 * h), wide: t % 65536 !== 0 });
      if (h > .01) lab(R, [X(t), 0, zt + .08], int(t) + ' tokens · ' + gib(seqB(t)) + ' (' + gb(seqB(t)) + ')', { fs: 12.5, b: 1, c: P.acc, al: t === Tm ? 'right' : 'center', dx: t === Tm ? 30 : 0, dy: R.W < 520 ? 42 : 12, a: h }); });
    // writing: new tokens' keys and values stream into the growing end
    const fa = k === 1 || k === 2 ? (e < 1 ? 1 : .6) : 0;
    if (fa > .01 && T > 0) R.flowArc([X(T) + 1.0, .8, 0], [X(T), HG * .6, 0], .22, { c: P.acc, a: fa, r: .06, n: 7, speed: 1.4 });
    // the weights behind, at the same cross-section: 122,532 tokens long
    const wa = tw(st, e, q => q < 2 ? 0 : q === 4 ? .55 : 1);
    if (wa > .01) { const L = X(wTok) - X0; R.box([X0 + L / 2, 0, ZW], [L, HG, D], { fill: mix(P.paper, P.mute, .3), a: wa, lw: .8 });
      lab(R, [X0 + L * .4, HG, ZW - D / 2], 'weights · ' + gb(W8) + ' = ' + int(wTok) + ' tokens of cache', { fs: 12.5, b: 1, c: P.ink, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0), wide: 1 });
      lab(R, [X0, HG / 2, ZW], 'weights', { fs: 12.5, b: 1, c: P.mute, al: 'right', dx: -8, a: la(st, e, q => q === 4 ? 1 : 0), wide: 1 }); }
    // three requests stacked, and a fourth that does not fit (they enter after the last step's labels have gone)
    const ra = la(st, e, q => q === 3 ? 1 : 0);
    if (ra > .01) { for (let i = 1; i < n3; i++) block(R, Tm, HG, 0, P.acc, ra, P, i * SH);
      LCS.frame(R, [X0 + LX / 2, n3 * SH, 0], [LX, HG, D], { c: P.bad, w: 1.3, a: ra * .9, dash: [5, 4] });
      for (let i = 0; i < n3; i++) lab(R, [X0, (i + .5) * SH, D / 2], 'request ' + (i + 1), { fs: 12, b: 1, c: P.acc, al: 'right', dx: -8, a: ra, grp: 'rq' });
      lab(R, [X0, (n3 + .5) * SH, D / 2], 'a ' + (n3 + 1) + 'th does not fit', { fs: 12, b: 1, c: P.bad, al: 'right', dx: -8, a: ra, grp: 'rq' }); }
    // MHA: four times the entry, full at 109,748 tokens
    const ma = la(st, e, q => q === 4 ? 1 : 0), TM = k === 4 ? reach * Math.max(0, (e - .5) * 2) : reach, hM = HG * tokM / tok;
    if (ma > .01) { block(R, TM, hM, ZM, P.bad, ma, P);
      if (k === 4 && e < 1) R.flowArc([X(TM) + 1.0, hM + .6, ZM], [X(TM), hM * .6, ZM], .22, { c: P.bad, a: ma, r: .07, n: 7, speed: 1.6 });
      const wl = k === 4 ? Math.max(0, (e - .9) / .1) : 1;
      R.glass([X(reach) + .02, 0, ZM - D / 2 - .08], [0, 0, D + .16], [0, hM + .3, 0], { c: P.bad, a: ma * wl, nu: 2, nv: 4 });
      lab(R, [X(reach), hM + .3, ZM], 'GPU full at ' + int(reach), { fs: 12.5, b: 1, c: P.bad, al: 'left', dx: 6, dy: R.W < 520 ? -24 : -6, a: ma * wl });
      lab(R, [X0, hM * .7, ZM], 'MHA, 32 KV heads', { fs: 12.5, b: 1, c: P.bad, al: 'right', dx: -8, a: ma });
      lab(R, [X0, hM * .7, ZM], tokM / 1024 + ' KiB per token', { fs: 12, c: P.bad, al: 'right', dx: -8, dy: 16, a: ma });
      lab(R, [X0, HG / 2, D / 2], 'GQA-8, as released', { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: -8, a: ma }); }
    // the GPU: one 80 GB column, to scale; the weights fill its bottom, the cache what this step holds
    const ga = la(st, e, q => q === 0 ? 0 : 1);
    if (ga > .01) { const used = k === 3 ? n3 * seqB(Tm) * ra : k === 4 ? KC.seq(mha, TM).total : seqB(T), uc = k === 4 ? P.bad : P.acc, full = Math.abs(W8 + used - CAP) < 2e8;
      R.box([GX, 0, GZ], [GW, gy(W8), GW], { fill: mix(P.paper, P.mute, .3), a: ga, lw: .8 });
      if (used > 0) R.box([GX, gy(W8), GZ], [GW, gy(used), GW], { fill: mix(P.paper, uc, .62), a: ga, lw: .8, shadow: false });
      if (k === 3) for (let i = 1; i < n3; i++) R.line([[GX - GW / 2, gy(W8 + i * seqB(Tm)), GZ + GW / 2], [GX + GW / 2, gy(W8 + i * seqB(Tm)), GZ + GW / 2]], { c: P.paper, w: 1.4, a: ga * ra });
      R.box([GX, 0, GZ], [GW + .02, HC, GW + .02], { fill: mix(P.paper, P.c1, .25), fa: .12, ea: .6, a: ga, shadow: false });
      { const y = gy(CAP), a0 = GX - GW / 2 - .06, a1 = GX + GW / 2 + .06, b0 = GZ - GW / 2 - .06, b1 = GZ + GW / 2 + .06; R.line([[a0, y, b0], [a1, y, b0], [a1, y, b1], [a0, y, b1], [a0, y, b0]], { c: P.bad, w: 2, a: ga, top: 1 }); }
      lab(R, [GX, HC, GZ - GW / 2], 'one 80 GB GPU', { fs: 12.5, b: 1, c: P.ink, dy: -12, a: ga });
      lab(R, [GX + GW / 2, gy(CAP), GZ + GW / 2], full ? 'full: 92% usable' : '92% usable', { fs: 12, b: full, c: P.bad, al: 'left', dx: 8, a: ga, grp: 'gpu' });
      lab(R, [GX + GW / 2, gy(W8 / 2), GZ + GW / 2], 'weights', { fs: 12, c: P.mute, al: 'left', dx: 8, a: ga, grp: 'gpu' });
      if (!full && used > 0) lab(R, [GX + GW / 2, gy(W8 + used), GZ + GW / 2], gb(W8 + used) + ' used', { fs: 12, b: 1, c: uc, al: 'left', dx: 8, a: ga, grp: 'gpu' }); }
  }
  const full = { cam: [.3, .44], bounds: [[-4.8, 0, -2.4], [5.6, 1.5, .6]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one Llama 3.1 8B request on one GPU', cam: full.cam, bounds: full.bounds, aspect: .44, dur: 1600, hold: 5200, draw, margin: w => w < 520 ? [22, 8, 14, 8] : [24, 18, 16, 150],
    view: k => k === 0 ? { cam: [.55, .38], bounds: [[-5.0, 0, -.5], [-2.0, .6, .5]] } : k === 1 ? { cam: [.3, .44], bounds: [[-4.8, 0, -1.4], [5.6, 1.5, .6]] } : full });
})();
