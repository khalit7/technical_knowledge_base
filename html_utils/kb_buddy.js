// ---- AI buddy: one button for a handwritten Notebook and a Chat with Claude, both seeing what the reader sees ----
// Pilot (2026-11-18/19) on the Attention Is All You Need page. Source of truth: html_utils/apply_buddy.py copies this file, as one marked
// script block (id kb-buddy), into the source part that closes the page's <head>; edit it here, rerun apply_buddy.py and rebuild.
// On a page that has it, it replaces the Ask Claude button (kb_ask.js stays on the page but its button is hidden).
// Window: floats over the page (drag it by its title bar, resize it from the corner; the place and size are remembered) or fills
//   the screen. Notebook and Chat share it, with the same context and the same key.
// Notebook: write with Apple Pencil, pen, finger or mouse, or type; 3 s after the last stroke or key press the ink is cropped into
//   an image and sent. The reader's ink fades; the reply writes itself in a handwriting face (with a small pen sketch when a picture
//   helps) and fades when the pen comes down again. Every exchange is kept in this browser (IndexedDB, the Pages view).
// Chat: plain questions and answers, as in Ask Claude.
// Draw on the page: a clear sheet over the whole screen; circle, underline, annotate or sketch in red with pen, finger or mouse;
//   3 s after the last stroke Claude gets the screen with the ink on it, the ink fades, and the reply writes itself in a card beside the marks.
// Context sent with every turn (when "see the screen" is on): the page's full text (cached), the tab and section in view, the text
//   in view, the values of the controls in view, the reader's highlight, and an image of the screen rebuilt in the browser (boxes and text as laid
//   out, the figures, animations at their current frame and images at their positions, the highlight in yellow, page ink in red),
//   made from the page's own DOM, canvases and SVGs; nothing outside the page is loaded except the handwriting font.
// The API key and model are shared with Ask Claude (localStorage kbAsk.*); requests go straight to api.anthropic.com.
(function(){
  if (window.__kbBuddy) return; window.__kbBuddy = 1;
  // keep WebGL drawing buffers readable, so a 3D view can be captured between frames (runs before the page's own scripts)
  try { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, o){ if (/webgl/i.test(String(t))) o = Object.assign({}, o, {preserveDrawingBuffer:true}); return gc.call(this, t, o) } } catch(e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  function init(){
  const API = 'https://api.anthropic.com/v1/messages', PAUSE = 3000, KEEP = 12;
  const MODELS = {
    'claude-opus-5-5':   {name:'Claude Opus 5.5',   in:4, write:5, read:0.2, out:20},
    'claude-sonnet-5-5': {name:'Claude Sonnet 5.5', in:2, write:2.5, read:0.1, out:10}
  };
  const mem = {};
  const ls = (pre) => ({
    get(k){ try { return localStorage.getItem(pre + k) } catch(e) { return mem[pre + k] || null } },
    set(k, v){ try { v == null ? localStorage.removeItem(pre + k) : localStorage.setItem(pre + k, v) } catch(e) { mem[pre + k] = v } }
  });
  const store = ls('kbAsk.'), mine = ls('kbBuddy.');
  const model = () => MODELS[store.get('model')] ? store.get('model') : 'claude-opus-5-5';
  const seeOn = () => mine.get('see') !== 'off';

  const fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap'; document.head.appendChild(fl);
  const HAND = 'Caveat,"Bradley Hand","Segoe Print",cursive';

  const css = `
#kbAskBtn,#kbAskSel{display:none!important}
#kbBuddyBtn{position:fixed;right:16px;bottom:16px;z-index:60;border-radius:99px;padding:8px 15px;font-size:13.5px;font-weight:600;background:var(--acc);border:1px solid var(--acc);color:var(--card,var(--bg));box-shadow:var(--shadow,0 4px 14px rgba(0,0,0,.18))}
#kbBuddyBtn:hover{filter:brightness(1.08)}
#kbBuddyMenu{position:fixed;right:16px;bottom:58px;z-index:61;display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--card,var(--bg));border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow,0 4px 14px rgba(0,0,0,.18))}
#kbBuddyMenu button{text-align:left;padding:7px 12px;font-size:13.5px;border-radius:8px;line-height:1.35}
#kbBuddyMenu small{display:block;color:var(--mute);font-size:11.5px}
#kbBuddy{position:fixed;z-index:63;display:flex;flex-direction:column;min-width:290px;min-height:300px;background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow,0 6px 28px rgba(0,0,0,.25));font-size:14.5px;line-height:1.55;overflow:hidden}
#kbBuddy.kb-full{inset:0!important;width:auto!important;height:auto!important;border-radius:0;border:0}
#kbBuddy[hidden],#kbBuddyBtn[hidden],#kbBuddyMenu[hidden],#kbBuddy [hidden]{display:none!important}
#kbBuddy .kb-h{display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:7px 8px 7px 10px;border-bottom:1px solid var(--line);cursor:move;touch-action:none;-webkit-user-select:none;user-select:none;background:var(--soft)}
#kbBuddy.kb-full .kb-h{cursor:default}
#kbBuddy .kb-h button{padding:2px 8px;font-size:12.5px;cursor:pointer;white-space:nowrap}
#kbBuddy .kb-h .kb-sp{flex:1;min-width:4px}
#kbBuddy .kb-tabs{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
#kbBuddy .kb-tabs button{border:0;border-radius:0;padding:3px 10px;font-weight:600;background:transparent}
#kbBuddy .kb-tabs button[aria-pressed=true]{background:var(--acc);color:var(--card,var(--bg))}
#kbBuddy .kb-h button.kb-on{border-color:var(--acc)}
#kbBuddy .kb-hl{display:flex;gap:6px;align-items:flex-start;padding:6px 10px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--mute)}
#kbBuddy .kb-hl q{flex:1;max-height:3.1em;overflow:hidden;color:var(--ink);border-left:3px solid #e0b400;padding-left:6px;quotes:none}
#kbBuddy .kb-hl button{padding:0 7px;font-size:12px}
#kbBuddy .kb-grip{position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;touch-action:none;z-index:2;background:linear-gradient(135deg,transparent 0 50%,var(--line) 50% 56%,transparent 56% 66%,var(--line) 66% 72%,transparent 72% 82%,var(--line) 82% 88%,transparent 88%)}
#kbBuddy.kb-full .kb-grip{display:none}
#kbBuddy .kb-view{flex:1;min-height:0;display:flex;flex-direction:column}
#kbBuddy .kd-paper{position:relative;flex:1;min-height:0;overflow:hidden;background:var(--card,var(--bg));background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 35px,color-mix(in srgb,var(--line) 70%,transparent) 35px,color-mix(in srgb,var(--line) 70%,transparent) 36px);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#kbBuddy canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;transition:opacity 1.4s ease}
#kbBuddy .kd-reply{position:absolute;left:0;right:0;top:0;bottom:0;overflow:hidden;padding:6px 22px;font-family:${HAND};font-size:27px;line-height:36px;color:var(--acc);pointer-events:none;transition:opacity 1.2s ease;white-space:pre-wrap;overflow-wrap:anywhere}
.kb-ink span{display:inline;animation:kbInk .5s ease-out both}
.kb-fade{opacity:0!important}
.kb-sk{display:block;margin:4px 0 8px}
.kb-sk svg{display:block;width:100%;max-width:460px;height:auto;max-height:340px;color:var(--acc);overflow:visible}
.kb-sk text{font-family:${HAND};stroke:none;fill:currentColor}
#kbBuddy .kd-cl .kb-sk svg,#kbBuddy .kc-a .kb-sk svg{max-width:380px;max-height:260px}
@keyframes kbInk{from{opacity:0;filter:blur(2px)}to{opacity:1;filter:none}}
#kbBuddy .kd-st{position:absolute;right:10px;bottom:6px;font-size:11.5px;color:var(--mute);pointer-events:none}
#kbBuddy .kb-f{border-top:1px solid var(--line);padding:8px 10px 10px}
#kbBuddy textarea{width:100%;min-height:44px;max-height:160px;resize:vertical;font:inherit;color:inherit;background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:6px 8px}
#kbBuddy textarea:focus,#kbBuddy input:focus{outline:2px solid var(--acc);outline-offset:-1px}
#kbBuddy .kb-row{display:flex;gap:6px;align-items:center;margin-top:6px}
#kbBuddy .kb-row .kb-meta{flex:1;color:var(--mute);font-size:11.5px}
#kbBuddy .kb-row button{padding:2px 9px;font-size:12.5px}
#kbBuddy .kb-go{background:var(--acc);border-color:var(--acc);color:var(--card,var(--bg));font-weight:600}
#kbBuddy .kb-scroll{flex:1;overflow-y:auto;padding:10px 16px;overscroll-behavior:contain}
#kbBuddy.kb-full .kb-scroll>*,#kbBuddy.kb-full .kb-f{max-width:900px;margin-left:auto;margin-right:auto}
#kbBuddy.kb-full .kb-f{width:100%}
#kbBuddy .kd-e{border-bottom:1px solid var(--line);padding:10px 0}
#kbBuddy .kd-e time{color:var(--mute);font-size:11.5px}
#kbBuddy .kd-e img{display:block;max-width:100%;max-height:160px;margin:4px 0;border:1px solid var(--line);border-radius:6px;background:#fff}
#kbBuddy .kd-me{white-space:pre-wrap;margin:2px 0 6px}
#kbBuddy .kd-me::before{content:"You: ";color:var(--mute)}
#kbBuddy .kd-cl{font-family:${HAND};font-size:22px;line-height:1.3;color:var(--acc);white-space:pre-wrap}
#kbBuddy .kc-q{margin:12px 0 6px;padding:7px 10px;background:var(--soft);border:1px solid var(--line);border-radius:10px;white-space:pre-wrap}
#kbBuddy .kc-q q{display:block;margin-bottom:4px;padding-left:8px;border-left:3px solid #e0b400;color:var(--mute);font-size:13px;quotes:none;white-space:normal;max-height:4.6em;overflow:hidden}
#kbBuddy .kc-a{margin:4px 0 14px}
#kbBuddy .kc-a p{margin:6px 0}#kbBuddy .kc-a ul,#kbBuddy .kc-a ol{margin:4px 0;padding-left:20px}
#kbBuddy .kc-a pre{background:var(--soft);border:1px solid var(--line);border-radius:6px;padding:6px 8px;overflow-x:auto;font-size:12.5px}
#kbBuddy .kc-a h4{margin:10px 0 4px;font-size:14px}
#kbBuddy .kc-m{color:var(--mute);font-size:11.5px;margin-top:4px}
#kbBuddy .kb-hint{color:var(--mute);font-size:13px}
#kbBuddy .kb-err{color:var(--bad,#c2703a)}
#kbBuddy .kb-set label{display:block;font-weight:600;margin:10px 0 4px;font-size:13px}
#kbBuddy .kb-set label.kb-ck{display:flex;gap:8px;align-items:flex-start;font-weight:400}
#kbBuddy .kb-set label.kb-ck input{width:auto;margin-top:4px}
#kbBuddy .kb-set input,#kbBuddy .kb-set select{width:100%}
#kbBuddy .kb-set p{font-size:13px;color:var(--mute);margin:6px 0}
#kbBuddy a{color:var(--acc)}
#kbBuddyOv{position:fixed;inset:0;width:100vw;height:100vh;z-index:62;touch-action:none;cursor:crosshair;transition:opacity 1.4s ease}
#kbBuddyOv[hidden],#kbBuddyBar[hidden],#kbBuddyCard[hidden]{display:none!important}
#kbBuddyBar{position:fixed;top:10px;left:50%;transform:translateX(-50%);width:max-content;z-index:65;display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 20px);padding:6px 8px 6px 14px;background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--line);border-radius:99px;box-shadow:var(--shadow,0 4px 14px rgba(0,0,0,.2));font-size:13px}
#kbBuddyBar b{color:#e03131;font-weight:600}
#kbBuddyBar .kb-st{color:var(--mute);font-size:12px;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#kbBuddyBar button{padding:2px 10px;font-size:12.5px;border-radius:99px}
#kbBuddyBar .kb-go{background:var(--acc);border-color:var(--acc);color:var(--card,var(--bg));font-weight:600}
#kbBuddyCard{position:absolute;z-index:64;max-height:48vh;overflow:hidden;padding:8px 14px 10px;background:color-mix(in srgb,var(--card,var(--bg)) 94%,transparent);border:1px solid var(--line);border-left:4px solid #e03131;border-radius:12px;box-shadow:var(--shadow,0 6px 24px rgba(0,0,0,.2));font-family:${HAND};font-size:24px;line-height:1.3;color:var(--acc);white-space:pre-wrap;overflow-wrap:anywhere;transition:opacity 1.2s ease}
#kbBuddyCard .kb-sk svg{max-width:340px;max-height:240px}
@media (max-width:520px){#kbBuddyBtn{right:12px;bottom:12px;padding:6px 12px;font-size:13px}#kbBuddyMenu{right:12px;bottom:52px}}
@media print{#kbBuddyBtn,#kbBuddyMenu,#kbBuddy,#kbBuddyOv,#kbBuddyBar,#kbBuddyCard{display:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = (t, a, h) => { const e = document.createElement(t); if (a) for (const k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const btn = el('button', {id:'kbBuddyBtn', type:'button', 'aria-haspopup':'menu', title:'AI buddy: a notebook to think in by hand, or a chat with Claude'}, 'AI buddy');
  const menu = el('div', {id:'kbBuddyMenu', role:'menu', hidden:''}, '<button type="button" role="menuitem" data-m="notebook">Notebook<small>write or type; Claude reads after a pause</small></button><button type="button" role="menuitem" data-m="chat">Chat<small>ask Claude about this page</small></button><button type="button" role="menuitem" data-m="draw">Draw on the page<small>circle, underline, annotate; Claude answers beside it</small></button>');
  const P = el('div', {id:'kbBuddy', role:'dialog', 'aria-label':'AI buddy', hidden:''});
  P.innerHTML = `<div class="kb-h"><div class="kb-tabs"><button type="button" data-a="notebook" aria-pressed="true">Notebook</button><button type="button" data-a="chat" aria-pressed="false">Chat</button></div><span class="kb-sp"></span><button type="button" data-a="draw" title="Draw on the page itself: circle or annotate something and Claude answers beside it">&#x270E; Page</button><button type="button" data-a="pages" title="Earlier pages of this notebook">Pages</button><button type="button" data-a="new" title="Start a new chat">New</button><button type="button" data-a="full" title="Fill the screen">Full</button><button type="button" data-a="set" title="Settings: key, model, what Claude sees" aria-label="Settings">&#x2699;</button><button type="button" data-a="close" title="Close (Esc)" aria-label="Close">&#x2715;</button></div>
<div class="kb-hl" hidden><span>Your highlight:</span><q></q><button type="button" data-a="unhl" title="Do not send this highlight" aria-label="Do not send this highlight">&#x2715;</button></div>
<div class="kb-view" data-v="notebook"><div class="kd-paper"><canvas aria-label="Writing area: write with a pen, finger or the mouse"></canvas><div class="kd-reply kb-ink" aria-live="polite"><div class="kb-r"></div></div><div class="kd-st"></div></div>
<div class="kb-f"><textarea rows="2" placeholder="Write on the page above, or type here. Claude reads it about 3 seconds after you stop."></textarea>
<div class="kb-row"><button type="button" data-a="undo" title="Remove the last stroke">Undo</button><button type="button" data-a="clear" title="Clear what you have not sent yet">Clear</button><span class="kb-meta"></span><button type="button" class="kb-go" data-a="send" title="Send now instead of waiting">Send now</button></div></div></div>
<div class="kb-view" data-v="chat" hidden><div class="kb-scroll kc-msgs" aria-live="polite"></div>
<div class="kb-f"><textarea rows="2" placeholder="Ask about anything on this page. Enter sends, Shift+Enter adds a line."></textarea>
<div class="kb-row"><span class="kb-meta"></span><button type="button" class="kb-go" data-a="ask">Ask</button></div></div></div>
<div class="kb-view" data-v="pages" hidden><div class="kb-scroll kd-log"></div></div>
<div class="kb-view" data-v="set" hidden><div class="kb-scroll kb-set"></div></div>
<div class="kb-grip" title="Drag to resize"></div>`;
  document.body.append(btn, menu, P);
  const $ = s => P.querySelector(s);
  const head = $('.kb-h'), grip = $('.kb-grip'), hlBox = $('.kb-hl');
  const nbView = $('[data-v=notebook]'), chView = $('[data-v=chat]'), pgView = $('[data-v=pages]'), stView = $('[data-v=set]');
  const paper = $('.kd-paper'), cv = $('canvas'), reply = $('.kd-reply .kb-r'), stat = $('.kd-st'), ta = nbView.querySelector('textarea');
  const msgs = $('.kc-msgs'), cta = chView.querySelector('textarea'), askBtn = $('[data-a=ask]'), cmeta = chView.querySelector('.kb-meta');
  const log = $('.kd-log'), setv = $('.kb-set');
  const ctx2 = cv.getContext('2d', {desynchronized:true}) || cv.getContext('2d');   // low-latency canvas where the browser offers it

  // ---- window: floating (dragged by the title bar, resized from the corner, remembered) or full screen ----
  let geom = null; try { geom = JSON.parse(mine.get('geom') || 'null') } catch(e) {}
  const defGeom = () => { const W = innerWidth, H = innerHeight, w = Math.min(500, W - 24), h = Math.min(Math.round(H * 0.78), 700); return {x:W - w - 16, y:Math.max(12, H - h - 70), w, h} };
  function place(){
    if (P.classList.contains('kb-full')) return;
    const W = innerWidth, H = innerHeight, g = geom || defGeom();
    g.w = Math.max(290, Math.min(g.w, W - 8)); g.h = Math.max(300, Math.min(g.h, H - 8));
    g.x = Math.max(4 - g.w + 120, Math.min(g.x, W - 120)); g.y = Math.max(0, Math.min(g.y, H - 44));
    geom = g; Object.assign(P.style, {left:g.x + 'px', top:g.y + 'px', width:g.w + 'px', height:g.h + 'px'});
  }
  const keepGeom = () => mine.set('geom', JSON.stringify(geom));
  function setFull(on){
    P.classList.toggle('kb-full', on); mine.set('full', on ? '1' : null);
    const b = $('[data-a=full]'); b.textContent = on ? 'Float' : 'Full'; b.title = on ? 'Float over the page; drag and resize it' : 'Fill the screen';
    if (!on) place();
  }
  function dragger(handle, onMove){
    handle.addEventListener('pointerdown', e => {
      if (e.button > 0 || P.classList.contains('kb-full') || e.target.closest('button')) return;
      e.preventDefault(); handle.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, g0 = Object.assign({}, geom);
      const mv = ev => { onMove(g0, ev.clientX - sx, ev.clientY - sy); place() };
      const upf = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', upf); handle.removeEventListener('pointercancel', upf); keepGeom() };
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', upf); handle.addEventListener('pointercancel', upf);
    });
  }
  dragger(head, (g0, dx, dy) => { geom.x = g0.x + dx; geom.y = g0.y + dy });
  dragger(grip, (g0, dx, dy) => { geom.w = g0.w + dx; geom.h = g0.h + dy });
  window.addEventListener('resize', () => { if (!P.hidden) place() });

  // ---- modes and views ----
  let mode = mine.get('mode') === 'chat' ? 'chat' : 'notebook', sub = null;   // sub: null, 'pages' or 'set'
  function show(){
    const v = sub || mode;
    nbView.hidden = v !== 'notebook'; chView.hidden = v !== 'chat'; pgView.hidden = v !== 'pages'; stView.hidden = v !== 'set';
    for (const b of P.querySelectorAll('.kb-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.a === mode));
    $('[data-a=pages]').hidden = mode !== 'notebook'; $('[data-a=new]').hidden = mode !== 'chat';
    $('[data-a=pages]').classList.toggle('kb-on', sub === 'pages'); $('[data-a=set]').classList.toggle('kb-on', sub === 'set');
    if (v === 'pages') renderLog();
    if (v === 'set') renderSet();
    if (v === 'notebook') requestAnimationFrame(size);
    if (v === 'chat') { hint(); cta.focus() }
    showHl();
  }
  function setMode(m){ mode = m; sub = null; mine.set('mode', m); show() }
  let lastFocus = null;
  function open(m){
    menu.hidden = true; lastFocus = document.activeElement; P.hidden = false; btn.hidden = true;
    setFull(mine.get('full') === '1'); if (!P.classList.contains('kb-full')) place();
    mode = m || mode; mine.set('mode', mode); sub = store.get('key') ? null : 'set'; show();
  }
  function close(){ P.hidden = true; btn.hidden = false; if (lastFocus && lastFocus.focus) lastFocus.focus() }
  btn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden };
  menu.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; if (b.dataset.m === 'draw') enterDraw(); else open(b.dataset.m) });
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) menu.hidden = true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!menu.hidden) menu.hidden = true; else if (drawing) exitDraw(); else if (!P.hidden) close() } });

  // ---- the reader's highlight: the last selection made on the page, kept until it is sent or dropped ----
  let hl = null, selT = 0;
  const pageRoot = () => document.querySelector('.w') || document.body;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selT);
    selT = setTimeout(() => {
      const s = window.getSelection(), txt = s && String(s).trim();
      if (!txt || txt.length < 2 || !s.rangeCount) return;
      const r = s.getRangeAt(0), host = r.commonAncestorContainer, he = host.nodeType === 1 ? host : host.parentElement;
      if (!he || P.contains(he) || he.closest('input,textarea,select,button,#kbAsk') || !pageRoot().contains(he)) return;
      hl = {text:txt.slice(0, 4000), where:where(he), rects:[...r.getClientRects()].slice(0, 60).map(q => ({x:q.left + scrollX, y:q.top + scrollY, w:q.width, h:q.height}))};
      showHl();
    }, 250);
  });
  function showHl(){ hlBox.hidden = !hl || !!sub; if (hl) hlBox.querySelector('q').textContent = hl.text.length > 300 ? hl.text.slice(0, 300) + '…' : hl.text }

  // ---- page text (every tab; frozen at first use so the cached prefix stays identical) and what is in view now ----
  const SKIP = /^(SCRIPT|STYLE|SVG|CANVAS|BUTTON|SELECT|INPUT|TEXTAREA|NAV|TEMPLATE|NOSCRIPT)$/;
  const BLOCK = /^(P|DIV|LI|UL|OL|SECTION|ARTICLE|DETAILS|SUMMARY|FIGURE|FIGCAPTION|TABLE|TR|PRE|BLOCKQUOTE|H[1-6]|BR|HR|DL|DT|DD|ASIDE|HEADER|FOOTER|MAIN)$/;
  const OURS = '#kbBuddy,#kbBuddyBtn,#kbBuddyMenu,#kbBuddyOv,#kbBuddyBar,#kbBuddyCard,#kbAsk,#kbAskBtn,#kbAskSel,#jsErr';
  function walk(n, out){
    if (n.nodeType === 3) { out.push(n.nodeValue); return }
    if (n.nodeType !== 1) return;
    const t = n.tagName.toUpperCase();
    if (SKIP.test(t) || n.matches(OURS) || n.getAttribute('aria-hidden') === 'true') return;
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
    const root = pageRoot(), parts = [], tabs = [...root.querySelectorAll('.tab')];
    const top = []; for (const c of root.childNodes) { if (c.nodeType === 1 && (c.classList.contains('tab') || c.querySelector && c.querySelector('.tab'))) break; walk(c, top) }
    parts.push(clean(top.join('')));
    if (tabs.length) for (const t of tabs) { const o = []; walk(t, o); parts.push('=== Tab: ' + (tabName(t) || t.id) + ' ===\n' + clean(o.join(''))) }
    else { const o = []; walk(root, o); parts[0] = clean(o.join('')) }
    PAGE = 'Title: ' + document.title + '\n\n' + parts.filter(Boolean).join('\n\n');
    if (PAGE.length > 600000) PAGE = PAGE.slice(0, 600000) + '\n[page text cut here]';
    return PAGE;
  }
  function where(e){
    const tab = e.closest('.tab'); let h = null;
    for (const x of (tab || document).querySelectorAll('h2,h3')) { if (x.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING || x.contains(e)) h = x; else break }
    return [tabName(tab) && 'tab "' + tabName(tab) + '"', h && 'section "' + h.textContent.trim().replace(/\s+/g, ' ') + '"'].filter(Boolean).join(', ');
  }
  const inV = r => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && r.width * r.height > 0;
  const labelOf = e => {
    const l = (e.id && document.querySelector('label[for="' + e.id + '"]')) || e.closest('label');
    let s = (l && l.textContent) || e.getAttribute('aria-label') || e.title || '';
    if (!s.trim()) { let p = e.previousElementSibling; while (p && !p.textContent.trim()) p = p.previousElementSibling; s = p ? p.textContent : (e.parentElement && e.parentElement.textContent) || '' }
    return s.replace(/\s+/g, ' ').trim().slice(0, 60);
  };
  // the text, controls and position of what is on screen now
  function inViewNow(){
    const tb = document.querySelector('[role=tab][aria-selected=true]'), tab = tb && document.getElementById(tb.dataset.t);
    let h = null; for (const x of (tab || document).querySelectorAll('h2,h3')) { if (x.getBoundingClientRect().top < innerHeight * 0.45) h = x; else break }
    const lines = []; let last = null, n = 0;
    const tw = document.createTreeWalker(pageRoot(), NodeFilter.SHOW_TEXT, {acceptNode: t => { const p = t.parentElement; return !p || !t.nodeValue.trim() || p.closest(OURS + ',script,style,[aria-hidden=true]') ? 2 : 1 }});
    const rg = document.createRange();
    for (let t = tw.nextNode(); t && n < 9000; t = tw.nextNode()) {
      rg.selectNodeContents(t); if (![...rg.getClientRects()].some(inV)) continue;
      const blk = t.parentElement.closest('p,li,h1,h2,h3,h4,h5,h6,figcaption,td,th,dt,dd,pre,blockquote,summary,label,button,caption,text,div');
      const s = t.nodeValue.replace(/\s+/g, ' ');
      if (blk !== last) { lines.push(s.trim()); last = blk } else lines[lines.length - 1] += s;
      n += s.length;
    }
    const ctl = [];
    for (const e of pageRoot().querySelectorAll('input,select,[aria-pressed=true],[role=tab][aria-selected=true]')) {
      if (e.closest(OURS) || !inV(e.getBoundingClientRect())) continue;
      let v;
      if (e.tagName === 'SELECT') v = e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : e.value;
      else if (e.tagName === 'INPUT') { if (/^(checkbox|radio)$/.test(e.type)) { if (!e.checked) continue; v = 'on' } else if (e.type === 'password') continue; else v = e.value + (e.type === 'range' ? ' (range ' + e.min + ' to ' + e.max + ')' : '') }
      else { ctl.push('pressed: ' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)); continue }
      ctl.push((labelOf(e) || e.name || e.type) + ' = ' + v);
    }
    const docH = document.documentElement.scrollHeight - innerHeight;
    return {tab:tb ? tb.textContent.trim() : '', section:h ? h.textContent.trim().replace(/\s+/g, ' ') : '', pct:docH > 0 ? Math.round(100 * scrollY / docH) : 0,
      text:lines.filter(Boolean).join('\n').slice(0, 9000), controls:[...new Set(ctl)].slice(0, 40)};
  }

  // ---- an image of the visuals in view: the page's canvases (current frame), SVGs (with their computed styles) and images, at
  // their screen positions on the page's background, the highlight marked in yellow; the text is sent as text, not drawn ----
  const SVG_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'visibility', 'display', 'color', 'letter-spacing', 'paint-order'];
  function svgImage(svg, r){
    return new Promise(res => {
      try {
        const c = svg.cloneNode(true), src = [svg, ...svg.querySelectorAll('*')], dst = [c, ...c.querySelectorAll('*')];
        for (let i = 0; i < src.length && i < dst.length; i++) { const cs = getComputedStyle(src[i]); dst[i].setAttribute('style', SVG_PROPS.map(p => p + ':' + cs.getPropertyValue(p)).join(';')) }
        for (const x of c.querySelectorAll('foreignObject,script,image,a')) x.remove();
        c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', r.width); c.setAttribute('height', r.height);
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], {type:'image/svg+xml'}));
        const im = new Image(); im.onload = () => { URL.revokeObjectURL(url); res(im) }; im.onerror = () => { URL.revokeObjectURL(url); res(null) }; im.src = url;
      } catch(e) { res(null) }
    });
  }
  // boxes with a background or border, then the text word by word in its own font and colour: enough of the page around the
  // visuals that a circle round a sentence or an arrow at a label still points at something in the image
  function paintPage(g, W, H){
    const boxes = [];
    for (const e of pageRoot().querySelectorAll('*')) {
      if (e.closest(OURS) || (e.ownerSVGElement)) continue;
      const r = e.getBoundingClientRect(); if (!inV(r)) continue;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      const bg = cs.backgroundColor, bw = parseFloat(cs.borderTopWidth) || 0;
      if ((bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) || (bw > 0 && cs.borderTopStyle !== 'none')) boxes.push([r, bg, bw, cs.borderTopColor, parseFloat(cs.borderTopLeftRadius) || 0]);
    }
    for (const [r, bg, bw, bc, rad] of boxes) {
      g.beginPath(); if (g.roundRect) g.roundRect(r.left, r.top, r.width, r.height, Math.min(rad, r.height / 2)); else g.rect(r.left, r.top, r.width, r.height);
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { g.fillStyle = bg; g.fill() }
      if (bw > 0) { g.strokeStyle = bc; g.lineWidth = bw; g.stroke() }
    }
    const tw = document.createTreeWalker(pageRoot(), NodeFilter.SHOW_TEXT, {acceptNode: t => { const p = t.parentElement; return !p || !t.nodeValue.trim() || p.closest(OURS + ',script,style,svg,[aria-hidden=true]') ? 2 : 1 }});
    const rg = document.createRange(); g.textBaseline = 'alphabetic';
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      rg.selectNodeContents(t); if (![...rg.getClientRects()].some(inV)) continue;
      const cs = getComputedStyle(t.parentElement); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; g.fillStyle = cs.color;
      const re = /\S+/g; let m;
      while ((m = re.exec(t.nodeValue))) {
        rg.setStart(t, m.index); rg.setEnd(t, m.index + m[0].length); const q = rg.getBoundingClientRect();
        if (!inV(q)) continue; g.fillText(m[0], q.left, q.bottom - q.height * 0.24, q.width + 2);
      }
    }
  }
  // the screen as an image, rebuilt in the browser: background, boxes and text, then the page's canvases (current frame), SVGs
  // (with their computed styles) and images on top at their screen positions, the highlight in yellow and any ink on the page in red
  async function screenImage(mark, ink){
    const W = innerWidth, H = innerHeight, k = Math.min(1, 1280 / Math.max(W, H));
    const out = document.createElement('canvas'); out.width = Math.round(W * k); out.height = Math.round(H * k);
    const g = out.getContext('2d'); g.scale(k, k);
    let bg = getComputedStyle(document.body).backgroundColor; if (!bg || /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) bg = getComputedStyle(document.documentElement).backgroundColor;
    g.fillStyle = !bg || /rgba\(0, 0, 0, 0\)|transparent/.test(bg) ? '#fff' : bg; g.fillRect(0, 0, W, H);
    try { paintPage(g, W, H) } catch(e) {}
    const els = [...pageRoot().querySelectorAll('canvas,svg,img')].filter(e => !e.closest(OURS) && !(e.tagName.toLowerCase() === 'svg' && e.parentElement.closest('svg')));
    for (const e of els) {
      const r = e.getBoundingClientRect(); if (!inV(r) || r.width < 12 || r.height < 12 || getComputedStyle(e).visibility === 'hidden') continue;
      let srcImg = e;
      if (e.tagName.toLowerCase() === 'svg') srcImg = await svgImage(e, r);
      else if (e.tagName === 'IMG' && !(e.complete && e.naturalWidth)) srcImg = null;
      if (!srcImg) continue;
      // through a scratch canvas: anything the browser will not let the page read (a cross-origin image) is left out, not the whole capture
      const tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.round(r.width * k)); tmp.height = Math.max(1, Math.round(r.height * k));
      try { tmp.getContext('2d').drawImage(srcImg, 0, 0, tmp.width, tmp.height); tmp.getContext('2d').getImageData(0, 0, 1, 1) } catch(err) { continue }
      g.drawImage(tmp, r.left, r.top, r.width, r.height);
    }
    if (mark) { g.fillStyle = 'rgba(255,205,0,.38)'; for (const q of mark.rects) g.fillRect(q.x - scrollX, q.y - scrollY, q.w, q.h) }
    if (ink) { g.strokeStyle = g.fillStyle = '#e03131'; for (const s of ink) drawStroke(g, s, 3) }
    try { return {img:out.toDataURL('image/jpeg', 0.85), k} } catch(e) { return {img:null, k} }
  }
  // what Claude gets about the screen: content blocks (the image, then the description); with ink on the page it is always sent
  async function screenBlocks(full, ink, mark){
    if (!seeOn() && !ink) return {blocks:[], note:'', img:null, k:1};
    const v = inViewNow(), shot = await screenImage(mark, ink);
    const lines = ['What is on their screen right now' + (full ? ' (the page under the full-screen notebook)' : '') + ':',
      '- Tab "' + v.tab + '"' + (v.section ? ', section "' + v.section + '"' : '') + ', ' + v.pct + '% of the way down the page.'];
    if (mark) lines.push('- They highlighted this' + (mark.where ? ' (in ' + mark.where + ')' : '') + ':\n<highlight>\n' + mark.text + '\n</highlight>');
    if (v.controls.length) lines.push('- Controls in view: ' + v.controls.join('; ') + '.');
    if (shot.img) lines.push('- The image above is their screen rebuilt in the browser: the text and boxes as laid out, the figures, animations (their current frame) and images at their positions' + (mark ? ', the highlight in yellow' : '') + (ink ? ', and their ink in red' : '') + '. Small details may differ from the real screen; the exact text in view is here:');
    lines.push('<text_in_view>\n' + v.text + '\n</text_in_view>');
    const blocks = []; if (shot.img) blocks.push({type:'image', source:{type:'base64', media_type:'image/jpeg', data:shot.img.split(',')[1]}});
    blocks.push({type:'text', text:lines.join('\n')});
    return {blocks, note:'tab "' + v.tab + '"' + (v.section ? ', section "' + v.section + '"' : ''), img:shot.img, k:shot.k};
  }

  // ---- Claude's sketches: an <svg> in the reply, rebuilt from an allow-list (no scripts, links, styles or images), drawn like ink ----
  const SVG_TAGS = new Set(['svg', 'g', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'text', 'tspan', 'defs', 'marker']);
  const SVG_ATTRS = new Set(['viewBox', 'd', 'points', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'dx', 'dy', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'opacity', 'id', 'marker-start', 'marker-end', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits']);
  const NS = 'http://www.w3.org/2000/svg';
  let sketchN = 0;
  function sketch(src){
    const pre = 'kbs' + (++sketchN) + '-';   // ids unique per sketch, so arrowheads keep working when several sketches share the page
    let doc; try { doc = new DOMParser().parseFromString(src, 'image/svg+xml') } catch(e) { return null }
    const root = doc.documentElement; if (!root || root.localName !== 'svg' || doc.querySelector('parsererror')) return null;
    const copy = (n, inMarker) => {
      if (n.nodeType === 3) return document.createTextNode(n.nodeValue);
      if (n.nodeType !== 1 || !SVG_TAGS.has(n.localName)) return null;
      const e = document.createElementNS(NS, n.localName), mk = inMarker || n.localName === 'marker', txt = /^(text|tspan)$/.test(n.localName);
      for (const a of n.attributes) {
        const k = a.name, v = a.value.trim();
        if (!SVG_ATTRS.has(k) || /javascript:|url\((?!#[\w-]+\))/i.test(v)) continue;
        if (k === 'fill' || k === 'stroke') {   // one pen: any colour becomes the ink colour; a filled shape is a light wash
          const on = v !== 'none' && v !== 'transparent'; e.setAttribute(k, on ? 'currentColor' : 'none');
          if (k === 'fill' && on && !txt && !mk) e.setAttribute('fill-opacity', '0.15');
          continue;
        }
        e.setAttribute(k, k === 'id' ? pre + v : v.replace(/url\(#([\w-]+)\)/g, 'url(#' + pre + '$1)'));
      }
      for (const c of n.childNodes) { const x = copy(c, mk); if (x) e.appendChild(x) }
      return e;
    };
    const svg = copy(root, false); if (!svg) return null;
    svg.removeAttribute('width'); svg.removeAttribute('height');   // the sketch scales to the paper
    if (!svg.getAttribute('viewBox')) { const w = parseFloat(root.getAttribute('width')) || 400, h = parseFloat(root.getAttribute('height')) || 240; svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h) }
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); if (!svg.getAttribute('stroke-width')) svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Sketch by Claude');
    for (const t of svg.querySelectorAll('text')) { if (!t.getAttribute('fill') || t.getAttribute('fill') === 'none') t.setAttribute('fill', 'currentColor'); t.setAttribute('stroke', 'none') }
    const box = el('span', {class:'kb-sk'}); box.appendChild(svg); return box;
  }
  // draw the shapes one after another with a moving dash, then fade the labels in; returns how long that takes (ms)
  function inkIn(box){
    const shapes = [...box.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse')].filter(x => !x.closest('marker')), texts = [...box.querySelectorAll('text')];
    const lens = shapes.map(x => { try { return x.getTotalLength() } catch(e) { return 0 } });
    const total = lens.reduce((a, b) => a + b, 0) || 1, budget = Math.min(4000, 800 + total * 2);
    let t = 0;
    shapes.forEach((x, i) => {
      const L = lens[i]; if (!L) return; const d = Math.max(120, budget * 0.8 * L / total), keep = x.getAttribute('stroke-dasharray') || '';
      x.style.strokeDasharray = L + ' ' + L; x.style.strokeDashoffset = L;
      x.getBoundingClientRect(); x.style.transition = 'stroke-dashoffset ' + d + 'ms ease-in-out ' + t + 'ms'; x.style.strokeDashoffset = 0;
      setTimeout(() => { x.style.transition = ''; x.style.strokeDasharray = keep; x.style.strokeDashoffset = '' }, t + d + 60); t += d * 0.85;
    });
    texts.forEach((x, i) => { x.style.opacity = 0; x.getBoundingClientRect(); x.style.transition = 'opacity .4s ease ' + Math.round(t * 0.5 + i * 90) + 'ms'; x.style.opacity = 1 });
    return Math.max(t, texts.length ? t * 0.5 + texts.length * 90 + 400 : 0);
  }
  // a reply as pieces in order: text, and {svg} for each complete sketch (an unfinished one at the end is dropped)
  function replyPieces(text){
    const out = [], rx = /<svg[\s\S]*?<\/svg>/gi; let i = 0, m;
    while ((m = rx.exec(text))) { if (m.index > i) out.push(text.slice(i, m.index)); out.push({svg:m[0]}); i = rx.lastIndex }
    if (i < text.length) out.push(text.slice(i).replace(/<svg[\s\S]*$/i, ''));
    return out;
  }

  // ---- prompts ----
  const COMMON = `It sits beside one page of the reader's personal technical knowledge base (interactive explainer pages on AI/ML and systems). The page's full text is below between <page> tags; its figures and labs are not in it. With each message you may also get what is on their screen right now: the tab and section in view, the text in view, the values of the controls in view (sliders, selects, steps), a passage they highlighted, and an image of the figures, animations (their current frame) and images in view at their screen positions. Use that to know exactly what they are looking at; refer to it naturally ("the heatmap on your screen", "step 3 of the animation"), and never describe the screen back to them unless asked.
- Use the page first; when you go beyond it, say so briefly. Never invent numbers or citations; if unsure, say so.
- Write maths in plain text with Unicode (softmax(QKᵀ/√d), ×, ², ᵀ), never LaTeX. Do not use em dashes.
- When a picture says it better than words (a shape, a matrix, an arrow diagram, a curve, a tensor's dimensions), you may draw one small sketch: <svg viewBox="0 0 W H">...</svg> with W at most 600, using only g, path, line, polyline, polygon, rect, circle, ellipse and text (and a marker in defs for arrowheads); it is drawn in pen, so no colours, styles, images or scripts; labels of a few words; at most about 40 shapes. Always write a sentence with it, and do not sketch when words are enough.`;
  const SYS_NOTE = `You are a thinking partner in the reader's notebook. ${COMMON}
The reader writes to you by hand (you get an image of their ink) or by keyboard, then pauses; you answer on the same paper. Your job is to think with them, not to lecture or test them. They read to understand deeply, not to memorise: never quiz them.
- Take up exactly what they wrote: build on the idea, sharpen it, connect it to the page or to what is on their screen, or point out gently where it goes wrong and why.
- At most one question back, and only when it would genuinely move their thinking forward. Often no question is better.
- Short: usually 1 to 4 sentences, plain words, like a note written in the margin. No lists, headings, bold or code fences.
- If their handwriting is unclear, say what you read and ask if that is right.
- Sometimes they draw on the page itself instead of the notebook: circles, arrows, underlines, notes in the margin, a sketch for you to finish. Their ink is then the red marks on the screen image; answer about exactly what they marked, and keep in mind your reply appears in a small card beside their marks.
Output format, always: first <read>exactly what they wrote, transcribed (handwriting and typed text; describe any sketch or mark of theirs, and what it points at, in a few words in brackets)</read>, then your reply as plain text after it.`;
  const SYS_CHAT = `You answer the reader's questions in a chat panel. ${COMMON}
- Answer from the page first and say where on the page the answer is (tab and section) when that helps. When the answer needs knowledge the page does not contain, start that paragraph with "Beyond this page:".
- If the question rests on a misreading of the page, say so gently and correct it.
- Lead with the answer, then the reasoning. Keep it short; use a tiny worked example or real numbers when that makes it click.
- Format: short paragraphs and lists, **bold** sparingly, \`code\` for code and tensor shapes, fenced blocks for longer code. No tables.`;

  // ---- one streamed request; onText gets the text so far ----
  const cents = (u, m) => { const p = MODELS[m]; if (!p || !u) return 0; return ((u.input_tokens || 0) * p.in + (u.cache_creation_input_tokens || 0) * p.write + (u.cache_read_input_tokens || 0) * p.read + (u.output_tokens || 0) * p.out) / 1e4 };
  let spent = 0;
  async function stream(system, messages, effort, maxTokens, onText, signal){
    const m = model(), usage = {}; let raw = '', stop = null;
    const res = await fetch(API, {method:'POST', signal, headers:{'content-type':'application/json', 'x-api-key':store.get('key'), 'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true', 'anthropic-beta':'server-side-fallback-2026-07-01'},
      body: JSON.stringify({model:m, max_tokens:maxTokens, stream:true, output_config:{effort}, fallbacks:'default',
        system:[{type:'text', text:system}, {type:'text', text:'<page>\n' + pageText() + '\n</page>', cache_control:{type:'ephemeral'}}], messages})});
    if (!res.ok) { let msg = res.status + ' ' + res.statusText; try { const j = await res.json(); msg = (j.error && j.error.message) || msg } catch(e) {} throw new Error(res.status === 401 ? 'The API key was not accepted. Check it in Settings.' : res.status === 429 ? 'Rate limited or out of credit: ' + msg : msg) }
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const {value, done} = await rd.read(); if (done) break;
      buf += dec.decode(value, {stream:true});
      let k; while ((k = buf.indexOf('\n\n')) >= 0) {
        const evt = buf.slice(0, k); buf = buf.slice(k + 2);
        const data = evt.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (!data) continue; let d; try { d = JSON.parse(data) } catch(e) { continue }
        if (d.type === 'message_start') Object.assign(usage, d.message.usage || {});
        else if (d.type === 'content_block_delta' && d.delta.type === 'text_delta') { raw += d.delta.text; onText(raw, false) }
        else if (d.type === 'message_delta') { if (d.delta && d.delta.stop_reason) stop = d.delta.stop_reason; Object.assign(usage, d.usage || {}) }
        else if (d.type === 'error') throw new Error((d.error && d.error.message) || 'stream error');
      }
    }
    onText(raw, true);
    const c = cents(usage, m); spent += c;
    return {raw, stop:stop || 'end_turn', usage, model:m, cents:c};
  }
  const costLine = r => MODELS[r.model].name + ' · ≈ ' + r.cents.toFixed(2) + '¢ (this visit ≈ ' + spent.toFixed(1) + '¢)';

  // ================= Notebook =================
  const PAGE_ID = location.pathname.replace(/index\.html$/, '');
  let entries = [];
  const db = new Promise(res => {
    try { const r = indexedDB.open('kbDiary', 1); r.onupgradeneeded = () => r.result.createObjectStore('entries', {keyPath:'id', autoIncrement:true}).createIndex('page', 'page'); r.onsuccess = () => res(r.result); r.onerror = () => res(null) } catch(e) { res(null) }
  });
  const tx = async (m, f) => { const d = await db; if (!d) return null; return new Promise(res => { try { const t = d.transaction('entries', m), s = t.objectStore('entries'); const r = f(s); t.oncomplete = () => res(r && r.result); t.onerror = () => res(null) } catch(e) { res(null) } }) };
  tx('readonly', s => s.index('page').getAll(PAGE_ID)).then(r => { if (r) entries = r.sort((a, b) => a.t - b.t) });
  const save = e => { entries.push(e); tx('readwrite', s => s.add(e)).then(id => { if (id != null) e.id = id }) };

  // ---- ink on a canvas: strokes of [x, y, pressure] points, in the canvas's coordinates (page coordinates for the page overlay) ----
  function seg(c, a, b, w){ c.lineWidth = w * (0.45 + 0.85 * ((a[2] + b[2]) / 2)); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke() }
  function drawStroke(c, s, w){
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.length === 1) { c.beginPath(); c.arc(s[0][0], s[0][1], w * (0.45 + 0.85 * s[0][2]) / 2, 0, 7); c.fill(); return }
    for (let i = 1; i < s.length; i++) seg(c, s[i - 1], s[i], w);
  }
  function Ink(cv, opt){
    const g = cv.getContext('2d', {desynchronized:true}) || cv.getContext('2d');   // low-latency canvas where the browser offers it
    const o = {cv, strokes:[], cur:null, dpr:1}, off = () => opt.off ? opt.off() : [0, 0];
    const setT = () => { const [ox, oy] = off(); g.setTransform(o.dpr, 0, 0, o.dpr, -ox * o.dpr, -oy * o.dpr); g.strokeStyle = g.fillStyle = opt.color() };
    o.redraw = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); setT(); for (const s of o.strokes) drawStroke(g, s, opt.w) };
    o.size = () => { const r = cv.getBoundingClientRect(); if (r.width < 2) return; o.dpr = window.devicePixelRatio || 1; cv.width = Math.max(1, Math.round(r.width * o.dpr)); cv.height = Math.max(1, Math.round(r.height * o.dpr)); o.redraw() };
    new ResizeObserver(o.size).observe(cv);
    // iPadOS Scribble (handwriting into text fields) watches Pencil touches and holds back a stroke that starts soon after the last one
    // (WebKit bug 217430); cancelling the touch events on the canvas keeps every touch for the drawing (the fix Excalidraw shipped, #4705)
    for (const t of ['touchstart', 'touchmove', 'touchend']) cv.addEventListener(t, e => { if (e.cancelable) e.preventDefault() }, {passive:false});
    let penUp = 0;
    const pt = (e, r) => { const [ox, oy] = off(); return [e.clientX - r.left + ox, e.clientY - r.top + oy, e.pointerType === 'pen' ? (e.pressure || 0.05) : 0.5] };
    cv.addEventListener('pointerdown', e => {
      if (o.cur || e.button > 0) return;   // one stroke at a time: a second finger or the palm during a stroke does not draw
      // fingers draw too; only a large contact (a resting palm) or a touch while the pen was just writing is ignored
      if (e.pointerType === 'touch' && (Math.max(e.width || 0, e.height || 0) > 44 || performance.now() - penUp < 400)) return;
      e.preventDefault(); cv.setPointerCapture(e.pointerId); opt.down();
      const r = cv.getBoundingClientRect(); o.cur = {id:e.pointerId, r, p:[pt(e, r)]}; o.strokes.push(o.cur.p); setT(); drawStroke(g, o.cur.p, opt.w);
    });
    cv.addEventListener('pointermove', e => {
      if (!o.cur || e.pointerId !== o.cur.id) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const x of (evs.length ? evs : [e])) { const p = pt(x, o.cur.r), q = o.cur.p[o.cur.p.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6) continue; o.cur.p.push(p); seg(g, q, p, opt.w) }
    });
    const up = e => { if (!o.cur || e.pointerId !== o.cur.id) return; if (e.pointerType === 'pen') penUp = performance.now(); o.cur = null; opt.up() };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return o;
  }

  // the committed notebook ink as a PNG: cropped to the strokes, black on white, longest side at most 1280 px
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
  const bbox = ss => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of ss) for (const p of s) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]) } return {x0, y0, x1, y1} };
  // a small JPEG for the Pages view: the whole image, or the part around a box (screen coordinates, image scale k)
  function thumb(src, box, k){ return new Promise(res => { const i = new Image(); i.onload = () => {
    let sx = 0, sy = 0, sw = i.width, sh = i.height;
    if (box) { const pad = 160; sx = Math.max(0, (box.x0 - pad) * k); sy = Math.max(0, (box.y0 - pad) * k); sw = Math.min(i.width - sx, (box.x1 - box.x0 + 2 * pad) * k); sh = Math.min(i.height - sy, (box.y1 - box.y0 + 2 * pad) * k) }
    const s = Math.min(1, 480 / sw, 220 / sh), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(i, sx, sy, sw, sh, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7)) }; i.onerror = () => res(null); i.src = src }) }

  // ---- a writing session: the notebook paper, or the page itself in draw mode. Ink and typing collect; 3 s after the last stroke
  // or key press it is committed: sent with the screen, the ink fades, and the reply writes itself where the session shows it ----
  function Session(out){ const S = {out, timer:0, stale:false, busy:false, queued:null}; return S }
  function arm(S){ clearTimeout(S.timer); if (!S.ink.strokes.length && !S.out.typed()) return; S.out.status('Reading in 3 s…'); S.timer = setTimeout(() => commit(S), PAUSE) }
  function fadeReply(S){ const r = S.out.reply; if (r.textContent.trim() || r.querySelector('svg')) { r.parentElement.classList.add('kb-fade'); setTimeout(() => { if (r.parentElement.classList.contains('kb-fade')) { r.innerHTML = ''; r.parentElement.classList.remove('kb-fade'); if (S.out.faded) S.out.faded() } }, 1200) } }
  function unfade(S){ if (S.stale) { S.stale = false; S.ink.cv.classList.remove('kb-fade'); S.ink.redraw() } }   // writing again: drop the fading ink at once
  const onDown = S => () => { clearTimeout(S.timer); fadeReply(S); unfade(S); S.out.status('') };
  async function commit(S){
    clearTimeout(S.timer);
    const typed = S.out.typed(); if (!S.ink.strokes.length && !typed) return;
    if (!store.get('key')) { S.out.status('Add your Claude API key in AI buddy, Settings.'); if (S.out.kind === 'note') { sub = 'set'; show() } return }
    const ss = S.ink.strokes, used = hl, job = {kind:S.out.kind, typed, hl:used};
    // the sent ink fades; typed text leaves the box at once so new typing starts clean
    S.ink.strokes = []; S.out.clearTyped(); S.stale = true; S.ink.cv.classList.add('kb-fade'); hl = null; showHl();
    setTimeout(() => { if (S.stale) { S.stale = false; S.ink.redraw(); S.ink.cv.classList.remove('kb-fade') } }, 1400);
    S.out.status('Looking…');
    if (job.kind === 'note') { job.img = snapshot(ss); job.scr = await screenBlocks(P.classList.contains('kb-full'), null, used) }
    else { job.ink = ss.map(s => s.map(p => [p[0] - scrollX, p[1] - scrollY, p[2]])); job.box = bbox(job.ink); job.scr = await screenBlocks(false, job.ink, used) }
    if (S.busy) { S.queued = job; S.out.status('Will read after this reply…'); return }
    send(S, job);
  }
  function noteHistory(){
    const h = [];
    for (const e of entries.slice(-KEEP)) h.push({role:'user', content:(e.kind === 'page' ? '(earlier they drew on the page' + (e.where ? ', at ' + e.where : '') + '; their marks:) ' : '(an earlier page of the notebook; they wrote:) ') + (e.read || e.typed || '')}, {role:'assistant', content:e.reply || '…'});
    return h;
  }
  async function send(S, job){
    S.busy = true; const reply = S.out.reply; reply.parentElement.classList.remove('kb-fade'); reply.innerHTML = '';
    if (S.out.start) S.out.start(job);
    const content = [];
    if (job.img) content.push({type:'text', text:'Their handwriting:'}, {type:'image', source:{type:'base64', media_type:'image/png', data:job.img.split(',')[1]}});
    content.push(...job.scr.blocks);
    content.push({type:'text', text:job.kind === 'page'
      ? 'They drew on the page itself, over what is on their screen: their ink is the red marks in the screen image' + (job.scr.img ? '' : ' (the screen image could not be made, so you only have the text in view)') + '. Read what they wrote or marked (a circle, an arrow, an underline, a note in the margin, a sketch) and answer about exactly that.'
      : (job.img ? 'Their handwriting is in the first image.' : 'They wrote nothing by hand this time.') + (job.typed ? '\nTyped:\n' + job.typed : '')});
    let shown = 0, queue = [], drip = 0, hold = 0, stopped = false;
    const replyPart = raw => { const i = raw.indexOf('</read>'); if (i >= 0) return raw.slice(i + 7).replace(/^\s+/, ''); return /^\s*<read/.test(raw) || raw.length < 6 ? '' : raw };
    const box = reply.parentElement;
    const pump = () => { if (drip) return; drip = setInterval(() => {
      if (performance.now() < hold) return;
      if (!queue.length) { clearInterval(drip); drip = 0; return }
      const w = queue.shift();
      if (typeof w === 'string') reply.appendChild(el('span', null, esc(w)));
      else { const b = sketch(w.svg); if (b) { reply.appendChild(b); hold = performance.now() + inkIn(b) } }
      box.scrollTop = box.scrollHeight;
    }, 70) };
    const words = t => queue.push(...(t.match(/\S+\s*|\s+/g) || []));
    // newly streamed reply text goes into the queue: whole words, and each sketch only once its </svg> has arrived
    const feed = (raw, end) => {
      if (end) stopped = true;
      const r = replyPart(raw), lo = r.toLowerCase();
      while (r.length > shown) {
        const a = lo.indexOf('<svg', shown);
        if (a === shown) {
          const z = lo.indexOf('</svg>', a);
          if (z < 0) { if (stopped) shown = r.length; return }
          queue.push({svg:r.slice(a, z + 6)}); shown = z + 6; pump(); continue;
        }
        let upto = a > 0 ? a : r.length;
        if (a < 0 && !stopped) { upto = r.lastIndexOf(' ') + 1; const lt = r.lastIndexOf('<'); if (lt >= shown && lt < upto) upto = lt }
        if (upto <= shown) return;
        words(r.slice(shown, upto)); shown = upto; pump();
        if (a < 0) return;
      }
    };
    try {
      S.out.status('Reading…');
      const r = await stream(SYS_NOTE, noteHistory().concat([{role:'user', content}]), 'low', 4000, (raw, end) => { if (!end) S.out.status('Writing…'); feed(raw, end) });
      const m2 = r.raw.match(/<read>([\s\S]*?)<\/read>/), text = replyPart(r.raw).trim();
      if (r.stop === 'refusal' && !text) reply.innerHTML = '<span class="kb-err">Claude declined to answer this one.</span>';
      S.out.status(costLine(r));
      const img = job.kind === 'page' ? (job.scr.img ? await thumb(job.scr.img, job.box, job.scr.k) : null) : (job.img ? await thumb(job.img) : null);
      save({page:PAGE_ID, t:Date.now(), kind:job.kind, where:job.scr.note, typed:job.typed, read:m2 ? m2[1].trim() : '', reply:text, img});
    } catch(e) {
      reply.innerHTML = '<span class="kb-err" style="font:14px/1.5 system-ui,sans-serif">' + esc(String(e.message || e)) + '</span>'; S.out.status('');
    } finally {
      S.busy = false;
      if (S.queued) { const j = S.queued; S.queued = null; send(S, j) }
    }
  }

  // the notebook paper
  let inkColor = '#222';
  const NB = Session({kind:'note', reply, status:s => { stat.textContent = s }, typed:() => ta.value.trim(), clearTyped:() => { ta.value = '' }});
  NB.ink = Ink(cv, {w:2.6, color:() => inkColor, down:onDown(NB), up:() => arm(NB)});
  const size = () => { inkColor = getComputedStyle(P).color || '#222'; NB.ink.size() };
  ta.addEventListener('input', () => { fadeReply(NB); unfade(NB); arm(NB) });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(NB) } });

  // the page itself: draw mode puts a clear sheet over the whole screen; the ink scrolls with the page and is red, so it stands out
  // on the page and in the screen image; the reply appears in a card beside the marks
  const ov = el('canvas', {id:'kbBuddyOv', hidden:'', 'aria-label':'Drawing over the page'});
  const bar = el('div', {id:'kbBuddyBar', hidden:''}, '<b>&#x270E; Drawing on the page</b><span class="kb-st"></span><button type="button" data-p="undo">Undo</button><button type="button" data-p="clear">Clear</button><button type="button" class="kb-go" data-p="send">Send now</button><button type="button" data-p="done">Done</button>');
  const card = el('div', {id:'kbBuddyCard', hidden:''}, '<div class="kb-ink kb-cr"></div>');
  document.body.append(ov, bar, card);
  const cardReply = card.querySelector('.kb-cr'), barSt = bar.querySelector('.kb-st');
  const PG = Session({kind:'page', reply:cardReply, status:s => { barSt.textContent = s }, typed:() => '', clearTyped:() => {}, faded:() => { card.hidden = true },
    start:job => {   // the card goes beside the marks: right, left, below or above, whichever has room; it scrolls with the page
      const b = job.box, W = innerWidth, H = innerHeight, w = Math.min(380, W * 0.9); let x, y;
      if (b.x1 + 16 + w < W - 8) { x = b.x1 + 16; y = b.y0 } else if (b.x0 - 16 - w > 8) { x = b.x0 - 16 - w; y = b.y0 }
      else { x = Math.max(8, Math.min(b.x0, W - w - 8)); y = b.y1 + 12 < H - 160 ? b.y1 + 12 : Math.max(60, b.y0 - 220) }
      y = Math.max(56, Math.min(y, H - 160));
      Object.assign(card.style, {left:(x + scrollX) + 'px', top:(y + scrollY) + 'px', width:w + 'px'}); card.hidden = false;
    }});
  PG.ink = Ink(ov, {w:3, color:() => '#e03131', off:() => [scrollX, scrollY], down:onDown(PG), up:() => arm(PG)});
  window.addEventListener('scroll', () => { if (!ov.hidden) PG.ink.redraw() }, {passive:true});
  let drawing = false, wasOpen = false;
  function enterDraw(){
    menu.hidden = true; wasOpen = !P.hidden; P.hidden = true; btn.hidden = true;
    ov.hidden = false; bar.hidden = false; drawing = true; PG.ink.size(); barSt.textContent = store.get('key') ? 'Circle, underline, write; Claude reads it 3 s after you stop.' : 'Add your Claude API key in AI buddy, Settings, first.';
  }
  function exitDraw(){
    drawing = false; clearTimeout(PG.timer); PG.ink.strokes = []; PG.ink.redraw(); ov.hidden = true; bar.hidden = true; card.hidden = true;
    if (wasOpen) { P.hidden = false; show() } else btn.hidden = false;
  }
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return; const a = b.dataset.p;
    if (a === 'done') exitDraw();
    else if (a === 'undo') { PG.ink.strokes.pop(); PG.ink.redraw(); PG.ink.strokes.length ? arm(PG) : (clearTimeout(PG.timer), barSt.textContent = '') }
    else if (a === 'clear') { PG.ink.strokes = []; PG.ink.redraw(); clearTimeout(PG.timer); barSt.textContent = '' }
    else if (a === 'send') commit(PG);
  });

  function renderLog(){
    if (!entries.length) { log.innerHTML = '<p class="kb-hint">No pages yet. What you write in the notebook and what Claude answers are kept here, in this browser only.</p>'; return }
    log.innerHTML = '<div class="kb-row" style="margin:0 0 6px"><span class="kb-meta">' + entries.length + ' page' + (entries.length > 1 ? 's' : '') + ' on this page of the knowledge base, kept in this browser.</span><button type="button" data-a="wipe">Delete all</button></div>' +
      entries.slice().reverse().map(e => '<div class="kd-e"><time>' + esc(new Date(e.t).toLocaleString()) + (e.where ? ' · ' + esc(e.where) : '') + '</time>' + (e.img ? '<img alt="Your handwriting" src="' + e.img + '">' : '') +
        '<div class="kd-me">' + esc(e.read || e.typed || '') + '</div><div class="kd-cl" data-i="' + entries.indexOf(e) + '"></div></div>').join('');
    for (const c of log.querySelectorAll('.kd-cl')) for (const x of replyPieces(entries[+c.dataset.i].reply || '')) { if (typeof x === 'string') c.appendChild(document.createTextNode(x)); else { const b = sketch(x.svg); if (b) c.appendChild(b) } }
  }

  // ================= Chat =================
  const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function md(s){
    const L = s.split('\n'), out = []; let i = 0, para = [], list = null;
    const flushP = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = [] } };
    const flushL = () => { if (list) { out.push('<' + list.t + '>' + list.i.map(x => '<li>' + inline(x) + '</li>').join('') + '</' + list.t + '>'); list = null } };
    while (i < L.length) {
      const l = L[i];
      if (/^```/.test(l)) { flushP(); flushL(); const c = []; i++; while (i < L.length && !/^```/.test(L[i])) c.push(L[i++]); out.push('<pre><code>' + esc(c.join('\n')) + '</code></pre>'); i++; continue }
      let m;
      if ((m = l.match(/^#{1,6}\s+(.*)/))) { flushP(); flushL(); out.push('<h4>' + inline(m[1]) + '</h4>') }
      else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = {t:'ul', i:[]} } list.i.push(m[1]) }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = {t:'ol', i:[]} } list.i.push(m[1]) }
      else if (!l.trim()) { flushP(); flushL() }
      else if (list && /^\s{2,}\S/.test(l)) list.i[list.i.length - 1] += ' ' + l.trim();
      else { flushL(); para.push(l) }
      i++;
    }
    flushP(); flushL(); return out.join('');
  }
  function paintAnswer(ae, text, done){
    ae.innerHTML = '';
    for (const x of replyPieces(text)) {
      if (typeof x === 'string') ae.insertAdjacentHTML('beforeend', md(x));
      else { const b = sketch(x.svg); if (b) { ae.appendChild(b); if (done) inkIn(b) } }
    }
    if (!done && /<svg(?![\s\S]*<\/svg>)/i.test(text)) ae.insertAdjacentHTML('beforeend', '<p class="kb-hint">Sketching…</p>');
  }
  let chat = [], chatBusy = null;
  function hint(){
    if (chat.length || msgs.querySelector('.kc-q')) return;
    msgs.innerHTML = '<p class="kb-hint">Ask anything about this page. Claude sees what is on your screen' + (seeOn() ? '' : ' (off in Settings)') + ': the figures and animations in view, the text, the controls and anything you highlight.</p>';
  }
  cta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask() } });
  async function ask(){
    if (chatBusy) { chatBusy.abort(); return }
    const q = cta.value.trim(); if (!q && !hl) return;
    if (!store.get('key')) { sub = 'set'; show(); return }
    if (msgs.querySelector('.kb-hint')) msgs.innerHTML = '';
    const usedHl = hl, question = q || 'Explain the passage I highlighted.';
    const qe = el('div', {class:'kc-q'}); if (usedHl) qe.appendChild(el('q', null, esc(usedHl.text.length > 300 ? usedHl.text.slice(0, 300) + '…' : usedHl.text)));
    qe.appendChild(document.createTextNode(question)); msgs.appendChild(qe);
    const ae = el('div', {class:'kc-a'}, '<p class="kb-hint">Looking…</p>'); msgs.appendChild(ae); msgs.scrollTop = msgs.scrollHeight;
    cta.value = '';
    const ctl = new AbortController(); chatBusy = ctl; askBtn.textContent = 'Stop';
    let pinned = true; const onScroll = () => { pinned = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 40 }; msgs.addEventListener('scroll', onScroll);
    let text = '';
    try {
      const scr = await screenBlocks(P.classList.contains('kb-full'), null, usedHl); hl = null; showHl();
      const turn = {role:'user', content:[...scr.blocks, {type:'text', text:'Question: ' + question}]};
      const r = await stream(SYS_CHAT, chat.concat([turn]), 'medium', 16000, (raw, end) => { text = raw; paintAnswer(ae, raw, end); if (pinned) msgs.scrollTop = msgs.scrollHeight }, ctl.signal);
      if (r.stop === 'refusal') ae.insertAdjacentHTML('beforeend', '<p class="kb-err">Claude declined to answer this one.</p>');
      else if (r.stop === 'max_tokens') ae.insertAdjacentHTML('beforeend', '<p class="kb-err">The answer hit its length limit and was cut off.</p>');
      // later turns carry the question and answer as text; only the newest turn carries the screen
      chat.push({role:'user', content:(usedHl ? 'Highlighted: "' + usedHl.text.slice(0, 600) + '"\n' : '') + (scr.note ? '(looking at ' + scr.note + ') ' : '') + question}, {role:'assistant', content:text || '…'});
      ae.appendChild(el('div', {class:'kc-m'}, esc(costLine(r)))); cmeta.textContent = 'This visit ≈ ' + spent.toFixed(1) + '¢';
    } catch(e) {
      if (e.name === 'AbortError') { ae.insertAdjacentHTML('beforeend', '<p class="kb-hint">Stopped.</p>'); if (text) chat.push({role:'user', content:question}, {role:'assistant', content:text}) }
      else ae.innerHTML = '<p class="kb-err">' + esc(String(e.message || e)) + '</p>' + (/fetch|network/i.test(String(e.message)) ? '<p class="kb-hint">The request did not reach the API (offline, or blocked by an extension or network filter).</p>' : '');
    } finally {
      chatBusy = null; askBtn.textContent = 'Ask'; msgs.removeEventListener('scroll', onScroll); if (pinned) msgs.scrollTop = msgs.scrollHeight;
    }
  }

  // ================= Settings and buttons =================
  function renderSet(){
    const k = store.get('key');
    setv.innerHTML = `<label for="kbBuddyKey">Claude API key</label>
<input id="kbBuddyKey" type="password" autocomplete="off" spellcheck="false" placeholder="${k ? 'saved (ending ' + esc(k.slice(-4)) + ')' : 'sk-ant-...'}">
<div class="kb-row"><button type="button" class="kb-go" data-a="save">Save</button>${k ? '<button type="button" data-a="forget">Forget key</button>' : ''}<span class="kb-meta"></span><button type="button" data-a="back">Back</button></div>
<p>The same key and model as Ask Claude on the other pages. Create a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>; API use is billed per message, separately from a Claude subscription.</p>
<label for="kbBuddyModel">Model</label><select id="kbBuddyModel">${Object.keys(MODELS).map(m => '<option value="' + m + '"' + (m === model() ? ' selected' : '') + '>' + MODELS[m].name + '</option>').join('')}</select>
<label class="kb-ck"><input type="checkbox" id="kbBuddySee"${seeOn() ? ' checked' : ''}><span>Let Claude see the screen: an image of the figures and animations in view, the text in view, the controls' values and your highlight, sent with each message.</span></label>
<p>The key is saved only in this browser. Each message sends this page's text, what you wrote or asked, the screen as above and your recent exchanges from your browser straight to api.anthropic.com; your notebook pages stay in this browser.</p>`;
    setv.querySelector('select').onchange = e => store.set('model', e.target.value);
    setv.querySelector('#kbBuddySee').onchange = e => mine.set('see', e.target.checked ? null : 'off');
    const inp = setv.querySelector('input'); if (!k) inp.focus();
  }
  setv.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'kbBuddyKey') { e.preventDefault(); setv.querySelector('[data-a=save]').click() } });
  P.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return; e.preventDefault();
    const act = a.dataset.a;
    if (act === 'close') close();
    else if (act === 'notebook' || act === 'chat') setMode(act);
    else if (act === 'full') setFull(!P.classList.contains('kb-full'));
    else if (act === 'pages') { sub = sub === 'pages' ? null : 'pages'; show() }
    else if (act === 'set') { sub = sub === 'set' ? null : 'set'; show() }
    else if (act === 'back') { sub = null; show() }
    else if (act === 'save') { const v = setv.querySelector('#kbBuddyKey').value.trim(); if (v) store.set('key', v); sub = null; show() }
    else if (act === 'forget') { store.set('key', null); renderSet() }
    else if (act === 'unhl') { hl = null; showHl() }
    else if (act === 'new') { if (chatBusy) chatBusy.abort(); chat = []; msgs.innerHTML = ''; cmeta.textContent = ''; hint() }
    else if (act === 'ask') ask();
    else if (act === 'undo') { NB.ink.strokes.pop(); NB.ink.redraw(); NB.ink.strokes.length || ta.value.trim() ? arm(NB) : (clearTimeout(NB.timer), stat.textContent = '') }
    else if (act === 'clear') { NB.ink.strokes = []; ta.value = ''; NB.ink.redraw(); clearTimeout(NB.timer); stat.textContent = '' }
    else if (act === 'send') commit(NB);
    else if (act === 'draw') enterDraw();
    else if (act === 'wipe') { if (!confirm('Delete every notebook page for this page of the knowledge base? This cannot be undone.')) return; for (const x of entries) if (x.id != null) await tx('readwrite', s => s.delete(x.id)); entries = []; renderLog() }
  });
}
})();
