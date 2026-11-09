// ---- Scene (section 8, Fig. 6): what a fixed state is bad at, measured. Pythia-160M (attention) against Mamba-130M (no attention), both trained on
// the Pile with the same tokenizer; copy and phone-book accuracies from BAD.copy (src/recall/pretrained_copy.py, CPU fp32). Memory to scale:
// Pythia's KV cache holds 2 x 12 layers x 768 = 18,432 numbers per token; Mamba's state is 24 layers x 1,536 channels x 16 = 589,824 numbers,
// one slab here, so the cache adds one slab every 32 tokens. The slabs drawn are the list (the first copy), or the phone-book prompt. ----
(function () {
  if (!document.getElementById('stg-recall') || !window.BAS || !window.BAD || !BAD.copy) return;
  const { mix } = S3, { tw, la, lab, brick, int, win } = BAS;
  const PER = 2 * 12 * 768, STATE = 24 * 1536 * 16, EQ = STATE / PER;
  const py = BAD.copy.models.find(m => /pythia/.test(m.name)), mb = BAD.copy.models.find(m => /mamba/.test(m.name));
  const cp = (m, w) => m.copy.find(z => z.words === w).acc, pb = (m, n) => m.phonebook.find(z => z.entries === n);
  const STEPS = [{ tok: 32, a: cp(py, 32), b: cp(mb, 32), what: '32-word list' }, { tok: 256, a: cp(py, 256), b: cp(mb, 256), what: '256-word list' },
    { tok: 1000, a: cp(py, 1000), b: cp(mb, 1000), what: '1,000-word list' }, { tok: pb(py, 40).prompt_tokens, a: pb(py, 40).acc, b: pb(mb, 40).acc, what: '40-entry phone book' }];
  window.BA_RECALL = { PER, STATE, EQ, steps: STEPS };
  const SW = 1.6, SH = .1, XP = -1.3, XM = 1.2, XA = 2.8, XB = 3.55, AH = 2.6;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 4.6, -1.8, 2.2, .5);
    const s0 = STEPS[st.pk] || STEPS[0], s1 = STEPS[k], t = st.pk === st.k ? 1 : e;
    // tokens held: rising from 0 to 32 at the first step, then from the last step's count to this one's
    const n = k === 0 && st.pk === 0 ? EQ * win(e, .05, .8) : s0.tok + (s1.tok - s0.tok) * win(t, .05, .8);
    const full = Math.floor(n / EQ), rest = n - full * EQ;
    // Pythia: one slab per 32 tokens; the slab being filled grows tile by tile (4 x 8 tiles, one token each)
    for (let l = 0; l < full; l++) brick(R, [XP, l * SH, 0], [SW, SH * .94, SW], 1, { shadow: l === 0 });
    for (let i = 0; i < Math.floor(rest); i++) brick(R, [XP - SW / 2 + SW / 8 * (i % 8 + .5), full * SH, SW / 2 - SW / 4 * (Math.floor(i / 8) + .5)], [SW / 8 * .92, SH * .94, SW / 4 * .92], 1, { shadow: full === 0 });
    // Mamba: the state, one slab, the same at every length
    R.box([XM, 0, 0], [SW, SH, SW], { fill: mix(P.paper, P.c1, .55), a: 1 });
    R.glass([XM - SW / 2, SH + .005, -SW / 2], [SW, 0, 0], [0, 0, SW], { c: P.c1, a: .9, nu: 8, nv: 4, th: .01 });
    // the accuracy each model reached at this length
    const acc = (f) => (s0 === s1 ? f(s1) : f(s0) + (f(s1) - f(s0)) * e);
    const ha = acc(s => s.a) * AH, hb = acc(s => s.b) * AH;
    R.box([XA, 0, 0], [.5, Math.max(.02, ha), .5], { fill: mix(P.paper, P.v, .62) }); R.box([XB, 0, 0], [.5, Math.max(.02, hb), .5], { fill: mix(P.paper, P.c1, .6) });
    // the labels give the measured values only: they hand over at mid-transition and never show a value in between
    const cur = st.pk !== st.k && e < .5 ? s0 : s1;
    lab(R, [XA, ha, 0], Math.round(100 * cur.a) + '%', { fs: 13, b: 1, c: P.v, dy: -12, a: st.pk !== st.k ? Math.abs(1 - 2 * e) : 1 });
    lab(R, [XB, hb, 0], Math.round(100 * cur.b) + '%', { fs: 13, b: 1, c: P.c1, dy: -12, a: st.pk !== st.k ? Math.abs(1 - 2 * e) : 1 });
    lab(R, [XA, 0, .3], 'Pythia', { fs: 12, b: 1, c: P.v, dy: 14 }); lab(R, [XB, 0, .3], 'Mamba', { fs: 12, b: 1, c: P.c1, dy: 14 });
    // flows: the list streaming into each memory while it fills
    const fl = st.pk === st.k && k !== 0 ? 0 : 1 - win(t, .8, 1);
    if (fl > .01) { R.flowArc([0, .1, 1.6], [XP, full * SH + .1, .3], .6, { c: P.q, a: fl, r: .05, n: 7, speed: 1.4 }); R.flowArc([0, .1, 1.6], [XM, SH + .05, .3], .6, { c: P.q, a: fl, r: .05, n: 7, speed: 1.4 }); }
    const L = j => la(st, e, q => q === j ? 1 : 0), Lall = Math.max(L(0), L(1), L(2), L(3));
    lab(R, [XP, full * SH + (rest ? SH : 0), -SW / 2], 'Pythia-160M KV cache: ' + int(Math.round(n)) + ' tokens', { fs: 12.5, b: 1, c: P.v, dy: -14 });
    lab(R, [XM, SH, -SW / 2], 'Mamba-130M state', { fs: 12.5, b: 1, c: P.c1, dy: -14 });
    lab(R, [XP, 0, SW / 2], int(PER) + ' numbers per token', { fs: 12, c: P.mute, dy: 16, wide: 1, a: L(0) });
    lab(R, [XM, 0, SW / 2], int(STATE) + ' numbers, fixed', { fs: 12, c: P.mute, dy: 16, wide: 1, a: L(0) });
    lab(R, [(XA + XB) / 2, AH, 0], s1.what, { fs: 12.5, b: 1, c: P.ink, dy: -34, a: Lall });
    lab(R, [XP, 0, SW / 2], k ? (n / EQ).toFixed(n / EQ >= 10 ? 0 : 1) + '× the state' : null, { fs: 12.5, b: 1, c: P.ink, dy: 16, a: k ? 1 : 0 });
  }
  const full = { cam: [.42, .5], bounds: [[-2.4, 0, -1.2], [4.0, 3.4, 1.4]] };
  S3.stage({ id: 'stg-recall', list: 'sx-recall', fig: 'Fig. 6 · Pythia-160M against Mamba-130M, measured', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1600, hold: 5000, draw, margin: BAS.margin,
    view: k => k === 0 ? { cam: [.42, .55], bounds: [[-2.4, 0, -1.2], [4.0, 2.7, 1.4]] } : full });
})();
