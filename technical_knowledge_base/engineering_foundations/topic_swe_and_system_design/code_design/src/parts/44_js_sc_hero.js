// ---- Scene: Fig. 1, the hero (stg-hero): the real send_message handler before and after the ten-step refactor (CD.steps, from
// refactor/run_steps.py). Every line of the handler is one slab, as wide as the line is long and indented as in the file, coloured by the concern
// it serves (RD.concernOf, the keyword rules of 40_js_read.js; recompute.py uses the same rules). After the refactor each concern is a call to
// a helper, drawn behind the handler as a module: top face as wide as the entry helper's parameters, height the lines the helpers hide
// (CD.depth, counted from refactor/steps/step10.py by gen_data.py). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.CDK || !window.RD || !RD.concernOf) return;
  const { mix } = S3, { lab, module, win, arcPts, ccol } = CDK;
  const st = k => CD.steps.find(s => s.step === k), S0 = st(0), S10 = st(10);
  const H0 = S0.handler.split('\n'), H1 = S10.handler.split('\n');
  // where each concern went after the refactor: the entry helper first (shared with recompute.py's HELP)
  const HELP = { auth: ['current_owner', 'who'], rate: ['enforce_rate_limit', 'take_token'], idem: ['idempotency_claim', 'claim_key', 'request_fingerprint', 'require_key'], store: ['save_reply', 'chat_exists'], model: ['make_reply'] };
  const SHORT = { auth: 'auth', rate: 'rate limit', idem: 'idempotency', store: 'database', model: 'model call' };
  const D = Object.fromEntries(CD.depth.map(d => [d.name, d]));
  const HID = Object.fromEntries(Object.entries(HELP).map(([c, ns]) => [c, ns.reduce((s, n) => s + (D[n] ? D[n].body : 0), 0)]));
  const DY = .075, TH = .058, DD = .42, X0 = -3.4, ZT = .9;
  const slabs = H => H.map((l, i) => { const ind = l.length - l.trimStart().length, c = RD.concernOf(l); return { i, ind, len: l.trim().length, c: c ? c[0] : null, v: c ? c[2] : null } });
  const B0 = slabs(H0), B1 = slabs(H1);
  // runs of consecutive idempotency lines in the original handler (lines with no concern do not break a run), as recompute.py counts them
  const runs = (() => { const r = []; let prev = null; B0.forEach(s => { if (s.c && s.c !== prev && s.c === 'idem') r.push([]); if (s.c) prev = s.c; if (s.c === 'idem' && r.length) r[r.length - 1].push(s.i) }); return r })();
  window.CD_HERO = { runs: runs.length, hidden: HID };
  const HX = { auth: -2.6, rate: -1.1, idem: .5, store: 2.1, model: 3.4 }, HZ = -1.7;
  function tower(R, B, n, a, o) { const P = R.P; o = o || {}; const top = n * DY;
    B.forEach(s => { const w = .12 + Math.min(s.len, 96) * .034, x = X0 + s.ind * .034 + w / 2, y = top - (s.i + 1) * DY;
      const pop = o.pop && s.c === 'idem' ? o.pop : 0, al = a * (o.focus && s.c !== o.focus ? .22 : 1);
      R.box([x, y, ZT + pop], [w, TH, DD], { fill: s.v ? mix(P.paper, ccol(P, s.v), .78) : P.paper, a: al, shadow: false, lw: .5 }); });
    return top; }
  function draw(R, k, e) {
    const P = R.P; R.grid(-4.4, 4.6, -2.8, 2.2, .5);
    // 1-2. the handler as it was: 52 lines, five concerns interleaved; then the idempotency lines pulled forward, five separate runs
    const a0 = k <= 1 ? 1 : k === 2 ? 1 - win(e, 0, .45) : 0;
    if (a0 > .01) { const top = tower(R, B0, H0.length, a0, { pop: k === 1 ? .9 * e : 0, focus: k === 1 ? 'idem' : null });
      lab(R, [X0 + 1.4, top + .02, ZT], 'send_message · ' + S0.handler_lines + ' lines · complexity ' + S0.cc_handler, { b: 1, fs: 13, dy: -12, a: a0, mono: 1 });
      if (k === 1) runs.forEach((r, j) => { const y = H0.length * DY - (r[0] + 1) * DY; lab(R, [X0 + .2, y, ZT + .9 * e + DD / 2], 'run ' + (j + 1), { al: 'right', dx: -8, fs: 12, c: P.c4, a: e, grp: 'runs' }); }); }
    // 3. after: 17 lines, each concern one named call
    const a1 = k === 2 ? win(e, .5, 1) : k >= 3 ? 1 : 0;
    if (a1 > .01) { const top = tower(R, B1, H1.length, a1);
      lab(R, [X0 + 1.6, 0, ZT + DD / 2], 'send_message · ' + S10.handler_lines + ' lines · complexity ' + S10.cc_handler, { b: 1, fs: 13, dy: 16, a: a1, mono: 1 }); }
    // 4. behind each call, a module: interface on top, what it hides as height
    const a2 = k === 3 ? e : 0;
    if (a2 > .01) RD.CON.forEach(c => { const id = c[0], top = D[HELP[id][0]], col = ccol(P, c[2]), w = .35 + .3 * top.params, h = HID[id] * .07, x = HX[id];
      module(R, [x, 0, HZ], w, h, .7, col, a2, { t: .55 });
      lab(R, [x, h + .05, HZ], SHORT[id], { b: 1, fs: 12.5, c: col, dy: -34, a: a2 });
      lab(R, [x, h + .05, HZ], HID[id] + (HID[id] === 1 ? ' line' : ' lines'), { fs: 12, mono: 1, dy: -18, a: a2 });
      B1.filter(s => s.c === id).forEach((s, j) => { const y = H1.length * DY - (s.i + .5) * DY, w = .12 + Math.min(s.len, 96) * .034, x0 = X0 + s.ind * .034 + w;
        if (j < 2) R.flow(arcPts(R, [x0, y, ZT - DD / 2], [x, h + .08, HZ + .2], .5, 24), { c: col, r: .06, n: 8, speed: 1.2, a: a2 * .9 }); }); });
  }
  const full = { cam: [.36, .36], bounds: [[-3.8, 0, -.2], [1.0, 4.0, 1.4]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one real handler, before and after', cam: full.cam, bounds: full.bounds, aspect: .7, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [20, 8, 12, 8] : [30, 16, 16, 16],
    view: k => k === 1 ? { cam: [.6, .4], bounds: [[-3.8, 0, -.2], [1.4, 4.0, 2.3]] }
      : k === 2 ? { cam: [.4, .5], bounds: [[-3.6, 0, -.2], [.4, 1.5, 1.4]] }
      : k === 3 ? { cam: [.35, .55], bounds: [[-3.8, 0, -2.2], [4.0, 2.4, 1.4]] } : null });
})();
