// ---- Scene (top, Fig. 1): the three factors. A row of 24 past tokens, each a column whose height is the numbers its entry holds in one layer,
// to one scale on every step (from the real configs in AVL: Llama 2 7B, Llama 3.1 8B, DeepSeek-V3, Mistral 7B v0.1, DeepSeek-V3.2, V4-Pro);
// the new token's query on the right reads the lit columns (flows). The window, top-k picks, block positions and the sink step are illustrative. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.AVS || !window.AVL) return;
  const { mix } = S3, { tw, la, lab, int } = AVS, E = AVS.entry;
  const N = 24, X = i => -6 + i * .5, QX = 6.5, QY = .7, W = .36, D = .42, HM = 2.4;
  const mha = E('llama2'), gqa = E('llama31'), mla = E('dsv3'), mis = E('mistral'), dsa = E('dsv32'), v4 = E('dsv4', 0);
  const S = HM / mha.tot, WIN = 6, TOP = [1, 5, 9, 14, 20], BLK = 4, PICK = [1, 3];
  // per step: what each token keeps (numbers), what is read, and the parts' colours
  const STEP = [
    { nm: 'MHA · Llama 2 7B', n: mha.tot, kind: 'kv' }, { nm: 'GQA-8 · Llama 3.1 8B', n: gqa.tot, kind: 'kv' },
    { nm: 'MLA · DeepSeek-V3', n: mla.tot, kind: 'mla' }, { nm: 'window · Mistral 7B v0.1', n: mis.tot, kind: 'kv', win: 1 },
    { nm: 'DSA · DeepSeek-V3.2', n: dsa.tot + dsa.idx, kind: 'dsa' }, { nm: 'CSA · DeepSeek-V4-Pro', n: v4.ent, kind: 'csa' },
    { nm: 'GQA-8 with a sink', n: gqa.tot, kind: 'kv', sink: 1 }];
  const kept = (k, i) => { const s = STEP[k]; return s.win ? i >= N - WIN : true; };
  const read = (k, i) => { const s = STEP[k]; if (s.win) return i >= N - WIN; if (s.kind === 'dsa') return TOP.includes(i); if (s.kind === 'csa') return i >= N - WIN || PICK.includes(Math.floor(i / BLK)); return true; };
  function column(R, i, k, a, P) {
    const s = STEP[k], x = X(i), hot = read(k, i), al = a * (hot ? 1 : .28);
    if (!kept(k, i)) { R.quad([[x - W / 2, .002, -D / 2], [x + W / 2, .002, -D / 2], [x + W / 2, .002, D / 2], [x - W / 2, .002, D / 2]], { fill: P.soft, a: a * .8, ea: .6, lw: 1, dash: [3, 3] }); return; }
    if (s.kind === 'kv') { const h = s.n * S / 2; R.box([x, 0, 0], [W, h, D], { fill: mix(P.paper, P.k, .75), a: al }); R.box([x, h, 0], [W, h, D], { fill: mix(P.paper, P.v, .7), a: al, shadow: false }); }
    if (s.kind === 'mla' || s.kind === 'dsa') { const g = s.kind === 'dsa' ? dsa : mla, h1 = g.lat * S, h2 = g.rope * S;
      R.box([x, 0, 0], [W, h1, D], { fill: mix(P.paper, P.good, .7), a: al }); R.box([x, h1, 0], [W, h2, D], { fill: mix(P.paper, P.k, .8), a: al, shadow: false });
      if (s.kind === 'dsa') R.box([x, h1 + h2, 0], [W, g.idx * S, D], { fill: mix(P.paper, P.c5, .8), a: a, shadow: false }); }
    // V4: every 4 tokens merged into one 512-number entry (one box over the 4 slots); the last 6 stay raw in the window
    if (s.kind === 'csa') { const h = v4.ent * S;
      if (i >= N - WIN) R.box([x, 0, 0], [W, h, D], { fill: mix(P.paper, P.good, .7), a: al });
      else if (i % BLK === 0) R.box([(X(i) + X(i + BLK - 1)) / 2, 0, 0], [BLK * .5 - .12, h, D], { fill: mix(P.paper, P.good, .45), a: al }); }
  }
  function draw(R, k, e, st) {
    const P = R.P, s = STEP[k]; R.grid(-6.8, 7.2, -1.4, 1.4, .5);
    // MHA's height as a wireframe on every token from step 2 on: the scale every other entry is drawn against
    const ga = tw(st, e, q => q >= 1 ? .5 : 0);
    if (ga > .01) for (let i = 0; i < N; i++) R.box([X(i), 0, 0], [W, HM, D], { fa: 0, ea: .3, a: ga, shadow: false, lw: .7 });
    // the old picture fades out while the new one grows in
    if (e < 1 && st.pk !== k && STEP[st.pk]) for (let i = 0; i < N; i++) column(R, i, st.pk, 1 - e, P);
    for (let i = 0; i < N; i++) column(R, i, k, e < 1 && st.pk !== k ? e : 1, P);
    // the new token: its query reads the lit entries (flows); in the sink step most of the weight goes to token 0
    R.glow([QX, QY, 0], .55, { c: P.q, a: .5 }); R.ball([QX, QY, 0], .2, { c: P.q });
    lab(R, [QX, QY + .25, 0], 'new token', { fs: 12.5, b: 1, c: P.q, dy: -14 });
    const fa = Math.min(1, e * 1.5), top = i => (s.kind === 'kv' ? s.n * S : s.kind === 'csa' ? v4.ent * S : s.n * S) + .06;
    for (let i = 0; i < N; i++) { if (!read(k, i) || (s.kind === 'csa' && i < N - WIN && i % BLK !== 1)) continue;
      const w = s.sink ? (i === 0 ? 1 : .18) : 1, x = s.kind === 'csa' && i < N - WIN ? (X(Math.floor(i / BLK) * BLK) + X(Math.floor(i / BLK) * BLK + BLK - 1)) / 2 : X(i);
      R.flowArc([x, top(i), 0], [QX - .15, QY, 0], .5 + .03 * (N - i), { c: P.acc, a: fa * (s.sink ? .35 + .65 * w : .75), r: s.sink ? .04 + .07 * w : .05, n: s.sink ? Math.round(3 + 12 * w) : 5, speed: 1.4 }); }
    if (s.sink) { const sp = [X(0) - .7, .5, 0]; R.box([sp[0], 0, 0], [.3, .5, .3], { fill: mix(P.paper, P.bad, .8), a: e });
      R.flowArc([sp[0], .55, 0], [QX - .15, QY, 0], 1.3, { c: P.bad, a: e * .8, r: .07, n: 14, speed: 1.4 });
      lab(R, [sp[0], .5, 0], 'learned sink', { fs: 12, b: 1, c: P.bad, dy: -24, a: la(st, e, q => STEP[q].sink ? 1 : 0) }); }
    // what one token holds in one layer, and how many of the 24 are read
    // the step's name and counts (the outgoing pair is gone by mid-transition, the incoming one follows)
    [...new Set([st.pk, k])].forEach(kk => { const t = STEP[kk]; if (!t) return; const al = la(st, e, q => q === kk ? 1 : 0); if (al <= .01) return;
      const nRead = t.kind === 'csa' ? PICK.length + WIN : [...Array(N).keys()].filter(i => read(kk, i)).length, nKept = t.kind === 'csa' ? Math.floor((N - WIN) / BLK) + WIN : [...Array(N).keys()].filter(i => kept(kk, i)).length;
      lab(R, [X(0), 3.35, 0], t.nm, { fs: 13.5, b: 1, c: P.ink, al: 'left', dx: -10, a: al });
      lab(R, [X(0), 3.35, 0], (t.kind === 'csa' ? int(v4.ent) + ' numbers per 4 tokens' : int(t.n) + ' numbers per token per layer') + ' · ' + nKept + ' of 24 kept · ' + nRead + ' read', { fs: 12.5, c: P.mute, al: 'left', dx: -10, dy: 18, a: al }); });
    if (k >= 1) lab(R, [X(N - 1) + .3, HM, 0], 'MHA\'s ' + int(mha.tot), { fs: 12, c: P.mute, al: 'left', dx: 6, a: ga, wide: 1 });
  }
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · what each past token leaves behind, and what is read', cam: [.42, .42], bounds: [[-6.5, 0, -.8], [6.9, 3.4, .8]], aspect: .5, dur: 1400, hold: 4600, draw, margin: AVS.margin });
})();
