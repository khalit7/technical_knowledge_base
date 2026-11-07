// ---- Scene: Fig. 3 (section 3, stg-res): resumption and 0-RTT on a fleet. A client, two front ends that share a session-ticket key (the
// setup of the recorded run), a backend that counts billed generations, and in the 0-RTT mode an attacker on the path. Mode "res": a full
// handshake leaves a ticket (249 bytes, D.hs.tls13), the next connection lands on the other front end and skips the certificate, the
// measured cost (D.cost, 300 requests each) and the silent failure without a shared key. Mode "zr": the recorded replay against nginx
// (D.zr: early data, the attacker's three replays, the generation counter, then RFC 8470's 425). ----
(function () {
  if (!document.getElementById('stg-res') || !window.S3 || !window.TSK || !window.D) return;
  const { mix } = S3, { party, msg, cert, plate, bar, cross, tick, path, win, route, chips, fmt } = TSK;
  const NST = (() => { for (const r of D.hs.tls13.recs) for (const m of (r.m || [])) if (m.t === 'NewSessionTicket') return m.n })();
  const C = D.cost.median, C9 = D.cost.p90, KF = 'new connection, full handshake', KR = 'new connection, resumed session', KK = 'one kept-alive connection';
  const Z1 = D.zr.runs[0].steps, Z2 = D.zr.runs[1].steps, gen = s => (s.be[0] || [])[3], fe = s => (s.be[0] || [])[0], ff = Z1[1].ff;
  window.TLS_RES = { nst: NST, full: C[KF], res: C[KR], keep: C[KK], full9: C9[KF], res9: C9[KR], n: D.cost.n, ff,
    gens: Z1.map(gen), fes: Z1.map(fe), st425: Z2[1].be[0][2], gen425: Z2[1].be[0][3], hdr: Z2[1].be[0][1], rep425: Z2[2].be[0][2] };   // read by src/check_stages.mjs
  const CL = [-4.6, 0, 0], AT = [-2.1, 0, 2.0], FA = [.8, 0, -1.5], FB = [.8, 0, 1.2], BE = [4.4, 0, 0];
  let mode = 'res';
  const frontLab = (R, p, nm, a) => R.label([p[0], .8, p[2] + .5], nm, { fs: 12.5, b: 1, dy: -10, a: Math.max(.35, a) });
  function stack(R, n, a, hi) {   // the backend's billed generations as stacked blocks
    const P = R.P; for (let i = 0; i < n; i++) R.box([BE[0], 1.25 + i * .22, BE[2]], [.7, .18, .7], { fill: mix(P.paper, i >= n - hi ? P.bad : P.c3, .55), a, shadow: false, lw: .7 });
    R.label([BE[0], 1.25 + n * .22, BE[2]], n + ' generation' + (n === 1 ? '' : 's') + ' billed', { fs: 12, b: 1, mono: 1, dy: -10, c: hi ? P.bad : P.ink, a, wide: 1 }); }
  function draw(R, k, e) {
    const P = R.P, ENC = P.c1, KEY = P.c5, AUT = P.c3;
    R.grid(-5.6, 5.6, -2.6, 3, .5);
    party(R, CL, [1.3, 1.6, 1.2], P.c1, 'client');
    const tka = mode === 'res' && k === 3 ? 0 : 1;   // the shared ticket key between the two front ends
    party(R, FA, [1.1, .8, 1], P.c2, null); party(R, FB, [1.1, .8, 1], P.c2, null);
    frontLab(R, FA, 'front end A', 1); frontLab(R, FB, 'front end B', 1);
    if (tka) { R.glass([FA[0] - .25, .5, FA[2] + .55], [.5, 0, 0], [0, 0, FB[2] - FA[2] - 1.1], { c: KEY, a: .8, nu: 1, nv: 3, th: .03 });
      R.label([FA[0] + .4, .5, 0], 'shared ticket key', { fs: 12, b: 1, c: KEY, al: 'left', dx: 8, wide: 1 }); }
    else { R.label([FA[0] + .4, .5, 0], 'each front end its own key', { fs: 12, b: 1, c: P.bad, al: 'left', dx: 8, a: win(e, 0, .3), wide: 1 }); }
    party(R, BE, [1.2, 1.2, 1.1], P.c3, null); R.label([BE[0], 0, BE[2] + .55], 'backend', { fs: 12.5, b: 1, dy: 16 });
    const toA = [[CL[0] + .7, .55, -.2], [FA[0] - .6, .55, FA[2]]], toB = [[CL[0] + .7, .55, .2], [FB[0] - .6, .55, FB[2]]];
    if (mode === 'res') {
      if (k === 0) {   // full handshake with A: certificate and signature, then the ticket comes back
        R.flow(route(toA.slice().reverse()), { c: AUT, r: .065, n: 7, speed: 1.3, a: win(e, 0, .3) });
        cert(R, path(route(toA.slice().reverse()), win(e, .05, .5)), AUT, 1 - win(e, .5, .6), 'certificate + signature', { wide: 1, w: .7, h: .5 });
        msg(R, path(route(toA.slice().reverse()), win(e, .55, .95)), NST, KEY, win(e, .5, .6), { wide: 1, lab: 'NewSessionTicket ' + NST + ' B', mono: 1, dy: -14 });
      }
      if (k === 1 || k === 3) {   // the next connection lands on B, carrying the ticket
        R.flow(route(toB), { c: ENC, r: .065, n: 7, speed: 1.3, a: win(e, 0, .25) });
        msg(R, path(route(toB), win(e, .05, .55) * .85), NST, KEY, 1, { wide: 1, lab: 'ClientHello + ticket', mono: 1, dy: -16 });
        if (k === 1) { tick(R, [FB[0], 1.6, FB[2]], win(e, .6, .8)); R.label([FB[0] + .6, .8, FB[2]], 'no certificate, no signature', { fs: 12, b: 1, c: P.good, al: 'left', dx: 10, a: win(e, .6, .8), wide: 1 }); }
        else { cross(R, [FB[0], 1.6, FB[2]], win(e, .55, .7)); R.flow(route(toB.slice().reverse()), { c: AUT, r: .065, n: 7, speed: 1.3, a: win(e, .65, .8) });
          cert(R, path(route(toB.slice().reverse()), win(e, .7, 1)), AUT, win(e, .65, .75), 'full handshake again', { wide: 1, w: .7, h: .5 }); }
      }
      if (k === 2) {   // the measured cost, median of 300 requests on loopback
        const u = 1.1; [[KF, -2.9, P.c2], [KR, -1.6, P.c5], [KK, -.3, P.c3]].forEach(([nm, x, c], i) => bar(R, [x, 0, 2.4], C[nm], u, c, win(e, i * .15, i * .15 + .35), { wide: 1, lab: C[nm] + ' ms', w: .6, d: .6 }));
        [['full', -2.9], ['resumed', -1.6], ['kept alive', -.3]].forEach(([t, x], i) => R.label([x, 0, 2.8], t, { fs: 12, b: 1, dy: 16, a: win(e, i * .15, i * .15 + .35) }));
      }
    } else {
      const ffBox = (p, a, lab) => msg(R, p, ff, P.c4, a, { lab, mono: 1, dy: -14 });
      const toBE = f => route([[f[0] + .6, .55, f[2]], [BE[0] - .65, .55, BE[2]]]);
      party(R, AT, [.9, .9, .8], P.mute, null, { a: k === 0 ? .25 : 1 }); R.label([AT[0], 0, AT[2] + .45], 'attacker on the path', { fs: 12, b: 1, c: P.bad, dy: 16, a: k === 0 ? .3 : 1 });
            if (k === 0) {   // early data: the request rides in the first flight and the backend runs it
        R.flow(route(toA), { c: P.c4, r: .065, n: 7, speed: 1.3, a: win(e, 0, .25) });
        ffBox(path(route(toA), win(e, 0, .45)), 1, 'first flight + early data ' + fmt(ff) + ' B');
        R.flow(toBE(FA), { c: P.c4, r: .065, n: 7, speed: 1.3, a: win(e, .45, .65) });
        stack(R, win(e, .7, .75) > 0 ? gen(Z1[1]) : gen(Z1[0]), 1, 0);
      } else if (k === 1) {   // the attacker keeps a copy of those bytes
        const src = [CL[0] + .7, .55, .5], dst = [AT[0], .9, AT[2]];
        R.flow(route([src, dst]), { c: P.bad, r: .065, n: 6, speed: 1.3 });
        ffBox(path(route([src, dst]), win(e, 0, .6)), 1, 'a copy of the ' + fmt(ff) + ' bytes');
        stack(R, gen(Z1[1]), 1, 0);
      } else if (k <= 4) {   // replays: same bytes, to A, then B, then A again
        const f = fe(Z1[k]) === 'B' ? FB : FA, a0 = [AT[0] + .5, .7, AT[2]], a1 = [f[0] - .6, .55, f[2]];
        R.flow(route([a0, a1]), { c: P.bad, r: .065, n: 7, speed: 1.3, a: win(e, 0, .25) });
        ffBox(path(route([a0, a1]), win(e, 0, .45)), 1, 'replay ' + (k - 1) + ' to front end ' + fe(Z1[k]));
        R.flow(toBE(f), { c: P.bad, r: .065, n: 7, speed: 1.3, a: win(e, .45, .65) });
        stack(R, win(e, .7, .75) > 0 ? gen(Z1[k]) : gen(Z1[k - 1]), 1, win(e, .7, .75) > 0 ? k - 1 : k - 2);
      } else {   // RFC 8470: the front end marks early data, the backend refuses it with 425, the replay gets 425 too
        R.flow(route(toA), { c: P.c4, r: .065, n: 6, speed: 1.3, a: win(e, 0, .2) });
        R.flow(route([[AT[0] + .5, .7, AT[2]], [FA[0] - .6, .55, FA[2] + .3]]), { c: P.bad, r: .065, n: 6, speed: 1.3, a: win(e, .2, .4) });
        R.flow(toBE(FA), { c: P.c4, r: .065, n: 6, speed: 1.3, a: win(e, .3, .5) });
        R.label([(FA[0] + BE[0]) / 2, .55, (FA[2] + BE[2]) / 2], 'Early-Data: ' + window.TLS_RES.hdr, { fs: 12, b: 1, mono: 1, c: P.c4, dy: -12, a: win(e, .3, .5) });
        plate(R, [BE[0] - 1.1, .2, .9], P.bad, win(e, .55, .75), window.TLS_RES.st425 + ' Too Early', { wide: 1, w: .5, h: .5, lc: P.bad, mono: 1, glow: P.bad });
        stack(R, gen(Z1[4]), .45, 0);
      }
    }
  }
  const full = { cam: [.3, .6], bounds: [[-5.4, 0, -2.2], [5.4, 2.0, 3.0]] };
  const st = S3.stage({ id: 'stg-res', list: 'sx-res-res', fig: 'Fig. 3 · resumption and 0-RTT on a fleet', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 5000, draw,
    margin: w => w < 520 ? [22, 8, 12, 8] : [26, 16, 18, 16] });
  chips(document.getElementById('res-mode'), 'sx-res-', st, m => { mode = m; });
})();
