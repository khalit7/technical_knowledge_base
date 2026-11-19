// ---- Fig. 5 (section 8, sq-xchg): passthrough against a careful upstream, passthrough against a careless one, and token exchange, on the same
// tool call, as a 2D sequence (28_js_seq.js). Parties as columns: the MCP client, the MCP server, the authorization server and the mail API;
// alice's token (blue, audience the MCP server) and the exchanged token (green, audience the mail API, act: the MCP server). Every status, error
// text, scope and claim comes from the recordings (AUTHDATA.wire phases C and D, AUTHDATA.sdk.phases); the step's raw bytes fill the closed block
// on the left. A 2D lanes stepper until 2026-11-07 (32_js_mcpflow.js), a 3D stage until 2026-11-19, flat again because its depth carried
// nothing: whose token reaches the mail API reads faster as columns and time. ----
(function () {
  if (!document.getElementById('sq-xchg') || !window.SQ || !window.AUTHDATA) return;
  const D = AUTHDATA;
  const phase = n => (D.wire.find(p => p.phase === n) || { ex: [] }).ex, ph = D.sdk.phases;
  const cs = phase('C passthrough strict'), cn = phase('C passthrough naive'), dx = phase('D exchange');
  const nb = ph.C_naive.upstream_body.upstream_believes_caller_is, xb = ph.D.upstream_body.upstream_believes_caller_is;
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
  const A = 'var(--c1)', N = 'var(--c3)', labA = 'aud: MCP server', labN = 'aud: mail API, ' + xb.scope + ', act: MCP server';
  // one step of M as rows: the arrow (labelled with the token's audience when one travels), then the refusal or what the mail API believes
  function rows(m) {
    return M[m].map(s => {
      const kc = s.kind === 'bad' ? 'var(--bad)' : s.kind === 'good' ? 'var(--good)' : 'var(--acc)', c = s.o === 'n' ? N : s.o ? (s.kind === 'bad' ? 'var(--bad)' : A) : kc;
      const sub = s.o === 'ax' ? 'alice\'s token (' + labA + ') + an assertion signed by the MCP server' : s.o === 'n' ? labN : s.o === 'a' ? labA : null;
      const out = [{ f: s.f, t: s.t, l: s.lab, c, sub }];
      if (s.no) out.push({ at: 3, l: 'aud is not the mail API: refused', c: 'var(--bad)' });
      if (s.who) out.push({ at: 3, l: s.who, c: s.kind === 'bad' ? 'var(--bad)' : 'var(--good)' });
      if (m === 'xchg' && s.f === 2 && s.t === 1) out.unshift({ at: 2, l: 'checks: client signature, subject token for the MCP server, policy', c: 'var(--c4)' });
      return out;
    });
  }
  function onStep(k) { const s = M[mode][k], w = document.getElementById('mfWire2'); if (w && s) w.innerHTML = s.ex && AU.wireHTML ? AU.wireHTML(s.ex, { body: 900 }) : ''; }
  const st = SQ({ id: 'sq-xchg', list: 'sx-xc-strict', fig: 'Fig. 5 · whose token reaches the mail API', ms: 4600, onStep,
    lanes: [{ n: 'MCP client', c: 'var(--acc)' }, { n: 'MCP server', c: 'var(--c6)' }, { n: 'authorization server', s: 'auth server', c: 'var(--c4)' }, { n: 'mail API', c: 'var(--c5)' }],
    steps: rows(mode) });
  const C = document.getElementById('xc-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-xc-"]').forEach(l => l.hidden = l.id !== 'sx-xc-' + mode); st.mode(rows(mode), 'sx-xc-' + mode); });
  window.AU_XCHG_STEPS = M;
})();
