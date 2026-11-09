// ---- Scene (top, Fig. 1): one 512 x 512 photo through SmolVLM-500M (back lane) and Qwen3.5-0.8B (front lane). The views are the ones the
// processors produced, decoded back from pixel_values (out/smol_saw.json, out/qwen_saw.json); token walls are to scale, one square per token;
// counts and positions are the recorded ones (VM_DATA.saw.images, key p01_cat). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.VMK) return;
  const K = VMK, { tw, la, lab, seg, arcPts, imgUp, wall, int } = K, { mix } = S3;
  const cat = K.saw('p01_cat'); if (!cat) return;
  const sm = cat.smol[0], q = cat.qwen.find(x => x.budget === '256') || cat.qwen[0];
  const ZS = -1.7, ZQ = 1.5, PX = -5.6, PW = 1.6, VX = -3.1, CX = .45, WX = 1.25, TS = .065, LX = 4.6;
  const txtS = sm.promptTok - sm.imgTok, txtQ = q.promptTok - q.imgTok;
  function draw(R, k, e, st) {
    const P = R.P, cS = P.acc, cQ = P.c4; R.grid(-6.6, 6.2, -3.2, 2.8, .5);
    const photo = K.pic(cat.full || K.D.catThumb);
    // 1. the photo
    const pa = tw(st, e, s => s === 0 ? 1 : .35);
    imgUp(R, photo, PX, .15, 0, PW, PW, { a: pa });
    lab(R, [PX + PW / 2, .15, 0], '512 × 512 photo', { fs: 12.5, b: 1, dy: 14, a: la(st, e, s => s === 0 ? 1 : 0) });
    // 2. the processor: SmolVLM enlarges to 2,048 and cuts 4 x 4 tiles plus a global view; Qwen3.5 keeps 512 x 512
    const va = tw(st, e, s => s < 1 ? .12 : s <= 2 ? 1 : .4), ts = .37, tg = .04, ga = tw(st, e, s => s === 2 ? .75 : 0);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = VX + c * (ts + tg), y = .15 + (3 - r) * (ts + tg);
      imgUp(R, st.k >= 1 || st.pk >= 1 ? K.pic(sm.thumbs[r * 4 + c]) : null, x, y, ZS, ts, ts, { a: va, sub: 2, rim: .03, grid: [32, 32, P.paper, ga], gw: .35 }); }
    const gx = VX + 4 * (ts + tg) + .15, gs = .6;
    imgUp(R, st.k >= 1 || st.pk >= 1 ? K.pic(sm.thumbs[16]) : null, gx, .15, ZS, gs, gs, { a: va, sub: 3, rim: .03, grid: [32, 32, P.paper, ga], gw: .35 });
    const qs = 1.6; imgUp(R, st.k >= 1 || st.pk >= 1 ? K.pic(q.picture) : null, VX, .15, ZQ, qs, qs, { a: va, grid: [32, 32, P.paper, ga], gw: .45 });
    if (k === 1) { R.flow(arcPts(R, [PX + PW, 1.2, 0], [VX, 1.2, ZS], .5, 18), { c: cS, a: e, r: .07, speed: 1.3 }); R.flow(arcPts(R, [PX + PW, .9, 0], [VX, .9, ZQ], .3, 18), { c: cQ, a: e, r: .07, speed: 1.3 }); }
    const l1 = la(st, e, s => s === 1 ? 1 : 0), l2 = la(st, e, s => s === 2 ? 1 : 0);
    lab(R, [VX + .85, 1.85, ZS], 'SmolVLM: enlarged to 2,048, 16 tiles + global', { fs: 12.5, b: 1, c: cS, dy: -10, a: l1 });
    lab(R, [VX + .8, .15, ZQ], 'Qwen3.5: kept at 512 × 512', { fs: 12.5, b: 1, c: cQ, dy: 14, a: l1 });
    lab(R, [VX + .85, 1.85, ZS], '17 views × 1,024 = 17,408 patches', { fs: 12.5, b: 1, c: cS, dy: -10, a: l2 });
    lab(R, [VX + .8, .15, ZQ], '32 × 32 = 1,024 patches of 16 px', { fs: 12.5, b: 1, c: cQ, dy: 14, a: l2 });
    // 3. the connector: a merge, then a matrix (SmolVLM) or an MLP (Qwen3.5); the image tokens come out as walls, one square per token
    const ca = tw(st, e, s => s < 3 ? .12 : s === 3 ? 1 : .45);
    R.glass([CX - .05, .15, ZS - .3], [0, 0, .6], [0, 1.1, 0], { c: cS, a: ca, nu: 4, nv: 6 });
    R.glass([CX - .05, .15, ZQ - .3], [0, 0, .6], [0, 1.1, 0], { c: cQ, a: ca, nu: 4, nv: 6 });
    const wa = tw(st, e, s => s < 3 ? .1 : 1);
    const nS = k >= 4 ? sm.promptTok : sm.imgTok, nQ = k >= 4 ? q.promptTok : q.imgTok;
    wall(R, WX, .15, ZS, k >= 4 && st.pk < 4 ? Math.round(sm.imgTok + txtS * e) : nS, 32, TS, cS, wa, { colOf: i => i < sm.imgTok ? mix(P.paper, cS, .78) : mix(P.paper, P.mute, .35) });
    wall(R, WX, .15, ZQ, k >= 4 && st.pk < 4 ? Math.round(q.imgTok + txtQ * e) : nQ, 32, TS, cQ, wa, { colOf: i => i < q.imgTok ? mix(P.paper, cQ, .78) : mix(P.paper, P.mute, .35) });
    if (k === 3) { R.flow(seg([gx + gs, .5, ZS], [CX, .6, ZS], 10), { c: cS, a: e, r: .065, speed: 1.2 }); R.flow(seg([CX + .1, .6, ZS], [WX, .6, ZS], 8), { c: cS, a: e, r: .065, speed: 1.2 });
      R.flow(seg([VX + qs, .6, ZQ], [CX, .6, ZQ], 10), { c: cQ, a: e, r: .065, speed: 1.2 }); R.flow(seg([CX + .1, .5, ZQ], [WX, .4, ZQ], 8), { c: cQ, a: e, r: .065, speed: 1.2 }); }
    const l3 = la(st, e, s => s === 3 ? 1 : 0), l4 = la(st, e, s => s === 4 ? 1 : 0), top = .15 + Math.ceil(sm.promptTok / 32) * TS;
    lab(R, [CX, 1.3, ZS], '4 × 4 merge, linear', { fs: 12, c: cS, dy: -10, a: l3 });
    lab(R, [CX, 1.3, ZQ], '2 × 2 merge, MLP', { fs: 12, c: cQ, dy: -10, a: l3 });
    lab(R, [WX + 1.05, .15 + Math.ceil(sm.imgTok / 32) * TS, ZS], int(sm.imgTok) + ' image tokens', { fs: 13, b: 1, c: cS, dy: -12, a: l3 });
    lab(R, [WX + 1.05, .15 + Math.ceil(q.imgTok / 32) * TS, ZQ], int(q.imgTok) + ' image tokens', { fs: 13, b: 1, c: cQ, dy: -12, a: l3 });
    // 4. the language model reads one sequence: the image tokens plus the text, 1-D positions against 3-D (t, h, w)
    const ma = tw(st, e, s => s < 4 ? .1 : 1);
    R.box([LX, 0, ZS], [.6, 1, .5], { fill: mix(P.paper, P.c5, .35), a: ma }); R.box([LX, 0, ZQ], [.6, 1, .5], { fill: mix(P.paper, P.c5, .35), a: ma });
    if (k === 4) { R.flow(seg([WX + 2.1, .6, ZS], [LX - .3, .6, ZS], 8), { c: cS, a: e, r: .065 }); R.flow(seg([WX + 2.1, .4, ZQ], [LX - .3, .4, ZQ], 8), { c: cQ, a: e, r: .065 }); }
    lab(R, [WX + 1.05, top, ZS], int(sm.promptTok) + '-token prompt, positions 0 to ' + int(sm.promptTok - 1), { fs: 12.5, b: 1, c: cS, dy: -12, a: l4 });
    lab(R, [WX + 1.05, .15 + Math.ceil(q.promptTok / 32) * TS, ZQ], int(q.promptTok) + ' tokens, (t, h, w) ends at ' + q.lastPos, { fs: 12.5, b: 1, c: cQ, dy: -12, a: l4 });
    lab(R, [LX, 1, ZQ], 'language model', { fs: 12, c: P.mute, dy: -10, a: l4 });
    // the two lanes, named once the photo has been handed over
    const ln = tw(st, e, s => s === 0 ? 0 : 1);
    lab(R, [VX + .85, 1.85, ZS], 'SmolVLM-500M', { fs: 12.5, b: 1, c: cS, dy: -10, a: ln * la(st, e, s => s >= 3 ? 1 : 0) });
    lab(R, [VX + .8, .15, ZQ], 'Qwen3.5-0.8B', { fs: 12.5, b: 1, c: cQ, dy: 14, a: ln * la(st, e, s => s >= 3 ? 1 : 0) });
  }
  const full = { cam: [.3, .55], bounds: [[-6, 0, -2.4], [5.2, 2.4, 2.4]] };
  const st = S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one photo, two VLMs, measured', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 4600, draw, margin: K.margin,
    view: k => k === 0 ? { cam: [.3, .3], bounds: [[-6, 0, -1], [-2.4, 2, 1]] } : k <= 2 ? { cam: [.3, .5], bounds: [[-6, 0, -2.2], [0, 2.1, 2.2]] } : full });
  K.onPic(() => st && st.draw());
})();
