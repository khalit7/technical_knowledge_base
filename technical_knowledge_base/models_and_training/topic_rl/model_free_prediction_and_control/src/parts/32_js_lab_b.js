// ---- Lab helpers (adapted from Topic: rl's Estimator lab, part b): charts, transport, sliced jobs. The gridworld experiment went to Dynamic programming; here each experiment is its own tab.
(function(){
'use strict';
const $=id=>document.getElementById(id);if(!window.LBE)return;
const E=window.LBE,U=window.LBU={$,E};
U.RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
// visible: the page is shown and the element's tab is the open one
U.vis=el=>{if(document.hidden)return false;const t=el&&el.closest?el.closest('.tab'):null;return!t||!t.hidden};
const MI='−';
U.f=(v,d)=>{if(v==null||!isFinite(v))return v>0?'∞':v<0?MI+'∞':'n/a';const s=Math.abs(v).toFixed(d==null?3:d);return(v<0&&+s!==0?MI:'')+s};
// two significant digits, as Figure 4.1 prints its values
U.sig2=v=>{if(Math.abs(v)<1e-12)return 0;const a=Math.abs(v),r=a>=10?Math.round(a):Math.round(a*10+1e-9)/10;return v<0?-r:r};
U.fs2=v=>{const r=U.sig2(v);return r===0?'0.0':(r<0?MI:'')+(Math.abs(r)>=10?String(Math.abs(r)):Math.abs(r).toFixed(1))};
// an ordered ramp for parameters (n, lambda, alpha), readable on both backgrounds
const RL=['#1d4e89','#2266a8','#2f7fbf','#3a97c4','#3fa7a6','#5aaf7c','#8aae4f','#b99b37','#d07d34','#c95a2f'],RD=['#6fa6ff','#5fb4f0','#59c2dd','#5ccbc0','#6fd0a0','#93d27e','#bccd63','#ddbb55','#efa05a','#f2826a'];
U.ramp=(i,n)=>{const R=matchMedia('(prefers-color-scheme: dark)').matches?RD:RL;if(n<=1)return R[2];return R[Math.round(i*(R.length-1)/(n-1))]};
U.esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// renders: f runs when tab `tid` opens, and on resize or a colour-scheme change while that tab is open
const R={};U.onRender=(tid,f)=>{(R[tid]=R[tid]||[]).push(f);window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER[tid]=window.TAB_RENDER[tid]||[]).push(()=>{try{f()}catch(e){setTimeout(()=>{throw e})}})};
function renderOpen(force){Object.keys(R).forEach(tid=>{const t=$(tid);if(!t||t.hidden)return;if(!force&&t.clientWidth===t._lw)return;t._lw=t.clientWidth;R[tid].forEach(f=>{try{f()}catch(e){setTimeout(()=>{throw e})}})})}
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>renderOpen(false),150)});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>renderOpen(true));
// visibility of a section on screen
U.watch=function(el,cb){el._iv=false;if(!('IntersectionObserver' in window)){el._iv=true;return}
  new IntersectionObserver(es=>{es.forEach(e=>{el._iv=e.isIntersecting;if(e.isIntersecting&&cb)cb()})},{rootMargin:'100px'}).observe(el)};
// a long average, run in slices of about 12 ms so the page stays responsive
U.job=function(gen,prog,done){const h={cancel:false};
  function tick(){if(h.cancel)return;const t0=performance.now();let r;
    do{r=gen.next();if(r.done){prog(1);done(r.value);return}}while(performance.now()-t0<12);
    prog(r.value);setTimeout(tick,0)}
  setTimeout(tick,0);return h};
U.prog=(el,v)=>{if(el)el.style.width=(100*Math.max(0,Math.min(1,v))).toFixed(1)+'%'};
// line chart in SVG, sized from the container's measured width; lines leaving the plotting area are clipped, as in the book's figures
let cid=0;
U.chart=function(el,o){const W=Math.max(260,Math.round(el.clientWidth||300)),H=o.H||(W<480?210:250),pl=o.pl||40,pr=10,pt=8,pb=o.xl?36:22,id='lbc'+(++cid);
  const lg=!!o.log,ty=v=>lg?Math.log10(v):v,[x0,x1]=o.x,[y0,y1]=o.y;
  const sx=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0),sy=v=>{const y=pt+(H-pt-pb)*(1-(ty(v)-ty(y0))/(ty(y1)-ty(y0)));return Math.max(-2000,Math.min(H+2000,y))};
  let s='<defs><clipPath id="'+id+'"><rect x="'+pl+'" y="'+pt+'" width="'+(W-pl-pr)+'" height="'+(H-pt-pb)+'"/></clipPath></defs>';
  (o.yt||[]).forEach(v=>{const y=sy(v).toFixed(1);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(+y+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(o.yf?o.yf(v):v)+'</text>'});
  (o.xt||[]).forEach(v=>{const x=sx(v).toFixed(1);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+x+'" y="'+(H-pb+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(o.xf?o.xf(v):v)+'</text>'});
  s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(H-pb)+'" y2="'+(H-pb)+'" stroke="var(--mute)"/>';
  if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
  s+='<g clip-path="url(#'+id+')">';
  (o.series||[]).forEach(se=>{if(se.off)return;let d='',pen=false;for(let i=0;i<se.y.length;i++){const v=se.y[i],xv=se.x?se.x[i]:i;if(v==null||!isFinite(v)||(lg&&v<=0)){pen=false;continue}d+=(pen?'L':'M')+sx(xv).toFixed(1)+' '+sy(v).toFixed(1);pen=true}
    s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="'+(se.w||1.8)+'"'+(se.dash?' stroke-dasharray="5 4"':'')+(se.op?' opacity="'+se.op+'"':'')+' stroke-linejoin="round"/>';
    if(se.dots)for(let i=0;i<se.y.length;i++){const v=se.y[i];if(v==null||!isFinite(v)||(lg&&v<=0))continue;s+='<circle cx="'+sx(se.x?se.x[i]:i).toFixed(1)+'" cy="'+sy(v).toFixed(1)+'" r="2.2" fill="'+se.c+'"'+(se.op?' opacity="'+se.op+'"':'')+'/>'}});
  if(o.vx!=null){const x=sx(o.vx).toFixed(1);s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3" opacity=".6"/>'}
  (o.hl||[]).forEach(h=>{const y=sy(h.v).toFixed(1);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="'+(h.c||'var(--mute)')+'" stroke-dasharray="3 3"/>'+(h.t?'<text x="'+(W-pr-3)+'" y="'+(+y-4)+'" font-size="10" text-anchor="end" fill="'+(h.c||'var(--mute)')+'">'+h.t+'</text>':'')});
  s+='</g>';
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+U.esc(o.label||'chart')+'">'+s+'</svg>'};
// legend of toggle buttons; on[k] false hides that series
U.legend=function(el,items,on,cb){el.innerHTML=items.map(it=>'<button data-k="'+it.k+'" class="'+(on[it.k]===false?'off':'')+'" aria-pressed="'+(on[it.k]!==false)+'"><i class="'+(it.dash?'d':'')+'" style="border-color:'+it.c+'"></i>'+it.lab+'</button>').join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;on[k]=on[k]===false;cb()})};
U.checks=function(el,rows){el.innerHTML=rows.map(r=>'<li><span class="'+(r[0]===true?'lb-ok':r[0]===false?'lb-no':'lb-in')+'">'+(r[0]===true?'✓':r[0]===false?'✗':'•')+'</span><span>'+r[1]+'</span></li>').join('')};
// transport: play, back, step, speed, frame counter and scrubber; animates only while its section is on screen and the tab is visible
U.anim=function(o){const tr=$(o.p+'-tr'),sec=o.sec;
  tr.innerHTML='<button class="lb-pl" id="'+o.p+'-play" aria-pressed="false">Play</button><button id="'+o.p+'-back" aria-label="Step back">&#9664; Back</button><button id="'+o.p+'-fwd" aria-label="Step forward">Step &#9654;</button>'+
    '<label>Speed <select id="'+o.p+'-spd">'+o.speeds.map((s,i)=>'<option value="'+i+'"'+(i===(o.def||0)?' selected':'')+'>'+s[0]+'</option>').join('')+'</select></label><span class="fn" id="'+o.p+'-fn"></span>';
  const sc=document.createElement('div');sc.className='lb-scr';sc.innerHTML='<span>'+(o.scrubLabel||'Scrub')+'</span><input type="range" id="'+o.p+'-scr" min="0" max="0" value="0" aria-label="'+(o.scrubLabel||'Frame shown')+'">';tr.after(sc);
  const A={i:0,playing:false,acc:0,raf:0,last:0},play=$(o.p+'-play'),scr=$(o.p+'-scr'),spd=$(o.p+'-spd');
  function show(){const n=o.n();A.i=Math.max(0,Math.min(n-1,A.i));scr.max=String(o.scrubMax?o.scrubMax():n-1);scr.value=String(o.toScrub?o.toScrub(A.i):A.i);$(o.p+'-fn').textContent=o.label(A.i);o.draw(A.i)}
  function setPlay(on){A.playing=on;play.textContent=on?'Pause':(A.i>=o.n()-1?'Replay':'Play');play.setAttribute('aria-pressed',String(on));if(on){if(A.i>=o.n()-1){A.i=0;show()}kick()}}
  function kick(){if(!A.raf&&A.playing){A.last=0;A.raf=requestAnimationFrame(frame)}}
  function frame(ts){A.raf=0;if(!A.playing)return;if(!U.vis(sec)||(sec&&!sec._iv))return;
    if(!A.last)A.last=ts;const dt=Math.min(0.25,(ts-A.last)/1000);A.last=ts;const sp=o.speeds[+spd.value];A.acc+=dt*sp[1];
    if(A.acc>=1){const k=Math.floor(A.acc);A.acc-=k;A.i=o.adv?o.adv(A.i,k,+spd.value):Math.min(o.n()-1,A.i+k);show();if(A.i>=o.n()-1){setPlay(false);return}}
    A.raf=requestAnimationFrame(frame)}
  play.onclick=()=>setPlay(!A.playing);
  $(o.p+'-fwd').onclick=()=>{setPlay(false);A.i=o.adv?o.adv(A.i,1,+spd.value):A.i+1;show()};
  $(o.p+'-back').onclick=()=>{setPlay(false);A.i=o.back?o.back(A.i):Math.max(0,A.i-1);show()};
  scr.oninput=()=>{setPlay(false);A.i=o.fromScrub?o.fromScrub(+scr.value):+scr.value;show()};
  A.show=show;A.setPlay=setPlay;A.kick=kick;A.set=i=>{A.i=i;show()};
  if(sec)U.watch(sec,()=>{if(!A.started){A.started=true;if(!U.RM&&o.autoplay!==false)setPlay(true)}kick()});
  return A};
U.seg=function(el,cb){el.querySelectorAll('button').forEach(b=>b.onclick=()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))});cb(b)})};

})();
