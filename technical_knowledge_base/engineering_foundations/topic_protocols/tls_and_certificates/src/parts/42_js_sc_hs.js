// ---- Scene: Fig. 2 (section 2, stg-hs): the TLS 1.3 handshake message by message, as a ladder laid on the floor. The client stands on the
// left, the server on the right, time runs towards the reader; each message is a box whose height is its recorded size, travelling from
// its sender during its step (readable ones yellow, encrypted ones blue). Every size and name is read from the recording D.hs.tls13
// (Python 3.13.16 with OpenSSL 3.5.9, loopback, 5 October 2026). ----
(function () {
  if (!document.getElementById('stg-hs') || !window.S3 || !window.TSK || !window.D) return;
  const { mix } = S3, { party, plate, win, route, fmt } = TSK;
  const RS = D.hs.tls13.recs;
  const msgs = (d, t) => { const out = []; RS.forEach(r => (r.m || []).forEach(m => { if (r.d === d && m.t === t) out.push(m) })); return out[0] };
  const req = RS.find(r => r.d === 'c2s' && r.a), resp = RS.filter(r => r.d === 's2c' && !r.m && r.o === 'application_data'), tok = resp.filter(r => r.t > 100 && r.n > 100).map(r => r.n);
  // the ladder: [row, step it arrives at, direction, name, bytes, readable]
  const L = [[0, 0, 'c2s', 'ClientHello', msgs('c2s', 'ClientHello').n, 1],
    [1, 1, 's2c', 'ServerHello', msgs('s2c', 'ServerHello').n, 1],
    [1, 2, 's2c', 'EncryptedExtensions', msgs('s2c', 'EncryptedExtensions').n, 0], [1, 2, 's2c', 'Certificate', msgs('s2c', 'Certificate').n, 0],
    [1, 3, 's2c', 'CertificateVerify', msgs('s2c', 'CertificateVerify').n, 0], [1, 3, 's2c', 'Finished', msgs('s2c', 'Finished').n, 0],
    [2, 4, 'c2s', 'Finished', msgs('c2s', 'Finished').n, 0], [2, 4, 'c2s', 'request', req.n, 0],
    [3, 5, 's2c', 'NewSessionTicket', msgs('s2c', 'NewSessionTicket').n, 0], [3, 5, 's2c', 'response', resp[0].n, 0]];
  const CH = msgs('c2s', 'ClientHello'), SH = msgs('s2c', 'ServerHello'), CE = msgs('s2c', 'Certificate'), CV = msgs('s2c', 'CertificateVerify');
  window.TLS_HS = { ch: CH.n, sh: SH.n, ksC: CH.hello.key_share[0].bytes, ksC2: CH.hello.key_share[1].bytes, ksS: SH.hello.key_share[0].bytes, sni: CH.hello.sni,
    ee: L[2][4], cert: CE.n, leaf: CE.certs[0].b, inter: CE.certs[1].b, cv: CV.n, sig: CV.sig_bytes, fin: L[5][4], finC: L[6][4], req: req.n, reqA: req.a,
    nst: L[8][4], resp: resp[0].n, tokMin: Math.min(...tok), tokMax: Math.max(...tok) };   // read by src/check_stages.mjs
  const XC = -4.1, XS = 4.1, ZR = [-1.65, -.55, .55, 1.65], MAXB = CH.n, HM = 1.9;
  const hOf = b => Math.max(.05, b / MAXB * HM);
  // where a message parks at the receiver's end of its row, spaced so each keeps its own label
  const slot = (row, i, d) => { const k = L.filter(m => m[0] === row).indexOf(L[i]); return d === 'c2s' ? XS - 1.2 - k * 1.2 : XC + 1.15 + k * 1.5; };
  function draw(R, k, e) {
    const P = R.P, CLR = P.c5, ENC = P.c1;
    R.grid(-5.5, 5.5, -2.6, 2.6, .5);
    party(R, [XC - .55, 0, -2.25], [1.2, 1.1, .9], P.c1, 'client', { fs: 13 });
    party(R, [XS + .55, 0, -2.25], [1.2, 1.1, .9], P.c2, 'server', { fs: 13 });
    // lifelines: time runs towards the reader
    [XC, XS].forEach(x => R.line([[x, .01, -1.95], [x, .01, 2.35]], { c: P.mute, w: 1.6, a: .6 }));
    ZR.forEach((z, r) => { const on = L.some(m => m[0] === r && m[1] <= k); R.line([[XC, .01, z], [XS, .01, z]], { c: P.line, w: 1, dash: [4, 4], a: on ? .9 : .35 }); });
    L.forEach((m, i) => {
      const [row, s, d, nm, b, clear] = m; if (s > k) return;
      const cur = s === k, c = clear ? CLR : ENC, z = ZR[row], x1 = slot(row, i, d), x0 = d === 'c2s' ? XC + .4 : XS - .4;
      const nCur = L.filter(q => q[1] === k).indexOf(m), t = cur ? win(e, .08 + nCur * .12, .62 + nCur * .12) : 1, x = x0 + (x1 - x0) * t;
      const a = cur ? 1 : .32, h = hOf(b);
      if (cur) R.flow(route([[x0, .08, z], [x1, .08, z]]), { c, r: .065, n: 6, speed: 1.4, a: win(e, 0, .2) * (1 - win(e, .85, 1)) + .25 });
      R.box([x, 0, z], [.66, h, .62], { fill: mix(P.paper, c, clear ? .55 : .5), a, lw: .8 });
      if (!clear) R.glass([x - .38, 0, z + .36], [.76, 0, 0], [0, h + .08, 0], { c: ENC, a: a * .55, nu: 1, nv: 1, th: .02 });
      if (cur) R.label([x, h, z], nm + ' ' + fmt(b) + ' B', { fs: 12, b: 1, mono: 1, c: clear ? P.ink : ENC, dy: nCur % 2 ? -42 : -10, a: win(e, .1, .3) });
    });
    // keys appear at both ends once the shares are in (step 2) and switch to application keys after Finished (step 5)
    if (k >= 1) [[XC - .55, 1.55, -2.25], [XS + .55, 1.55, -2.25]].forEach((p, i) => plate(R, p, k >= 4 ? P.good : P.c2, k === 1 ? win(e, .6, .9) : .8,
      k === 1 && i === 0 ? 'handshake keys' : k === 4 && i === 0 ? 'application keys' : null, { w: .44, h: .4, glow: k === 1 || k === 4 ? (k >= 4 ? P.good : P.c2) : null, lc: k >= 4 ? P.good : P.c2, wide: 1 }));
    if (k === 2) R.label([0, .1, ZR[1]], 'from here on, an observer sees only application_data records and sizes', { fs: 12, b: 1, c: ENC, dy: 20, a: win(e, .5, .8), wide: 1 });
    if (k === 4) {   // one round trip: from the ClientHello leaving to the request leaving
      const x = XC - .35; R.line([[x, .04, ZR[0]], [x, .04, ZR[2]]], { c: P.acc, w: 3, a: win(e, .5, .8) });
      [ZR[0], ZR[2]].forEach(z => R.line([[x, .04, z], [x + .3, .04, z]], { c: P.acc, w: 3, a: win(e, .5, .8) }));
      R.label([x, .04, (ZR[0] + ZR[2]) / 2], 'one round trip', { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: -8, a: win(e, .5, .8) });
    }
    if (k === 5) { const z = ZR[3] + .55; R.flow(route([[XS - .4, .1, z], [XC + .4, .1, z]]), { c: ENC, r: .06, n: 12, speed: 1.6, a: win(e, .4, .6) });
      R.label([0, .1, z], 'then one record per token, ' + window.TLS_HS.tokMin + ' to ' + window.TLS_HS.tokMax + ' B', { fs: 12, b: 1, mono: 1, c: ENC, dy: 18, a: win(e, .4, .6) }); }
  }
  const full = { cam: [.18, .6], bounds: [[-5.2, 0, -2.7], [5.2, 2.1, 2.4]] };
  const rowView = r => ({ cam: [.16, .58], bounds: [[-5.2, 0, ZR[r] - 1.4], [5.2, 1.7, ZR[r] + .9]] });
  S3.stage({ id: 'stg-hs', list: 'sx-hs', fig: 'Fig. 2 · the recorded TLS 1.3 handshake', cam: full.cam, bounds: full.bounds, aspect: .56, dur: 1500, hold: 5200, draw,
    margin: w => w < 520 ? [22, 8, 12, 8] : [28, 16, 16, 16],
    view: k => k === 2 || k === 3 ? rowView(1) : k === 4 ? null : k === 5 ? { cam: [.18, .62], bounds: [[-5.2, 0, -.4], [5.2, 1.7, 2.6]] } : null });
})();
