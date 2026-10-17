// ---- Vision lab (t-vision): helpers and the step-animation controller (play, pause, step, scrub, speed) ----
// Animations run only while their card is on screen in the visible tab, play once when first seen,
// and never autoplay under prefers-reduced-motion. Data: window.VS_DATA (34_js_vs_0data.js, built by src/vision/make_data.py).
window.VS=(function(){
  const D=window.VS_DATA,$=id=>document.getElementById(id);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-vision']=window.TAB_RENDER['t-vision']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const fmt=(x,d)=>(x==null||!isFinite(x))?'n/a':(+x).toFixed(d==null?3:d);
  const pct=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
  const comma=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const css=n=>getComputedStyle(document.body).getPropertyValue(n).trim()||'#888';
  const dark=()=>!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  // sequential colour for a value in [0,1] (light: white to blue; dark: near black to blue)
  function seq(v){v=Math.max(0,Math.min(1,v));
    if(dark()){const a=[34,34,34],b=[110,168,230];return 'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*v)).join(',')+')'}
    const a=[247,246,243],b=[47,111,181];return 'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*v)).join(',')+')'}
  // diverging colour for v in [-1,1] (orange negative, blue positive)
  function div(v){v=Math.max(-1,Math.min(1,v));const z=dark()?[34,34,34]:[247,246,243];
    const p=dark()?[110,168,230]:[47,111,181],n=dark()?[232,145,92]:[194,112,58],t=v>=0?p:n,a=Math.abs(v);
    return 'rgb('+z.map((x,i)=>Math.round(x+(t[i]-x)*a)).join(',')+')'}
  const softmax=a=>{const m=Math.max(...a),e=a.map(x=>Math.exp(x-m)),s=e.reduce((p,q)=>p+q,0);return e.map(x=>x/s)};
  const sig=x=>1/(1+Math.exp(-x));
  const logsig=x=>x>=0?-Math.log1p(Math.exp(-x)):x-Math.log1p(Math.exp(x));
  function seg(el,opts,cur,cb){el.innerHTML=opts.map(o=>'<button data-v="'+esc(o[0])+'" class="'+(o[0]===cur?'on':'')+'">'+o[1]+'</button>').join('');
    el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.v)}))}
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl),pid=o.ctl+'-';
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&#215;</option><option value="1" selected>1&#215;</option><option value="2">2&#215;</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}
      st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1600)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1600)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    function maybeStart(){if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()}
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;maybeStart()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();maybeStart()});
    show();
    return {go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  return {D,$,RM,esc,onRender,width,fmt,pct,comma,stat,css,seq,div,softmax,sig,logsig,seg,anim};
})();
