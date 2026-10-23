// ---- Pallas kernels page: shared helpers (formatting identical to src/check_page.py, data access, a step-animation
// controller usable in any tab, segmented buttons, predict-then-reveal). Data: window.PK from 22_js_pk_data.js.
window.PKU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const get=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],window.PK);
  const comma=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  function e2(x){if(x===0)return '0';if(x==null||!isFinite(x))return String(x);const s=Number(x).toExponential(1);const m=s.match(/^(-?[\d.]+)e([+-])(\d+)$/);return m[1]+'e'+(m[2]==='-'?'-':'')+String(+m[3])}
  function fmt(x,f){
    if(f==='s')return String(x);if(f==='ln')return String(Math.round(x));if(f==='e2')return e2(x);if(f==='i')return comma(x,0);
    if(/^f\d$/.test(f))return comma(x,+f[1]);
    if(f==='mb1')return comma(x/1e6,1)+' MB';if(f==='kb0')return comma(x/1e3,0)+' KB';
    if(f==='pct0')return comma(x*100,0)+'%';if(f==='pct1')return comma(x*100,1)+'%';
    if(f==='list')return x.join(', ');if(f==='yn')return x?'yes':'no';return String(x)}
  const bytes=b=>b>=1048576?comma(b/1048576,b>=10485760?0:1)+' MiB':b>=1024?comma(b/1024,0)+' KiB':comma(b,0)+' B';
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function onRender(tab,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)}
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // segmented buttons: el holds <button data-m>; f(value) on click
  function seg(el,f){if(!el)return;el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // step animation in any tab: o = {card, ctl, tab, n, draw(i), ms, label}; never autoplays (waits on step 0 for the reader)
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&#215;</option><option value="1" selected>1&#215;</option><option value="2">2&#215;</option><option value="4">4&#215;</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();
      if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1200)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1200)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(o.tab,()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // predict-then-reveal blocks: <div class="pr"><div class="opts"><button data-ok>...</div><div class="ans" hidden>
  function predicts(root){(root||document).querySelectorAll('.pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok==='1')x.classList.add('right')});
      if(b.dataset.ok!=='1')b.classList.add('wrong');if(ans)ans.hidden=false}))})}
  const code=t=>esc(t).replace(/(#[^\n]*)/g,'<span class="mute">$1</span>');
  return {RM,esc,get,fmt,e2,comma,bytes,stat,onRender,width,seg,anim,predicts,code};
})();
