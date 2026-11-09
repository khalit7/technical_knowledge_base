// ---- Scene (section 2, Fig. 2): one test image becomes two kinds of token. Read path (left): an encoder turns each cell into a vector,
// placed in the sequence but absent from the output softmax. Write path (right): the page's FSQ tokenizer turns each cell into one of 1,000
// integer codes (its real 64 codes for this test image, NM.tok.fsq1000.test16_tokens), which the trained model can predict with its softmax
// (the real top-5 probabilities of the tiny model writing this class, NM.smp.ar_record), and which the decoder turns back into pixels
// (the real FSQ-1000 and VQ-128 reconstructions, with their recorded FD on 1,000 validation images). The vectors are drawn as uniform columns:
// this page runs no vision encoder, so their values are not shown.
// The image sprite test_orig holds the topic's 16 fixed test images (test-set indices 19, 2, 1, 13, 6, 8, 4, 9, 18, 0, ...), while the recorded
// codes and reconstructions (test16_tokens, test_rec_*) are those of test images 0 to 15 (tokenize_data.py writes tte[:16]); IDX pairs them,
// so only the seven classes whose fixed image is among test images 0 to 9 are offered. ----
(function () {
  if (!document.getElementById('stg-tok') || !window.NMK) return;
  const { mix } = S3, { tileUp, lab, seg, arcPts, win, pixels, f0 } = NMK, T = NM.tok, REC = NM.smp.ar_record['1.0'];
  let cls = 2, st = null;
  const IDX = { 1: 2, 2: 1, 4: 6, 5: 8, 6: 4, 7: 9, 9: 0 };   // class -> test-set index of its fixed test image, which is also its row in test16_tokens and test_rec_*
  const redraw = () => st && st.draw();
  const IX = 0, IZ = -1.9, IS = 2.1, CS = .4, LX = -3.0, RX = 3.0, GZ = .25;   // image; cell size; read and write grid centres
  const cell = (cx, i) => [cx + ((i % 8) - 3.5) * CS, GZ + (Math.floor(i / 8) - 3.5) * CS];
  // the position the step-4 softmax is drawn at: where the model's own sample of this class had the entropy closest to 2.5 bits (a few codes compete)
  const pick = c => { const H = REC.H[c]; let j = 0; H.forEach((h, i) => { if (Math.abs(h - 2.5) < Math.abs(H[j] - 2.5)) j = i; }); return j; };
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.5, 7.5, -3.2, 2.6, .5);
    const img = pixels('test_orig', cls, redraw), toks = T.fsq1000.test16_tokens[IDX[cls]];
    // 1. the image and its 8 x 8 grid of cells
    const ia = k === 0 ? 1 : k >= 3 ? .5 : .8;
    tileUp(R, [IX, .05, IZ], IS, img, ia);
    R.glass([IX - IS / 2, .05, IZ + .04], [IS, 0, 0], [0, IS, 0], { c: P.acc, a: k === 0 ? win(e, .3, .8) * .9 : .35, nu: 8, nv: 8, th: .01 });
    lab(R, [IX, IS + .05, IZ], k === 0 ? '28 × 28, padded to 32 × 32: 8 × 8 cells' : NMK.CL[cls], { fs: 12.5, b: 1, c: P.ink, dy: -12, a: ia });
    // 2. read: an encoder makes one vector per cell; the model can read them but has no softmax entry to write one
    const ra = k < 1 ? 0 : k === 1 ? win(e, 0, .5) : k === 2 ? .45 : k === 3 ? .2 : .25;
    R.glass([LX - 1.6, .06, IZ + .2], [3.2, 0, 0], [0, .9, 0], { c: P.c4, a: ra, nu: 8, nv: 3 });
    if (k === 1) R.flow(arcPts(R, [IX - IS / 2, .9, IZ], [LX + .4, .5, IZ + .25], .3, 14), { c: P.c1, a: ra });
    for (let i = 0; i < 64; i++) { const [x, z] = cell(LX, i), a = k < 1 ? 0 : k === 1 ? win(e, .3 + i / 64 * .5, .45 + i / 64 * .5) : ra;
      R.box([x, 0, z], [CS * .5, .55, CS * .5], { fill: mix(P.paper, P.c4, .55), a, shadow: false, lw: .5 }); }
    if (k >= 1) lab(R, [LX, .55, GZ - 1.6], '64 vectors: read only', { fs: 12.5, b: 1, c: P.c4, dy: -12, a: Math.max(.45, ra) });
    if (k === 1) lab(R, [LX, 0, GZ + 1.6], 'drawn as columns; this page runs no encoder', { fs: 12, c: P.mute, dy: 16, a: win(e, .6, 1) });
    // 3. write: the FSQ tokenizer maps each cell to the nearest of 1,000 codes: an integer, like a text token id
    const wa = k < 2 ? 0 : k === 2 ? win(e, 0, .5) : 1;
    R.glass([RX - 1.6, .06, IZ + .2], [3.2, 0, 0], [0, .9, 0], { c: P.c1, a: k < 2 ? 0 : k === 2 ? wa : .3, nu: 8, nv: 3 });
    if (k === 2) R.flow(arcPts(R, [IX + IS / 2, .9, IZ], [RX - .4, .5, IZ + .25], .3, 14), { c: P.c1 });
    const j = pick(cls);
    for (let i = 0; i < 64; i++) { const [x, z] = cell(RX, i), bg = toks[i] === 472, a = k < 2 ? 0 : k === 2 ? win(e, .3 + i / 64 * .5, .45 + i / 64 * .5) : k === 3 ? (i === j ? 1 : .5) : 1;
      R.box([x, 0, z], [CS * .88, .06, CS * .88], { fill: bg ? P.paper : mix(P.paper, P.c1, .45), a, shadow: false, lw: .5 });
      if (k === 2 && e > .85) lab(R, [x, .06, z], String(toks[i]), { mono: 1, fs: 12, c: bg ? P.mute : P.ink, a: win(e, .85, 1), wide: 1, halo: false }); }
    if (k >= 2) lab(R, [RX, .06, GZ - 1.6], '64 codes from 1,000: writable', { fs: 12.5, b: 1, c: P.c1, dy: -12 });
    // 4. the output layer is a softmax over the 1,000 codes: the trained model writing this class, at one position, ranks a few codes
    if (k === 3) { const [x, z] = cell(RX, j), top = REC.top5[cls][j], ch = REC.tokens[cls][j], bx = RX + 2.35;
      R.box([bx, 0, z], [.4, .05, 2.5], { shadow: false });
      top.forEach(([id, p], t) => { const zz = z - 1.0 + t * .5, h = .1 + 1.6 * p * win(e, .2, .8);
        R.box([bx, .05, zz], [.3, h, .3], { fill: id === ch ? mix(P.paper, P.c3, .75) : mix(P.paper, P.c1, .45), shadow: false });
        lab(R, [bx, .05 + h, zz], Math.round(id) + ' · ' + (100 * p).toFixed(0) + '%', { mono: 1, fs: 12, al: 'left', dx: 12, c: id === ch ? P.c3 : P.ink, b: id === ch, a: win(e, .6, 1) }); });
      R.flowArc([x, .1, z], [bx - .15, .3, z], .3, { c: P.c1, r: .06, a: win(e, 0, .4) });
      lab(R, [x, .06, z], 'position ' + (j + 1), { fs: 12.5, b: 1, c: P.c3, dy: 18 });
      lab(R, [bx, 0, z + 1.25], 'top 5 of 1,000 (the model)', { fs: 12.5, b: 1, c: P.ink, dy: 16, a: win(e, .5, 1) }); }
    // 5. the decoder turns codes back into pixels; the round trip already loses detail, a ceiling for any generator over these codes
    if (k === 4) { const a = win(e, .2, .7), Y = .05, S = 1.25;
      [['test_rec_fsq1000', 'FSQ-1000 · FD ' + T.fsq1000.recon_val1000_fd.toFixed(1), RX + 2.6, -.75], ['test_rec_vq128', 'VQ-128 · FD ' + T.vq128.recon_val1000_fd.toFixed(1), RX + 2.6, 1.25]].forEach(([nm, l, x, z], t) => {
        tileUp(R, [x, Y, z], S, pixels(nm, IDX[cls], redraw), a); lab(R, [x, Y + S, z], l, { mono: 1, fs: 12, b: 1, c: t ? P.mute : P.c1, dy: -10, a });
        if (!t) R.flowArc([RX + 1.5, .1, GZ], [x - .6, .5, z], .3, { c: P.c1, r: .06, a }); });
      lab(R, [RX + 2.6, 0, 1.9], 'real images: FD ' + T.floor_fd_val1000.toFixed(1), { mono: 1, fs: 12, c: P.good, dy: 16, a }); }
  }
  const full = { cam: [.0, .72], bounds: [[-5, 0, -3], [6.5, 2.2, 1.9]] };
  const VIEWS = [{ cam: [.0, .5], bounds: [[-2.2, 0, -2.4], [2.2, 2.3, -.6]] }, { cam: [.25, .7], bounds: [[-5, 0, -3], [1.4, 2.2, 1.9]] }, { cam: [-.1, .95], bounds: [[1.0, 0, -1.6], [5.0, .8, 1.9]] },
    { cam: [-.25, .62], bounds: [[1.0, 0, -1.8], [6.8, 1.9, 2.0]] }, { cam: [-.1, .7], bounds: [[.6, 0, -2.2], [6.6, 1.7, 2.1]] }];
  st = S3.stage({ id: 'stg-tok', list: 'sx-tok', fig: 'Fig. 2 · one image, two kinds of token', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 4800, draw, margin: NMK.margin,
    view: k => VIEWS[k] || full });
  const C = document.getElementById('nm-tok-cls');
  if (C && st) { C.innerHTML = NMK.CL.map((n, i) => IDX[i] == null ? '' : '<button data-c="' + i + '"' + (i === cls ? ' class="on"' : '') + '>' + n + '</button>').join('');
    C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; cls = +b.dataset.c; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); st.draw(); }); }
})();
