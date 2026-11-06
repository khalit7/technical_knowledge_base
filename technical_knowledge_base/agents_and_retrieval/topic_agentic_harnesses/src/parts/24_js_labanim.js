// ---- The step controller of the lab tabs (Loop lab, Trace and context lab), 2026-11-06; copied from the agentic-frameworks root ----
// RD.anim from the template 21_js_rd_common.js with three additions the labs need: the tab it redraws in, a delay per step (o.delay(i), ms before
// leaving step i, so a replay keeps the recording's rhythm) and data-playing on the card while it plays. Same motion rules as RD.anim:
// an animation (o.list: its ol.sx step list) plays by itself once at least half of its card is on screen in the visible tab, pauses off screen and
// resumes on return, stops for good on any reader control or at its last step, and never moves by itself under reduced motion.
// o.auto===false makes it a widget the reader drives (a long replay whose outcome is the point): no autoplay and no step list;
// with o.open==='last' it opens on (and after a mode change returns to) its last frame, the whole run drawn.
window.LABANIM=function(tab,o){
  const RM=RD.RM,card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
  const st={i:o.start!=null?o.start:o.auto===false&&o.open==='last'?o.n-1:0,n:o.n,play:false,timer:0,vis:false,spd:1,user:false,ended:false,lis:[]};
  const pid=o.ctl+'-';
  ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
    '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
    '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
    '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
    '<label class="small">Speed <select id="'+pid+'v" aria-label="Speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>'+
    '<span class="small mute" id="'+pid+'c"></span>';
  const $=s=>document.getElementById(pid+s);
  function bindList(id){const L=id&&document.getElementById(id);st.lis=L?[...L.children]:[];
    st.lis.forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{st.user=true;setPlay(false);st.i=Math.min(i,st.n-1);show()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})}
  function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;$('c').textContent='step '+(st.i+1)+' of '+st.n;
    st.lis.forEach((li,i)=>{li.classList.toggle('on',i===st.i);li.classList.toggle('done',i<st.i);if(i===st.i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
    o.draw(st.i)}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  const dl=()=>(o.delay?o.delay(st.i):(o.ms||3600))/st.spd;
  function tick(){st.timer=0;if(!st.play||!live())return;
    if(st.i>=st.n-1){st.ended=true;setPlay(false);return}st.i++;show();if(st.i>=st.n-1){st.ended=true;setPlay(false);return}
    st.timer=setTimeout(tick,dl())}
  function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,dl());else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
  function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
    if(p)card.setAttribute('data-playing','');else card.removeAttribute('data-playing');
    if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
  $('p').addEventListener('click',()=>{st.user=true;setPlay(!st.play)});
  $('f').addEventListener('click',()=>{st.user=true;setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
  $('b').addEventListener('click',()=>{st.user=true;setPlay(false);st.i=Math.max(0,st.i-1);show()});
  $('s').addEventListener('input',e=>{st.user=true;setPlay(false);st.i=+e.target.value;show()});
  $('v').addEventListener('change',e=>{st.spd=+e.target.value});
  function auto(){if(o.auto!==false&&!RM&&!st.user&&!st.ended&&!st.play&&live())setPlay(true)}
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const e=es[es.length-1];st.vis=e.isIntersecting&&(e.intersectionRatio>=.5||e.intersectionRect.height>=innerHeight*.5);
    if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  if(o.auto!==false)bindList(o.list);
  document.addEventListener('visibilitychange',kick);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(()=>{show();kick()});
  show();
  return {
    // a mode toggle: restart from step 0 with a new step count and replay (an animation), or show the new run on its opening frame (a widget)
    reset(n,list){setPlay(false);st.n=n;st.i=o.auto===false&&o.open==='last'?n-1:0;st.ended=false;st.user=false;if(list)bindList(list);show();auto()},
    go(i,byCode){if(!byCode)st.user=true;setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
    redraw(){o.draw(st.i)},
    play(){if(!RM)setPlay(true)},
    get i(){return st.i},get n(){return st.n}
  };
};
