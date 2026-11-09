// ---- Scene (section 4, Fig. 4): selection, measured. One head of the trained SSM-only tiny GPT (run ba_ssm; BAD.inside, from src/inside/ssm_inside.py):
// layer 1's most variable head (the one si-dec defaults to), its decay a_t = exp(dt_t A_h) on 17 tokens of the running sequence (" r" to " to",
// which contain " Roxy" twice). Step 1 gives every token the head's median a, as an input-independent (S4-style) layer would; the rest use the
// recorded a_t: the state carried along the sequence, what one write is worth later (the running product of a), and Mamba-2's decay mask L. ----
(function () {
  if (!document.getElementById('stg-scan') || !window.BAS || !window.BAD || !BAD.inside) return;
  const { mix } = S3, { tw, la, lab, field, win } = BAS;
  const I = BAD.inside, L0 = I.layers[0], dec = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  const A = dec(L0.a_tok), T = A.length / 16;
  let H = 0, bv = -1; for (let h = 0; h < 16; h++) { let m = 0, q = 0; for (let t = 0; t < T; t++) { const v = A[h * T + t] / 255; m += v; q += v * v } const sd = q / T - (m / T) * (m / T); if (sd > bv) { bv = sd; H = h } }
  const P0 = BAD.rs_pieces, T0 = 14, N = 17, TK = [], AT = [];
  for (let t = T0; t < T0 + N; t++) { TK.push(P0[t]); AT.push(A[H * T + t] / 255); }
  const AM = L0.a_median[H], SRC = TK.indexOf(' R');
  const low = AT.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]).slice(0, 3).map(x => x[1]);
  // the share of the write at SRC still in the state at each later token: the product of the decays after it
  const keep = a => AT.map((_, t) => { if (t < SRC) return 0; let p = 1; for (let j = SRC + 1; j <= t; j++) p *= a[j]; return p; });
  const KM = keep(AT.map(() => AM)), KR = keep(AT);
  // Mamba-2's decay mask on these tokens: L[i][j] = a_{j+1} ... a_i, 1 on the diagonal, 0 above it
  const LM = AT.map((_, i) => AT.map((_, j) => { if (j > i) return NaN; let p = 1; for (let k = j + 1; k <= i; k++) p *= AT[k]; return p; }));
  window.BA_SCAN = { layer: L0.layer, head: H, median: AM, low: low.map(i => [TK[i], AT[i]]), src: TK[SRC], keepReal: KR, keepMed: KM, tokens: TK, a: AT };
  const XS = .62, x = i => (i - (N - 1) / 2) * XS, ZT = 1.35, ZG = .45, ZS = -.45, ZW = -1.35;
  const lbl = t => t.replace(/\n/g, '↵');
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6, 6, -2.4, 2.4, .5);
    const ma = tw(st, e, q => q === 4 ? 0 : 1), fa = tw(st, e, q => q === 4 ? 1 : 0);
    // the decay per token: the median everywhere at step 1, then the recorded values
    const ar = tw(st, e, q => q === 0 ? 0 : 1), a = AT.map(v => AM + (v - AM) * ar);
    TK.forEach((t, i) => { R.box([x(i), 0, ZT], [.44, .12, .3], { a: ma, fill: i === SRC && k >= 3 ? mix(P.paper, P.q, .5) : P.paper });
      lab(R, [x(i), 0, ZT + .15], lbl(t), { fs: 12, mono: true, dy: 14 + (i % 2) * 14, c: low.includes(i) && k >= 1 ? P.bad : P.ink, b: low.includes(i) && k >= 1, a: ma, wide: !low.includes(i) });
      const h = a[i] * 1.3, hot = low.includes(i) && ar > .5;
      R.box([x(i), 0, ZG], [.3, Math.max(.02, h), .3], { fill: hot ? mix(P.paper, P.bad, .75) : mix(P.paper, P.c1, .55), a: ma });
      lab(R, [x(i), h, ZG], a[i].toFixed(2), { fs: 12, mono: true, dy: -10, c: hot ? P.bad : P.mute, a: ma * (hot || (k === 0 && i === 0) ? 1 : 0), wide: !hot }); });
    // the state, one plate per position, carried to the next position in proportion to a
    const sa = tw(st, e, q => q === 2 || q === 3 ? 1 : 0) * ma;
    if (sa > .01) TK.forEach((_, i) => { const kp = k === 3 ? KR[i] : 1; R.glass([x(i) - .22, .9, ZS - .22], [.44, 0, 0], [0, 0, .44], { c: P.c1, a: sa * (k === 3 ? .25 + .75 * kp : .75), nu: 4, nv: 4, th: .03 });
      if (i < N - 1) R.flow([[x(i) + .22, .93, ZS], [x(i + 1) - .22, .93, ZS]], { c: P.c1, a: sa * (.25 + .75 * AT[i + 1]), r: .03 + .04 * AT[i + 1], n: 1 + Math.round(3 * AT[i + 1]), speed: .5 });
      R.flow([[x(i), .15, ZT - .1], [x(i), .88, ZS + .2]], { c: P.q, a: sa * .5, r: .035, n: 3, speed: .7 }); });
    // what the write at the first " R" is worth later: constant decay at step 1, the recorded decays at step 4
    const wa = tw(st, e, q => q === 0 || q === 3 ? 1 : 0) * ma;
    if (wa > .01) { const kp = k === 0 || (st.pk === 0 && e < 1 && k !== 3) ? KM : KR;
      kp.forEach((p, i) => { if (i < SRC) return; R.box([x(i), 0, ZW], [.34, Math.max(.015, p * 1.6), .34], { fill: mix(P.paper, P.q, .7), a: wa * (k === 3 ? .95 : .8), shadow: false });
        lab(R, [x(i), p * 1.6, ZW], (100 * p).toFixed(0) + '%', { fs: 12, mono: true, dy: -10, c: P.q, a: wa * (i <= SRC + 6 ? 1 : 0), wide: i !== SRC }); }); }
    // Mamba-2: the same decays as a T x T mask, the attention-like matrix the layer multiplies by
    if (fa > .01) field(R, 0, .05, 0, LM, 1, { a: fa, cs: .3, hmax: 1.3, pa: .35, pos: mix(P.paper, P.c1, .7) });
    const Lk = j => la(st, e, q => q === j ? 1 : 0);
    lab(R, [x(N - 1) + .3, .9, ZG], 'decay a: the median, ' + AM.toFixed(2) + ', everywhere', { fs: 12.5, b: 1, c: P.c1, al: 'right', dy: -26, a: Lk(0) });
    lab(R, [x(SRC), 1.6, ZW], 'a write at "R", fading by a per token', { fs: 12.5, b: 1, c: P.q, dy: -24, a: Lk(0) });
    lab(R, [x(0) - .2, 1.3, ZG], 'decay a per token, measured', { fs: 12.5, b: 1, c: P.c1, al: 'left', dy: -20, a: Lk(1) });
    lab(R, [x(N - 1), 1.3, ZG], 'red: the 3 strongest resets', { fs: 12.5, b: 1, c: P.bad, dy: -20, al: 'right', a: Lk(1) });
    lab(R, [x(0) - .2, .95, ZS], 'state · 32 × 16 per head, carried along', { fs: 12.5, b: 1, c: P.c1, al: 'left', dy: -18, a: Lk(2) });
    lab(R, [x(SRC), 1.6, ZW], 'the same write, measured decays', { fs: 12.5, b: 1, c: P.q, dy: -24, a: Lk(3) });
    lab(R, [0, 1.4, -2.6], 'L: 17 × 17, Lᵢⱼ = aⱼ₊₁ ⋯ aᵢ', { fs: 12.5, b: 1, c: P.c1, dy: -14, a: Lk(4) });
  }
  const full = { cam: [.35, .62], bounds: [[-5.4, 0, -1.6], [5.4, 1.7, 1.8]] };
  S3.stage({ id: 'stg-scan', list: 'sx-scan', fig: 'Fig. 4 · one trained SSM head, layer ' + L0.layer + ', head ' + H, cam: full.cam, bounds: full.bounds, aspect: .58, dur: 1600, hold: 5000, draw, margin: BAS.margin,
    view: k => k === 4 ? { cam: [.3, .75], bounds: [[-2.7, 0, -2.7], [2.7, 1.4, 2.7]] } : full });
})();
