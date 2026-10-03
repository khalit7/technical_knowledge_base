// ---- Estimator lab, part b: shared UI helpers (charts, transport, sliced jobs) and experiment 1, the gridworld of Figure 4.1.
(function(){
'use strict';
const $=id=>document.getElementById(id),tab=$('t-lab');if(!tab||!window.LBE)return;
const E=window.LBE,U=window.LBU={$,tab,E};
U.RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
U.vis=()=>!tab.hidden&&!document.hidden;
const MI='−';
U.f=(v,d)=>{if(v==null||!isFinite(v))return v>0?'∞':v<0?MI+'∞':'n/a';const s=Math.abs(v).toFixed(d==null?3:d);return(v<0&&+s!==0?MI:'')+s};
// two significant digits, as Figure 4.1 prints its values
U.sig2=v=>{if(Math.abs(v)<1e-12)return 0;const a=Math.abs(v),r=a>=10?Math.round(a):Math.round(a*10+1e-9)/10;return v<0?-r:r};
U.fs2=v=>{const r=U.sig2(v);return r===0?'0.0':(r<0?MI:'')+(Math.abs(r)>=10?String(Math.abs(r)):Math.abs(r).toFixed(1))};
// an ordered ramp for parameters (n, lambda, alpha), readable on both backgrounds
const RL=['#1d4e89','#2266a8','#2f7fbf','#3a97c4','#3fa7a6','#5aaf7c','#8aae4f','#b99b37','#d07d34','#c95a2f'],RD=['#6fa6ff','#5fb4f0','#59c2dd','#5ccbc0','#6fd0a0','#93d27e','#bccd63','#ddbb55','#efa05a','#f2826a'];
U.ramp=(i,n)=>{const R=matchMedia('(prefers-color-scheme: dark)').matches?RD:RL;if(n<=1)return R[2];return R[Math.round(i*(R.length-1)/(n-1))]};
U.esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// renders: called when the tab opens and on resize while visible
const renders=[];U.onRender=f=>renders.push(f);
function renderAll(){renders.forEach(f=>{try{f()}catch(e){setTimeout(()=>{throw e})}})}
window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(renderAll);
let rz=0,lastW=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(U.vis()&&tab.clientWidth!==lastW){lastW=tab.clientWidth;renderAll()}},150)});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(U.vis())renderAll()});
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
  function frame(ts){A.raf=0;if(!A.playing)return;if(!U.vis()||(sec&&!sec._iv))return;
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

// =================== Experiment 1: the gridworld ===================
const sec=$('lb-gw');
const MS=[['eval','Policy evaluation (DP)'],['vi','Value iteration (DP)'],['pi','Policy iteration (DP)'],['td','TD(0), sampled'],['mc','Monte Carlo, sampled']];
const BOOK={1:[0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0],2:[0,-1.7,-2,-2,-1.7,-2,-2,-2,-2,-2,-2,-1.7,-2,-2,-1.7,0],3:[0,-2.4,-2.9,-3,-2.4,-2.9,-3,-2.9,-2.9,-3,-2.9,-2.4,-3,-2.9,-2.4,0],
  10:[0,-6.1,-8.4,-9,-6.1,-7.7,-8.4,-8.4,-8.4,-8.4,-7.7,-6.1,-9,-8.4,-6.1,0],inf:[0,-14,-20,-22,-14,-18,-20,-20,-20,-20,-18,-14,-22,-20,-14,0]};
const TG=E.gwTargets(),N=200,S={ma:'eval',mb:'td',al:0.1,seed:1,rec:null};
['a','b'].forEach(w=>{$('lb-gw-m'+w).innerHTML=MS.map(m=>'<option value="'+m[0]+'">'+m[1]+'</option>').join('')});$('lb-gw-ma').value='eval';$('lb-gw-mb').value='td';
function target(k){return k==='vi'||k==='pi'?TG.vstar:TG.vpi}
function record(kind){const M=E.gwMethod(kind,{seed:S.seed,alpha:S.al}),T=target(kind),R=[{V:M.V.slice(),ph:'start: every estimate 0',err:E.gwRms(M.V,T),looks:0,samples:0,episodes:0,cur:-1,done:false}];
  let doneAt=-1;for(let f=1;f<N;f++){M.step();if(M.done&&doneAt<0)doneAt=f;R.push({V:M.V.slice(),ph:M.phase,err:E.gwRms(M.V,T),looks:M.looks,samples:M.samples,episodes:M.episodes,cur:M.cur,done:M.done,iter:M.iter})}
  R.doneAt=doneAt;return R}
function rebuild(){S.rec=[record(S.ma),record(S.mb)];if(A)A.show();chart()}
// book check for the Figure 4.1 rows at k = 1, 2, 3, 10 and at convergence
function bookRow(V,k){const B=BOOK[k];let m=0;const bad=[];for(let s=0;s<16;s++){if(U.sig2(V[s])===B[s])m++;else bad.push(s)}return{m,bad}}
function grid(el,fr,kind){const W=Math.max(140,Math.round(el.clientWidth||160)),c=W/4,g=E.gwGreedy(fr.V,1e-9),fsz=Math.max(10,Math.min(16,c*0.26));let s='';
  const mx=kind==='vi'||kind==='pi'?3:22;
  for(let st=0;st<16;st++){const r=(st/4)|0,col=st%4,x=col*c,y=r*c,v=fr.V[st];
    if(E.gwTerm(st))s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" fill="var(--dim)"/>';
    else s+='<rect x="'+x+'" y="'+y+'" width="'+c+'" height="'+c+'" fill="var(--acc)" fill-opacity="'+Math.min(0.55,0.55*Math.abs(v)/mx).toFixed(3)+'"/>';
    if(!E.gwTerm(st)){s+='<text x="'+(x+c/2)+'" y="'+(y+c*0.58)+'" font-size="'+fsz.toFixed(1)+'" text-anchor="middle" font-weight="600">'+U.fs2(v)+'</text>';
      const cx=x+c/2,cy=y+c/2;g[st].forEach(a=>{const d=E.GA[a],L=c*0.36,l2=c*0.24,ax=cx+d[1]*L,ay=cy+d[0]*L,bx=cx+d[1]*l2,by=cy+d[0]*l2,px=-d[0]*c*0.05,py=d[1]*c*0.05;
        s+='<path d="M'+ax.toFixed(1)+' '+ay.toFixed(1)+'L'+(bx+px).toFixed(1)+' '+(by+py).toFixed(1)+'L'+(bx-px).toFixed(1)+' '+(by-py).toFixed(1)+'Z" fill="var(--mute)"/>'})}
    if(fr.cur===st)s+='<circle cx="'+(x+c*0.2)+'" cy="'+(y+c*0.2)+'" r="'+(c*0.08).toFixed(1)+'" fill="var(--bad)"/>'}
  for(let k=0;k<=4;k++)s+='<line x1="'+(k*c)+'" x2="'+(k*c)+'" y1="0" y2="'+W+'" stroke="var(--line)"/><line y1="'+(k*c)+'" y2="'+(k*c)+'" x1="0" x2="'+W+'" stroke="var(--line)"/>';
  el.innerHTML='<svg viewBox="-1 -1 '+(W+2)+' '+(W+2)+'" width="'+W+'" height="'+W+'" role="img" aria-label="4 by 4 grid of value estimates">'+s+'</svg>'}
function status(i,w){const kind=w?S.mb:S.ma,R=S.rec[w],fr=R[Math.min(i,R.length-1)],tn=kind==='vi'||kind==='pi'?'v*':'v<sub>π</sub>';
  let h='<b>'+U.esc(fr.ph)+'</b><br>'+(kind==='td'||kind==='mc'?'sampled steps '+fr.samples:'model look-ups '+fr.looks)+' · error against '+tn+': <b>'+U.f(fr.err,fr.err<0.1?4:2)+'</b>';
  if(kind==='eval'){const k=i;let bk=null;if(BOOK[k]&&k>0)bk=k;else if(fr.done&&i>=R.doneAt)bk='inf';
    if(bk){const b=bookRow(fr.V,bk);h+='<br>Figure 4.1, '+(bk==='inf'?'k = ∞':'k = '+bk)+': <b>'+b.m+' of 16</b> printed values match'+(b.bad.length?(bk===2?' (the four '+MI+'1.75 are printed '+MI+'1.7)':''):'')}}
  return h}
function caption(i){const a=S.rec[0][i],b=S.rec[1][i];let t='';
  if(i===0)t='Both start at zero. Press Play, or Step to go one frame (56 look-ups or 56 sampled steps) at a time.';
  else if(S.ma==='eval'&&i<=3)t=['','After one sweep every state is '+MI+'1: each move costs 1 and all neighbours are still 0. Greedy arrows already point at the corners from the states next to them.','The states next to a corner become '+MI+'1.75 (a quarter of their moves end the episode); the book prints '+MI+'1.7.','After three sweeps the greedy arrows are already optimal everywhere, though the values are far from v<sub>π</sub>: improving a policy needs only the ordering of the values.'][i];
  else if(S.ma==='eval'&&a.done)t='Policy evaluation has converged to v<sub>π</sub> after '+S.rec[0].doneAt+' sweeps ('+56*S.rec[0].doneAt+' look-ups): '+MI+'14, '+MI+'18, '+MI+'20, '+MI+'22 steps to a corner on average, the bottom row of Figure 4.1.';
  else t='Left: '+U.esc(a.ph)+'. Right: '+U.esc(b.ph)+'.';
  if((S.mb==='td'||S.mb==='mc')&&i>0&&!(S.ma==='eval'&&i<=3))t+=' The sampled side has seen '+b.episodes+' episodes and its error is '+U.f(b.err,2)+(S.ma==='eval'||S.ma==='pi'||S.ma==='vi'?' against '+U.f(a.err,a.err<0.1?4:2)+' for the sweeps.':'.');
  $('lb-gw-cap').innerHTML=t}
function draw(i){grid($('lb-gw-va'),S.rec[0][i],S.ma);grid($('lb-gw-vb'),S.rec[1][i],S.mb);$('lb-gw-sa').innerHTML=status(i,0);$('lb-gw-sb').innerHTML=status(i,1);caption(i);chart(i)}
function chart(i){if(!S.rec)return;const el=$('lb-gw-ch');if(!el.clientWidth&&!U.vis())return;i=i==null?(A?A.i:0):i;const xs=[];for(let k=0;k<N;k++)xs.push(k);
  U.chart(el,{x:[0,N-1],y:[0.001,30],log:true,yt:[0.001,0.01,0.1,1,10],yf:v=>v>=1?String(v):String(v),xt:[0,50,100,150,199],xl:'frames (56 look-ups or 56 sampled steps each)',vx:i,
    series:[{x:xs,y:S.rec[0].map(r=>Math.max(r.err,0.001)),c:'var(--c1)'},{x:xs,y:S.rec[1].map(r=>Math.max(r.err,0.001)),c:'var(--c2)'}],label:'Error of both methods against frames'})}
// what Figure 4.1 says, recomputed here
function bookChecks(){let V=new Array(16).fill(0);const pi=E.gwRandomPi(),rows=[],H={0:V};for(let k=1;k<=3000;k++){V=E.gwEval(V,pi);H[k]=V}H.inf=V;
  let tot=16;const per=[];[1,2,3,10,'inf'].forEach(k=>{const b=bookRow(H[k],k);tot+=b.m;per.push('k = '+(k==='inf'?'∞':k)+': '+b.m)});
  rows.push([tot===92?true:false,'Figure 4.1 values: <b>'+tot+' of 96</b> match at two significant digits (k = 0: 16, '+per.join(', ')+'). The four misses are the exact '+MI+'1.75 at k = 2, printed '+MI+'1.7, while '+MI+'2.875 at k = 3 is printed '+MI+'2.9: a rounding slip in the figure.']);
  const vs=TG.vstar,opt=E.gwGreedy(vs,1e-9),isOpt=V2=>E.gwGreedy(V2,1e-9).every((g,s)=>g.every(a=>opt[s].includes(a)));
  rows.push([!isOpt(H[2])&&isOpt(H[3])&&isOpt(H[10]),'Greedy policy optimal from k = 3 on, not at k = 2: as the caption says ("all policies after the third iteration are optimal").']);
  const vi=E.gwMethod('vi',{});let f=0;while(!vi.done){vi.step();f++}
  const pm=E.gwMethod('pi',{});let g=0;while(!pm.done){pm.step();g++}
  rows.push([null,'Value iteration reaches v* in 3 sweeps (a fourth confirms). Policy iteration from the random policy needs '+g+' frames, almost all of them evaluating the random policy; one improvement step already gives an optimal policy.']);
  const e=S.rec?S.rec:null;if(e){const ev=record('eval'),td=record('td'),mc=record('mc');
    rows.push([null,'At frame 199, with the same work spent: policy evaluation error '+U.f(ev[N-1].err,5)+' (converged at sweep '+ev.doneAt+'), Monte Carlo '+U.f(mc[N-1].err,2)+', TD(0) with α = '+S.al+' '+U.f(td[N-1].err,2)+'. A model buys exactness; samples only approach it, and constant-α TD keeps jittering around it.'])}
  U.checks($('lb-gw-chk'),rows)}
let A=null;
function init(){if(A)return;rebuild();
  A=U.anim({p:'lb-gw',sec,n:()=>N,speeds:[['slow',2],['normal',6],['fast',20]],def:1,draw,label:i=>'frame '+i+' of '+(N-1)});A.show();bookChecks();
  ['a','b'].forEach((w,k)=>$('lb-gw-m'+w).onchange=e=>{S[k?'mb':'ma']=e.target.value;rebuild()});
  $('lb-gw-al').onchange=e=>{S.al=+e.target.value;rebuild();bookChecks()};$('lb-gw-seed').onchange=e=>{S.seed=+e.target.value;rebuild();bookChecks()}}
U.onRender(()=>{init();if(A)A.show()});
})();
