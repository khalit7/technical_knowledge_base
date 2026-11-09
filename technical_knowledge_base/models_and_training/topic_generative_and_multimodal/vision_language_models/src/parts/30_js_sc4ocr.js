// ---- Scene (section 3, Fig. 4): one synthetic code (20-pixel font, 14-pixel capitals; a 256 x 128 crop of its 1,024 x 1,024 page at 1:1)
// at the scale each processor setting applies to the page: Qwen3.5 at 1,024, 256 and 64 tokens (page to 1,024, 512, 256: the token grid is
// sqrt(tokens) x 32 pixels), SmolVLM at 64 tokens (one 512 view) and at its default (enlarged to 2,048, 16 tiles). The crop is resampled in
// the browser at that scale (the scale is exact, the interpolation illustrative); the grid is the encoder's 16-pixel patches after the resize.
// Answers and exact-read counts are the recorded ones (VM_DATA.runs.*.ocr, 3 codes at this size). ----
(function () {
  if (!document.getElementById('stg-ocr') || !window.VMK) return;
  const K = VMK, { tw, la, lab, img, int, mix, lerp } = K, D = K.D;
  const crop = (D.syn && D.syn.ocrCrops || []).find(c => c.font_px === 20); if (!crop) return;
  const codes = D.syn.ocr.filter(x => x.font === 20), capH = codes[0].h, code = codes[0].code;
  const rows = (w, b) => ((D.runs[w] && D.runs[w].ocr && D.runs[w].ocr.rows) || []).filter(r => r.font_px === 20 && r.budget === b);
  // [model, budget, scale applied to the page, token side in resized pixels, label]
  const SET = [['qwen', '1024', 1, 32, 'Qwen3.5 · 1,024 tokens'], ['qwen', '256', .5, 32, 'Qwen3.5 · 256 tokens'], ['qwen', '64', .25, 32, 'Qwen3.5 · 64 tokens'],
    ['smol', '64', .5, 64, 'SmolVLM · 64 tokens'], ['smol', '1088', 2, 64, 'SmolVLM · 1,088 tokens']].map(([w, b, s, t, n]) => {
      const r = rows(w, b), mine = r.find(x => x.code === code); return { w, b, s, t, n, ex: r.filter(x => x.exact).length, of: r.length, ans: mine ? mine.answer : '', ok: !!(mine && mine.exact) }; });
  const PW = 3.6, PH = 1.8, PX = -5.1, PY = .25, CX0 = .2, CG = .95, CR = [64, 32, 128, 64];
  const f1 = v => v % 1 ? v.toFixed(1) : String(v);
  function draw(R, k, e, st) {
    const P = R.P, S = SET[k], S0 = SET[st.pk], cS = P.acc, cQ = P.c4, col = s => s.w === 'smol' ? cS : cQ; R.grid(-5.8, 5, -1.8, 2.4, .5);
    // the code's 128 x 64 pixels at this setting's scale: the old view fades out while the new one comes in
    const show = (s, a) => { const src = K.resampled(crop.uri, s.s); if (!src) return;
      const tk = Math.min(1, s.t / s.s / CR[2]), th = Math.min(1, s.t / s.s / CR[3]);
      img(R, src, [PX, PY, 0], [PW, 0, 0], [0, PH, 0], { a, smooth: false, sub: 2, crop: CR.map(v => v * s.s), grid: [Math.max(1, Math.round(CR[2] * s.s / 16)), Math.max(1, Math.round(CR[3] * s.s / 16)), col(s), .6], gw: .8, box: [0, 0, tk, th, col(s), 2.4] }); };
    if (e < 1 && st.pk !== k) show(S0, 1 - e); show(S, e < 1 && st.pk !== k ? e : 1);
    const l = e < 1 && st.pk !== k ? Math.max(0, 2 * e - 1) : 1;
    lab(R, [PX + PW / 2, PY + PH, 0], S.n + ': page × ' + S.s + ', capitals ' + f1(capH * S.s) + ' px', { fs: 13, b: 1, c: col(S), dy: -14, a: l });
    lab(R, [PX + PW / 2, PY, 0], 'answer: ' + S.ans + (S.ok ? '  (exact)' : '  (code ' + code + ')'), { mono: 1, fs: 13, b: 1, c: S.ok ? P.good : P.bad, dy: 16, a: l });
    // capitals' height after the resize, one column per setting (dashed: still to come), with the exact reads of the 3 codes at this size
    const HS = 2 / 28;
    SET.forEach((s, i) => { const x = CX0 + i * CG, h = capH * s.s * HS, done = i <= k, a = i === k ? 1 : i < k ? .5 : .25, grow = i === k && st.pk < k ? e : 1;
      if (done) R.box([x, 0, .4], [.5, Math.max(.02, h * grow), .5], { fill: mix(P.paper, col(s), .7), a });
      else R.quad([[x - .25, 0, .15], [x + .25, 0, .15], [x + .25, 0, .65], [x - .25, 0, .65]], { fill: P.soft, a: .7, dash: [4, 3] });
      if (done) { lab(R, [x, h * grow, .4], f1(capH * s.s) + ' px', { mono: 1, fs: 12.5, b: i === k, c: col(s), dy: -12, a: i === k ? 1 : .7, wide: i !== k });
        lab(R, [x, 0, .65], s.ex + '/' + s.of, { mono: 1, fs: 12.5, b: i === k, c: s.ex ? P.good : P.bad, dy: 14, a: i === k ? 1 : .7, wide: i !== k }); } });
    R.line([[CX0 - .4, 16 * HS, .4], [CX0 + 4 * CG + .4, 16 * HS, .4]], { c: P.mute, w: 1.2, dash: [5, 4], a: .8 });
    lab(R, [CX0 + 4 * CG + .4, 16 * HS, .4], 'one patch', { fs: 12, c: P.mute, al: 'left', dx: 6, wide: 1 });
    lab(R, [CX0 - .4, .3, .4], 'capitals', { fs: 12, c: P.mute, al: 'right', dx: -4, wide: 1 });
    lab(R, [CX0 - .4, 0, .65], 'read', { fs: 12, c: P.mute, al: 'right', dx: -4, dy: 14, wide: 1 });
  }
  const st = S3.stage({ id: 'stg-ocr', list: 'sx-ocr', fig: 'Fig. 4 · a 20-pixel code at five processor scales', cam: [.15, .38], bounds: [[-5.3, 0, -.1], [5, 2.15, .8]], aspect: .5, dur: 1300, hold: 5200, draw, margin: K.margin });
  K.onPic(() => st && st.draw());
})();
