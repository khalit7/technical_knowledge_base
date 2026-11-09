// ---- Mixing lab (t-mix): shared helpers. Charts size from the measured width and redraw when the tab is shown or resized.
// Animations run only while their card is on screen in the visible tab, never start by themselves: they wait on step 0 for the reader (2026-10-24).
window.MXX=(function(){
  const TAB='t-mix';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=(x,d)=>(d==null?Math.round(x):x).toLocaleString('en-GB',d==null?{}:{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(x,d)=>(100*x).toFixed(d==null?1:d)+'%';
  // tokens given in units of 1 (raw count): 1.23T, 45.6B, 7.8M
  function tok(x){const a=Math.abs(x);if(a>=1e12)return (x/1e12).toFixed(a>=1e13?1:2)+'T';if(a>=1e9)return (x/1e9).toFixed(a>=1e11?0:a>=1e10?1:2)+'B';if(a>=1e6)return (x/1e6).toFixed(a>=1e8?0:1)+'M';return fmt(x)}
  const rend=[];
  const onRender=f=>{rend.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{const t=$(TAB);if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>rend.forEach(f=>{try{f()}catch(e){window.__jsErr&&__jsErr('mx resize: '+e.message)}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':' fill="var(--ink)"')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const rect=(x,y,w,h,f,o)=>'<rect x="'+(+x).toFixed(2)+'" y="'+(+y).toFixed(2)+'" width="'+Math.max(0,w).toFixed(2)+'" height="'+Math.max(0,h).toFixed(2)+'" fill="'+f+'"'+(o||'')+'/>';
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // domain colours, shared by every chart on this tab
  const COL={web:'var(--c1)',wiki:'var(--c5)',code:'var(--c2)',math:'var(--c3)',papers:'var(--c4)',hqweb:'var(--c6)',instr:'var(--closed)'};
  const NAME={web:'Web',wiki:'Encyclopedic',code:'Code',math:'Math',papers:'Papers',hqweb:'High-quality web',instr:'Instruction and Q&A'};
  // step animation controller: o {card, ctl, n, draw(i), ms, label}
  function anim(o){ // 2026-11-09: the skill template RD.anim (21_js_rd_common.js): plays once at least half in view, pauses off screen, stops for good on any control or at its last step,
    // never moves by itself under reduced motion; o.auto false makes it a widget that never plays by itself. Redrawn when this tab opens.
    if(!o.fast)o.ms=Math.max(o.ms||0,3800); // time to read each step's caption
    const A=RD.anim(o);onRender(()=>A.redraw());return A}
  // tween a number toward a target with requestAnimationFrame (jumps under reduced motion or when hidden)
  function tween(from,to,ms,step,done){if(RM||document.hidden||!window.requestAnimationFrame){step(to);done&&done();return ()=>{}}
    const t0=performance.now();let stop=false;const f=now=>{if(stop)return;const k=Math.min(1,(now-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;step(from+(to-from)*e);if(k<1)requestAnimationFrame(f);else done&&done()};requestAnimationFrame(f);return ()=>{stop=true}}
  function predict(id,onReveal){const el=$(id);if(!el)return;el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');x.classList.toggle('wrong',x===b&&x.dataset.r!=='1')});onReveal&&onReveal();el.querySelector('.ans').hidden=false})}
  // the calculator's maths (mirrors src/mix/build_data.py)
  const D=window.MXD;const RS=D.R_star;
  const eff=(u,d)=>d<=u?d:u+u*RS*(1-Math.exp(-(d/u-1)/RS));
  const temperature=(s,T)=>{const q=s.map(x=>isFinite(T)?Math.pow(x,1/T):1);const z=q.reduce((a,b)=>a+b,0);return q.map(x=>x/z)};
  function unimax(s,B,N){const ord=s.map((x,i)=>i).sort((a,b)=>s[a]-s[b]);let left=B;const al=s.map(()=>0);
    ord.forEach((i,j)=>{const share=left/(s.length-j);al[i]=Math.min(N*s[i],share);left-=al[i]});const tot=al.reduce((a,b)=>a+b,0);return al.map(a=>a/tot)}
  return {TAB,RM,$,esc,fmt,pct,tok,onRender,width,svg,t,rect,stat,seg,COL,NAME,anim,tween,predict,eff,temperature,unimax};
})();
