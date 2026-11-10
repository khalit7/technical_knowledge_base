// ---- Scene (section 2, Fig. 3): four answers on the same query-key pair. One illustrative token (a seeded 64-dimension content vector, the chart
// below uses the same one) sits at a key position and again 4 tokens later as the query; each lane is one way of putting position in, and the bar
// is the score: the content part (the same in every lane) plus what position adds, computed exactly by window.PESC (25_js_pe_score.js):
// sinusoids added to the input, ALiBi head 1 (slope 1/2), RoPE base 10,000, NoPE. The last step moves both tokens 256 places along. ----
(function () {
  if (!document.getElementById('stg-abs') || !window.PES || !window.PESC) return;
  const { mix, lerp } = S3, { tw, la, lab, dial, hand, f2, TAU } = PES, SC = window.PESC;
  const K = 4, M0 = 20, SHIFT = 256, C = SC.content;
  const LANES = [['sin', 'add a vector (sinusoidal)', 'c4'], ['alibi', 'bias the score (ALiBi, head 1)', 'c3'], ['rope', 'rotate q and k (RoPE)', 'c1'], ['nope', 'nothing (NoPE)', 'mute']];
  const Z = i => 2.4 - i * 1.6, TX = j => -2.8 + j * .55, XS = 1.0, HS = .07;
  const sg = v => (v >= 0 ? '+' : '−') + f2(Math.abs(v), 2);
  function frame(R, x, z, y0, y1, w, o) { const a = [x - w / 2, x + w / 2], b = [z - w / 2, z + w / 2]; [y0, y1].forEach(y => R.line([[a[0], y, b[0]], [a[1], y, b[0]], [a[1], y, b[1]], [a[0], y, b[1]], [a[0], y, b[0]]], o));
    [[a[0], b[0]], [a[1], b[0]], [a[1], b[1]], [a[0], b[1]]].forEach(([x1, z1]) => R.line([[x1, y0, z1], [x1, y1, z1]], o)); }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.2, 2.6, -3.3, 3.3, .5);
    const mq = tw(st, e, q => q === 5 ? M0 + SHIFT : M0), mk = mq - K;
    LANES.forEach(([s, name, col], i) => {
      const z = Z(i), c = P[col] === P.mute ? P.ink : P[col], foc = tw(st, e, q => q === 0 || q === 5 || q === i + 1 ? 1 : .28);
      const rev = tw(st, e, q => q > i ? 1 : 0), pos = SC.at(s, mq, K) * rev;
      // five token slots from the key to the query; the key and the query carry the same content
      for (let j = 0; j <= K; j++) { const end = j === 0 || j === K; R.box([TX(j), 0, z], end ? [.44, .44, .44] : [.4, .03, .4], { fill: j === 0 ? mix(P.paper, P.k, .45) : j === K ? mix(P.paper, P.q, .45) : P.paper, a: foc * (end ? 1 : .6), shadow: end }); }
      // the query scores the key: dots stream from the query to the key
      R.flowArc([TX(K), .46, z], [TX(0), .46, z], .4, { c: P.q, a: foc * .85, r: .045, n: 8, speed: 1.1 });
      // lane 1: a position vector added to each token's input (glass plates over the tokens)
      if (s === 'sin') { const ga = tw(st, e, q => q >= 1 ? 1 : 0) * foc; [[0, mk], [K, mq]].forEach(([j, p]) => { R.glass([TX(j) - .24, .52, z], [.48, 0, 0], [0, .34, 0], { c: P.c4, a: ga, nu: 8, nv: 2 });
        lab(R, [TX(j), .86, z], '+ p(' + Math.round(p) + ')', { fs: 12, b: 1, mono: true, c: P.c4, dy: -6, a: la(st, e, q => q === 1 || q === 5 ? 1 : 0) }); }); }
      // lane 3: pair 0 of each vector turned by its position (theta 1 radian per token): both hands move when the pair moves along
      if (s === 'rope') { const ga = tw(st, e, q => q >= 3 ? 1 : 0) * foc; [[0, mk], [K, mq]].forEach(([j, p]) => { const cc = [TX(j), .82, z]; dial(R, cc, .3, { a: ga, stand: false });
        hand(R, cc, .3, p % TAU, { c: j ? P.q : P.k, a: ga, w: 2.2 }); }); }
      // the score: the content part (grey) and what position adds (coloured above it, or the missing part outlined below the content line)
      const top = C + pos, x = XS, w = .5;
      R.box([x, 0, z], [w, Math.max(.01, Math.min(C, top) * HS), w], { fill: mix(P.paper, P.mute, .35), a: foc });
      if (pos > 0) R.box([x, C * HS, z], [w, pos * HS, w], { fill: mix(P.paper, c, .75), a: foc, shadow: false });
      else if (pos < 0) frame(R, x, z, top * HS, C * HS, w, { c, w: 1.4, a: foc, dash: [4, 3] });
      // the sinusoidal score before the shift, as a ghost, in the last step
      if (s === 'sin') { const g = la(st, e, q => q === 5 ? 1 : 0); if (g > .01) frame(R, x, z, C * HS, (C + SC.at('sin', M0, K)) * HS, w * 1.08, { c: P.mute, w: 1, a: g, dash: [2, 3] }); }
      lab(R, [x + w / 2, Math.max(C, top) * HS, z], rev > .5 ? sg(SC.at(s, mq, K)) : '', { fs: 12.5, b: 1, mono: true, c, al: 'left', dx: 8, a: la(st, e, q => q > i ? 1 : 0) * Math.max(.5, foc) });
      lab(R, [TX(0) - .3, .1, z], name, { fs: 12.5, b: k === i + 1, c: c, al: 'right', dx: -8, a: Math.max(.5, foc), grp: 'lanes' });
    });
    // positions under the front lane, and the content level
    const z0 = Z(0) + .25; lab(R, [TX(0), 0, z0], 'key at ' + Math.round(mk), { fs: 12, b: 1, c: P.k, dy: 14 }); lab(R, [TX(K), 0, z0], 'query at ' + Math.round(mq), { fs: 12, b: 1, c: P.q, dy: 14 });
    lab(R, [XS, 0, z0], 'score', { fs: 12, c: P.mute, dy: 14, wide: 1 });
    lab(R, [XS + .3, C * HS, Z(0)], 'content alone ' + f2(C, 2), { fs: 12, c: P.mute, al: 'left', dx: 6, a: la(st, e, q => q === 0 ? 1 : 0), wide: 1 });
  }
  const full = { cam: [.06, .74], bounds: [[-3.2, 0, -2.9], [1.8, 1.3, 2.9]] };
  S3.stage({ id: 'stg-abs', list: 'sx-abs', fig: 'Fig. 3 · four ways to put position in, one pair of tokens', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [16, 8, 24, 8] : [26, 70, 36, 210],
    view: k => k >= 1 && k <= 4 ? { cam: [.06, .56], bounds: [[-3.2, 0, Z(k - 1) - .9], [1.8, 1.3, Z(k - 1) + .8]] } : full });
})();
