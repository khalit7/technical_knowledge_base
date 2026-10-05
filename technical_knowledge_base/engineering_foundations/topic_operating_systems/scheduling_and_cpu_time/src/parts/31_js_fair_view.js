// ---- Drawing one step of a FAIR.simulate() result: the schedule so far (to scale) and the run queue on a vruntime line ----
window.FAIRVIEW=(function(){
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const f=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const ms=us=>f(us/1000,us%1000?2:0);
  // per-step derived numbers: CPU so far, wake waits so far (from the snapshot sequence), involuntary switches so far
  function derive(r){const out=[];let pend={},waits={},sw=0,prevCurr=-1;r.tasks.forEach((_,i)=>waits[i]=[]);
    r.snaps.forEach(s=>{if(s.kind==='wake')pend[s.task]=s.t;
      if(s.kind==='pick'){if(s.task>=0&&pend[s.task]!=null){waits[s.task].push(s.t-pend[s.task]);delete pend[s.task]}
        if(s.task>=0&&prevCurr>=0&&s.task!==prevCurr)sw++}
      if(s.kind==='pick'&&s.task>=0)Object.keys(pend).forEach(k=>{});
      prevCurr=s.kind==='sleep'?-1:s.curr;
      out.push({waits:JSON.parse(JSON.stringify(waits)),sw,pend:Object.assign({},pend)})});
    // a woken task that was already the running one counts as zero wait (handled by the pick snapshot above)
    return out}
  function draw(el,r,i,o){o=o||{};const s=r.snaps[i],w=RD.width(el),n=r.tasks.length,H0=18,lane=18,gap=4,L=Math.min(92,Math.max(64,w*0.16)),R=8;
    const hz=o.horizon||Math.max(...r.segs.map(x=>x[1])),X=t=>L+t/hz*(w-L-R);
    let b='';const gh=n*(lane+gap);
    // time axis
    for(let k=0;k<=4;k++){const t=hz*k/4;b+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="'+H0+'" y2="'+(H0+gh)+'" stroke="var(--line)"/>'+RD.t(X(t),H0-5,ms(t)+(k===4?' ms':''),{a:k===4?'end':'middle',fs:10,fill:'var(--mute)'})}
    r.tasks.forEach((tk,j)=>{const y=H0+j*(lane+gap);b+=RD.t(L-6,y+lane-5,tk.name,{a:'end',fs:11});b+='<rect x="'+L+'" y="'+y+'" width="'+(w-L-R)+'" height="'+lane+'" fill="var(--soft)"/>'});
    r.segs.forEach(([a,c,k])=>{if(k<0||a>=s.t)return;const e=Math.min(c,s.t),y=H0+k*(lane+gap);b+='<rect x="'+X(a).toFixed(2)+'" y="'+y+'" width="'+Math.max(.8,X(e)-X(a)).toFixed(2)+'" height="'+lane+'" fill="'+COL[k%6]+'" opacity=".9"/>'});
    // waits: from each wake to its first run, drawn as a red underline on the waiting task's lane
    const d=o.derived;let wk={};r.snaps.slice(0,i+1).forEach((q,qi)=>{if(q.kind==='wake')wk[q.task]=q.t;if(q.kind==='pick'&&q.task>=0&&wk[q.task]!=null){const y=H0+q.task*(lane+gap)+lane+1;
      if(q.t>wk[q.task])b+='<rect x="'+X(wk[q.task]).toFixed(2)+'" y="'+y+'" width="'+Math.max(1,X(q.t)-X(wk[q.task])).toFixed(2)+'" height="3" fill="var(--ink)"/>';delete wk[q.task]}});
    Object.keys(wk).forEach(k=>{const y=H0+k*(lane+gap)+lane+1;b+='<rect x="'+X(wk[k]).toFixed(2)+'" y="'+y+'" width="'+Math.max(1,X(s.t)-X(wk[k])).toFixed(2)+'" height="3" fill="var(--ink)"/>'});
    b+='<line x1="'+X(s.t).toFixed(1)+'" x2="'+X(s.t).toFixed(1)+'" y1="'+(H0-2)+'" y2="'+(H0+gh)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    // vruntime line: positions relative to min_vruntime (CFS) or to V (EEVDF), in ms
    const eev=r.policy==='eevdf',ref=eev?s.V:s.minvr,y0=H0+gh+34,span=o.span||[-12,8];
    const VX=v=>L+(Math.max(span[0],Math.min(span[1],v))-span[0])/(span[1]-span[0])*(w-L-R);
    b+=RD.t(L-6,y0+4,eev?'v - V':'v - min_vr',{a:'end',fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--mute)"/>';
    for(let m=Math.ceil(span[0]/2)*2;m<=span[1];m+=2){b+='<line x1="'+VX(m).toFixed(1)+'" x2="'+VX(m).toFixed(1)+'" y1="'+(y0-3)+'" y2="'+(y0+3)+'" stroke="var(--mute)"/>'+RD.t(VX(m),y0+15,(m>0?'+':'')+m,{a:'middle',fs:9.5,fill:'var(--mute)'})}
    b+='<line x1="'+VX(0).toFixed(1)+'" x2="'+VX(0).toFixed(1)+'" y1="'+(y0-26)+'" y2="'+(y0+4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(VX(0)+3,y0-28,eev?'V (eligible to the left)':'min_vruntime',{fs:9.5,fill:'var(--mute)'});
    s.tasks.forEach((t,j)=>{const rel=(t.v-ref)/1000,x=VX(rel),yy=y0-8-j*6,cur=s.curr===j;
      if(eev&&(t.on)){const dx=VX((t.d-ref)/1000);b+='<line x1="'+x.toFixed(1)+'" x2="'+dx.toFixed(1)+'" y1="'+yy+'" y2="'+yy+'" stroke="'+COL[j%6]+'" stroke-width="2" opacity=".5"/><line x1="'+dx.toFixed(1)+'" x2="'+dx.toFixed(1)+'" y1="'+(yy-3)+'" y2="'+(yy+3)+'" stroke="'+COL[j%6]+'" stroke-width="2"/>'}
      b+='<circle cx="'+x.toFixed(1)+'" cy="'+yy+'" r="'+(cur?5:4)+'" fill="'+(t.on?COL[j%6]:'var(--bg)')+'" stroke="'+COL[j%6]+'" stroke-width="'+(cur?2.5:1.5)+'"/>';
      if(t.dl)b+=RD.t(x+6,yy+3,'delayed',{fs:9,fill:'var(--mute)'})});
    const Ht=y0+24;el.innerHTML=RD.svg(w,Ht,b,'schedule and run queue');
    el.insertAdjacentHTML('beforeend','<div class="tl-leg">'+r.tasks.map((t,j)=>'<span style="--sw:'+COL[j%6]+'">'+t.name+'</span>').join('')+'<span style="--sw:var(--ink)">waiting after a wake-up</span><span style="--sw:var(--mute)">dots: vruntime (hollow: asleep)'+(eev?'; bar to tick: virtual deadline':'')+'</span></div>')}
  function caption(r,i){const s=r.snaps[i],nm=k=>k>=0?'<b>'+r.tasks[k].name+'</b>':'nothing';
    const what={pick:'runs '+nm(s.task),wake:nm(s.task)+' wakes',tick:'tick: '+nm(s.task)+"'s slice is used up",sleep:nm(s.task)+' goes to sleep','delayed-out':nm(s.task)+' leaves the run queue'}[s.kind]||s.kind;
    return '<div class="t">Step '+(i+1)+' of '+r.snaps.length+', t = '+f(s.t/1000,2)+' ms: '+what+'</div><p>'+(s.note?s.note.charAt(0).toUpperCase()+s.note.slice(1)+'.':'')+'</p>'}
  function counters(r,i,d){const s=r.snaps[i],x=d[i];let h='';
    r.tasks.forEach((t,j)=>{h+=RD.stat(t.name+' CPU',f(s.tasks[j].sum/1000,1)+' ms',f(s.t?s.tasks[j].sum/s.t*100:0)+'% so far')});
    const lw=[];Object.keys(x.waits).forEach(k=>{if(!r.tasks[k].hog)lw.push(...x.waits[k])});
    h+=RD.stat('wake-up waits',lw.length?'mean '+f(lw.reduce((a,b)=>a+b,0)/lw.length/1000,2)+' ms':'none yet',lw.length?'max '+f(Math.max(...lw)/1000,2)+' ms, '+lw.length+' wake-ups':'');
    h+=RD.stat('involuntary switches',f(x.sw),'preemptions so far');return h}
  return {draw,caption,counters,derive,COL}
})();
