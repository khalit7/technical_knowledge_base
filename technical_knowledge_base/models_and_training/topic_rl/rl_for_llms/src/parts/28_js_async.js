// ---- Section 12: one set of real rollout lengths, scheduled synchronously and asynchronously ----
(function(){
  const E=window.LLE,D=window.LLD;
  const P=document.getElementById('rd-asP'),Tt=document.getElementById('rd-asT'),Xp=document.getElementById('rd-asX'),N=document.getElementById('rd-asN'),Note=document.getElementById('rd-asNote');
  if(!P)return;
  const S=16,B=32,TR=300,FR=40;
  const L=[].concat(...D.groups.map(g=>g.L)).slice(0,160);
  const sc={sync:E.syncSched(L,S,B,TR),async:E.asyncSched(L,S,B,TR)},Tmax=Math.max(sc.sync.end,sc.async.end);
  let mode='sync';
  const BC=['var(--c1)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  function draw(i){const s0=sc[mode],now=Tmax*i/(FR-1),W=RD.width(P),l=52,r=8,t=6,rh=W<480?7:9,H=t+S*rh+30+rh*2+16,X=v=>l+(W-l-r)*v/Tmax;let s='';
    for(let k=0;k<S;k++){const y=t+k*rh;s+='<rect x="'+l+'" y="'+y+'" width="'+(W-l-r)+'" height="'+(rh-1.5)+'" fill="var(--soft)"/>'}
    s+=RD.t(l-4,t+rh*S/2+4,'engine',{a:'end',fs:10,fill:'var(--mute)'});
    s0.jobs.forEach(j=>{if(j.a>=now)return;const e=Math.min(j.e,now),y=t+j.s*rh;
      s+='<rect x="'+X(j.a).toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,X(e)-X(j.a)-0.6).toFixed(1)+'" height="'+(rh-1.5)+'" fill="'+BC[j.b%BC.length]+'" opacity="'+(mode==='async'&&j.stale>0?0.55:0.9)+'"/>'});
    const ty=t+S*rh+12;s+=RD.t(l-4,ty+rh+3,'trainer',{a:'end',fs:10,fill:'var(--mute)'});
    s+='<rect x="'+l+'" y="'+ty+'" width="'+(W-l-r)+'" height="'+(rh*2)+'" fill="var(--soft)"/>';
    s0.train.forEach(tr=>{if(tr.a>=now)return;const e=Math.min(tr.e,now);s+='<rect x="'+X(tr.a).toFixed(1)+'" y="'+ty+'" width="'+Math.max(0.5,X(e)-X(tr.a)).toFixed(1)+'" height="'+(rh*2)+'" fill="'+BC[tr.b%BC.length]+'"/>'});
    s+='<line x1="'+X(now).toFixed(1)+'" x2="'+X(now).toFixed(1)+'" y1="'+t+'" y2="'+(ty+rh*2)+'" stroke="var(--ink)" stroke-width="1"/>';
    if(s0.end<Tmax)s+='<line x1="'+X(s0.end).toFixed(1)+'" x2="'+X(s0.end).toFixed(1)+'" y1="'+t+'" y2="'+(ty+rh*2)+'" stroke="var(--good)" stroke-dasharray="3 3"/>';
    s+=RD.t(l,H-4,'time, in decoded tokens per slot',{fs:9.5,fill:'var(--mute)'})+RD.t(W-r,H-4,Tmax.toLocaleString('en-US'),{a:'end',fs:9.5,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,H,s,'Engine and trainer timeline');
    const ne=Math.min(now,s0.end);const done=s0.jobs.filter(j=>j.e<=now).length,trained=s0.train.filter(x=>x.e<=now).length,busy=s0.jobs.reduce((a,j)=>a+Math.max(0,Math.min(j.e,ne)-Math.min(j.a,ne)),0);
    Tt.textContent=(mode==='sync'?'Synchronous':'Asynchronous')+': t = '+Math.round(ne).toLocaleString('en-US')+' of '+Math.round(s0.end).toLocaleString('en-US')+' to finish';
    const st=mode==='async'?s0.jobs.map(j=>j.stale):[0],mx=Math.max(...st),fr=st.filter(x=>x>0).length;
    Xp.innerHTML=mode==='sync'?'Each batch of '+B+' responses is generated, then every slot waits for the batch\'s longest response, then for the trainer and the weight sync, before the next batch starts on fresh weights. Every sample is exactly on-policy; the grey gaps are idle engine time.':
      'The engine never waits: each slot starts the next response as soon as one finishes, and the trainer takes a batch as soon as it is complete. Lighter bars were started on weights that are already out of date by the time they are trained on: '+fr+' of '+L.length+' responses, at most '+mx+' version'+(mx===1?'':'s')+' stale. That staleness is what AReaL\'s staleness-aware PPO and the importance corrections of section 8 handle.';
    N.innerHTML=RD.stat('Responses generated',done+' / '+L.length,'')+RD.stat('Batches trained',trained+' / '+s0.train.length,'')+RD.stat('Engine busy so far',now>0?RD.pct(busy/(S*ne),0):'·','of slot time')+RD.stat('Time to finish',Math.round(s0.end).toLocaleString('en-US'),mode==='async'?RD.n(sc.sync.end/sc.async.end,2)+'× faster than synchronous':'decoded tokens per slot')}
  const an=RD.anim({card:'rd-as',ctl:'rd-asC',n:FR,ms:350,draw,label:'Time'});
  document.getElementById('rd-asM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.reset(FR);an.play()});
  Note.innerHTML='Lengths are real: the '+L.length+' responses of this page\'s rollouts, in order (mean '+Math.round(E.mean(L))+', longest '+Math.max(...L)+' tokens). <i class="nl i">illustrative</i> The rest is a model: '+S+' engine slots decoding one token per tick, batches of '+B+', a trainer taking '+TR+' ticks per batch, no time for scoring or weight transfer. Real speedups depend on all of these; AReaL reports up to 2.77×, PipelineRL about 2×.';
  RD.onResize(()=>an.redraw());
})();
