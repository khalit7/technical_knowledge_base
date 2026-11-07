// ---- Scene: Fig. 3, dependency direction with ports and adapters (stg-dir). The chat service of section 5 laid out as terraces: the domain
// rules (with the ports it defines) on top, services below them, the HTTP layer at the bottom; adapters, the outside world and main.py on the floor
// around it. Imports point up and inward; a call flows out through a port. The layout is the structure section 5 describes (illustrative names);
// the last step's test count is the refactored LLM call's real suite (CD.llm.unit, run by llmcall/measure.py). ----
(function () {
  if (!document.getElementById('stg-dir') || !window.CDK) return;
  const { mix } = S3, { lab, poly, arrow, win } = CDK;
  const T = [['api/', 5.0, 0, '--c1', 'routers: HTTP in, HTTP out'], ['services/', 3.4, .2, '--c4', 'use cases'], ['domain/ + ports.py', 1.9, .4, '--c3', 'pure rules, Protocols']];
  const TH = .2, TOP = .6, PX = .95, PORTS = [['ChatStore', -.5], ['ChatModel', .5]];
  const AD = [['postgres_store.py', 3.6, -1.15, 'sqlite_store.py · in-memory fake'], ['http_model.py', 3.6, 1.15, 'FakeModel']];
  const WORLD = [['database', 5.6, -1.15], ['model API', 5.6, 1.15]];
  const MAIN = [-3.2, 0, 2.6], CL = [-4.3, 0, 0];
  const pc = (P, v) => P[v.slice(2)];
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.2, 6.6, -3.0, 3.4, .5);
    const lit = i => k === 0 ? (i === 2 ? 1 : .2) : 1;
    // the terraces: each layer may import only the layers above it (toward the middle)
    T.forEach(([nm, s, y, c, sub], i) => { const a = lit(i), col = pc(P, c);
      R.box([0, y, 0], [s, TH, s], { fill: mix(P.paper, col, i === 2 ? .5 : .25), a, shadow: i === 0 });
      lab(R, [-s / 4, y + TH, s / 2], nm, { b: 1, fs: 12.5, mono: 1, c: col, dy: 11, a: Math.max(.35, a) });
      if (k === 0 && i === 2) lab(R, [0, y + TH, 0], sub, { fs: 12, dy: -12, a: e }); });
    // 2. import arrows climbing inward, on two sides
    const ia = k === 1 ? e : k >= 2 ? .55 : 0;
    if (ia > .01) [[-1, 0], [0, 1]].forEach(([sx, sz], j) => { for (let i = 0; i < 2; i++) { const r0 = T[i][1] / 2 - .25, r1 = T[i + 1][1] / 2 + .05, y = T[i][2] + TH + .01;
        arrow(R, [sx * r0, y, sz * r0], [sx * r1, T[i + 1][2] + TH * .5, sz * r1], P.ink, ia, { w: 2 }); }
      if (j === 1 && k === 1) lab(R, [0, TH, T[0][1] / 2 - .2], 'imports', { fs: 12, c: P.ink, dy: 14, a: ia }); });
    // 3. ports: Protocols the core defines (glass plates at its edge); adapters outside implement them
    const pa = k >= 2 ? (k === 2 ? e : 1) : 0;
    PORTS.forEach(([nm, z]) => { if (pa <= .01) return; R.glass([PX, TOP, z - .36], [0, 0, .72], [0, .8, 0], { c: P.c3, a: pa, nu: 2, nv: 3 });
      lab(R, [PX, TOP + .8, z], nm, { mono: 1, fs: 12, b: 1, c: P.c3, dy: -9, a: pa, grp: 'ports' }); });
    const sw = k === 5 ? win(e, .2, .8) : 0;
    AD.forEach(([nm, x, z, alt], j) => { if (pa <= .01) return;
      R.box([x, 0, z], [1.5, .45, .8], { fill: mix(P.paper, P.c6, .3 + .2 * sw), a: pa });
      lab(R, [x, .45, z], sw > .5 ? alt : nm, { mono: 1, fs: 12, dy: -10, a: pa, c: sw > .5 ? P.good : P.ink });
      arrow(R, [x - .78, .3, z], [PX + .08, TOP + .3, PORTS[j][1]], P.c6, pa * .9, { dash: [5, 4], w: 1.6 });
      if (k === 2 && j === 0) lab(R, [(x + PX) / 2, .5, z * .7], 'implements', { fs: 12, c: P.c6, dy: -6, a: pa, wide: 1 }); });
    // 4. a request comes in through api/, the use case calls a port, and the call leaves through the adapter
    const wa = k >= 3 ? (k === 3 ? e : .35) : 0;
    WORLD.forEach(([nm, x, z]) => { if (wa <= .01) return; R.box([x, 0, z], [.9, .7, .8], { fill: mix(P.paper, P.mute, .25), a: Math.max(wa, k >= 3 ? .4 : 0) });
      lab(R, [x, .7, z], nm, { fs: 12, dy: -10, a: Math.max(wa, .4), c: P.mute }); });
    if (k >= 3) { const a = k === 3 ? 1 : k === 5 ? .2 : .35;
      R.box(CL, [.8, .55, .8], { fill: mix(P.paper, P.c2, .3), a: Math.max(.35, a) }); lab(R, [CL[0], .55, CL[2]], 'client', { b: 1, fs: 12.5, dy: -10, a: Math.max(.35, a) });
      if (k === 3) { R.flow(poly([[CL[0] + .4, .35, 0], [-2.2, TH + .12, 0], [-1.4, .2 + TH + .12, 0], [.4, .2 + TH + .12, -.5], [PX, TOP + .25, -.45], [AD[0][1] - .75, .3, AD[0][2]]], 10), { c: P.c2, r: .09, n: 26, speed: 1.4, a: Math.min(1, e * 2), top: 1 });
        R.flow(poly([[AD[0][1] + .75, .25, AD[0][2]], [WORLD[0][1] - .45, .3, WORLD[0][2]]], 8), { c: P.c2, r: .09, n: 7, speed: 1.4, a: win(e, .3, .7) });
        R.flow(poly([[.4, .2 + TH + .05, .45], [PX, TOP + .25, .45], [AD[1][1] - .75, .3, AD[1][2]], [WORLD[1][1] - .45, .3, WORLD[1][2]]], 10), { c: P.c2, r: .09, n: 16, speed: 1.4, a: win(e, .4, .9) });
      } }
    // 5. main.py, the composition root, builds the adapters and hands them in
    const ma = k === 4 ? e : k === 5 ? .4 : 0;
    if (ma > .01) { R.box(MAIN, [1.2, .5, .8], { fill: mix(P.paper, P.c5, .45), a: ma }); lab(R, [MAIN[0], .5, MAIN[2]], 'main.py', { mono: 1, b: 1, fs: 12.5, dy: -10, a: ma });
      if (k === 4) { AD.forEach(([, x, z]) => R.flowArc([MAIN[0] + .6, .4, MAIN[2]], [x - .3, .45, z], 1.1, { c: P.c5, r: .07, a: ma, speed: 1.2 }));
        R.flowArc([MAIN[0], .5, MAIN[2] - .4], [-1.6, TH + .02, 1.6], .6, { c: P.c5, r: .07, a: ma, speed: 1.2 }); } }
    // 6. tests: the same ports, other adapters, no network
    if (k === 5) lab(R, [AD[1][1], .45, AD[1][2] + .4], 'tests: ' + CD.llm.unit, { mono: 1, fs: 12, b: 1, c: P.good, dy: 44, a: sw, wide: 1 });
  }
  const full = { cam: [.55, .62], bounds: [[-4.9, 0, -2.6], [6.2, 1.3, 3.1]] };
  S3.stage({ id: 'stg-dir', list: 'sx-dir', fig: 'Fig. 3 · imports point in, calls flow out', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [20, 8, 14, 8] : [28, 16, 18, 16],
    view: k => k === 0 ? { cam: [.5, .7], bounds: [[-2.8, 0, -2.6], [2.8, 1.2, 2.8]] } : k === 2 ? { cam: [.75, .6], bounds: [[-1.5, 0, -2.0], [6.2, 1.4, 2.0]] } : null });
})();
