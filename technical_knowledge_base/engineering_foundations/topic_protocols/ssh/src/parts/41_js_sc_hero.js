// ---- Scene: Fig. 1, the hero (stg-hero): one SSH connection as its layers, stacked glass slabs between the laptop and the bastion:
// TCP, then the transport (banners and KEXINIT in the clear, the key exchange with the host key, NEWKEYS), user authentication, and
// channels sharing the pipe; the last step nests a second session inside one channel (ProxyJump). Sizes are the recorded login with the
// default key exchange (SSHD.kex, mlkem768x25519-sha256, laptop OpenSSH 10.3p1 to bastion 10.5p1); the channel lanes are illustrative. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.SSK || !window.SSHD) return;
  const { mix } = S3, { party, slab, plate, msg, path, win, route, fmt } = SSK;
  const PK = SSHD.kex['mlkem768x25519-sha256'].packets, find = (d, f) => PK.find(p => p.dir === d && f(p));
  const H = { bc: find('c2s', p => p.ev === 'banner'), bs: find('s2c', p => p.ev === 'banner'), kc: find('c2s', p => p.name === 'KEXINIT'), ks: find('s2c', p => p.name === 'KEXINIT'),
    ini: find('c2s', p => /INIT/.test(p.name) && p.name !== 'KEXINIT'), rep: find('s2c', p => /REPLY/.test(p.name)),
    ec: find('c2s', p => p.ev === 'encrypted_total'), es: find('s2c', p => p.ev === 'encrypted_total') };
  H.kcB = SSHD.N.kexinit_c_full;   // the client's full default KEXINIT (the per-algorithm runs above forced a one-entry list)
  window.SSH_HERO = { bc: H.bc.name, bs: H.bs.name, kc: H.kcB, ks: H.ks.bytes, ini: H.ini.bytes, rep: H.rep.bytes, ec: H.ec.bytes, es: H.es.bytes };   // read by src/check_stages.mjs
  const LAP = [-4.7, 0, 0], BAS = [4.7, 0, 0], NODE = [8.4, 0, -1.4], X0 = -3.75, X1 = 3.75, D = 1.25;
  const YT = .18, Y1 = .8, Y2 = 1.42, Y3 = 2.04;   // TCP, transport, authentication, connection
  function draw(R, k, e) {
    const P = R.P, CT = P.c1, CA = P.c4, CC = P.c3, PL = P.c5;
    R.grid(-6, 10, -3, 2.4, .5);
    party(R, LAP, [1.6, 2.5, 1.4], P.c1, 'laptop', { sub: k === 0 ? 'OpenSSH 10.3p1' : null, a: k === 6 ? .55 : 1 });
    party(R, BAS, [1.6, 2.5, 1.4], P.c2, 'bastion', { sub: k === 0 ? 'OpenSSH 10.5p1' : null, a: 1 });
    // the TCP connection: always there, the floor everything rides on
    R.box([0, YT - .1, 0], [X1 - X0, .1, D * .55], { fill: mix(P.paper, P.mute, .25), a: k === 0 ? 1 : .55, shadow: false });
    R.label([1.2, YT, D * .28], 'TCP · port 22', { fs: 12, b: 1, c: P.mute, dy: 12, a: 1 });
    if (k === 0) { R.flow(route([[X0, YT + .02, -.2], [X1, YT + .02, -.2]]), { c: P.mute, r: .06, n: 9, speed: 1.2 });
      R.flow(route([[X1, YT + .02, .2], [X0, YT + .02, .2]]), { c: P.mute, r: .06, n: 9, speed: 1.2 });
      R.label([0, YT, D * .3], 'one connection: lose it and every channel goes with it', { fs: 12.5, b: 1, c: P.ink, dy: 26, wide: 1 }); }
    // the three SSH layers, drawn faintly before their step so the reader sees the whole stack from the start
    const aT = k < 1 ? .12 : k <= 3 ? 1 : k === 6 ? .3 : .55, aA = k < 4 ? .1 : k === 4 ? 1 : k === 6 ? .3 : .55, aC = k < 5 ? .1 : 1;
    const tc = k >= 3 ? CT : mix(P.paper, PL, .7), ph = a => R.W < 520 && a <= .3;   // on a phone a faded layer keeps its slab but not its name (they would overlap)
    slab(R, X0, X1, Y1, 0, D, tc, aT, { lab: ph(aT) ? null : k >= 3 ? 'transport · encrypted' : 'transport · in the clear', lc: k >= 3 ? CT : PL, at: [1.2, Y1, D / 2], al: 'center', dx: 0 });
    slab(R, X0, X1, Y2, 0, D, CA, aA, { lab: ph(aA) ? null : 'user authentication', at: [1.2, Y2, D / 2], al: 'center', dx: 0 });
    slab(R, X0, X1, Y3, 0, D, CC, aC, { lab: ph(aC) ? null : 'connection · channels', at: [1.2, Y3, D / 2], al: 'center', dx: 0 });
    if (k === 1) {   // banners and KEXINIT, readable by anyone on the path
      const a = [X0 + .3, Y1 + .06, -.3], b = [X1 - .3, Y1 + .06, -.3], c = [X1 - .3, Y1 + .06, .3], d = [X0 + .3, Y1 + .06, .3];
      R.flow(route([a, b]), { c: PL, r: .07, n: 8, speed: 1.3 }); R.flow(route([c, d]), { c: PL, r: .07, n: 8, speed: 1.3 });
      msg(R, path(route([a, b]), Math.min(1, e * 1.2)), H.kcB, PL, 1, { lab: H.bc.name + ' · KEXINIT ' + fmt(H.kcB) + ' B', mono: 1, dy: -16 });
      msg(R, path(route([c, d]), Math.min(1, e * 1.2)), H.ks.bytes, PL, win(e, .15, .4), { lab: H.bs.name + ' · KEXINIT ' + fmt(H.ks.bytes) + ' B', mono: 1, dy: 20 });
    }
    if (k === 2) {   // the key exchange: fresh public values, the host key and its signature
      const a = [X0 + .3, Y1 + .06, -.3], b = [X1 - .3, Y1 + .06, -.3], c = [X1 - .3, Y1 + .06, .3], d = [X0 + .3, Y1 + .06, .3];
      R.flow(route([a, b]), { c: PL, r: .07, n: 7, speed: 1.3, a: win(e, 0, .2) });
      msg(R, path(route([a, b]), win(e, 0, .45)), H.ini.bytes, PL, 1, { lab: 'hybrid init · ' + fmt(H.ini.bytes) + ' B', mono: 1, dy: -16 });
      R.flow(route([c, d]), { c: PL, r: .07, n: 7, speed: 1.3, a: win(e, .4, .6) });
      const q = path(route([c, d]), win(e, .45, .9));
      msg(R, q, H.rep.bytes, PL, win(e, .4, .5), { lab: 'reply + host key + signature · ' + fmt(H.rep.bytes) + ' B', mono: 1, dy: 20 });
      plate(R, [q[0], Y1 + .14, q[2] - .05], P.c2, win(e, .4, .5), null, { w: .34, h: .34 });
      plate(R, [LAP[0] + .1, 2.52, .2], P.good, win(e, .75, 1), 'known_hosts: does it match?', { w: .42, h: .42, glow: P.good });
    }
    if (k === 3) {   // NEWKEYS: from here only sizes are visible
      R.flow(route([[X0 + .3, Y1 + .06, -.35], [X1 - .3, Y1 + .06, -.35]]), { c: CT, r: .07, n: 8, speed: 1.3 });
      R.flow(route([[X1 - .3, Y1 + .06, .35], [X0 + .3, Y1 + .06, .35]]), { c: CT, r: .07, n: 10, speed: 1.3 });
      R.label([0, Y3 + .3, 0], 'NEWKEYS: from here an observer sees sizes only', { fs: 12.5, b: 1, c: CT, dy: -8, wide: 1 });
      R.label([0, Y3 + .3, 0], fmt(H.ec.bytes) + ' B up · ' + fmt(H.es.bytes) + ' B down for the rest of the login', { fs: 12, mono: 1, c: P.ink, dy: 10, wide: 1 });
    }
    if (k === 4) {   // user authentication inside the encrypted transport
      const a = [X0 + .3, Y2 + .06, -.2], b = [X1 - .3, Y2 + .06, -.2];
      R.flow(route([a, b]), { c: CA, r: .07, n: 8, speed: 1.2 });
      plate(R, path(route([a, b]), Math.min(1, e * 1.1)), CA, 1, 'signature over the session ID H', { w: .36, h: .34 });
      plate(R, [BAS[0] - .1, 2.52, .2], P.good, win(e, .6, .9), 'authorized_keys', { w: .42, h: .42, glow: P.good });
    }
    if (k === 5) {   // channels share the pipe
      [['shell', P.c1, -.4, 7], ['rsync', P.c3, 0, 12], ['-L 30988 to a notebook', P.c2, .4, 5]].forEach(([nm, c, z, n], i) => {
        const a = [X0 + .3, Y3 + .06, z], b = [X1 - .3, Y3 + .06, z];
        R.flow(route(i === 1 ? [a, b] : [b, a]), { c, r: .065, n, speed: 1.2, a: win(e, i * .15, i * .15 + .3) });
        R.label(b, nm, { fs: 12, b: 1, c, al: 'left', dx: 10, a: win(e, i * .15, i * .15 + .3), grp: 'ch', mono: i === 2 });
      });
    }
    if (k === 6) {   // ProxyJump: a whole second session inside one channel
      party(R, NODE, [1.4, 1.2, 1.2], P.c3, null, { a: win(e, 0, .3) }); R.label([NODE[0], 1.9, NODE[2]], 'gpu-node-01', { b: 1, fs: 13, dy: -6, a: win(e, 0, .3) });
      const zL = .4, y = Y3 + .06, n1 = [NODE[0] - .7, .5, NODE[2]];
      R.line([[BAS[0] + .8, .5, 0], n1], { c: P.mute, w: 1.6, a: win(e, 0, .3), dash: [5, 4] });
      const pts = route([[X0 + .3, y, zL], [X1 - .3, y, zL], [BAS[0], 2.6, zL], [BAS[0] + .9, .55, zL * .4], n1], 8);
      R.flow(pts, { c: P.good, r: .07, n: 18, speed: 1.4, a: win(e, .2, .5) });
      [-.12, .04, .2].forEach((dy, i) => R.glass([NODE[0] - .5, 1.3 + i * .2, NODE[2] - .45], [1, 0, 0], [0, 0, .9], { c: [CT, CA, CC][i], a: win(e, .5, .8), nu: 3, nv: 2, th: .03 }));
      R.label([NODE[0] - .8, 0, NODE[2] + .6], 'same three layers, end to end', { fs: 12, b: 1, c: P.good, dy: 16, a: win(e, .5, .8), wide: 1 });
      R.label([BAS[0], 0, .7], 'relays ciphertext it cannot read', { fs: 12, b: 1, c: P.c2, dy: 16, a: win(e, .4, .7) });
    }
  }
  const full = { cam: [.22, .36], bounds: [[-5.6, 0, -.9], [5.6, 2.8, .9]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one SSH connection, layer by layer', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [26, 8, 16, 8] : [30, 16, 20, 16],
    view: k => k === 1 || k === 2 || k === 3 ? { cam: [.16, .42], bounds: [[-5.6, 0, -.9], [5.6, 1.9, .9]] }
      : k === 6 ? { cam: [.3, .42], bounds: [[-5.6, 0, -2.1], [9.4, 2.8, 1.0]] } : null });
})();
