// ---- The paper tab: diagrams and charts (data from window.PAPER: tables.json, figs and recompute.json) ----
(function () {
  const TB = PAPER.tables, RC = PAPER.rc;
  const C = { eh: 'var(--c1)', og: 'var(--c2)', gen: 'var(--mute)', no: 'var(--dim)' };

  // Tables 7 and 4 as HTML
  $('splitT').innerHTML = TB.t7.rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('');
  const rl = RC.rl, t4 = TB.t4.rows;
  $('rlT').innerHTML = ['Original Envs', 'EnvHarness Envs'].map((k, i) => {
    const r = t4[k], a = rl['In-Dist (seen)'], b = rl['OOD (unseen)'];
    return '<tr><td>' + k + '</td><td class="num">' + r[0] + ' <span class="mute small">(' + (i ? a.eh : a.orig) + '/140)</span></td><td class="num">' + r[1] + ' <span class="mute small">(' + (i ? b.eh : b.orig) + '/134)</span></td><td class="num">' + r[2] + '</td><td class="num">' + r[3] + '</td><td class="num">' + r[4] + '</td></tr>';
  }).join('');

  // ---- the stack diagram: one step() through Chain > Contract > Stage > base env ----
  function stack(w) {
    const narrow = w < 560, H = narrow ? 412 : 310, lx = narrow ? 10 : 150, bw = w - lx - 10;
    let s = '';
    const rows = [
      ['Policy π (black box)', 'calls reset() and step(a) on the outermost layer only', 'var(--soft)'],
      ['Chain (Link)', 'runs E until it ends, then E_ext; one budget; R′ = R_A ∧ R_B', 'var(--acc2)'],
      ['Contract (Rules)', 'f_A on the way down (rewrite or block a); f_T and f_O on the way up', 'var(--acc2)'],
      ['Stage (Setup)', 'reset(): base reset, then replay δ through inner.step()', 'var(--acc2)'],
      ['Base environment (frozen)', 'its own transitions T, tasks and verifier R, untouched', 'var(--open2)']];
    const rh = narrow ? 58 : 44, gap = narrow ? 16 : 16;
    rows.forEach((r, i) => {
      const y = 8 + i * (rh + gap);
      s += rc(lx, y, bw, rh, r[2], { s: 'var(--line)' });
      s += tx(lx + 10, y + 19, r[0], { fs: 13, w: 600 });
      if (narrow) { const words = r[1].split(' '); let l1 = '', l2 = ''; words.forEach(x => { if ((l1 + ' ' + x).length * 6.3 < bw - 20 && !l2) l1 += (l1 ? ' ' : '') + x; else l2 += (l2 ? ' ' : '') + x }); s += tx(lx + 10, y + 36, l1, { fs: 11.5, c: 'var(--mute)' }) + tx(lx + 10, y + 50, l2, { fs: 11.5, c: 'var(--mute)' }) }
      else s += tx(lx + 10, y + 36, r[1], { fs: 12, c: 'var(--mute)' });
      if (i < rows.length - 1) {
        const ay = y + rh, ax1 = lx + bw * 0.86, ax2 = lx + bw * 0.94;
        s += '<line x1="' + ax1 + '" y1="' + ay + '" x2="' + ax1 + '" y2="' + (ay + gap) + '" stroke="var(--c1)" stroke-width="1.6" marker-end="MARK"/>';
        s += '<line x1="' + ax2 + '" y1="' + (ay + gap) + '" x2="' + ax2 + '" y2="' + ay + '" stroke="var(--c3)" stroke-width="1.6" marker-end="MARK"/>';
      }
    });
    if (!narrow) {
      s += tx(10, 30, 'step(a) goes down', { fs: 12, c: 'var(--c1)' }) + tx(10, 46, 'through each layer,', { fs: 12, c: 'var(--c1)' });
      s += tx(10, 96, 'the response and', { fs: 12, c: 'var(--c3)' }) + tx(10, 112, 'observation come', { fs: 12, c: 'var(--c3)' }) + tx(10, 128, 'back up', { fs: 12, c: 'var(--c3)' });
      s += tx(10, 200, 'evaluate() passes', { fs: 12 }) + tx(10, 216, 'straight through to', { fs: 12 }) + tx(10, 232, 'the base verifier', { fs: 12 });
    } else s += tx(10, H - 20, 'Blue: step(a) going down.', { fs: 11, c: 'var(--c1)' }) + tx(10, H - 5, 'Green: response and observation coming back up.', { fs: 11, c: 'var(--c3)' });
    $('stkSvg').innerHTML = svgEl(w, H, s, 'The EnvHarness stack');
  }

  // ---- the EnvRigger loop ----
  function rig(w) {
    const narrow = w < 560;
    const names = [['Observe', 'K = 5 rollouts of π', 'on the base task'], ['Diagnose', 'root causes, and a', 'direction: easier or harder'], ['Write', 'Stage and/or Contract', 'as code (a candidate)'], ['Validate', 'K = 5 fresh rollouts', 'accept, refine or reject']];
    let s = '', H;
    if (!narrow) {
      const bw = (w - 20 - 3 * 34) / 4, y = 30, bh = 64; H = 160;
      names.forEach((n, i) => { const x = 10 + i * (bw + 34); s += bx(x, y, bw, bh, '', [n[0], n[1], n[2]], 12).replace('class=""', 'fill="var(--acc2)" stroke="var(--line)"'); if (i < 3) s += ar(x + bw + 3, y + bh / 2, x + bw + 31, y + bh / 2) });
      const xv = 10 + 3 * (bw + 34), xw = 10 + 2 * (bw + 34);
      s += '<path d="M' + (xv + bw / 2) + ',' + (y + bh) + ' C' + (xv + bw / 2) + ',' + (y + bh + 40) + ' ' + (xw + bw / 2) + ',' + (y + bh + 40) + ' ' + (xw + bw / 2) + ',' + (y + bh + 4) + '" fill="none" stroke="var(--c2)" stroke-width="1.5" marker-end="MARK"/>';
      s += tx((xv + xw + bw) / 2, y + bh + 50, 'refine: back to Write with the new rollouts (at most 5 rounds)', { fs: 12, a: 'middle', c: 'var(--c2)' });
      s += tx(xv + bw / 2, y - 10, 'accept: add to the EnvHarness', { fs: 12, a: 'middle', c: 'var(--good)' });
    } else {
      const bw = w - 60, bh = 50; H = 4 * (bh + 22) + 40;
      names.forEach((n, i) => { const y = 8 + i * (bh + 22); s += bx(10, y, bw, bh, '', [n[0], n[1] + '; ' + n[2]], 11.5).replace('class=""', 'fill="var(--acc2)" stroke="var(--line)"'); if (i < 3) s += ar(10 + bw / 2, y + bh + 2, 10 + bw / 2, y + bh + 20) });
      const yv = 8 + 3 * (bh + 22), yw = 8 + 2 * (bh + 22);
      s += '<path d="M' + (10 + bw) + ',' + (yv + bh / 2) + ' C' + (w - 6) + ',' + (yv + bh / 2) + ' ' + (w - 6) + ',' + (yw + bh / 2) + ' ' + (10 + bw + 2) + ',' + (yw + bh / 2) + '" fill="none" stroke="var(--c2)" stroke-width="1.5" marker-end="MARK"/>';
      s += tx(10, H - 8, 'Orange: refine loops back to Write, at most 5 rounds.', { fs: 11, c: 'var(--c2)' });
    }
    $('rigSvg').innerHTML = svgEl(w, H, s, 'The EnvRigger loop');
  }

  // ---- every Table 2 and 3 gain against its noise (revealed by the first predict question) ----
  function noise(w) {
    const N = RC.noise, rh = 34, top = 22, H = top + N.length * rh + 30, pl = 10, pr = 14;
    const vals = N.map(x => x.col.indexOf('AS') >= 0 ? -x.diff : x.diff);
    const lo = Math.min(-6, ...N.map((x, i) => vals[i] - 2 * x.se)), hi = Math.max(14, ...N.map((x, i) => vals[i] + 2 * x.se));
    const X = v => pl + (w - pl - pr) * (v - lo) / (hi - lo);
    let s = '';
    for (let v = Math.ceil(lo / 5) * 5; v <= hi; v += 5) s += ln2(X(v), top - 6, X(v), H - 26, 'var(--line)') + tx(X(v), H - 10, (v > 0 ? '+' : '') + v, { fs: 11, a: 'middle', c: 'var(--mute)' });
    s += ln2(X(0), top - 6, X(0), H - 26, 'var(--mute)', { sw: 1.4 });
    N.forEach((x, i) => {
      const y = top + i * rh, v = vals[i], sig = Math.abs(x.t) >= 2, col = v - 2 * x.se > 0 ? 'var(--good)' : 'var(--c2)';
      s += tx(pl, y + 2, x.table.replace('Table ', 'T') + ' ' + x.col.replace(' (lower is better)', ' (fewer steps)') + ': ' + (v > 0 ? '+' : '') + v.toFixed(2) + ', t = ' + Math.abs(x.t).toFixed(2), { fs: 11 });
      s += rc(Math.min(X(0), X(v)), y + 8, Math.abs(X(v) - X(0)), 9, col, { r: 2, op: .85 });
      s += ln2(X(v - 2 * x.se), y + 12.5, X(v + 2 * x.se), y + 12.5, 'var(--ink)', { sw: 1.2 }) + ln2(X(v - 2 * x.se), y + 8, X(v - 2 * x.se), y + 17, 'var(--ink)') + ln2(X(v + 2 * x.se), y + 8, X(v + 2 * x.se), y + 17, 'var(--ink)');
    });
    $('noiseSvg').innerHTML = svgW(w, H, s, 'Every gain in Tables 2 and 3 with plus or minus two standard errors');
    const S = RC.noise_summary;
    $('noiseCap').innerHTML = 'EnvHarness minus Original Envs, in points (average steps flipped so that right is better), with ±2 standard errors of the difference from the three-run standard deviations. Green: the whole whisker is above zero. ' + S.over_2se + ' of ' + S.n + ' gains reach 2 standard errors; ' + S.p_below_05 + ' reach p &lt; 0.05 on a Welch test (2 to 4 degrees of freedom).';
  }
  PRED_REVEAL.pq1 = () => fit($('noiseSvg'), noise);

  // ---- Figure 5 redrawn from the decoded vector paths ----
  let f5m = 'pct';
  function f5(w) {
    const F = RC.fig5, T = RC.fig5_tasks, xs = [0, 50, 100, 150, 200, 250, 300], tasks = f5m === 'tasks';
    const ser = [['EnvHarness envs', C.eh, 'EnvHarness'], ['Original envs', C.og, 'Original'], ['Generated envs (SWE-smith)', C.gen, 'SWE-smith']];
    const H = 300, pl = 44, pr = w < 520 ? 12 : 120, pt = 14, pb = 40;
    const y0 = tasks ? 192 : 47, y1 = tasks ? 226 : 55.5;
    const X = v => pl + (w - pl - pr) * v / 300, Y = v => pt + (H - pt - pb) * (1 - (v - y0) / (y1 - y0));
    let s = '';
    const step = tasks ? 4 : 1;
    for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) s += ln2(pl, Y(v), w - pr, Y(v), 'var(--line)') + tx(pl - 6, Y(v) + 4, v, { fs: 11, a: 'end', c: 'var(--mute)' });
    xs.forEach(x => { s += tx(X(x), H - pb + 16, x, { fs: 11, a: 'middle', c: 'var(--mute)' }) });
    s += tx((pl + w - pr) / 2, H - 6, 'Number of environments', { fs: 11, a: 'middle', c: 'var(--mute)' });
    s += '<text x="12" y="' + ((pt + H - pb) / 2) + '" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 ' + ((pt + H - pb) / 2) + ')">' + (tasks ? 'Tasks solved of 407' : 'Resolved rate (%)') + '</text>';
    const ends = [];
    ser.forEach(([k, c, nm]) => {
      const v = tasks ? T[k] : F[k];
      s += '<polyline fill="none" stroke="' + c + '" stroke-width="2.2" points="' + v.map((y, i) => X(xs[i]).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ') + '"/>';
      v.forEach((y, i) => { s += '<circle cx="' + X(xs[i]).toFixed(1) + '" cy="' + Y(y).toFixed(1) + '" r="3.2" fill="' + c + '"><title>' + nm + ', ' + xs[i] + ' environments: ' + (tasks ? y + ' tasks' : y.toFixed(2) + '% (' + T[k][i] + '/407)') + '</title></circle>' });
      ends.push({ y: Y(v[6]), c, n: nm + ' ' + (tasks ? v[6] : v[6].toFixed(2)), how: '' });
    });
    if (w >= 520) s += endLabels(ends, w - pr + 8, 15);
    // the gap at 100 and at 300, in tasks
    [2, 6].forEach(i => { const a = T['EnvHarness envs'][i], b = T['Original envs'][i]; const ya = Y(tasks ? a : F['EnvHarness envs'][i]), yb = Y(tasks ? b : F['Original envs'][i]); s += ln2(X(xs[i]) + (i === 6 ? -10 : 10), ya, X(xs[i]) + (i === 6 ? -10 : 10), yb, 'var(--ink)', { da: '3 3' }) + tx(X(xs[i]) + (i === 6 ? -14 : 14), (ya + yb) / 2 + 4, '+' + (a - b) + ' tasks', { fs: 11, a: i === 6 ? 'end' : 'start' }) });
    $('f5Svg').innerHTML = svgW(w, H, s, 'Figure 5 redrawn');
    const G = RC.fig5_gain_100_300_tasks;
    $('f5Cap').innerHTML = (w < 520 ? 'Blue: EnvHarness; orange: original environments (SWE-bench Lite); grey: SWE-smith. ' : 'Original: the unmodified SWE-bench Lite environments. ') + 'Decoded from the vector ' + A(PAPER.meta.ax + '#S5.F5', 'Figure 5') + ' (every point is a whole number of the 407 test issues, to 0.0002 of a task). From 100 to 300 environments: EnvHarness +' + G['EnvHarness envs'] + ' tasks, original +' + G['Original envs'] + ', SWE-smith +' + G['Generated envs (SWE-smith)'] + '. The gap is ' + RC.fig5_gap_tasks['100'] + ' tasks at 100 environments and ' + RC.fig5_gap_tasks['300'] + ' at 300. No error bars: each point is one evaluation.';
  }
  segBind('f5M', m => { f5m = m; $('f5M').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false')); refit($('f5Svg')) });

  // ---- Table 9 / Figure 6: four policies ----
  let xmm = 'sr';
  function xm(w) {
    const t = TB.t9, ms = t.models, ks = ['No Skills', 'Original Envs', 'EnvHarness Envs'], cs = [C.no, C.og, C.eh], j = xmm === 'sr' ? 0 : 1;
    const H = 250, pl = 34, pr = 8, pt = 22, pb = 46, gw = (w - pl - pr) / 4, bw = Math.min(30, (gw - 18) / 3);
    const ymax = j ? 80 : 80, Y = v => pt + (H - pt - pb) * (1 - v / ymax);
    let s = '';
    for (let v = 0; v <= ymax; v += 20) s += ln2(pl, Y(v), w - pr, Y(v), 'var(--line)') + tx(pl - 5, Y(v) + 4, v, { fs: 11, a: 'end', c: 'var(--mute)' });
    ms.forEach((m, i) => {
      const gx = pl + i * gw + (gw - 3 * bw - 8) / 2;
      ks.forEach((k, q) => { const v = parseFloat(t.rows[k][i][j]); const x = gx + q * (bw + 4); s += rc(x, Y(v), bw, Y(0) - Y(v), cs[q], { r: 2 }) + (bw >= 26 ? tx(x + bw / 2, Y(v) - 4, t.rows[k][i][j], { fs: 11, a: 'middle' }) : '') + '<title>' + m + ', ' + k + ': ' + t.rows[k][i][j] + '</title>' });
      const nm = m.replace('Gemini ', 'Gemini ').split(' ');
      const l1 = nm.slice(0, nm.length > 2 ? 2 : 1).join(' '), l2 = nm.slice(nm.length > 2 ? 2 : 1).join(' ');
      s += tx(pl + i * gw + gw / 2, H - pb + 16, l1, { fs: 11, a: 'middle' }) + tx(pl + i * gw + gw / 2, H - pb + 30, l2, { fs: 11, a: 'middle' });
    });
    const lg = legend([['No skills', C.no], ['Original envs', C.og], ['EnvHarness envs', C.eh]], pl, 12, w - pl);
    s += lg.s;
    $('xmSvg').innerHTML = svgW(w, H, s, 'Table 9 as bars');
    const g = RC.t9_gains;
    $('xmCap').innerHTML = j ? 'Average steps per episode (lower is shorter, not necessarily better). Values from Table 9.' : 'Success rate on SWE-bench Verified. EnvHarness minus original-environment skills: ' + Object.keys(g).map(k => k + ' +' + g[k].toFixed(1)).join(', ') + ' points (about 4 tasks of 407 per point). Values from Table 9; the bars of Figure 6 decode to the same numbers.' + (bw < 26 ? ' Hover or tap a bar for its value.' : '');
  }
  segBind('xmM', m => { xmm = m; $('xmM').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false')); refit($('xmSvg')) });

  // ---- P(measured rate in [0.4, 0.6]) against the true rate, for K = 3, 5, 10 ----
  function binom(K, p) { let s = 0; for (let x = 0; x <= K; x++) { const r = x / K; if (r >= 0.4 - 1e-9 && r <= 0.6 + 1e-9) { let c = 1; for (let i = 0; i < x; i++) c = c * (K - i) / (i + 1); s += c * Math.pow(p, x) * Math.pow(1 - p, K - x) } } return s }
  window.BAND = binom;
  function band(w) {
    const H = 250, pl = 40, pr = 12, pt = 14, pb = 38, X = p => pl + (w - pl - pr) * p, Y = v => pt + (H - pt - pb) * (1 - v);
    let s = '';
    for (let v = 0; v <= 1.001; v += .2) s += ln2(pl, Y(v), w - pr, Y(v), 'var(--line)') + tx(pl - 5, Y(v) + 4, Math.round(v * 100) + '%', { fs: 11, a: 'end', c: 'var(--mute)' });
    for (let p = 0; p <= 1.001; p += .2) s += tx(X(p), H - pb + 16, p.toFixed(1), { fs: 11, a: 'middle', c: 'var(--mute)' });
    s += tx((pl + w - pr) / 2, H - 6, 'True success rate p of the task', { fs: 11, a: 'middle', c: 'var(--mute)' });
    s += rc(X(.4), pt, X(.6) - X(.4), H - pt - pb, 'var(--acc2)', { r: 0, op: .5 });
    s += ln2(pl, Y(.8), w - pr, Y(.8), 'var(--c2)', { sw: 1.6, da: '5 4' }) + tx(w - pr - 4, Y(.8) - 5, 'Table 12 reports 80.0% in band', { fs: 11, a: 'end', c: 'var(--c2)' });
    [[5, 'var(--c3)'], [10, 'var(--c1)']].forEach(([K, c]) => {
      let pts = [];
      for (let i = 0; i <= 200; i++) { const p = i / 200; pts.push(X(p).toFixed(1) + ',' + Y(binom(K, p)).toFixed(1)) }
      s += '<polyline fill="none" stroke="' + c + '" stroke-width="2" points="' + pts.join(' ') + '"/>';
    });
    const m10 = binom(10, .5);
    s += '<circle cx="' + X(.5) + '" cy="' + Y(m10) + '" r="4" fill="var(--c1)"/>' + tx(X(.62), Y(m10) + 4, 'K = 10 peaks at ' + (100 * m10).toFixed(1) + '%', { fs: 11, c: 'var(--c1)' });
    s += legend([['K = 5', 'var(--c3)'], ['K = 10', 'var(--c1)']], pl + 4, pt + 14, w - pl).s;
    $('bandSvg').innerHTML = svgW(w, H, s, 'Chance of measuring a success rate inside the band');
  }
  PRED_REVEAL.pq3 = () => fit($('bandSvg'), band);

  PRED_REVEAL.pq2 = () => fit($('f5Svg'), f5);
  onTab('t-read', () => { fit($('stkSvg'), stack); fit($('rigSvg'), rig); fit($('xmSvg'), xm) });
})();
