// ---- Notebook: a study partner you write to by hand (Apple Pencil, pen, mouse) or keyboard; after a pause, Claude reads it and thinks with you ----
// Pilot (2026-11-18) on the Attention Is All You Need page. Source of truth: html_utils/apply_diary.py copies this file, as one marked
// script block (id kb-diary), into the source part that closes the page's <head>; edit it here, rerun apply_diary.py and rebuild.
// Self-contained: injects its own style, button and panel once the DOM is ready. One panel serves both views: a drawer on the right
// and a full-screen notebook (the toggle only changes its size, so both show the same page and the same saved pages).
// Flow: ink and typing collect on the paper; 3 s after the last pen lift or key press the page is committed: the ink is cropped
// into a PNG (black on white) and sent with any typed text, the section in view and the last exchanges to the Claude API. The
// reader's ink fades; the reply writes itself on the paper in a handwriting face and fades when the pen comes down again.
// Every exchange (transcription, reply, a small image of the ink) is kept in this browser (IndexedDB) under the page's address.
// The API key and model are shared with the Ask Claude panel (localStorage kbAsk.*); requests go straight to api.anthropic.com.
(function(){
  if (window.__kbDiary) return; window.__kbDiary = 1;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  function init(){
  const API = 'https://api.anthropic.com/v1/messages', PAUSE = 3000, KEEP = 12;
  const MODELS = {
    'claude-opus-5-5':   {name:'Claude Opus 5.5',   in:4, write:5, read:0.2, out:20},
    'claude-sonnet-5-5': {name:'Claude Sonnet 5.5', in:2, write:2.5, read:0.1, out:10}
  };
  const store = {
    get(k){ try { return localStorage.getItem('kbAsk.' + k) } catch(e) { return store.m[k] || null } },
    set(k, v){ try { v == null ? localStorage.removeItem('kbAsk.' + k) : localStorage.setItem('kbAsk.' + k, v) } catch(e) { store.m[k] = v } },
    m: {}
  };
  const model = () => MODELS[store.get('model')] ? store.get('model') : 'claude-opus-5-5';

  // handwriting face for the replies (falls back to the system's cursive when offline)
  const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap'; document.head.appendChild(fl);

  const css = `
#kbDiaryBtn{position:fixed;right:16px;bottom:62px;z-index:60;border-radius:99px;padding:8px 14px;font-size:13.5px;font-weight:600;background:var(--card,var(--bg));border:1px solid var(--acc);color:var(--acc);box-shadow:var(--shadow,0 4px 14px rgba(0,0,0,.18))}
#kbDiaryBtn:hover{filter:brightness(1.08)}
#kbDiary{position:fixed;z-index:63;top:0;right:0;bottom:0;width:min(560px,100vw);display:flex;flex-direction:column;background:var(--card,var(--bg));color:var(--ink);border-left:1px solid var(--line);box-shadow:var(--shadow,0 0 24px rgba(0,0,0,.2));font-size:14.5px;line-height:1.55}
#kbDiary.kd-full{width:100vw;border-left:0}
#kbDiary[hidden],#kbDiaryBtn[hidden],#kbDiary [hidden]{display:none!important}
#kbDiary .kd-h{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid var(--line)}
#kbDiary .kd-h b{flex:1;font-size:14px}
#kbDiary .kd-h button{padding:2px 9px;font-size:12.5px}
#kbDiary .kd-h button[aria-pressed=true]{background:var(--soft);border-color:var(--acc)}
#kbDiary .kd-paper{position:relative;flex:1;min-height:0;overflow:hidden;background:var(--card,var(--bg));background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 35px,color-mix(in srgb,var(--line) 70%,transparent) 35px,color-mix(in srgb,var(--line) 70%,transparent) 36px);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#kbDiary.kd-full .kd-paper{margin:0 auto;width:min(900px,100%);border-left:1px solid var(--line);border-right:1px solid var(--line)}
#kbDiary canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;transition:opacity 1.4s ease}
#kbDiary .kd-reply{position:absolute;left:0;right:0;top:0;padding:6px 22px;font-family:Caveat,"Bradley Hand","Segoe Print",cursive;font-size:27px;line-height:36px;color:var(--acc);pointer-events:none;transition:opacity 1.2s ease;white-space:pre-wrap;overflow-wrap:anywhere}
#kbDiary .kd-reply span{display:inline;animation:kdInk .5s ease-out both}
@keyframes kdInk{from{opacity:0;filter:blur(2px)}to{opacity:1;filter:none}}
#kbDiary .kd-fade{opacity:0}
#kbDiary .kd-st{position:absolute;right:10px;bottom:6px;font-size:11.5px;color:var(--mute);pointer-events:none}
#kbDiary .kd-f{border-top:1px solid var(--line);padding:8px 10px 10px}
#kbDiary.kd-full .kd-f{width:min(900px,100%);margin:0 auto}
#kbDiary textarea{width:100%;min-height:44px;max-height:160px;resize:vertical;font:inherit;color:inherit;background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:6px 8px}
#kbDiary textarea:focus,#kbDiary input:focus{outline:2px solid var(--acc);outline-offset:-1px}
#kbDiary .kd-row{display:flex;gap:6px;align-items:center;margin-top:6px}
#kbDiary .kd-row .kd-sp{flex:1;color:var(--mute);font-size:11.5px}
#kbDiary .kd-row button{padding:2px 9px;font-size:12.5px}
#kbDiary .kd-go{background:var(--acc);border-color:var(--acc);color:var(--card,var(--bg));font-weight:600}
#kbDiary .kd-log,#kbDiary .kd-set{flex:1;overflow-y:auto;padding:10px 16px;overscroll-behavior:contain}
#kbDiary.kd-full .kd-log,#kbDiary.kd-full .kd-set{width:min(900px,100%);margin:0 auto}
#kbDiary .kd-e{border-bottom:1px solid var(--line);padding:10px 0}
#kbDiary .kd-e time{color:var(--mute);font-size:11.5px}
#kbDiary .kd-e img{display:block;max-width:100%;max-height:160px;margin:4px 0;border:1px solid var(--line);border-radius:6px;background:#fff}
#kbDiary .kd-me{white-space:pre-wrap;margin:2px 0 6px}
#kbDiary .kd-me::before{content:"You: ";color:var(--mute)}
#kbDiary .kd-cl{font-family:Caveat,"Bradley Hand","Segoe Print",cursive;font-size:22px;line-height:1.3;color:var(--acc);white-space:pre-wrap}
#kbDiary .kd-hint{color:var(--mute);font-size:13px}
#kbDiary .kd-err{color:var(--bad,#c2703a)}
#kbDiary .kd-set label{display:block;font-weight:600;margin:10px 0 4px;font-size:13px}
#kbDiary .kd-set input,#kbDiary .kd-set select{width:100%}
#kbDiary .kd-set p{font-size:13px;color:var(--mute);margin:6px 0}
#kbDiary a{color:var(--acc)}
@media (max-width:520px){#kbDiaryBtn{right:12px;bottom:54px;padding:6px 12px;font-size:13px}}
@media print{#kbDiaryBtn,#kbDiary{display:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = (t, a, h) => { const e = document.createElement(t); if (a) for (const k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const btn = el('button', {id:'kbDiaryBtn', type:'button', 'aria-haspopup':'dialog', title:'Write your thoughts by hand or keyboard; Claude reads them after a pause and thinks with you'}, 'Notebook');
  const P = el('div', {id:'kbDiary', role:'dialog', 'aria-label':'Notebook: think with Claude', hidden:''});
  P.innerHTML = `<div class="kd-h"><b>Notebook</b><button type="button" data-a="pages" aria-pressed="false" title="Earlier pages of this notebook">Pages</button><button type="button" data-a="full" aria-pressed="false" title="Full-screen notebook">Full screen</button><button type="button" data-a="set" title="API key and model">Settings</button><button type="button" data-a="close" title="Close (Esc)" aria-label="Close">&#x2715;</button></div>
<div class="kd-paper"><canvas aria-label="Writing area: write with a pen or the mouse"></canvas><div class="kd-reply" aria-live="polite"></div><div class="kd-st"></div></div>
<div class="kd-log" hidden></div>
<div class="kd-set" hidden></div>
<div class="kd-f"><textarea rows="2" placeholder="Write on the page above, or type here. Claude reads it about 3 seconds after you stop."></textarea>
<div class="kd-row"><button type="button" data-a="undo" title="Remove the last stroke">Undo</button><button type="button" data-a="clear" title="Clear what you have not sent yet">Clear</button><span class="kd-sp"></span><button type="button" class="kd-go" data-a="send" title="Send now instead of waiting">Send now</button></div></div>`;
  document.body.append(btn, P);
  const $ = s => P.querySelector(s);
  const paper = $('.kd-paper'), cv = $('canvas'), reply = $('.kd-reply'), stat = $('.kd-st'), log = $('.kd-log'), setv = $('.kd-set'), foot = $('.kd-f'), ta = $('textarea');
  const ctx2 = cv.getContext('2d');

  // ---- saved pages: IndexedDB in this browser, one list per page address (in memory if storage is blocked) ----
  const PAGE_ID = location.pathname.replace(/index\.html$/, '');
  let entries = [];
  const db = new Promise(res => {
    try { const r = indexedDB.open('kbDiary', 1); r.onupgradeneeded = () => r.result.createObjectStore('entries', {keyPath:'id', autoIncrement:true}).createIndex('page', 'page'); r.onsuccess = () => res(r.result); r.onerror = () => res(null) } catch(e) { res(null) }
  });
  const tx = async (mode, f) => { const d = await db; if (!d) return null; return new Promise(res => { try { const t = d.transaction('entries', mode), s = t.objectStore('entries'); const r = f(s); t.oncomplete = () => res(r && r.result); t.onerror = () => res(null) } catch(e) { res(null) } }) };
  tx('readonly', s => s.index('page').getAll(PAGE_ID)).then(r => { if (r) entries = r.sort((a, b) => a.t - b.t) });
  const save = e => { entries.push(e); tx('readwrite', s => s.add(e)).then(id => { if (id != null) e.id = id }) };

  // ---- ink: strokes in CSS pixels, each point [x, y, pressure] ----
  let strokes = [], cur = null, stale = false, penSeen = false, timer = 0, dpr = 1, inkColor = '#222';
  function size(){
    const r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    inkColor = getComputedStyle(P).color || '#222'; redraw();
  }
  function seg(c, a, b, w){ c.lineWidth = w * (0.45 + 0.85 * ((a[2] + b[2]) / 2)); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke() }
  function drawStroke(c, s, w){
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.length === 1) { c.beginPath(); c.arc(s[0][0], s[0][1], w * (0.45 + 0.85 * s[0][2]) / 2, 0, 7); c.fill(); return }
    for (let i = 1; i < s.length; i++) seg(c, s[i - 1], s[i], w);
  }
  function redraw(){
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); ctx2.clearRect(0, 0, cv.width, cv.height);
    ctx2.strokeStyle = ctx2.fillStyle = inkColor; for (const s of strokes) drawStroke(ctx2, s, 2.6);
  }
  new ResizeObserver(size).observe(cv);
  const pt = (e, r) => [e.clientX - r.left, e.clientY - r.top, e.pointerType === 'pen' ? (e.pressure || 0.05) : 0.5];
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen') penSeen = true;
    else if (e.pointerType === 'touch' && penSeen) return;   // after a pen is seen, a resting palm or finger does not draw
    if (e.button > 0) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId); clearTimeout(timer); fadeReply(); unfadeInk();
    const r = cv.getBoundingClientRect(); cur = {id:e.pointerId, r, p:[pt(e, r)]}; strokes.push(cur.p);
    ctx2.strokeStyle = ctx2.fillStyle = inkColor; drawStroke(ctx2, cur.p, 2.6); status('');
  });
  cv.addEventListener('pointermove', e => {
    if (!cur || e.pointerId !== cur.id) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const x of (evs.length ? evs : [e])) { const p = pt(x, cur.r), q = cur.p[cur.p.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6) continue; cur.p.push(p); seg(ctx2, q, p, 2.6) }
  });
  const up = e => { if (!cur || e.pointerId !== cur.id) return; cur = null; arm() };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  ta.addEventListener('input', () => { fadeReply(); unfadeInk(); ta.value.trim() ? arm() : (strokes.length ? arm() : clearTimeout(timer)) });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit() } });
  function arm(){ clearTimeout(timer); if (!strokes.length && !ta.value.trim()) return; status('Reading in 3 s…'); timer = setTimeout(commit, PAUSE) }
  function status(s){ stat.textContent = s }
  function fadeReply(){ if (reply.textContent) { reply.classList.add('kd-fade'); setTimeout(() => { if (reply.classList.contains('kd-fade')) { reply.innerHTML = ''; reply.classList.remove('kd-fade') } }, 1200) } }
  function unfadeInk(){ if (stale) { stale = false; cv.classList.remove('kd-fade'); redraw() } }   // writing again: drop the fading ink at once

  // the committed ink as a PNG: cropped to the strokes, black on white, longest side at most 1280 px
  function snapshot(ss){
    if (!ss.length) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of ss) for (const p of s) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]) }
    const pad = 16; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const w = x1 - x0, h = y1 - y0, k = Math.min(2, 1280 / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); g.strokeStyle = g.fillStyle = '#111';
    for (const s of ss) drawStroke(g, s, 2.6);
    return c.toDataURL('image/png');
  }
  function thumb(src){ return new Promise(res => { const i = new Image(); i.onload = () => { const k = Math.min(1, 480 / i.width, 200 / i.height), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7)) }; i.onerror = () => res(null); i.src = src }) }

  // ---- page text and where the reader is (same extraction as Ask Claude; frozen so the cached prefix stays identical) ----
  const SKIP = /^(SCRIPT|STYLE|SVG|CANVAS|BUTTON|SELECT|INPUT|TEXTAREA|NAV|TEMPLATE|NOSCRIPT)$/;
  const BLOCK = /^(P|DIV|LI|UL|OL|SECTION|ARTICLE|DETAILS|SUMMARY|FIGURE|FIGCAPTION|TABLE|TR|PRE|BLOCKQUOTE|H[1-6]|BR|HR|DL|DT|DD|ASIDE|HEADER|FOOTER|MAIN)$/;
  function walk(n, out){
    if (n.nodeType === 3) { out.push(n.nodeValue); return }
    if (n.nodeType !== 1) return;
    const t = n.tagName.toUpperCase();
    if (SKIP.test(t) || n.id === 'jsErr' || n.id === 'kbAsk' || n.id === 'kbDiary' || n.getAttribute('aria-hidden') === 'true') return;
    const b = BLOCK.test(t);
    if (b) out.push('\n');
    if (/^H[1-6]$/.test(t)) out.push('#'.repeat(+t[1]) + ' ');
    if (t === 'LI') out.push('- ');
    if (t === 'SUP') out.push('^'); else if (t === 'SUB') out.push('_');
    for (const c of n.childNodes) walk(c, out);
    if (t === 'TD' || t === 'TH') out.push(' | ');
    if (b) out.push('\n');
  }
  const clean = s => s.replace(/[ \t ]+/g, ' ').split('\n').map(l => l.trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim())).join('\n').trim();
  const tabName = tab => { const b = tab && document.querySelector('[role=tab][data-t="' + tab.id + '"]'); return b ? b.textContent.trim() : '' };
  let PAGE = null;
  function pageText(){
    if (PAGE) return PAGE;
    const root = document.querySelector('.w') || document.body, parts = [];
    const tabs = [...root.querySelectorAll('.tab')];
    const head = []; for (const c of root.childNodes) { if (c.nodeType === 1 && (c.classList.contains('tab') || c.querySelector && c.querySelector('.tab'))) break; walk(c, head) }
    parts.push(clean(head.join('')));
    if (tabs.length) for (const t of tabs) { const o = []; walk(t, o); parts.push('=== Tab: ' + (tabName(t) || t.id) + ' ===\n' + clean(o.join(''))) }
    else { const o = []; walk(root, o); parts[0] = clean(o.join('')) }
    PAGE = 'Title: ' + document.title + '\n\n' + parts.filter(Boolean).join('\n\n');
    if (PAGE.length > 600000) PAGE = PAGE.slice(0, 600000) + '\n[page text cut here]';
    return PAGE;
  }
  function inView(){
    const b = document.querySelector('[role=tab][aria-selected=true]'), tab = b && document.getElementById(b.dataset.t);
    let h = null; for (const x of (tab || document).querySelectorAll('h2,h3')) { if (x.getBoundingClientRect().top < window.innerHeight * 0.45) h = x; else break }
    return [b && 'tab "' + b.textContent.trim() + '"', h && 'section "' + h.textContent.trim().replace(/\s+/g, ' ') + '"'].filter(Boolean).join(', ');
  }

  const SYSTEM = `You are a thinking partner in the reader's notebook, beside one page of their personal technical knowledge base (interactive explainer pages on AI/ML and systems). The page's text is below between <page> tags; figures and labs are not included, only their text and captions. The reader writes to you by hand (you get an image of their ink) or by keyboard, then pauses; you answer on the same paper.
Your job is to think with them, not to lecture or test them. They read to understand deeply, not to memorise: never quiz them.
- Take up exactly what they wrote: build on the idea, sharpen it, connect it to the page (name the section when useful), or point out gently where it goes wrong and why.
- At most one question back, and only when it would genuinely move their thinking forward. Often no question is better.
- Short: usually 1 to 4 sentences, plain words, like a note written in the margin. Never use lists, headings, bold, code fences or LaTeX; write maths inline with Unicode (softmax(QKᵀ/√d), ×, ², ᵀ). Do not use em dashes.
- Use the page first; when you go beyond it, say so briefly. Never invent numbers or citations.
- If their handwriting is unclear, say what you read and ask if that is right.
Output format, always: first <read>exactly what they wrote, transcribed (handwriting and typed text; describe any sketch in a few words in brackets)</read>, then your reply as plain text after it.`;

  // ---- sending: the committed page, the section in view and the last exchanges ----
  let busy = false, queued = null, spent = 0;
  const cents = (u, m) => { const p = MODELS[m]; if (!p || !u) return 0; return ((u.input_tokens || 0) * p.in + (u.cache_creation_input_tokens || 0) * p.write + (u.cache_read_input_tokens || 0) * p.read + (u.output_tokens || 0) * p.out) / 1e4 };
  function commit(){
    clearTimeout(timer);
    const typed = ta.value.trim(); if (!strokes.length && !typed) return;
    if (!store.get('key')) { showView('set'); return }
    const img = snapshot(strokes), job = {img, typed};
    // the sent ink fades into the paper; typed text leaves the box at once so new typing starts clean
    strokes = []; ta.value = ''; stale = true; cv.classList.add('kd-fade');
    setTimeout(() => { if (stale) { stale = false; redraw(); cv.classList.remove('kd-fade') } }, 1400);
    if (busy) { queued = job; status('Will read after this reply…'); return }
    send(job);
  }
  function history(){
    const h = [];
    for (const e of entries.slice(-KEEP)) h.push({role:'user', content:'(an earlier page of the notebook; they wrote:) ' + (e.read || e.typed || '')}, {role:'assistant', content:e.reply || '…'});
    return h;
  }
  async function send(job){
    busy = true; status('Reading…'); reply.classList.remove('kd-fade'); reply.innerHTML = '';
    const m = model(), where = inView();
    const content = [];
    if (job.img) content.push({type:'image', source:{type:'base64', media_type:'image/png', data:job.img.split(',')[1]}});
    content.push({type:'text', text:(where ? 'They are reading the ' + where + '.\n' : '') + (job.img ? 'Their handwriting is in the image.' : 'They wrote nothing by hand this time.') + (job.typed ? '\nTyped:\n' + job.typed : '')});
    let raw = '', shown = 0, usage = {}, stop = null, queue = [], drip = 0;
    const replyPart = () => { const i = raw.indexOf('</read>'); if (i >= 0) return raw.slice(i + 7).replace(/^\s+/, ''); return /^\s*<read/.test(raw) || raw.length < 6 ? '' : raw };
    const pump = () => { if (drip) return; drip = setInterval(() => { if (!queue.length) { clearInterval(drip); drip = 0; return } const w = queue.shift(); reply.appendChild(el('span', null, esc(w))) }, 70) };
    const feed = () => { const r = replyPart(); if (r.length <= shown) return; const nl = r.lastIndexOf(' ') + 1; const upto = stop ? r.length : Math.max(shown, nl); if (upto <= shown) return; const chunk = r.slice(shown, upto); shown = upto; queue.push(...chunk.match(/\S+\s*|\s+/g) || []); pump() };
    try {
      const res = await fetch(API, {method:'POST', headers:{'content-type':'application/json', 'x-api-key':store.get('key'), 'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true', 'anthropic-beta':'server-side-fallback-2026-07-01'},
        body: JSON.stringify({model:m, max_tokens:4000, stream:true, output_config:{effort:'low'}, fallbacks:'default',
          system:[{type:'text', text:SYSTEM}, {type:'text', text:'<page>\n' + pageText() + '\n</page>', cache_control:{type:'ephemeral'}}],
          messages:history().concat([{role:'user', content}])})});
      if (!res.ok) { let msg = res.status + ' ' + res.statusText; try { const j = await res.json(); msg = (j.error && j.error.message) || msg } catch(e) {} throw new Error(res.status === 401 ? 'The API key was not accepted. Check it in Settings.' : msg) }
      status('Writing…');
      const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const {value, done} = await rd.read(); if (done) break;
        buf += dec.decode(value, {stream:true});
        let k; while ((k = buf.indexOf('\n\n')) >= 0) {
          const evt = buf.slice(0, k); buf = buf.slice(k + 2);
          const data = evt.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
          if (!data) continue; let d; try { d = JSON.parse(data) } catch(e) { continue }
          if (d.type === 'message_start') Object.assign(usage, d.message.usage || {});
          else if (d.type === 'content_block_delta' && d.delta.type === 'text_delta') { raw += d.delta.text; feed() }
          else if (d.type === 'message_delta') { if (d.delta && d.delta.stop_reason) stop = d.delta.stop_reason; Object.assign(usage, d.usage || {}) }
          else if (d.type === 'error') throw new Error((d.error && d.error.message) || 'stream error');
        }
      }
      stop = stop || 'end_turn'; feed();
      const m2 = raw.match(/<read>([\s\S]*?)<\/read>/), text = replyPart().trim();
      if (stop === 'refusal' && !text) reply.innerHTML = '<span class="kd-err">Claude declined to answer this one.</span>';
      const c = cents(usage, m); spent += c;
      status(MODELS[m].name + ' · ≈ ' + c.toFixed(2) + '¢ (this visit ≈ ' + spent.toFixed(1) + '¢)');
      save({page:PAGE_ID, t:Date.now(), where, typed:job.typed, read:m2 ? m2[1].trim() : '', reply:text, img:job.img ? await thumb(job.img) : null});
    } catch(e) {
      reply.innerHTML = '<span class="kd-err" style="font:14px/1.5 system-ui,sans-serif">' + esc(String(e.message || e)) + '</span>'; status('');
    } finally {
      busy = false;
      if (queued) { const j = queued; queued = null; send(j) }
    }
  }

  // ---- views: paper (default), saved pages, settings ----
  let view = 'paper';
  function showView(v){
    view = v; const paperOn = v === 'paper';
    paper.hidden = !paperOn; foot.hidden = !paperOn; log.hidden = v !== 'pages'; setv.hidden = v !== 'set';
    $('[data-a=pages]').setAttribute('aria-pressed', String(v === 'pages'));
    if (v === 'pages') renderLog();
    if (v === 'set') renderSet();
    if (paperOn) requestAnimationFrame(size);
  }
  function renderLog(){
    if (!entries.length) { log.innerHTML = '<p class="kd-hint">No pages yet. What you write and what Claude answers are kept here, in this browser only.</p>'; return }
    log.innerHTML = '<div class="kd-row" style="margin:0 0 6px"><span class="kd-sp">' + entries.length + ' page' + (entries.length > 1 ? 's' : '') + ' on this page of the knowledge base, kept in this browser.</span><button type="button" data-a="wipe">Delete all</button></div>' +
      entries.slice().reverse().map(e => '<div class="kd-e"><time>' + esc(new Date(e.t).toLocaleString()) + (e.where ? ' · ' + esc(e.where) : '') + '</time>' + (e.img ? '<img alt="Your handwriting" src="' + e.img + '">' : '') +
        '<div class="kd-me">' + esc(e.read || e.typed || '') + '</div><div class="kd-cl">' + esc(e.reply || '') + '</div></div>').join('');
  }
  function renderSet(){
    const k = store.get('key');
    setv.innerHTML = `<label for="kbDiaryKey">Claude API key</label>
<input id="kbDiaryKey" type="password" autocomplete="off" spellcheck="false" placeholder="${k ? 'saved (ending ' + esc(k.slice(-4)) + ')' : 'sk-ant-...'}">
<div class="kd-row"><button type="button" class="kd-go" data-a="save">Save</button>${k ? '<button type="button" data-a="forget">Forget key</button>' : ''}<span class="kd-sp"></span><button type="button" data-a="back">Back</button></div>
<p>The same key and model as Ask Claude. Create a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>; API use is billed per page you write, separately from a Claude subscription.</p>
<p>The key is saved only in this browser. Each pause sends this page's text, an image of your ink, what you typed and your last ${KEEP} exchanges from your browser straight to api.anthropic.com; your notebook pages stay in this browser.</p>
<label for="kbDiaryModel">Model</label><select id="kbDiaryModel">${Object.keys(MODELS).map(m => '<option value="' + m + '"' + (m === model() ? ' selected' : '') + '>' + MODELS[m].name + '</option>').join('')}</select>`;
    setv.querySelector('select').onchange = e => store.set('model', e.target.value);
  }
  setv.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); setv.querySelector('[data-a=save]').click() } });
  P.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return; e.preventDefault();
    const act = a.dataset.a;
    if (act === 'close') close();
    else if (act === 'full') { const on = P.classList.toggle('kd-full'); a.setAttribute('aria-pressed', String(on)); a.textContent = on ? 'Drawer' : 'Full screen'; if (view === 'paper') requestAnimationFrame(size) }
    else if (act === 'pages') showView(view === 'pages' ? 'paper' : 'pages');
    else if (act === 'set') showView(view === 'set' ? 'paper' : 'set');
    else if (act === 'back') showView('paper');
    else if (act === 'save') { const v = setv.querySelector('input').value.trim(); if (v) store.set('key', v); showView('paper') }
    else if (act === 'forget') { store.set('key', null); renderSet() }
    else if (act === 'undo') { strokes.pop(); redraw(); strokes.length || ta.value.trim() ? arm() : (clearTimeout(timer), status('')) }
    else if (act === 'clear') { strokes = []; ta.value = ''; redraw(); clearTimeout(timer); status('') }
    else if (act === 'send') commit();
    else if (act === 'wipe') { if (!confirm('Delete every notebook page for this page of the knowledge base? This cannot be undone.')) return; for (const x of entries) if (x.id != null) await tx('readwrite', s => s.delete(x.id)); entries = []; renderLog() }
  });

  let lastFocus = null;
  function open(){ lastFocus = document.activeElement; P.hidden = false; btn.hidden = true; showView(store.get('key') ? 'paper' : 'set') }
  function close(){ P.hidden = true; btn.hidden = false; if (lastFocus && lastFocus.focus) lastFocus.focus() }
  btn.onclick = open;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !P.hidden) close() });
}
})();
