// ---- Scene: Fig. 8, port forwarding (stg-fwd): where each forward listens (an upright plate on that machine) and where its connections come
// out, on the lab's topology. Each step is one recorded run (SSHD.logs fwd_L, fwd_L_unix, fwd_D, fwd_R, fwd_port_taken); the results drawn
// (token accepted, exit 97, served from the laptop, the bind error) are read from those logs. ----
(function () {
  if (!document.getElementById('stg-fwd') || !window.S3 || !window.SSK || !window.SSHD) return;
  const { mix } = S3, { party, slab, plate, cross, win, route } = SSK, L = SSHD.logs;
  const has = (k, re) => re.test(L[k] || '');
  const F = { Lok: has('fwd_L', /token accepted/), L403: has('fwd_L', /^403$/m), Uok: has('fwd_L_unix', /token accepted/), Dok: has('fwd_D', /\[exit 0\][^\n]*token accepted/),
    Dres: has('fwd_D', /Could not resolve host/), Dlo: has('fwd_D', /connection to proxy closed/), Rok: has('fwd_R', /served from the laptop/), Rlo: has('fwd_R', /127\.0\.0\.1:30991 .*LISTEN/),
    Tbind: has('fwd_port_taken', /bind \[127\.0\.0\.1\]:30985: Address already in use/), T255: has('fwd_port_taken', /\[exit 255\]/) };
  window.SSH_FWD = F;   // read by src/check_stages.mjs
  const LAP = [-4.2, 0, 0], BAS = [0, 0, 0], N1 = [3.8, 0, -.7], BR = [-5.6, 0, 1.75];
  const LIS = [LAP[0] + .45, 0, 1.0], lapR = [LAP[0] + .8, .5, 0], basL = [BAS[0] - .85, .5, 0], basR = [BAS[0] + .85, .45, 0], n1L = [N1[0] - .7, .45, N1[2]];
  function frame(R, k) { const P = R.P;
    R.grid(-6, 6.4, -2.6, 3.2, .5);
    R.quad([[-1.35, .005, -1.8], [5.0, .005, -1.8], [5.0, .005, 1.2], [-1.35, .005, 1.2]], { fill: mix(P.card, P.c3, .07), ec: P.mute, dash: [6, 5], ea: .5 });
    const far = k === 4;   // the last step moves in close on the laptop: the far machines lose their names
    party(R, LAP, [1.6, .9, 1.2], P.c1, 'laptop');
    party(R, BAS, [1.7, .95, 1.3], P.c2, far ? null : 'bastion');
    party(R, N1, [1.5, .8, 1.2], P.c3, far ? null : 'gpu-node-01', { a: k === 3 ? .35 : 1 });
    party(R, BR, [.8, .45, .6], P.c4, null, { t: .4, a: k === 3 ? .35 : 1 }); R.label([BR[0], 0, BR[2] + .3], 'browser, curl', { fs: 12, b: 1, dy: 12, a: k === 3 ? .35 : 1 });
  }
  // the SSH connection the forward rides: to the node through the bastion (ProxyJump) or to the bastion alone
  function conn(R, toNode, a) { const P = R.P;
    slab(R, lapR[0], basL[0], .4, 0, .9, P.c1, a, { lab: toNode ? 'ssh gpu-node-01 (via the bastion)' : 'ssh bastion', at: [(lapR[0] + basL[0]) / 2 + .3, .4, .45], al: 'center', dx: 0, dy: 14 });
    if (toNode) slab(R, basR[0], n1L[0], .4, n1L[2] * .5, .6, P.good, a * .9); }
  const toNodePts = (dst) => route([[BR[0] + .4, .3, BR[2] - .2], [LAP[0] + .3, .7, .6], [lapR[0], .5, .15], [basL[0], .5, .15], [BAS[0], 1.2, .1], [basR[0] + .2, .5, -.3], n1L, dst], 7);
  const SC = [
    (R, e) => { const P = R.P; conn(R, true, 1);
      plate(R, LIS, P.c2, 1, '-L listens on :30988', { w: .4, h: .36, glow: P.c2, mono: 1 });
      R.flow(toNodePts([N1[0] + .3, .85, N1[2]]), { c: P.c2, r: .065, n: 22, speed: 1.5, a: win(e, 0, .4) });
      R.label([N1[0], 0, N1[2] + .6], F.Lok ? 'to its 127.0.0.1:8888: token accepted' : '?', { fs: 12, b: 1, c: P.good, dy: 14, a: win(e, .4, .7) });
      if (F.L403) R.label([BR[0], 0, BR[2] + .3], 'no token: 403', { fs: 12, b: 1, mono: 1, c: P.bad, dy: 30, a: win(e, .6, .9) }); },
    (R, e) => { const P = R.P; conn(R, true, 1);
      plate(R, LIS, P.c2, 1, '-L listens on :30986', { w: .4, h: .36, glow: P.c2, mono: 1 });
      const S = [N1[0] + .2, .8, N1[2] + .1];
      R.box([S[0], .8, S[2]], [.5, .34, .4], { fill: mix(P.paper, P.good, .55), shadow: false });
      R.flow(toNodePts([S[0], .95, S[2]]), { c: P.c2, r: .065, n: 22, speed: 1.5, a: win(e, 0, .4) });
      R.label([S[0], 1.14, S[2]], 'Unix socket in a 0700 directory', { fs: 12, b: 1, c: P.good, dy: -14, a: win(e, .4, .7) }); },
    (R, e) => { const P = R.P; conn(R, false, 1);
      plate(R, LIS, P.c4, 1, '-D: SOCKS on :30989', { w: .4, h: .36, glow: P.c4, mono: 1 });
      const pre = [[BR[0] + .4, .3, BR[2] - .2], [LAP[0] + .3, .7, .6], [lapR[0], .5, .15], [basL[0], .5, .15], [BAS[0], 1.0, 0]];
      R.flow(route(pre.concat([[basR[0] + .2, .6, -.2], [N1[0] - .2, .85, N1[2] + .3]]), 7), { c: P.c4, r: .065, n: 20, speed: 1.5, a: win(e, 0, .4) });
      R.label([N1[0], .8, N1[2]], F.Dok ? 'gpu-node-01:8889 (all interfaces): reached' : '?', { fs: 12, b: 1, c: P.good, dy: -28, a: win(e, .35, .65) });
      R.label([BAS[0], 1.0, 0], 'names resolved by the bastion (socks5h)', { fs: 12, b: 1, c: P.c4, dy: -18, a: win(e, .3, .6), wide: 1 });
      cross(R, [N1[0] - 1.3, .7, N1[2] + .7], win(e, .55, .8));
      R.label([N1[0], 0, N1[2] + .6], F.Dlo ? 'its loopback-bound 8888: not reachable' : '?', { fs: 12, b: 1, c: P.bad, dy: 14, a: win(e, .6, .9) }); },
    (R, e) => { const P = R.P; conn(R, false, 1);
      plate(R, [BAS[0] + .1, .95, .45], P.c2, 1, '-R listens on 127.0.0.1:30991', { w: .4, h: .36, glow: P.c2, mono: 1 });
      R.flow(route([[BAS[0], 1.15, .5], [BAS[0] - .5, .7, .25], [basL[0], .52, .25], [lapR[0], .52, .25], [LAP[0], .95, .2]], 8), { c: P.c2, r: .065, n: 14, speed: 1.4, a: win(e, 0, .4) });
      R.label([LAP[0], .95, .2], F.Rok ? 'to the laptop’s 127.0.0.1:30990: served from the laptop' : '?', { fs: 12, b: 1, c: P.good, dy: -24, a: win(e, .4, .7) });
      R.label([BAS[0], 0, .65], 'GatewayPorts no: loopback only', { fs: 12, c: P.mute, dy: 18, a: win(e, .5, .8), wide: 1 }); },
    (R, e) => { const P = R.P; conn(R, true, .5);
      const O = [LAP[0] - .7, .9, .35];
      party(R, [O[0], .9, O[2]], [.5, .3, .4], P.bad, null, { t: .5 });
      R.label([O[0], 1.2, O[2]], 'another program on 127.0.0.1:30985', { fs: 12, b: 1, c: P.bad, dy: -12, al: 'right', dx: 20 });
      plate(R, [LAP[0] + .45, .9, .35], P.c2, win(e, 0, .3), 'ssh got [::1]:30985 only', { w: .36, h: .32, mono: 1, al: 'left', dx: -10, dy: -24 });
      R.flow(route([[BR[0] + .4, .3, BR[2] - .2], [O[0], 1.0, O[2] + .1]], 8), { c: P.bad, r: .065, n: 8, speed: 1.2, a: win(e, .3, .6) });
      R.label([BR[0], 0, BR[2] + .3], 'http://127.0.0.1:30985 reaches the other program', { fs: 12, b: 1, c: P.bad, dy: 30, a: win(e, .5, .8), wide: 1 }); }
  ];
  const full = { cam: [.1, .52], bounds: [[-6.2, 0, -1.6], [5.0, 1.4, 2.1]] };
  S3.stage({ id: 'stg-fwd', list: 'sx-fwd', fig: 'Fig. 8 · which end listens, where connections come out', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 1500, hold: 5000,
    draw: (R, k, e) => { frame(R, k); SC[k](R, e); }, margin: w => w < 520 ? [20, 8, 18, 8] : [26, 16, 22, 16],
    view: k => k === 4 ? { cam: [.1, .52], bounds: [[-6.4, 0, -.9], [-1.0, 1.4, 2.2]] } : null });
})();
