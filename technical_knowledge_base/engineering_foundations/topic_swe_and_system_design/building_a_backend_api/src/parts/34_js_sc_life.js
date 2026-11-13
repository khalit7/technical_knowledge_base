// ---- Scene: Fig. 2 (stg-life): one recorded request, GET /trace on exp_app.py, through every stage in the order it ran.
// The order numbers come from API_DATA.runs.trace.order (logged by the app itself, run_experiments.py, 2026-10-24); router and validation
// are not logged and carry no number. Under the stage, the artefact of each step: the ASGI scope, the log lines, the code that ran. ----
(function () {
  if (!document.getElementById('stg-life') || !window.BAK || !window.API_DATA) return;
  const { mix } = S3, { party, stagePlate, win, seg, poly , lab } = BAK;
  const D = window.API_DATA, T = D.runs.trace, O = T.order, esc = RD.esc;
  const pos = s => O.findIndex(o => o.startsWith(s)) + 1;   // 1-based position of a logged event
  const N = { mw2in: pos('middleware added second: enter'), mw1in: pos('middleware added first: enter'), dep: pos('dependency'), h: pos('handler'),
    mw1out: pos('middleware added first: exit'), mw2out: pos('middleware added second: exit') };
  window.BA_LIFE = N;   // read by src/check_stages.mjs
  const X = { cl: -6.0, srv: -4.5, mw2: -3.45, mw1: -2.6, route: -1.6, dep: -.6, val: .4, h: 1.8 };
  const ord = n => ['1st', '2nd', '3rd', '4th', '5th', '6th'][n - 1];
  function draw(R, k, e) {
    const P = R.P;
    R.grid(-7, 3.4, -2.2, 2.2, .5);
    party(R, [X.cl, 0, 0], [.9, .6, .9], P.c2, k <= 1 || k === 6 ? 'client' : null, { a: k === 0 || k === 6 ? 1 : .35 });
    const PL = [['srv', 'uvicorn', 0], ['mw2', 'middleware added second', 1], ['mw1', 'middleware added first', 1], ['route', 'router', 2], ['dep', 'dependency', 3], ['val', 'validation', 4]];
    // in a close view, only the stages in it carry their names (labels are clamped inside the canvas, so names of stages out of view would pile up at its edge)
    const VIS = [['srv', 'mw2'], ['srv', 'mw2', 'mw1'], ['mw1', 'route', 'dep', 'val'], ['mw1', 'route', 'dep', 'val'], ['mw1', 'route', 'dep', 'val'], ['dep', 'val'], ['srv', 'mw2', 'mw1', 'dep', 'val']][k];   // last step: the router's faded name sat on the middleware's
    PL.forEach(([id, nm, s]) => { const now = s === k || (k === 6 && (id === 'mw1' || id === 'mw2' || id === 'srv')), done = s < k;
      const c = id === 'mw1' || id === 'mw2' ? P.c1 : id === 'dep' ? P.c5 : id === 'val' ? P.c3 : id === 'route' ? P.c6 : P.c2;
      stagePlate(R, X[id], 0, c, now ? 1 : done ? .45 : .22, !VIS || VIS.includes(id) ? nm : null, { d: 1.4, h: 1.1, glow: c, gl: now ? .7 : 0, grp: 'pl', lc: now ? c : P.ink, amin: .35 }); });
    party(R, [X.h, 0, 0], [1.2, .8, 1.1], P.acc, k >= 2 ? 'handler' : null, { a: k >= 5 ? 1 : .3, t: .35 });
    // the request travels as far as this step's stage; the response comes back on the last step
    const stopX = [X.srv, X.mw1, X.route, X.dep, X.val, X.h - .62][Math.min(k, 5)], fromX = k === 0 ? X.cl + .5 : [X.srv, X.mw1, X.route, X.dep, X.val][Math.min(k - 1, 4)];
    if (k < 6) { R.line([[X.cl + .5, .52, 0], [stopX, .52, 0]], { c: P.c2, w: 1.4, a: .35, dash: [4, 4] });
      R.flow(seg([fromX, .52, 0], [stopX, .52, 0], 16), { c: P.c2, r: .075, n: 6, speed: 1.3, a: Math.min(1, e * 2) }); }
    else R.flow(seg([X.h - .62, .32, .25], [X.cl + .5, .32, .25], 40), { c: P.c3, r: .075, n: 14, speed: 1.6, a: Math.min(1, e * 2) });
    // the recorded order, where the app logged it
    const tag = (x, y, t, c, a) => lab(R, [x, y, 0], t, { fs: 12, b: 1, mono: 1, c, dy: 14, a, wide: 1, grp: 'tag' });
    if (k >= 1 && k < 6) { tag(X.mw2, 0, 'in ' + ord(N.mw2in), P.c1, k === 1 ? win(e, .1, .4) : .6); tag(X.mw1, 0, 'in ' + ord(N.mw1in), P.c1, k === 1 ? win(e, .4, .7) : .6) }
    if (k === 2) lab(R, [X.route, 0, 0], 'GET /trace → trace()', { fs: 12, mono: 1, c: P.c6, dy: 34, a: win(e, .3, .6), wide: 1 });
    if (k >= 3) tag(X.dep, 0, ord(N.dep), P.c5, k === 3 ? win(e, .2, .5) : .6);
    if (k === 3) lab(R, [X.dep, 0, 0], 'current_user → "' + T.user + '"', { fs: 12, mono: 1, c: P.c5, dy: 34, a: win(e, .4, .7), wide: 1 });
    if (k === 4) lab(R, [X.val, 0, 0], 'header read; no body', { fs: 12, c: P.c3, dy: 34, a: win(e, .3, .6), wide: 1 });
    if (k >= 5) lab(R, [X.h, 0, .55], ord(N.h), { fs: 12, b: 1, mono: 1, c: P.acc, dy: 14, a: k === 5 ? win(e, .2, .5) : .6, wide: 1 });
    if (k === 5) lab(R, [X.h, 0, .55], 'returns a dict → JSON', { fs: 12, mono: 1, c: P.acc, dy: 34, a: win(e, .3, .6), wide: 1 });
    if (k === 6) { tag(X.mw1, 0, 'in ' + ord(N.mw1in) + ' · out ' + ord(N.mw1out), P.c3, win(e, .3, .6)); tag(X.mw2, 0, 'in ' + ord(N.mw2in) + ' · out ' + ord(N.mw2out), P.c3, win(e, .6, .9)) }
  }
  // the artefact of each step, under the stage
  const art = document.getElementById('rd-life-art');
  const logl = hl => '<div class="raw" style="white-space:pre-wrap">' + O.map((o, i) => '<span class="ln' + (hl.includes(i) ? ' on' : '') + '">' + (i + 1) + '. ' + esc(o) + '</span>').join('') + '</div>';
  const code = (a, b) => '<div class="code">' + RAW.excerpt(D.src2, a, b, 0) + '</div>';
  const scope = JSON.stringify(T.scope, null, 1).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, a) => '[' + a.replace(/\s*\n\s*/g, ' ') + ']');
  const ART = [() => '<div class="small mute">The ASGI scope, as the app received it (client port elided)</div><div class="raw codebox">' + esc(scope) + '</div>',
    () => '<div class="small mute">The app\'s own log</div>' + logl([0, 1]),
    () => '<div class="small mute">The route that matched</div>' + code('@app.get("/trace")', 'async def trace'),
    () => '<div class="small mute">The log, and the dependency</div>' + logl([2]) + code('def current_user', 'return "alice"'),
    () => '<p class="small mute">No body on this route; the 422 answers of the chat API are in section 3.</p>',
    () => '<div class="small mute">The app\'s own log</div>' + logl([3]),
    () => '<div class="small mute">The app\'s own log</div>' + logl([4, 5])];
  const full = { cam: [.7, .45], bounds: [[-6.6, 0, -1.3], [2.6, 1.3, 1.3]] };
  S3.stage({ id: 'stg-life', list: 'sx-life', fig: 'Fig. 2 · one recorded request, stage by stage', cam: full.cam, bounds: full.bounds, aspect: .44, dur: 1400, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 16, 8] : [30, 14, 22, 14],
    view: k => k === 0 ? { cam: [.72, .42], bounds: [[-6.6, 0, -1.2], [-3.4, 1.2, 1.2]] }
      : k === 1 ? { cam: [.72, .42], bounds: [[-5.2, 0, -1.2], [-1.9, 1.2, 1.2]] }
      : k >= 2 && k <= 4 ? { cam: [.72, .42], bounds: [[-3.0, 0, -1.2], [1.2, 1.2, 1.2]] }
      : k === 5 ? { cam: [.72, .42], bounds: [[-1.4, 0, -1.2], [2.8, 1.2, 1.2]] } : null,
    onStep: k => { if (art) art.innerHTML = ART[k]() } });
})();
