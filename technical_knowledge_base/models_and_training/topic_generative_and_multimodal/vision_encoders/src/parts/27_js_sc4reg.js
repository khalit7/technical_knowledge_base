// ---- Scene (section 3, Fig. 4): high-norm tokens and registers. Column heights are each patch token's L2 norm in the last block's output
// divided by that image's median (VE.dense.enc.*.normRatio, x 10, from runs/dense.py), one scale for every step; registers are DINOv2 with
// registers' four extra tokens (regNorm over the same median). SigLIP 2's mean over the 16 test images is computed here from the same data. ----
(function () {
  if (!document.getElementById('stg-reg') || !window.VEK) return;
  const { mix } = S3, { tw, la, lab, image, cell } = VEK, D = VE.dense, KEYS = D.allkeys, HS = .085;
  const NR = {}; ['siglip', 'dino', 'dinoreg'].forEach(w => NR[w] = VEU.u8(D.enc[w].normRatio));
  let img = KEYS.indexOf('p01_cat');
  const ratio = (w, i, p) => NR[w][i * D.enc[w].grid ** 2 + p] / 10;
  const meanSig = []; for (let p = 0; p < 196; p++) { let s = 0; for (let i = 0; i < 16; i++) s += ratio('siglip', i, p); meanSig.push(s / 16); }
  const IX = -3.3, IS = 2.6, FX = 1.3, S = 3.0, RX = 4.2;
  const ENC = ['siglip', 'siglip', 'dino', 'dinoreg'], NAME = ['SigLIP 2 B/16', 'SigLIP 2 B/16 · mean of 16 images', 'DINOv2 B/14', 'DINOv2 B/14 with registers'];
  function field(R, w, val, a, tag) { const g = D.enc[w].grid, P = R.P, top = [];
    for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) { const p = r * g + c, v = val(p), t = cell(g, FX, 0, S, .03, r, c), hot = v > 3;
      R.box([t[0], 0, t[1]], [t[2] * .78, Math.max(.01, v * HS), t[2] * .78], { fill: hot ? mix(P.paper, P.c2, .8) : mix(P.paper, P.acc, .15 + .12 * Math.min(3, v)), a, shadow: false, lw: .45 });
      top.push([v, r, c, t]); }
    top.sort((x, y) => y[0] - x[0]); return top; }
  function draw(R, k, e, st) {
    const P = R.P, w = ENC[k], g = D.enc[w].grid; R.grid(-5, 5.4, -2.1, 2.1, .5);
    image(R, KEYS[k === 1 ? 0 : img], g === 16 ? 32 : 28, IX, 0, IS, { g, a: tw(st, e, q => q === 1 ? .25 : 1) });
    lab(R, [IX, 0, IS / 2], k === 1 ? 'all 16 test images' : KEYS[img].replace(/^[a-z]\d\d_/, '').replace(/_/g, ' '), { fs: 12.5, b: 1, c: P.ink, dy: 16 });
    // the fields fade over between steps; the scale is the same in every step
    for (let q = 0; q < 4; q++) { const a = tw(st, e, z => z === q ? 1 : 0); if (a <= .01) continue; const ww = ENC[q];
      const top = field(R, ww, q === 1 ? p => meanSig[p] : p => ratio(ww, img, p), a);
      const la1 = la(st, e, z => z === q ? 1 : 0), nl = q <= 1 ? 3 : 1;
      top.slice(0, nl).forEach(([v, r, c, t]) => lab(R, [t[0], v * HS, t[1]], '(' + r + ', ' + c + ') ' + v.toFixed(1) + '×', { mono: 1, fs: 12, b: 1, c: v > 3 ? P.c2 : P.ink, dy: -10, grp: 'top', a: la1 }));
      lab(R, [FX, 0, S / 2], NAME[q], { fs: 12.5, b: 1, c: q === 3 ? P.c6 : P.acc, dy: 16, a: la1 }); }
    // DINOv2 with registers: the four extra tokens, beside the grid
    const ra = tw(st, e, q => q === 3 ? 1 : 0);
    if (ra > .01) { const rn = D.enc.dinoreg.regNorm[img], med = D.enc.dinoreg.normMed[img];
      rn.forEach((v, i) => { const z = -1.05 + i * .7, h = v / med; R.box([RX, 0, z], [.34, h * HS, .34], { fill: mix(P.paper, P.c6, .7), a: ra, shadow: false });
        lab(R, [RX + .2, h * HS, z], 'register ' + (i + 1) + ' · ' + h.toFixed(1) + '×', { mono: 1, fs: 12, c: P.c6, al: 'left', dx: 6, grp: 'reg', a: la(st, e, q => q === 3 ? 1 : 0) }); }); }
    lab(R, [FX + S / 2, 0, -S / 2], 'height: norm ÷ the image\'s median', { fs: 12, c: P.mute, al: 'left', dx: 8, a: la(st, e, q => q === 0 ? 1 : 0), wide: 1 });
  }
  const st = S3.stage({ id: 'stg-reg', list: 'sx-reg', fig: 'Fig. 4 · patch-token norms in the last block', cam: [.25, .62], bounds: [[-4.7, 0, -1.8], [5.0, 2.0, 1.8]], aspect: .55, dur: 1400, hold: 4800, draw, margin: VEK.margin,
    view: k => k >= 2 ? { cam: [.3, .55], bounds: [[-.4, 0, -1.8], [5.4, .5, 1.8]] } : null });
  VEK.chips(document.getElementById('ve-reg-img'), KEYS, img, i => { img = i; st && st.draw(); });
  VEK.onImage(() => st && st.draw());
})();
