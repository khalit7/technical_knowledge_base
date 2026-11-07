// ---- Scene: Fig. 3 (stg-cache): what a cache does to the database. Steps 1 to 3 use the hit-rate widget's defaults (the root's Step 2 example:
// 1,000 reads a second, a database that serves 600 at 100%) through CP.cacheBackend (the database sees (1 - h) x reads); steps 4 and 5 are
// Facebook's measured peaks for one hot key's misses without and with leases (17K and 1.3K queries a second, Nishtala et al., quoted on Caching). ----
(function () {
  if (!document.getElementById('stg-cache') || !window.CPK) return;
  const { mix } = S3, { lab, party, bar, req, seg, win, arcPts, fmt } = CPK;
  const L = 1000, CAP = 600, HS = [.9, .99, 0], FB = [17000, 1300];
  const db = k => CP.cacheBackend(L, HS[k]);
  window.CAP_CACHE = { L, CAP, HS, FB, db: [0, 1, 2].map(db) };   // read by src/check_stages.mjs
  const APP = [-3.0, 0, .1], CA = [-.2, 0, -.2], DB = [2.6, 0, -.3], DBB = [4.1, 0, .3], U = 1.0 / CAP;
  function draw(R, k, e) {
    const P = R.P; R.grid(-5, 5.4, -2.2, 2.2, .5);
    const ka = k <= 2 ? k : 2, h = k <= 2 ? HS[k] : .99, dbr = k <= 2 ? db(k) : 0, stamp = k >= 3;
    party(R, APP, [1.0, .8, 1.0], P.c1, 'chat API', { sub: fmt(L) + ' reads/s' });
    // the cache: a block with its keys as cubes on a glass plate; the hot key glows, and disappears when it expires
    const empty = k === 2;
    party(R, CA, [1.2, .5, 1.2], P.c6, 'cache', { sub: k <= 2 ? (empty ? 'restarted: empty' : Math.round(h * 100) + '% hits') : 'one hot key expires', t: .3, ly: .3 });
    R.glass([CA[0] - .6, .52, CA[2] - .6], [1.2, 0, 0], [0, 0, 1.2], { c: P.c6, a: .55, nu: 4, nv: 4 });
    for (let i = 0; i < 16; i++) { const x = CA[0] - .45 + (i % 4) * .3, z = CA[2] - .45 + Math.floor(i / 4) * .3, hot = i === 5;
      const a = empty ? 1 - win(e, 0, .5) : hot && stamp ? (k === 3 ? 1 - win(e, 0, .25) : win(e, .6, 1)) : 1;
      req(R, [x, .55, z], hot ? mix(P.paper, P.c2, .85) : mix(P.paper, P.c6, .6), a * (k === 2 && e >= .5 ? 0 : 1), .14); }
    // reads going to the cache, hits coming back
    R.flowArc([APP[0] + .5, .55, APP[2] - .15], [CA[0] - .6, .55, CA[2] - .1], .5, { c: P.c1, r: .075, n: 3, speed: 1.3 });
    if (!empty && !stamp) R.flowArc([CA[0] - .6, .4, CA[2] + .25], [APP[0] + .5, .35, APP[2] + .3], .25, { c: P.c6, r: .075, n: 3 * h, speed: 1.3 });
    // misses going through to the database: density follows the miss rate
    if (k <= 2) { const miss = 1 - h;
      R.flowArc([CA[0] + .6, .35, CA[2]], [DB[0] - .55, .45, DB[2]], .45, { c: dbr > CAP ? P.bad : P.c2, r: .08, n: .25 + 3.2 * miss, speed: 1.3 });
      // the database's load as a bar against its capacity
      const hh = dbr * U * (k === ka ? 1 : 1); bar(R, DBB, hh, dbr > CAP ? P.bad : P.c3, 1, fmt(dbr) + ' reads/s · ' + Math.round(dbr / CAP * 100) + '%', { w: .5, d: .5, fs: 12.5, mono: 1, al: 'left', dx: -12 });
      R.line([[DBB[0] - .45, .05 + CAP * U, DBB[2] - .35], [DBB[0] + .45, .05 + CAP * U, DBB[2] + .35]], { c: P.ink, w: 1.4, dash: [5, 4] });
      lab(R, [DBB[0] + .45, .05 + CAP * U, DBB[2] + .35], 'capacity ' + CAP, { fs: 12, c: P.mute, al: 'left', dx: 6, wide: 1 });
      if (dbr > CAP) for (let i = 0; i < 8; i++) req(R, [DB[0] - .9 - (i % 4) * .22, 0, DB[2] + .5 - Math.floor(i / 4) * .25], mix(P.paper, P.bad, .7), win(e, .2 + i * .07, .3 + i * .07)); }
    party(R, DB, [1.1, 1.0, 1.1], P.c3, 'database', { sub: k <= 2 ? 'sized for the misses' : '', t: dbr > CAP ? .5 : .3, lc: dbr > CAP ? P.bad : P.ink });
    // steps 4 and 5: a hot key expires; without protection every miss rebuilds it at once, with leases one rebuild runs and the rest wait
    if (stamp) {
      if (k === 3) for (let i = 0; i < 9; i++) R.flowArc([APP[0] + .4, .7, APP[2] - .4 + i * .1], [DB[0] - .5, .6 + (i % 3) * .1, DB[2] - .2 + (i % 3) * .2], .9 + i * .05, { c: P.bad, r: .06, n: 2.2, speed: 1.6, a: win(e, i * .04, .3 + i * .04) });
      else { R.flowArc([CA[0] + .6, .45, CA[2]], [DB[0] - .55, .5, DB[2]], .45, { c: P.c2, r: .07, n: 1.2, speed: 1.2 });
        for (let i = 0; i < 6; i++) req(R, [CA[0] - .4 + (i % 3) * .4, 0, CA[2] + .9 + Math.floor(i / 3) * .25], mix(P.paper, P.c2, .6), win(e, .1 + i * .05, .2 + i * .05));
        lab(R, [CA[0] - .3, 0, CA[2] + 1.2], 'the rest wait for the one rebuild', { fs: 12, c: P.c2, b: 1, dy: 14, al: 'right', dx: 10, a: win(e, .3, .6), wide: 1 }); }
      const u = 1.5 / FB[0];
      bar(R, [DBB[0] - .35, 0, DBB[2]], FB[0] * u * (k === 3 ? win(e, .1, .7) : 1), P.bad, k === 3 ? 1 : .55, '17K/s, no leases', { w: .45, d: .45, fs: 12.5, grp: 'fb', al: 'left', dx: -12 });
      if (k === 4) bar(R, [DBB[0] + .45, 0, DBB[2]], FB[1] * u * win(e, .2, .7), P.good, 1, '1.3K/s, leases', { w: .45, d: .45, fs: 12.5, grp: 'fb', al: 'left', dx: -12 });
      }
  }
const narrow = () => (document.getElementById('stg-cache').clientWidth || 999) < 520;   // a phone: turn the long axis into depth and look down, so the scene fills the tall card
  const phone = { cam: [1.0, .95], bounds: [[-3.8, 0, -1.2], [5.0, 1.8, 1.6]] };
  const full = { cam: [.32, .6], bounds: [[-3.8, 0, -1.2], [5.4, 1.8, 1.6]] };
  S3.stage({ id: 'stg-cache', list: 'sx-cache', fig: 'Fig. 3 · the database is sized for the misses', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [24, 8, 12, 8] : [34, 16, 16, 16], view: () => narrow() ? phone : full });
})();
