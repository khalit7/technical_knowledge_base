// ---- Wrap a world yourself: the side-by-side episode animation, K-rollout validation and the scripted loop ----
(function () {
  const SHORT = { 'countertop 1': 'countertop', 'sinkbasin 1': 'sinkbasin', 'drawer 1': 'drawer 1', 'drawer 2': 'drawer 2', 'shelf 1': 'shelf', 'microwave 1': 'microwave', 'desk 1': 'desk' };
  const cfg = { stage: 'hide', hooks: ['noteleport'], chain: false, order: 'release' };
  let seed = 3, slip = 0, B = null, W = null, steps = [], anim = null;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const LNAME = { env: 'House (base env) + original verifier', setup: 'Stage (Setup)', rules: 'Contract (Rules)', link: 'Chain (Link)' };

  function collapse(ss) { // merge identical consecutive steps (the policy idling after it gave up)
    const out = [];
    ss.forEach(s => { const L = out[out.length - 1]; if (L && L.a === s.a && L.obs === s.obs && s.a === 'look') { L.n++; L.st = s.st; L.term = s.term; L.trunc = s.trunc } else out.push(Object.assign({ n: 1 }, s)) });
    return out;
  }
  function layersHit(log) {
    const h = {};
    (log || []).forEach(l => {
      if (l.layer === 'Stage') h.setup = (h.setup ? h.setup + '; ' : '') + l.what;
      else if (/^Contract/.test(l.layer)) h.rules = (h.rules ? h.rules + '; ' : '') + l.layer.replace('Contract ', '') + ' ' + l.what.replace(/: .*/, '');
      else if (l.layer === 'Chain') h.link = (h.link ? h.link + '; ' : '') + l.what;
    });
    return h;
  }
  function count(ss) { let b = 0, n = 0; ss.forEach(s => { if (/^\[blocked\]/.test(s.obs)) b += s.n || 1; if (/^Nothing happens/.test(s.obs)) n += s.n || 1 }); return { b, n } }
  function compute() {
    B = EH.run({ stage: 'none', hooks: [] }, seed, { slip });
    W = EH.run(cfg, seed, { slip });
    B.cs = collapse(B.steps); W.cs = collapse(W.steps);
    const L = Math.max(B.cs.length, W.cs.length);
    steps = [{ t: 'reset()', c: cap(0) }];
    for (let k = 1; k <= L; k++) steps.push({ t: stepTitle(k), c: cap(k) });
    const names = W.layers.slice().reverse().map(l => l.name);
    $('ewStack').innerHTML = 'Wrapped stack, outermost first: ' + names.join(' &gt; ') + '. ' + (cfg.order === 'swapped' && cfg.stage !== 'none' && cfg.hooks.length ? '<b>Swapped order:</b> the Stage sits outside the Contract, so its replay goes through the Contract.' : '');
  }
  function stepTitle(k) {
    const a = B.cs[k - 1], b = W.cs[k - 1];
    return 'static: ' + (a ? esc(a.a) + (a.n > 1 ? ' (×' + a.n + ')' : '') : 'episode over') + ' · wrapped: ' + (b ? esc(b.a) + (b.n > 1 ? ' (×' + b.n + ')' : '') : 'episode over');
  }
  function obsHTML(hd, act, obs, extra) {
    let o = esc(obs || '');
    o = o.replace(/^\[blocked\]([^\n]*)/, '<span class="blk">[blocked]$1</span>').replace(/^\[switched to new task\]/, '<span class="blk">[switched to new task]</span>');
    return '<div class="obs"><span class="hd">' + hd + '</span>' + (act ? '<span class="act">&gt; ' + esc(act) + '</span>\n' : '') + o + (extra ? '\n<span class="hd">' + extra + '</span>' : '') + '</div>';
  }
  function cap(k) {
    if (k === 0) {
      let ex = '';
      if (W.reset.replay) ex = 'Stage replayed: ' + W.reset.replay.map(r => esc(r.a) + ' → ' + esc(r.obs.replace(/\nYour task.*/, ''))).join('; ');
      return '<div class="obsrow">' + obsHTML('Static: first observation', '', B.reset.obs) + obsHTML('Wrapped: first observation', '', W.reset.obs, ex) + '</div>';
    }
    const a = B.cs[k - 1], b = W.cs[k - 1], h = b ? layersHit(b.log) : {};
    const ex = b ? Object.keys(h).map(x => LNAME[x].split(' (')[0] + ': ' + esc(h[x])).join(' · ') : '';
    const lab = (R, x) => { const e = used(R, k), b0 = e - x.n + 1; return x.n > 1 ? 'steps ' + b0 + ' to ' + e + ' (the same action ' + x.n + ' times)' : 'step ' + e };
    return '<div class="obsrow">' + (a ? obsHTML('Static, ' + lab(B, a), a.a, a.obs) : obsHTML('Static', '', 'Episode over: original verifier says ' + (B.verdict.success ? 'success' : 'fail') + '.')) +
      (b ? obsHTML('Wrapped, ' + lab(W, b), b.a, b.obs, ex) : obsHTML('Wrapped', '', 'Episode over: ' + verdictText(W) + '.')) + '</div>';
  }
  function verdictText(R) { const v = R.verdict; return v.a !== undefined ? 'task A ' + (v.a ? 'passed' : 'failed') + ', task B ' + (v.b ? 'passed' : 'failed') + ', so the chain ' + (v.success ? 'succeeds' : 'fails') : 'original verifier says ' + (v.success ? 'success' : 'fail') }
  function stAt(R, k) { if (k === 0) return R.reset.st; const s = R.cs[Math.min(k, R.cs.length) - 1]; return s.st }
  function used(R, k) { let n = 0; R.cs.slice(0, k).forEach(s => n += s.n); return n }

  function panel(R, k, e, x0, y0, pw, wrapped) {
    let s = '';
    const st = stAt(R, k), prev = stAt(R, Math.max(0, k - 1)), done = k > R.cs.length;
    s += tx(x0, y0 + 14, wrapped ? 'Wrapped environment' : 'Static environment', { fs: 13, w: 600 });
    s += tx(x0 + pw, y0 + 14, (st.task === 'potato' ? 'task B: heat a potato' : 'task: a clean mug on the desk'), { fs: 11, a: 'end', c: 'var(--mute)' });
    const cols = 4, gap = 6, bw = (pw - gap * (cols - 1)) / cols, bh = 46, gy = y0 + 24;
    const pos = {}; EH.ORDER.forEach((p, i) => { pos[p] = { x: x0 + (i % cols) * (bw + gap), y: gy + Math.floor(i / cols) * (bh + gap) } });
    EH.ORDER.forEach(p => {
      const P = pos[p], here = st.at === p;
      s += rc(P.x, P.y, bw, bh, here ? 'var(--acc2)' : 'var(--soft)', { s: here ? 'var(--acc)' : 'var(--line)', sw: here ? 2 : 1 });
      s += tx(P.x + 6, P.y + 15, SHORT[p], { fs: 11, w: 600 });
      let line = '';
      if (EH.CONTAINERS[p]) line = st.open[p] ? 'open' : 'closed';
      const items = [];
      if (st.mug === p) items.push('mug' + (st.mugClean ? ' (clean)' : ''));
      if (st.potato === p) items.push('potato' + (st.potatoHot ? ' (hot)' : ''));
      s += tx(P.x + 6, P.y + 29, line, { fs: 11, c: 'var(--mute)' });
      if (items.length) s += tx(P.x + 6, P.y + 42, items.join(', '), { fs: 11, c: 'var(--c2)', w: 600 });
    });
    // the agent: a dot moving from its previous place to the current one
    const ctr = p => p ? { x: pos[p].x + bw - 10, y: pos[p].y + 10 } : { x: x0 + 3 * (bw + gap) + bw - 10, y: gy + bh + gap + 10 };
    const a0 = ctr(prev.at), a1 = ctr(st.at), ee = done ? 1 : e;
    s += '<circle cx="' + (a0.x + (a1.x - a0.x) * ee).toFixed(1) + '" cy="' + (a0.y + (a1.y - a0.y) * ee).toFixed(1) + '" r="5.5" fill="var(--acc)"/>';
    const rowEnd = gy + 2 * (bh + gap);
    s += tx(x0 + 3 * (bw + gap) + 6, rowEnd - gap - bh + 15, st.at ? '' : 'agent in the', { fs: 11, c: 'var(--mute)' }) + tx(x0 + 3 * (bw + gap) + 6, rowEnd - gap - bh + 29, st.at ? '' : 'middle of the room', { fs: 11, c: 'var(--mute)' });
    s += tx(x0, rowEnd + 12, 'holding: ' + (st.holding ? st.holding.replace(' 1', '') : 'nothing') + ' · steps used: ' + used(R, Math.min(k, R.cs.length)), { fs: 11 });
    // the stack
    let y = rowEnd + 22;
    const L = wrapped ? R.layers.slice().reverse() : [R.layers[0]];
    const h = k === 0 ? layersHit(R.reset.log) : (R.cs[k - 1] ? layersHit(R.cs[k - 1].log) : {});
    L.forEach(l => {
      const hit = h[l.kind], on = !!hit;
      s += rc(x0, y, pw, 20, on ? 'var(--hl)' : 'var(--bg)', { s: on ? 'var(--c2)' : 'var(--line)', r: 3 });
      if (on) s += rc(x0, y, pw, 20, 'var(--hl)', { r: 3, op: ee });
      const txt = LNAME[l.kind] + (on ? ': ' + hit : '');
      s += tx(x0 + 6, y + 14, txt.length * 6.1 > pw - 10 ? txt.slice(0, Math.floor((pw - 16) / 6.1)) + '…' : txt, { fs: 11 });
      y += 24;
    });
    if (done || (k === R.cs.length && R.cs.length)) {
      const v = R.verdict, ok = v.success;
      s += tx(x0, y + 12, done || k === R.cs.length ? (ok ? 'Verdict: success' : 'Verdict: fail') + (v.a !== undefined ? ' (A ' + (v.a ? 'pass' : 'fail') + ', B ' + (v.b ? 'pass' : 'fail') + ')' : '') : '', { fs: 12, w: 600, c: ok ? 'var(--good)' : 'var(--bad)' });
    }
    return { s, h: y + 18 - y0 };
  }
  function draw(m, k, e, w) {
    const side = w >= 640, pw = side ? (w - 18) / 2 : w - 2;
    const p1 = panel(B, k, e, 1, 2, pw, false), p2 = panel(W, k, e, side ? pw + 17 : 1, side ? 2 : p1.h + 14, pw, true);
    const H = side ? Math.max(p1.h, p2.h) + 6 : p1.h + p2.h + 22;
    return svgW(w, H, p1.s + p2.s, 'Static and wrapped episodes side by side');
  }
  function counters(m, k) {
    const cb = count(B.cs.slice(0, k)), cw = count(W.cs.slice(0, k));
    return stat('Steps (static, wrapped)', used(B, Math.min(k, B.cs.length)) + ', ' + used(W, Math.min(k, W.cs.length)), 'actions the policy has taken') +
      stat('Blocked by the Contract', String(cw.b), 'wrapped only; the world is untouched') +
      stat('"Nothing happens" (static, wrapped)', cb.n + ', ' + cw.n, 'actions that did nothing') +
      stat('Verdicts', (k > B.cs.length - 1 ? (B.verdict.success ? 'pass' : 'fail') : '…') + ', ' + (k > W.cs.length - 1 ? (W.verdict.success ? 'pass' : 'fail') : '…'), 'original verifiers, at the end');
  }
  function rebuild() {
    compute();
    if (!anim) { const o = { id: 'ew', modes: { x: steps }, mode: 'x', draw, counters, dur: 1400 }; anim = makeAnim(o); anim.o = o }
    else { anim.o.modes.x = steps; anim.st.k = 0; anim.st.t = RM ? 1 : 0; anim.st.lk = -1; anim.draw() }
  }
  // controls
  segBind('ewStage', m => { cfg.stage = m; press('ewStage', m); rebuild() });
  segBind('ewOrder', m => { cfg.order = m; press('ewOrder', m); rebuild() });
  function press(id, m) { $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false')) }
  [['ewHtrunc', 'trunc'], ['ewHclean', 'cleanhold'], ['ewHtele', 'noteleport']].forEach(([id, k]) => $(id).addEventListener('change', e => { cfg.hooks = cfg.hooks.filter(x => x !== k); if (e.target.checked) cfg.hooks.push(k); rebuild() }));
  $('ewChain').addEventListener('change', e => { cfg.chain = e.target.checked; rebuild() });
  $('ewSeed').addEventListener('change', e => { seed = +e.target.value; rebuild() });
  $('ewSlip').addEventListener('change', e => { slip = +e.target.value; rebuild() });

  // ---- validation ----
  let seedCtr = 1000;
  const sr = R => R.filter(x => x.ok).length / R.length;
  function decide(R) {
    const p = sr(R), to = R.filter(x => x.timeout).length;
    if (p >= 0.4 - 1e-9 && p <= 0.6 + 1e-9) return ['ACCEPT: in the band [0.4, 0.6]', 'ok', 'accept'];
    if (p === 0 && to * 2 >= R.length) return ['looks unsolvable: loosen or reject', 'no', 'loosen'];
    if (p > 0.6) return ['REFINE: too easy, tighten', 'no', 'tighten'];
    return ['REFINE: too hard, loosen', 'no', 'loosen'];
  }
  const dots = R => '<span class="dots">' + R.map(x => '<i class="' + (x.ok ? 'y' : 'n') + '" title="' + (x.ok ? 'success' : x.timeout ? 'failed: ran out of steps' : 'failed') + ', ' + x.steps + ' steps"></i>').join('') + '</span>';
  $('vrGo').addEventListener('click', () => {
    const K = +$('vrK').value, rb = EH.rollouts({ stage: 'none', hooks: [] }, K, { slip }, seedCtr), rw = EH.rollouts(cfg, K, { slip }, seedCtr); seedCtr += K;
    const d = decide(rw);
    $('vrOut').innerHTML = '<p><b>Static:</b> ' + dots(rb) + ' ' + rb.filter(x => x.ok).length + '/' + K + ' = ' + sr(rb).toFixed(2) + '</p><p><b>Wrapped:</b> ' + dots(rw) + ' ' + rw.filter(x => x.ok).length + '/' + K + ' = ' + sr(rw).toFixed(2) + ' → <span class="dec ' + d[1] + '">' + d[0] + '</span></p><p class="small mute">Rollout seeds ' + (seedCtr - K) + ' to ' + (seedCtr - 1) + '. Click again for a fresh set: the true rate has not changed, only the sample.</p>';
  });
  $('vrTrue').addEventListener('click', () => {
    const K = +$('vrK').value, n = 400, rb = EH.rollouts({ stage: 'none', hooks: [] }, n, { slip }, 50000), rw = EH.rollouts(cfg, n, { slip }, 50000);
    const pb = sr(rb), pw = sr(rw), se = Math.sqrt(pw * (1 - pw) / n);
    $('vrOut').innerHTML = '<p><b>Static:</b> ' + (100 * pb).toFixed(1) + '% of 400. <b>Wrapped:</b> ' + (100 * pw).toFixed(1) + '% ± ' + (196 * se).toFixed(1) + ' points (95%), mean ' + (rw.reduce((a, x) => a + x.steps, 0) / n).toFixed(1) + ' steps.</p><p>At a true rate of ' + pw.toFixed(2) + ', <i>K</i> = ' + K + ' rollouts land in [0.4, 0.6] ' + (100 * BAND(K, pw)).toFixed(1) + '% of the time (binomial), so ' + (pw >= .4 && pw <= .6 ? 'even a candidate that truly belongs in the band is refined ' + (100 - 100 * BAND(K, pw)).toFixed(0) + '% of the time' : 'a candidate outside the band is still accepted ' + (100 * BAND(K, pw)).toFixed(0) + '% of the time') + '.</p>';
  });
  $('vrLoop').addEventListener('click', () => {
    const K = +$('vrK').value, ladder = [{ stage: 'hide', hooks: [], l: 'Stage: hide the mug in drawer 1' }, { stage: 'hidemw', hooks: [], l: 'Stage: hide the mug in the microwave (a stronger version of the same perturbation)' }];
    const log = [], rb = EH.rollouts({ stage: 'none', hooks: [] }, K, { slip }, seedCtr); seedCtr += K;
    const p0 = sr(rb);
    log.push('<b>Observe.</b> ' + K + ' rollouts of the static world: ' + dots(rb) + ' success rate ' + p0.toFixed(2) + '.');
    if (p0 >= .4 && p0 <= .6) log.push('<b>Diagnose.</b> Already in the band: skip this task.');
    else if (p0 === 0) log.push('<b>Diagnose.</b> Never solved: "make it harder" is nonsensical; scaffold it or skip.');
    else {
      log.push('<b>Diagnose.</b> ' + (p0 === 1 ? 'Perfect success: the environment is too forgiving, make it harder.' : 'Above the band: make it harder.'));
      let lvl = 0, acc = false;
      for (let r = 1; r <= 5 && !acc; r++) {
        const c = ladder[lvl], R = EH.rollouts({ stage: c.stage, hooks: c.hooks }, K, { slip }, seedCtr); seedCtr += K;
        const d = decide(R);
        log.push('<b>Round ' + r + '. Write:</b> ' + c.l + '. <b>Validate:</b> ' + dots(R) + ' ' + R.filter(x => x.ok).length + '/' + K + ' → <span class="dec ' + d[1] + '">' + d[0] + '</span>');
        if (d[2] === 'accept') { acc = true; log.push('<b>Accepted:</b> this candidate joins the EnvHarness for this task.') }
        else if (d[2] === 'tighten') { if (lvl < ladder.length - 1) lvl++; }
        else { if (lvl > 0) lvl--; }
      }
      if (!acc) log.push('<b>Revision budget exhausted:</b> after 5 rounds the task yields no component.');
    }
    $('vrLog').innerHTML = log.map(x => '<li>' + x + '</li>').join('');
  });

  onTab('t-run', () => { if (!anim) rebuild(); else anim.draw() });
})();
