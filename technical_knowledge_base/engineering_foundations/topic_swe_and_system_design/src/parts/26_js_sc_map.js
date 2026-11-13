// ---- Scene: Fig. 1, the map (stg-map): the chat product grown step by step, one wall at a time (renderer v2, 25_js_s3.js) ----
// Eight steps: the product on one machine; then each of the six walls of the Reading tab (the part that breaks turns red, its fix arrives green
// and names the child page that owns it); then the code and tests under every box. Requests flow as dots along the paths they take.
// Every number drawn is one the page states: the illustrative walls of Steps 1 to 4, the derived GPU ceilings of Step 5 and the estimate of
// Step 6 (RDSIM.a6 in 28_js_rd_est.js, the same results src/read/recompute.py checks). Layout: the request path runs left to right along the
// middle row (users, balancer, app servers, cache, database); the model path is the front row and slow work the back row.
(function () {
  if (!document.getElementById('stg-map') || !window.S3) return;
  const { mix, cl } = S3;
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  // a label only when its anchor is on the canvas (a close view leaves parts out)
  // while the camera moves (e < 1), a label that would be pushed in from the card's edge is left out, so a clamped label never lies over another
  let moving = false;
  function lab(R, p, text, o) { const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return;
    if (moving) { const w = text.length * (o.fs || 12) * (o.mono ? .62 : .55), x = q[0] + (o.dx || 0), l = o.al === 'left' ? x : o.al === 'right' ? x - w : x - w / 2; if (l < 4 || l + w > R.W - 4) return }
    R.label(p, text, o) }
  const X = { u: -6.4, lb: -4.5, app: -2.6, ca: -0.6, db: 1.4, rep: 2.7, gw: 0.4, mo: 3.3, q: -0.6, wk: 1.4 }, ZF = 2.0, ZB = -2.1;
  // [id, step it arrives, step it leaves (or 99), the colour it is tinted with]
  const PARTS = [['u', 0, 99, 'mute'], ['one', 0, 1, 'c1'], ['lb', 1, 99, 'c1'], ['app', 1, 99, 'c1'], ['db', 1, 99, 'c6'], ['ca', 2, 99, 'c5'], ['rep', 2, 99, 'c6'],
    ['q', 3, 99, 'c4'], ['wk', 3, 99, 'c4'], ['gw', 4, 99, 'c3'], ['mo', 0, 5, 'c2'], ['gpu', 5, 99, 'c2']];
  // per step: the part that is the wall (hot), the parts its fix adds, and the three labels
  let E6c = null; const getE6 = () => E6c || (E6c = window.RDSIM && RDSIM.a6 ? RDSIM.a6() : null), f0 = n => Math.round(n).toLocaleString('en-US');
  const S = [
    { hot: [], name: 'one user, one machine', own: '' },
    { hot: ['one'], sw: '600 in, 400 out a second', sf: 'balancer + servers', wall: '600 arrive a second, 400 served (illustrative)', fix: 'load balancer + stateless servers', own: 'Capacity planning · Building a backend API' },
    { hot: ['db'], sw: '1,000 reads/s, 600 answered', sf: 'cache + replicas', wall: '1,000 reads a second, 600 answered (illustrative)', fix: 'cache, 90% hits + read replicas', own: 'Topic: databases · Distributed systems' },
    { hot: ['app'], sw: 'uploads hold the slots', sf: 'queue + workers', wall: '5 uploads in 4 slots: chats wait up to 3 s (illustrative)', fix: 'queue + workers: 202 Accepted at once', own: 'Queues, streams and async work' },
    { hot: ['mo'], sw: '1 call in 100 hangs', sf: 'timeouts, retries, breaker', wall: '1 call in 100 hangs a minute (illustrative)', fix: 'timeouts · backoff and jitter · breaker', own: 'Reliability engineering · Observability' },
    { hot: ['mo'], sw: 'at most 210 tokens/s a reply', sf: 'batch of 64: 13,000 tokens/s', wall: '4.8 ms a token: at most about 210 tokens/s per reply', fix: 'batch of 64: about 13,000 tokens/s', own: 'ML system design · Gateways and routing' },
    { hot: [], own: 'System design case studies · Capacity planning' },
    { hot: [], own: 'Testing and quality · Code design' }];
  const N = S.length;
  // how present a part is at step k, progress e: it arrives during its step's fix phase and leaves the same way
  const FIX = e => win(e, .42, .88);
  function alpha(p, k, e) { const [, i, o] = p; if (k > o) return 0; if (k === o) return 1 - FIX(e); if (k < i) return 0; if (k === i && i > 0) return FIX(e); return 1 }
  // the wall: red while the step opens, then it fades to a trace as the fix arrives (reduced motion shows the end state: trace plus fix)
  const hotOf = e => e < .42 ? Math.min(1, e / .12) : 1 - .75 * win(e, .42, .88);
  const full = { cam: [.2, .72], bounds: [[-7.2, 0, -2.8], [4.4, 1.0, 3.0]] };
  const V = [null,
    { cam: [.24, .62], bounds: [[-7.4, 0, -1.9], [-0.6, 1.2, 2.1]] },
    { cam: [.22, .62], bounds: [[-3.8, 0, -1.9], [3.6, 1.2, 2.0]] },
    { cam: [.22, .68], bounds: [[-7.0, 0, -2.8], [2.3, 1.0, 1.0]] },
    { cam: [.22, .62], bounds: [[-3.8, 0, -1.2], [4.5, 1.2, 3.2]] },
    { cam: [.24, .58], bounds: [[-1.4, 0, .4], [4.8, 1.2, 3.4]] },
    null, null];
  // the part's anchor on the floor, and whether a step's view shows it (a close view drops what lies outside it, so nothing is cut at the card's edge)
  const AT = { u: [X.u, 0], one: [X.app, 0], lb: [X.lb, 0], app: [X.app, 0], db: [X.db, 0], ca: [X.ca, 0], rep: [X.rep, 0], q: [X.q, ZB], wk: [X.wk, ZB], gw: [X.gw, ZF], mo: [X.mo, ZF], gpu: [X.mo, ZF] };
  const inV = (id, k) => { const v = V[k]; if (!v) return 1; const [x, z] = AT[id], B = v.bounds; return x >= B[0][0] + .3 && x <= B[1][0] - .3 && z >= B[0][2] + .3 && z <= B[1][2] - .3 ? 1 : 0 };
  function draw(R, k, e, st) {
    const P = R.P, narrow = R.W < 520, fx = FIX(e), cur = S[k]; moving = e < 1 && !!(V[k] || V[st && st.pk != null ? st.pk : k]);
    R.grid(-7.6, 4.8, -3.0, 3.1, .5);
    const A = {}, hot = {}, nw = {};
    PARTS.forEach(p => { A[p[0]] = alpha(p, k, e); hot[p[0]] = cur.hot.includes(p[0]) ? hotOf(e) : 0; nw[p[0]] = (k === p[1] && k > 0) ? fx : 0 });
    // focus: on a wall step the parts it is about stay at full strength and the rest recede
    const focus = { 1: ['u', 'one', 'lb', 'app', 'db'], 2: ['app', 'db', 'ca', 'rep'], 3: ['u', 'lb', 'app', 'q', 'wk'], 4: ['app', 'gw', 'mo'], 5: ['gw', 'mo', 'gpu'] }[k];
    const pk = st && st.pk != null ? st.pk : k, dim = id => (focus && !focus.includes(id) ? .3 : 1) * (inV(id, pk) + (inV(id, k) - inV(id, pk)) * e);
    const fillOf = (id, base) => { let f = mix(P.paper, P[base], id === 'u' ? .12 : .24); f = mix(f, mix(P.paper, P.bad, .62), hot[id]); return mix(f, mix(P.paper, P.good, .6), nw[id] * (1 - hot[id])) };
    const glow = (id, p) => { const g = Math.max(hot[id], nw[id]); if (g > .01) R.glow(p, .75, { c: hot[id] > nw[id] ? P.bad : P.good, a: A[id] * g * .38 }) };
    const H = {};   // the height each part's name sits at
    PARTS.forEach(([id, , , base]) => {
      const a = A[id] * dim(id); if (a <= .01) return; const o = { fill: fillOf(id, base), a };
      if (id === 'u') { [-.42, 0, .42].forEach(dz => R.box([X.u, 0, dz], [.3, .62, .16], o)); H.u = .62 }
      if (id === 'one') { glow(id, [X.app, .3, 0]); R.box([X.app, 0, 0], [1.4, .7, 1.0], o); H.one = .7 }
      if (id === 'lb') { glow(id, [X.lb, .1, 0]); R.box([X.lb, 0, 0], [1.0, .16, 1.1], o); H.lb = .16 }
      if (id === 'app') { glow(id, [X.app, .3, 0]); [-.6, 0, .6].forEach(dz => R.box([X.app, 0, dz], [1.0, .46, .4], o)); H.app = .46 }
      if (id === 'db') { glow(id, [X.db, .3, 0]); let y = 0; for (let i = 0; i < 4; i++) { R.box([X.db, y, 0], [1.1, .1, .8], Object.assign({}, o, { shadow: i === 0, lw: .7 })); y += .14 } H.db = y }
      if (id === 'rep') { glow(id, [X.rep, .2, 0]); [-.55, .55].forEach(dz => { let y = 0; for (let i = 0; i < 3; i++) { R.box([X.rep, y, dz], [.6, .09, .45], Object.assign({}, o, { shadow: i === 0, lw: .7 })); y += .13 } }); H.rep = .4 }
      if (id === 'ca') { glow(id, [X.ca, .4, 0]); R.box([X.ca, 0, 0], [1.1, .06, .34], { fill: P.paper, a });
        R.glass([X.ca - .5, .06, 0], [1.0, 0, 0], [0, .8, 0], { c: mix(P.c5, P.good, nw.ca), a, nu: 5, nv: 3, th: .04 }); H.ca = .86 }
      if (id === 'q') { glow(id, [X.q, .2, ZB]); for (let i = 0; i < 5; i++) R.box([X.q - .5 + i * .25, 0, ZB], [.17, .4, .5], o); H.q = .4 }
      if (id === 'wk') { glow(id, [X.wk, .2, ZB]); [-.4, .4].forEach(dx => R.box([X.wk + dx, 0, ZB], [.6, .4, .5], o)); H.wk = .4 }
      if (id === 'gw') { glow(id, [X.gw, .1, ZF]); R.box([X.gw, 0, ZF], [1.0, .2, 1.0], o); H.gw = .2 }
      if (id === 'mo') { glow(id, [X.mo, .3, ZF]); R.box([X.mo, 0, ZF], [1.3, .55, .9], o); H.mo = .55 }
      if (id === 'gpu') { glow(id, [X.mo, .3, ZF]); [[-.36, -.36], [.36, -.36], [-.36, .36], [.36, .36]].forEach(([dx, dz]) => R.box([X.mo + dx, 0, ZF + dz], [.6, .5, .6], o)); H.gpu = .5 }
    });
    // the floor under every box: the code and its tests (step 8)
    if (k === 7) R.glass([-7.2, .005, -2.8], [11.8, 0, 0], [0, 0, 5.6], { c: P.acc, a: e * .7, nu: 12, nv: 6, th: .01 });
    // ---- requests as dots, along the paths they take; the path a step is about at full strength ----
    // a flow fades with the part it serves when a close view drops that part
    const vis = id => inV(id, pk) + (inV(id, k) - inV(id, pk)) * e;
    let fv = 1; const fl = (pts, o) => { o = Object.assign({ r: .07, speed: 1.3 }, o); o.a = (o.a == null ? 1 : o.a) * fv; R.flow(pts, o) };
    const mid = [X.app + .5, .3, 0];
    const toApp = A.lb > .01 ? [[X.u + .3, .35, 0], [X.lb, .26, 0], [X.app - .5, .3, 0]] : [[X.u + .3, .35, 0], [X.app - .7, .35, 0]];
    const frontA = [[X.app + .5, .3, .35], [X.gw, .3, ZF], [X.mo - .6, .3, ZF]];
    // users to the server: one user is a trickle; Step 1's wall is a flood into one machine, its fix the same flood spread by the balancer
    fv = vis('app');
    if (k === 0) fl(toApp, { c: P.c2, n: 3, speed: .9 });
    else if (k === 1) { fl([[X.u + .3, .35, 0], [X.app - .7, .35, 0]], { c: P.c2, n: 16, speed: 1.8, a: 1 - fx });
      [-.6, 0, .6].forEach(dz => fl([[X.u + .3, .35, 0], [X.lb, .26, 0], [X.app - .5, .3, dz]], { c: P.c2, n: 9, speed: 1.6, a: fx })) }
    else [-.6, 0, .6].forEach(dz => fl([[X.u + .3, .35, 0], [X.lb, .26, 0], [X.app - .5, .3, dz]], { c: P.c2, n: 6, a: k === 2 || k === 4 || k === 5 ? .35 : 1 }));
    // the database: every server reads it (Step 2's wall), then the cache answers nine reads in ten and replicas share the rest
    fv = Math.min(vis('app'), vis('db'));
    if (k >= 1 && A.db > .01) {
      const dbA = k === 1 ? fx : 1;
      if (k === 2) { fl([mid, [X.db - .6, .3, 0]], { c: P.c6, n: 18, speed: 1.8, a: 1 - fx });
        fl([mid, [X.ca - .1, .45, 0]], { c: P.c6, n: 12, a: fx }); fl([[X.ca + .1, .45, 0], [X.db - .6, .3, 0]], { c: P.c6, n: 2, a: fx });
        [-.55, .55].forEach(dz => fl([[X.db + .55, .3, 0], [X.rep - .3, .2, dz]], { c: P.c6, n: 2, r: .05, a: fx })) }
      else if (k > 2) { const a = k === 3 || k === 4 || k === 5 ? .3 : 1; fl([mid, [X.ca - .1, .45, 0]], { c: P.c6, n: 8, a }); fl([[X.ca + .1, .45, 0], [X.db - .6, .3, 0]], { c: P.c6, n: 2, a }) }
      else fl([mid, [X.db - .6, .3, 0]], { c: P.c6, n: 5, a: dbA });
    }
    // slow work: big document dots clog the servers (Step 3's wall), then go to the queue and the workers
    fv = Math.min(vis('app'), vis('q'));
    if (k === 3) { fl(toApp, { c: P.c4, n: 4, r: .14, speed: .7, a: 1 - fx });
      fl([[X.app, .3, -.5], [X.q - .6, .3, ZB], [X.wk - .7, .3, ZB]], { c: P.c4, n: 6, r: .12, speed: .9, a: fx }) }
    else if (k > 3) fl([[X.app, .3, -.5], [X.q - .6, .3, ZB], [X.wk - .7, .3, ZB]], { c: P.c4, n: 5, r: .1, speed: .9, a: k === 4 || k === 5 ? .3 : 1 });
    // the model: one call per message; a hung provider holds the calls (Step 4's wall), the gateway's timeouts and breaker free them
    fv = Math.min(vis('app'), vis('mo'));
    if (k <= 3) fl(k === 0 ? [[X.app + .7, .35, .3], [X.mo - .7, .3, ZF]] : [[X.app + .5, .3, .35], [X.mo - .7, .3, ZF]], { c: P.c3, n: k === 0 ? 3 : 6, a: k === 0 ? 1 : .3 });
    if (k === 4) { fl([[X.app + .5, .3, .35], [X.mo - .7, .3, ZF]], { c: P.c3, n: 10, a: 1 - fx });
      for (let i = 0; i < 9; i++) R.ball([X.mo - .85 - (i % 3) * .16, .25 + Math.floor(i / 3) * .16, ZF - .2 + (i % 2) * .2], .07, { c: P.bad, a: 1 - fx });
      fl(frontA, { c: P.c3, n: 10, a: fx }) }
    fv = 1;
    if (k >= 5) {
      // Step 5: one conversation per weight read is the wall; a batch shares each read (four lanes of dots moving together)
      if (k === 5) { fl([[X.gw + .5, .3, ZF], [X.mo - .65, .3, ZF]], { c: P.c3, n: 3, speed: .6, a: 1 - fx });
        [-.3, -.1, .1, .3].forEach(dz => fl([[X.gw + .5, .3, ZF + dz], [X.mo - .65, .3, ZF + dz]], { c: P.c3, n: 5, r: .06, a: fx })) }
      else [-.3, -.1, .1, .3].forEach(dz => fl([[X.gw + .5, .3, ZF + dz], [X.mo - .65, .3, ZF + dz]], { c: P.c3, n: 4, r: .06 }));
      fv = vis('app'); fl([[X.app + .5, .3, .35], [X.gw - .5, .3, ZF]], { c: P.c3, n: 6, a: k === 5 ? .35 : 1 }); fv = 1;
    }
    // ---- labels: names of the parts in focus, then the wall in red, the fix in green and its owner. A label that a step adds fades in late
    // in the step, once the camera has arrived, so labels never cross while the view moves ----
    const late = win(e, .55, 1);
    const QUIET = { 1: ['one', 'app', 'lb'], 2: ['db', 'ca', 'rep'], 3: ['app', 'q'], 4: ['mo', 'gw'], 5: ['gpu', 'mo', 'gw'] }[k] || [];
    const NM = { u: 'users', one: 'one machine: app + database', lb: 'load balancer', app: 'app servers', db: 'database', ca: 'cache', rep: 'replicas',
      q: 'queue', wk: 'workers', gw: k >= 5 ? 'gateway + router' : 'gateway', mo: 'model API', gpu: 'GPU pool' };
    const POS = { u: [X.u, 0, 0], one: [X.app, 0, 0], lb: [X.lb, 0, 0], app: [X.app, 0, -.6], db: [X.db, 0, 0], ca: [X.ca, 0, 0], rep: [X.rep, 0, -.55],
      q: [X.q, 0, ZB], wk: [X.wk, 0, ZB], gw: [X.gw, 0, ZF], mo: [X.mo, 0, ZF], gpu: [X.mo, 0, ZF - .36] };
    PARTS.forEach(([id]) => { const a = A[id] * dim(id); if (a < .9 || QUIET.includes(id) || (k === 6 && (id === 'u' || id === 'gpu'))) return; const p = POS[id];
      lab(R, [p[0], H[id] || .4, p[2]], NM[id], { fs: 12, mono: true, c: P.mute, dy: -10, a: Math.min(1, a), wide: 1 }) });
    if (k === 0) lab(R, [X.u, .62, 0], '1 user', { fs: 13, b: 1, c: P.c2, dy: -28 });
    // [wall anchor, its dy], [fix anchor, its dy], the wall's alignment and dx; the owner sits under (or over) the fix
    // (Step 4's wall starts left of the servers so it fits on the canvas during the glide and shows from the start)
    const LA = { 1: [[X.app, .7, 0], -30, [X.lb, 0, .55], 16], 2: [[X.db - .55, .56, 0], -34, [X.ca, 0, .3], 18, 'left'], 3: [[X.app, 0, .6], 22, [X.q, .4, ZB], -30, 'left', -90],
      4: [[X.mo + .65, .55, ZF], -44, [X.gw, 0, ZF + .5], 16, 'right'], 5: [[X.mo, .5, ZF - .36], -30, [X.mo, 0, ZF + .5], 16] }[k];
    if (cur.wall && LA) {
      lab(R, LA[0], narrow ? cur.sw : cur.wall, { fs: 12.5, b: 1, c: P.bad, dy: LA[1], al: LA[4] || 'center', dx: LA[5] || 0, a: Math.max(.6, hotOf(e)) * win(e, .05, .2) });
      lab(R, LA[2], narrow ? cur.sf : cur.fix, { fs: 12.5, b: 1, c: P.good, dy: LA[3], a: late });
      lab(R, LA[2], 'owner: ' + cur.own, { fs: 12, c: P.acc, dy: LA[3] + (LA[3] > 0 ? 18 : -18), a: late, wide: 1 });
    }
    const E6 = k === 6 ? getE6() : null;
    if (k === 6 && E6) {
      lab(R, [X.u, .62, 0], '10 million users · ' + f0(E6.msgs / 1e6) + ' million messages a day', { fs: 12.5, b: 1, c: P.ink, dy: -28, al: 'left', dx: -30, a: late });
      lab(R, [X.lb, .16, 0], E6.peak_rps.toLocaleString('en-US') + ' requests/s, busy hour', { fs: 12.5, b: 1, c: P.c1, dy: 24, a: late });
      lab(R, [X.mo, .5, ZF - .36], E6.gpu_peak + ' GPUs', { fs: 13, b: 1, c: P.c2, dy: -28, a: late });
      lab(R, [X.gw - .4, 0, ZF + .55], f0(E6.streams) + ' streams open at once', { fs: 12.5, b: 1, c: P.c3, dy: 16, a: late });
    }
    if (k === 7) { lab(R, [-1.4, 0, 2.8], 'under every box: code and its tests', { fs: 13, b: 1, c: P.acc, dy: 14, a: late });
      lab(R, [-1.4, 0, 2.8], 'owner: ' + cur.own, { fs: 12, c: P.acc, dy: 32, a: late, wide: 1 }) }
  }
  S3.stage({ id: 'stg-map', list: 'sx-map', fig: 'Fig. 1 · one product, six walls, the fix for each', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 2600, hold: 5200, draw,
    margin: w => w < 520 ? [30, 10, 34, 10] : [40, 18, 44, 18], view: k => V[k] || full });
})();
