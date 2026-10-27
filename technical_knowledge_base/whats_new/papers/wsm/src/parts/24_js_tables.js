// ---- The tables tab: Tables 1 to 9 and Figures 4, 5, 10, rebuilt, with every check from recompute.py ----
(function () {
  const TB = P_.tables, num = v => +v, sg = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  const th = (a, k) => '<tr>' + a.map((x, i) => '<th' + (i >= (k || 1) ? ' class="num"' : '') + '>' + x + '</th>').join('') + '</tr>';
  function t12() {
    let h = '';
    ['t1', 't2'].forEach(k => { const t = TB[k];
      h += '<table style="margin-bottom:10px"><caption class="small mute" style="text-align:left">' + t.title + ' (' + '<a href="' + P_.meta.ax + '#S4.T2" target="_blank" rel="noopener noreferrer">arXiv</a>)</caption>' + th([''].concat(t.cols));
      ['WSD', 'WSM'].forEach(r => h += '<tr><td>' + r + '</td>' + t.rows[r].map(v => '<td class="num">' + v + '</td>').join('') + '</tr>');
      h += '<tr><td>Improv. (printed)</td>' + t.improv.map(v => '<td class="num">' + v + '</td>').join('') + '</tr>';
      h += '<tr><td>points</td>' + t.rows.WSM.map((v, i) => '<td class="num">' + sg(num(v) - num(t.rows.WSD[i])) + '</td>').join('') + '</tr></table>' });
    $('tb12').innerHTML = h;
    $('tb12n').innerHTML = 'All 13 printed relative improvements recompute exactly. Table 1\'s overall average is the mean of the 41 benchmarks of Table 7 (the categories weighted 10, 6, 11, 8, 6 by benchmark count), not the mean of the five category columns (that would give ' + RC.t1_cat_mean.WSD + ' and ' + RC.t1_cat_mean.WSM + '). Table 2\'s categories are benchmark-weighted means of Table 8 and 9\'s printed group averages (Agent includes instruction following), and its overall is the mean of all 60.';
  }
  function t3() {
    const f4 = RC.fig4, rows = [['Decay (1-sqrt)', 62.67, '400B', 62.67, '400B'], ['Merge: EMA', 63.01, 'Merge 8 at 225B (best point 63.07, Merge 4 at 225B)', f4['EMA_best_le400'][0], f4['EMA_best_le400'][2].replace('EMA, ', '') + ' at ' + f4['EMA_best_le400'][1] + 'B'],
      ['Merge: Mean', 63.95, 'Merge 16 at 425B', f4['Mean_best_le400'][0], f4['Mean_best_le400'][2].replace('Mean, ', '') + ' at ' + f4['Mean_best_le400'][1] + 'B'],
      ['Merge: 1-sqrt', 64.06, 'Merge 16 at 475B', f4['1-sqrt_best_le400'][0], f4['1-sqrt_best_le400'][2].replace('1-sqrt, ', '') + ' at ' + f4['1-sqrt_best_le400'][1] + 'B']];
    let h = '<table>' + th(['', 'Table 3 overall', 'where it is in Figure 4', 'best at or before 400B', 'where', 'lead over WSD at matched tokens']);
    rows.forEach(r => h += '<tr><td>' + r[0] + '</td><td class="num">' + r[1].toFixed(2) + '</td><td class="small">' + r[2] + '</td><td class="num">' + r[3].toFixed(2) + '</td><td class="small">' + r[4] + '</td><td class="num">' + sg(r[3] - 62.67) + '</td></tr>');
    h += '</table><table style="margin-top:8px">' + th(['Table 3 (printed)'].concat(TB.t3.cols));
    Object.entries(TB.t3.rows).forEach(([k, v]) => h += '<tr><td>' + k + '</td>' + v.map(x => '<td class="num">' + x + '</td>').join('') + '</tr>');
    $('tb3').innerHTML = h + '</table>';
  }
  function f4(w) {
    const pan = $('tbF4').value, P = Object.values(FG.fig4_window).find(p => Object.keys(p)[0].startsWith(pan)) || {}, keys = Object.keys(P).sort((a, b) => +a.split('Merge ')[1] - +b.split('Merge ')[1]);
    const cols = ['var(--c5)', 'var(--c6)', 'var(--c1)', 'var(--c4)', 'var(--c3)'], H = 260;
    const lg = legend(keys.map((k, i) => [k.split(', ')[1], cols[i]]), 40, 14, w - 50);
    const f = frame({ W: w, H: H + lg.h, pl: 40, pr: 10, pt: 18 + lg.h, pb: 32, x: [0, 510], y: [60.5, 64.5], yt: [61, 62, 63, 64], xt: [0, 100, 200, 300, 400, 500], xl: 'tokens since the branch (B)', yl: 'overall average (%)' });
    let s = rc(f.X(400), f.Y(64.5), f.X(500) - f.X(400), f.Y(60.5) - f.Y(64.5), 'var(--dim)', { op: .35, r: 0 }) + f.s + lg.s + ln2(40, f.Y(62.67), w - 10, f.Y(62.67), 'var(--c2)', { da: '5 3', sw: 1.4 });
    keys.forEach((k, i) => { s += poly(P[k].map(p => [f.X(p[0]), f.Y(p[1])]), cols[i], { sw: 1.8 }); P[k].forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 2.6, cols[i], { t: k + ': ' + p[1].toFixed(2) + ' at ' + p[0] + 'B' })) });
    $('tbF4Svg').innerHTML = svgW(w, H + lg.h, s, 'Figure 4 rebuilt');
  }
  function t4() {
    const t = TB.t4; let h = '<table>' + th(['(interval, count)'].concat(t.cols).concat(['recomputed overall']));
    Object.entries(t.rows).forEach(([k, v]) => { const r = RC.t4_weighted[k], ok = Math.abs(r - num(v[5])) < .015; h += '<tr><td>' + k + '</td>' + v.map((x, i) => '<td class="num"' + (i === 1 && k !== '(80B,1)' ? ' style="background:var(--hl)"' : '') + '>' + x + '</td>').join('') + '<td class="num">' + r.toFixed(2) + ' ' + (ok ? '<span class="vd ok">matches</span>' : '<span class="vd no">no</span>') + '</td></tr>' });
    $('tb4').innerHTML = h + '</table>';
    $('tb4n').innerHTML = 'With the weighting that reproduces Tables 1 and 3 exactly, only the unmerged (80B,1) row reproduces its printed overall. For the merged rows the Language Modeling column (highlighted, about 80) would have to be about ' + Object.values(RC.t4_lm_needed).slice(0, 4).map(v => v.toFixed(1)).join(', ') + ' to give the printed overall, and every other table puts merged models near 68. The pattern (finer slightly better, one checkpoint much worse) does not depend on that column.';
  }
  function t5() { const t = TB.t5; let h = '<table>' + th([''].concat(t.cols));
    ['WSD', 'WSM'].forEach(r => h += '<tr><td>' + r + '</td>' + t.rows[r].map(v => '<td class="num">' + v + '</td>').join('') + '</tr>');
    h += '<tr><td>change</td>' + RC.t5_rel.map(v => '<td class="num">' + (v >= 0 ? '+' : '') + v + '%</td>').join('') + '</tr></table>'; $('tb5').innerHTML = h }
  function t7() {
    const v = +$('tb7v').value, sort = $('tb7s').value, lab = {}; FG.fig10_labels.forEach(l => lab[l.dataset.toLowerCase()] = l);
    const alias = { 'humaneval': 'openai_humaneval', 'humaneval_cn': 'openai_humaneval_cn', 'mmlu-pro': 'mmlu_pro', 'c-eval': 'ceval', 'kor-bench': 'korbench', 'squad2.0': 'squad2.0', 'mgsm_zh': 'mgsm_zh' };
    let rows = TB.t7.rows.map(r => { const d = num(r[2 + v]) - num(r[2]); const L = lab[alias[r[1].toLowerCase()] || r[1].toLowerCase()]; return { r, d, L } });
    if (sort === 'd') rows.sort((a, b) => b.d - a.d);
    let h = '<table>' + th(['category', 'benchmark', 'WSD', 'EMA', 'mean', '1-sqrt', 'difference', 'Figure 10 label (best curve points)'], 2);
    rows.forEach(({ r, d, L }) => h += '<tr><td class="small">' + r[0] + '</td><td>' + r[1] + '</td>' + r.slice(2).map((x, i) => '<td class="num"' + (i === v ? ' style="font-weight:600"' : '') + '>' + x + '</td>').join('') + '<td class="num" style="color:' + (d > 0 ? 'var(--good)' : d < 0 ? 'var(--bad)' : 'var(--mute)') + '">' + sg(d) + '</td><td class="num small">' + (L ? (L.pts >= 0 ? '+' : '') + L.pts.toFixed(1) + ' (' + (L.pct >= 0 ? '+' : '') + L.pct.toFixed(1) + '%)' : '') + '</td></tr>');
    $('tb7').innerHTML = h + '</table>';
    const w = rows.filter(x => x.d > 0).length, l = rows.filter(x => x.d < 0).length, disagree = rows.filter(x => x.L && Math.sign(x.L.pts) !== Math.sign(x.d) && v === 2).length;
    const hl = RC.t7_headline;
    $('tb7n').innerHTML = 'This WSM checkpoint wins ' + w + ', loses ' + l + (rows.length - w - l ? ', ties ' + (rows.length - w - l) : '') + ' of 41 benchmarks against the WSD checkpoint. Figure 10 instead labels each benchmark with the best point of any merged curve against the best WSD point for that benchmark alone: ' + RC.fig10_pos + ' of 41 positive' + (v === 2 ? ', and ' + disagree + ' benchmarks change sign between the two views (ARC-c is +0.7 in Figure 10 and −0.7 here)' : '') + '. The headline benchmarks: MATH ' + hl.MATH.WSD + ' to ' + hl.MATH.mean + ' here (+' + hl.MATH.rel + '%), +' + hl.MATH.fig10.pts + ' points (+' + hl.MATH.fig10.pct + '%) in Figure 10; HumanEval +' + hl.HumanEval.rel + '% here, +' + hl.HumanEval.fig10.pct + '% there; MMLU-Pro +' + hl['MMLU-Pro'].rel + '% here, +' + hl['MMLU-Pro'].fig10.pct + '% there. The abstract\'s "+3.5% MATH, +2.9% HumanEval, +5.5% MMLU-Pro" takes the first from this table, the second from Figure 10, and the third matches Figure 10\'s MATH, not MMLU-Pro.';
  }
  function t89() {
    let h = '<table>' + th(['table', 'group', 'benchmarks', 'WSD printed', 'WSD recomputed', 'WSM printed', 'WSM recomputed'], 2);
    const A = RC.sft_avgs, groups = [...new Set(A.map(a => a.table + '|' + a.group))];
    groups.forEach(g => { const [t, gr] = g.split('|'), a = A.filter(x => x.table === t && x.group === gr), W = a.find(x => x.col === 'WSD'), M = a.find(x => x.col === 'WSM');
      const c = x => '<td class="num">' + x.recomputed.toFixed(2) + (x.ok ? '' : ' <span class="vd no">differs</span>') + '</td>';
      h += '<tr><td>' + t.replace('t', 'Table ') + '</td><td>' + gr.replace('Knowledge Basic', 'Basic').replace('Code Code', 'Code').replace('Math Elementary', 'Elementary').replace('Language Language', 'Language').replace('Reasoning Complex', 'Complex').replace('Agent Tool-use', 'Tool-use') + '</td><td class="num">' + W.n + '</td><td class="num">' + W.printed + '</td>' + c(W) + '<td class="num">' + M.printed + '</td>' + c(M) + '</tr>' });
    $('tb89').innerHTML = h + '</table>';
    const r = RC.reason; $('tb89n').innerHTML = A.filter(x => x.ok).length + ' of ' + A.length + ' printed group averages recompute from their rows. The two that do not are Table 9\'s Complex Reasoning: printed 63.21 and 64.94, but its ten rows average ' + r.WSD.all10 + ' and ' + r.WSM.all10 + ' (' + r.WSD.no_mle + ' and ' + r.WSM.no_mle + ' without Multi-LogiEval, where WSD scores 0.27 against WSM\'s 56.68, which looks like a failed evaluation run). Table 2\'s Reason column and the 60-benchmark overall use the printed averages, so the post-training comparison inherits whatever went wrong there.';
  }
  function f5(w) {
    const m = $('tbF5').value, H = 260;
    if (m === 'ab') {
      const A = FG.fig5a_constant['Overall Average Performance'], B = FG.fig5b_decay_merge['Overall Average Performance'];
      const f = frame({ W: w, H, pl: 36, pr: 10, pt: 34, pb: 32, x: [3900, 10200], y: [53, 63.5], yt: [54, 56, 58, 60, 62], xt: [4000, 6000, 8000, 10000], xf: v => (v / 1000) + 'T', xl: 'training tokens', yl: 'accuracy (%)' });
      const lg = legend([['constant, 5(a)', 'var(--mute)'], ['decay, 5(a)', 'var(--c2)'], ['decay, 5(b)', 'var(--c4)'], ['merge, 5(a)', 'var(--c1)'], ['Decay-then-Merge, 5(b)', 'var(--c3)']], 40, 14, w - 50);
      let s = f.s + lg.s + poly(A.constant.filter(p => p[0] >= 3900).map(p => [f.X(p[0]), f.Y(Math.max(53, p[1]))]), 'var(--mute)', { sw: 1, op: .7 });
      const grp = (D, c) => { const g = []; D.forEach(p => { const x = g.find(a => Math.abs(a[a.length - 1][0] - p[0]) < 30); if (x) x.push(p); else g.push([p]) }); g.forEach(a => { if (a[0][0] < 3900) return; s += poly(a.map(p => [f.X(p[0]), f.Y(p[1])]), c, { sw: 2 }); a.forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 2.6, c, { t: p[1].toFixed(2) + ' at ' + p[0] + 'B' })) }) };
      grp(A.Decay, 'var(--c2)'); grp(B.Decay, 'var(--c4)');
      A.Merge.filter(p => p[0] >= 3900).forEach(p => s += star(f.X(p[0]), f.Y(p[1]), 6, 'var(--c1)', 'merge ' + p[1].toFixed(2)));
      B['Decay-then-Merge'].forEach(p => s += star(f.X(p[0]), f.Y(p[1]), 6, 'var(--c3)', 'Decay-then-Merge ' + p[1].toFixed(2)));
      $('tbF5Svg').innerHTML = svgW(w, H, s, 'Figures 5(a) and 5(b)');
      $('tbF5n').innerHTML = 'Both figures plot the same constant-LR run (the two copies agree within ' + RC.fig5ab_constant_maxdiff + ' points) and 100B-token decays from the same milestones, but the decays end at ' + RC.fig5ab_decay.map(r => (r.tokens / 1000).toFixed(1) + 'T: ' + r.fig5a.toFixed(2) + ' in 5(a), ' + r.fig5b.toFixed(2) + ' in 5(b)').join('; ') + '. The paper does not explain the difference (a different annealing data mix in 5(b) would, unconfirmed). Against 5(b)\'s decays, 5(a)\'s merges would trail a real decay at every milestone; against 5(a)\'s, they match it. Decay-then-Merge ends within 0.3 points of the plain decay at each milestone (' + RC.fig5b.dtm.map((p, i) => (p[1] - RC.fig5b.decay_ends[i][1] >= 0 ? '+' : '') + (p[1] - RC.fig5b.decay_ends[i][1]).toFixed(2)).join(', ') + ').';
    } else {
      const C = FG.fig5c_merge_decay['Overall Average Performance'], f = frame({ W: w, H, pl: 36, pr: 10, pt: 34, pb: 32, x: [9990, 10110], y: [56, 63], yt: [56, 58, 60, 62], xt: [10000, 10025, 10050, 10075, 10100], xf: v => '+' + (v - 10000) + 'B', xl: 'tokens after the 10T checkpoint', yl: 'accuracy (%)' });
      const lg = legend([['decay from the 10T checkpoint', 'var(--c2)'], ['decay from a merge of 9.8T to 10T', 'var(--c1)']], 40, 14, w - 50);
      let s = f.s + lg.s; [['Decay', 'var(--c2)'], ['Merge-then-Decay', 'var(--c1)']].forEach(([k, c]) => { s += poly(C[k].map(p => [f.X(p[0]), f.Y(p[1])]), c, { sw: 2 }); C[k].forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 3, c, { t: k + ': ' + p[1].toFixed(2) })) });
      $('tbF5Svg').innerHTML = svgW(w, H, s, 'Figure 5(c)');
      $('tbF5n').innerHTML = 'Merge-then-Decay starts 3.0 points higher (' + RC.fig5c.mtd[0][1].toFixed(2) + ' against ' + RC.fig5c.decay[0][1].toFixed(2) + ') and ends 0.3 lower (' + RC.fig5c.mtd[4][1].toFixed(2) + ' against ' + RC.fig5c.decay[4][1].toFixed(2) + '): the head start does not survive the decay.';
    }
  }
  function params() { const p = RC.params, t6 = TB.t6.rows['Ling-mini'];
    $('tbP').innerHTML = '<table>' + th(['', 'Table 6', 'recounted from the Ling-mini-2.0 config']) + '<tr><td>total parameters</td><td class="num">' + t6[9] + '</td><td class="num">' + (p.total / 1e9).toFixed(3) + 'B</td></tr><tr><td>active per token</td><td class="num">' + t6[10] + '</td><td class="num">' + (p.active / 1e9).toFixed(3) + 'B</td></tr><tr><td>of which input and output embeddings (untied, vocabulary ' + p.vocab.toLocaleString('en-GB') + ')</td><td class="num">not stated</td><td class="num">' + (p.embeddings / 1e9).toFixed(3) + 'B</td></tr><tr><td>Hugging Face safetensors count</td><td></td><td class="num">' + p.hf_safetensors_total.toLocaleString('en-GB') + '</td></tr></table>';
    $('tbPn').innerHTML = 'Attention per layer: Q and O 2,048 × 2,048, K and V 2,048 × 512 (4 KV heads of 128), plus per-head Q/K norms; one dense SwiGLU layer of 5,120; 19 MoE layers of 257 SwiGLU experts of 512 (256 routed plus one shared) with a 256-way router and expert bias; RMSNorms. The recount equals the published checkpoint\'s parameter count exactly. Ling-mini-2.0 was released in September 2025 with the same shape; whether the paper\'s Ling-mini is the same run is not stated, and its LR (3.36e-4) and batch (4,400) differ from the paper\'s.' }
  function checks() { const C = RC.checks, ok = C.filter(c => c.ok).length;
    $('tbChkSum').innerHTML = ok + ' of ' + C.length + ' checks pass. The ones that fail are the findings discussed on The paper tab.';
    $('tbChk').innerHTML = th(['check', 'recomputed', 'printed', '']) + C.map(c => '<tr><td class="small">' + c.name + (c.note ? ' <span class="mute">(' + c.note + ')</span>' : '') + '</td><td class="num">' + c.got + '</td><td class="num">' + c.printed + '</td><td>' + (c.ok ? '<span class="vd ok">ok</span>' : '<span class="vd no">differs</span>') + '</td></tr>').join('') }
  onTab('t-tables', () => { t12(); t3(); fit($('tbF4Svg'), f4); t4(); t5(); t7(); t89(); fit($('tbF5Svg'), f5); params(); checks() });
  $('tbF4').addEventListener('change', () => refit($('tbF4Svg'))); $('tbF5').addEventListener('change', () => refit($('tbF5Svg')));
  $('tb7v').addEventListener('change', t7); $('tb7s').addEventListener('change', t7);
})();
