// ---- Scene: Fig. 2 (stg-lb): the same traffic through four balancing policies. Steps 1 to 4 replay the page's simulation (CP.lbSim, the same
// code as the Load-test lab and src/model.py: 8 servers, one request at a time each, exponential work, Poisson arrivals at 90% of capacity, seed 11)
// in four stretches of 10 mean service times; every dot is one simulated request travelling from the balancer to the server it was sent to, and
// every stack is that server's requests (in service plus waiting) at that moment. Step 5 is Experiment 3's measured p99 at 96% busy (CPD.lb). ----
(function () {
  if (!document.getElementById('stg-lb') || !window.CPK) return;
  const { mix } = S3, { lab, party, bar, req, seg, win, arcPts } = CPK;
  const n = 8, rho = .9, N = 420, SEED = 11, FR = []; for (let i = 0; i <= 80; i++) FR.push(i * .5);
  const W = [[0, 10], [10, 20], [20, 30], [30, 40]], FLY = .5, CAPV = 11;
  // the same simulation as CP.lbSim, keeping which server each request went to (src/check_stages.mjs checks it returns CP.lbSim's latencies)
  function trace(pol) {
    const lam = rho * n, rnd = CP.mulberry32(SEED), pick = CP.mulberry32(SEED + 7919), deps = [], head = [], arr = [], srv = [], soj = [];
    for (let k = 0; k < n; k++) { deps.push([]); head.push(0); }
    let rr = -1, t = 0;
    for (let j = 0; j < N; j++) {
      t += -(1 / lam) * Math.log(1 - rnd()); const s = CP.service(rnd, 'exp', 1, 2);
      for (let k = 0; k < n; k++) { const dk = deps[k]; while (head[k] < dk.length && dk[head[k]] <= t) head[k]++; }
      let k;
      if (pol === 'random') k = Math.floor(pick() * n);
      else if (pol === 'rr') { rr = (rr + 1) % n; k = rr; }
      else if (pol === 'p2c') { const a = Math.floor(pick() * n); let b = Math.floor(pick() * (n - 1)); if (b >= a) b++; k = (deps[a].length - head[a] <= deps[b].length - head[b]) ? a : b; }
      else { k = 0; let best = deps[0].length - head[0]; for (let i = 1; i < n; i++) { const q = deps[i].length - head[i]; if (q < best) { k = i; best = q; } } }
      const last = deps[k].length ? deps[k][deps[k].length - 1] : 0, start = last < t ? t : last; deps[k].push(start + s);
      arr.push(t); srv.push(k); soj.push(start + s - t);
    }
    const fr = CP.lbSim({ n, rho, policy: pol, N, warm: 0, seed: SEED, dist: 'exp', frames: FR }).frames;
    return { arr, srv, soj, fr };
  }
  const runs = {}; const run = p => runs[p] || (runs[p] = trace(p));
  // what the step lists quote, per stretch: snapshots with an idle server while another queues, the longest queue, the most requests waiting at once;
  // and, at t = 40, the mean and p99 of the requests finished so far (in mean service times)
  function stats(p) { const r = run(p); return W.map(([a, b]) => { let idleq = 0, longest = 0, waiting = 0;
      for (let i = a * 2 + 1; i <= b * 2; i++) { const f = r.fr[i]; if (f.some(v => v === 0) && f.some(v => v > 1)) idleq++; longest = Math.max(longest, ...f); waiting = Math.max(waiting, f.reduce((s, v) => s + Math.max(0, v - 1), 0)); }
      return { idleq, longest, waiting }; }); }
  function finished(p) { const r = run(p), xs = r.arr.map((a, j) => [a + r.soj[j], r.soj[j]]).filter(d => d[0] <= 40).map(d => d[1]).sort((a, b) => a - b); return { n: xs.length, mean: CP.mean(xs), p99: CP.pct(xs, .99) }; }
  const NAMES = { random: 'random', rr: 'round robin', p2c: 'two choices', lor: 'least outstanding' }, ORDER = ['random', 'rr', 'p2c', 'lor'];
  const M96 = ORDER.map(p => CPD.lb.find(x => x.policy === p && !x.slow_server && x.tag.indexOf('lb90') === 0));
  window.CAP_LB = { trace, stats, finished, M96, NAMES };   // read by src/check_stages.mjs
  let pol = 'random';
  const X = i => (i - (n - 1) / 2) * 1.0, ZS = -.8, BAL = [0, 0, 1.9], CS = .21, GAP = .235;
  function draw(R, k, e) {
    const P = R.P, r = run(pol); R.grid(-4.8, 4.8, -2, 3, .5);
    const fade = k === 4 ? Math.max(0, 1 - e * 2.2) : 1, L4 = k < 4;
    const t = k < 4 ? W[k][0] + (W[k][1] - W[k][0]) * e : 40, fi = Math.min(80, Math.floor(t * 2 + 1e-9)), q = r.fr[fi] || r.fr[80];
    // the balancer and the arrivals feeding it
    if (fade > .02) party(R, BAL, [1.1, .45, .6], P.c5, L4 ? 'balancer' : null, { sub: L4 ? NAMES[pol] : null, t: .3, a: fade });
    if (L4) R.flow(seg([-4.6, .2, 2.6], [BAL[0] - .6, .2, BAL[2] + .1], 14), { c: P.c2, r: .065, n: 2.2, speed: 1.2 });
    if (L4) lab(R, [-4.6, .2, 2.6], '7.2 requests per S', { fs: 12, c: P.mute, al: 'left', dx: 4, dy: -12, wide: 1, a: fade });
    // eight servers, each with its stack: the bottom cube is in service, the rest wait (red once six or more are queued)
    for (let i = 0; i < n; i++) { const x = X(i), m = q[i];
      R.box([x, 0, ZS], [.66, .14, .66], { fill: mix(P.paper, P.c1, .35), a: Math.max(.12, fade) });
      if (L4) lab(R, [x, 0, ZS + .38], 'S' + (i + 1), { fs: 12, c: P.mute, dy: 14, grp: 'srv' });
      const vis = fade > .02 ? Math.min(m, CAPV) : 0;
      for (let s = 0; s < vis; s++) req(R, [x, .14 + s * GAP, ZS], s === 0 ? mix(P.paper, P.c1, .85) : m >= 6 ? mix(P.paper, P.bad, .75) : mix(P.paper, P.c2, .7), fade, CS);
      if (m > CAPV && L4) lab(R, [x, .14 + CAPV * GAP, ZS], '+' + (m - CAPV), { fs: 12, b: 1, c: P.bad, dy: -8, a: fade });
      if (m === 0 && k < 4) lab(R, [x, .14, ZS], 'idle', { fs: 12, c: P.mute, dy: -6, a: fade, wide: 1 });
    }
    // every request sent in the last half service time, flying from the balancer to its server
    if (k < 4) for (let j = 0; j < r.arr.length; j++) { const a = r.arr[j]; if (a > t) break; if (a < t - FLY) continue;
      const u = (t - a) / FLY, p = R.arcPt([BAL[0], .45, BAL[2] - .3], [X(r.srv[j]), .3 + Math.min(q[r.srv[j]], CAPV) * GAP, ZS], .8, u);
      R.glow(p, .2, { c: P.c2, a: .55 }); R.ball(p, .075, { c: P.c2 }); }
    if (k < 4) lab(R, [BAL[0] + .6, .45, BAL[2]], 't = ' + t.toFixed(1) + ' S', { fs: 12.5, b: 1, mono: 1, c: P.ink, al: 'left', dx: 10, dy: -4 });
    // step 5: the measured p99 at 96% busy, eight real server processes, all four policies
    if (k === 4) { const a = Math.min(1, e * 1.6);
      M96.forEach((m, i) => { const on = ORDER[i] === pol, x = (i - 1.5) * 1.5;
        bar(R, [x, 0, .4], m.p99 / 1000 * 1.2, on ? P.bad : P.c1, a * (on ? 1 : .55), NAMES[ORDER[i]] + ' ' + (m.p99 >= 1000 ? (m.p99 / 1000).toFixed(2) + ' s' : Math.round(m.p99) + ' ms'), { w: .75, d: .75, t: on ? .8 : .55, fs: 12.5, grp: 'm', dy: -18 }); });
      lab(R, [0, 0, 1.25], 'Experiment 3, measured p99 at 96% busy', { fs: 12.5, b: 1, c: P.mute, dy: 14, a, wide: 1 }); }
  }
const narrow = () => (document.getElementById('stg-lb').clientWidth || 999) < 520;   // a phone: turn the long axis into depth and look down, so the scene fills the tall card
  const phone = { cam: [.42, .9], bounds: [[-4.2, 0, -1.1], [4.2, 1.6, 2.3]] };
  const full = { cam: [.18, .62], bounds: [[-4.8, 0, -1.3], [4.8, 2.4, 2.8]] };
  const st = S3.stage({ id: 'stg-lb', list: 'sx-lb-random', fig: 'Fig. 2 · one simulated run, four ways to split it', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 5200, hold: 3000, draw,
    margin: w => w < 520 ? [16, 8, 12, 8] : [22, 14, 16, 14],
    view: k => narrow() && k < 4 ? phone : k === 4 ? { cam: [.22, .42], bounds: [[-3.2, 0, -.2], [3.2, 2.1, 1.3]] } : full });
  const chips = document.getElementById('lb-mode');
  if (chips) chips.addEventListener('click', ev => { const b = ev.target.closest('button[data-m]'); if (!b) return; pol = b.dataset.m;
    chips.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('ol.sx[id^="sx-lb-"]').forEach(o => o.hidden = o.id !== 'sx-lb-' + pol); st.list('sx-lb-' + pol); });
})();
