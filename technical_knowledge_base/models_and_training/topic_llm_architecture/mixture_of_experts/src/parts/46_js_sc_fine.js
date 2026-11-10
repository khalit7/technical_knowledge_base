// ---- Scene (section 5, Fig. 6): fine-grained and shared experts at the same compute. Block width is proportional to an expert's hidden size
// (tiny GPT: 512 for moe8top2, 256 for the fine-grained layers); lit blocks are the trained models' choices for token 1 ("Once") in layer 1
// (MXD.runs.moe8 / moe16s .seq.top); the 16-experts-top-4 row and DeepSeek-V3's 8 are illustrative picks. ----
(function () {
  if (!document.getElementById('stg-fg') || !window.MXS) return;
  const { D, ec, la, lab, cl } = MXS, { mix, lerp } = S3;
  const pick = run => { const r = D.runs[run].seq, k = r.k; return r.top[0].slice(k, 2 * k).split('').map(c => parseInt(c, 16)); };
  const p8 = pick('moe8'), p16 = pick('moe16s'), pB = [1, 6, 9, 14], pDS = new Set([3, 17, 40, 77, 120, 150, 201, 233]);
  const U = .9 / 512, G = .12, H = .7, D0 = 1.1, TOK = [0, .25, 2.6];
  const x8 = i => (i - 3.5) * (512 * U + G), x16 = i => (i - 7.5) * (256 * U + G);
  // a half of expert i touching its twin, the position it splits from
  const xHalf = j => x8(j >> 1) + (j % 2 ? 1 : -1) * 256 * U / 2;
  const TXT = ['8 experts, top 2: C(8, 2) = 28 sets', 'split 2 ways: 16 experts, top 4: C(16, 4) = 1,820 sets', '16 routed + 1 shared, top 3: C(16, 3) = 560 routed sets', 'DeepSeek-V3: 256 routed + 1 shared, top 8: C(256, 8) ≈ 4.1 × 10¹⁴'];
  function row(R, P, s, a, e, st) {
    if (s === 3) { const g = .24, x0 = -3.6, z0 = -1.7;
      for (let i = 0; i < 256; i++) { const x = x0 + (i % 16) * g * 1.9, z = z0 + Math.floor(i / 16) * g * .9, on = pDS.has(i);
        R.box([x, 0, z], [g * 1.6, on ? .5 : .14, g * .7], { fill: on ? P.acc : P.paper, a, shadow: false, lw: on ? .7 : .35, ea: on ? .8 : .4 }); if (on && a > .3) R.flowArc(TOK, [x, .5, z], .6, { c: P.acc, a: a * .7, r: .04, n: 6, speed: 1.4 }); }
      R.box([3.4, 0, -.6], [.5, .7, .5], { fill: P.ink, a }); lab(R, [3.4, .7, -.6], 'shared', { fs: 12, b: 1, dy: -12, c: P.ink, a });
      if (a > .3) R.flowArc(TOK, [3.4, .7, -.6], .6, { c: P.ink, a: a * .7, r: .04, n: 6, speed: 1.4 });
      lab(R, TOK, R.W < 560 ? 'another scale: experts 2,048 wide' : 'a different scale: each expert 2,048 wide, the dense FFN 18,432', { fs: 12.5, dy: 40, c: P.mute, a });
      return; }
    const n = s === 0 ? 8 : 16, lit = s === 0 ? p8 : s === 1 ? pB : p16, w = (s === 0 ? 512 : 256) * U;
    const split = s === 1 && st.pk === 0 && e < 1 ? e : 1;
    for (let i = 0; i < n; i++) { const x = s === 0 ? x8(i) : lerp(xHalf(i), x16(i), split), on = lit.includes(i);
      R.box([x, 0, 0], [w, on ? H : H * .45, D0], { fill: on ? mix(P.paper, s === 0 ? ec(i) : P.acc, s === 0 ? .85 : .8) : P.paper, a, lw: .8 });
      if (on && a > .3) R.flowArc(TOK, [x, on ? H : .3, 0], .5, { c: P.acc, a: a * .8, r: .045, n: 7, speed: 1.4 }); }
    if (s === 2) { R.box([x16(15) + .75, 0, 0], [w, H, D0], { fill: P.ink, a, lw: .8 }); lab(R, [x16(15) + .75, H, 0], 'shared', { fs: 12, b: 1, dy: -12, c: P.ink, a });
      if (a > .3) R.flowArc(TOK, [x16(15) + .75, H, 0], .5, { c: P.ink, a: a * .8, r: .045, n: 7, speed: 1.4 }); }
    lab(R, TOK, (R.W < 560 ? '' : 'computed per token: ') + (s === 0 ? '2 × 512' : s === 1 ? '4 × 256' : '3 × 256 + 256 shared') + ' = 1,024 wide', { mono: true, fs: 12.5, dy: 40, c: P.acc, a });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5, 5, -2.2, 3, .5);
    const tween = st.pk !== k && e < 1 && !(k === 1 && st.pk === 0);
    if (!tween) row(R, P, k, 1, e, st);
    else if (e < .5) row(R, P, st.pk, 1 - 2 * e, 1, st); else row(R, P, k, cl(2 * e - 1, 0, 1), 1, st);
    R.ball(TOK, .15, { c: P.acc }); lab(R, TOK, '"Once"', { fs: 12.5, b: 1, dy: 20, c: P.acc });
    lab(R, [0, 1.2, -1.8], R.W < 560 ? TXT[k].split(': ').pop() : TXT[k], { fs: 13, b: 1, c: P.ink, a: la(st, e, kk => 1) });
  }
  S3.stage({ id: 'stg-fg', list: 'sx-fg', fig: 'Fig. 6 · finer experts at the same compute', cam: [.12, .62], bounds: [[-4.9, 0, -1.9], [5.1, 1.2, 3.2]], aspect: .5, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [30, 8, 24, 8] : [40, 16, 30, 16] });
})();
