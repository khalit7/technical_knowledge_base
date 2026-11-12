// ---- Cost lab: shared helpers (SVG, step-animation controller, render registration, numbers in prose) ----
window.CO=(function(){
  const D=window.CO_DATA;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tabVisible=()=>{const t=$('t-cost');return !!t&&!t.hidden&&t.offsetParent!==null};
  const renders=[];
  const onRender=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cost']=window.TAB_RENDER['t-cost']||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const rect=(x,y,w,h,fill,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?2:o.rx)+'" fill="'+fill+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.stroke?' stroke="'+o.stroke+'" stroke-width="'+(o.sw||1)+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.data?' '+o.data:'')+'/>'};
  const line=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  const pct=(x,d)=>(x*100).toFixed(d==null?0:d)+'%';
  const fs=x=>x>=100?Math.round(x).toLocaleString('en-US')+' s':x>=10?x.toFixed(1)+' s':x>=1?x.toFixed(2)+' s':Math.round(x*1000)+' ms';
  const num=(x,d)=>Number(x).toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  const usd=x=>x>=1e9?'$'+(x/1e9).toFixed(2)+'B':x>=1e6?'$'+(x/1e6).toFixed(1)+'M':x>=1e3?'$'+num(x/1e3,1)+'K':'$'+x.toFixed(2);
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';
  // the CSS colours resolved at draw time (light/dark)
  const col=n=>getComputedStyle(document.documentElement).getPropertyValue('--'+n).trim()||'#888';
  // the step animation is the template's RD.anim (21_js_rd_common.js, 2026-11-06 rules): plays by itself once half in view, pauses off
  // screen, stops for good on any control or at its last step, never moves by itself under reduced motion; o.list names its ol.sx step list.
  // A long replay the reader drives passes auto:false (a widget). sxFill writes the step list from the same captions the steps draw.
  function anim(o){const a=RD.anim(o);onRender(()=>a.redraw());return a}
  function sxFill(id,items){const L=document.getElementById(id);if(L)L.innerHTML=items.map(t=>'<li>'+t+'</li>').join('')}
  // predict-then-reveal boxes
  function pr(id){const box=$(id);if(!box)return;box.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    box.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.ok==='1');x.classList.toggle('wrong',x===b&&x.dataset.ok!=='1')});
    box.querySelector('.ans').hidden=false})}
  const runs=Object.fromEntries(D.alloc.map(a=>[a.run+'|'+a.system,a]));
  const run=n=>D.alloc.find(a=>a.run===n);
  return {D,RM,$,esc,tabVisible,onRender,width,svg,t,rect,line,seg,pct,fs,num,usd,stat,col,anim,sxFill,pr,run,runs};
})();
