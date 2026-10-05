// ---- OS simulators tab: shared helpers. A step-animation controller like RD.anim (play, pause, step, scrub,
// speed), but registered on t-sim: it animates only while its card is on screen in the visible tab, plays once
// the first time it scrolls into view, and never autoplays under prefers-reduced-motion. ----
window.SIMA=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-sim']=window.TAB_RENDER['t-sim']||[]).push(f)};
  const tabVisible=()=>{const t=document.getElementById('t-sim');return t&&!t.hidden};
  // o: {card, ctl, n, draw(i), ms, label, autoplay (default true)}
  function anim(o){
    const card=document.getElementById(o.card),ctl=document.getElementById(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.classList.add('sim-anctl');
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+Math.max(0,st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>';
    const $=s=>document.getElementById(pid+s);
    function show(){const sc=$('s');sc.max=Math.max(0,st.n-1);sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&tabVisible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||900)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||900)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;$('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    $('p').addEventListener('click',()=>setPlay(!st.play));
    $('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    $('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    $('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    $('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&tabVisible()&&card.offsetParent){st.started=true;if(!RM&&o.autoplay!==false){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return{reset(n,i){setPlay(false);st.n=Math.max(1,n);st.i=i==null?0:Math.max(0,Math.min(st.n-1,i));show()},
      go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},
      play(){if(!RM)setPlay(true)},get i(){return st.i},get n(){return st.n}};
  }
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const T=(x,y,s,o)=>{o=o||{};return'<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const R=(x,y,w,h,f,o)=>{o=o||{};return'<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" fill="'+f+'"'+(o.rx!=null?' rx="'+o.rx+'"':'')+(o.st?' stroke="'+o.st+'" stroke-width="'+(o.sw||1)+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  let rs=[];addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(rs.t);rs.t=setTimeout(()=>rs.forEach(f=>{try{f()}catch(e){}}),80)});
  const onResize=f=>rs.push(f);
  const fmt=(x,d)=>(x==null||!isFinite(x))?'n/a':(+x).toFixed(d==null?1:d);
  const JOBCOL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  // predict-then-reveal: el holds .sim-q blocks with data-ans; buttons inside with data-k
  function drills(root){root.querySelectorAll('.sim-q').forEach(q=>{q.addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;
    q.querySelectorAll('button[data-k]').forEach(x=>{x.disabled=true;x.classList.toggle('sim-right',x.dataset.k===q.dataset.ans);x.classList.toggle('sim-wrong',x===b&&x.dataset.k!==q.dataset.ans)});
    const r=q.querySelector('.sim-reveal');if(r)r.hidden=false;
    const v=q.querySelector('.sim-verdict');if(v)v.textContent=b.dataset.k===q.dataset.ans?'Right.':'Not quite.'})})}
  return{RM,esc,anim,width,svg,T,R,seg,onRender,onResize,fmt,JOBCOL,drills};
})();
