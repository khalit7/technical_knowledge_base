// ---- Scene: Fig. 2 (section 4, stg-oauth): one login three ways (implicit, code without PKCE, code with PKCE) with an attacker who reads the
// browser redirect. Parties: alice's browser, the client app, the authorization server, the attacker and the API; what travels (the authorization
// URL, the PKCE challenge, the code, tokens) is a glass plate on the flow between two parties. Renderer v2. The steps follow RFC 9700 s4.1 to s4.5,
// RFC 7636 and OAuth 2.1 draft-16 s10.1; the PKCE refusal is the lab AS's recorded answer (AUTHDATA.flows.P[0]). Moved from the 2D lanes
// animation (23_js_oauthanim.js) on 2026-11-07. ----
(function () {
  if (!document.getElementById('stg-oauth') || !window.S3 || !window.AUK) return;
  const { mix } = S3, { up, party, person, tok, refuse, arcAt, path } = AUK;
  const pk = (window.AUTHDATA && AUTHDATA.flows.P || [])[0], pkErr = pk && pk.body ? pk.body.error : 'invalid_grant';
  // where each party stands; the anchor a flow leaves from or arrives at
  const POS = [[-3.0, 0, 1.5], [-3.3, 0, -1.4], [.3, 0, -1.6], [1.5, 0, 2.0], [3.9, 0, -.5]];
  const NAME = ['alice\'s browser', 'client app', 'authorization server', 'attacker', 'API'];
  const SZ = [[1.2, .7, .9], [1.1, .75, .9], [1.4, .95, 1.0], [.9, .6, .8], [1.2, .7, 1.0]];
  const anc = i => [POS[i][0], SZ[i][1] * .75, POS[i][2]];
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
  function draw(R, k, e) {
    const P = R.P, S = M[mode], s = S[k]; if (!s) return;
    const OC = { url: P.mute, chal: P.c4, code: P.c5, tok: P.c1, toks: P.c1, codev: P.c5 }, KC = { ok: P.c1, leak: P.c2, bad: P.bad, good: P.good, note: P.mute };
    R.grid(-5, 5, -3, 3.4, .5);
    const hops = Array.isArray(s.t) ? [s.f].concat(s.t) : [s.f, s.t], inv = new Set(hops);
    if (s.t === s.f && s.alice) inv.add(0);
    // the parties: those this step is about at full strength, the rest receding
    POS.forEach((p, i) => { const a = inv.has(i) ? 1 : .32, c = [P.c1, P.acc, P.c4, P.bad, P.c5][i];
      if (i === 3) { person(R, p, P.bad, NAME[i], { a, lc: P.bad }); return; }
      party(R, p, SZ[i], c, NAME[i], { a, t: i === 1 ? .2 : .28 }); });
    person(R, [POS[0][0] - 1.05, 0, POS[0][2] + .35], P.c5, null, { a: inv.has(0) ? 1 : .32 });
    // the verifier never leaves the client's memory (PKCE only)
    if (mode === 'pkce') { const vk = k === 0 ? e : 1, hot = k === 0 || k === 8; tok(R, [POS[1][0] - 1.1, 0, POS[1][2] + .75], P.c4, (hot ? 1 : .45) * vk, 'verifier, kept in memory', { w: .5, h: .62, glow: hot ? P.c4 : null, wide: !hot }); }
    // what the attacker holds so far
    let atk = null; S.slice(0, k + 1).forEach(z => { if (z.atk) atk = z.atk; });
    const last = k === S.length - 1;
    if (atk && (last || inv.has(3) || s.atk)) R.label(up(POS[3], 0), 'holds: ' + atk, { fs: 12.5, b: 1, c: mode === 'pkce' ? P.ink : P.bad, dy: 22 });
    const c = s.o ? OC[s.o] : KC[s.kind || 'ok'], kc = KC[s.kind || 'ok'];
    if (s.f === s.t) { const p = up(POS[s.f], SZ[s.f][1]);
      R.glow(p, .8, { c: kc === P.mute ? P.acc : kc, a: .55 * e }); R.label(up(POS[s.f], 0), s.lab, { fs: 12.5, b: 1, c: P.ink, dy: 22, a: Math.max(.3, e) });
      if (s.alice) R.flowArc([POS[0][0] - .9, .9, POS[0][2] + .2], [POS[2][0] - .6, .9, POS[2][2] + .3], .8, { c: P.c5, r: .06, n: 9, speed: 1.2, a: .7 });
      return; }
    // the flow along each hop, and the object riding it
    const pts = []; for (let i = 0; i + 1 < hops.length; i++) { const a = anc(hops[i]), b = anc(hops[i + 1]); for (let j = i ? 1 : 0; j <= 16; j++) pts.push(R.arcPt(a, b, .55, j / 16)); }
    R.flow(pts, { c: s.kind === 'bad' || s.kind === 'leak' ? kc : c, r: .075, n: 12, speed: 1.5 });
    const mid = path(pts, .5);
    if (s.no) { refuse(R, up(POS[3], 1.0), e); R.label(mid, s.lab, { fs: 12.5, b: 1, c: P.good, dy: -16 }); return; }
    const at = path(pts, e), ob = [at[0], Math.max(0, at[1] - .5), at[2]];
    if (s.o === 'codev') { tok(R, ob, P.c5, 1, null, { w: .45, h: .55 }); tok(R, [ob[0] + .32, ob[1], ob[2] + .05], P.c4, 1, null, { w: .4, h: .5 }); }
    else if (s.o === 'toks') { tok(R, ob, P.c1, 1, null); tok(R, [ob[0] + .35, ob[1], ob[2] + .08], P.c3, 1, null, { w: .5, h: .62 }); }
    else tok(R, ob, c, 1, null, { w: s.o === 'url' ? .8 : .55, h: s.o === 'url' ? .5 : .68 });
    R.label(mid, s.lab, { fs: 12.5, b: 1, c: s.kind === 'bad' ? P.bad : s.kind === 'good' ? P.good : P.ink, dy: -18 });
    if (s.kind === 'bad' && s.t === 4) R.glow(up(POS[4], .9), .7, { c: P.bad, a: .7 * e });
  }
  // the camera moves in on the parties a step is about (at least about 5.5 by 3.6 units, so the step's neighbours stay in frame)
  function view(k) { const s = M[mode][k]; if (!s || k === M[mode].length - 1) return null; const hops = Array.isArray(s.t) ? [s.f].concat(s.t) : [s.f, s.t];
    if (s.f === s.t && s.alice) hops.push(0); if (s.atk || s.no || s.f === 3 || s.t === 3) hops.push(3); if (mode === 'pkce' && (k === 0 || k === 8)) hops.push(1);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; hops.forEach(i => { x0 = Math.min(x0, POS[i][0]); x1 = Math.max(x1, POS[i][0]); z0 = Math.min(z0, POS[i][2]); z1 = Math.max(z1, POS[i][2]); });
    x0 -= 1.5; x1 += 1.3; z0 -= .9; z1 += 1.0; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = Math.max(2.75, (x1 - x0) / 2), hd = Math.max(1.8, (z1 - z0) / 2);
    return { cam: [.12, .74], bounds: [[cx - hw, 0, cz - hd], [cx + hw, 1.2, cz + hd]] }; }
  const st = S3.stage({ id: 'stg-oauth', list: 'sx-oa-pkce', fig: 'Fig. 2 · what crosses the browser, and what the attacker holds', cam: [.12, .78], bounds: [[-4.7, 0, -2.4], [4.9, 1.2, 2.7]], aspect: .64, dur: 1400, hold: 4400, draw, view,
    margin: w => w < 520 ? [18, 8, 18, 8] : [22, 16, 22, 16] });
  const C = document.getElementById('oa-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-oa-"]').forEach(l => l.hidden = l.id !== 'sx-oa-' + mode); st.list('sx-oa-' + mode); });
  window.AU_OAUTH_STEPS = M; // read by src/check_stages.mjs
})();
