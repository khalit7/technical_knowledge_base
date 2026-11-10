// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), 2026-11-10. Every number a scene draws comes from the page's data
// (window.PE_DATA, 22_js_pe_0data.js) or from the RoPE ports in 23_js_pe_1core.js (window.ROPE); anything illustrative is said so in its steps.
// A dial is one RoPE pair: a disc standing upright (the x-y plane at depth z), the angles it reached in training shaded, a hand at its angle now. ----
window.PES = (function () {
  if (!window.S3 || !window.ROPE || !window.PE_DATA) return null;
  const { lerp, mix } = S3, TAU = 2 * Math.PI;
  // a smooth value between the previous step's target and this step's
  const tw = (st, e, f) => { const a = f(st.pk), b = f(st.k); return e >= 1 || a === b ? b : lerp(a, b, e); };
  // label alpha: an outgoing label is gone a third of the way through a transition and an incoming one starts after it, so two labels never share the space
  const la = (st, e, f) => { const a = f(st.pk), b = f(st.k); if (e >= 1 || a === b) return b; return a > b ? lerp(a, b, Math.min(1, 3 * e)) : lerp(a, b, Math.max(0, 2 * e - 1)); };
  // a label only when its anchor is on the canvas (a close view must not pin far labels to the edge)
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const f2 = (n, d) => (+n).toFixed(d == null ? 2 : d);
  const wl = w => w < 100 ? w.toFixed(1) : w < 1000 ? fmt(w) : w < 1e6 ? (w / 1000).toFixed(w < 1e4 ? 1 : 0) + 'K' : (w / 1e6).toFixed(1) + 'M';
  // a point on a dial's rim: angle a counter-clockwise from the right, in the plane facing +z
  const pt = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]];
  function arcPts(c, r, a0, a1, n) { const out = []; n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) / TAU * 48)); for (let i = 0; i <= n; i++) out.push(pt(c, r, a0 + (a1 - a0) * i / n)); return out; }
  // the dial face with a white plinth under it on the floor
  function dial(R, c, r, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P;
    if (o.stand !== false) { R.box([c[0], 0, c[2]], [r * .9, .06, .26], { a, fill: P.paper }); R.box([c[0], .06, c[2]], [.035, c[1] - r - .06, .035], { a: a * .9, shadow: false }); }
    R.quad(arcPts(c, r, 0, TAU, 48), { fill: o.fill || P.paper, a, ea: .9, lw: o.lw || 1.1, ec: o.ec, dz: .002 });
  }
  // the angles a pair reached in training: a full disc (every angle) or the wedge from 0 to ang
  function wedge(R, c, r, ang, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01 || ang <= 0) return; const P = R.P, full = ang >= TAU - 1e-9;
    const pts = full ? arcPts(c, r * .94, 0, TAU, 48) : [c].concat(arcPts(c, r * .94, 0, ang));
    R.quad(pts, { fill: o.c || (full ? P.c1 : P.c3), a: a * (o.fa || .3), edge: false, dz: -.001 });
  }
  // the hand: a line from the centre to the rim at angle ang, a ball at its tip
  function hand(R, c, r, ang, o) {
    o = o || {}; const a = o.a == null ? 1 : o.a; if (a <= .01) return; const P = R.P, col = o.c || P.ink, L = o.len == null ? r * .96 : o.len, tip = pt(c, L, ang);
    R.line([c, tip], { c: col, w: o.w || 2.6, a, dz: -.003 }); R.ball(tip, o.br || r * .09, { c: col, a, top: o.top }); R.ball(c, r * .05, { c: P.ink, a });
  }
  // the inverse frequencies of a preset under a method (plain, pi, ntk, dyn, yarn, llama3, longrope), and the state of each pair at a distance:
  // 0 the whole circle was seen in training, 1 inside the trained wedge, 2 an angle no training example produced (judged modulo one turn, as section 6 says)
  const inv = (P, m, s, len) => m === 'plain' ? ROPE.baseInv(P.base, P.dim) : ROPE.method(P, m, s == null ? P.s : s, len);
  function states(P, iv, dist) { const seen = ROPE.seenArc(P); return iv.map((f, i) => seen[i] >= TAU - 1e-9 ? 0 : ((dist * f) % TAU) > seen[i] * (1 + 1e-9) ? 2 : 1); }
  // a bank of dials for one config: eight pairs picked evenly from fastest to slowest as large dials, and every pair as a cell of a strip in front
  // (blue: whole circle seen in training, green: inside its wedge, orange: an angle never seen). o: {a, lab (label alpha), slow (show the slow-down
  // factor against plain under each dial), height (strip cell heights 0..1 per pair, e.g. the slow-down on a log scale)}. Returns the count out of range.
  const NP = 8, BSP = 1.4, BR = .56, BY = BR + .3, SX = 10.2, ZS = 2.5;
  const pick = n => { const p = []; for (let k = 0; k < NP; k++)p.push(Math.round(k * (n - 1) / (NP - 1))); return p; };
  const bankX = k => (k - (NP - 1) / 2) * BSP, cellX = (i, n) => -SX / 2 + SX * (i + .5) / n;
  function bank(R, P, iv, dist, o) {
    o = o || {}; const Pc = R.P, a = o.a == null ? 1 : o.a, n = iv.length, plain = ROPE.baseInv(P.base, P.dim), seen = ROPE.seenArc(P), stt = states(P, iv, dist), pk = pick(n), al = o.lab == null ? 1 : o.lab;
    const deg = x => { const d = x * 180 / Math.PI; return (d < 10 ? d.toFixed(1) : Math.round(d)) + '°'; };
    pk.forEach((i, k) => {
      const C = [bankX(k), BY, 0], ang = (dist * iv[i]) % TAU, s = stt[i], col = s === 2 ? Pc.bad : s === 0 ? Pc.c1 : mix(Pc.ink, Pc.c3, .45);
      dial(R, C, BR, { a }); wedge(R, C, BR, seen[i], { a, c: s === 0 ? Pc.c1 : Pc.c3 }); hand(R, C, BR, ang, { c: col, a, w: s === 2 ? 3.4 : 2.6 });
      if (s === 2) R.flow(arcPts(C, BR * 1.08, seen[i], ang, 14), { c: Pc.bad, r: .04, n: 5, speed: .5, a: a * al });
      lab(R, [C[0], BY + BR, 0], 'pair ' + i, { fs: 12, c: Pc.mute, dy: -38, a: a * al, wide: 1 });
      lab(R, [C[0], BY + BR, 0], 'λ ' + wl(TAU / plain[i]), { fs: 12, mono: true, c: Pc.mute, dy: -24, a: a * al, wide: 1 });
      lab(R, [C[0], BY + BR, 0], seen[i] >= TAU - 1e-9 ? 'full circle' : deg(ang) + '/' + deg(seen[i]), { fs: 12, c: s === 2 ? Pc.bad : Pc.mute, b: s === 2, dy: -10, a: a * al, wide: 1 });
      const sl = plain[i] / iv[i];
      if (o.slow) lab(R, [C[0], 0, .25], sl > 1.0005 ? '÷' + (sl < 10 ? sl.toFixed(2) : sl.toFixed(1)) : '÷1', { fs: 12.5, mono: true, b: sl > 1.0005, c: sl > 1.0005 ? Pc.c5 : Pc.mute, dy: 14, a: a * al, wide: 1 });
    });
    // the strip of every pair, with a faint tie from each large dial to its cell
    const cw = SX / n, zS = ZS;
    for (let i = 0; i < n; i++) { const s = stt[i], h = o.height ? .05 + .5 * o.height[i] : .12;
      R.box([cellX(i, n), 0, zS], [cw * .8, h, .34], { fill: s === 2 ? mix(Pc.paper, Pc.bad, .85) : s === 0 ? mix(Pc.paper, Pc.c1, .6) : mix(Pc.paper, Pc.c3, .6), a, shadow: false, lw: .5, ea: .45 }); }
    pk.forEach((i, k) => R.line([[bankX(k), .02, .25], [cellX(i, n), .02, zS - .2]], { c: Pc.line, w: 1, a: a * .8 }));
    const out = stt.filter(x => x === 2).length;
    lab(R, [-SX / 2 - .1, .05, zS], 'all ' + n + ' pairs', { fs: 12, c: Pc.mute, al: 'right', dx: -6, a: a * al, grp: 'side' });
    lab(R, [SX / 2 + .1, .05, zS], out + ' at unseen angles', { fs: 12.5, b: 1, c: out ? Pc.bad : Pc.c3, al: 'left', dx: 6, a: a * al, wide: 1 });
    return out;
  }
  const bankBounds = [[-SX / 2 - .2, 0, -.6], [SX / 2 + .2, BY + BR + .1, ZS + .3]];
  return { tw, la, lab, fmt, f2, wl, pt, arcPts, dial, wedge, hand, inv, states, bank, bankBounds, ZS, SX, TAU };
})();
