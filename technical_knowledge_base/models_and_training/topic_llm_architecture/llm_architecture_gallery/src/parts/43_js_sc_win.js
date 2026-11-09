// ---- Scene (section 6, Fig. 8): sliding windows. One model's layers side by side (x), each a bar whose height is the bytes it keeps per token
// (AG row .per) and whose length is the tokens it holds for one request (z, the newest token at the front). Global layers hold all T tokens;
// windowed layers hold min(T, W) (AG row .W), so as T grows they stop and the window band stays behind. Totals are AG.cache with and
// without windows credited. Gemma 3 27B at 1,024, 8,192 and 131,072 tokens, then gpt-oss-120b and Gemma 4 31B at 131,072. ----
(function () {
  if (!document.getElementById('stg-win') || !window.AGS) return;
  const { lab, mc, B, nm, row, int, cl } = AGS, G = AGS.G;
  const MS = ['Gemma 3 27B', 'GPT-OSS 120B', 'Gemma 4 31B'].map(row), MI = [0, 0, 0, 1, 2], TS = [1024, 8192, 131072, 131072, 131072];
  const ZL = 4.6, ZF = 2.3, XW = 6, YS = .5 / 8192;
  const lg = Math.log2;
  function model(R, P, r, T, a, st) {
    const L = r.L, dx = XW / L, x = i => -XW / 2 + (i + .5) * dx, len = c => ZL * (c === 'S' && r.W ? Math.min(T, r.W) : T) / T;
    // the window band: the last W tokens, which every layer still holds
    if (r.W && T > r.W) { const zb = ZF - ZL * r.W / T; R.quad([[-XW / 2, .003, ZF], [XW / 2, .003, ZF], [XW / 2, .003, zb], [-XW / 2, .003, zb]], { fill: P.c6, fa: .16, ec: P.c6, ea: .5, a });
      lab(R, [XW / 2 + .1, 0, Math.min(ZF - .1, zb)], 'window: last ' + int(r.W) + ' tokens', { fs: 12.5, b: 1, al: 'left', dx: 10, c: P.c6, a }); }
    for (let i = 0; i < L; i++) { const c = r.mix[i], l = len(c), h = r.per[c] * YS;
      R.box([x(i), 0, ZF - l / 2], [dx * .72, h, l], { fill: mc(P, c), a, shadow: false, lw: .5 });
      if (c === 'G' && a > .5) R.flow([[x(i), h + .02, ZF], [x(i), h + .02, ZF - l]], { c: P.c1, a: a * .75, r: .035, n: 5, speed: .9 }); }
    // one new token: an entry for every layer, written at the front
    R.flow([[-XW / 2 - .3, .02, ZF + .25], [XW / 2 + .1, .02, ZF + .25]], { c: P.acc, a: a * .8, r: .04, n: 10, speed: 1.4 });
    // the sums for this request
    const nS = (r.mix.match(/S/g) || []).length, nG = (r.mix.match(/G/g) || []).length, sS = nS * r.per.S * Math.min(T, r.W), sG = nG * r.per.G * T;
    const held = G.cache(r, T, true), card = r.kv * T;
    const A = [-XW / 2, 0, ZF - ZL];
    lab(R, A, nm(r.n) + ' at ' + int(T) + ' tokens', { fs: 13, b: 1, al: 'left', dx: -6, dy: -84, c: P.ink, a });
    lab(R, A, 'windowed ' + nS + ' × ' + B(r.per.S) + ' × ' + int(Math.min(T, r.W)) + ' = ' + B(sS), { mono: true, fs: 12, al: 'left', dx: -6, dy: -66, c: P.c6, a, wide: 1 });
    lab(R, A, 'global ' + nG + ' × ' + B(r.per.G) + ' × ' + int(T) + ' = ' + B(sG), { mono: true, fs: 12, al: 'left', dx: -6, dy: -50, c: P.c1, a, wide: 1 });
    lab(R, A, 'held ' + B(held) + (card > held + 1 ? ' · card ' + B(card) : ''), { mono: true, fs: 12.5, b: 1, al: 'left', dx: -6, dy: -32, c: P.acc, a });
    lab(R, [-XW / 2 - .4, 0, ZF - ZL], 'oldest', { fs: 12, al: 'right', dx: -8, c: P.mute, a: a * .9, wide: 1 });
    lab(R, [-XW / 2 - .3, 0, ZF + .25], 'newest token', { fs: 12, al: 'right', dx: -8, c: P.mute, a: a * .9, wide: 1 });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 3.6, -2.6, 2.8, .5);
    const a0 = MI[st.pk], a1 = MI[k];
    if (a0 === a1) { const t = e >= 1 ? TS[k] : Math.pow(2, S3.lerp(lg(TS[st.pk]), lg(TS[k]), e)); model(R, P, MS[a1], t, 1, st); }
    else { if (e < .5) model(R, P, MS[a0], TS[st.pk], 1 - 2 * e, st); else model(R, P, MS[a1], TS[k], cl(2 * e - 1, 0, 1), st); }
  }
  const full = { cam: [.45, .55], bounds: [[-3.4, 0, -2.4], [3.4, 1.0, 2.6]] };
  S3.stage({ id: 'stg-win', list: 'sx-win', fig: 'Fig. 8 · what each layer holds for one request', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 2200, hold: 5200, draw,
    margin: w => w < 520 ? [40, 8, 14, 8] : [96, 150, 14, 110] });
})();
