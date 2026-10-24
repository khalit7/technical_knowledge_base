// ---- Reading figures added in the 2026-10-24 rebuild: hero, sessions against tokens, refresh rotation, device grant,
// ID token against access token, DPoP proof structure, workload identity. All static (nothing moves); drawn at the
// measured width when the Reading tab opens and on resize. Recorded figures read AUTHDATA; the rest are labelled illustrative.
(function () {
  const D = AUTHDATA, E = AU.esc, $ = id => document.getElementById(id);
  const draws = [];
  const reg = f => { draws.push(f); };
  const desc = b => (b && typeof b === 'object' && (b.error_description || b.error)) || '';

  // Hero: one delegated call, every hop with its own narrow token (values recorded in this page's lab)
  reg(() => {
    const svg = $('heroSvg'); if (!svg) return;
    const W = AU.width(svg.parentElement);
    AU.lanes(svg, ['Agent\n(MCP client)', 'Authorization\nserver', 'MCP\nserver', 'Mail\nAPI'], [
      { from: 0, to: 1, label: 'code + PKCE verifier, resource = MCP server', back: 'token A (+ a rotating refresh token)', chip: 'A: aud MCP server, files:read, 300 s' },
      { from: 0, to: 2, label: 'tools/call, Authorization: Bearer A', back: 'checks sig, iss, aud, exp, scope', backKind: 'good' },
      { from: 2, to: 3, label: 'forward A?', kind: 'bad', dash: true, back: '401: A is not for the mail API', backKind: 'bad' },
      { from: 2, to: 1, label: 'exchange: A + its own signed assertion', kind: 'xc', back: 'token B', chip: 'B: aud mail API, mail:read, act: MCP server', chipColor: 'var(--open2)' },
      { from: 2, to: 3, label: 'Authorization: Bearer B', kind: 'good', back: '200: sees alice and the MCP server', backKind: 'good' }
    ], 99, W, true);
  });

  // Sessions against self-contained tokens against a backend for frontend (illustrative)
  function stack(svg, boxes, links) {
    const W = AU.width(svg.parentElement), bh = 44, gap = 30, H = boxes.length * bh + (boxes.length - 1) * gap + 4;
    const fs = 12;
    let o = '<defs><marker id="' + svg.id + 'A" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';
    boxes.forEach((b, k) => {
      const y = 2 + k * (bh + gap);
      o += `<rect x="2" y="${y}" width="${W - 4}" height="${bh}" rx="7" fill="${b.dim ? 'var(--bg)' : 'var(--soft)'}" stroke="${b.c || 'var(--line)'}"${b.dim ? ' stroke-dasharray="4 3"' : ''}/>`;
      o += `<text x="10" y="${y + 17}" font-size="${fs}" font-weight="600" fill="${b.dim ? 'var(--mute)' : 'var(--ink)'}">${E(b.t)}</text>`;
      o += `<text x="10" y="${y + 34}" font-size="${fs - 0.5}" font-family="ui-monospace,Menlo,monospace" fill="${b.dim ? 'var(--mute)' : 'var(--ink)'}">${E(b.s)}</text>`;
      if (k < boxes.length - 1) {
        const l = links[k] || {}, x = 26;
        o += `<line x1="${x}" y1="${y + bh + 2}" x2="${x}" y2="${y + bh + gap - 3}" stroke="${l.c || 'var(--c1)'}" stroke-width="1.8"${l.dash ? ' stroke-dasharray="4 3"' : ''} marker-end="url(#${svg.id}A)"/>`;
        o += `<text x="${x + 10}" y="${y + bh + gap / 2 + 4}" font-size="${fs - 0.5}" fill="var(--mute)">${E(l.t || '')}</text>`;
      }
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.innerHTML = o;
  }
  reg(() => {
    if (!$('ssA')) return;
    stack($('ssA'), [{ t: 'Browser', s: 'Cookie: __Host-sid=Wq3v8kH0...' }, { t: 'Web server', s: 'look up sid' }, { t: 'Session store (the truth)', s: 'sid -> alice, expiry', c: 'var(--acc)' }],
      [{ t: 'sent automatically' }, { t: 'one lookup per request' }]);
    stack($('ssB'), [{ t: 'Client', s: 'eyJ... claims + signature', c: 'var(--acc)' }, { t: 'API', s: 'verify with the AS public key' }, { t: 'No store consulted', s: 'nothing to delete', dim: true }],
      [{ t: 'Authorization: Bearer' }, { t: 'offline check', dash: true, c: 'var(--mute)' }]);
    stack($('ssC'), [{ t: 'Browser', s: 'HttpOnly session cookie only' }, { t: 'BFF (small server)', s: 'holds access + refresh tokens', c: 'var(--acc)' }, { t: 'API', s: 'receives Bearer tokens' }],
      [{ t: 'cookie' }, { t: 'server to server' }]);
  });

  // Refresh rotation with reuse detection (recorded, flows R)
  reg(() => {
    const svg = $('rotSvg'); if (!svg) return;
    const R = D.flows.R, st = r => r.status + ' ' + (desc(r.body) || 'new access token + new refresh token');
    AU.lanes(svg, ['Client', 'Authorization\nserver', 'Thief\n(copy of RT1)'], [
      { from: 0, to: 1, label: 'code + verifier', back: R[0].status + ': access token + RT1' },
      { from: 0, to: 1, label: 'refresh with RT1', back: st(R[1]) + ' (RT2)' },
      { from: 2, to: 1, label: 'replay RT1', kind: 'bad', back: st(R[2]), backKind: 'bad' },
      { from: 0, to: 1, label: 'refresh with RT2', back: st(R[3]), backKind: 'bad' }
    ], 99, AU.width(svg.parentElement), true);
  });

  // Device grant (recorded, flows V)
  reg(() => {
    const svg = $('devSvg'); if (!svg) return;
    const V = D.flows.V, b = V[0].body || {};
    const tt = r => 't=' + (+r.t).toFixed(2) + ' s ';
    AU.lanes(svg, ['Device\n(no browser)', 'Authorization\nserver', 'Phone\n(alice)'], [
      { from: 0, to: 1, label: tt(V[0]) + 'ask for codes', back: V[0].status + ': user code ' + b.user_code + ', interval ' + b.interval + ' s' },
      { from: 0, to: 1, label: tt(V[1]) + 'poll', back: V[1].status + ' ' + (V[1].body.error || ''), backKind: 'note' },
      { from: 0, to: 1, label: tt(V[2]) + 'poll', back: V[2].status + ' ' + (V[2].body.error || ''), backKind: 'note' },
      { from: 0, to: 1, label: tt(V[3]) + 'poll again at once', back: V[3].status + ' ' + desc(V[3].body), backKind: 'bad' },
      { from: 2, to: 1, label: tt(V[4]) + 'types ' + b.user_code + ', approves', kind: 'good', back: V[4].status },
      { from: 0, to: 1, label: tt(V[5]) + 'poll after 6 s', back: V[5].status + ': tokens issued', backKind: 'good' }
    ], 99, AU.width(svg.parentElement), true);
  });

  // DPoP: the proof's fields and the token's confirmation (fields per RFC 9449 s4.2 and s6.1; thumbprint recorded)
  reg(() => {
    const svg = $('dpSvg'); if (!svg) return;
    const W = AU.width(svg.parentElement), wide = W >= 620, fs = 12, lh = fs + 6;
    const jkt = (D.flows.D[0].cnf || {}).jkt || '';
    const A = { t: 'DPoP proof (new JWT per request)', rows: [['header', 'typ: dpop+jwt'], ['', 'alg: ES256'], ['', 'jwk: the client\'s PUBLIC key', 1], ['claims', 'htm: GET'], ['', 'htu: https://api.example.com/notes'], ['', 'iat: now'], ['', 'jti: unique (replay cache)'], ['', 'ath: SHA-256 of the access token', 2]] };
    const B = { t: 'Access token (issued to that key)', rows: [['claims', 'sub, aud, scope, exp ...'], ['', 'cnf.jkt: thumbprint of the jwk', 1], ['', jkt.slice(0, 22) + '... (recorded)'], ['type', 'token_type: DPoP (not Bearer)']] };
    const bw = wide ? (W - 60) / 2 : W - 4, hA = 26 + A.rows.length * lh + 8, hB = 26 + B.rows.length * lh + 8;
    const ax = 2, ay = 2, bx = wide ? W - bw - 2 : 2, by = wide ? 2 : hA + 46, H = wide ? Math.max(hA, hB) + 4 : by + hB + 4;
    let o = '<defs><marker id="dpAr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';
    const yRow = {};
    const box = (X, x, y, w, h, id) => {
      o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--soft)" stroke="var(--line)"/>`;
      o += `<text x="${x + 8}" y="${y + 17}" font-size="${fs}" font-weight="600" fill="var(--ink)">${E(X.t)}</text>`;
      X.rows.forEach((r, k) => {
        const yy = y + 26 + (k + 1) * lh - 4;
        if (r[2]) yRow[id + r[2]] = yy - fs / 2;
        o += `<text x="${x + 8}" y="${yy}" font-size="${fs - 1}" fill="var(--mute)">${E(r[0])}</text>`;
        o += `<text x="${x + 58}" y="${yy}" font-size="${fs - 0.5}" font-family="ui-monospace,Menlo,monospace" fill="${r[2] ? 'var(--acc)' : 'var(--ink)'}"${r[2] ? ' font-weight="600"' : ''}>${E(r[1])}</text>`;
      });
    };
    box(A, ax, ay, bw, hA, 'a'); box(B, bx, by, bw, hB, 'b');
    if (wide) {
      o += `<path d="M${ax + bw} ${yRow.a1} C ${ax + bw + 30} ${yRow.a1}, ${bx - 30} ${yRow.b1}, ${bx} ${yRow.b1}" fill="none" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#dpAr)"/>`;
      o += `<path d="M${ax + bw} ${yRow.a2} C ${ax + bw + 30} ${yRow.a2}, ${bx - 30} ${by + 20}, ${bx} ${by + 20}" fill="none" stroke="var(--c4)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#dpAr)"/>`;
    } else {
      o += `<line x1="${W / 2}" y1="${hA + 6}" x2="${W / 2}" y2="${by - 4}" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#dpAr)"/>`;
      o += `<text x="${W / 2 + 8}" y="${hA + 28}" font-size="${fs - 0.5}" fill="var(--acc)">thumbprint(jwk) must equal cnf.jkt</text>`;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.innerHTML = o;
  });

  // Workload identity federation (illustrative; claim formats from GitHub's OIDC reference)
  reg(() => {
    const svg = $('wiSvg'); if (!svg) return;
    AU.lanes(svg, ['CI job', 'GitHub\nOIDC issuer', 'Cloud token\nservice (STS)', 'Cloud\nAPI'], [
      { from: 0, to: 1, label: 'ask for an ID token (id-token: write)', back: 'ID token, sub = repo:octo-org/octo-repo:environment:Production' },
      { from: 0, to: 2, label: 'AssumeRoleWithWebIdentity(ID token, role)' },
      { from: 2, to: 2, label: 'trust policy: iss, aud and exact sub match?', kind: 'note' },
      { from: 2, to: 0, label: 'temporary credentials (key, secret, session token)', kind: 'good' },
      { from: 0, to: 3, label: 'signed call (SigV4)', kind: 'good', back: '200', backKind: 'good' }
    ], 99, AU.width(svg.parentElement), true);
  });

  // ID token against access token: the lab's two tokens, field by field (recorded)
  reg(() => {
    const el = $('rdIdCmp'); if (!el || el.dataset.done) return; el.dataset.done = 1;
    const c = id => D.jwt.cases.find(x => x.id === id).token.split('.');
    const dec = t => [JSON.parse(AU.b64uDec(t[0])), JSON.parse(AU.b64uDec(t[1]))];
    const [ah, ap] = dec(c('good')), [ih, ip] = dec(c('idtoken'));
    const rows = [];
    const keys = (a, b) => [...new Set(Object.keys(a).concat(Object.keys(b)))];
    keys(ah, ih).forEach(k => rows.push(['header', k, ah[k], ih[k]]));
    keys(ap, ip).forEach(k => rows.push(['payload', k, ap[k], ip[k]]));
    const v = x => x === undefined ? '<span class="mute">(absent)</span>' : '<code>' + E(JSON.stringify(x)) + '</code>';
    el.innerHTML = '<table><thead><tr><th>Part</th><th>Field</th><th>Access token</th><th>ID token</th></tr></thead><tbody>' +
      rows.map(r => { const diff = JSON.stringify(r[2]) !== JSON.stringify(r[3]); return `<tr${diff ? ' class="diffrow"' : ''}><td>${r[0]}</td><td><code>${r[1]}</code></td><td>${v(r[2])}</td><td>${v(r[3])}</td></tr>`; }).join('') + '</tbody></table>';
  });

  const all = () => draws.forEach(f => { try { f(); } catch (e) { setTimeout(() => { throw e; }); } });
  (TAB_RENDER['t-read'] = TAB_RENDER['t-read'] || []).push(all);
  let lw = 0; addEventListener('resize', () => { const r = $('t-read'); if (!r || r.hidden) return; const w = r.clientWidth; if (w !== lw) { lw = w; all(); } });
  all();
})();
