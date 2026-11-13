// ---- Scene: Fig. 4, one confirm-then-delete call through a round-robin balancer, four ways (stg-rep, section 5). Data: window.MCPD.rep, the
// recording of src/lab/replicas.py on 5 October 2026 (two ckpt_server.py replicas, SDK 2.3.0, lb_proxy.py in front, a scripted "yes"): each step
// replays one recorded HTTP exchange of the first of 20 runs of that setup; the last step shows all 20 runs. What each replica holds in memory
// (a legacy session; the key that seals requestState) stands beside it. The recorded bytes of the current step fill a closed block below the list. ----
(function () {
  if (!document.getElementById('stg-rep') || !window.S3 || !window.MCK || !window.MCPD) return;
  const { mix } = S3, { up, party, plate, msg, refuse, path, win } = MCK, D = MCPD.rep, E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let mode = 0;
  const rpc = t => { const m = (t.rb || '').match(/"method":"([^"]+)"/), res = /^\{"jsonrpc":"2\.0","id":\d+,"result"/.test(t.rb || ''); return t.m !== 'POST' ? t.m : m ? m[1] : res ? 'answer to the server' : 'POST'; };
  const reply = t => { const sb = t.sb || '';
    if (t.st === 404 && sb.indexOf('Session not found') >= 0) return '404 Session not found';
    if (sb.indexOf('requestState') >= 0 && sb.indexOf('"error"') >= 0) return t.st + ' · -32602 Invalid or expired requestState';
    if (sb.indexOf('inputRequests') >= 0) return t.st + ' · input_required + sealed requestState';
    if (sb.indexOf('elicitation/create') >= 0) return t.st + ' · elicitation/create on the open stream';
    if (sb.indexOf('deleted ') >= 0) return t.st + ' · deleted';
    if (rpc(t) === 'initialize') return t.st + ' · Mcp-Session-Id set';
    return String(t.st) + (t.st === 202 ? ' Accepted' : ''); };
  window.MCP_REP = { rpc, reply };   // read by src/check_stages.mjs
  const CL = [-4.3, 0, 0], LB = [-1.3, 0, 0], RA = [2.1, 0, -1.3], RB = [2.1, 0, 1.3], RP = { A: RA, B: RB };
  function sessions(r, upto) { const s = { A: null, B: null }; for (let i = 0; i < upto; i++) { const t = r.trace[i], sid = (t.sh || {})['mcp-session-id'];
    if (sid && rpc(t) === 'initialize') s[t.rep] = sid; if (t.m === 'DELETE' && t.st < 300) s[t.rep] = null; } return s; }
  function draw(R, k, e) {
    const P = R.P, A = P.acc, r = D[mode], n = r.trace.length, last = k >= n, t = r.trace[Math.min(k, n - 1)];
    R.grid(-5.4, 5.4, -3.2, 3.4, .5);
    party(R, CL, [1.3, .8, 1.0], A, 'client', { sub: r.era === 'legacy' ? '2025-11-25 session' : '2026-07-28', a: last ? .5 : 1 });
    party(R, LB, [1.1, .55, 1.6], P.c5, 'balancer', { sub: r.lb === 'rr' ? 'round robin' : 'session affinity', a: last ? .5 : 1 });
    ['A', 'B'].forEach(x => { const hit = !last && t.rep === x; party(R, RP[x], [1.4, .8, 1.1], P.c6, 'replica ' + x, { a: last ? .5 : hit ? 1 : .35 }); });
    // memory beside each replica: a legacy session (purple plate), or the key that seals requestState (one colour per key)
    const sess = sessions(r, last ? n : k + (e > .55 ? 1 : 0));
    ['A', 'B'].forEach(x => { const p = [RP[x][0] + 1.35, 0, RP[x][2] + .1];
      if (r.era === 'legacy') { if (sess[x]) plate(R, p, P.c4, 1, 'session ' + sess[x].slice(0, 8) + '…', { w: .5, h: .6, mono: true, al: 'left', dx: 20 });
        else R.label(up(p, .2), 'no session', { fs: 12, c: P.mute, al: 'left', dx: -6, wide: 1 }); }
      else { const c = r.key ? P.c3 : x === 'A' ? P.c2 : P.c5; R.box(p, [.42, .42, .42], { fill: mix(P.paper, c, .6) }); R.label([p[0] + .21, .2, p[2]], r.key ? 'shared key' : 'own key ' + x, { fs: 12, b: 1, c, al: 'left', dx: 8 }); } });
    if (!last) {   // this exchange: the request to the balancer and on to one replica, then the reply back
      const rp = RP[t.rep], p1 = [[CL[0] + .65, .55, 0], [LB[0], .7, 0], [rp[0] - .7, .55, rp[2]]], ok = t.st < 300, u = win(e, 0, .5), v = win(e, .55, 1);
      R.flow(p1, { c: A, r: .065, n: 12, speed: 1.5, a: u < 1 ? 1 : .3 });
      const hs = t.rh || {}, sid = hs['mcp-session-id'], lab = rpc(t) + (sid ? ' · session ' + sid.slice(0, 8) + '…' : '') + (t.rb && t.rb.indexOf('requestState') >= 0 && rpc(t) === 'tools/call' ? ' · requestState' : '');
      if (u < 1) msg(R, path(p1, u), 300, A, 1, { lab, mono: true, dy: -14 });
      if (v > 0) { const back = p1.slice().reverse(), c = ok ? P.good : P.bad; R.flow(back, { c, r: .07, n: 12, speed: 1.5 });
        msg(R, path(back, v * .9), 300, c, 1, { t: .7 });
        R.label(up(rp, .8), reply(t), { fs: 12.5, b: 1, mono: true, c, dy: -32 });
        if (!ok) refuse(R, up(rp, 1.0), v); else R.glow(up(rp, .8), .6, { c: P.good, a: .5 * v }); }
    } else {   // all 20 runs of this setup, one block each
      for (let i = 0; i < r.n; i++) { const okr = i < r.ok; R.box([-3.8 + i * .38, 0, 2.4], [.3, okr ? .5 : .16, .3], { fill: mix(P.paper, okr ? P.good : P.bad, .65), a: win(e, i / r.n * .8, i / r.n * .8 + .2) }); }
      R.label([0, .5, 2.4], r.ok + ' of ' + r.n + ' runs succeeded · median ' + r.ms + ' ms per run', { fs: 13.5, b: 1, c: r.ok === r.n ? P.good : P.bad, dy: -22, a: win(e, .6, 1) });
    }
  }
  function bytes(k) { const el = document.getElementById('rp-msg'); if (!el) return; const r = D[mode], t = r.trace[k];
    if (!t) { el.innerHTML = '<p class="small mute">Summary step: no single exchange.</p>'; return; }
    const hd = Object.entries(t.rh || {}).filter(([a]) => a.startsWith('mcp')).map(([a, v]) => a + ': ' + v).join('\n');
    el.innerHTML = '<div class="msg"><div class="h">' + t.m + ' to replica ' + t.rep + ' (request)</div><pre>' + E((hd ? hd + '\n\n' : '') + (t.rb || '(no body)')) + '</pre></div><div class="msg"><div class="h">reply ' + t.st + '</div><pre>' + E(t.sb || '(no body)') + '</pre></div>'; }
  const full = { cam: [.14, .7], bounds: [[-5.0, 0, -2.0], [4.4, 1.3, 2.8]] };
  const st = S3.stage({ id: 'stg-rep', list: 'sx-rep-0', fig: 'Fig. 4 · one confirm-then-delete call through a round-robin balancer', cam: full.cam, bounds: full.bounds, aspect: .58, dur: 2000, hold: 4400, draw,
    view: k => innerWidth < 520 && D[mode].trace[k] ? { cam: [.5, 1.0] } : null,   // on a phone: turned and steeper, so the row runs into depth and the parts are larger
    margin: w => w < 520 ? [22, 8, 16, 8] : [28, 16, 22, 16], onStep: k => { try { bytes(k) } catch (x) { } } });
  const C = document.getElementById('rep-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = +b.dataset.m; document.querySelectorAll('ol[id^="sx-rep-"]').forEach(l => l.hidden = l.id !== 'sx-rep-' + mode); st.list('sx-rep-' + mode); });
})();
