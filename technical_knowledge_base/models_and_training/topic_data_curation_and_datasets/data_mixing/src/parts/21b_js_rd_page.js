// ---- Page additions to the RD template (data mixing, prefix mx2). The template (21_js_rd_common.js) stays unchanged ----
// 1. RD.onRender and RD.onResize take an optional tab id, so the Token-budget planner tab can register its redraws.
// 2. Charts inside a closed <details> were drawn at a fallback width; redraw them at the real width when the block opens.
(function(){
  const onR=RD.onRender,onZ=RD.onResize;
  RD.onRender=(f,tab)=>{if(!tab||tab==='t-read')return onR(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  RD.onResize=(f,tab)=>{if(!tab||tab==='t-read')return onZ(f);let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
  document.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));
})();
