// ---- Scene: Fig. 4 (stg-pool): sizing a connection pool. Step 1 is Little's law for the chat API's busy-hour reads (3,472 a second x 1 ms =
// 3.47 connections busy on average); steps 2 to 4 give the pool 6, 8 and 10 connections and send the share of queries that find every connection
// busy (Erlang C, CPD.pool, the table under the figure) into a waiting line; the bars keep each pool size's share for comparison. ----
(function () {
  if (!document.getElementById('stg-pool') || !window.CPK) return;
  const { mix } = S3, { lab, party, bar, req, seg, win } = CPK;
  const A = 3.4722, CS = [null, 6, 8, 10], MAXS = 10;
  const wait = c => CPD.pool[String(c)];
  window.CAP_POOL = { A, CS, wait: CS.map(c => c == null ? null : wait(c)) };   // read by src/check_stages.mjs
  const APP = [-3.3, 0, 0], PL = [-.4, 0, 0], PG = [2.3, 0, -.2], BARZ = 1.15;
  const sl = i => [PL[0] - .8 + (i % 5) * .4, .36, PL[2] - .25 + Math.floor(i / 5) * .5];
  function draw(R, k, e) {
    const P = R.P; R.grid(-5, 5.2, -2, 2, .5);
    const c = CS[k] || MAXS, C = k ? wait(c) : 0;
    party(R, APP, [1.0, .8, 1.0], P.c1, 'chat API', { sub: '3,472 reads/s' });
    party(R, PG, [1.1, 1.0, 1.1], P.c3, 'Postgres', { sub: '1 ms per read', t: .35 });
    // the pool: a glass tray with one socket per connection; sockets beyond the pool size are faint
    R.glass([PL[0] - 1.05, .3, PL[2] - .6], [2.1, 0, 0], [0, 0, 1.2], { c: P.c3, a: .5, nu: 5, nv: 2 });
    lab(R, [PL[0], .3, PL[2] - .6], k ? 'pool of ' + c : 'connections busy', { fs: 13, b: 1, c: P.c3, dy: -16 });
    const busy = A;   // the mean number busy is 3.47 whatever the pool size; the pool size only changes how often all are taken
    for (let i = 0; i < MAXS; i++) { const p = sl(i), inPool = i < c, b = i < Math.floor(busy) ? 1 : i < busy ? busy - Math.floor(busy) : 0;
      R.box(p, [.3, .2, .3], { fill: b ? mix(P.paper, P.c3, .4 + .45 * b) : P.paper, a: inPool ? (k === 0 ? 1 : 1) : .12, shadow: false, lw: .6 });
      if (b && inPool) R.line([[p[0], p[1] + .2, p[2]], [PG[0] - .6, .5 + i * .05, PG[2]]], { c: P.c3, w: 1, a: .35 * b }); }
    R.flow(seg([PL[0] + 1.05, .45, 0], [PG[0] - .6, .55, PG[2]], 10), { c: P.c3, r: .06, n: 2.6, speed: 1.4 });
    // arrivals: most find a free connection; a share C finds all busy and waits in line first
    R.flow(seg([APP[0] + .5, .35, 0], [PL[0] - 1.05, .38, 0], 12), { c: P.c1, r: .075, n: 2.4, speed: 1.3 });
    if (k) { const nq = Math.round(C * 20);
      for (let i = 0; i < Math.max(1, nq); i++) req(R, [PL[0] - 1.3 - i * .26, 0, .85], mix(P.paper, P.bad, .7), (nq ? 1 : .15) * win(e, i * .1, .2 + i * .1));
      R.flow(seg([APP[0] + .5, .2, .4], [PL[0] - 1.25, .12, .85], 10), { c: P.bad, r: .075, n: .1 + 6 * C, speed: 1.0, a: win(e, .2, .5) });
      lab(R, [PL[0] - 1.6, 0, .85], (C * 100).toFixed(1) + '% wait', { fs: 12.5, b: 1, c: P.bad, dy: 18, wide: 1, a: win(e, .3, .6) }); }
    // the share that waits, per pool size (bars kept from earlier steps)
    for (let j = 1; j <= 3; j++) { const a = j < k ? .55 : j === k ? 1 : 0; if (!a) continue; const x = 3.8 + (j - 1) * 1.0;
      bar(R, [x, 0, BARZ], wait(CS[j]) * 6 * (j === k ? win(e, .1, .6) : 1), P.bad, a, CS[j] + ': ' + (wait(CS[j]) * 100).toFixed(1) + '%', { w: .4, d: .4, fs: 12.5, mono: 1, grp: 'w' }); }
    if (k) lab(R, [4.8, 0, BARZ + .35], 'queries that wait', { fs: 12, c: P.mute, dy: 16, wide: 1 });
  }
const narrow = () => (document.getElementById('stg-pool').clientWidth || 999) < 520;   // a phone: turn the long axis into depth and look down, so the scene fills the tall card
  const phone = { cam: [1.0, .95], bounds: [[-4.0, 0, -1.2], [6.0, 1.5, 1.7]] };
  const full = { cam: [.3, .62], bounds: [[-4.0, 0, -1.2], [6.0, 1.5, 1.7]] };
  S3.stage({ id: 'stg-pool', list: 'sx-pool', fig: 'Fig. 4 · a few connections carry the whole product', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [24, 8, 14, 8] : [34, 16, 18, 16], view: () => narrow() ? phone : full });
})();
