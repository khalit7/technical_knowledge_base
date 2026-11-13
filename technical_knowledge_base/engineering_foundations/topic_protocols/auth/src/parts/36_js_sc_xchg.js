// ---- Scene: Fig. 5 (section 8, stg-xchg): passthrough against a careful upstream, passthrough against a careless one, and token exchange, on the
// same tool call. Parties: the MCP client, the MCP server, the authorization server and the mail API; alice's token (blue, audience the MCP server)
// and the exchanged token (green, audience the mail API, act: the MCP server) travel as glass plates. Renderer v2. Every status, error text, scope
// and claim comes from the recordings (AUTHDATA.wire phases C and D, AUTHDATA.sdk.phases); the step's raw bytes fill the closed block on the left.
// Moved from the 2D lanes stepper of 32_js_mcpflow.js on 2026-11-07. ----
(function () {
  if (!document.getElementById('stg-xchg') || !window.S3 || !window.AUK || !window.AUTHDATA) return;
  const D = AUTHDATA, { mix } = S3, { up, party, tok, refuse, arcAt } = AUK;
  const phase = n => (D.wire.find(p => p.phase === n) || { ex: [] }).ex, ph = D.sdk.phases;
  const cs = phase('C passthrough strict'), cn = phase('C passthrough naive'), dx = phase('D exchange');
  const nb = ph.C_naive.upstream_body.upstream_believes_caller_is, xb = ph.D.upstream_body.upstream_believes_caller_is;
  const POS = [[-3.9, 0, .6], [-.6, 0, .6], [-.6, 0, -2.4], [3.4, 0, .6]], NAME = ['MCP client', 'MCP server', 'authorization server', 'mail API'];
  const SZ = [[1.1, .7, .9], [1.3, .8, 1.0], [1.4, .9, 1.0], [1.3, .75, 1.0]];
  // a step: f from, t to, o what travels (a alice's token, n the new token, ax alice's token plus the server's signed assertion), kind, lab, ex (the recorded exchange shown in the closed block)
  const M = {
    strict: [{ f: 0, t: 1, o: 'a', ex: cs[0], lab: 'tools/call inbox_passthrough' }, { f: 1, t: 3, o: 'a', kind: 'bad', ex: cs[1], lab: 'the same token, forwarded' },
      { f: 3, t: 1, kind: 'good', no: 1, ex: cs[1], lab: '401 "' + ph.C_strict.upstream_body.error_description + '"' }, { f: 1, t: 0, ex: cs[0], lab: 'tool result: upstream 401' }],
    naive: [{ f: 0, t: 1, o: 'a', ex: cn[0], lab: 'tools/call inbox_passthrough' }, { f: 1, t: 3, o: 'a', kind: 'bad', ex: cn[1], lab: 'the same token, forwarded' },
      { f: 3, t: 1, kind: 'bad', ex: cn[1], lab: '200 OK, mail returned', who: 'believes: ' + nb.sub + ' via ' + nb.client_id + ', no act' }, { f: 1, t: 0, ex: cn[0], lab: 'tool result: mail' }],
    xchg: [{ f: 0, t: 1, o: 'a', ex: dx[0], lab: 'tools/call inbox_exchange' }, { f: 1, t: 2, o: 'ax', ex: dx[1], lab: 'POST /token: subject_token + its signed assertion' },
      { f: 2, t: 1, o: 'n', kind: 'good', ex: dx[1], lab: '200: a new token' }, { f: 1, t: 3, o: 'n', kind: 'good', ex: dx[2], lab: 'GET /mail/inbox with the new token' },
      { f: 3, t: 1, kind: 'good', ex: dx[2], lab: '200 OK', who: 'sees: ' + xb.sub + ', acted for by ' + xb.act.sub }, { f: 1, t: 0, ex: dx[0], lab: 'tool result: mail' }]
  };
  let mode = 'strict';
  const anc = i => [POS[i][0], SZ[i][1] * .8, POS[i][2]];
  function draw(R, k, e) {
    const P = R.P, S = M[mode], s = S[k]; if (!s) return; const A = P.c1, N = P.c3;
    R.grid(-5, 4.8, -3.2, 2.8, .5);
    const inv = new Set([s.f, s.t]);
    POS.forEach((p, i) => party(R, p, SZ[i], [P.acc, P.c6 || P.c1, P.c4, P.c5][i], NAME[i], { a: inv.has(i) ? 1 : (i === 2 && mode !== 'xchg' ? .15 : .32) }));
    const labA = 'aud: MCP server', labN = 'aud: mail API · ' + xb.scope + ' · act: MCP server';
    // tokens held so far: alice's beside the client; once exchanged, the new one beside the MCP server
    if (!(k === 0)) tok(R, [POS[0][0] + .9, 0, POS[0][2] + .55], A, .3, null, { w: .5, h: .62 });
    if (mode === 'xchg' && k >= 3) tok(R, [POS[1][0] + .95, 0, POS[1][2] + .55], N, k === 3 ? .3 : .25, null, { w: .5, h: .62 });
    const a0 = anc(s.f), b0 = anc(s.t), h = s.f === 2 || s.t === 2 ? .45 : .55, kc = s.kind === 'bad' ? P.bad : s.kind === 'good' ? P.good : P.acc;
    const fc = s.o === 'n' ? N : s.o === 'a' || s.o === 'ax' ? A : kc;
    R.flowArc(a0, b0, h, { c: s.kind === 'bad' && s.o ? P.bad : fc, r: .075, n: 11, speed: 1.5 });
    const mid = R.arcPt(a0, b0, h, .5), lab = (t, c, o) => R.label(mid, t, Object.assign({ fs: 12.5, b: 1, c: c || P.ink, dy: -16 }, o || {}));
    if (s.o) { const p = arcAt(R, [a0[0], .05, a0[2] + .35], [b0[0], .05, b0[2] + .35], h, e);
      tok(R, p, s.o === 'n' ? N : A, 1, s.o === 'n' ? labN : labA, { grp: 't' });
      if (s.o === 'ax') tok(R, [p[0] - .45, p[1], p[2] + .05], P.c4, 1, null, { w: .38, h: .5 }); }
    const side = s.f === 2 || s.t === 2;
    lab(s.lab, s.kind === 'bad' ? P.bad : s.kind === 'good' ? P.good : P.ink, side ? (R.W < 520 ? { dy: -34 } : { al: 'left', dx: 46, dy: 0 }) : s.o ? { dy: -46 } : R.W < 520 ? { dy: -30 } : null);
    if (s.no) { refuse(R, [POS[3][0] - .95, .45, POS[3][2] + .45], e); R.label(up(POS[3], 0), 'aud is not the mail API: refused', { fs: 12.5, b: 1, c: P.bad, dy: 22, a: e }); }
    if (s.who) { R.glow(up(POS[3], .85), .75, { c: s.kind === 'bad' ? P.bad : P.good, a: .65 * e }); R.label(up(POS[3], 0), s.who, { fs: 12.5, b: 1, c: s.kind === 'bad' ? P.bad : P.good, dy: 22, a: e }); }
    if (mode === 'xchg' && k === 2) R.label(up(POS[2], 0), 'checks: client signature, subject token for the MCP server, policy', { fs: 12, c: P.ink, dy: 20, a: e, wide: 1 });
  }
  function onStep(k) { const s = M[mode][k], w = document.getElementById('mfWire2'); if (w && s) w.innerHTML = s.ex && AU.wireHTML ? AU.wireHTML(s.ex, { body: 900 }) : ''; }
  const st = S3.stage({ id: 'stg-xchg', list: 'sx-xc-strict', fig: 'Fig. 5 · whose token reaches the mail API', cam: [.1, .74], bounds: [[-4.8, 0, -3.0], [4.4, 1.1, 2.0]], aspect: .62, dur: 1400, hold: 4600, draw, onStep,
    margin: w => w < 520 ? [18, 8, 18, 8] : [22, 16, 22, 16],
    // on a phone the camera turns so the four parties run diagonally and the wide scene fills more of the tall card
    view: k => { const s = M[mode][k]; if (!s) return null; const ph = innerWidth < 560;
      if (s.f !== 2 && s.t !== 2) return { cam: ph ? [.38, .7] : [.1, .62], bounds: [[-4.8, 0, -.6], [4.4, 1.1, 2.0]] }; return ph ? { cam: [.38, .78], bounds: [[-4.8, 0, -3.0], [4.4, 1.1, 2.0]] } : null; } });
  const C = document.getElementById('xc-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-xc-"]').forEach(l => l.hidden = l.id !== 'sx-xc-' + mode); st.list('sx-xc-' + mode); });
  window.AU_XCHG_STEPS = M;
})();
