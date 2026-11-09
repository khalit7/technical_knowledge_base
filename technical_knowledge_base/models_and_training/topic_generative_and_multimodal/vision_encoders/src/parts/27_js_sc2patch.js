// ---- Scene (section 1, Fig. 2): from pixels to tokens at the three patch sizes on this page (32 CLIP B/32, 16 SigLIP 2 and MAE, 14 DINOv2).
// The image is test image p01 at the 224-pixel input, read back from its thumbnail; the flattened patch is drawn as 48 of its 3P^2 numbers
// (4 x 4 pixels x 3 colours). Token values are not drawn (they are not recorded): tokens are blocks. Shapes and counts are the models' own. ----
(function () {
  if (!document.getElementById('stg-patch') || !window.VEK) return;
  const { mix } = S3, { tw, la, lab, seg, arcPts, image, cell, win, pix, int } = VEK;
  const MODEL = { 32: { name: 'CLIP B/32', cls: 1, pool: '[CLS]' }, 16: { name: 'SigLIP 2 B/16', cls: 0, pool: 'MAP' }, 14: { name: 'DINOv2 B/14', cls: 1, pool: '[CLS]' } };
  let PS = 32;
  const IX = -3.4, S = 3.0, TX = 3.4, WX = 0, SY = 1.0;
  function draw(R, k, e, st) {
    const P = R.P, g = 224 / PS | 0, n = g * (g === 16 ? 2 : g === 7 ? 4 : 2), M = MODEL[PS], hr = Math.floor(g * .35), hc = Math.floor(g * .4), N = g * g;
    R.grid(-5.4, 6.6, -2.4, 2.4, .5);
    const gap = tw(st, e, q => q === 0 ? 0 : .05);
    // 1-2. the image, then cut into patches; the chosen patch lifts out at step 3
    const lift = (r, c) => r === hr && c === hc ? tw(st, e, q => q === 2 ? .45 : 0) : 0;
    image(R, 'p01_cat', n, IX, 0, S, { g, gap, a: tw(st, e, q => q <= 3 ? 1 : .35), lift, hl: k >= 1 ? [hr, hc] : null, hc: P.c5 });
    lab(R, [IX, 0, S / 2], k === 0 ? '224 × 224 × 3 = 150,528 numbers' : g + ' × ' + g + ' = ' + int(N) + ' patches of ' + PS + ' px', { fs: 12.5, b: 1, c: P.ink, dy: 16, a: la(st, e, q => q <= 1 ? 1 : 0) });
    // 3. flatten the patch: its pixels as one row of numbers (48 of them drawn), bars on a white plinth
    const sa = tw(st, e, q => q === 2 || q === 3 ? 1 : 0);
    if (sa > .01) { const d = pix('p01_cat', g * 4), nb = 48, x0 = IX + .3, x1 = WX - .5, bw = (x1 - x0) / nb;
      R.box([(x0 + x1) / 2, SY - .05, 0], [x1 - x0 + .14, .05, .3], { a: sa, shadow: false });
      for (let b = 0; b < nb; b++) { const px = b / 3 | 0, ch = b % 3, i = px >> 2, j = px & 3, v = d ? d[(hr * 4 + i) * g * 4 + hc * 4 + j][ch] / 255 : .5,
        x = x0 + bw * (b + .5) - (k === 2 ? (1 - win(e, b / nb * .6, b / nb * .6 + .3)) * (x0 + bw * b - IX) : 0);
        R.box([x, SY, 0], [bw * .72, .02 + .5 * v, .12], { fill: ch === 0 ? [214, 72, 62] : ch === 1 ? [70, 160, 90] : [70, 110, 210], a: sa, shadow: false, lw: .5 }); }
      lab(R, [(x0 + x1) / 2, SY + .55, 0], '3 × ' + PS + ' × ' + PS + ' = ' + int(3 * PS * PS) + ' numbers (48 drawn)', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: -10, a: la(st, e, q => q === 2 ? 1 : 0) }); }
    // 4. one shared matrix: every patch row goes through the same learned 3P^2 x 768 matrix and comes out as a token
    const wa = tw(st, e, q => q === 3 ? 1 : 0);
    if (wa > .01) { R.glass([WX, .1, -1.1], [0, 0, 2.2], [0, 1.5, 0], { c: P.acc, a: wa, nu: 6, nv: 6, th: .05 });
      lab(R, [WX, 1.6, 0], 'W · ' + int(3 * PS * PS) + ' × 768, shared', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: -12, a: la(st, e, q => q === 3 ? 1 : 0) });
      if (k === 3) { R.flow(seg([WX - .5, SY, 0], [WX, SY - .1, 0], 6), { c: P.c5, r: .06, a: e }); const t = cell(g, TX, 0, S, .05, hr, hc); R.flow(arcPts(R, [WX + .05, .9, 0], [t[0], .2, t[1]], .4, 14), { c: P.acc, r: .07, a: e, speed: 1.3 });
        R.flow(arcPts(R, [IX + S / 2, .1, -.8], [WX, .5, -.8], .35, 12), { c: P.acc, r: .05, a: e * .6, n: 5 }); R.flow(arcPts(R, [IX + S / 2, .1, .8], [WX, .5, .8], .35, 12), { c: P.acc, r: .05, a: e * .6, n: 5 }); } }
    // the tokens, one block per patch, in grid order (the sequence is the grid read row by row)
    const ta = k < 3 ? 0 : k === 3 ? win(e, .35, .9) : 1;
    if (ta > .01) for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) { const t = cell(g, TX, 0, S, .05, r, c), hi = r === hr && c === hc;
      R.box([t[0], 0, t[1]], [t[2] * .82, hi ? .3 : .16, t[2] * .82], { fill: hi ? mix(P.paper, P.c5, .7) : mix(P.paper, P.acc, .25 + .35 * (((r * g + c) * 37) % 11) / 11), a: (hi ? 1 : ta) * tw(st, e, q => q === 7 ? .5 : 1), shadow: false, lw: .5 }); }
    lab(R, [TX, 0, S / 2], int(N) + ' tokens of width 768', { mono: 1, fs: 12.5, b: 1, c: P.acc, dy: 16, a: la(st, e, q => q === 3 ? 1 : 0) });
    // 5. a position vector added to every token (a learned table, one row per slot)
    const pa = tw(st, e, q => q === 4 ? 1 : 0);
    if (pa > .01) { R.glass([TX - S / 2, .95, -S / 2], [S, 0, 0], [0, 0, S], { c: P.c5, a: pa, nu: g, nv: g, th: .03 });
      [[0, 0], [hr, hc], [g - 1, g - 1], [0, g - 1], [g - 1, 0]].forEach(([r, c]) => { const t = cell(g, TX, 0, S, .05, r, c); R.flow(seg([t[0], .95, t[1]], [t[0], .35, t[1]], 6), { c: P.c5, r: .05, a: pa, n: 3, speed: .8 }); });
      lab(R, [TX + S / 2, .95, 0], '+ position table, one row per slot', { fs: 12.5, b: 1, c: P.c5, al: 'left', dx: 8, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    // 6. extra tokens: [CLS] at the front of the sequence (CLIP, DINOv2), none for SigLIP 2
    const xa = tw(st, e, q => q >= 5 ? 1 : 0), cp = [TX - S / 2 - .55, 0, -S / 2 + .25];
    if (M.cls && xa > .01) { R.box(cp, [.32, .3, .32], { fill: mix(P.paper, P.c2, .7), a: xa }); lab(R, [cp[0], .3, cp[2]], '[CLS]', { mono: 1, fs: 12.5, b: 1, c: P.c2, dy: -12, a: la(st, e, q => q === 5 || q === 7 ? 1 : 0) }); }
    if (!M.cls) lab(R, [cp[0], .1, cp[2]], 'no [CLS]', { mono: 1, fs: 12.5, b: 1, c: P.c2, a: la(st, e, q => q === 5 ? 1 : 0) });
    // 7. twelve blocks: every token attends to every token
    const ba = tw(st, e, q => q === 6 ? 1 : 0);
    if (ba > .01) { for (let i = 0; i < 12; i++) R.glass([TX - S / 2, .45 + i * .1, -S / 2], [S, 0, 0], [0, 0, S], { c: P.acc, a: ba * .16, nu: 4, nv: 4, th: .012 });
      const h = cell(g, TX, 0, S, .05, hr, hc); [[0, 0], [0, g - 1], [g - 1, 0], [g - 1, g - 1], [hr, 0], [0, hc], [g - 1, hc], [hr, g - 1]].forEach(([r, c]) => { const t = cell(g, TX, 0, S, .05, r, c);
        R.flowArc([h[0], .35, h[1]], [t[0], .2, t[1]], .5, { c: P.c5, r: .05, a: ba * .85, n: 5, speed: 1.2 }); });
      lab(R, [TX + S / 2, 1.6, 0], '12 blocks · ' + int((N + M.cls) ** 2) + ' scores per head per layer', { fs: 12.5, b: 1, c: P.ink, al: 'left', dx: 8, a: la(st, e, q => q === 6 ? 1 : 0) }); }
    // 8. read out: one vector of 768 from [CLS], a learned query (MAP) or the mean
    const ra = tw(st, e, q => q === 7 ? 1 : 0);
    if (ra > .01) { const RX = TX + S / 2 + 1.1, O = [['[CLS]', P.c2, -.9], ['MAP', P.c1, 0], ['mean', P.c4, .9]];
      O.forEach(([t, c, z], i) => { const on = t === (M.pool === 'MAP' ? 'MAP' : '[CLS]'); R.box([RX, 0, z], [.3, .7, .3], { fill: mix(P.paper, c, .6), a: ra * (on ? 1 : .35) });
        lab(R, [RX + .2, .4, z], t + (on ? ' · ' + M.name : ''), { mono: 1, fs: 12.5, b: on, c, al: 'left', dx: 8, a: la(st, e, q => q === 7 ? (on ? 1 : .6) : 0) }); });
      const src = M.pool === 'MAP' ? [TX + S / 2, .2, 0] : [cp[0], .3, cp[2]]; R.flowArc(src, [RX, .7, M.pool === 'MAP' ? 0 : -.9], .6, { c: M.pool === 'MAP' ? P.c1 : P.c2, r: .07, a: ra, speed: 1.2 }); }
  }
  const st = S3.stage({ id: 'stg-patch', list: 'sx-patch', fig: 'Fig. 2 · one image becomes a sequence of tokens', cam: [.25, .62], bounds: [[-5.0, 0, -1.8], [6.4, 1.6, 1.8]], aspect: .62, dur: 1400, hold: 4400, draw, margin: VEK.margin,
    view: k => k <= 1 ? { cam: [.2, .8], bounds: [[-5.0, 0, -1.7], [-1.8, .3, 1.8]] } : k === 2 ? { cam: [.25, .5], bounds: [[-5.0, 0, -1.6], [.4, 1.5, 1.8]] } : k === 3 ? { cam: [.7, .5], bounds: [[-5.0, 0, -1.8], [5.2, 1.6, 1.8]] } : { cam: [.3, .62], bounds: [[.6, 0, -1.8], [8.4, 1.6, 1.8]] },
    onStep: () => fill() });
  // the patch-size switch: the numbers in the step list follow it, and the stage replays
  function fill() { const g = 224 / PS | 0, N = g * g, M = MODEL[PS], set = (n, v) => document.querySelectorAll('[data-pt="' + n + '"]').forEach(x => x.textContent = v);
    set('g', g); set('P', PS); set('N', int(N)); set('d', int(3 * PS * PS)); set('m', M.name); set('s', int((N + M.cls) ** 2)); set('n1', int(N + M.cls)); }
  const sw = document.getElementById('ve-pt-p');
  if (sw) sw.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; sw.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); PS = +b.dataset.m; fill(); st && st.list('sx-patch'); });
  VEK.onImage(() => st && st.draw());
})();
