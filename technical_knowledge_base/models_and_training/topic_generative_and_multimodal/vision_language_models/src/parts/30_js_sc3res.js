// ---- Scene (section 2, Fig. 3): the same 3:2 photo (scikit-image's rocket, 640 x 427, public domain) through SmolVLM's tiling and
// Qwen3.5's native resolution, drawn to scale (one world unit = 512 pixels). Views are the processors' own, decoded from pixel_values;
// sizes, grids and token counts are the recorded ones (VM_DATA.saw.images, key rocket_native). ----
(function () {
  if (!document.getElementById('stg-res') || !window.VMK) return;
  const K = VMK, { tw, la, lab, seg, arcPts, imgUp, wall, int, mix, lerp } = K;
  const im = K.saw('rocket_native'); if (!im) return;
  const sm = im.smol[0], q = im.qwen.find(x => x.budget === 'native'), U = 1 / 512;
  const ow = im.w * U, oh = im.h * U, sw = sm.resized[1] * U, sh = sm.resized[0] * U, qw = q.resized[0] * U, qh = q.resized[1] * U;
  const OX = -6.2, SX = -4.3, ZS = -1, ZQ = 1.3, GX = SX + sw + .55, WX = 1.9, TS = .066;
  function draw(R, k, e, st) {
    const P = R.P, cS = P.acc, cQ = P.c4; R.grid(-6.8, 4.6, -2.6, 2.6, .5);
    // 1. the original
    imgUp(R, K.pic(im.full), OX, .15, 0, ow, oh, { a: tw(st, e, s => s === 0 ? 1 : .4) });
    lab(R, [OX + ow / 2, .15, 0], im.w + ' × ' + im.h + ', a 3:2 photo', { fs: 12.5, b: 1, dy: 14, a: la(st, e, s => s === 0 ? 1 : 0) });
    // 2. SmolVLM: long side to 2,048, short side rounded up to whole 512 tiles (stretched), then 4 x 3 tiles plus a squashed global view
    const sa = tw(st, e, s => s === 0 ? .1 : s <= 2 ? 1 : .3), grow = k === 1 && st.pk < 1 ? e : k >= 1 ? 1 : 0, gap = tw(st, e, s => s >= 2 ? .06 : 0);
    if (grow < 1 && st.k <= 1) { const w = lerp(ow, sw, grow), h = lerp(oh, sh, grow); imgUp(R, K.pic(im.full), SX, .15, ZS, w, h, { a: sa }); }
    else for (let r = 0; r < sm.rows; r++) for (let c = 0; c < sm.cols; c++) { const t = 512 * U, x = SX + c * (t + gap), y = .15 + (sm.rows - 1 - r) * (t + gap);
      imgUp(R, K.pic(sm.thumbs[r * sm.cols + c]), x, y, ZS, t, t, { a: sa, sub: 2, rim: .03, grid: [8, 8, P.paper, tw(st, e, s => s === 2 ? .75 : 0)], gw: .6 }); }
    const ga = sa * (k >= 1 ? (st.pk < 1 ? e : 1) : 0);
    imgUp(R, K.pic(sm.thumbs[sm.views - 1]), GX, .15, ZS, 1, 1, { a: ga, sub: 3, rim: .03, grid: [8, 8, P.paper, tw(st, e, s => s === 2 ? .75 : 0)], gw: .6 });
    if (k === 1) R.flow(arcPts(R, [OX + ow, .6, 0], [SX, .9, ZS], .6, 18), { c: cS, a: e, r: .07 });
    lab(R, [SX + sw / 2, .15 + sh, ZS], 'SmolVLM: stretched to ' + int(sm.resized[1]) + ' × ' + int(sm.resized[0]) + ', shape 1.50 to ' + (sm.resized[1] / sm.resized[0]).toFixed(2), { fs: 12.5, b: 1, c: cS, dy: -20, a: la(st, e, s => s === 1 ? 1 : 0) });
    lab(R, [GX + .5, 1.15, ZS], '+ global view, squashed', { fs: 12, c: cS, dy: -12, a: la(st, e, s => s === 1 ? 1 : 0), wide: 1 });
    lab(R, [SX + sw / 2, .15 + sh, ZS], (sm.views - 1) + ' tiles + global = ' + sm.views + ' views × 64 tokens', { fs: 12.5, b: 1, c: cS, dy: -20, a: la(st, e, s => s === 2 ? 1 : 0) });
    // 3. Qwen3.5: resized only to multiples of 32, shape kept; 16-pixel patches, then 2 x 2 merged
    const qa = tw(st, e, s => s < 3 ? .1 : 1), qg = tw(st, e, s => s === 3 ? .8 : s === 4 ? .8 : 0), merged = k >= 4 ? 2 : 1;
    imgUp(R, st.k >= 3 || st.pk >= 3 ? K.pic(q.picture) : null, SX, .15, ZQ, qw, qh, { a: qa, grid: [q.thw[2] / merged, q.thw[1] / merged, P.paper, qg], gw: .5 });
    if (k === 3) R.flow(arcPts(R, [OX + ow, .4, 0], [SX, .4, ZQ], .3, 14), { c: cQ, a: e, r: .07 });
    lab(R, [SX + qw / 2, .15, ZQ], 'Qwen3.5: ' + q.resized[0] + ' × ' + q.resized[1] + ', shape kept: ' + q.thw[2] + ' × ' + q.thw[1] + ' patches', { fs: 12.5, b: 1, c: cQ, dy: 16, a: la(st, e, s => s === 3 ? 1 : 0) });
    lab(R, [SX + qw / 2, .15, ZQ], 'merged 2 × 2: ' + q.thw[2] / 2 + ' × ' + q.thw[1] / 2 + ' = ' + q.imgTok + ' tokens', { fs: 12.5, b: 1, c: cQ, dy: 16, a: la(st, e, s => s === 4 ? 1 : 0) });
    // 4. the tokens, one square each
    const wS = tw(st, e, s => s < 2 ? .1 : s === 2 || s === 4 ? 1 : .35), wQ = tw(st, e, s => s < 4 ? .1 : 1);
    wall(R, WX, .15, ZS, sm.imgTok, 32, TS, cS, wS, { colOf: () => mix(P.paper, cS, .78) });
    wall(R, WX, .15, ZQ, q.imgTok, 32, TS, cQ, wQ, { colOf: () => mix(P.paper, cQ, .78) });
    if (k === 2) R.flow(seg([GX + 1, .6, ZS], [WX, .6, ZS], 8), { c: cS, a: e, r: .07 });
    if (k === 4) R.flow(seg([SX + qw, .35, ZQ], [WX, .35, ZQ], 14), { c: cQ, a: e, r: .07 });
    lab(R, [WX + 1.05, .15 + Math.ceil(sm.imgTok / 32) * TS, ZS], int(sm.imgTok) + ' tokens', { fs: 13, b: 1, c: cS, dy: -12, a: la(st, e, s => s === 2 || s === 4 ? 1 : 0) });
    lab(R, [WX + 1.05, .15 + Math.ceil(q.imgTok / 32) * TS, ZQ], int(q.imgTok) + ' tokens', { fs: 13, b: 1, c: cQ, dy: -12, a: la(st, e, s => s === 4 ? 1 : 0) });
  }
  const full = { cam: [.22, .5], bounds: [[-6.4, 0, -1.4], [4.1, 2.3, 1.7]] };
  const st = S3.stage({ id: 'stg-res', list: 'sx-res', fig: 'Fig. 3 · one 3:2 photo, tiles against native, to scale', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 4800, draw, margin: K.margin,
    view: k => k === 0 ? { cam: [.25, .35], bounds: [[-6.5, 0, -.8], [-3.3, 1.3, .8]] } : k <= 2 ? { cam: [.2, .45], bounds: [[-6.4, 0, -1.4], [4.1, 2.3, .4]] } : k === 3 ? { cam: [.22, .4], bounds: [[-6.3, 0, .2], [-2.2, 1.2, 2.2]] } : full });
  K.onPic(() => st && st.draw());
})();
