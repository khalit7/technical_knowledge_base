// ---- Reading tab: shared helpers and the step-animation controller (play, pause, step, scrub, speed) ----
// Every Reading animation uses RD.anim. It animates only while its card is on screen in the visible tab,
// plays once the first time it scrolls into view, and never autoplays under prefers-reduced-motion.
window.RD=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onRender=(f,t)=>{t=t||'t-read';(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[t]=window.TAB_RENDER[t]||[]).push(f)};
  // o: {card, ctl (element id), n (number of steps), draw(i), ms (base delay per step), label}
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
      st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
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
    onRender(()=>{show();kick()},o.tab);
    show();
    return {
      // restart from step 0 with a new step count (used when a mode toggle changes the sequence)
      reset(n){setPlay(false);st.n=n;st.i=0;show()},
      go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},
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
// ---- page helpers: colours, number formats, SVG ----
window.PF=(function(){
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const comma=n=>Math.round(n).toLocaleString('en-US');
  const f1=n=>(Math.round(n*10)/10).toFixed(1);
  const pct=(n,d)=>(n*100).toFixed(d==null?1:d)+'%';
  const sci=n=>{if(!isFinite(n)||n<=0)return '0';const e=Math.floor(Math.log10(n)),m=n/Math.pow(10,e);return m.toFixed(1)+'e'+e};
  const tokB=b=>b>=1000?(b/1000).toFixed(b%1000?1:0)+'T':Math.round(b)+'B';
  const svg=(w,h,lbl,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+RD.esc(lbl)+'">'+inner+'</svg>';
  const T=(x,y,s,a)=>'<text x="'+x+'" y="'+y+'"'+(a||'')+'>'+s+'</text>';
  return {css,comma,f1,pct,sci,tokB,svg,T};
})();
