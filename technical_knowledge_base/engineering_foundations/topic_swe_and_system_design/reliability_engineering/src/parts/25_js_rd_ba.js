// ---- Reading, Degradation: the same 5 s provider slowdown hitting the chat API before and after timeouts + breaker + shedding ----
// Both runs come from RE.sim (22_js_engine.js) with presets RE.P.before / RE.P.after; recompute.py reproduces them.
(function(){
  const svg=document.getElementById('rd-ba-svg');if(!svg||!window.RE)return;
  const cap=document.getElementById('rd-ba-cap'),cnt=document.getElementById('rd-ba-cnt'),leg=document.getElementById('rd-ba-leg');
  const R={before:RE.sim(RE.P.before),after:RE.sim(RE.P.after)};
  const S0=7,S1=22,N=S1-S0+1;let mode='before';
  const qMax=Math.max(1,...R.before.S.q,...R.after.S.q);
  const W20=RE.P.before.W;
  const OMX=Math.max(140,...['before','after'].flatMap(m=>R[m].S.good.map((g,k)=>g+R[m].S.deg[k]+R[m].S.fail[k])));
  function draw(i){
    const r=R[mode],S=r.S,s=S0+i;
    const W=Math.max(300,Math.min(860,RD.width(svg)));const x0=34,x1=W-6,bw=(x1-x0)/N;
    const X=k=>x0+(k-S0)*bw;
    let b='';
    // slowdown band
    b+='<rect x="'+X(10)+'" y="60" width="'+(bw*5)+'" height="234" fill="var(--bad)" opacity=".09"/>';
    // worker strip
    const nw=S.wdep[Math.min(s,S.wdep.length-1)];const sq=Math.min(14,(W-4)/W20-2);
    b+=RD.t(0,14,'Workers waiting on the provider at second '+s+': '+nw+' of '+W20,{fs:11.5,w:600});
    for(let k=0;k<W20;k++)b+='<rect x="'+(k*(sq+2))+'" y="22" width="'+sq+'" height="'+sq+'" rx="2" fill="'+(k<nw?'var(--c2)':'var(--soft)')+'" stroke="var(--line)"/>';
    // panel 1: queue
    const p1y=74,p1h=80,Yq=v=>p1y+p1h*(1-v/qMax);
    b+=RD.t(0,p1y-4,'Requests waiting in our queue (most in the second)',{fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+(p1y+p1h)+'" y2="'+(p1y+p1h)+'" stroke="var(--line)"/>'+RD.t(x0-4,p1y+8,String(qMax),{fs:9.5,a:'end'})+RD.t(x0-4,p1y+p1h,'0',{fs:9.5,a:'end'});
    for(let k=S0;k<=S1;k++){const on=k<=s,v=S.q[k];const x=X(k)+1,w=Math.max(2,bw-2);
      if(v>0)b+='<rect x="'+x+'" y="'+Yq(v)+'" width="'+w+'" height="'+(p1y+p1h-Yq(v))+'" fill="var(--c4)" opacity="'+(on?1:.12)+'"/>';
      if(on&&S.open[k]>0)b+='<rect x="'+x+'" y="'+(p1y+p1h+2)+'" width="'+(w*S.open[k]/1000)+'" height="4" fill="var(--c5)"/>'}
    // panel 2: outcomes
    const p2y=184,p2h=96,mx=OMX,Y=v=>p2y+p2h*(1-v/mx);
    b+=RD.t(0,p2y-6,'What users got each second',{fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>'+RD.t(x0-4,Y(100)+3,'100',{fs:9.5,a:'end'})+RD.t(x0-4,Y(0),'0',{fs:9.5,a:'end'});
    b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(100)+'" y2="'+Y(100)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    for(let k=S0;k<=S1;k++){const on=k<=s,x=X(k)+1,w=Math.max(2,bw-2),o=on?1:.12;let y=Y(0);
      [[S.good[k],'var(--good)'],[S.deg[k],'var(--c5)'],[S.fail[k],'var(--bad)']].forEach(p=>{const h=p2h*p[0]/mx;if(h>0){y-=h;b+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+p[1]+'" opacity="'+o+'"/>'}});
      if(k%2===0||bw>26)b+=RD.t(x+w/2,p2y+p2h+14,String(k),{fs:9.5,a:'middle',fill:k===s?'var(--ink)':'var(--mute)'})}
    b+=RD.t((x0+x1)/2,p2y+p2h+27,'second',{fs:10,a:'middle',fill:'var(--mute)'});
    svg.innerHTML=RD.svg(W,312,b,'Queue length and per-second outcomes of the chat API during a provider slowdown, '+mode);
    leg.innerHTML='<span style="--sw:var(--bad)">provider slow, 3 s per call (shaded)</span><span style="--sw:var(--c2)">worker stuck on provider</span><span style="--sw:var(--c4)">queue</span><span style="--sw:var(--c5)">breaker open (bar under queue) / fallback answer</span><span style="--sw:var(--good)">full answer</span><span style="--sw:var(--bad)">failed or too late (over 2 s)</span>';
    let cg=0,cd=0,cf=0,cb=0;for(let k=0;k<=s;k++){cg+=S.good[k];cd+=S.deg[k];cf+=S.fail[k];cb+=S.failB[k]}
    const tot=S.good[s]+S.deg[s]+S.fail[s];
    cnt.innerHTML=RD.stat('Second',s,'slowdown: 10 to 15')+RD.stat('Queue',S.q[s],'requests waiting')+RD.stat('Answered this second',tot?Math.round(100*(S.good[s]+S.deg[s])/tot)+'%':'n/a',S.deg[s]?S.deg[s]+' by fallback':'')+RD.stat('Failed so far',cf,cb+' never needed the provider');
    let t,p;const B=mode==='before';
    if(s<10){t='Normal traffic';p='100 requests a second: half send a message (need the provider, 25 ms), half load history (5 ms of our own work). 20 workers are plenty; nothing waits.'}
    else if(s===10){t='The provider slows to 3 s per call';p=B?'With no timeout, each message request holds a worker for 3 s. At 50 such requests a second, all 20 workers are stuck within half a second.':'Calls now hit the 100 ms timeout. After 20 calls with at least half failing, the breaker opens and message requests get the fallback model at once.'}
    else if(s<15){t='Second '+s+': '+(B?'the cascade':'contained');p=B?'Every worker waits on the provider, so history loads, which never needed it, queue behind them too. The queue grows by about 100 a second and everyone waits past 2 s: '+S.failB[s]+' history loads failed this second.':'Workers are free: history loads are untouched, message requests get the fallback model. Every 2 s the breaker lets 5 trial calls through; they time out, so it opens again. The queue never forms.'}
    else if(s===15){t='The provider recovers';p=B?'Calls started before second 15 still take 3 s, and the queue holds hundreds of requests whose users already gave up; we still process them.':'The next half-open trial succeeds and the breaker closes; full answers return.'}
    else if(s<S1){t='Second '+s+': '+(B?'draining':'normal');p=B?(S.q[s]>0?'The backlog is being worked off, mostly for users who left.':'The backlog is gone; service is normal again.'):'Nothing to drain: nothing piled up.'}
    else{t='Totals';const T=r.tot;p=(B?'Before':'After')+': '+Math.round(T.success*1000)/10+'% of all requests answered in time ('+Math.round(T.full*1000)/10+'% with the full model); '+T.fail+' failed. '+(B?'Switch to After to run the same slowdown with the defences on.':'Compare with Before: the same slowdown, no user saw an error.')}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const A=RD.anim({card:'rd-ba-card',ctl:'rd-ba-ctl',n:N,draw:draw,ms:1300,label:'Second'});
  RD.seg(document.getElementById('rd-ba-seg'),m=>{mode=m;A.reset(N);A.play()});
  RD.onResize(()=>A.redraw());
})();
