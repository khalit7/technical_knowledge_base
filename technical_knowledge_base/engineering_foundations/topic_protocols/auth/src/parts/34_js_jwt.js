// ---- Tab "JWT lab": recorded signature verdicts, live claim checks, presets, scoreboard; and an HS256 tamper box ----
(function () {
  const J = AUTHDATA.jwt, E = AU.esc, $ = id => document.getElementById(id);
  if (!$('jl')) return;
  const FORGED = ['tamper', 'none', 'hs_pub', 'kid_path', 'jku', 'weak'];
  const pol = { pin: true, typ: true, iss: true, aud: true, time: true, scope: true, lee: 30 };
  const PRE = { strict: { pin: true, typ: true, iss: true, aud: true, time: true, scope: true, lee: 30 },
    noaud: { pin: true, typ: false, iss: true, aud: false, time: true, scope: true, lee: 30 },
    naive: { pin: false, typ: false, iss: false, aud: false, time: true, scope: false, lee: 30 } };
  const dec = t => { const [h, p] = t.split('.'); return { h: JSON.parse(AU.b64uDec(h)), p: JSON.parse(AU.b64uDec(p)) }; };
  // returns [{name, ok, detail, skipped}], status 200|401|403
  function verify(c) {
    const { h, p } = dec(c.token), now = J.recorded_at, out = [];
    const sig = pol.pin ? c.pinned : c.naive;
    out.push({ name: pol.pin ? 'signature (pinned: RS256, JWKS key by kid)' : 'signature (naive: as the header says)', ok: sig.ok, detail: sig.why });
    if (!sig.ok) return { steps: out, status: 401 };
    const chk = (on, name, ok, detail) => { out.push({ name, ok: on ? ok : true, detail, skipped: !on }); return !on || ok; };
    if (!chk(pol.typ, 'typ is at+jwt', h.typ === 'at+jwt', 'typ = ' + h.typ)) return { steps: out, status: 401 };
    if (!chk(pol.iss, 'iss is the trusted issuer', p.iss === J.iss, 'iss = ' + p.iss)) return { steps: out, status: 401 };
    const auds = [].concat(p.aud || []);
    if (!chk(pol.aud, 'aud contains this API', auds.includes(J.aud), 'aud = ' + auds.join(', '))) return { steps: out, status: 401 };
    let tok = true, td = [];
    if (p.exp !== undefined) { const r = p.exp + pol.lee - now; td.push('exp ' + (p.exp - now >= 0 ? 'in ' + (p.exp - now) + ' s' : (now - p.exp) + ' s ago')); if (r < 0) tok = false; }
    if (p.nbf !== undefined) { td.push('nbf ' + (p.nbf - now) + ' s ahead'); if (p.nbf - pol.lee > now) tok = false; }
    if (p.iat !== undefined && p.iat - pol.lee > now) { tok = false; td.push('iat in the future'); }
    if (!chk(pol.time, 'time: exp, nbf, iat (leeway ' + pol.lee + ' s)', tok, td.join('; '))) return { steps: out, status: 401 };
    if (!chk(pol.scope, 'scope includes messages:write', String(p.scope || '').split(' ').includes('messages:write'), 'scope = ' + p.scope)) return { steps: out, status: 403 };
    return { steps: out, status: 200 };
  }
  let cur = 'good';
  const list = $('jlList');
  list.innerHTML = J.cases.map(c => `<button class="exbtn" data-id="${c.id}"><span id="jlV-${c.id}"></span> ${E(c.title)}</button>`).join('');
  function render() {
    let forg = 0, bad = 0;
    J.cases.forEach(c => {
      const r = verify(c), acc = r.status === 200;
      if (acc && FORGED.includes(c.id)) forg++;
      if (acc && c.id !== 'good') bad++;
      $('jlV-' + c.id).innerHTML = `<span class="pill ${acc ? (c.id === 'good' ? 'ok' : 'no') : 'ok'}">${r.status}</span>`;
    });
    $('jlForg').innerHTML = `<span style="color:${forg ? 'var(--bad)' : 'var(--good)'}">${forg}</span>`;
    $('jlBad').innerHTML = `<span style="color:${bad ? 'var(--bad)' : 'var(--good)'}">${bad}</span>`;
    list.querySelectorAll('.exbtn').forEach(b => b.classList.toggle('on', b.dataset.id === cur));
    const c = J.cases.find(x => x.id === cur), parts = c.token.split('.'), d = dec(c.token), r = verify(c);
    $('jlTitle').textContent = c.title;
    $('jlWhat').innerHTML = '<b>What it is:</b> ' + E(c.what) + (c.attack ? '<br><b>Attack:</b> ' + E(c.attack) : '');
    $('jlParts').innerHTML = '<span class="h">' + E(parts[0]) + '</span>.<span class="p">' + E(parts[1]) + '</span>.<span class="s">' + E(parts[2] || '') + '</span>';
    const now = J.recorded_at, tf = (k, v) => (['iat', 'exp', 'nbf', 'auth_time'].includes(k) ? v + ' (' + (v - now >= 0 ? '+' : '') + (v - now) + ' s)' : JSON.stringify(v));
    $('jlDec').innerHTML = '<tbody>' + Object.entries(d.h).map(([k, v]) => `<tr><td style="color:var(--c2)">header</td><td><code>${E(k)}</code></td><td><code>${E(JSON.stringify(v))}</code></td></tr>`).join('') + Object.entries(d.p).map(([k, v]) => `<tr><td style="color:var(--c4)">payload</td><td><code>${E(k)}</code></td><td><code>${E(tf(k, v))}</code></td></tr>`).join('') + '</tbody>';
    $('jlSteps').innerHTML = '<ol class="steps">' + r.steps.map(s => `<li>${s.skipped ? '<span class="pill">off</span>' : `<span class="pill ${s.ok ? 'ok' : 'no'}">${s.ok ? 'pass' : 'FAIL'}</span>`} ${E(s.name)}<br><span class="small mute">${E(s.detail || '')}</span></li>`).join('') + '</ol>';
    const ok = r.status === 200, should = c.id === 'good';
    $('jlVerdict').innerHTML = `<span class="verdict ${ok === should ? 'ok' : 'no'}">${r.status === 200 ? '200: accepted' : r.status === 403 ? '403: authenticated, not allowed' : '401: rejected'}</span> <span class="small mute">${ok === should ? '(correct outcome)' : ok ? '(this should have been refused)' : ''}</span>`;
    $('jlCve').innerHTML = c.cve ? 'Real-world: <a href="' + E(c.cve.url) + '" target="_blank" rel="noopener noreferrer">' + E(c.cve.id) + '</a>, ' + E(c.cve.what) + '.' : '';
  }
  list.querySelectorAll('.exbtn').forEach(b => b.addEventListener('click', () => { cur = b.dataset.id; render(); }));
  const boxes = [...document.querySelectorAll('#jlTog input[type=checkbox]')];
  boxes.forEach(b => b.addEventListener('change', () => { pol[b.dataset.c] = b.checked; document.querySelectorAll('[data-pre]').forEach(x => x.classList.remove('on')); render(); }));
  $('jlLee').addEventListener('input', e => { pol.lee = +e.target.value; $('jlLeeV').textContent = pol.lee + ' s'; render(); });
  document.querySelectorAll('[data-pre]').forEach(b => b.addEventListener('click', () => {
    Object.assign(pol, PRE[b.dataset.pre]); boxes.forEach(x => x.checked = pol[x.dataset.c]); $('jlLee').value = pol.lee; $('jlLeeV').textContent = pol.lee + ' s';
    document.querySelectorAll('[data-pre]').forEach(x => x.classList.toggle('on', x === b)); render();
  }));
  AU.jwtVerify = verify; AU.jwtPol = pol;
  render();

  // ---- tamper box (HS256 computed in the browser) ----
  const SECRET = 'lab-demo-secret-shown-on-purpose';
  const H0 = { alg: 'HS256', typ: 'JWT' }, P0 = { sub: 'agent:research-bot', aud: 'https://api.llm.test', scope: 'messages:read', iat: 1791200000, exp: 1791203600 };
  const sign = si => AU.b64u(AU.hmac(SECRET, si));
  const h64 = AU.b64u(JSON.stringify(H0)), p64 = AU.b64u(JSON.stringify(P0)), sig0 = sign(h64 + '.' + p64);
  AU.tamperToken = h64 + '.' + p64 + '.' + sig0;
  $('tpSecret').textContent = SECRET;
  $('tpCrack').textContent = J.crack.seconds;
  $('tpRepro').innerHTML = '<span class="mute">checked by src/recompute.py</span>';
  let sig = sig0;
  const ta = $('tpIn');
  function show() {
    let pl;
    try { pl = JSON.parse(ta.value); } catch (e) { $('tpV').innerHTML = '<span class="verdict no">Not valid JSON</span>: ' + E(e.message); return; }
    const pp = AU.b64u(JSON.stringify(pl)), want = sign(h64 + '.' + pp);
    $('tpOut').innerHTML = '<span class="h">' + h64 + '</span>.<span class="p">' + pp + '</span>.<span class="s">' + sig + '</span>';
    $('tpV').innerHTML = want === sig ? '<span class="verdict ok">Signature valid</span>: HMAC-SHA256(secret, header.payload) equals the signature.' : '<span class="verdict no">Signature invalid</span>: the verifier computes <code>' + want.slice(0, 16) + '...</code> but the token carries <code>' + sig.slice(0, 16) + '...</code>.';
  }
  ta.value = JSON.stringify(P0, null, 1);
  ta.addEventListener('input', show);
  $('tpKeep').addEventListener('click', () => { sig = sig0; show(); });
  $('tpResign').addEventListener('click', () => { try { sig = sign(h64 + '.' + AU.b64u(JSON.stringify(JSON.parse(ta.value)))); } catch (e) { } show(); });
  $('tpReset').addEventListener('click', () => { ta.value = JSON.stringify(P0, null, 1); sig = sig0; show(); });
  show();
})();
