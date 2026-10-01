// ---- slime explainer: four rollout slots, synchronous on-policy RL against slime's asynchronous mode ----
(function(){
  const card=$('sla');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NS=4,TM=48,BATCH=4,TAU=2;
  // illustrative long-tailed episode lengths (steps); the first batch is the page's worked example
  const Q=[3,5,8,40,4,6,3,12,5,9,4,7,3,6,5,4,8,3,6,5,4,7,3,5,6,4,3,5,7,4,6,3];
  function simAsync(){const eps=[],ev=[];let v=0,qi=0;const slot=new Array(NS).fill(null),buf=[],vat=[];
    for(let t=0;t<=TM;t++){
      for(let s=0;s<NS;s++){const e=slot[s];if(e&&e.end===t){buf.push(e);slot[s]=null}}
      while(buf.length>=BATCH){const take=buf.splice(0,BATCH),used=[],dis=[];take.forEach(e=>{(v-e.w0>TAU?dis:used).push(e);e.fate=v-e.w0>TAU?'dis':'used';e.tt=t;e.stale=v-e.w0});if(used.length)v++;ev.push({t,v,used:used.length,dis:dis.length})}
      vat[t]=v;
      if(t<TM)for(let s=0;s<NS;s++)if(!slot[s]){const len=Q[qi++%Q.length],e={slot:s,start:t,len,end:t+len,w0:v,id:eps.length};eps.push(e);slot[s]=e}
    }
    return {eps,ev,vat}}
  function simSync(){const eps=[],ev=[];let v=0,qi=0,t=0;const vat=[];
    while(t<TM){const b=[];for(let s=0;s<NS;s++){const len=Q[qi++%Q.length];const e={slot:s,start:t,len,end:t+len,w0:v,id:eps.length};eps.push(e);b.push(e)}
      const T2=Math.max(...b.map(e=>e.end));for(let u=t;u<Math.min(T2,TM+1);u++)vat[u]=v;
      if(T2<=TM){v++;b.forEach(e=>{e.fate='used';e.tt=T2;e.stale=0});ev.push({t:T2,v,used:NS,dis:0})}
      t=T2}
    for(let u=0;u<=TM;u++)if(vat[u]==null)vat[u]=v;
    return {eps,ev,vat}}
  const SIM={async:simAsync(),sync:simSync()};
  // chapters: time ranges with a caption each, built from the simulated events
  function chapters(m){const S=SIM[m];
    if(m==='sync'){const t1=S.ev[0]?S.ev[0].t:TM;return [
      {a:0,b:3,t:'Four episodes start together under policy v0',c:'Synchronous on-policy RL fills every rollout slot with an episode from the same policy version and waits for all of them before training. Episode lengths here are 3, 5, 8 and 40 steps, an illustrative long tail.'},
      {a:3,b:8,t:'Short episodes finish; their slots wait',c:'The 3-, 5- and 8-step episodes are done, but the batch is not, so those slots sit idle (hatched). Nothing can start until the trainer has updated the policy.'},
      {a:8,b:t1,t:'One 40-step episode holds the whole batch',c:'Three slots idle for 32 steps while the longest trajectory runs. Utilisation is (3 + 5 + 8 + 40) / (4 × 40) = 56 / 160 = 35%, and it collapses further as the tail gets longer, which is exactly when agentic episodes get interesting.'},
      {a:t1,b:TM,t:'Train, then start the next batch',c:'The trainer takes one step on the four trajectories (policy v1), and the next batch starts. Every trajectory is perfectly on-policy, which is the one thing this schedule buys.'},
      {a:TM,b:TM,t:'Totals',c:'Over 48 steps the slots were busy for well under half the time. All data was on-policy, so there is nothing to discard or correct.'}]}
    const e1=S.ev[0],long=S.eps.find(e=>e.len===40),lt=long.tt||TM,lv=S.vat[lt]||0;
    return [
      {a:0,b:3,t:'Four episodes start under policy v0',c:'slime\'s asynchronous mode puts the rollout engines and the trainer on separate accelerators. The same four episodes start: 3, 5, 8 and 40 steps.'},
      {a:3,b:e1.t,t:'Every slot refills the moment it is free',c:'As each short episode finishes its trajectory goes into a buffer and the slot immediately starts the next episode. No slot waits for the slowest one: utilisation stays at 100%.'},
      {a:e1.t,b:Math.min(TM,e1.t+10),t:'The trainer steps whenever 4 trajectories are buffered',c:'At step '+e1.t+' the buffer holds four finished trajectories, the trainer updates the policy to v1, and new weights are synced to the rollout engines. Squares darken with the policy version that generated them, so episodes already running now mix versions: their data is slightly off-policy.'},
      {a:Math.min(TM,e1.t+10),b:lt,t:'Staleness accumulates on the long episode',c:'The 40-step episode started under v0 while the policy kept moving. GLM-5 records each trajectory\'s versions and discards it if the oldest is too stale, w′ − w₀ > τ (here τ = 2); surviving tokens are kept only if their importance ratio π_θ / π_rollout stays inside [1 − ε_ℓ, 1 + ε_h].'},
      {a:lt,b:TM,t:'The cost: a stale trajectory is discarded',c:'When the long episode finally reaches the trainer, at step '+lt+', the policy is at v'+lv+', '+long.stale+' versions past where it started, so it is thrown away (outlined). That is the price of asynchrony, and a bias of its own: the longest episodes are the ones most at risk, so the staleness window τ is a real tuning choice.'},
      {a:TM,b:TM,t:'Totals',c:'The slots never idled, the trainer took many more steps on the same hardware, and a small share of data was lost to staleness. Compare the synchronous schedule with the toggle.'}]}
  const st={m:'async',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v;
  const chs=()=>chapters(st.m);
  const now=()=>{const C=chs()[st.k];return C.a+(C.b-C.a)*cl(st.t)};
  function stats(T){const S=SIM[st.m];let busy=0;S.eps.forEach(e=>{busy+=Math.max(0,Math.min(e.end,T)-e.start)});
    const ev=S.ev.filter(e=>e.t<=T);return {util:T>0?busy/(NS*T):1,fin:S.eps.filter(e=>e.end<=T).length,used:ev.reduce((a,e)=>a+e.used,0),dis:ev.reduce((a,e)=>a+e.dis,0),v:S.vat[Math.min(TM,Math.floor(T))]||0,steps:ev.length}}
  function draw(){
    const W=card.clientWidth<560?360:680,nar=W<500,T=now(),S=SIM[st.m],x0=nar?34:52,x1=W-8,cw=(x1-x0)/TM,rh=nar?18:22,y0=24;
    let s='<text x="'+x0+'" y="14" font-size="11" fill="var(--mute)">'+(nar?'':'Rollout slots against time, ')+'one square per step of an episode</text>';
    for(let r=0;r<NS;r++)s+='<text x="'+(x0-6)+'" y="'+(y0+r*rh+rh*.68)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(nar?'s':'slot ')+(r+1)+'</text>';
    // idle hatching (only up to now)
    for(let r=0;r<NS;r++)for(let u=0;u<Math.floor(T);u++){const busy=S.eps.some(e=>e.slot===r&&u>=e.start&&u<e.end);if(!busy)s+='<rect x="'+(x0+u*cw+.5).toFixed(1)+'" y="'+(y0+r*rh+2)+'" width="'+(cw-1).toFixed(1)+'" height="'+(rh-4)+'" fill="var(--bad)" opacity=".18"/>'}
    S.eps.forEach(e=>{if(e.start>=T)return;const y=y0+e.slot*rh+2,h=rh-4,upto=Math.min(e.end,T);
      for(let u=e.start;u<upto;u++){const vv=S.vat[u]||0,fr=Math.min(1,upto-u);s+='<rect x="'+(x0+u*cw+.5).toFixed(1)+'" y="'+y+'" width="'+Math.max(0,cw*fr-1).toFixed(1)+'" height="'+h+'" rx="1.5" fill="var(--c1)" opacity="'+(.35+.65*Math.min(1,vv/6)).toFixed(2)+'"/>'}
      if(e.tt!=null&&e.tt<=T&&e.fate==='dis')s+='<rect x="'+(x0+e.start*cw).toFixed(1)+'" y="'+(y-1)+'" width="'+(e.len*cw).toFixed(1)+'" height="'+(h+2)+'" fill="none" stroke="var(--bad)" stroke-width="2" rx="2"/><text x="'+(x0+(e.start+e.len/2)*cw).toFixed(1)+'" y="'+(y+h*.72)+'" font-size="10.5" text-anchor="middle" fill="var(--ink)" font-weight="600">discarded: '+e.stale+' versions stale</text>';
      if(!nar&&e.end<=T&&e.fate!=='dis'&&cw*e.len>22)s+='<text x="'+(x0+(e.start+e.len/2)*cw).toFixed(1)+'" y="'+(y+h*.72)+'" font-size="10" text-anchor="middle" fill="var(--bg)">'+e.len+'</text>'});
    // trainer lane
    const ty=y0+NS*rh+14;s+='<text x="'+(x0-6)+'" y="'+(ty+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">train</text><line x1="'+x0+'" x2="'+x1+'" y1="'+ty+'" y2="'+ty+'" stroke="var(--line)"/>';
    S.ev.forEach(e=>{if(e.t>T)return;const x=x0+e.t*cw;s+='<circle cx="'+x.toFixed(1)+'" cy="'+ty+'" r="5" fill="var(--good)"/>'+(nar&&S.ev.length>6?'':'<text x="'+x.toFixed(1)+'" y="'+(ty+17)+'" font-size="10" text-anchor="middle" fill="var(--good)">v'+e.v+'</text>')});
    // axis and now line
    const ay=ty+30;for(let u=0;u<=TM;u+=8)s+='<text x="'+(x0+u*cw).toFixed(1)+'" y="'+ay+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+u+'</text>';
    s+='<line x1="'+(x0+T*cw).toFixed(1)+'" x2="'+(x0+T*cw).toFixed(1)+'" y1="'+(y0-4)+'" y2="'+(ty+6)+'" stroke="var(--acc)" stroke-width="1.5"/>';
    // version shade legend
    const ly=ay+16,sx=x0+(nar?96:220);s+='<text x="'+x0+'" y="'+(ly+8)+'" font-size="10.5" fill="var(--mute)">'+(nar?'policy version:':'policy version that generated the step:')+'</text>';
    for(let v=0;v<=6;v++){const lx=sx+v*18;s+='<rect x="'+lx+'" y="'+ly+'" width="12" height="10" rx="1.5" fill="var(--c1)" opacity="'+(.35+.65*v/6).toFixed(2)+'"/>'}
    s+='<text x="'+(sx+7*18)+'" y="'+(ly+8)+'" font-size="10.5" fill="var(--mute)">v0 to v6+</text>';
    $('slaSvg').innerHTML=svgEl(W,ly+18,s,'Rollout schedule, '+(st.m==='async'?'asynchronous':'synchronous')+', time '+Math.floor(T));
    const C=chs();if(st.lk!==st.k||st.lm!==st.m){$('slaStep').textContent='Step '+(st.k+1)+' of '+C.length+': '+C[st.k].t;$('slaCap').innerHTML=C[st.k].c;st.lk=st.k;st.lm=st.m}
    const q=stats(T);
    $('slaCnt').innerHTML=stat('Time step',fmt(Math.floor(T))+' of '+TM,'')+stat('Slot utilisation',(100*q.util).toFixed(0)+'%','busy slot-steps / all slot-steps')
      +stat('Trainer steps',fmt(q.steps),'policy now v'+q.v)+stat('Trajectories trained on',fmt(q.used),q.fin+' finished so far')+stat('Discarded as stale',fmt(q.dis),st.m==='async'?'w′ − w₀ > τ = 2':'none: all on-policy');
    const n=C.length,sc=$('slaScrub');sc.max=n*100;sc.value=Math.round((st.k+st.t)*100);
    const pb=$('slaPlay'),end=st.k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const durOf=k=>{const C=chs()[k];return 1400+110*(C.b-C.a)};
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(t){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,t-st.last):16;st.last=t;
    st.t+=dt*st.spd/durOf(st.k);const n=chs().length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('slaPlay').addEventListener('click',()=>{if(st.play){pause()}else{const n=chs().length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('slaFwd').addEventListener('click',()=>{pause();st.k=Math.min(chs().length-1,st.k+1);st.t=1;draw()});
  $('slaBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('slaScrub').addEventListener('input',e=>{pause();const n=chs().length,v=+e.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=n*100)st.t=1;draw()});
  $('slaSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('slaM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM&&!st.play)st.play=true;st.lk=-1;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
