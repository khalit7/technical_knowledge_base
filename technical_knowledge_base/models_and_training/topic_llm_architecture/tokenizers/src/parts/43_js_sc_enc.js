// ---- Scene (Fig. 3, section 6): encoding one word with the running example's real merge list (TKN.bpe.merges, 3,839 pairs in rank order):
// every adjacent pair is looked up, the lowest-ranked pair present is merged, repeat. The ranks are computed here from the merge list; the
// resulting ids equal the library's (TKN.pipe, recorded) for " climb", and "Roxy" has no ranked pair at all. ----
(function () {
  if (!document.getElementById('stg-enc') || !window.TKS) return;
  const { la, lab, vis, layout, tiles } = TKS, { mix } = S3, N = TKN, M = N.bpe.merges, NM = M.length, piece = TKR.piece;
  const rank = new Map(); M.forEach((p, r) => rank.set(p[0] * 8192 + p[1], r));
  const idOf = new Array(256); N.bpe.byteOf.forEach((b, i) => { if (b != null) idOf[b] = i; });
  // the states of one word under "merge the lowest-ranked pair present": [{ids, pairs:[rank or -1], best}]
  function trace(w) { let s = Array.from(new TextEncoder().encode(w), b => idOf[b]); const out = [];
    for (;;) { const pr = []; let best = -1; for (let i = 0; i < s.length - 1; i++) { const r = rank.get(s[i] * 8192 + s[i + 1]); pr.push(r == null ? -1 : r); if (r != null && (best < 0 || r < pr[best])) best = i; }
      out.push({ ids: s.slice(), pairs: pr, best }); if (best < 0) return out; s = s.slice(); s.splice(best, 2, 257 + pr[best]); } }
  const W1 = trace(' climb'), W2 = trace('Roxy'), U = 1.02, Z1 = 1.2, Z2 = 2.75;
  const toks = st => layout(st.ids.map(id => ({ s: piece(id).s, n: N.bpe.hex[id].length / 2, c: 0, id })), U, 0, -(st.ids.reduce((s, id) => s + N.bpe.hex[id].length / 2, 0) * U) / 2);
  const PZ0 = -.2, PD = 3.2, PX = 3.4, zr = r => PZ0 - PD * (r + .5) / NM;
  function junctions(R, t, st, z, a, hiA) { const P = R.P;
    for (let i = 0; i < t.length - 1; i++) { const x = t[i].x + t[i].w / 2, r = st.pairs[i], best = i === st.best;
      const y = i % 2 ? 1.5 : 1.05, cc = best ? P.c1 : r < 0 ? P.mute : P.ink;
      R.line([[x, .52, z], [x, y - .05, z]], { c: cc, w: best ? 2 : 1.2, a: a * .8 });
      lab(R, [x, y, z], r < 0 ? 'none' : 'merge ' + (r + 1).toLocaleString('en-US'), { mono: true, fs: 12.5, dy: -8, b: best, c: cc, a });
      if (best && hiA > 0) { R.glow([x, .5, z], .32, { c: P.c1, a: hiA }); R.flow([[0, .06, zr(r)], [x * .6, 1.2, (zr(r) + z) / 2], [x, y, z]], { c: P.c1, a: hiA, r: .05, n: 8, speed: 1.3 });
        R.line([[-PX, .07, zr(r)], [PX, .07, zr(r)]], { c: P.c1, w: 2.4, a: hiA }); } } }
  function draw(R, k, e, st) {
    const P = R.P, L = f => la(st, e, f); R.grid(-5.6, 5.6, -3.6, 3.6, .5);
    // the ranked merge list as a glass plate: rank 1 at the front, rank 3,839 at the back
    R.glass([-PX, .03, PZ0], [2 * PX, 0, 0], [0, 0, -PD], { c: P.c1, a: .7, nu: 8, nv: 12, th: .04 });
    lab(R, [0, .05, PZ0 - PD], 'merge list · 3,839 pairs, rank 1 at the front', { fs: 12.5, b: 1, dy: -12, c: P.c1 });
    const style = t => ({ fill: t.n > 1 ? mix(P.paper, P.c1, .4) : P.paper, h: t.n > 1 ? .5 : .4, b: t.n > 1, d: .8, fs: 14 });
    // " climb": state k (k = 0 the bytes, 1..5 after each merge); the tile just merged rises
    const j = Math.min(k, W1.length - 1), j0 = Math.min(st.pk, W1.length - 1), cur = toks(W1[j]);
    tiles(R, cur, j !== j0 && st.pk < k ? toks(W1[j0]) : null, Z1, e, { style, fs: 14, a: k === 6 ? .45 : 1 });
    junctions(R, cur, W1[j], Z1, L(kk => kk < 6 ? 1 : 0) * Math.max(0, 2 * e - 1 + (st.pk === k ? 1 : 0)), k < 5 ? e : 0);
    lab(R, [cur[0].x - cur[0].w / 2, .2, Z1], 'tokens ' + cur.length, { al: 'right', dx: -10, fs: 12.5, c: P.mute, grp: 'side', a: k === 6 ? .5 : 1 });
    // "Roxy": no adjacent pair is in the merge list, so it stays four byte tokens
    if (k === 6) { const t2 = toks(W2[0]); tiles(R, t2, null, Z2, 1, { a: e, style: () => ({ fill: mix(P.paper, P.c2, .42), h: .4, d: .8 }), fs: 14 });
      junctions(R, t2, W2[0], Z2, Math.max(0, 2 * e - 1), 0);
      lab(R, [t2[0].x - t2[0].w / 2, .2, Z2], 'tokens 4', { al: 'right', dx: -10, fs: 12.5, c: P.c2, grp: 'side', a: e }); }
  }
  const main = { cam: [.12, .6], bounds: [[-4.2, 0, -3.4], [4.2, 1.6, 1.8]] }, last = { cam: [0, .6], bounds: [[-4.2, 0, .5], [4.2, 1.6, 3.3]] };
  S3.stage({ id: 'stg-enc', list: 'sx-enc', fig: 'Fig. 3 · encoding one word: the lowest-ranked pair first', cam: main.cam, bounds: main.bounds, aspect: .52, dur: 1400, hold: 4400, draw,
    view: k => k === 6 ? last : main, margin: w => w < 520 ? [16, 10, 18, 10] : [22, 20, 24, 90] });
  window.TKS_ENC = { W1, W2 };
})();
