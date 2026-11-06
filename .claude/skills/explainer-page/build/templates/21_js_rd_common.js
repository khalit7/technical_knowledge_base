// ---- Reading tab: shared helpers and the step-animation controller (play, pause, step, scrub, speed). Copied from the explainer-page skill templates ----
// Every 2D animation uses RD.anim. It plays by itself once at least half of its card is on screen in the visible tab (Khalid, 2026-11-06),
// pauses off screen and resumes on return, stops for good when the reader takes a control or it reaches its last step, and never moves by itself under reduced motion.
window.RD=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-read']=window.TAB_RENDER['t-read']||[]).push(f)};
  // o: {card, ctl (element id), n (number of steps), draw(i), ms (time on each step, default 3600 so its caption can be read), label, list (id of the ol.sx step list on the left), auto (false: a widget, never autoplays), start (the step it opens on)}
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:o.start||0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1,user:false,ended:false};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    // fwd: the step moved forward by one, so marks drawn with class rd-new ease in (CSS) and the caption fades in
    // the step list on the left: one item per step, the current one marked, a click jumps to it (and stops autoplay)
    function bindList(id){const L=id&&document.getElementById(id);st.lis=L?[...L.children]:[];
      st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{st.user=true;setPlay(false);st.i=i;show()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})}
    function show(fwd){const sc=$('s');sc.max=st.n-1;sc.value=st.i;(st.lis||[]).forEach((li,i)=>{li.classList.toggle('on',i===st.i);li.classList.toggle('done',i<st.i);if(i===st.i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});card.classList.toggle('rd-fwd',!!fwd);o.draw(st.i);
      if(fwd&&!RM)card.querySelectorAll('.an-cap').forEach(c=>{c.classList.remove('rd-fade');void c.offsetWidth;c.classList.add('rd-fade')})}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){st.ended=true;setPlay(false);return}st.i++;show(true);if(st.i>=st.n-1){st.ended=true;setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||3600)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||3600)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>{st.user=true;setPlay(!st.play)});
    $('f').addEventListener('click',()=>{st.user=true;setPlay(false);const m=st.i<st.n-1;st.i=Math.min(st.n-1,st.i+1);show(m)});
    $('b').addEventListener('click',()=>{st.user=true;setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{st.user=true;setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    // autoplay on view: once at least half the card is visible, unless the reader has taken a control or it has finished
    // o.auto===false makes it a widget the reader drives (the long-replay rule, case b): it never plays by itself
    function auto(){if(o.auto!==false&&!RM&&!st.user&&!st.ended&&!st.play&&live())setPlay(true)}
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{const e=es[es.length-1];st.vis=e.isIntersecting&&(e.intersectionRatio>=.5||e.intersectionRect.height>=innerHeight*.5);
      if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
    bindList(o.list);
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {
      // restart from step 0 with a new step count (used when a mode toggle changes the sequence)
      // a mode toggle: restart from step 0 with a new step count (and optionally a new step list) and replay, the one exception to "stops for good"
      reset(n,list){setPlay(false);st.n=n;st.i=0;st.ended=false;st.user=false;if(list)bindList(list);show();auto()},
      // jump to a step; pass byCode=true when page code (not the reader) moves it, so autoplay is not switched off
      go(i,byCode){if(!byCode)st.user=true;setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){card.classList.remove('rd-fwd');o.draw(st.i)},
      play(){if(!RM)setPlay(true)},
      get i(){return st.i}, get n(){return st.n}
    };
  }
  // width available inside an element (falls back when the tab is hidden)
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // tab links inside HTML written by a script (99_js_tabs.js only binds the links present at load)
  function tabLinks(el){el.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}})}
  return {RM,esc,stat,anim,onRender,width,tabLinks};
})();
RD.onResize=f=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById('t-read');if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
RD.svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+(label||'')+'">'+body+'</svg>';
RD.t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||12)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
// segmented buttons: el contains <button data-m>; calls f(value)
RD.seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
// section nav highlight
(function(){const nav=document.getElementById('rd-nav');if(!nav||!('IntersectionObserver' in window))return;
  const links=[...nav.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)});})();
