// ---- Scene (top, Fig. 1): one decoder block of the running example and the places a stability fix acts. A structure diagram, no measured
// numbers: the stream runs left to right along the front (embedding to LM head), each sub-layer's branch runs behind it and adds back at a +.
// Norms are blue glass plates standing across the path; the matrices that write into the stream are green plates; dashed outlines are where
// other placements put a norm. Heights of the logit bars in steps 3 and 5 are illustrative and labelled so. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.NSK) return;
  const { mix } = S3, { tw, la, lab, plate, ghostPlate } = NSK;
  const ZS = .6, ZB = -1.0, YB = .4, X0 = -4.8, X1 = 4.2;
  const A = { a: -3.9, n: -3.35, f: -2.35, w: -1.35, p: -.9 }, B = { a: -.3, n: .25, f: 1.25, w: 2.25, p: 2.7 }, XF = 3.45, XH = 4.65;
  const LOG = [1.0, .35, .8, 1.7, .25, .6, 1.25, .45]; // illustrative output logits (relative heights only)
  function branch(R, S, P, a, plus) {
    const path = [[S.a, .14, ZS], [S.a, YB, ZB + .1], [S.p, YB, ZB + .1], [S.p, .14, ZS]];
    R.line(path, { c: P.mute, w: 1.7, a: a * .7 });
    R.flow(path, { c: P.c5, a: a * .9, r: .065, n: 10, speed: 1.1 });
    R.box([S.f, 0, ZB], [1.0, .75, .8], { fill: mix(P.paper, P.mute, .12), a });
    R.ball([S.p, .17, ZS], .14, { c: mix(P.paper, P.ink, .35), a: plus });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-6, 5.8, -2.0, 1.6, .5);
    const aS = tw(st, e, q => q === 0 || q === 5 ? 1 : .35), aN = tw(st, e, q => q === 1 || q === 5 ? 1 : .2), aQ = tw(st, e, q => q === 2 ? 1 : 0),
      aW = tw(st, e, q => q === 3 || q === 5 ? 1 : .2), aH = tw(st, e, q => q === 4 || q === 5 ? 1 : .3), aB = tw(st, e, q => q === 0 || q >= 5 ? 1 : .45);
    const L = q => la(st, e, q);
    // the stream: embedding, a slab along the front, the LM head
    R.box([X0 - .45, 0, ZS], [.75, .6, .75], { fill: mix(P.paper, P.c5, .35), a: Math.max(aS, .5) });
    R.box([(X0 + X1) / 2, 0, ZS], [X1 - X0, .12, .42], { fill: mix(P.paper, P.ink, .14), a: Math.max(aS, .45), shadow: false });
    R.flow([[X0, .17, ZS], [X1, .17, ZS]], { c: P.c5, a: aS, r: .07, n: 20, speed: 1.1 });
    R.box([XH, 0, ZS], [.85, .6, .8], { fill: mix(P.paper, P.c4, .3), a: Math.max(aH, .5) });
    branch(R, A, P, aB, Math.max(aB, aS)); branch(R, B, P, aB, Math.max(aB, aS));
    lab(R, [X0 - .45, 0, ZS + .38], 'embedding', { fs: 12.5, b: 1, c: P.ink, dy: 14, a: L(q => q === 0 || q === 5 ? 1 : 0) });
    lab(R, [XH, 0, ZS + .4], 'LM head', { fs: 12.5, b: 1, c: P.ink, dy: 14, a: L(q => q === 0 || q === 4 ? 1 : 0) });
    lab(R, [-.4, .12, ZS + .21], 'the residual stream: every sub-layer adds to it', { fs: 12.5, b: 1, c: P.ink, dy: 22, a: L(q => q === 0 ? 1 : 0) });
    lab(R, [A.f, .75, ZB], 'attention', { fs: 12.5, b: 1, c: P.ink, dy: -12, a: L(q => q === 0 ? 1 : 0) });
    lab(R, [B.f, .75, ZB], 'FFN', { fs: 12.5, b: 1, c: P.ink, dy: -12, a: L(q => q === 0 || q === 1 ? 1 : 0) });
    [A, B].forEach(S => lab(R, [S.p, .3, ZS], '+', { fs: 15, b: 1, c: P.ink, dy: -14, a: L(q => q === 0 ? 1 : 0) }));
    // norms (blue): before each branch (pre-norm) and the final norm; dashed: where post-norm and the output-norm placements put one
    [A, B].forEach(S => plate(R, S.n, .02, ZB + .1, .8, .8, { c: P.c1, a: aN }));
    plate(R, XF, .02, ZS, .6, .7, { c: P.c1, a: aN });
    const gA = L(q => q === 1 ? 1 : 0);
    if (gA > .01) [A, B].forEach(S => { ghostPlate(R, S.p + .38, .02, ZS, .6, .7, { c: P.c2, a: gA }); ghostPlate(R, S.w + .42, .02, ZB + .1, .8, .8, { c: P.c3, a: gA }); });
    lab(R, [A.n, .82, ZB], 'norm before the branch', { fs: 12.5, b: 1, c: P.c1, dy: -12, a: L(q => q === 1 ? 1 : 0) });
    lab(R, [XF, .72, ZS], 'final norm', { fs: 12.5, b: 1, c: P.c1, dy: -12, a: L(q => q === 1 ? 1 : 0) });
    lab(R, [A.p + .38, .02, ZS + .3], 'post-norm: on the stream', { fs: 12, b: 1, c: P.c2, dy: 26, a: gA });
    lab(R, [B.w + .42, .82, ZB], 'sandwich, OLMo 2: on the branch output', { fs: 12, b: 1, c: P.c3, al: 'left', dx: -10, dy: -26, a: gA, wide: 1 });
    // attention's insides (step 3): q and k plates with a QK-norm in front of each, one logit and the cap a soft-cap puts on it (heights illustrative)
    if (aQ > .01) {
      const y0 = .78, xq = A.f - .4, xk = A.f - .05, zq = ZB + .05;
      R.glass([xq - .13, y0, zq], [.26, 0, 0], [0, .5, 0], { c: P.q, a: aQ, nu: 3, nv: 4 }); R.glass([xk - .13, y0, zq], [.26, 0, 0], [0, .5, 0], { c: P.k, a: aQ, nu: 3, nv: 4 });
      R.glass([xq - .15, y0, zq + .2], [.3, 0, 0], [0, .52, 0], { c: P.c1, a: aQ * .8, nu: 1, nv: 1 }); R.glass([xk - .15, y0, zq + .2], [.3, 0, 0], [0, .52, 0], { c: P.c1, a: aQ * .8, nu: 1, nv: 1 });
      const hL = .2 + .7 * (k === 2 ? e : 1), xl = A.f + .38;
      R.box([xl, y0, ZB], [.22, hL, .22], { fill: mix(P.paper, P.c2, .55), a: aQ, shadow: false });
      R.line([[xl - .2, y0 + .72, ZB], [xl + .2, y0 + .72, ZB]], { c: P.bad, w: 2, a: aQ, dash: [4, 3] });
      R.flowArc([xq, y0 + .5, zq], [xl, y0 + hL, ZB], .2, { c: P.q, a: aQ * .8, r: .045, n: 4, speed: .8 }); R.flowArc([xk, y0 + .5, zq], [xl, y0 + hL, ZB], .12, { c: P.k, a: aQ * .8, r: .045, n: 4, speed: .8 });
      lab(R, [xq, y0 + .5, zq], 'q', { fs: 13, b: 1, c: P.q, dy: -10, a: L(q => q === 2 ? 1 : 0) });
      lab(R, [xk, y0 + .5, zq], 'k', { fs: 13, b: 1, c: P.k, dy: -10, a: L(q => q === 2 ? 1 : 0) });
      lab(R, [xq - .15, y0 + .26, zq + .2], 'QK-norm on each', { fs: 12.5, b: 1, c: P.c1, al: 'right', dx: -8, a: L(q => q === 2 ? 1 : 0) });
      lab(R, [xl + .12, y0 + .3, ZB], 'logit q·k/√d (illustrative)', { fs: 12, b: 1, c: P.c2, al: 'left', dx: 8, a: L(q => q === 2 ? 1 : 0) });
      lab(R, [xl + .2, y0 + .72, ZB], 'a soft-cap bounds it', { fs: 12, c: P.bad, al: 'left', dx: 8, dy: -4, a: L(q => q === 2 ? 1 : 0) });
    }
    // the matrices that write into the stream (green): W_o and W_down start small
    [A, B].forEach(S => plate(R, S.w, .02, ZB + .1, .8, .8, { c: P.c3, a: aW }));
    lab(R, [A.w, .82, ZB], 'W_o', { fs: 12.5, b: 1, c: P.c3, dy: -12, a: L(q => q === 3 ? 1 : 0) });
    lab(R, [B.w, .82, ZB], 'W_down', { fs: 12.5, b: 1, c: P.c3, dy: -12, a: L(q => q === 3 ? 1 : 0) });
    lab(R, [(A.w + B.w) / 2, .1, ZS + .21], 'both start small: 0.02 / √(2L)', { fs: 12.5, b: 1, c: P.c3, dy: 22, a: L(q => q === 3 ? 1 : 0) });
    // the output logits (step 5): the whole vector drifts for free; log Z measures it; z-loss pulls it back to 0 (heights illustrative)
    if (aH > .32) {
      const ah = (aH - .3) / .7, x0 = XH - .77, drift = k === 4 ? .5 * (1 - e) : 0;
      R.box([XH, 0, ZB], [1.95, .05, .45], { a: ah, shadow: false });
      LOG.forEach((v, i) => R.box([x0 + i * .22, .05, ZB], [.15, Math.max(.03, v * .38 + drift), .16], { fill: mix(P.paper, P.c4, .55), a: ah, shadow: false }));
      R.flow([[XH, .6, ZS], [XH, .4, ZB + .2]], { c: P.c4, a: ah * .8, r: .055, n: 5, speed: .9 });
      lab(R, [XH, .05 + 1.7 * .38, ZB], 'output logits (illustrative)', { fs: 12, b: 1, c: P.c4, dy: -16, a: L(q => q === 4 ? 1 : 0) });
      lab(R, [XH + 1.0, .05, ZB], 'z-loss pulls log Z to 0', { fs: 12.5, b: 1, c: P.c4, al: 'left', dx: 8, a: L(q => q === 4 ? 1 : 0) });
    }
    // step 6: every place tagged with its section
    const tg = L(q => q === 5 ? 1 : 0);
    if (tg > .01) {
      const T = (p, t, o) => lab(R, p, t, Object.assign({ fs: 12.5, b: 1, a: tg }, o));
      T([-2.6, .12, ZS + .21], '§1 the stream · §7 its largest entries', { c: P.ink, dy: 22 });
      T([A.n, .82, ZB], '§2 §3 norm', { c: P.c1, dy: -12 });
      T([A.f, .75, ZB], '§4 QK-norm', { c: P.c2, dy: -32 });
      T([B.w, .82, ZB], '§6 init', { c: P.c3, dy: -12 });
      T([XF, .72, ZS], '§2', { c: P.c1, dy: -12 });
      T([XH, 0, ZS + .4], '§5 z-loss · §8 spikes', { c: P.c4, dy: 14 });
    }
  }
  const full = { cam: [.2, .55], bounds: [[-5.7, 0, -1.5], [5.4, 1.1, 1.0]] }, fullP = { cam: [.4, .7], bounds: full.bounds }; // fullP: on a phone the row turns into depth so the block draws larger
  const ph = () => (document.getElementById('stg-hero') || {}).clientWidth < 520;
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one block and where each fix acts', cam: full.cam, bounds: full.bounds, aspect: .37, dur: 1500, hold: 4800, draw, margin: w => w < 520 ? NSK.margin(w) : [26, 18, 34, 18],
    view: k => k === 2 ? { cam: [.3, .38], bounds: [[-3.7, 0, -1.4], [-1.0, 1.7, .4]] } : k === 4 ? { cam: [.15, .5], bounds: [[2.4, 0, -1.5], [5.9, 1.2, 1.1]] } : ph() ? fullP : full });
})();
