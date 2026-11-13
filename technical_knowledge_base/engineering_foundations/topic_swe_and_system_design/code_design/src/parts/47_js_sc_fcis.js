// ---- Scene: Fig. 4, functional core and imperative shell (stg-fcis): the LLM call of section 7, before.py as one function and after.py as a
// pure core on a glass plate inside a shell that does all the I/O. Block heights are source lines of each function's body and the labels carry
// radon's McCabe complexity (CD.fcis, from llmcall/after.py by gen_data.py and measure.py); the last step replays the measured refusal
// (CD.llm.scen, key notjson: calls made and seconds slept, recorded with a scripted fake server). ----
(function () {
  if (!document.getElementById('stg-fcis') || !window.CDK) return;
  const { mix } = S3, { lab, poly, win, arcPts } = CDK;
  const F = Object.fromEntries(CD.fcis.after.map(f => [f.name, f])), B = CD.fcis.before;
  const sum = (...ns) => ns.reduce((s, n) => s + F[n].sloc, 0);
  const NJ = CD.llm.scen.find(s => s.key === 'notjson');
  window.CD_FCIS = { refusal: NJ };
  const HU = .1, PY = .6, DBX = -4.9, SAX = -3.7, SPX = -2.55, MPX = 2.55, HAX = 3.7, MAX = 4.9, WZ = -.7, AZ = 1.0, SH = [0, 0, 1.25];
  const RT = [-.85, PY, -.85], PS = [.85, PY, -.85];
  const hSA = sum('SqliteChatStore.__init__', 'SqliteChatStore.messages', 'SqliteChatStore.save_summary') * HU, hHA = sum('HttpChatModel.__init__', 'HttpChatModel.complete') * HU;
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.8, 5.8, -2.4, 2.8, .5);
    const world = (a) => { [[DBX, 'database'], [MAX, 'model API']].forEach(([x, nm]) => { R.box([x, 0, WZ], [.9, .75, .8], { fill: mix(P.paper, P.mute, .28), a }); lab(R, [x, .75, WZ], nm, { fs: 12.5, b: 1, dy: -10, a, c: P.mute }); }) };
    // 1. before.py: everything in one function
    const a0 = k === 0 ? 1 : k === 1 ? 1 - win(e, 0, .4) : 0;
    if (a0 > .01) { world(a0); const h = B.sloc * HU * .6;
      R.box([0, 0, 0], [1.9, h, 1.3], { fill: mix(P.paper, P.c2, .45), a: a0 });
      lab(R, [0, h, 0], 'summarize() · ' + B.sloc + ' lines · complexity ' + B.cc, { mono: 1, b: 1, fs: 12.5, dy: -12, a: a0 });
      if (k === 0) { R.flow(arcPts(R, [DBX + .45, .5, WZ], [-.95, h * .7, 0], .6, 24), { c: P.c6, r: .075, n: 9, a: a0 }); R.flow(arcPts(R, [.95, h * .5, 0], [MAX - .45, .5, WZ], .6, 24), { c: P.c2, r: .075, n: 9, a: a0 });
        R.flow(arcPts(R, [MAX - .45, .3, WZ + .3], [.95, h * .3, .3], .5, 24), { c: P.c2, r: .075, n: 9, a: a0 }); R.flow(arcPts(R, [-.95, h * .2, .3], [DBX + .45, .3, WZ + .3], .5, 24), { c: P.c6, r: .075, n: 9, a: a0 }); } }
    // 2. after.py: a pure core on a glass plate, the shell around it, ports and adapters at its edges
    const a1 = k === 1 ? win(e, .45, 1) : k >= 2 ? 1 : 0;
    if (a1 <= .01) return;
    world(a1);
    const focus = { 2: ['SA', 'SP', 'SH'], 3: ['RT', 'SH'], 4: ['MP', 'HA', 'SH'], 5: ['PS', 'SH', 'SP', 'SA'], 6: ['PS', 'MP', 'HA'] }[k];
    const on = id => !focus || focus.includes(id), A = id => a1 * (on(id) ? 1 : .22);
    R.quad([[-3.0, 0, -1.9], [3.0, 0, -1.9], [3.0, 0, 2.2], [-3.0, 0, 2.2]], { fill: mix(P.paper, P.c5, .1), fa: .6, ea: .6, dash: [5, 4], a: a1 });
    if (k <= 2) lab(R, [0, 0, 2.2], 'imperative shell: all the I/O', { fs: 12.5, c: P.c5, b: 1, dy: 13, a: a1 });
    const core = on('RT') || on('PS') ? 1 : .35;
    R.glass([-1.75, PY, -1.6], [3.5, 0, 0], [0, 0, 1.5], { c: P.c3, a: a1 * core, nu: 6, nv: 3 });
    [[-1.6, -1.5], [1.6, -1.5], [-1.6, -.2], [1.6, -.2]].forEach(([x, z]) => R.box([x, 0, z], [.05, PY, .05], { a: a1 * .7 * core, shadow: false }));
    if (k <= 1 || k === 3) lab(R, [0, PY + .55, -1.6], 'functional core: pure', { fs: 12.5, c: P.c3, b: 1, dy: -12, a: a1, grp: k === 1 ? 'n' : null, wide: 1 });
    // a block, its name, and (on its own steps) its lines and complexity
    const tag = (id, p, h, name, sub) => { if (!(k === 1 || (focus && focus.includes(id)))) return; const t = p[1] + h;
      lab(R, [p[0], t, p[2]], name, { mono: 1, fs: 12, b: 1, dy: sub && k > 1 && R.W >= 520 ? -26 : -12, a: a1, grp: k === 1 ? 'n' : null });
      if (sub && k > 1) lab(R, [p[0], t, p[2]], sub, { mono: 1, fs: 12, dy: -11, a: a1, c: P.mute, wide: 1 }); };
    const blk = (id, p, f, col, w) => { const h = Math.max(.22, f.sloc * HU); R.box(p, [w || 1.0, h, .7], { fill: mix(P.paper, col, .5), a: A(id) });
      tag(id, p, h, f.name, f.sloc + ' lines · cc ' + f.cc); return h; };
    const hRT = blk('RT', RT, F.render_transcript, P.c3), hPS = blk('PS', PS, F.parse_summary, P.c3), hSH = blk('SH', SH, F.summarize_chat, P.c5, 1.3);
    // ports: Protocols (no body), glass plates at the shell's edge; adapters: every method's lines summed
    [[SPX, 'ChatStore', 'SP'], [MPX, 'ChatModel', 'MP']].forEach(([x, nm, id]) => { R.glass([x, .04, AZ - .45], [0, 0, .9], [0, .85, 0], { c: P.c6, a: A(id), nu: 2, nv: 3 });
      if (k === 1) lab(R, [x, 0, AZ + .45], nm, { mono: 1, fs: 12, b: 1, dy: 14, a: a1, wide: 1 }); else tag(id, [x, .04, AZ], .85, nm, 'port'); });   // step 2: a port's name under its plate, clear of its adapter's name above
    [[SAX, 'SqliteChatStore', hSA, 'SA'], [HAX, 'HttpChatModel', hHA, 'HA']].forEach(([x, nm, h, id]) => { R.box([x, 0, AZ], [.95, h, .8], { fill: mix(P.paper, P.c6, .4), a: A(id) });
      tag(id, [x, 0, AZ], h, nm, Math.round(h / HU) + ' lines'); });
    const fl = (pts, c, n, a) => R.flow(poly(pts, 10), { c, r: .08, n, speed: 1.3, a: (a == null ? 1 : a) * a1 });
    if (k === 2) fl([[DBX + .45, .4, WZ], [SAX - .5, .4, AZ], [SPX, .45, AZ], [-.65, .3, SH[2]]], P.c6, 18);
    if (k === 3) { R.flow(arcPts(R, [-.3, hSH, SH[2]], [RT[0], PY + hRT + .05, RT[2]], .5, 20), { c: P.c3, r: .08, n: 9, a: a1 }); R.flow(arcPts(R, [RT[0] + .3, PY + hRT, RT[2]], [.1, hSH, SH[2]], .4, 20), { c: P.c3, r: .08, n: 9, a: win(e, .3, .8) }); }
    if (k === 4) { fl([[.65, .3, SH[2]], [MPX, .45, AZ], [HAX - .5, .4, AZ], [MAX - .45, .4, WZ]], P.c2, 18); fl([[MAX - .45, .2, WZ + .2], [HAX + .5, .2, AZ]], P.c2, 6, win(e, .4, .9)); }
    if (k === 5) { fl([[HAX - .5, .3, AZ - .2], [MPX, .3, AZ - .2], [PS[0] + .3, PY + .1, PS[2] + .35]], P.c2, 12); R.flow(arcPts(R, [PS[0], PY + hPS, PS[2]], [.2, hSH, SH[2]], .4, 20), { c: P.c3, r: .08, n: 9, a: win(e, .25, .7) });
      fl([[-.65, .25, SH[2]], [SPX, .3, AZ], [SAX + .5, .3, AZ], [DBX + .45, .3, WZ]], P.c6, 16, win(e, .5, 1)); }
    if (k === 6) { const t = win(e, .1, .6); fl([[HAX - .5, .3, AZ - .2], [MPX, .3, AZ - .2], [PS[0] + .3, PY + .1, PS[2] + .35]], P.c2, 12);
      const c = [PS[0] + .75, PY + hPS * .5, PS[2]], d = .2; R.line([[c[0] - d, c[1] - d, c[2]], [c[0] + d, c[1] + d, c[2]]], { c: P.bad, w: 3, a: t, top: 1 }); R.line([[c[0] - d, c[1] + d, c[2]], [c[0] + d, c[1] - d, c[2]]], { c: P.bad, w: 3, a: t, top: 1 });
      lab(R, [c[0] + .2, c[1], c[2]], 'ModelOutputError', { al: 'left', dx: 10, mono: 1, fs: 12, b: 1, c: P.bad, a: t });
      lab(R, [0, 0, 2.2], 'before: ' + NJ.before.calls + ' calls, ' + NJ.before.slept_s + ' s slept, returns None', { mono: 1, fs: 12, c: P.bad, b: 1, dy: 13, a: t });
      lab(R, [0, 0, 2.2], 'after: ' + NJ.after.calls + ' call, ' + NJ.after.slept_s + ' s slept, raises', { mono: 1, fs: 12, c: P.good, b: 1, dy: 30, a: t }); }
  }
  const full = { cam: [.5, .62], bounds: [[-5.4, 0, -1.9], [5.4, 2.0, 2.5]] };
  S3.stage({ id: 'stg-fcis', list: 'sx-fcis', fig: 'Fig. 4 · the LLM call, decisions in a pure core', cam: full.cam, bounds: full.bounds, aspect: .54, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 30, 8] : [34, 16, 40, 16],
    view: k => k === 3 ? { cam: [.45, .7], bounds: [[-3.0, 0, -1.9], [3.0, 1.6, 2.4]] } : null });
})();
