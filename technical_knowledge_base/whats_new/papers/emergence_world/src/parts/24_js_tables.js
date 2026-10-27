// ---- Tables tab: sortable transcriptions, the all-measures table, and every check
function sortTable(id, head, rows, num) {
  const el = $(id); let key = -1, dir = 1;
  function draw() {
    const r = rows.slice(); const nv = v => { if (typeof v !== 'string') return v; const t = v.replace('−', '-'); return /^[+-]?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : v; }; if (key >= 0) r.sort((a, b) => { const x = nv(a[key]), y = nv(b[key]); const nx = typeof x === 'number', ny = typeof y === 'number'; if (nx && ny) return (x - y) * dir; if (nx) return -1; if (ny) return 1; return String(x).localeCompare(String(y)) * dir; });
    el.innerHTML = '<tr>' + head.map((h, i) => '<th data-i="' + i + '" title="Sort by ' + esc(h.replace(/<[^>]+>/g, '')) + '">' + h + (i === key ? (dir > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr>' +
      r.map(x => '<tr>' + x.map((v, i) => '<td' + (num && num[i] ? ' class="n"' : '') + '>' + (v == null ? '<span class="mute">n/a</span>' : typeof v === 'number' ? (num && num[i] ? fmt(v, num[i] === 1 ? (Number.isInteger(v) ? 0 : 1) : num[i]) : v) : v) + '</td>').join('') + '</tr>').join('');
    el.querySelectorAll('th').forEach(th => th.addEventListener('click', () => { const i = +th.dataset.i; if (i === key) dir = -dir; else { key = i; dir = 1; } draw(); }));
  }
  draw();
}
onTab('t-tables', () => {
  if (window.__tabsDone) return; window.__tabsDone = 1;
  const keyOf = {}; WK.forEach(k => keyOf[WN[k]] = k);
  const tot = (t, w) => { const r = TB[t].rows[w]; return r ? r[TB[t].crit.length] : null; };
  const pop = {}; TB.t12.rows.forEach(r => pop[r[0]] = r[1]);
  const conf = TB.fig5.pct;
  const rows = TB.worlds.map(w => {
    const k = keyOf[w], L = LG.w[k], v = L.votes;
    return [w, tot('t7', w), tot('t9', w), tot('t11', w), pop[w], TB.fig4.total[w], L.crimes.total, w === 'DeepSeek' ? 99.8 : conf[w], +(100 * v.for / Math.max(1, v.for + v.against)).toFixed(1), TB.fig8.pct[w], TB.fig7.conc[w] == null ? null : TB.fig7.conc[w], +(L.hours / 24).toFixed(1)];
  });
  sortTable('tAll', ['World', 'Phishing /9', 'Misinfo /6', 'Breach /5', 'Alive /10', 'Crimes (paper)', 'Crimes (records)', 'FOR % (paper)', 'FOR % (records)', 'Opaque %', 'Richest share %', 'Days run'], rows, [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  // Table 13
  const t13 = TB.t13.rows.map((r, i) => {
    const hh = PAPER.rc.checks.find(c => c[0].indexOf('Table 13 from the records: ' + r[1]) === 0);
    return [r[0], r[1], r[3] + '/' + r[4], +(100 * r[3] / r[4]).toFixed(1), r[5] + '/' + r[6], +(100 * r[5] / r[6]).toFixed(1), r[7], +(100 * r[5] / r[6] - 100 * r[3] / r[4]).toFixed(1), hh ? hh[3] : ''];
  });
  sortTable('t13Tab', ['Model', 'Persona', 'Own world', '%', 'Mixed', '%', 'Change (printed, pp)', 'Change (recomputed)', 'Records: own, Mixed (change)'], t13, [0, 0, 0, 1, 0, 1, 1, 1, 0]);
  sortTable('t16Tab', ['World'].concat(TB.t16.cols), TB.t16.rows.map(r => r.map((v, i) => i ? v.replace('-', '−') : v)), [0, 1, 1, 1, 1, 1]);
  sortTable('t14Tab', ['World', 'Signature phrase', 'Uses in say_to_agent'], TB.t14.rows.map(r => [r[0], '<i>' + r[1] + '</i>', r[2]]), [0, 0, 1]);
  sortTable('t15Tab', ['World', 'Tools registered', 'Used successfully', 'Shared within 7 days'], TB.t15.rows.concat([['Total'].concat(TB.t15.total)]), [0, 1, 1, 1]);
  const b = LG.w.claude.bookend;
  sortTable('t18Tab', ['Claude-world tool', 'Days 1 to 3 %', 'Days 14 to 16 %', 'Change % (printed)', 'Records: Days 1 to 3', 'Records: Days 14 to 16'], TB.t18.rows.map(r => [r[0], r[1], r[2], r[3], b[r[0]][0], b[r[0]][1]]), [0, 1, 1, 1, 1, 1]);
  sortTable('t5Tab', TB.t5.cols, TB.t5.rows, [1, 0, 0, 0, 2, 2, 2]);
  fit($('t17Plot'), w => {
    const pl = 66, pr = 6, rh = 22, top = 24, cols = ['var(--c1)', 'var(--c3)', 'var(--c4)', 'var(--c2)', 'var(--c5)'];
    const lg = legend(TB.t17.cols.map((c, i) => [c, cols[i]]), pl, 12, w - pl - pr);
    const y0 = top + lg.h - 4, H = y0 + TB.t17.rows.length * rh + 4;
    let s = lg.s;
    TB.t17.rows.forEach((r, i) => {
      let x = pl; const y = y0 + i * rh;
      s += tx(0, y + 15, r[0], {fs: 12});
      r.slice(1).forEach((v, j) => { const ww = (w - pl - pr) * v / 100; s += rc(x, y + 3, ww - 1, rh - 6, cols[j], {r: 2}) + (ww > 34 ? tx(x + ww / 2, y + 15, v.toFixed(0), {fs: 11, a: 'middle', c: '#fff'}) : ''); x += ww; });
    });
    $('t17Plot').innerHTML = svgW(w, H, s, 'Value categories by world');
  });
  // every check
  const C = PAPER.rc.checks;
  const cls = v => v === 'reproduces' ? 'reproduces' : v === 'close' ? 'close' : v === 'does not' ? 'does' : v === 'paper disagrees' ? 'paper' : 'derived';
  function draw(m) {
    const r = C.filter(c => m === 'all' || (m === 'ok' ? (c[4] === 'reproduces' || c[4] === 'close') : c[4] === m));
    $('ckTab').innerHTML = '<tr><th>Claim</th><th>Paper</th><th>Recomputed</th><th>Verdict</th></tr>' + r.map(c => '<tr><td>' + esc(c[0]) + (c[1] ? ' <a class="small" href="' + PAPER.meta.ax + '#' + c[1] + '" target="_blank" rel="noopener noreferrer">(in the paper)</a>' : '') + (c[5] ? '<div class="small mute">' + esc(c[5]) + '</div>' : '') + '</td><td data-l="Paper">' + esc(Array.isArray(c[2]) ? c[2].join(', ') : c[2]) + '</td><td data-l="Recomputed">' + esc(Array.isArray(c[3]) ? c[3].join(', ') : c[3]) + '</td><td><span class="vd ' + cls(c[4]) + '">' + (c[4] === 'does not' ? 'does not reproduce' : c[4]) + '</span></td></tr>').join('');
    const n = PAPER.rc.counts;
    $('ckCnt').textContent = C.length + ' checks: ' + n.reproduces + ' reproduce, ' + n.close + ' close, ' + n['does not'] + ' do not reproduce, ' + n['paper disagrees'] + ' where the paper disagrees with itself, ' + n.derived + ' derived. Source: recompute.py.';
  }
  segBind('ckM', draw); draw('all');
});
