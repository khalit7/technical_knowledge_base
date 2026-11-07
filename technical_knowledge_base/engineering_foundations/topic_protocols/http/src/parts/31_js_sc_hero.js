// ---- Scene: Fig. 1, the hero (stg-hero): one streaming LLM request through five HTTP participants (the SDK, a CDN edge, a load balancer,
// a reverse proxy, the model server). The same meaning travels every hop; each link is its own connection; the answer streams back; then a 90 s
// think is replayed against every hop's documented timer. The timers and outcomes are not drawn by hand: they come from the section 9 model
// (window.TCHAIN, the same rules recompute.py checks against the eight measured runs) and its documented defaults (window.TCHAIN_OPT). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.HTK || !window.TCHAIN || !window.TCHAIN_OPT) return;
  const { mix, at } = S3, { up, node, lane, chunk, timer, cut, along, win } = HTK, O = TCHAIN_OPT;
  const X = [-4.8, -2.4, 0, 2.4, 4.8], NAMES = ['Your code + SDK', 'CDN edge', 'Load balancer', 'Reverse proxy', 'Model server'];
  const SUB = ['Anthropic or OpenAI SDK', 'Cloudflare', 'AWS ALB (L7)', 'nginx', 'the origin'], SHORT = ['SDK', 'CDN', 'LB', 'nginx', 'Model'];
  const LINK = ['HTTP/1.1 or 2 (ALPN)', 'a new connection', 'a new connection', 'HTTP/1.1 (nginx default)'];
  // the path the timers are replayed on: the documented defaults, as in the section 9 lab
  const hop = (k, i, role) => Object.assign({ key: k, role }, O[k][i]);
  const PATH = [hop('client', 0, 'client'), hop('cdn', 1, 'proxy'), hop('lb', 1, 'proxy'), hop('ing', 1, 'proxy')];
  const PATH_G = [PATH[0], PATH[1], hop('lb', 2, 'proxy'), PATH[3]];   // the load balancer swapped for Google Cloud's (30 s total)
  const RUN = { stream: true, think: 90, ntok: 61, gap: 2, ping: 0 }, RUNP = Object.assign({}, RUN, { ping: 15 });
  const CASES = { 3: [PATH, RUN], 4: [PATH, RUNP], 5: [PATH_G, RUNP] };
  const RES = {}; Object.keys(CASES).forEach(k => { const [h, r] = CASES[k]; RES[k] = TCHAIN.run(h, r) });
  window.HERO_RES = RES;   // for src/check_stages.mjs: the step list quotes these outcomes
  const fmt = s => Math.round(s) + ' s';
  // elapsed fraction of a timer at time t (seconds) for the bytes b of a run
  function frac(kind, L, b, t) {
    if (kind === 'total') return t / L;
    if (kind === 'first') return b.head <= t ? 0 : t / L;
    let last = 0; b.times.forEach(x => { if (x <= t + 1e-9) last = x }); return (t - last) / L;
  }
  const ZL = 0, YM = .62, HB = [1.3, .66, 1.0], ZT = ZL - 1.55, HT = 2.1;
  function draw(R, k, e) {
    const P = R.P, nar = R.W < 520; R.grid(-6, 6, -2.8, 2.2, .5);
    const ga = k === 1 ? 1 : .55;   // the links stand out when the step is about them
    for (let i = 0; i < 4; i++) lane(R, X[i] + HB[0] / 2, X[i + 1] - HB[0] / 2, ZL, .55, [P.c1, P.c6, P.c6, P.c3][i], ga * (k === 1 ? at(k, e, 1) * .7 + .3 : 1));
    X.forEach((x, i) => node(R, [x, 0, ZL], HB, i === 4 ? P.good : i === 0 ? P.acc : P.c6, nar ? SHORT[i] : NAMES[i], { sub: k < 3 ? SUB[i] : null, subWide: 1, fs: nar ? 12 : 13 }));
    // 1. one meaning: the same request plate goes hop to hop
    if (k === 0) {
      const u = e * 4, i = Math.min(3, Math.floor(u)), p = along([X[i] + .3, .02, ZL + .05], [X[i + 1] - .3, .02, ZL + .05], u - i);
      R.flow([[X[0], YM, ZL], [X[4], YM, ZL]], { c: P.acc, r: .06, n: 16, speed: 1.6, a: .85 });
      R.glass([p[0] - .32, .05, p[2]], [.64, 0, 0], [0, .78, 0], { c: P.acc, nu: 2, nv: 4, th: .03 });
      R.label([p[0], .83, p[2]], 'POST /v1/messages · 117-byte JSON body', { mono: true, fs: 12.5, b: 1, c: P.acc, dy: -10 });
    }
    // 2. each link is its own connection with its own wire format; every box re-parses and sends a new message
    if (k === 1) {
      for (let i = 0; i < 4; i++) {
        const m = (X[i] + X[i + 1]) / 2;
        R.flow([[X[i] + .62, .3, ZL], [X[i + 1] - .62, .3, ZL]], { c: [P.c1, P.c6, P.c6, P.c3][i], r: .055, n: 6, speed: 1.2, a: at(k, e, 1) });
        R.label([m, 0, ZL + .3], LINK[i], { fs: 12, c: P.ink, dy: 16 + (i % 2) * 16, a: at(k, e, 1), wide: 1 });
      }
      X.forEach((x, i) => R.glass([x - .2, HB[1] + .05, ZL - .05], [.4, 0, 0], [0, .48, 0], { c: P.acc, nu: 1, nv: 3, th: .03, a: .8 * at(k, e, 1) }));
    }
    // 3. the answer: the head at once, then tokens stream back through every hop
    if (k === 2) {
      R.flow([[X[4] - .6, .35, ZL], [X[0] + .6, .35, ZL]], { c: P.c1, r: .07, n: 22, speed: 1.4, a: at(k, e, 2) });
      const p = along([X[4] - .65, .05, ZL - .05], [X[0] + .65, .05, ZL - .05], win(e, 0, .8));
      chunk(R, p, P.c4, 1, { s: [.42, .32, .42] });
      R.label(up(p, .32), '200 · text/event-stream', { mono: true, fs: 12.5, b: 1, c: P.c4, dy: -10 });
    }
    // 4 to 6. the replay: a timer column behind each hop, filling with silence (idle), with waiting for the head (first byte) or with time (total)
    if (k >= 3) {
      const [H, r] = CASES[k], res = RES[k], T = res.best ? res.at : res.end, t = T * e, b = res.b;
      H.forEach((h, i) => h.timers.forEach(([kind, L]) => {
        const fired = !!res.best && res.best.hop === i && res.best.kind === kind && t >= res.at - 1e-9;
        const f = frac(kind, L, b, Math.min(t, T)), c = kind === 'total' ? P.c5 : kind === 'first' ? P.c4 : P.c3;
        timer(R, [X[i], 0, ZT], fired ? 1 : f, HT, c, 1, (nar ? '' : kind + ' ') + L + ' s', { fired });
      }));
      // what has come back so far: pings (yellow) and tokens (blue) flow toward the client while they arrive
      const lastByte = b.times.filter(x => x <= t + 1e-9).pop() || 0, fresh = t - lastByte < Math.max(1.2, T * .03);
      if (fresh && !(res.best && t >= res.at - 1e-9)) R.flow([[X[4] - .6, .35, ZL], [X[0] + .6, .35, ZL]], { c: lastByte >= r.think ? P.c1 : P.c5, r: .065, n: 14, speed: 1.6 });
      const got = b.tokens.filter(x => x <= t + 1e-9 && (!res.best || x < res.at - 1e-9)).length;
      R.label([X[2], HT + 1.25, ZT], 't = ' + fmt(t) + ' · ' + got + ' of ' + r.ntok + ' tokens' + (r.ping && !nar ? ' · ping every ' + r.ping + ' s' : ''), { mono: true, fs: 13, b: 1 });
      if (res.best && t >= res.at - 1e-9) {
        const i = res.best.hop; cut(R, [X[i] - 1.2, .45, ZL], 1);
        R.label([X[i] - 1.2, 0, ZL + .5], 'cut at ' + fmt(res.at) + (res.result === 'cut under 200' ? ', under a 200' : ''), { fs: 12.5, b: 1, c: P.bad, dy: 18 });
      } else if (!res.best && e > .98) R.label([X[0], HB[1], ZL], 'complete at ' + fmt(res.end), { fs: 12.5, b: 1, c: P.good, dy: -44 });
    }
  }
  const full = { cam: [.18, .62], bounds: [[-5.6, 0, -1.0], [5.6, 1.4, 1.1]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one request, five HTTP participants', cam: full.cam, bounds: full.bounds, aspect: .46, dur: 2600, hold: 4400, draw,
    margin: w => w < 520 ? [26, 8, 30, 8] : [36, 16, 36, 16],
    view: k => k === 1 ? { cam: [.12, .5], bounds: [[-5.6, 0, -.8], [5.6, 1.4, 1.2]] } : k >= 3 ? { cam: [.2, .36], bounds: [[-5.6, 0, ZT - .3], [5.6, HT + 1.2, 1.0]] } : full });
})();
