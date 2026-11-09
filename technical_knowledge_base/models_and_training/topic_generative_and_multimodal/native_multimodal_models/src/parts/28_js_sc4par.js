// ---- Scene (section 4, Fig. 4): the same class written three ways by the page's own models: the raster model (64 calls, one new code each),
// the masked model (8 rounds, each a full pass that fills the positions the cosine schedule unmasks: NM.smp.mask_record, class 3) and the topic's
// recorded DDIM run (20 full-image steps). Each lane's upright tile is the recorded frame (sprites ar_frames__1.0_c3, mask_frames__8_c3,
// ddim20_c3); each is a different random sample of the class. Calls and FLOPs per image are NM.sc.cost (make_scene_data.py), from the counted
// networks. ----
(function () {
  if (!document.getElementById('stg-par') || !window.NMK || !NM.sc) return;
  const { mix } = S3, { tileUp, lab, win, pixels } = NMK, C = NM.sc.cls, MR = NM.smp.mask_record, K = NM.sc.cost;
  let st = null;
  const redraw = () => st && st.draw();
  const LX = [-3.7, 0, 3.7], CS = .3, GZ = .75, TZ = -1.35, TS = 1.8;
  // the round in which each of the 64 positions was filled by the masked model
  const RND = Array.from({ length: 64 }, (_, i) => MR.tokens_per_round.findIndex(r => r[C][i] !== MR.mask_id));
  const cp = (L, i) => [LX[L] + ((i % 8) - 3.5) * CS, GZ + (Math.floor(i / 8) - 3.5) * CS];
  const NAME = ['raster: 1 new code per call', 'masked: all 65 positions per call', 'diffusion: all pixels per call'];
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.2, 6.2, -2.6, 2.6, .5);
    const arN = k < 1 ? 0 : k === 1 ? Math.round(64 * win(e, .05, .95)) : 64;
    const mR = k < 2 ? 0 : k === 2 ? Math.min(8, Math.floor(win(e, .05, .95) * 8 + 1e-9) + (e >= .95 ? 0 : 0)) : 8;
    const mRound = k === 2 ? Math.min(8, Math.floor(win(e, .02, .98) * 8) + 1) : mR;    // the round being drawn now (1..8)
    const dS = k < 3 ? 0 : k === 3 ? Math.round(20 * win(e, .05, .95)) : 20;
    const focus = k >= 1 && k <= 3 ? k - 1 : -1, la = L => k === 4 ? .25 : focus < 0 || focus === L ? 1 : .35;
    // lane 1: raster
    for (let i = 0; i < 64; i++) { const [x, z] = cp(0, i), on = i < arN;
      R.box([x, 0, z], [CS * .86, on ? .09 : .015, CS * .86], { fill: on ? mix(P.paper, P.c3, .6) : P.paper, a: la(0) * (on ? 1 : .5), shadow: false, lw: .5 }); }
    if (k === 1 && arN < 64) { const [x, z] = cp(0, arN); R.flowArc([LX[0], 1.9, TZ + .2], [x, .1, z], .3, { c: P.c3, r: .07, n: 5 }); }
    tileUp(R, [LX[0], .05, TZ], TS, pixels('ar_frames__1.0_c3', arN, redraw), la(0));
    // lane 2: masked rounds; a position fills in the round the recorded decode unmasked it
    const mShown = k === 2 ? mRound : mR;
    for (let i = 0; i < 64; i++) { const [x, z] = cp(1, i), r = RND[i], on = r >= 0 && r < mShown, now = k === 2 && r === mShown - 1;
      R.box([x, 0, z], [CS * .86, on ? .09 : .015, CS * .86], { fill: on ? mix(P.paper, P.c3, now ? .85 : .5) : P.paper, a: la(1) * (on ? 1 : .5), shadow: false, lw: .5 });
      if (now && e < .97) R.flowArc([LX[1], 1.9, TZ + .2], [x, .1, z], .3, { c: P.c3, r: .05, n: 3 }); }
    tileUp(R, [LX[1], .05, TZ], TS, mShown ? pixels('mask_frames__8_c3', mShown - 1, redraw) : pixels('ar_frames__1.0_c3', 0, redraw), la(1));
    // lane 3: diffusion, every step over the whole image
    R.glass([LX[2] - 1.2, .02, GZ - 1.2], [2.4, 0, 0], [0, 0, 2.4], { c: P.c6, a: la(2) * (dS ? .9 : .35), nu: 8, nv: 8, th: .02 });
    if (k === 3 && dS < 20) for (let j = 0; j < 4; j++) R.flowArc([LX[2], 1.9, TZ + .2], [LX[2] - .9 + j * .6, .05, GZ + (j % 2 ? .5 : -.5)], .3, { c: P.c6, r: .055, n: 4 });
    tileUp(R, [LX[2], .05, TZ], TS, pixels('ddim20_c3', dS, redraw), la(2));
    // labels: what one call does, and the calls so far
    const CALLS = [arN, mShown, dS];
    for (let L = 0; L < 3; L++) { lab(R, [LX[L], TS + .05, TZ], NAME[L], { wide: 1, fs: 12.5, b: 1, c: L === 2 ? P.c6 : P.c3, dy: -12, a: Math.max(.5, la(L)) });
      if (k < 4) lab(R, [LX[L], 0, GZ + 1.25], CALLS[L] + ' calls', { mono: 1, fs: 13, b: 1, c: P.ink, dy: 16, a: Math.max(.5, la(L)) }); }
    // 5. the bill: sequential calls against compute per image (bars to scale within each kind)
    if (k === 4) { const t = win(e, 0, .7), cl = [K.ar_calls, K.mask_calls, K.ddim_calls], fl = [K.ar_flops, K.mask_flops, K.ddim_flops], mf = Math.max(...fl);
      for (let L = 0; L < 3; L++) { const z = GZ, h1 = .05 + 1.5 * cl[L] / 64 * t, h2 = .05 + 1.5 * fl[L] / mf * t;
        R.box([LX[L] - .6, 0, z], [.7, h1, .7], { fill: mix(P.paper, P.c1, .7) }); R.box([LX[L] + .6, 0, z], [.7, h2, .7], { fill: mix(P.paper, P.c2, .7) });
        lab(R, [LX[L] - .6, h1, z], cl[L] + ' calls', { mono: 1, fs: 12, b: 1, c: P.c1, dy: -12, a: win(e, .6, 1) });
        lab(R, [LX[L] + .6, h2, z], (fl[L] / 1e6).toFixed(0) + ' MFLOP', { mono: 1, fs: 12, b: 1, c: P.c2, dy: -12, a: win(e, .6, 1) }); }
      lab(R, [0, 0, GZ + 1.3], 'sequential calls (blue) and FLOPs per image (orange), each to scale', { wide: 1, fs: 12.5, b: 1, c: P.ink, dy: 16, a: win(e, .6, 1) }); }
  }
  const full = { cam: [.0, .62], bounds: [[-5.3, 0, -2.3], [5.3, 2.3, 2.4]] };
  const lane = L => ({ cam: [.0, .6], bounds: [[LX[L] - 1.9, 0, -2.3], [LX[L] + 1.9, 2.3, 2.3]] });
  st = S3.stage({ id: 'stg-par', list: 'sx-par', fig: 'Fig. 4 · one class, three ways to write it', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 3800, hold: 3400, draw, margin: NMK.margin,
    view: k => k >= 1 && k <= 3 ? lane(k - 1) : full });
})();
