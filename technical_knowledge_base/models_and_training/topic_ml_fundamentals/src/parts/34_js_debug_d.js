// ---- When training goes wrong: bug and fix, step by step (replayed from the recorded logs) ----
(function (DG) {
  if (!DG || !DG.R || !DG.chart) return;
  const $ = id => document.getElementById(id), R = DG.R, fmt = DG.fmt, fmtT = DG.fmtT;
  const card = $('dg-anim'); if (!card) return;
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const st = {m: 'van', k: 0, play: false, spd: 1, vis: false, raf: 0, last: 0, acc: 0, user: false, ended: false, lis: []};
  const FRAME = 260; // ms per recorded frame at 1x

  // spike score state (k = 7, window 100) accumulated per step for the spike mode
  function spikesUpTo(vals, upto, W, K) {
    let n = 0, s = 0, s2 = 0;
    for (let i = 0; i < Math.min(upto, vals.length); i++) {
      const v = vals[i];
      if (i >= W) { const m = s / W, sd = Math.sqrt(Math.max(0, s2 / W - m * m)); if (v !== null && sd > 0 && Math.abs(v - m) >= K * sd) n++; }
      const a = v === null ? 0 : v; s += a; s2 += a * a;
      if (i >= W) { const o = vals[i - W] === null ? 0 : vals[i - W]; s -= o; s2 -= o * o; }
    }
    return n;
  }
  let SPK = null;
  function spk() {
    if (SPK) return SPK; const S = R.spike.main, d = DG.decode;
    SPK = {}; ['base', 'both'].forEach(k => { SPK[k] = {loss: d(S[k].q.loss, 'loss'), gnorm: d(S[k].q.gnorm, 'gnorm'), mx: d(S[k].q.maxlogit, 'maxlogit')}; });
    return SPK;
  }
  const M = {
    van: {bug: 'vanish_sigmoid', fix: 'vanish_fix_relu_he', bn: '20 sigmoid layers', fn: 'ReLU + He init'},
    exp: {bug: 'explode_init', fix: 'explode_fix_he', bn: 'weights N(0, 1)', fn: 'He init + clipping'}
  };
  function frames() {
    if (st.m === 'spk') { const n = R.spike.main.base.n, f = [1]; for (let s = 10; s <= n; s += 10) f.push(s); return f; }
    const f = R.runs[M[st.m].fix].lay; return f.map(r => r[0]);
  }
  const layAt = (id, step) => { const L = R.runs[id].lay || []; let row = null; L.forEach(r => { if (r[0] <= step) row = r; }); return row; };
  const lossAt = (id, step) => { const r = R.runs[id]; if (r.div && step >= r.div) return null; let v = r.init; r.tr.forEach(p => { if (p[0] <= step && p[1] !== null) v = p[1]; }); return v; };

  // which explained stretch (one ol.sx item) a frame belongs to: four per case (the long-replay rule, 2026-11-06)
  function stretch(k) {
    const f = frames(), n = f.length, step = f[Math.min(k, n - 1)];
    if (st.m === 'van') return k === 0 ? 0 : step <= 200 ? 1 : k < n - 1 ? 2 : 3;
    if (st.m === 'exp') return k === 0 ? 0 : step === 2 ? 1 : k < n - 1 ? 2 : 3;
    return step <= 50 ? 0 : step <= 150 ? 1 : step < R.spike.main.base.n ? 2 : 3;
  }
  const firstOf = j => { const n = frames().length; for (let k = 0; k < n; k++) if (stretch(k) === j) return k; return 0; };
  // the live numbers under the chart; the step list on the left explains each stretch
  function caption(step, f) {
    const n = f.length, k = st.k, j = stretch(k);
    if (st.m === 'van') {
      const b = layAt(M.van.bug, step), x = layAt(M.van.fix, step), rb = b[b.length - 1] / b[1], rx = x[x.length - 1] / x[1];
      if (j < 3) return 'At step ' + step + ' the first layer\'s gradient is ' + fmt(rb) + ' times smaller than the output layer\'s with sigmoids, ' + fmt(rx) + ' with ReLU and He initialisation.';
      return 'Sigmoid: training loss ' + fmt(R.runs[M.van.bug].fin.train) + ', accuracy ' + Math.round(R.runs[M.van.bug].fin.acc * 100) + '% (chance is 10%). ReLU with He initialisation: ' + fmt(R.runs[M.van.fix].fin.train) + ' and ' + Math.round(R.runs[M.van.fix].fin.acc * 100) + '%.';
    }
    if (st.m === 'exp') {
      const b = R.runs[M.exp.bug];
      if (j === 0) return 'Loss before any update: ' + fmt(b.init) + ' with weights N(0, 1), ' + fmt(R.runs[M.exp.fix].init) + ' with He initialisation (variance 2/64); ln 10 = 2.303.';
      if (j === 1) return 'From here on every weight is NaN in the bug\'s network.';
      if (j === 2) return 'The fixed run\'s training loss at step ' + step + ': ' + fmt(lossAt(M.exp.fix, step)) + '.';
      return 'The fixed run reaches training loss ' + fmt(R.runs[M.exp.fix].fin.train) + ' in 60 steps; the bug ended at step 2.';
    }
    const S = spk(), sb = spikesUpTo(S.base.gnorm, step, 100, 7), sf = spikesUpTo(S.both.gnorm, step, 100, 7), mb = Math.max(...S.base.mx.slice(0, step).map(v => v || 0)), mf = Math.max(...S.both.mx.slice(0, step).map(v => v || 0));
    const pk = a => { let i0 = 30; for (let i = 30; i < a.length; i++) if ((a[i] || 0) > (a[i0] || 0)) i0 = i; return [i0 + 1, a[i0]]; };
    const pb = pk(S.base.loss), pf = pk(S.both.loss), lr = R.spike.main.base.lr;
    if (j === 0) return 'Peak learning rate ' + lr.toExponential(0) + '. The largest attention logit so far: ' + fmt(mb) + ' without QK-norm, ' + fmt(mf) + ' with it.';
    if (j === 1) return 'With QK-norm and z-loss the loss peaks at ' + fmt(pf[1]) + ' at step ' + pf[0] + '; without them at ' + fmt(pb[1]) + ' at step ' + pb[0] + ', while the largest attention logit passes ' + fmt(mb) + '. Gradient-norm spikes so far (7 standard deviations, 100-step window): ' + sb + ' against ' + sf + '.';
    if (j === 2) return 'Largest attention logit without QK-norm: ' + fmt(mb) + ' now. Gradient-norm spikes so far: ' + sb + ' against ' + sf + '.';
    return 'Final validation loss ' + fmt(R.spike.main.base.fv) + ' without the fixes, ' + fmt(R.spike.main.both.fv) + ' with QK-norm plus z-loss. Gradient-norm spikes over the run: ' + sb + ' against ' + sf + '.';
  }

  function bars(step) {
    const el = $('dg-aplot'), W = Math.max(240, el.clientWidth - 2), ml = 8, mr = 8, rowH = W < 480 ? 74 : 90, gap = 34, H = 22 + 2 * rowH + gap + 20;
    const m = M[st.m], all = [];
    [m.bug, m.fix].forEach(id => (R.runs[id].lay || []).forEach(r => r.slice(1).forEach(v => { if (v !== null && v > 0) all.push(v); })));
    let lo = Math.min(...all), hi = Math.max(...all); lo = Math.pow(10, Math.floor(Math.log10(lo))); hi = Math.pow(10, Math.ceil(Math.log10(hi)));
    const nL = R.runs[m.fix].lay[0].length - 1, iw = W - ml - mr - 40, bw = iw / nL;
    let s = '';
    [[m.bug, m.bn, 'var(--dg-bug)'], [m.fix, m.fn, 'var(--dg-fix)']].forEach(([id, nm, c], j) => {
      const y0 = 18 + j * (rowH + gap), row = layAt(id, step), dead = R.runs[id].div && step >= R.runs[id].div;
      s += '<text x="' + ml + '" y="' + (y0 - 4) + '" font-size="11.5" font-weight="600" style="fill:' + c + '">' + (j ? 'Fix: ' : 'Bug: ') + nm + '</text>';
      s += '<rect x="' + (ml + 40) + '" y="' + y0 + '" width="' + iw + '" height="' + rowH + '" style="fill:var(--soft)"/>';
      [lo, Math.sqrt(lo * hi), hi].forEach(t => { const y = y0 + rowH * (1 - Math.log10(t / lo) / Math.log10(hi / lo)); s += '<text x="' + (ml + 36) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" style="fill:var(--mute)">' + fmtT(t) + '</text>'; });
      if (row && !dead) row.slice(1).forEach((v, i) => {
        if (v === null || !(v > 0)) return; const h = rowH * Math.max(0, Math.log10(v / lo)) / Math.log10(hi / lo);
        s += '<rect x="' + (ml + 40 + i * bw + 1).toFixed(1) + '" y="' + (y0 + rowH - h).toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" style="fill:' + c + ';opacity:.85"/>';
      });
      if (dead || (row && row.slice(1).every(v => v === null))) s += '<text x="' + (ml + 40 + iw / 2) + '" y="' + (y0 + rowH / 2 + 4) + '" text-anchor="middle" font-size="13" font-weight="600" class="dg-nan" style="fill:' + c + '">NaN: every weight is NaN</text>';
      s += '<text x="' + (ml + 40) + '" y="' + (y0 + rowH + 13) + '" font-size="10" style="fill:var(--mute)">layer 1 (input)</text><text x="' + (W - mr) + '" y="' + (y0 + rowH + 13) + '" text-anchor="end" font-size="10" style="fill:var(--mute)">layer ' + nL + ' (output)</text>';
    });
    s += '<text x="' + (W - mr) + '" y="12" text-anchor="end" font-size="10" style="fill:var(--mute)">gradient norm per layer, log scale</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Gradient norm of each layer at step ' + step + ', bug and fix">' + s + '</svg><div class="dg-leg">' + DG.legItem('var(--dg-bug)', 0, 'bug, training loss') + DG.legItem('var(--dg-fix)', 0, 'fix, training loss') + '</div><div id="dg-aloss"></div>';
  }
  function draw() {
    const f = frames(), k = Math.min(st.k, f.length - 1), step = f[k];
    $('dg-astep').textContent = 'Training step ' + step + ' of ' + f[f.length - 1];
    $('dg-acap').innerHTML = caption(step, f);
    const j = stretch(k); (st.lis || []).forEach((li, i) => { li.classList.toggle('on', i === j); li.classList.toggle('done', i < j); if (i === j) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    card.dataset.playing = st.play ? '1' : '';
    const el = $('dg-aplot');
    if (st.m === 'spk') {
      const S = spk(), N = R.spike.main.base.n, cut = a => a.slice(0, step).map((v, i) => [i + 1, v]);
      el.innerHTML = '<div class="dg-leg">' + DG.legItem('var(--dg-bug)', 0, 'no QK-norm, no z-loss') + DG.legItem('var(--dg-fix)', 0, 'QK-norm + z-loss') + '</div><div class="small mute">training loss</div><div id="dg-al1"></div><div class="small mute">largest attention logit in the batch</div><div id="dg-al2"></div>';
      DG.chart($('dg-al1'), {series: [{pts: cut(S.base.loss), c: 'var(--dg-bug)', w: 1}, {pts: cut(S.both.loss), c: 'var(--dg-fix)', w: 1}], xmax: N, ylo: 1.3, yhi: 4.5, h: 150, label: 'training loss so far'});
      DG.chart($('dg-al2'), {series: [{pts: cut(S.base.mx), c: 'var(--dg-bug)', w: 1}, {pts: cut(S.both.mx), c: 'var(--dg-fix)', w: 1}], xmax: N, ylo: 1, yhi: Math.max(...S.base.mx.map(v => v || 0)), h: 150, label: 'largest attention logit so far'});
      const sb = spikesUpTo(S.base.gnorm, step, 100, 7), sf = spikesUpTo(S.both.gnorm, step, 100, 7);
      $('dg-acnt').innerHTML = stat('Training loss now', fmt(S.base.loss[step - 1]) + ' / ' + fmt(S.both.loss[step - 1]), 'bug / fix') + stat('Largest attention logit now', fmt(S.base.mx[step - 1]) + ' / ' + fmt(S.both.mx[step - 1]), 'bug / fix') + stat('Gradient-norm spikes so far', sb + ' / ' + sf, '7 sd from a 100-step rolling mean');
    } else {
      el.innerHTML = bars(step);
      const m = M[st.m], b = R.runs[m.bug], x = R.runs[m.fix], xm = x.lay[x.lay.length - 1][0];
      const cut = r => r.tr.filter(p => p[0] <= step);
      DG.chart($('dg-aloss'), {series: [{pts: cut(b), c: 'var(--dg-bug)', nanAt: b.div && step >= b.div ? b.div : 0, nanLabel: 'NaN'}, {pts: cut(x), c: 'var(--dg-fix)'}], xmax: xm, cap: 1e17, ylo: x.fin.train, yhi: Math.max(b.init || 3, x.init), h: 140, label: 'training loss so far'});
      const lb = layAt(m.bug, step), lx = layAt(m.fix, step), dead = b.div && step >= b.div;
      const ratio = r => (r && r[1] && r[r.length - 1] ? fmt(r[1] / r[r.length - 1]) : '<span class="dg-nan">NaN</span>');
      $('dg-acnt').innerHTML = stat('Training loss now', (dead ? '<span class="dg-nan">NaN</span>' : fmt(lossAt(m.bug, step))) + ' / ' + fmt(lossAt(m.fix, step)), 'bug / fix') + stat('First-layer gradient / last-layer', (dead ? '<span class="dg-nan">NaN</span>' : ratio(lb)) + ' / ' + ratio(lx), 'bug / fix; 1 means equal') + stat('Step', String(step), 'of ' + xm + ' recorded');
    }
    const n = f.length, sc = $('dg-ascrub'); sc.max = n - 1; sc.value = k;
    const pb = $('dg-aplay'), end = k === n - 1; pb.innerHTML = st.play ? '&#10074;&#10074; Pause' : end ? '&#8635; Replay' : '&#9654; Play'; pb.setAttribute('aria-label', st.play ? 'Pause' : end ? 'Replay' : 'Play');
  }
  const stat = (k, v, d) => '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>';
  const live = () => st.vis && !document.hidden && card.offsetParent !== null;
  function tick(now) {
    st.raf = 0; if (!st.play || !live()) return;
    const dt = st.last ? Math.min(120, now - st.last) : 16; st.last = now; st.acc += dt * st.spd;
    const n = frames().length;
    if (st.acc >= FRAME) { st.acc = 0; if (st.k < n - 1) { st.k++; if (st.k === n - 1) { st.play = false; st.ended = true; } draw(); if (!st.play) return; } else { st.play = false; st.ended = true; draw(); return; } }
    card.dataset.frames = (+card.dataset.frames || 0) + 1;
    st.raf = requestAnimationFrame(tick);
  }
  function kick() { if (st.play && live() && !st.raf) { st.last = 0; st.raf = requestAnimationFrame(tick); } else if (!live() && st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; } }
  const pause = () => { st.play = false; if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; } };
  const user = () => { st.user = true; };
  $('dg-aplay').addEventListener('click', () => { user(); if (st.play) pause(); else { if (st.k >= frames().length - 1) st.k = 0; st.play = true; kick(); } draw(); });
  $('dg-afwd').addEventListener('click', () => { user(); pause(); st.k = Math.min(frames().length - 1, st.k + 1); draw(); });
  $('dg-aback').addEventListener('click', () => { user(); pause(); st.k = Math.max(0, st.k - 1); draw(); });
  $('dg-ascrub').addEventListener('input', e => { user(); pause(); st.k = +e.target.value; draw(); });
  $('dg-aspd').addEventListener('change', e => { st.spd = +e.target.value; });
  // the step list on the left: one item per stretch; a click jumps to its first frame and stops autoplay
  function bindList() {
    ['van', 'exp', 'spk'].forEach(m => { const L = $('sx-dg-' + m); if (L) L.hidden = m !== st.m; });
    const L = $('sx-dg-' + st.m); st.lis = L ? [...L.children] : [];
    st.lis.forEach((li, j) => { li.tabIndex = 0; li.setAttribute('role', 'button'); const go = () => { user(); pause(); st.k = firstOf(j); draw(); };
      li.onclick = go; li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
  }
  // autoplay (2026-11-06): plays once at least half in view, pauses off screen and resumes, stops for good on any control or at the last frame, never under reduced motion
  function auto() { if (RM || st.user || st.ended || st.play || !live()) return; st.play = true; draw(); kick(); }
  const seg = $('dg-am');
  seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    seg.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    pause(); st.m = b.dataset.m; st.k = 0; st.acc = 0; st.user = false; st.ended = false; bindList(); draw(); auto();
  }));
  bindList();
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { const x = es[es.length - 1]; st.vis = x.isIntersecting && (x.intersectionRatio >= .5 || x.intersectionRect.height >= innerHeight * .5); if (st.vis) auto(); kick(); }, {threshold: [0, .25, .5, .75]}).observe(card); else st.vis = true;
  document.addEventListener('visibilitychange', kick);
  function render() { if ($('t-debug').hidden) return; draw(); kick(); }
  window.TAB_RENDER = window.TAB_RENDER || {}; (window.TAB_RENDER['t-debug'] = window.TAB_RENDER['t-debug'] || []).push(render);
  let rw = 0; addEventListener('resize', () => { const w = card.clientWidth; if (!$('t-debug').hidden && Math.abs(w - rw) > 20) { rw = w; draw(); } });
})(window.DG);
