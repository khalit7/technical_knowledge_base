// ---- AI buddy: a toolbar of pens over the page, a notebook, and Claude reading both ----
// Pilot (2026-11-18/19) on the Attention Is All You Need page. Source of truth: html_utils/apply_buddy.py copies this file, as one marked
// script block (id kb-buddy), into the source part that closes the page's <head>; edit it here, rerun apply_buddy.py and rebuild.
// On a page that has it, it replaces the Ask Claude button (kb_ask.js stays on the page but its button is hidden).
// Toolbar: docked to an edge of the screen (top by default; drag its grip to any edge), or made small. Read (no pen), pen,
//   highlighter, eraser, Text (tap the notebook and type there; Enter sends), six colours, two widths, Undo, Claude on or off (on: Claude reads 3 s after you stop; off: marks are just
//   notes, Send asks), the Notebook, Settings.
// On the page: with a pen chosen, the Apple Pencil and the mouse write (fingers still scroll and work the page). Marks stay, pinned to
//   the element they were drawn on, so they follow reflow and tabs. Claude's replies are sticky notes beside them (fold, move, delete).
//   In Read, the page works as usual; selecting text opens a small Ask box: the passage is highlighted and the answer is a note beside it.
// Notebook: ruled pages one under another, full screen (clear of the toolbar) or floating. Write with the Pencil, a finger or the
//   mouse (two fingers scroll), or type; Claude gets the new ink close up and the whole notebook page with free spots lettered on
//   it, picks one (or the next blank page) and its reply writes itself there in a handwriting face, with a small pen sketch when a
//   picture helps and an arrow to an earlier mark when that makes the link clear. Typing is the chat.
// Everything is kept in this browser (IndexedDB: the notebook, the page marks and notes, and History, the list of every exchange).
// Context sent with every turn (when "see the screen" is on): the page's full text (cached), the tab and section in view, the text
//   in view, the values of the controls in view, the reader's highlight, and an image of the screen rebuilt in the browser (boxes and text as laid
//   out, the figures, animations at their current frame and images at their positions, the highlight in yellow, the marks and notes),
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
#kbBar{position:fixed;z-index:70;display:flex;align-items:center;gap:3px;padding:4px 6px;background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow,0 4px 16px rgba(0,0,0,.18));touch-action:none;-webkit-user-select:none;user-select:none;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px)}
#kbBar.kb-v{flex-direction:column;padding:6px 4px}
#kbBar.kb-drag{opacity:.85;transition:none}
#kbBar button{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:32px;height:32px;padding:0 6px;border:1px solid transparent;border-radius:9px;background:transparent;color:inherit;font-size:12.5px;font-weight:600;cursor:pointer;line-height:1}
#kbBar button:hover{background:var(--soft)}
#kbBar button[aria-pressed=true]{background:var(--soft);border-color:var(--acc);color:var(--acc)}
#kbBar svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
#kbBar .kb-grip2{display:flex;align-items:center;justify-content:center;width:18px;height:32px;cursor:grab;color:var(--mute);font-size:15px;letter-spacing:-2px}
#kbBar.kb-v .kb-grip2{width:32px;height:18px}
#kbBar .kb-sep{width:1px;height:22px;background:var(--line);margin:0 3px;flex:none}
#kbBar.kb-v .kb-sep{width:22px;height:1px;margin:3px 0}
#kbBar .kb-sws{display:flex;gap:3px;align-items:center}
#kbBar.kb-v .kb-sws{flex-direction:column}
#kbBar button.kb-sw{min-width:0;width:22px;height:22px;padding:0;border-radius:50%;background:var(--c);border:2px solid var(--card,var(--bg));box-shadow:0 0 0 1px var(--line)}
#kbBar button.kb-sw[aria-pressed=true]{box-shadow:0 0 0 2px var(--acc)}
#kbBar button[data-b=claude][aria-pressed=false]{color:var(--mute)}
#kbBar button[data-b=send]{background:var(--acc);color:var(--card,var(--bg))}
#kbBar.kb-min>:not(.kb-grip2):not([data-b=min]):not(.kb-cur){display:none!important}
#kbBar [hidden]{display:none!important}
#kbBar.kb-v [data-b=claude] span{display:none}
#kbBar .kb-A{font:700 17px/1 Georgia,'Times New Roman',serif}
#kbAskPop{position:fixed;z-index:66;display:flex;gap:6px;align-items:center;width:min(380px,calc(100vw - 16px));padding:6px;background:var(--card,var(--bg));border:1px solid var(--line);border-left:4px solid #e0b400;border-radius:12px;box-shadow:var(--shadow,0 6px 22px rgba(0,0,0,.2))}
#kbAskPop[hidden]{display:none}
#kbAskPop input{flex:1;min-width:0;font:inherit;font-size:14.5px;color:var(--ink);background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:6px 9px}
#kbAskPop input:focus{outline:2px solid var(--acc);outline-offset:-1px}
#kbAskPop button{padding:5px 12px;border-radius:8px;background:var(--acc);border:1px solid var(--acc);color:var(--card,var(--bg));font-weight:600;font-size:13px;cursor:pointer}
.kb-note .kb-nq{padding:0 14px 2px;font-size:12.5px;line-height:1.35;color:var(--mute);border-left:3px solid #e0b400;margin:2px 14px 4px 14px;padding-left:7px}
.kb-note.kb-folded .kb-nq{display:none}
#kbBuddy .kd-ed{position:absolute;pointer-events:auto;font:inherit;font-size:22px;line-height:40px;color:inherit;background:color-mix(in srgb,var(--acc) 6%,transparent);border:1px dashed var(--acc);border-radius:4px;padding:0 4px;margin:0 -5px;resize:none;overflow:hidden;min-height:40px;outline:none}
#kbBuddy.kd-texting .kd-pg canvas{cursor:text}
#kbToast{position:fixed;z-index:69;max-width:min(360px,80vw);padding:5px 12px;background:var(--card,var(--bg));color:var(--mute);border:1px solid var(--line);border-radius:99px;box-shadow:var(--shadow,0 3px 12px rgba(0,0,0,.15));font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#kbToast[hidden]{display:none}
#kbMarks{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:57;color:var(--ink)}
#kbNotes{position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:58}
html.kb-pen body,html.kb-pen body *{cursor:crosshair}
html.kb-pen #kbBar,html.kb-pen #kbBar *,html.kb-pen #kbBuddy .kb-h,html.kb-pen #kbBuddy button,html.kb-pen .kb-note .kb-nh{cursor:default}
.kb-note{position:absolute;max-width:calc(100vw - 16px);background:color-mix(in srgb,var(--card,var(--bg)) 95%,transparent);border:1px solid var(--line);border-left:4px solid var(--acc);border-radius:12px;box-shadow:var(--shadow,0 6px 24px rgba(0,0,0,.2));color:var(--acc)}
.kb-note[hidden]{display:none}
.kb-note .kb-nh{display:flex;align-items:center;gap:4px;padding:3px 4px 0 12px;font-size:11.5px;color:var(--mute);cursor:move;touch-action:none;-webkit-user-select:none;user-select:none}
.kb-note .kb-nh .kb-sp{flex:1}
.kb-note .kb-nh button{border:0;background:transparent;color:var(--mute);font-size:15px;line-height:1;padding:2px 7px;border-radius:6px;cursor:pointer}
.kb-note .kb-nh button:hover{background:var(--soft)}
.kb-note .kb-nb{max-height:44vh;overflow:auto;padding:0 14px 10px;font-family:${HAND};font-size:23px;line-height:1.3;white-space:pre-wrap;overflow-wrap:anywhere}
.kb-note .kb-nb .kb-sk svg{max-width:320px;max-height:230px}
.kb-note .kb-dot{display:none}
.kb-note.kb-folded{width:auto!important;border:0;background:transparent;box-shadow:none}
.kb-note.kb-folded .kb-nh,.kb-note.kb-folded .kb-nb{display:none}
.kb-note.kb-folded .kb-dot{display:flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:50% 50% 50% 4px;background:var(--acc);color:var(--card,var(--bg));border:0;font:700 15px/1 ${HAND};box-shadow:var(--shadow,0 3px 10px rgba(0,0,0,.25));cursor:pointer}
#kbBuddy{position:fixed;z-index:63;display:flex;flex-direction:column;min-width:290px;min-height:300px;background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow,0 6px 28px rgba(0,0,0,.25));font-size:14.5px;line-height:1.55;overflow:hidden}
#kbBuddy.kb-full{inset:var(--kbT,0px) var(--kbR,0px) var(--kbB,0px) var(--kbL,0px)!important;width:auto!important;height:auto!important;border-radius:0;border:0}
#kbBuddy[hidden],#kbBuddy [hidden]{display:none!important}
#kbBuddy .kb-h{display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:7px 8px 7px 12px;border-bottom:1px solid var(--line);cursor:move;touch-action:none;-webkit-user-select:none;user-select:none;background:var(--soft)}
#kbBuddy.kb-full .kb-h{cursor:default}
#kbBuddy .kb-h b{font-size:13.5px}
#kbBuddy .kb-h button{padding:2px 8px;font-size:12.5px;cursor:pointer;white-space:nowrap}
#kbBuddy .kb-h .kb-sp{flex:1;min-width:4px}
#kbBuddy .kb-h button.kb-on{border-color:var(--acc)}
#kbBuddy .kb-hl{display:flex;gap:6px;align-items:flex-start;padding:6px 10px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--mute)}
#kbBuddy .kb-hl q{flex:1;max-height:3.1em;overflow:hidden;color:var(--ink);border-left:3px solid #e0b400;padding-left:6px;quotes:none}
#kbBuddy .kb-hl button{padding:0 7px;font-size:12px}
#kbBuddy .kb-grip{position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;touch-action:none;z-index:2;background:linear-gradient(135deg,transparent 0 50%,var(--line) 50% 56%,transparent 56% 66%,var(--line) 66% 72%,transparent 72% 82%,var(--line) 82% 88%,transparent 88%)}
#kbBuddy.kb-full .kb-grip{display:none}
#kbBuddy .kb-view{flex:1;min-height:0;display:flex;flex-direction:column}
#kbBuddy .kd-paper{position:relative;flex:1;min-height:0;background:var(--soft);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#kbBuddy .kd-scr{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:10px 0 44px}
#kbBuddy .kd-book{display:flex;flex-direction:column;align-items:center;gap:14px}
#kbBuddy .kd-pg{position:relative;flex:none;overflow:hidden;border-radius:3px;background:var(--card,var(--bg));box-shadow:0 1px 5px rgba(0,0,0,.16)}
#kbBuddy .kd-pgi{position:absolute;left:0;top:0;width:800px;height:1130px;transform-origin:0 0;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 39px,color-mix(in srgb,var(--line) 70%,transparent) 39px,color-mix(in srgb,var(--line) 70%,transparent) 40px)}
#kbBuddy .kd-pg canvas{position:absolute;left:0;top:0;width:800px;height:1130px;touch-action:none;cursor:crosshair}
#kbBuddy.kd-hand .kd-pg canvas{pointer-events:none}
#kbBuddy.kd-erasing .kd-pg canvas{cursor:cell}
#kbBuddy .kd-its{position:absolute;inset:0;pointer-events:none}
#kbBuddy .kd-it{position:absolute;white-space:pre-wrap;overflow-wrap:anywhere}
#kbBuddy .kd-reply{font-family:${HAND};font-size:30px;line-height:40px;color:var(--acc)}
#kbBuddy .kd-typed{font-size:22px;line-height:40px}
#kbBuddy svg.kd-arrow{left:0;top:0;width:800px;height:1130px;color:var(--acc);overflow:visible}
#kbBuddy .kd-no{position:absolute;right:16px;bottom:8px;font-size:15px;color:var(--mute)}
.kb-ink span{display:inline;animation:kbInk .5s ease-out both}
.kb-sk{display:block;margin:4px 0 8px}
.kb-sk svg{display:block;width:100%;max-width:460px;height:auto;max-height:340px;color:var(--acc);overflow:visible}
.kb-sk text{font-family:${HAND};stroke:none;fill:currentColor}
#kbBuddy .kd-cl .kb-sk svg{max-width:380px;max-height:260px}
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
#kbBuddy .kb-hint{color:var(--mute);font-size:13px}
#kbBuddy .kb-err,.kb-note .kb-err{color:var(--bad,#c2703a)}
#kbBuddy .kb-set label{display:block;font-weight:600;margin:10px 0 4px;font-size:13px}
#kbBuddy .kb-set label.kb-ck{display:flex;gap:8px;align-items:flex-start;font-weight:400}
#kbBuddy .kb-set label.kb-ck input{width:auto;margin-top:4px}
#kbBuddy .kb-set input,#kbBuddy .kb-set select{width:100%}
#kbBuddy .kb-set p{font-size:13px;color:var(--mute);margin:6px 0}
#kbBuddy a{color:var(--acc)}
@media print{#kbBar,#kbToast,#kbBuddy{display:none}.kb-note.kb-folded{display:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = (t, a, h) => { const e = document.createElement(t); if (a) for (const k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const ICON = {
    hand:'M6 3l12 7.5-5.2 1.6L10 18z', pen:'M4 20l4.2-1L19 8.2 15.8 5 5 15.8zM13.8 7l3.2 3.2', hl:'M9 17l-4 4h6l1.4-1.4M8 13.5l2.5 2.5L20 6.5 17.5 4zM8 13.5l-1.5 4 2-.5',
    erase:'M8.5 20H20M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19.1a3 3 0 0 1-2.1.9H8.4L4.5 16.1a.4.4 0 0 1 0-.6zM9 11l5 5',
    undo:'M9 6L4 11l5 5M4 11h11a5 5 0 0 1 0 10h-3', book:'M6 3h11.5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M4 7h3M4 12h3M4 17h3M10 8h5.5M10 11.5h5.5',
    claude:'M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M5.6 18.4l3.2-3.2M15.2 8.8l3.2-3.2', set:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    thin:'M5 12h14', thick:'M5 12h14'
  };
  const COLORS = [['', 'Ink'], ['#e03131', 'Red'], ['#1c7ed6', 'Blue'], ['#2f9e44', 'Green'], ['#f59f00', 'Yellow'], ['#ae3ec9', 'Purple']];
  const bar = el('div', {id:'kbBar', role:'toolbar', 'aria-label':'Pens, notebook and Claude'},
    '<span class="kb-grip2" title="Drag to any edge of the screen" aria-hidden="true">&#x2807;&#x2807;</span>' +
    '<button type="button" data-t="hand" title="Read and use the page (no pen)" aria-label="Read">' + ic(ICON.hand) + '</button>' +
    '<button type="button" data-t="pen" title="Pen: the Apple Pencil or the mouse writes on the page (fingers still scroll); in the notebook a finger writes too" aria-label="Pen">' + ic(ICON.pen) + '</button>' +
    '<button type="button" data-t="hl" title="Highlighter" aria-label="Highlighter">' + ic(ICON.hl) + '</button>' +
    '<button type="button" data-t="erase" title="Eraser: touch a mark to remove it" aria-label="Eraser">' + ic(ICON.erase) + '</button>' +
    '<button type="button" data-t="text" title="Text: tap anywhere in the notebook and type there (Enter sends, Shift+Enter is a new line)" aria-label="Text"><span class="kb-A">A</span></button>' +
    '<span class="kb-sep"></span><span class="kb-sws">' + COLORS.map(([c, n]) => '<button type="button" class="kb-sw" data-c="' + c + '" title="' + n + '" aria-label="' + n + '" style="--c:' + (c || 'var(--ink)') + '"></button>').join('') + '</span>' +
    '<button type="button" data-b="width" title="Line width: thin or thick" aria-label="Line width"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6"/></svg></button>' +
    '<button type="button" data-b="undo" title="Undo your last mark" aria-label="Undo">' + ic(ICON.undo) + '</button>' +
    '<span class="kb-sep"></span>' +
    '<button type="button" data-b="claude" title="Claude reads your writing after a 3 s pause (on), or only when you tap Send (off)">' + ic(ICON.claude) + '<span>Claude</span></button>' +
    '<button type="button" data-b="send" title="Send your new marks to Claude now" hidden>Send</button>' +
    '<button type="button" data-b="notebook" title="Notebook: write or type to Claude" aria-label="Notebook">' + ic(ICON.book) + '</button>' +
    '<button type="button" data-b="set" title="Settings: key, model, what Claude sees" aria-label="Settings">' + ic(ICON.set) + '</button>' +
    '<button type="button" data-b="min" title="Make the toolbar small" aria-label="Make the toolbar small">&#x2013;</button>');
  const toastEl = el('div', {id:'kbToast', hidden:'', 'aria-live':'polite'});
  const P = el('div', {id:'kbBuddy', role:'dialog', 'aria-label':'Notebook', hidden:''});
  P.innerHTML = `<div class="kb-h"><b>Notebook</b><span class="kb-sp"></span><button type="button" data-a="end" title="Go to the blank page at the end">New page</button><button type="button" data-a="pages" title="Every exchange as a list: the notebook and the page">History</button><button type="button" data-a="full" title="Fill the screen">Full</button><button type="button" data-a="set" title="Settings: key, model, what Claude sees" aria-label="Settings">&#x2699;</button><button type="button" data-a="close" title="Close (Esc)" aria-label="Close">&#x2715;</button></div>
<div class="kb-hl" hidden><span>Your highlight:</span><q></q><button type="button" data-a="unhl" title="Do not send this highlight" aria-label="Do not send this highlight">&#x2715;</button></div>
<div class="kb-view" data-v="notebook"><div class="kd-paper"><div class="kd-scr"><div class="kd-book"></div></div><div class="kd-st" aria-live="polite"></div></div></div>
<div class="kb-view" data-v="pages" hidden><div class="kb-scroll kd-log"></div></div>
<div class="kb-view" data-v="set" hidden><div class="kb-scroll kb-set"></div></div>
<div class="kb-grip" title="Drag to resize"></div>`;
  document.body.append(bar, toastEl, P);
  const $ = s => P.querySelector(s);
  const head = $('.kb-h'), grip = $('.kb-grip'), hlBox = $('.kb-hl');
  const nbView = $('[data-v=notebook]'), pgView = $('[data-v=pages]'), stView = $('[data-v=set]');
  const stat = $('.kd-st'), scr = $('.kd-scr'), book$ = $('.kd-book');
  const log = $('.kd-log'), setv = $('.kb-set');

  // ---- the notebook window: full screen by default (clear of the toolbar), or floating (dragged by its title bar, resized from the
  // corner, remembered) ----
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
  // full screen leaves room for the toolbar on whichever edge it is docked
  function fitFull(){
    const r = bar.getBoundingClientRect(), m = bar.classList.contains('kb-min') ? 0 : 1;
    const v = {T:0, R:0, B:0, L:0};
    if (m) { if (dock.e === 'top') v.T = r.bottom + 6; else if (dock.e === 'bottom') v.B = innerHeight - r.top + 6; else if (dock.e === 'left') v.L = r.right + 6; else v.R = innerWidth - r.left + 6 }
    for (const k in v) P.style.setProperty('--kb' + k, v[k] + 'px');
  }
  function setFull(on){
    P.classList.toggle('kb-full', on); mine.set('full', on ? '1' : '0');
    const b = $('[data-a=full]'); b.textContent = on ? 'Float' : 'Full'; b.title = on ? 'Float over the page; drag and resize it' : 'Fill the screen';
    if (on) { for (const k of ['left', 'top', 'width', 'height']) P.style[k] = ''; fitFull() } else place();
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
  window.addEventListener('resize', () => { placeBar(); if (!P.hidden) { if (P.classList.contains('kb-full')) fitFull(); else place() } });

  // ---- views of the window: the notebook, History, Settings ----
  let sub = null;   // null, 'pages' or 'set'
  function show(){
    const v = sub || 'notebook';
    nbView.hidden = v !== 'notebook'; pgView.hidden = v !== 'pages'; stView.hidden = v !== 'set';
    $('[data-a=pages]').classList.toggle('kb-on', sub === 'pages'); $('[data-a=set]').classList.toggle('kb-on', sub === 'set');
    if (v === 'pages') renderLog();
    if (v === 'set') renderSet();
    if (v === 'notebook') requestAnimationFrame(layoutBook);
    showHl(); syncBar();
  }
  let lastFocus = null;
  function open(view){
    if (P.hidden) lastFocus = document.activeElement;
    P.hidden = false; setFull(mine.get('full') !== '0');
    sub = !store.get('key') ? 'set' : (view || null); show();
  }
  function close(){ P.hidden = true; syncBar(); if (lastFocus && lastFocus.focus) lastFocus.focus() }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!pop.hidden) hidePop(); else if (ed) finishEd(); else if (!P.hidden) close(); else if (tool !== 'hand') setTool('hand') } });

  // ---- the toolbar: tools, colours, width, undo, Claude on or off, the notebook, settings. It docks to an edge of the screen
  // (dragged by its grip; it snaps to the nearest edge, where it stays) and can be made small ----
  const WIDTHS = {pen:[2.6, 5], hl:[16, 28]};
  let tool = /^(hand|pen|hl|erase|text)$/.test(mine.get('tool')) ? mine.get('tool') : 'hand', color = mine.get('color') || '', thick = mine.get('thick') === '1';
  let dock = {e:'top', f:0.5}; try { const d = JSON.parse(mine.get('dock') || 'null'); if (d && /^(top|bottom|left|right)$/.test(d.e)) dock = {e:d.e, f:Math.max(0, Math.min(1, +d.f || 0.5))} } catch(e) {}
  const claudeOn = () => mine.get('claude') !== 'off';
  const penOn = () => tool === 'pen' || tool === 'hl' || tool === 'erase';   // the tools that write on the page; Read and Text leave it alone
  // what the pen puts down now: colour (null is the page's own ink colour, so it follows light and dark), width, highlighter or not
  const curStyle = () => tool === 'hl' ? {c:color || '#f59f00', w:WIDTHS.hl[+thick], h:true} : {c:color || null, w:WIDTHS.pen[+thick], h:false};
  function placeBar(){
    const v = dock.e === 'left' || dock.e === 'right'; bar.classList.toggle('kb-v', v);
    const W = innerWidth, H = innerHeight, w = bar.offsetWidth, h = bar.offsetHeight, m = 8;
    let x, y;
    if (v) { x = dock.e === 'left' ? m : W - w - m; y = Math.max(m, Math.min(H - h - m, dock.f * H - h / 2)) }
    else { y = dock.e === 'top' ? m : H - h - m; x = Math.max(m, Math.min(W - w - m, dock.f * W - w / 2)) }
    Object.assign(bar.style, {left:x + 'px', top:y + 'px'}); placeToast();
    if (!P.hidden && P.classList.contains('kb-full')) fitFull();
  }
  bar.querySelector('.kb-grip2').addEventListener('pointerdown', e => {
    if (e.button > 0) return; e.preventDefault(); const g = e.currentTarget; g.setPointerCapture(e.pointerId);
    const r = bar.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; bar.classList.add('kb-drag');
    const mv = ev => Object.assign(bar.style, {left:(ev.clientX - ox) + 'px', top:(ev.clientY - oy) + 'px'});
    const up = ev => {
      g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); bar.classList.remove('kb-drag');
      const x = ev.clientX, y = ev.clientY, W = innerWidth, H = innerHeight, d = [['top', y], ['bottom', H - y], ['left', x], ['right', W - x]].sort((a, b) => a[1] - b[1])[0][0];
      dock = {e:d, f:d === 'top' || d === 'bottom' ? x / W : y / H}; mine.set('dock', JSON.stringify(dock)); placeBar();
    };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  });
  function syncBar(){
    for (const b of bar.querySelectorAll('[data-t]')) { const on = b.dataset.t === tool; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('kb-cur', on) }
    for (const b of bar.querySelectorAll('[data-c]')) b.setAttribute('aria-pressed', String(b.dataset.c === color));
    const wb = bar.querySelector('[data-b=width] path'); wb.parentElement.style.strokeWidth = thick ? 4.2 : 1.9;
    const cb = bar.querySelector('[data-b=claude]'); cb.setAttribute('aria-pressed', String(claudeOn()));
    bar.querySelector('[data-b=send]').hidden = !(pendPage.length || pend.length || pendTyped.length || (ed && ed.ta.value.trim()));
    bar.querySelector('[data-b=send]').title = claudeOn() ? 'Send now instead of waiting' : 'Send your new marks to Claude';
    bar.querySelector('[data-b=notebook]').setAttribute('aria-pressed', String(!P.hidden));
    document.documentElement.classList.toggle('kb-pen', penOn());
    P.classList.toggle('kd-hand', tool === 'hand'); P.classList.toggle('kd-erasing', tool === 'erase'); P.classList.toggle('kd-texting', tool === 'text');
    if (penOn()) hidePop();
    placeBar();
  }
  function setTool(t){ tool = t; mine.set('tool', t); syncBar() }
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) setTool(b.dataset.t === tool && tool !== 'hand' ? 'hand' : b.dataset.t);
    else if (b.dataset.c != null) { color = b.dataset.c; mine.set('color', color || null); if (tool === 'hand' || tool === 'erase') setTool('pen'); else syncBar() }
    else if (b.dataset.b === 'width') { thick = !thick; mine.set('thick', thick ? '1' : null); syncBar() }
    else if (b.dataset.b === 'undo') undo();
    else if (b.dataset.b === 'claude') { mine.set('claude', claudeOn() ? 'off' : null); toast(claudeOn() ? 'Claude is on: it reads your writing 3 s after you stop.' : 'Claude is off: your marks are just notes; tap Send to ask.', 4000); if (claudeOn()) { arm(PG); arm(NB) } else { clearTimeout(PG.timer); clearTimeout(NB.timer); stat.textContent = '' } syncBar() }
    else if (b.dataset.b === 'send') { commit(PG); commit(NB) }
    else if (b.dataset.b === 'notebook') P.hidden ? open() : close();
    else if (b.dataset.b === 'set') open('set');
    else if (b.dataset.b === 'min') { const m = !bar.classList.contains('kb-min'); bar.classList.toggle('kb-min', m); mine.set('min', m ? '1' : null); b.innerHTML = m ? '+' : '&#x2013;'; b.title = m ? 'Show the whole toolbar' : 'Make the toolbar small'; placeBar() }
  });
  if (mine.get('min') === '1') { bar.classList.add('kb-min'); bar.querySelector('[data-b=min]').textContent = '+' }
  // a short status line beside the toolbar (for the page; the notebook has its own)
  let toastT = 0;
  function placeToast(){
    const r = bar.getBoundingClientRect(), t = toastEl;
    if (dock.e === 'top') Object.assign(t.style, {left:r.left + 'px', top:(r.bottom + 6) + 'px', right:'', bottom:''});
    else if (dock.e === 'bottom') Object.assign(t.style, {left:r.left + 'px', top:(r.top - 34) + 'px', right:'', bottom:''});
    else if (dock.e === 'left') Object.assign(t.style, {left:(r.right + 6) + 'px', top:(r.top + 4) + 'px', right:'', bottom:''});
    else Object.assign(t.style, {left:Math.max(8, r.left - 366) + 'px', top:(r.top + 4) + 'px', right:'', bottom:''});
  }
  function toast(s, ms){ clearTimeout(toastT); toastEl.textContent = s || ''; toastEl.hidden = !s; if (s) { placeToast(); if (ms) toastT = setTimeout(() => { toastEl.hidden = true }, ms) } }

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
      hl = {text:txt.slice(0, 4000), where:where(he), rects:[...r.getClientRects()].filter(q => q.width > 1).slice(0, 60).map(q => ({x:q.left + scrollX, y:q.top + scrollY, w:q.width, h:q.height}))};
      showHl(); if (!penOn()) showPop();
    }, 250);
  });
  function showHl(){ hlBox.hidden = !hl || !!sub; if (hl) hlBox.querySelector('q').textContent = hl.text.length > 300 ? hl.text.slice(0, 300) + '…' : hl.text }

  // ---- page text (every tab; frozen at first use so the cached prefix stays identical) and what is in view now ----
  const SKIP = /^(SCRIPT|STYLE|SVG|CANVAS|BUTTON|SELECT|INPUT|TEXTAREA|NAV|TEMPLATE|NOSCRIPT)$/;
  const BLOCK = /^(P|DIV|LI|UL|OL|SECTION|ARTICLE|DETAILS|SUMMARY|FIGURE|FIGCAPTION|TABLE|TR|PRE|BLOCKQUOTE|H[1-6]|BR|HR|DL|DT|DD|ASIDE|HEADER|FOOTER|MAIN)$/;
  const OURS = '#kbBuddy,#kbBar,#kbToast,#kbMarks,#kbNotes,#kbAskPop,#kbAsk,#kbAskBtn,#kbAskSel,#jsErr', OURS_UI = '#kbBuddy,#kbBar,#kbToast,#kbNotes,#kbAskPop,#kbAsk,#kbAskBtn,#kbAskSel';
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
  // (with their computed styles) and images on top at their screen positions, the highlight in yellow, the reader's marks on the page
  // in their colours with the newest (fresh) outlined, and Claude's open notes
  async function screenImage(mark, fresh){
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
    try { paintMarks(g, fresh) } catch(e) {}
    try { return {img:out.toDataURL('image/jpeg', 0.85), k} } catch(e) { return {img:null, k} }
  }
  // what Claude gets about the screen: content blocks (the image, then the description); with ink on the page it is always sent
  async function screenBlocks(full, fresh, mark){
    const ink = fresh && fresh.length;
    if (!seeOn() && !ink) return {blocks:[], note:'', img:null, k:1};
    const v = inViewNow(), shot = await screenImage(mark, fresh);
    const lines = ['What is on their screen right now' + (full ? ' (the page under the full-screen notebook)' : '') + ':',
      '- Tab "' + v.tab + '"' + (v.section ? ', section "' + v.section + '"' : '') + ', ' + v.pct + '% of the way down the page.'];
    if (mark) lines.push('- They highlighted this' + (mark.where ? ' (in ' + mark.where + ')' : '') + ':\n<highlight>\n' + mark.text + '\n</highlight>');
    if (v.controls.length) lines.push('- Controls in view: ' + v.controls.join('; ') + '.');
    if (shot.img) lines.push('- The image above is their screen rebuilt in the browser: the text and boxes as laid out, the figures, animations (their current frame) and images at their positions' + (mark ? ', the highlight in yellow' : '') + ', their pen and highlighter marks on the page (they stay, so some are from earlier)' + (ink ? ', what they just drew outlined by a dashed box marked NEW' : '') + ', and your earlier notes as cards in handwriting. Small details may differ from the real screen; the exact text in view is here:');
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
The reader writes to you by hand or by keyboard in a notebook of ruled pages, then pauses; you answer on the same paper, in handwriting. The notebook keeps everything: their ink, their typed notes and your replies stay where they are, page after page, so they can read the conversation back. Your job is to think with them, not to lecture or test them. They read to understand deeply, not to memorise: never quiz them.
- Take up exactly what they wrote: build on the idea, sharpen it, connect it to the page, to what is on their screen or to what is already in the notebook, or point out gently where it goes wrong and why.
- At most one question back, and only when it would genuinely move their thinking forward. Often no question is better.
- Short: usually 1 to 4 sentences, plain words, like a note written in the margin; a typed question may get a fuller answer, still a few short paragraphs at most. No lists, headings, bold or code fences: it is handwriting.
- If their handwriting is unclear, say what you read and ask if that is right.
- Where to write: you get an image of the notebook page with free spots outlined in green and lettered, and a list of them with the room each has; N is the top of the next blank page. Choose like a person sharing a notebook: right below or beside what they just wrote, so the reply reads as an answer to it; a spot beside it for a short remark; another free stretch of the page when that keeps it close; N when the page is crowded, or the reply is long or has a sketch. Keep the reply within the room of the spot you choose.
- If your reply is about one particular mark on the notebook page other than what they just wrote (something earlier on the page, a part of a drawing, one of your earlier notes), you may add <point>x,y</point> right after </read>: the coordinates of that mark in the notebook image, read off its ruler; an arrow is drawn from your reply to it. Use it rarely, only when the link would otherwise be unclear.
- They also write on the page itself, with pens of several colours and a highlighter: circles, arrows, underlines, highlights, notes in the margin, a sketch for you to finish. Those marks stay on the page, as do your replies to them, which appear as small sticky notes beside the marks. When they have just marked the page, the new marks are outlined NEW on the screen image; answer about exactly what they marked, keeping in mind the note is small. There is no <at> or <point> then. Their older marks and your older notes on the screen are context: earlier thinking you can build on.
Output format, always: in the notebook first <at>the letter of the spot you choose</at>; then <read>exactly what they wrote, transcribed (handwriting and typed text; describe any sketch or mark of theirs, and what it points at, in a few words in brackets)</read>; then, in the notebook and only if needed, <point>x,y</point>; then your reply as plain text.`;
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
    try {
      const r = indexedDB.open('kbDiary', 2);
      r.onupgradeneeded = () => { const d = r.result;
        if (!d.objectStoreNames.contains('entries')) d.createObjectStore('entries', {keyPath:'id', autoIncrement:true}).createIndex('page', 'page');
        if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', {keyPath:'page'}) };
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch(e) { res(null) }
  });
  const tx = async (m, f, name) => { const d = await db; if (!d) return null; name = name || 'entries'; return new Promise(res => { try { const t = d.transaction(name, m), s = t.objectStore(name); const r = f(s); t.oncomplete = () => res(r && r.result); t.onerror = () => res(null) } catch(e) { res(null) } }) };
  tx('readonly', s => s.index('page').getAll(PAGE_ID)).then(r => { if (r) entries = r.sort((a, b) => a.t - b.t) });
  const save = e => { entries.push(e); tx('readwrite', s => s.add(e)).then(id => { if (id != null) e.id = id }) };

  // ---- ink: a stroke is {p:[[x, y, pressure]...], c:colour (null: the ink colour of the page or theme), w:width, h:highlighter}; on a
  // notebook page in paper units (its canvas is lw units wide, scaled on screen) ----
  function seg(c, a, b, w){ c.lineWidth = w * (0.45 + 0.85 * ((a[2] + b[2]) / 2)); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke() }
  function drawStroke(c, s, def){
    const p = s.p, w = s.w || 2.6; if (!p || !p.length) return;
    c.save(); c.strokeStyle = c.fillStyle = s.c || def; c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.h) { c.globalAlpha = 0.35; c.lineWidth = w; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p) c.lineTo(q[0], q[1]); if (p.length === 1) c.lineTo(p[0][0] + 0.1, p[0][1]); c.stroke() }   // one path: an even wash
    else if (p.length === 1) { c.beginPath(); c.arc(p[0][0], p[0][1], w * (0.45 + 0.85 * p[0][2]) / 2, 0, 7); c.fill() }
    else for (let i = 1; i < p.length; i++) seg(c, p[i - 1], p[i], w);
    c.restore();
  }
  const asStroke = s => Array.isArray(s) ? {p:s, c:null, w:2.6} : s;   // notebooks saved before strokes had colours
  function Ink(cv, opt){
    const g = cv.getContext('2d', {desynchronized:true}) || cv.getContext('2d');   // low-latency canvas where the browser offers it
    const o = {cv, strokes:[], cur:null, dpr:1, k:1}, off = () => opt.off ? opt.off() : [0, 0];
    const setT = () => { const [ox, oy] = off(); g.setTransform(o.dpr, 0, 0, o.dpr, -ox * o.dpr, -oy * o.dpr) };
    o.redraw = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); setT(); const d = opt.color(); for (const s of o.strokes) drawStroke(g, s, d) };
    o.size = () => { const r = cv.getBoundingClientRect(); if (r.width < 2) return; const d = window.devicePixelRatio || 1; o.k = opt.lw ? r.width / opt.lw : 1; o.dpr = d * o.k; cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d)); o.redraw() };
    o.busy = () => !!o.cur;
    // drop the stroke being drawn (a second finger came down: the reader is scrolling, not writing)
    o.cancel = () => { const c = o.cur; if (!c) return; o.cur = null; if (c.s) { const i = o.strokes.indexOf(c.s); if (i >= 0) o.strokes.splice(i, 1); if (opt.cancelled) opt.cancelled(c.s) } o.redraw() };
    new ResizeObserver(o.size).observe(cv);
    // iPadOS Scribble (handwriting into text fields) watches Pencil touches and holds back a stroke that starts soon after the last one
    // (WebKit bug 217430); cancelling the touch events on the canvas keeps every touch for the drawing (the fix Excalidraw shipped, #4705)
    for (const t of ['touchstart', 'touchmove', 'touchend']) cv.addEventListener(t, e => { if (e.cancelable) e.preventDefault() }, {passive:false});
    let penUp = 0;
    const pt = (e, r) => { const [ox, oy] = off(); return [(e.clientX - r.left) / o.k + ox, (e.clientY - r.top) / o.k + oy, e.pointerType === 'pen' ? (e.pressure || 0.05) : 0.5] };
    cv.addEventListener('pointerdown', e => {
      if (o.cur || e.button > 0 || (opt.block && opt.block())) return;   // one stroke at a time: a second finger or the palm during a stroke does not draw
      // fingers draw too; only a large contact (a resting palm) or a touch while the pen was just writing is ignored
      if (e.pointerType === 'touch' && (Math.max(e.width || 0, e.height || 0) > 44 || performance.now() - penUp < 400)) return;
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const r = cv.getBoundingClientRect();
      if (opt.texter && opt.texter()) { opt.textAt(pt(e, r), e); return }
      if (opt.eraser && opt.eraser()) { o.cur = {id:e.pointerId, r, er:true}; opt.erase(pt(e, r)); return }
      opt.down(); const st = Object.assign({p:[pt(e, r)]}, opt.style()); o.cur = {id:e.pointerId, r, s:st, p:st.p}; o.strokes.push(st); if (opt.start) opt.start(st); setT(); drawStroke(g, st, opt.color());
    });
    cv.addEventListener('pointermove', e => {
      if (!o.cur || e.pointerId !== o.cur.id) return; e.preventDefault();
      if (o.cur.er) { opt.erase(pt(e, o.cur.r)); return }
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const st = o.cur.s; let moved = false;
      g.save(); g.strokeStyle = g.fillStyle = st.c || opt.color(); g.lineCap = 'round';
      for (const x of (evs.length ? evs : [e])) { const p = pt(x, o.cur.r), q = o.cur.p[o.cur.p.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6) continue; o.cur.p.push(p); moved = true; if (!st.h) seg(g, q, p, st.w) }
      g.restore(); if (st.h && moved) o.redraw();   // a highlighter stroke is redrawn whole, so it stays one even wash
    });
    const up = e => { if (!o.cur || e.pointerId !== o.cur.id) return; if (e.pointerType === 'pen') penUp = performance.now(); const er = o.cur.er; o.cur = null; if (er) { if (opt.erased) opt.erased() } else opt.up() };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return o;
  }

  // the reader's new ink as a PNG: cropped to the strokes, black on white, longest side at most 1280 px
  function snapshot(ss){
    if (!ss.length) return null;
    let {x0, y0, x1, y1} = bbox(ss);
    const pad = 16; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const w = x1 - x0, h = y1 - y0, k = Math.min(2, 1280 / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    for (const s of ss) drawStroke(g, s, '#111');
    return c.toDataURL('image/png');
  }
  const bbox = ss => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of ss) for (const p of (s.p || s)) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]) } return {x0, y0, x1, y1} };
  // a small JPEG for the History view: the whole image, or the part around a box (screen coordinates, image scale k)
  function thumb(src, box, k){ return new Promise(res => { const i = new Image(); i.onload = () => {
    let sx = 0, sy = 0, sw = i.width, sh = i.height;
    if (box) { const pad = 160; sx = Math.max(0, (box.x0 - pad) * k); sy = Math.max(0, (box.y0 - pad) * k); sw = Math.min(i.width - sx, (box.x1 - box.x0 + 2 * pad) * k); sh = Math.min(i.height - sy, (box.y1 - box.y0 + 2 * pad) * k) }
    const s = Math.min(1, 480 / sw, 220 / sh), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(i, sx, sy, sw, sh, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7)) }; i.onerror = () => res(null); i.src = src }) }

  // ---- the notebook: fixed-size pages one under another, kept in this browser (IndexedDB 'books'). Everything stays on the paper:
  // the reader's ink, their typed notes, Claude's replies and its arrows. Coordinates are paper units: a page is 800 x 1130, ruled
  // every 40; it is scaled to the window's width. There is always one blank page at the end. ----
  const PW = 800, PH = 1130, LH = 40, MX = 36, TOP = 42, BOT = 1096;
  let book = [], pgs = [], scale = 1, inkColor = '#222', gest = null, gestEnd = 0, loaded = false, jumped = false, marks = [], notes = [];
  const pend = [], undoStack = [], elOf = new Map();   // strokes Claude has not read yet, and every stroke for Undo ({pg, s}); item -> element
  const drop = (a, s) => { const k = a.findIndex(x => x === s || (x && (x.s === s || x.m === s))); if (k >= 0) a.splice(k, 1) };
  const r1 = v => Math.round(v * 10) / 10;
  let saveT = 0;
  const saveBook = () => { clearTimeout(saveT); saveT = setTimeout(() => tx('readwrite', s => s.put({page:PAGE_ID, t:Date.now(), pages:book.map(p => ({ink:p.ink.map(roundS), items:p.items})), marks:marks.map(m => Object.assign({}, m, {p:m.p.map(rq)})), notes}), 'books'), 400) };
  const rq = q => [r1(q[0]), r1(q[1]), Math.round(q[2] * 100) / 100], roundS = s => ({p:s.p.map(rq), c:s.c || null, w:s.w, h:!!s.h, t:s.t});
  // how wide a typed note's text really is (its box runs to the margin)
  function measureW(it){ const e = elOf.get(it); if (!e) return it.w; const rg = document.createRange(); rg.selectNodeContents(e); const base = e.getBoundingClientRect(), k = base.width / it.w || 1; let r = 0; for (const q of rg.getClientRects()) r = Math.max(r, (q.right - base.left) / k); return Math.max(40, r) }
  const blank = p => !p.ink.length && !p.items.length;

  function mountPage(i){
    const data = book[i], outer = el('div', {class:'kd-pg'}), inner = el('div', {class:'kd-pgi'}), items = el('div', {class:'kd-its'});
    const c = el('canvas', {'aria-label':'Notebook page ' + (i + 1) + ': write with a pen, a finger or the mouse; scroll with two fingers'});
    inner.append(c, items, el('span', {class:'kd-no'}, String(i + 1))); outer.appendChild(inner); book$.appendChild(outer);
    const ink = Ink(c, {lw:PW, color:() => inkColor, style:curStyle,
      texter:() => tool === 'text', textAt:(p, e) => typeAt(i, p, e),
      block:() => tool === 'hand' || !!gest || performance.now() < gestEnd || pgs.some(p => p.ink.busy()),
      eraser:() => tool === 'erase', erase:p => eraseAt(i, p), erased:() => { saveBook(); renderOn() },
      down:() => { clearTimeout(NB.timer); stat.textContent = ''; if (ed) finishEd() }, start:s => { s.t = Date.now(); pend.push({pg:i, s}); undoStack.push({pg:i, s}); syncBar() },
      cancelled:s => { drop(pend, s); drop(undoStack, s) }, up:() => { saveBook(); grow(); arm(NB) }});
    ink.strokes = data.ink;
    const pg = {data, outer, inner, ink, items}; pgs[i] = pg;
    for (const it of data.items) items.appendChild(itemEl(it));
    sizePage(pg); return pg;
  }
  function addPage(){ book.push({ink:[], items:[]}); mountPage(book.length - 1); return book.length - 1 }
  function grow(){ if (!book.length || !blank(book[book.length - 1])) addPage() }   // keep one blank page at the end
  function sizePage(p){ Object.assign(p.outer.style, {width:PW * scale + 'px', height:PH * scale + 'px'}); p.inner.style.transform = 'scale(' + scale + ')'; p.ink.size() }
  let layT = 0;
  function layoutBook(){
    inkColor = getComputedStyle(P).color || '#222';
    const w = scr.clientWidth; if (w < 50) return;
    scale = Math.min(1.15, (w - 20) / PW); for (const p of pgs) sizePage(p);
    if (loaded && !jumped) { jumped = true; jumpLatest() }
  }
  new ResizeObserver(() => { cancelAnimationFrame(layT); layT = requestAnimationFrame(() => { if (!nbView.hidden) layoutBook() }) }).observe(scr);
  tx('readonly', s => s.get(PAGE_ID), 'books').then(r => {
    book = r && Array.isArray(r.pages) ? r.pages.filter(p => p && Array.isArray(p.ink) && Array.isArray(p.items)) : [];
    for (const p of book) p.ink = p.ink.map(asStroke);
    book.forEach((_, i) => mountPage(i)); grow(); loaded = true; if (!P.hidden && !nbView.hidden) layoutBook();
    marks = r && Array.isArray(r.marks) ? r.marks.filter(m => m && Array.isArray(m.p)) : []; notes = r && Array.isArray(r.notes) ? r.notes.filter(n => n && typeof n.text === 'string') : [];
    placeMarks();
  });

  // ---- what is on a page: the reader's typed notes and Claude's replies (text, sketches) and arrows ----
  function styleItem(e, it){ if (it.kind === 'reply' && it.fs && it.fs !== 1) { e.style.fontSize = 30 * it.fs + 'px'; e.style.lineHeight = 40 * it.fs + 'px' } }
  const arrowD = a => {
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1, cx = (a.x1 + a.x2) / 2 - dy * 0.15, cy = (a.y1 + a.y2) / 2 + dx * 0.15;
    const hx = a.x2 - cx, hy = a.y2 - cy, hl = Math.hypot(hx, hy) || 1, ux = hx / hl, uy = hy / hl, h = 15, f = v => Math.round(v);
    return `M${f(a.x1)} ${f(a.y1)} Q${f(cx)} ${f(cy)} ${f(a.x2)} ${f(a.y2)} M${f(a.x2 - h * ux - h * 0.55 * uy)} ${f(a.y2 - h * uy + h * 0.55 * ux)} L${f(a.x2)} ${f(a.y2)} L${f(a.x2 - h * ux + h * 0.55 * uy)} ${f(a.y2 - h * uy - h * 0.55 * ux)}`;
  };
  function itemEl(it){
    let e;
    if (it.kind === 'arrow') {
      e = document.createElementNS(NS, 'svg'); e.setAttribute('class', 'kd-it kd-arrow'); e.setAttribute('viewBox', `0 0 ${PW} ${PH}`); e.setAttribute('aria-hidden', 'true');
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', arrowD(it)); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2.6'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); e.appendChild(p);
    } else {
      e = el('div', {class:'kd-it kb-ink kd-' + it.kind}); Object.assign(e.style, {left:it.x + 'px', top:it.y + 'px', width:it.w + 'px'}); styleItem(e, it);
      if (it.kind === 'typed') { e.textContent = it.text; if (it.c) e.style.color = it.c }
      else for (const x of replyPieces(it.text || '')) { if (typeof x === 'string') e.appendChild(document.createTextNode(x)); else { const b = sketch(x.svg); if (b) e.appendChild(b) } }
    }
    elOf.set(it, e); return e;
  }
  function addItem(i, it){ book[i].items.push(it); const e = itemEl(it); pgs[i].items.appendChild(e); return e }
  function removeItem(i, it){ drop(book[i].items, it); const e = elOf.get(it); if (e) e.remove(); elOf.delete(it) }

  // ---- the eraser: a whole stroke, a typed note, a reply or an arrow at a time ----
  const dseg = (p, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy; let t = L ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy) };
  const nearStroke = (s, p, r) => s.length === 1 ? Math.hypot(p[0] - s[0][0], p[1] - s[0][1]) < r : s.some((q, j) => j > 0 && dseg(p, s[j - 1], q) < r);
  function eraseAt(i, p){
    const d = book[i]; let hit = false;
    for (let k = d.ink.length - 1; k >= 0; k--) { const s = d.ink[k]; if (nearStroke(s.p, p, 12 + (s.h ? s.w / 2 : 0))) { d.ink.splice(k, 1); drop(pend, s); drop(undoStack, s); hit = true } }
    for (const it of d.items.slice()) {
      const on = it.kind === 'arrow' ? dseg(p, [it.x1, it.y1], [it.x2, it.y2]) < 12 : p[0] >= it.x && p[0] <= it.x + it.w && p[1] >= it.y && p[1] <= it.y + (it.h || LH);
      if (on) { removeItem(i, it); hit = true }
    }
    if (hit) pgs[i].ink.redraw();
  }
  function renderOn(){ if (!pend.length && !NB.out.typed()) { clearTimeout(NB.timer); stat.textContent = '' } }

  // ---- typing on the paper: with the Text tool, a tap opens a line where it lands (an earlier typed note there opens for editing).
  // The text becomes a typed note on the page when the box closes: Enter (sends at once), Esc, a tap elsewhere, or Claude reading it ----
  let ed = null;
  const pendTyped = [];   // typed notes Claude has not read yet ({pg, it})
  function typeAt(i, p, e){
    if (ed) finishEd();
    const d = book[i], old = d.items.find(it => it.kind === 'typed' && p[0] >= it.x - 4 && p[0] <= it.x + it.w && p[1] >= it.y - 4 && p[1] <= it.y + (it.h || LH));
    let x, y, w, text = '';
    if (old) { ({x, y, w, text} = old); drop(pendTyped, old); removeItem(i, old) }
    else { x = Math.max(MX, Math.min(p[0] - 4, PW - MX - 160)); y = rowAt(p[1]); w = PW - MX - x }
    const t = el('textarea', {class:'kd-ed', rows:'1', spellcheck:'true', 'aria-label':'Type in the notebook'});
    t.value = text; Object.assign(t.style, {left:x + 'px', top:y + 'px', width:w + 'px'});
    const c = old ? old.c : color || null; if (c) t.style.color = c;
    pgs[i].items.appendChild(t); ed = {pg:i, x, y, w, c, ta:t, t0:old ? old.t : Date.now()};
    const fit = () => { t.style.height = 'auto'; t.style.height = Math.max(LH, Math.ceil(t.scrollHeight / LH) * LH) + 'px' }; fit();
    t.addEventListener('input', () => { fit(); clearTimeout(NB.timer); syncBar(); arm(NB) });
    t.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); commit(NB) } else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finishEd() } });
    t.addEventListener('blur', () => setTimeout(() => { if (ed && ed.ta === t && document.activeElement !== t) finishEd() }, 150));
    t.addEventListener('pointerdown', ev => ev.stopPropagation());
    // the keyboard only comes up for a focus made while handling the tap itself, so focus on the pointer's release (and now, for a mouse)
    const go = () => { try { t.focus({preventScroll:true}); t.setSelectionRange(t.value.length, t.value.length) } catch(err) {} };
    if (e.pointerType === 'mouse') setTimeout(go, 0); else { const c = pgs[i].ink.cv, up = () => { c.removeEventListener('pointerup', up); c.removeEventListener('touchend', up); go() }; c.addEventListener('pointerup', up); c.addEventListener('touchend', up) }
  }
  // close the open line: what was typed becomes a typed note (nothing typed: it just goes)
  function finishEd(){
    const E = ed; if (!E) return; ed = null; const text = E.ta.value.replace(/\s+$/, ''); E.ta.remove();
    if (text.trim()) {
      const it = {kind:'typed', x:E.x, y:E.y, w:E.w, text, c:E.c, t:E.t0}, e = addItem(E.pg, it); it.h = e.offsetHeight || LH;
      pendTyped.push({pg:E.pg, it}); grow(); saveBook();
    }
    syncBar(); if (!pend.length && !pendTyped.length) renderOn();
  }

  // ---- two fingers scroll the notebook (one finger, the pen and the mouse write); a fling keeps it moving for a moment ----
  const midY = e => { let y = 0; for (const t of e.touches) y += t.clientY; return y / e.touches.length };
  let fling = 0;
  scr.addEventListener('touchstart', e => {
    if (e.touches.length < 2) return; cancelAnimationFrame(fling);
    for (const p of pgs) p.ink.cancel();
    const y = midY(e); gest = {y, ly:y, top:scr.scrollTop, t:performance.now(), v:0};
  }, {passive:false});
  scr.addEventListener('touchmove', e => {
    if (!gest || e.touches.length < 2) return; if (e.cancelable) e.preventDefault();
    const y = midY(e), now = performance.now(), dt = Math.max(8, now - gest.t);
    gest.v = 0.7 * ((y - gest.ly) / dt) + 0.3 * gest.v; gest.t = now; gest.ly = y; scr.scrollTop = gest.top - (y - gest.y);
  }, {passive:false});
  const endGest = e => {
    if (!gest || e.touches.length >= 2) return;
    let v = performance.now() - gest.t < 80 ? Math.max(-50, Math.min(50, gest.v * 16)) : 0; gest = null; gestEnd = performance.now() + 350;
    const step = () => { if (Math.abs(v) < 0.4) return; scr.scrollTop -= v; v *= 0.94; fling = requestAnimationFrame(step) }; fling = requestAnimationFrame(step);
  };
  scr.addEventListener('touchend', endGest); scr.addEventListener('touchcancel', endGest);

  // ---- where things are on a page and where there is room ----
  function obstacles(i, skip){
    const d = book[i], o = [];
    for (const s of d.ink) { const b = bbox([s]); o.push([b.x0 - 8, b.y0 - 8, b.x1 + 8, b.y1 + 8]) }
    for (const it of d.items) if (it !== skip && it.kind !== 'arrow') o.push([it.x - 6, it.y - 4, it.x + it.w + 6, it.y + (it.h || LH) + 4]);
    return o;
  }
  const clearOf = (o, x0, y0, x1, y1) => !o.some(r => r[0] < x1 && r[2] > x0 && r[1] < y1 && r[3] > y0);
  const rowAt = v => Math.max(TOP, Math.floor((v - 2) / LH) * LH + 2), rowBelow = v => Math.max(TOP, Math.ceil((v - 2) / LH) * LH + 2);
  const freeDown = (o, x0, x1, y) => { let h = 0; while (y + h + LH <= BOT && clearOf(o, x0, y + h, x1, y + h + LH)) h += LH; return h };
  const lastBottom = i => obstacles(i).reduce((m, r) => Math.max(m, r[3]), 0);
  function nextBlank(i){ for (let k = i + 1; k < book.length; k++) if (blank(book[k])) return k; return addPage() }
  // the free spots offered to Claude for a reply to what is in box A on page i: just below it, beside it, the biggest other free
  // stretch of the page, and the top of the next blank page (N)
  function findSlots(i, A){
    const o = obstacles(i), out = [], L = MX, R = PW - MX;
    // slots are alternatives (only one is used), so they may touch; one that mostly repeats an earlier one is left out
    const ov = (q, x0, x1, y, h) => Math.max(0, Math.min(q.x + q.w, x1) - Math.max(q.x, x0)) * Math.max(0, Math.min(q.y + q.h, y + h) - Math.max(q.y, y));
    const add = (where, x0, x1, y, h) => { if (h >= 2 * LH && x1 - x0 >= 220 && !out.some(q => ov(q, x0, x1, y, h) > 0.5 * Math.min(q.w * q.h, (x1 - x0) * h))) out.push({pg:i, where, x:x0, y, w:x1 - x0, h}) };
    if (A) {
      // beside it: the room to its right or left, down to a line below it
      const yr = rowAt(A.y0), xr = Math.ceil(A.x1 + 24), xl = Math.floor(A.x0 - 24), hb = Math.max(2 * LH, rowBelow(A.y1 + 6) - yr + LH);
      if (R - xr >= 220) add('beside it, to the right', xr, R, yr, Math.min(hb, freeDown(o, xr, R, yr)));
      if (xl - L >= 220) add('beside it, to the left', L, xl, yr, Math.min(hb, freeDown(o, L, xl, yr)));
      for (let y = rowBelow(A.y1 + 6); y + 2 * LH <= BOT; y += LH) { const h = freeDown(o, L, R, y); if (h >= 2 * LH) { add(y - A.y1 < 3 * LH ? 'just below what they wrote' : 'further down, below what they wrote', L, R, y, Math.min(h, 10 * LH)); break } }
    }
    let best = null; for (let y = TOP; y + 2 * LH <= BOT;) { const h = freeDown(o, L, R, y); if (h >= 2 * LH && (!best || h > best.h)) best = {y, h}; y += Math.max(LH, h) }
    if (best) add(A ? 'elsewhere on this page' : 'on this page', L, R, best.y, best.h);
    out.forEach((q, k) => q.key = 'ABCDEFG'[k]);
    out.push({pg:-1, key:'N', where:'the top of the next blank page', x:L, y:TOP, w:R - L, h:BOT - TOP});
    return out;
  }
  const room = q => q.key === 'N' ? 'room for a long reply or a sketch' : 'room for about ' + Math.max(3, Math.round(q.h / LH * q.w / 13 / 6)) + ' words' + (q.h >= 6 * LH && q.w >= 400 ? ' or a small sketch' : '');
  function pageInView(){
    const v = scr.getBoundingClientRect(); let best = 0, bi = 0;
    pgs.forEach((p, i) => { const r = p.outer.getBoundingClientRect(), s = Math.min(r.bottom, v.bottom) - Math.max(r.top, v.top); if (s > best) { best = s; bi = i } });
    return bi;
  }
  function see(i, y0, y1){   // scroll so paper rows y0..y1 of page i are in view, if they are not
    const p = pgs[i]; if (!p) return; const top = p.outer.offsetTop + y0 * scale, bot = p.outer.offsetTop + (y1 == null ? y0 + 3 * LH : y1) * scale;
    if (top < scr.scrollTop + 10 || bot > scr.scrollTop + scr.clientHeight - 30) scr.scrollTo({top:Math.max(0, Math.min(top - 40, bot - scr.clientHeight + 60)), behavior:'smooth'});
  }
  function jumpLatest(){
    for (let i = book.length - 1; i >= 0; i--) if (!blank(book[i])) { const b = lastBottom(i); scr.scrollTop = Math.max(0, pgs[i].outer.offsetTop + b * scale - scr.clientHeight * 0.6); return }
  }

  // ---- the page Claude sees: the notebook page drawn at 800 x 1130 with a coordinate ruler, the reader's earlier ink in black and
  // the new ink in blue, Claude's replies in brown (word by word where the page lays them out), the free spots in green ----
  async function pageImage(i, slots, nb){
    const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, PW, PH); g.strokeStyle = '#e1e5ec'; g.lineWidth = 1;
    for (let y = LH; y < PH; y += LH) { g.beginPath(); g.moveTo(0, y - 0.5); g.lineTo(PW, y - 0.5); g.stroke() }
    g.fillStyle = '#8a8f98'; g.font = '11px sans-serif';
    for (let x = 100; x < PW; x += 100) { g.fillText(String(x), x - 9, 11); g.fillRect(x, 13, 1, 5) }
    for (let y = 100; y < PH; y += 100) { g.fillText(String(y), 2, y + 4) }
    const d = book[i];
    for (const s of d.ink) drawStroke(g, s, '#222');
    if (nb) { const b = nb; g.save(); g.setLineDash([6, 5]); g.strokeStyle = '#1453c8'; g.lineWidth = 2; g.strokeRect(b.x0 - 10, b.y0 - 10, b.x1 - b.x0 + 20, b.y1 - b.y0 + 20); g.fillStyle = '#1453c8'; g.font = 'bold 12px sans-serif'; g.fillText('NEW', b.x0 - 9, b.y0 - 14); g.restore() }
    const base = pgs[i].inner.getBoundingClientRect(), k = base.width / PW, rg = document.createRange();
    for (const it of d.items) {
      const e = elOf.get(it); if (!e) continue; const col = it.kind === 'typed' ? '#222' : '#a0522d';
      if (it.kind === 'arrow') { g.strokeStyle = col; g.lineWidth = 2.6; g.lineCap = 'round'; g.stroke(new Path2D(arrowD(it))); continue }
      const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, {acceptNode: t => t.parentElement.closest('svg') ? 2 : 1});
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        const cs = getComputedStyle(t.parentElement); g.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; g.fillStyle = col;
        const re = /\S+/g; let m;
        while ((m = re.exec(t.nodeValue))) { rg.setStart(t, m.index); rg.setEnd(t, m.index + m[0].length); const q = rg.getBoundingClientRect(); if (!q.width) continue; g.fillText(m[0], (q.left - base.left) / k, (q.bottom - base.top) / k - q.height / k * 0.24, q.width / k + 2) }
      }
      for (const sv of e.querySelectorAll('svg')) {
        const r = sv.getBoundingClientRect(); if (r.width < 4) continue;
        const w = r.width / k, h = r.height / k, im = await svgImage(sv, {width:w, height:h}); if (!im) continue;
        const t = document.createElement('canvas'); t.width = Math.ceil(w); t.height = Math.ceil(h); const tg = t.getContext('2d');   // in brown, like the rest of the reply
        tg.drawImage(im, 0, 0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, t.width, t.height);
        g.drawImage(t, (r.left - base.left) / k, (r.top - base.top) / k);
      }
    }
    g.setLineDash([9, 6]); g.lineWidth = 2.5; g.strokeStyle = '#0a8f3c';
    for (const q of slots) if (q.pg === i) {
      g.strokeRect(q.x + 2, q.y + 2, q.w - 4, q.h - 4); g.setLineDash([]); g.fillStyle = '#0a8f3c';
      g.beginPath(); g.arc(q.x + 20, q.y + 20, 15, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 19px sans-serif'; g.textAlign = 'center'; g.fillText(q.key, q.x + 20, q.y + 27); g.textAlign = 'start'; g.setLineDash([9, 6]);
    }
    return c.toDataURL('image/png');
  }

  // ---- a writing session: the notebook, or the page itself. Ink and typing collect; 3 s after the last stroke or key
  // press they are sent with the screen and the reply writes itself: in the notebook at the spot Claude picks, on the page in a card ----
  function Session(out){ return {out, timer:0, busy:false, queued:null} }
  // 3 s after the last stroke or key press, when Claude is on; with Claude off the marks wait for Send
  function arm(S){
    clearTimeout(S.timer); syncBar();
    if (!(S === NB ? pend.length : pendPage.length) && !S.out.typed()) { if (S === NB) renderOn(); return }
    if (!claudeOn()) return;
    const typing = S === NB && ed && document.activeElement === ed.ta, wait = typing ? 6000 : PAUSE;
    S.out.status(typing ? 'Reading 6 s after you stop typing (Enter sends now)…' : 'Reading in 3 s…'); S.timer = setTimeout(() => commit(S), wait);
  }
  const needKey = S => { if (store.get('key')) return false; S.out.status('Add your Claude API key in Settings (the gear on the toolbar).'); open('set'); return true };
  async function commit(S){
    clearTimeout(S.timer);
    if (S === NB) return commitNote();
    if (!pendPage.length || needKey(S)) return;
    const ms = pendPage.splice(0), used = hl; hl = null; showHl(); syncBar();
    S.out.status('Looking…');
    const job = {kind:'page', typed:'', hl:used, marks:ms, box:viewBox(ms), near:nearText(ms), scr:await screenBlocks(false, ms, used)};
    if (S.busy) { S.queued = job; S.out.status('Will read after this reply…'); return }
    send(S, job);
  }
  // the notebook: the new strokes and typed notes on the page where the latest of them is
  async function commitNote(){
    finishEd();
    if (!pend.length && !pendTyped.length) return;
    if (needKey(NB)) return;
    const got = pend.splice(0), tys = pendTyped.splice(0), last = [...got.map(x => ({pg:x.pg, t:x.s.t || 0})), ...tys.map(x => ({pg:x.pg, t:x.it.t}))].sort((a, b) => a.t - b.t).pop();
    const pg = last ? last.pg : pageInView(), ss = got.filter(x => x.pg === pg).map(x => x.s), ts = tys.filter(x => x.pg === pg).map(x => x.it);
    let A = ss.length ? bbox(ss) : null;
    for (const it of ts) { const tb = {x0:it.x, y0:it.y, x1:it.x + Math.min(it.w, measureW(it)), y1:it.y + (it.h || LH)}; A = A ? {x0:Math.min(A.x0, tb.x0), y0:Math.min(A.y0, tb.y0), x1:Math.max(A.x1, tb.x1), y1:Math.max(A.y1, tb.y1)} : tb }
    const typed = tys.map(x => x.it.text).join('\n');
    const used = hl; hl = null; showHl(); syncBar();
    stat.textContent = 'Looking…';
    const job = {kind:'note', typed, hl:used, pg, A, fresh:ss, img:snapshot(ss), scr:await screenBlocks(P.classList.contains('kb-full'), null, used)};
    if (NB.busy) { NB.queued = job; stat.textContent = 'Will read after this reply…'; return }
    send(NB, job);
  }
  function noteHistory(){
    const h = [];
    for (const e of entries.slice(-KEEP)) h.push({role:'user', content:(e.kind === 'page' ? '(earlier they drew on the page' + (e.where ? ', at ' + e.where : '') + '; their marks:) ' : '(earlier in the notebook' + (e.nbPage ? ', page ' + e.nbPage : '') + ', they wrote:) ') + (e.read || e.typed || '')}, {role:'assistant', content:e.reply || '…'});
    return h;
  }
  async function send(S, job){
    S.busy = true; let reply = null, rawNow = '';
    const content = [];
    if (job.kind === 'note') {
      job.slots = findSlots(job.pg, job.A);
      try { job.nb = await pageImage(job.pg, job.slots, job.A) } catch(e) { job.nb = null }
      if (job.img) content.push({type:'text', text:'What they just wrote, close up:'}, {type:'image', source:{type:'base64', media_type:'image/png', data:job.img.split(',')[1]}});
      if (job.nb) content.push({type:'text', text:'Their notebook, page ' + (job.pg + 1) + ', as it is now (800 x 1130; the ruler on the edges gives coordinates): their ink in the colours they chose (a wide translucent stroke is a highlighter), what they just wrote outlined by a dashed blue box marked NEW, typed notes in black print, your earlier replies and arrows in brown, and the free spots for your reply outlined in green and lettered.'}, {type:'image', source:{type:'base64', media_type:'image/png', data:job.nb.split(',')[1]}});
    }
    content.push(...job.scr.blocks);
    content.push({type:'text', text:job.kind === 'page'
      ? job.typed ? 'They selected a passage on the page (its text is in <highlight> above; it is now highlighted in yellow and outlined NEW on the screen image) and asked about it:\n<question>\n' + job.typed + '\n</question>\nAnswer that question about that passage, in a note that will sit beside it. No <at> or <point> here.'
      : 'They drew on the page itself, over what is on their screen: their new marks are in the dashed box marked NEW on the screen image' + (job.scr.img ? '' : ' (the screen image could not be made, so you only have the text in view)') + '. ' + (job.near ? 'They are on or beside this part of the page:\n<near>\n' + job.near + '\n</near>\n' : '') + 'Read what they wrote or marked (a circle, an arrow, an underline, a highlight, a note in the margin, a sketch) and answer about exactly that, in a note that will sit beside their marks. No <at> or <point> here.'
      : (job.img ? 'What they just wrote by hand is in the NEW box on the notebook page and close up in the first image.' : 'They wrote nothing by hand this time.') + (job.typed ? '\nThey typed this on the page (it is in the NEW box too):\n' + job.typed : '') +
        '\nFree spots for your reply:\n' + job.slots.map(q => q.key + ': ' + q.where + ', ' + room(q)).join('\n') + '\nStart with <at>letter</at>.'});
    let shown = 0, queue = [], drip = 0, hold = 0, stopped = false;
    const replyPart = raw => { const i = raw.indexOf('</read>'); const r = i >= 0 ? raw.slice(i + 7) : (/^\s*<(read|at)/.test(raw) || raw.length < 6 ? '' : raw); return r.replace(/<point>[\s\S]*?<\/point>/g, '').replace(/<at>[\s\S]*?<\/at>/g, '').replace(/^\s+/, '') };
    const target = () => reply || (reply = S.out.place(job, (rawNow.match(/<at>\s*([A-Z])\s*<\/at>/i) || [])[1]));
    const pump = () => { if (drip) return; drip = setInterval(() => {
      if (performance.now() < hold) return;
      if (!queue.length) { clearInterval(drip); drip = 0; return }
      const w = queue.shift(), R = target();
      if (typeof w === 'string') R.appendChild(el('span', null, esc(w)));
      else { const b = sketch(w.svg); if (b) { R.appendChild(b); hold = performance.now() + inkIn(b) } }
      S.out.follow(job);
    }, 70) };
    const words = t => queue.push(...(t.match(/\S+\s*|\s+/g) || []));
    // newly streamed reply text goes into the queue: whole words, and each sketch only once its </svg> has arrived
    const feed = (raw, end) => {
      rawNow = raw; if (end) stopped = true;
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
    const drained = () => new Promise(res => { const w = () => (queue.length || drip) ? setTimeout(w, 80) : res(); w() });
    try {
      S.out.status('Reading…');
      const r = await stream(SYS_NOTE, noteHistory().concat([{role:'user', content}]), 'low', 4000, (raw, end) => { if (!end) S.out.status('Writing…'); feed(raw, end) });
      const m2 = r.raw.match(/<read>([\s\S]*?)<\/read>/), text = replyPart(r.raw).trim();
      await drained();
      if (!text) { if (S.out.empty) S.out.empty(job, reply); else target().innerHTML = '<span class="kb-err">' + (r.stop === 'refusal' ? 'Claude declined to answer this one.' : 'No reply.') + '</span>' }
      else if (S.out.done) S.out.done(job, text, r.raw);
      S.out.status(!text && r.stop === 'refusal' ? 'Claude declined to answer this one. ' + costLine(r) : costLine(r));
      const img = job.kind === 'page' ? (job.scr.img ? await thumb(job.scr.img, job.box, job.scr.k) : null) : (job.img ? await thumb(job.img) : null);
      save({page:PAGE_ID, t:Date.now(), kind:job.kind, where:job.scr.note, nbPage:job.kind === 'note' ? (job.at ? job.at.pg : job.pg) + 1 : null, typed:job.typed, read:m2 ? m2[1].trim() : '', reply:text, img});
    } catch(e) {
      await drained();
      const msg = String(e.message || e);
      if (S.out.fail) S.out.fail(job, reply, msg); else { target().innerHTML = '<span class="kb-err" style="font:14px/1.5 system-ui,sans-serif">' + esc(msg) + '</span>'; S.out.status('') }
    } finally {
      S.busy = false;
      if (S.queued) { const j = S.queued; S.queued = null; send(S, j) }
    }
  }

  // the notebook's side of a reply: placed at the spot Claude chose; written smaller when it outgrows the spot, moved to the next blank
  // page if it still does not fit; an arrow from it to the point it names
  const NB = Session({kind:'note', status:s => { stat.textContent = s }, typed:() => (ed && ed.ta.value.trim()) || (pendTyped.length ? 'typed' : ''),
    place(job, key){
      const q = job.slots.find(s => s.key === (key || '').toUpperCase()) || job.slots[0], pg = q.pg < 0 ? nextBlank(job.pg) : q.pg;
      const it = {kind:'reply', x:q.x, y:q.y, w:q.w, text:'', t:Date.now()}, e = addItem(pg, it);
      job.at = {pg, it, e, q}; grow(); see(pg, q.y); return e;
    },
    follow(job){
      const {it, e, q, pg} = job.at;
      while (e.offsetHeight > q.h && (it.fs || 1) > 0.72) { it.fs = Math.round(((it.fs || 1) - 0.04) * 100) / 100; styleItem(e, it) }
      see(pg, it.y + e.offsetHeight - 2 * LH, it.y + e.offsetHeight);
    },
    done(job, text, raw){
      const a = job.at; if (!a) return; const {it, e} = a; it.text = text; it.h = e.offsetHeight;
      if (it.y + it.h > BOT + 24 || !clearOf(obstacles(a.pg, it), it.x, it.y, it.x + it.w, it.y + it.h)) {   // still does not fit: a fresh page
        removeItem(a.pg, it); a.pg = nextBlank(a.pg); Object.assign(it, {x:MX, y:TOP, w:PW - 2 * MX, fs:1}); delete it.fs;
        a.e = addItem(a.pg, it); it.h = a.e.offsetHeight; grow(); see(a.pg, TOP);
      } else {
        const m = raw.match(/<point>\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*<\/point>/);
        if (m && a.pg === job.pg) arrowTo(a, +m[1], +m[2]);
      }
      saveBook();
    },
    empty(job, reply){ if (job.at) removeItem(job.at.pg, job.at.it) },
    fail(job, reply, msg){ if (job.at && !job.at.e.textContent.trim()) removeItem(job.at.pg, job.at.it); else if (job.at) { job.at.it.text = job.at.e.textContent; job.at.it.h = job.at.e.offsetHeight; saveBook() } stat.innerHTML = '<span class="kb-err">' + esc(msg) + '</span>' }});
  // an arrow from the reply's text (the nearest point of the box its words fill) to a point on the page
  function arrowTo(a, tx, ty){
    if (!(tx >= 0 && ty >= 0 && tx <= PW && ty <= PH)) return;
    const base = pgs[a.pg].inner.getBoundingClientRect(), k = base.width / PW, rg = document.createRange(); rg.selectNodeContents(a.e);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of rg.getClientRects()) { if (!q.width) continue; x0 = Math.min(x0, (q.left - base.left) / k); y0 = Math.min(y0, (q.top - base.top) / k); x1 = Math.max(x1, (q.right - base.left) / k); y1 = Math.max(y1, (q.bottom - base.top) / k) }
    if (x0 > x1) return;
    const sx = Math.max(x0, Math.min(tx, x1)), sy = Math.max(y0, Math.min(ty, y1)), L = Math.hypot(tx - sx, ty - sy); if (L < 36) return;
    const ux = (tx - sx) / L, uy = (ty - sy) / L, it = {kind:'arrow', x1:sx + ux * 8, y1:sy + uy * 8, x2:tx - ux * 10, y2:ty - uy * 10, t:Date.now()};
    inkIn(addItem(a.pg, it));
  }

  // ================= Ink on the page itself =================
  // With a pen or the highlighter chosen, the Apple Pencil and the mouse write on the page; fingers keep scrolling and working the
  // page. Marks stay (saved with the notebook) and are pinned to the element they were drawn on (its child-index path from the page
  // root, the offset and the element's width then), so they follow reflow, resizing, rotation and tabs (a mark in a hidden tab is
  // hidden). They are paths in one SVG layer laid over the document, so they scroll with the page natively. Claude's replies to
  // them are sticky notes beside the marks, pinned the same way; a note can be folded to a dot, moved by its header, or deleted.
  const pendPage = [], markEl = new Map(), noteEl = new Map(), anchors = new Map();
  const marksSvg = document.createElementNS(NS, 'svg'); marksSvg.id = 'kbMarks'; marksSvg.setAttribute('aria-hidden', 'true');
  const notesBox = el('div', {id:'kbNotes'});
  document.body.append(marksSvg, notesBox);
  const pathOf = e => { const root = pageRoot(), out = []; while (e && e !== root) { const p = e.parentElement; if (!p) return ''; out.unshift([...p.children].indexOf(e)); e = p } return e === root ? out.join('.') : '' };
  function anchorEl(key){
    let e = anchors.get(key); if (e && e.isConnected) return e;
    e = pageRoot(); if (key) for (const i of key.split('.')) { e = e && e.children[+i]; if (!e) break }
    if (e) anchors.set(key, e); return e || null;
  }
  // the element a mark belongs to: what is under its centre, widened to a block (a paragraph, a list item, a figure, a whole svg)
  function anchorFor(cx, cy){
    let e = document.elementFromPoint(cx, cy); const root = pageRoot();
    if (!e || e.closest(OURS) || !root.contains(e)) return root;
    let s = e.closest('svg'); while (s && s.parentElement && s.parentElement.closest('svg')) s = s.parentElement.closest('svg'); if (s) e = s;
    while (e !== root && e.parentElement) { const r = e.getBoundingClientRect(); if (!/^inline/.test(getComputedStyle(e).display) && r.height >= 18 && r.width >= 40) break; e = e.parentElement }
    return e;
  }
  // where a pinned thing's element is now (viewport), and its scale since it was pinned; null while it is hidden (another tab)
  function frameOf(x){ const e = anchorEl(x.a); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width && !r.height) return null; return {x:r.left, y:r.top, s:x.aw ? r.width / x.aw : 1, e} }
  const pathD = p => p.length === 1 ? `M${p[0][0]} ${p[0][1]}h0.1` : 'M' + p.map(q => q[0] + ' ' + q[1]).join('L');
  const markW = m => m.h ? m.w : m.w * (0.55 + 0.75 * (m.p.reduce((a, q) => a + q[2], 0) / m.p.length));
  function styleMark(g, m){
    g.setAttribute('fill', 'none'); g.setAttribute('stroke', m.c || 'currentColor'); g.setAttribute('stroke-width', markW(m).toFixed(2));
    g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round'); if (m.h) g.setAttribute('stroke-opacity', '0.35');
  }
  function markNode(m){ const g = document.createElementNS(NS, 'path'); styleMark(g, m); g.setAttribute('d', pathD(m.p)); marksSvg.appendChild(g); markEl.set(m, g); return g }
  function placeMarks(){
    const o = marksSvg.getBoundingClientRect(), seen = new Map();
    for (const m of marks) {
      const g = markEl.get(m) || markNode(m), k = m.a + '|' + m.aw; if (!seen.has(k)) seen.set(k, frameOf(m)); const f = seen.get(k);
      if (!f) { g.style.display = 'none'; continue }
      g.style.display = ''; g.setAttribute('transform', `translate(${(f.x - o.left).toFixed(1)} ${(f.y - o.top).toFixed(1)}) scale(${f.s.toFixed(4)})`);
    }
    const ob = notesBox.getBoundingClientRect(); for (const n of notes) placeNote(n, ob);
  }
  let placeT = 0;
  const schedule = () => { cancelAnimationFrame(placeT); placeT = requestAnimationFrame(placeMarks) };
  window.addEventListener('resize', schedule); new ResizeObserver(schedule).observe(document.body);
  document.addEventListener('click', () => setTimeout(schedule, 80));   // tabs, details, steppers
  setInterval(() => { if ((marks.length || notes.length) && !document.hidden) placeMarks() }, 1500);
  // the viewport box of some marks (null when none is in view), and the text of the element the first one is pinned to
  function viewBox(ms){
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const m of ms) { const f = frameOf(m); if (!f) continue; for (const q of m.p) { const x = f.x + q[0] * f.s, y = f.y + q[1] * f.s; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) } }
    return x0 > x1 ? null : {x0, y0, x1, y1};
  }
  // where the text of a block ends on the right (its lines can be much shorter than the box)
  function textRight(e){ const rg = document.createRange(); rg.selectNodeContents(e); let r = -1e9; for (const q of rg.getClientRects()) if (q.width) r = Math.max(r, q.right); return r > -1e9 ? r : e.getBoundingClientRect().right }
  function nearText(ms){ const e = ms.length && anchorEl(ms[0].a); if (!e || e === pageRoot()) return ''; const t = (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim(); return (where(e) ? '(' + where(e) + ') ' : '') + t.slice(0, 700) }
  // the marks (and the open notes) drawn into the screen image; the new marks outlined
  function paintMarks(g, fresh){
    const def = getComputedStyle(document.body).color || '#222';
    for (const m of marks) { const f = frameOf(m); if (!f) continue; g.save(); g.translate(f.x, f.y); g.scale(f.s, f.s); drawStroke(g, Object.assign({}, m, {w:markW(m), p:m.p.map(q => [q[0], q[1], 0.5])}), def); g.restore() }
    const rg = document.createRange();
    for (const [n, e] of noteEl) {
      if (e.hidden || n.fold) continue; const r = e.getBoundingClientRect(); if (!inV(r)) continue;
      g.save(); g.fillStyle = 'rgba(255,255,255,.92)'; g.strokeStyle = '#a0522d'; g.lineWidth = 1.5; g.beginPath(); if (g.roundRect) g.roundRect(r.left, r.top, r.width, r.height, 10); else g.rect(r.left, r.top, r.width, r.height); g.fill(); g.stroke();
      const body = e.querySelector('.kb-nb'), tw = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {acceptNode: t => t.parentElement.closest('svg') ? 2 : 1});
      g.fillStyle = '#a0522d';
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        const cs = getComputedStyle(t.parentElement); g.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const re = /\S+/g; let m;
        while ((m = re.exec(t.nodeValue))) { rg.setStart(t, m.index); rg.setEnd(t, m.index + m[0].length); const q = rg.getBoundingClientRect(); if (inV(q)) g.fillText(m[0], q.left, q.bottom - q.height * 0.24, q.width + 2) }
      }
      g.restore();
    }
    const b = fresh && fresh.length && viewBox(fresh);
    if (b) { g.save(); g.setLineDash([7, 5]); g.strokeStyle = '#1453c8'; g.lineWidth = 2; g.strokeRect(b.x0 - 12, b.y0 - 12, b.x1 - b.x0 + 24, b.y1 - b.y0 + 24); g.fillStyle = '#1453c8'; g.font = 'bold 12px sans-serif'; g.fillText('NEW', b.x0 - 11, b.y0 - 16); g.restore() }
  }

  // ---- drawing: pointer events from the pen and the mouse, caught before the page sees them ----
  let live = null, lastStroke = 0;
  const onPage = e => !(e.target && e.target.closest && e.target.closest(OURS_UI));
  document.addEventListener('pointerdown', e => {
    if (!penOn() || live || e.button > 0 || !(e.pointerType === 'pen' || e.pointerType === 'mouse') || !onPage(e)) return;
    e.preventDefault(); e.stopPropagation();
    if (tool === 'erase') { live = {id:e.pointerId, er:true}; erasePage(e.clientX, e.clientY); return }
    clearTimeout(PG.timer); PG.out.status('');
    const o = marksSvg.getBoundingClientRect(), m = Object.assign({p:[[r1(e.clientX - o.left), r1(e.clientY - o.top), e.pointerType === 'pen' ? (e.pressure || 0.3) : 0.5]]}, curStyle());
    live = {id:e.pointerId, m, o, g:document.createElementNS(NS, 'path')}; styleMark(live.g, m); live.g.setAttribute('d', pathD(m.p)); marksSvg.appendChild(live.g);
  }, true);
  document.addEventListener('pointermove', e => {
    if (!live || e.pointerId !== live.id) return; e.preventDefault(); e.stopPropagation();
    if (live.er) { erasePage(e.clientX, e.clientY); return }
    const m = live.m, o = live.o, evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const x of (evs.length ? evs : [e])) { const p = [r1(x.clientX - o.left), r1(x.clientY - o.top), x.pointerType === 'pen' ? (x.pressure || 0.3) : 0.5], q = m.p[m.p.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 0.8) m.p.push(p) }
    live.g.setAttribute('d', pathD(m.p));
  }, true);
  const endLive = e => {
    if (!live || e.pointerId !== live.id) return; e.stopPropagation(); const L = live; live = null; lastStroke = performance.now();
    if (L.er) { saveBook(); return }
    pin(L.m, L.o, L.g); pendPage.push(L.m); saveBook(); arm(PG);
  };
  // keep a mark drawn in layer coordinates (o: the layer's rect then), pinned to its element: points relative to the element's corner
  function pin(m, o, g){
    const b = bbox([m]), an = anchorFor(o.left + (b.x0 + b.x1) / 2, o.top + (b.y0 + b.y1) / 2), r = an.getBoundingClientRect();
    m.a = pathOf(an); m.aw = Math.round(r.width) || 1; const dx = r.left - o.left, dy = r.top - o.top;
    m.p = m.p.map(q => [r1(q[0] - dx), r1(q[1] - dy), Math.round(q[2] * 100) / 100]); m.t = Date.now();
    marks.push(m); if (g) { markEl.set(m, g); g.setAttribute('d', pathD(m.p)) } placeMarks(); undoStack.push({m});
  }

  // ---- select text on the page (Read or Text tool): a small box asks Claude about it; the passage is highlighted in yellow and the
  // answer comes as a note beside it, like a reply to a mark ----
  const pop = el('div', {id:'kbAskPop', hidden:'', role:'dialog', 'aria-label':'Ask Claude about the selection'}, '<input type="text" placeholder="Ask Claude about this…" enterkeyhint="send" aria-label="Your question"><button type="button">Ask</button>');
  document.body.appendChild(pop);
  const popIn = pop.querySelector('input');
  function showPop(){
    if (!hl || !hl.rects.length) return;
    const last = hl.rects[hl.rects.length - 1], first = hl.rects[0], w = Math.min(380, innerWidth - 16);
    let y = last.y - scrollY + last.h + 12; if (y + 50 > innerHeight) y = Math.max(8, first.y - scrollY - 58);
    const x = Math.max(8, Math.min(innerWidth - w - 8, last.x - scrollX + last.w / 2 - w / 2));
    Object.assign(pop.style, {left:x + 'px', top:y + 'px'}); pop.hidden = false;
  }
  function hidePop(){ pop.hidden = true; popIn.value = '' }
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target)) setTimeout(() => { if (document.activeElement !== popIn || !popIn.value.trim()) { const sel = getSelection(); if (!sel || sel.isCollapsed) hidePop() } }, 300) }, true);
  addEventListener('scroll', () => { if (!pop.hidden && !popIn.value.trim() && document.activeElement !== popIn && hl && hl.rects.length) { const q = hl.rects[hl.rects.length - 1]; const y = q.y - scrollY; if (y < -40 || y > innerHeight + 40) hidePop(); else showPop() } }, {passive:true});
  const ask = () => { const q = popIn.value.trim(); if (q) askSel(q) };
  pop.querySelector('button').addEventListener('click', ask);
  popIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask() } else if (e.key === 'Escape') hidePop() });
  async function askSel(q){
    const h = hl; if (!h) return; hidePop(); try { getSelection().removeAllRanges() } catch(e) {} hl = null; showHl();
    if (needKey(PG)) return;
    // the selection's lines as highlighter strokes, one per line, pinned like any mark
    const o = marksSvg.getBoundingClientRect(), lines = [];
    for (const q of h.rects) { const L = lines.find(l => Math.abs(l.y - q.y) < 4 && Math.abs(l.h - q.h) < 6); if (L) { L.x0 = Math.min(L.x0, q.x); L.x1 = Math.max(L.x1, q.x + q.w) } else lines.push({x0:q.x, x1:q.x + q.w, y:q.y, h:q.h}) }
    const ms = lines.map(l => { const y = l.y - scrollY - o.top + l.h / 2, hw = l.h * 0.9; const m = {p:[[r1(l.x0 - scrollX - o.left + hw / 2), r1(y), 0.5], [r1(l.x1 - scrollX - o.left - hw / 2), r1(y), 0.5]], c:'#f5c400', w:hw, h:true}; pin(m, o, null); return m });
    saveBook(); syncBar();
    PG.out.status('Looking…');
    const job = {kind:'page', typed:q, hl:h, marks:ms, box:viewBox(ms), near:nearText(ms), scr:await screenBlocks(false, ms, h)};
    if (PG.busy) { PG.queued = job; PG.out.status('Will read after this reply…'); return }
    send(PG, job);
  }
  document.addEventListener('pointerup', endLive, true); document.addEventListener('pointercancel', endLive, true);
  // a pen tap or a mouse stroke must not also click what is under it
  document.addEventListener('click', e => { if (performance.now() - lastStroke < 400 && onPage(e)) { e.preventDefault(); e.stopPropagation() } }, true);
  // the Pencil must not scroll the page, select text or start Scribble while a pen is chosen; fingers still scroll
  for (const t of ['touchstart', 'touchmove']) document.addEventListener(t, e => {
    if (penOn() && e.cancelable && onPage(e) && [...e.changedTouches].some(x => x.touchType === 'stylus')) e.preventDefault();
  }, {passive:false, capture:true});
  function erasePage(cx, cy){
    let hit = false;
    for (const m of marks.slice()) { const f = frameOf(m); if (!f) continue; if (nearStroke(m.p, [(cx - f.x) / f.s, (cy - f.y) / f.s], (12 + markW(m) / 2) / f.s)) { removeMark(m); hit = true } }
    if (hit) syncBar();
  }
  function removeMark(m){ drop(marks, m); drop(pendPage, m); drop(undoStack, m); const g = markEl.get(m); if (g) g.remove(); markEl.delete(m) }
  // Undo: the last mark made anywhere, on the page or in the notebook
  function undo(){
    const u = undoStack.pop(); if (!u) return;
    if (u.m) { removeMark(u.m); if (!pendPage.length) { clearTimeout(PG.timer); PG.out.status('') } }
    else if (book[u.pg]) { drop(book[u.pg].ink, u.s); drop(pend, u.s); pgs[u.pg].ink.redraw(); pend.length || NB.out.typed() ? arm(NB) : renderOn() }
    saveBook(); syncBar();
  }

  // ---- Claude's notes on the page ----
  function noteNode(n){
    const e = el('div', {class:'kb-note' + (n.fold ? ' kb-folded' : ''), role:'note', 'aria-label':"Claude's note"}, '<div class="kb-nh"><b>Claude</b><span class="kb-sp"></span><button type="button" data-n="fold" title="Fold to a dot" aria-label="Fold">&#x2013;</button><button type="button" data-n="del" title="Delete this note" aria-label="Delete">&#x2715;</button></div><div class="kb-nb kb-ink"></div><button type="button" class="kb-dot" data-n="open" title="Open Claude\'s note" aria-label="Open Claude\'s note">C</button>');
    e.style.width = (n.w || 340) + 'px'; const body = e.querySelector('.kb-nb');
    if (n.q) body.before(el('div', {class:'kb-nq'}, 'You: ' + esc(n.q)));
    for (const x of replyPieces(n.text || '')) { if (typeof x === 'string') body.appendChild(document.createTextNode(x)); else { const b = sketch(x.svg); if (b) body.appendChild(b) } }
    e.addEventListener('click', ev => {
      const b = ev.target.closest('[data-n]'); if (!b) return; const a = b.dataset.n;
      if (a === 'fold' || a === 'open') { n.fold = a === 'fold'; e.classList.toggle('kb-folded', n.fold); saveBook() }
      else if (a === 'del') { drop(notes, n); e.remove(); noteEl.delete(n); saveBook() }
    });
    const h = e.querySelector('.kb-nh');
    h.addEventListener('pointerdown', ev => {
      if (ev.button > 0 || ev.target.closest('button')) return; ev.preventDefault(); h.setPointerCapture(ev.pointerId);
      const sx = ev.clientX, sy = ev.clientY, x0 = n.x, y0 = n.y, f = frameOf(n) || {s:1};
      const mv = q => { n.x = x0 + (q.clientX - sx) / f.s; n.y = y0 + (q.clientY - sy) / f.s; placeNote(n, notesBox.getBoundingClientRect()) };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); saveBook() };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    notesBox.appendChild(e); noteEl.set(n, e); return e;
  }
  function placeNote(n, ob){
    const e = noteEl.get(n) || noteNode(n), f = frameOf(n);
    if (!f) { e.hidden = true; return } e.hidden = false;
    e.style.left = (f.x - ob.left + n.x * f.s) + 'px'; e.style.top = (f.y - ob.top + n.y * f.s) + 'px';
  }
  // the page's side of a reply: a note beside the new marks (right, left, below or above, whichever has room), pinned to the element
  // the first of them is pinned to
  const PG = Session({kind:'page', status:s => toast(s, /¢/.test(s) ? 6000 : 0), typed:() => '',
    place(job){
      const b = job.box || {x0:innerWidth / 2 - 20, y0:innerHeight / 3, x1:innerWidth / 2 + 20, y1:innerHeight / 3 + 20}, W = innerWidth, H = innerHeight, w = Math.min(340, W - 24);
      // first choice: the empty margin beside the block the marks are on, so the note covers no text; then beside the marks; then below
      const m0 = job.marks[0], f0 = m0 && frameOf(m0), ar = f0 && f0.e !== pageRoot() ? textRight(f0.e) : null;
      let x, y = b.y0;
      if (ar != null && Math.max(ar + 14, b.x1 + 18) + w < W - 8) x = Math.max(ar + 14, b.x1 + 18);
      else if (b.x1 + 18 + w < W - 8) x = b.x1 + 18; else if (b.x0 - 18 - w > 8) x = b.x0 - 18 - w;
      else { x = Math.max(8, Math.min(b.x0, W - w - 8)); y = b.y1 + 14 < H - 160 ? b.y1 + 14 : Math.max(60, b.y0 - 220) }
      y = Math.max(8, Math.min(y, H - 140));
      // below any open note it would cover
      for (let k = 0; k < 12; k++) { const hit = [...noteEl.values()].find(e => { if (e.hidden || e.classList.contains('kb-folded')) return false; const r = e.getBoundingClientRect(); return r.left < x + w && r.right > x && r.top < y + 90 && r.bottom > y }); if (!hit) break; y = hit.getBoundingClientRect().bottom + 10 }
      const f = f0 || null, an = f ? m0 : {a:'', aw:0}, fr = f || frameOf({a:''}) || {x:0, y:0, s:1};
      const n = {a:an.a, aw:an.aw || Math.round(anchorEl('').getBoundingClientRect().width), x:Math.round((x - fr.x) / fr.s), y:Math.round((y - fr.y) / fr.s), w, text:'', q:job.typed || '', fold:false, t:Date.now()};
      notes.push(n); const e = noteNode(n); placeNote(n, notesBox.getBoundingClientRect()); job.note = {n, e}; return e.querySelector('.kb-nb');
    },
    follow(job){ const nb = job.note.e.querySelector('.kb-nb'); nb.scrollTop = nb.scrollHeight },
    done(job, text){ job.note.n.text = text; saveBook() },
    empty(job){ if (job.note) { drop(notes, job.note.n); job.note.e.remove(); noteEl.delete(job.note.n) } },
    fail(job, reply, msg){ if (job.note && !job.note.e.querySelector('.kb-nb').textContent.trim()) this.empty(job); else if (job.note) { job.note.n.text = job.note.e.querySelector('.kb-nb').textContent; saveBook() } toast(msg, 9000) }});

  function renderLog(){
    const used = book.filter(p => !blank(p)).length, wipe = '<button type="button" data-a="wipe">Delete all</button>';
    if (!entries.length) { log.innerHTML = '<p class="kb-hint">Nothing yet. Every exchange in the notebook and on the page is listed here, kept in this browser only.</p>' + (used ? '<div class="kb-row"><span class="kb-meta">The notebook has ' + used + ' written page' + (used > 1 ? 's' : '') + '.</span>' + wipe + '</div>' : ''); return }
    log.innerHTML = '<div class="kb-row" style="margin:0 0 6px"><span class="kb-meta">' + entries.length + ' exchange' + (entries.length > 1 ? 's' : '') + ' on this page of the knowledge base, kept in this browser.</span>' + wipe + '</div>' +
      entries.slice().reverse().map(e => '<div class="kd-e"><time>' + esc(new Date(e.t).toLocaleString()) + (e.nbPage ? ' · notebook page ' + e.nbPage : e.kind === 'page' ? ' · drawn on the page' : '') + (e.where ? ' · ' + esc(e.where) : '') + '</time>' + (e.img ? '<img alt="Your handwriting" src="' + e.img + '">' : '') +
        '<div class="kd-me">' + esc(e.read || e.typed || '') + '</div><div class="kd-cl" data-i="' + entries.indexOf(e) + '"></div></div>').join('');
    for (const c of log.querySelectorAll('.kd-cl')) for (const x of replyPieces(entries[+c.dataset.i].reply || '')) { if (typeof x === 'string') c.appendChild(document.createTextNode(x)); else { const b = sketch(x.svg); if (b) c.appendChild(b) } }
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
<p>The key is saved only in this browser. Each message sends this page's text, what you wrote, the screen as above (with your marks and Claude's notes on the page) and your recent exchanges from your browser straight to api.anthropic.com; your notebook and your marks on the page stay in this browser.</p>`;
    setv.querySelector('select').onchange = e => store.set('model', e.target.value);
    setv.querySelector('#kbBuddySee').onchange = e => mine.set('see', e.target.checked ? null : 'off');
    const inp = setv.querySelector('input'); if (!k) inp.focus();
  }
  setv.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'kbBuddyKey') { e.preventDefault(); setv.querySelector('[data-a=save]').click() } });
  P.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return; e.preventDefault();
    const act = a.dataset.a;
    if (act === 'close') close();
    else if (act === 'full') setFull(!P.classList.contains('kb-full'));
    else if (act === 'pages') { sub = sub === 'pages' ? null : 'pages'; show() }
    else if (act === 'set') { sub = sub === 'set' ? null : 'set'; show() }
    else if (act === 'back') { sub = null; show() }
    else if (act === 'save') { const v = setv.querySelector('#kbBuddyKey').value.trim(); if (v) store.set('key', v); sub = null; show() }
    else if (act === 'forget') { store.set('key', null); renderSet() }
    else if (act === 'unhl') { hl = null; showHl() }
    else if (act === 'end') { grow(); const p = pgs[pgs.length - 1]; scr.scrollTo({top:p.outer.offsetTop - 10, behavior:'smooth'}) }
    else if (act === 'send') commit(NB);
    else if (act === 'wipe') {
      if (!confirm('Delete the whole notebook, your marks and Claude\'s notes on this page of the knowledge base, and their history? This cannot be undone.')) return;
      for (const x of entries) if (x.id != null) await tx('readwrite', s => s.delete(x.id)); entries = []; renderLog();
      book = []; pgs = []; book$.innerHTML = ''; pend.length = 0; pendPage.length = 0; pendTyped.length = 0; ed = null; undoStack.length = 0; grow();
      marks = []; notes = []; marksSvg.innerHTML = ''; notesBox.innerHTML = ''; markEl.clear(); noteEl.clear(); saveBook(); syncBar();
    }
  });
  syncBar();
}
})();
