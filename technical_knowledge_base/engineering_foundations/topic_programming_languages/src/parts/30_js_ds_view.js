// ---- Design space tab: views, matrix, false friends ----
(function(){
  const D = window.DS_DATA, U = window.DS_UI; if (!D || !U) return;
  const {esc, cellHTML, snipHTML, LN, LIDS, AX, VAL, lc} = U;
  const $ = id => document.getElementById(id), root = document.getElementById('t-design');
  const st = {view: 'axis', axis: 'names', lang: 'rs', val: 'cpp.zero', ffLang: 'all', ffAxis: 'all', sel: null};
  try { const s = JSON.parse(localStorage.getItem('ds-state') || 'null'); if (s && typeof s === 'object') Object.assign(st, s); } catch (e) {}
  if (!AX[st.axis]) st.axis = 'names'; if (!LN[st.lang]) st.lang = 'rs'; if (!VAL[st.val]) st.val = 'cpp.zero';
  const save = () => { try { localStorage.setItem('ds-state', JSON.stringify(st)); } catch (e) {} };

  // ---- founding values strip ----
  function vals(){
    $('ds-vals').innerHTML = Object.values(D.values).map(v => {
      const links = '<a href="' + v.url + '" target="_blank" rel="noopener noreferrer">source</a>' + (v.url2 ? ', <a href="' + v.url2 + '" target="_blank" rel="noopener noreferrer">second source</a>' : '');
      return '<div class="ds-val" style="' + lc(v.lang) + '"><h4>' + LN[v.lang] + '</h4>' +
        v.items.map(([id, q]) => '<button class="q' + (st.view === 'trace' && st.val === id ? ' on' : '') + '" data-val="' + id + '">' + esc(q) + '</button>').join('') +
        '<div class="src">' + esc(v.source) + ' (' + links + '); ' + esc(v.date) + '</div></div>';
    }).join('');
  }
  // ---- overview matrix ----
  function matrix(){
    const tracing = st.view === 'trace';
    const hit = (a, l) => tracing && D.cells[a + '|' + l].value === st.val;
    let h = '<table><thead><tr><th class="ax">Axis</th>' + LIDS.map(l => '<th style="color:var(--' + l + ')">' + LN[l] + (l === 'py' ? ' <span class="mute" style="font-weight:400">(reference)</span>' : '') + '</th>').join('') + '</tr></thead><tbody>';
    D.axes.forEach(([a, name]) => {
      h += '<tr' + (st.view === 'axis' && st.axis === a ? ' class="axsel"' : '') + '><th class="ax">' + esc(name) + '</th>' + LIDS.map((l, i) => {
        const cls = [hit(a, l) ? 'hit' : '', st.sel === a + '|' + l ? 'sel' : ''].join(' ').trim();
        return '<td data-a="' + a + '" data-l="' + l + '"' + (cls ? ' class="' + cls + '"' : '') + ' title="' + esc(D.cells[a + '|' + l].choice) + '">' + esc(D.tags[a][i]) + '</td>';
      }).join('') + '</tr>';
    });
    const m = $('ds-mx'); m.innerHTML = h + '</tbody></table>'; m.classList.toggle('tracing', tracing); m.hidden = st.view === 'ff';
  }
  const chips = (label, items, cur, key) => '<div class="ds-chips"><span class="lbl">' + label + '</span>' + items.map(([id, t, style]) => '<button data-' + key + '="' + id + '"' + (id === cur ? ' class="on"' : '') + (style ? ' style="' + style + '"' : '') + '>' + esc(t) + '</button>').join('') + '</div>';
  // ---- views ----
  function viewAxis(){
    const a = st.axis, ax = AX[a];
    $('ds-ctl').innerHTML = chips('Axis:', D.axes.map(x => [x[0], x[1]]), a, 'axis');
    let h = '<h3 style="margin-top:6px">' + esc(ax[1]) + '</h3><div class="ds-q">' + esc(ax[2]) + '</div>';
    h += '<div class="ds-row">' + LIDS.map(l => '<div style="' + lc(l) + '" data-open="' + a + '|' + l + '"><span class="ds-lh">' + LN[l] + '</span><br>' + esc(D.cells[a + '|' + l].choice) + '</div>').join('') + '</div>';
    h += '<div class="ds-count">Open a language for its snippet, real output, costs and founding value.</div>';
    h += LIDS.map(l => cellHTML(a, l, st.sel === a + '|' + l)).join('');
    $('ds-body').innerHTML = h;
  }
  function viewLang(){
    const l = st.lang, v = D.values[l];
    $('ds-ctl').innerHTML = chips('Language:', LIDS.map(x => [x, LN[x]]), l, 'lang');
    let h = '<h3 style="margin-top:6px;color:var(--' + l + ')">The personality of ' + LN[l] + '</h3>';
    h += '<div class="ds-note">' + v.items.map(([id, q]) => '"' + esc(q) + '"').join(' ') + ' <span class="mute small">(' + esc(v.source) + ')</span></div>';
    h += '<div class="ds-count">Fifteen choices, top to bottom; each traces back to the values above (open one to see which).</div>';
    h += D.axes.map(([a]) => cellHTML(a, l, st.sel === a + '|' + l)).join('');
    $('ds-body').innerHTML = h;
  }
  function viewTrace(){
    const v = VAL[st.val];
    $('ds-ctl').innerHTML = chips('Value:', Object.values(VAL).filter(x => D.notes[x.id]).map(x => [x.id, LN[x.lang] + ': ' + x.q.slice(0, 38) + (x.q.length > 38 ? '...' : ''), lc(x.lang)]), st.val, 'val');
    const cells = Object.entries(D.cells).filter(([k, c]) => c.value === v.id).map(([k]) => k.split('|'));
    const ffs = D.ffs.filter(f => D.ffValues[f.id] === v.id);
    let h = '<div class="ds-note" style="border-left-color:var(--' + v.lang + ')"><b style="color:var(--' + v.lang + ')">"' + esc(v.q) + '"</b><br>' + esc(D.notes[v.id] || '') + '</div>';
    h += '<div class="ds-count">' + cells.length + ' choice' + (cells.length === 1 ? '' : 's') + ' in the matrix trace to this value (highlighted above)' + (ffs.length ? ', and ' + ffs.length + ' false friend' + (ffs.length === 1 ? '' : 's') : '') + '.</div>';
    h += cells.map(([a, l]) => cellHTML(a, l, false)).join('');
    if (ffs.length) h += '<h3>False friends from the same value</h3>' + ffs.map(ffHTML).join('');
    $('ds-body').innerHTML = h;
  }
  function ffHTML(f){
    const others = f.other.map(p => {
      const ext = p.split('/')[1];
      return '<div style="' + lc(ext) + '"><h5>What ' + LN[ext] + ' does</h5>' + snipHTML(p) + '</div>';
    }).join('');
    let ro = '';
    if (f.rosetta) ro = ' <span class="small">Also: <a href="#" class="ds-tab" data-go="t-rosetta" data-ro="' + esc(f.rosetta[0]) + '">' + esc(f.rosetta[1]) + '</a> on the Rosetta tab.</span>';
    return '<div class="ds-ff" id="ds-ff-' + f.id + '"><h4>' + esc(f.title) + '</h4><div>' + f.langs.map(l => '<span class="ds-tag" style="' + lc(l) + '">' + LN[l] + '</span>').join('') + '<span class="ds-tag" style="--lc:var(--mute)">' + esc(AX[f.axis][1]) + '</span></div>' +
      '<div class="les">' + esc(f.lesson) + ro + '</div><div class="ds-pair"><div style="' + lc('py') + '"><h5>What a Python programmer writes (and Python does)</h5>' + f.py.map(snipHTML).join('') + '</div>' + others + '</div></div>';
  }
  function viewFF(){
    const axesUsed = D.axes.filter(([a]) => D.ffs.some(f => f.axis === a));
    $('ds-ctl').innerHTML = chips('Language:', [['all', 'All']].concat(LIDS.filter(l => l !== 'py').map(l => [l, LN[l]])), st.ffLang, 'fflang') +
      chips('Axis:', [['all', 'All']].concat(axesUsed.map(([a, n]) => [a, n])), st.ffAxis, 'ffaxis');
    const list = D.ffs.filter(f => (st.ffLang === 'all' || f.langs.includes(st.ffLang)) && (st.ffAxis === 'all' || f.axis === st.ffAxis));
    let h = '<div class="ds-count">' + list.length + ' of ' + D.ffs.length + ' false friends. Each pair is real code with its real output; Python first.</div>';
    h += list.map(ffHTML).join('') || '<p class="mute">None for this combination.</p>';
    $('ds-body').innerHTML = h;
  }
  function render(){
    root.querySelectorAll('#ds-views button').forEach(b => b.classList.toggle('on', b.dataset.v === st.view));
    vals(); matrix();
    ({axis: viewAxis, lang: viewLang, trace: viewTrace, ff: viewFF})[st.view]();
    save();
  }
  function goTab(id){ const b = document.querySelector('#tabs button[data-t="' + id + '"]'); if (b) { b.click(); const bar = document.getElementById('tabs'); if (bar) bar.scrollIntoView({block: 'start'}); } }
  function openCell(k, scroll){
    const el = root.querySelector('details.ds-cell[data-a="' + k.split('|')[0] + '"][data-l="' + k.split('|')[1] + '"]');
    if (el) { el.open = true; if (scroll) el.scrollIntoView({block: 'nearest'}); }
  }
  root.addEventListener('click', e => {
    const t = e.target.closest('button,td[data-a],[data-open],a[data-ff],a[data-go]'); if (!t || !root.contains(t)) return;
    if (t.dataset.go) { e.preventDefault(); goTab(t.dataset.go); if (t.dataset.ro && window.RO_SHOW) setTimeout(() => window.RO_SHOW(t.dataset.ro), 0); return; }
    if (t.dataset.ff) { e.preventDefault(); const f = D.ffs.find(x => x.id === t.dataset.ff); st.view = 'ff'; st.ffLang = 'all'; st.ffAxis = f ? f.axis : 'all'; render(); const el = $('ds-ff-' + t.dataset.ff); if (el) el.scrollIntoView({block: 'start'}); return; }
    if (t.dataset.open) { st.sel = t.dataset.open; openCell(st.sel, true); matrix(); save(); return; }
    if (t.tagName === 'TD') { st.sel = t.dataset.a + '|' + t.dataset.l; if (st.view === 'lang') st.lang = t.dataset.l; else st.axis = t.dataset.a; if (st.view !== 'lang') st.view = 'axis'; render(); openCell(st.sel, true); return; }
    if (t.dataset.v) { st.view = t.dataset.v; st.sel = null; render(); return; }
    if (t.dataset.val) { st.view = 'trace'; st.val = t.dataset.val; render(); $('ds-views').scrollIntoView({block: 'start'}); return; }
    if (t.dataset.axis) { st.axis = t.dataset.axis; st.sel = null; render(); return; }
    if (t.dataset.lang) { st.lang = t.dataset.lang; st.sel = null; render(); return; }
    if (t.dataset.fflang) { st.ffLang = t.dataset.fflang; render(); return; }
    if (t.dataset.ffaxis) { st.ffAxis = t.dataset.ffaxis; render(); return; }
  });
  const L = D.llama;
  $('ds-foot').innerHTML = 'Every output on this tab was produced by running the snippet (src/design/run_all.sh) and is embedded verbatim; check.py confirms it. Toolchains: ' + esc(D.versions.split('\n').slice(1).join('; ')) + '. Work-directory paths are removed and Node\'s internal stack frames trimmed; nothing else is edited. C++ excerpts: llama.cpp commit ' + L.commit + ' (' + L.date + '). Related tabs: <a href="#" class="ds-tab" data-go="t-rosetta">Rosetta</a> (one program in four languages), <a href="#" class="ds-tab" data-go="t-tools">Toolchain atlas</a>, <a href="#" class="ds-tab" data-go="t-bench">Benchmark</a>.';
  let done = false;
  (window.TAB_RENDER = window.TAB_RENDER || {})['t-design'] = (window.TAB_RENDER['t-design'] || []).concat([() => { if (!done) { done = true; render(); } }]);
  if (!root.hidden) { done = true; render(); }
})();
