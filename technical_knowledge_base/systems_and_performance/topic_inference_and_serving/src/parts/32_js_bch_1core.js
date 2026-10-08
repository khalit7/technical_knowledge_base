// ---- Engine bench tab (t-bench): shared helpers. Charts are SVG strings sized from the measured container width. ----
window.BCH=(function(){
  const D=window.BCH_DATA, TAB='t-bench';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const med=a=>{const b=a.filter(x=>x!=null&&isFinite(x)).slice().sort((x,y)=>x-y);if(!b.length)return null;const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
  const mn=a=>Math.min.apply(null,a.filter(x=>x!=null)),mx=a=>Math.max.apply(null,a.filter(x=>x!=null));
  const mean=a=>{const b=a.filter(x=>x!=null);return b.reduce((s,x)=>s+x,0)/b.length};
  // number formatting: n digits after the point, thousands separators
  const f=(x,n)=>x==null||!isFinite(x)?'n/a':Number(x).toLocaleString('en-US',{minimumFractionDigits:n||0,maximumFractionDigits:n||0});
  const fs=x=>x==null?'n/a':(Math.abs(x)>=100?f(x,0):Math.abs(x)>=10?f(x,1):f(x,2));
  const hooks=[];
  const onRender=fn=>{hooks.push(fn);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(fn)};
  const visible=()=>{const t=$(TAB);return !!(t&&!t.hidden&&t.offsetParent!==null)};
  let rt=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rt);rt=setTimeout(()=>hooks.forEach(h=>{try{h()}catch(e){}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.rot?' transform="rotate('+o.rot+' '+x.toFixed(1)+' '+y.toFixed(1)+')"':'')+'>'+s+'</text>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  // nice ticks
  function ticks(lo,hi,n){const span=hi-lo||1;const step0=span/(n||5);const p=Math.pow(10,Math.floor(Math.log10(step0)));const s=[1,2,2.5,5,10].map(k=>k*p).find(k=>k>=step0)||10*p;
    const out=[];for(let v=Math.ceil(lo/s)*s;v<=hi+1e-9;v+=s)out.push(+v.toFixed(10));return out}
  function logTicks(lo,hi){const out=[];for(let e=Math.floor(Math.log10(lo));e<=Math.ceil(Math.log10(hi));e++)[1,2,5].forEach(k=>{const v=k*Math.pow(10,e);if(v>=lo*0.999&&v<=hi*1.001)out.push(v)});return out}
  const short=v=>v>=1e6?f(v/1e6,v%1e6?1:0)+'M':v>=1e3?(v%1e3?f(v/1e3,1):f(v/1e3,0))+'k':(v<1&&v>0?String(+v.toFixed(3)):f(v,0));
  // line/scatter chart. o: {el, series:[{name,color,pts:[[x,y,lo,hi,tip]],dash,marker}], xlab, ylab, xlog, ylog, xmin,xmax,ymin,ymax, h, hl:[{x or y, label}], label}
  function chart(o){
    const W=width(o.el),narrow=W<480,H=o.h||(narrow?250:300);
    const L=narrow?44:54,R=narrow?10:16,Tp=14,B=narrow?40:44;
    const all=o.series.flatMap(s=>s.pts);
    const xs=all.map(p=>p[0]),ys=all.flatMap(p=>[p[1],p[2]!=null?p[2]:p[1],p[3]!=null?p[3]:p[1]]).filter(v=>v!=null&&isFinite(v));
    let x0=o.xmin!=null?o.xmin:Math.min(...xs),x1=o.xmax!=null?o.xmax:Math.max(...xs);
    let y0=o.ymin!=null?o.ymin:(o.ylog?Math.min(...ys)/1.3:0),y1=o.ymax!=null?o.ymax:Math.max(...ys)*(o.ylog?1.3:1.08);
    if(o.xlog){x0=x0/1.15;x1=x1*1.15}else if(o.xmin==null){const pad=(x1-x0)*0.04||1;x0=Math.max(0,x0-pad);x1=x1+pad}
    const sx=o.xlog?(v=>L+(Math.log(v)-Math.log(x0))/(Math.log(x1)-Math.log(x0))*(W-L-R)):(v=>L+(v-x0)/(x1-x0)*(W-L-R));
    const sy=o.ylog?(v=>Tp+(1-(Math.log(v)-Math.log(y0))/(Math.log(y1)-Math.log(y0)))*(H-Tp-B)):(v=>Tp+(1-(v-y0)/(y1-y0))*(H-Tp-B));
    let g='';
    const yt=o.ylog?logTicks(y0,y1):ticks(y0,y1,narrow?4:5);
    yt.forEach(v=>{const y=sy(v);g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)"/>'+T(L-5,y+3.5,short(v),{a:'end',fs:10,fill:'var(--mute)'})});
    let xt=o.xticks||(o.xlog?logTicks(x0,x1):ticks(x0,x1,narrow?4:6));
    if(narrow&&xt.length>6)xt=xt.filter((v,i)=>i%2===0);
    xt.forEach(v=>{const x=sx(v);g+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+Tp+'" y2="'+(H-B)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+T(x,H-B+14,short(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--mute)"/>';
    g+=T((L+W-R)/2,H-6,esc(o.xlab||''),{a:'middle',fs:11,fill:'var(--mute)'});
    g+=T(12,Tp+(H-Tp-B)/2,esc(o.ylab||''),{a:'middle',fs:11,fill:'var(--mute)',rot:-90});
    (o.hl||[]).forEach(h=>{if(h.y!=null&&h.y>=y0&&h.y<=y1){const y=sy(h.y);g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+(h.color||'var(--bad)')+'" stroke-dasharray="5 4"/>'+T(W-R-4,y-4,esc(h.label||''),{a:'end',fs:10,fill:h.color||'var(--bad)'})}
      if(h.x!=null&&h.x>=x0&&h.x<=x1){const x=sx(h.x);g+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+Tp+'" y2="'+(H-B)+'" stroke="'+(h.color||'var(--bad)')+'" stroke-dasharray="5 4"/>'+T(x+4,Tp+10,esc(h.label||''),{fs:10,fill:h.color||'var(--bad)'})}});
    o.series.forEach(s=>{
      const pts0=s.pts.filter(p=>p[1]!=null&&isFinite(p[1])&&p[0]!=null);const pts=s.ordered?pts0:pts0.slice().sort((a,b)=>a[0]-b[0]);
      if(!pts.length)return;
      pts.forEach(p=>{if(p[2]!=null&&p[3]!=null){const x=sx(p[0]);g+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+sy(Math.max(p[2],o.ylog?y0:-1e18)).toFixed(1)+'" y2="'+sy(p[3]).toFixed(1)+'" stroke="'+s.color+'" stroke-width="1.5" opacity=".55"/>'}});
      if(!s.noline)g+='<polyline fill="none" stroke="'+s.color+'" stroke-width="'+(s.sw||2)+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+' points="'+pts.map(p=>sx(p[0]).toFixed(1)+','+sy(p[1]).toFixed(1)).join(' ')+'"/>';
      if(s.marker!==false)pts.forEach(p=>{g+='<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+sy(p[1]).toFixed(1)+'" r="'+(s.r||3.2)+'" fill="'+(s.hollow?'var(--bg)':s.color)+'" stroke="'+s.color+'" stroke-width="1.5"><title>'+esc(p[4]||(s.name+': '+fs(p[1])))+'</title></circle>'});
      if(s.ptlab)pts.forEach(p=>{if(p[5]!=null)g+=T(sx(p[0])+5,sy(p[1])-5,esc(String(p[5])),{fs:9.5,fill:s.color})});
      if(s.label){const p=pts[pts.length-1];const x=Math.min(sx(p[0]),W-R-2);g+=T(x,sy(p[1])-7,esc(s.label),{a:'end',fs:10.5,fill:s.color,w:600})}
    });
    o.el.innerHTML=svg(W,H,g,o.label||o.ylab);
    if(o.legend){const lg=o.legend;lg.innerHTML=o.series.filter(s=>!s.noleg).map(s=>'<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>').join('')}
    return {sx,sy,W,H};
  }
  // horizontal bars: rows [{name, v, lo, hi, color, note, hl}], el, unit, max
  function bars(el,rows,o){o=o||{};const m=o.max||Math.max(...rows.filter(r=>!r.hdr).map(r=>r.hi!=null?r.hi:r.v));
    el.innerHTML=rows.map(r=>r.hdr?'<div class="bch-bhdr">'+esc(r.name)+'</div>':'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+(r.sub?'<span class="ml">'+esc(r.sub)+'</span>':'')+'</span><span class="track"><span class="fill" style="width:'+(100*Math.max(0,r.v)/m).toFixed(2)+'%;background:'+(r.color||'var(--acc)')+'"></span>'+
      (r.lo!=null&&r.hi!=null?'<span class="rng" style="left:'+(100*r.lo/m).toFixed(2)+'%;width:'+(100*Math.max(0.3,(r.hi-r.lo))/m).toFixed(2)+'%"></span>':'')+'</span><span class="val">'+(r.vt!=null?r.vt:fs(r.v))+(o.unit?' '+o.unit:'')+'</span></div>').join('')}
  // segmented control
  function seg(el,fn){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});fn(b.dataset.m)})}
  // step animation controller for this tab (same manners as the Reading tab's RD.anim): plays only on screen and in the visible tab, starts paused under reduced motion
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'"><label class="small">Speed <select id="'+pid+'v"><option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const g=s=>$(pid+s);
    function show(){g('s').max=st.n-1;g('s').value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&visible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||100)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||100)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+(o.jump||1));show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-(o.jump||1));show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&visible()){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();if(st.vis&&!st.started&&!RM){st.started=true;setPlay(true)}kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i},get n(){return st.n}};
  }
  // predict-then-reveal: el has data-ans (button index) ; buttons inside .opts ; .ans hidden until clicked
  function predict(el){const opts=el.querySelectorAll('.opts button'),ans=el.querySelector('.ans');const right=+el.dataset.ans;
    opts.forEach((b,i)=>b.addEventListener('click',()=>{opts.forEach((x,j)=>{x.classList.toggle('right',j===right);x.classList.toggle('wrong',j===i&&i!==right)});ans.hidden=false}))}
  // facts: fill every [data-f] with the formatted value computed from the data
  const FACT={};
  function fill(root){(root||document).querySelectorAll('#'+TAB+' [data-f]').forEach(e=>{const k=e.dataset.f;e.textContent=k in FACT?FACT[k]:'??'})}
  return {D,RM,$,esc,med,mn,mx,mean,f,fs,onRender,visible,width,T,svg,ticks,chart,bars,seg,anim,predict,FACT,fill,TAB};
})();
