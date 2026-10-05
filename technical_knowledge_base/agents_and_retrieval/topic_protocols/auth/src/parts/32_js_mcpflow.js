// ---- Tab "MCP auth flow": the recorded SDK flow as a stepper, passthrough vs exchange as a before/after animation, the mix-up refusal ----
(function () {
  const D = AUTHDATA, E = AU.esc, $ = id => document.getElementById(id);
  const phase = n => (D.wire.find(p => p.phase === n) || { ex: [] }).ex;
  const firstLine = s => s.split('\r\n')[0];
  const bodyOf = s => s.replace(/\r/g, '').split('\n\n').slice(1).join('\n\n');
  // generic lane drawing: steps [{from,to,label,kind,back,backLabel,chip}]
  function lanesSVG(svg, lanes, steps, i, W) {
    const top = 42, rowH = 36, H = top + steps.length * rowH + 8;
    const xs = lanes.map((_, k) => (0.5 + k) / lanes.length * W);
    const fs = W < 480 ? 9.5 : 11;
    let o = '<defs><marker id="' + svg.id + 'Ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';
    lanes.forEach((l, k) => {
      o += `<line x1="${xs[k]}" y1="${top - 10}" x2="${xs[k]}" y2="${H - 4}" stroke="var(--line)" stroke-width="2"/>`;
      l.split('\n').forEach((part, j) => { o += `<text x="${xs[k]}" y="${14 + j * 13}" text-anchor="middle" font-size="${fs + 0.5}" font-weight="600">${E(part)}</text>`; });
    });
    const col = { ok: 'var(--c1)', bad: 'var(--bad)', good: 'var(--good)', note: 'var(--mute)', xc: 'var(--c4)' };
    steps.forEach((s, k) => {
      if (k > i) return;
      const y = top + k * rowH + 12, op = k === i ? 1 : 0.42, c = col[s.kind || 'ok'];
      const x1 = xs[s.from], x2 = xs[s.to], mid = (x1 + x2) / 2;
      const clampX = x => Math.max(50, Math.min(W - 50, x));
      o += `<g opacity="${op}">`;
      o += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="${k === i ? 2.2 : 1.5}" marker-end="url(#${svg.id}Ar)"/>`;
      o += `<text x="${clampX(mid)}" y="${y - 4}" text-anchor="middle" font-size="${fs}">${E(s.label)}</text>`;
      if (s.back) {
        const cb = col[s.backKind || 'ok'];
        o += `<line x1="${x2}" y1="${y + 16}" x2="${x1}" y2="${y + 16}" stroke="${cb}" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#${svg.id}Ar)"/>`;
        o += `<text x="${clampX(mid)}" y="${y + 13}" text-anchor="middle" font-size="${fs}" fill="${s.backKind === 'bad' ? 'var(--bad)' : 'var(--mute)'}">${E(s.back)}</text>`;
      }
      if (s.chip && k === i) {
        const t = s.chip, tw = Math.min(W - 4, t.length * fs * 0.58 + 12), cx = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, mid)), cy = y + (s.back ? 26 : 14);
        o += `<rect x="${cx - tw / 2}" y="${cy - 1}" width="${tw}" height="16" rx="8" fill="${s.chipColor || 'var(--acc2)'}" stroke="${c}"/><text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="${fs - 0.5}">${E(t)}</text>`;
      }
      o += '</g>';
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = o;
  }

  // ---------- Part 1: the recorded flow ----------
  const A = document.getElementById('mfA');
  if (A) {
    A.innerHTML = A.innerHTML.replace('<!--CTRL-->', AU.ctrlHTML);
    const L1 = ['MCP client\n(SDK 2.3.0)', 'Browser\n(simulated)', 'MCP\nserver', 'Auth\nserver', 'Client\nmetadata'];
    const lane = { mcp: 2, as: 3 };
    const steps = [];
    const ex = phase('A connect and authorize').concat(phase('B call read_file'));
    ex.forEach(e => {
      const rl = firstLine(e.req), sl = firstLine(e.resp), code = sl.split(' ')[1];
      const from = e.who === 'browser' ? 1 : 0, to = lane[e.tap] || 2;
      let cimd = false;
      let label = rl.split(' ').slice(0, 2).join(' ').replace(/\?.*/, '?...'), cap = '', rule = '';
      const body = bodyOf(e.req), auth = /\r\nauthorization: Bearer/i.test(e.req);
      const mm = e.req.match(/\r\nmcp-method: ([^\r]+)/i); if (mm) label = 'POST /mcp ' + mm[1] + (auth ? '' : ' (no token)');
      if (rl.startsWith('POST /mcp') && !auth) {
        cap = 'The client sends its first MCP request (<code>server/discover</code>, the 2026-07-28 opening request) with no token. The server answers <b>401</b> and its <code>WWW-Authenticate</code> header carries <code>resource_metadata</code>: where to learn how to get a token.';
        rule = 'MCP servers MUST use WWW-Authenticate (or the well-known URI) to point to their protected resource metadata (RFC 9728 s5.1).';
      } else if (rl.includes('oauth-protected-resource')) {
        label = 'GET protected resource metadata';
        cap = 'The <b>protected resource metadata</b>: the server\'s canonical <code>resource</code> URI, its <code>authorization_servers</code> and the minimal <code>scopes_supported</code>. The SDK checks that <code>resource</code> matches the URL it connected to.';
        rule = 'MCP servers MUST implement RFC 9728; clients MUST use it to find the authorization server.';
      } else if (rl.includes('oauth-authorization-server')) {
        label = 'GET AS metadata';
        cap = 'The <b>authorization server metadata</b> (RFC 8414). The client checks that <code>issuer</code> equals the URL it derived, that <code>code_challenge_methods_supported</code> includes <code>S256</code>, and sees <code>client_id_metadata_document_supported: true</code>, so it will identify itself by URL instead of registering.';
        rule = 'The issuer inside MUST equal the issuer used to build the URL; without code_challenge_methods_supported the client MUST refuse to proceed.';
      } else if (rl.startsWith('GET /authorize')) {
        label = 'GET /authorize?...';
        cap = 'The client hands the authorization URL to the browser (here a script). Read the query: <code>client_id</code> is the HTTPS URL of the client\'s metadata document; <code>code_challenge</code> with <code>S256</code>; <code>resource</code> is the MCP server\'s URI; <code>scope=files:read</code> from the server\'s metadata. The AS answers <b>302</b> to the loopback callback with <code>code</code>, <code>state</code> and <code>iss</code>.';
        rule = 'resource MUST be sent in both the authorization and token requests; PKCE S256 MUST be used; the AS SHOULD include iss (RFC 9207).';
        cimd = true;
      } else if (rl.startsWith('POST /token')) {
        label = 'POST /token';
        cap = 'After checking <code>state</code> and that <code>iss</code> equals the recorded issuer, the client redeems the code with its <code>code_verifier</code> and the same <code>resource</code>. The AS answers with an access token (an RFC 9068 JWT, <code>typ: at+jwt</code>, <code>aud</code> = the MCP server, 300 s) and a refresh token. Note the client still sends <code>redirect_uri</code>, which OAuth 2.1 draft-16 dropped from this request; the AS ignores it.';
        rule = 'For public clients the AS MUST rotate refresh tokens (MCP security considerations, Token Theft).';
      } else if (rl.startsWith('POST /mcp') && /tools\/call/.test(body)) {
        cap = 'The tool call, with <code>Authorization: Bearer</code>. The server verified the token (signature, <code>iss</code>, <code>aud</code>, <code>typ</code>, expiry, the <code>files:read</code> scope) before running the tool.';
        rule = 'Authorization MUST be included in every HTTP request; tokens MUST NOT go in the query string.';
      } else if (rl.startsWith('POST /mcp') && /tools\/list/.test(body)) {
        cap = 'The SDK then fetched the tool list. This is ordinary MCP traffic, not part of authorization, and the token rides along as on every request.';
      } else if (rl.startsWith('POST /mcp')) {
        cap = 'The client retries its first request, now with the token. <b>200</b>: the server knows who is calling.';
        rule = 'MCP servers MUST validate that the token was issued for them (audience).';
      }
      steps.push({ from, to, label, back: code + ' ' + sl.split(' ').slice(2).join(' '), backKind: +code >= 400 ? 'bad' : 'ok', cap, rule, ex: e });
      if (cimd) steps.push({ from: 3, to: 4, label: 'GET /client.json (HTTPS)', back: '200 client metadata', kind: 'note', cap: 'While handling that request, before its 302, the AS sees a URL-shaped <code>client_id</code> and fetches it: the <b>Client ID Metadata Document</b>. It checks that the document\'s <code>client_id</code> equals its URL and that the requested <code>redirect_uri</code> is listed. This fetch was over TLS to the metadata host and was not tapped; the AS code that made it is <code>fetch_cimd</code> in <code>src/lab/as_server.py</code>.', rule: 'The AS MUST validate that the fetched client_id matches the URL and MUST validate redirect URIs against the document.', ex: null });
    });
    const list = $('mfList');
    list.innerHTML = steps.map((s, k) => `<button class="exbtn" data-k="${k}">${k + 1}. ${E(s.label)}<span class="w">${E(s.back)}</span></button>`).join('');
    const W1 = () => Math.max(300, A.clientWidth - 28);
    const an = AU.anim({ root: A, count: () => steps.length, dwell: 3200, draw: i => {
      lanesSVG($('mfSvg'), L1, steps, i, W1());
      const s = steps[i];
      $('mfCap').innerHTML = `<b>Step ${i + 1} of ${steps.length}.</b> ` + s.cap;
      $('mfRule').innerHTML = s.rule ? '<b>Spec:</b> ' + E(s.rule) : '';
      $('mfWire').innerHTML = s.ex ? AU.wireHTML(s.ex, { body: 1400 }) : '<span class="mute">(TLS request from the AS to https://localhost:30613/client.json; not recorded on the wire)</span>';
      list.querySelectorAll('.exbtn').forEach(b => b.classList.toggle('on', +b.dataset.k === i));
    } });
    list.querySelectorAll('.exbtn').forEach(b => b.addEventListener('click', () => an.go(+b.dataset.k)));
    (TAB_RENDER['t-mcpflow'] = TAB_RENDER['t-mcpflow'] || []).push(() => an.redraw());
    addEventListener('resize', () => an.redraw());
  }

  // ---------- Part 2: passthrough vs exchange ----------
  const B = document.getElementById('mfB');
  if (B) {
    B.innerHTML = B.innerHTML.replace('<!--CTRL-->', AU.ctrlHTML);
    const L2 = ['MCP\nclient', 'MCP\nserver', 'Auth\nserver', 'Mail\nAPI'];
    const ph = D.sdk.phases, believes = x => x.upstream_body && x.upstream_body.upstream_believes_caller_is;
    const cs = phase('C passthrough strict'), cn = phase('C passthrough naive'), dx = phase('D exchange');
    const MCPAUD = 'aud: MCP server', MAILAUD = 'aud: mail API';
    const nb = believes(ph.C_naive) || {}, xb = believes(ph.D) || {};
    const P = {
      strict: [
        { from: 0, to: 1, label: 'tools/call inbox_passthrough', chip: 'alice\'s token, ' + MCPAUD, ex: cs[0], cap: 'The client calls a tool with alice\'s token. Its audience is the MCP server: correct so far.', c: { tokens: 1, aud: '(none yet)', who: '(none yet)' } },
        { from: 1, to: 3, label: 'GET /mail/inbox (same token)', chip: 'the SAME token, ' + MCPAUD, kind: 'bad', ex: cs[1], cap: 'The server forwards the token it received. This is token passthrough, which the MCP spec forbids.', c: { tokens: 1, aud: 'MCP server', who: '?' } },
        { from: 3, to: 1, label: '401 Audience doesn\'t match', kind: 'good', ex: cs[1], cap: 'A careful upstream checks <code>aud</code> and refuses: this token was never meant for it. Recorded: <code>' + E(ph.C_strict.upstream_body.error_description) + '</code>.', c: { tokens: 1, aud: 'MCP server (refused)', who: 'nobody: refused' } },
        { from: 1, to: 0, label: 'tool result: upstream 401', ex: cs[0], cap: 'The tool fails. Passthrough only "works" against upstreams that skip the audience check, which is the next path.', c: { tokens: 1, aud: 'MCP server (refused)', who: 'nobody: refused' } }
      ],
      naive: [
        { from: 0, to: 1, label: 'tools/call inbox_passthrough', chip: 'alice\'s token, ' + MCPAUD, ex: cn[0], cap: 'Same call, but this time the upstream checks only the signature and expiry.', c: { tokens: 1, aud: '(none yet)', who: '(none yet)' } },
        { from: 1, to: 3, label: 'GET /mail/inbox (same token)', chip: 'the SAME token, ' + MCPAUD, kind: 'bad', ex: cn[1], cap: 'The forwarded token is genuine (same issuer, valid signature), just addressed to someone else.', c: { tokens: 1, aud: 'MCP server', who: '?' } },
        { from: 3, to: 1, label: '200 OK (mail returned)', kind: 'bad', ex: cn[1], cap: 'Accepted. The mail API believes the caller is <code>' + E(nb.sub) + '</code> through client <code>' + E(nb.client_id) + '</code>, with no <code>act</code>. The MCP server, which actually made the call, does not appear anywhere: no per-server limits, no audit trail, and any token for the MCP server now opens the mail API too.', c: { tokens: 1, aud: 'MCP server (accepted!)', who: nb.sub + ' via ' + nb.client_id } },
        { from: 1, to: 0, label: 'tool result: mail', ex: cn[0], cap: 'The tool "works", which is how passthrough survives code review.', c: { tokens: 1, aud: 'MCP server (accepted!)', who: nb.sub + ' via ' + nb.client_id } }
      ],
      xchg: [
        { from: 0, to: 1, label: 'tools/call inbox_exchange', chip: 'alice\'s token, ' + MCPAUD, ex: dx[0], cap: 'The client calls the tool with alice\'s token, audience the MCP server.', c: { tokens: 1, aud: '(none yet)', who: '(none yet)' } },
        { from: 1, to: 2, label: 'POST /token (token exchange)', chip: 'subject_token + its own signed assertion', kind: 'xc', ex: dx[1], cap: 'The server authenticates to the AS as itself (<code>private_key_jwt</code>), hands over alice\'s token as <code>subject_token</code>, and asks for a token for the mail API (<code>resource</code>).', c: { tokens: 1, aud: '(none yet)', who: '(none yet)' } },
        { from: 2, to: 1, label: '200 new token', chip: 'NEW token, ' + MAILAUD + ', act: MCP server', kind: 'xc', chipColor: 'var(--open2)', ex: dx[1], cap: 'The AS checks the subject token was issued for the MCP server, applies its policy, and returns a new token: audience the mail API, scope narrowed to <code>mail:read</code>, and <code>act: {sub: mcp-files-server}</code>.', c: { tokens: 2, aud: '(none yet)', who: '(none yet)' } },
        { from: 1, to: 3, label: 'GET /mail/inbox (new token)', chip: 'NEW token, ' + MAILAUD, chipColor: 'var(--open2)', kind: 'good', ex: dx[2], cap: 'The server calls the careful upstream with the new token.', c: { tokens: 2, aud: 'mail API', who: '?' } },
        { from: 3, to: 1, label: '200 OK', kind: 'good', ex: dx[2], cap: 'Accepted by the same strict checks that refused passthrough. The mail API sees <code>sub ' + E(xb.sub) + '</code>, client <code>' + E(xb.client_id) + '</code> and <code>act ' + E(JSON.stringify(xb.act)) + '</code>: both the user and the intermediary, ready for policy and audit.', c: { tokens: 2, aud: 'mail API', who: xb.sub + ', acted for by ' + (xb.act && xb.act.sub) } },
        { from: 1, to: 0, label: 'tool result: mail', ex: dx[0], cap: 'Cost of doing it right: one extra round trip to the AS per exchange (cacheable until the new token expires) and an AS policy to write.', c: { tokens: 2, aud: 'mail API', who: xb.sub + ', acted for by ' + (xb.act && xb.act.sub) } }
      ]
    };
    let mode = 'strict';
    const W2 = () => Math.max(300, B.clientWidth - 28);
    const an2 = AU.anim({ root: B, count: () => P[mode].length, dwell: 2600, draw: i => {
      const S = P[mode];
      lanesSVG($('mfSvg2'), L2, S.map(s => Object.assign({}, s)), i, W2());
      const s = S[i];
      $('mfCap2').innerHTML = `<b>Step ${i + 1} of ${S.length}.</b> ` + s.cap;
      $('mfCnt2').innerHTML = `<span>Tokens in play: <b>${s.c.tokens}</b></span><span>Token the mail API received is for: <b>${E(s.c.aud)}</b></span><span>Mail API believes the caller is: <b>${E(s.c.who)}</b></span>`;
      $('mfWire2').innerHTML = s.ex ? AU.wireHTML(s.ex, { body: 900 }) : '';
    } });
    B.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.p; B.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b)); an2.go(0); }));
    (TAB_RENDER['t-mcpflow'] = TAB_RENDER['t-mcpflow'] || []).push(() => an2.redraw());
    addEventListener('resize', () => an2.redraw());
  }
  // ---------- Part 3: mix-up ----------
  const m = phase('E mix-up'), mx = $('mfMix');
  if (mx) mx.innerHTML = m.map(e => '<span class="mute">' + E(e.who) + ' &#8594; ' + E(e.tap === 'as' ? 'auth server' : 'MCP server') + '</span>\n' + AU.wireHTML(e, { noReqHead: true, body: 200 })).join('\n\n') + '\n\n<span class="bad">SDK: ' + E(D.sdk.phases.E.error) + '</span>\n<span class="mute">(no POST /token follows: the code was never sent)</span>';
})();
