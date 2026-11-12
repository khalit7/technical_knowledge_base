// ---- Launch lab: shared helpers (step-animation controller, SVG helpers, render registration) ----
window.LA_H=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const renders=[];
  const onRender=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-launch']=window.TAB_RENDER['t-launch']||[]).push(f)};
  const tabVisible=()=>{const t=$('t-launch');return !!t&&!t.hidden&&t.offsetParent!==null};
  let rt=0;addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const rect=(x,y,w,h,fill,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?2:o.rx)+'" fill="'+fill+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.stroke?' stroke="'+o.stroke+'" stroke-width="'+(o.sw||1)+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  // the step animation is the template's RD.anim (21_js_rd_common.js, 2026-11-06 rules): plays by itself once half in view, pauses off
  // screen, stops for good on any control or at its last step, never moves by itself under reduced motion; o.list names its ol.sx step list.
  // A long replay the reader drives passes auto:false (a widget). sxFill writes the step list from the same captions the steps draw.
  function anim(o){const a=RD.anim(o);onRender(()=>a.redraw());return a}
  function sxFill(id,items){const L=document.getElementById(id);if(L)L.innerHTML=items.map(t=>'<li>'+t+'</li>').join('')}
  // predict-then-reveal drills: .la-pr blocks with .opts buttons (data-a="1" is right) and a hidden .ans
  function drills(root){root.querySelectorAll('.la-pr').forEach(p=>{p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    p.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));b.classList.add(b.dataset.a==='1'?'right':'wrong');
    const a=p.querySelector('.ans');if(a)a.hidden=false}))})}
  const fmt=(x,d)=>Number.isFinite(x)?x.toFixed(d==null?1:d):'n/a';
  return {RM,esc,$,onRender,width,svg,t,rect,line,seg,anim,sxFill,drills,fmt,tabVisible};
})();
