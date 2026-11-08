// ---- Scene: Fig. 2, what stands behind the seam (stg-dbl). The real test of section 5 (test_search_ignores_case: three seeded chats, search "trip"
// for ada, expect [1, 2]) with the connection passed in, wired in turn to a mock of the connection, SQLite in memory (a stand-in, the fake's role)
// and PostgreSQL. Rows, matches and results are the recorded run in experiments/integ (inputs/out_bug.txt: [2] on PostgreSQL, [1, 2] on SQLite);
// the fix is chats_repo_fixed.py (lower(title) LIKE lower(?)), green on both. The mock is the illustrative one of the page's text. ----
(function () {
  if (!document.getElementById('stg-dbl') || !window.TQK || !window.TQ) return;
  const { mix } = S3, { lab, block, win, seg, poly } = TQK;
  const TQ = window.TQ;
  const ROWS = [[1, 'ada', 'Trip planning for Lisbon'], [2, 'ada', 'trip budget spreadsheet'], [3, 'bob', 'Trip ideas']];
  // which rows each engine returns for owner ada and "%trip%": LIKE ignores ASCII case on SQLite and is case-sensitive on PostgreSQL
  const like = (title, ci) => ci ? title.toLowerCase().includes('trip') : title.includes('trip');
  const hits = ci => ROWS.filter(r => r[1] === 'ada' && like(r[2], ci)).map(r => r[0]);
  const RES = { sqlite: hits(true), pg: hits(false), fixed: hits(true) };
  TQN.dbl = { sqlite: '[' + RES.sqlite.join(', ') + ']', pg: '[' + RES.pg.join(', ') + ']', want: '[1, 2]' };
  const TEST = [-4.3, 0, 0], H = [-2.5, 0, 0], SX = -1.4, TX = 1.3;
  const T = [['mock', -1.8, 'mock of the connection'], ['sqlite', 0, 'SQLite in memory'], ['pg', 1.8, 'PostgreSQL ' + TQ.env.postgres]];
  const out = z => poly([[H[0] + .62, .34, 0], [SX, .44, 0], [SX + .5, .44, z * .35], [TX - .8, .3, z]], 8);
  const back = z => poly([[TX - .8, .5, z + .12], [SX + .5, .66, z * .35 + .1], [SX, .66, .1], [H[0] + .62, .52, .1]], 8);
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.5, 3.5, -3, 3, .5);
    const act = k === 1 ? 'mock' : k === 2 ? 'sqlite' : k === 3 ? 'pg' : null;
    // the test and the code under test, the seam between them and the dependency
    block(R, TEST, [1.15, .42, .72], P.c2, null, { amin: .7 }); lab(R, [TEST[0], .42, -.36], 'test_search_ignores_case', { mono: 1, fs: 12, b: 1, dy: -12, ph: 1 });
    block(R, H, [1.25, .62, .82], P.c1, null, { t: .35 }); lab(R, [H[0], 0, .41], 'search_chats(conn, ...)', { mono: 1, fs: 12, b: 1, dy: 14, ph: 1 });
    if (k === 0) R.flow(seg([TEST[0] + .58, .25, 0], [H[0] - .63, .3, 0], 8), { c: P.c2, r: .07, n: 5, speed: 1.1, a: Math.min(1, e * 2) });
    R.glass([SX, .08, -.5], [0, 0, 1.0], [0, .82, 0], { c: P.acc, a: k === 0 ? Math.min(1, .3 + e) : .55, nu: 3, nv: 3 });
    lab(R, [SX, .9, -.5], 'conn: the seam', { fs: 12, b: k === 0, c: P.acc, dy: -10, a: k === 0 ? 1 : .6, ph: k === 0 ? 1 : 0 });
    // the three things a test can put behind the seam
    T.forEach(([id, z, nm]) => {
      const on = act === id || (k === 4 && id !== 'mock'), a = k === 0 ? .55 : on ? 1 : .22;
      const col = id === 'mock' ? P.c5 : id === 'pg' ? P.c3 : P.c6;
      block(R, [TX, 0, z], [1.5, .34, 1.08], col, null, { a }); lab(R, [TX, .34, z - .54], nm, { dy: -12, fs: 12.5, b: on, c: on ? P.ink : P.mute, a: k === 0 || on ? 1 : .5, ph: on || k === 0 ? 1 : 0 });
      if (id === 'mock') {   // a mock keeps a call log, not rows
        R.glass([TX - .45, .36, z - .2], [.9, 0, 0], [0, .5, 0], { c: P.c5, a: a * .9, nu: 1, nv: 3 });
        if (act === 'mock') lab(R, [TX + .78, .5, z], 'assert_called_once_with(sql)', { al: 'left', dx: 8, mono: 1, fs: 12, c: P.c5, b: 1, a: win(e, .5, 1) });
        return;
      }
      const ci = id === 'sqlite' || k === 4, got = k === 4 ? RES.fixed : id === 'sqlite' ? RES.sqlite : RES.pg;
      ROWS.forEach(([rid, own, title], j) => {
        const rz = z - .32 + j * .32, m = on && got.indexOf(rid) >= 0, miss = on && !m && own === 'ada';
        R.box([TX, .34, rz], [1.2, .08, .22], { fill: m ? mix(P.paper, P.good, .7) : miss ? mix(P.paper, P.bad, .55) : P.paper, a: Math.max(a, .3), shadow: false, lw: .6 });
        if (on && k !== 4) lab(R, [TX + .9, .38, rz], rid + ' ' + title + (own === 'bob' ? ' (bob)' : '') + (m ? ': match' : miss ? ': missed' : ''), { al: 'left', dx: 8, fs: 12, c: m ? P.good : miss ? P.bad : P.mute, b: m || miss, grp: 'rows', a: win(e, .2, .6) });
      });
    });
    // the query goes out through the seam; the result comes back
    T.forEach(([id, z]) => {
      const on = act === id || (k === 4 && id !== 'mock'); if (!on) return;
      R.flow(out(z), { c: P.c2, r: .07, n: 14, speed: 1.4, a: win(e, 0, .3) });
      if (id !== 'mock') R.flow(back(z), { c: id === 'pg' && k === 3 ? P.bad : P.good, r: .07, n: 12, speed: 1.4, a: win(e, .35, .65) });
    });
    // the verdict, over the test
    const V = k === 1 ? ['passes: the call was made', P.good] : k === 2 ? ['passes, returns ' + TQN.dbl.sqlite + ': the bug ships', P.good]
      : k === 3 ? ['FAILS: assert ' + TQN.dbl.pg + ' == ' + TQN.dbl.want, P.bad] : k === 4 ? ['passes on both engines: ' + TQN.dbl.want, P.good] : null;
    if (V) lab(R, [TEST[0], .42, -.36], V[0], { fs: 12.5, b: 1, c: V[1], dy: -32, a: win(e, .55, 1), ph: 1 });
  }
  const full = { cam: [.18, .74], bounds: [[-4.9, 0, -2.4], [3.4, .8, 2.4]] };
  S3.stage({ id: 'stg-dbl', list: 'sx-dbl', fig: 'Fig. 2 · what a test proves depends on what stands behind the seam', cam: full.cam, bounds: full.bounds, aspect: .48, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [30, 8, 14, 8] : [40, 18, 20, 18] });
})();
