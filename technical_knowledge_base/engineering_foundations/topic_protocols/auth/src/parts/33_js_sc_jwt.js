// ---- Scene: Fig. 3 (section 6, stg-jwt): validating a JWT in order. The lab's recorded "A good token" (AUTHDATA.jwt.cases[0]) as three glass
// plates, header, payload and signature, each as wide as its base64url text (to scale); the issuer with its JWKS behind, the verifier in front.
// Each step is one check of RFC 8725's order (the step list), drawn on the plate it reads. Every claim shown is decoded from the token itself;
// the signature verdict is the recorded one. Renderer v2. ----
(function () {
  if (!document.getElementById('stg-jwt') || !window.S3 || !window.AUK || !window.AUTHDATA) return;
  const D = AUTHDATA.jwt, C = D.cases.find(c => c.id === 'good'), parts = C.token.split('.');
  const H = JSON.parse(AU.b64uDec(parts[0])), Pl = JSON.parse(AU.b64uDec(parts[1]));
  const { mix } = S3, { up, party, tok, arcAt } = AUK;
  const SC = .0112, GAP = .35, W = parts.map(p => p.length * SC), X0 = -(W[0] + W[1] + W[2] + 2 * GAP) / 2;
  const XC = [X0 + W[0] / 2, X0 + W[0] + GAP + W[1] / 2, X0 + W[0] + W[1] + 2 * GAP + W[2] / 2], PH = 1.6;
  const VF = [-1.4, 0, 2.5], IS = [-3.3, 0, -2.7], JW = [-1.6, 0, -2.7];
  const iso = t => new Date(t * 1000).toISOString().slice(11, 19) + ' UTC';
  function draw(R, k, e) {
    const P = R.P, CH = P.c2, CP = P.c4, CS = P.c6 || P.c1, OK = P.good, rise = k === 0 ? e : 1;
    R.grid(-5, 5, -3.6, 3.8, .5);
    const focus = [[1, 1, 1], [1, .3, .3], [1, .3, .3], [1, 1, 1], [1, .3, .3], [.3, 1, .3], [.3, 1, .3], [.3, 1, .3]][k] || [1, 1, 1];
    // the three plates, to scale
    [CH, CP, CS].forEach((c, i) => { const a = focus[i] * rise;
      R.glass([XC[i] - W[i] / 2, .05, 0], [W[i], 0, 0], [0, PH * rise, 0], { c, nu: Math.max(2, Math.round(W[i] / .3)), nv: 5, a, th: .04 });
      R.label([XC[i], .05, 0], ['header', 'payload', 'signature'][i] + ' · ' + parts[i].length + ' chars', { fs: 12.5, b: 1, c, dy: 14, a: Math.max(.35, a) }); });
    if (k === 0) { R.label([XC[1] + W[1] / 2 + GAP / 2, PH + .1, 0], 'base64url, joined by two dots', { fs: 12.5, c: P.mute, dy: -14, a: e, wide: 1 });
      R.label([XC[0], PH, 0], H.alg + ' · ' + H.kid + ' · ' + H.typ, { fs: 12, mono: true, c: CH, al: 'right', dx: 24, dy: -14, a: e, wide: 1 });
      R.label([XC[1], PH * .3, .05], 'iss, sub, aud, scope, iat, exp, jti', { fs: 12, mono: true, c: CP, a: e, wide: 1 }); }
    // the verifier (in front) and the issuer with its published keys (behind)
    party(R, VF, [1.5, .7, 1.0], P.acc, k === 0 ? null : 'your verifier', { a: k === 0 ? .12 : 1 });
    party(R, IS, [1.3, .9, 1.0], P.c4, k === 0 ? null : 'issuer ' + Pl.iss.replace('https://', ''), { a: k === 2 ? 1 : k === 0 ? .12 : .3, fs: 12.5 });
    R.glass([JW[0] - .45, .05, JW[2]], [.9, 0, 0], [0, .8, 0], { c: P.c1, nu: 2, nv: 3, a: k === 2 ? 1 : k === 0 ? .1 : .3 });
    if (k) R.label(up(JW, .85), 'JWKS', { fs: 12, b: 1, c: P.c1, dy: -8, a: k === 2 ? 1 : .35 });
    const vf = [VF[0], .7, VF[2] - .5], tick = (p, t, c, o) => R.label(p, t, Object.assign({ fs: 12.5, b: 1, mono: true, c: c || OK }, o || {}));
    if (k === 1) { R.flowArc([XC[0], PH * .8, .05], vf, .6, { c: CH, r: .07, n: 9, speed: 1.4 });
      tick([XC[0], PH, 0], 'alg: ' + H.alg, CH, { dy: -12 }); tick(up(VF, 0), 'allowed: [' + H.alg + '], chosen by you, not the token', P.ink, { dy: 22, mono: false, a: e }); }
    if (k === 2) { const a0 = [JW[0] + .2, .6, JW[2] + .1]; R.flowArc(a0, vf, .9, { c: P.c1, r: .075, n: 10, speed: 1.4 });
      tok(R, arcAt(R, [JW[0] + .2, .05, JW[2] + .2], [VF[0] - 1.2, .05, VF[2] - .2], .8, e), P.c1, 1, 'public key ' + H.kid, { w: .45, h: .55 });
      tick([XC[0], PH, 0], 'kid: ' + H.kid, CH, { dy: -12 }); tick(up(VF, 0), 'from the issuer\'s cached JWKS, never jku or x5u', P.ink, { dy: 22, mono: false, a: e }); }
    if (k === 3) { const sg = [XC[2] - W[2] / 2 + .2, PH * .55, .05];
      R.flowArc([XC[0], PH * .55, .05], sg, .7, { c: CH, r: .065, n: 8, speed: 1.3 }); R.flowArc([XC[1], PH * .55, .05], sg, .45, { c: CP, r: .07, n: 10, speed: 1.3 });
      R.flowArc(vf, [XC[2], PH * .3, .1], .5, { c: P.c1, r: .07, n: 8, speed: 1.3 });
      R.glow([XC[2], PH / 2, .1], 1.1, { c: OK, a: .55 * e }); tick([XC[2], PH, 0], 'signature valid', OK, { dy: -12, mono: false, a: e }); }
    const claim = (i, t, done) => tick([XC[1], PH - .2 - i * .27, .06], t + (done ? '  ✓' : ''), done ? OK : CP, { fs: 12 });
    if (k === 4) { R.glow([XC[0], PH / 2, .1], .7, { c: OK, a: .5 * e }); tick([XC[0], PH, 0], 'typ: ' + H.typ + '  ✓', OK, { dy: -12 });
      tick(up(VF, 0), 'an ID token says typ JWT: stopped here', P.ink, { dy: 22, mono: false, a: e }); }
    if (k >= 5) { const rows = [['iss', Pl.iss, 5], ['aud', Pl.aud, 5], ['iat', iso(Pl.iat), 6], ['exp', iso(Pl.exp) + ' (+' + (Pl.exp - Pl.iat) + ' s)', 6], ['scope', Pl.scope, 7]];
      rows.forEach((r, i) => claim(i, r[0] + ': ' + r[1], k >= r[2] && (k > r[2] || e > .5)));
      if (k === 5) tick(up(VF, 0), 'iss is the issuer you trust; aud contains your own id', P.ink, { dy: 22, mono: false, a: e });
      if (k === 6) tick(up(VF, 0), 'checked at the recording time ' + iso(D.recorded_at) + ', small leeway', P.ink, { dy: 22, mono: false, a: e });
      if (k === 7) { R.glow(up(VF, .8), .9, { c: OK, a: .6 * e }); tick(up(VF, 0), 'only now authorize: the scope allows this call', OK, { dy: 22, mono: false, a: e }); } }
  }
  const full = { cam: [.18, .6], bounds: [[-4.4, 0, -3.2], [4.4, 1.8, 3.1]] };
  S3.stage({ id: 'stg-jwt', list: 'sx-jwt', fig: 'Fig. 3 · one recorded token, checked in order', cam: full.cam, bounds: full.bounds, aspect: .58, dur: 1400, hold: 4600, draw,
    margin: w => w < 520 ? [18, 8, 18, 8] : [24, 16, 22, 16],
    view: k => k === 0 ? { cam: [.1, .32], bounds: [[-4.3, 0, -.3], [4.3, 1.8, .5]] }
      : k === 3 ? { cam: [.1, .4], bounds: [[-4.3, 0, -.3], [4.3, 1.8, 2.4]] }
      : k === 1 || k === 4 ? { cam: [.3, .45], bounds: [[-4.4, 0, -.5], [.2, 1.8, 3.0]] }
      : k >= 5 ? { cam: [.12, .42], bounds: [[-3.0, 0, -.4], [1.8, 1.8, 3.0]] } : null });
})();
