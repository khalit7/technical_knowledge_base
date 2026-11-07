// ---- Scenes: Fig. 5, ProxyJump (stg-jump), and Fig. 6, agent forwarding against ProxyJump (stg-agent), on the lab's topology: the laptop,
// the bastion, and two compute nodes on an internal network the laptop cannot route to. Sessions are glass slabs, the node's inner session
// a green stream that passes through the bastion unread, the forwarded agent an amber stream back to the laptop. Data: the recorded runs
// (SSHD.logs agent_forward, agent_constrained, agent_proxyjump; SSHD.N jump_b, jump_n, jw_c2s, jw_s2c). ----
(function () {
  if (!window.S3 || !window.SSK || !window.SSHD) return;
  const { mix } = S3, { party, slab, plate, bar, cross, path, win, route, chips, fmt } = SSK, N = SSHD.N, L = SSHD.logs;
  const got = (k, h) => new RegExp('logged in to ' + h).test(L['agent_' + k] || '');
  const sock = (k) => /\nsocket: \//.test('\n' + (L['agent_' + k] || ''));
  const R_ = { fwd1: got('forward', 'gpu-node-01'), fwd2: got('forward', 'gpu-node-02'), con1: got('constrained', 'gpu-node-01'), con2: got('constrained', 'gpu-node-02'),
    sockF: sock('forward'), sockC: sock('constrained'), sockP: sock('proxyjump') };
  window.SSH_AGENT = R_;   // read by src/check_stages.mjs
  const LAP = [-4.6, 0, 0], BAS = [0, 0, 0], N1 = [4.3, 0, -1.25], N2 = [4.3, 0, 1.35];
  const lapR = [LAP[0] + .8, .5, 0], basL = [BAS[0] - .85, .5, 0], basR = [BAS[0] + .85, .45, 0], n1L = [N1[0] - .7, .4, N1[2]], n2L = [N2[0] - .7, .4, N2[2]];
  // the common frame: the cluster zone, the three or four machines, the outer session
  function frame(R, o) { const P = R.P;
    R.grid(-6, 6.2, -3, 3.2, .5);
    R.quad([[-1.35, .005, -2.2], [5.4, .005, -2.2], [5.4, .005, 2.3], [-1.35, .005, 2.3]], { fill: mix(P.card, P.c3, .07), ec: P.mute, dash: [6, 5], ea: .5 });
    R.label([-1.2, 0, 2.3], 'cluster network · no route from the laptop', { fs: 12, c: P.mute, al: 'left', dy: 14, wide: 1 });
    party(R, LAP, [1.6, .9, 1.2], P.c1, 'laptop', { a: o.lap == null ? 1 : o.lap });
    party(R, BAS, [1.7, .95, 1.3], P.c2, 'bastion', { a: o.bas == null ? 1 : o.bas });
    party(R, N1, [1.4, .75, 1.1], P.c3, 'gpu-node-01', { a: o.n1 == null ? 1 : o.n1 });
    if (o.n2 !== 0) party(R, N2, [1.4, .75, 1.1], P.c6, 'gpu-node-02', { a: o.n2 == null ? 1 : o.n2, sub: o.n2sub });
    if (o.outer) { slab(R, lapR[0], basL[0], .42, 0, .9, P.c1, o.outer, { lab: o.outerLab || 'outer session: laptop to bastion', grp: 'ses', at: [lapR[0], .42, .45] });
      if (o.outerFlow) R.flow(route([[lapR[0], .48, -.25], [basL[0], .48, -.25]]), { c: P.c1, r: .06, n: 6, speed: 1.2, a: o.outerFlow }); }
  }
  // the inner, end-to-end session: green dots from the laptop through the outer slab, over the bastion (unread) and down to the node
  const innerPts = () => route([[lapR[0], .5, .2], [basL[0], .5, .2], [BAS[0], 1.35, .2], [basR[0] + .3, .7, -.3], n1L], 9);
  function inner(R, a, n) { if (a > .01) R.flow(innerPts(), { c: R.P.good, r: .085, n: n || 18, speed: 1.4, a }); }
  function tcpTo(R, to, a, c, lab) { const P = R.P; if (a <= .01) return; R.line([basR, to], { c: c || P.c3, w: 2.2, a, dash: [6, 4] }); if (lab) R.label([(basR[0] + to[0]) / 2, .45, (basR[2] + to[2]) / 2], lab, { fs: 12, b: 1, c: c || P.c3, dy: -12, a, wide: 1 }); }
  const SOCK = [BAS[0] + .2, .95, .2], ROOT = [BAS[0] + .2, 0, 1.75];
  function agentSock(R, a, c) { plate(R, SOCK, c || R.P.c5, a, 'agent socket', { w: .38, h: .38, glow: c || R.P.c5 }); }
  function root(R, a) { party(R, ROOT, [.7, .45, .5], R.P.bad, 'root on the bastion', { a, t: .45, fs: 12, lc: R.P.bad }); }
  function signBack(R, a) { if (a > .01) R.flowArc([SOCK[0], SOCK[1] + .3, SOCK[2]], [LAP[0] + .2, .95, .2], .8, { c: R.P.c5, r: .065, n: 10, speed: 1.3, a }); }
  // a login from the bastion to a node: who signs decides the colour (green: the laptop, as intended; red: root abusing the agent); refused ones get a cross
  function login(R, to, refused, a, lab, c) { const P = R.P; if (a <= .01) return; const col = c || P.good;
    R.flow(route([basR, refused ? [to[0] - 1.1, .42, to[2] * .85] : to], 10), { c: col, r: .08, n: refused ? 4 : 8, speed: 1.3, a });
    if (lab) { const above = to[2] < 0; R.label(above ? [to[0], .75, to[2]] : [to[0] + .7, 0, to[2] + .55], lab, { fs: 12, b: 1, c: refused ? P.bad : col, dy: above ? -30 : 14, a, al: above ? 'center' : 'right' }); }
    if (refused) cross(R, [to[0] - 1.05, .5, to[2] * .85], a); }
  const SC = {
    // ProxyJump, section 5
    pj(R, k, e) { const P = R.P;
      frame(R, { outer: k >= 0 ? 1 : 0, outerFlow: k === 0 ? 1 : .35, n2: .18, n1: k === 0 ? .35 : 1 });
      if (k === 0) R.label([LAP[0], .9, 0], "ssh -W '[gpu-node-01]:22' bastion", { fs: 12, b: 1, mono: 1, c: P.c1, dy: -30 });
      tcpTo(R, n1L, k === 1 ? win(e, 0, .4) : k > 1 ? .8 : 0, P.c3, k === 1 ? 'direct-tcpip to gpu-node-01:22' : null);
      if (k === 1) R.flow(route([basR, n1L], 10), { c: P.c3, r: .055, n: 6, speed: 1.2, a: win(e, .3, .6) });
      inner(R, k === 2 ? win(e, 0, .4) : k === 3 ? 1 : 0);
      if (k === 2) plate(R, [LAP[0], .9, .25], P.good, win(e, .4, .7), 'checks gpu-node-01’s host key itself', { w: .38, h: .38, glow: P.good, wide: 1 });
      if (k === 3) { R.label([BAS[0], 1.35, .2], fmt(N.jw_c2s) + ' B up · ' + fmt(N.jw_s2c) + ' B down, all ciphertext', { fs: 12, b: 1, mono: 1, c: P.c2, dy: -16 });
        bar(R, [LAP[0] - .35, 0, 1.55], N.jump_b, .006, P.c1, win(e, .2, .6), { lab: N.jump_b + ' ms', w: .32, d: .32 });
        bar(R, [LAP[0] + .35, 0, 1.55], N.jump_n, .006, P.good, win(e, .3, .7), { lab: N.jump_n + ' ms', w: .32, d: .32 });
        R.label([LAP[0], 0, 1.95], 'login: bastion · node via bastion', { fs: 12, c: P.mute, dy: 14, a: win(e, .3, .7), wide: 1 }); }
    },
    // agent forwarding, section 6
    forward(R, k, e) { const P = R.P;
      frame(R, { outer: 1, outerFlow: k === 0 ? 1 : .3, outerLab: 'ssh -A bastion: session + agent channel', n1: k === 1 || k === 3 ? 1 : .35, n2: k === 3 ? 1 : .3 });
      agentSock(R, k === 0 ? win(e, .2, .6) : 1, k >= 2 ? P.bad : P.c5);
      if (k === 0) R.flow(route([[lapR[0], .5, .3], [basL[0], .5, .3], [SOCK[0], SOCK[1] + .1, SOCK[2]]], 8), { c: P.c5, r: .06, n: 7, speed: 1.1, a: win(e, .2, .6) });
      if (k === 1) { signBack(R, win(e, 0, .4)); login(R, n1L, false, win(e, .3, .7), 'logged in, signed by the laptop'); }
      root(R, k >= 2 ? (k === 2 ? win(e, 0, .4) : 1) : 0);
      if (k === 2) { R.flowArc([ROOT[0], .45, ROOT[2]], [SOCK[0], SOCK[1] + .1, SOCK[2]], .4, { c: P.bad, r: .06, n: 6, speed: 1.2, a: win(e, .3, .6) }); signBack(R, win(e, .5, .8));
        R.label([SOCK[0], SOCK[1] + .4, SOCK[2]], 'ssh-add -l lists the laptop’s key', { fs: 12, b: 1, c: P.bad, dy: -22, a: win(e, .5, .8), wide: 1 }); }
      if (k === 3) { signBack(R, .7); login(R, n1L, !R_.fwd1, win(e, 0, .4), R_.fwd1 ? 'root logged in as dev' : 'refused', P.bad);
        login(R, n2L, !R_.fwd2, win(e, .2, .6), R_.fwd2 ? 'root logged in as dev' : 'refused', P.bad); }
    },
    constrained(R, k, e) { const P = R.P;
      frame(R, { outer: k >= 1 ? 1 : .15, outerFlow: k === 1 ? .6 : .2, outerLab: 'ssh -A bastion, constrained key', n1: k >= 1 ? 1 : .35, n2: k >= 1 ? 1 : .35 });
      if (k === 0) { plate(R, [LAP[0] - .35, .9, .1], P.good, win(e, 0, .4), 'bastion', { w: .4, h: .3, mono: 1, grp: 'hop' }); plate(R, [LAP[0] + .35, .9, .1], P.good, win(e, .2, .6), 'bastion>gpu-node-01', { w: .4, h: .3, mono: 1, grp: 'hop' });
        R.label([LAP[0], .9, .1], 'the agent signs for these two hops only', { fs: 12, b: 1, c: P.good, dy: -46, a: win(e, .3, .7), wide: 1 }); }
      if (k >= 1) agentSock(R, 1, k === 2 ? P.bad : P.c5);
      if (k === 1) { signBack(R, win(e, 0, .3)); login(R, n1L, false, win(e, .2, .5), 'allowed hop: logged in'); login(R, n2L, true, win(e, .4, .7), 'Permission denied (publickey)'); }
      if (k === 2) { root(R, 1); signBack(R, .6); login(R, n1L, !R_.con1, win(e, 0, .4), R_.con1 ? 'root logged in: the allowed hop' : 'refused', P.bad);
        login(R, n2L, !R_.con2, win(e, .2, .6), R_.con2 ? 'root logged in' : 'root refused', P.bad); }
    },
    proxyjump(R, k, e) { const P = R.P;
      frame(R, { outer: 1, outerFlow: k === 0 ? 1 : .3, n1: k >= 1 ? 1 : .4, n2: .3 });
      tcpTo(R, n1L, k === 0 ? win(e, .2, .6) : .8, P.c3, k === 0 ? 'direct-tcpip to gpu-node-01:22, no agent channel' : null);
      inner(R, k === 1 ? win(e, 0, .4) : k === 2 ? .7 : 0);
      if (k === 2) { root(R, 1); plate(R, SOCK, P.mute, .6, R_.sockP ? 'a socket was found' : 'no socket to find', { w: .38, h: .38 });
        R.label([ROOT[0], .45, ROOT[2]], 'sees a connection to gpu-node-01:22 and its byte counts', { fs: 12, c: P.bad, dy: 26, wide: 1 }); }
    }
  };
  const full = { cam: [.1, .5], bounds: [[-5.6, 0, -2.0], [5.4, 1.3, 2.3]] };
  const close = k => ({ cam: [.1, .5], bounds: [[-5.6, 0, -1.0], [1.4, 1.4, 1.6]] });
  if (document.getElementById('stg-jump'))
    S3.stage({ id: 'stg-jump', list: 'sx-jump', fig: 'Fig. 5 · ProxyJump: a session inside a session', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 1500, hold: 5000,
      draw: (R, k, e) => SC.pj(R, k, e), margin: w => w < 520 ? [20, 8, 18, 8] : [26, 16, 22, 16], view: k => k === 0 ? close(k) : null });
  if (document.getElementById('stg-agent')) {
    let mode = 'forward';
    const st = S3.stage({ id: 'stg-agent', list: 'sx-ag-forward', fig: 'Fig. 6 · what root on the bastion can do', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 1500, hold: 5200,
      draw: (R, k, e) => SC[mode](R, k, e), margin: w => w < 520 ? [20, 8, 18, 8] : [26, 16, 22, 16] });
    chips(document.getElementById('ag-mode'), 'sx-ag-', st, m => { mode = m; });
  }
})();
