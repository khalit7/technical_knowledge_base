// ---- Scene (section 5, Fig. 3): the same images, a different FID. Every column is one measured FID of EV.pit (10,000 images per set, reference
// the 10,000 test images, torch-fidelity 0.4.0 Inception features); the cards are four real training images from EV.jpeg: as stored (PNG),
// saved as JPEG at quality 75 and read back, and the absolute difference amplified 8x. One linear height scale; the nearest-neighbour column
// (FID 331) is cut at the top of the scale and says so. What the scene shows is published in window.EVS.pit. ----
(function () {
  if (!document.getElementById('stg-pit') || !window.EVK) return;
  const { card, column, lab, fmt, win, seg } = EVK, E = EV, J = E.jpeg, PT = E.pit;
  // columns: [key in EV.pit, label under it, step it appears at, group]
  const C = [['real', 'PNG vs PNG', 0, 0],
    ['real_jpeg90', 'JPEG 90', 1, 1], ['real_jpeg75', 'JPEG 75', 1, 1], ['real_jpeg50', 'JPEG 50', 1, 1], ['real_jpeg75_vs_test_jpeg75', 'both JPEG 75', 3, 1],
    ['real_bic299', 'bicubic', 4, 2], ['real_near299', 'nearest', 4, 2], ['real_bic299_vs_test_bic299', 'both bicubic', 4, 2], ['real_vs_test_bic299', 'reference only', 4, 2],
    ['ddpm', 'DDPM PNG', 5, 3], ['ddpm_jpeg75', 'samples JPEG', 5, 3], ['ddpm_vs_test_jpeg75', 'reference JPEG', 5, 3], ['ddpm_jpeg75_vs_test_jpeg75', 'both JPEG', 5, 3]];
  const GX = [-4.6, -2.7, .55, 3.95], SP = .82, ZC = .7, CAP = 80, HS = 2.2 / CAP, CW = .56;
  const xs = []; { const cnt = [0, 0, 0, 0]; C.forEach(c => { xs.push(GX[c[3]] + cnt[c[3]]++ * SP); }); }
  const gmid = g => { const i = C.map((c, j) => j).filter(j => C[j][3] === g); return (xs[i[0]] + xs[i[i.length - 1]]) / 2; };
  window.EVS = window.EVS || {}; EVS.pit = Object.fromEntries(C.map(c => [c[0], fmt(PT[c[0]].fid, 2)])); EVS.pit.mad75 = fmt(J.mad['75'], 2); EVS.pit.psnr75 = fmt(J.psnr['75'], 1);
  ['flow', 'flow_jpeg75', 'flow_vs_test_jpeg75', 'flow_jpeg75_vs_test_jpeg75'].forEach(k => { EVS.pit[k] = fmt(PT[k].fid, 2); });
  Object.assign(EVS.pit, { dino75: fmt(PT.real_jpeg75.fd_dino, 1), dino0: fmt(PT.real.fd_dino, 1), cmmd75: fmt(PT.real_jpeg75.cmmd, 3), cmmd0: fmt(PT.real.cmmd, 4), cmmdflow: fmt(EVK.mean(E.m.flow.cmmd[E.ns.indexOf(10000)]), 3) });
  const TX = -3.6, TZ = -1.4, TS = .78, TG = .14;
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.4, 6.8, -2.2, 2.2, .5);
    // the four real images as cards: PNG at steps 1 and 2 onwards, JPEG 75 at step 2, the amplified difference at step 3
    const src = k === 1 ? J.q75 : k === 2 ? J.d75 : J.orig, ta = k <= 3 ? 1 : 0;
    src.forEach((u, i) => card(R, u, [TX + i * (TS + TG) - 1.5 * (TS + TG) - TS / 2 + 1.5, .35, TZ], TS, TS, ta, { pad: .04 }));
    lab(R, [TX + 1.5, .35 + TS, TZ], k === 1 ? 'saved as JPEG 75 (PIL’s default) and read back' : k === 2 ? '|JPEG − PNG| × 8' : 'four real training images, as stored (PNG)', { fs: 12.5, b: 1, dy: -14, c: P.ink, a: k <= 3 ? 1 : 0 });
    // flows: from the images through the feature extractor into the column being explained
    const tgt = k === 0 ? [0] : k === 1 ? [1, 2, 3] : k === 3 ? [4] : [];
    tgt.forEach(j => R.flowArc([TX + 1.5, .5, TZ + .05], [xs[j], .1, ZC - .1], .9, { c: j ? P.bad : P.good, r: .05, n: 9, a: .75 }));
    C.forEach((c, j) => {
      const v = PT[c[0]].fid, appear = c[2], cur = k === appear, shown = k >= appear;
      if (!shown) { R.quad([[xs[j] - CW / 2, .005, ZC - CW / 2], [xs[j] + CW / 2, .005, ZC - CW / 2], [xs[j] + CW / 2, .005, ZC + CW / 2], [xs[j] - CW / 2, .005, ZC + CW / 2]], { ec: P.line, ea: .9, dash: [3, 3], a: .9 }); return; }
      const t = cur ? e : 1, hgt = Math.min(v, CAP) * HS * t, focus = c[3] === (k <= 3 ? (k === 0 ? 0 : 1) : k === 4 ? 2 : 3) || (j === 0 && k <= 2), a = focus ? 1 : k <= 2 ? .3 : 0; // the close views of steps 4 to 6 show only their own group
      const floorish = v < 4, fill = floorish ? S3.mix(P.paper, P.good, .7) : c[0].startsWith('ddpm') && v < 12 ? S3.mix(P.paper, P.c1, .7) : S3.mix(P.paper, P.bad, .62);
      column(R, [xs[j], 0, ZC], CW, CW, hgt, { fill, a, text: t >= 1 && focus ? fmt(v, v > 100 ? 0 : 2) + (v > CAP ? ' (cut)' : '') : null, b: cur, tc: floorish ? P.good : P.ink, ta: a });
      if (v > CAP && t >= 1) [0, .09].forEach(d => R.line([[xs[j] - CW / 2 - .05, hgt - .16 - d, ZC + CW / 2 + .01], [xs[j] + CW / 2 + .05, hgt - .08 - d, ZC + CW / 2 + .01]], { c: P.card, w: 3, a, top: 1 }));
      if (focus) lab(R, [xs[j], 0, ZC + CW / 2], c[1], { fs: 12, dy: 12, c: P.mute, wide: 1 });
    });
    // the floor of this data, as a line across the field
    const fy = PT.real.fid * HS; R.line([[xs[0] - .4, fy, ZC + CW / 2 + .02], [xs[xs.length - 1] + .4, fy, ZC + CW / 2 + .02]], { c: P.good, w: 1.4, dash: [4, 4], a: .8, top: 1 });
    lab(R, [xs[xs.length - 1] + .4, fy, ZC + CW / 2], 'floor ' + fmt(PT.real.fid, 2), { al: 'left', dx: 6, mono: 1, fs: 12, c: P.good, b: 1 });
  }
  const full = { cam: [-.12, .55], bounds: [[-5.2, 0, -1.6], [6.6, 2.3, 1.3]] };
  // a group's close view: as high as its tallest column (capped) plus room for the value labels
  const grp = g => { const x = gmid(g), hw = g === 0 ? 1.6 : 2.1, top = Math.max(...C.filter(c => c[3] === g).map(c => Math.min(PT[c[0]].fid, CAP) * HS)) + .45;
    return { cam: [-.12, .5], bounds: [[x - hw, 0, g === 1 ? -1.6 : -.2], [x + hw, Math.max(top, g === 1 ? 1.3 : 0), 1.3]] }; };
  const st = S3.stage({ id: 'stg-pit', list: 'sx-pit', fig: 'Fig. 3 · same images, different pixels, different FID', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 18, 10] : [18, 60, 20, 18],
    view: k => k <= 2 ? { cam: [-.1, .45], bounds: [[-5.4, 0, -1.6], [-.1, 1.9, 1.3]] } : k === 3 ? grp(1) : k === 4 ? grp(2) : k === 5 ? grp(3) : full });
  EVK.onload(() => st && st.draw());
})();
