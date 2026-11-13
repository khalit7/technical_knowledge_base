// ---- Scene (top, Fig. 1): one backbone, three training signals, two outputs. The image is test image p01 (the root's cat photo) read back
// from its thumbnail as 28 x 28 colours in a 14 x 14 patch grid (a B/16 at 224); probe numbers are this page's linear probes at 16 labels per
// class (VE.probes), ADE20K is DINOv2's published Table 10, the caption is the root's own for p01. MAE's mask is an illustrative 75%. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.VEK) return;
  const { mix } = S3, { tw, la, lab, seg, arcPts, image, cell, win } = VEK, PR = VE.probes.encoders, pc = v => (100 * v).toFixed(1) + '%';
  const G = 14, IX = -5, IS = 2.0, TX = -2.1, TS = 1.8, BX = .9, BS = 1.8, NB = 12, GAP = .1, OX = 3.9, PZ = .3, TZ = 1.5, ZF = 2.3;
  const cap = (VEL && VEL.captions ? VEL.captions[0] : 'a close-up of a tabby cat\'s face');
  // a fixed illustrative mask keeping 49 of 196 patches (25%), as MAE samples one per image
  const keep = new Set(); { let s = 7; while (keep.size < 49) { s = (s * 1103515245 + 12345) % 2147483648; keep.add(s % 196); } }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6.4, 5.4, -3.6, 3.6, .5);
    const bb = tw(st, e, q => q <= 2 ? 1 : q === 3 ? .12 : .35);                  // the backbone recedes while a training signal is the subject
    // 1. the image, cut into patches; at step 6 (MAE) three quarters of it is hidden
    const hide = k === 5 ? (r, c) => !keep.has(r * G + c) && win(e, .1, .5) > (((r * G + c) * 37) % 100) / 100 : null;
    image(R, 'p01_cat', 28, IX, 0, IS, { g: G, gap: .02, a: k === 5 ? 1 : bb, hide });
    lab(R, [IX, 0, IS / 2], '224 px image · 14 × 14 patches', { fs: 12.5, b: 1, c: P.ink, dy: 16, a: la(st, e, q => q === 0 ? 1 : 0) });
    // 2. the patch tokens
    R.glass([TX - TS / 2, .12, -TS / 2], [TS, 0, 0], [0, 0, TS], { c: P.acc, a: bb, nu: G, nv: G, th: .04 });
    if (k === 0 || k === 5) R.flow(arcPts(R, [IX + IS / 2, .1, 0], [TX - TS / 2, .2, 0], .45, 16), { c: k === 5 ? P.c4 : P.acc, r: .07, a: k === 5 ? .7 : e, speed: 1.3, n: k === 5 ? 3 : 7 });
    lab(R, [TX, .12, TS / 2], '196 tokens of 768', { mono: 1, fs: 12.5, c: P.acc, dy: 16, a: la(st, e, q => q === 0 ? 1 : 0) });
    // 3. the twelve blocks
    const sa = tw(st, e, q => q < 1 ? .12 : q <= 2 ? 1 : .35);
    for (let i = 0; i < NB; i++) R.glass([BX - BS / 2, .1 + i * GAP, -BS / 2], [BS, 0, 0], [0, 0, BS], { c: P.acc, a: sa * .5 * (k === 1 && st.pk < 1 ? win(e, i / NB * .7, i / NB * .7 + .25) : 1), nu: 4, nv: 4, th: .015 });
    if (k === 1) { R.flow(arcPts(R, [TX + TS / 2, .2, 0], [BX - BS / 2, .2, 0], .3, 10), { c: P.acc, r: .07, a: e, speed: 1.2 }); R.flow(seg([BX, .1, BS / 2 + .15], [BX, .1 + NB * GAP, BS / 2 + .15], 12), { c: P.acc, r: .06, a: e, speed: 1.0 }); }
    lab(R, [BX + BS / 2, .1 + NB * GAP, 0], 'ViT · 12 blocks mix all tokens', { fs: 12.5, b: 1, c: P.ink, al: 'left', dx: 8, a: la(st, e, q => q === 1 ? 1 : 0) });
    // 4. two outputs: one pooled vector, or every patch token
    const oa = tw(st, e, q => q < 2 ? .12 : q === 2 ? 1 : q === 3 ? .8 : .35);
    R.box([OX, 0, PZ], [.36, .95, .36], { fill: mix(P.paper, P.acc, .45), a: oa });
    R.glass([OX - .6, .08, -2.0], [1.2, 0, 0], [0, 0, 1.2], { c: P.c3, a: oa, nu: G, nv: G, th: .03 });
    if (k === 2) { R.flowArc([BX + BS / 2, 1.1, 0], [OX, .95, PZ], .35, { c: P.acc, r: .07, a: e, speed: 1.2 }); R.flowArc([BX + BS / 2, .7, -.6], [OX - .6, .15, -1.4], .3, { c: P.c3, r: .07, a: e, speed: 1.2 }); }
    if (R.W < 520) { // on a phone the grouped labels hide, so the two outputs are named above and below them instead
      lab(R, [OX, 0, PZ + .2], '1 pooled vector', { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: 14, dy: 16, a: la(st, e, q => q === 2 ? 1 : 0) });
      lab(R, [OX, .08, -2.0], 'every patch token', { fs: 12.5, b: 1, c: P.c3, al: 'right', dx: 10, dy: -12, a: la(st, e, q => q === 2 ? 1 : 0) }); }
    lab(R, [OX + .18, .95, PZ], '1 pooled vector', { fs: 12.5, b: 1, c: P.acc, al: 'left', dx: 8, grp: 'out', a: la(st, e, q => q === 2 ? 1 : 0) });
    lab(R, [OX + .18, .5, PZ], 'search, classify', { fs: 12, c: P.mute, al: 'left', dx: 8, grp: 'out', a: la(st, e, q => q === 2 ? 1 : 0) });
    lab(R, [OX + .6, .08, -1.6], 'every patch token', { fs: 12.5, b: 1, c: P.c3, al: 'left', dx: 8, grp: 'out', a: la(st, e, q => q === 2 ? 1 : 0) });
    lab(R, [OX + .6, .08, -1.2], 'dense tasks, VLMs', { fs: 12, c: P.mute, al: 'left', dx: 8, grp: 'out', a: la(st, e, q => q === 2 ? 1 : 0) });
    // what each training signal measures here, under its lane's label
    const res = (p, t1, t2, c, q) => { lab(R, p, t1, { fs: 12.5, b: 1, c, dy: 18, a: la(st, e, z => z === q ? 1 : 0) }); lab(R, p, t2, { fs: 12, c: P.ink, dy: 34, a: la(st, e, z => z === q ? 1 : 0) }); };
    // 5. captions: the caption through a text tower to a text vector, pulled towards the image's pooled vector
    const ca = tw(st, e, q => q === 3 ? 1 : 0);
    if (ca > .01) { R.box([.9, 0, ZF], [1.6, .2, .6], { fill: mix(P.paper, P.c2, .25), a: ca });
      for (let i = 0; i < 4; i++) R.glass([2.2, .1 + i * .12, ZF - .4], [.8, 0, 0], [0, 0, .8], { c: P.c2, a: ca * .6, nu: 3, nv: 3, th: .015 });
      R.box([OX, 0, TZ], [.36, .95, .36], { fill: mix(P.paper, P.c2, .45), a: ca });
      if (k === 3) { R.flow(seg([1.7, .15, ZF], [2.2, .3, ZF], 6), { c: P.c2, r: .06, a: e }); R.flow(arcPts(R, [3.0, .4, ZF], [OX, .9, TZ], .3, 10), { c: P.c2, r: .06, a: e });
        R.arc([OX, .97, TZ], [OX, .97, PZ], .35, { c: P.c2, w: 2, t: e, a: e }); }
      lab(R, [.9, .2, ZF], '"' + cap + '"', { serif: 1, fs: 12.5, c: P.c2, dy: -12, a: la(st, e, q => q === 3 ? 1 : 0) });
      lab(R, [OX, 1.25, (TZ + PZ) / 2], 'true pair pulled together', { fs: 12, c: P.c2, al: 'right', dx: -12, a: la(st, e, q => q === 3 ? 1 : 0) });
      res([.9, 0, ZF + .3], 'captions: CLIP, SigLIP 2', 'SigLIP 2 probe ' + pc(PR.siglip.linear_probe['16'].mean), P.c2, 3); }
    // 6. other views: a second crop of the same image through a slowly averaged teacher copy; the student must match it
    const va = tw(st, e, q => q === 4 ? 1 : 0);
    if (va > .01) { image(R, 'p01_cat', 18, IX, ZF, 1.35, { N: 28, i0: 4, j0: 6, a: va });
      for (let i = 0; i < 6; i++) R.glass([TX - .6, .1 + i * .2, ZF - .6], [1.2, 0, 0], [0, 0, 1.2], { c: P.c3, a: va * .45, nu: 3, nv: 3, th: .012 });
      if (k === 4) { R.flow(arcPts(R, [IX + .7, .1, ZF], [TX - .6, .3, ZF], .3, 14), { c: P.c3, r: .07, a: e, speed: 1.3 }); R.arc([TX + .3, 1.2, ZF - .3], [BX - .3, .1 + NB * GAP, .5], .4, { c: P.c3, w: 2, t: e, a: e }); }
      lab(R, [TX + .6, 1.1, ZF], 'teacher: an averaged copy', { fs: 12, c: P.c3, al: 'left', dx: 8, a: la(st, e, q => q === 4 ? 1 : 0) });
      lab(R, [(TX + BX) / 2, 1.6, (ZF + .5) / 2], 'the student must match it', { fs: 12, c: P.c3, a: la(st, e, q => q === 4 ? 1 : 0) });
      res([IX, 0, ZF + .7], 'another crop: DINOv2', 'probe ' + pc(PR.dino_mean.linear_probe['16'].mean) + ' · ADE20K 47.3 mIoU', P.c3, 4); }
    // 7. missing pixels: only the visible quarter goes in; a small decoder redraws the hidden patches
    const ma = tw(st, e, q => q === 5 ? 1 : 0);
    if (ma > .01) { for (let i = 0; i < 4; i++) R.glass([TX - .5, .1 + i * .1, -2.9], [1.0, 0, 0], [0, 0, 1.0], { c: P.c4, a: ma * .6, nu: 3, nv: 3, th: .012 });
      R.flow(arcPts(R, [BX - .4, .6, -.9], [TX + .5, .3, -2.4], .3, 12), { c: P.c4, r: .06, a: ma, speed: 1.1 });
      R.flow(arcPts(R, [TX - .5, .3, -2.4], [IX, .1, -1.0], .5, 20), { c: P.c4, r: .07, a: ma, speed: 1.3, n: 9 });
      lab(R, [TX, .5, -2.4], 'decoder', { fs: 12.5, b: 1, c: P.c4, dy: -12, a: la(st, e, q => q === 5 ? 1 : 0) });
      lab(R, [(TX + IX) / 2, .9, -1.8], 'redraw the hidden pixels', { fs: 12, c: P.c4, al: 'right', a: la(st, e, q => q === 5 ? 1 : 0) });
      res([IX, 0, 1.0], '75% hidden: MAE', 'probe ' + pc(PR.mae_mean.linear_probe['16'].mean) + ' · best to fine-tune', P.c4, 5); }
  }
  const full = { cam: [.2, .6], bounds: [[-6.0, 0, -2.9], [4.8, 1.4, 3.2]] };
  const st = S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one backbone, three training signals', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 4600, draw, margin: w => w < 520 ? [22, 8, 14, 8] : [30, 140, 20, 18],
    view: k => k <= 2 && k >= 1 ? { cam: [.2, .9], bounds: [[-6.0, 0, -2.3], [5.2, 1.4, 1.1]] } : k === 0 ? { cam: [.2, .72], bounds: [[-6.2, 0, -1.4], [-.8, .6, 1.6]] } : k === 5 ? { cam: [.2, .66], bounds: [[-6.0, 0, -3.4], [1.6, 1.4, 1.8]] } : k === 3 ? { cam: [.2, .55], bounds: [[-.2, 0, -.4], [5.0, 1.4, 3.2]] } : k === 4 ? { cam: [.2, .55], bounds: [[-6.0, 0, -.6], [1.8, 1.6, 3.4]] } : full });
  VEK.onImage(() => st && st.draw());
})();
