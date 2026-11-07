// ---- Reading, Degradation: the same 5 s provider slowdown hitting the chat API before and after timeouts + breaker + shedding ----
// Both runs come from RE.sim (22_js_engine.js) with presets RE.P.before / RE.P.after; recompute.py reproduces them.
// 2026-11-07: sixteen seconds are grouped into six explained stretches (the long-replay rule); each step plays its stretch's seconds,
// and the step lists sx-ba-before / sx-ba-after on the left carry what the old per-step caption said.
(function(){
  const svg=document.getElementById('rd-ba-svg');if(!svg||!window.RE)return;
  const cnt=document.getElementById('rd-ba-cnt'),leg=document.getElementById('rd-ba-leg');
  const R={before:RE.sim(RE.P.before),after:RE.sim(RE.P.after)};
  const S0=7,S1=22;let mode='before';
  const ST=[[7,9],[10,10],[11,14],[15,15],[16,21],[22,22]],N=ST.length;
  const qMax=Math.max(1,...R.before.S.q,...R.after.S.q);
  const W20=RE.P.before.W;
  const OMX=Math.max(140,...['before','after'].flatMap(m=>R[m].S.good.map((g,k)=>g+R[m].S.deg[k]+R[m].S.fail[k])));
  function paint(s){
    const r=R[mode],S=r.S;
    const W=Math.max(300,Math.min(860,RD.width(svg)));const x0=34,x1=W-6,bw=(x1-x0)/(S1-S0+1);
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
  }
  // a step: draw its stretch; stepping forward plays the stretch second by second (about 0.4 s each), back and the scrubber jump
  const card=document.getElementById('rd-ba-card');let raf=0;
  function draw(i){cancelAnimationFrame(raf);const a=ST[i][0],b=ST[i][1];
    if(RD.RM||!card.classList.contains('rd-fwd')||a===b){paint(b);return}
    const t0=performance.now(),per=420;const f=now=>{const s=Math.min(b,a+Math.floor((now-t0)/per));paint(s);if(s<b)raf=requestAnimationFrame(f)};paint(a);raf=requestAnimationFrame(f)}
  const A=RD.anim({card:'rd-ba-card',ctl:'rd-ba-ctl',n:N,draw:draw,ms:4600,label:'Stretch of seconds',list:'sx-ba-before'});
  RD.seg(document.getElementById("rd-ba-seg"),m=>{mode=m;document.getElementById('sx-ba-before').hidden=m!=='before';document.getElementById('sx-ba-after').hidden=m!=='after';A.reset(N,'sx-ba-'+m)});
  RD.onResize(()=>A.redraw());
})();
