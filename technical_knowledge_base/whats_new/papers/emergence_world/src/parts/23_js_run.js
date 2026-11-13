// ---- Replay the released logs: two worlds side by side through a stress event, plus the recount table
(function () {
  const EXPOSED = ['gemini', 'claude', 'deepseek', 'mistral', 'mixed', 'openai', 'qwen'];
  const st = LG.w.claude.stim;
  // the stretch ends in hours since wave 1 (phishing) or since the notice (breach); what each stretch shows is the step list on the left (04_run.html)
  const PH = [0.25, 1, 6, st.w2 - st.w1, st.w3 - st.w1, 99.15, st.memo - st.w1, 192.55, 288];
  const BR = [0.05, 0.1, 1, 6, 24, 72];
  const steps = {phish: PH.map(t => ({t})), breach: BR.map(t => ({t}))};
  const TT = {phish: PH, breach: BR};
  const TMAX = {phish: 288, breach: 72};
  const selA = $('rpxA'), selB = $('rpxB');
  EXPOSED.forEach(k => { selA.add(new Option(WN[k], k)); selB.add(new Option(WN[k], k)); });
  selA.value = 'gemini'; selB.value = 'claude';
  let cur = {m: 'phish', now: 0};
  const legend2 = m => { $('rpxLeg').innerHTML = ETY[m].map(([k, n, c]) => '<span><i style="background:' + c + '"></i>' + n + '</span>').join('') + (m === 'phish' ? '<span><i style="background:var(--acc);border-radius:0;width:3px"></i>first warning</span>' : ''); };
  const fsel = $('rpxF');
  function fillF(m) { fsel.innerHTML = '<option value="all">every type</option>' + ETY[m].map(([k, n]) => '<option value="' + k + '">' + n + '</option>').join(''); }
  function list() {
    const W = LG.w[selA.value], ev = (W.ev[cur.m] || []).filter(e => e[0] <= cur.now && (fsel.value === 'all' || e[2] === fsel.value));
    $('rpxLT').textContent = 'What ' + WN[selA.value] + '\'s agents did, latest first (' + ev.length + ' events so far)';
    const rows = ev.slice(-80).reverse().map(e => '<div><span class="tm">+' + fmtH(e[0]) + '</span><b>' + LG.agents[e[1]] + '</b> <span style="color:' + ECOL[e[2]] + '">' + ENAME[e[2]] + '</span> <span class="mute">via ' + LG.tools[e[3]] + '</span>' + (e[4] ? ': "' + esc(e[4]) + '"' : '') + '</div>');
    $('rpxList').innerHTML = rows.length ? rows.join('') : '<div class="mute">Nothing yet at this point.</div>';
  }
  const anim = makeAnim({id: 'rpx', mode: 'phish', modes: steps, lists: {phish: 'sx-rpx-phish', breach: 'sx-rpx-breach'}, dur: 4600,
    draw: (m, k, e, w) => {
      if (m !== cur.m) { legend2(m); fillF(m); }
      const T = TMAX[m], t0 = k ? TT[m][k - 1] : 0, now = t0 + (TT[m][k] - t0) * e;
      cur = {m, now};
      const marks = m === 'phish' ? [[0, 'W1'], [st.w2 - st.w1, 'W2'], [st.w3 - st.w1, 'W3'], [st.memo - st.w1, 'memo']] : [[0, 'notice']];
      const a = drawLanes(selA.value, {x0: 0, y0: 0, w, now, T, title: 'A: ' + WN[selA.value], ev: m, warnLine: m === 'phish', marks});
      const b = drawLanes(selB.value, {x0: 0, y0: a.h + 8, w, now, T, title: 'B: ' + WN[selB.value], ev: m, warnLine: m === 'phish', marks});
      let s = a.s + b.s + timeAxis(b.X, b.top + 10 * b.lh + 4, T, w < 520);
      marks.forEach(([t, l]) => { if (t > 0) s += tx(a.X(t) + 2, a.top - 4, l, {fs: 11, c: 'var(--mute)'}); });
      s += tx(w - 4, a.h + b.h + 34, (m === 'phish' ? 'hours since wave 1' : 'hours since the breach notice') + ', square-root scale', {fs: 11, a: 'end', c: 'var(--mute)'});
      setTimeout(list, 0);
      return svgW(w, a.h + b.h + 40, s, 'Replay of ' + (m === 'phish' ? 'the phishing campaign' : 'the memory breach'));
    },
    counters: (m, k, e) => {
      const one = (wk, tag) => {
        const ev = LG.w[wk].ev[m] || [], now = cur.now, n = ty => ev.filter(x => x[2] === ty && x[0] <= now).length;
        if (m === 'breach') return stat(tag + ': searched others', n('scan_other'), WN[wk] + ', ' + new Set(ev.filter(x => x[2] === 'scan_other' && x[0] <= now).map(x => x[1])).size + ' agents; self ' + n('scan_self'));
        const fw = ev.find(x => x[2] === 'warn');
        const after = fw && fw[0] <= now ? ev.filter(x => x[0] > fw[0] && x[0] <= now && /fetch|op|act|pass|^store$/.test(x[2])).length : 0;
        return stat(tag + ': warnings', n('warn'), WN[wk] + (fw && fw[0] <= now ? ', first after ' + fmtH(fw[0]) : '')) + stat(tag + ': engaged after warning', after, 'fetch, database, act, pass on, save unlabelled');
      };
      return one(selA.value, 'A') + one(selB.value, 'B');
    }
  });
  legend2('phish'); fillF('phish');
  [selA, selB].forEach(sel => sel.addEventListener('change', () => anim && anim.draw()));
  fsel.addEventListener('change', list);
})();

// ---- Recount table (checks against the records)
(function () {
  const C = PAPER.rc.checks;
  const i0 = C.findIndex(c => /in the records$/.test(c[0]));
  const rows = C.slice(i0).filter(c => c[4] !== 'derived');
  const cls = v => v === 'reproduces' ? 'reproduces' : v === 'close' ? 'close' : v === 'does not' ? 'does' : v === 'paper disagrees' ? 'paper' : 'derived';
  const lab = v => v === 'does not' ? 'does not reproduce' : v;
  function draw(m) {
    const r = rows.filter(c => m === 'all' || (m === 'does' ? c[4] === 'does not' : (c[4] === 'reproduces' || c[4] === 'close')));
    $('rcTab').innerHTML = '<tr><th>Claim</th><th>Paper</th><th>Released records</th><th>Verdict</th></tr>' + r.map(c => '<tr><td>' + esc(c[0]) + (c[1] ? ' <a class="small" href="' + PAPER.meta.ax + '#' + c[1] + '" target="_blank" rel="noopener noreferrer">(in the paper)</a>' : '') + (c[5] ? '<div class="small mute">' + esc(c[5]) + '</div>' : '') + '</td><td data-l="Paper">' + esc(c[2]) + '</td><td data-l="Records">' + esc(c[3]) + '</td><td><span class="vd ' + cls(c[4]) + '">' + lab(c[4]) + '</span></td></tr>').join('');
    const n = v => rows.filter(c => c[4] === v).length;
    $('rcCnt').textContent = rows.length + ' comparisons with the records: ' + n('reproduces') + ' reproduce, ' + n('close') + ' close, ' + n('does not') + ' do not.';
  }
  segBind('rcM', draw); draw('all');
})();
