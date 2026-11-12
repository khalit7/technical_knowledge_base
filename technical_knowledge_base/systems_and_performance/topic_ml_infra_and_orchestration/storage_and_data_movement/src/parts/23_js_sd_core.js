// ---- Storage and data movement: shared helpers for every tab (adapted from the root Storage lab's IO_H) ----
// SD_H.mk(tabId) gives helpers bound to one tab: renders run when that tab opens and on resize while it is visible;
// anim() follows the 2026-11-06 motion rules (autoplay once in view, step list on the left, widgets for long replays).
window.SD_H=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const rect=(x,y,w,h,fill,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?2:o.rx)+'" fill="'+fill+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+(o.stroke?' stroke="'+o.stroke+'" stroke-width="'+(o.sw||1)+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+(+x1).toFixed(1)+'" y1="'+(+y1).toFixed(1)+'" x2="'+(+x2).toFixed(1)+'" y2="'+(+y2).toFixed(1)+'" stroke="'+c+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b)||b.disabled)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  const fmt=(x,d)=>Number.isFinite(x)?x.toLocaleString('en-US',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d}):'n/a';
  const OST=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--closed)','var(--open)'];
  function drills(root){root.querySelectorAll('.pr').forEach(p=>{const a=p.querySelector('.ans');p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
    if(b.dataset.a!=='1')b.classList.add('wrong');if(a)a.hidden=false}))})}
  function mk(tab){
    const renders=[];
    const tabVisible=()=>{const e=$(tab);return !!e&&!e.hidden&&e.offsetParent!==null};
    const onRender=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
    let rt=0;addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),80)});
    // o: {card, ctl, n, draw(i), ms, label, list, auto, start}: the same rules as the skill's RD.anim (2026-11-06). A stepped animation
    // plays by itself once at least half of its card is on screen in the visible tab, pauses off screen and resumes on return, stops for
    // good on any reader control or at its last step, never moves by itself under reduced motion, and marks its step list (o.list, an ol.sx
    // on the left, one item per step). o.auto===false makes it a widget the reader drives (a long replay): it never plays by itself and
    // opens on o.start ('last' for the last frame, the informative one).
    function anim(o){
      const card=$(o.card),ctl=$(o.ctl),widget=o.auto===false,first=n=>o.start==='last'?n-1:(o.start||0);
      const st={i:first(o.n),n:o.n,play:false,timer:0,vis:false,spd:1,user:false,ended:false,lis:[]};const pid=o.ctl+'-';
      ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
        '<button id="'+pid+'p" class="an-play sd-play io-play" aria-label="Play">&#9654; Play</button>'+
        '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
        '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
        '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option></select></label>';
      const g=s=>$(pid+s);
      function bindList(id){const L=id&&$(id);st.lis=L?[...L.children]:[];
        st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{st.user=true;setPlay(false);st.i=i;show()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})}
      function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;
        st.lis.forEach((li,i)=>{li.classList.toggle('on',i===st.i);li.classList.toggle('done',i<st.i);if(i===st.i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});o.draw(st.i)}
      const live=()=>st.vis&&!document.hidden&&tabVisible()&&card.offsetParent!==null;
      function tick(){st.timer=0;if(!st.play||!live())return;
        if(st.i>=st.n-1){st.ended=true;setPlay(false);return}st.i++;show();if(st.i>=st.n-1){st.ended=true;setPlay(false);return}
        st.timer=setTimeout(tick,(o.ms||4200)/st.spd)}
      function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||4200)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
      function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');card.toggleAttribute('data-playing',p);
        if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
      g('p').addEventListener('click',()=>{st.user=true;setPlay(!st.play)});
      g('f').addEventListener('click',()=>{st.user=true;setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
      g('b').addEventListener('click',()=>{st.user=true;setPlay(false);st.i=Math.max(0,st.i-1);show()});
      g('s').addEventListener('input',e=>{st.user=true;setPlay(false);st.i=+e.target.value;show()});
      g('v').addEventListener('change',e=>{st.spd=+e.target.value});
      function auto(){if(!widget&&!RM&&!st.user&&!st.ended&&!st.play&&live())setPlay(true)}
      if('IntersectionObserver' in window){new IntersectionObserver(es=>{const e=es[es.length-1];st.vis=e.isIntersecting&&(e.intersectionRatio>=.5||e.intersectionRect.height>=innerHeight*.5);
        if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
      bindList(o.list);
      document.addEventListener('visibilitychange',kick);
      onRender(()=>{show();kick()});
      show();
      return {
        // a mode toggle: restart with a new step count (and step list) and replay; a widget reopens on its informative frame
        reset(n,list){setPlay(false);st.n=n;st.i=first(n);st.ended=false;st.user=false;if(list)bindList(list);show();auto()},
        go(i){st.user=true;setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
        redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
    }
    return {onRender,anim,tabVisible};
  }
  return {RM,esc,$,width,svg,t,rect,line,seg,fmt,OST,drills,mk};
})();
