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
  // step animation: o {card, ctl, n, draw(i), delay(i) ms before leaving step i, label}
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    const dl=()=>(o.delay?o.delay(st.i):1300)/st.spd;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,dl())}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,dl());else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  function pred(id,right,text){const el=document.getElementById(id);if(!el)return;
    el.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{el.classList.add('done');
      el.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(b.dataset.a===String(right)?'right':'wrong');el.querySelector('.opts button[data-a="'+right+'"]').classList.add('right');
      el.querySelector('.ans').innerHTML=(b.dataset.a===String(right)?'<b>Right.</b> ':'<b>Not quite.</b> ')+text()}))}
  // a "go to section of another tab" link: data-ops-goto="<tab id>|<section id>"
  document.addEventListener('click',e=>{const a=e.target.closest('a[data-ops-goto]');if(!a)return;e.preventDefault();
    const [tab,sec]=a.dataset.opsGoto.split('|');const b=document.querySelector('#tabs button[data-t="'+tab+'"]');if(b)b.click();
    setTimeout(()=>{const s=document.getElementById(sec);if(s)s.scrollIntoView({block:'start'})},60)});
  let rt=0;addEventListener('resize',()=>{const t=document.getElementById('t-ops');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>(window.TAB_RENDER['t-ops']||[]).forEach(f=>{try{f()}catch(e){}}),80)});
  function fillV(){const V=window.OPS_V||{};document.querySelectorAll('#t-ops .ops-v').forEach(el=>{const v=V[el.dataset.v];if(v!=null)el.textContent=v})}
  onRender(fillV);
  return {RM,esc,stat,onRender,width,fmt,sec,usd,anim,seg,pred,fillV};
})();
