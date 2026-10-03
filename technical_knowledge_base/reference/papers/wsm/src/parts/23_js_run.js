// ---- The toy tab: precomputed seeds (window.TOYDATA, from toy_sweep.mjs) and a live run with the same engine ----
(function () {
  const TD = window.TOYDATA, RUNS = TD.runs; let LIVE = null, busy = false;
  const SH = { mean: 'mean', '1-sqrt': '1-sqrt', cosine: 'cosine', ema: 'EMA' }, NS = [4, 8, 12, 16, 20], NC = { 4: 'var(--c5)', 8: 'var(--c6)', 12: 'var(--c1)', 16: 'var(--c4)', 20: 'var(--c3)' };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1)) };
  const at = (a, b) => { const p = a.find(x => x[0] === b); return p ? p[1] : NaN };
  const minUpTo = (a, cap) => Math.min(...a.filter(p => p[0] <= cap).map(p => p[1]));
  function avgSeries(list) { return list[0].map((p, i) => [p[0], mean(list.map(a => a[i][1]))]) }
  function view() { const v = $('runView').value; if (v === 'live') return LIVE ? [LIVE] : RUNS; if (v === 'avg') return RUNS; return [RUNS[+v]] }
  function series(runs, get) { return runs.length === 1 ? get(runs[0]) : avgSeries(runs.map(get)) }
  const f5 = v => v.toFixed(4);
  // chart A: Figure 3 analogue
  function drawF3(w) {
    const runs = view(), sh = $('runShape').value, H = 300, lines = [];
    lines.push(['constant LR, live weights', 'var(--mute)', series(runs, r => r.cons), { sw: 1.6 }]);
    lines.push(['WSD 1-sqrt', 'var(--c2)', series(runs, r => r.wsd['1-sqrt']), { sw: 2.4 }]);
    lines.push(['WSD linear', 'var(--c2)', series(runs, r => r.wsd.mean), { sw: 1.2, da: '4 3', op: .7 }]);
    lines.push(['WSD cosine', 'var(--c2)', series(runs, r => r.wsd.cosine), { sw: 1.2, da: '1 3', op: .7 }]);
    NS.forEach(n => lines.push([SH[sh] + ' merge ' + n, NC[n], series(runs, r => r.merge[sh][n]), { sw: 1.8 }]));
    let lo = 1e9, hi = -1e9; lines.forEach(l => l[2].forEach(p => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]) }));
    lo = Math.max(0, lo - .002); hi = hi + .002; const step = hi - lo > .03 ? .01 : .005, yt = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yt.push(+v.toFixed(3));
    const lg = legend(lines.map(l => [l[0], l[1], l[3].da]), 46, 14, w - 56), top = 14 + lg.h;
    const f = frame({ W: w, H: H + lg.h, pl: 46, pr: 10, pt: top + 4, pb: 32, x: [0, 2050], y: [lo, hi], yt, yf: v => v.toFixed(3), xt: [0, 400, 800, 1200, 1600, 2000], xl: 'steps after the branch (100 steps = the paper\'s 25B tokens)', yl: 'excess loss' });
    let s = rc(f.X(1600), f.Y(hi), f.X(2050) - f.X(1600), f.Y(lo) - f.Y(hi), 'var(--dim)', { op: .35, r: 0 }) + f.s + lg.s;
    lines.forEach(([n, c, a, o]) => { s += poly(a.map(p => [f.X(p[0]), f.Y(p[1])]), c, o); if (!o.da && n.indexOf('constant') < 0) a.forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 2, c, { t: n + ': ' + f5(p[1]) + ' at step ' + p[0] })) });
    $('runF3').innerHTML = svgW(w, H + lg.h, s, 'Toy Figure 3: decay against merges');
    // text
    const c16 = runs.map(r => at(r.merge[sh][16], 1600)), w16 = runs.map(r => r.wsd['1-sqrt'].at(-1)[1]), cons = runs.map(r => at(r.cons, 1600));
    const d = c16.map((v, i) => v - w16[i]), wins = d.filter(x => x < 0).length;
    const best = runs.map(r => Math.min(...NS.map(n => Math.min(...r.merge[sh][n].map(p => p[1]))))), best1600 = runs.map(r => Math.min(...NS.map(n => minUpTo(r.merge[sh][n], 1600))));
    let t = '<b>At step 1,600</b> (WSD\'s end): live constant-LR weights ' + f5(mean(cons)) + ', WSD 1-sqrt ' + f5(mean(w16)) + ', ' + SH[sh] + ' merge of 16 ' + f5(mean(c16)) + '. ';
    if (runs.length > 1) t += 'The merge is lower in <b>' + wins + ' of ' + runs.length + '</b> seeds, by ' + f5(-mean(d)) + ' on average (paired standard deviation ' + f5(sd(d)) + ', so the standard error is ' + f5(sd(d) / Math.sqrt(runs.length)) + '), while the spread between seeds is ' + f5(sd(w16)) + ': the comparison only resolves because it is paired, as the paper\'s is. ';
    else t += 'Merge minus WSD: ' + (d[0] >= 0 ? '+' : '') + f5(d[0]) + '. ';
    t += '<b>Token budget:</b> the best of all ' + SH[sh] + ' merges is ' + f5(mean(best1600)) + ' up to step 1,600 (against ' + f5(mean(c16)) + ' for the fixed 16-checkpoint merge) and ' + f5(mean(best)) + ' if merges may run on to step 2,000, as Table 1\'s may: the extra steps, not the method, buy that last part.';
    $('runF3Out').innerHTML = t;
  }
  // chart B: window and granularity
  function drawWin(w) {
    const runs = view(), matched = $('runMatched').checked, cap = matched ? 1600 : 2000, H = 250, sh = ['mean', '1-sqrt', 'cosine', 'ema'], cols = { mean: 'var(--c1)', '1-sqrt': 'var(--c4)', cosine: 'var(--c6)', ema: 'var(--c5)' };
    const wins = [2, 4, 8, 12, 16, 20], vals = {};
    sh.forEach(m => vals[m] = wins.map(n => { const a = runs.map(r => { const s = r.merge[m][n].filter(p => p[0] <= cap); return s.length ? Math.min(...s.map(p => p[1])) : NaN }); return a.some(isNaN) ? NaN : mean(a) }));
    const wsd = { '1-sqrt': mean(runs.map(r => r.wsd['1-sqrt'].at(-1)[1])), linear: mean(runs.map(r => r.wsd.mean.at(-1)[1])), cosine: mean(runs.map(r => r.wsd.cosine.at(-1)[1])) };
    let lo = 1e9, hi = -1e9; sh.forEach(m => vals[m].forEach(v => { if (!isNaN(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v) } })); Object.values(wsd).forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v) });
    lo -= .002; hi += .002; const yt = []; const st = hi - lo > .03 ? .01 : .005; for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) yt.push(+v.toFixed(3));
    const lg = legend(sh.map(m => [SH[m] + ' merge', cols[m]]).concat([['WSD 1-sqrt', 'var(--c2)']]), 46, 14, w - 56);
    const f = frame({ W: w, H: H + lg.h, pl: 46, pr: 10, pt: 18 + lg.h, pb: 32, x: [0, 21], y: [lo, hi], yt, yf: v => v.toFixed(3), xt: wins, xl: 'checkpoints merged (merge duration = count × 100 steps)', yl: 'best excess loss' });
    let s = f.s + lg.s + ln2(46, f.Y(wsd['1-sqrt']), w - 10, f.Y(wsd['1-sqrt']), 'var(--c2)', { sw: 1.6, da: '5 3' });
    sh.forEach(m => { const pts = wins.map((n, i) => [n, vals[m][i]]).filter(p => !isNaN(p[1])); s += poly(pts.map(p => [f.X(p[0]), f.Y(p[1])]), cols[m], { sw: 2 }); pts.forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 3, cols[m], { t: SH[m] + ' merge ' + p[0] + ': ' + f5(p[1]) })) });
    $('runWin').innerHTML = svgW(w, H + lg.h, s, 'Toy Figure 4: best result by merge window');
    const order = sh.map(m => [m, Math.min(...vals[m].filter(v => !isNaN(v)))]).sort((a, b) => a[1] - b[1]);
    $('runWinOut').innerHTML = 'Longer windows help, with diminishing returns, for every shape (Merge 2 ' + f5(vals.mean[0]) + ', Merge 16 ' + f5(vals.mean[4]) + ' for the mean). Best by shape' + (matched ? ' at matched budget' : '') + ': ' + order.map(([m, v]) => SH[m] + ' ' + f5(v)).join(' &lt; ') + '. Real decays at step 1,600: 1-sqrt ' + f5(wsd['1-sqrt']) + ', linear ' + f5(wsd.linear) + ', cosine ' + f5(wsd.cosine) + '.';
    // granularity
    const g = runs[0].gran.map((x, i) => [x[0], x[1], mean(runs.map(r => r.gran[i][2]))]), H2 = 200;
    let lo2 = Math.min(...g.map(x => x[2]), wsd['1-sqrt']) - .003, hi2 = Math.max(...g.map(x => x[2])) + .003;
    const f2 = frame({ W: w, H: H2, pl: 46, pr: 10, pt: 26, pb: 32, x: [-.5, 4.5], y: [lo2, hi2], yt: [lo2, (lo2 + hi2) / 2, hi2].map(v => +v.toFixed(3)), yf: v => v.toFixed(3), xl: w < 560 ? '(interval, count): a 320-step span' : '(interval in steps, checkpoints), always a 320-step span ending at step 1,600' });
    let s2 = tx(46, 14, w < 560 ? 'Table 4 analogue (mean merge)' : 'Table 4 analogue: same span, finer or coarser (mean merge)', { fs: 12, w: 600 }) + f2.s; const bw = (f2.X(1) - f2.X(0)) * .6;
    g.forEach((x, i) => { s2 += rc(f2.X(i) - bw / 2, f2.Y(x[2]), bw, f2.Y(lo2) - f2.Y(x[2]), 'var(--c1)', { r: 2, op: .85 }) + tx(f2.X(i), f2.Y(x[2]) - 4, f5(x[2]), { fs: 11, a: 'middle' }) + tx(f2.X(i), H2 - 18, x[0] + ', ' + x[1], { fs: 11, a: 'middle', c: 'var(--mute)' }) });
    s2 += ln2(46, f2.Y(wsd['1-sqrt']), w - 10, f2.Y(wsd['1-sqrt']), 'var(--c2)', { sw: 1.6, da: '5 3' }) + tx(w - 12, f2.Y(wsd['1-sqrt']) - 4, 'WSD 1-sqrt, 1,600 steps', { fs: 11, a: 'end', c: 'var(--c2)' });
    $('runGran').innerHTML = svgW(w, H2, s2, 'Toy Table 4');
    $('runGranOut').innerHTML = 'Finer is slightly better and the single checkpoint is far worse, as in the paper\'s Table 4; but a 320-step span (the paper\'s 80B tokens) does not reach the decay, while a 1,500-step span (Merge 16) beats it: the span, not the count, carries the result.';
  }
  function drawEq() {
    const runs = view(), keys = runs[0].equiv.map(e => e.m + '|' + e.n);
    let h = '<tr><th>merge</th><th>window starts at step</th><th class="num">merged</th><th class="num">its decay run</th><th class="num">merged minus run</th><th class="num">distance between the two, as a share of how far the weights moved</th></tr>';
    keys.forEach((k, i) => { const es = runs.map(r => r.equiv[i]), m = es.map(e => e.merged), d = es.map(e => e.decayRun), df = es.map(e => e.merged - e.decayRun), rt = es.map(e => e.dist / e.moved);
      const pm = a => runs.length > 1 ? ' <span class="mute">± ' + sd(a).toFixed(4) + '</span>' : '';
      h += '<tr><td>' + SH[es[0].m] + ', ' + es[0].n + ' checkpoints</td><td>' + es[0].from + '</td><td class="num">' + f5(mean(m)) + '</td><td class="num">' + f5(mean(d)) + '</td><td class="num">' + (mean(df) >= 0 ? '+' : '') + f5(mean(df)) + pm(df) + '</td><td class="num">' + Math.round(mean(rt) * 100) + '%</td></tr>' });
    $('runEqT').innerHTML = h;
    const better = runs[0].equiv.map((e, i) => runs.filter(r => r.equiv[i].merged < r.equiv[i].decayRun).length);
    $('runEqOut').innerHTML = 'Not identical: the merged weights sit ' + Math.round(Math.min(...runs[0].equiv.map((e, i) => mean(runs.map(r => r.equiv[i].dist / r.equiv[i].moved)))) * 100) + '% to ' + Math.round(Math.max(...runs[0].equiv.map((e, i) => mean(runs.map(r => r.equiv[i].dist / r.equiv[i].moved)))) * 100) + '% of the way from the run they "equal", because a decayed run computes its later gradients at different weights. The merge scores better than its own decay run in ' + better.map((b, i) => b + '/' + runs.length + ' (' + SH[runs[0].equiv[i].m] + ' ' + runs[0].equiv[i].n + ')').join(', ') + (runs.length > 1 ? ' seeds' : '') + ': averaging also smooths the noise of the updates it reweights, which a decay run cannot do. ± is the standard deviation across seeds.';
  }
  function verdict() {
    const R = RUNS, d16 = R.map(r => at(r.merge.mean[16], 1600) - r.wsd['1-sqrt'].at(-1)[1]), raw = R.map(r => at(r.cons, 1600) - at(r.merge.mean[16], 1600));
    const shapeBest = m => mean(R.map(r => Math.min(...[2, 4, 8, 12, 16].map(n => minUpTo(r.merge[m][n], 1600)))));
    const sq = shapeBest('1-sqrt'), mn = shapeBest('mean'), em = shapeBest('ema');
    const li = [
      ['ok', 'reproduces', 'Merging beats a matched decay: a 16-checkpoint mean merge at step 1,600 is below WSD 1-sqrt in ' + d16.filter(x => x < 0).length + ' of 8 seeds (mean ' + f5(-mean(d16)) + ', paired standard error ' + f5(sd(d16) / Math.sqrt(8)) + '). The paper\'s direction, from one run, holds here with eight.'],
      ['ok', 'reproduces', 'Merging recovers what decay buys over the raw run: the merge is ' + f5(mean(raw)) + ' below the live constant-LR weights, about ' + Math.round(mean(raw) / mean(R.map(r => at(r.cons, 1600))) * 100) + '% of their excess loss (Figure 3: about 3.5 points of accuracy).'],
      ['ok', 'reproduces', 'Merge duration dominates; the interval matters little at a fixed span, and one checkpoint is much worse (Figure 4, Table 4).'],
      ['no', 'does not reproduce', 'The paper\'s shape ranking (1-sqrt ahead of mean, EMA last): here the best mean merge (' + f5(mn) + ') beats 1-sqrt (' + f5(sq) + ') and the EMA of Figure 2(a) is close to the mean (' + f5(em) + '). This agrees with the paper\'s own data at matched tokens (mean 63.85 against 1-sqrt 63.49), not with its Table 3. The paper never states its experimental EMA coefficient, so its EMA may differ from Figure 2(a)\'s.'],
      ['mid', 'approximate', 'The "identical to a decay" claim: the merge is not its decay run (17% to 36% apart), and is usually the better of the two. Merging is a reweighting of the updates actually taken, which is exactly what Eq. 4 says and no more.']];
    $('runVerdict').innerHTML = li.map(([c, t, x]) => '<li><span class="vd ' + c + '">' + t + '</span> ' + x + '</li>').join('');
    $('runPre').textContent = RUNS[0].pre.filter((p, i) => i % 4 === 3).map(p => 'step ' + p[0] + ': ' + f5(p[1])).join(', ') + ' (seed 1).';
  }
  function all() { refit($('runF3')); refit($('runWin')); drawEq() }
  onTab('t-run', () => { fit($('runF3'), drawF3); fit($('runWin'), drawWin); drawEq(); verdict() });
  ['runView', 'runShape'].forEach(id => $(id).addEventListener('change', all)); $('runMatched').addEventListener('change', () => refit($('runWin')));
  $('runReset').addEventListener('click', () => { $('runSeed').value = 1; $('runLr').value = '0.005' });
  $('runGo').addEventListener('click', () => {
    if (busy) return; busy = true; const go = $('runGo'); go.disabled = true;
    const seed = Math.max(1, Math.min(999, Math.round(+$('runSeed').value || 1))), peak = +$('runLr').value, it = TOY.experiment({ seed, peak }), t0 = performance.now();
    $('runSeed').value = seed;
    const pump = () => { const t1 = performance.now(); let r;
      while (!(r = it.next()).done && performance.now() - t1 < 40) {}
      if (!r.done) { $('runProg').textContent = 'Training: ' + Math.round(r.value * 100) + '%'; setTimeout(pump, 0); return }
      LIVE = r.value; busy = false; go.disabled = false;
      $('runProg').textContent = 'Done in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s: seed ' + seed + ', peak LR ' + peak + '. Showing your live run.';
      const ix = TD.seeds.indexOf(seed), rep = $('runRepro');
      if (ix >= 0 && Math.abs(peak - TD.defaults.peak) < 1e-12) { const A = RUNS[ix]; let worst = 0;
        Object.keys(A.merge).forEach(m => Object.keys(A.merge[m]).forEach(n => A.merge[m][n].forEach((p, i) => { worst = Math.max(worst, Math.abs(p[1] - LIVE.merge[m][n][i][1])) })));
        Object.keys(A.wsd).forEach(k => A.wsd[k].forEach((p, i) => { worst = Math.max(worst, Math.abs(p[1] - LIVE.wsd[k][i][1])) }));
        $('runCard').dataset.repro = worst; rep.hidden = false;
        rep.innerHTML = 'Reproduces the precomputed seed ' + seed + ' (toy_sweep.mjs): largest difference over ' + (Object.keys(A.merge).length * 6) + ' merge curves and 3 decay curves is ' + (worst < 1e-5 ? 'below 10<sup>−5</sup> (the stored values are rounded to 5 decimals)' : worst.toExponential(2)) + '.' }
      else { rep.hidden = false; rep.innerHTML = 'A new run, not in the precomputed set: compare it with the eight seeds by switching <i>Show</i>.'; $('runCard').dataset.repro = 0 }
      $('runView').value = 'live'; all() };
    setTimeout(pump, 0);
  });
})();
