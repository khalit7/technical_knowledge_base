// ---- Agentic lab (t-agent): shared helpers, step animation, charts, render registry ----
window.AGT=(function(){
  const D=window.AGTD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-agent');
  const visible=()=>{const t=tab();return t&&!t.hidden&&!document.hidden};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-agent']=window.TAB_RENDER['t-agent']||[]).push(()=>{try{f()}catch(e){console.error(e);throw e}})}
  let rz=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rz);rz=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),120)});
  const width=el=>{const w=el&&el.getBoundingClientRect().width;return w&&w>40?Math.floor(w):Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-40))};
  const f3=x=>x==null?'n/a':(+x).toFixed(3);
  const pc=(x,d)=>x==null?'n/a':(100*x).toFixed(d==null?1:d)+'%';
  const n0=x=>x==null?'n/a':Math.round(x).toLocaleString('en-US');
  // segmented control: el holds <button data-v>; f(value)
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.v)})}
  // step animation: o {card, ctl, n, draw(i), ms, label}; plays once when first on screen (not under reduced motion)
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&visible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1600)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1600)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent&&visible()){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=Math.min(st.i,n-1);show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // svg text helper
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  // line chart. o: {el, xs:[labels], series:[{name,color,ys:[...], dash}], ymin, ymax, ylab, xlab, fmt, h, mark:{x index}}
  function lines(o){
    const W=width(o.el),H=o.h||220,L=44,R=12,Tp=10,B=34;
    const iw=W-L-R,ih=H-Tp-B,nx=o.xs.length;
    const X=i=>L+(nx===1?iw/2:i*iw/(nx-1)),Y=v=>Tp+ih-(v-o.ymin)/(o.ymax-o.ymin)*ih;
    let s='';const tk=o.ticks||5;
    for(let t=0;t<=tk;t++){const v=o.ymin+(o.ymax-o.ymin)*t/tk;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+T(L-5,Y(v)+4,(o.fmt||f3)(v),{a:'end',fs:10,fill:'var(--mute)'})}
    const step=Math.max(1,Math.ceil(nx/Math.max(2,Math.floor(iw/38))));
    o.xs.forEach((x,i)=>{if(i%step===0||i===nx-1)s+=T(X(i),H-B+14,esc(x),{a:'middle',fs:10,fill:'var(--mute)'})});
    if(o.xlab)s+=T(L+iw/2,H-4,esc(o.xlab),{a:'middle',fs:10.5,fill:'var(--mute)'});
    if(o.mark!=null)s+='<line x1="'+X(o.mark)+'" x2="'+X(o.mark)+'" y1="'+Tp+'" y2="'+(Tp+ih)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    o.series.forEach(se=>{let p='';se.ys.forEach((v,i)=>{if(v==null)return;p+=(p?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)});
      s+='<path d="'+p+'" fill="none" stroke="'+se.color+'" stroke-width="2"'+(se.dash?' stroke-dasharray="5 4"':'')+'/>';
      se.ys.forEach((v,i)=>{if(v!=null)s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="2.6" fill="'+se.color+'"><title>'+esc(se.name)+' at '+esc(o.xs[i])+': '+(o.fmt||f3)(v)+'</title></circle>'})});
    o.el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.label||'')+'">'+s+'</svg>'+
      '<div class="agt-leg">'+o.series.map(se=>'<span><i style="background:'+se.color+'"></i>'+esc(se.name)+'</span>').join('')+'</div>';
  }
  // horizontal bars in HTML: rows [{name, v, color, note, hl}], max
  function bars(el,rows,max,fmt){
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+(100*Math.max(0,r.v)/max).toFixed(1)+'%;background:'+(r.color||'var(--acc)')+'"></span></span><span class="val">'+(fmt||f3)(r.v)+'</span></div>').join('');
  }
  // predict-then-reveal: el has data-ans (index of right option), buttons .agt-opt, and a .agt-ans hidden div
  function predict(el){const ans=+el.dataset.ans;const out=el.querySelector('.agt-ans');
    el.querySelectorAll('.agt-opt').forEach((b,i)=>b.addEventListener('click',()=>{
      el.querySelectorAll('.agt-opt').forEach((x,j)=>{x.classList.toggle('agt-right',j===ans);x.classList.toggle('agt-wrong',j===i&&i!==ans)});
      out.hidden=false}))}
  // links to a section of another tab: <a href="#" data-agt-go="t-map|map-s-def">
  function goLinks(root){root.addEventListener('click',e=>{const a=e.target.closest('a[data-agt-go]');if(!a)return;e.preventDefault();
    const [t,sec]=a.dataset.agtGo.split('|');const b=document.querySelector('#tabs button[data-t="'+t+'"]');if(b)b.click();
    setTimeout(()=>{const s=sec&&document.getElementById(sec);(s||document.getElementById('tabs')).scrollIntoView({block:'start'})},60)})}
  return {D,RM,esc,$,onRender,width,f3,pc,n0,seg,anim,T,lines,bars,predict,goLinks,visible};
})();
