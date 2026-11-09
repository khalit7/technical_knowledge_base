// ---- Dedup lab (t-dedup): shared helpers. Charts size from the measured width and redraw when the tab is shown or resized.
// Animations run only while their card is on screen in the visible tab, never start by themselves: they wait on step 0 for the reader (2026-10-24).
window.DDX=(function(){
  const TAB='t-dedup';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=(x,d)=>(d==null?Math.round(x):x).toLocaleString('en-GB',d==null?{}:{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(x,d)=>(100*x).toFixed(d==null?1:d)+'%';
  const rend=[];
  const onRender=f=>{rend.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{const t=$(TAB);if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>rend.forEach(f=>{try{f()}catch(e){window.__jsErr&&__jsErr('dd resize: '+e.message)}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  // horizontal bars: rows [label, value, color, valueText]
  function bars(el,rows,max){el.innerHTML=rows.map(r=>'<div class="row"><div class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</div><div class="track"><div class="fill" style="width:'+(100*Math.min(1,r[1]/max)).toFixed(2)+'%;background:'+(r[2]||'var(--acc)')+'"></div></div><div class="val">'+(r[3]!=null?r[3]:fmt(r[1]))+'</div></div>').join('')}
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // step animation controller: o {card, ctl, n, draw(i), ms, label}
  function anim(o){ // 2026-11-09: the skill template RD.anim (21_js_rd_common.js): plays once at least half in view, pauses off screen, stops for good on any control or at its last step,
    // never moves by itself under reduced motion; o.auto false makes it a widget that never plays by itself. Redrawn when this tab opens.
    if(!o.fast)o.ms=Math.max(o.ms||0,3800); // time to read each step's caption
    const A=RD.anim(o);onRender(()=>A.redraw());return A}
  // predict-then-reveal blocks
  function predict(id){const el=$(id);if(!el)return;el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');x.classList.toggle('wrong',x===b&&x.dataset.r!=='1')});el.querySelector('.ans').hidden=false})}
  // linear scale helper
  const lin=(d0,d1,r0,r1)=>v=>r0+(v-d0)/(d1-d0)*(r1-r0);
  return {TAB,RM,$,esc,fmt,pct,onRender,width,svg,t,stat,bars,seg,anim,predict,lin};
})();
