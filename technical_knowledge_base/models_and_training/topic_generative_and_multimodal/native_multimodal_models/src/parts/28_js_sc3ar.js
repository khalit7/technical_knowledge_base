// ---- Scene (section 3, Fig. 3): the tiny autoregressive model writing one dress, one code per call, in raster order, grouped into its 8 rows
// (one step per row). The page's own recorded sample (NM.smp.ar_record["1.0"], class 3, temperature 1, no top-k, no guidance): each column's
// height is the entropy of that call's distribution in bits (9.97 would be a blind guess among 1,000 codes), and the upright tile is the
// recorded partial decode after the row (sprite ar_frames__1.0_c3, unwritten codes shown as background). Row totals come from
// make_scene_data.py (NM.sc.ar) and the step list quotes the same values. ----
(function () {
  if (!document.getElementById('stg-ar') || !window.NMK || !NM.sc) return;
  const { mix } = S3, { tileUp, lab, win, pixels } = NMK, C = NM.sc.cls, REC = NM.smp.ar_record['1.0'], H = REC.H[C], TK = REC.tokens[C];
  let st = null, cntEl = null;
  const CS = .46, GX = -.4, GZ = .1, TX = 3.5, TS = 2.3, MZ = -2.75;
  const cp = i => [GX + ((i % 8) - 3.5) * CS, GZ + (Math.floor(i / 8) - 3.5) * CS];
  const hgt = h => .05 + 1.25 * h / 9.97;
  function draw(R, k, e) {
    const P = R.P; R.grid(-4.5, 6, -3.6, 2.4, .5);
    const n = Math.min(64, k * 8 + Math.floor(win(e, .05, .95) * 8 + 1e-9)), done = k * 8; // codes written so far
    // the model: one transformer, called once per code, reading the class and every code before (cached)
    R.box([GX, 0, MZ], [3.2, .8, .7], { fill: mix(P.paper, P.acc, .2) });
    lab(R, [GX, .8, MZ], '6-layer transformer · 3.07M', { fs: 12.5, b: 1, c: P.acc, dy: -12 });
    lab(R, [GX, .8, MZ], 'first position: the class, ' + NMK.CL[C], { wide: 1, fs: 12.5, b: 1, c: P.c5, dy: -30 });
    // the 8 x 8 grid: written cells as columns of entropy, unwritten ones dashed
    for (let i = 0; i < 64; i++) { const [x, z] = cp(i);
      if (i >= n) { R.quad([[x - CS * .43, .005, z - CS * .43], [x + CS * .43, .005, z - CS * .43], [x + CS * .43, .005, z + CS * .43], [x - CS * .43, .005, z + CS * .43]], { a: .5, dash: [3, 3], ec: P.line, lw: 1 }); continue; }
      const fresh = i >= done, t = fresh ? win(e, (i - done) / 8, (i - done + 1) / 8) : 1, h = H[i];
      R.box([x, 0, z], [CS * .82, hgt(h) * t + .01, CS * .82], { fill: mix(P.paper, P.c2, .15 + .75 * h / 9.97), a: fresh || i >= done - 8 ? 1 : .8, shadow: false, lw: .6 }); }
    // the call in progress: dots from the model into the cell being written
    if (n > done && n < 64 + 1 && e < .97) { const i = n - 1, [x, z] = cp(i);
      R.flowArc([GX + ((i % 8) - 3.5) * .35, .8, MZ + .35], [x, hgt(H[i]) + .05, z], .5, { c: P.c3, r: .07, n: 6 });
      lab(R, [x, hgt(H[i]) + .05, z], 'call ' + (i + 1), { mono: 1, fs: 12, b: 1, c: P.c3, dy: -14 }); }
    // the row total and, at its row, the most uncertain call of the image
    const r = Math.max(0, Math.min(7, k)), [x0, z0] = cp(r * 8);
    lab(R, [x0 - CS * .6, 0, z0], 'row ' + (r + 1) + ': ' + NM.sc.ar.rowbits[r].toFixed(1) + ' bits', { wide: 1, mono: 1, fs: 12.5, b: 1, al: 'right', dx: -4, c: P.c2, a: win(e, .85, 1) });
    const hm = NM.sc.ar.Hmax_pos - 1;
    if (k === Math.floor(hm / 8)) { const [x, z] = cp(hm); lab(R, [x, hgt(H[hm]), z], H[hm].toFixed(2) + ' bits', { mono: 1, fs: 12, b: 1, c: P.ink, dy: -28, a: win(e, (hm % 8 + 1) / 8, 1) }); }
    // the partial image, decoded from the codes so far
    tileUp(R, [TX, .05, -1.2], TS, pixels('ar_frames__1.0_c3', n, () => st && st.draw()), 1);
    lab(R, [TX, TS + .05, -1.2], 'decoded so far', { fs: 12.5, b: 1, c: P.ink, dy: -12 });
    if (cntEl) { const h = '<b>calls ' + n + ' of 64</b><br>one new code per call'; if (cntEl.innerHTML !== h) cntEl.innerHTML = h; }
  }
  const full = { cam: [.25, .74], bounds: [[-3.6, 0, -3.2], [4.7, 2.4, 1.8]] };
  st = S3.stage({ id: 'stg-ar', list: 'sx-ar', fig: 'Fig. 3 · one dress, 64 calls, row by row', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 3600, hold: 3400, draw,
    margin: w => w < 520 ? [44, 8, 14, 8] : [50, 18, 22, 18], view: k => k === 3 ? { cam: [.35, .7], bounds: [[-3.6, 0, -2.6], [3.0, 1.6, 1.8]] } : full });
  if (st) { cntEl = document.createElement('div'); cntEl.className = 'nm-c3'; st.host.querySelector('.stg-cv').appendChild(cntEl); st.draw(); }
})();
