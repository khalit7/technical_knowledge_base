// ---- Scene: Fig. 4 (section 7, stg-mtls): mTLS as identity. A mesh's private CA issues each workload a short-lived certificate (green glass
// plates) carrying its SPIFFE ID; the server and then the client present theirs; authorization reads the name. Renderer v2. Illustrative and
// structural: vLLM's SPIFFE ID is the page's example (SPIFFE ID spec format), the gateway's and the notebook's are examples in the same format;
// the policy is the section's sentence "the gateway may call vLLM; the notebook may not". Nothing here is a recording. ----
(function () {
  if (!document.getElementById('stg-mtls') || !window.S3 || !window.AUK) return;
  const { mix } = S3, { up, party, tok, refuse, arcAt } = AUK;
  const CA = [0, 0, -2.5], GW = [-3.1, 0, .5], VL = [3.1, 0, .5], NB = [-1.0, 0, 2.7];
  const ID = { vl: 'spiffe://prod.example/ns/serving/sa/vllm', gw: 'spiffe://prod.example/ns/serving/sa/gateway', nb: 'spiffe://prod.example/ns/research/sa/notebook' };
  function draw(R, k, e) {
    const P = R.P, CC = P.c3, OK = P.good, BAD = P.bad;
    R.grid(-5, 5, -3.4, 3.6, .5);
    const on = (...ks) => ks.indexOf(k) >= 0 ? 1 : .3;
    party(R, CA, [1.4, .9, 1.0], P.c4, 'mesh CA (private)', { a: on(0, 1, 2) });
    party(R, GW, [1.3, .75, 1.0], P.acc, 'gateway', { a: on(0, 1, 2, 3) });
    party(R, VL, [1.4, .85, 1.0], P.c6 || P.c1, 'vLLM', { a: on(0, 1, 2, 3, 4) });
    party(R, NB, [1.0, .6, .8], P.c5, 'notebook', { a: on(0, 4) });
    // each workload's certificate stands beside it once issued
    const CP = { gw: [GW[0] + .25, 0, GW[2] + .85], vl: [VL[0] - .25, 0, VL[2] + .85], nb: [NB[0] + .9, 0, NB[2] + .1] };
    const cert = (who, a, lab, o) => tok(R, CP[who], CC, a, lab, Object.assign({ w: .55, h: .7, wide: 1 }, o || {}));
    if (k === 0) { const ca = [CA[0], .9, CA[2] + .4];
      ['gw', 'vl', 'nb'].forEach((w, i) => { R.flowArc(ca, [CP[w][0], .7, CP[w][2]], .6, { c: CC, r: .065, n: 8, speed: 1.3 });
        tok(R, arcAt(R, [CA[0], .05, CA[2] + .5], CP[w], .6, e), CC, 1, e > .8 ? ID[w] : null, { w: .55, h: .7, grp: 'id' }); });
      R.label(up(CA, 0), 'short-lived, rotated by the mesh', { fs: 12.5, b: 1, c: CC, dy: 22, a: e }); }
    else { cert('gw', on(1, 2, 3)); cert('vl', on(1, 2, 3, 4)); cert('nb', on(4)); }
    const gw = [GW[0] + .65, .55, GW[2]], vl = [VL[0] - .7, .55, VL[2]], chk = (from, a) => R.line([[from[0], .9, from[2] - .3], [CA[0], .7, CA[2] + .5]], { c: P.c4, w: 1.4, dash: [5, 5], a });
    if (k === 1) { R.flowArc(vl, gw, .55, { c: CC, r: .07, n: 10, speed: 1.4 }); tok(R, arcAt(R, [VL[0] - .8, 0, VL[2] + .3], [GW[0] + 1.0, 0, GW[2] + .3], .5, e), CC, 1, ID.vl, { w: .55, h: .7, wide: 1 });
      chk(GW, e); R.label(up(GW, 0), 'chains to the CA?  yes', { fs: 12.5, b: 1, c: OK, dy: 22, a: e }); }
    if (k === 2) { R.flowArc(gw, vl, .55, { c: CC, r: .07, n: 10, speed: 1.4 }); tok(R, arcAt(R, [GW[0] + .8, 0, GW[2] + .3], [VL[0] - 1.0, 0, VL[2] + .3], .5, e), CC, 1, ID.gw, { w: .55, h: .7, wide: 1 });
      chk(VL, e); R.label(up(VL, 0), 'chains to the CA, holds the key?  yes', { fs: 12.5, b: 1, c: OK, dy: 22, a: e }); }
    // the mutually authenticated connection
    if (k >= 2 && k <= 3) { const a = k === 2 ? e : 1; R.line([[gw[0], .4, gw[2] - .15], [vl[0], .4, vl[2] - .15]], { c: OK, w: 5, a: a * .25 }); R.line([[gw[0], .4, gw[2] - .15], [vl[0], .4, vl[2] - .15]], { c: OK, w: 1.3, a });
      if (k === 2) R.label([0, .4, GW[2] - .15], 'mutually authenticated, before any HTTP byte', { fs: 12.5, b: 1, c: OK, dy: -14, a: e }); }
    if (k === 3) { R.flow([[gw[0], .4, gw[2] - .15], [vl[0], .4, vl[2] - .15]], { c: P.acc, r: .075, n: 12, speed: 1.6 });
      R.glass([VL[0] + .2, .05, VL[2] - .9], [.9, 0, 0], [0, .65, 0], { c: P.c6 || P.c1, nu: 1, nv: 3, a: 1 }); R.label([VL[0] + .65, .75, VL[2] - .9], 'policy: allow …/sa/gateway', { fs: 12, b: 1, c: P.ink, dy: -8 });
      R.label([0, .4, GW[2] - .15], 'request allowed by name', { fs: 12.5, b: 1, c: OK, dy: -14 }); }
    if (k === 4) { const nb = [NB[0] + .5, .5, NB[2] - .2];
      R.flowArc(nb, [vl[0], .5, vl[2] + .3], .5, { c: P.c5, r: .07, n: 10, speed: 1.4 });
      R.glass([VL[0] + .2, .05, VL[2] - .9], [.9, 0, 0], [0, .65, 0], { c: P.c6 || P.c1, nu: 1, nv: 3, a: 1 }); R.label([VL[0] + .65, .75, VL[2] - .9], 'policy: allow …/sa/gateway', { fs: 12, b: 1, c: P.ink, dy: -8 });
      refuse(R, [VL[0] - 1.0, .55, VL[2] + .45], e); R.label(up(NB, 0), ID.nb.replace('spiffe://prod.example', '…') + ': valid certificate, wrong name', { fs: 12.5, b: 1, c: BAD, dy: 22, a: e }); }
  }
  S3.stage({ id: 'stg-mtls', list: 'sx-mtls', fig: 'Fig. 4 · identity in the connection (illustrative)', cam: [.1, .75], bounds: [[-4.4, 0, -3.0], [4.6, 1.1, 3.2]], aspect: .64, dur: 1400, hold: 4400, draw,
    margin: w => w < 520 ? [18, 8, 18, 8] : [22, 16, 22, 16],
    view: k => k === 1 || k === 2 ? { cam: [.1, .62], bounds: [[-4.4, 0, -2.8], [4.4, 1.1, 1.8]] } : k === 3 ? { cam: [.1, .5], bounds: [[-4.2, 0, -.8], [4.6, 1.1, 1.6]] } : null });
})();
