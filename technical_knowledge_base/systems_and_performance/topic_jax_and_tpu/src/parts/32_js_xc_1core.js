// ---- Compiler lab (t-xla): shared helpers, step animation, charts, render registry ----
window.XC=(function(){
  const D=window.XCD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-xla');
  const visible=()=>{const t=tab();return t&&!t.hidden&&!document.hidden};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-xla']=window.TAB_RENDER['t-xla']||[]).push(()=>{try{f()}catch(e){console.error(e);throw e}})}
  let rz=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rz);rz=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),120)});
  const width=el=>{const w=el&&el.getBoundingClientRect().width;return w&&w>40?Math.floor(w):Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-40))};
  const n0=x=>x==null?'n/a':Math.round(x).toLocaleString('en-US');
  const mb=x=>x==null?'n/a':(x/1e6).toFixed(x<1e7?2:1)+' MB';
  const gf=x=>x==null?'n/a':(x/1e9).toFixed(2)+' GFLOP';
  const sec=x=>x==null?'n/a':(x<1?(x*1000).toFixed(0)+' ms':x.toFixed(2)+' s');
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
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&visible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1700)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1700)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent&&visible()){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=Math.min(st.i,n-1);show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},
      redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  // horizontal bars: rows [{n, v, c, note}] -> html (uses the shared .bars styles)
  function bars(rows,fmt,max){const mx=max||Math.max(...rows.map(r=>r.v),1e-12);
    return '<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><span class="track"><span class="fill" style="width:'+(100*r.v/mx).toFixed(2)+'%;background:'+(r.c||'var(--acc)')+'"></span></span><span class="val">'+(fmt?fmt(r.v):n0(r.v))+'</span></div>').join('')+'</div>'}
  // line chart: o {el, series:[{name,color,pts:[[x,y]],dash}], xlog, ylog, xlab, ylab, fx, fy, h, xt:[ticks]}
  function lines(o){
    const W=width(o.el),H=o.h||230,L=52,R=14,Tp=12,B=38,iw=W-L-R,ih=H-Tp-B;
    const all=o.series.flatMap(s=>s.pts);
    const tx=v=>o.xlog?Math.log2(v):v,ty=v=>o.ylog?Math.log10(v):v;
    let x0=Math.min(...all.map(p=>tx(p[0]))),x1=Math.max(...all.map(p=>tx(p[0]))),y0=o.ymin!=null?ty(o.ymin):Math.min(...all.map(p=>ty(p[1]))),y1=Math.max(...all.map(p=>ty(p[1])));
    if(!o.ylog&&o.ymin==null)y0=0;if(y1===y0)y1=y0+1;if(x1===x0)x1=x0+1;
    const X=v=>L+(tx(v)-x0)/(x1-x0)*iw,Y=v=>Tp+ih-(ty(v)-y0)/(y1-y0)*ih;
    let s='';
    const yt=o.yt||(o.ylog?(()=>{const r=[];for(let e=Math.floor(y0);e<=Math.ceil(y1);e++)r.push(Math.pow(10,e));return r.filter(v=>ty(v)>=y0-1e-9&&ty(v)<=y1+1e-9)})():[0,.25,.5,.75,1].map(f=>Math.pow(10,0)*(y0+(y1-y0)*f)));
    yt.forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+T(L-5,Y(v)+4,(o.fy||n0)(v),{a:'end',fs:10,fill:'var(--mute)'})});
    (o.xt||[...new Set(all.map(p=>p[0]))]).forEach(v=>{s+=T(X(v),H-B+14,(o.fx||String)(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    if(o.xlab)s+=T(L+iw/2,H-6,esc(o.xlab),{a:'middle',fs:10.5,fill:'var(--mute)'});
    if(o.ylab)s+=T(4,Tp-2+0,esc(o.ylab),{fs:10.5,fill:'var(--mute)'});
    o.series.forEach(se=>{const p=se.pts.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('');
      s+='<path d="'+p+'" fill="none" stroke="'+se.color+'" stroke-width="2"'+(se.dash?' stroke-dasharray="5 4"':'')+'/>';
      se.pts.forEach(q=>{s+='<circle cx="'+X(q[0]).toFixed(1)+'" cy="'+Y(q[1]).toFixed(1)+'" r="3" fill="'+se.color+'"><title>'+esc(se.name)+': '+(o.fx||String)(q[0])+' -> '+(o.fy||n0)(q[1])+'</title></circle>'})});
    o.el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.aria||'chart')+'">'+s+'</svg>'+
      '<div class="xc-leg">'+o.series.map(se=>'<span><i style="background:'+se.color+'"></i>'+esc(se.name)+'</span>').join('')+'</div>';
  }
  // predict-then-reveal blocks: .xc-pr with buttons data-r="1" for the right answer, .xc-ans hidden
  function drills(){document.querySelectorAll('#t-xla .xc-pr').forEach(pr=>{const bs=[...pr.querySelectorAll('.xc-opts button')],ans=pr.querySelector('.xc-ans');
    bs.forEach(b=>b.addEventListener('click',()=>{bs.forEach(x=>{x.classList.remove('xc-right','xc-wrong');if(x.dataset.r==='1')x.classList.add('xc-right')});if(b.dataset.r!=='1')b.classList.add('xc-wrong');ans.hidden=false}))})}
  // fill [data-xc="path.to.value|fmt"] spans from XCD
  const FM={n0,mb,gf,sec,pct:x=>(100*x).toFixed(0)+'%',x1:x=>x.toFixed(1)+'x',raw:x=>String(x),f4:x=>(+x).toFixed(4),f6:x=>(+x).toFixed(6)};
  function get(path){return path.split('.').reduce((a,k)=>a==null?a:a[k],D)}
  function fill(){document.querySelectorAll('#t-xla [data-xc]').forEach(el=>{const [p,f]=el.dataset.xc.split('|');const v=get(p);el.textContent=v==null?'pending':(FM[f||'n0']||n0)(v)})}
  return {D,RM,esc,$,onRender,width,n0,mb,gf,sec,seg,anim,T,bars,lines,drills,fill,get,FM,visible};
})();
