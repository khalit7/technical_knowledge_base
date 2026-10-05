// ---- Reading s4: one login, three ways (implicit, code without PKCE, code with PKCE), with an attacker who reads the redirect ----
(function () {
  const root = document.getElementById('oaA'); if (!root) return;
  root.innerHTML = root.innerHTML.replace('<!--CTRL-->', AU.ctrlHTML);
  const svg = document.getElementById('oaSvg'), cap = document.getElementById('oaCap'), cnt = document.getElementById('oaCnt');
  const LANES = ['Browser', 'Client app', 'Auth server', 'Attacker'];
  const pk = (AUTHDATA.flows.P || [])[0];
  const pkErr = pk && pk.body ? pk.body.error + ': ' + pk.body.error_description : 'invalid_grant';
  // s: [from, to, label, caption, kind, effects]; from===to is a note at that lane. kinds: ok, leak, bad, good, note
  const M = {
    implicit: [
      [1, 1, 'build URL: response_type=token', 'The client wants a token directly from the browser redirect (OAuth 2.0 implicit grant, meant for browser apps that had no back end).', 'note'],
      [1, 0, 'open /authorize', 'It opens the browser at the authorization endpoint.', 'ok'],
      [0, 2, 'GET /authorize?response_type=token', 'The browser asks the AS. Nothing secret yet.', 'ok'],
      [2, 2, 'alice logs in, approves', 'The user authenticates and consents.', 'note'],
      [2, 0, '302 ...#access_token=eyJ...', 'The AS puts the ACCESS TOKEN itself in the redirect URL (in the fragment). It now sits in the browser: history, extensions, any script on the page.', 'leak', { url: 1 }],
      [0, 3, 'redirect read by attacker', 'The attacker reads the redirect (a lookalike app, an extension, a leaky page script).', 'leak', { atk: 'access token' }],
      [3, 3, 'GET /api with the token: 200', 'The attacker calls the API as alice. The token is a bearer token: no key, no binding, nothing more to steal. OAuth 2.1 removed this grant (draft-16 s10.1).', 'bad']
    ],
    nopkce: [
      [1, 1, 'build URL: response_type=code', 'The client asks for a one-time code instead of a token.', 'note'],
      [1, 0, 'open /authorize', 'It opens the browser at the authorization endpoint.', 'ok'],
      [0, 2, 'GET /authorize?response_type=code', 'The browser asks the AS.', 'ok'],
      [2, 2, 'alice logs in, approves', 'The user authenticates and consents.', 'note'],
      [2, 0, '302 /callback?code=JTCl...', 'The redirect carries only a CODE. Better: a code is single-use and short-lived. But it still passes through the browser.', 'leak', { url: 1 }],
      [0, 3, 'redirect read by attacker', 'The attacker intercepts the redirect and gets the code.', 'leak', { atk: 'authorization code' }],
      [3, 2, 'POST /token code=JTCl...', 'A public client (CLI, mobile app) has no secret, so nothing else is needed to redeem the code. The attacker redeems it first.', 'bad'],
      [2, 3, '200 access + refresh token', 'The AS cannot tell the attacker from the client. The attacker now holds a refresh token too: access until revoked.', 'bad', { atk: 'access + refresh token' }]
    ],
    pkce: [
      [1, 1, 'verifier = random; challenge = SHA256(verifier)', 'The client first invents a random code_verifier (43 to 128 characters) and keeps it in memory. It will send only its hash.', 'note'],
      [1, 0, 'open /authorize ...code_challenge=E9Me...', 'The authorization URL carries the challenge (the hash) and code_challenge_method=S256.', 'ok'],
      [0, 2, 'GET /authorize ...&code_challenge=...', 'The AS stores the challenge with the code it is about to issue.', 'ok'],
      [2, 2, 'alice logs in, approves', 'The user authenticates and consents.', 'note'],
      [2, 0, '302 /callback?code=...&iss=...', 'The redirect carries the code (and, per RFC 9207, the AS\'s own name).', 'leak', { url: 1 }],
      [0, 3, 'redirect read by attacker', 'The attacker intercepts the code, exactly as before.', 'leak', { atk: 'a code it cannot redeem' }],
      [3, 2, 'POST /token code=... (no verifier)', 'The attacker tries to redeem it. It has the code but not the verifier, and SHA-256 cannot be run backwards from the challenge.', 'bad'],
      [2, 3, '400 invalid_grant', 'Refused. Recorded from the lab AS: "' + pkErr + '".', 'good'],
      [0, 1, 'callback ?code=... (state, iss checked)', 'The real client receives the same redirect, checks state and iss.', 'ok'],
      [1, 2, 'POST /token code + code_verifier', 'It redeems the code with the verifier. (If the attacker\'s attempt had already burned the code, the user logs in again: a denial, not a theft.)', 'ok'],
      [2, 1, '200 access + refresh token', 'Tokens go to the client over a direct TLS call; they never touched the browser. Same number of round trips as without PKCE: the price is one hash.', 'good']
    ]
  };
  let mode = 'pkce';
  const colors = { ok: 'var(--c1)', leak: 'var(--c5)', bad: 'var(--bad)', good: 'var(--good)', note: 'var(--mute)' };
  function draw(i) {
    const S = M[mode], W = Math.max(300, root.clientWidth - 28), rowH = 30, top = 40, H = top + S.length * rowH + 10;
    const xs = [0.12, 0.38, 0.64, 0.89].map(f => f * W);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    let o = '<defs><marker id="oaAr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';
    LANES.forEach((l, k) => {
      o += `<line x1="${xs[k]}" y1="${top - 8}" x2="${xs[k]}" y2="${H - 4}" stroke="var(--line)" stroke-width="2"/>`;
      o += `<text x="${xs[k]}" y="16" text-anchor="middle" font-size="12" font-weight="600" fill="${k === 3 ? 'var(--bad)' : 'var(--ink)'}">${l}</text>`;
    });
    S.forEach((s, k) => {
      if (k > i) return;
      const y = top + k * rowH + 14, cur = k === i, op = cur ? 1 : 0.45, c = colors[s[4]];
      const fs = W < 480 ? 10 : 11.5;
      if (s[0] === s[1]) {
        const x = xs[s[0]], tw = Math.min(W - 8, s[2].length * fs * 0.56 + 14), x0 = Math.max(4, Math.min(W - tw - 4, x - tw / 2));
        o += `<g opacity="${op}"><rect x="${x0}" y="${y - 11}" width="${tw}" height="19" rx="5" fill="var(--soft)" stroke="${c}"/><text x="${x0 + tw / 2}" y="${y + 3}" text-anchor="middle" font-size="${fs}">${AU.esc(s[2])}</text></g>`;
      } else {
        const x1 = xs[s[0]], x2 = xs[s[1]], mid = (x1 + x2) / 2;
        o += `<g opacity="${op}"><line class="${cur && !AU.reduced() ? 'oa-cur' : ''}" x1="${x1}" y1="${y + 6}" x2="${x2}" y2="${y + 6}" stroke="${c}" stroke-width="${cur ? 2.4 : 1.6}" marker-end="url(#oaAr)"/>`;
        const tx = Math.max(4 + 40, Math.min(W - 44, mid));
        o += `<text x="${tx}" y="${y}" text-anchor="middle" font-size="${fs}" fill="${s[4] === 'bad' ? 'var(--bad)' : 'var(--ink)'}">${AU.esc(s[2])}</text></g>`;
      }
    });
    svg.innerHTML = o;
    const s = S[i];
    cap.innerHTML = `<b>Step ${i + 1} of ${S.length}.</b> ` + AU.esc(s[3]);
    let url = 0, atk = 'nothing';
    S.slice(0, i + 1).forEach(z => { const e = z[5] || {}; if (e.url) url += e.url; if (e.atk) atk = e.atk; });
    cnt.innerHTML = `<span>Messages so far: <b>${S.slice(0, i + 1).filter(z => z[0] !== z[1]).length}</b></span><span>Credentials that passed through a browser URL: <b>${url ? (mode === 'implicit' ? 'an access token' : 'a code') : 'none'}</b></span><span>Attacker holds: <b style="color:${/token/.test(atk) && mode !== 'pkce' ? 'var(--bad)' : 'var(--ink)'}">${atk}</b></span>`;
  }
  const st = document.createElement('style');
  st.textContent = '.oa-cur{stroke-dasharray:400;stroke-dashoffset:400;animation:oadraw .7s ease-out forwards}@keyframes oadraw{to{stroke-dashoffset:0}}';
  document.head.appendChild(st);
  const A = AU.anim({ root, count: () => M[mode].length, draw, dwell: 2300 });
  root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.m; root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); A.go(0);
  }));
  addEventListener('resize', () => A.redraw());
  (TAB_RENDER['t-read'] = TAB_RENDER['t-read'] || []).push(() => A.redraw());
})();
