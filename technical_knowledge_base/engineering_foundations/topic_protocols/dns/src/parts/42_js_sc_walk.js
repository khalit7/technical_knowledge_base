// ---- Scene: Fig. 2, the resolution walk (stg-walk), replayed from the authoritative servers' own query logs (window.DNSD.walk, 5 October 2026):
// cold with QNAME minimisation (Unbound's default), cold without it, and warm. One step per exchange: the question rides down to the server in the
// first half of the step, the referral or answer rides back in the second. Under each server: every name it was asked so far, which is what
// QNAME minimisation changes. Same parties and layout as Fig. 1. ----
(function () {
  if (!document.getElementById('stg-walk') || !window.S3 || !window.DNK || !window.DNSD) return;
  const { cl } = S3, { up, party, entry, msg, exchange } = DNK, W = DNSD.walk;
  const POD = [-4.0, 0, 1.2], RES = [-1.5, 0, .3], SV = [[.9, 0, -1.7, 1.5, 'root  .'], [2.45, 0, -.5, 1.05, 'test.'], [4.0, 0, .7, .6, 'llm.test.']];
  const SI = { root: 0, 'test.': 1, 'llm.test.': 2 }, RS = [1.5, .7, 1.2], ry = RS[1];
  const pa = [POD[0] + .45, .7, POD[2] - .2], ra = [RES[0] - .5, .75, RES[2] + .2], rt = [RES[0] + .55, .8, RES[2] - .3];
  const sTop = i => [SV[i][0] - .2, SV[i][3] + .05, SV[i][2] + .2];
  // the steps of each mode, from the recording
  function steps(m) {
    const S = [{ q: 1 }];
    if (m === 'warm') { S.push({ hit: 1 }, { back: 1, warm: 1 }); return S; }
    const r = W.runs[m === 'qmin' ? 0 : 1];
    r.up.forEach(u => S.push({ u, i: SI[u.server] }));
    S.push({ back: 1, r }); return S;
  }
  const M = { qmin: steps('qmin'), full: steps('full'), warm: steps('warm') };
  let mode = 'qmin';
  function draw(R, k, e) {
    const P = R.P, Q = P.c2, A = P.c3, S = M[mode], s = S[k] || S[0];
    R.grid(-5.0, 5.0, -2.8, 2.6, .5);
    const busy = s.u ? s.i : -1;
    party(R, POD, [1.3, .65, 1.0], P.c5, 'your process', { sub: 'the stub', a: s.u ? .4 : 1 });
    party(R, RES, RS, P.acc, 'recursive resolver', {});
    // what each server has been asked so far (priming excluded): the names it learned
    const seen = [[], [], []];
    S.slice(0, k + 1).forEach((x, j) => { if (x.u && !(x.u.type === 'NS' && x.u.name === '.') && (j < k || e > .3)) seen[x.i].push(x.u.type + ' ' + x.u.name); });
    SV.forEach((sv, i) => { const on = mode === 'warm' ? .3 : busy === i ? 1 : .55;
      party(R, [sv[0], 0, sv[2]], [1.2, sv[3], 1.0], P.c4, sv[4], { a: on });
      if (mode !== 'warm') R.label([sv[0], 0, sv[2] + .5], seen[i].length ? 'saw: ' + seen[i].join(', ') : 'saw: nothing yet', { fs: 12, mono: true, b: busy === i, c: busy === i ? Q : P.mute, dy: 16, a: Math.max(.6, on) }); });
    // the cache on the resolver
    const warmTTL = W.runs[0].warm_ttl;
    if (mode === 'warm') entry(R, [RES[0], 0, RES[2]], ry, 1.3, warmTTL / 60, A, 'api.llm.test A · ' + warmTTL + ' s left', { b: 1, lc: A });
    else if (s.back) entry(R, [RES[0], 0, RES[2]], ry, 1.3, 1, A, 'api.llm.test A · 60 s', { a: e, b: 1, lc: A });
    else R.label(up(RES, ry), 'cache: empty', { fs: 12, c: P.mute, dy: 14, mono: true });
    if (s.q) { R.flowArc(pa, ra, .55, { c: Q, r: .07, n: 9, speed: 1.4 });
      msg(R, (p => [p[0], Math.max(0, p[1] - .25), p[2]])(R.arcPt(pa, ra, .55, e)), Q, 1, 'A? api.llm.test · RD', {}); }
    if (s.hit) { R.glow(up(RES, ry + .2), .8, { c: A, a: .7 * e }); R.label(up(RES, ry), 'cache hit: ' + W.runs[0].warm_up + ' queries upstream', { fs: 12.5, b: 1, c: A, dy: 34, a: e }); }
    if (s.u) { const u = s.u, i = s.i, aa = u.flags.indexOf('aa') >= 0, prime = u.type === 'NS' && u.name === '.';
      const rep = prime ? 'root server list · AA · ' + u.size + ' B' : aa ? 'A 10.53.0.80 · AA · ' + u.size + ' B' : 'referral · ' + u.size + ' B';
      exchange(R, rt, sTop(i), .5 + .2 * i, e, Q, aa ? A : P.c4, u.type + '? ' + u.name, rep, {});
      if (e >= 1) R.label(up([SV[i][0], 0, SV[i][2]], SV[i][3]), rep, { fs: 12, b: 1, mono: true, c: aa ? A : P.c4, dy: -26 }); }
    if (s.back) { R.flowArc(ra, pa, .55, { c: A, r: .07, n: 9, speed: 1.4 });
      msg(R, (p => [p[0], Math.max(0, p[1] - .25), p[2]])(R.arcPt(ra, pa, .55, e)), A, 1, 'A 10.53.0.80 · TTL ' + (s.warm ? warmTTL : 60), {});
      R.label(up(POD, .65), (s.warm ? W.runs[0].warm_ms + ' ms, warm' : s.r.cold_ms + ' ms, cold, ' + s.r.up.length + ' upstream queries'), { fs: 13, b: 1, c: A, dy: 26, a: e }); }
  }
  // the camera follows the exchange: in close on the resolver and the server being asked
  function view(k) { const s = M[mode][k]; if (!s) return null;
    if (s.q || s.back || s.hit) return null;
    return { cam: [.2, .68], bounds: [[RES[0] - 1.2, 0, -2.2], [4.7, 1.6, 1.8]] }; }
  const st = S3.stage({ id: 'stg-walk', list: 'sx-walk-qmin', fig: 'Fig. 2 · the walk, from the servers\' own logs', cam: [.18, .7], bounds: [[-4.7, 0, -2.2], [4.6, 1.6, 1.8]], aspect: .62, dur: 2000, hold: 4400, draw, view,
    margin: w => w < 520 ? [16, 8, 16, 8] : [22, 18, 22, 18] });
  const C = document.getElementById('wk-mode');
  if (C && st) C.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; C.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    mode = b.dataset.m; document.querySelectorAll('ol[id^="sx-walk-"]').forEach(l => l.hidden = l.id !== 'sx-walk-' + mode); st.list('sx-walk-' + mode); });
  window.DNS_WALK_STEPS = M; // read by src/check_stages.mjs
})();
