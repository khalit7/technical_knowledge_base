// Attention lab: helpers under window.AT, and a copy of the step-animation controller registered on this tab
// (plays only on screen in the visible tab, plays once when first scrolled into view, never autoplays under reduced motion).
window.AT=(function(){
  if(!document.getElementById('t-attn'))return null;
  const $=id=>document.getElementById(id);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const grp=n=>Math.round(n).toLocaleString('en-US');
  function bytes(b){const a=Math.abs(b);if(a>=2**40)return (b/2**40).toFixed(2)+' TiB';if(a>=2**30)return (b/2**30).toFixed(a>=100*2**30?0:2)+' GiB';
    if(a>=2**20)return (b/2**20).toFixed(a>=100*2**20?0:1)+' MiB';if(a>=1024)return (b/1024).toFixed(a>=100*1024?0:1)+' KiB';return Math.round(b)+' B'}
  const ctxs=n=>n>=1048576?(n%1048576?(n/1048576).toFixed(1):n/1048576)+'M':n>=1024?(n%1024?(n/1024).toFixed(1):n/1024)+'k':String(n);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-attn']=window.TAB_RENDER['t-attn']||[]).push(f)};
  const visible=()=>{const t=$('t-attn');return t&&!t.hidden&&t.offsetParent!==null};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(f,60)})};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // predict-then-reveal: el has data-ok on the right button; reveal shows .at-ans
  function drills(root){root.querySelectorAll('.at-pr').forEach(pr=>{const ans=pr.querySelector('.at-ans');
    pr.querySelectorAll('.at-opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.at-opts button').forEach(x=>x.classList.remove('at-right','at-wrong'));
      b.classList.add(b.hasAttribute('data-ok')?'at-right':'at-wrong');ans.hidden=false}));
    const sk=pr.querySelector('.at-skip');if(sk)sk.addEventListener('click',e=>{e.preventDefault();ans.hidden=false})})}
  // tab links inside script-written HTML
  function tabLinks(el){el.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}})}
  return {$,RM,esc,grp,bytes,ctxs,onRender,visible,width,onResize,seg,stat,svg,t,anim,drills,tabLinks};
})();
