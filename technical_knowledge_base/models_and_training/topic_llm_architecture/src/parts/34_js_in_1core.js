// Inside a real model (t-inside): shared helpers. Data: window.IND (34_js_in_0data.js, written by src/inside/make_page_data.py).
window.IN=(function(){
  const D=window.IND;if(!D||!document.getElementById('t-inside'))return null;
  const $=id=>document.getElementById(id);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const get=p=>p.split('.').reduce((o,k)=>o==null?undefined:o[k],D);
  // numbers: f decimals; negative f rounds to 10^-f; thousands separators
  function fmt(v,f){if(typeof v!=='number')return v==null?'':String(v);f=f==null?3:+f;
    if(f<0){const m=Math.pow(10,-f);v=Math.round(v/m)*m;f=0}
    return v.toLocaleString('en-GB',{minimumFractionDigits:f,maximumFractionDigits:f})}
  // visible token text: spaces as a dot, newlines as a return sign
  const vis=s=>s.replace(/\n/g,'↵').replace(/ /g,'·');
  const tab=()=>$('t-inside');
  const shown=()=>{const t=tab();return t&&!t.hidden&&t.offsetParent!==null};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-inside']=window.TAB_RENDER['t-inside']||[]).push(()=>{try{f()}catch(e){if(window.__jsErr)window.__jsErr(e)}})}
  let rt=0;addEventListener('resize',()=>{if(!shown())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){}}),80)});
  const b64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const seg=(el,f)=>el&&el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  // simple line chart. o: {w,h,series:[{y:[...],x:[...]?,c,dash,label}],xlab,ylab,log,ymin,ymax,xmin,xmax,xticks,yticks,vlines:[{x,label}]}
  function line(o){
    const w=o.w,h=o.h||200,pl=o.pl||46,pr=o.pr||10,pt=10,pb=o.pb||34;const W=w-pl-pr,H=h-pt-pb;
    let ys=[];o.series.forEach(s=>s.y.forEach(v=>{if(v!=null&&isFinite(v)&&(!o.log||v>0))ys.push(v)}));
    let y0=o.ymin!=null?o.ymin:Math.min(...ys),y1=o.ymax!=null?o.ymax:Math.max(...ys);if(y1===y0)y1=y0+1;
    const L=v=>o.log?Math.log10(v):v;const ly0=L(y0),ly1=L(y1);
    const xs=[];o.series.forEach(s=>(s.x||s.y.map((_,i)=>i)).forEach(v=>xs.push(v)));
    const x0=o.xmin!=null?o.xmin:Math.min(...xs),x1=o.xmax!=null?o.xmax:Math.max(...xs);
    const LX=v=>o.logx?Math.log10(v):v;
    const X=v=>pl+(LX(v)-LX(x0))/((LX(x1)-LX(x0))||1)*W,Y=v=>pt+H-(L(v)-ly0)/((ly1-ly0)||1)*H;
    let b='';
    const yt=o.yticks||(o.log?(()=>{const a=[];for(let e=Math.floor(ly0);e<=Math.ceil(ly1);e++){const v=Math.pow(10,e);if(v>=y0*0.999&&v<=y1*1.001)a.push(v)}return a})():[0,1,2,3,4].map(i=>y0+(y1-y0)*i/4));
    yt.forEach(v=>{b+='<line x1="'+pl+'" x2="'+(pl+W)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+t(pl-4,Y(v)+3.5,o.yf?o.yf(v):fmt(v,Math.abs(y1-y0)<3?2:(Math.abs(y1-y0)<30?1:0)),{a:'end',fs:10.5,fill:'var(--mute)'})});
    (o.xticks||[]).forEach(v=>{const xv=typeof v==='object'?v.x:v,lb=typeof v==='object'?v.l:fmt(v,0);b+=t(X(xv),pt+H+14,lb,{a:'middle',fs:10.5,fill:'var(--mute)'})});
    (o.vlines||[]).forEach(v=>{b+='<line x1="'+X(v.x)+'" x2="'+X(v.x)+'" y1="'+pt+'" y2="'+(pt+H)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+(v.label?t(X(v.x)+4,pt+11,v.label,{fs:10.5,fill:'var(--mute)'}):'')});
    o.series.forEach(s=>{const sx=s.x||s.y.map((_,i)=>i);let d='';let pen=false;
      s.y.forEach((v,i)=>{if(v==null||!isFinite(v)||(o.log&&v<=0)){pen=false;return}d+=(pen?'L':'M')+X(sx[i]).toFixed(1)+' '+Y(Math.min(Math.max(v,y0),y1)).toFixed(1);pen=true});
      b+='<path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="'+(s.sw||2)+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+'/>';
      if(s.dots)s.y.forEach((v,i)=>{if(v!=null&&isFinite(v)&&(!o.log||v>0))b+='<circle cx="'+X(sx[i])+'" cy="'+Y(Math.min(Math.max(v,y0),y1))+'" r="3" fill="'+s.c+'"/>'})});
    if(o.xlab)b+=t(pl+W/2,h-4,o.xlab,{a:'middle',fs:11,fill:'var(--mute)'});
    if(o.ylab)b+='<text transform="translate(11,'+(pt+H/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">'+o.ylab+'</text>';
    if(o.extra)b+=o.extra({X,Y,pl,pt,W,H});
    return svg(w,h,b,o.label);
  }
  // step controller (same behaviour as the Reading tab's RD.anim, registered on this tab)
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);if(!card||!ctl)return null;
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'"><label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const g=s=>$(pid+s);
    function show(){g('s').max=st.n-1;g('s').value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  // predict-then-reveal card. o: {q, opts:[{t,right}], ans (html)}
  function predict(id,o){const el=$(id);if(!el)return;
    el.innerHTML='<div class="in-q">'+o.q+'</div><div class="in-opts">'+o.opts.map((x,i)=>'<button data-i="'+i+'">'+x.t+'</button>').join('')+'<button data-i="skip" class="small">Show the answer</button></div><div class="in-ans" hidden></div>';
    el.querySelector('.in-opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=el.querySelector('.in-ans');
      if(b.dataset.i!=='skip'){const x=o.opts[+b.dataset.i];b.classList.add(x.right?'in-right':'in-wrong');a.innerHTML=(x.right?'<b>Right.</b> ':'<b>Not quite.</b> '+(x.why?x.why+' ':''))+o.ans}else a.innerHTML=o.ans;
      a.hidden=false;tabLinks(a)})}
  function tabLinks(el){el.querySelectorAll('a[data-tab]').forEach(a=>{if(a._in)return;a._in=1;a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}})})}
  // fill prose numbers
  function fill(){document.querySelectorAll('#t-inside .in-v').forEach(s=>{const v=get(s.dataset.k);s.textContent=v==null?'(missing)':fmt(v,s.dataset.f)})}
  fill();
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
  return {D,$,RM,esc,get,fmt,vis,width,onRender,b64,svg,t,seg,line,anim,predict,tabLinks,css,shown};
})();
