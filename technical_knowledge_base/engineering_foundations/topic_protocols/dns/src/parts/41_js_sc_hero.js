// ---- Scene: Fig. 1, the hero (stg-hero): one lookup of api.llm.test as parties. Your process (the stub), the recursive resolver with its cache
// stacked on top of it, and the three authoritative servers as a staircase down the tree (root, test., llm.test.). Renderer v2.
// Values from window.DNSD (the lab's recordings of 5 October 2026): upstream queries, cold and warm times, the warm TTL; the lost-packet
// and ndots numbers from the pod recordings (PODX). The referral TTLs (172,800 s) are the lab zone files' (lab/gen_zones.py). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.DNK || !window.DNSD || !window.PODX) return;
  const { mix, cl } = S3, { up, party, entry, msg, refuse, exchange } = DNK;
  const W = DNSD.walk.runs[0], nUp = W.up.length, ANS = 60;
  const lost = PODX.by.glibc_drop_aaaa.calls[0].ms, nd = PODX.perCall(PODX.by.glibc_ndots5)[0].q;
  const POD = [-4.0, 0, 1.2], RES = [-1.5, 0, .3], GH = [-3.9, 0, -1.3], SV = [[.9, 0, -1.7, 1.5, 'root  .'], [2.45, 0, -.5, 1.05, 'test.'], [4.0, 0, .7, .6, 'llm.test.']];
  const RS = [1.5, .7, 1.2], ry = RS[1];
  const pa = [POD[0] + .45, .7, POD[2] - .2], ra = [RES[0] - .5, .75, RES[2] + .2], rt = [RES[0] + .55, .8, RES[2] - .3];
  const sTop = i => [SV[i][0] - .2, SV[i][3] + .05, SV[i][2] + .2];
  const fmt = n => n.toLocaleString('en-GB');
  function draw(R, k, e) {
    const P = R.P, Q = P.c2, A = P.c3, BAD = P.bad, tree = k === 1 ? 1 : k === 4 ? .5 : k === 3 ? .25 : .35;
    R.grid(-5.0, 5.0, -2.8, 2.6, .5);
    party(R, POD, [1.3, .65, 1.0], P.c5, 'your process', { sub: 'getaddrinfo(): the stub, no cache', a: k === 1 ? .4 : 1 });
    party(R, RES, RS, P.acc, 'recursive resolver', { a: 1, dy: -10 });
    SV.forEach((s, i) => party(R, [s[0], 0, s[2]], [1.2, s[3], 1.0], P.c4, s[4], { a: tree, sub: i === 2 ? 'authoritative for the zone' : null, subWide: 1 }));
    // the cache: entries lying on the resolver, length = share of the TTL left
    const cA = k === 2 ? e : k >= 2 ? 1 : 0, ttlA = k >= 3 ? (k === 3 ? ANS - (ANS - W.warm_ttl) * e : W.warm_ttl) : ANS;
    if (k >= 2) {
      entry(R, [RES[0], 0, RES[2]], ry, 1.3, 1, P.c4, 'test. NS · 172,800 s', { a: cA * .8, grp: 'cache', wide: 1 });
      entry(R, [RES[0], 0, RES[2]], ry + .15, 1.3, 1, P.c4, 'llm.test. NS · 172,800 s', { a: cA * .8, grp: 'cache', wide: 1 });
      entry(R, [RES[0], 0, RES[2]], ry + .3, 1.3, ttlA / ANS, A, 'api.llm.test A · ' + Math.round(ttlA) + ' s left', { a: cA, b: 1, grp: 'cache', lc: A });
    } else R.label(up(RES, ry), 'cache: empty', { fs: 12, c: P.mute, dy: 14, mono: true });
    if (k === 0) {
      R.flowArc(pa, ra, .55, { c: Q, r: .07, n: 9, speed: 1.4 });
      msg(R, (p => [p[0], Math.max(0, p[1] - .25), p[2]])(R.arcPt(pa, ra, .55, e)), Q, 1, 'A? api.llm.test · RD', { wide: 1 });
      R.label(R.arcPt(pa, ra, .55, .5), 'one recursive question', { fs: 12.5, b: 1, c: Q, dy: -40 });
    }
    if (k === 1) {
      const labs = ['referral to test.', 'referral to llm.test.', 'answer, AA set'];
      SV.forEach((s, i) => { const t = cl(e * 3 - i, 0, 1), b = sTop(i);
        if (t > 0 && t < 1) exchange(R, rt, b, .5 + .2 * i, t, Q, i === 2 ? A : P.c4, null, null);
        if (t >= 1) { R.arc(rt, b, .5 + .2 * i, { c: i === 2 ? A : P.c4, w: 1.6, a: .55 }); R.label(up([s[0], 0, s[2]], s[3]), labs[i], { fs: 12, b: 1, c: i === 2 ? A : P.c4, dy: -26 }); } });
      if (e >= 1) R.flowArc(sTop(2), rt, .9, { c: A, r: .065, n: 8, speed: 1.3, a: .9 });
      R.label(up(RES, ry), nUp + ' upstream queries (with priming)', { fs: 12.5, b: 1, c: Q, dy: 34 });
    }
    if (k === 2) {
      R.flowArc(ra, pa, .55, { c: A, r: .07, n: 9, speed: 1.4 });
      msg(R, (p => [p[0], Math.max(0, p[1] - .25), p[2]])(R.arcPt(ra, pa, .55, e)), A, 1, 'A 10.53.0.80 · TTL 60', { wide: 1 });
      R.label(up(POD, .65), W.cold_ms + ' ms, cold', { fs: 13, b: 1, c: A, dy: 26, a: e });
    }
    if (k === 3) {
      exchange(R, pa, ra, .55, Math.min(1, e * 1.4), Q, A, 'A? api.llm.test', 'from the cache', { wide: 1 });
      R.glow(up(RES, ry + .5), .7, { c: A, a: .6 * e });
      R.label(up(POD, .65), W.warm_ms + ' ms, warm', { fs: 13, b: 1, c: A, dy: 26, a: e });
      SV.forEach((s, i) => R.label(up([s[0], 0, s[2]], s[3]), i === 1 ? W.warm_up + ' queries' : '', { fs: 12.5, b: 1, c: P.mute, dy: -12, a: e }));
    }
    if (k === 4) {
      const f = e;
      // 1. a cached answer you did not expect
      R.glow(up(RES, ry + .35), .8, { c: BAD, a: .5 * f });
      R.label(up(RES, ry + .45), 'stale: cached until its TTL runs out', { fs: 12.5, b: 1, c: BAD, dy: -48, a: f });
      // 2. one name, many queries
      for (let j = 0; j < nd; j++) { const z = POD[2] - .45 + j * .13; R.line([[POD[0] + .66, .12 + j * .06, z], [POD[0] + 1.05, .12 + j * .06, z]], { c: BAD, w: 1.6, a: f * .8 }); }
      R.label([POD[0], 0, POD[2] + .5], '1 name → ' + nd + ' queries (ndots:5)', { fs: 12.5, b: 1, c: BAD, dy: 22, a: f });
      // 3. one lost packet
      const mid = R.arcPt(pa, ra, .55, .5); refuse(R, mid, f);
      R.label(mid, '1 lost packet = ' + fmt(lost) + ' ms', { fs: 12.5, b: 1, c: BAD, dy: -24, a: f });
      // 4. the wrong resolver asked
      R.box(GH, [1.2, .55, .9], { fill: mix(P.paper, BAD, .12), a: .55 * f, fa: .6 });
      R.arc([POD[0], .65, POD[2] - .4], [GH[0] + .2, .55, GH[2] + .3], .4, { c: BAD, w: 1.6, dash: [5, 4], a: f });
      R.label(up(GH, .55), 'the wrong resolver asked', { fs: 12.5, b: 1, c: BAD, dy: -12, a: f });
    }
  }
  const full = { cam: [.18, .7], bounds: [[-4.7, 0, -2.2], [4.6, 1.6, 1.8]] };
  window.DNS_HERO = S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one lookup, a cache at every hop', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1800, hold: 4600, draw,
    margin: w => w < 520 ? [16, 8, 16, 8] : [22, 18, 20, 18],
    view: k => k === 0 || k === 2 || k === 3 ? { cam: [.25, .7], bounds: [[-4.8, 0, -.8], [-.2, 1.3, 1.9]] } : k === 4 ? { cam: [.32, .7], bounds: [[-4.9, 0, -2.0], [.4, 1.4, 2.0]] } : null });
})();
