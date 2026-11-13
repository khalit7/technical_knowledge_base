// ---- Scene: Fig. 1, the hero (stg-hero): the four building blocks assembling into one connection between the client and the server.
// The untrusted path, then key exchange (the two key shares cross in the clear and both ends hold the same secret), the certificate chain
// and its signature checked against the client's trust store, Finished over the transcript, and the AEAD records that carry the request
// and the token stream. Every size is the recorded TLS 1.3 handshake of the running request (D.hs.tls13, 5 October 2026). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.TSK || !window.D) return;
  const { mix } = S3, { party, msg, cert, plate, tick, path, win, route, fmt } = TSK;
  const R0 = D.hs.tls13.recs, find = t => { for (const r of R0) for (const m of (r.m || [])) if (m.t === t) return [r, m]; return [null, null]; };
  const CH = find('ClientHello')[1], SH = find('ServerHello')[1], CE = find('Certificate')[1], CV = find('CertificateVerify')[1], FI = find('Finished')[1];
  const REQ = R0.find(r => r.d === 'c2s' && r.a), TOK = R0.filter(r => r.d === 's2c' && r.t > 100 && r.n > 100).map(r => r.n);
  const H = { ksC: CH.hello.key_share[0].bytes, ksC2: CH.hello.key_share[1].bytes, ksS: SH.hello.key_share[0].bytes, leaf: CE.certs[0].b, inter: CE.certs[1].b,
    sig: CV.sig_bytes, fin: FI.n, req: REQ.n, reqA: REQ.a, tokMin: Math.min(...TOK), tokMax: Math.max(...TOK) };
  window.TLS_HERO = H;   // read by src/check_stages.mjs
  const CL = [-4.7, 0, 0], SV = [4.7, 0, 0], X0 = -3.75, X1 = 3.75, Y = .5;
  function draw(R, k, e) {
    const P = R.P, CLR = P.c5, ENC = P.c1, KEY = P.c2, AUT = P.c3;
    R.grid(-6, 6, -2.2, 2.2, .5);
    party(R, CL, [1.5, 1.5, 1.3], P.c1, 'client', { sub: k === 0 ? 'your code' : null });
    party(R, SV, [1.5, 1.5, 1.3], P.c2, 'server', { sub: k === 0 ? 'the API' : null });
    // the path: three hops that could read, change or answer in the server's place; they recede once the tools take over
    const hopA = k === 0 ? 1 : k === 4 ? 0 : .15;
    [[-2.3, 'Wi-Fi'], [0, 'provider'], [2.3, 'proxy']].forEach(([x, nm]) => { R.box([x, 0, 0], [.55, .42, .55], { fill: mix(P.paper, P.mute, .3), a: hopA });
      if (k === 0) R.label([x, .42, 0], nm, { fs: 12, c: P.mute, dy: -9, wide: 1 }); });
    R.line([[X0, .02, 0], [X1, .02, 0]], { c: P.mute, w: 1.4, dash: [5, 5], a: k === 4 ? .2 : .6 });
    if (k === 0) { R.flow(route([[X0, .25, -.25], [X1, .25, -.25]]), { c: CLR, r: .07, n: 9, speed: 1.2 });
      R.flow(route([[X1, .25, .25], [X0, .25, .25]]), { c: CLR, r: .07, n: 9, speed: 1.2 });
      R.label([0, 1.1, 0], 'every hop can read, change or impersonate', { fs: 12.5, b: 1, c: P.ink, wide: 1 }); }
    // 1. key exchange: the two key shares cross in the clear; both ends compute the same secret, which never crosses
    const kA = k === 1 ? 1 : k > 1 ? .3 : 0;
    if (k >= 1 && k <= 3) {
      const a = [X0 + .5, Y, -.4], b = [X1 - .5, Y, -.4], c = [X1 - .5, Y, .4], d = [X0 + .5, Y, .4];
      if (k === 1) { R.flow(route([a, b]), { c: CLR, r: .07, n: 7, speed: 1.3, a: win(e, 0, .2) }); R.flow(route([c, d]), { c: CLR, r: .07, n: 7, speed: 1.3, a: win(e, .35, .55) }); }
      msg(R, k === 1 ? path(route([a, b]), win(e, 0, .45)) : b, H.ksC, CLR, kA, { lab: k === 1 ? 'key share ' + fmt(H.ksC) + ' B' : null, mono: 1, dy: -14 });
      msg(R, k === 1 ? path(route([c, d]), win(e, .35, .8)) : d, H.ksS, CLR, k === 1 ? win(e, .3, .4) : kA, { lab: k === 1 ? 'key share ' + fmt(H.ksS) + ' B' : null, mono: 1, dy: 22 });
    }
    const sA = k === 1 ? win(e, .8, 1) : k >= 2 ? (k === 4 ? .6 : .45) : 0;
    [CL, SV].forEach(p => plate(R, [p[0], 1.95, .3], KEY, sA, k === 1 ? 'same secret' : null, { w: .42, h: .42, glow: k === 1 ? KEY : null, lc: KEY, dy: -8 }));
    // 2. the certificate chain and its signature, checked against a root already in the client's trust store
    if (k === 2) {
      const a = [X1 - .6, .15, .2], b = [X0 + .9, .15, .2], t = win(e, 0, .55), q = path(route([a, b]), t);
      R.flow(route([a, b]), { c: AUT, r: .07, n: 7, speed: 1.3, a: win(e, 0, .25) });
      cert(R, q, AUT, 1, 'leaf ' + fmt(H.leaf) + ' B', { w: .8, h: .55, mono: 1 });
      cert(R, [q[0] + 1.35, q[1], q[2]], AUT, 1, 'intermediate ' + fmt(H.inter) + ' B', { w: .8, h: .55, mono: 1, dy: -40 });
      plate(R, [q[0] + 2.55, q[1], q[2]], P.c4, win(e, .1, .3), 'signature ' + H.sig + ' B', { w: .3, h: .3, lc: P.c4, mono: 1 });
      cert(R, [CL[0] + .1, 1.95, -.35], P.good, win(e, .55, .75), 'root in its trust store', { w: .7, h: .5, glow: P.good, lc: P.good, dy: -8 });
      tick(R, [X0 + .4, 1.25, .2], win(e, .8, 1));
    }
    // 3. Finished: each side MACs every handshake byte; a changed byte means different keys and a failed check
    if (k === 3) {
      const yT = 1.05;
      R.glass([X0 + .3, yT, -.12], [X1 - X0 - .6, 0, 0], [0, 0, .24], { c: P.c4, a: win(e, 0, .3), nu: 14, nv: 1, th: .03 });
      R.label([0, yT, 0], 'transcript: every handshake byte, hashed', { fs: 12, b: 1, c: P.c4, dy: -12, a: win(e, 0, .3), wide: 1 });
      const a = [X1 - .5, Y, .4], b = [X0 + .5, Y, .4], c = [X0 + .5, Y, -.4], d = [X1 - .5, Y, -.4];
      R.flow(route([a, b]), { c: ENC, r: .065, n: 6, speed: 1.3, a: win(e, .2, .4) }); R.flow(route([c, d]), { c: ENC, r: .065, n: 6, speed: 1.3, a: win(e, .55, .75) });
      msg(R, path(route([a, b]), win(e, .2, .6)), H.fin, ENC, win(e, .15, .25), { lab: 'Finished ' + H.fin + ' B', mono: 1, dy: 22 });
      msg(R, path(route([c, d]), win(e, .55, .95)), H.fin, ENC, win(e, .5, .6), { lab: 'Finished ' + H.fin + ' B', mono: 1, dy: -14 });
    }
    // 4. AEAD records: the encrypted pipe carries the request and one record per streamed token
    if (k === 4) {
      R.glass([X0 + .2, .12, -.55], [X1 - X0 - .4, 0, 0], [0, 0, 1.1], { c: ENC, a: win(e, 0, .3), nu: 16, nv: 2, th: .04 });
      R.glass([X0 + .2, .95, -.55], [X1 - X0 - .4, 0, 0], [0, 0, 1.1], { c: ENC, a: win(e, 0, .3) * .7, nu: 16, nv: 2, th: .04 });
      const a = [X0 + .5, .5, -.25], b = [X1 - .5, .5, -.25];
      msg(R, path(route([a, b]), win(e, .15, .55)), H.req, ENC, win(e, .1, .2), { lab: 'request: ' + H.reqA + ' + 17 = ' + H.req + ' B', mono: 1, dy: -16 });
      R.flow(route([[X1 - .5, .5, .25], [X0 + .5, .5, .25]]), { c: ENC, r: .06, n: 14, speed: 1.6, a: win(e, .55, .75) });
      R.label([0, .12, .55], 'one record per token, ' + H.tokMin + ' to ' + H.tokMax + ' B', { fs: 12, b: 1, mono: 1, c: ENC, dy: 18, a: win(e, .55, .75) });
    }
  }
  const full = { cam: [.2, .42], bounds: [[-5.6, 0, -1.1], [5.6, 2.5, 1.1]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · four tools, one connection', cam: full.cam, bounds: full.bounds, aspect: .44, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [26, 8, 14, 8] : [30, 16, 20, 16],
  });
})();
