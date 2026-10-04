// ---- Shared helpers for every tab: step-animation controller (from Topic: benchmarks' Reading tab), SVG text, segmented buttons ----
// An animation runs only while its card is on screen in the visible tab, plays once the first time it scrolls into view,
// and never autoplays under prefers-reduced-motion.
window.KU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onRender=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  const tabOf=el=>{const t=el&&el.closest('.tab');return t?t.id:'t-read'};
  // o: {card, ctl (element id), n (steps), draw(i), ms (delay per step), label}
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:o.start||0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" class="an-play" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1600)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1600)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(tabOf(card),()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const onResize=(tab,f)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,60)})};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  const L='target="_blank" rel="noopener noreferrer"';
  const a=(txt,u)=>'<a href="'+u+'" '+L+'>'+txt+'</a>';
  // tab links inside HTML written by a script
  function tabLinks(el){el.addEventListener('click',e=>{const x=e.target.closest('a[data-tab]');if(!x)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+x.dataset.tab+'"]');if(b){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}})}
  const pct=(v,d)=>(v==null||isNaN(v))?'n/a':(+v).toFixed(d==null?1:d)+'%';
  return {RM,esc,stat,anim,onRender,width,onResize,svg,t,seg,a,tabLinks,pct};
})();
// ARC colour palette (the standard ARC-AGI display colours, 0 to 9)
KU.ARC=['#000000','#0074D9','#FF4136','#2ECC40','#FFDC00','#AAAAAA','#F012BE','#FF851B','#7FDBFF','#870C25'];
KU.ARCN=['black','blue','red','green','yellow','grey','magenta','orange','sky blue','maroon'];
// draw an ARC grid as an SVG string; cell size cs; optional per-cell highlight function hl(r,c) returning a stroke colour
KU.grid=function(g,cs,hl,label){const R=g.length,C=g[0].length,W=C*cs+1,H=R*cs+1;let b='';
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const v=g[r][c];b+='<rect x="'+(c*cs+.5)+'" y="'+(r*cs+.5)+'" width="'+cs+'" height="'+cs+'" fill="'+(v<0?'var(--soft)':KU.ARC[v])+'" stroke="#555" stroke-width=".5"/>'}
  if(hl)for(let r=0;r<R;r++)for(let c=0;c<C;c++){const s=hl(r,c);if(s)b+='<rect x="'+(c*cs+1.5)+'" y="'+(r*cs+1.5)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" fill="none" stroke="'+s+'" stroke-width="2"/>'}
  return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+(label||'ARC grid '+R+' by '+C)+'">'+b+'</svg>'};
// section nav highlight (Reading)
(function(){const nav=document.getElementById('rd-nav');if(!nav||!('IntersectionObserver' in window))return;
  const links=[...nav.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)});})();
