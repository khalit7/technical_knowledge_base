// ---- The tables tab ----
(function () {
  const TB = PAPER.tables, RC = PAPER.rc;
  const f = s => parseFloat(String(s).replace('+', ''));
  let which = 't2', diff = false;
  function t23() {
    const t = TB[which], cols = t.cols;
    let h = '<thead><tr><th>Skill source</th>' + cols.map(c => '<th class="num">' + c + '</th>').join('') + '</tr></thead><tbody>';
    Object.keys(t.rows).forEach(r => {
      h += '<tr><td>' + r + '</td>' + t.rows[r].map((c, j) => {
        if (!c) return '<td class="num mute">–</td>';
        let cell = c[0] + ' <span class="mute small">± ' + c[1] + '</span>';
        if (diff && r !== 'Original Envs') { const og = t.rows['Original Envs'][j]; const d = f(c[0]) - f(og[0]); const lb = t.lower_better && t.lower_better[j]; const good = lb ? d < 0 : d > 0; cell += '<br><span class="small ' + (good ? 'ok' : '') + '" style="color:' + (good ? 'var(--good)' : 'var(--bad)') + '">' + (d > 0 ? '+' : '') + d.toFixed(which === 't2' ? 1 : 2) + '</span>' }
        return '<td class="num">' + cell + '</td>';
      }).join('') + '</tr>';
    });
    h += '<tr><td><b>Improvement (printed)</b></td>' + t.improvement.map(x => '<td class="num"><b>' + x + '</b></td>').join('') + '</tr>';
    const nz = RC.noise.filter(x => x.table === t.name);
    h += '<tr><td class="mute">t (Welch, 3 runs)</td>' + nz.map(x => '<td class="num mute">' + Math.abs(x.t).toFixed(2) + '</td>').join('') + '</tr>';
    h += '<tr><td class="mute">p (two-sided)</td>' + nz.map(x => '<td class="num mute">' + x.p.toFixed(2) + '</td>').join('') + '</tr></tbody>';
    $('t23T').innerHTML = h;
    $('t23Cap').innerHTML = t.note + ' ± is the printed standard deviation. The t and p rows are this page\'s: the difference EnvHarness minus Original over √(sd₁²/3 + sd₂²/3), with Welch degrees of freedom.' + (which === 't3' ? ' The four SWE-bench success rates are whole numbers of the 407 test issues: 194, 203, 204 and 214.' : '');
  }
  segBind('t23M', m => { which = m; $('t23M').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false')); t23() });
  $('t23D').addEventListener('change', e => { diff = e.target.checked; t23() });

  let f1m = 'print';
  function f1(w) {
    const bars = RC.fig1_bars, bs = Object.keys(bars), ks = ['No Skills (base agent)', 'Original Envs (real envs)', 'EnvHarness Envs'], cs = ['var(--dim)', 'var(--c2)', 'var(--c1)'];
    const lo = f1m === 'print' ? RC.fig1_floor : 0, hi = 60, H = 230, pl = 34, pr = 8, pt = 26, pb = 40, gw = (w - pl - pr) / 3, bw = Math.min(34, (gw - 20) / 3);
    const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    let s = '';
    const st = f1m === 'print' ? 4 : 10;
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) s += ln2(pl, Y(v), w - pr, Y(v), 'var(--line)') + tx(pl - 5, Y(v) + 4, v, { fs: 11, a: 'end', c: 'var(--mute)' });
    bs.forEach((b, i) => {
      const gx = pl + i * gw + (gw - 3 * bw - 8) / 2;
      ks.forEach((k, q) => { const v = bars[b][k], x = gx + q * (bw + 4); s += rc(x, Y(v), bw, Y(lo) - Y(v), cs[q], { r: 2 }) + (bw >= 30 ? tx(x + bw / 2, Y(v) - 4, v.toFixed(1), { fs: 11, a: 'middle' }) : '') + '<title>' + b + ', ' + k + ': ' + v.toFixed(2) + '</title>' });
      s += tx(pl + i * gw + gw / 2, H - pb + 16, b.replace(' Verified', ''), { fs: 11, a: 'middle' });
    });
    s += legend([['No skills', cs[0]], ['Original envs', cs[1]], ['EnvHarness envs', cs[2]]], pl, 12, w - pl).s;
    $('f1Svg').innerHTML = svgW(w, H, s, 'Figure 1 left panel');
  }
  segBind('f1M', m => { f1m = m; $('f1M').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false')); refit($('f1Svg')) });

  function statics() {
    const T = RC.fig5_tasks, P = RC.fig5, xs = [0, 50, 100, 150, 200, 250, 300];
    $('f5T').innerHTML = '<thead><tr><th>Environments</th>' + xs.map(x => '<th class="num">' + x + '</th>').join('') + '</tr></thead><tbody>' + Object.keys(T).reverse().map(k => '<tr><td>' + k + '</td>' + T[k].map((v, i) => '<td class="num">' + v + ' <span class="mute small">' + P[k][i].toFixed(2) + '</span></td>').join('') + '</tr>').join('') + '<tr><td class="mute">Gap, EnvHarness minus Original (tasks)</td>' + xs.map(x => '<td class="num mute">' + RC.fig5_gap_tasks[x] + '</td>').join('') + '</tr></tbody>';
    const t4 = TB.t4, rl = RC.rl;
    $('t4T').innerHTML = '<thead><tr><th>Trained in</th>' + t4.cols.map(c => '<th class="num">' + c + '</th>').join('') + '</tr></thead><tbody>' + ['Original Envs', 'EnvHarness Envs'].map((k, i) => '<tr><td>' + k + '</td>' + t4.rows[k].map((v, j) => '<td class="num">' + v + (j === 0 ? ' <span class="mute small">(' + (i ? rl['In-Dist (seen)'].eh : rl['In-Dist (seen)'].orig) + ')</span>' : j === 1 ? ' <span class="mute small">(' + (i ? rl['OOD (unseen)'].eh : rl['OOD (unseen)'].orig) + ')</span>' : '') + '</td>').join('') + '</tr>').join('') + '</tbody>';
    const t5 = TB.t5;
    $('t5T').innerHTML = '<thead><tr><th>Skills</th><th class="num">SR (%)</th><th class="num">AS</th></tr></thead><tbody>' + Object.keys(t5.rows).map(k => '<tr><td>' + k + '</td><td class="num">' + t5.rows[k][0] + ' <span class="mute small">(' + Math.round(f(t5.rows[k][0]) * 4.07) + ')</span></td><td class="num">' + t5.rows[k][1] + '</td></tr>').join('') + '</tbody>';
    const t9 = TB.t9;
    $('t9T').innerHTML = '<thead><tr><th>Skill source</th>' + t9.models.map(m => '<th class="num">' + m + ' SR</th><th class="num">AS</th>').join('') + '</tr></thead><tbody>' + Object.keys(t9.rows).map(k => '<tr><td>' + k + '</td>' + t9.rows[k].map(c => '<td class="num">' + c[0] + '</td><td class="num mute">' + c[1] + '</td>').join('') + '</tr>').join('') + '<tr><td class="mute">EnvHarness minus Original (SR)</td>' + t9.models.map(m => '<td class="num">+' + RC.t9_gains[m].toFixed(1) + '</td><td></td>').join('') + '</tr></tbody>';
    $('t10T').innerHTML = '<thead><tr><th>Held-out type</th><th class="num">Orig.</th><th class="num">EnvHarness</th><th class="num">Δ</th></tr></thead><tbody>' + TB.t10.rows.map(r => '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num ' + (f(r[3]) > 0 ? 'pos' : f(r[3]) < 0 ? 'neg' : '') + '">' + r[3].replace('-', '−') + '</td></tr>').join('') + '</tbody>';
    $('t11T').innerHTML = '<thead><tr><th>Benchmark</th><th>Method</th><th class="num">Design</th><th class="num">Rollout</th><th class="num">Total</th><th class="num">Design share</th></tr></thead><tbody>' + TB.t11.rows.map((r, i) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num">' + r[3] + '</td><td class="num">' + r[4] + '</td><td class="num mute">' + RC.t11[i].design_share_pct.toFixed(2) + '%</td></tr>').join('') + '</tbody>';
    $('t12T').innerHTML = '<thead><tr><th>Metric</th><th>Band</th><th class="num">Orig.</th><th class="num">EnvHarness</th></tr></thead><tbody>' + TB.t12.rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="num">' + r[2] + '%</td><td class="num">' + r[3] + '%</td></tr>').join('') + '</tbody>';
    $('t13Tab').innerHTML = '<thead><tr><th>Benchmark</th><th>Axis</th><th>Specified weakness</th><th>Generated component</th><th>Distilled skill</th></tr></thead><tbody>' + TB.t13.rows.map(r => '<tr>' + r.map(c => '<td>' + c.replace(/f_([ATO])/g, '<i>f</i><sub>$1</sub>') + '</td>').join('') + '</tr>').join('') + '</tbody>';
    const cf = RC.configs;
    $('cfgTab').innerHTML = '<thead><tr><th>Benchmark</th><th class="num">Rollouts per candidate</th><th class="num">Max rounds</th><th>Band</th><th>Acceptance in the designer prompt</th><th class="num">Max steps</th></tr></thead><tbody><tr class="mute"><td>Table 8 (all)</td><td class="num">5</td><td class="num">5</td><td>not stated</td><td>accept, reject or refine from the rollouts</td><td class="num">not stated</td></tr>' + Object.keys(cf).map(b => { const c = cf[b], bad = b !== 'Toy24' && (c.k_per_candidate !== '5' || c.max_k !== '5'); return '<tr><td>' + b + '</td><td class="num' + (c.k_per_candidate !== '5' && b !== 'Toy24' ? ' neg' : '') + '">' + c.k_per_candidate + '</td><td class="num' + (c.max_k !== '5' && b !== 'Toy24' ? ' neg' : '') + '">' + c.max_k + '</td><td>' + c.target_band + '</td><td>' + c.acceptance + '</td><td class="num">' + c.max_episode_steps + '</td></tr>' }).join('') + '</tbody>';
    $('chkT').innerHTML = '<thead><tr><th></th><th>Check</th><th>Result</th></tr></thead><tbody>' + RC.checks.map(c => '<tr><td>' + (c.ok ? '<span class="ok">✓</span>' : '<span style="color:var(--bad)">≠</span>') + '</td><td>' + c.name.replace(/</g, '&lt;') + ' ' + A(PAPER.meta.ax + '#' + c.where, '↗') + '</td><td class="small">' + c.detail.replace(/</g, '&lt;') + '</td></tr>').join('') + '</tbody>';
  }
  let done = false;
  onTab('t-tables', () => { if (!done) { done = true; t23(); statics() } fit($('f1Svg'), f1) });
})();
