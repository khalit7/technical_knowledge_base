// ---- Scene (section 3, Fig. 4): one token through one MLA layer at DeepSeek-V3's dimensions (AVR.mla.deepseek_v3, from config.json; 61 layers
// from AVL 'dsv3'), against standard MHA on the same token: the DeepSeek MLA explainer's before/after, rebuilt in 3D. Every array is drawn to one
// scale, one cell = 64 numbers: h (7,168) is 112 cells, the latent 8, the RoPE key 1, MHA's keys and values 256 each. Six earlier tokens drawn. ----
(function () {
  if (!document.getElementById('stg-mla') || !window.AVS || !window.AVR) return;
  const { mix, lerp, lerp3 } = S3, { tw, la, lab, slab, int, bytes } = AVS, M = AVR.mla.deepseek_v3, NL = AVS.rung('dsv3').groups[0].n;
  const C = .12, CELL = 64, nH = M.D / CELL, nC = M.dc / CELL, nR = M.dr / CELL, nKV = M.H * M.hd_nope / CELL, mlaN = M.dc + M.dr, mhaN = 2 * M.H * M.hd_nope;
  const HX = -3.1, PX = -2.05, VX = -1.15, SX = 2.5, TH = .07, OLD = 6, QY = 1.35;
  let mode = 'mla';
  const hSlab = (R, a, P) => { slab(R, [HX, 0, 0], [8 * C, .06, 14 * C], 8, 14, { fill: mix(P.paper, P.mute, .25), a }); };
  // the cache: earlier tokens' entries stacked, one slab per token; MLA's entry is 8 latent cells and 1 RoPE cell in a row, MHA's 32 x 16 cells
  function mlaEntry(R, c, a, P, o) { slab(R, [c[0] - C / 2, c[1], c[2]], [nC * C, TH, C], nC, 1, Object.assign({ fill: mix(P.paper, P.good, .7), a }, o));
    slab(R, [c[0] + nC * C / 2, c[1], c[2]], [C, TH, C], 1, 1, Object.assign({ fill: mix(P.paper, P.k, .85), a }, o)); }
  function mhaEntry(R, c, a, P, o) { slab(R, [c[0], c[1], c[2] - 4 * C], [32 * C, TH, 8 * C], 32, 8, Object.assign({ fill: mix(P.paper, P.k, .7), a }, o));
    slab(R, [c[0], c[1], c[2] + 4 * C], [32 * C, TH, 8 * C], 32, 8, Object.assign({ fill: mix(P.paper, P.v, .62), a }, o)); }
  const stackTop = j => j * (TH + .012);
  function drawMLA(R, k, e, st, P) {
    const A = f => tw(st, e, f), L = f => la(st, e, f);
    hSlab(R, A(q => q <= 2 ? 1 : .3), P);
    lab(R, [HX, .06, 14 * C / 2], 'hₜ · ' + int(M.D) + ' numbers', { fs: 12.5, b: 1, c: P.ink, dy: 16, a: L(q => q <= 1 ? 1 : 0) });
    // the down-projection and the RoPE key's projection: glass plates
    const pa = A(q => q === 1 ? 1 : q === 2 ? .6 : q === 3 ? .3 : .12);
    R.glass([PX, .05, -1.0], [0, 0, 1.15], [0, .95, 0], { c: P.good, a: pa, nu: 6, nv: 5 }); R.glass([PX, .05, .45], [0, 0, .45], [0, .6, 0], { c: P.k, a: pa * A(q => q >= 2 ? 1 : .35), nu: 3, nv: 3 });
    lab(R, [PX, 1.0, -.45], 'Wᴰᴷⱽ', { serif: 1, fs: 15, b: 1, c: P.good, dy: -8, a: L(q => q === 1 ? 1 : 0) });
    lab(R, [PX, .65, .67], 'Wᴷᴿ, then RoPE', { serif: 1, fs: 14, b: 1, c: P.k, dy: -8, a: L(q => q === 2 ? 1 : 0) });
    if (k === 1) R.flow([[HX + .4, .2, -.3], [PX, .45, -.4], [VX - .1, .15, -.35]], { c: P.good, a: e, r: .07, speed: 1.3 });
    if (k === 2) R.flow([[HX + .4, .2, .3], [PX, .35, .67], [VX - .1, .15, .55]], { c: P.k, a: e, r: .07, speed: 1.3 });
    // the latent and the RoPE key appear, then move onto the cache (step 4)
    const t = k < 3 ? 0 : k === 3 ? e : 1, top = [SX, stackTop(OLD), 0];
    const cP = lerp3([VX, 0, -.35], [top[0] - C / 2, top[1], top[2]], t), rP = lerp3([VX, 0, .55], [top[0] + nC * C / 2, top[1], top[2]], t);
    const ca = A(q => q >= 1 ? 1 : 0), ra = A(q => q >= 2 ? 1 : 0);
    if (t < 1) { slab(R, cP, [nC * C, TH, C], nC, 1, { fill: mix(P.paper, P.good, .7), a: ca }); slab(R, rP, [C, TH, C], 1, 1, { fill: mix(P.paper, P.k, .85), a: ra }); }
    else mlaEntry(R, top, 1, P);
    lab(R, [VX, TH, -.35], 'cᴷⱽₜ · ' + M.dc + ' numbers', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 26, dy: -10, a: L(q => q === 1 || q === 2 ? 1 : 0) });
    lab(R, [VX, TH, .55], 'kᴿₜ · ' + M.dr + ', shared by all heads', { fs: 12.5, b: 1, c: P.k, al: 'left', dx: 12, dy: 10, a: L(q => q === 2 ? 1 : 0) });
    // the cache of this layer: earlier tokens' entries
    for (let j = 0; j < OLD; j++) mlaEntry(R, [SX, stackTop(j), 0], A(q => q >= 3 ? 1 : 0), P);
    lab(R, [SX + nC * C / 2 + C, stackTop(OLD) + TH, 0], 'cache: ' + int(mlaN) + ' numbers per token', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 10, a: L(q => q === 3 ? 1 : 0) });
    // prefill: each head's slice of the up-projections rebuilds keys and values from the latent: computed, used, never cached (dashed)
    const ga = A(q => q === 4 ? 1 : 0);
    if (ga > .01) { R.glass([-.6, .05, -1.95], [0, 0, 3.9], [0, 1.1, 0], { c: P.v, a: ga * .8, nu: 8, nv: 4 });
      slab(R, [.55, 1.25, -1.0], [16 * C, 0, 16 * C], 0, 0, { dash: 1, fill: P.k, a: ga }); slab(R, [.55, 1.25, 1.0], [16 * C, 0, 16 * C], 0, 0, { dash: 1, fill: P.v, a: ga });
      R.flow([[VX + .2, .15, -.35], [-.6, .7, -.6], [.4, 1.25, -1.0]], { c: P.k, a: ga, r: .06 }); R.flow([[VX + .2, .15, -.35], [-.6, .7, .4], [.4, 1.25, 1.0]], { c: P.v, a: ga, r: .06 });
      const l4 = L(q => q === 4 ? 1 : 0);
      lab(R, [-.6, 1.15, 0], 'Wᵁᴷᵢ, Wᵁⱽᵢ', { serif: 1, fs: 15, b: 1, c: P.v, dy: -10, a: l4 });
      lab(R, [.55, 1.25, -1.45], 'kᵢ = [kᶜᵢ ; kᴿ] · 128 heads', { fs: 12.5, b: 1, c: P.k, dy: -12, a: l4, grp: 'gh' });
      lab(R, [.55, 1.25, 1.45], 'vᵢ · 128 heads · not cached', { fs: 12.5, b: 1, c: P.v, dy: 14, a: l4, grp: 'gh' }); }
    // decode: the query moves into latent space and all 128 heads read the same entry of every earlier token
    const qa = A(q => q >= 5 ? 1 : 0);
    if (qa > .01) { slab(R, [SX, QY, 0], [16 * C, .06, 16 * C], 16, 16, { fill: mix(P.paper, P.q, .75), a: qa * A(q => q === 5 ? 1 : 0) });
      if (k === 5) for (let j = 0; j <= OLD; j++) R.flow([[SX - .2 + .07 * j, stackTop(j) + TH, 0], [SX - .3 + .1 * j, QY, 0]], { c: P.good, a: qa * .9, r: .05, n: 5, speed: 1.2 });
      lab(R, [SX - 16 * C / 2, QY + .06, 0], '128 heads · (Wᵁᴷᵢ)ᵀqᵢ', { fs: 12.5, b: 1, c: P.q, al: 'right', dx: -8, a: L(q => q === 5 ? 1 : 0) });
      lab(R, [SX + 16 * C / 2, QY, 0], 'reads ' + int(mlaN) + ' per earlier token', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 8, a: L(q => q === 5 ? 1 : 0) }); }
    // compare with MHA: its entry for one token, dashed, to the same scale
    const ma = A(q => q === 6 ? 1 : 0);
    if (ma > .01) { mhaEntry(R, [SX, 0, 0], ma, P, { dash: 1 });
      const l6 = L(q => q === 6 ? 1 : 0);
      lab(R, [SX, 0, 16 * C], 'MHA: ' + int(mhaN) + ' per token', { fs: 12.5, b: 1, c: P.v, dy: 16, a: l6 });
      lab(R, [SX + 16 * C, stackTop(OLD) + TH, 0], 'MLA: ' + int(mlaN) + ' · about ' + Math.round(mhaN / mlaN) + ' times fewer', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 8, dy: -22, a: l6 });
      lab(R, [SX + 16 * C, stackTop(OLD) + TH, 0], NL + ' layers, bf16: ' + bytes(mlaN * NL * 2) + ' against ' + bytes(mhaN * NL * 2), { fs: 12, c: P.mute, al: 'left', dx: 8, dy: -4, a: l6, wide: 1 }); }
  }
  function drawMHA(R, k, e, st, P) {
    const A = f => tw(st, e, f), L = f => la(st, e, f);
    hSlab(R, A(q => q <= 2 ? 1 : .3), P);
    lab(R, [HX, .06, 14 * C / 2], 'hₜ · ' + int(M.D) + ' numbers', { fs: 12.5, b: 1, c: P.ink, dy: 16, a: L(q => q <= 1 ? 1 : 0) });
    const pk = A(q => q === 1 ? 1 : q >= 2 && q <= 3 ? .35 : .12), pv = A(q => q === 2 ? 1 : q === 3 ? .35 : .12);
    R.glass([PX, .05, -2.0], [0, 0, 1.9], [0, 1.0, 0], { c: P.k, a: pk, nu: 8, nv: 4 }); R.glass([PX, .05, .1], [0, 0, 1.9], [0, 1.0, 0], { c: P.v, a: pv, nu: 8, nv: 4 });
    lab(R, [PX, .55, -2.0], 'Wᴷ · keys, per head', { serif: 1, fs: 14, b: 1, c: P.k, al: 'right', dx: -10, a: L(q => q === 1 ? 1 : 0) });
    lab(R, [PX, .55, 2.0], 'Wⱽ · values, per head', { serif: 1, fs: 14, b: 1, c: P.v, al: 'left', dx: 10, a: L(q => q === 2 ? 1 : 0) });
    if (k === 1) R.flow([[HX + .4, .2, -.4], [PX, .5, -1.05], [-1.4, .2, -1.05]], { c: P.k, a: e, r: .07 });
    if (k === 2) R.flow([[HX + .4, .2, .4], [PX, .5, 1.05], [-1.4, .2, 1.05]], { c: P.v, a: e, r: .07 });
    // keys and values of all 128 heads: 256 cells each; in step 4 they move onto the cache
    const t = k < 3 ? 0 : k === 3 ? e : 1, top = [SX, stackTop(OLD), 0], K0 = [-.55, 0, -1.05], V0 = [-.55, 0, 1.05];
    const kP = lerp3(K0, [top[0], top[1], top[2] - 8 * C / 2], t), vP = lerp3(V0, [top[0], top[1], top[2] + 8 * C / 2], t), sz = lerp(1, 0, t);
    if (t < 1) { slab(R, kP, [lerp(16, 32, t) * C, TH, lerp(16, 8, t) * C], 16, 16, { fill: mix(P.paper, P.k, .7), a: A(q => q >= 1 ? 1 : 0) });
      slab(R, vP, [lerp(16, 32, t) * C, TH, lerp(16, 8, t) * C], 16, 16, { fill: mix(P.paper, P.v, .62), a: A(q => q >= 2 ? 1 : 0) }); }
    else mhaEntry(R, top, 1, P);
    lab(R, [K0[0] + 16 * C / 2, TH, K0[2]], 'k₁ … k₁₂₈ · ' + int(nKV * CELL), { fs: 12.5, b: 1, c: P.k, al: 'left', dx: 10, a: L(q => q === 1 || q === 2 ? 1 : 0) });
    lab(R, [V0[0] + 16 * C / 2, TH, V0[2]], 'v₁ … v₁₂₈ · ' + int(nKV * CELL), { fs: 12.5, b: 1, c: P.v, al: 'left', dx: 10, a: L(q => q === 2 ? 1 : 0) });
    for (let j = 0; j < OLD; j++) mhaEntry(R, [SX, stackTop(j), 0], A(q => q >= 3 ? 1 : 0), P);
    lab(R, [SX + 16 * C, stackTop(OLD) + TH, 0], 'cache: ' + int(mhaN) + ' numbers per token', { fs: 12.5, b: 1, c: P.v, al: 'left', dx: 10, a: L(q => q === 3 ? 1 : 0) });
    const qa = A(q => q >= 4 ? 1 : 0);
    if (qa > .01) { slab(R, [SX, QY, 0], [16 * C, .06, 16 * C], 16, 16, { fill: mix(P.paper, P.q, .75), a: qa * A(q => q === 4 ? 1 : 0) });
      if (k === 4) for (let j = 0; j <= OLD; j++) [-1, 1].forEach(sd => R.flow([[SX + sd * 1.2, stackTop(j) + TH, sd * .4], [SX + sd * .5, QY, 0]], { c: sd < 0 ? P.k : P.v, a: qa * .9, r: .05, n: 5, speed: 1.2 }));
      lab(R, [SX - 16 * C / 2, QY + .06, 0], '128 query heads', { fs: 12.5, b: 1, c: P.q, al: 'right', dx: -8, a: L(q => q === 4 ? 1 : 0) });
      lab(R, [SX + 16 * C / 2, QY, 0], 'reads ' + int(mhaN) + ' per earlier token', { fs: 12.5, b: 1, c: P.v, al: 'left', dx: 8, a: L(q => q === 4 ? 1 : 0) }); }
    const ma = A(q => q === 5 ? 1 : 0);
    if (ma > .01) { mlaEntry(R, [SX, stackTop(OLD) + TH + .1, 0], ma, P);
      const l5 = L(q => q === 5 ? 1 : 0);
      lab(R, [SX + nC * C / 2, stackTop(OLD) + TH + .1, 0], 'MLA: ' + int(mlaN) + ' · about ' + Math.round(mhaN / mlaN) + ' times fewer', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 30, dy: -22, a: l5 });
      lab(R, [SX + nC * C / 2, stackTop(OLD) + TH + .1, 0], NL + ' layers, bf16: ' + bytes(mhaN * NL * 2) + ' against ' + bytes(mlaN * NL * 2), { fs: 12, c: P.mute, al: 'left', dx: 30, dy: -4, a: l5, wide: 1 }); }
  }
  function draw(R, k, e, st) { const P = R.P; R.grid(-5.6, 4.8, -2.4, 2.4, .5); (mode === 'mla' ? drawMLA : drawMHA)(R, k, e, st, P); }
  const full = { cam: [-.72, .6], bounds: [[-3.7, 0, -2.1], [4.5, 1.6, 2.1]] };
  const st = S3.stage({ id: 'stg-mla', list: 'sx-mla', fig: 'Fig. 4 · one token through one layer, DeepSeek-V3', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 5200, draw, margin: AVS.margin,
    view: k => mode === 'mla' ? (k <= 2 ? { cam: [-.8, .55], bounds: [[-3.7, 0, -1.2], [-.8, 1.0, 1.2]] } : k === 3 ? { cam: [-.75, .55], bounds: [[-3.4, 0, -1.2], [3.4, 1.0, 1.2]] } : k === 4 ? { cam: [-.7, .55], bounds: [[-1.8, 0, -2.1], [1.6, 1.4, 2.1]] } : k === 5 ? { cam: [-.6, .45], bounds: [[1.2, 0, -1.1], [3.8, 1.5, 1.1]] } : k === 6 ? { cam: [-.6, .6], bounds: [[.4, 0, -1.3], [4.6, .8, 1.3]] } : full)
      : (k <= 2 ? { cam: [-.8, .55], bounds: [[-3.7, 0, -2.1], [.5, 1.1, 2.1]] } : k === 4 ? { cam: [-.6, .5], bounds: [[.4, 0, -1.3], [4.6, 1.5, 1.3]] } : full) });
  const seg = document.getElementById('av-mlaM');
  AVS.chips(seg, v => { mode = v; const a = document.getElementById('sx-mla'), b = document.getElementById('sx-mha'); a.hidden = v !== 'mla'; b.hidden = v !== 'mha'; st && st.list(v === 'mla' ? 'sx-mla' : 'sx-mha'); });
})();
