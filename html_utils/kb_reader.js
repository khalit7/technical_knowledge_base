// ---- The paper reader: an original paper on the site, with the AI buddy on it (html_utils/build_site.py writes the reader pages) ----
// A paper page whose pages.json entry has "reader": {"arxiv": "<id>v<n>"} gets two reader pages next to it: paper/ (arXiv's HTML
// version of the paper, fetched live, cleaned and set in the site's look) and paper/pdf/ (the PDF itself, drawn by pdf.js with a text
// layer, so it can be selected, marked and asked about). Each view has its own notes: the buddy keys notes by the page's address.
// The buddy loads only after the paper is on the page, because it reads the page as a document once, when it starts.
// Offline: the paper (its arXiv file, pinned to one version, so it never changes) is kept in the browser's Cache Storage the first time
// it is opened, with the reader's own files and the paper's figures; a small service worker (paper/sw.js, html_utils/kb_reader_sw.js)
// serves them when there is no network. The Claude and GitHub calls never pass through it.
// Fetched HTML is not trusted: it is rebuilt element by element from an allow-list (no scripts, styles, frames, forms, event
// attributes or script URLs), and SVG figures arXiv embeds as <object> are shown as images, which cannot run scripts.
// No literal closing-head or opening-body tag may appear in this file (build_site.py inserts its bar at the first of each).
(function(){
  const me = document.currentScript, D = me.dataset, ID = D.arxiv, MODE = D.mode;
  const ART = document.getElementById('kbPaper'), CACHE = 'kb-reader-v1';
  if (!ART || !/^\d{4}\.\d{4,5}v\d+$/.test(ID || '')) return;
  const HTML_URL = 'https://arxiv.org/html/' + ID, PDF_URL = 'https://arxiv.org/pdf/' + ID;
  const status = (s, err) => { let p = document.getElementById('kbPaperStatus'); if (!p) { p = document.createElement('p'); p.id = 'kbPaperStatus'; ART.prepend(p) } p.className = 'rd-st' + (err ? ' err' : ''); p.textContent = ''; if (typeof s === 'string') p.textContent = s; else p.append(...s) };
  const link = (href, text) => { const a = document.createElement('a'); a.href = href; a.textContent = text; return a };

  // ---- Cache Storage: the arXiv file once fetched is kept (its version is pinned, so it never goes stale) ----
  // ok says whether a response is really the paper (an error page sent with 200 must not be kept for good)
  async function cached(url, ok){
    let c = null; try { c = await caches.open(CACHE) } catch(e) {}
    if (c) { try { const r = await c.match(url); if (r) return r } catch(e) {} }
    const r = await fetch(url, {mode:'cors', credentials:'omit'});
    if (r.ok && c && ok(r)) { try { await c.put(url, r.clone()) } catch(e) {} }
    return r;
  }
  async function forget(url){ try { await (await caches.open(CACHE)).delete(url) } catch(e) {} }
  // the reader's own files and the paper's figures, so a second visit works offline (each on its own: one failure stops none)
  async function keep(urls){
    let c; try { c = await caches.open(CACHE) } catch(e) { return }
    // an older version of a versioned file (the reader, the buddy, pdf.js) is dropped: only the current ones are kept
    // (an entry goes only when another version of the same file is being kept now: the other view's files stay)
    try { const base = u => { const x = new URL(u, location.href); return x.origin + x.pathname.replace(/\/lib\/pdfjs-[^/]+\//, '/lib/pdfjs/') + (x.search.startsWith('?v=') ? '' : x.search) };
      const now = new Set(urls.filter(Boolean).map(u => new URL(u, location.href).href)), nowBase = new Set([...now].map(base));
      for (const q of await c.keys()) { const u = new URL(q.url); if (u.origin === location.origin && (u.search.startsWith('?v=') || /\/lib\/pdfjs-/.test(u.pathname)) && !now.has(u.href) && nowBase.has(base(u.href))) await c.delete(q) } } catch(e) {}
    for (const u of new Set(urls.filter(Boolean))) { try { if (!(await c.match(u))) { const r = await fetch(u, {mode:new URL(u, location.href).origin === location.origin ? 'same-origin' : 'cors', credentials:'omit'}); if (r.ok) await c.put(u, r) } } catch(e) {} }
  }
  function worker(){
    try { if (D.sw && 'serviceWorker' in navigator) navigator.serviceWorker.register(D.sw, {scope:D.scope}).catch(() => {}) } catch(e) {}
  }
  const shell = () => [location.href.split('#')[0], me.src, D.buddy, D.other, D.kbindex];

  // the buddy, once the paper is on the page (it reads the page as a document when it starts)
  function buddy(){
    if (!D.buddy || window.__kbBuddyLoader) return; window.__kbBuddyLoader = 1;
    const s = document.createElement('script'); s.src = D.buddy; s.async = true; document.head.appendChild(s);
  }
  function fail(msg){
    const kids = [msg + ' '];
    if (MODE === 'html' && D.other) kids.push(link(D.other, 'Open the PDF view'), ' or ');
    kids.push(link(MODE === 'pdf' ? PDF_URL : HTML_URL, 'open it on arXiv'), '.');
    status(kids, true);
  }

  // ---- the HTML view: arXiv's LaTeXML page, rebuilt from an allow-list ----
  const MATHNS = 'http://www.w3.org/1998/Math/MathML';
  const TAGS = new Set('a abbr article b blockquote br caption cite code dd del dfn div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img kbd li mark ol p pre q s samp section small span strong sub sup table tbody td tfoot th thead tr tt u ul var'.split(' '));
  const MTAGS = new Set('math semantics mrow mi mn mo ms mtext mspace mfrac msqrt mroot msub msup msubsup munder mover munderover mtable mtr mtd mlabeledtr mstyle mpadded mphantom menclose merror mmultiscripts mprescripts none'.split(' '));
  const DROP = new Set('script style link meta base iframe frame frameset embed applet form input button textarea select option label noscript template annotation annotation-xml svg dialog nav footer header audio video source track canvas map area portal'.split(' '));
  const ATTR = new Set('class id title lang dir colspan rowspan alt width height'.split(' '));
  const MATTR = new Set('display mathvariant stretchy lspace rspace fence separator accent accentunder movablelimits linethickness columnalign rowalign columnspacing rowspacing columnlines rowlines frame mathsize minsize maxsize symmetric largeop width height depth voffset notation scriptlevel displaystyle form intent'.split(' '));
  const STYLE = /^(width|height|aspect-ratio|list-style-type|vertical-align|--ltx-fg-color|--ltx-bg-color)$/;
  const SAFEV = /^[-#\w.%/ ,]+$/;
  const ident = s => 'p-' + s, undo = s => { try { return decodeURIComponent(s) } catch(e) { return s } };
  function clean(src, base){
    const out = document.createDocumentFragment(), imgs = [];
    const walk = (n, into) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { into.append(c.nodeValue); continue }
        if (c.nodeType !== 1) continue;
        let tag = c.localName.toLowerCase(); const isM = c.namespaceURI === MATHNS || tag === 'math';
        if (tag === 'object' && /^image\/svg\+xml$/i.test(c.getAttribute('type') || '') && c.getAttribute('data')) tag = 'img';   // an SVG figure: shown as an image, which cannot run scripts
        if (DROP.has(tag)) continue;
        const ok = isM ? MTAGS.has(tag) : TAGS.has(tag);
        if (!ok) { walk(c, into); continue }   // an unknown wrapper: its content stays, the element goes
        const e = isM ? document.createElementNS(MATHNS, tag) : document.createElement(tag);
        for (const a of c.attributes) {
          const k = a.name.toLowerCase(), v = a.value;
          if (k.startsWith('on')) continue;
          if (k === 'id') { e.id = ident(v); continue }
          if (k === 'class') { const cl = v.split(/\s+/).filter(t => /^ltx_[\w-]+$/.test(t)).join(' '); if (cl) e.setAttribute('class', cl); continue }   // LaTeXML's own classes only: nothing can pass for the buddy's or the reader's
          if (k === 'style') {
            const keep = v.split(';').map(d => d.trim()).filter(Boolean).map(d => { const i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()] })
              .filter(d => d && STYLE.test(d[0]) && SAFEV.test(d[1]));
            for (const [p, val] of keep) e.style.setProperty(p, val);
            continue;
          }
          if (isM ? MATTR.has(k) : ATTR.has(k)) e.setAttribute(k, v);
        }
        if (tag === 'a') {
          const h = c.getAttribute('href') || '';
          if (h.startsWith('#')) e.setAttribute('href', '#' + ident(undo(h.slice(1))));
          else { try { const u = new URL(h, base); if (/^https?:$/.test(u.protocol)) { if (u.origin + u.pathname === new URL(base).origin + new URL(base).pathname && u.hash) e.setAttribute('href', '#' + ident(undo(u.hash.slice(1)))); else { e.href = u.href; e.target = '_blank'; e.rel = 'noopener noreferrer' } } } catch(err) {} }
        }
        if (tag === 'img') {
          const s = c.getAttribute(c.localName.toLowerCase() === 'object' ? 'data' : 'src') || '';
          try { const u = new URL(s, base); if (/^https?:$/.test(u.protocol)) { e.crossOrigin = 'anonymous'; e.src = u.href; e.loading = 'lazy'; e.decoding = 'async'; imgs.push(u.href) } } catch(err) {}
          if (!e.hasAttribute('alt')) e.alt = '';
        }
        into.append(e);
        walk(c, e);
        // a formula's TeX goes beside it, hidden from the eye, and the rendered MathML is hidden from the buddy: Claude reads the formula
        // as TeX (from MathML text alone a square root, a fraction or a transpose is lost)
        const tex = tag === 'math' && (c.getAttribute('alttext') || '').trim();
        if (tex) { e.setAttribute('aria-hidden', 'true'); const t = document.createElement('span'); t.className = 'rd-tex'; t.textContent = c.getAttribute('display') === 'block' ? ' $$' + tex + '$$ ' : '$' + tex + '$'; into.append(t) }
      }
    };
    walk(src, out);
    return {frag:out, imgs};
  }
  async function html(){
    let r; try { r = await cached(HTML_URL, x => /text\/html/i.test(x.headers.get('content-type') || '')) } catch(e) { fail(navigator.onLine === false ? 'You are offline, and this paper has not been opened on this device yet.' : 'The paper could not be loaded from arXiv.'); return false }
    if (!r.ok) { if (D.other && r.status === 404) { location.replace(D.other); return false } fail('arXiv has no HTML version of this paper (' + r.status + ').'); return false }
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');   // an inert document: nothing in it runs or loads
    const src = doc.querySelector('article.ltx_document');
    if (!src) await forget(HTML_URL);   // not the paper: asked for again next time
    if (!src) { if (D.other) { location.replace(D.other); return false } fail('The arXiv page has no paper in it.'); return false }
    const {frag, imgs} = clean(src, HTML_URL);
    ART.textContent = ''; ART.append(frag);
    // footnotes open on a tap (arXiv shows them on hover, which a tablet has not)
    ART.addEventListener('click', ev => { const m = ev.target.closest('.ltx_note_mark'), n = m && m.closest('.ltx_note'); if (n && ART.contains(n)) { ev.preventDefault(); n.classList.toggle('open') } });
    keep(shell().concat(imgs));
    return true;
  }

  // ---- the PDF view: pdf.js draws each page; its text layer is regrouped into paragraphs so the buddy can cite and anchor them ----
  let pdfjs = null, pdoc = null; const pages = [];
  async function pdf(){
    try { pdfjs = await import(D.pdfjs + 'pdf.min.mjs') } catch(e) { fail('The PDF viewer could not be loaded.'); return false }
    pdfjs.GlobalWorkerOptions.workerSrc = D.pdfjs + 'pdf.worker.min.mjs';
    let data;
    try { const r = await cached(PDF_URL, x => /pdf/i.test(x.headers.get('content-type') || '')); if (!r.ok) { fail('arXiv did not send the PDF (' + r.status + ').'); return false } data = new Uint8Array(await r.arrayBuffer()) }
    catch(e) { fail(navigator.onLine === false ? 'You are offline, and this PDF has not been opened on this device yet.' : 'The PDF could not be loaded from arXiv.'); return false }
    try { pdoc = await pdfjs.getDocument({data, isEvalSupported:false, enableXfa:false}).promise } catch(e) { await forget(PDF_URL); fail('The PDF could not be read.'); return false }
    status('Setting out ' + pdoc.numPages + ' pages...');
    const box = document.createDocumentFragment();
    for (let i = 1; i <= pdoc.numPages; i++) {
      const page = await pdoc.getPage(i), vp = page.getViewport({scale:1});
      const pg = document.createElement('div'); pg.className = 'pg'; pg.dataset.n = i; pg.style.aspectRatio = vp.width + ' / ' + vp.height;
      const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
      const tl = document.createElement('div'); tl.className = 'textLayer';
      pg.append(cv, tl); box.append(pg);
      pages.push({i, page, vp, pg, cv, tl, w:0, task:null});
    }
    ART.textContent = ''; ART.append(box); fit();
    for (const p of pages) {
      try { await new pdfjs.TextLayer({textContentSource:p.page.streamTextContent(), container:p.tl, viewport:p.vp}).render(); paras(p) } catch(e) {}
      const end = document.createElement('div'); end.className = 'endOfContent'; p.tl.append(end);
    }
    // selecting across absolutely placed words: a cover behind the words keeps the selection in the page, while a mouse is down, or with a finger while a selection is open
    let down = false, mouse = false;
    ART.addEventListener('pointerdown', ev => { down = true; mouse = ev.pointerType === 'mouse'; const t = ev.target.closest && ev.target.closest('.textLayer'); if (t) t.classList.add('selecting') });
    const up = () => { for (const t of ART.querySelectorAll('.textLayer.selecting')) t.classList.remove('selecting') };
    // with a mouse the cover goes at once (a click on the page's blank space then clears the selection); with a finger it stays while a
    // selection is open, since its handles are dragged with no pointer events
    const lift = ev => { down = false; if (ev.pointerType === 'mouse' || !sel()) up() };
    addEventListener('pointerup', lift); addEventListener('pointercancel', lift);
    // on a tablet the selection grows by its handles, with no pointer events: the cover stays while a selection is open in a page
    const sel = () => { const s = getSelection(); return s && s.rangeCount && !s.isCollapsed ? s.getRangeAt(0) : null };
    document.addEventListener('selectionchange', () => { if (down) return; const r = sel(); for (const t of ART.querySelectorAll('.textLayer')) t.classList.toggle('selecting', !mouse && !!r && r.intersectsNode(t)) });
    // the pages are drawn when near the screen and let go when far from it (a tablet has little canvas memory)
    const io = new IntersectionObserver(es => { for (const e of es) { const p = pages[+e.target.dataset.n - 1]; if (e.isIntersecting) draw(p); else drop(p) } }, {rootMargin:'150% 0px'});
    for (const p of pages) io.observe(p.pg);
    // the text layer follows the width at once (the buddy places marks by it); the pages are drawn again a moment later
    let rt = 0; const refit = () => { if (!fit()) return; dispatchEvent(new Event('resize')); clearTimeout(rt); rt = setTimeout(() => { for (const p of pages) if (p.w) { p.w = -1; draw(p) } }, 150) };
    new ResizeObserver(refit).observe(ART);
    // a window moved to a screen of another pixel density is drawn again, sharp (no resize happens then)
    const dens = () => { try { matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)').addEventListener('change', () => { refit(); dens() }, {once:true}) } catch(e) {} }; dens();
    keep(shell().concat([D.pdfjs + 'pdf.min.mjs', D.pdfjs + 'pdf.worker.min.mjs']));
    return true;
  }
  let lastW = 0, lastR = 0;
  function fit(){
    const w = ART.clientWidth, dr = window.devicePixelRatio || 1; if (!w || (w === lastW && dr === lastR)) return false; lastW = w; lastR = dr;
    for (const p of pages) p.pg.style.setProperty('--total-scale-factor', String(w / p.vp.width));
    return true;
  }
  // a page is drawn off screen, then copied into its own canvas: the canvas element never changes, because swapping elements while
  // the reader drags out a selection on that page cancels the selection
  function draw(p){
    const w = p.pg.clientWidth; if (!w || p.w === w) return;
    if (p.task) { try { p.task.cancel() } catch(e) {} p.task = null }
    const dpr = Math.min(window.devicePixelRatio || 1, 2), sc = Math.min(w * dpr / p.vp.width, 4096 / p.vp.width), vp = p.page.getViewport({scale:sc});
    const off = document.createElement('canvas'); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
    p.w = w;
    const task = p.task = p.page.render({canvas:off, canvasContext:off.getContext('2d'), viewport:vp});
    task.promise.then(() => { if (p.task !== task) return; p.task = null; p.cv.width = off.width; p.cv.height = off.height; p.cv.getContext('2d').drawImage(off, 0, 0); off.width = off.height = 0 },
      () => { off.width = off.height = 0; if (p.task === task) { p.task = null; p.w = 0 } });
  }
  function drop(p){
    if (p.task) { try { p.task.cancel() } catch(e) {} p.task = null }
    if (!p.w) return; p.w = 0; p.cv.width = p.cv.height = 0;
  }
  // pdf.js gives one absolutely placed span per run of text. Lines are found from their positions, paragraphs from the gaps and
  // indents between lines, and each paragraph becomes a <p> with a real box around its words, so the buddy can cite it, anchor a mark
  // to it and put a note beside it. A space ends each line, so words across a line break do not run together.
  function paras(p){
    const L = p.tl, lr = L.getBoundingClientRect(); if (!lr.width || !lr.height) return;
    const items = [];
    for (const s of [...L.children]) {
      if (s.tagName !== 'SPAN') { if (s.tagName === 'BR' && items.length) items[items.length - 1].eol = true; s.remove(); continue }
      const r = s.getBoundingClientRect();
      items.push({s, x0:(r.left - lr.left) / lr.width * 100, x1:(r.right - lr.left) / lr.width * 100, y0:(r.top - lr.top) / lr.height * 100, y1:(r.bottom - lr.top) / lr.height * 100, eol:false,
        l:parseFloat(s.style.left) || 0, t:parseFloat(s.style.top) || 0});
    }
    if (!items.length) return;
    // lines: consecutive spans at about the same height
    const lines = []; let cur = null;
    for (const it of items) {
      const h = it.y1 - it.y0, mid = (it.y0 + it.y1) / 2;
      if (cur && !cur.eol && Math.abs(mid - cur.mid) < Math.max(h, cur.h) * 0.5) { cur.items.push(it); cur.x0 = Math.min(cur.x0, it.x0); cur.x1 = Math.max(cur.x1, it.x1); cur.y0 = Math.min(cur.y0, it.y0); cur.y1 = Math.max(cur.y1, it.y1) }
      else { cur = {items:[it], x0:it.x0, x1:it.x1, y0:it.y0, y1:it.y1, mid, h, eol:false}; lines.push(cur) }
      cur.eol = cur.eol || it.eol;
    }
    // each line's own text size and baseline come from its longest run (a sub- or superscript does not count)
    for (const ln of lines) { const m = ln.items.reduce((a, b) => b.s.textContent.length > a.s.textContent.length ? b : a); ln.h = m.y1 - m.y0; ln.base = m.y1; ln.mid = (m.y0 + m.y1) / 2 }
    // paragraphs: a new one after a wider gap than a line's, a jump back up (a new column), a change of text size, or an indented first line
    const ps = []; let pg = null;
    for (const ln of lines) {
      const prev = pg && pg.lines[pg.lines.length - 1], fh = prev && Math.min(ln.h, prev.h);
      const brk = !prev || ln.base - prev.base > fh * 1.42 || ln.mid < prev.mid - prev.h * 0.5 || Math.abs(ln.h - prev.h) > Math.max(ln.h, prev.h) * 0.2
        || (ln.x0 > pg.x0 + 1.6 && prev.x1 > ln.x0) || ln.x0 > prev.x1;
      if (brk) { pg = {lines:[ln], x0:ln.x0, x1:ln.x1, y0:ln.y0, y1:ln.y1}; ps.push(pg) }
      else { pg.lines.push(ln); pg.x0 = Math.min(pg.x0, ln.x0); pg.x1 = Math.max(pg.x1, ln.x1); pg.y0 = Math.min(pg.y0, ln.y0); pg.y1 = Math.max(pg.y1, ln.y1) }
    }
    // positions in page units, placed in whole screen pixels: Chrome sometimes fails to start a drag selection on text placed at a
    // fractional pixel (the mouse goes down, the selection never grows); snapped, it always does
    const W = p.vp.width / 100, Hh = p.vp.height / 100, px = v => 'round(nearest, calc(var(--total-scale-factor) * ' + v.toFixed(2) + 'px), 1px)';
    const end = L.querySelector('.endOfContent');
    for (const q of ps) {
      const e = document.createElement('p'); e.className = 'kb-pp';
      const X = q.x0 * W, Y = q.y0 * Hh;
      Object.assign(e.style, {left:px(X), top:px(Y), width:px(Math.max(q.x1 - q.x0, 0.01) * W), height:px(Math.max(q.y1 - q.y0, 0.01) * Hh)});
      for (const ln of q.lines) {
        ln.items.forEach((it, k) => {
          it.s.style.left = px(it.l * W - X); it.s.style.top = px(it.t * Hh - Y);
          if (k === ln.items.length - 1 && !/[\s-]$/.test(it.s.textContent)) it.s.textContent += ' ';
          e.append(it.s);
        });
      }
      L.insertBefore(e, end);
    }
  }

  (async () => {
    worker();
    let ok = false;
    try { ok = MODE === 'pdf' ? await pdf() : await html() } catch(e) { fail('The paper could not be shown.') }
    if (!ok) return;
    if (location.hash.length > 1 && location.hash !== '#kb-resume') { const t = document.getElementById(undo(location.hash.slice(1))); if (t) t.scrollIntoView() }
    buddy();
  })();
})();
