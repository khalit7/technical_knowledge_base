// ---- Scene (section 7, Fig. 10): linear layers keep a fixed state, attention layers a growing cache. One hybrid's layers side by side (x);
// each is a bar whose length is the bytes it holds for one request (z): an attention layer's grows with the context (AG row .per × T),
// a linear layer's is its recurrent state, fixed (AG row .st numbers × 4 bytes, FP32, as AG.stateB), drawn hollow because it keeps nothing
// per token. Lengths share one byte scale per step. Kimi K3 at 4,096, at the crossover (AG.stateB / row .kv) and at 131,072 tokens, then
// Nemotron 3 Super at its own crossover. ----
(function () {
  if (!document.getElementById('stg-lin') || !window.AGS) return;
  const { lab, mc, B, nm, row, int, cl } = AGS, G = AGS.G;
  const MS = ['Kimi K3', 'Nemotron 3 Super 120B-A12B'].map(row), cross = r => G.stateB(r) / r.kv, cr = r => Math.round(cross(r) / 100) * 100;
  const MI = [0, 0, 0, 1], TS = [4096, cr(MS[0]), 131072, cross(MS[1])], ZL = 4.6, ZF = 2.3, XW = 6, H = .3;
  const lg = Math.log2;
  function model(R, P, r, T, a) {
    const L = r.L, dx = XW / L, x = i => -XW / 2 + (i + .5) * dx, per = r.per[r.mix.replace(/[LHF]/g, '')[0]], st = r.st * 4;
    const sc = ZL / Math.max(st, per * T), nL = (r.mix.match(/[LH]/g) || []).length, nA = L - nL - (r.mix.match(/F/g) || []).length;
    for (let i = 0; i < L; i++) { const c = r.mix[i];
      if (c === 'F') { R.box([x(i), 0, ZF - .15], [dx * .72, .012, .3], { fill: P.paper, fa: .1, ec: P.mute, ea: .6, a, shadow: false, lw: .5 }); continue; }
      if (c === 'L' || c === 'H') { const l = st * sc; R.box([x(i), 0, ZF - l / 2], [dx * .72, H, l], { fill: P.paper, fa: .1, ec: mc(P, c), ea: .85, a, shadow: false, lw: .6 }); continue; }
      const l = Math.max(.02, per * T * sc); R.box([x(i), 0, ZF - l / 2], [dx * .72, H, l], { fill: mc(P, c), a, shadow: false, lw: .5 });
      if (a > .5) R.flow([[x(i), H + .02, ZF], [x(i), H + .02, ZF - l]], { c: mc(P, c), a: a * .8, r: .035, n: 5, speed: .9 }); }
    R.flow([[-XW / 2 - .3, .02, ZF + .25], [XW / 2 + .1, .02, ZF + .25]], { c: P.acc, a: a * .8, r: .04, n: 10, speed: 1.4 });
    const A = [-XW / 2, 0, ZF - ZL], cache = r.kv * T, state = G.stateB(r);
    lab(R, A, nm(r.n) + ' at ' + int(T) + ' tokens', { fs: 13, b: 1, al: 'left', dx: -6, dy: -84, c: P.ink, a });
    lab(R, A, 'cache ' + nA + ' × ' + int(per) + ' B × ' + int(T) + ' = ' + B(cache), { mono: true, fs: 12, al: 'left', dx: -6, dy: -66, c: mc(P, r.mix.replace(/[LHF]/g, '')[0]), a, wide: 1 });
    lab(R, A, 'state ' + nL + ' × ' + B(st) + ' = ' + B(state) + ', at any length', { mono: true, fs: 12, al: 'left', dx: -6, dy: -50, c: P.c5, a, wide: 1 });
    lab(R, A, cache > state * 1.02 ? 'the cache is ' + (cache / state).toFixed(1) + ' × the state' : cache < state * .98 ? 'the state is ' + (state / cache).toFixed(1) + ' × the cache' : 'cache = state', { mono: true, fs: 12.5, b: 1, al: 'left', dx: -6, dy: -32, c: P.acc, a });
    lab(R, [-XW / 2 - .3, 0, ZF + .25], 'newest token', { fs: 12, al: 'right', dx: -8, c: P.mute, a: a * .9, wide: 1 });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-3.6, 3.6, -2.6, 2.8, .5);
    const a0 = MI[st.pk], a1 = MI[k];
    if (a0 === a1) { const t = e >= 1 ? TS[k] : Math.pow(2, S3.lerp(lg(TS[st.pk]), lg(TS[k]), e)); model(R, P, MS[a1], t, 1); }
    else { if (e < .5) model(R, P, MS[a0], TS[st.pk], 1 - 2 * e); else model(R, P, MS[a1], TS[k], cl(2 * e - 1, 0, 1)); }
  }
  S3.stage({ id: 'stg-lin', list: 'sx-lin', fig: 'Fig. 10 · a fixed state against a growing cache', cam: [.45, .55], bounds: [[-3.4, 0, -2.4], [3.4, .6, 2.6]], aspect: .6, dur: 2200, hold: 5200, draw,
    margin: w => w < 520 ? [40, 8, 14, 8] : [96, 60, 14, 110] });
  window.AGS.cross = cr;
})();
