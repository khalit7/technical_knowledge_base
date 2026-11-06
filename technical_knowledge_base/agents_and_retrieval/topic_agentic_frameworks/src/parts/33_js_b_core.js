// ---- Production stack (t-ops): helpers ----
window.OPU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-ops']=window.TAB_RENDER['t-ops']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-60))};
  const fmt=n=>Math.round(n).toLocaleString('en-GB');
  const sec=n=>(n<10?n.toFixed(2):n<100?n.toFixed(1):Math.round(n).toString())+' s';
  const usd=n=>n===0?'$0':'$'+(n<0.001?n.toFixed(6):n<0.1?n.toFixed(4):n.toFixed(2));
  // step replays: the labs' shared controller (24_js_labanim.js); the gateway replay is a widget the reader drives
  // (no autoplay, no step list), opening on its last frame with the whole request drawn
  const anim=o=>LABANIM('t-ops',Object.assign({auto:false,open:'last'},o));
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  function pred(id,right,text){const el=document.getElementById(id);if(!el)return;const d=el.querySelector('details');
    if(d)d.addEventListener('toggle',()=>{el.querySelector('.ans').innerHTML=text()})}
  // a "go to section of another tab" link: data-ops-goto="<tab id>|<section id>"
  document.addEventListener('click',e=>{const a=e.target.closest('a[data-ops-goto]');if(!a)return;e.preventDefault();
    const [tab,sec]=a.dataset.opsGoto.split('|');const b=document.querySelector('#tabs button[data-t="'+tab+'"]');if(b)b.click();
    setTimeout(()=>{const s=document.getElementById(sec);if(s)s.scrollIntoView({block:'start'})},60)});
  let rt=0;addEventListener('resize',()=>{const t=document.getElementById('t-ops');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>(window.TAB_RENDER['t-ops']||[]).forEach(f=>{try{f()}catch(e){}}),80)});
  function fillV(){const V=window.OPS_V||{};document.querySelectorAll('#t-ops .ops-v').forEach(el=>{const v=V[el.dataset.v];if(v!=null)el.textContent=v})}
  onRender(fillV);
  return {RM,esc,stat,onRender,width,fmt,sec,usd,anim,seg,pred,fillV};
})();
