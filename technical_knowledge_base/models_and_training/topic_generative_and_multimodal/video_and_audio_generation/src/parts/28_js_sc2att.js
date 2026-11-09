// ---- Scene (section 2, Fig. 2): who one query token can see. A small latent clip (6 latent frames of 6 x 10 tokens, illustrative size) with a disc
// moving diagonally; full 3-D attention against factorised attention (spatial, then temporal), the two-hop relay factorised attention needs for
// diagonal motion, then the query-key pairs of Wan 2.1 1.3B's real default clip as columns to scale (VAU.calc: N^2 against f s^2 + s f^2). ----
(function () {
  if (!document.getElementById('stg-att') || !window.VAK) return;
  const U = VAU, { mix } = S3, { tw, la, lab, seg, arcPts, path, win, int, f1 } = VAK;
  const w = U.calc(U.mById.wan13);
  const NF = 6, GR = 6, GC = 10, CS = .2, PWz = GC * CS, PHy = GR * CS, Y0 = .1, XF = f => -2.9 + f * 1.16;
  const disc = f => ({ r: 1 + Math.round(f * .7), c: 1 + Math.round(f * 1.5) }), Q = { f: 2, ...disc(2) }, HOP = 4;
  const cy = r => Y0 + PHy - (r + .5) * CS, cz = c => -PWz / 2 + (c + .5) * CS, cell = (f, r, c) => [XF(f) - .02, cy(r), cz(c)];
  function sq(R, f, r, c, col, a, o) { o = o || {}; const x = XF(f) - .01, y = cy(r), z = cz(c), h = CS * .45;
    R.quad([[x, y - h, z - h], [x, y - h, z + h], [x, y + h, z + h], [x, y + h, z - h]], { fill: col, fa: o.fa == null ? .75 : o.fa, ec: o.ec || col, ea: o.ea == null ? .9 : o.ea, lw: o.lw || 1, dash: o.dash, a }); }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.8, 3.8, -1.8, 3, .4);
    const pa = tw(st, e, q => q === 5 ? .25 : 1);
    for (let f = 0; f < NF; f++) {
      R.glass([XF(f), Y0, PWz / 2], [0, 0, -PWz], [0, PHy, 0], { c: P.mute, a: pa * .55, nu: GC, nv: GR, th: .02 });
      const d = disc(f); R.ball([XF(f) - .06, cy(d.r), cz(d.c)], .07, { c: P.ink, a: pa });
      lab(R, [XF(f), Y0, PWz / 2], 'frame ' + f, { fs: 12, c: P.mute, dy: 14, a: pa * la(st, e, q => q < 5 ? 1 : 0) });
    }
    // which keys the query reads in each step: full = every token; spatial = its own frame; temporal = its position in every frame
    const lit = (q, f, r, c) => q === 1 ? 1 : q === 2 ? (f === Q.f ? 1 : 0) : q === 3 ? (r === Q.r && c === Q.c ? 1 : 0) : q === 4 ? (f === HOP || (r === Q.r && c === Q.c) ? 1 : 0) : 0;
    for (let f = 0; f < NF; f++) for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
      const a = tw(st, e, q => lit(q, f, r, c)) * pa; if (a < .02) continue;
      const d = disc(f), onDisc = d.r === r && d.c === c;
      sq(R, f, r, c, P.k, a * (k === 1 && !onDisc ? .6 : 1), { fa: k === 1 && !onDisc ? .45 : .85 });
    }
    // the query token
    sq(R, Q.f, Q.r, Q.c, P.q, pa, { fa: .95, lw: 2 }); R.glow(cell(Q.f, Q.r, Q.c), .22, { c: P.q, a: pa * .8 });
    lab(R, cell(Q.f, Q.r, Q.c), 'query', { fs: 12.5, b: 1, c: P.q, dy: -22, a: la(st, e, q => q === 0 ? 1 : 0) });
    const q0 = cell(Q.f, Q.r, Q.c);
    // flows: from the query to the keys it reads
    if (k === 1) for (let f = 0; f < NF; f++) { if (f === Q.f) continue; const d = disc(f); R.flowArc(q0, cell(f, d.r, d.c), .45, { c: P.q, r: .06, n: 7, speed: 1.4, a: e }); }
    if (k === 2) [[0, 0], [5, 9], [0, 9], [5, 0], [3, 6]].forEach(([r, c]) => R.flow(seg(q0, cell(Q.f, r, c), 10), { c: P.q, r: .05, n: 5, speed: .8, a: e }));
    if (k === 3) R.flow(seg(cell(0, Q.r, Q.c), cell(NF - 1, Q.r, Q.c), 30), { c: P.q, r: .06, n: 22, speed: 1.2, a: e });
    if (k === 4) { const d = disc(HOP), m1 = cell(HOP, Q.r, Q.c), m2 = cell(HOP, d.r, d.c);
      R.flow(path([m2, m1, q0]), { c: P.k, r: .07, n: 16, speed: 1.2, a: e });
      sq(R, HOP, d.r, d.c, P.ink, e, { fa: 0, ec: P.q, lw: 2.2, dash: [4, 3] });
      lab(R, m1, 'layer 2: temporal', { fs: 12.5, b: 1, c: P.q, al: 'left', dx: 12, dy: 18, a: la(st, e, q => q === 4 ? 1 : 0) });
      lab(R, m2, 'layer 1: spatial', { fs: 12.5, b: 1, c: P.q, al: 'left', dx: 12, dy: -16, a: la(st, e, q => q === 4 ? 1 : 0) }); }
    const keyLab = { 1: 'keys: all ' + int(w.N) + ' tokens', 2: 'keys: its frame, ' + int(w.s), 3: 'keys: its position, ' + w.lf + ' frames' };
    [1, 2, 3].forEach(q => lab(R, [XF(NF - 1), Y0 + PHy, PWz / 2], keyLab[q], { fs: 12.5, b: 1, mono: 1, c: P.k, al: 'left', dx: 10, dy: -12, a: la(st, e, z => z === q ? 1 : 0) }));
    // 6. the pairs of Wan's real clip, to scale
    const ca = la(st, e, q => q === 5 ? 1 : 0);
    if (ca > .01) { const H = 2.3, Z = 2.1;
      [[-1.1, w.full, 'full 3-D', P.k], [1.1, w.fact, 'factorised', P.c5]].forEach(([x, v, nm, col], i) => {
        const h = Math.max(.02, H * v / w.full * (k === 5 && st.pk < 5 ? win(e, .1 + .2 * i, .8) : 1));
        R.box([x, 0, Z], [.9, h, .9], { fill: mix(P.paper, col, .75), a: ca });
        lab(R, [x, h, Z], int(v / 1e6) + 'M pairs', { fs: 13, b: 1, mono: 1, c: col, dy: -14, a: la(st, e, q => q === 5 ? 1 : 0) });
        lab(R, [x, 0, Z + .45], nm, { fs: 12.5, c: P.ink, dy: 14, a: la(st, e, q => q === 5 ? 1 : 0) }); });
      lab(R, [0, H * .5, Z], f1(w.full / w.fact) + ' times', { fs: 13, b: 1, mono: 1, c: P.ink, a: la(st, e, q => q === 5 ? 1 : 0) * (k === 5 ? win(e, .7, 1) : 1) });
    }
  }
  const full = { cam: [-.62, .36], bounds: [[-3.6, 0, -1.2], [3.4, 1.4, 1.2]] };
  S3.stage({ id: 'stg-att', list: 'sx-att', fig: 'Fig. 2 · one query token, full against factorised', cam: full.cam, bounds: full.bounds, aspect: .58, dur: 1500, hold: 4800, draw, margin: VAK.margin,
    view: k => k === 4 ? { cam: [-.62, .36], bounds: [[-1.4, 0, -1.2], [2.6, 1.4, 1.2]] } : k === 5 ? { cam: [-.4, .45], bounds: [[-3.4, 0, -1.2], [3.2, 2.5, 2.7]] } : full });
})();
