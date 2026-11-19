// ---- Fig. 2 (section 4, sq-oauth): one login three ways (implicit, code without PKCE, code with PKCE) with an attacker who reads the browser
// redirect, as a 2D sequence (28_js_seq.js). Parties as columns: alice's browser, the client app, the authorization server, the attacker and the API.
// The steps follow RFC 9700 s4.1 to s4.5, RFC 7636 and OAuth 2.1 draft-16 s10.1; the PKCE refusal is the lab AS's recorded answer
// (AUTHDATA.flows.P[0]). A 2D lanes animation until 2026-11-07 (23_js_oauthanim.js), a 3D stage until 2026-11-19, flat again because its depth
// carried nothing: what crosses the browser and what the attacker holds read faster as columns and time. ----
(function () {
  if (!document.getElementById('sq-oauth') || !window.SQ) return;
  const pk = (window.AUTHDATA && AUTHDATA.flows.P || [])[0], pkErr = pk && pk.body ? pk.body.error : 'invalid_grant';
  // a step: f from, t to (or a list of hops), o the object that travels (url, chal, code, tok, toks, codev), kind (ok, leak, bad, good, note), lab, atk (what the attacker holds from here)
  const M = {
    implicit: [
      { f: 1, t: 1, kind: 'note', lab: 'response_type=token' },
      { f: 1, t: [0, 2], o: 'url', lab: 'GET /authorize?response_type=token' },
      { f: 2, t: 2, kind: 'note', lab: 'alice logs in, approves', alice: 1 },
      { f: 2, t: 0, o: 'tok', kind: 'leak', lab: '302 ...#access_token=eyJ... (in the URL)' },
      { f: 0, t: 3, o: 'tok', kind: 'leak', lab: 'redirect read by the attacker', atk: 'an access token' },
      { f: 3, t: 4, o: 'tok', kind: 'bad', lab: 'GET /api with the token: 200' }],
    nopkce: [
      { f: 1, t: 1, kind: 'note', lab: 'response_type=code' },
      { f: 1, t: [0, 2], o: 'url', lab: 'GET /authorize?response_type=code' },
      { f: 2, t: 2, kind: 'note', lab: 'alice logs in, approves', alice: 1 },
      { f: 2, t: 0, o: 'code', kind: 'leak', lab: '302 /callback?code=JTCl...' },
      { f: 0, t: 3, o: 'code', kind: 'leak', lab: 'redirect read by the attacker', atk: 'a code' },
      { f: 3, t: 2, o: 'code', kind: 'bad', lab: 'POST /token code=JTCl...' },
      { f: 2, t: 3, o: 'toks', kind: 'bad', lab: '200 access + refresh token', atk: 'access + refresh token' }],
    pkce: [
      { f: 1, t: 1, kind: 'note', lab: 'challenge = SHA-256(verifier)', ver: 1 },
      { f: 1, t: [0, 2], o: 'chal', lab: 'GET /authorize ...code_challenge=E9Me...' },
      { f: 2, t: 2, kind: 'note', lab: 'alice logs in, approves', alice: 1 },
      { f: 2, t: 0, o: 'code', kind: 'leak', lab: '302 /callback?code=...&iss=...' },
      { f: 0, t: 3, o: 'code', kind: 'leak', lab: 'redirect read by the attacker', atk: 'a code it cannot redeem' },
      { f: 3, t: 2, o: 'code', kind: 'bad', lab: 'POST /token code=... (no verifier)' },
      { f: 2, t: 3, kind: 'good', lab: '400 ' + pkErr, no: 1 },
      { f: 0, t: 1, o: 'code', lab: 'callback: state and iss checked' },
      { f: 1, t: 2, o: 'codev', lab: 'POST /token code + code_verifier' },
      { f: 2, t: 1, o: 'toks', kind: 'good', lab: '200 access + refresh token, off the browser' }]
  };
  let mode = 'pkce';
  const OC = { url: 'var(--mute)', chal: 'var(--c4)', code: 'var(--c5)', tok: 'var(--c1)', toks: 'var(--c1)', codev: 'var(--c5)' },
    KC = { ok: 'var(--c1)', leak: 'var(--c2)', bad: 'var(--bad)', good: 'var(--good)', note: 'var(--mute)' };
  // one step of M as rows: an arrow per hop (or a note), then what the attacker holds once it changes (and again on the last step)
  function rows(m) {
    const S = M[m]; let held = null;
    return S.map((s, k) => {
      const out = [], kind = s.kind || 'ok', c = kind === 'bad' || kind === 'leak' || kind === 'good' ? KC[kind] : s.o ? OC[s.o] : KC[kind];
      if (s.f === s.t && !s.alice) out.push({ at: s.f, l: s.lab + (s.ver ? '; the verifier stays in memory' : ''), c: s.ver ? 'var(--c4)' : 'var(--acc)' });
      else if (s.alice) out.push({ f: 0, t: 2, l: s.lab, c: 'var(--c5)' });
      else if (s.no) out.push({ f: s.f, t: s.t, l: s.lab, c: 'var(--good)', sub: 'refused: no verifier' });
      else { const hops = Array.isArray(s.t) ? [s.f].concat(s.t) : [s.f, s.t];
        for (let i = 0; i + 1 < hops.length; i++) out.push({ f: hops[i], t: hops[i + 1], l: i ? 'to the AS' : s.lab, c, d: kind === 'leak' && s.f === 0 }); }
      if (s.atk) held = s.atk;
      if (s.atk || (k === S.length - 1 && held)) out.push({ at: 3, l: 'holds: ' + held, c: m === 'pkce' ? 'var(--mute)' : 'var(--bad)' });
      return out;
    });
  }
  const st = SQ({ id: 'sq-oauth', list: 'sx-oa-pkce', fig: 'Fig. 2 · what crosses the browser, and what the attacker holds', ms: 4400,
    lanes: [{ n: "alice's browser", s: 'browser', c: 'var(--c1)' }, { n: 'client app', s: 'client', c: 'var(--acc)' }, { n: 'authorization server', s: 'auth server', c: 'var(--c4)' },
      { n: 'attacker', c: 'var(--bad)' }, { n: 'API', c: 'var(--c5)' }],
    steps: rows(mode) });
  const C = document.getElementById('oa-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-oa-"]').forEach(l => l.hidden = l.id !== 'sx-oa-' + mode); st.mode(rows(mode), 'sx-oa-' + mode); });
  window.AU_OAUTH_STEPS = M; // read by src/check_stages.mjs
})();
