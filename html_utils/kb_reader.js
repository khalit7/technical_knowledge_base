// ---- The paper reader: an original paper on the site, with the AI buddy on it (html_utils/build_site.py writes the reader pages) ----
// A paper page whose pages.json entry has "reader": {"arxiv": "<id>v<n>"} gets paper/ next to it: the paper's PDF, fetched from arXiv
// by the browser (the site keeps no copy), drawn by pdf.js (vendored in html_utils/lib/pdfjs), with a text layer so it can be
// selected, marked and asked about. Notes on it are the reader page's own (the buddy keys notes by the page's address).
// The buddy loads only after the paper is on the page, because it reads the page as a document once, when it starts.
// Offline: the PDF (pinned to one arXiv version, so it never changes) is kept in the browser's Cache Storage the first time it is
// opened, with the reader's own files; a small service worker (paper/sw.js, html_utils/kb_reader_sw.js) serves them when there is no
// network. The Claude and GitHub calls never pass through it.
// No literal closing-head or opening-body tag may appear in this file (build_site.py inserts its bar at the first of each).
(function(){
  const me = document.currentScript, D = me.dataset, ID = D.arxiv;
  const ART = document.getElementById('kbPaper'), CACHE = 'kb-reader-v1';
  if (!ART || !/^\d{4}\.\d{4,5}v\d+$/.test(ID || '')) return;
  const PDF_URL = 'https://arxiv.org/pdf/' + ID;
  const status = (s, err) => { let p = document.getElementById('kbPaperStatus'); if (!p) { p = document.createElement('p'); p.id = 'kbPaperStatus'; ART.prepend(p) } p.className = 'rd-st' + (err ? ' err' : ''); p.textContent = ''; if (typeof s === 'string') p.textContent = s; else p.append(...s) };
  const link = (href, text) => { const a = document.createElement('a'); a.href = href; a.textContent = text; return a };

  // ---- the PDF: from Cache Storage when it was opened before (its version is pinned, so it never goes stale), else downloaded from
  // arXiv with its progress shown, and kept only when it really is a PDF (an error page sent with 200 must not be kept for good) ----
  const mb = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0);
  async function bytes(){
    let c = null; try { c = await caches.open(CACHE) } catch(e) {}
    if (c) { try { const r = await c.match(PDF_URL); if (r) return new Uint8Array(await r.arrayBuffer()) } catch(e) {} }
    const r = await fetch(PDF_URL, {mode:'cors', credentials:'omit'});
    if (!r.ok) throw Object.assign(new Error('status'), {status:r.status});
    const total = +r.headers.get('content-length') || 0, isPdf = /pdf/i.test(r.headers.get('content-type') || '');
    let buf;
    if (r.body && r.body.getReader) {
      const rd = r.body.getReader(), parts = []; let got = 0, shown = 0;
      for (;;) { const {done, value} = await rd.read(); if (done) break; parts.push(value); got += value.length;
        if (got - shown > 262144) { shown = got; status('Downloading the paper from arXiv: ' + mb(got) + (total ? ' of ' + mb(total) : '') + ' MB') } }
      buf = new Uint8Array(got); let o = 0; for (const x of parts) { buf.set(x, o); o += x.length }
    } else buf = new Uint8Array(await r.arrayBuffer());
    if (c && isPdf) { try { await c.put(PDF_URL, new Response(buf.slice(), {headers:{'content-type':'application/pdf'}})) } catch(e) {} }
    return buf;
  }
  async function forget(url){ try { await (await caches.open(CACHE)).delete(url) } catch(e) {} }
  // the reader's own files, so a second visit works offline (each on its own: one failure stops none)
  async function keep(urls){
    let c; try { c = await caches.open(CACHE) } catch(e) { return }
    // an older version of a versioned file (the reader, the buddy, pdf.js) is dropped: only the current ones are kept
    // (an entry goes only when another version of the same file is being kept now)
    try { const base = u => { const x = new URL(u, location.href); return x.origin + x.pathname.replace(/\/lib\/pdfjs-[^/]+\//, '/lib/pdfjs/') + (x.search.startsWith('?v=') ? '' : x.search) };
      const now = new Set(urls.filter(Boolean).map(u => new URL(u, location.href).href)), nowBase = new Set([...now].map(base));
      const lib = new URL(D.pdfjs, location.href).pathname;   // every file of another pdf.js version goes (its fonts and decoders too)
      for (const q of await c.keys()) { const u = new URL(q.url); if (u.origin !== location.origin) continue;
        if ((/\/lib\/pdfjs-[^/]+\//.test(u.pathname) && !u.pathname.startsWith(lib)) || ((u.search.startsWith('?v=') || /\/lib\/pdfjs-/.test(u.pathname)) && !now.has(u.href) && nowBase.has(base(u.href)))) await c.delete(q) } } catch(e) {}
    for (const u of new Set(urls.filter(Boolean))) { try { if (!(await c.match(u))) { const r = await fetch(u, {mode:new URL(u, location.href).origin === location.origin ? 'same-origin' : 'cors', credentials:'omit'}); if (r.ok) await c.put(u, r) } } catch(e) {} }
  }
  function worker(){
    try { if (D.sw && 'serviceWorker' in navigator) navigator.serviceWorker.register(D.sw, {scope:D.scope}).catch(() => {}) } catch(e) {}
  }
  const shell = () => [location.href.split('#')[0], me.src, D.buddy, D.kbindex];

  // the buddy, once the paper is on the page (it reads the page as a document when it starts)
  function buddy(){
    if (!D.buddy || window.__kbBuddyLoader) return; window.__kbBuddyLoader = 1;
    const s = document.createElement('script'); s.src = D.buddy; s.async = true; document.head.appendChild(s);
  }
  function fail(msg){ status([msg + ' ', link(PDF_URL, 'Open it on arXiv'), '.'], true) }

  // ---- pdf.js draws each page; its text layer is regrouped into paragraphs so the buddy can cite and anchor them ----
  let pdfjs = null, pdoc = null; const pages = [];
  async function pdf(){
    try { pdfjs = await import(D.pdfjs + 'pdf.min.mjs') } catch(e) { fail('The PDF viewer could not be loaded.'); return false }
    pdfjs.GlobalWorkerOptions.workerSrc = D.pdfjs + 'pdf.worker.min.mjs';
    let data;
    try { data = await bytes() }
    catch(e) { fail(e.status ? 'arXiv did not send the PDF (' + e.status + ').' : navigator.onLine === false ? 'You are offline, and this PDF has not been opened on this device yet.' : 'The PDF could not be loaded from arXiv.'); return false }
    // its fonts for text a paper does not embed, the character maps of non-Latin text, colour profiles and the image decoders
    // (JPEG 2000, JBIG2) come from the same vendored folder; scripts inside a PDF never run (no eval, no XFA, no scripting)
    const opt = {data, isEvalSupported:false, enableXfa:false, standardFontDataUrl:D.pdfjs + 'standard_fonts/', cMapUrl:D.pdfjs + 'cmaps/', cMapPacked:true, wasmUrl:D.pdfjs + 'wasm/', iccUrl:D.pdfjs + 'iccs/'};
    try { pdoc = await pdfjs.getDocument(opt).promise } catch(e) { await forget(PDF_URL); fail('The PDF could not be read.'); return false }
    status('Setting out ' + pdoc.numPages + ' pages...');
    const all = await Promise.all(Array.from({length:pdoc.numPages}, (_, k) => pdoc.getPage(k + 1)));
    const box = document.createDocumentFragment();
    all.forEach((page, k) => {
      const vp = page.getViewport({scale:1});
      const pg = document.createElement('div'); pg.className = 'pg'; pg.dataset.n = k + 1; pg.style.aspectRatio = vp.width + ' / ' + vp.height;
      const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
      const tl = document.createElement('div'); tl.className = 'textLayer';
      pg.append(cv, tl); box.append(pg);
      pages.push({i:k + 1, page, vp, pg, cv, tl, w:0, task:null});
    });
    ART.textContent = ''; ART.append(box); fit();
    // the pages are drawn when near the screen and let go when far from it (a tablet has little canvas memory); drawing starts now,
    // before the text layers, so the paper shows at once
    const io = new IntersectionObserver(es => { for (const e of es) { const p = pages[+e.target.dataset.n - 1]; if (e.isIntersecting) draw(p); else drop(p) } }, {rootMargin:'150% 0px'});
    for (const p of pages) io.observe(p.pg);
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
    // the text layer follows the width at once (the buddy places marks by it); the pages are drawn again a moment later
    let rt = 0; const refit = () => { if (!fit()) return; dispatchEvent(new Event('resize')); clearTimeout(rt); rt = setTimeout(() => { for (const p of pages) if (p.w) { p.w = -1; draw(p) } }, 150) };
    new ResizeObserver(refit).observe(ART);
    // a window moved to a screen of another pixel density is drawn again, sharp (no resize happens then)
    const dens = () => { try { matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)').addEventListener('change', () => { refit(); dens() }, {once:true}) } catch(e) {} }; dens();
    // then each page's text (the handlers above already work on the pages that have it), with a pause between pages so the drawing goes on; the buddy starts once all of it is there (it reads
    // the page as a document once). A line in the top bar says how far it is
    const bar = document.querySelector('.rd-bar'), prep = document.createElement('span'); prep.className = 'rd-prep'; if (bar) bar.insertBefore(prep, bar.querySelector('.rd-src'));
    for (const p of pages) {
      if (pages.length > 8) prep.textContent = 'Preparing the text for the AI buddy: page ' + p.i + ' of ' + pages.length;
      try { await new pdfjs.TextLayer({textContentSource:p.page.streamTextContent(), container:p.tl, viewport:p.vp}).render(); paras(p) } catch(e) {}
      const end = document.createElement('div'); end.className = 'endOfContent'; p.tl.append(end);
      await new Promise(z => setTimeout(z, 0));
    }
    prep.remove();
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
    // every run is measured first and the page changed only after: a change between two measurements would lay the page out again
    // each time (a figure full of text can hold 20,000 runs)
    const items = [], gone = [];
    for (const s of L.children) {
      if (s.tagName !== 'SPAN') { if (s.tagName === 'BR' && items.length) items[items.length - 1].eol = true; gone.push(s); continue }
      const r = s.getBoundingClientRect();
      items.push({s, x0:(r.left - lr.left) / lr.width * 100, x1:(r.right - lr.left) / lr.width * 100, y0:(r.top - lr.top) / lr.height * 100, y1:(r.bottom - lr.top) / lr.height * 100, eol:false,
        l:parseFloat(s.style.left) || 0, t:parseFloat(s.style.top) || 0});
    }
    for (const g of gone) g.remove();
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
    try { ok = await pdf() } catch(e) { fail('The paper could not be shown.') }
    if (ok) buddy();
  })();
})();
