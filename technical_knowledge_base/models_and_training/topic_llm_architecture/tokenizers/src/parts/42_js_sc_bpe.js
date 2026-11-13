// ---- Scene (Fig. 2, section 4): BPE trained from zero on the running story's own 874 bytes, with the page's trainer (TOKALG.bpeTrain,
// 23_js_tk_algos.js, the library's rule; check_algos.mjs compares it with the library, 36 of 36). The pair counts are the trainer's own
// candidate lists (hist[m].top), the story's length its running total; the last step sets the real 4,096-entry tokenizer (TKG) beside it. ----
(function () {
  if (!document.getElementById('stg-bpe') || !window.TKS || !window.TOKALG || !window.TKG) return;
  const { la, tw, lab, vis, layout, tiles } = TKS, { mix } = S3, A = TOKALG, N = TKN;
  const SENT = N.pipe.sentence, TR = A.bpeTrain([N.bpe.run.text], 32), CH = A.pretok.byteLevel(SENT);
  const MS = [0, 1, 3, 10, 13, 32, 32];                                    // merges learned by the end of each step
  const U = .32, G = .34, ZT = 2.1, ZR = 3.9, ZC = -1.4, show = s => vis(String(s).replace(/Ġ/g, ' '));
  const nb = CH.reduce((s, w) => s + w.length, 0), x0 = -(nb * U + (CH.length - 1) * G) / 2;
  const row = m => layout(CH.flatMap((w, c) => A.bpeApply(w, TR.merges, m).map(p => ({ s: p.replace(/Ġ/g, ' '), n: Array.from(p).length, c }))), U, G, x0);
  const real = (() => { const out = []; let c = 0; N.pipe.words.forEach((w, wi) => { const T = w.trace[w.trace.length - 1]; T.forEach(id => { const p = TKR.piece(id); out.push({ s: p.s, n: N.bpe.hex[id].length / 2, c: wi, id }); }); }); return layout(out, U, G, x0); })();
  const total = m => m ? TR.hist[m - 1].total : TR.start;
  const cand = k => MS[k] ? TR.hist[MS[k] - 1].top : [];
  const CX = i => -4.3 + i * 1.72, CMAX = 22, CHT = 2.5;
  function cols(R, k, a, rise) { const P = R.P, c = cand(k); c.forEach((x, i) => { const h = Math.max(.02, x[2] / CMAX * CHT * rise), win = i === 0;
      R.box([CX(i), 0, ZC], [.92, .04, .92], { a, shadow: false });
      R.box([CX(i), .04, ZC], [.7, h, .7], { a, fill: win ? mix(P.paper, P.c1, .7) : mix(P.paper, P.c1, .18), lw: .8, shadow: false });
      lab(R, [CX(i), .04 + h, ZC], String(x[2]), { mono: true, fs: 13, dy: -11, b: 1, c: win ? P.c1 : P.ink, a: a });
      lab(R, [CX(i), 0, ZC + .46], show(x[0]) + ' + ' + show(x[1]), { mono: true, fs: 12.5, dy: 11, b: win, c: win ? P.c1 : P.mute, a: a, wide: 1 }); }); }
  function draw(R, k, e, st) {
    const P = R.P, L = f => la(st, e, f), m = MS[k], m0 = MS[st.pk]; R.grid(-7, 7, -2.4, 4, .5);
    // the sentence under the merges learned so far; fresh tiles rise during the step
    const style = t => ({ fill: t.n > 1 ? mix(P.paper, P.c1, .4) : P.paper, h: t.n > 1 ? .42 : .3, b: t.n > 1 });
    tiles(R, row(m), st.pk !== k && m !== m0 ? row(m0) : null, ZT, e, { style, fs: 12.5, wide: 1, a: k === 6 ? .55 : 1 });
    lab(R, [x0 - .1, .15, ZT], 'this story: ' + m + ' merges', { al: 'right', dx: -8, fs: 12.5, c: P.c1, grp: 'side', a: L(kk => kk >= 1 ? 1 : 0) });
    lab(R, [x0 - .1, .15, ZT], 'bytes', { al: 'right', dx: -8, fs: 12.5, c: P.mute, grp: 'side', a: L(kk => kk === 0 ? 1 : 0) });
    // the pair counts the trainer weighed for its last merge of this step: the tallest is merged
    if (k >= 1 && k <= 5) { if (st.pk !== k && st.pk >= 1 && st.pk <= 5 && e < 1) cols(R, st.pk, 1 - e, 1); cols(R, k, Math.min(1, e * 1.6), e); }
    else if (st.pk >= 1 && st.pk <= 5 && e < 1) cols(R, st.pk, 1 - e, 1);
    lab(R, [CX(0) - .6, .3, ZC], 'pair counts', { al: 'right', dx: -8, fs: 12.5, c: P.mute, grp: 'side2', a: L(kk => kk >= 1 && kk <= 5 ? 1 : 0) });
    // the vocabulary grows by one entry per merge
    const vx = 6.8, nv = Math.round(tw(st, e, kk => MS[kk])), va = L(kk => kk < 6 ? 1 : 0);
    if (va > .01) { R.box([vx, 0, ZC], [.95, .05, .95], { shadow: false, a: va });
    for (let i = 0; i < nv; i++) R.box([vx, .05 + i * .055, ZC], [.8, .045, .8], { fill: i === nv - 1 && k >= 1 && k <= 5 ? mix(P.paper, P.c1, .8) : mix(P.paper, P.c1, .35), shadow: false, lw: .5, a: va });
    lab(R, [vx, .05 + nv * .055, ZC], 'vocabulary ' + (256 + nv).toLocaleString('en-US'), { mono: true, fs: 12.5, b: 1, dy: -12, c: P.c1, a: va }); }
    lab(R, [vx, 0, ZC + .5], 'story ' + total(m) + ' symbols', { mono: true, fs: 12.5, dy: 14, c: P.ink, a: L(kk => kk <= 5 ? 1 : 0), wide: 1 });
    if (k >= 1 && k <= 5) { const c = cand(k); if (c.length) R.flowArc([CX(0), .1 + c[0][2] / CMAX * CHT, ZC], [vx, .1 + nv * .055, ZC], .9, { c: P.c1, a: e, r: .05, n: 9, speed: 1.4 }); }
    // the real tokenizer, trained on all of TinyStories, on the same sentence
    if (k === 6) { tiles(R, real, null, ZR, 1, { a: e, style: t => ({ fill: t.id >= 1 && t.id <= 256 ? mix(P.paper, P.c2, .42) : mix(P.paper, P.c1, .4), h: t.id <= 256 ? .3 : .42, b: t.id > 256 }), fs: 12.5, wide: 1 });
      lab(R, [x0 - .1, .15, ZR], 'all of TinyStories: 3,839', { al: 'right', dx: -8, fs: 12.5, c: P.c2, grp: 'side', a: L(kk => kk === 6 ? 1 : 0) }); }
  }
  const main = { cam: [.1, .72], bounds: [[-6.6, 0, -1.9], [7.5, 2.6, 2.5]] }, last = { cam: [0, .8], bounds: [[-6.6, 0, 1.6], [6.6, .7, 4.3]] };
  S3.stage({ id: 'stg-bpe', list: 'sx-bpe', fig: 'Fig. 2 · BPE trained on the running story alone', cam: main.cam, bounds: main.bounds, aspect: .5, dur: 1500, hold: 4800, draw,
    view: k => k === 6 ? last : main, margin: w => w < 520 ? [16, 10, 18, 10] : [22, 16, 24, 140] });
})();
