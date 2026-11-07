// ---- Scene: Fig. 4, one lost packet on HTTP/2 against HTTP/3 (stg-loss, section 7). Data: window.HD.wirehol, the root page's recorded runs
// (src/wire/hol.sh: three copies of the running request 10 ms apart, 25 ms each way; a base run and a run with one loss; when each token reached
// the application). Every token is a block that crosses the wire at its recorded base time and lands in its slot at its recorded time in the run
// shown; a token that arrived late waits at the client's edge in between. ----
(function () {
  if (!document.getElementById('stg-loss') || !window.S3 || !window.HTK || !window.HD || !HD.wirehol) return;
  const { mix, cl } = S3, { up, node, lane, chunk, slot, cut, win } = HTK, W = HD.wirehol;
  const tok = (run, s) => run.token_ms[String(s)];
  // per stream, per token: base time, time in this run, delay
  function rows(p, tag) { const b = W['base_' + p], r = W[tag + '_' + p]; return [0, 1, 2].map(s => tok(b, s).map((t, j) => ({ s, j, b: t, a: tok(r, s)[j], d: tok(r, s)[j] - t }))) }
  const RUNS = [rows('h2', 'base'), rows('h2', 'loss'), rows('h3', 'base'), rows('h3', 'loss')];
  window.LOSS_ROWS = { h2: rows('h2', 'loss'), h3: rows('h3', 'loss') };   // for src/check_stages.mjs
  const T0 = 150, T1 = 420, WT = 45, HELD = 8;          // the window of time shown (ms), a token's visual time on the wire, what counts as held
  const ZS = [-.66, 0, .66], SX = 3.9, EDGE = .55, sx = j => -3.35 + j * .5;
  function draw(R, k, e) {
    const P = R.P, C = [P.c1, P.c6, P.c4];   // stream colours; the page's bad colour (orange) marks a late token R.grid(-5.4, 5.4, -2.4, 2.4, .5);
    const wire = k <= 3 ? 1 : .12, h3 = k === 2 || k === 3, loss = k === 1 || k === 3;
    node(R, [-4.35, 0, 0], [.9, .7, 2.2], P.acc, k <= 3 ? 'Client' : null, { a: wire });
    node(R, [4.35, 0, 0], [.9, .7, 2.2], P.good, k <= 3 ? 'Server' : null, { a: wire, sub: k <= 3 ? '25 ms each way' : null, subWide: 1 });
    if (k <= 3) {
      if (!h3) { lane(R, EDGE, SX, 0, 1.9, P.c6, 1); R.label([2.2, 0, .95], 'one TCP connection: one ordered byte stream', { fs: 12.5, c: P.mute, dy: 16, wide: 1 }) }
      else { lane(R, EDGE, SX, 0, 2.05, P.mute, .3, { nv: 1 }); ZS.forEach((z, s) => lane(R, EDGE, SX, z, .44, C[s], .9));
        R.label([2.2, 0, 1.03], 'one QUIC connection over UDP: each stream ordered on its own', { fs: 12.5, c: P.mute, dy: 16, wide: 1 }) }
      ZS.forEach((z, s) => { for (let j = 0; j < 5; j++) slot(R, [sx(j), 0, z], .36, .36, .8); R.label([sx(0) - .3, 0, z], 'stream ' + (h3 ? [0, 4, 8][s] : [1, 3, 5][s]), { fs: 12, al: 'right', dx: -6, c: C[s], b: 1, grp: 'rows' }) });
      const t = T0 + (T1 - T0) * e, run = RUNS[k];
      R.label([2.2, 1.1, 0], 't = ' + Math.round(t) + ' ms', { mono: true, fs: 13, b: 1 });
      const held = [];
      run.forEach(r => r.forEach(o => {
        const lane_z = h3 ? ZS[o.s] : (o.s - 1) * .18, c = C[o.s], lost = loss && o.d > 30 && o.j === 1 && o.s === 0;
        if (t >= o.a) { chunk(R, [sx(o.j), .02, ZS[o.s]], o.d > HELD ? P.bad : c, 1, { s: [.32, .24, .32], t: o.d > HELD ? .8 : .62 }); return }
        if (lost) {
          if (t >= o.b - WT && t < o.b - WT / 2) chunk(R, [SX + (EDGE - SX) * (t - o.b + WT) / WT, .02, lane_z], c, 1);
          else if (t >= o.b - WT / 2 && t < o.a - WT) cut(R, [(SX + EDGE) / 2, .3, lane_z], 1, .18);
          else if (t >= o.a - WT) chunk(R, [SX + (EDGE - SX) * cl((t - o.a + WT) / WT, 0, 1), .02, lane_z], c, 1);
          return }
        if (t >= o.b - WT && t < o.b) { chunk(R, [SX + (EDGE - SX) * (t - o.b + WT) / WT, .02, lane_z], c, 1); return }
        if (t >= o.b) held.push(o);
      }));
      // tokens that crossed the wire but may not be handed over yet wait at the client's edge, in the order they came
      held.sort((x, y) => x.b - y.b).forEach((o, i) => { const z = h3 ? ZS[o.s] : 0, n = h3 ? held.filter(x => x.s === o.s && x.b < o.b).length : i;
        chunk(R, [EDGE - .3 - n * .3, .02, z], C[o.s], 1, { s: [.24, .2, .24] }) });
      if (held.length) R.label([EDGE - .5, .3, h3 ? ZS[0] : -.4], h3 ? 'stream 0 waits for the lost packet' : 'every stream waits behind the lost packet', { fs: 12.5, b: 1, c: P.bad, dy: -26 });
      if (loss && e > .97) run.forEach(r => { const o = r[1]; R.label([sx(4) + .25, .1, ZS[o.s]], (R.W < 520 ? '' : '2nd token ') + (o.d > HELD ? '+' + Math.round(o.d) + ' ms' : 'on time'), { fs: 12, b: 1, c: o.d > HELD ? P.bad : P.good, al: 'left', dx: 6 }) });
    }
    // 5. the cost per token, both versions: the extra delay of every token in the loss run, as bars (rows streams, columns tokens)
    if (k === 4) {
      [['h2', -2.3, 'HTTP/2 over TCP'], ['h3', 2.3, 'HTTP/3 over QUIC']].forEach(([p, x0, nm]) => {
        R.glass([x0 - 1.25, .01, -1.0], [2.5, 0, 0], [0, 0, 2.0], { c: P.mute, nu: 5, nv: 3, th: .02 });
        R.label([x0, 0, 1.0], nm, { fs: 13, b: 1, dy: 18 });
        LOSS_ROWS[p].forEach(r => r.forEach(o => { const h = Math.max(.012, Math.max(0, o.d) / 70 * 1.5 * e), x = x0 - 1.0 + o.j * .5, z = -.66 + o.s * .66;
          R.box([x, .02, z], [.3, h, .3], { fill: mix(P.paper, o.d > HELD ? P.bad : C[o.s], o.d > HELD ? .75 : .45), shadow: false });
          if (o.d > 30) R.label([x, h + .02, z], '+' + Math.round(o.d) + ' ms', { fs: 12, b: 1, c: P.bad, dy: -10, a: e }) }));
      });
    }
  }
  const full = { cam: [.2, .68], bounds: [[-4.9, 0, -1.3], [4.9, 1.3, 1.4]] };
  S3.stage({ id: 'stg-loss', list: 'sx-loss', fig: 'Fig. 4 · one lost packet: HTTP/2 against HTTP/3', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 3600, hold: 4200, draw,
    margin: w => w < 520 ? [26, 8, 26, 8] : [36, 16, 32, 96],
    view: k => k === 4 ? { cam: [.3, .6], bounds: [[-3.8, 0, -1.2], [3.8, 1.6, 1.3]] } : full });
})();
