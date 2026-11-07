// ---- Scene: Fig. 2, deep and shallow modules (stg-deep). Every function of the refactored service (step 10) drawn the way Ousterhout draws a
// module: the red top face is its interface (as wide as the parameters a caller must supply), the height is what it hides (source lines of its
// body), both counted from refactor/steps/step10.py by gen_data.py (CD.depth). Steps 4 and 5 compare step 9 (CD.depth9, where the handler
// itself released the key on two paths: CD.release_calls) with step 10 (one context manager owns the key's lifetime). ----
(function () {
  if (!document.getElementById('stg-deep') || !window.CDK) return;
  const { mix } = S3, { lab, module, arcPts, win } = CDK;
  const D = CD.depth.slice().sort((a, b) => b.body / b.params - a.body / a.params || b.body - a.body);
  const D9 = Object.fromEntries(CD.depth9.map(d => [d.name, d])), D10 = Object.fromEntries(CD.depth.map(d => [d.name, d]));
  const COLS = 4, SX = 2.7, SZ = 2.1, PU = .36, HU = .12, DEP = .62;
  const pos = i => [(i % COLS - (COLS - 1) / 2) * SX, 0, (Math.floor(i / COLS) - 1) * SZ];
  const DEEP = ['claim_key', 'take_token', 'save_reply'], SHALLOW = ['request_fingerprint', 'chat_exists', 'make_reply'];
  window.CD_DEEP = { order: D.map(d => d.name) };
  // steps 4 and 5: the idempotency code, step 9 against step 10, at its own place to the right of the grid
  const OX = 7.6, HX = OX - 1.9, CX = OX + .5, RX = OX + 2.2;
  function draw(R, k, e) {
    const P = R.P; R.grid(-5, 10.4, -3.2, 3.0, .5);
    // 1-3: the grid of every function
    const ga = k <= 2 ? 1 : k === 3 ? 1 - win(e, 0, .4) : 0;
    if (ga > .01) D.forEach((d, i) => { const p = pos(i), w = d.params * PU, h = d.body * HU;
      const hot = k === 1 ? DEEP.includes(d.name) : k === 2 ? SHALLOW.includes(d.name) : true, a = ga * (hot ? 1 : .2);
      module(R, p, w, h, DEP, d.name === 'send_message' ? P.c1 : P.c4, a, { shadow: k === 0 });
      if (k === 0 || hot) { lab(R, [p[0], 0, p[2] + DEP / 2 + .05], d.name, { mono: 1, fs: 12, dy: 12, a: Math.max(.3, a), b: hot && k > 0 });
        if (k > 0) lab(R, [p[0], h + .05, p[2]], d.params + (d.params > 1 ? ' params · ' : ' param · ') + d.body + (d.body > 1 ? ' lines' : ' line'), { mono: 1, fs: 12, dy: -12, a, c: P.ink, wide: 1 }); } });
    // 4: step 9, the handler must remember to call release_key on two paths
    const a4 = k === 3 ? win(e, .35, 1) : k === 4 ? 1 - Math.min(1, e * 1.6) : 0, a5 = k === 4 ? Math.max(0, e * 1.6 - .6) : 0;
    const hs = (d, a, col, x, z) => { if (a <= .01) return 0; const w = d.params * PU, h = d.body * HU; module(R, [x, 0, z], w, h, DEP, col, a); return h; };
    if (a4 > .01) { const s9 = D9.send_message, ck = D9.claim_key, rk = D9.release_key;
      const h0 = hs(s9, a4, P.c1, HX, 0), h1 = hs(ck, a4, P.c4, CX, -.9), h2 = hs(rk, a4, P.bad, RX, .9);
      lab(R, [HX, h0 + .05, 0], 'send_message · ' + s9.body + ' lines', { mono: 1, fs: 12, b: 1, dy: -12, a: a4 });
      lab(R, [CX, h1 + .05, -.9], 'claim_key · ' + ck.params + ' params', { mono: 1, fs: 12, dy: -12, a: a4 });
      lab(R, [RX, h2 + .05, .9], 'release_key · ' + rk.params + ' params', { mono: 1, fs: 12, dy: -12, a: a4, c: P.bad });
      R.flow(arcPts(R, [HX + .3, h0, 0], [CX, h1 + .08, -.9], .6, 24), { c: P.c4, r: .065, n: 9, speed: 1.2, a: a4 });
      for (let j = 0; j < CD.release_calls['9']; j++) R.flow(arcPts(R, [HX + .3, h0 * (.45 + .3 * j), .2], [RX, h2 + .08, .9 + (j ? .12 : -.12)], .5 + .35 * j, 24), { c: P.bad, r: .065, n: 8, speed: 1.1, a: a4 });
      lab(R, [(HX + RX) / 2, .9, .9], CD.release_calls['9'] + ' call sites in the handler', { fs: 12, c: P.bad, a: a4, wide: 1 }); }
    // 5: step 10, idempotency_claim (a context manager) wraps claim_key and releases the key on every exit without a saved response
    if (a5 > .01) { const s10 = D10.send_message, ic = D10.idempotency_claim, ck = D10.claim_key;
      // idempotency_claim calls claim_key, so what its 3 parameters hide is its own 6 lines on top of claim_key's 15
      const h0 = hs(s10, a5, P.c1, HX, 0), w = ic.params * PU, hC = ck.body * HU, hI = ic.body * HU;
      R.box([CX, 0, -.45], [w, hC, DEP], { fill: mix(P.paper, P.c4, .25), a: a5 });
      module(R, [CX, hC, -.45], w, hI, DEP, P.c4, a5, { shadow: false, t: .6 });
      lab(R, [HX, h0 + .05, 0], 'send_message · ' + s10.body + ' lines', { mono: 1, fs: 12, b: 1, dy: -12, a: a5 });
      lab(R, [CX, hC + hI + .05, -.45], 'idempotency_claim · ' + ic.params + ' params', { mono: 1, fs: 12, b: 1, dy: -12, a: a5 });
      lab(R, [CX + w / 2, hC + hI / 2, -.45 - DEP / 2], 'its own ' + ic.body + ' lines', { al: 'left', dx: 8, mono: 1, fs: 12, a: a5, wide: 1 });
      lab(R, [CX + w / 2, hC / 2, -.45 - DEP / 2], 'claim_key\'s ' + ck.body + ', called inside', { al: 'left', dx: 8, mono: 1, fs: 12, a: a5, c: P.mute, wide: 1 });
      R.flow(arcPts(R, [HX + .3, h0, 0], [CX - .2, hC + hI + .08, -.45], .6, 24), { c: P.c4, r: .065, n: 9, speed: 1.2, a: a5 });
      lab(R, [RX, .3, .9], CD.release_calls['10'] + ' release calls in the handler', { fs: 12, c: P.good, a: a5, b: 1, wide: 1 }); }
  }
  const full = { cam: [.42, .62], bounds: [[-5.2, 0, -2.8], [5.2, 2.0, 2.8]] }, idem = { cam: [.42, .5], bounds: [[OX - 2.8, 0, -1.6], [OX + 3.2, 2.6, 1.6]] };
  S3.stage({ id: 'stg-deep', list: 'sx-deep', fig: 'Fig. 2 · every function of the refactored service', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 16, 18, 16],
    view: k => k === 1 ? { cam: [.5, .55], bounds: [[-5.2, 0, -2.8], [5.2, 2.0, 2.8]] } : k >= 3 ? idem : null });
})();
