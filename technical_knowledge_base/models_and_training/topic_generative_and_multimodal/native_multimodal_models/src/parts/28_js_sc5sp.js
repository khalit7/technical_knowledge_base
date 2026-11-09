// ---- Scene (section 9, Fig. 5): a voice assistant as a three-model cascade (speech recognition, a language model, text-to-speech, with
// text handed between them: OpenAI's description of its pre-GPT-4o Voice Mode) against one native model that runs once per 80 ms audio frame
// (Moshi's layout on the Mimi codec: per frame 1 text token, 8 codebook tokens of its own speech and the user's 8, 17 in all; codebooks 2 to 8
// one frame late). Latencies are each vendor's own figures, quoted in the step list with their sources; they are labels, not bars, because
// they were measured under different conditions and cannot be ranked. How the streams are laid out is Video and audio generation's. ----
(function () {
  if (!document.getElementById('stg-sp') || !window.NMK) return;
  const { mix } = S3, { lab, seg, win, chip } = NMK;
  const BX = [-3.6, 0, 3.6], BZ = -.4, F = 6, FX = f => -3.75 + f * 1.5, FZ = .9, TH = .085, TG = .025;
  function wave(R, x, z, col, a) { // an illustrative waveform: bars of fixed shape
    const H = [.2, .5, .8, .45, .9, .6, .3, .7, .4, .2];
    H.forEach((h, i) => R.box([x - .45 + i * .1, 0, z], [.06, h * .8, .2], { fill: mix(R.P.paper, col, .7), a, shadow: false, lw: .4 })); }
  function draw(R, k, e) {
    const P = R.P; R.grid(-6.5, 6.5, -2.4, 2.6, .5);
    // 1-2. the cascade: three models, text between them
    const ca = k <= 1 ? 1 : k === 2 ? 1 - win(e, 0, .5) : 0;
    if (ca > .01) {
      const NM = ['speech recognition', 'language model', 'text-to-speech'], CC = [P.mute, P.c5, P.mute];
      BX.forEach((x, i) => { R.box([x, 0, BZ], [1.7, .8, 1.3], { fill: mix(P.paper, CC[i], i === 1 ? .35 : .25), a: ca });
        lab(R, [x, .8, BZ], NM[i], { wide: 1, fs: 12.5, b: 1, c: i === 1 ? P.c5 : P.ink, dy: -12, a: ca }); });
      wave(R, -5.6, BZ, P.c1, ca); lab(R, [-5.6, 0, BZ + .3], 'your voice', { fs: 12.5, b: 1, c: P.c1, dy: 16, a: ca });
      wave(R, 5.6, BZ, P.c3, ca); lab(R, [5.6, 0, BZ + .3], 'its voice', { fs: 12.5, b: 1, c: P.c3, dy: 16, a: ca });
      R.flow(seg([-5.1, .4, BZ], [-4.45, .4, BZ], 6), { c: P.c1, a: ca });
      [[-2.75, -.85], [.85, 2.75]].forEach(([a0, a1]) => { R.flow(seg([a0, .3, BZ], [a1, .3, BZ], 10), { c: P.c5, a: ca, r: .06 });
        for (let j = 0; j < 3; j++) chip(R, [a0 + .45 + j * .5, 0, BZ + .95], null, P.c5, ca, { w: .36, d: .3, h: .12 }); });
      lab(R, [-1.8, .12, BZ + .95], 'text', { fs: 12, b: 1, c: P.c5, dy: 16, a: ca }); lab(R, [1.8, .12, BZ + .95], 'text', { fs: 12, b: 1, c: P.c5, dy: 16, a: ca });
      R.flow(seg([4.45, .4, BZ], [5.1, .4, BZ], 6), { c: P.c3, a: ca });
      if (k === 1) { const a = win(e, .2, .7);
        lab(R, [-3.6, 0, BZ + .65], 'tone, speakers, noise dropped', { wide: 1, fs: 12.5, b: 1, c: P.bad, dy: 40, a });
        lab(R, [3.6, 0, BZ + .65], 'no laughter or emotion of its own', { wide: 1, fs: 12.5, b: 1, c: P.bad, dy: 40, a });
        lab(R, [0, .8, BZ], 'average 2.8 s (GPT-3.5), 5.4 s (GPT-4)', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: -32, a }); }
    }
    // 3-5. one native model, called once per 80 ms frame; each frame column holds the user's 8 codebook tokens, its own text token and 8 codebook tokens
    const na = k < 2 ? 0 : k === 2 ? win(e, .4, 1) : 1;
    if (na > .01) {
      R.box([0, 0, -1.6], [9.4, .7, .9], { fill: mix(P.paper, P.acc, .2), a: na });
      if (k < 4) lab(R, [0, .7, -1.6], 'one model, one big step per frame', { fs: 12.5, b: 1, c: P.acc, dy: -12, a: na });
      const shown = k < 3 ? 1 : k === 3 ? Math.max(1, Math.ceil(F * win(e, 0, .95))) : F;
      for (let f = 0; f < F; f++) { const x = FX(f), on = f < shown, cur = k === 3 && f === shown - 1, a = na * (on ? 1 : .0);
        if (!on) { R.quad([[x - .3, .005, FZ - .3], [x + .3, .005, FZ - .3], [x + .3, .005, FZ + .3], [x - .3, .005, FZ + .3]], { a: na * .6, dash: [3, 3], ec: P.line }); continue; }
        for (let j = 0; j < 17; j++) { const y = j * (TH + TG) + (j >= 8 ? .06 : 0) + (j >= 16 ? .06 : 0), grp = j < 8 ? 'u' : j < 16 ? 'm' : 't', late = grp === 'm' && j < 15 && f === 0;
          const col = grp === 'u' ? P.c1 : grp === 'm' ? P.c3 : P.c5;
          R.box([x, y, FZ], [.6, TH, .5], { fill: late ? P.paper : mix(P.paper, col, grp === 'm' && j === 15 ? .85 : .55), a: a * (late ? .5 : 1), shadow: j === 0, lw: .5 }); }
        if (cur || k === 2) { R.flowArc([x, .9, FZ], [x, .5, -1.15], .4, { c: P.c1, r: .055, n: 5, a: na });
          R.flowArc([x + .15, .5, -1.15], [x + .15, 1.8, FZ], .5, { c: P.c3, r: .055, n: 6, a: na }); }
        lab(R, [x, 0, FZ + .3], (f * 80) + ' ms', { mono: 1, fs: 12, c: P.mute, dy: 14, a: na }); }
      const xl = FX(0) - .35;
      lab(R, [xl, .45, FZ], 'user: 8 codebooks (in)', { al: 'right', dx: -6, fs: 12, b: 1, c: P.c1, a: na, grp: 'sp' });
      lab(R, [xl, 1.35, FZ], 'its speech: 8 codebooks', { al: 'right', dx: -6, fs: 12, b: 1, c: P.c3, a: na, grp: 'sp' });
      lab(R, [xl, 1.9, FZ], 'its text: 1 token', { al: 'right', dx: -6, fs: 12, b: 1, c: P.c5, a: na, grp: 'sp' });
      if (k === 4) lab(R, [0, .7, -1.6], 'Moshi: 160 ms theoretical, 200 ms in practice', { mono: 1, fs: 12.5, b: 1, c: P.ink, dy: -12, a: win(e, .2, .7) });
    }
  }
  const full = { cam: [.0, .62], bounds: [[-6.3, 0, -2.1], [6.3, 2.0, 2.2]] };
  S3.stage({ id: 'stg-sp', list: 'sx-sp', fig: 'Fig. 5 · a cascade against one model per frame', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1800, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [34, 18, 22, 150],
    view: k => k >= 2 ? { cam: [.3, .5], bounds: [[-5.4, 0, -2.1], [4.8, 2.1, 1.9]] } : { cam: [.0, .55], bounds: [[-6.3, 0, -1.3], [6.3, 1.3, 1.4]] } });
})();
