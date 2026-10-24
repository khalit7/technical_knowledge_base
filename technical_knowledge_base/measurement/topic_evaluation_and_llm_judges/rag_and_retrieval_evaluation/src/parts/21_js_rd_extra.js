// ---- Page additions to the template RD (kept apart so 21_js_rd_common.js stays the skill template) ----
// render and resize hooks for tabs other than Reading
RD.onRenderTab=(f,tab)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
RD.onResizeTab=(tab,f)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
// a Reading figure: draw now, on tab show and on resize, at the measured width
RD.fig=(id,draw)=>{const el=document.getElementById(id);if(!el)return null;const go=()=>{try{draw(el,RD.width(el))}catch(e){window.__jsErr&&window.__jsErr(String(e&&e.message||e))}};RD.onRender(go);RD.onResize(go);go();return go};
// text lines (SVG text does not wrap): one <text> per line
RD.lines=(x,y,arr,o)=>{o=o||{};return arr.map((s,i)=>'<text x="'+x+'" y="'+(y+i*(o.lh||15))+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.cls?' class="'+o.cls+'"':'')+(o.fill?' style="fill:'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>').join('')};
