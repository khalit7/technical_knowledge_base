// ---- Fig. 2, the resolution walk (sq-walk) as a 2D sequence (28_js_seq.js), replayed from the authoritative servers' own query logs
// (window.DNSD.walk, 5 October 2026): cold with QNAME minimisation (Unbound's default), cold without it, and warm. A 3D stage until 2026-11-19,
// redrawn flat because its depth carried nothing: five parties and the messages between them read faster as columns with time down the card.
// Parties: your process (the stub), the recursive resolver with its cache, the root, test. and llm.test. servers. One step per exchange: the
// question the server was asked (exactly the name in its log, which is what QNAME minimisation changes) and the referral or answer back with its
// size and AA flag; the cache entry and the measured times (dig) as notes. window.DNS_WALK_STEPS is read by src/check_stages.mjs. ----
(function () {
  if (!document.getElementById('sq-walk') || !window.SQ || !window.DNSD) return;
  const W = DNSD.walk, Q = 'var(--c2)', A = 'var(--c3)', SV = 'var(--c4)', MU = 'var(--mute)';
  const ST = 0, RS = 1, SI = { root: 2, 'test.': 3, 'llm.test.': 4 }, warmTTL = W.runs[0].warm_ttl;
  const nm = n => n === '.' ? '.' : n.replace(/\.$/, '') + '.';
  function steps(m) {
    const S = [[{ f: ST, t: RS, l: 'A? api.llm.test · RD', c: Q }, { at: RS, l: m === 'warm' ? 'cache: api.llm.test A' : 'cache: empty', c: m === 'warm' ? A : MU }]];
    if (m === 'warm') {
      S.push([{ at: RS, l: 'cache hit: ' + W.runs[0].warm_up + ' queries upstream', c: A }, { at: [2, 4], l: 'nothing reaches the servers', c: MU }]);
      S.push([{ at: RS, l: 'api.llm.test A · ' + warmTTL + ' s left', c: A }, { f: RS, t: ST, l: 'A 10.53.0.80 · TTL ' + warmTTL, c: A },
        { at: ST, l: W.runs[0].warm_ms + ' ms, warm', c: A }]);
      return S;
    }
    const r = W.runs[m === 'qmin' ? 0 : 1];
    r.up.forEach(u => {
      const i = SI[u.server], aa = u.flags.indexOf('aa') >= 0, prime = u.type === 'NS' && u.name === '.';
      const rep = prime ? 'root server list · AA · ' + u.size + ' B' : aa ? 'A 10.53.0.80 · AA · ' + u.size + ' B' : 'referral · ' + u.size + ' B';
      S.push([{ f: RS, t: i, l: u.type + '? ' + nm(u.name), c: Q }, { f: i, t: RS, l: rep, c: aa && !prime ? A : SV }]);
    });
    S.push([{ at: RS, l: 'cached: api.llm.test A · 60 s', c: A }, { f: RS, t: ST, l: 'A 10.53.0.80 · TTL 60', c: A },
      { at: ST, l: r.cold_ms + ' ms, cold, ' + r.up.length + ' upstream queries', c: A }]);
    return S;
  }
  const M = { qmin: steps('qmin'), full: steps('full'), warm: steps('warm') };
  const sq = SQ({ id: 'sq-walk', list: 'sx-walk-qmin', fig: 'Fig. 2 · the walk, from the servers\' own logs', ms: 4400,
    lanes: [{ n: 'your process (stub)', s: 'stub', c: 'var(--c5)' }, { n: 'recursive resolver', s: 'resolver', c: 'var(--acc)' },
      { n: 'root server', s: 'root', c: SV, k: 1 }, { n: 'test. server', s: 'test.', c: SV, k: 1 }, { n: 'llm.test. server', s: 'llm.test.', c: SV, k: 1 }],
    steps: M.qmin });
  const C = document.getElementById('wk-mode');
  if (C && sq) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const m = b.dataset.m; document.querySelectorAll('ol[id^="sx-walk-"]').forEach(l => l.hidden = l.id !== 'sx-walk-' + m); sq.mode(M[m], 'sx-walk-' + m); });
  window.DNS_WALK_STEPS = M; // read by src/check_stages.mjs
})();
