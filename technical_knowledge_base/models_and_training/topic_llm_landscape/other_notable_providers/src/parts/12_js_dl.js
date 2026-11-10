// ---- Training-sync animation: sync every step (data parallel) against DiLoCo as INTELLECT-1 ran it ----
(function(){
  const card=$('dl');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DUR=3200;
  // INTELLECT-1 report (arXiv 2412.01152): 100 inner steps take 38 min on an 8xH100 node; median all-reduce of the int8 pseudo-gradient
  const R={us:{n:'USA',ar:103,pub:95.7},ta:{n:'USA and Europe',ar:382,pub:85.6},gl:{n:'Global (USA, Europe, Asia)',ar:469,pub:83.0}};
  const IN=100,C=38*60,STEP=C/IN,P=10e9; // 10B parameters
  const st={m:'dp',r:'us',k:0,t:RM?1:0,play:false,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v;
  const ar=()=>R[st.r].ar, arDP=()=>4*ar(); // fp32 gradient is 4 times the int8 payload; this page assumes time scales with bytes
  const T=()=>{const a=ar();return [STEP,STEP+arDP(),C,C+a,2*C+a,2*(C+a)]};
  // schedule: list of [start,end,type] for a mode over the window
  function sched(m,end){const out=[];let t=0;
    if(m==='dp'){while(t<end){out.push([t,t+STEP,'c']);t+=STEP;out.push([t,t+arDP(),'n']);t+=arDP()}}
    else{while(t<end){out.push([t,t+C,'c']);t+=C;out.push([t,t+ar(),'n']);t+=ar()}}
    return out}
  function at(m,time){let comp=0,steps=0,sent=0;sched(m,time+1).forEach(([a,b,ty])=>{const d=Math.max(0,Math.min(b,time)-a);if(d<=0)return;
      if(ty==='c'){comp+=d;steps+=m==='dp'?(d>=STEP-1e-6?1:0):Math.floor(d/STEP+1e-9)}else if(d>=b-a-1e-6)sent+=m==='dp'?4*P:P});
    return {comp,steps,sent,util:time?comp/time:0}}
  const tm=v=>v<120?Math.round(v)+' s':(v/60).toFixed(v<600?1:0)+' min';
  function cap(m,k){const a=ar(),r=R[st.r],Tk=T(),x=at(m,Tk[k]),o=at(m==='dp'?'dl':'dp',Tk[k]);
    if(m==='dp'){
      if(k===0)return ['One step of compute','Every node computes one step\'s gradients on its own batch: '+STEP.toFixed(1)+' s on an 8×H100 node, from INTELLECT-1\'s 38 minutes per 100 steps.'];
      if(k===1)return ['Wait for the all-reduce','Before anyone can take step 2, every node must average its gradients with every other node: 10B parameters × 4 bytes = 40 GB in fp32, over links of 0.5 to 4 Gb/s. Scaled from INTELLECT-1\'s measured all-reduce, that is about '+tm(arDP())+' ('+r.n+'), and the GPUs sit idle throughout.'];
      if(k===2)return ['After 38 minutes',x.steps+' steps done, where DiLoCo has done 100. The GPUs have been busy '+(100*x.util).toFixed(1)+'% of the time.'];
      if(k===3)return ['Every step pays the full exchange',x.steps+' steps, '+fmt(x.sent/1e9)+' GB sent per node. The network, not the GPUs, sets the pace.'];
      if(k===4)return ['The gap keeps growing',x.steps+' steps against DiLoCo\'s '+o.steps+'.'];
      return ['After '+tm(Tk[5]),x.steps+' steps and '+fmt(x.sent/1e9)+' GB sent per node, compute utilisation '+(100*x.util).toFixed(1)+'%. This is an extrapolation (all-reduce time assumed proportional to bytes), not a run anyone made, which is the point: on internet links nobody would.']}
    if(k===0)return ['Local steps, no traffic','Each node trains its own copy of the model with AdamW on its own data shard. Nothing crosses the network.'];
    if(k===1)return ['Still no traffic','The nodes keep taking local steps ('+x.steps+' so far) while the sync-every-step run is waiting on its first exchange.'];
    if(k===2)return ['100 inner steps, 38 minutes','Each node\'s copy has drifted from the shared starting weights. That difference is the pseudo-gradient.'];
    if(k===3)return ['One exchange','A single all-reduce averages the pseudo-gradients, quantised to int8: 10 GB per node instead of 40 GB, median '+a+' s ('+r.n+'). An outer optimiser (Nesterov momentum) applies the average, and every node restarts from the same weights.'];
    if(k===4)return ['Another 100 local steps','No traffic for another 38 minutes.'];
    return ['After '+tm(Tk[5]),x.steps+' steps, '+fmt(x.sent/1e9)+' GB sent per node, compute utilisation '+(100*x.util).toFixed(1)+'%, the '+r.pub+'% INTELLECT-1 reports for '+r.n+'. Communication fell 400 times: synchronising 100 times less often, and sending a quarter of the bytes.']}
  function draw(){
    const narrow=card.clientWidth<560,W=narrow?360:720,m=st.m,k=st.k,Tk=T(),end=Tk[5],t0=k?Tk[k-1]:0,now=t0+(Tk[k]-t0)*(RM?1:cl(st.t));
    const pl=narrow?52:64,pr=10,rows=4,rh=narrow?22:26,top=30,H=top+rows*(rh+8)+(narrow?78:62);
    const xs=v=>pl+(W-pl-pr)*v/end;let s='';
    s+='<text x="'+pl+'" y="14" font-size="11" fill="var(--mute)">'+(narrow?'4 of up to 14 nodes, time to scale':'Four of INTELLECT-1\'s up to 14 nodes, time drawn to scale')+'</text>';
    const sc=sched(m,end);
    for(let r=0;r<rows;r++){const y=top+r*(rh+8);
      s+='<text x="'+(pl-6)+'" y="'+(y+rh/2+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">node '+(r+1)+'</text>';
      s+='<rect x="'+pl+'" y="'+y+'" width="'+(W-pl-pr)+'" height="'+rh+'" fill="var(--soft)" stroke="var(--line)"/>';
      let dc='',dn='';sc.forEach(([a,b,ty])=>{if(a>=now)return;const bb=Math.min(b,now,end),x1=xs(a),x2=xs(bb);if(x2-x1<=0)return;
        const d='M'+x1.toFixed(2)+' '+(y+1)+'h'+Math.max(.6,x2-x1).toFixed(2)+'v'+(rh-2)+'h-'+Math.max(.6,x2-x1).toFixed(2)+'z';if(ty==='c')dc+=d;else dn+=d});
      s+='<path d="'+dc+'" fill="var(--c1)"/><path d="'+dn+'" fill="var(--c5)"/>'}
    const ya=top+rows*(rh+8);
    [0,.25,.5,.75,1].forEach(f=>{const v=end*f;s+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+(ya-4)+'" y2="'+ya+'" stroke="var(--mute)"/><text x="'+xs(v)+'" y="'+(ya+12)+'" font-size="10" text-anchor="'+(f===0?'start':f===1?'end':'middle')+'" fill="var(--mute)">'+Math.round(v/60)+' min</text>'});
    s+='<line x1="'+xs(now)+'" x2="'+xs(now)+'" y1="'+(top-6)+'" y2="'+(ya-2)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    const ly=ya+(narrow?30:28);
    s+='<rect x="'+pl+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="var(--c1)"/><text x="'+(pl+14)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">computing</text>';
    s+='<rect x="'+(pl+90)+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="var(--c5)"/><text x="'+(pl+104)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">'+(m==='dp'?'all-reduce of fp32 gradients, GPUs idle':'all-reduce of int8 pseudo-gradients')+'</text>';
    $('dlSvg').innerHTML=svgEl(W,H,s,'Training timeline of four nodes');
    if(st.lk!==k||st.lm!==m+st.r){fillList();st.lk=k;st.lm=m+st.r}
    mark();
    const x=at(m,now),o=at(m==='dp'?'dl':'dp',now);
    $('dlCnt').innerHTML=stat('Elapsed',tm(now),R[st.r].n)+stat('Steps per node',fmt(x.steps),'other method: '+fmt(o.steps))+
      stat('Sent per node',fmt(x.sent/1e9)+' GB',m==='dp'?'40 GB per step':'10 GB per 100 steps')+stat('Compute utilisation',now?(100*x.util).toFixed(1)+'%':'·',m==='dl'?'published: '+R[st.r].pub+'%':'extrapolated, not measured');
    const scr=$('dlScrub');scr.max=600;scr.value=Math.round((k+st.t)*100);
    const pb=$('dlPlay'),fin=k===5&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':fin?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':fin?'Replay':'Play');
  }
  // the step lists on the left (one per method): their text is cap() for the chosen region; the static HTML carries the USA case
  const LS={dp:$('sx-dl-dp'),dl:$('sx-dl-dl')};
  function fillList(){['dp','dl'].forEach(m=>{const L=LS[m];if(!L)return;[...L.children].forEach((li,i)=>{const c=cap(m,i);li.innerHTML='<b>'+c[0]+'.</b> '+c[1]})})}
  function mark(){const L=LS[st.m];if(!L)return;[...L.children].forEach((li,i)=>{li.classList.toggle('on',i===st.k);li.classList.toggle('done',i<st.k);if(i===st.k)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')})}
  // motion rules (2026-11-06): plays by itself once at least half in view, pauses off screen and resumes, stops for good on any reader control or at the last step,
  // never moves by itself under reduced motion; each step's motion plays once, then the step holds so its explanation can be read
  const HOLD=2200;
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  const setP=p=>{st.play=p;if(p)card.dataset.playing='1';else delete card.dataset.playing};
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    if(st.t<1){st.t=Math.min(1,st.t+dt*st.spd/DUR);st.hold=0}else if(st.oneStep){st.oneStep=false;setP(false)}else{st.hold=(st.hold||0)+dt*st.spd;if(st.hold>=HOLD){if(st.k<5){st.k++;st.t=0;st.hold=0}else{setP(false);st.ended=true}}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{setP(false);if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  const user=()=>{st.user=true;st.oneStep=false;pause()};
  function auto(){if(RM||st.user||st.ended||st.play||!live())return;setP(true);draw();kick()}
  $('dlPlay').addEventListener('click',()=>{if(st.play){user();draw();return}st.user=true;if(st.k===5&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<5){st.k++;st.t=0}st.hold=0;st.ended=false;setP(true);kick();draw()});
  $('dlFwd').addEventListener('click',()=>{user();if(st.k<5){st.k++;st.t=RM?1:0;st.hold=0;if(!RM){setP(true);st.oneStep=true}}else st.t=1;draw();kick()});
  $('dlBack').addEventListener('click',()=>{user();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('dlScrub').addEventListener('input',e=>{user();const v=+e.target.value;st.k=Math.min(5,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('dlSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('dlR').addEventListener('change',e=>{st.r=e.target.value;st.lk=-1;draw()});
  ['dp','dl'].forEach(m=>{const L=LS[m];if(!L)return;[...L.children].forEach((li,i)=>{li.tabIndex=0;li.setAttribute('role','button');const j=()=>{user();st.k=i;st.t=1;draw()};li.onclick=j;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();j()}}})});
  // a mode toggle restarts from step 1 with the other step list and replays (the one exception to "stops for good")
  const seg=$('dlM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    pause();st.m=b.dataset.m;st.k=0;st.t=RM?1:0;st.hold=0;st.user=false;st.ended=false;Object.keys(LS).forEach(m=>{if(LS[m])LS[m].hidden=m!==st.m});draw();auto()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{const x=es[es.length-1];st.vis=x.isIntersecting&&(x.intersectionRatio>=.5||x.intersectionRect.height>=innerHeight*.5);if(st.vis)auto();kick()},{threshold:[0,.25,.5,.75]}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
