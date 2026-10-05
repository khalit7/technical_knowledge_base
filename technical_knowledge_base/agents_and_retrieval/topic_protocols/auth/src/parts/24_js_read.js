// ---- Reading tab: fill every recorded value, the key checker, PKCE, SigV4 calculator, JWT anatomy ----
(function () {
  const D = AUTHDATA, $ = id => document.getElementById(id), E = AU.esc;
  // Render one recorded HTTP exchange: request in blue, response in green, long bodies cut with a note.
  function cut(s, n) { return s.length > n ? s.slice(0, n) + ' ...[' + (s.length - n) + ' more bytes]' : s; }
  function wireHTML(ex, o) {
    o = o || {};
    const rq = ex.req.replace(/\r/g, ''), rs = ex.resp.replace(/\r/g, '');
    const [rh, rb] = [rq.split('\n\n')[0], rq.split('\n\n').slice(1).join('\n\n')];
    const [sh, sb] = [rs.split('\n\n')[0], rs.split('\n\n').slice(1).join('\n\n')];
    const hl = t => E(t).replace(/(invalid_[a-z_]+|insufficient_scope|slow_down|authorization_pending|Audience doesn&#39;t match|Audience doesn't match|reuse detected[^"]*|already used|PKCE verification failed[^"]*|replayed[^"]*|not the key[^"]*|sent as Bearer)/g, '<span class="bad">$1</span>');
    let out = '<span class="rq">' + hl(o.noReqHead ? rh.split('\n')[0] : rh) + (rb ? '\n\n' + hl(cut(rb, o.body || 420)) : '') + '</span>';
    out += '\n\n<span class="rs">' + hl(sh) + (sb ? '\n\n' + hl(cut(sb.trim(), o.body || 420)) : '') + '</span>';
    return out;
  }
  AU.wireHTML = wireHTML;
  const phase = name => (D.wire.find(p => p.phase === name) || { ex: [] }).ex;
  function table(rows, cols) {
    return '<div class="tw"><table><thead><tr>' + cols.map(c => '<th>' + c[0] + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + cols.map(c => '<td>' + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  const st = s => `<span class="pill ${s < 300 ? 'ok' : 'no'}">${s}</span>`;
  const brief = b => {
    if (b == null) return '<span class="mute">(empty body)</span>';
    if (typeof b !== 'object') return E(b);
    if (b.error) return '<code>' + E(b.error) + '</code>' + (b.error_description ? ': ' + E(b.error_description) : '');
    return '<code>' + E(JSON.stringify(b)).slice(0, 260) + '</code>';
  };
  // s1: the 401
  const w = phase('W wrong audience');
  if (w[1]) $('rdW401').innerHTML = wireHTML(w[1], { body: 300 });
  // s2: API key
  const k = D.small.apikey;
  $('rdKey').innerHTML = 'key       ' + E(k.example) + '\nprefix    lab_\nbody      ' + E(k.example.slice(4, -6)) + '   (30 random base62 characters)\nchecksum  ' + E(k.example.slice(-6)) + '   (CRC32 of the body, base62)\nserver stores  sha256 = ' + E(k.stored_sha256) + '\ndisplay hint   ' + E(k.display_hint);
  $('rdKeyBits').textContent = (30 * Math.log2(62)).toFixed(1);
  $('rdKeyHint').textContent = k.display_hint;
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return s => { let c = 0xFFFFFFFF; for (const b of AU.utf8(s)) c = t[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }; })();
  const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const b62 = (n, w) => { let s = ''; while (n) { s = B62[n % 62] + s; n = Math.floor(n / 62); } return s.padStart(w, '0'); };
  AU.keyCheck = key => { if (!/^lab_[0-9A-Za-z]{36}$/.test(key)) return { ok: false, why: 'not the lab format (lab_ + 36 base62 characters)' }; const body = key.slice(4, -6), want = b62(CRC(body), 6); return { ok: want === key.slice(-6), want }; };
  const ki = $('keyIn'), ko = $('keyOut');
  function kc() { const r = AU.keyCheck(ki.value.trim()); ko.innerHTML = r.ok ? '<span class="verdict ok">Checksum valid</span>: plausible key, worth a database lookup.' : '<span class="verdict no">Rejected without a lookup</span>: ' + (r.want ? 'checksum should be <code>' + r.want + '</code> for this body.' : r.why); }
  ki.value = k.example; ki.addEventListener('input', kc); kc();
  // s4: PKCE
  const pc = AU.b64u(AU.sha256(D.small.pkce.verifier));
  $('rdPkceC').textContent = pc;
  $('rdPkceOk').innerHTML = pc === D.small.pkce.rfc_challenge ? '<span class="verdict ok">matches the RFC</span>' : '<span class="verdict no">does not match</span>';
  const P = phase('P pkce misuse');
  $('rdPkceRec').innerHTML = [P[1], P[4]].filter(Boolean).map(x => wireHTML(x, { noReqHead: true, body: 300 })).join('\n\n<span class="mute">----- later: the same code redeemed a second time -----</span>\n\n');
  const R = D.flows.R;
  $('rdRot').innerHTML = table(R, [['Step', r => E(r.step)], ['Status', r => st(r.status)], ['Answer', r => r.body && r.body.refresh_token ? 'new access token; new refresh token <code>' + E(r.body.refresh_token.slice(0, 8)) + '...</code>' : brief(r.body)]]);
  const C = D.flows.C;
  $('rdCC').innerHTML = table(C.slice(0, 2), [['Step', r => E(r.step)], ['Status', r => st(r.status)], ['Answer', r => r.body && r.body.access_token ? 'access token, <code>' + E(r.body.token_type) + '</code>, ' + r.body.expires_in + ' s, scope <code>' + E(r.body.scope) + '</code>' : brief(r.body) + (r['www-authenticate'] ? '<br><code>WWW-Authenticate: ' + E(r['www-authenticate']) + '</code>' : '')]]);
  const V = D.flows.V;
  $('rdDev').innerHTML = table(V, [['t (s)', r => r.t.toFixed(2)], ['Step', r => E(r.step)], ['Status', r => st(r.status)], ['Answer', r => r.body && r.body.user_code ? 'user code <code>' + E(r.body.user_code) + '</code>, interval ' + r.body.interval + ' s, expires in ' + r.body.expires_in + ' s' : r.body && r.body.access_token ? 'tokens issued' : brief(r.body)]]);
  $('rdUcBits').textContent = (8 * Math.log2(20)).toFixed(1);
  // s4/s5: discovery documents
  const G = D.disc.docs.google;
  $('rdDisc').innerHTML = table([
    ['response_types_supported', G.response_types_supported.join(', '), 'includes <code>token</code> (implicit) and hybrids'],
    ['code_challenge_methods_supported', G.code_challenge_methods_supported.join(', '), 'includes <code>plain</code>'],
    ['grant_types_supported', G.grant_types_supported.join(', '), 'device code and JWT bearer grants']
  ], [['Google field', r => '<code>' + r[0] + '</code>'], ['Value', r => '<code>' + E(r[1]) + '</code>'], ['Note', r => r[2]]]);
  $('rdDiscWhen').textContent = D.disc.fetched.replace('T', ' ').replace('Z', ' UTC');
  const docs = D.disc.docs, names = { google: 'Google', microsoft_common: 'Microsoft (common)', github_actions: 'GitHub Actions' };
  const v = x => x == null ? '<span class="pill no">absent</span>' : '<code>' + E(Array.isArray(x) ? x.join(', ') : String(x)) + '</code>';
  $('rdDisc2').innerHTML = table(Object.keys(docs), [['Provider', p => '<a href="' + E(docs[p].url) + '" target="_blank" rel="noopener noreferrer">' + names[p] + '</a>'], ['issuer', p => v(docs[p].issuer)], ['ID token alg', p => v(docs[p].id_token_signing_alg_values_supported)], ['PKCE methods', p => v(docs[p].code_challenge_methods_supported)], ['iss in responses (RFC 9207)', p => v(docs[p].authorization_response_iss_parameter_supported)], ['client auth', p => v(docs[p].token_endpoint_auth_methods_supported)]]);
  $('rdJwksN').textContent = D.disc.google_jwks.keys.length;
  $('rdJwksCc').textContent = D.disc.google_jwks.cache_control;
  // s6: JWT anatomy from the lab's good token
  const good = D.jwt.cases.find(c => c.id === 'good').token.split('.');
  $('rdJwtParts').innerHTML = '<span class="h">' + good[0] + '</span>.<span class="p">' + good[1] + '</span>.<span class="s">' + good[2] + '</span>';
  const hd = JSON.parse(AU.b64uDec(good[0])), pl = JSON.parse(AU.b64uDec(good[1]));
  const meaning = { alg: 'signature algorithm (the verifier must not trust this to choose)', kid: 'which of the issuer\'s keys signed it', typ: 'token type: at+jwt marks an access token (RFC 9068)', iss: 'issuer: who minted it', sub: 'subject: who it is about', aud: 'audience: which API must accept it', scope: 'what it allows', iat: 'issued at (Unix seconds)', exp: 'expires at', jti: 'unique ID (for replay and revocation lists)' };
  $('rdJwtClaims').innerHTML = '<thead><tr><th>Part</th><th>Field</th><th>Value</th><th>Meaning</th></tr></thead><tbody>' + Object.entries(hd).map(([a, b]) => `<tr><td style="color:var(--c2)">header</td><td><code>${a}</code></td><td><code>${E(b)}</code></td><td>${meaning[a] || ''}</td></tr>`).join('') + Object.entries(pl).map(([a, b]) => `<tr><td style="color:var(--c4)">payload</td><td><code>${a}</code></td><td><code>${E(b)}</code></td><td>${meaning[a] || ''}</td></tr>`).join('') + '</tbody>';
  $('rdAlgs').innerHTML = '<thead><tr><th>alg</th><th>Key</th><th class="num">Token bytes</th><th class="num">Signature bytes</th><th class="num">Sign (&micro;s)</th><th class="num">Verify (&micro;s)</th></tr></thead><tbody>' + D.jwt.algs.map(a => `<tr><td><code>${a.alg}</code></td><td>${a.key}</td><td class="num">${a.bytes}</td><td class="num">${a.sig_bytes}</td><td class="num">${a.sign_us}</td><td class="num">${a.verify_us}</td></tr>`).join('') + '</tbody>';
  const cr = D.jwt.crack;
  $('rdCrackN').textContent = cr.tried.toLocaleString('en-US'); $('rdCrackS').textContent = cr.seconds; $('rdCrackR').textContent = cr.per_second.toLocaleString('en-US');
  const secs = Math.pow(36, 6) / cr.per_second; $('rdCrackSpace').textContent = (secs / 60).toFixed(0) + ' minutes on one core';
  $('rdRevoke').innerHTML = table(C.slice(2), [['Step', r => E(r.step)], ['Status', r => st(r.status)], ['Answer', r => r.body && r.body.active !== undefined ? '<code>active: ' + r.body.active + '</code>' : r.body && r.body.result ? 'tool result returned: the token was accepted' : brief(r.body)]]);
  // s7: DPoP
  $('rdDpop').innerHTML = table(D.flows.D, [['Step', r => E(r.step)], ['Status', r => st(r.status)], ['Answer', r => r.cnf ? 'token_type <code>DPoP</code>, bound by <code>cnf.jkt = ' + E(r.cnf.jkt.slice(0, 12)) + '...</code>' : r.body && r.body.notes ? 'data returned' : brief(r.body)]]);
  $('rdEsSign').textContent = D.jwt.algs.find(a => a.alg === 'ES256').sign_us;
  // s8: token exchange recording
  const X = phase('D exchange');
  if (X[1]) {
    $('rdXchg').innerHTML = '<pre class="wire">' + wireHTML(X[1], { body: 900 }) + '</pre>';
    const fin = D.sdk.phases.D.upstream_body.upstream_believes_caller_is;
    $('rdXchg').innerHTML += '<p class="small">The mail API then decoded the exchanged token as: <code>sub=' + E(fin.sub) + '</code>, <code>client_id=' + E(fin.client_id) + '</code>, <code>act=' + E(JSON.stringify(fin.act)) + '</code>, <code>aud=' + E(fin.aud) + '</code>, <code>scope=' + E(fin.scope) + '</code> (recorded).</p>';
  }
  // s9: mix-up and passthrough
  $('rdMixErr').textContent = D.sdk.phases.E.error;
  const ph = D.sdk.phases, who = b => b && b.upstream_believes_caller_is;
  const rows = [['Passthrough to a careful upstream (checks aud)', ph.C_strict], ['Passthrough to a careless upstream (signature only)', ph.C_naive], ['Token exchange, then the careful upstream', ph.D]];
  $('rdPass').innerHTML = table(rows, [['Tool call', r => r[0]], ['Upstream status', r => st(r[1].upstream_status)], ['Who the upstream believes is calling', r => { const x = who(r[1].upstream_body); return x ? 'sub <code>' + E(x.sub) + '</code>, client <code>' + E(x.client_id) + '</code>, act <code>' + (x.act ? E(JSON.stringify(x.act)) : '(none)') + '</code>, aud <code>' + E(x.aud) + '</code>' : brief(r[1].upstream_body); }]]);
  // s7: SigV4 calculator
  const vec = D.small.sigv4;
  const SH = s => AU.hex(AU.sha256(s));
  function sigv4(m, path, host, date, region, service, body, secret, extraHeaders) {
    const hs = Object.entries(Object.assign({ host: host, 'x-amz-date': date }, extraHeaders || {})).map(([a, b]) => [a.toLowerCase(), String(b).trim().replace(/\s+/g, ' ')]).sort((a, b) => a[0] < b[0] ? -1 : 1);
    const ch = hs.map(([a, b]) => a + ':' + b + '\n').join(''), signed = hs.map(h => h[0]).join(';');
    const creq = [m, path, '', ch, signed, SH(body)].join('\n');
    const scope = date.slice(0, 8) + '/' + region + '/' + service + '/aws4_request';
    const sts = ['AWS4-HMAC-SHA256', date, scope, SH(creq)].join('\n');
    let key = AU.hmac('AWS4' + secret, date.slice(0, 8)); key = AU.hmac(key, region); key = AU.hmac(key, service); key = AU.hmac(key, 'aws4_request');
    const sig = AU.hex(AU.hmac(key, sts));
    return { creq, sts, key: AU.hex(key), sig, authz: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/' + scope + ', SignedHeaders=' + signed + ', Signature=' + sig };
  }
  AU.sigv4 = sigv4;
  let preset = 0;
  const f = id => $(id).value;
  function sg() {
    const extra = preset === 1 ? { 'content-type': 'application/x-www-form-urlencoded' } : {};
    const r = sigv4(f('sgM'), f('sgP'), f('sgH'), f('sgD'), f('sgR'), f('sgS'), f('sgB'), f('sgK'), extra);
    const exp = vec[preset].expected_authorization, same = r.authz === exp;
    $('sgOut').innerHTML = '<span class="mute">1. canonical request</span>\n' + E(r.creq) + '\n\n<span class="mute">2. string to sign</span>\n' + E(r.sts) + '\n\n<span class="mute">3. signing key = HMAC chain(secret; date, region, service, aws4_request)</span>\n' + r.key + '\n\n<span class="mute">4. Authorization header</span>\n' + E(r.authz) + '\n\n' + (same ? '<span class="rs">= the test suite\'s expected value (' + E(vec[preset].name) + ')</span>' : '<span class="bad">differs from the test suite\'s ' + E(vec[preset].name) + ' value: you changed an input</span>');
    return same;
  }
  function load(i) {
    preset = i; const p = i === 0 ? { m: 'GET', b: '' } : { m: 'POST', b: 'Param1=value1' };
    $('sgM').value = p.m; $('sgP').value = '/'; $('sgH').value = 'example.amazonaws.com'; $('sgD').value = '20150830T123600Z'; $('sgR').value = 'us-east-1'; $('sgS').value = 'service'; $('sgB').value = p.b; $('sgK').value = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
    document.querySelectorAll('[data-sg]').forEach(b => b.classList.toggle('on', +b.dataset.sg === i)); sg();
  }
  document.querySelectorAll('[data-sg]').forEach(b => b.addEventListener('click', () => load(+b.dataset.sg)));
  ['sgM', 'sgP', 'sgH', 'sgD', 'sgR', 'sgS', 'sgB', 'sgK'].forEach(id => $(id).addEventListener('input', sg));
  load(0);
  const K0 = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
  AU.sigOk = [sigv4('GET', '/', 'example.amazonaws.com', '20150830T123600Z', 'us-east-1', 'service', '', K0).authz === vec[0].expected_authorization,
    sigv4('POST', '/', 'example.amazonaws.com', '20150830T123600Z', 'us-east-1', 'service', 'Param1=value1', K0, { 'content-type': 'application/x-www-form-urlencoded' }).authz === vec[1].expected_authorization];
  $('sgRepro').innerHTML = vec.every(x => x.match) && AU.sigOk.every(Boolean) ? '(<span class="verdict ok">reproduced independently</span>, here in JavaScript and in the page\'s Python script, for both vectors)' : '(<span class="verdict no">not reproduced</span>)';
})();
