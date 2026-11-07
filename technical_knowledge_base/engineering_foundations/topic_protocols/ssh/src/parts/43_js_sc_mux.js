// ---- Scene: Fig. 7, multiplexing (stg-mux): one master connection to gpu-node-01 through the bastion, a control socket on the laptop, and
// later commands as channels on the master. Data: the recorded runs with 40 ms added between laptop and bastion (SSHD.mux: ten fresh
// logins, the first multiplexed login, nine reuses) and the master's exit (SSHD.logs.mux_exit). The three channel names are illustrative. ----
(function () {
  if (!document.getElementById('stg-mux') || !window.S3 || !window.SSK || !window.SSHD) return;
  const { mix } = S3, { party, slab, plate, bar, cross, win, route } = SSK, M = SSHD.mux;
  const fresh = M['gpu-node-01 via bastion, fresh each time'].runs_ms.slice(0, 10), first = M['gpu-node-01 first (creates master)'].ms,
    reuse = M['gpu-node-01 via existing master'].runs_ms.slice(0, 9), medF = M['gpu-node-01 via bastion, fresh each time'].median_ms, medR = M['gpu-node-01 via existing master'].median_ms;
  const lane = [first].concat(reuse), sum = a => a.reduce((x, y) => x + y, 0);
  const ex = (SSHD.logs.mux_exit || '').match(/exit (\d+) after (\d+) ms/) || [null, '?', '?'];
  window.SSH_MUX = { first: Math.round(first), medF: Math.round(medF), medR: Math.round(medR), totF: (sum(fresh) / 1000).toFixed(1), totM: (sum(lane) / 1000).toFixed(1), exitCode: ex[1], exitMs: ex[2] };   // read by src/check_stages.mjs
  const LAP = [-4.6, 0, -.6], BAS = [0, 0, -.6], NODE = [4.4, 0, -.6], SOCK = [-5.75, 0, .5];
  const X0 = LAP[0] + .8, X1 = BAS[0] - .85, X2 = BAS[0] + .85, X3 = NODE[0] - .7;
  const CL = [[-4.6, 0, 1.45], [-3.7, 0, 1.45], [-2.8, 0, 1.45]];   // three local client processes
  function master(R, a, c, nolab) { const P = R.P;
    slab(R, X0, X1, .4, LAP[2], .9, c || P.c1, a, { lab: nolab ? null : 'master: laptop to bastion', grp: 'ses', at: [X0, .4, LAP[2] + .45] });
    slab(R, X2, X3, .4, LAP[2], .7, c || P.good, a * .9, { lab: nolab ? null : 'inner session to the node', grp: 'ses', at: [X2, .4, LAP[2] + .35], lc: c || P.good }); }
  const chan = (z) => route([[X0, .47, LAP[2] + z], [X1, .47, LAP[2] + z], [BAS[0], 1.15, LAP[2] + z], [X2, .47, LAP[2] + z], [X3, .47, LAP[2] + z]], 8);
  function draw(R, k, e) {
    const P = R.P, barsOn = k === 3;
    R.grid(-6.2, 6, -2.2, 4.4, .5);
    const fade = barsOn ? .25 : 1;
    party(R, LAP, [1.6, .9, 1.2], P.c1, 'laptop', { a: fade });
    party(R, BAS, [1.7, .95, 1.2], P.c2, 'bastion', { a: fade });
    party(R, NODE, [1.4, .8, 1.1], P.c3, 'gpu-node-01', { a: fade });
    const dead = k === 4;
    master(R, k === 0 ? win(e, 0, .5) : (barsOn ? .2 : dead ? 1 - .7 * win(e, .2, .6) : 1), dead ? P.bad : null, barsOn);
    plate(R, SOCK, P.c5, k === 0 ? win(e, .5, .9) : fade, k === 3 ? null : 'control socket cm/%C', { w: .42, h: .36, glow: P.c5, mono: 1 });
    if (k === 0) { R.flow(route([[X0, .48, LAP[2] - .25], [X1, .48, LAP[2] - .25]]), { c: P.c1, r: .06, n: 7, speed: 1.2, a: win(e, 0, .4) });
      R.flow(route([[X2, .48, LAP[2] - .2], [X3, .48, LAP[2] - .2]]), { c: P.good, r: .06, n: 7, speed: 1.2, a: win(e, .3, .6) });
      R.label([BAS[0], 1, LAP[2]], 'first command: two full logins · ' + Math.round(first) + ' ms', { fs: 12.5, b: 1, c: P.ink, dy: -20 }); }
    if (k === 1 || k === 2) {   // later clients ask the socket for a channel
      const cl = k === 1 ? [CL[1]] : CL, names = k === 1 ? ['ssh gpu-node-01 true'] : ['shell', 'rsync', 'git pull'], cols = k === 1 ? [P.c4] : [P.c1, P.c3, P.c4];
      cl.forEach((p, i) => { const a = win(e, i * .15, i * .15 + .3);
        party(R, p, [.62, .38, .42], cols[i], null, { a, t: .45 });
        R.label([p[0], 0, p[2]], names[i], { fs: 12, b: 1, mono: k === 1, c: cols[i], dy: 30, a });
        R.flow(route([[p[0], .25, p[2] - .2], [SOCK[0], .25, SOCK[2] + .05], [LAP[0] - .5, .5, LAP[2] + .3]], 6), { c: cols[i], r: .05, n: 4, speed: 1, a });
        R.flow(chan(-.3 + i * .3 + (k === 1 ? .3 : 0)), { c: cols[i], r: .06, n: 12, speed: 1.4, a: win(e, i * .15 + .2, i * .15 + .5) }); });
      if (k === 1) R.label([BAS[0], 1.15, LAP[2]], 'one channel open on the master · ' + Math.round(medR) + ' ms median', { fs: 12.5, b: 1, c: P.c4, dy: -18, a: win(e, .3, .6) });
    }
    if (barsOn) {   // the ten recorded commands, to scale
      const z1 = 1.5, z2 = 2.9, u = .0022;
      fresh.forEach((v, i) => bar(R, [-3.6 + i * .78, 0, z1], v, u * win(e, i * .05, i * .05 + .4), P.c2, 1, { lab: i === 0 || i === 9 ? String(Math.round(v)) : '', w: .44, d: .44, wide: 1 }));
      lane.forEach((v, i) => bar(R, [-3.6 + i * .78, 0, z2], v, u * win(e, .3 + i * .05, .3 + i * .05 + .4), i ? P.c3 : P.c4, 1, { lab: i <= 1 || i === 9 ? String(Math.round(v)) : '', w: .44, d: .44, wide: 1 }));
      R.label([-3.6 - .4, .2, z1], 'fresh each time · ' + (sum(fresh) / 1000).toFixed(1) + ' s', { fs: 12.5, b: 1, c: P.c2, al: 'right', dx: -6, grp: 'row' });
      R.label([-3.6 - .4, .2, z2], 'through the master · ' + (sum(lane) / 1000).toFixed(1) + ' s', { fs: 12.5, b: 1, c: P.c3, al: 'right', dx: -6, grp: 'row' });
    }
    if (dead) {   // -O exit: every session on the master ends with it
      R.label([LAP[0], .9, LAP[2]], 'ssh -O exit', { fs: 12.5, b: 1, mono: 1, c: P.bad, dy: -30 });
      [-.3, 0, .3].forEach((z, i) => R.flow(chan(z), { c: [P.c1, P.c3, P.c4][i], r: .06, n: 10, speed: 1.4, a: 1 - win(e, .1, .35) }));
      cross(R, [BAS[0] - 1.6, .6, LAP[2]], win(e, .3, .5)); cross(R, [BAS[0] + 2.2, .6, LAP[2]], win(e, .35, .55));
      R.label([BAS[0], .9, LAP[2] + 1.2], 'the session riding it: exit ' + ex[1] + ' after ' + ex[2] + ' ms', { fs: 12.5, b: 1, c: P.bad, dy: 10, a: win(e, .4, .7) });
    }
  }
  const full = { cam: [.12, .62], bounds: [[-6, 0, -1.4], [5.4, 1.4, 1.8]] };
  S3.stage({ id: 'stg-mux', list: 'sx-mux', fig: 'Fig. 7 · one master connection, many commands', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 5000, draw,
    margin: w => w < 520 ? [22, 8, 18, 8] : [26, 16, 20, 16],
    view: k => k === 3 ? { cam: [.12, .7], bounds: [[-6.2, 0, .6], [4.2, 2.1, 3.4]] } : null });
})();
