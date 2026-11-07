// ---- Scene: Fig. 2, one conversation over stdio, message by message (stg-life, section 2). Two modes from window.MCPD.tr, the recorded cold runs of
// 5 October 2026: the legacy client (2025-11-25: initialize, its result, notifications/initialized, tools/call, tools/list) and the dual-era client
// against the same server (2026-07-28: server/discover, then self-contained requests). The client and the server are glass plates facing each other;
// each message crosses on its own row in depth and stays there, so the rows are the transcript. Every envelope's length is its recorded size on the
// pipe; the part of a 2026-07-28 request that the legacy one lacks (the _meta block, measured on tools/call) is tinted. ----
(function () {
  if (!document.getElementById('stg-life') || !window.S3 || !window.MCK || !window.MCPD) return;
  const { mix } = S3, { msg, win } = MCK;
  const T = n => MCPD.tr.find(r => r.name.indexOf(n) === 0).coldmsgs;
  const LEG = T('stdio, legacy'), MOD = T('stdio, auto');
  const meth = m => (m.s.match(/"method":"([^"]+)"/) || [, 'result'])[1], idOf = m => (m.s.match(/"id":(\d+)/) || [, null])[1];
  const metaB = MOD.find(m => meth(m) === 'tools/call').n - LEG.find(m => meth(m) === 'tools/call').n;
  // the steps: which recorded messages each one sends, in order
  const STEPS = { legacy: [[0], [1], [2], [3, 4], [5, 6]], modern: [[0, 1], [2], [3], [4, 5]] };
  let mode = 'modern';
  window.MCP_LIFE = { LEG, MOD, metaB, STEPS };   // read by src/check_stages.mjs
  const XC = -4.3, XS = 4.3, K = .0021, Z0 = -1.2, DZ = .62, Y = .3;
  const zr = i => Z0 + i * DZ;
  function draw(R, k, e) {
    const P = R.P, A = P.acc, M = mode === 'legacy' ? LEG : MOD, S = STEPS[mode], cur = S[k] || [], n = M.length, zl = zr(n - 1) + .5;
    R.grid(-5, 5, -2, 4, .5);
    // the two ends of the pipe as glass plates facing each other
    R.glass([XC, 0, Z0 - .5], [0, 0, zl - Z0 + .5], [0, 1.1, 0], { c: A, nu: 8, nv: 2, a: .9 });
    R.glass([XS, 0, Z0 - .5], [0, 0, zl - Z0 + .5], [0, 1.1, 0], { c: P.c6, nu: 8, nv: 2, a: .9 });
    R.label([XC, 1.1, Z0 - .5], 'client · ' + (mode === 'legacy' ? 'SDK 1.30.0, legacy' : 'SDK 2.3.0, dual-era'), { b: 1, fs: 13, dy: -12, c: A });
    R.label([XS, 1.1, Z0 - .5], 'ckpt-tools · SDK 2.3.0', { b: 1, fs: 13, dy: -12, c: P.c6 });
    // what the handshake leaves in memory on both sides (legacy), or the cacheable discover answer (2026-07-28)
    if (mode === 'legacy') { const a = k >= 1 ? (k === 1 ? win(e, .6, 1) : 1) : 0;
      [XC, XS].forEach((x, j) => { R.box([x + (j ? -.35 : .35), 0, zl + .45], [.5, .5, .5], { fill: mix(P.paper, P.c4, .5), a }); });
      R.label([0, .5, zl + .45], 'both sides now remember: 2025-11-25 and capabilities', { fs: 12.5, b: 1, c: P.c4, a: a * (k <= 2 ? 1 : .6) }); }
    else { const a = k === 0 ? win(e, .6, 1) : k > 0 ? .7 : 0;
      R.box([XC + .35, 0, zl + .45], [.5, .5, .5], { fill: mix(P.paper, P.c3, .5), a });
      R.label([XC + .7, .5, zl + .45], 'client may cache: supportedVersions, capabilities', { fs: 12.5, b: 1, c: P.c3, al: 'left', a: a * (k === 0 ? 1 : .7), wide: 1 }); }
    // rows already crossed (the transcript), then this step's messages, one after another
    const before = []; S.forEach((ix, j) => { if (j < k) before.push(...ix); });
    for (let i = 0; i < n; i++) {
      const m = M[i], c2s = m.d === 'client->server', z = zr(i), col = c2s ? A : P.c6, j = cur.indexOf(i), past = before.indexOf(i) >= 0;
      if (!past && j < 0) { R.line([[XC, .02, z], [XS, .02, z]], { c: P.mute, w: 1, dash: [3, 4], a: .35 }); continue; }
      const L = m.n * K, meta = mode === 'modern' && c2s ? metaB : 0, lab = meth(m) + (idOf(m) ? ' · id ' + idOf(m) : ' · no id') + ' · ' + m.n + ' B';
      const rest = c2s ? XS - .2 - L / 2 : XC + .2 + L / 2;   // a delivered message rests against the plate that received it
      if (past) { msg(R, [rest, 0, z], m.n, col, .5, { k: K, d: .34, h: .12, meta });
        R.label([c2s ? rest - L / 2 : rest + L / 2, .12, z], lab, { mono: true, fs: 12, c: P.mute, al: c2s ? 'right' : 'left', dx: c2s ? -8 : 8, grp: 'rows' }); continue; }
      const t0 = j / cur.length, t1 = (j + 1) / cur.length, u = win(e, t0, t0 + (t1 - t0) * .8);
      if (e < t0) continue;
      const from = c2s ? XC + .2 + L / 2 : XS - .2 - L / 2, x = from + (rest - from) * u;
      if (u < 1) R.flow([[c2s ? XC : XS, Y + .25, z], [c2s ? XS : XC, Y + .25, z]], { c: col, r: .07, n: 12, speed: 1.6 });
      msg(R, [x, 0, z], m.n, col, 1, { k: K, d: .36, h: .14, meta });
      R.label([c2s ? x - L / 2 : x + L / 2, .14, z], lab, { mono: true, fs: 12.5, b: 1, c: P.ink, al: c2s ? 'right' : 'left', dx: c2s ? -8 : 8 });
    }
    if (mode === 'legacy' && k === 2) R.label([XS - .4, .4, zr(2)], 'no id, no reply', { fs: 12.5, b: 1, c: P.bad, al: 'right', dx: -40, dy: -16, a: win(e, .7, 1) });
    if (mode === 'modern' && k === 1) R.label([XS - .3, .5, zr(2)], 'tinted: _meta, ' + metaB + ' bytes the legacy call lacks', { fs: 12.5, b: 1, c: A, al: 'right', dy: -36, a: win(e, .6, 1) });
  }
  const st = S3.stage({ id: 'stg-life', list: 'sx-life-modern', fig: 'Fig. 2 · one stdio conversation, every message to scale', cam: [.0, .66],
    bounds: () => [[-4.6, 0, -1.8], [4.6, 1.2, zr((mode === 'legacy' ? LEG : MOD).length - 1) + .8]], aspect: .62, dur: 2000, hold: 4400, draw,
    margin: w => w < 520 ? [26, 8, 12, 8] : [34, 16, 16, 16] });
  const C = document.getElementById('life-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-life-"]').forEach(l => l.hidden = l.id !== 'sx-life-' + mode); st.list('sx-life-' + mode); });
})();
