// ---- Flow lab (t-flow): shared helpers. Data in window.FWD (33_js_fw_0data.js, written by src/flow/make_page_data.py) ----
window.FW=(function(){
  const D=window.FWD||{};const F=D.f||{};
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-flow');
  const visible=()=>{const t=tab();return t&&!t.hidden&&t.offsetParent!==null};
  const renders=[];
  const onRender=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-flow']=window.TAB_RENDER['t-flow']||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){}}),80)});
  const b64=s=>{const b=atob(s);const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  // one sprite sheet of 28 x 28 tiles (cols per row); D.tiles[key] = first tile index of a run
  let sheetIm=null;
  function sheet(){if(!sheetIm){sheetIm=new Image();sheetIm.decoding='async';sheetIm.src=D.sheet||''}return sheetIm}
  function canv(label){const c=document.createElement('canvas');c.className='fw-im';c.width=28;c.height=28;c.setAttribute('role','img');if(label)c.setAttribute('aria-label',label);return c}
  function tiles(el,key,off,k,labels){const t0=(D.tiles||{})[key];if(t0==null){el.innerHTML='<span class="small" style="color:var(--bad)">missing '+key+'</span>';return}
    if(el.children.length!==k||el.firstChild.tagName!=='CANVAS'){el.innerHTML='';for(let i=0;i<k;i++)el.appendChild(canv(labels?labels[i]:''))}
    const cols=D.cols||10,im=sheet(),req=key+'|'+off;el.dataset.req=req;
    const go=()=>{if(el.dataset.req!==req)return;for(let i=0;i<k;i++){const c=el.children[i].getContext('2d'),j=t0+off+i;c.drawImage(im,(j%cols)*28,Math.floor(j/cols)*28,28,28,0,0,28,28)}};
    if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true})}
  const CLS=['T-shirt','Trouser','Pullover','Dress','Coat','Sandal','Shirt','Sneaker','Bag','Ankle boot'];
  function clsRow(el){el.innerHTML=CLS.map(c=>'<span>'+c+'</span>').join('')}
  function facts(){document.querySelectorAll('#t-flow [data-fw]').forEach(e=>{const v=F[e.dataset.fw];e.innerHTML=v==null?'<span style="color:var(--bad)">missing '+e.dataset.fw+'</span>':v})}
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  const segVal=el=>{const b=el.querySelector('button.on');return b?b.dataset.m:null};
  function setSeg(el,m){el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m===m))}
  function nice(x){const e=Math.pow(10,Math.floor(Math.log10(x)));const m=x/e;return (m<1.5?1:m<3?2:m<7?5:10)*e}
  function fmt(v){const a=Math.abs(v);if(a>=10000)return (v/1000).toFixed(0)+'k';if(a>=100)return v.toFixed(0);if(a>=1)return +v.toFixed(2)+'';if(a===0)return '0';if(a>=0.01)return +v.toFixed(3)+'';return v.toExponential(0)}
  // line chart: series [{name,color,pts:[[x,y]],dash}], opts {logx,logy,xlab,ylab,h,hline:{y,label},yfmt,xticks,ymin,ymax}
  function chart(el,series,o){o=o||{};const W=width(el),H=o.h||230,ml=46,mr=10,mt=10,mb=34;
    const xs=[],ys=[];series.forEach(s=>s.pts.forEach(p=>{if(isFinite(p[1])){xs.push(p[0]);ys.push(p[1])}}));if(o.hline)ys.push(o.hline.y);
    const tx=v=>o.logx?Math.log10(v):v,ty=v=>o.logy?Math.log10(v):v;
    let x0=Math.min(...xs.map(tx)),x1=Math.max(...xs.map(tx)),y0=o.ymin!=null?ty(o.ymin):Math.min(...ys.map(ty)),y1=o.ymax!=null?ty(o.ymax):Math.max(...ys.map(ty));
    if(y1===y0){y1+=1;y0-=1}const pad=(y1-y0)*.06;if(o.ymin==null)y0-=pad;if(o.ymax==null)y1+=pad;
    const X=v=>ml+(tx(v)-x0)/(x1-x0||1)*(W-ml-mr),Y=v=>mt+(1-(ty(v)-y0)/(y1-y0))*(H-mt-mb);
    let g='';
    const yt=o.logy?(()=>{const r=[],m=(y1-y0)<2.2?[1,2,5]:[1];for(let e=Math.floor(y0);e<=Math.ceil(y1);e++)m.forEach(k=>{const v=k*Math.pow(10,e),l=Math.log10(v);if(l>=y0-1e-9&&l<=y1+1e-9)r.push(v)});return r})():(()=>{const r=[],st=nice((y1-y0)/4);for(let v=Math.ceil(y0/st)*st;v<=y1+1e-9;v+=st)r.push(+v.toFixed(10));return r})();
    yt.forEach(v=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(Y(v)+4)+'" text-anchor="end" fill="var(--mute)">'+(o.yfmt?o.yfmt(v):fmt(v))+'</text>'});
    (o.xticks||[]).forEach(v=>{g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-mb+14)+'" text-anchor="'+(X(v)>W-mr-14?'end':X(v)<ml+8?'start':'middle')+'" fill="var(--mute)">'+(o.xfmt?o.xfmt(v):fmt(v))+'</text>'});
    if(o.hline){g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(o.hline.y)+'" y2="'+Y(o.hline.y)+'" stroke="var(--mute)" stroke-dasharray="4 3"/><text x="'+(W-mr-2)+'" y="'+(Y(o.hline.y)-4)+'" text-anchor="end" fill="var(--mute)">'+o.hline.label+'</text>'}
    series.forEach(s=>{const p=s.pts.filter(q=>isFinite(q[1]));if(!p.length)return;
      g+='<polyline fill="none" stroke="'+s.color+'" stroke-width="2"'+(s.dash?' stroke-dasharray="5 3"':'')+' points="'+p.map(q=>X(q[0]).toFixed(1)+','+Y(q[1]).toFixed(1)).join(' ')+'"/>';
      p.forEach(q=>{g+='<circle cx="'+X(q[0]).toFixed(1)+'" cy="'+Y(q[1]).toFixed(1)+'" r="2.6" fill="'+s.color+'"><title>'+esc(s.name)+': '+q[0]+', '+fmt(q[1])+'</title></circle>'})});
    if(o.xlab)g+='<text x="'+((ml+W-mr)/2)+'" y="'+(H-4)+'" text-anchor="middle" fill="var(--mute)">'+o.xlab+'</text>';
    if(o.ylab)g+='<text x="12" y="'+(mt+(H-mt-mb)/2)+'" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+(mt+(H-mt-mb)/2)+')">'+o.ylab+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.label||'chart')+'">'+g+'</svg>';
    return {X,Y,W,H}}
  const leg=(el,items)=>{el.innerHTML=items.map(i=>'<span><i style="background:'+i[1]+'"></i>'+i[0]+'</span>').join('')};
  // discrete step animation: play, pause, step, scrub, speed; only on screen in the visible tab; paused under reduced motion
  function anim(o){const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const p=o.ctl+'-';
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step">&#9664;&#9664;</button><button id="'+p+'p" aria-label="Play">&#9654; Play</button><button id="'+p+'f" aria-label="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'"><label class="small">Speed <select id="'+p+'v"><option value="0.5">0.5&times;</option><option value="1" selected>1&times;</option><option value="2">2&times;</option></select></label>';
    const q=s=>$(p+s);
    function show(){const sc=q('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||900)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||900)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(v){st.play=v;q('p').innerHTML=v?'&#10073;&#10073; Pause':'&#9654; Play';q('p').setAttribute('aria-label',v?'Pause':'Play');if(!v&&st.timer){clearTimeout(st.timer);st.timer=0}if(v&&st.i>=st.n-1){st.i=0;show()}kick()}
    q('p').addEventListener('click',()=>setPlay(!st.play));
    q('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    q('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    q('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    q('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM)setPlay(true)}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);onRender(()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=Math.min(st.i,n-1);show()},redraw(){o.draw(st.i)},get i(){return st.i}}}
  function quiz(){document.querySelectorAll('#t-flow .fw-q').forEach(q=>{const right=+(q.dataset.right||1);q.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    q.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));b.classList.add(+b.dataset.a===right?'right':'wrong');
    q.querySelector('.opts button[data-a="'+right+'"]').classList.add('right');q.querySelector('.ans').hidden=false}))})}
  function nav(){const n=$('fw-nav');if(!n)return;n.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const s=document.getElementById(a.getAttribute('href').slice(1));if(s)s.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'})})}
  return {D,F,RM,$,b64,tiles,canv,clsRow,facts,width,esc,stat,seg,segVal,setSeg,chart,fmt,leg,anim,quiz,nav,onRender,visible,CLS};
})();
