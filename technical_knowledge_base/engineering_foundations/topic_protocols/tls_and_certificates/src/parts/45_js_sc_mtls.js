// ---- Scene: Fig. 6 (section 7, stg-mtls): mutual TLS as recorded (D.hs.mtls: Python 3.13.16 with OpenSSL 3.5.9, the lab's private CA),
// then where the client's certificate comes from and what rotation does to live connections (D.rot). The gateway on the left, the model
// server on the right, the connection between them a blue glass slab (everything in it is encrypted). Sizes, the SPIFFE ID, lifetimes,
// the reload time and the two fingerprints are recorded; the SPIRE agent's one-hour default is from SPIRE's documentation (linked in the
// step list). Authorization on the name is taught on the Auth page and only named here. ----
(function () {
  if (!document.getElementById('stg-mtls') || !window.S3 || !window.TSK || !window.D) return;
  const { mix } = S3, { party, msg, cert, plate, bar, tick, path, win, route, fmt } = TSK;
  const RS = D.hs.mtls.recs, M = (d, t) => { for (const r of RS) for (const m of (r.m || [])) if (r.d === d && m.t === t) return m; };
  const CR = M('s2c', 'CertificateRequest'), CC = M('c2s', 'Certificate'), CV = M('c2s', 'CertificateVerify'), FC = M('c2s', 'Finished');
  const RO = D.rot.steps, FP = D.rot.sha256_fingerprints, fpOld = RO[0].conn1_sees, fpNew = RO[2].conn2_sees;
  window.TLS_MTLS = { cr: CR.n, cc: CC.n, leaf: CC.certs[0].b, spiffe: CC.certs[0].san[0], na: CC.certs[0].na, cv: CV.n, sig: CV.sig_bytes, fin: FC.n,
    c2s0: D.hs.tls13.wire.c2s, c2s1: D.hs.mtls.wire.c2s, ms: RO[1].ms, fpOld, fpNew, still: RO[3].conn1_still_sees, rec: D.hs.mtls.recorded };   // read by src/check_stages.mjs
  const T = window.TLS_MTLS, GW = [-4.3, 0, 0], VS = [4.3, 0, 0], AG = [-4.3, 0, 2.1], X0 = -3.4, X1 = 3.4;
  function draw(R, k, e) {
    const P = R.P, ENC = P.c1, ID = P.c3, SG = P.c4;
    R.grid(-5.8, 5.8, -2.2, 3, .5);
    party(R, GW, [1.3, 1.4, 1.2], P.c1, 'gateway', {});
    party(R, VS, [1.3, 1.4, 1.2], P.c2, 'model server', {});
    // the connection: one slab while the handshake runs; two in the rotation step
    const slabs = k === 5 ? [[-.55, 'connection 1'], [.65, 'connection 2']] : [[0, null]];
    slabs.forEach(([z, nm]) => { R.glass([X0, .55, z - .4], [X1 - X0, 0, 0], [0, 0, .8], { c: ENC, a: .7, nu: 14, nv: 2, th: .04 });
      if (nm) R.label([X0, .55, z], nm, { wide: 1, fs: 12, b: 1, c: ENC, al: 'right', dx: -8, dy: 4, a: win(e, .2, .5) }); });
    // the server's own certificate, as in any TLS connection; replaced in the rotation step
    const srvC = k === 5 ? 1 - win(e, .1, .3) : 1;
    cert(R, [VS[0], 1.85, 0], P.c2, k === 5 ? srvC : .45, k === 5 ? 'old ' + fpOld : null, { wide: 1, w: .7, h: .45, mono: 1, lc: P.mute, dy: -8 });
    const L = [X1 - .3, .62, -.15], Rr = [X0 + .3, .62, -.15], Lb = [X0 + .3, .62, .15], Rb = [X1 - .3, .62, .15];
    if (k === 0) {   // the server asks for a client certificate, inside the encrypted flight
      R.flow(route([L, Rr]), { c: ENC, r: .065, n: 7, speed: 1.3, a: win(e, 0, .25) });
      msg(R, path(route([L, Rr]), win(e, .05, .6)), CR.n, P.c2, 1, { wide: 1, lab: 'CertificateRequest ' + CR.n + ' B', mono: 1, dy: -14, k: .006 });
    }
    if (k === 1 || k === 2) {   // the client's certificate (and then its signature) go to the server
      const q = path(route([Lb, [X1 - 1.3, .62, .15]]), k === 1 ? win(e, .05, .6) : 1);
      if (k === 1) R.flow(route([Lb, Rb]), { c: ID, r: .065, n: 7, speed: 1.3, a: win(e, 0, .25) });
      cert(R, [q[0], .62, q[2]], ID, k === 1 ? 1 : .5, k === 1 ? 'Certificate ' + fmt(CC.n) + ' B' : null, { wide: 1, w: .9, h: .55, mono: 1, lc: ID });
      if (k === 1) R.label([0, .55, .4], 'URI SAN ' + T.spiffe, { fs: 12, mono: 1, b: 1, c: ID, dy: 20, a: win(e, .3, .6), wide: 1 });
    }
    if (k === 2) {
      R.flow(route([Lb, Rb]), { c: SG, r: .065, n: 6, speed: 1.3, a: win(e, 0, .25) });
      msg(R, path(route([[X0 + .3, .62, -.15], [X1 - 1, .62, -.15]]), win(e, .05, .5)), CV.n, SG, 1, { wide: 1, lab: 'CertificateVerify ' + CV.n + ' B + Finished ' + FC.n + ' B', mono: 1, dy: -14, k: .006 });
      cert(R, [VS[0] + .2, .02, 1.25], P.good, win(e, .4, .6), 'trust bundle: lab root', { wide: 1, w: .7, h: .5, lc: P.good, glow: P.good, dy: -8 });
      tick(R, [VS[0] - .7, 1.6, .7], win(e, .7, .9));
    }
    if (k === 3) {   // the cost: the client's bytes over the whole connection, without and with mTLS
      const u = .00045; bar(R, [-1.1, 0, 1.8], T.c2s0, u, P.mute, win(e, 0, .3), { wide: 1, lab: fmt(T.c2s0) + ' B', w: .7, d: .6 }); bar(R, [1.1, 0, 1.8], T.c2s1, u, ID, win(e, .2, .5), { wide: 1, lab: fmt(T.c2s1) + ' B', w: .7, d: .6 });
      R.label([-1.1, 0, 2.2], 'TLS 1.3', { fs: 12, b: 1, dy: 16, a: win(e, 0, .3) }); R.label([1.1, 0, 2.2], 'with mTLS', { fs: 12, b: 1, dy: 16, c: ID, a: win(e, .2, .5) });
      cert(R, [GW[0], 1.85, 0], ID, 1, 'client: proven', { wide: 1, w: .7, h: .45, lc: ID, dy: -8 }); cert(R, [VS[0], 1.85, .02], P.good, 1, 'server: proven', { wide: 1, w: .7, h: .45, lc: P.good, dy: -8 });
    }
    if (k === 4) {   // where the client certificate comes from: a node agent attests the workload and hands it a short-lived SVID
      party(R, AG, [1.2, .6, .9], P.c4, null, { a: win(e, 0, .3) }); R.label([AG[0], .6, AG[2]], 'SPIRE agent on the node', { fs: 12, b: 1, c: P.c4, al: 'left', dx: 50, dy: 4, a: win(e, 0, .3) });
      const p0 = [AG[0], .7, AG[2] - .3], p1 = [GW[0], 1.85, .1]; R.flow(route([p0, p1]), { c: ID, r: .065, n: 6, speed: 1.1, a: win(e, .2, .4) });
      cert(R, path(route([p0, p1]), win(e, .25, .75)), ID, win(e, .2, .3), 'SVID, short-lived', { wide: 1, w: .7, h: .45, lc: ID, sub: 'renewed before it expires', dy: -8 });
    }
    if (k === 5) {   // rotation: the server reloads its certificate; new connections get it, the open one keeps the old identity
      cert(R, [VS[0], 1.85, .5], P.good, win(e, .2, .45), 'new ' + fpNew, { wide: 1, w: .7, h: .45, mono: 1, lc: P.good, glow: P.good, dy: -8 });
      R.label([VS[0] + .5, 2.3, .5], 'load_cert_chain() again: ' + T.ms + ' ms', { fs: 12, b: 1, mono: 1, c: P.ink, dy: -28, al: 'right', a: win(e, .2, .45), wide: 1 });
      R.flow(route([[X1 - .3, .62, -.55], [X0 + .3, .62, -.55]]), { c: P.mute, r: .06, n: 6, speed: 1.1, a: .8 });
      R.flow(route([[X1 - .3, .62, .65], [X0 + .3, .62, .65]]), { c: P.good, r: .06, n: 6, speed: 1.1, a: win(e, .45, .65) });
      R.label([0, .62, -.55], 'still sees ' + T.still, { wide: 1, fs: 12, mono: 1, b: 1, c: P.mute, dy: -12, a: win(e, .5, .8) });
      R.label([0, .62, .65], 'sees ' + fpNew, { wide: 1, fs: 12, mono: 1, b: 1, c: P.good, dy: 22, a: win(e, .5, .8) });
    }
  }
  const full = { cam: [.18, .55], bounds: [[-5.4, 0, -1.3], [5.4, 2.6, 2.7]] };
  S3.stage({ id: 'stg-mtls', list: 'sx-mtls', fig: 'Fig. 6 · the recorded mTLS handshake, issuance and rotation', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 5200, draw,
    margin: w => w < 520 ? [22, 8, 12, 8] : [28, 16, 16, 16],
    view: k => k <= 2 ? { cam: [.16, .5], bounds: [[-5.4, 0, -1.1], [5.4, 2.3, 1.6]] } : null });
})();
