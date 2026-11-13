// ---- Scene: Fig. 4, the DNSSEC chain of trust (stg-sec), from the lab's signed zones (window.DNSD.sec.dnssec, 5 October 2026).
// The three zones stand as terraces down the tree (root at the back, llm.test. in front); on each, its key-signing key (gold) and zone-signing key
// (blue) as glass plates, and on the parent the DS record (teal) that vouches for the child's KSK. The resolver holds the trust anchor. Trust flows
// down the chain as dots, one link per step. Key tags are recomputed in the browser from the recorded DNSKEY records (keyTag in 27_js_rd_sec.js).
// Modes: the valid chain, the A record's signature expired, the root key rolled while the resolver kept the old anchor, a signed "no". ----
(function () {
  if (!document.getElementById('stg-sec') || !window.S3 || !window.DNK || !window.DNSD || !window.keyTag) return;
  const { mix } = S3, { up, party, msg, refuse } = DNK, S = DNSD.sec.dnssec, Ch = S.chain;
  const recs = s => (s || '').split('\n').map(l => l.trim().split(/\s+/)).filter(f => f.length > 4 && f[2] === 'IN');
  const keys = s => recs(s).filter(f => f[3] === 'DNSKEY').map(f => ({ flags: +f[4], tag: keyTag(+f[4], +f[5], +f[6], f.slice(7).join('')) }));
  const ds = s => recs(s).filter(f => f[3] === 'DS').map(f => +f[4]);
  const ksk = s => keys(s).filter(k => k.flags === 257).map(k => k.tag)[0], zsk = s => keys(s).filter(k => k.flags === 256).map(k => k.tag)[0];
  const TAG = { anc: ds(S.anchor_old)[0], ancNew: ds(S.anchor_new)[0], rK: ksk(Ch['. DNSKEY']), rZ: zsk(Ch['. DNSKEY']), tDS: ds(Ch['test. DS'])[0], tK: ksk(Ch['test. DNSKEY']), tZ: zsk(Ch['test. DNSKEY']),
    lDS: ds(Ch['llm.test. DS'])[0], lK: ksk(Ch['llm.test. DNSKEY']), lZ: zsk(Ch['llm.test. DNSKEY']) };
  const status = s => ((s || '').match(/status: (\w+)/) || [])[1] || '?';
  const nsec = (S.nxdomain_proof || '').split('\n').map(l => l.trim().split(/\s+/)).find(f => f[3] === 'NSEC' && f[0] === 'api.llm.test.');
  // zones: [x, z, height, name]; plates stand on each zone's top
  const Z = [[-1.3, -1.7, 1.2, 'root  .'], [.9, -.35, .8, 'test.'], [3.1, 1.0, .4, 'llm.test.']], RES = [-3.7, 0, 1.3];
  const top = i => Z[i][2], kp = i => [Z[i][0] - .55, top(i), Z[i][1]], zp = i => [Z[i][0] + .2, top(i), Z[i][1]], dp = i => [Z[i][0] + .85, top(i), Z[i][1] + .1];
  const anc = [RES[0] + .1, .6, RES[2]], recP = [Z[2][0] + .85, top(2), Z[2][1] + .1];
  const mid = (p, h) => [p[0], p[1] + (h || .3), p[2]];
  // the raw records behind each step (shown in the closed block under the step lists)
  const OUT = { anc: S.anchor_old, root: Ch['. DNSKEY'], tds: Ch['test. DS'], tk: Ch['test. DNSKEY'], lds: Ch['llm.test. DS'], lk: Ch['llm.test. DNSKEY'],
    a: S.valid + '\n\n$ delv +vtrace api.llm.test\n' + (S.delv || '').split('\n').filter(l => /fetch:|verify rdataset|fully validated/.test(l)).join('\n'),
    exp: S.expired + '\n\n$ dig api.llm.test +cd\n' + S.expired_cd + '\n\n# Unbound log\n' + (S.expired_log || []).join('\n'),
    rolled: '# old anchor\n' + S.rolled_old_anchor + '\n' + (S.rolled_old_log || []).join('\n'), fixed: '# new anchor\n' + S.rolled_new_anchor, nx: S.nxdomain_proof };
  const chain = ['anc', 'root', 'tds', 'tk', 'lds', 'lk'];
  const M = { valid: chain.concat('a'), expired: chain.concat('exp'), rolled: ['anc', 'rolled', 'fixed'], nx: chain.concat('nx') };
  let mode = 'valid';
  function draw(R, k, e) {
    const P = R.P, KC = P.c5, ZC = P.c1, DC = P.c6, OK = P.good, BAD = P.bad, steps = M[mode], cur = steps[k];
    R.grid(-4.8, 4.8, -3.0, 2.8, .5);
    const rolled = mode === 'rolled', broken = rolled && k >= 1 && k < 2;
    // how far down the chain trust has reached at this step (links done light up green)
    const reach = rolled ? (k >= 2 ? 6 : 0) : Math.min(k, 6);
    party(R, RES, [1.3, .55, 1.0], P.acc, 'validating resolver', { a: 1 });
    Z.forEach((z, i) => { const on = rolled ? (i === 0 || k === 2 ? 1 : .35) : (k <= 1 && i === 0) || (k >= 2 && k <= 3 && i <= 1) || (k >= 4 && i >= 1) ? 1 : .4;
      party(R, [z[0], 0, z[1]], [2.6, z[2], 1.1], P.c4, null, { a: on, t: .14 });
      R.label([z[0] - 1.25, z[2] * .5, z[1] + .55], z[3], { al: 'left', fs: 13.5, b: 1, c: P.ink, a: Math.max(.45, on) }); });
    // the trust anchor at the resolver
    const ancTag = rolled && k === 2 ? TAG.ancNew : TAG.anc;
    msg(R, anc, KC, 1, 'anchor ' + ancTag, { w: .5, h: .55, glow: k === 0 });
    if (k === 0) R.glow(mid(anc, .3), .6, { c: KC, a: .7 * e });
    // keys on each zone; in the rolled mode the root shows its new KSK
    const rootK = rolled && k >= 1 ? TAG.ancNew : TAG.rK;
    [[rootK, TAG.rZ], [TAG.tK, TAG.tZ], [TAG.lK, TAG.lZ]].forEach(([kk, zz], i) => { const lit = reach >= [1, 3, 5][i];
      msg(R, kp(i), KC, lit || (rolled && i === 0) ? 1 : .45, 'KSK ' + kk, { w: .5, h: .55, grp: 'k' + i });
      msg(R, zp(i), ZC, lit ? 1 : .45, 'ZSK ' + zz, { w: .5, h: .55, grp: 'k' + i }); });
    // DS records in the parents
    [[0, TAG.tDS, 2], [1, TAG.lDS, 4]].forEach(([i, tag, s]) => msg(R, dp(i), DC, reach >= s ? 1 : .45, 'DS ' + tag, { w: .4, h: .45, grp: 'k' + i }));
    // the answer record on llm.test.
    const last = cur === 'a' || cur === 'exp' || cur === 'nx';
    if (!rolled) msg(R, [recP[0] + .1, top(2), recP[2] + .7], cur === 'exp' ? BAD : cur === 'nx' ? P.c4 : P.c3, last ? 1 : .35,
      !last || cur === 'nx' ? null : 'A 10.53.0.80 + RRSIG ' + TAG.lZ, { w: .55, h: .5 });
    // the NSEC record's label is long: it sits under the plate, clear of the zone's name
    if (cur === 'nx') R.label([recP[0] + .1, 0, recP[2] + .7], 'NSEC ' + (nsec ? nsec[0] + ' → ' + nsec[4] : ''), { fs: 12, mono: true, b: 1, c: P.c4, dy: 14 });
    // links already proven: green lines
    const L = [[anc, kp(0)], [kp(0), zp(0)], [zp(0), dp(0)], [dp(0), kp(1)], [zp(1), dp(1)], [dp(1), kp(2)]];
    L.forEach((l, j) => { if (j < reach && !(j === reach - 1 && e < 1 && !rolled)) R.arc(mid(l[0], .45), mid(l[1], .45), .25, { c: OK, w: 1.8, a: .7 }); });
    // the link this step proves: dots flowing along it
    const link = { root: [anc, kp(0)], tds: [zp(0), dp(0)], tk: [dp(0), kp(1)], lds: [zp(1), dp(1)], lk: [dp(1), kp(2)] }[cur];
    if (link) { R.flowArc(mid(link[0], .45), mid(link[1], .45), .3, { c: OK, r: .06, n: 8, speed: 1.3 });
      if (cur === 'root' || cur === 'tk' || cur === 'lk') { const i = cur === 'root' ? 0 : cur === 'tk' ? 1 : 2; R.flowArc(mid(kp(i), .45), mid(zp(i), .45), .2, { c: KC, r: .05, n: 5, speed: 1.1, a: e }); } }
    if (cur === 'a' || cur === 'nx') { R.flowArc(mid(zp(2), .45), mid([recP[0] + .1, top(2), recP[2] + .7], .4), .2, { c: ZC, r: .05, n: 5, speed: 1.1 });
      R.flowArc(mid([recP[0], top(2), recP[2] + .7], .3), mid(RES, .55), 1.0, { c: OK, r: .065, n: 10, speed: 1.4, a: e });
      R.label(up(RES, .55), (cur === 'nx' ? 'NXDOMAIN' : status(S.valid)) + ', AD set', { fs: 13, b: 1, c: OK, dy: 26, a: e }); }
    if (cur === 'exp') { refuse(R, mid([recP[0] + .1, top(2), recP[2] + .7], .3), e);
      R.label(up(RES, .55), status(S.expired) + ' (+cd: ' + status(S.expired_cd) + ')', { fs: 13, b: 1, c: BAD, dy: 26, a: e }); }
    if (cur === 'rolled') { refuse(R, mid(kp(0), .3), e); R.line([mid(anc, .45), mid(kp(0), .45)], { c: BAD, w: 1.6, dash: [5, 5] });
      R.label(up(RES, .55), status(S.rolled_old_anchor) + ' for every name', { fs: 13, b: 1, c: BAD, dy: 26, a: e }); }
    if (cur === 'fixed') R.label(up(RES, .55), status(S.rolled_new_anchor) + ', AD set', { fs: 13, b: 1, c: OK, dy: 26, a: e });
  }
  function onStep(k) { const el = document.getElementById('ds-out'); if (el) el.textContent = (OUT[M[mode][k]] || '').trim(); }
  const st = S3.stage({ id: 'stg-sec', list: 'sx-sec-valid', fig: 'Fig. 4 · trust flows down from one configured key', cam: [.2, .76], bounds: [[-4.4, 0, -2.4], [4.2, 1.8, 2.2]], aspect: .62, dur: 1600, hold: 4400, draw, onStep,
    view: k => { const c = M[mode][k]; return c === 'tds' || c === 'tk' ? { cam: [.2, .72], bounds: [[-3.0, 0, -2.4], [2.6, 1.8, .8]] } : c === 'lds' || c === 'lk' ? { cam: [.2, .72], bounds: [[-.8, 0, -1.2], [4.4, 1.4, 2.0]] } : null; },
    margin: w => w < 520 ? [16, 8, 16, 8] : [22, 18, 22, 18] });
  const C = document.getElementById('ds-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-sec-"]').forEach(l => l.hidden = l.id !== 'sx-sec-' + mode); st.list('sx-sec-' + mode); });
  window.DNS_SEC = { M, TAG, nsec }; // read by src/check_stages.mjs
})();
