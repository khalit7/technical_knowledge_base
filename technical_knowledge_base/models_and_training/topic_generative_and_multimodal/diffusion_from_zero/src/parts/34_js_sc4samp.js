// ---- Fig. 4 (section 5): samplers walking back on the two-moons toy. Height is the timestep (1,000 at the top plate, 0 on the floor);
// 40 of the measured table's 600 noise draws (seed 11) traced through DDIM and DDPM at 100 network calls, DDIM at 1 call and at 5 calls on
// the linear and the cosine schedule (DZSC.samp, recorded with the page's sampler by make_scene_data.mjs; the share of all 600 samples
// within 0.2 of a moon is the measured table's, asserted equal there). ----
(function () {
  if (!document.getElementById('stg-samp') || !window.DZK) return;
  const K = DZK, SM = DZSC.samp, S = .55, HT = 2.7, NP = DZSC.keep;
  const pos = (x, y, lev) => [Math.max(-3.2, Math.min(3.2, x)) * S, HT * lev / 1000 + .05, -Math.max(-3.2, Math.min(3.2, y)) * S];
  const RUN = {}; Object.keys(SM).forEach(k => { RUN[k] = { fr: SM[k].paths.map((b, i) => K.dec('sp' + k + i, b)), lev: SM[k].lev, end: K.dec('se' + k, SM[k].end), on: SM[k].on }; });
  const path = (r, p, upto) => { const n = r.fr.length, m = Math.max(1, Math.round(upto * (n - 1))), pts = []; for (let i = 0; i <= m; i++) pts.push(pos(r.fr[i][2 * p], r.fr[i][2 * p + 1], r.lev[i])); return pts };
  function plate(R, y, col, a, ttl) { if (a <= .01) return; const w = 3.6; R.glass([-w / 2, y + .02, w / 2], [w, 0, 0], [0, 0, -w], { c: col, a: a * .7, nu: 8, nv: 8, th: .02 });
    if (ttl) R.label(y > 0 ? [w / 2 + .1, y, -w / 2] : [w / 2 + .1, y, w / 2], ttl, { fs: 12.5, b: 1, al: 'left', dx: 8, c: R.P.ink, a: Math.max(.4, a), wide: 1 }); }
  function run(R, key, col, a, upto, o) { o = o || {}; if (a <= .01) return; const r = RUN[key];
    for (let p = 0; p < NP; p++) { const pts = path(r, p, upto); R.line(pts, { c: col, w: o.w || 1.5, a: a * .8 });
      if (o.flow && p % 3 === 0 && upto > .2) R.flow(pts, { c: col, r: .045, n: 4, speed: 1.3, a: a * .9 }); }
    if (upto >= 1) for (let p = 0; p < 2 * DZSC.n; p += 2 * (o.every || 1)) R.ball([Math.max(-3.2, Math.min(3.2, r.end[p])) * S, .06, -Math.max(-3.2, Math.min(3.2, r.end[p + 1])) * S], .028, { c: col, a: a * .8 }); }
  function draw(R, k, e) {
    const P = R.P, grey = S3.mix(P.paper, P.mute, .6);
    R.grid(-3, 3, -2.4, 2.4, .5);
    plate(R, 0, P.c3, 1, 't = 0: the data'); plate(R, HT, P.c6, k === 0 ? 1 : .45, 't = 1,000: pure noise');
    K.cloud(R, [0, 0, 0], K.D.X, grey, .55, { every: 2, r: .03, h: .04 });   // the data, for reference (the toy's 300 points)
    // the 40 starting draws on the top plate
    const s0 = RUN.ddim100.fr[0]; for (let p = 0; p < NP; p++) R.ball(pos(s0[2 * p], s0[2 * p + 1], 1000), .05, { c: P.ink, a: k === 0 ? e : .5 });
    const fade = (s) => k === s ? 1 : k > s ? .14 : 0, up = s => k === s ? e : 1;
    run(R, 'ddim100', P.c1, k === 1 ? 1 : k === 2 ? .25 : 0, up(1), { flow: k === 1, every: k === 1 ? 1 : 3 });
    run(R, 'ddpm100', P.c2, k === 2 ? 1 : 0, up(2), { flow: k === 2 });
    run(R, 'ddim1', P.c5, k === 3 ? 1 : 0, up(3), { w: 1.8, flow: k === 3 });
    run(R, 'ddim5', P.c4, k === 4 ? 1 : k === 5 ? .25 : 0, up(4), { w: 1.8, flow: k === 4, every: k === 4 ? 1 : 3 });
    run(R, 'ddim5cos', P.c3, k === 5 ? 1 : 0, up(5), { w: 1.8, flow: k === 5 });
    // where the five calls sit: the log-SNR the network sees at each one, on each schedule
    if (k >= 4) { const lev = RUN.ddim5.lev.slice(0, 5); lev.forEach((t, i) => { const y = HT * t / 1000 + .05;
      R.label([-1.85, y, 1.8], 'λ ' + SM.ddim5.lam[i].toFixed(1).replace('-', '−'), { fs: 12, mono: 1, al: 'right', dx: -6, c: P.c4, b: 1, a: k === 4 ? e : .6, grp: 'lamL' });
      if (k === 5) R.label([1.85, y, -1.8], 'λ ' + SM.ddim5cos.lam[i].toFixed(1).replace('-', '−'), { fs: 12, mono: 1, al: 'left', dx: 6, c: P.c3, b: 1, a: e, grp: 'lamR' }); }); }
    const say = { 1: ['ddim100', P.c1, 'DDIM, 100 calls'], 2: ['ddpm100', P.c2, 'DDPM, 100 calls'], 3: ['ddim1', P.c5, 'DDIM, 1 call'], 4: ['ddim5', P.c4, 'DDIM, 5 calls, linear'], 5: ['ddim5cos', P.c3, 'DDIM, 5 calls, cosine'] }[k];
    if (say) R.label([0, 0, 2.2], say[2] + ': ' + K.pc(RUN[say[0]].on) + ' of 600 on the moons', { fs: 12.5, b: 1, dy: 14, c: say[1], a: e > .85 ? (e - .85) / .15 : 0 });
  }
  const full = { cam: [.5, .4], bounds: [[-2, 0, -2], [2, HT + .1, 2.2]] };
  S3.stage({ id: 'stg-samp', list: 'sx-samp', fig: 'Fig. 4 · the same noise, walked back by five samplers', cam: full.cam, bounds: full.bounds, aspect: .64, dur: 2200, hold: 4800, draw,
    margin: w => w < 520 ? [12, 10, 26, 10] : [16, 120, 30, 70] });
})();
