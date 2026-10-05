// ---- GPU simulator (t-sim): shared UI helpers (step animation, segmented buttons, SVG text, widths). ----
// Every animation animates only while its card is on screen in the visible tab, plays once the first time
// it scrolls into view, and never autoplays under prefers-reduced-motion.
window.SIMU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tabVisible=()=>{const t=$('t-sim');return !!t&&!t.hidden&&t.offsetParent!==null};
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sim']=window.TAB_RENDER['t-sim']||[]).push(f)};
  function onResize(f){let t=0,w=0;addEventListener('resize',()=>{if(!tabVisible())return;const nw=document.documentElement.clientWidth;if(nw===w)return;w=nw;clearTimeout(t);t=setTimeout(f,80)})}
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  const stat=(k,v,d,id)=>'<div class="stat"'+(id?' id="'+id+'"':'')+'><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const rect=(x,y,w,h,fill,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" fill="'+fill+'"'+(o.st?' stroke="'+o.st+'" stroke-width="'+(o.sw||1)+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.rx?' rx="'+o.rx+'"':'')+'>'+(o.tip?'<title>'+esc(o.tip)+'</title>':'')+'</rect>'};
  const fmt=(v,d)=>{if(v==null||!isFinite(v))return '?';d=d==null?(Math.abs(v)>=100?0:Math.abs(v)>=10?1:2):d;return v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d})};
  const pct=v=>fmt(100*v,v>=0.995||v===0?0:1)+'%';
  // o: {card, ctl, n, draw(i), ms, label}
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const p=o.ctl+'-';
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+p+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+p+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+p+'v" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option></select></label>';
    const g=s=>$(p+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&tabVisible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||900)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||900)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(pl){st.play=pl;g('p').innerHTML=pl?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',pl?'Pause':'Play');
      if(!pl&&st.timer){clearTimeout(st.timer);st.timer=0}if(pl&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&tabVisible()&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();setTimeout(kick,50)});
    return {
      reset(n,keep){setPlay(false);st.n=n;st.i=keep?Math.min(st.i,n-1):0;show()},
      go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},
      play(){if(!RM)setPlay(true)},
      get i(){return st.i},get n(){return st.n}
    };
  }
  // reveal buttons for predict-then-reveal questions: <button data-sim-reveal="id">
  document.addEventListener('click',e=>{const b=e.target.closest('[data-sim-reveal]');if(!b)return;const d=$(b.dataset.simReveal);if(d){d.hidden=false;b.disabled=true}});
  // section chips scroll to a section inside the tab
  document.addEventListener('click',e=>{const b=e.target.closest('[data-sim-go]');if(!b)return;e.preventDefault();const s=$(b.dataset.simGo);if(s)s.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})});
  // tab links written by scripts after load (99_js_tabs.js binds only the links present at load)
  document.addEventListener('click',e=>{const a=e.target.closest('#t-sim a[data-tab]');if(!a||e.defaultPrevented)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}});
  return {RM,$,esc,tabVisible,onRender,onResize,width,stat,seg,t,svg,rect,fmt,pct,anim};
})();
