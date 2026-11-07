// ---- Scene: Fig. 4 (stg-conc): 50 concurrent requests, each waiting 500 ms, under four handler styles, replayed from the recording
// (API_DATA.runs.styles: send and answer time of every request and, with four workers, which worker answered it; run_experiments.py,
// 2026-10-24). Each step plays a stretch of the run's own clock. Where each request waits is the recorded executor; with plain def, the
// ten requests answered a wave later are drawn waiting for a thread until about 500 ms before their answer (inferred from the answer times). ----
(function () {
  if (!document.getElementById('stg-conc') || !window.BAK || !window.API_DATA) return;
  const { mix, cl } = S3, { party, ring, win, seg, clock, at, chips, fmt , lab } = BAK;
  const S = window.API_DATA.runs.styles, KEY = { blocking: 'async_blocking', await: 'async_await', def: 'plain_def', w4: 'async_blocking_4_workers' };
  let mode = 'blocking';
  const last = (m, n) => S[KEY[m]].req.map(r => r[1]).sort((a, b) => a - b)[n];
  const sendEnd = m => Math.max(...S[KEY[m]].req.map(r => r[0]));
  // the stretches of each run, in its own milliseconds: [from, to]
  // a stretch that ends on an event runs on a little after it (x), so the last arrivals have time to land
  const x = (a, b) => [a, Math.ceil(b + (b - a) * .18)];
  function stretches(m) { const s = Math.ceil(sendEnd(m)), a0 = Math.floor(last(m, 0)) - 6, end = Math.ceil(S[KEY[m]].wall_ms), A = x(0, s);
    if (m === 'def') { const B = x(a0, last(m, 39)); return [A, [A[1], a0], B, x(B[1], end)] }
    if (m === 'w4') { const ends = [1, 2, 3, 4].map(w => Math.max(...S[KEY[m]].req.filter(r => r[2] === w).map(r => r[1]))).sort((a, b) => a - b), B = x(A[1], ends[0]);
      return [A, B, x(B[1], end)] }
    return [A, [A[1], a0], x(a0, end)] }
  window.BA_CONC = { stretches, last, KEY };   // read by src/check_stages.mjs
  const CLI = [-4.8, 0, 0], TRAY = [4.1, 0, 0];
  const grid = (c, i, cols, dx, dz, y) => [c[0] - (cols - 1) * dx / 2 + (i % cols) * dx, y, c[2] - 2 * dz + Math.floor(i / cols) * dz];
  // the waiting place of request i (its index in send order) for the current mode, and the keyframes of its trip
  function plan(m) { const R0 = S[KEY[m]].req, n = R0.length, rank = R0.map((r, i) => i).sort((a, b) => R0[a][1] - R0[b][1]), order = []; rank.forEach((i, r) => order[i] = r);
    const perW = [0, 0, 0, 0, 0];
    return R0.map((r, i) => { const home = grid(CLI, i, 10, .2, .3, .1), tray = grid(TRAY, order[i], 10, .2, .3, .1); let wait, extra = null;
      if (m === 'def') { const r9 = order[i]; if (r9 < 40) wait = [-.7 + (r9 % 8) * .2, .38, -.8 + Math.floor(r9 / 8) * .4];
        else { const q = r9 - 40; wait = [-2.1, .1, -1.35 + q * .3]; const free = rank[q], t = r[1] - 500; extra = [t, [-.7 + (q % 8) * .2, .38, -.8 + Math.floor(q / 8) * .4], free] } }
      else if (m === 'w4') { const w = r[2], j = perW[w]++; wait = [-.6 + (j % 5) * .3, .22, -2.85 + (w - 1) * 1.9 - .45 + Math.floor(j / 5) * .3] }
      else wait = grid([0, 0, 0], i, 10, .22, .34, .22);
      const kf = [[-1e9, home], [r[0], wait]]; if (extra) kf.push([extra[0], extra[1]]); kf.push([r[1], tray]); return kf; }) }
  let PLAN = plan(mode);
  function draw(R, k, e) {
    const P = R.P, W = stretches(mode), t = clock(W, k, e), fl = e >= 1 ? 1e-6 : (W[k][1] - W[k][0]) * .14, R0 = S[KEY[mode]].req;
    R.grid(-5.8, 5.2, -3.6, 3.6, .5);
    R.box(CLI, [2.3, .06, 1.7], { fill: mix(P.paper, P.c2, .12), dz: 60 }); lab(R, [CLI[0], 0, CLI[2] + .85], 'client · 50 requests', { b: 1, fs: 12.5, dy: 14, c: P.c2 });
    R.box(TRAY, [2.3, .06, 1.7], { fill: mix(P.paper, P.c3, .12), dz: 60 }); lab(R, [TRAY[0], 0, TRAY[2] + .85], 'answered', { b: 1, fs: 12.5, dy: 14, c: P.c3 });
    // the executors: one worker process with its event loop; or its 40 threads; or four worker processes
    if (mode === 'w4') { [1, 2, 3, 4].forEach(w => { const z = -2.85 + (w - 1) * 1.9, n = R0.filter(r => r[2] === w).length;
        R.box([0, 0, z], [1.9, .12, 1.4], { fill: mix(P.paper, P.c1, .22), dz: 60 }); lab(R, [1.0, .12, z], 'worker ' + w + ' · ' + n, { b: 1, fs: 12, al: 'left', dx: 8, c: P.c1, wide: 1 });
        ring(R, [0, .14, z], .78, P.bad, .5, { w: 1.6, dash: [3, 4] }); }); }
    else { R.box([0, 0, 0], [2.6, .12, 2.0], { fill: mix(P.paper, P.c1, .22), dz: 60 }); lab(R, [0, .12, -1.0], mode === 'def' ? 'one worker · 40 threads' : 'one worker · one event loop', { b: 1, fs: 12.5, dy: -16, c: P.c1 });
      const blocked = mode === 'blocking';
      if (mode !== 'def') ring(R, [0, .14, 0], 1.25, blocked ? P.bad : P.c6, .9, { w: 2.2, flow: !blocked && t < S[KEY[mode]].wall_ms, n: 14, dash: blocked ? [3, 4] : null });
      if (mode === 'def') { for (let q = 0; q < 40; q++) R.box([-.7 + (q % 8) * .2, .12, -.8 + Math.floor(q / 8) * .4], [.1, .2, .1], { fill: mix(P.paper, P.c6, .45), shadow: false, lw: .5 });
        lab(R, [-2.1, .1, -1.35], 'waiting for a thread', { fs: 12, b: 1, c: P.c2, dy: -16, wide: 1 }); }
      if (blocked) lab(R, [0, .14, 1.25], 'loop stuck in time.sleep', { fs: 12, b: 1, c: P.bad, dy: 16, wide: 1 }); }
    // every request where the recording says it is at time t
    let waiting = 0, done = 0;
    PLAN.forEach((kf, i) => { const r = R0[i], p = at(R, kf, t, fl, .5), st = t < r[0] ? 0 : t < r[1] ? 1 : 2; if (st === 1) waiting++; if (st === 2) done++;
      const c = mode === 'w4' && st >= 1 ? [P.c1, P.c2, P.c4, P.c5][r[2] - 1] : st === 2 ? P.c3 : P.c2;
      R.ball(p, .09, { c, a: st === 0 ? .55 : 1 }); });
    // arrivals and answers stream along their paths while they happen
    const inR = R0.filter(r => r[0] <= t && r[0] > W[k][0] - 1).length, outR = R0.filter(r => r[1] <= t && r[1] > W[k][0]).length;
    if (inR && t <= W[0][1] + 1) R.flow(seg([CLI[0] + 1.2, .2, 0], [-1.4, .2, 0], 16), { c: P.c2, r: .07, n: 8, speed: 1.6, a: .9 });
    if (outR && k > 0) R.flow(seg([1.4, .2, 0], [TRAY[0] - 1.2, .2, 0], 16), { c: P.c3, r: .07, n: 8, speed: 1.6, a: .9 });
    lab(R, [CLI[0], .5, -2.3], 't = ' + fmt(t) + ' ms', { fs: 15, b: 1, mono: 1, c: P.ink });
    lab(R, [CLI[0], .5, -2.3], 'waiting ' + waiting + ' · answered ' + done + ' of 50', { fs: 12.5, mono: 1, c: P.mute, dy: 20 });
    sum(mode);
  }
  // the summary under the stage: time until all 50 were answered, four styles on one scale
  const SUMEL = document.getElementById('rd-sty-sum'), NAME = { blocking: 'async def + time.sleep', await: 'async def + await', def: 'plain def, thread pool', w4: 'blocking, 4 workers' };
  let sumKey = '';
  function sum(m) { if (!SUMEL) return; const W = RD.width(SUMEL), key = m + W; if (key === sumKey) return; sumKey = key;
    const pad = 4, lab = W < 520 ? 0 : 170, x0 = pad + lab, x1 = W - pad - 70, mx = Math.max(...Object.values(KEY).map(k => S[k].wall_ms)); let s = '';
    const ms = x => x >= 1000 ? (x / 1000).toFixed(x >= 10000 ? 1 : 2) + ' s' : Math.round(x) + ' ms';
    Object.keys(KEY).forEach((k, i) => { const y = (lab ? 4 : 16) + i * (lab ? 22 : 36), w = Math.max(2, (x1 - x0) * S[KEY[k]].wall_ms / mx);
      s += (lab ? RD.t(pad, y + 12, NAME[k], { fs: 12, fill: 'var(--ink)', w: k === m ? 600 : 400 }) : RD.t(pad, y - 3, NAME[k], { fs: 12, fill: 'var(--ink)', w: k === m ? 600 : 400 }));
      s += '<rect x="' + x0 + '" y="' + y + '" width="' + w + '" height="14" rx="2" fill="' + (k === m ? 'var(--acc)' : 'var(--mute)') + '" opacity="' + (k === m ? 1 : .5) + '"/>' + RD.t(x0 + w + 5, y + 11, ms(S[KEY[k]].wall_ms), { fs: 12, fill: 'var(--ink)' }) });
    SUMEL.innerHTML = RD.svg(W, (lab ? 8 : 20) + 4 * (lab ? 22 : 36), s, 'Time until all 50 requests were answered, four styles on one scale') }
  const st = S3.stage({ id: 'stg-conc', list: 'sx-conc-blocking', fig: 'Fig. 4 · 50 requests, each waiting 500 ms', cam: [.32, .64], bounds: [[-5.6, 0, -3.6], [5.0, .6, 3.6]], aspect: .58, dur: 2600, hold: 4400, draw,
    margin: w => w < 520 ? [20, 8, 12, 8] : [26, 14, 16, 14] });
  chips(document.getElementById('conc-mode'), 'sx-conc-', st, m => { mode = m; PLAN = plan(m); sumKey = ''; });
  RD.onResize(() => { sumKey = ''; sum(mode) }); RD.onRender(() => { sumKey = ''; sum(mode) });
})();
