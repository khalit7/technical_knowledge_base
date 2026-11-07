// ---- Scene: Fig. 4 (section 4, stg-chain): validating the chain api.anthropic.com served on 5 October 2026 (D.pub.hosts, recorded with
// OpenSSL 3.6.5). The certificates as sent stack up as glass floors, leaf at the bottom; the client walks the signatures up to a root in
// its trust store, then checks the leaf's dates, name and purpose. Two clients: one whose store holds GTS Root R4 (path A) and an older one
// that only knows GlobalSign Root CA and follows the cross-sign one step further (path B). Subjects, sizes, algorithms, dates, SAN and EKU
// are the recorded fields; which client holds which root is the section's example. ----
(function () {
  if (!document.getElementById('stg-chain') || !window.S3 || !window.TSK || !window.D) return;
  const { mix, lerp } = S3, { party, cert, tick, win, route, path, fmt } = TSK;
  const H = D.pub.hosts.find(h => h.host === 'api.anthropic.com'), CH = H.chain, cn = s => (s.match(/CN=([^,]+)/) || [, s])[1];
  const leaf = CH[0], mid = CH[1], top = CH[2];
  window.TLS_CHAIN = { host: H.host, n: CH.length, der: CH.map(c => c.der_bytes), cn: CH.map(c => cn(c.subject)), sig: CH.map(c => c.sig), topIssuer: cn(top.issuer),
    nb: leaf.not_before, na: leaf.not_after, days: Math.round(leaf.validity_days), san: leaf.san, eku: leaf.eku, ca: CH.map(c => c.ca), rec: D.pub.recorded.slice(0, 10) };   // read by src/check_stages.mjs
  const T = window.TLS_CHAIN, YS = [.25, 1.05, 1.85, 2.65], W = 2.6, DP = 1.3, X = .4, ST = [-3.9, 0, .2], SV = [4.6, 0, 0];
  function floor(R, i, c, a, lab, sub, o) { o = o || {}; if (a <= .01) return; const P = R.P, y = YS[i];
    R.glass([X - W / 2, y, -DP / 2], [W, 0, 0], [0, 0, DP], { c, a, nu: 6, nv: 3, th: .05 });
    R.label([X + W / 2, y, 0], lab, { fs: 12.5, b: 1, al: 'left', dx: 10, dy: -2, a, c: o.lc || P.ink, grp: o.grp });
    if (sub) R.label([X + W / 2, y, 0], sub, { fs: 12, mono: 1, al: 'left', dx: 10, dy: 14, a, c: P.mute, wide: 1 }); }
  function draw(R, k, e) {
    const P = R.P, CC = P.c1, RT = P.good, SG = P.c4;
    R.grid(-5.4, 5.6, -2, 2.2, .5);
    party(R, SV, [1.1, 1.3, 1], P.c2, 'server', { a: k === 0 ? 1 : .35 });
    // the client's trust store: two root plates; which one each client holds is the step's point
    party(R, ST, [1.9, .4, 1.2], P.c1, null); R.label([ST[0], 0, ST[2] + .6], 'client trust store', { fs: 12.5, b: 1, dy: 16, wide: k >= 5 ? 1 : 0 });
    const gtsA = k === 3 ? 1 : k === 4 ? .15 : .45, gsA = k === 4 ? 1 : k === 3 ? .15 : .45;
    cert(R, [ST[0] - .5, .4, ST[2]], RT, gtsA, k === 3 || k === 0 ? 'GTS Root R4' : null, { w: .75, h: .62, glow: k === 3 ? RT : null, lc: RT, dy: -8, fs: 12, al: 'right', dx: 20 });
    cert(R, [ST[0] + .5, .4, ST[2]], P.c5, gsA, k === 4 || k === 0 ? 'GlobalSign Root CA' : null, { w: .75, h: .62, glow: k === 4 ? P.c5 : null, lc: P.c5, dy: k === 0 ? -26 : -8, fs: 12, al: 'left', dx: -20 });
    // the chain as sent: the floors fly in from the server, leaf first
    const arrive = i => k > 0 ? 1 : win(e, i * .25, i * .25 + .4);
    const fa = i => { if (k === 0) return arrive(i); if (k === 1) return i <= 1 ? 1 : .3; if (k === 2) return i >= 1 && i <= 2 ? 1 : .3; if (k === 3) return i === 2 ? 1 : .3; if (k === 4) return i >= 2 ? 1 : .25; return i === 0 ? 1 : .25; };
    [leaf, mid, top].forEach((c, i) => {
      const a = fa(i); if (a <= 0) return;
      if (k === 0 && arrive(i) < 1) { const q = path(route([[SV[0] - .6, YS[i], 0], [X, YS[i], 0]]), arrive(i)); R.box([q[0], YS[i], 0], [.9, .06, .6], { fill: mix(P.paper, CC, .5), a: arrive(i), shadow: false }); return; }
      floor(R, i, i === 2 ? RT : CC, a, (i + 1) + '. ' + cn(c.subject), k === 0 ? fmt(c.der_bytes) + ' B as sent' : k <= 2 && i <= 2 ? c.sig : null, { grp: 'chain' });
    });
    if (k === 0) R.label([X, YS[2] + .3, 0], 'as sent, leaf first', { fs: 12, b: 1, c: P.mute, dy: -12, a: win(e, .8, 1), wide: 1 });
    // walking the signatures up: each floor is checked with the public key of the floor above
    const up = (i, a) => { const p0 = [X - .5, YS[i] + .06, .2], p1 = [X - .5, YS[i + 1] - .02, .2]; R.flow(route([p0, p1]), { c: SG, r: .07, n: 6, speed: 1, a }); R.line([p0, p1], { c: SG, w: 2, a: a * .6, head: 7 }); };
    if (k === 1) { up(0, win(e, 0, .3)); tick(R, [X - 1.05, YS[0] + .25, 0], win(e, .6, .8)); R.label([X - .5, (YS[0] + YS[1]) / 2, .2], 'signed by the floor above?', { fs: 12, b: 1, c: SG, al: 'right', dx: -12, a: win(e, .2, .4), wide: 1 }); }
    if (k === 2) { up(1, win(e, 0, .3)); tick(R, [X - 1.05, YS[1] + .25, 0], win(e, .6, .8)); R.label([X - .5, YS[1] + .5, .2], 'CA:TRUE, keyCertSign', { fs: 12, b: 1, mono: 1, c: SG, al: 'right', dx: -12, a: win(e, .3, .5), wide: 1 }); }
    if (k === 3) { R.flow(route([[X - W / 2, YS[2], 0], [ST[0] - .5, 1.05, ST[2]]]), { c: RT, r: .07, n: 8, speed: 1.1, a: win(e, 0, .3) });
      R.label([X, YS[2] + .05, -DP / 2], 'path A: the root is in this store, stop', { fs: 12, b: 1, c: RT, dy: -14, a: win(e, .4, .7) }); }
    if (k === 4) { floor(R, 3, P.c5, win(e, .2, .5), '4. GlobalSign Root CA (from the store)', T.sig[2], { lc: P.c5 });
      up(2, win(e, .35, .6)); R.flow(route([[ST[0] + .5, 1.05, ST[2]], [X - W / 2, YS[3], 0]]), { c: P.c5, r: .07, n: 8, speed: 1.1, a: win(e, 0, .3) });
      R.label([X, YS[3] + .05, -DP / 2], 'path B: follow the cross-sign', { fs: 12, b: 1, c: P.c5, dy: -14, a: win(e, .5, .8) }); }
    // dates: the leaf's validity on a time line in front of it, with the day the chain was recorded
    if (k === 5) { const z = DP / 2 + .55, x0 = X - W / 2, x1 = X + W / 2, d = (s => (Date.parse(s) - Date.parse(T.nb)) / (Date.parse(T.na) - Date.parse(T.nb)));
      R.box([X, 0, z], [W, .05, .18], { fill: mix(P.paper, CC, .45), a: win(e, 0, .3), shadow: false });
      const xr = lerp(x0, x1, d(T.rec)); R.box([xr, 0, z], [.06, .5, .06], { fill: P.acc, a: win(e, .3, .5), shadow: false });
      R.label([x0, .05, z], T.nb, { fs: 12, mono: 1, al: 'right', dx: -6, dy: 4, a: win(e, 0, .3) }); R.label([x1, .05, z], T.na, { fs: 12, mono: 1, al: 'left', dx: 6, dy: 4, a: win(e, 0, .3) });
      R.label([xr, .5, z], 'recorded ' + T.rec, { fs: 12, b: 1, c: P.acc, dy: -10, a: win(e, .3, .5) }); tick(R, [X - 1.05, YS[0] + .25, 0], win(e, .6, .8)); }
    if (k === 6) { R.label([X, YS[0], DP / 2], 'dialled: ' + T.host, { fs: 12.5, b: 1, mono: 1, dy: 18, a: win(e, 0, .3) });
      R.label([X, YS[0], DP / 2], 'SAN ' + T.san.join(', ') + ' · EKU ' + T.eku.join(', '), { fs: 12, mono: 1, dy: 35, c: P.good, a: win(e, .3, .6) });
      tick(R, [X - .2, YS[0] + .35, 0], win(e, .6, .8)); }
  }
  const full = { cam: [.32, .5], bounds: [[-5.0, 0, -1.2], [5.2, 3.0, 1.4]] };
  S3.stage({ id: 'stg-chain', list: 'sx-chain', fig: 'Fig. 4 · walking the api.anthropic.com chain', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 5200, draw,
    margin: w => w < 520 ? [22, 8, 12, 8] : [26, 16, 16, 16],
    view: k => k === 1 || k === 5 || k === 6 ? { cam: [.3, .45], bounds: [[-4.9, 0, -1.2], [4.6, 1.6, 1.9]] } : k === 2 ? { cam: [.3, .45], bounds: [[-4.9, .3, -1.2], [4.6, 2.4, 1.4]] } : null });
})();
