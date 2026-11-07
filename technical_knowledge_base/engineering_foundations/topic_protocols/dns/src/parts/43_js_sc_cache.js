// ---- Scene: Fig. 3, what a cache does when the source changes or dies (stg-cache), replayed from window.DNSD.cache (the lab, 5 October 2026).
// A client (dig, every two seconds or so) asks the lab resolver and, directly, the authoritative server for llm.test.; the resolver's cache entry
// is a slab on top of it whose length is the TTL it reported (out of 30 s). Three modes: an address change, a name created after a "no" was
// cached, and the authoritative server stopped (two resolvers, one with serve-expired). In the long stretches (step 3 of the first two modes,
// step 3 of the third) the step plays the recorded answers in order. ----
(function () {
  if (!document.getElementById('stg-cache') || !window.S3 || !window.DNK || !window.DNSD) return;
  const { lerp, cl, mix } = S3, { up, party, entry, msg, refuse } = DNK, C = DNSD.cache;
  const RESIP = '10.53.0.53', AUIP = '10.53.0.12', SSIP = '10.53.0.54';
  const CL = [-3.7, 0, .6], RES = [-.5, 0, .1], R1 = [-.5, 0, -1.0], R2 = [-.5, 0, 1.25], AU = [3.1, 0, -.3];
  const ca = [CL[0] + .5, .7, CL[2] - .1];
  const ev = rows => rows.find(r => r.event), rs = (rows, ip) => rows.filter(r => r.s === ip);
  const last = (rows, t) => { let x = null; rows.forEach(r => { if (r.t <= t + 1e-6) x = r; }); return x; };
  const T = { change: C.change, neg: C.neg };
  // the times that bound each step, from the recording
  function marks(m) { const rows = T[m], R = rs(rows, RESIP), e0 = ev(rows), flip = R.find(r => r.st === 'NOERROR' && (m === 'neg' || r.v !== R[0].v));
    return { R, A: rs(rows, AUIP), e0, flip, before: last(R, e0.t), stretch: [e0.t + .01, flip.t - .01] }; }
  const MK = { change: marks('change'), neg: marks('neg') };
  const SS = { def: rs(C.stale, RESIP), exp: rs(C.stale, SSIP), stop: ev(C.stale) };
  let mode = 'change';
  const f1 = x => x.toFixed(1);
  function draw(R, k, e) {
    const P = R.P, Q = P.c2, OLD = P.c1, NEW = P.c3, NO = P.bad;
    R.grid(-4.8, 4.6, -2.6, 2.6, .5);
    party(R, CL, [1.3, .65, 1.1], P.c5, 'client', { sub: 'dig, every ~2 s' });
    if (mode === 'stale') return drawStale(R, k, e);
    const M = MK[mode], neg = mode === 'neg';
    party(R, RES, [1.8, .65, 1.4], P.acc, 'recursive resolver', {});
    party(R, AU, [1.6, .75, 1.3], P.c4, 'llm.test. server', { sub: 'authoritative' });
    // the time shown by this step
    const t = k === 0 ? 0 : k === 1 ? M.e0.t : k === 2 ? lerp(M.stretch[0], M.stretch[1], e) : M.flip.t;
    const r = k === 0 ? M.R[0] : k === 3 ? M.flip : last(M.R, t), au = last(M.A, Math.max(t, M.A[0].t));
    const isNew = x => x && x.st === 'NOERROR' && (neg || x.v !== M.R[0].v);
    const col = x => isNew(x) ? NEW : neg ? NO : OLD, txt = x => x.st === 'NOERROR' ? x.v.replace('10.53.0.', '.') : 'NXDOMAIN';
    // the authoritative record: a plate on the server, coloured by what it holds now
    const auNew = k >= 1 && (k > 1 || e > .5);
    msg(R, [AU[0] + 1.05, 0, AU[2] + .35], auNew ? NEW : neg ? NO : OLD, 1, neg ? (auNew ? 'record created' : 'no such name') : (auNew ? 'A changed' : 'A ' + M.R[0].v), { w: .62, h: .62, mono: true });
    if (k >= 1) R.label([AU[0], 0, AU[2] + .6], 'answers ' + txt(au) + ' directly', { fs: 12, mono: true, c: col(au), dy: 16, b: 1 });
    // the cache entry on the resolver: length = the TTL the resolver reported, out of 30
    const ttl = r.ttl, len = 1.6;
    entry(R, [RES[0], 0, RES[2]], .65, len, Math.min(30, ttl) / 30, col(r), (neg && !isNew(r) ? 'NXDOMAIN' : 'A ' + r.v) + ' · ' + ttl + ' s left', { b: 1, lc: col(r), a: k === 0 ? e : 1 });
    // the clock
    R.label([CL[0] - .5, 1.0, -1.5], 't = ' + f1(k === 2 ? r.t : t) + ' s', { fs: 15, mono: true, b: 1, c: P.ink, al: 'left' });
    // traffic
    const rc = [RES[0] - .6, .7, RES[2] + .2], rt = [RES[0] + .6, .7, RES[2] - .2], at = [AU[0] - .5, .75, AU[2]];
    if (k === 0 || k === 3) { R.flowArc(rt, at, .5, { c: Q, r: .06, n: 7, speed: 1.4, a: .9 }); R.flowArc(at, rt, .4, { c: col(r), r: .065, n: 7, speed: 1.4 });
      R.label(R.arcPt(rt, at, .5, .5), k === 0 ? 'fetch, ' + r.ms + ' ms' : 'expired: fetch again', { fs: 12.5, b: 1, c: Q, dy: -16 }); }
    R.flowArc(ca, rc, .45, { c: Q, r: .06, n: 6, speed: 1.4, a: .8 }); R.flowArc(rc, ca, .35, { c: col(r), r: .065, n: 6, speed: 1.4 });
    R.label(R.arcPt(rc, ca, .35, .5), 'gets ' + txt(r), { fs: 12.5, b: 1, mono: true, c: col(r), dy: 18 });
    if (k >= 1) { R.arc([CL[0] + .3, .6, CL[2] - .4], [AU[0] - .4, .7, AU[2] + .4], .9, { c: col(au), w: 1.3, dash: [4, 4], a: .6 }); }
    if (k === 1) R.glow(up(AU, .9), .8, { c: NEW, a: .6 * e });
    if (k === 2) R.glow(up(RES, .75), .7, { c: neg ? NO : OLD, a: .45 });
    if (k === 3) R.glow(up(RES, .75), .7, { c: NEW, a: .6 * e });
  }
  function drawStale(R, k, e) {
    const P = R.P, Q = P.c2, OLD = P.c1, BAD = P.bad, dead = k >= 1 && (k > 1 || e > .4);
    party(R, R1, [1.5, .6, 1.0], P.acc, 'resolver, default', {});
    party(R, R2, [1.5, .6, 1.0], P.acc, 'resolver, serve-expired: yes', {});
    party(R, AU, [1.4, .7, 1.1], P.c4, 'llm.test. server', { sub: dead ? 'stopped at ' + f1(SS.stop.t) + ' s' : 'authoritative', dead, a: dead ? .55 : 1 });
    const d0 = SS.def[0], x0 = SS.exp[0], t = k <= 1 ? (k === 0 ? 0 : SS.stop.t) : k === 2 ? lerp(SS.stop.t, 30, e) : k === 3 ? SS.def[1].t : SS.exp[1].t;
    // TTLs left: 30 s from each fetch (derived from the recorded TTL), until the entry expires
    const left = (r0, tt) => Math.max(0, r0.ttl - (tt - r0.t));
    const l1 = k <= 2 ? left(d0, t) : 0, l2 = k <= 2 ? left(x0, t) : k === 4 ? SS.exp[1].ttl : 0;
    entry(R, [R1[0], 0, R1[2]], .6, 1.3, l1 / 30, OLD, l1 > 0 ? 'A ' + d0.v + ' · ' + Math.round(l1) + ' s left' : 'expired', { b: 1, lc: l1 > 0 ? OLD : P.mute, a: k === 0 ? e : 1 });
    entry(R, [R2[0], 0, R2[2]], .6, 1.3, l2 / 30, k === 4 ? P.c5 : OLD, k === 4 ? 'stale A ' + x0.v + ' · TTL ' + l2 : l2 > 0 ? 'A ' + x0.v + ' · ' + Math.round(l2) + ' s left' : 'expired, kept', { b: 1, lc: k === 4 ? P.c5 : l2 > 0 ? OLD : P.mute, a: k === 0 ? e : 1 });
    R.label([CL[0] - .5, 1.0, -1.5], 't = ' + f1(t) + ' s', { fs: 15, mono: true, b: 1, al: 'left' });
    const a1 = [R1[0] + .6, .65, R1[2]], a2 = [R2[0] + .6, .65, R2[2]], at = [AU[0] - .5, .75, AU[2]], c1 = [R1[0] - .6, .6, R1[2] + .2], c2 = [R2[0] - .6, .6, R2[2]];
    if (k === 0) { [a1, a2].forEach(a => { R.flowArc(a, at, .45, { c: Q, r: .06, n: 6, speed: 1.4 }); R.flowArc(at, a, .35, { c: OLD, r: .06, n: 6, speed: 1.4 }); });
      R.label(R.arcPt(a2, at, .45, .5), 'both fetch A ' + d0.v + ', TTL ' + d0.ttl, { fs: 12.5, b: 1, c: OLD, dy: -16 }); }
    if (k === 1) refuse(R, up(AU, 1.0), e);
    if (k === 3) { R.flowArc(ca, c1, .45, { c: Q, r: .06, n: 6, speed: 1.4 }); R.line([a1, [lerp(a1[0], at[0], .75), .75, lerp(a1[2], at[2], .75)]], { c: Q, w: 1.6, dash: [5, 5] }); refuse(R, [lerp(a1[0], at[0], .8), .75, lerp(a1[2], at[2], .8)], e);
      R.label(up(R1, .6), 'no reply: dig gave up', { fs: 12.5, b: 1, c: BAD, dy: 28, a: e }); }
    if (k === 4) { R.flowArc(ca, c2, .45, { c: Q, r: .06, n: 6, speed: 1.4 }); R.flowArc(c2, ca, .35, { c: P.c5, r: .065, n: 6, speed: 1.4, a: e });
      R.line([a2, [lerp(a2[0], at[0], .75), .75, lerp(a2[2], at[2], .75)]], { c: Q, w: 1.6, dash: [5, 5] }); refuse(R, [lerp(a2[0], at[0], .8), .75, lerp(a2[2], at[2], .8)], 1);
      R.label(up(R2, .6), 'answers after ' + SS.exp[1].ms.toLocaleString('en-GB') + ' ms', { fs: 12.5, b: 1, c: P.c5, dy: 30, a: e }); }
  }
  const st = S3.stage({ id: 'stg-cache', list: 'sx-cache-change', fig: 'Fig. 3 · a cache keeps what it has until the TTL runs out', cam: [.12, .86], bounds: [[-4.3, 0, -1.6], [4.3, 1.0, 1.9]], aspect: .5, dur: 2600, hold: 4400, draw,
    margin: w => w < 520 ? [16, 8, 16, 8] : [22, 18, 22, 18] });
  const Cm = document.getElementById('ch-mode');
  if (Cm && st) Cm.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; Cm.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-cache-"]').forEach(l => l.hidden = l.id !== 'sx-cache-' + mode); st.list('sx-cache-' + mode); });
  window.DNS_CACHE_MARKS = { MK, SS }; // read by src/check_stages.mjs
})();
