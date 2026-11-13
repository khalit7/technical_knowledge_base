// ---- Scene: Fig. 5, from a bare 401 to a token bound to one server (stg-auth, section 7). Data: window.MCPD.auth.steps, the 15 recorded exchanges of
// src/lab/auth_run.py on 5 October 2026 (SDK 2.3.0 client with OAuthClientProvider, ckpt-tools as a resource server, a small authorization server,
// the client's identity document over HTTPS), grouped into seven explained stretches; each stretch plays its exchanges in order. Documents and
// credentials (the two metadata documents, the client identity, the code, the token) are glass plates that stay where they were received. ----
(function () {
  if (!document.getElementById('stg-auth') || !window.S3 || !window.MCK || !window.MCPD) return;
  const { mix } = S3, { up, party, plate, msg, refuse, path, win, arcPts } = MCK, S = MCPD.auth.steps, E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tok = JSON.parse((S[10].s.split('\r\n\r\n')[1] || '{}').replace('...(lab JWT, truncated)', ''));
  // lanes: 0 client, 1 MCP server, 2 authorization server, 3 the client ID metadata document; per recorded exchange: from, to, short label
  const X = [[0, 1, 'POST /mcp, no token'], [1, 0, '401 · resource_metadata'], [0, 1, 'GET protected resource metadata'], [1, 0, '200 · resource, authorization_servers'],
    [0, 2, 'GET /.well-known/oauth-authorization-server'], [2, 0, '200 · endpoints, S256, CIMD'], [2, 3, 'AS fetches client.json'], [0, 2, 'GET /authorize · PKCE · resource='],
    [2, 0, '302 · code, state, iss'], [0, 2, 'POST /token · verifier, resource'], [2, 0, '200 · JWT, aud = MCP server'], [0, 1, 'POST /mcp + Bearer'], [1, 0, '200 · three checkpoints'],
    [0, 1, 'POST tools/list + Bearer'], [1, 0, '200']];
  const G = [[0, 1], [2, 3], [4, 5], [6], [7, 8], [9, 10], [11, 12, 13, 14]];
  const status = i => +((S[i].s.match(/^HTTP\/1\.1 (\d+)/) || [])[1] || 0);
  window.MCP_AUTH = { X, G, tok, status, n: S.length };   // read by src/check_stages.mjs
  const POS = [[-4.3, 0, .9], [.3, 0, 2.3], [.3, 0, -1.6], [4.4, 0, -1.6]], SZ = [[1.4, .8, 1.0], [1.5, .8, 1.0], [1.6, .9, 1.0], [1.3, .6, .9]];
  const NM = ['client (SDK 2.3.0)', 'ckpt-tools · resource server', 'authorization server', 'client.json host'];
  const anc = i => [POS[i][0], SZ[i][1] * .7, POS[i][2]];
  function draw(R, k, e) {
    const P = R.P, A = P.acc, cur = G[k] || [], who = new Set(); cur.forEach(i => { who.add(X[i][0]); who.add(X[i][1]); });
    const COL = [A, P.c6, P.c3, P.c5];
    R.grid(-5.4, 5.6, -3, 3.6, .5);
    POS.forEach((p, i) => party(R, p, SZ[i], COL[i], (k === 3 || R.W < 520) && !who.has(i) ? null : NM[i], { a: who.has(i) ? 1 : .3, wide: i === 3 ? 1 : 0 }));
    // what has been received so far rests as plates beside its holder
    const C = [POS[0][0], 0, POS[0][2] + .4], have = (g, j) => k > g || (k === g && e > j);
    plate(R, [C[0] - .5, 0, C[2] + .85], P.c6, have(1, .9) ? (k === 1 ? 1 : .45) : 0, k === 1 ? 'resource + authorization_servers' : null, { w: .4, h: .5, wide: 1 });
    plate(R, [C[0], 0, C[2] + .85], P.c3, have(2, .9) ? (k === 2 ? 1 : .45) : 0, k === 2 ? 'issuer checked · S256 · CIMD' : null, { w: .4, h: .5, wide: 1 });
    plate(R, [POS[2][0] + 1.15, 0, POS[2][2] + .2], P.c5, have(3, .9) ? (k === 3 ? 1 : .45) : 0, null, { w: .4, h: .5 });
    if (k === 3) R.label([POS[2][0] + 1.15, 0, POS[2][2] + .2], 'client.json: name, redirect URI', { fs: 12, b: 1, c: P.c5, dy: 16, al: 'left', dx: -6, a: have(3, .9) ? 1 : 0 });   // under the plate, clear of the names above
    plate(R, [C[0] + .5, 0, C[2] + .85], P.c4, have(4, .9) && k < 6 ? (k === 4 ? 1 : .45) : 0, k === 4 ? 'code · iss checked' : null, { w: .36, h: .45 });
    plate(R, [C[0] + .5, 0, C[2] + .85], P.c1, have(5, .9) ? (k === 5 ? 1 : .7) : 0, k === 5 ? 'JWT · aud = MCP server · ' + tok.scope + ' · ' + tok.expires_in / 60 + ' min' : null, { w: .42, h: .55, al: 'left', dx: 14 });
    // this stretch's exchanges, one after another
    const act = cur.reduce((m, i, j) => e >= j / cur.length ? j : m, 0);
    cur.forEach((i, j) => { const n = cur.length, u = win(e, j / n, (j + .85) / n); if (e < j / n) return; const [f, t, lab] = X[i];
      const pts = arcPts(R, anc(f), anc(t), f === 2 && t === 3 ? .4 : .55), c = t === 0 ? COL[f] : COL[f] === A ? A : COL[f], bad = status(i) >= 400;
      R.flow(pts, { c: bad ? P.bad : c, r: .07, n: 10, speed: 1.5, a: u < 1 ? 1 : .3 });
      const q = path(pts, Math.min(u, .9)), mid = path(pts, .5);
      msg(R, [q[0], Math.max(0, q[1] - .1), q[2]], 260, bad ? P.bad : c, u < 1 ? 1 : 0, { t: .55 });
      if (i === 11 || i === 13) plate(R, [q[0] - .35, Math.max(0, q[1] - .4), q[2]], P.c1, u < 1 ? 1 : 0, null, { w: .3, h: .38 });
      R.label(mid, lab, { fs: 12.5, b: 1, mono: true, c: bad ? P.bad : P.ink, dy: t === 0 ? 18 : -18, a: u > .05 ? (Math.floor(j / 2) === Math.floor(act / 2) ? 1 : .3) : 0, grp: 'x' }); });
    if (k === 0) refuse(R, up(POS[1], 1.05), win(e, .5, .8));
    if (k === 6) R.glow(up(POS[1], .85), .7, { c: P.good, a: .6 * win(e, .3, .6) });
  }
  // the camera moves in on the parties of each stretch
  function view(k) { const g = G[k]; if (!g) return null; const hs = new Set(); g.forEach(i => { hs.add(X[i][0]); hs.add(X[i][1]); }); if (k !== 3) hs.add(0);   // the AS fetching client.json: in close on those two
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; hs.forEach(i => { x0 = Math.min(x0, POS[i][0]); x1 = Math.max(x1, POS[i][0]); z0 = Math.min(z0, POS[i][2]); z1 = Math.max(z1, POS[i][2]); });
    x0 -= 1.3; x1 += 1.5; z0 -= .8; z1 += 1.3; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = Math.max(3.2, (x1 - x0) / 2), hd = Math.max(2.1, (z1 - z0) / 2);
    return { cam: [.12, innerWidth < 520 ? 1.0 : .72], bounds: [[cx - hw, 0, cz - hd], [cx + hw, 1.2, cz + hd]] }; }
  function bytes(k) { const el = document.getElementById('au-msg'); if (!el) return; el.textContent = (G[k] || []).map(i => (S[i].s || '').replace(/\r/g, '')).join('\n\n----\n\n'); }
  S3.stage({ id: 'stg-auth', list: 'sx-auth', fig: 'Fig. 5 · from a bare 401 to a token bound to one server', cam: [.12, .74], bounds: [[-5.3, 0, -2.4], [5.4, 1.2, 3.2]], aspect: .58, dur: 1600, hold: 4800, draw, view,
    margin: w => w < 520 ? [22, 8, 16, 8] : [26, 16, 22, 16], onStep: k => { try { bytes(k) } catch (x) { } } });
})();
