// ---- AI buddy: a toolbar of pens over the page, a notebook, and Claude reading both ----
// Pilot (2026-11-18/19) on the Attention Is All You Need page. Source of truth: html_utils/apply_buddy.py copies this file, as one marked
// script block (id kb-buddy), into the source part that closes the page's <head>; edit it here, rerun apply_buddy.py and rebuild.
// On a page that has it, it replaces the Ask Claude button (kb_ask.js stays on the page but its button is hidden).
// Toolbar: docked to an edge of the screen (top by default; drag its grip to any edge), or made small. Read (no pen), pen,
//   highlighter, eraser, Text (tap the notebook and type there; Enter sends), six colours, two widths, Undo, Claude on or off (on: Claude reads after a pause, 3 s unless Settings say otherwise; off: marks are just
//   notes, Send asks), the Notebook, Settings.
// On the page: with a pen chosen, the Apple Pencil and the mouse write (fingers still scroll and work the page). Marks stay, pinned to
//   the element they were drawn on, so they follow reflow and tabs. Claude's replies are sticky notes right by them (fold, move,
//   delete); a note is the thread about its marks: tap the marks to open it, ask a follow-up at its foot.
//   In Read, the page works as usual; selecting text opens a small Ask box: the passage is highlighted and the answer is a note beside it.
// Notebook: ruled pages one under another, full screen (clear of the toolbar) or floating. Write with the Pencil, a finger or the
//   mouse (two fingers scroll), or type; Claude gets the new ink close up and the whole notebook page with free spots lettered on
//   it, picks one (or a fresh page right after it) and its reply writes itself there in a handwriting face, with a small pen sketch when a
//   picture helps and an arrow to an earlier mark when that makes the link clear. Typing is the chat.
// Everything is kept in this browser (IndexedDB 'recs': one record per mark, note thread, notebook page, stroke, typed note or reply,
//   handwriting reading and History entry, each with an id, an updatedAt and a deleted marker), so it works offline. With a GitHub
//   token in Settings it syncs through the private repo khalit7/kb-notes: pages/<page path>.json per page plus settings.json (the
//   synced preferences); pushed about 10 s after a change and when the page is hidden, pulled on load and when the tab returns; merged
//   record by record, the newer wins; a save rejected because the file changed is re-read, merged and retried. The Claude key, the
//   token, the toolbar's and window's places, the current tool and History pictures stay on each device. The toolbar's cloud shows the
//   sync state (tap to sync now). Marks and notes keep the start of their element's text, so after a rebuild of the page they find
//   their place again; those that cannot are listed as unanchored in Marks.
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
  const API = 'https://api.anthropic.com/v1/messages', KEEP = 12, WAITS = [1, 2, 3, 5, 8, 12];
  const MODELS = {
    'claude-opus-5-5':   {name:'Claude Opus 5.5',   in:4, write:5, read:0.2, out:20},
    'claude-sonnet-5-5': {name:'Claude Sonnet 5.5', in:2, write:2.5, read:0.1, out:10}
  };
  const mem = {};
  // preferences that sync across devices (settings.json in the notes repo); everything else in localStorage stays on the device:
  // the Claude key, the GitHub token, the toolbar's place and size, the window's place, the current tool and colour
  const SYNCED = ['kbAsk.model', 'kbBuddy.wait', 'kbBuddy.claude', 'kbBuddy.see', 'kbBuddy.qsend', 'kbBuddy.scratch', 'kbBuddy.nudge', 'kbBuddy.prompts', 'kbBuddy.means'];
  const rawGet = k => { try { return localStorage.getItem(k) } catch(e) { return mem[k] || null } };
  const rawSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch(e) { mem[k] = v } };
  let onSettingChange = () => {};
  const ls = (pre) => ({
    get(k){ return rawGet(pre + k) },
    set(k, v){ rawSet(pre + k, v); if (SYNCED.includes(pre + k)) onSettingChange(pre + k) }
  });
  const store = ls('kbAsk.'), mine = ls('kbBuddy.');
  const PAGE_ID = location.pathname.replace(/index\.html$/, '');   // this page's key in the browser's storage
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
#kbBar [data-b=nudge]{min-width:26px;padding:0}
#kbBar .kb-glow{width:11px;height:11px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 0 var(--acc);animation:kbGlow 2.2s ease-out infinite}
@keyframes kbGlow{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--acc) 60%,transparent)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
#kbBar [data-b=sync]{position:relative}
#kbBar .kb-sdot{position:absolute;right:5px;bottom:5px;width:8px;height:8px;border-radius:50%;border:1.5px solid var(--card,var(--bg));background:var(--good,#2f9e44)}
#kbBar [data-b=sync][data-s=wait] .kb-sdot{background:#f59f00}
#kbBar [data-b=sync][data-s=busy] .kb-sdot{background:var(--acc);animation:kbGlow 1s ease-out infinite}
#kbBar [data-b=sync][data-s=offline] .kb-sdot{background:var(--mute)}
#kbBar [data-b=sync][data-s=error] .kb-sdot{background:#e03131}
#kbBar .kb-dash{stroke-dasharray:3 2.4}
#kbBar .kb-A{font:700 17px/1 Georgia,'Times New Roman',serif}
#kbAskPop{position:fixed;z-index:66;display:flex;flex-direction:column;gap:6px;width:min(380px,calc(100vw - 16px));padding:6px;background:var(--card,var(--bg));border:1px solid var(--line);border-left:4px solid #e0b400;border-radius:12px;box-shadow:var(--shadow,0 6px 22px rgba(0,0,0,.2))}
#kbAskPop[hidden]{display:none}
#kbAskPop .kb-pr{display:flex;gap:6px;align-items:center}
.kb-chips{display:flex;flex-wrap:wrap;gap:4px}
.kb-chips button{padding:2px 9px;border-radius:99px;border:1px solid var(--line);background:var(--soft);color:var(--ink);font:12px/1.6 system-ui,-apple-system,sans-serif;cursor:pointer}
.kb-chips button:hover{border-color:var(--acc)}
.kb-note .kb-chips{display:none;padding:0 8px 8px}
.kb-note:focus-within .kb-chips{display:flex}
.kb-selbar{position:absolute;display:flex;flex-direction:column;gap:5px;width:max-content;max-width:min(420px,calc(100vw - 24px));padding:6px;background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--line);border-left:4px solid var(--acc);border-radius:12px;box-shadow:var(--shadow,0 6px 22px rgba(0,0,0,.2));font:13px/1.4 system-ui,-apple-system,sans-serif;pointer-events:auto;z-index:5}
.kb-selbar .kb-pr{display:flex;gap:5px;align-items:center}
.kb-selbar input{flex:1;min-width:150px;font:inherit;font-size:14px;color:var(--ink);background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:5px 8px}
.kb-selbar button{padding:4px 10px;border-radius:8px;border:1px solid var(--line);background:var(--soft);color:var(--ink);font:inherit;cursor:pointer}
.kb-selbar button.kb-go{background:var(--acc);border-color:var(--acc);color:var(--card,var(--bg));font-weight:600}
.kb-selbox{position:absolute;border:1.5px dashed var(--acc);border-radius:6px;background:color-mix(in srgb,var(--acc) 6%,transparent);cursor:move;pointer-events:auto;touch-action:none}
.kb-selgrip{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border-radius:50%;background:var(--acc);border:2px solid var(--card,var(--bg));cursor:nwse-resize;touch-action:none}
#kbPsel{position:absolute;left:0;top:0;width:0;height:0;z-index:59}
.kb-cite{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 4px;margin:0 2px;vertical-align:.35em;border:0;border-radius:99px;background:color-mix(in srgb,var(--acc) 16%,transparent);color:var(--acc);font:700 10.5px/1 system-ui,-apple-system,sans-serif;cursor:pointer;pointer-events:auto}
.kb-cite:hover{background:var(--acc);color:var(--card,var(--bg))}
.kb-kbl{color:var(--acc);text-decoration:underline;text-decoration-style:dotted;pointer-events:auto}
.kb-cited{outline:3px solid var(--acc)!important;outline-offset:4px;border-radius:6px;transition:outline-color 2s ease}
#kbNib{position:fixed;z-index:80;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 0 1px rgba(255,255,255,.7)}
#kbNib[hidden]{display:none}
#kbAskPop input{flex:1;min-width:0;font:inherit;font-size:14.5px;color:var(--ink);background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:6px 9px}
#kbAskPop input:focus{outline:2px solid var(--acc);outline-offset:-1px}
#kbAskPop button{padding:5px 12px;border-radius:8px;background:var(--acc);border:1px solid var(--acc);color:var(--card,var(--bg));font-weight:600;font-size:13px;cursor:pointer}
.kb-note .kb-nq{font-size:12.5px;line-height:1.35;color:var(--mute);border-left:3px solid #e0b400;margin:6px 0 2px;padding-left:7px;font-family:system-ui,-apple-system,sans-serif}
.kb-note .kb-turn+.kb-turn{border-top:1px dashed var(--line);margin-top:6px;padding-top:2px}
.kb-note .kb-nf{display:flex;gap:4px;padding:4px 8px 8px}
.kb-note .kb-nf input{flex:1;min-width:0;font:13px/1.3 system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--soft);border:1px solid var(--line);border-radius:7px;padding:4px 8px}
.kb-note .kb-nf button{border:0;background:var(--acc);color:var(--card,var(--bg));border-radius:7px;padding:0 9px;font-weight:700;cursor:pointer}
.kb-note.kb-folded .kb-nf{display:none}
.kb-note.kb-flash{animation:kbFlash 1.2s ease-out}
.kb-note.kb-resolved .kb-dot{background:var(--good,#2f9e44)}
html.kb-narrow .kb-note:not(.kb-active){width:auto!important;border:0;background:transparent;box-shadow:none}
html.kb-narrow .kb-note:not(.kb-active)>:not(.kb-dot){display:none}
html.kb-narrow .kb-note:not(.kb-active) .kb-dot{display:flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:50% 50% 50% 4px;background:var(--acc);color:var(--card,var(--bg));border:0;font:700 15px/1 system-ui,sans-serif;cursor:pointer}
#kbMarks .kb-links path{fill:none;stroke:var(--acc);stroke-width:1.4;stroke-dasharray:3 4;opacity:.6}
#kbMarks path.kb-hot{stroke-opacity:.8}
#kbMarks rect.kb-hotr{fill:none;stroke:var(--acc);stroke-width:1.6;stroke-dasharray:4 4}
@keyframes kbFlash{0%{box-shadow:0 0 0 4px var(--acc)}100%{box-shadow:var(--shadow,0 6px 24px rgba(0,0,0,.2))}}
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
.kb-note.kb-folded .kb-dot{display:flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border-radius:50% 50% 50% 4px;background:var(--acc);color:var(--card,var(--bg));border:0;font:700 15px/1 system-ui,-apple-system,sans-serif;box-shadow:var(--shadow,0 3px 10px rgba(0,0,0,.25));cursor:pointer}
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
#kbBuddy .kd-scr{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;padding:10px 0 44px}
#kbBuddy .kd-book{display:flex;flex-direction:column;align-items:center;gap:14px;width:max-content;min-width:100%;transform-origin:0 0}
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
#kbBuddy .kd-fbar{padding:8px 12px;border-bottom:1px solid var(--line)}
#kbBuddy .kd-fbar input{width:100%;font:inherit;color:inherit;background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:6px 9px}
#kbBuddy .kd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
#kbBuddy .kd-th{cursor:pointer;text-align:center;font-size:12px;color:var(--mute)}
#kbBuddy .kd-th img{display:block;width:100%;aspect-ratio:800/1130;border:1px solid var(--line);border-radius:4px;background:#fff;margin-bottom:3px}
#kbBuddy .kd-th:hover img{border-color:var(--acc)}
#kbBuddy .kd-th span{display:block;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#kbBuddy .kd-hit{display:block;width:100%;text-align:left;padding:8px 10px;margin:0 0 6px;border:1px solid var(--line);border-radius:8px;background:var(--soft);color:var(--ink);font:inherit;font-size:13.5px;cursor:pointer}
#kbBuddy .kd-hit b{color:var(--mute);font-weight:600;font-size:12px;margin-right:6px}
#kbBuddy .kd-hit mark{background:#ffe066;color:inherit;border-radius:2px}
#kbBuddy .kd-ovf .kb-chips button[aria-pressed=true]{border-color:var(--acc);color:var(--acc)}
#kbBuddy .kd-ovf .kb-chips i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:0}
#kbBuddy .kd-ovi{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:9px 10px;margin:0 0 7px;border:1px solid var(--line);border-radius:10px;background:var(--card,var(--bg));color:var(--ink);font:inherit;cursor:pointer}
#kbBuddy .kd-ovi:hover{border-color:var(--acc)}
#kbBuddy a.kd-ovi{text-decoration:none}
#kbBuddy .kd-relh{margin:16px 0 8px;font-size:13px;color:var(--mute)}
#kbBuddy .kd-ovi>i{flex:none;width:12px;height:12px;border-radius:50%;margin-top:5px}
#kbBuddy .kd-ovi span{display:block;min-width:0}
#kbBuddy .kd-ovi b{font-size:13px}
#kbBuddy .kd-ovi small{display:block;color:var(--mute);font-size:11.5px}
#kbBuddy .kd-ovi q{display:block;font-size:13px;color:var(--ink);quotes:none;margin-top:2px;border-left:3px solid var(--line);padding-left:7px}
#kbBuddy .kd-ovi em{display:block;font-style:normal;font-size:12.5px;color:var(--mute);margin-top:3px}
#kbBuddy .kd-ovi em.kd-ova{font-family:${HAND};font-size:18px;color:var(--acc)}
#kbMarks rect.kb-flashr{fill:none;stroke:var(--acc);stroke-width:3;animation:kdFlash 1.6s ease-out forwards}
#kbBuddy .kd-flash{position:absolute;border:3px solid var(--acc);border-radius:8px;pointer-events:none;animation:kdFlash 1.6s ease-out forwards}
@keyframes kdFlash{0%{opacity:1}100%{opacity:0}}
#kbBuddy .kb-err,.kb-note .kb-err{color:var(--bad,#c2703a)}
#kbBuddy .kb-set label{display:block;font-weight:600;margin:10px 0 4px;font-size:13px}
#kbBuddy .kb-set label.kb-ck{display:flex;gap:8px;align-items:flex-start;font-weight:400}
#kbBuddy .kb-set label.kb-ck input{width:auto;margin-top:4px}
#kbBuddy .kb-set input,#kbBuddy .kb-set select{width:100%}
#kbBuddy .kb-set p{font-size:13px;color:var(--mute);margin:6px 0}
#kbBuddy .kb-means{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
#kbBuddy .kb-means span{display:flex;gap:6px;align-items:center}
#kbBuddy .kb-means i{flex:none;width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 1px var(--line)}
#kbBuddy .kb-means input{min-width:0}
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
  // what each colour means to the reader (Settings); Claude is told, the overview filters by it
  const MEAN0 = {'':'', '#e03131':'confusing', '#1c7ed6':'question', '#2f9e44':'got it', '#f59f00':'key idea', '#ae3ec9':'connection', '#f5c400':'asked about'};
  const means = () => { let m = {}; try { m = JSON.parse(mine.get('means') || '{}') } catch(e) {} return Object.assign({}, MEAN0, m) };
  const colName = c => (COLORS.find(x => x[0] === (c || '')) || [c, c === '#f5c400' ? 'Yellow' : 'Ink'])[1];
  // a line for Claude: what the colours in some strokes mean to the reader
  function colourNote(ss){
    const M = means(), seen = [...new Set(ss.map(x => x.c || ''))].filter(c => M[c]);
    return seen.length ? 'Their colours: ' + seen.map(c => colName(c).toLowerCase() + (ss.some(x => (x.c || '') === c && x.h) ? ' (highlighter)' : '') + ' means "' + M[c] + '"').join('; ') + '.' : '';
  }
  const bar = el('div', {id:'kbBar', role:'toolbar', 'aria-label':'Pens, notebook and Claude'},
    '<span class="kb-grip2" title="Drag to any edge of the screen" aria-hidden="true">&#x2807;&#x2807;</span>' +
    '<button type="button" data-t="hand" title="Read and use the page (no pen)" aria-label="Read">' + ic(ICON.hand) + '</button>' +
    '<button type="button" data-t="pen" title="Pen: the Apple Pencil or the mouse writes on the page (fingers still scroll); in the notebook a finger writes too" aria-label="Pen">' + ic(ICON.pen) + '</button>' +
    '<button type="button" data-t="hl" title="Highlighter" aria-label="Highlighter">' + ic(ICON.hl) + '</button>' +
    '<button type="button" data-t="erase" title="Eraser: touch a mark to remove it" aria-label="Eraser">' + ic(ICON.erase) + '</button>' +
    '<button type="button" data-t="lasso" title="Lasso: draw a loop round marks or part of the page or notebook to ask about it, move it, resize it (notebook) or delete it" aria-label="Lasso"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="kb-dash" d="M12 4.5c4.4 0 8 2.2 8 5s-3.6 5-8 5-8-2.2-8-5 3.6-5 8-5z"/><path d="M8 13.8c-.8 1.8-.6 3.6.6 5.2"/></svg></button>' +
    '<button type="button" data-t="text" title=""Text: tap anywhere in the notebook and type there (Enter sends, Shift+Enter is a new line)" aria-label="Text"><span class="kb-A">A</span></button>' +
    '<span class="kb-sep"></span><span class="kb-sws">' + COLORS.map(([c, n]) => '<button type="button" class="kb-sw" data-c="' + c + '" title="' + n + '" aria-label="' + n + '" style="--c:' + (c || 'var(--ink)') + '"></button>').join('') + '</span>' +
    '<button type="button" data-b="width" title="Line width: thin or thick" aria-label="Line width"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6"/></svg></button>' +
    '<button type="button" data-b="undo" title="Undo your last mark" aria-label="Undo">' + ic(ICON.undo) + '</button>' +
    '<span class="kb-sep"></span>' +
    '<button type="button" data-b="claude" title="">' + ic(ICON.claude) + '<span>Claude</span></button>' +
    '<button type="button" data-b="nudge" hidden aria-label="Claude has a thought on this section"><span class="kb-glow"></span></button>' +
    '<button type="button" data-b="send" title=""Send your new marks to Claude now" hidden>Send</button>' +
    '<button type="button" data-b="over" title="Overview: every mark and note on this page" aria-label="Overview"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg></button>' +
    '<button type="button" data-b="notebook" title=""Notebook: write or type to Claude" aria-label="Notebook">' + ic(ICON.book) + '</button>' +
    '<button type="button" data-b="sync" hidden aria-label="Sync"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/></svg><span class="kb-sdot"></span></button>' +
    '<button type="button" data-b="set" title=""Settings: key, model, what Claude sees" aria-label="Settings">' + ic(ICON.set) + '</button>' +
    '<button type="button" data-b="min" title="Make the toolbar small" aria-label="Make the toolbar small">&#x2013;</button>');
  const toastEl = el('div', {id:'kbToast', hidden:'', 'aria-live':'polite'});
  const P = el('div', {id:'kbBuddy', role:'dialog', 'aria-label':'Notebook', hidden:''});
  P.innerHTML = `<div class="kb-h"><b>Notebook</b><span class="kb-sp"></span><button type="button" data-a="zoom" title="Back to the page width" hidden>100%</button><button type="button" data-a="end" title="Go to the blank page at the end">New page</button><button type="button" data-a="marks" title="Overview: every mark, highlight and note on this page; tap one to go there">Marks</button><button type="button" data-a="find" title=""All pages at a glance, and search what you and Claude wrote">Pages</button><button type="button" data-a="pages" title="Every exchange as a list: the notebook and the page">History</button><button type="button" data-a="full" title="Fill the screen">Full</button><button type="button" data-a="set" title="Settings: key, model, what Claude sees" aria-label="Settings">&#x2699;</button><button type="button" data-a="close" title="Close (Esc)" aria-label="Close">&#x2715;</button></div>
<div class="kb-hl" hidden><span>Your highlight:</span><q></q><button type="button" data-a="unhl" title="Do not send this highlight" aria-label="Do not send this highlight">&#x2715;</button></div>
<div class="kb-view" data-v="notebook"><div class="kd-paper"><div class="kd-scr"><div class="kd-book"></div></div><div class="kd-st" aria-live="polite"></div></div></div>
<div class="kb-view" data-v="pages" hidden><div class="kb-scroll kd-log"></div></div>
<div class="kb-view" data-v="marks" hidden><div class="kd-fbar kd-ovf"></div><div class="kb-scroll kd-ov"></div></div>
<div class="kb-view" data-v="find" hidden><div class="kd-fbar"><input type="search" placeholder="Search your notebook: your writing, your notes and Claude's replies" aria-label="Search the notebook"></div><div class="kb-scroll kd-find"></div></div>
<div class="kb-view" data-v="set" hidden><div class="kb-scroll kb-set"></div></div>
<div class="kb-grip" title="Drag to resize"></div>`;
  document.body.append(bar, toastEl, P);
  const $ = s => P.querySelector(s);
  const head = $('.kb-h'), grip = $('.kb-grip'), hlBox = $('.kb-hl');
  const nbView = $('[data-v=notebook]'), pgView = $('[data-v=pages]'), stView = $('[data-v=set]');
  const stat = $('.kd-st'), scr = $('.kd-scr'), book$ = $('.kd-book');
  const ovView = $('[data-v=marks]'), ovList = $('.kd-ov'), ovBar = $('.kd-ovf');
  const log = $('.kd-log'), setv = $('.kb-set'), fdView = $('[data-v=find]'), fdList = $('.kd-find'), fdIn = fdView.querySelector('input');

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
    nbView.hidden = v !== 'notebook'; pgView.hidden = v !== 'pages'; stView.hidden = v !== 'set'; fdView.hidden = v !== 'find'; ovView.hidden = v !== 'marks';
    $('[data-a=marks]').classList.toggle('kb-on', sub === 'marks'); if (v === 'marks') renderOverview();
    $('[data-a=pages]').classList.toggle('kb-on', sub === 'pages'); $('[data-a=set]').classList.toggle('kb-on', sub === 'set'); $('[data-a=find]').classList.toggle('kb-on', sub === 'find');
    if (v === 'find') renderFind();
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (sel || psel) { clearSel(); clearPsel() } else if (!pop.hidden) hidePop(); else if (ed) finishEd(); else if (!P.hidden) close(); else if (tool !== 'hand') setTool('hand') } });

  // ---- the toolbar: tools, colours, width, undo, Claude on or off, the notebook, settings. It docks to an edge of the screen
  // (dragged by its grip; it snaps to the nearest edge, where it stays) and can be made small ----
  const WIDTHS = {pen:[2.6, 5], hl:[16, 28]};
  let tool = /^(hand|pen|hl|erase|text|lasso)$/.test(mine.get('tool')) ? mine.get('tool') : 'hand', color = mine.get('color') || '', thick = mine.get('thick') === '1';
  let dock = {e:'top', f:0.5}; try { const d = JSON.parse(mine.get('dock') || 'null'); if (d && /^(top|bottom|left|right)$/.test(d.e)) dock = {e:d.e, f:Math.max(0, Math.min(1, +d.f || 0.5))} } catch(e) {}
  const claudeOn = () => mine.get('claude') !== 'off';
  const qOn = () => mine.get('qsend') !== 'off', scratchOn = () => mine.get('scratch') !== 'off', nudgeOn = () => mine.get('nudge') !== 'off';
  // one-tap prompts beside every Ask box: "Label: prompt" per line; a prompt ending in "…" is put in the box to finish, not sent
  const PROMPTS0 = 'Intuition: Give me the intuition behind this, in plain words.\nExample: Walk me through a tiny worked example with real numbers.\nWhy it matters: What would break or change without this?\nSimpler: Explain this more simply.\nContrast: Contrast this with …';
  const prompts = () => (mine.get('prompts') || PROMPTS0).split('\n').map(l => { const i = l.indexOf(':'); return i > 0 ? {label:l.slice(0, i).trim(), text:l.slice(i + 1).trim()} : null }).filter(x => x && x.label && x.text).slice(0, 8);
  const chipsHtml = () => '<div class="kb-chips">' + prompts().map((x, i) => '<button type="button" data-q="' + i + '" title="' + esc(x.text) + '">' + esc(x.label) + '</button>').join('') + '</div>';
  // a chip: ask its prompt at once, or put an unfinished one ("…") in the box
  function chipClick(e, input, askFn){
    const b = e.target.closest('[data-q]'); if (!b) return false; e.preventDefault(); const x = prompts()[+b.dataset.q]; if (!x) return true;
    if (/…$|\.\.\.$/.test(x.text)) { input.value = x.text.replace(/\s*(…|\.\.\.)$/, ' '); input.focus() } else askFn(x.text);
    return true;
  }
  // how long after the last stroke Claude reads (Settings; 3 s by default); typing waits twice as long. "Never" is Claude off: Send only
  const waitS = () => { const v = parseFloat(mine.get('wait')); return WAITS.includes(v) ? v : 3 };
  const claudeTitle = () => 'Claude reads your writing ' + waitS() + ' s after you stop (on), or only when you tap Send (off); the wait is in Settings';
  const penOn = () => tool === 'pen' || tool === 'hl' || tool === 'erase' || tool === 'lasso';   // the tools that act on the page; Read and Text leave it alone
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
    const M = means(); for (const b of bar.querySelectorAll('[data-c]')) { b.setAttribute('aria-pressed', String(b.dataset.c === color)); const nm = colName(b.dataset.c) + (M[b.dataset.c] ? ': ' + M[b.dataset.c] : ''); b.title = nm; b.setAttribute('aria-label', nm) }
    const wb = bar.querySelector('[data-b=width] path'); wb.parentElement.style.strokeWidth = thick ? 4.2 : 1.9;
    const cb = bar.querySelector('[data-b=claude]'); cb.setAttribute('aria-pressed', String(claudeOn())); cb.title = claudeTitle();
    bar.querySelector('[data-b=send]').hidden = !(pendPage.length || pend.length || pendTyped.length || (ed && ed.ta.value.trim()));
    bar.querySelector('[data-b=send]').title = claudeOn() ? 'Send now instead of waiting' : 'Send your new marks to Claude';
    bar.querySelector('[data-b=notebook]').setAttribute('aria-pressed', String(!P.hidden));
    document.documentElement.classList.toggle('kb-pen', penOn());
    P.classList.toggle('kd-hand', tool === 'hand'); P.classList.toggle('kd-erasing', tool === 'erase'); P.classList.toggle('kd-texting', tool === 'text');
    if (penOn()) hidePop();
    placeBar();
  }
  function setTool(t){ tool = t; mine.set('tool', t); if (t !== 'lasso') { clearSel(); clearPsel() } syncBar() }
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) setTool(b.dataset.t === tool && tool !== 'hand' ? 'hand' : b.dataset.t);
    else if (b.dataset.c != null) { color = b.dataset.c; mine.set('color', color || null); if (tool === 'hand' || tool === 'erase') setTool('pen'); else syncBar() }
    else if (b.dataset.b === 'width') { thick = !thick; mine.set('thick', thick ? '1' : null); syncBar() }
    else if (b.dataset.b === 'undo') undo();
    else if (b.dataset.b === 'claude') { mine.set('claude', claudeOn() ? 'off' : null); toast(claudeOn() ? 'Claude is on: it reads your writing ' + waitS() + ' s after you stop.' : 'Claude is off: your marks are just notes; tap Send to ask.', 4000); if (claudeOn()) { arm(PG); arm(NB) } else { clearTimeout(PG.timer); clearTimeout(NB.timer); stat.textContent = '' } syncBar() }
    else if (b.dataset.b === 'send') { commit(PG); commit(NB) }
    else if (b.dataset.b === 'notebook') P.hidden ? open() : close();
    else if (b.dataset.b === 'set') open('set');
    else if (b.dataset.b === 'sync') { if (syncState === 'error' && /token|repository/.test(syncMsg)) open('set'); syncNow() }
    else if (b.dataset.b === 'nudge') takeNudge();
    else if (b.dataset.b === 'over') { if (!P.hidden && sub === 'marks') close(); else open('marks') }
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
  const OURS = '#kbBuddy,#kbBar,#kbToast,#kbMarks,#kbNotes,#kbPsel,#kbNib,#kbAskPop,#kbAsk,#kbAskBtn,#kbAskSel,#jsErr', OURS_UI = '#kbBuddy,#kbBar,#kbToast,#kbNotes,#kbPsel,#kbAskPop,#kbAsk,#kbAskBtn,#kbAskSel';
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
  // ---- the page as a citable document: one block per paragraph, heading, list item, caption or cell, in reading order, each with its
  // element (so a citation can jump there); text outside those is grouped by its nearest box; a block marks where each tab starts ----
  const CITE_SEL = 'h1,h2,h3,h4,h5,h6,p,li,figcaption,dt,dd,pre,blockquote,td,th,caption,summary';
  let DOCB = null;
  function docBlocks(){
    if (DOCB) return DOCB;
    const root = pageRoot(), own = new Map(), order = [], skip = OURS + ',script,style,svg,canvas,button,select,input,textarea,nav,template,noscript,[aria-hidden=true],[role=tablist]';
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: t => { const q = t.parentElement; return !q || !t.nodeValue.trim() || q.closest(skip) ? 2 : 1 }});
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      const q = t.parentElement, o = q.closest(CITE_SEL) || q.closest('div,section,figure,aside,header,footer,main,article,details') || root;
      if (!own.has(o)) { own.set(o, []); order.push(o) } own.get(o).push(t.nodeValue);
    }
    const content = [], els = []; let tab = undefined;
    for (const o of order) {
      const text = own.get(o).join('').replace(/\s+/g, ' ').trim(); if (!text) continue;
      const tb = o.closest('.tab'); if (tb !== tab) { tab = tb; if (tb) { content.push({type:'text', text:'=== Tab: ' + (tabName(tb) || tb.id) + ' ==='}); els.push(null) } }
      content.push({type:'text', text:(/^H[1-6]$/.test(o.tagName) ? '#'.repeat(+o.tagName[1]) + ' ' : '') + text}); els.push(o);
    }
    if (!content.length) { content.push({type:'text', text:document.title}); els.push(root) }
    return DOCB = {content, els};
  }
  // go to a cited block: its tab opened, scrolled to the middle of the screen, outlined for a moment
  function jumpBlock(i){
    const B = docBlocks(); let e = null; for (let k = i; k < B.els.length && !e; k++) e = B.els[k]; if (!e) return;
    if (!P.hidden && P.classList.contains('kb-full')) close();
    const tab = e.closest('.tab'); if (tab && !tab.getClientRects().length) { const t = document.querySelector('[role=tab][data-t="' + tab.id + '"]'); if (t) t.click() }
    setTimeout(() => { e.scrollIntoView({block:'center', behavior:'smooth'}); e.classList.remove('kb-cited'); void e.offsetWidth; e.classList.add('kb-cited'); setTimeout(() => e.classList.remove('kb-cited'), 2200) }, 120);
  }
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
  // reply text as HTML: a citation marker (⟦c12⟧, added where the API cited block 12) becomes a small numbered chip that jumps there;
  // [[Page title]] becomes a link to that page of the knowledge base
  function renderStr(str, box){
    let n = box ? box.querySelectorAll('.kb-cite').length : 0;
    return esc(str).replace(/⟦c(\d+)⟧/g, (_, i) => { const B = docBlocks(), t = (B.content[+i] || {}).text || ''; return '<button type="button" class="kb-cite" data-cb="' + i + '" title="' + esc(t.slice(0, 160)) + '">' + (++n) + '</button>' })
      .replace(/\[\[([^\]]{1,160})\]\]/g, (_, t) => { const u = kbUrl(t); return u ? '<a class="kb-kbl" href="' + esc(u) + '">' + t + '</a>' : '<u>' + t + '</u>' });
  }
  const txt = (str, box) => { const sp = el('span'); sp.innerHTML = renderStr(str, box); return sp };
  const noMarks = t => String(t || '').replace(/⟦[^⟧]*⟧/g, '');
  document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.kb-cite'); if (c) { e.preventDefault(); e.stopPropagation(); jumpBlock(+c.dataset.cb) } }, true);
  // a reply as pieces in order: text, and {svg} for each complete sketch (an unfinished one at the end is dropped)
  function replyPieces(text){
    const out = [], rx = /<svg[\s\S]*?<\/svg>/gi; let i = 0, m;
    while ((m = rx.exec(text))) { if (m.index > i) out.push(text.slice(i, m.index)); out.push({svg:m[0]}); i = rx.lastIndex }
    if (i < text.length) out.push(text.slice(i).replace(/<svg[\s\S]*$/i, ''));
    return out;
  }

  // ---- prompts ----
  const COMMON = `It sits beside one page of the reader's personal technical knowledge base (interactive explainer pages on AI/ML and systems). The page's full text is the document at the start of the conversation, one block per paragraph, heading, list item or caption; its figures and labs are not in it. Your answers are linked back to the page through the citations the API attaches when you draw on the document, so ground what you say in it. With each message you may also get what is on their screen right now: the tab and section in view, the text in view, the values of the controls in view (sliders, selects, steps), a passage they highlighted, and an image of the figures, animations (their current frame) and images in view at their screen positions. Use that to know exactly what they are looking at; refer to it naturally ("the heatmap on your screen", "step 3 of the animation"), and never describe the screen back to them unless asked.
- Use the page first; when you go beyond it, say so briefly. Never invent numbers or citations; if unsure, say so.
- The page is one of about 300 in their knowledge base. When the answer needs another page (a prerequisite, a related method, a comparison), use the tools: search_kb to find pages, read_kb_page to read one. Name a page you used as [[its exact title]]; it becomes a link. Do not search when this page is enough.
- Write maths in plain text with Unicode (softmax(QKᵀ/√d), ×, ², ᵀ), never LaTeX. Do not use em dashes.
- When a picture says it better than words (a shape, a matrix, an arrow diagram, a curve, a tensor's dimensions), you may draw one small sketch: <svg viewBox="0 0 W H">...</svg> with W at most 600, using only g, path, line, polyline, polygon, rect, circle, ellipse and text (and a marker in defs for arrowheads); it is drawn in pen, so no colours, styles, images or scripts; labels of a few words; at most about 40 shapes. Always write a sentence with it, and do not sketch when words are enough.`;
  const SYS_NOTE = `You are a thinking partner in the reader's notebook. ${COMMON}
The reader writes to you by hand or by keyboard in a notebook of ruled pages, then pauses; you answer on the same paper, in handwriting. The notebook keeps everything: their ink, their typed notes and your replies stay where they are, page after page, so they can read the conversation back. Your job is to think with them, not to lecture or test them. They read to understand deeply, not to memorise: never quiz them.
- Take up exactly what they wrote: build on the idea, sharpen it, connect it to the page, to what is on their screen or to what is already in the notebook, or point out gently where it goes wrong and why.
- At most one question back, and only when it would genuinely move their thinking forward. Often no question is better.
- Short: usually 1 to 4 sentences, plain words, like a note written in the margin; a typed question may get a fuller answer, still a few short paragraphs at most. No lists, headings, bold or code fences: it is handwriting.
- If their handwriting is unclear, say what you read and ask if that is right.
- Where to write: you get an image of the notebook page with free spots outlined in green and lettered, and a list of them with the room each has; N is the top of a fresh page put in right after this one. Choose like a person sharing a notebook: right below or beside what they just wrote, so the reply reads as an answer to it; a spot beside it for a short remark; another free stretch of the page when that keeps it close; N when the page is crowded, or the reply is long or has a sketch. Keep the reply within the room of the spot you choose.
- If your reply is about one particular mark on the notebook page other than what they just wrote (something earlier on the page, a part of a drawing, one of your earlier notes), you may add <point>x,y</point> right after </read>: the coordinates of that mark in the notebook image, read off its ruler; an arrow is drawn from your reply to it. Use it rarely, only when the link would otherwise be unclear.
- They also write on the page itself, with pens of several colours and a highlighter: circles, arrows, underlines, highlights, notes in the margin, a sketch for you to finish. Those marks stay on the page, as do your replies to them, which appear as small sticky notes beside the marks. When they have just marked the page, the new marks are outlined NEW on the screen image; answer about exactly what they marked, keeping in mind the note is small. There is no <at> or <point> then. Their older marks and your older notes on the screen are context: earlier thinking you can build on.
Output format, always: in the notebook first <at>the letter of the spot you choose</at>; then <read>exactly what they wrote, transcribed (handwriting and typed text; describe any sketch or mark of theirs, and what it points at, in a few words in brackets)</read>; then, in the notebook and only if needed, <point>x,y</point>; then your reply as plain text.`;
  // ---- one streamed request; onText gets the text so far ----
  const cents = (u, m) => { const p = MODELS[m]; if (!p || !u) return 0; return ((u.input_tokens || 0) * p.in + (u.cache_creation_input_tokens || 0) * p.write + (u.cache_read_input_tokens || 0) * p.read + (u.output_tokens || 0) * p.out) / 1e4 };
  let spent = 0;
  // the first user message starts with the page as a document (citations on, cached), so the cached prefix is the same every turn
  function withDoc(messages){
    const B = docBlocks(), doc = {type:'document', source:{type:'content', content:B.content}, title:document.title, context:'The knowledge-base page the reader is on, one block per paragraph, heading, list item or caption, in reading order; "=== Tab: name ===" blocks mark where each tab of the page starts.', citations:{enabled:true}, cache_control:{type:'ephemeral'}};
    const m0 = messages[0], c0 = typeof m0.content === 'string' ? [{type:'text', text:m0.content}] : m0.content;
    return [{role:'user', content:[doc].concat(c0)}].concat(messages.slice(1));
  }
  const TOOLS = [
    {name:'search_kb', description:'Search every page of the reader\'s knowledge base (about 300 explainer pages on AI/ML and systems) by words; returns the best matching pages with their path and a snippet. Use it when the answer needs another page.', input_schema:{type:'object', properties:{query:{type:'string', description:'A few key words'}}, required:['query']}},
    {name:'read_kb_page', description:'Read the text of one page of the knowledge base, by the path search_kb returned.', input_schema:{type:'object', properties:{path:{type:'string'}}, required:['path']}}
  ];
  async function stream(system, messages, effort, maxTokens, onText, signal){
    const m = model(), usage = {}; let raw = '', stop = null; const blocks = [];
    const res = await fetch(API, {method:'POST', signal, headers:{'content-type':'application/json', 'x-api-key':store.get('key'), 'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true', 'anthropic-beta':'server-side-fallback-2026-07-01'},
      body: JSON.stringify({model:m, max_tokens:maxTokens, stream:true, output_config:{effort}, fallbacks:'default',
        system:[{type:'text', text:system}], tools:TOOLS, messages:withDoc(messages)})});
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
        else if (d.type === 'content_block_start') { const b = d.content_block || {}; blocks[d.index] = {type:b.type, text:'', id:b.id, name:b.name, json:'', cites:[]} }
        else if (d.type === 'content_block_delta' && d.delta.type === 'text_delta') { raw += d.delta.text; if (blocks[d.index]) blocks[d.index].text += d.delta.text; else blocks[d.index] = {type:'text', text:d.delta.text, cites:[]}; onText(raw, false) }
        else if (d.type === 'content_block_delta' && d.delta.type === 'citations_delta') { const b = blocks[d.index]; if (b) b.cites.push(d.delta.citation) }
        else if (d.type === 'content_block_delta' && d.delta.type === 'input_json_delta') { const b = blocks[d.index]; if (b) b.json += d.delta.partial_json || '' }
        else if (d.type === 'content_block_stop') {   // a cited stretch of text ends: its chips go right after it
          const b = blocks[d.index], c = b && b.cites.filter(x => x.type === 'content_block_location' && x.document_index === 0);
          if (c && c.length) { raw += [...new Set(c.map(x => x.start_block_index))].map(i => '⟦c' + i + '⟧').join(''); onText(raw, false) }
        }
        else if (d.type === 'message_delta') { if (d.delta && d.delta.stop_reason) stop = d.delta.stop_reason; Object.assign(usage, d.usage || {}) }
        else if (d.type === 'error') throw new Error((d.error && d.error.message) || 'stream error');
      }
    }
    stop = stop || 'end_turn'; onText(raw, stop !== 'tool_use');
    const c = cents(usage, m); spent += c;
    const content = blocks.filter(Boolean).map(b => b.type === 'tool_use' ? (() => { let input = {}; try { input = JSON.parse(b.json || '{}') } catch(e) {} return {type:'tool_use', id:b.id, name:b.name, input} })() : b.text ? {type:'text', text:b.text} : null).filter(Boolean);
    return {raw, stop, usage, model:m, cents:c, content};
  }
  const costLine = r => MODELS[r.model].name + ' · ≈ ' + r.cents.toFixed(2) + '¢ (this visit ≈ ' + spent.toFixed(1) + '¢)';

  // ================= Keeping it: records, local first, synced through a private GitHub repo =================
  // Every mark, note thread, notebook page, stroke, typed note or reply, handwriting reading and History entry is a record with a
  // stable id, an updatedAt (u) and, once removed, a deleted marker instead of vanishing. Changes are found by comparing what is on
  // screen with the records it was built from (BASE), so a change merged in from another device is never mistaken for a local edit.
  // IndexedDB ('recs') is the local copy, so everything works offline. With a GitHub token in Settings, the records go to one JSON file
  // per knowledge-base page in the notes repo (pages/<page path>.json) plus settings.json: pushed about 10 s after the last change and
  // when the page is hidden, pulled on load and when the tab comes back. Two copies merge record by record: the newer u wins. A save
  // rejected because the file changed meanwhile is fetched again, merged and retried. History pictures stay on the device.
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let REC = {}, LOCAL = {}, BASE = new Map(), recsReady = false, needApply = false, changeSeq = 0;
  const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v === undefined ? null : v);
  const bare = r => { const o = Object.assign({}, r); delete o.u; delete o.del; return o };
  const sig = r => canon(bare(r));
  const strokeRec = st => ({p:st.p.map(rq), c:st.c || null, w:st.w, h:!!st.h, sh:!!st.sh, t:st.t || 0});
  // what is on screen now, as records (blank notebook pages are not kept)
  function buildRecs(){
    const out = {}, put = (k, o, body, extra) => { o.id = o.id || newId(); out[o.id] = Object.assign({k, id:o.id}, body, extra || {}) };
    book.forEach((pg, i) => {
      if (blank(pg) && !(pg.reads || []).length) return;
      pg.id = pg.id || newId(); if (pg.order == null) pg.order = i;
      out[pg.id] = {k:'npage', id:pg.id, order:pg.order};
      for (const st of pg.ink) put('stroke', st, strokeRec(st), {pg:pg.id});
      for (const it of pg.items) { const b = Object.assign({}, it); delete b.id; put('item', it, b, {pg:pg.id}) }
      for (const r of pg.reads || []) { const b = Object.assign({}, r); delete b.id; put('read', r, b, {pg:pg.id}) }
    });
    for (const m of marks) { const b = Object.assign({}, m, {p:m.p.map(rq)}); delete b.id; put('mark', m, b) }
    for (const n of notes) { const b = JSON.parse(JSON.stringify(n)); delete b.id; put('note', n, b) }
    for (const e of entries) { const b = Object.assign({}, e); delete b.id; delete b.img; delete b.page; put('entry', e, b); if (e.img) LOCAL[e.id] = {img:e.img} }
    return out;
  }
  // fold what changed on screen since the last build into the records, stamped now
  function commitRecs(){
    if (!recsReady) return;
    const cur = buildRecs(), now = Date.now(); let n = 0;
    for (const id in cur) { const sg = sig(cur[id]); if (BASE.get(id) !== sg) { REC[id] = Object.assign(cur[id], {u:now}); BASE.set(id, sg); n++ } }
    for (const id of [...BASE.keys()]) if (!cur[id]) { const o = REC[id] || {}; REC[id] = {k:o.k, id, pg:o.pg, order:o.order, del:true, u:now}; BASE.delete(id); n++ }
    if (n) { changeSeq++; persistRecs(true); schedulePush() } else persistRecs(false);
  }
  let dirty = false;
  function persistRecs(d){ if (d) dirty = true; return tx('readwrite', st => st.put({page:PAGE_ID, recs:REC, local:LOCAL, dirty}), 'recs') }
  // the screen rebuilt from the records: notebook pages in order (a page also shows while something live is on it), marks, notes, History
  function fromRecs(){
    const live = Object.values(REC).filter(r => r && !r.del), kids = k => live.filter(r => r.k === k), strip = r => { const o = bare(r); delete o.k; delete o.pg; return o };
    const byT = (a, b) => (a.t || 0) - (b.t || 0) || (a.id < b.id ? -1 : 1);
    const pgIds = new Set(kids('npage').map(r => r.id)); for (const r of live) if (r.pg && REC[r.pg]) pgIds.add(r.pg);
    book = [...pgIds].map(id => REC[id]).sort((a, b) => (a.order || 0) - (b.order || 0) || (a.id < b.id ? -1 : 1)).map(np => ({id:np.id, order:np.order || 0,
      ink:kids('stroke').filter(r => r.pg === np.id).sort(byT).map(strip), items:kids('item').filter(r => r.pg === np.id).sort(byT).map(strip), reads:kids('read').filter(r => r.pg === np.id).sort(byT).map(strip)}));
    marks = kids('mark').sort(byT).map(strip); notes = kids('note').sort(byT).map(strip);
    entries = kids('entry').sort(byT).map(r => Object.assign(strip(r), LOCAL[r.id] || {}));
    BASE = new Map(Object.entries(buildRecs()).map(([id, r]) => [id, sig(r)]));
  }
  // nothing half-done may be lost when the screen is rebuilt: wait while a stroke, a selection, typing, an unsaved change or a reply is
  // under way. Marks still waiting for Claude (Claude off, or before the pause) are carried over by their ids
  const canApply = () => !live && !ed && !sel && !psel && !PG.busy && !NB.busy && !saveT && !pgs.some(p => p.ink.busy());
  function applyRecs(){
    if (!canApply()) { needApply = true; setTimeout(applyRecs, 2000); return }
    needApply = false; const top = scr.scrollTop, pIds = pend.map(x => x.s.id), mIds = pendPage.map(m => m.id), tIds = pendTyped.map(x => x.it.id); fromRecs();
    pend.length = 0; pendTyped.length = 0; book.forEach((pg, i) => { for (const st of pg.ink) if (pIds.includes(st.id)) pend.push({pg:i, s:st}); for (const it of pg.items) if (tIds.includes(it.id)) pendTyped.push({pg:i, it}) });
    pendPage.length = 0; for (const m of marks) if (mIds.includes(m.id)) pendPage.push(m);
    book$.innerHTML = ''; pgs = []; elOf.clear(); book.forEach((_, i) => mountPage(i)); grow(); if (!P.hidden && !nbView.hidden) { layoutBook(); scr.scrollTop = top }
    for (const g of markEl.values()) g.remove(); markEl.clear(); for (const e of noteEl.values()) e.remove(); noteEl.clear(); anchors.clear(); undoStack.length = 0;
    placeMarks(); fillQuotes(); if (!pgView.hidden) renderLog(); if (!ovView.hidden) renderOverview(); syncBar();
  }
  // first run on this page: the bundle kept before records (IndexedDB 'books' and 'entries') becomes records, nothing dropped
  async function loadRecs(){
    const r = await tx('readonly', st => st.get(PAGE_ID), 'recs');
    if (r && r.recs && Object.keys(r.recs).length) { REC = r.recs; LOCAL = r.local || {}; dirty = !!r.dirty; fromRecs() }
    else {
      const b = await tx('readonly', st => st.get(PAGE_ID), 'books'), old = await tx('readonly', st => st.index('page').getAll(PAGE_ID), 'entries');
      book = b && Array.isArray(b.pages) ? b.pages.filter(p => p && Array.isArray(p.ink) && Array.isArray(p.items)) : [];
      book.forEach((p, i) => { p.id = newId(); p.order = i; p.ink = p.ink.map(asStroke) });
      marks = b && Array.isArray(b.marks) ? b.marks.filter(m => m && Array.isArray(m.p)) : []; notes = b && Array.isArray(b.notes) ? b.notes.filter(n => n && (Array.isArray(n.turns) || typeof n.text === 'string')) : [];
      for (const n of notes) { turnsOf(n); delete n.q; delete n.text }
      entries = (old || []).sort((a, c) => a.t - c.t).map(e => Object.assign({}, e, {id:newId()}));
      BASE = new Map();
    }
    recsReady = true; book.forEach((_, i) => mountPage(i)); grow(); loaded = true; if (!P.hidden && !nbView.hidden) layoutBook();
    placeMarks(); fillQuotes(); commitRecs(); syncNow();
  }

  // ---- the GitHub side: the contents API, with the reader's fine-grained token (this browser only) ----
  const ghTok = () => mine.get('ghToken'), ghRepo = () => (mine.get('ghRepo') || 'khalit7/kb-notes').trim();
  const PAGE_FILE = 'pages/' + (decodeURIComponent(PAGE_ID).replace(/^.*?technical_knowledge_base\//, '').replace(/^\/+|\/+$/g, '') || 'home') + '.json';
  const b64e = str => { const u = new TextEncoder().encode(str); let s2 = ''; for (let i = 0; i < u.length; i += 0x8000) s2 += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s2) };
  const b64d = b => { const s2 = atob(b.replace(/\s/g, '')), u = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u[i] = s2.charCodeAt(i); return new TextDecoder().decode(u) };
  const ghUrl = path => 'https://api.github.com/repos/' + ghRepo() + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
  const ghHead = acc => ({Authorization:'Bearer ' + ghTok(), Accept:acc || 'application/vnd.github+json'});
  const ghErr = async r => { let m = r.status + ''; try { m += ' ' + ((await r.json()).message || '') } catch(e) {} const e = new Error(r.status === 401 ? 'the GitHub token was not accepted' : r.status === 404 ? 'repository ' + ghRepo() + ' not found, or the token cannot see it' : r.status === 403 ? 'the token may not write to ' + ghRepo() + ' (' + m + ')' : m); e.gh = true; return e };
  async function ghGet(path){
    const r = await fetch(ghUrl(path), {headers:ghHead(), cache:'no-store'});
    if (r.status === 404) { const t = await fetch('https://api.github.com/repos/' + ghRepo(), {headers:ghHead(), cache:'no-store'}); if (!t.ok) throw await ghErr(t); return {sha:null, data:null} }
    if (!r.ok) throw await ghErr(r);
    const j = await r.json(); let text = j.encoding === 'base64' && j.content ? b64d(j.content) : null;
    if (text == null) { const r2 = await fetch(ghUrl(path), {headers:ghHead('application/vnd.github.raw+json'), cache:'no-store'}); if (!r2.ok) throw await ghErr(r2); text = await r2.text() }   // over 1 MB: the raw file
    let data = null; try { data = JSON.parse(text) } catch(e) {} return {sha:j.sha, data};
  }
  async function ghPut(path, data, sha){
    const r = await fetch(ghUrl(path), {method:'PUT', headers:Object.assign({'content-type':'application/json'}, ghHead()), body:JSON.stringify(Object.assign({message:'AI buddy: ' + path, content:b64e(JSON.stringify(data))}, sha ? {sha} : {}))});
    if (r.status === 409 || (r.status === 422 && !sha)) return 'conflict';   // the file changed (or appeared) since it was read
    if (!r.ok) throw await ghErr(r);
    return 'ok';
  }
  // two copies of the records, merged record by record (the newer u wins; equal times fall to the same side on every device)
  function mergeRecs(L, R){
    const out = {}; let lc = false, rc = false;
    for (const id of new Set([...Object.keys(L), ...Object.keys(R)])) {
      const a = L[id], b = R[id];
      if (!b) { out[id] = a; rc = true } else if (!a) { out[id] = b; lc = true }
      else { const ca = canon(a), cb = canon(b); if (ca === cb) { out[id] = a; continue }
        const w = (b.u || 0) > (a.u || 0) || ((b.u || 0) === (a.u || 0) && cb > ca) ? b : a; out[id] = w; if (w === b) lc = true; else rc = true }
    }
    return {recs:out, lc, rc};
  }
  // settings: one value and one time per synced key
  const setU = () => { try { return JSON.parse(rawGet('kbBuddy.setU') || '{}') } catch(e) { return {} } };
  let setDirty = false;
  onSettingChange = k => { const u = setU(); u[k] = Date.now(); rawSet('kbBuddy.setU', JSON.stringify(u)); setDirty = true; schedulePush() };
  function settingsDoc(){ const u = setU(), v = {}; for (const k of SYNCED) v[k] = rawGet(k); return {v:1, values:v, u} }
  function mergeSettings(remote){
    const u = setU(), ru = (remote && remote.u) || {}, rv = (remote && remote.values) || {}; let lc = false, rc = false;
    for (const k of SYNCED) { const a = u[k] || 0, b = ru[k] || 0;
      if (b > a) { rawSet(k, rv[k] == null ? null : rv[k]); u[k] = b; lc = true } else if (a > b || (a && !(k in rv))) rc = true }
    rawSet('kbBuddy.setU', JSON.stringify(u)); return {lc, rc};
  }
  // ---- syncing: the state shown on the toolbar (off without a token; synced, waiting, syncing, offline, error); tap it to sync now ----
  let pushT = 0, syncing = false, again = false, syncState = 'off', syncMsg = '', lastSync = 0;
  function setSync(st, msg){
    syncState = st; syncMsg = msg || ''; const b = bar.querySelector('[data-b=sync]'); if (!b) return;
    b.hidden = !ghTok(); b.dataset.s = st;
    b.title = st === 'ok' ? 'Synced' + (lastSync ? ' at ' + new Date(lastSync).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '') + '; tap to sync now' : st === 'wait' ? 'Changes waiting to sync; tap to sync now' : st === 'busy' ? 'Syncing…' : st === 'offline' ? 'Offline: your changes are kept here and sync when you are back online' : st === 'error' ? 'Sync error: ' + syncMsg + '. Tap to try again' : 'Sync is off';
    const t = setv && setv.querySelector('#kbSyncSt'); if (t) t.textContent = b.title;
  }
  function schedulePush(ms){ if (!ghTok()) return; if (!syncing) setSync('wait'); clearTimeout(pushT); pushT = setTimeout(syncNow, ms == null ? 10000 : ms) }
  async function syncFile(path, local, merge, apply){
    for (let k = 0; k < 5; k++) {
      const {sha, data} = await ghGet(path), m = merge(data);
      if (m.lc) apply(m);
      if (!m.rc && sha) return;
      if (!m.rc && !sha && !local()) return;
      if (await ghPut(path, local(), sha) === 'ok') return;
    }
    throw new Error('the notes file kept changing; try again');
  }
  async function syncNow(){
    clearTimeout(pushT); if (!ghTok() || !recsReady) { setSync('off'); return }
    if (syncing) { again = true; return }
    if (navigator.onLine === false) { setSync('offline'); return }
    syncing = true; setSync('busy');
    try {
      if (saveT) { clearTimeout(saveT); saveT = 0; commitRecs() }
      const seq = changeSeq;
      await syncFile(PAGE_FILE, () => Object.keys(REC).length ? {v:1, page:PAGE_FILE.slice(6, -5), records:REC} : null,
        data => { const m = mergeRecs(REC, (data && data.records) || {}); REC = m.recs; return m },
        () => { persistRecs(false); applyRecs() });
      if (seq === changeSeq) { dirty = false; persistRecs(false) }
      const sd = setDirty; setDirty = false;
      await syncFile('settings.json', () => settingsDoc(), data => { const m = mergeSettings(data); m.rc = m.rc || sd; return m }, () => { syncBar(); if (!stView.hidden) renderSet() });
      lastSync = Date.now(); setSync(dirty || setDirty ? 'wait' : 'ok');
    } catch(e) {
      setSync(e.gh ? 'error' : navigator.onLine === false || e instanceof TypeError ? 'offline' : 'error', String(e.message || e));
    } finally { syncing = false; if (again) { again = false; schedulePush(1500) } }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (dirty || setDirty || saveT) syncNow() } else syncNow() });
  window.addEventListener('online', () => syncNow()); window.addEventListener('offline', () => setSync('offline'));

  // ---- marks find their place again after a page is rebuilt: each keeps the start of its element's text (qt); if the element at its
  // path no longer starts with it, the exact text is searched for, then a close match; a mark that fits nowhere is listed as unanchored ----
  const normT = t => String(t || '').replace(/\s+/g, ' ').trim();
  const quoteOf = e => !e || e === pageRoot() ? '' : normT(e.textContent).slice(0, 160);
  const bigrams = t => { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1) } return m };
  function dice(a, b){ if (!a || !b) return 0; const A = bigrams(a), B = bigrams(b); let n = 0, na = 0, nb = 0; for (const v of A.values()) na += v; for (const v of B.values()) nb += v; for (const [g, v] of A) n += Math.min(v, B.get(g) || 0); return na + nb ? 2 * n / (na + nb) : 0 }
  function refind(qt){
    const head = qt.slice(0, 60), cands = [...pageRoot().querySelectorAll(CITE_SEL + ',figure,div,section,svg,table')].filter(e => !e.closest(OURS));
    let best = null; for (const e of cands) { const t = normT(e.textContent); if (t.startsWith(head) && (!best || best.textContent.length > e.textContent.length)) best = e }
    if (best) return best;
    let sc = 0.62; for (const e of cands) { const d = dice(qt, normT(e.textContent).slice(0, 160)); if (d > sc) { sc = d; best = e } }
    return best;
  }
  // give marks and notes made before quotes were kept the text of the element they sit on now
  function fillQuotes(){ let n = 0; for (const x of marks.concat(notes)) if (x.qt == null && x.a != null) { const e = anchorEl(x.a); if (e) { x.qt = quoteOf(e); n++ } } if (n) saveBook() }

  // ================= The rest of the knowledge base =================
  // kb_index.json (html_utils/build_site.py) sits at the site's root: the nearest folder above this page that has it. Search uses the
  // site's full-text index (Pagefind) when it loads, else words over the index's titles, headings and summaries
  let KBI = null, KBROOT = null;
  let kbP = null;
  const kbIndex = () => kbP || (kbP = (async () => {
    let u = new URL('.', location.href);
    for (let k = 0; k < 7; k++) { try { const r = await fetch(new URL('kb_index.json', u)); if (r.ok) { const j = await r.json(); KBROOT = u.href; KBI = j.pages || []; return KBI } } catch(e) {} if (u.pathname === '/') break; u = new URL('..', u) }
    return null;
  })());
  setTimeout(kbIndex, 2500);   // after the page has settled
  const kbUrl = t => { if (!KBI) return null; const k = t.trim().toLowerCase(), e = KBI.find(x => x.t.toLowerCase() === k) || KBI.find(x => x.t.toLowerCase().startsWith(k) || k.startsWith(x.t.toLowerCase())); return e ? KBROOT + e.p + '/' : null };
  const kbTitle = p => { const e = KBI && KBI.find(x => x.p === String(p || '').replace(/^\/+|\/+$/g, '')); return e ? '"' + e.t + '"' : 'a page' };
  let pf = null;
  async function runTool(u){
    try {
      await kbIndex(); if (!KBI) return 'The knowledge base index is not available here.';
      if (u.name === 'search_kb') {
        const q = String(u.input.query || '').trim(); if (!q) return 'Empty query.';
        let hits = [];
        try { if (pf === null) { pf = await import(KBROOT + 'pagefind/pagefind.js'); await pf.init() } } catch(e) { pf = false }
        if (pf) { const r = await pf.search(q); for (const x of r.results.slice(0, 8)) { const d = await x.data(); const p = new URL(d.url, KBROOT).href.replace(KBROOT, '').replace(/\/(index\.html)?$/, ''); const e = KBI.find(y => y.p === p); hits.push((e ? e.t : d.meta && d.meta.title) + ' | path: ' + p + ' | ' + d.excerpt.replace(/<[^>]+>/g, '')) } }
        if (!hits.length) {
          const w = q.toLowerCase().split(/\W+/).filter(x => x.length > 2);
          hits = KBI.map(e => { const h = (e.t + ' ' + (e.h || []).join(' ') + ' ' + (e.s || '')).toLowerCase(); return [w.reduce((n, x) => n + (h.includes(x) ? (e.t.toLowerCase().includes(x) ? 3 : 1) : 0), 0), e] }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 8)
            .map(([, e]) => e.t + ' | path: ' + e.p + ' | ' + (e.s || '') + (e.h && e.h.length ? ' Sections: ' + e.h.slice(0, 8).join('; ') : ''));
        }
        return hits.length ? hits.join('\n') : 'No page matches "' + q + '".';
      }
      if (u.name === 'read_kb_page') {
        const p = String(u.input.path || '').replace(/^\/+|\/+$/g, ''), e = KBI.find(x => x.p === p); if (!e) return 'No page at path "' + p + '". Use a path from search_kb.';
        const r = await fetch(KBROOT + p + '/'); if (!r.ok) return 'Could not load that page.';
        const d = new DOMParser().parseFromString(await r.text(), 'text/html');
        for (const x of d.querySelectorAll('script,style,svg,canvas,button,select,nav,template,noscript,[aria-hidden=true]')) x.remove();
        const w = d.querySelector('.w') || d.body, out = [];
        for (const x of w.querySelectorAll(CITE_SEL)) { const t = x.textContent.replace(/\s+/g, ' ').trim(); if (t && !x.querySelector(CITE_SEL)) out.push((/^H[1-6]$/.test(x.tagName) ? '#'.repeat(+x.tagName[1]) + ' ' : '') + t) }
        const text = out.join('\n'); return 'Page: ' + e.t + ' (path ' + p + ')\n\n' + (text.length > 45000 ? text.slice(0, 45000) + '\n[cut here]' : text);
      }
      return 'Unknown tool.';
    } catch(err) { return 'The tool failed: ' + String(err.message || err) }
  }

  // ================= Notebook =================
  let entries = [];
  const db = new Promise(res => {
    try {
      const r = indexedDB.open('kbDiary', 3);
      r.onupgradeneeded = () => { const d = r.result;
        if (!d.objectStoreNames.contains('entries')) d.createObjectStore('entries', {keyPath:'id', autoIncrement:true}).createIndex('page', 'page');
        if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', {keyPath:'page'});
        if (!d.objectStoreNames.contains('recs')) d.createObjectStore('recs', {keyPath:'page'}) };   // since 2026-11-19: one record per thing, synced
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch(e) { res(null) }
  });
  const tx = async (m, f, name) => { const d = await db; if (!d) return null; name = name || 'entries'; return new Promise(res => { try { const t = d.transaction(name, m), s = t.objectStore(name); const r = f(s); t.oncomplete = () => res(r && r.result); t.onerror = () => res(null) } catch(e) { res(null) } }) };
  const save = e => { e.id = newId(); entries.push(e); saveBook() };   // a History entry

  // ---- ink: a stroke is {p:[[x, y, pressure]...], c:colour (null: the ink colour of the page or theme), w:width, h:highlighter}; on a
  // notebook page in paper units (its canvas is lw units wide, scaled on screen) ----
  function seg(c, a, b, w){ c.lineWidth = w * (0.45 + 0.85 * ((a[2] + b[2]) / 2)); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke() }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  // a smooth piece: from the middle of a-b to the middle of b-d, bending through b (the pen's points joined by curves, not corners)
  function segQ(c, a, b, d, w){ const m1 = mid(a, b), m2 = mid(b, d); c.lineWidth = w * (0.45 + 0.85 * b[2]); c.beginPath(); c.moveTo(m1[0], m1[1]); c.quadraticCurveTo(b[0], b[1], m2[0], m2[1]); c.stroke() }
  function drawStroke(c, s, def){
    const p = s.p, w = s.w || 2.6; if (!p || !p.length) return;
    c.save(); c.strokeStyle = c.fillStyle = s.c || def; c.lineCap = 'round'; c.lineJoin = 'round';
    if (s.h) { c.globalAlpha = 0.35; c.lineWidth = w; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p) c.lineTo(q[0], q[1]); if (p.length === 1) c.lineTo(p[0][0] + 0.1, p[0][1]); c.stroke() }   // one path: an even wash
    else if (p.length === 1) { c.beginPath(); c.arc(p[0][0], p[0][1], w * (0.45 + 0.85 * p[0][2]) / 2, 0, 7); c.fill() }
    else if (s.sh || p.length < 3) for (let i = 1; i < p.length; i++) seg(c, p[i - 1], p[i], w);   // a snapped shape keeps its corners
    else { const n = p.length; seg(c, p[0], mid(p[0], p[1]), w); for (let i = 1; i < n - 1; i++) segQ(c, p[i - 1], p[i], p[i + 1], w); seg(c, mid(p[n - 2], p[n - 1]), p[n - 1], w) }
    c.restore();
  }
  // ---- ink gestures, shared by the notebook and the page ----
  const plen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L };
  const pbox = p => bbox([{p}]);
  // a scratch-out: a zigzag with at least four turns, much longer than it is wide
  function isScratch(p){
    if (p.length < 8) return false; const b = pbox(p), W = b.x1 - b.x0, H = b.y1 - b.y0, M = Math.max(W, H); if (M < 14) return false;
    const ax = W >= H ? 0 : 1; let dir = 0, rev = 0, ext = p[0][ax];
    for (const q of p) { const v = q[ax];
      if (dir >= 0) { if (v > ext) { ext = v; if (dir === 0 && v - p[0][ax] > 6) dir = 1 } else if (ext - v > 6) { if (dir > 0) rev++; dir = -1; ext = v } }
      else { if (v < ext) ext = v; else if (v - ext > 6) { rev++; dir = 1; ext = v } } }
    return rev >= 4 && plen(p) > 3.2 * M;
  }
  const mostlyIn = (pts, b) => { let n = 0; for (const q of pts) if (q[0] >= b.x0 - 6 && q[0] <= b.x1 + 6 && q[1] >= b.y0 - 6 && q[1] <= b.y1 + 6) n++; return n >= pts.length * 0.5 };
  // hold the pen still at the end of a stroke: a straight line, an ellipse or a rectangle in its place (null: leave it as drawn)
  function snapShape(p){
    if (p.length < 6) return null;
    const a = p[0], z = p[p.length - 1], d = Math.hypot(z[0] - a[0], z[1] - a[1]), L = plen(p), b = pbox(p);
    if (d > 24) { let dev = 0; for (const q of p) dev = Math.max(dev, Math.abs((z[0] - a[0]) * (a[1] - q[1]) - (a[0] - q[0]) * (z[1] - a[1])) / d); if (dev < Math.max(5, 0.07 * d)) return [[a[0], a[1], 0.5], [z[0], z[1], 0.5]] }
    const rx = (b.x1 - b.x0) / 2, ry = (b.y1 - b.y0) / 2; if (L < 70 || d > 0.22 * L || rx < 6 || ry < 6) return null;
    const cx = b.x0 + rx, cy = b.y0 + ry; let e = 0, f = 0;
    for (const q of p) { e += Math.abs(Math.hypot((q[0] - cx) / rx, (q[1] - cy) / ry) - 1); f += Math.min(Math.abs(q[0] - b.x0), Math.abs(q[0] - b.x1), Math.abs(q[1] - b.y0), Math.abs(q[1] - b.y1)) / Math.min(rx, ry) }
    e /= p.length; f /= p.length;
    if (e < 0.12 && e <= f) { const out = []; for (let k = 0; k <= 56; k++) { const t = k / 56 * 2 * Math.PI; out.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t), 0.5]) } return out }
    if (f < 0.14) return [[b.x0, b.y0, 0.5], [b.x1, b.y0, 0.5], [b.x1, b.y1, 0.5], [b.x0, b.y1, 0.5], [b.x0, b.y0, 0.5]];
    return null;
  }
  // the last two strokes look like a question mark (or "!"): a dot just under a taller stroke. Boxes in drawing order
  function endsWithQ(bs){
    if (bs.length < 2) return false; const d = bs[bs.length - 1], h = bs[bs.length - 2]; if (!d || !h) return false;
    const dw = Math.hypot(d.x1 - d.x0, d.y1 - d.y0), hh = h.y1 - h.y0, hw = h.x1 - h.x0, dx = (d.x0 + d.x1) / 2, dy = (d.y0 + d.y1) / 2;
    return dw < 10 && hh > 12 && hw < 1.4 * hh && dx > h.x0 - 8 && dx < h.x1 + 8 && dy > h.y1 - 4 && dy - h.y1 < 0.9 * hh;
  }
  const asStroke = s => Array.isArray(s) ? {p:s, c:null, w:2.6} : s;   // notebooks saved before strokes had colours
  function Ink(cv, opt){
    const g = cv.getContext('2d', {desynchronized:true}) || cv.getContext('2d');   // low-latency canvas where the browser offers it
    const o = {cv, strokes:[], cur:null, dpr:1, k:1}, off = () => opt.off ? opt.off() : [0, 0];
    const setT = () => { const [ox, oy] = off(); g.setTransform(o.dpr, 0, 0, o.dpr, -ox * o.dpr, -oy * o.dpr) };
    o.redraw = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); setT(); const d = opt.color(); for (const s of o.strokes) drawStroke(g, s, d) };
    // the canvas at the screen's resolution (at most about 6 million pixels, so zooming in cannot exhaust the iPad's canvas memory);
    // a notebook page far from view gives its pixels back (release) and is drawn again when it comes near
    o.size = () => {
      const r = cv.getBoundingClientRect(); if (r.width < 2) return; if (opt.near && !opt.near()) return o.release();
      const d = Math.min(window.devicePixelRatio || 1, Math.sqrt(6e6 / (r.width * r.height))); o.k = opt.lw ? r.width / opt.lw : 1; o.dpr = d * o.k;
      cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d)); o.redraw();
    };
    o.release = () => { if (cv.width > 1) { cv.width = 1; cv.height = 1 } };
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
      if (opt.lassoer && opt.lassoer()) { o.cur = {id:e.pointerId, r, la:true, p:[pt(e, r)]}; opt.lasso(o.cur.p, false); return }
      if (opt.eraser && opt.eraser()) { o.cur = {id:e.pointerId, r, er:true}; opt.erase(pt(e, r)); return }
      opt.down(); const st = Object.assign({p:[pt(e, r)]}, opt.style()); o.cur = {id:e.pointerId, r, s:st, p:st.p, hx:st.p[0][0], hy:st.p[0][1]}; o.strokes.push(st); if (opt.start) opt.start(st); setT(); drawStroke(g, st, opt.color());
      hold(o.cur);
    });
    // held still for a moment at the end of a stroke: snap it to a clean shape
    const hold = c => { clearTimeout(o.ht); o.ht = setTimeout(() => {
      if (o.cur !== c || c.snapped || !c.s) return; const q = snapShape(c.s.p); if (!q) return;
      c.s.p.length = 0; c.s.p.push(...q); c.s.sh = true; c.snapped = true; o.redraw();
    }, 550) };
    cv.addEventListener('pointermove', e => {
      if (!o.cur || e.pointerId !== o.cur.id) return; e.preventDefault();
      if (o.cur.er) { opt.erase(pt(e, o.cur.r)); return }
      if (o.cur.la) { o.cur.p.push(pt(e, o.cur.r)); opt.lasso(o.cur.p, false); return }
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const st = o.cur.s, c = o.cur; if (c.snapped) return; let moved = false;
      g.save(); g.strokeStyle = g.fillStyle = st.c || opt.color(); g.lineCap = 'round';
      for (const x of (evs.length ? evs : [e])) {
        const p = pt(x, c.r), P = c.p, q = P[P.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.6) continue; P.push(p); moved = true;
        if (!st.h) { const n = P.length; if (n >= 3) segQ(g, P[n - 3], P[n - 2], P[n - 1], st.w); else seg(g, P[0], mid(P[0], P[1]), st.w) }
        if (Math.hypot(p[0] - c.hx, p[1] - c.hy) > 3) { c.hx = p[0]; c.hy = p[1]; hold(c) }
      }
      g.restore(); if (st.h && moved) o.redraw();   // a highlighter stroke is redrawn whole, so it stays one even wash
    });
    const up = e => { if (!o.cur || e.pointerId !== o.cur.id) return; clearTimeout(o.ht); if (e.pointerType === 'pen') penUp = performance.now(); const c = o.cur; o.cur = null; if (c.er) { if (opt.erased) opt.erased() } else if (c.la) opt.lasso(c.p, true); else { o.redraw(); opt.up(c.s) } };
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
  let book = [], pgs = [], scale = 1, zoom = 1, inkColor = '#222', gest = null, gestEnd = 0, loaded = false, jumped = false, marks = [], notes = [];
  const pend = [], undoStack = [], elOf = new Map();   // strokes Claude has not read yet, and every stroke for Undo ({pg, s}); item -> element
  const drop = (a, s) => { const k = a.findIndex(x => x === s || (x && (x.s === s || x.m === s))); if (k >= 0) a.splice(k, 1) };
  const r1 = v => Math.round(v * 10) / 10;
  let saveT = 0;
  const saveBook = () => { clearTimeout(saveT); saveT = setTimeout(() => { saveT = 0; commitRecs() }, 400) };
  const rq = q => [r1(q[0]), r1(q[1]), Math.round(q[2] * 100) / 100];
  // how wide a typed note's text really is (its box runs to the margin)
  function measureW(it){ const e = elOf.get(it); if (!e) return it.w; const rg = document.createRange(); rg.selectNodeContents(e); const base = e.getBoundingClientRect(), k = base.width / it.w || 1; let r = 0; for (const q of rg.getClientRects()) r = Math.max(r, (q.right - base.left) / k); return Math.max(40, r) }
  const blank = p => !p.ink.length && !p.items.length;

  // a page's DOM; its index is looked up when needed, since a page can be inserted before it
  function mountPage(i){
    const data = book[i], ix = () => book.indexOf(data), outer = el('div', {class:'kd-pg'}), inner = el('div', {class:'kd-pgi'}), items = el('div', {class:'kd-its'});
    const c = el('canvas', {'aria-label':'Notebook page: write with a pen, a finger or the mouse; scroll with two fingers'}), no = el('span', {class:'kd-no'}, String(i + 1));
    inner.append(c, items, no); outer.appendChild(inner);
    if (pgs[i]) book$.insertBefore(outer, pgs[i].outer); else book$.appendChild(outer);
    const ink = Ink(c, {lw:PW, color:() => inkColor, style:curStyle,
      texter:() => tool === 'text', textAt:(p, e) => typeAt(ix(), p, e), lassoer:() => tool === 'lasso', lasso:(pts, end) => lassoNb(ix(), pts, end),
      block:() => tool === 'hand' || !!gest || performance.now() < gestEnd || pgs.some(p => p.ink.busy()),
      eraser:() => tool === 'erase', erase:p => eraseAt(ix(), p), erased:() => { saveBook(); renderOn() },
      down:() => { clearTimeout(NB.timer); stat.textContent = ''; if (ed) finishEd() }, start:s => { s.t = Date.now(); pend.push({pg:ix(), s}); undoStack.push({pg:ix(), s}); syncBar() },
      cancelled:s => { drop(pend, s); drop(undoStack, s) }, near:() => pg.near,
      up:st => { if (scratchOn() && isScratch(st.p) && scratchNb(ix(), st)) return; saveBook(); grow(); arm(NB) }});
    ink.strokes = data.ink;
    const pg = {data, outer, inner, ink, items, no, near:true}; pgs.splice(i, pgs[i] ? 0 : 1, pg); nearObs.observe(outer);
    for (const it of data.items) items.appendChild(itemEl(it));
    sizePage(pg); return pg;
  }
  function addPage(){ const L = book[book.length - 1]; book.push({id:newId(), order:L ? (L.order || 0) + 1 : 0, ink:[], items:[]}); mountPage(book.length - 1); return book.length - 1 }
  // only pages within about a screen of the view keep a full-resolution canvas
  const nearObs = new IntersectionObserver(es => { for (const x of es) { const p = pgs.find(q => q.outer === x.target); if (!p) continue; p.near = x.isIntersecting; if (p.near) p.ink.size(); else p.ink.release() } }, {root:scr, rootMargin:'120% 0px'});
  // a scratch-out over writing in the notebook: the strokes and typed notes or replies mostly under it go, and so does the scratch
  function scratchNb(i, st){
    const d = book[i], b = pbox(st.p); let hit = false;
    for (const s2 of d.ink.slice()) if (s2 !== st && mostlyIn(s2.p, b)) { drop(d.ink, s2); drop(pend, s2); drop(undoStack, s2); hit = true }
    for (const it of d.items.slice()) { if (it.kind === 'arrow') { if (mostlyIn([[it.x1, it.y1], [it.x2, it.y2]], b)) { removeItem(i, it); hit = true } continue }
      const ix0 = Math.max(it.x, b.x0), iy0 = Math.max(it.y, b.y0), ix1 = Math.min(it.x + it.w, b.x1), iy1 = Math.min(it.y + (it.h || LH), b.y1);
      if (ix1 > ix0 && iy1 > iy0 && (ix1 - ix0) * (iy1 - iy0) > 0.5 * Math.min(it.w * (it.h || LH), measureW(it) * (it.h || LH))) { drop(pendTyped, it); removeItem(i, it); hit = true } }
    if (!hit) return false;
    drop(d.ink, st); drop(pend, st); drop(undoStack, st); pgs[i].ink.redraw(); saveBook(); arm(NB); return true;
  }
  // a blank page put in at index at (right after the page being written on), so a reply that needs room stays next to its question
  function insertPage(at){
    if (at >= book.length) return addPage();
    book.splice(at, 0, {id:newId(), order:at > 0 ? ((book[at - 1].order || 0) + (book[at].order || 0)) / 2 : (book[0].order || 0) - 1, ink:[], items:[]});   // an order between its neighbours, so pages from two devices interleave
    const fix = x => { if (x && x.pg >= at) x.pg++ };
    pend.forEach(fix); undoStack.forEach(fix); pendTyped.forEach(fix); fix(ed); if (NB.queued) fix(NB.queued);
    mountPage(at); pgs.forEach((p, k) => { p.no.textContent = String(k + 1) }); saveBook(); return at;
  }
  function grow(){ if (!book.length || !blank(book[book.length - 1])) addPage() }   // keep one blank page at the end
  function sizePage(p){ Object.assign(p.outer.style, {width:PW * scale + 'px', height:PH * scale + 'px'}); p.inner.style.transform = 'scale(' + scale + ')'; if (p.near) p.ink.size(); else p.ink.release() }
  let layT = 0;
  function layoutBook(){
    inkColor = getComputedStyle(P).color || '#222';
    const w = scr.clientWidth; if (w < 50) return;
    scale = Math.min(1.15, (w - 20) / PW) * zoom; for (const p of pgs) sizePage(p);
    $('[data-a=zoom]').hidden = Math.abs(zoom - 1) < 0.01; $('[data-a=zoom]').textContent = Math.round(zoom * 100) + '%';
    if (loaded && !jumped) { jumped = true; jumpLatest() }
  }
  new ResizeObserver(() => { cancelAnimationFrame(layT); layT = requestAnimationFrame(() => { if (!nbView.hidden) layoutBook() }) }).observe(scr);
  loadRecs();

  // ---- what is on a page: the reader's typed notes and Claude's replies (text, sketches) and arrows ----
  function styleItem(e, it){ if ((it.kind === 'reply' || it.kind === 'typed') && it.fs && it.fs !== 1) { const b = it.kind === 'reply' ? 30 : 22; e.style.fontSize = b * it.fs + 'px'; e.style.lineHeight = 40 * it.fs + 'px' } }
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
      else for (const x of replyPieces(it.text || '')) { if (typeof x === 'string') e.appendChild(txt(x, e)); else { const b = sketch(x.svg); if (b) e.appendChild(b) } }
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

  // ---- the lasso in the notebook: a loop selects the strokes and notes mostly inside it; the selection can be moved (drag the box),
  // resized (the corner dot), deleted, or asked about (Claude gets it outlined on the page and close up, and answers next to it) ----
  const pip = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c } return c };
  let sel = null, lassoSvg = null;
  function clearSel(){ if (sel) { sel.ui.remove(); sel = null } if (lassoSvg) { lassoSvg.remove(); lassoSvg = null } }
  function lassoNb(i, pts, end){
    if (!end) {
      if (pts.length === 1) { clearSel(); lassoSvg = document.createElementNS(NS, 'svg'); lassoSvg.setAttribute('class', 'kd-it kd-arrow'); lassoSvg.setAttribute('viewBox', `0 0 ${PW} ${PH}`); lassoSvg.innerHTML = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="7 6"/>'; pgs[i].items.appendChild(lassoSvg) }
      if (lassoSvg) lassoSvg.firstChild.setAttribute('d', 'M' + pts.map(q => r1(q[0]) + ' ' + r1(q[1])).join('L') + 'Z');
      return;
    }
    if (lassoSvg) { lassoSvg.remove(); lassoSvg = null }
    if (pts.length < 4 || plen(pts) < 40) return;
    const d = book[i], ss = d.ink.filter(s2 => s2.p.filter(q => pip(q[0], q[1], pts)).length >= s2.p.length * 0.6);
    const its = d.items.filter(it => it.kind === 'arrow' ? pip((it.x1 + it.x2) / 2, (it.y1 + it.y2) / 2, pts) : pip(it.x + Math.min(it.w, measureW(it)) / 2, it.y + (it.h || LH) / 2, pts));
    const box = ss.length || its.length ? unionBox(ss, its) : pbox(pts);
    showSel(i, ss, its, box);
  }
  function unionBox(ss, its){
    let b = ss.length ? bbox(ss) : null;
    for (const it of its) { const t = it.kind === 'arrow' ? {x0:Math.min(it.x1, it.x2), y0:Math.min(it.y1, it.y2), x1:Math.max(it.x1, it.x2), y1:Math.max(it.y1, it.y2)} : {x0:it.x, y0:it.y, x1:it.x + Math.min(it.w, measureW(it)), y1:it.y + (it.h || LH)}; b = b ? {x0:Math.min(b.x0, t.x0), y0:Math.min(b.y0, t.y0), x1:Math.max(b.x1, t.x1), y1:Math.max(b.y1, t.y1)} : t }
    return b;
  }
  function showSel(i, ss, its, box){
    const pad = 8, ui = el('div', {class:'kd-it', style:'left:0;top:0;width:0;height:0;overflow:visible'});
    const bx = el('div', {class:'kb-selbox'}), gr = el('div', {class:'kb-selgrip', title:'Drag to resize'});
    const n = ss.length + its.length, br = el('div', {class:'kb-selbar'}, '<div class="kb-pr"><input type="text" placeholder="Ask about this…" enterkeyhint="send"><button type="button" class="kb-go" data-s="ask">Ask</button>' + (n ? '<button type="button" data-s="del" title="Delete what is selected">Delete</button>' : '') + '<button type="button" data-s="done" aria-label="Done">&#x2715;</button></div>' + chipsHtml());
    if (n) bx.appendChild(gr); ui.append(bx, br); pgs[i].items.appendChild(ui);
    sel = {pg:i, ss, its, box, ui};
    const place = () => { const b = sel.box; Object.assign(bx.style, {left:(b.x0 - pad) + 'px', top:(b.y0 - pad) + 'px', width:(b.x1 - b.x0 + 2 * pad) + 'px', height:(b.y1 - b.y0 + 2 * pad) + 'px'});
      const k = 1 / scale, above = b.y0 - pad - 8 - 92 * k; Object.assign(br.style, {left:(b.x0 - pad) + 'px', top:(above >= 4 ? above : b.y1 + pad + 10) + 'px', transform:'scale(' + k + ')', transformOrigin:'0 0'}) };   // above the box, or under it when there is no room
    place();
    const inp = br.querySelector('input'), ask = q => { if (q && q.trim()) askLasso(q.trim()) };
    br.addEventListener('pointerdown', e => e.stopPropagation());
    br.addEventListener('click', e => {
      if (chipClick(e, inp, ask)) return; const b = e.target.closest('[data-s]'); if (!b) return;
      if (b.dataset.s === 'ask') ask(inp.value);
      else if (b.dataset.s === 'done') clearSel();
      else if (b.dataset.s === 'del') { for (const s2 of ss) { drop(book[i].ink, s2); drop(pend, s2); drop(undoStack, s2) } for (const it of its) { drop(pendTyped, it); removeItem(i, it) } pgs[i].ink.redraw(); clearSel(); saveBook(); syncBar() }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(inp.value) } else if (e.key === 'Escape') clearSel() });
    // move and resize work from a copy of where everything was when the drag began
    const drag = (h, resize) => h.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, b0 = Object.assign({}, sel.box), S0 = ss.map(s2 => ({p:s2.p.map(q => q.slice()), w:s2.w})), I0 = its.map(it => Object.assign({}, it));
      const mv = ev => {
        const dx = (ev.clientX - sx) / scale, dy = (ev.clientY - sy) / scale, W = b0.x1 - b0.x0 || 1, f = resize ? Math.max(0.2, Math.min(5, (W + dx) / W)) : 1;
        const T = (x, y) => resize ? [b0.x0 + (x - b0.x0) * f, b0.y0 + (y - b0.y0) * f] : [x + dx, y + dy];
        ss.forEach((s2, k) => { s2.p = S0[k].p.map(q => { const t = T(q[0], q[1]); return [t[0], t[1], q[2]] }); if (resize) s2.w = S0[k].w * f });
        its.forEach((it, k) => { const o = I0[k];
          if (it.kind === 'arrow') { const a = T(o.x1, o.y1), z = T(o.x2, o.y2); Object.assign(it, {x1:a[0], y1:a[1], x2:z[0], y2:z[1]}) }
          else { const t = T(o.x, o.y); it.x = t[0]; it.y = t[1]; if (resize) { it.w = o.w * f; it.fs = (o.fs || 1) * f; it.h = (o.h || LH) * f } }
          const old = elOf.get(it), ne = itemEl(it); if (old) old.replaceWith(ne) });
        const t0 = T(b0.x0, b0.y0), t1 = T(b0.x1, b0.y1); sel.box = {x0:t0[0], y0:t0[1], x1:t1[0], y1:t1[1]}; place(); pgs[i].ink.redraw();
      };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); saveBook() };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    drag(bx, false); drag(gr, true);
  }
  async function askLasso(q){
    const S = sel; if (!S) return; clearSel(); if (needKey(NB)) return;
    stat.textContent = 'Looking…';
    const job = {kind:'note', typed:q, lasso:true, hl:null, pg:S.pg, A:S.box, fresh:S.ss, img:snapshot(S.ss), scr:await screenBlocks(P.classList.contains('kb-full'), null, null)};
    if (NB.busy) { NB.queued = job; stat.textContent = 'Will read after this reply…'; return }
    send(NB, job);
  }

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
  const midX = e => { let x = 0; for (const t of e.touches) x += t.clientX; return x / e.touches.length };
  const spread = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  let fling = 0;
  // which page point is under a screen point (to keep it under the fingers when the zoom changes)
  function paperAt(x, y){ let best = null; pgs.forEach((p, i) => { const r = p.outer.getBoundingClientRect(), d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0; if (!best || d < best.d) best = {i, d, lx:(x - r.left) / scale, ly:(y - r.top) / scale} }); return best }
  function setZoom(z, at, to){
    z = Math.max(0.5, Math.min(3, z)); if (Math.abs(z - zoom) < 0.005) return; zoom = z; layoutBook();
    if (at && pgs[at.i]) { const r = pgs[at.i].outer.getBoundingClientRect(); scr.scrollLeft += r.left + at.lx * scale - to[0]; scr.scrollTop += r.top + at.ly * scale - to[1] }
  }
  scr.addEventListener('touchstart', e => {
    if (e.touches.length < 2) return; cancelAnimationFrame(fling);
    for (const p of pgs) p.ink.cancel();
    const y = midY(e), x = midX(e); gest = {y, ly:y, x, top:scr.scrollTop, left:scr.scrollLeft, t:performance.now(), v:0, d0:spread(e), k:1, zooming:false, at:paperAt(x, y)};
  }, {passive:false});
  scr.addEventListener('touchmove', e => {
    if (!gest || e.touches.length < 2) return; if (e.cancelable) e.preventDefault();
    const y = midY(e), x = midX(e), now = performance.now(), dt = Math.max(8, now - gest.t), k = spread(e) / gest.d0;
    if (!gest.zooming && Math.abs(k - 1) > 0.08) { gest.zooming = true; const br = book$.getBoundingClientRect(); book$.style.transformOrigin = (gest.x - br.left) + 'px ' + (gest.y - br.top) + 'px' }
    if (gest.zooming) { gest.k = Math.max(0.5 / zoom, Math.min(3 / zoom, k)); gest.ex = x; gest.ey = y; book$.style.transform = 'translate(' + (x - gest.x) + 'px,' + (y - gest.y) + 'px) scale(' + gest.k + ')'; return }
    gest.v = 0.7 * ((y - gest.ly) / dt) + 0.3 * gest.v; gest.t = now; gest.ly = y; scr.scrollTop = gest.top - (y - gest.y); scr.scrollLeft = gest.left - (x - gest.x);
  }, {passive:false});
  const endGest = e => {
    if (!gest || e.touches.length >= 2) return;
    const G = gest; gest = null; gestEnd = performance.now() + 350;
    if (G.zooming) { book$.style.transform = ''; setZoom(zoom * G.k, G.at, [G.ex, G.ey]); return }
    let v = performance.now() - G.t < 80 ? Math.max(-50, Math.min(50, G.v * 16)) : 0;
    const step = () => { if (Math.abs(v) < 0.4) return; scr.scrollTop -= v; v *= 0.94; fling = requestAnimationFrame(step) }; fling = requestAnimationFrame(step);
  };
  // a trackpad pinch (or Ctrl + wheel) zooms too
  let wz = 1, wzT = 0, wAt = null, wTo = null;
  scr.addEventListener('wheel', e => {
    if (!e.ctrlKey) return; e.preventDefault(); if (!wAt) { wAt = paperAt(e.clientX, e.clientY); wTo = [e.clientX, e.clientY] }
    wz *= Math.exp(-e.deltaY * 0.01); cancelAnimationFrame(wzT); wzT = requestAnimationFrame(() => { setZoom(zoom * wz, wAt, wTo); wz = 1; wAt = null });
  }, {passive:false});
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
  function nextBlank(i){ return book[i + 1] && blank(book[i + 1]) ? i + 1 : insertPage(i + 1) }   // the page right after i, new if that one is written on
  // the free spots offered to Claude for a reply to what is in box A on page i: just below it, beside it, the biggest other free
  // stretch of the page, and a fresh page right after it (N)
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
    out.push({pg:-1, key:'N', where:'the top of a fresh page right after this one', x:L, y:TOP, w:R - L, h:BOT - TOP});
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
    if (qOn()) {
      const bs = S === NB ? pend.map(x => pbox(x.s.p)) : pendPage.map(m => viewBox([m])), tq = S === NB && ed && /\?\s*$/.test(ed.ta.value);
      if (endsWithQ(bs) || tq) { S.out.status('Reading now…'); S.timer = setTimeout(() => commit(S), tq ? 900 : 500); return }
    }
    if (!claudeOn()) return;
    const typing = S === NB && ed && document.activeElement === ed.ta, wait = waitS() * (typing ? 2 : 1);
    S.out.status(typing ? 'Reading ' + wait + ' s after you stop typing (Enter sends now)…' : 'Reading in ' + wait + ' s…'); S.timer = setTimeout(() => commit(S), wait * 1000);
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
    for (const e of entries.slice(-KEEP)) h.push({role:'user', content:(e.kind === 'page' ? '(earlier they drew on the page' + (e.where ? ', at ' + e.where : '') + '; their marks:) ' : '(earlier in the notebook' + (e.nbPage ? ', page ' + e.nbPage : '') + ', they wrote:) ') + (e.read || e.typed || '')}, {role:'assistant', content:noMarks(e.reply) || '…'});
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
      ? job.nudge ? 'A quiet nudge: they ' + (job.nudge.reread ? 'came back to re-read' : 'just finished reading') + ' the section "' + job.nudge.name + '" and tapped the dot on the toolbar to hear your one thought on it. Offer the single most useful thing for understanding that section deeply: the key intuition, a connection they may have missed, or a gentle correction of something they marked there. One to three sentences, as a note beside the section heading. If nothing is genuinely worth adding, answer only NONE. No <at> or <point> here.'
      : job.follow ? 'A follow-up in the note thread you keep beside ' + (job.follow.hl ? 'a passage they highlighted (its text is in <highlight> above)' : 'some marks they drew on the page') + ' (outlined NEW on the screen image, though they are not new). The thread so far:\n<thread>\n' + job.thread.map(t => (t.q ? 'They asked: ' + t.q + '\n' : '') + 'You answered: ' + noMarks(t.a)).join('\n') + '\n</thread>\nTheir follow-up:\n<question>\n' + job.typed + '\n</question>\nAnswer it in the same note, building on the thread; do not repeat what you already said. No <at> or <point> here.'
      : job.lasso ? 'They drew a loop round part of the page (the dashed loop, outlined NEW on the screen image' + (job.marks.length > 1 ? '; their own marks inside it are part of what they mean' : '') + ') and asked about it:\n<question>\n' + job.typed + '\n</question>\n' + (job.near ? 'The loop is on or beside this part of the page:\n<near>\n' + job.near + '\n</near>\n' : '') + 'Answer that question about what is inside the loop, in a note that will sit beside it. No <at> or <point> here.'
      : job.typed ? 'They selected a passage on the page (its text is in <highlight> above; it is now highlighted in yellow and outlined NEW on the screen image) and asked about it:\n<question>\n' + job.typed + '\n</question>\nAnswer that question about that passage, in a note that will sit beside it. No <at> or <point> here.'
      : 'They drew on the page itself, over what is on their screen: their new marks are in the dashed box marked NEW on the screen image' + (job.scr.img ? '' : ' (the screen image could not be made, so you only have the text in view)') + '. ' + colourNote(job.marks) + ' ' + (job.near ? 'They are on or beside this part of the page:\n<near>\n' + job.near + '\n</near>\n' : '') + 'Read what they wrote or marked (a circle, an arrow, an underline, a highlight, a note in the margin, a sketch) and answer about exactly that, in a note that will sit beside their marks. No <at> or <point> here.'
      : job.lasso ? 'They drew a loop round this part of their notebook page (outlined NEW on the notebook image' + (job.img ? '; the handwriting in it is close up in the first image' : '') + ') and asked about it:\n<question>\n' + job.typed + '\n</question>\nAnswer that, about what they selected.\nFree spots for your reply:\n' + job.slots.map(q => q.key + ': ' + q.where + ', ' + room(q)).join('\n') + '\nStart with <at>letter</at>.'
      : (job.img ? 'What they just wrote by hand is in the NEW box on the notebook page and close up in the first image. ' + colourNote(job.fresh || []) : 'They wrote nothing by hand this time.') + (job.typed ? '\nThey typed this on the page (it is in the NEW box too):\n' + job.typed : '') +
        '\nFree spots for your reply:\n' + job.slots.map(q => q.key + ': ' + q.where + ', ' + room(q)).join('\n') + '\nStart with <at>letter</at>.'});
    let shown = 0, queue = [], drip = 0, hold = 0, stopped = false;
    const replyPart = raw => { const i = raw.indexOf('</read>'); const r = i >= 0 ? raw.slice(i + 7) : (/^\s*<(read|at)/.test(raw) || raw.length < 6 ? '' : raw); return r.replace(/<point>[\s\S]*?<\/point>/g, '').replace(/<at>[\s\S]*?<\/at>/g, '').replace(/^\s+/, '') };
    const target = () => reply || (reply = S.out.place(job, (rawNow.match(/<at>\s*([A-Z])\s*<\/at>/i) || [])[1]));
    const pump = () => { if (drip) return; drip = setInterval(() => {
      if (performance.now() < hold) return;
      if (!queue.length) { clearInterval(drip); drip = 0; return }
      const w = queue.shift(), R = target();
      if (typeof w === 'string') R.appendChild(txt(w, R));
      else { const b = sketch(w.svg); if (b) { R.appendChild(b); hold = performance.now() + inkIn(b) } }
      S.out.follow(job);
    }, 70) };
    const words = t => queue.push(...(t.match(/\[\[[^\]]*\]\]\S*\s*|\S+\s*|\s+/g) || []));
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
        if (a < 0 && !stopped) { upto = r.lastIndexOf(' ') + 1; const lt = r.lastIndexOf('<'); if (lt >= shown && lt < upto) upto = lt; const lb = r.lastIndexOf('[[', upto); if (lb >= shown && lb < upto) { const rb = r.indexOf(']]', lb); if (rb < 0) upto = lb; else if (rb + 2 > upto) upto = rb + 2 } }   // a [[page link]] is never cut in two
        if (upto <= shown) return;
        words(r.slice(shown, upto)); shown = upto; pump();
        if (a < 0) return;
      }
    };
    const drained = () => new Promise(res => { const w = () => (queue.length || drip) ? setTimeout(w, 80) : res(); w() });
    try {
      S.out.status('Reading…');
      let msgs = noteHistory().concat([{role:'user', content}]), before = '', r, cost = 0;
      for (let turn = 0; ; turn++) {
        r = await stream(SYS_NOTE, msgs, 'low', 4000, (raw, end) => { if (!end) S.out.status('Writing…'); feed(before + raw, end) });
        cost += r.cents; const uses = r.content.filter(b => b.type === 'tool_use');
        if (r.stop !== 'tool_use' || !uses.length || turn >= 4) break;
        before += r.raw; msgs = msgs.concat([{role:'assistant', content:r.content}]);
        const results = []; for (const u of uses) { S.out.status(u.name === 'search_kb' ? 'Searching the knowledge base for "' + (u.input.query || '') + '"…' : 'Reading ' + kbTitle(u.input.path) + '…'); results.push({type:'tool_result', tool_use_id:u.id, content:await runTool(u)}) }
        msgs = msgs.concat([{role:'user', content:results}]);
      }
      r = Object.assign({}, r, {raw:before + r.raw, cents:cost});
      const m2 = r.raw.match(/<read>([\s\S]*?)<\/read>/), text = replyPart(r.raw).trim();
      await drained();
      if (!text) { if (S.out.empty) S.out.empty(job, reply); else target().innerHTML = '<span class="kb-err">' + (r.stop === 'refusal' ? 'Claude declined to answer this one.' : 'No reply.') + '</span>' }
      else if (S.out.done) S.out.done(job, text, r.raw);
      S.out.status(!text && r.stop === 'refusal' ? 'Claude declined to answer this one. ' + costLine(r) : costLine(r));
      const img = job.kind === 'page' ? (job.scr.img ? await thumb(job.scr.img, job.box, job.scr.k) : null) : (job.img ? await thumb(job.img) : null);
      if (job.kind === 'note' && m2 && m2[1].trim() && book[job.pg]) { (book[job.pg].reads = book[job.pg].reads || []).push({t:Date.now(), text:m2[1].trim(), box:job.A}); saveBook() }
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
  // the element a mark or note is pinned to: its path, checked against its quote; refound by the quote if the page changed
  const lostSet = new Set();
  function anchorOf(x){
    const e = anchorEl(x.a); if (!x.qt) return e;
    const k = x.a + '|' + x.qt; if (anchors.has(k)) { const c = anchors.get(k); if (c === null || c.isConnected) return c }
    let f = e && normT(e.textContent).startsWith(x.qt.slice(0, 60)) ? e : refind(x.qt);
    anchors.set(k, f || null); if (!f) { lostSet.add(x); return null } lostSet.delete(x);
    if (f !== e) { x.a = pathOf(f); anchors.set(x.a + '|' + x.qt, f); saveBook() }
    return f;
  }
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
  function frameOf(x){ const e = anchorOf(x); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width && !r.height) return null; return {x:r.left, y:r.top, s:x.aw ? r.width / x.aw : 1, e} }
  // a mark's path: smooth curves through the pen's points (a snapped shape keeps its corners)
  const pathD = (p, sh) => {
    if (p.length === 1) return `M${p[0][0]} ${p[0][1]}h0.1`;
    if (sh || p.length < 3) return 'M' + p.map(q => r1(q[0]) + ' ' + r1(q[1])).join('L');
    let d = `M${r1(p[0][0])} ${r1(p[0][1])}`; for (let i = 1; i < p.length - 1; i++) { const m = mid(p[i], p[i + 1]); d += `Q${r1(p[i][0])} ${r1(p[i][1])} ${r1(m[0])} ${r1(m[1])}` }
    return d + `L${r1(p[p.length - 1][0])} ${r1(p[p.length - 1][1])}`;
  };
  const markW = m => m.h ? m.w : m.w * (0.55 + 0.75 * (m.p.reduce((a, q) => a + q[2], 0) / m.p.length));
  function styleMark(g, m){
    g.setAttribute('fill', 'none'); g.setAttribute('stroke', m.c || 'currentColor'); g.setAttribute('stroke-width', markW(m).toFixed(2));
    g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round'); if (m.h) g.setAttribute('stroke-opacity', '0.35');
    if (m.dash) { g.style.stroke = 'var(--acc)'; g.setAttribute('stroke-dasharray', '7 6'); g.setAttribute('stroke-opacity', '0.55'); g.setAttribute('stroke-width', '1.6') } else g.style.stroke = '';
  }
  function markNode(m){ const g = document.createElementNS(NS, 'path'); styleMark(g, m); g.setAttribute('d', pathD(m.p, m.sh)); marksSvg.appendChild(g); markEl.set(m, g); return g }
  function placeMarks(){
    const o = marksSvg.getBoundingClientRect(), seen = new Map();
    for (const m of marks) {
      const g = markEl.get(m) || markNode(m), k = m.a + '|' + m.aw; if (!seen.has(k)) seen.set(k, frameOf(m)); const f = seen.get(k);
      if (!f) { g.style.display = 'none'; continue }
      g.style.display = ''; g.setAttribute('transform', `translate(${(f.x - o.left).toFixed(1)} ${(f.y - o.top).toFixed(1)}) scale(${f.s.toFixed(4)})`);
    }
    const ob = notesBox.getBoundingClientRect(); for (const n of notes) placeNote(n, ob);
    layoutNotes(o, ob);
  }
  // open notes never cover each other: in order down the page, each is pushed below any earlier one it would overlap (only where it
  // shows; where it belongs is kept). A note shown away from its marks gets a thin line to them. Dots carry the note's number.
  const links = document.createElementNS(NS, 'g'); links.setAttribute('class', 'kb-links'); marksSvg.appendChild(links);
  function layoutNotes(o, ob){
    document.documentElement.classList.toggle('kb-narrow', innerWidth < 700);
    const shown = [];
    notes.forEach((n, k) => { const e = noteEl.get(n); if (e) e.querySelector('.kb-dot').textContent = n.resolved ? '\u2713' : String(k + 1) });
    const open = notes.map(n => [n, noteEl.get(n)]).filter(([n, e]) => e && !e.hidden && !e.classList.contains('kb-folded') && !(innerWidth < 700 && n !== activeNote))
      .map(([n, e]) => ({n, e, top:parseFloat(e.style.top), left:parseFloat(e.style.left), w:e.offsetWidth, h:e.offsetHeight})).sort((a, b) => a.top - b.top);
    for (const x of open) { for (const y of shown) if (x.left < y.left + y.w && x.left + x.w > y.left && x.top < y.top + y.h + 8) x.top = y.top + y.h + 8; x.e.style.top = x.top + 'px'; shown.push(x) }
    links.innerHTML = ''; if (links.parentNode !== marksSvg || links !== marksSvg.lastChild) marksSvg.appendChild(links);
    for (const x of open) {
      const ms = (x.n.marks || []).map(id => marks.find(m => m.id === id)).filter(Boolean), b = ms.length && viewBox(ms); if (!b) continue;
      const nx0 = x.left + ob.left, ny0 = x.top + ob.top, nx1 = nx0 + x.w, ny1 = ny0 + x.h;
      const px = Math.max(b.x0, Math.min((nx0 + nx1) / 2, b.x1)), py = Math.max(b.y0, Math.min((ny0 + ny1) / 2, b.y1));
      const qx = Math.max(nx0, Math.min(px, nx1)), qy = Math.max(ny0, Math.min(py, ny1)); if (Math.hypot(qx - px, qy - py) < 28) continue;
      const l = document.createElementNS(NS, 'path'); l.setAttribute('d', `M${r1(qx - o.left)} ${r1(qy - o.top)}L${r1(px - o.left)} ${r1(py - o.top)}`); links.appendChild(l);
    }
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
    if (tool === 'lasso') { clearPsel(); const o = marksSvg.getBoundingClientRect(), g = document.createElementNS(NS, 'path'); g.setAttribute('fill', 'none'); g.style.stroke = 'var(--acc)'; g.setAttribute('stroke-width', '2'); g.setAttribute('stroke-dasharray', '7 6'); marksSvg.appendChild(g); live = {id:e.pointerId, la:true, o, g, p:[[r1(e.clientX - o.left), r1(e.clientY - o.top), 0.5]]}; return }
    clearTimeout(PG.timer); PG.out.status('');
    const o = marksSvg.getBoundingClientRect(), m = Object.assign({p:[[r1(e.clientX - o.left), r1(e.clientY - o.top), e.pointerType === 'pen' ? (e.pressure || 0.3) : 0.5]]}, curStyle());
    live = {id:e.pointerId, m, o, g:document.createElementNS(NS, 'path'), hx:m.p[0][0], hy:m.p[0][1]}; styleMark(live.g, m); live.g.setAttribute('d', pathD(m.p, m.sh)); marksSvg.appendChild(live.g);
    holdLive(live);
  }, true);
  const holdLive = L => { clearTimeout(L.ht); L.ht = setTimeout(() => { if (live !== L || L.snapped) return; const q = snapShape(L.m.p); if (!q) return; L.m.p = q; L.m.sh = true; L.snapped = true; L.g.setAttribute('d', pathD(q, true)) }, 550) };
  document.addEventListener('pointermove', e => {
    if (!live || e.pointerId !== live.id) return; e.preventDefault(); e.stopPropagation();
    if (live.er) { erasePage(e.clientX, e.clientY); return }
    if (live.la) { live.p.push([r1(e.clientX - live.o.left), r1(e.clientY - live.o.top), 0.5]); live.g.setAttribute('d', 'M' + live.p.map(q => q[0] + ' ' + q[1]).join('L') + 'Z'); return }
    if (live.snapped) return;
    const m = live.m, o = live.o, evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const x of (evs.length ? evs : [e])) { const p = [r1(x.clientX - o.left), r1(x.clientY - o.top), x.pointerType === 'pen' ? (x.pressure || 0.3) : 0.5], q = m.p[m.p.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 0.8) m.p.push(p); if (Math.hypot(p[0] - live.hx, p[1] - live.hy) > 3) { live.hx = p[0]; live.hy = p[1]; holdLive(live) } }
    live.g.setAttribute('d', pathD(m.p, m.sh));
  }, true);
  const endLive = e => {
    if (!live || e.pointerId !== live.id) return; e.stopPropagation(); const L = live; live = null; lastStroke = performance.now();
    clearTimeout(L.ht); if (L.er) { saveBook(); return }
    if (L.la) { lassoPage(L); return }
    if (scratchOn() && !L.m.sh && isScratch(L.m.p) && scratchPage(L)) return;
    pin(L.m, L.o, L.g); const pv = marks[marks.length - 2]; L.m.g = pv && !pv.dash && pv.a === L.m.a && L.m.t - pv.t < 8000 ? pv.g || pv.id : L.m.id;
    pendPage.push(L.m); saveBook(); arm(PG);
  };
  // ---- the lasso on the page: a loop selects the marks mostly inside it and the part of the page under it; the box can be moved
  // (the marks with it), the marks deleted, or the region asked about (the loop stays as a faint dashed mark the note is pinned to) ----
  const psel$ = el('div', {id:'kbPsel'}); document.body.appendChild(psel$);
  let psel = null;
  function clearPsel(){ if (psel) { psel.g.remove(); psel = null } psel$.innerHTML = '' }
  function lassoPage(L){
    const poly = L.p; if (poly.length < 4 || plen(poly) < 40) { L.g.remove(); return }
    const o = marksSvg.getBoundingClientRect(), ms = marks.filter(m => { const f = frameOf(m); if (!f) return false; const pts = m.p.map(q => [f.x - o.left + q[0] * f.s, f.y - o.top + q[1] * f.s]); return pts.filter(q => pip(q[0], q[1], poly)).length >= pts.length * 0.6 });
    psel = {g:L.g, poly, o, ms};
    const b = pbox(poly), ob = psel$.getBoundingClientRect(), off = [o.left - ob.left, o.top - ob.top], k = ms.length;
    const bx = el('div', {class:'kb-selbox'}), br = el('div', {class:'kb-selbar'}, '<div class="kb-pr"><input type="text" placeholder="Ask about this…" enterkeyhint="send"><button type="button" class="kb-go" data-s="ask">Ask</button>' + (k ? '<button type="button" data-s="del">Delete ' + k + ' mark' + (k > 1 ? 's' : '') + '</button>' : '') + '<button type="button" data-s="done" aria-label="Done">&#x2715;</button></div>' + chipsHtml());
    Object.assign(bx.style, {left:(b.x0 + off[0] - 6) + 'px', top:(b.y0 + off[1] - 6) + 'px', width:(b.x1 - b.x0 + 12) + 'px', height:(b.y1 - b.y0 + 12) + 'px', background:'transparent', borderColor:'transparent', cursor:k ? 'move' : 'default'});
    const W = Math.min(420, innerWidth - 24); Object.assign(br.style, {left:Math.max(scrollX + 8, Math.min(scrollX + innerWidth - W - 8, b.x0 + off[0])) + 'px', top:(b.y1 + off[1] + 10) + 'px'});
    psel$.append(bx, br);
    const inp = br.querySelector('input'), ask = q => { if (q && q.trim()) askPageLasso(q.trim()) };
    br.addEventListener('pointerdown', e => e.stopPropagation(), true);
    br.addEventListener('click', e => {
      if (chipClick(e, inp, ask)) return; const t = e.target.closest('[data-s]'); if (!t) return;
      if (t.dataset.s === 'ask') ask(inp.value); else if (t.dataset.s === 'done') clearPsel();
      else if (t.dataset.s === 'del') { for (const m of ms) removeMark(m); clearPsel(); saveBook(); syncBar() }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(inp.value) } else if (e.key === 'Escape') clearPsel() });
    if (k) bx.addEventListener('pointerdown', e => {   // drag the selection: its marks move with it
      e.preventDefault(); e.stopPropagation(); bx.setPointerCapture(e.pointerId); const sx = e.clientX, sy = e.clientY, M0 = ms.map(m => m.p.map(q => q.slice())), l0 = parseFloat(bx.style.left), t0 = parseFloat(bx.style.top), P0 = psel.poly.map(q => q.slice());
      const mv = ev => { const dx = ev.clientX - sx, dy = ev.clientY - sy;
        ms.forEach((m, j) => { const f = frameOf(m) || {s:1}; m.p = M0[j].map(q => [r1(q[0] + dx / f.s), r1(q[1] + dy / f.s), q[2]]); const g = markEl.get(m); if (g) g.setAttribute('d', pathD(m.p, m.sh)) });
        psel.poly = P0.map(q => [q[0] + dx, q[1] + dy, q[2]]); psel.g.setAttribute('d', 'M' + psel.poly.map(q => q[0] + ' ' + q[1]).join('L') + 'Z');
        bx.style.left = (l0 + dx) + 'px'; bx.style.top = (t0 + dy) + 'px'; br.style.top = (parseFloat(bx.style.top) + parseFloat(bx.style.height) + 4) + 'px' };
      const up = () => { bx.removeEventListener('pointermove', mv); bx.removeEventListener('pointerup', up); bx.removeEventListener('pointercancel', up); saveBook() };
      bx.addEventListener('pointermove', mv); bx.addEventListener('pointerup', up); bx.addEventListener('pointercancel', up);
    });
  }
  async function askPageLasso(q){
    const S = psel; if (!S) return; psel = null; psel$.innerHTML = ''; if (needKey(PG)) { S.g.remove(); return }
    // the loop itself is kept as a faint dashed mark, so the note has something to stay beside and to be reopened from
    const m = {p:S.poly.concat([S.poly[0]]).map(q => [q[0], q[1], 0.5]), c:null, w:1.6, dash:true}; styleMark(S.g, m); pin(m, S.o, S.g); saveBook();
    const ms = [m].concat(S.ms);
    PG.out.status('Looking…');
    const job = {kind:'page', typed:q, lasso:true, hl:null, marks:ms, box:viewBox([m]), near:nearText([m]), scr:await screenBlocks(false, ms, null)};
    if (PG.busy) { PG.queued = job; PG.out.status('Will read after this reply…'); return }
    send(PG, job);
  }
  // a scratch-out over marks on the page: the marks mostly under it go, and so does the scratch
  function scratchPage(L){
    const o = marksSvg.getBoundingClientRect(), b = pbox(L.m.p); let hit = false;
    for (const m of marks.slice()) { const f = frameOf(m); if (!f) continue; if (mostlyIn(m.p.map(q => [f.x - o.left + q[0] * f.s, f.y - o.top + q[1] * f.s]), b)) { removeMark(m); hit = true } }
    if (!hit) return false;
    L.g.remove(); saveBook(); syncBar(); return true;
  };
  // keep a mark drawn in layer coordinates (o: the layer's rect then), pinned to its element: points relative to the element's corner
  function pin(m, o, g){
    const b = bbox([m]), an = anchorFor(o.left + (b.x0 + b.x1) / 2, o.top + (b.y0 + b.y1) / 2), r = an.getBoundingClientRect();
    m.id = m.id || newId(); m.a = pathOf(an); m.qt = quoteOf(an); m.aw = Math.round(r.width) || 1; const dx = r.left - o.left, dy = r.top - o.top;
    m.p = m.p.map(q => [r1(q[0] - dx), r1(q[1] - dy), Math.round(q[2] * 100) / 100]); m.t = Date.now();
    marks.push(m); if (g) { markEl.set(m, g); g.setAttribute('d', pathD(m.p, m.sh)) } placeMarks(); undoStack.push({m});
  }

  // ---- the Pencil hovering (iPad with hover support, and pens elsewhere): a dot the size and colour of the nib under it ----
  const nib = el('div', {id:'kbNib', hidden:''}); document.body.appendChild(nib); let nibT = 0;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'pen' || e.buttons) { if (!nib.hidden) nib.hidden = true; return }
    const t = e.target, inNb = !!(t && t.closest && t.closest('#kbBuddy .kd-pg'));
    if (!(inNb ? tool === 'pen' || tool === 'hl' : (tool === 'pen' || tool === 'hl') && onPage(e))) { nib.hidden = true; return }
    const st = curStyle(), w = Math.max(4, st.w * (inNb ? scale : 1) * (st.h ? 1 : 0.9));
    Object.assign(nib.style, {left:e.clientX + 'px', top:e.clientY + 'px', width:w + 'px', height:(st.h ? w * 0.6 : w) + 'px', background:st.c || (inNb ? inkColor : getComputedStyle(document.body).color), opacity:st.h ? 0.45 : 0.75, borderRadius:st.h ? '3px' : '50%'});
    nib.hidden = false; clearTimeout(nibT); nibT = setTimeout(() => { nib.hidden = true }, 700);
  }, true);
  document.addEventListener('pointerdown', () => { nib.hidden = true }, true);

  // ---- select text on the page (Read or Text tool): a small box asks Claude about it; the passage is highlighted in yellow and the
  // answer comes as a note beside it, like a reply to a mark ----
  const pop = el('div', {id:'kbAskPop', hidden:'', role:'dialog', 'aria-label':'Ask Claude about the selection'}, '<div class="kb-pr"><input type="text" placeholder="Ask Claude about this…" enterkeyhint="send" aria-label="Your question"><button type="button" data-ask>Ask</button></div><div class="kb-chipsbox"></div>');
  document.body.appendChild(pop);
  const popIn = pop.querySelector('input');
  pop.addEventListener('click', e => { chipClick(e, popIn, q => askSel(q)) });
  function showPop(){
    if (!hl || !hl.rects.length) return;
    const last = hl.rects[hl.rects.length - 1], first = hl.rects[0], w = Math.min(380, innerWidth - 16);
    let y = last.y - scrollY + last.h + 12; if (y + 90 > innerHeight) y = Math.max(8, first.y - scrollY - 96);
    const x = Math.max(8, Math.min(innerWidth - w - 8, last.x - scrollX + last.w / 2 - w / 2));
    pop.querySelector('.kb-chipsbox').innerHTML = chipsHtml(); Object.assign(pop.style, {left:x + 'px', top:y + 'px'}); pop.hidden = false;
  }
  function hidePop(){ pop.hidden = true; popIn.value = '' }
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target)) setTimeout(() => { if (document.activeElement !== popIn || !popIn.value.trim()) { const sel = getSelection(); if (!sel || sel.isCollapsed) hidePop() } }, 300) }, true);
  addEventListener('scroll', () => { if (!pop.hidden && !popIn.value.trim() && document.activeElement !== popIn && hl && hl.rects.length) { const q = hl.rects[hl.rects.length - 1]; const y = q.y - scrollY; if (y < -40 || y > innerHeight + 40) hidePop(); else showPop() } }, {passive:true});
  const ask = () => { const q = popIn.value.trim(); if (q) askSel(q) };
  pop.querySelector('[data-ask]').addEventListener('click', ask);
  popIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask() } else if (e.key === 'Escape') hidePop() });
  async function askSel(q){
    const h = hl; if (!h) return; hidePop(); try { getSelection().removeAllRanges() } catch(e) {} hl = null; showHl();
    if (needKey(PG)) return;
    const mid = h.rects[0] && noteAt(h.rects[0].x - scrollX + h.rects[0].w / 2, h.rects[0].y - scrollY + h.rects[0].h / 2);
    if (mid && mid.hl) return followUp(mid, q);   // the same passage asked about again: one thread
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

  // ---- Claude's notes on the page: each is the thread about one set of marks (a highlight with its questions, or a drawing): every
  // turn is kept, and a reply box at its foot asks a follow-up. Tapping the marks (with Read or Text) opens the thread ----
  const turnsOf = n => n.turns || (n.turns = [{q:n.q || '', a:n.text || ''}]);   // notes saved before threads had one turn
  function turnEl(t){
    const d = el('div', {class:'kb-turn'});
    if (t.q) d.appendChild(el('div', {class:'kb-nq'}, 'You: ' + esc(t.q)));
    const a = el('div', {class:'kb-na kb-ink'}); d.appendChild(a);
    for (const x of replyPieces(t.a || '')) { if (typeof x === 'string') a.appendChild(txt(x, a)); else { const b = sketch(x.svg); if (b) a.appendChild(b) } }
    return d;
  }
  let noteZ = 1;
  function noteNode(n){
    const e = el('div', {class:'kb-note' + (n.fold || n.resolved ? ' kb-folded' : '') + (n.resolved ? ' kb-resolved' : ''), role:'note', 'aria-label':"Claude's note"}, '<div class="kb-nh"><b>Claude</b><span class="kb-sp"></span><button type="button" data-n="resolve" title="Resolve: done with this; it shrinks to a tick on the page and stays in the overview" aria-label="Resolve">&#x2713;</button><button type="button" data-n="fold" title="Fold to a dot" aria-label="Fold">&#x2013;</button><button type="button" data-n="del" title="Delete this note (the marks stay)" aria-label="Delete">&#x2715;</button></div><div class="kb-nb"></div><form class="kb-nf"><input type="text" placeholder="Ask a follow-up…" enterkeyhint="send" aria-label="Ask a follow-up"><button type="submit" aria-label="Send">&#x2191;</button></form>' + chipsHtml() + '<button type="button" class="kb-dot" data-n="open" title="Open Claude\'s note" aria-label="Open Claude\'s note">C</button>');
    e.style.width = (n.w || 340) + 'px'; const body = e.querySelector('.kb-nb');
    for (const t of turnsOf(n)) body.appendChild(turnEl(t));
    e.addEventListener('click', ev => {
      const b = ev.target.closest('[data-n]'); if (!b) return; const a = b.dataset.n;
      if (a === 'open' && innerWidth < 700 && !n.fold && !n.resolved) { activate(n); schedule(); return }
      if (a === 'fold' || a === 'open') { n.fold = a === 'fold'; if (a === 'open') n.resolved = false; e.classList.toggle('kb-folded', n.fold); e.classList.toggle('kb-resolved', !!n.resolved); if (!n.fold) activate(n); saveBook(); schedule() }
      else if (a === 'resolve') { n.resolved = true; n.fold = true; e.classList.add('kb-folded', 'kb-resolved'); saveBook(); schedule() }
      else if (a === 'del') { drop(notes, n); e.remove(); noteEl.delete(n); saveBook() }
    });
    const f = e.querySelector('form'), inp = f.querySelector('input');
    f.addEventListener('submit', ev => { ev.preventDefault(); const q = inp.value.trim(); if (q) { inp.value = ''; followUp(n, q) } });
    e.querySelector('.kb-chips').addEventListener('pointerdown', ev => ev.preventDefault());   // keep the box focused so the chips stay
    e.querySelector('.kb-chips').addEventListener('click', ev => chipClick(ev, inp, q => followUp(n, q)));
    const h = e.querySelector('.kb-nh');
    h.addEventListener('pointerdown', ev => {
      if (ev.button > 0 || ev.target.closest('button')) return; ev.preventDefault(); h.setPointerCapture(ev.pointerId); front(e);
      const sx = ev.clientX, sy = ev.clientY, x0 = n.x, y0 = n.y, fr = frameOf(n) || {s:1};
      const mv = q => { n.x = x0 + (q.clientX - sx) / fr.s; n.y = y0 + (q.clientY - sy) / fr.s; placeNote(n, notesBox.getBoundingClientRect()) };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); saveBook() };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    e.addEventListener('pointerenter', () => lightMarks(n, 0)); e.addEventListener('pointerleave', () => lightMarks({}, 0));
    e.addEventListener('pointerdown', () => { if (activeNote !== n) activate(n) });
    notesBox.appendChild(e); noteEl.set(n, e); return e;
  }
  const front = e => { e.style.zIndex = String(++noteZ) };
  // the note being read: on top, and on a narrow screen the only one open (the others show as numbered dots)
  let activeNote = null;
  function activate(n){ activeNote = n; for (const [m, e] of noteEl) e.classList.toggle('kb-active', m === n); const e = noteEl.get(n); if (e) front(e); lightMarks(n, 1600) }
  // light up a note's marks for a moment (tapping or pointing at the note)
  let lightT = 0;
  function lightMarks(n, dur){
    const off = () => { for (const g of marksSvg.querySelectorAll('.kb-hot')) g.classList.remove('kb-hot'); for (const r of marksSvg.querySelectorAll('.kb-hotr')) r.remove() };
    clearTimeout(lightT); off();
    const ms = (n.marks || []).map(id => marks.find(x => x.id === id)).filter(Boolean); for (const m of ms) { const g = markEl.get(m); if (g) g.classList.add('kb-hot') }
    const b = ms.length && viewBox(ms);
    if (b) { const o = marksSvg.getBoundingClientRect(), r = document.createElementNS(NS, 'rect'); Object.entries({x:b.x0 - o.left - 8, y:b.y0 - o.top - 8, width:b.x1 - b.x0 + 16, height:b.y1 - b.y0 + 16, rx:6, class:'kb-hotr'}).forEach(([k, v]) => r.setAttribute(k, v)); marksSvg.appendChild(r) }
    if (dur) lightT = setTimeout(off, dur);
  }
  function placeNote(n, ob){
    const e = noteEl.get(n) || noteNode(n), f = frameOf(n);
    if (!f) { e.hidden = true; return } e.hidden = false;
    e.style.left = (f.x - ob.left + n.x * f.s) + 'px'; e.style.top = (f.y - ob.top + n.y * f.s) + 'px';
  }
  // open a note's thread (from a tap on its marks): unfolded, on top, scrolled into view, briefly lit
  function openNote(n){
    const e = noteEl.get(n); if (!e) return;
    n.fold = false; n.resolved = false; e.classList.remove('kb-folded', 'kb-resolved'); activate(n); saveBook(); placeMarks();
    const r = e.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight - 20) window.scrollBy({top:r.top - Math.min(innerHeight / 3, 160), behavior:'smooth'});
    e.classList.remove('kb-flash'); void e.offsetWidth; e.classList.add('kb-flash');
  }
  // the note whose marks are under a point (viewport), if any
  function noteAt(cx, cy){
    for (const n of notes.slice().reverse()) {
      if (!n.marks) continue;
      for (const id of n.marks) { const m = marks.find(x => x.id === id), f = m && frameOf(m); if (f && nearStroke(m.p, [(cx - f.x) / f.s, (cy - f.y) / f.s], (8 + markW(m) / 2) / f.s)) return n }
    }
    return null;
  }
  document.addEventListener('click', e => {
    if (penOn() || !onPage(e) || !notes.length) return; const sel = getSelection(); if (sel && !sel.isCollapsed) return;
    const n = noteAt(e.clientX, e.clientY); if (n) openNote(n);
  });
  // a follow-up in a note's thread: the same marks, the earlier turns, the new question
  async function followUp(n, q){
    if (needKey(PG)) return;
    const ms = (n.marks || []).map(id => marks.find(m => m.id === id)).filter(Boolean);
    PG.out.status('Looking…');
    const job = {kind:'page', typed:q, follow:n, thread:turnsOf(n).slice(), hl:n.hl ? {text:n.hl, where:'', rects:[]} : null, marks:ms, box:viewBox(ms), near:nearText(ms), scr:await screenBlocks(false, ms, n.hl ? {text:n.hl, where:'', rects:[]} : null)};
    if (PG.busy) { PG.queued = job; PG.out.status('Will read after this reply…'); return }
    send(PG, job);
  }
  // the page's side of a reply. A new note goes right by its marks: under a highlight, beside a drawing (right, else left, else under
  // it), below any open note it would cover, and pinned to the element the first mark is pinned to. A follow-up adds a turn.
  const PG = Session({kind:'page', status:s => toast(s, /¢/.test(s) ? 6000 : 0), typed:() => '',
    place(job){
      if (job.follow && !noteEl.get(job.follow)) job.follow = null;   // deleted while it waited
      if (job.follow) {
        const n = job.follow, e = noteEl.get(n), t = {q:job.typed, a:''}; turnsOf(n).push(t); const d = turnEl(t); e.querySelector('.kb-nb').appendChild(d);
        n.fold = false; e.classList.remove('kb-folded'); front(e); job.note = {n, e, t, d}; return d.querySelector('.kb-na');
      }
      const b = job.box || {x0:innerWidth / 2 - 20, y0:innerHeight / 3, x1:innerWidth / 2 + 20, y1:innerHeight / 3 + 20}, W = innerWidth, w = Math.min(340, W - 16);
      let x, y;
      if ((job.hl || job.lasso) && job.typed) { x = b.x0; y = b.y1 + 6 }   // a question about a selection or a loop: just under it
      else if (b.x1 + 12 + w <= W - 8) { x = b.x1 + 12; y = b.y0 }
      else if (b.x0 - 12 - w >= 8) { x = b.x0 - 12 - w; y = b.y0 }
      else { x = b.x0; y = b.y1 + 8 }
      x = Math.max(8, Math.min(x, W - w - 8));
      for (let k = 0; k < 12; k++) { const hit = [...noteEl.values()].find(e => { if (e.hidden || e.classList.contains('kb-folded')) return false; const r = e.getBoundingClientRect(); return r.left < x + w && r.right > x && r.top < y + 80 && r.bottom > y }); if (!hit) break; y = hit.getBoundingClientRect().bottom + 8 }
      if (job.nudge) { x = Math.min(b.x0 + 24, W - w - 8); y = b.y1 + 6 }
      const ar = job.anchorEl ? {a:pathOf(job.anchorEl), qt:quoteOf(job.anchorEl), aw:Math.round(job.anchorEl.getBoundingClientRect().width) || 1} : null;
      const m0 = job.marks[0], f = m0 ? frameOf(m0) : ar && frameOf(ar), an = m0 && f ? m0 : ar && f ? ar : {a:'', aw:0}, fr = f || frameOf({a:''}) || {x:0, y:0, s:1};
      const t = {q:job.typed || '', a:''};
      const n = {id:newId(), a:an.a, qt:an.qt != null ? an.qt : quoteOf(anchorEl(an.a)), aw:an.aw || Math.round(anchorEl('').getBoundingClientRect().width), x:Math.round((x - fr.x) / fr.s), y:Math.round((y - fr.y) / fr.s), w, turns:[t], marks:job.marks.map(m => m.id), hl:job.hl ? job.hl.text : '', fold:false, t:Date.now()};
      notes.push(n); const e = noteNode(n); activate(n); placeNote(n, notesBox.getBoundingClientRect()); placeMarks();
      const d = e.querySelector('.kb-turn'); job.note = {n, e, t, d}; return d.querySelector('.kb-na');
    },
    follow(job){ const nb = job.note.e.querySelector('.kb-nb'); nb.scrollTop = nb.scrollHeight },
    done(job, text){ if (job.nudge && /^\s*NONE\.?\s*$/i.test(text)) { this.empty(job); toast('Nothing to add on "' + job.nudge.name + '"', 4000); return } job.note.t.a = text; saveBook() },
    empty(job){ const J = job.note; if (!J) return; drop(turnsOf(J.n), J.t); J.d.remove(); if (!J.n.turns.length) { drop(notes, J.n); J.e.remove(); noteEl.delete(J.n) } saveBook() },
    fail(job, reply, msg){ const J = job.note; if (J && !J.d.querySelector('.kb-na').textContent.trim()) this.empty(job); else if (J) { J.t.a = J.d.querySelector('.kb-na').textContent; saveBook() } toast(msg, 9000) }});

  // ---- Pages: every notebook page as a small picture (tap to go there), and search over what is on them: Claude's reading of the
  // handwriting (kept from each exchange), typed notes and Claude's replies ----
  const plain = t => String(t || '').replace(/<svg[\s\S]*?<\/svg>/gi, ' [sketch] ').replace(/⟦[^⟧]*⟧/g, '').replace(/\s+/g, ' ').trim();
  function thumbOf(i){
    const c = document.createElement('canvas'), k = 0.25; c.width = PW * k; c.height = PH * k; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.scale(k, k);
    for (const s2 of book[i].ink) drawStroke(g, Object.assign({}, s2, {w:(s2.w || 2.6) * 1.8}), '#222');
    for (const it of book[i].items) { if (it.kind === 'arrow') continue; g.fillStyle = it.kind === 'reply' ? 'rgba(160,82,45,.35)' : 'rgba(0,0,0,.28)'; const w = Math.min(it.w, measureW(it)); for (let y = it.y + 10; y < it.y + (it.h || LH) - 4; y += LH) g.fillRect(it.x, y, w, 18) }
    return c.toDataURL('image/png');
  }
  function textsOf(i){
    const d = book[i], out = [];
    for (const r of d.reads || []) out.push({who:'You wrote', text:r.text, box:r.box});
    for (const it of d.items) if (it.kind === 'typed' || it.kind === 'reply') out.push({who:it.kind === 'typed' ? 'You typed' : 'Claude', text:plain(it.text), box:{x0:it.x, y0:it.y, x1:it.x + it.w, y1:it.y + (it.h || LH)}});
    return out;
  }
  function renderFind(){
    const q = fdIn.value.trim().toLowerCase(), used = book.map((d, i) => i).filter(i => !blank(book[i]));
    if (!q) {
      fdList.innerHTML = used.length ? '<div class="kd-grid">' + used.map(i => { const t = textsOf(i)[0]; return '<div class="kd-th" data-pg="' + i + '"><img alt="Page ' + (i + 1) + '" src="' + thumbOf(i) + '">Page ' + (i + 1) + (t ? '<span>' + esc(t.text.slice(0, 60)) + '</span>' : '') + '</div>' }).join('') + '</div>' : '<p class="kb-hint">Nothing written in the notebook yet.</p>';
      return;
    }
    const hits = []; for (const i of used) for (const t of textsOf(i)) { const at = t.text.toLowerCase().indexOf(q); if (at >= 0) hits.push({i, t, at}) }
    fdList.innerHTML = hits.length ? hits.map((h, k) => { const s0 = Math.max(0, h.at - 50), a = h.t.text.slice(s0, h.at), m = h.t.text.slice(h.at, h.at + q.length), z = h.t.text.slice(h.at + q.length, h.at + q.length + 80);
      return '<button type="button" class="kd-hit" data-hit="' + k + '"><b>Page ' + (h.i + 1) + ' · ' + h.t.who + '</b>' + (s0 ? '…' : '') + esc(a) + '<mark>' + esc(m) + '</mark>' + esc(z) + '</button>' }).join('') : '<p class="kb-hint">No match. Search covers Claude\'s reading of your handwriting, your typed notes and Claude\'s replies.</p>';
    fdList._hits = hits;
  }
  fdIn.addEventListener('input', renderFind);
  fdList.addEventListener('click', e => {
    const th = e.target.closest('[data-pg]'), hit = e.target.closest('[data-hit]');
    if (th) goPaper(+th.dataset.pg, null); else if (hit) { const h = fdList._hits[+hit.dataset.hit]; goPaper(h.i, h.t.box) }
  });
  // back to the notebook, at a page (and a place on it, briefly outlined)
  function goPaper(i, box){
    sub = null; show();
    requestAnimationFrame(() => { const p = pgs[i]; if (!p) return; const y = box ? box.y0 : 0;
      scr.scrollTop = Math.max(0, p.outer.offsetTop + y * scale - (box ? scr.clientHeight / 3 : 10));
      if (box) { const f = el('div', {class:'kd-flash'}); Object.assign(f.style, {left:(box.x0 - 10) + 'px', top:(box.y0 - 8) + 'px', width:(box.x1 - box.x0 + 20) + 'px', height:(box.y1 - box.y0 + 16) + 'px'}); p.items.appendChild(f); setTimeout(() => f.remove(), 1700) } });
  }

  // ---- the overview: every group of marks on this page in reading order (a note's marks together; other marks drawn close in time
  // on the same element together), filterable by kind, colour and resolved; tap one to go there ----
  let ovF = {kind:'all', col:null, done:false};
  function groupsNow(){
    const byNote = new Map(), out = [];
    for (const n of notes) for (const id of n.marks || []) byNote.set(id, n);
    const seen = new Set();
    for (const n of notes) { const ms = (n.marks || []).map(id => marks.find(m => m.id === id)).filter(Boolean); out.push({n, ms}); for (const m of ms) seen.add(m) }
    const loose = new Map(); for (const m of marks) if (!seen.has(m)) { const k = m.g || m.id; if (!loose.has(k)) loose.set(k, []); loose.get(k).push(m) }
    for (const ms of loose.values()) out.push({n:null, ms});
    for (const g of out) { const m = g.ms[0], e = m ? anchorOf(m) : g.n && anchorOf(g.n); g.lost = !e; g.el = e || pageRoot(); g.y = m ? Math.min(...m.p.map(q => q[1])) : g.n ? g.n.y : 0 }
    return out.sort((a, b) => a.el === b.el ? a.y - b.y : (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }
  function kindOf(g){ if (g.n) return 'note'; if (g.ms.every(m => m.h)) return 'highlight'; return 'ink' }
  function renderOverview(){
    const M = means(), gs = groupsNow();
    const cols = [...new Set(gs.flatMap(g => g.ms.map(m => m.c || '')))];
    ovBar.innerHTML = '<div class="kb-chips">' + [['all', 'All'], ['note', 'With a note'], ['highlight', 'Highlights'], ['ink', 'Drawings']].map(([k, t]) => '<button type="button" data-k="' + k + '"' + (ovF.kind === k ? ' aria-pressed="true"' : '') + '>' + t + '</button>').join('') +
      cols.map(c => '<button type="button" data-col="' + c + '"' + (ovF.col === c ? ' aria-pressed="true"' : '') + '><i style="background:' + (c || 'var(--ink)') + '"></i>' + esc(M[c] || colName(c)) + '</button>').join('') +
      '<button type="button" data-done="1"' + (ovF.done ? ' aria-pressed="true"' : '') + '>Show resolved</button></div>';
    const list = gs.filter(g => (ovF.kind === 'all' || kindOf(g) === ovF.kind) && (ovF.col == null || g.ms.some(m => (m.c || '') === ovF.col)) && (ovF.done || !(g.n && g.n.resolved)));
    const lost = gs.filter(g => g.lost);
    if (!gs.length) { ovList.innerHTML = '<p class="kb-hint">No marks on this page yet. Choose the pen or the highlighter on the toolbar, or select some text and ask.</p>'; return }
    ovList.innerHTML = list.filter(g => !g.lost).map((g, k) => {
      const c = g.ms[0] ? g.ms[0].c || '' : '', w = where(g.el), kind = kindOf(g), turns = g.n ? turnsOf(g.n) : [];
      const head = (g.ms[0] && g.ms[0].dash ? 'Loop' : kind === 'highlight' ? 'Highlight' : kind === 'note' ? (g.n.hl ? 'Highlight' : 'Drawing') : 'Drawing') + (g.n ? ' · ' + turns.length + ' exchange' + (turns.length > 1 ? 's' : '') + (g.n.resolved ? ' · resolved' : '') : '') + (M[c] ? ' · ' + M[c] : '');
      const quote = g.n && g.n.hl ? g.n.hl : (g.el.innerText || g.el.textContent || '').replace(/\s+/g, ' ').trim();
      const q = turns.find(t => t.q), a = turns.length ? plain(turns[turns.length - 1].a) : '';
      return '<button type="button" class="kd-ovi" data-g="' + k + '"><i style="background:' + (g.ms[0] ? (c || 'var(--ink)') : 'var(--acc)') + '"></i><span><b>' + esc(head) + '</b>' + (w ? '<small>' + esc(w) + '</small>' : '') +
        '<q>' + esc(quote.slice(0, 140)) + (quote.length > 140 ? '…' : '') + '</q>' + (q ? '<em>You: ' + esc(q.q) + '</em>' : '') + (a ? '<em class="kd-ova">' + esc(a.slice(0, 120)) + (a.length > 120 ? '…' : '') + '</em>' : '') + '</span></button>' }).join('') || '<p class="kb-hint">Nothing matches these filters.</p>';
    ovList._g = list.filter(g => !g.lost);
    if (lost.length) ovList.insertAdjacentHTML('beforeend', '<h4 class="kd-relh">Unanchored: the page changed and these no longer find their place</h4>' + lost.map((g, k) => { const x = g.n || g.ms[0]; const t = g.n ? turnsOf(g.n).find(z => z.q || z.a) : null;
      return '<div class="kd-ovi"><i style="background:var(--bad,#c2703a)"></i><span><b>' + (g.n ? 'Note' : 'Marks') + '</b><q>' + esc((x.qt || '').slice(0, 140)) + '</q>' + (t ? '<em>' + esc(t.q || plain(t.a).slice(0, 120)) + '</em>' : '') + '<button type="button" data-lost="' + k + '">Delete</button></span></div>' }).join(''));
    ovList._lost = lost;
    relatedNotes().then(h => { if (h && !ovView.hidden) ovList.insertAdjacentHTML('beforeend', h) });
  }
  // the reader's notes on the pages this one builds on and the pages that build on it (the knowledge base's prerequisite map)
  async function relatedNotes(){
    await kbIndex(); if (!KBI) return '';
    const here = new URL('.', location.href).href, me = KBI.find(e => KBROOT + e.p + '/' === here); if (!me) return '';
    const rel = KBI.filter(e => e !== me && ((me.pre || []).includes(e.id) || (e.pre || []).includes(me.id))).slice(0, 20), out = [];
    for (const e of rel) {
      const r = await tx('readonly', st => st.get(new URL(e.p + '/', KBROOT).pathname), 'recs'); const ns = r && r.recs ? Object.values(r.recs).filter(x => x.k === 'note' && !x.del) : [];
      for (const n of ns) { const t = (n.turns || [{q:n.q, a:n.text}]).find(x => x.q || x.a); if (t) out.push({e, n, t}) }
    }
    if (!out.length) return '';
    return '<h4 class="kd-relh">From related pages</h4>' + out.slice(0, 30).map(({e, n, t}) => '<a class="kd-ovi" href="' + esc(KBROOT + e.p + '/') + '"><i style="background:var(--acc)"></i><span><b>' + esc(e.t) + '</b>' + (n.hl ? '<q>' + esc(n.hl.slice(0, 120)) + '</q>' : '') + (t.q ? '<em>You: ' + esc(t.q) + '</em>' : '') + '<em class="kd-ova">' + esc(plain(t.a).slice(0, 120)) + '</em></span></a>').join('');
  }
  ovBar.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k) ovF.kind = b.dataset.k; else if (b.dataset.col != null) ovF.col = ovF.col === b.dataset.col ? null : b.dataset.col; else if (b.dataset.done) ovF.done = !ovF.done; renderOverview() });
  ovList.addEventListener('click', e => {
    const d = e.target.closest('[data-lost]'); if (d) { const g = ovList._lost[+d.dataset.lost]; for (const m of g.ms) removeMark(m); if (g.n) { drop(notes, g.n); const ne = noteEl.get(g.n); if (ne) ne.remove(); noteEl.delete(g.n) } saveBook(); renderOverview(); return }
    const b = e.target.closest('[data-g]'); if (b) goGroup(ovList._g[+b.dataset.g]);
  });
  // go to a group of marks: its tab opened, scrolled to the middle of the screen, outlined for a moment, its note opened
  function showEl(e){ const tab = e.closest && e.closest('.tab'); if (tab && !tab.getClientRects().length) { const t = document.querySelector('[role=tab][data-t="' + tab.id + '"]'); if (t) t.click() } }
  function goGroup(g){
    if (P.classList.contains('kb-full')) close(); else { sub = null; show() }
    showEl(g.el);
    setTimeout(() => {
      placeMarks(); const b = g.ms.length ? viewBox(g.ms) : null, r = b ? {top:b.y0, bottom:b.y1} : g.el.getBoundingClientRect();
      window.scrollBy({top:(r.top + r.bottom) / 2 - innerHeight / 2, behavior:'smooth'});
      setTimeout(() => { placeMarks(); flashMarks(g.ms); if (g.n) openNote(g.n) }, 450);
    }, 120);
  }
  function flashMarks(ms){
    const b = ms.length && viewBox(ms); if (!b) return; const o = marksSvg.getBoundingClientRect(), r = document.createElementNS(NS, 'rect');
    Object.entries({x:b.x0 - o.left - 10, y:b.y0 - o.top - 10, width:b.x1 - b.x0 + 20, height:b.y1 - b.y0 + 20, rx:8, class:'kb-flashr'}).forEach(([k, v]) => r.setAttribute(k, v));
    marksSvg.appendChild(r); setTimeout(() => r.remove(), 1700);
  }

  // ---- quiet nudges: reading is followed section by section (the heading nearest above the upper part of the screen). Leaving a
  // section after a minute or more in it, or coming back to re-read one and staying 20 s, lights a dot on the toolbar (at most once per
  // section; only while Claude is on and the reader is not drawing or reading a reply). Nothing is sent until the dot is tapped ----
  const reading = {key:null, el:null, name:'', t0:0, seen:new Map(), offered:new Set(), cand:null};
  function sectionNow(){
    const tb = document.querySelector('[role=tab][aria-selected=true]'), tab = tb && document.getElementById(tb.dataset.t);
    let h = null; for (const x of (tab || pageRoot()).querySelectorAll('h2,h3')) { if (!x.getClientRects().length) continue; if (x.getBoundingClientRect().top < innerHeight * 0.45) h = x; else break }
    return h ? {key:(tb ? tb.dataset.t : '') + '|' + h.textContent.trim(), el:h, name:h.textContent.trim().replace(/\s+/g, ' ')} : null;
  }
  setInterval(() => {
    if (document.hidden || !nudgeOn() || !claudeOn() || !P.hidden || live || PG.busy) return;
    const now = Date.now(), s2 = sectionNow(), cur = reading.key;
    if (!s2 || s2.key === cur) { if (s2 && reading.cand && reading.cand.reread && now - reading.t0 > 20000) offerNudge(reading.cand); return }
    if (cur) { const spent = now - reading.t0, prev = reading.seen.get(cur) || 0; reading.seen.set(cur, prev + spent); if (spent > 60000) offerNudge({key:cur, el:reading.el, name:reading.name, reread:false}) }
    reading.cand = reading.seen.get(s2.key) > 20000 ? {key:s2.key, el:s2.el, name:s2.name, reread:true} : null;
    reading.key = s2.key; reading.el = s2.el; reading.name = s2.name; reading.t0 = now;
  }, 2000);
  let nudge = null;
  function offerNudge(c){ if (reading.offered.has(c.key) || nudge) return; reading.offered.add(c.key); reading.cand = null; nudge = c; const b = bar.querySelector('[data-b=nudge]'); b.hidden = false; b.title = 'Claude has a thought on "' + c.name + '"' + (c.reread ? ' (you came back to it)' : '') + '; tap to see it'; placeBar() }
  function dropNudge(){ nudge = null; bar.querySelector('[data-b=nudge]').hidden = true; placeBar() }
  async function takeNudge(){
    const c = nudge; dropNudge(); if (!c || needKey(PG)) return;
    showEl(c.el); PG.out.status('Thinking about "' + c.name + '"…');
    const job = {kind:'page', nudge:c, typed:'', hl:null, marks:[], anchorEl:c.el, box:(r => ({x0:r.left, y0:r.top, x1:r.right, y1:r.bottom}))(c.el.getBoundingClientRect()), near:'', scr:await screenBlocks(false, [], null)};
    if (PG.busy) { PG.queued = job; return }
    send(PG, job);
  }

  function renderLog(){
    const used = book.filter(p => !blank(p)).length, wipe = '<button type="button" data-a="wipe">Delete all</button>';
    if (!entries.length) { log.innerHTML = '<p class="kb-hint">Nothing yet. Every exchange in the notebook and on the page is listed here, kept in this browser only.</p>' + (used ? '<div class="kb-row"><span class="kb-meta">The notebook has ' + used + ' written page' + (used > 1 ? 's' : '') + '.</span>' + wipe + '</div>' : ''); return }
    log.innerHTML = '<div class="kb-row" style="margin:0 0 6px"><span class="kb-meta">' + entries.length + ' exchange' + (entries.length > 1 ? 's' : '') + ' on this page of the knowledge base, kept in this browser.</span>' + wipe + '</div>' +
      entries.slice().reverse().map(e => '<div class="kd-e"><time>' + esc(new Date(e.t).toLocaleString()) + (e.nbPage ? ' · notebook page ' + e.nbPage : e.kind === 'page' ? ' · drawn on the page' : '') + (e.where ? ' · ' + esc(e.where) : '') + '</time>' + (e.img ? '<img alt="Your handwriting" src="' + e.img + '">' : '') +
        '<div class="kd-me">' + esc(e.read || e.typed || '') + '</div><div class="kd-cl" data-i="' + entries.indexOf(e) + '"></div></div>').join('');
    for (const c of log.querySelectorAll('.kd-cl')) for (const x of replyPieces(entries[+c.dataset.i].reply || '')) { if (typeof x === 'string') c.appendChild(txt(x, c)); else { const b = sketch(x.svg); if (b) c.appendChild(b) } }
  }


  // ================= Settings and buttons =================
  function renderSet(){
    const k = store.get('key');
    setv.innerHTML = `<label for="kbBuddyKey">Claude API key</label>
<input id="kbBuddyKey" type="password" autocomplete="off" spellcheck="false" placeholder="${k ? 'saved (ending ' + esc(k.slice(-4)) + ')' : 'sk-ant-...'}">
<div class="kb-row"><button type="button" class="kb-go" data-a="save">Save</button>${k ? '<button type="button" data-a="forget">Forget key</button>' : ''}<span class="kb-meta"></span><button type="button" data-a="back">Back</button></div>
<p>The same key and model as Ask Claude on the other pages. Create a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>; API use is billed per message, separately from a Claude subscription.</p>
<label for="kbBuddyGh">Sync across devices: GitHub token</label>
<input id="kbBuddyGh" type="password" autocomplete="off" spellcheck="false" placeholder="${ghTok() ? 'saved (ending ' + esc(ghTok().slice(-4)) + ')' : 'github_pat_...'}">
<div class="kb-row"><button type="button" class="kb-go" data-a="ghsave">Save</button>${ghTok() ? '<button type="button" data-a="ghforget">Forget token</button><button type="button" data-a="ghsync">Sync now</button>' : ''}<span class="kb-meta" id="kbSyncSt"></span></div>
<label for="kbBuddyRepo">Notes repository</label><input id="kbBuddyRepo" value="${esc(ghRepo())}" spellcheck="false">
<p>Your marks, notes, notebook, History and these preferences sync through that private repository (one file per page). Make a fine-grained token at <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">github.com/settings/personal-access-tokens/new</a>: Repository access, Only select repositories, ${esc(ghRepo())}; Permissions, Repository permissions, Contents: Read and write. It is saved only in this browser, like the Claude key. Your Claude key, the toolbar's and window's places and the current pen stay on each device.</p>
<label for="kbBuddyModel">Model</label><select id="kbBuddyModel">${Object.keys(MODELS).map(m => '<option value="' + m + '"' + (m === model() ? ' selected' : '') + '>' + MODELS[m].name + '</option>').join('')}</select>
<label for="kbBuddyWait">When Claude answers</label><select id="kbBuddyWait">${WAITS.map(v => '<option value="' + v + '"' + (claudeOn() && v === waitS() ? ' selected' : '') + '>' + v + ' s after you stop writing' + (v === 3 ? ' (default)' : '') + '</option>').join('')}<option value="never"${claudeOn() ? '' : ' selected'}>Never by itself: only when you press Send</option></select>
<p>Typing waits twice as long (Enter sends at once). The Claude button on the toolbar switches between this wait and Send only.</p>
<label>What your colours mean</label><div class="kb-means">${COLORS.map(([c, n]) => '<span><i style="background:' + (c || 'var(--ink)') + '"></i><input data-mean="' + c + '" value="' + esc(means()[c] || '') + '" placeholder="' + n + '" aria-label="' + n + ' means"></span>').join('')}</div>
<p>Claude is told what a colour means when you use it, and the overview can filter by it.</p>
<label for="kbBuddyPrompts">One-tap prompts</label><textarea id="kbBuddyPrompts" rows="5" spellcheck="false">${esc(prompts().map(x => x.label + ': ' + x.text).join('\n'))}</textarea>
<p>One per line, "Label: what to ask". They appear under every Ask box; one ending in "…" is put in the box for you to finish.</p>
<label class="kb-ck"><input type="checkbox" id="kbBuddyNudge"${nudgeOn() ? ' checked' : ''}><span>Quiet nudges: when you finish a section you spent a while on, or come back to re-read one, a small dot appears on the toolbar; tap it for Claude's one thought on that section. Nothing is sent unless you tap.</span></label>
<label class="kb-ck"><input type="checkbox" id="kbBuddyQ"${qOn() ? ' checked' : ''}><span>A question mark sends at once: end what you write or type with "?" and Claude reads it straight away (even when Claude waits for Send).</span></label>
<label class="kb-ck"><input type="checkbox" id="kbBuddyScratch"${scratchOn() ? ' checked' : ''}><span>Scratch out to erase: a quick zigzag over your writing deletes it. Holding the pen still at the end of a stroke straightens it into a line, an ellipse or a box.</span></label>
<label class="kb-ck"><input type="checkbox" id="kbBuddySee"${seeOn() ? ' checked' : ''}><span>Let Claude see the screen: an image of the figures and animations in view, the text in view, the controls' values and your highlight, sent with each message.</span></label>
<p>The key is saved only in this browser. Each message sends this page's text, what you wrote, the screen as above (with your marks and Claude's notes on the page) and your recent exchanges from your browser straight to api.anthropic.com; your notebook and your marks on the page stay in this browser.</p>`;
    setv.querySelector('select').onchange = e => store.set('model', e.target.value);
    setv.querySelector('#kbBuddySee').onchange = e => mine.set('see', e.target.checked ? null : 'off');
    setv.querySelector('#kbBuddyQ').onchange = e => mine.set('qsend', e.target.checked ? null : 'off');
    for (const x of setv.querySelectorAll('[data-mean]')) x.onchange = () => { const m = {}; for (const y of setv.querySelectorAll('[data-mean]')) if (y.value.trim() !== (MEAN0[y.dataset.mean] || '')) m[y.dataset.mean] = y.value.trim(); mine.set('means', Object.keys(m).length ? JSON.stringify(m) : null); syncBar() };
    const nu = setv.querySelector('#kbBuddyNudge'); nu.onchange = () => mine.set('nudge', nu.checked ? null : 'off');
    setv.querySelector('#kbBuddyPrompts').onchange = e => { const v = e.target.value.trim(); mine.set('prompts', v && v !== PROMPTS0 ? v : null) };
    setv.querySelector('#kbBuddyScratch').onchange = e => mine.set('scratch', e.target.checked ? null : 'off');
    setv.querySelector('#kbBuddyWait').onchange = e => {
      const v = e.target.value;
      if (v === 'never') { mine.set('claude', 'off'); clearTimeout(PG.timer); clearTimeout(NB.timer); stat.textContent = '' }
      else { mine.set('wait', v === '3' ? null : v); mine.set('claude', null); arm(PG); arm(NB) }
      syncBar();
    };
    const inp = setv.querySelector('input'); if (!k) inp.focus(); setSync(syncState, syncMsg);
  }
  setv.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'kbBuddyKey') { e.preventDefault(); setv.querySelector('[data-a=save]').click() } });
  P.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]'); if (!a) return; e.preventDefault();
    const act = a.dataset.a;
    if (act === 'close') close();
    else if (act === 'full') setFull(!P.classList.contains('kb-full'));
    else if (act === 'pages') { sub = sub === 'pages' ? null : 'pages'; show() }
    else if (act === 'marks') { sub = sub === 'marks' ? null : 'marks'; show() }
    else if (act === 'find') { sub = sub === 'find' ? null : 'find'; show(); if (sub === 'find') fdIn.focus() }
    else if (act === 'set') { sub = sub === 'set' ? null : 'set'; show() }
    else if (act === 'back') { sub = null; show() }
    else if (act === 'save') { const v = setv.querySelector('#kbBuddyKey').value.trim(); if (v) store.set('key', v); sub = null; show() }
    else if (act === 'forget') { store.set('key', null); renderSet() }
    else if (act === 'ghsave') { const v = setv.querySelector('#kbBuddyGh').value.trim(), rp = setv.querySelector('#kbBuddyRepo').value.trim(); if (v) mine.set('ghToken', v); mine.set('ghRepo', rp && rp !== 'khalit7/kb-notes' ? rp : null); renderSet(); syncNow() }
    else if (act === 'ghforget') { mine.set('ghToken', null); setSync('off'); renderSet() }
    else if (act === 'ghsync') syncNow();
    else if (act === 'unhl') { hl = null; showHl() }
    else if (act === 'zoom') { const v = scr.getBoundingClientRect(), x = v.left + v.width / 2, y = v.top + v.height / 3; setZoom(1, paperAt(x, y), [x, y]) }
    else if (act === 'end') { grow(); const p = pgs[pgs.length - 1]; scr.scrollTo({top:p.outer.offsetTop - 10, behavior:'smooth'}) }
    else if (act === 'send') commit(NB);
    else if (act === 'wipe') {
      if (!confirm('Delete the whole notebook, your marks and Claude\'s notes on this page of the knowledge base, and their history? This cannot be undone.')) return;
      entries = []; renderLog();
      book = []; pgs = []; book$.innerHTML = ''; pend.length = 0; pendPage.length = 0; pendTyped.length = 0; ed = null; undoStack.length = 0; grow();
      marks = []; notes = []; marksSvg.innerHTML = ''; notesBox.innerHTML = ''; markEl.clear(); noteEl.clear(); saveBook(); syncBar();
    }
  });
  syncBar();
}
})();
