// ---- Scene (section 1, Fig. 1): one request, "here is a photo of a pullover, draw it in red", through a pipeline (a late-fusion VLM plus a
// separate diffusion generator) and through one early-fusion token model (Chameleon-style). Image lane at the back, text lane in front; the
// pipeline's image becomes encoder vectors and only a sentence crosses to the generator, the early-fusion model's image becomes codes in the
// same stream as the words. Counts are the models' real ones (SmolVLM-500M 1,088 soft tokens measured on Vision-language models;
// Chameleon 1,024 codes from 8,192; Stable Diffusion 1.5 at 25 guided steps); the photo is a Fashion-MNIST test pullover, and the four chips per
// image, the prompt the VLM writes and the recolouring are illustrative, as the step list says. ----
(function () {
  if (!document.getElementById('stg-fuse') || !window.NMK) return;
  const { mix, lerp } = S3, { tileUp, chip, lab, seg, win, pixels } = NMK;
  let mode = 'pipe', st = null;
  const ZI = -1.0, ZT = 1.0, ZS = 0;                 // image lane, text lane, the early model's single stream
  const XP = -6.45, XE = -5.15, XL = 1.0, XG = 5.4, XO = 6.85, LW = 1.8;
  const WX = i => -7.0 + i * .6, CX = i => -4.5 + i * .56, PX = i => 2.75 + i * .6;
  const CNT = { pipe: [[0, 0], [1092, 1], [1092, 1], [1096, 5], [1096, 6], [1096, 31], [1096, 32]], early: [[0, 0], [1028, 1], [1028, 1], [1030, 3], [2053, 1026], [2053, 1027]] };
  const px = () => pixels('test_orig', 2, () => st && st.draw()), gen = () => pixels('ar_frames__1.0_c2', 64, () => st && st.draw());
  const CH = { w: .5, d: .5, h: .2 };
  function llm(R, lit, a) {
    const P = R.P; R.box([XL, 0, 0], [LW, 1.15, 2.6], { fill: mix(P.paper, P.acc, lit ? .25 : .1), a });
    lab(R, [XL, 1.15, 0], 'language model', { fs: 13, b: 1, c: P.acc, dy: -12, a: Math.max(.5, a) });
  }
  // the running counts sit in an HTML overlay at the top left of the canvas, so they never cover the scene
  let cntEl = null;
  function counter(R, k) {
    if (!cntEl) return; const c = CNT[mode][Math.min(k, CNT[mode].length - 1)];
    const h = '<b>sequential calls ' + c[1].toLocaleString('en-GB') + '</b><br>positions in the model ' + c[0].toLocaleString('en-GB'); if (cntEl.innerHTML !== h) cntEl.innerHTML = h;
  }
  function photo(R, a) { const P = R.P; tileUp(R, [XP, .05, ZI], 1.4, px(), a); lab(R, [XP, 1.45, ZI], 'photo', { fs: 12.5, b: 1, c: P.c1, dy: -10, a: Math.max(.5, a) }); }
  function words(R, k, e, toStream) {
    const P = R.P, t = toStream ? (k === 1 ? win(e, .4, 1) : k > 1 ? 1 : 0) : 0;
    for (let i = 0; i < 4; i++) chip(R, [lerp(WX(i), CX(i + 4), t), 0, lerp(ZT, ZS, t)], null, P.c5, toStream && k >= 3 ? .5 : 1, CH);
    if (t < .5) lab(R, [WX(1.5), .2, ZT + .25], '"draw it in red"', { fs: 12.5, c: P.c5, b: 1, dy: 18 });
  }
  function drawPipe(R, k, e) {
    const P = R.P;
    photo(R, k >= 4 ? .4 : 1); words(R, k, e, false);
    // 2. a separately trained encoder and projector turn the photo into vectors the model can read but never write
    const ea = k === 0 ? 0 : k === 1 ? win(e, 0, .4) : k === 2 ? .7 : .25;
    R.glass([XE, .08, ZI - .7], [0, 0, 1.4], [0, 1.2, 0], { c: P.c4, a: ea, nu: 6, nv: 6 });
    lab(R, [XE - .1, 1.3, ZI], 'encoder + projector', { fs: 12.5, b: 1, c: P.c4, dy: -10, al: 'left', a: ea });
    if (k === 1) { R.flow(seg([XP + .75, .75, ZI], [XE, .7, ZI], 8), { c: P.c1 }); R.flow(seg([XE, .5, ZI], [CX(0), .3, ZI], 8), { c: P.c4, a: win(e, .3, .6) }); }
    for (let i = 0; i < 4; i++) chip(R, [CX(i), 0, ZI], null, P.c4, k === 0 ? 0 : k === 1 ? win(e, .4 + i * .1, .6 + i * .1) : k <= 2 ? 1 : .3, CH);
    if (k >= 1 && k <= 2) lab(R, [CX(1.5), .2, ZI - .25], '4 of 1,088 vectors', { fs: 12.5, b: 1, c: P.c4, dy: -16, a: k === 1 ? win(e, .6, 1) : 1 });
    // 3. one prefill pass over vectors and words
    llm(R, k === 2 || k === 3, k === 0 ? .2 : k >= 5 ? .45 : 1);
    if (k === 2) { for (let i = 0; i < 4; i++) R.flowArc([CX(i), .2, ZI], [XL - LW / 2, .55, -.6 + .15 * i], .4, { c: P.c4, r: .055, n: 6 });
      for (let i = 0; i < 4; i++) R.flowArc([WX(i), .2, ZT], [XL - LW / 2, .55, .2 + .15 * i], .7, { c: P.c5, r: .055, n: 9 }); }
    // 4. it can only write text: a prompt, one call per word piece
    for (let i = 0; i < 4; i++) { const a = k < 3 ? 0 : k === 3 ? win(e, i * .2, i * .2 + .2) : k === 4 ? 1 : .35;
      chip(R, [PX(i), 0, ZT], null, P.c3, a, CH);
      if (k === 3 && e > i * .2 - .05 && e < i * .2 + .3) R.flowArc([XL + LW / 2, .8, ZT - .3], [PX(i), .22, ZT], .35, { c: P.c3, r: .065, n: 5 }); }
    if (k >= 3) lab(R, [PX(1.5), .2, ZT + .25], '"a red knit pullover"', { fs: 12.5, b: 1, c: P.c3, dy: 18, a: k <= 4 ? 1 : .5 });
    // 5. only the sentence crosses to the separate generator; the photo stays behind
    const ga = k < 4 ? .12 : 1;
    R.box([XG, 0, 0], [1.3, .9, 2.2], { fill: mix(P.paper, P.mute, .3), a: ga });
    if (k < 6) lab(R, [XG, .9, -1.1], 'separate generator', { fs: 12.5, b: 1, c: P.mute, dy: -12, a: Math.max(.35, ga) });
    if (k >= 4) R.line([[XG - 1.05, .01, -1.6], [XG - 1.05, .01, 1.6]], { c: P.mute, w: 1.6, dash: [5, 5], a: .8 });
    if (k === 4) { for (let i = 0; i < 4; i++) R.flowArc([PX(i), .22, ZT], [XG - .65, .45, .6], .3, { c: P.c3, r: .06, n: 5 });
      lab(R, [XG - 1.05, .02, 1.6], 'only one sentence crosses', { fs: 12.5, b: 1, c: P.ink, dy: 16 }); }
    // 6. 25 denoising calls over a latent, one after another
    if (k >= 5) { const m = k === 5 ? Math.max(1, Math.round(25 * e)) : 25;
      for (let i = 0; i < 25; i++) R.box([XG, .92 + i * .034, 0], [1.0, .02, 1.5], { fill: mix(P.paper, P.mute, .55), a: i < m ? (k === 5 ? 1 : .5) : 0, shadow: false, lw: .5 });
      if (k === 5) lab(R, [XG + .55, .92 + m * .034, .75], m + ' denoising calls', { fs: 12.5, b: 1, c: P.ink, al: 'left', dx: 6 });
      if (k === 5) R.flow(seg([XG + .6, .95, .8], [XG + .6, 1.8, .8], 10), { c: P.mute, r: .05 }); }
    // 7. a plausible new pullover, not yours
    if (k >= 6) { tileUp(R, [XO, .05, ZI], 1.15, gen(), e); lab(R, [XO, 1.2, ZI], 'a new pullover', { fs: 12.5, b: 1, c: P.c3, dy: -10, a: e });
      R.flowArc([XG + .65, .5, -.4], [XO - .3, .4, ZI + .05], .3, { c: P.mute, r: .05, a: e }); }
    counter(R, k);
  }
  function drawEarly(R, k, e) {
    const P = R.P;
    photo(R, k >= 2 ? .4 : 1); words(R, k, e, true);
    // 2. a tokenizer turns the photo into codes: ids in the same vocabulary as the words, in one stream with them
    const ta = k === 0 ? 0 : k === 1 ? win(e, 0, .4) : .25;
    R.glass([XE, .08, ZI - .7], [0, 0, 1.4], [0, 1.2, 0], { c: P.c1, a: ta, nu: 6, nv: 6 });
    lab(R, [XE - .1, 1.3, ZI], 'image tokenizer', { fs: 12.5, b: 1, c: P.c1, dy: -10, al: 'left', a: ta });
    if (k === 1) R.flow(seg([XP + .75, .75, ZI], [XE, .7, ZI], 8), { c: P.c1 });
    for (let i = 0; i < 4; i++) { const t = k === 0 ? 0 : k === 1 ? win(e, .4, 1) : 1, a = k === 0 ? 0 : k === 1 ? win(e, .25 + i * .08, .45 + i * .08) : k >= 3 ? .5 : 1;
      chip(R, [CX(i), 0, lerp(ZI, ZS, t)], null, P.c1, a, CH); }
    if (k >= 1 && k <= 2) { lab(R, [CX(1.5), .2, ZS - .25], '4 of 1,024 codes', { fs: 12.5, b: 1, c: P.c1, dy: -16, a: k === 1 ? win(e, .7, 1) : 1 });
      lab(R, [CX(5.5), .2, ZS - .25], 'words', { fs: 12.5, b: 1, c: P.c5, dy: -16, a: k === 1 ? win(e, .7, 1) : 1 }); }
    if (k === 2) lab(R, [CX(3.5), .02, ZS + .25], 'one stream, one vocabulary of 65,536', { fs: 12.5, b: 1, c: P.ink, dy: 18 });
    // 3. one prefill over codes and words: one transformer, one softmax over the shared vocabulary
    llm(R, k === 2 || k === 3, k === 0 ? .2 : 1);
    if (k === 2) for (let i = 0; i < 8; i++) R.flowArc([CX(i), .22, ZS], [XL - LW / 2, .55, -.7 + i * .2], .3 + .04 * (7 - i), { c: i < 4 ? P.c1 : P.c5, r: .055, n: 6 });
    // 4. a start-of-image marker, then code 1, each one call; 5. codes 2 to 1,024, raster order, each may read every input code
    const G = 8, cs = .3, gx = PX(0) - .1, gz = -1.2, fill = k < 3 ? 0 : k === 3 ? (e > .55 ? 1 : 0) : k === 4 ? Math.max(1, Math.round(64 * e)) : 64;
    chip(R, [gx - .4, 0, ZS], null, P.c3, k < 3 ? 0 : k === 3 ? win(e, 0, .3) : .6, { w: .32, d: .5, h: .2, k: .3 });
    if (k === 3) { R.flowArc([XL + LW / 2, .8, 0], [gx - .4, .22, ZS], .3, { c: P.c3, r: .065, n: 5, a: win(e, 0, .5) }); lab(R, [gx - .4, .2, ZS], '<img>', { mono: 1, fs: 12, c: P.c3, dy: -14, a: win(e, 0, .4) }); }
    for (let i = 0; i < 64; i++) { const r = Math.floor(i / G), c = i % G, on = i < fill;
      R.box([gx + c * cs + cs / 2, 0, gz + r * cs + cs / 2], [cs * .86, on ? .1 : .02, cs * .86], { fill: on ? mix(P.paper, P.c3, .6) : P.paper, a: k < 3 ? 0 : on ? 1 : .35, shadow: false, lw: .5 }); }
    if (k >= 3) lab(R, [gx + G * cs / 2, .02, gz + G * cs], '1,024 output codes (drawn as 8 × 8)', { fs: 12.5, b: 1, c: P.c3, dy: 16 });
    if (k === 4 && fill < 64) { const i = fill - 1, p = [gx + (i % G) * cs + cs / 2, .12, gz + Math.floor(i / G) * cs + cs / 2];
      R.flowArc([XL + LW / 2, .9, 0], p, .4, { c: P.c3, r: .065, n: 5 });
      for (let j = 0; j < 4; j++) R.flowArc([CX(j), .22, ZS], p, 1.4, { c: P.c1, r: .045, n: 7, a: .5 }); }
    // 6. the tokenizer's decoder: the same garment can come back, edited, capped by what 1,024 codes can reconstruct
    if (k >= 5) { tileUp(R, [XO - .3, .05, ZI], 1.25, px(), e, { tint: [235, 70, 55] });
      lab(R, [XO - .3, 1.3, ZI], 'your pullover, in red', { fs: 12.5, b: 1, c: P.c3, dy: -10, a: e });
      R.flowArc([gx + G * cs, .2, 0], [XO - .9, .5, ZI + .05], .4, { c: P.c3, r: .05, a: e }); }
    counter(R, k);
  }
  function draw(R, k, e) { R.grid(-7.5, 7.8, -2.2, 2.2, .5); (mode === 'pipe' ? drawPipe : drawEarly)(R, k, e); }
  const B = (x0, x1, y) => [[x0, 0, -1.7], [x1, y || 1.5, 1.7]];
  const full = { cam: [.16, .66], bounds: B(-7.4, 7.6) };
  const VIEWS = { pipe: [full, { cam: [.3, .62], bounds: B(-7.4, -1.6) }, { cam: [.22, .66], bounds: B(-7.4, 2.2) }, { cam: [.12, .66], bounds: B(-.6, 5.6) },
      { cam: [.12, .66], bounds: B(-.6, 6.4) }, { cam: [.0, .62], bounds: B(2.2, 7.4, 2) }, full],
    early: [full, { cam: [.3, .62], bounds: B(-7.4, -1.6) }, { cam: [.2, .66], bounds: B(-5.6, 2.4) }, { cam: [.12, .66], bounds: B(-.6, 5.4) }, { cam: [.18, .7], bounds: B(-5.0, 5.4) }, full] };
  const mg = w => w < 520 ? [44, 8, 14, 8] : [50, 18, 22, 18];
  st = S3.stage({ id: 'stg-fuse', list: 'sx-fuse-pipe', fig: 'Fig. 1 · one request, two designs', cam: full.cam, bounds: full.bounds, aspect: .44, dur: 1500, hold: 4600, draw, margin: mg,
    view: k => VIEWS[mode][k] || full });
  if (st) { cntEl = document.createElement('div'); cntEl.className = 'nm-c3'; st.host.querySelector('.stg-cv').appendChild(cntEl); st.draw(); }
  const M = document.getElementById('nm-fuse-mode');
  if (M && st) M.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; mode = b.dataset.m;
    M.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    ['pipe', 'early'].forEach(m => { const L = document.getElementById('sx-fuse-' + m); if (L) L.hidden = m !== mode; }); st.list(mode === 'pipe' ? 'sx-fuse-pipe' : 'sx-fuse-early'); });
})();
