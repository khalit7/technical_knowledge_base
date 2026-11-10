// ---- Scene (Fig. 5, section 10): the same FLORES-200 sentence (sentence 366) in seven languages as rows of tokens, one slat per token, over
// the sentence's UTF-8 bytes (the faint footprint). Token counts are the real tokenizers' boundaries stored in TD.ex (export_data.py); the
// premium on each row is over the whole FLORES-200 dev and devtest (TD.fl, 2,009 sentences), the construction of Petrov et al. ----
(function () {
  if (!document.getElementById('stg-tax') || !window.TKS || !window.TD) return;
  const { la, tw, lab } = TKS, { mix } = S3, te = new TextEncoder(), EX = TD.ex, FL = Object.fromEntries(TD.fl.map(r => [r[0], r])), IX = Object.fromEntries(TKV.TK.map((k, i) => [k, 4 + i]));
  const LS = [['eng_Latn', 'English'], ['fra_Latn', 'French'], ['rus_Cyrl', 'Russian'], ['zho_Hans', 'Chinese'], ['hin_Deva', 'Hindi'], ['tam_Taml', 'Tamil'], ['mya_Mymr', 'Burmese']];
  const KS = [['gpt2', 'GPT-2 (r50k, 2019)', 'c5'], ['gpt2', 'GPT-2 (r50k, 2019)', 'c5'], ['cl100k', 'GPT-4 (cl100k, 2023)', 'c2'], ['o200k', 'GPT-4o (o200k, 2024)', 'c1'], ['gemma3', 'Gemma 3 (262K, 2025)', 'c3']];
  const cnt = (c, k) => TKV.count(EX[c].text, EX[c].t[k]), by = c => te.encode(EX[c].text).length;
  const prem = (c, k) => FL[c][IX[k]] / FL.eng_Latn[IX[k]];
  const MAXB = Math.max(...LS.map(([c]) => by(c))), LEN = 10.6, S = LEN / MAXB, X0 = -LEN / 2 - .4, DZ = .92, Z = i => (i - 3) * DZ;
  function draw(R, k, e, st) {
    const P = R.P, L = f => la(st, e, f), col = P[KS[k][2]], tk = KS[k][0]; R.grid(-6.6, 6.6, -3, 3, .5);
    LS.forEach(([c, name], i) => { const on = i === 0 || k >= 1, a = i === 0 ? 1 : L(kk => kk >= 1 ? 1 : 0); if (a <= .01) return; const z = Z(i);
      // the bytes: the footprint a byte-level model would read
      R.quad([[X0, .002, z - .3], [X0 + by(c) * S, .002, z - .3], [X0 + by(c) * S, .002, z + .3], [X0, .002, z + .3]], { fill: P.soft, fa: .9, ec: P.line, dash: [4, 3], a });
      // the tokens: one slat each
      const n = Math.round(tw(st, e, kk => cnt(c, KS[kk][0]))), cc = mix(P.paper, col, .85), cd = mix(P.paper, col, .55);
      for (let j = 0; j < n; j++) R.box([X0 + (j + .5) * S, 0, z], [S * .8, .32, .48], { fill: j % 2 ? cc : cd, a, shadow: false, lw: .35, ea: .5 });
      lab(R, [X0, .1, z], name, { al: 'right', dx: -10, fs: 12.5, b: 1, c: P.ink, grp: R.W < 520 ? undefined : 'lang', a });
      const pr = prem(c, tk);
      lab(R, [X0 + n * S, .2, z], n + (i ? ' · ' + pr.toFixed(pr >= 10 ? 1 : 2) + '×' : ' tokens'), { al: 'left', dx: 8, mono: true, fs: 12.5, b: pr >= 3, c: pr >= 3 ? P.bad : P.ink, a: a * L(kk => kk === k ? 1 : 0), grp: R.W < 520 ? undefined : 'end' }); });
    lab(R, [X0 + LEN / 2, .2, Z(0) - .7], R.W < 520 ? KS[k][1] : KS[k][1] + ': tokens for one sentence · premium over all of FLORES', { fs: 13, b: 1, c: col, dy: -10, a: L(kk => kk === k ? 1 : 0) });
    lab(R, [X0 + by('mya_Mymr') * S, 0, Z(6) + .35], 'dashed: the sentence’s UTF-8 bytes', { al: 'right', fs: 12, dy: 16, c: P.mute, a: L(kk => kk >= 1 ? 1 : 0), wide: 1 });
  }
  S3.stage({ id: 'stg-tax', list: 'sx-tax', fig: 'Fig. 5 · one sentence, seven languages, four tokenizers', cam: [.03, .95], bounds: [[-5.8, 0, -3.3], [5.4, .6, 3.2]], aspect: .52, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [30, 64, 16, 62] : [26, 130, 24, 90] });
  window.TKS_TAX = { LS, KS, cnt, prem, by };
})();
