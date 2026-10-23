// Long context page: shared helpers for the lab tabs (window.LC). The step controller is RD.anim's, made tab-aware:
// it registers its redraw on the tab that holds its card, animates only while the card is on screen in the visible
// tab, and never autoplays: it waits on step 0 until the reader presses play or steps (learner pacing, 2026-10-23).
window.LC=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const onTab=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const visible=el=>el&&el.offsetParent!==null;
  const onResize=(el,f)=>{let t=0;addEventListener('resize',()=>{if(!visible(el))return;clearTimeout(t);t=setTimeout(f,80)})};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=(x,d)=>{if(!isFinite(x))return '-';d=d===undefined?1:d;return x.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d})};
  const int=x=>Math.round(x).toLocaleString('en-GB');
  const bytes=b=>{const u=['B','KiB','MiB','GiB','TiB'];let i=0;while(b>=1024&&i<4){b/=1024;i++}return fmt(b,b<10&&i?2:1)+' '+u[i]};
  const gb=b=>b>=1e9?fmt(b/1e9,b<1e10?2:1)+' GB':b>=1e6?fmt(b/1e6,b<1e7?2:1)+' MB':fmt(b/1e3,1)+' kB';
  const cnt=n=>n>=1e6?fmt(n/1e6,0)+'M':n>=1e3?fmt(n/1e3,0)+'K':String(Math.round(n));
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':' fill="var(--ink)"')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:o.start||0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const q=s=>$(pid+s);
    function show(){const sc=q('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&visible(card);
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;q('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';q('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    q('p').addEventListener('click',()=>setPlay(!st.play));
    q('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    q('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    q('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    q('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onTab(o.tab,()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  return {RM,$,onTab,width,visible,onResize,esc,fmt,int,bytes,gb,cnt,svg,t,seg,anim};
})();
