// ---- Overtraining animation: one budget spent two ways, area = compute, to scale ----
(function(){
  const card=$('ot');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const C=7.2e23,T=15e12,STEPS=5,DUR=3000,MOVE=0.8;
  const MO={meta:{N:8e9,D:15e12,n:'Llama 3 8B'},chin:{N:Math.sqrt(C/120),n:'compute-optimal twin'}};MO.chin.D=20*MO.chin.N;
  const FIT=[1.69,406.4,410.7,0.336,0.283],loss=(N,D)=>FIT[0]+FIT[1]/Math.pow(N,FIT[3])+FIT[2]/Math.pow(D,FIT[4]);
  const st={m:'meta',k:0,t:RM?1:0,play:false,spd:1,vis:false,raf:0,last:0,lk:-1,lm:'',user:false,ended:false};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);
  const B=v=>(v/1e9).toFixed(v<1e10?0:1)+'B',Tt=v=>(v/1e12).toFixed(2).replace(/\.?0+$/,'')+'T';
  // the step texts are the two step lists beside the card (sx-ot-meta, sx-ot-chin); check_stages.mjs checks their numbers against these formulas
  function geo(){const narrow=card.clientWidth<560,W=narrow?360:700,H=narrow?300:330,pl=narrow?40:52,pr=12,pt=26,pb=40;
    const sx=(W-pl-pr)/125,sy=(H-pt-pb)/82;return {narrow,W,H,pl,pr,pt,pb,sx,sy,x0:pl,y0:H-pb}}
  function shape(o,g){return {h:o.N/1e9*g.sy,wt:6*o.D/1e12*g.sx,ws:2*T/1e12*g.sx}}
  function draw(){
    const g=geo(),m=st.m,o=MO[m],other=MO[m==='meta'?'chin':'meta'],k=st.k,e=RM?1:ease(cl(st.t/MOVE));
    const sh=shape(o,g),so=shape(other,g);let s='';
    // axes
    [0,20,40,60,80].forEach(v=>{const y=g.y0-v*g.sy;s+='<line x1="'+g.x0+'" x2="'+(g.W-g.pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(g.x0-6)+'" y="'+(y+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'B</text>'});
    [0,30,60,90,120].forEach(v=>{const x=g.x0+v*g.sx;s+='<line x1="'+x+'" x2="'+x+'" y1="'+g.y0+'" y2="'+(g.y0+4)+'" stroke="var(--mute)"/><text x="'+x+'" y="'+(g.y0+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+((g.x0+g.W-g.pr)/2)+'" y="'+(g.H-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(g.narrow?'FLOPs per parameter, ×10¹²':'FLOPs per parameter, ×10¹² (6 per training token, then 2 per served token)')+'</text>';
    s+='<text x="'+g.x0+'" y="16" font-size="11" fill="var(--mute)">Height: parameters N. Area: compute. '+(g.narrow?'':'Both modes share one scale.')+'</text>';
    // ghost of the other allocation
    if(k>=1){s+='<path d="M'+g.x0+' '+g.y0+'v'+(-so.h)+'h'+(so.wt+so.ws)+'v'+so.h+'z" fill="none" stroke="var(--mute)" stroke-dasharray="4 3" opacity=".7"/>';
      const gx=g.x0+so.wt+so.ws,ge=gx+100>g.W;s+='<text x="'+(ge?gx-4:gx+4)+'" y="'+(g.y0-so.h+(so.h<30?-4:12))+'" font-size="10.5" fill="var(--mute)"'+(ge?' text-anchor="end"':'')+'>'+(m==='meta'?'77.5B on 1.55T':'8B on 15T')+'</text>'}
    // size bar
    const hN=k===1?sh.h*e:(k>1?sh.h:0);
    if(k>=1)s+='<rect x="'+(g.x0-3)+'" y="'+(g.y0-hN)+'" width="3" height="'+hN+'" fill="var(--ink)"/>';
    // training rectangle
    const fw=k===2?sh.wt*e:(k>2?sh.wt:0);
    if(k>=1)s+='<rect x="'+g.x0+'" y="'+(g.y0-sh.h)+'" width="'+sh.wt+'" height="'+sh.h+'" fill="none" stroke="var(--acc)" stroke-dasharray="3 3" opacity="'+(k===1?e:1)+'"/>';
    if(fw>0)s+='<rect x="'+g.x0+'" y="'+(g.y0-sh.h)+'" width="'+fw+'" height="'+sh.h+'" fill="var(--acc)" fill-opacity=".75"/>';
    const sw=k===3?sh.ws*e:(k>3?sh.ws:0);
    if(sw>0)s+='<rect x="'+(g.x0+sh.wt)+'" y="'+(g.y0-sh.h)+'" width="'+sw+'" height="'+sh.h+'" fill="var(--bad)" fill-opacity=".75"/>';
    if(k>=2){const lx=g.x0+Math.min(fw,sh.wt)/2,ly=sh.h>40?g.y0-sh.h/2+4:g.y0-sh.h-6;s+='<text x="'+Math.max(g.x0+40,lx)+'" y="'+ly+'" font-size="11" text-anchor="middle"'+(sh.h>40?' fill="var(--bg)"':'')+'>train 6ND</text>'}
    if(k>=3&&sw>20){const lx=g.x0+sh.wt+sw/2,ly=sh.h>40?g.y0-sh.h/2+4:g.y0-sh.h-6;s+='<text x="'+lx+'" y="'+ly+'" font-size="11" text-anchor="middle"'+(sh.h>40?' fill="var(--bg)"':' fill="var(--bad)"')+'>serve 2NT</text>'}
    $('otSvg').innerHTML=svgEl(g.W,g.H,s,'Training and serving compute as areas, step '+(k+1));
    if(st.lk!==k||st.lm!==m){const L=$('sx-ot-'+m);if(L)[...L.children].forEach((li,i)=>{li.classList.toggle('on',i===k);li.classList.toggle('done',i<k);if(i===k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});st.lk=k;st.lm=m}
    const dSo=k<2?0:k===2?o.D*e:o.D,tSo=k<3?0:k===3?T*e:T,trC=6*o.N*dSo,svC=2*o.N*tSo;
    $('otCnt').innerHTML=stat('Parameters N',k>=1?B(o.N):'not chosen',k>=1?fmt(2*o.N/1e9,1)+' GFLOPs per served token':'')+stat('Training tokens',Tt(dSo),k>=2?fmt(dSo/o.N)+' per parameter':'')+stat('Training compute',sci(trC),'of '+sci(C))+stat('Tokens served',Tt(tSo),'serving '+sci(svC))+stat('Total compute',sci(trC+svC),k>=3?'serving is '+Math.round(100*svC/(trC+svC))+'% of it':'');
    const sc=$('otScrub');sc.max=STEPS*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('otPlay'),end=k===STEPS-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  // motion (2026-11-06): plays by itself once at least half of the card is on screen, pauses off screen and resumes, stops for good on any reader
  // control or at the last step, never moves by itself under reduced motion; a mode toggle restarts at step 1 and replays
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  const setP=p=>{st.play=p;if(p)card.dataset.playing='1';else delete card.dataset.playing};
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<STEPS-1){st.k++;st.t=0}else{st.t=1;setP(false);st.ended=true}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{setP(false);if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  const user=()=>{st.user=true;pause()};
  function auto(){if(RM||st.user||st.ended||st.play||!live())return;setP(true);kick();draw()}
  $('otPlay').addEventListener('click',()=>{const was=st.play;user();if(!was){if(st.k===STEPS-1&&st.t>=1){st.k=0;st.t=RM?1:0}else if(st.t>=1&&st.k<STEPS-1){st.k++;st.t=RM?1:0}setP(true);kick()}draw()});
  $('otFwd').addEventListener('click',()=>{user();st.k=Math.min(STEPS-1,st.k+1);st.t=1;draw()});
  $('otBack').addEventListener('click',()=>{user();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('otScrub').addEventListener('input',e=>{const v=+e.target.value;user();st.k=Math.min(STEPS-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(st.k===STEPS-1&&v>=STEPS*100)st.t=1;draw()});
  $('otSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  ['meta','chin'].forEach(m=>{const L=$('sx-ot-'+m);if(L)[...L.children].forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{if(st.m!==m)return;user();st.k=i;st.t=1;draw()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})});
  const seg=$('otM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;['meta','chin'].forEach(m=>{const L=$('sx-ot-'+m);if(L)L.hidden=m!==st.m});st.k=0;st.t=RM?1:0;st.lk=-1;pause();st.user=false;st.ended=false;draw();auto()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const x=es[es.length-1];st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick();auto()});
  draw();
})();
