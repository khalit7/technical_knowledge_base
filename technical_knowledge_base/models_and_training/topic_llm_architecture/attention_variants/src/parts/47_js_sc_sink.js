// ---- Scene (section 6, Fig. 7): sinks and gates on measured data. Step 1: SmolLM2-135M's weight on token 0 in each of its 30 layers (the root's
// Inside lab, AVB.sink.tok0_by_layer, layers counted from 0 as that lab does). Steps 2-3: the last token's attention over the 226-token running
// sequence in six layers (AVK rows, 1-based layers, mean of 9 heads), binned; the sliding-cache losses (AVB.sink.win). Steps 4-5: the tiny GPT
// with a learned sink logit (AVR.sinks, av_sink, its most sink-heavy head). Step 6: the gated-attention paper's published first-token share. ----
(function () {
  if (!document.getElementById('stg-sink') || !window.AVS || !window.AVK || !window.AVB || !window.AVR) return;
  const { mix } = S3, { tw, la, lab } = AVS, SK = AVB.sink, T0 = SK.tok0_by_layer, WN = SK.win;
  // the last token's attention in six layers, binned: token 0 alone, then bins of 9 positions
  const q = AVK.tokens.length - 1, BIN = 9, LAY = AVK.layers, NB = 1 + Math.ceil(q / BIN);
  const rows = LAY.map(l => { const r = AVK.rows.find(x => x.layer === l && x.q === q), w = Array.from(r.mean, ch => (ch.charCodeAt(0) - 48) / 63 * r.mean_max), b = Array(NB).fill(0);
    w.forEach((v, p) => { b[p === 0 ? 0 : 1 + Math.floor((p - 1) / BIN)] += v; }); return b; });
  const winBins = Math.ceil(WN.W / BIN);
  // the tiny GPT's learned sink: the last query of its sink-heaviest head, binned by 16
  const SR = AVR.sinks.find(r => r.anim), an = SR.anim, last = an.rows[an.rows.length - 1], sinkW = last[last.length - 1], real = last.slice(0, -1), RB = 16;
  const sb = []; for (let i = 0; i < real.length; i += RB) sb.push(real.slice(i, i + RB).reduce((a, b) => a + b, 0));
  const sTot = sb.reduce((a, b) => a + b, 0), sbN = sb.map(v => v / sTot);
  window.AVSINK = { sinkW, l4: an.layer, h: an.head, full: SR.full_loss, removed: SR.loss_sink_removed, win: WN, tok0max: Math.max(...T0.slice(0, 12)), tok0lo: Math.min(...T0.slice(12)), tok0hi: Math.max(...T0.slice(12)) }; // for check_stages.mjs
  const LX = l => -4.4 + l * .3, BX = b => -4.2 + b * .34, RZ = i => -1.6 + i * .62, HS = 2.2;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5, 5.4, -2.4, 2.4, .5);
    // 1. weight on token 0, by layer
    const a1 = tw(st, e, s => s === 0 ? 1 : 0);
    if (a1 > .01) { const l1 = la(st, e, s => s === 0 ? 1 : 0);
      T0.forEach((v, l) => R.box([LX(l), 0, 0], [.22, Math.max(.02, v * HS * (k === 0 ? e : 1)), .5], { fill: l >= 12 ? mix(P.paper, P.bad, .75) : mix(P.paper, P.acc, .5), a: a1, shadow: false }));
      lab(R, [LX(5), .085 * HS, 0], 'layers 0 to 11: at most ' + Math.max(...T0.slice(0, 12)).toFixed(3), { fs: 12.5, b: 1, c: P.acc, dy: -18, a: l1 });
      lab(R, [LX(20), Math.max(...T0) * HS, 0], 'from layer 12: ' + Math.min(...T0.slice(12)).toFixed(2) + ' to ' + Math.max(...T0.slice(12)).toFixed(2), { fs: 12.5, b: 1, c: P.bad, dy: -14, a: l1 });
      lab(R, [LX(0), 0, .3], 'weight on token 0, each of SmolLM2\'s 30 layers', { fs: 12, c: P.mute, al: 'left', dy: 16, a: l1, wide: 1 }); }
    // 2-3. the last token's attention in six layers; step 3 drops token 0 from a 64-token window
    const a2 = tw(st, e, s => s === 1 || s === 2 ? 1 : 0);
    if (a2 > .01) { const l2 = la(st, e, s => s === 1 ? 1 : 0), l3 = la(st, e, s => s === 2 ? 1 : 0), ev = tw(st, e, s => s === 2 ? 1 : 0);
      rows.forEach((b, i) => b.forEach((v, j) => { const inWin = j === 0 || j >= NB - winBins, hgt = Math.max(.02, v * HS * (k === 1 ? e : 1));
        if (j === 0 && ev > .5) { R.quad([[BX(0) - .13, .002, RZ(i) - .2], [BX(0) + .13, .002, RZ(i) - .2], [BX(0) + .13, .002, RZ(i) + .2], [BX(0) - .13, .002, RZ(i) + .2]], { fill: P.soft, a: a2, ea: .7, dash: [3, 3] }); return; }
        R.box([BX(j), 0, RZ(i)], [.26, hgt, .4], { fill: j === 0 ? mix(P.paper, P.bad, .75) : mix(P.paper, P.acc, .55), a: a2 * (1 - ev * (inWin ? 0 : .8)), shadow: false, lw: .5 }); }));
      LAY.forEach((l, i) => lab(R, [BX(NB - 1) + .2, 0, RZ(i)], 'layer ' + l, { fs: 12, c: P.mute, al: 'left', dx: 6, grp: 'ly', a: l2 }));
      lab(R, [BX(0), rows[4][0] * HS, RZ(4)], 'token 0', { fs: 12.5, b: 1, c: P.bad, al: 'right', dx: -10, a: l2 });
      lab(R, [BX(NB / 2), 0, RZ(5) + .3], 'the other 225 positions, in bins of ' + BIN + ' · last token\'s weights', { fs: 12, c: P.mute, dy: 18, a: l2, wide: 1 });
      lab(R, [BX(NB / 2), 0, RZ(5) + .3], 'a ' + WN.W + '-token window without token 0: loss ' + WN.full.toFixed(2) + ' → ' + WN.window.toFixed(2), { fs: 12.5, b: 1, c: P.ink, dy: 18, a: l3 });
      lab(R, [BX(NB / 2), 0, RZ(5) + .3], 'keep token 0 as well: ' + WN.window_sink1.toFixed(2), { fs: 12.5, b: 1, c: P.good, dy: 36, a: l3 }); }
    // 4-5. a learned sink logit: weight sent nowhere; removing it renormalises the same scores over real tokens
    const a4 = tw(st, e, s => s === 3 || s === 4 ? 1 : 0);
    if (a4 > .01) { const rm = tw(st, e, s => s === 4 ? 1 : 0), l4 = la(st, e, s => s === 3 ? 1 : 0), l5 = la(st, e, s => s === 4 ? 1 : 0);
      sb.forEach((v, j) => { const h = Math.max(.02, HS * ((1 - rm) * v + rm * sbN[j])); R.box([-3.2 + j * .44, 0, 0], [.34, h, .5], { fill: mix(P.paper, P.acc, .55), a: a4, shadow: false }); });
      R.box([-4.3, 0, 0], [.5, Math.max(.02, HS * sinkW * (1 - rm)), .5], { fill: mix(P.paper, P.bad, .8), a: a4 * (1 - rm) });
      lab(R, [-4.3, HS * sinkW, 0], 'sink · ' + Math.round(100 * sinkW) + '% sent nowhere', { fs: 12.5, b: 1, c: P.bad, dy: -12, a: l4 });
      lab(R, [-3.2, 0, .6], 'real tokens: ' + Math.round(100 * sTot) + '%, 256 positions in bins of ' + RB, { fs: 12.5, c: P.acc, b: 1, al: 'left', dy: 18, a: l4 , wide: 1 });
      lab(R, [-3.2, 0, .6], 'sink removed: the same scores must sum to 1 · loss ' + SR.full_loss.toFixed(3) + ' → ' + SR.loss_sink_removed.toFixed(3), { fs: 12.5, c: P.ink, b: 1, al: 'left', dy: 18, a: l5 , wide: 1 }); }
    // 6. an output gate (published, Qiu et al.): attention on the first token without and with the gate
    const a6 = tw(st, e, s => s === 5 ? 1 : 0);
    if (a6 > .01) { const l6 = la(st, e, s => s === 5 ? 1 : 0);
      [[-1.2, .467, 'no gate · 46.7%', P.bad], [1.2, .048, 'gated · 4.8%', P.good]].forEach(([x, v, t, c]) => { R.box([x, 0, 0], [.9, Math.max(.02, v * HS * 2), .9], { fill: mix(P.paper, c, .75), a: a6 });
        lab(R, [x, v * HS * 2, 0], t, { fs: 12.5, b: 1, c, dy: -12, a: l6 }); });
      lab(R, [0, 0, .6], 'attention on the first token, 15B MoE (published)', { fs: 12, c: P.mute, dy: 16, a: l6 }); }
  }
  S3.stage({ id: 'stg-sink', list: 'sx-sink', fig: 'Fig. 7 · where attention goes when nothing is worth reading', cam: [.3, .5], bounds: [[-4.8, 0, -1.9], [5.0, 2.1, 1.9]], aspect: .6, dur: 1500, hold: 5000, draw, margin: w => w < 520 ? [22, 8, 22, 8] : [30, 18, 28, 90],
    view: k => k === 0 ? { cam: [.25, .38], bounds: [[-4.8, 0, -.6], [5.0, 1.9, .6]] } : k <= 2 ? { cam: [.18, .72], bounds: [[-4.6, 0, -1.9], [5.2, 1.3, 1.7]] } : k >= 3 ? { cam: [.25, .4], bounds: [[-4.8, 0, -.8], [3.8, 2.2, .8]] } : null });
})();
