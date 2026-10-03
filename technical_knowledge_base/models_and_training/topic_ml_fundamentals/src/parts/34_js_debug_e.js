// ---- When training goes wrong: decoder for the per-step logs, learning-rate sweep, live spike score ----
(function (DG) {
  if (!DG || !DG.R || !DG.chart) return;
  const $ = id => document.getElementById(id), R = DG.R, S = R.spike, fmt = DG.fmt;
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const cache = {};
  // inverse of mk_data.py enc(): two base64url characters per value on a log scale between the series' lo and hi
  DG.decode = function (q, key) {
    const ck = key + q.length + q.slice(0, 16) + q.slice(-16); if (cache[ck]) return cache[ck];
    const [lo, hi] = S.rng[key], L = Math.log(hi / lo), out = new Array(q.length / 2);
    for (let i = 0; i < q.length; i += 2) {
      if (q[i] === '~') { out[i / 2] = null; continue; }
      const v = B64.indexOf(q[i]) * 64 + B64.indexOf(q[i + 1]); out[i / 2] = lo * Math.exp(L * v / 4095);
    }
    return (cache[ck] = out);
  };
  // OLMo 2's spike score: share of values at least K standard deviations from the mean of the previous W values
  function spikeScore(vals, W, K) {
    let s = 0, s2 = 0, n = 0, ev = 0; const hits = [], mean = [], thr = [];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (i >= W) {
        const m = s / W, sd = Math.sqrt(Math.max(0, s2 / W - m * m));
        mean.push([i + 1, m]); thr.push([i + 1, m + K * sd]);
        if (v !== null) { ev++; if (sd > 0 && Math.abs(v - m) >= K * sd) { n++; hits.push([i + 1, v]); } }
      }
      const a = v === null ? 0 : v; s += a; s2 += a * a;
      if (i >= W) { const o = vals[i - W] === null ? 0 : vals[i - W]; s -= o; s2 -= o * o; }
    }
    return {n, ev, pct: ev ? 100 * n / ev : 0, hits, mean, thr};
  }
  DG.spikeScore = spikeScore;
  const VAR = [['base', 'no fix'], ['qk', 'QK-norm'], ['z', 'z-loss'], ['both', 'QK-norm + z-loss'], ['base_clip', 'clipping at 1.0']];
  const st = {v: 'base'};

  function drawSweep() {
    const el = $('dg-sw'), W = el.clientWidth, two = W >= 620;
    el.innerHTML = '<div class="dg-leg">' + DG.legItem('var(--dg-bug)', 0, 'no QK-norm, no z-loss') + DG.legItem('var(--dg-fix)', 0, 'QK-norm + z-loss') + '</div><div style="display:grid;grid-template-columns:' + (two ? '1fr 1fr' : '1fr') + ';gap:8px"><div><div class="small mute">final validation loss</div><div id="dg-sw1"></div></div><div><div class="small mute">largest attention logit in the run</div><div id="dg-sw2"></div></div></div>';
    const lrs = [...new Set(S.sweep.map(r => r.lr))].sort((a, b) => a - b);
    const ser = (qk, key) => S.sweep.filter(r => r.qk === qk).sort((a, b) => a.lr - b.lr).map(r => [r.lr, r[key]]);
    const o = {logx: 1, xmin: lrs[0] / 1.5, xmax: lrs[lrs.length - 1] * 1.5, xticks: lrs, xfmt: v => v.toExponential(0).replace('e-', 'e-'), xlabel: 'peak learning rate', h: 180};
    DG.chart($('dg-sw1'), Object.assign({}, o, {series: [{pts: ser(false, 'fv'), c: 'var(--dg-bug)', dots: 1}, {pts: ser(true, 'fv'), c: 'var(--dg-fix)', dots: 1}], label: 'Final validation loss against peak learning rate'}));
    DG.chart($('dg-sw2'), Object.assign({}, o, {series: [{pts: ser(false, 'mx'), c: 'var(--dg-bug)', dots: 1}, {pts: ser(true, 'mx'), c: 'var(--dg-fix)', dots: 1}], label: 'Largest attention logit against peak learning rate'}));
    const g = (lr, qk, k) => { const r = S.sweep.find(x => x.lr === lr && x.qk === qk); return r ? r[k] : null; };
    const hiLr = lrs[lrs.length - 1], best = S.sweep.reduce((a, b) => (b.fv < a.fv ? b : a));
    $('dg-swcap').innerHTML = 'Recorded, one seed per point. Up to 3e-2 the two settings end within 0.04 of each other, yet without QK-norm the largest attention logit grows from ' + fmt(g(lrs[0], false, 'mx')) + ' to ' + fmt(g(3e-2, false, 'mx')) + ' (with it: ' + fmt(g(lrs[0], true, 'mx')) + ' to ' + fmt(g(3e-2, true, 'mx')) + '). At ' + hiLr.toExponential(0) + ' the logit reaches ' + fmt(g(hiLr, false, 'mx')) + ' and the run degrades to ' + fmt(g(hiLr, false, 'fv')) + ' against ' + fmt(g(hiLr, true, 'fv')) + ' with the fixes. The best run overall (' + fmt(best.fv) + ' at ' + best.lr.toExponential(0) + ') does not need them: like Wortsman et al., the fixes widen the range of learning rates that train well rather than lowering the best loss.';
  }
  function drawSpike() {
    const segEl = $('dg-spv');
    if (!segEl.dataset.built) {
      segEl.innerHTML = VAR.filter(v => S.main[v[0]]).map(v => '<button data-v="' + v[0] + '" aria-pressed="' + (v[0] === st.v) + '" class="' + (v[0] === st.v ? 'on' : '') + '">' + v[1] + '</button>').join('');
      segEl.dataset.built = 1;
      segEl.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; st.v = b.dataset.v; segEl.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); drawSpike(); });
    }
    const key = $('dg-sps').value, W = +$('dg-spw').value, K = +$('dg-spk').value;
    $('dg-spwv').textContent = W; $('dg-spkv').textContent = K;
    const vals = DG.decode(S.main[st.v].q[key], key), sc = spikeScore(vals, W, K);
    DG.chart($('dg-spp'), {series: [{pts: vals.map((v, i) => [i + 1, v]), c: 'var(--dg-b1)', w: .8}, {pts: sc.mean, c: 'var(--mute)', w: 1.2}, {pts: sc.thr, c: 'var(--dg-bug)', w: 1, dash: 1}],
      label: 'Per-step series with rolling mean, threshold and detected spikes',
      extra: (X, Y, g) => sc.hits.map(h => { const x = X(h[0]), y = Y(Math.min(g.hi, Math.max(g.lo, h[1]))) - 7; return '<path d="M' + (x - 4).toFixed(1) + ' ' + (y - 6).toFixed(1) + 'L' + (x + 4).toFixed(1) + ' ' + (y - 6).toFixed(1) + 'L' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Z" style="fill:var(--dg-bug)"/>'; }).join('')});
    const rows = VAR.filter(v => S.main[v[0]]).map(v => { const r = spikeScore(DG.decode(S.main[v[0]].q[key], key), W, K); return [v[1], r, S.main[v[0]]]; });
    $('dg-spo').innerHTML = '<div class="stat"><div class="k">Spike score, ' + VAR.find(v => v[0] === st.v)[1] + '</div><div class="v">' + sc.pct.toFixed(2) + '%</div><div class="d">' + sc.n + ' of ' + sc.ev + ' steps</div></div>' +
      '<div class="stat"><div class="k">All five runs, same series and settings</div><div class="d" style="color:var(--ink);font-size:12.5px;line-height:1.5">' + rows.map(r => r[0] + ': <b>' + r[1].pct.toFixed(2) + '%</b> (' + r[1].n + '), final validation ' + fmt(r[2].fv)).join('<br>') + '</div></div>';
  }
  ['dg-sps', 'dg-spw', 'dg-spk'].forEach(id => $(id).addEventListener('input', drawSpike));
  $('dg-sps').addEventListener('change', drawSpike);
  function render() { if ($('t-debug').hidden) return; drawSweep(); drawSpike(); }
  window.TAB_RENDER = window.TAB_RENDER || {}; (window.TAB_RENDER['t-debug'] = window.TAB_RENDER['t-debug'] || []).push(render);
  let rw = 0; addEventListener('resize', () => { const w = $('dg-sw').clientWidth; if (!$('t-debug').hidden && Math.abs(w - rw) > 20) { rw = w; render(); } });
})(window.DG);
