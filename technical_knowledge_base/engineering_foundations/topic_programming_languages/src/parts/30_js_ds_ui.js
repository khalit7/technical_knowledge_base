// ---- Design space tab (ids ds-) ----
(function(){
  const D = window.DS_DATA; if (!D) return;
  const root = document.getElementById('t-design'); if (!root) return;
  const LN = Object.fromEntries(D.langs), LIDS = D.langs.map(l => l[0]);
  const AX = Object.fromEntries(D.axes.map(a => [a[0], a]));
  const VAL = {}; Object.values(D.values).forEach(v => v.items.forEach(([id, q]) => { VAL[id] = {id, q, lang: v.lang}; }));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lc = l => `--lc:var(--${l})`;
  // ---- tiny syntax highlighter (comments, strings, keywords, numbers) ----
  const KW = {
    py: 'def class return if else elif for while in not and or is import from as try except finally raise with lambda None True False pass global async await yield',
    cpp: 'int long unsigned bool char float double void auto const constexpr static struct class template typename concept requires return if else for while try catch throw new delete nullptr true false using namespace include std size_t operator public private',
    rs: 'fn let mut pub struct enum impl trait for in if else match return use mod unsafe extern move dyn Box Vec Some None Ok Err true false self Self const static as where loop while async await',
    js: 'const let var function return if else for of in while class new this try catch throw typeof await async null undefined true false import from export default',
    ts: 'const let var function return if else for of in while class new this try catch throw typeof await async null undefined true false interface type extends infer readonly as number string bigint boolean unknown any never import from export declare using'
  };
  const KWS = {}; Object.keys(KW).forEach(k => KWS[k] = new Set(KW[k].split(' ')));
  function hl(code, lang){
    const L = lang === 'mjs' || lang === 'mts' ? (lang === 'mjs' ? 'js' : 'ts') : lang;
    const cm = L === 'py' ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
    const re = new RegExp('(' + cm + ')|("(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)|\\b(\\d[\\d_]*(?:\\.\\d+)?[a-z0-9]*)\\b|([A-Za-z_][A-Za-z0-9_]*)', 'g');
    let out = '', last = 0, m;
    const ks = KWS[L] || new Set();
    while ((m = re.exec(code))){
      out += esc(code.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += '<span class="c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += (L === 'rs' && m[2][0] === "'" && m[2].length > 3 && !/^'\\/.test(m[2]) ? esc(m[2]) : '<span class="s">' + esc(m[2]) + '</span>');
      else if (m[3]) out += '<span class="n">' + esc(m[3]) + '</span>';
      else out += ks.has(m[4]) ? '<span class="k">' + m[4] + '</span>' : esc(m[4]);
    }
    return out + esc(code.slice(last));
  }
  function outHTML(t){
    return t.split('\n').map(l => {
      if (l.startsWith('$ ')) return '<span class="cmd">' + esc(l) + '</span>';
      if (/^(error|.*Error:|.*error TS\d|Traceback|thread '.*panicked|\(exit status|\(compile failed|Segmentation fault|Abort trap|libc\+\+abi)/.test(l)) return '<span class="err">' + esc(l) + '</span>';
      return esc(l);
    }).join('\n');
  }
  const extOf = n => n.split('.').pop();
  function snipHTML(p){
    const s = D.snips[p]; if (!s) return '';
    let h = '<div class="ds-fn">' + esc(s.name) + '</div><pre class="ds-code"><code>' + hl(s.code, extOf(s.name)) + '</code></pre>';
    s.helpers.forEach(x => { h += '<div class="ds-fn">' + esc(x.name) + ' (built by the first command below)</div><pre class="ds-code"><code>' + hl(x.code, extOf(x.name)) + '</code></pre>'; });
    return h + '<pre class="ds-out" aria-label="real output">' + outHTML(s.out) + '</pre>';
  }
  function llamaHTML(ids){
    if (!ids || !ids.length) return '';
    const L = D.llama, c7 = L.commit.slice(0, 7);
    let h = '<div class="ds-llh"><b>In real inference-engine code:</b> llama.cpp / ggml at commit <a href="' + L.repo + '/tree/' + L.commit + '" target="_blank" rel="noopener noreferrer">' + c7 + '</a> (' + L.date + ')</div>';
    ids.forEach(id => { const e = L.excerpts[id];
      const url = L.repo + '/blob/' + L.commit + '/' + e.file + '#L' + e.start + (e.end > e.start ? '-L' + e.end : '');
      h += '<div class="ds-fn"><a href="' + url + '" target="_blank" rel="noopener noreferrer">' + esc(e.file) + ' lines ' + e.start + (e.end > e.start ? '-' + e.end : '') + '</a>: <span class="why">' + esc(e.why) + '</span></div><pre class="ds-llama"><code>' + hl(dedent(e.text), e.file.endsWith('.txt') || e.file.endsWith('CMakeLists.txt') ? 'none' : 'cpp') + '</code></pre>'; });
    return h;
  }
  function dedent(t){ const ls = t.split('\n'); const n = Math.min(...ls.filter(l => l.trim()).map(l => l.match(/^ */)[0].length)); return ls.map(l => l.slice(n)).join('\n').replace(/^\n+/, ''); }
  const ffFor = (a, l) => D.ffs.filter(f => f.axis === a && f.langs.includes(l));
  function cellHTML(a, l, open){
    const c = D.cells[a + '|' + l], v = VAL[c.value];
    let h = '<details class="ds-cell" style="' + lc(l) + '" data-a="' + a + '" data-l="' + l + '"' + (open ? ' open' : '') + '><summary><span class="ds-lh">' + LN[l] + '</span>' + (l === 'py' ? '<span class="ds-ref">reference</span>' : '') + ' <span class="mute">(' + esc(AX[a][1]) + ')</span>: ' + esc(c.choice) + '</summary><div class="b">';
    h += '<div class="ds-bc"><div><b>Buys</b>' + esc(c.buys) + '</div><div><b>Costs</b>' + esc(c.costs) + '</div></div>';
    h += '<div><button class="ds-vchip" style="' + lc(v.lang) + '" data-val="' + v.id + '">Founding value: ' + esc(v.q) + '</button><div class="small mute">' + esc(c.why) + '</div></div>';
    c.files.forEach(p => { h += snipHTML(p); });
    if (l === 'cpp') h += llamaHTML(c.llama);
    const ff = ffFor(a, l);
    if (ff.length) h += '<div class="small" style="margin-top:8px">False friends here: ' + ff.map(f => '<a href="#" data-ff="' + f.id + '">' + esc(f.title) + '</a>').join('; ') + '</div>';
    return h + '</div></details>';
  }
  window.DS_UI = {esc, hl, outHTML, snipHTML, llamaHTML, cellHTML, ffFor, LN, LIDS, AX, VAL, lc};
})();
