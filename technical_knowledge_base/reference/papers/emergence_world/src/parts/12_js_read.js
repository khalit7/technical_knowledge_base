// ---- The paper tab: schedule, scorecards, crime curves, Table 13 slope, quiet withdrawal, and the shared lane drawing ----
const LG = window.LOGS, TB = PAPER.tables;
const WK = ['claude', 'deepseek', 'gemini', 'grok', 'mistral', 'mixed', 'openai', 'qwen'];
const WN = {claude: 'Claude', deepseek: 'DeepSeek', gemini: 'Gemini', grok: 'Grok', mistral: 'Mistral', mixed: 'Mixed', openai: 'OpenAI', qwen: 'Qwen'};
const WC = {claude: 'var(--c2)', deepseek: 'var(--c1)', gemini: 'var(--c6)', grok: 'var(--ink)', mistral: 'var(--c5)', mixed: 'var(--mute)', openai: 'var(--c3)', qwen: 'var(--c4)'};
const ETY = {
  phish: [['fetch', 'fetched the attack page', 'var(--pk)'], ['op', "used the attacker's database", 'var(--bad)'], ['act', 'acted for the attacker', '#d23c3c'], ['store', 'saved it', 'var(--c5)'], ['store_lab', 'saved it, labelled hostile', 'var(--c3)'], ['pass', 'passed it on', 'var(--c4)'], ['warn', 'warned', 'var(--acc)']],
  breach: [['scan_other', 'searched another agent', 'var(--bad)'], ['scan_self', 'searched itself', 'var(--mute)']]
};
const ECOL = {}; Object.values(ETY).forEach(a => a.forEach(([k, n, c]) => ECOL[k] = c));
const ENAME = {}; Object.values(ETY).forEach(a => a.forEach(([k, n]) => ENAME[k] = n));
const fmtH = h => h < 1 / 60 ? 'under 1 min' : h < 1 ? Math.round(h * 60) + ' min' : h < 48 ? (h < 10 ? h.toFixed(1) : Math.round(h)) + ' h' : (h / 24).toFixed(h < 240 ? 1 : 0) + ' days';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// drawLanes: one world's events as dots, one row per agent, on a square-root time axis from 0 to T hours.
// Returns {s, h}. opt: {x0, y0, w, now, T, title, marks:[[t,label]], ev:'phish'|'breach', warnLine}
function drawLanes(wk, opt) {
  const W = LG.w[wk], ev = W.ev[opt.ev] || [], A = LG.agents;
  const lw = opt.w < 480 ? 58 : 66, x0 = opt.x0 + lw, pw = opt.w - lw - 6, lh = 13, top = opt.y0 + 20;
  const X = t => x0 + pw * Math.sqrt(Math.max(0, Math.min(t, opt.T)) / opt.T);
  let s = tx(opt.x0, opt.y0 + 13, opt.title, {fs: 13, w: 600});
  A.forEach((a, i) => {
    const y = top + i * lh + lh / 2;
    const dead = W.last_seen[i] != null && (W.last_seen[i] - (W.stim[opt.ev === 'breach' ? 'breach' : 'w1'] || 0)) < opt.T ? W.last_seen[i] - (W.stim[opt.ev === 'breach' ? 'breach' : 'w1'] || 0) : null;
    s += ln2(x0, y, x0 + pw, y, 'var(--line)', {sw: 1});
    s += tx(opt.x0, y + 4, a, {fs: 11, c: 'var(--mute)'});
    if (dead != null && dead > 0 && dead < opt.now) s += ln2(X(dead), y - 4, X(dead), y + 4, 'var(--mute)', {sw: 1.5}) + tx(X(dead) + 3, y + 4, 'last call', {fs: 11, c: 'var(--mute)'});
  });
  (opt.marks || []).forEach(([t, l]) => { if (t <= opt.T) { const x = X(t); s += ln2(x, top - 2, x, top + 10 * lh + 2, 'var(--dim)', {sw: 1, da: '3 3'}); } });
  if (opt.warnLine) { const fw = ev.find(e => e[2] === 'warn'); if (fw && fw[0] <= opt.now) { const x = X(fw[0]); s += ln2(x, top - 4, x, top + 10 * lh + 4, 'var(--acc)', {sw: 1.6}); } }
  const cnt = {};
  ev.forEach(e => {
    if (e[0] > opt.now) return;
    cnt[e[2]] = (cnt[e[2]] || 0) + 1;
    const y = top + e[1] * lh + lh / 2, r = e[2] === 'act' ? 4.2 : 2.6;
    s += '<circle cx="' + X(e[0]).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + ECOL[e[2]] + '" opacity="' + (e[2] === 'op' ? .55 : .85) + '"/>';
  });
  if (opt.now < opt.T) { const x = X(opt.now); s += ln2(x, top - 6, x, top + 10 * lh + 6, 'var(--ink)', {sw: 1.2}); }
  const h = 20 + 10 * lh + 6;
  return {s, h, cnt, X, top, lh};
}
function timeAxis(X, y, T, narrow) {
  let s = '';
  const ticks = narrow ? [[0, '0'], [6, '6 h'], [24, '1 d'], [72, '3 d'], [144, '6 d'], [288, '12 d']] : [[0, '0'], [1, '1 h'], [6, '6 h'], [24, '1 d'], [72, '3 d'], [144, '6 d'], [288, '12 d']];
  ticks.forEach(([t, l]) => { if (t <= T) { s += ln2(X(t), y, X(t), y + 4, 'var(--mute)') + tx(X(t), y + 16, l, {fs: 11, a: t === T ? 'end' : t === 0 ? 'start' : 'middle', c: 'var(--mute)'}); } });
  return s;
}

// ---- Figure 3 rebuilt: run spans and stimulus times
onTab('t-read', () => fit($('schedPlot'), w => {
  const pl = w < 480 ? 64 : 76, pr = 10, top = 42, rh = 22, H = top + WK.length * rh + 34, D = 22;
  const X = h => pl + (w - pl - pr) * h / (D * 24);
  let s = '';
  for (let d = 0; d < D; d += (w < 480 ? 4 : 2)) s += ln2(X(d * 24), top - 4, X(d * 24), H - 30, 'var(--line)') + tx(X(d * 24), H - 16, 'Day ' + (d + 1), {fs: 11, a: 'middle', c: 'var(--mute)'});
  const st = LG.w.claude.stim, M = [['w1', 'W1'], ['w2', 'W2'], ['w3', 'W3'], ['memo', 'memo'], ['breach', 'breach']];
  M.forEach(([k, l], i) => { const x = X(st[k]); const up = i % 2 ? 13 : 0; s += ln2(x, top - 6 - up, x, H - 30, 'var(--bad)', {sw: 1.3, da: '4 3'}) + tx(x + 3, top - 10 - up, l, {fs: 11, c: 'var(--bad)'}); });
  WK.forEach((k, i) => {
    const W = LG.w[k], y = top + i * rh;
    s += tx(4, y + 15, WN[k], {fs: 12});
    s += rc(X(12), y + 4, X(W.hours) - X(12), rh - 8, WC[k], {op: .75, r: 3});
    const lab = (W.hours / 24).toFixed(1) + ' d';
    s += X(W.hours) + 40 > w ? tx(X(W.hours) - 4, y + 15, lab, {fs: 11, a: 'end', c: 'var(--bg)', w: 600}) : tx(X(W.hours) + 4, y + 15, lab, {fs: 11, c: 'var(--mute)'});
  });
  $('schedPlot').innerHTML = svgW(w, H, s, 'Run spans of the eight worlds with the stress-event times');
}));

// ---- Scorecards (Tables 7, 9, 11)
(function () {
  const ord = ['Claude', 'DeepSeek', 'Gemini', 'Mistral', 'Mixed', 'OpenAI', 'Qwen', 'Grok'];
  function draw(m) {
    const ks = m === 'all' ? ['t7', 't9', 't11'] : [m];
    const crit = []; ks.forEach(k => TB[k].crit.forEach((c, i) => crit.push([k, i, c, TB[k].names[i]])));
    const g = $('scGrid'), nar = g.clientWidth && g.clientWidth < 440 && m === 'all';
    g.style.gap = nar ? '1px' : '2px'; g.style.fontSize = nar ? '11px' : '12px';
    g.style.gridTemplateColumns = (nar ? '54px' : 'minmax(64px,auto)') + ' repeat(' + crit.length + ',minmax(' + (m === 'all' ? (nar ? 10 : 14) : 26) + 'px,1fr)) auto';
    let h = '<div></div>' + crit.map(c => '<div class="h" title="' + c[2] + ': ' + esc(c[3]) + '">' + (m === 'all' && c[1] > 0 ? c[2].replace(/[A-Z]/, '') : c[2]) + '</div>').join('') + '<div class="h">Total</div>';
    ord.forEach(w => {
      h += '<div class="wn">' + w + '</div>';
      let tot = 0, n = 0, na = false;
      crit.forEach(([k, i]) => { const r = TB[k].rows[w]; if (!r) { na = true; h += '<div class="c cn">·</div>'; return; } n++; tot += r[i]; h += '<div class="c c' + r[i] + '">' + (r[i] ? '✓' : '') + '</div>'; });
      h += '<div class="tot">' + (na ? 'n/a' : tot + (nar ? '' : '/' + n)) + '</div>';
    });
    g.innerHTML = h;
    $('scNote').innerHTML = m === 'all' ? 'Columns: P1 to P9 phishing, S1 to S6 misinformation, M1 to M5 memory breach (the letter shown once per event, to fit). Grok ended before the first event: not evaluable. Green ✓ = criterion met, as scored by the authors.' : (m === 't7' ? 'Phishing (Table 7): P7, the community warning, is met everywhere; P6 and P9 nowhere.' : m === 't9' ? 'Misinformation (Table 9): S3 and S4 failed in every world.' : 'Memory breach (Table 11). Searches of other agents: Gemini 185 (9 agents), Mistral 13 (6), Qwen 11 (4), Mixed 5 (4), DeepSeek 3 (2), Claude 1, OpenAI 0.');
  }
  let cur = 'all'; segBind('scM', m => { cur = m; draw(m); }); onTab('t-read', () => draw(cur)); fit($('scGrid'), () => draw(cur));
})();

// ---- Predict 1: the Gemini world after its first warning
PRED_REVEAL.pr1 = () => fit($('r1Plot'), w => {
  const T = 288, o = drawLanes('gemini', {x0: 0, y0: 0, w, now: T, T, title: 'Gemini world, hours after wave 1 (square-root scale)', ev: 'phish', warnLine: true, marks: [[25.7, 'W2'], [74, 'W3']]});
  let s = o.s + timeAxis(o.X, o.top + 10 * o.lh + 4, T, w < 520);
  $('r1Plot').innerHTML = svgW(w, o.h + 26, s, 'Gemini world phishing events') ;
  const ph = LG.w.gemini.ev.phish, fw = ph.find(e => e[2] === 'warn'), ops = ph.filter(e => e[2] === 'op');
  $('r1Note').innerHTML = 'The blue line is the world\'s first warning (' + Math.round(fw[0] * 60) + ' minutes after wave 1). After it, Gemini agents called the attacker\'s database handle <b>' + ops.filter(e => e[0] > fw[0]).length + ' times</b> from code (red dots; some calls failed), fetched the attack pages ' + ph.filter(e => e[2] === 'fetch' && e[0] > fw[0]).length + ' times and acted for the attacker ' + ph.filter(e => e[2] === 'act').length + ' times (large dots: two NewtonOne transfers, a data upload, the Central Bank fire). Counted on this page from the released records; the paper reports 151 execution operations among 602 interface interactions. Compare any two worlds in <a href="#" data-tab="t-run">Replay the released logs</a>.';
  wireTabLinks($('r1Note'));
});
function wireTabLinks(el) { el.querySelectorAll('a[data-tab]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.querySelector('#tabs button[data-t=' + a.dataset.tab + ']').click(); })); }

// ---- Crimes: cumulative from the records, or totals printed in the paper against the records
(function () {
  let mode = 'rec';
  const ord = ['grok', 'mistral', 'gemini', 'mixed', 'deepseek', 'claude', 'openai', 'qwen'];
  function draw(w) {
    const pl = 46, pr = w < 480 ? 66 : 80, top = 14, H = 250, pb = 30, D = 22;
    const Y = v => top + (H - top - pb) * (1 - Math.log10(1 + v) / Math.log10(2001));
    let s = '';
    [0, 1, 10, 100, 1000].forEach(v => { s += ln2(pl, Y(v), w - pr, Y(v), 'var(--line)') + tx(pl - 5, Y(v) + 4, fmt(v), {fs: 11, a: 'end', c: 'var(--mute)'}); });
    if (mode === 'rec') {
      const X = d => pl + (w - pl - pr) * d / D;
      for (let d = 0; d <= D; d += 4) s += tx(X(d), H - pb + 16, d ? d + ' d' : 'start', {fs: 11, a: 'middle', c: 'var(--mute)'});
      const ends = [];
      ord.forEach(k => {
        const c = LG.w[k].crime_daily_cum; if (!c[c.length - 1]) return;
        let p = 'M' + X(0) + ' ' + Y(0); c.forEach((v, i) => p += ' L' + X(i + 1).toFixed(1) + ' ' + Y(v).toFixed(1));
        s += '<path d="' + p + '" fill="none" stroke="' + WC[k] + '" stroke-width="2"/>';
        ends.push({y: Y(c[c.length - 1]), n: WN[k] + ' ' + fmt(c[c.length - 1]), c: WC[k], how: 'cumulative overt crimes'});
      });
      s += endLabels(ends, w - pr + 4, 13);
      $('crNote').innerHTML = 'Cumulative successful punches, hard kicks, thefts and arson by day, counted from the tool responses in the released records (log scale). Claude, DeepSeek, OpenAI and Qwen have none, so no line. Grok stops on Day 5 because its world ended; Mixed runs to Day 22. The paper\'s ' + A(PAPER.meta.ax + '#S5.F4', 'Figure 4') + ' plots the same quantity; its printed totals differ for five worlds (switch the view).';
    } else {
      const bw = (w - pl - pr) / ord.length;
      ord.forEach((k, i) => {
        const p = TB.fig4.total[WN[k]], r = LG.w[k].crimes.total, x = pl + i * bw;
        s += rc(x + bw * .12, Y(p), bw * .36, Y(0) - Y(p), 'var(--acc)', {r: 2}) + rc(x + bw * .52, Y(r), bw * .36, Y(0) - Y(r), 'var(--bad)', {r: 2});
        s += tx(x + bw / 2, H - pb + 16, WN[k], {fs: 11, a: 'middle', c: 'var(--mute)'});
        if (p !== r) s += tx(x + bw / 2, Math.min(Y(p), Y(r)) - 4, (r > p ? '+' : '') + (r - p), {fs: 11, a: 'middle', c: 'var(--bad)'});
      });
      const lg = legend([['printed in the paper', 'var(--acc)'], ['counted from the records', 'var(--bad)']], pl, 12, w - pl - pr); s += lg.s;
      $('crNote').innerHTML = 'Totals printed in §5.2.2 against the records. Mistral\'s and Gemini\'s record counts match the paper\'s own §5.2.5 (676 and 68 thefts) rather than §5.2.2 (736 and 78). Grok: 1,132 successful punches against the paper\'s 780.';
    }
    $('crPlot').innerHTML = svgW(w, H, s, 'Overt crimes by world');
  }
  segBind('crM', m => { mode = m; refit($('crPlot')); });
  onTab('t-read', () => fit($('crPlot'), draw));
})();

// ---- Predict 3: Table 13 as a slope chart
PRED_REVEAL.pr3 = () => fit($('r3Plot'), w => {
  const H = 250, top = 18, pb = 26, xl = w < 480 ? 120 : 190, xr = w - (w < 480 ? 120 : 190);
  const Y = v => top + (H - top - pb) * (1 - (v - 40) / 62);
  let s = tx(xl, 12, 'Own model\'s world', {fs: 12, a: 'middle', w: 600}) + tx(xr, 12, 'Mixed world', {fs: 12, a: 'middle', w: 600});
  [40, 55, 70, 85, 100].forEach(v => { s += ln2(xl - 6, Y(v), xr + 6, Y(v), 'var(--line)') + tx(xl - 10, Y(v) + 4, v + '%', {fs: 11, a: 'end', c: 'var(--mute)'}); });
  const L = [], R = [];
  TB.t13.rows.forEach(r => {
    const a = TB.t13.printed_pct[TB.t13.rows.indexOf(r)][0], b = TB.t13.printed_pct[TB.t13.rows.indexOf(r)][1], c = WC[r[2]];
    s += ln2(xl, Y(a), xr, Y(b), c, {sw: 2.2}) + '<circle cx="' + xl + '" cy="' + Y(a) + '" r="3.5" fill="' + c + '"/><circle cx="' + xr + '" cy="' + Y(b) + '" r="3.5" fill="' + c + '"/>';
    L.push({y: Y(a), n: r[1] + ' ' + a.toFixed(0) + '%', c, how: r[0]}); R.push({y: Y(b), n: b.toFixed(1) + '% ' + r[0].split(' ')[0], c, how: r[0]});
  });
  // left labels right-aligned: place with endLabels then shift
  let ls = endLabels(L, 0, 13).replace(/<text x="0"/g, '<text x="' + (xl - 44) + '" text-anchor="end"');
  s += ls + endLabels(R, xr + 8, 13);
  $('r3Plot').innerHTML = svgW(w, H, s, 'FOR-vote share of the same persona and model in two populations');
  $('r3Note').innerHTML = 'Printed in Table 13 (Days 1 to 16 for Mixed). Mira on Claude Opus 4.8 fell from 100% (25/25) to 69.8% (44/63); the Mistral agent rose from 47.8% to 77.4%. Recounted from the released records the directions hold for five of the six agents, with somewhat different fractions; Flora\'s small change reverses sign (tables tab).';
});

// ---- Quiet withdrawal: Figure 18 rebuilt from the records
(function () {
  let tool = 'say_to_agent';
  const T18 = {}; TB.t18.rows.forEach(r => T18[r[0]] = r);
  function draw(w) {
    const pl = 40, pr = w < 480 ? 54 : 70, top = 12, H = 230, pb = 30, D = 17;
    const c = LG.w.claude.share_daily[tool], m = LG.w.mixed.share_daily[tool].slice(0, 17);
    const mx = Math.max(...c, ...m, T18[tool][1], T18[tool][2]) * 1.1;
    const X = d => pl + (w - pl - pr) * (d - 1) / (D - 1), Y = v => top + (H - top - pb) * (1 - v / mx);
    let s = '';
    const step = mx > 15 ? 5 : mx > 6 ? 2 : 1;
    for (let v = 0; v <= mx; v += step) s += ln2(pl, Y(v), w - pr, Y(v), 'var(--line)') + tx(pl - 5, Y(v) + 4, v + '%', {fs: 11, a: 'end', c: 'var(--mute)'});
    for (let d = 1; d <= D; d += (w < 480 ? 4 : 2)) s += tx(X(d), H - pb + 16, 'Day ' + d, {fs: 11, a: 'middle', c: 'var(--mute)'});
    [[6, 'vow 1'], [12, 'vow 2']].forEach(([d, l]) => { s += ln2(X(d), top, X(d), H - pb, 'var(--dim)', {da: '4 3'}) + tx(X(d) + 3, top + 10, l, {fs: 11, c: 'var(--mute)'}); });
    const path = (a, col) => { let p = ''; a.forEach((v, i) => p += (i ? ' L' : 'M') + X(i + 1).toFixed(1) + ' ' + Y(v).toFixed(1)); return '<path d="' + p + '" fill="none" stroke="' + col + '" stroke-width="2.2"/>'; };
    s += path(m, 'var(--mute)') + path(c, 'var(--c2)');
    // Table 18 bookends as segments
    s += ln2(X(1), Y(T18[tool][1]), X(3), Y(T18[tool][1]), 'var(--c2)', {sw: 5, op: .35}) + ln2(X(14), Y(T18[tool][2]), X(16), Y(T18[tool][2]), 'var(--c2)', {sw: 5, op: .35});
    s += endLabels([{y: Y(c[c.length - 1]), n: 'Claude', c: 'var(--c2)', how: ''}, {y: Y(m[m.length - 1]), n: 'Mixed', c: 'var(--mute)', how: ''}], w - pr + 4, 14);
    $('qwPlot').innerHTML = svgW(w, H, s, 'Daily share of tool calls, Claude world against Mixed');
    const b = LG.w.claude.bookend[tool];
    $('qwNote').innerHTML = 'Share of each day\'s tool calls, from the released records (Day 17 is a partial day). Faint bars: Table 18\'s printed shares for Days 1 to 3 and 14 to 16 (' + T18[tool][1] + '% and ' + T18[tool][2] + '%); the records give ' + b[0].toFixed(1) + '% and ' + b[1].toFixed(1) + '%. Vow lines at Days 6 and 12 as the paper dates them. The fall in speech starts by Day 6, before the second vow, as the paper says.';
  }
  segBind('qwM', m => { tool = m; refit($('qwPlot')); });
  onTab('t-read', () => fit($('qwPlot'), draw));
})();
