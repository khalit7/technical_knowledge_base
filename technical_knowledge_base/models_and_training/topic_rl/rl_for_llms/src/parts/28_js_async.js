// ---- Section 12: one set of real rollout lengths, scheduled synchronously (before) and asynchronously (after) on the same time axis ----
// A static widget (2026-11-06 rule for long replays: the outcome is the point): both finished schedules drawn at once, explained by the paragraph on the left.
(function(){
  const E=window.LLE,D=window.LLD;
  const P=document.getElementById('rd-asP'),N=document.getElementById('rd-asN'),Note=document.getElementById('rd-asNote');
  if(!P)return;
  const S=16,B=32,TR=300;
  const L=[].concat(...D.groups.map(g=>g.L)).slice(0,160);
  const sc={sync:E.syncSched(L,S,B,TR),async:E.asyncSched(L,S,B,TR)},Tmax=Math.max(sc.sync.end,sc.async.end);
  const BC=['var(--c1)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  function lane(s0,mode,y0,W,l,r,rh,X){let s='';
    for(let k=0;k<S;k++)s+='<rect x="'+l+'" y="'+(y0+k*rh)+'" width="'+(X(s0.end)-l).toFixed(1)+'" height="'+(rh-1.5)+'" fill="var(--soft)"/>';
    s0.jobs.forEach(j=>{s+='<rect x="'+X(j.a).toFixed(1)+'" y="'+(y0+j.s*rh)+'" width="'+Math.max(0.5,X(j.e)-X(j.a)-0.6).toFixed(1)+'" height="'+(rh-1.5)+'" fill="'+BC[j.b%BC.length]+'" opacity="'+(mode==='async'&&j.stale>0?0.5:0.95)+'"/>'});
    const ty=y0+S*rh+4;s+='<rect x="'+l+'" y="'+ty+'" width="'+(X(s0.end)-l).toFixed(1)+'" height="'+(rh*1.6)+'" fill="var(--soft)"/>';
    s0.train.forEach(tr=>{s+='<rect x="'+X(tr.a).toFixed(1)+'" y="'+ty+'" width="'+Math.max(0.5,X(tr.e)-X(tr.a)).toFixed(1)+'" height="'+(rh*1.6)+'" fill="'+BC[tr.b%BC.length]+'"/>'});
    s+=RD.t(l-4,y0+rh*S/2+4,'engine',{a:'end',fs:11,fill:'var(--mute)'})+RD.t(l-4,ty+rh+3,'trainer',{a:'end',fs:11,fill:'var(--mute)'});
    s+='<line x1="'+X(s0.end).toFixed(1)+'" x2="'+X(s0.end).toFixed(1)+'" y1="'+(y0-4)+'" y2="'+(ty+rh*1.6+2)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    s+=RD.t(Math.min(X(s0.end)+4,W-r),y0+8,'done at '+Math.round(s0.end).toLocaleString('en-US'),{a:X(s0.end)+90>W-r?'end':'start',fs:11.5,w:600});
    return [s,ty+rh*1.6]}
  function draw(){const W=RD.width(P),l=56,r=8,rh=W<480?6:8,X=v=>l+(W-l-r)*v/Tmax;let s='',y=18;
    s+=RD.t(l,y-4,W<560?'Before: synchronous':'Before: synchronous · every sample on-policy, grey gaps are idle slots',{fs:12,w:600});
    let [a,yb]=lane(sc.sync,'sync',y,W,l,r,rh,X);s+=a;y=yb+34;
    s+=RD.t(l,y-4,W<560?'After: asynchronous (lighter: stale)':'After: asynchronous · lighter bars started on weights already out of date',{fs:12,w:600});
    [a,yb]=lane(sc.async,'async',y,W,l,r,rh,X);s+=a;
    s+=RD.t(l,yb+18,'time, in decoded tokens per slot',{fs:11,fill:'var(--mute)'})+RD.t(W-r,yb+18,Tmax.toLocaleString('en-US'),{a:'end',fs:11,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,yb+24,s,'Engine and trainer timelines, synchronous above asynchronous');
    const as=sc.async.jobs,fr=as.filter(j=>j.stale>0).length,mx=Math.max(...as.map(j=>j.stale));
    N.innerHTML=RD.stat('Synchronous',Math.round(sc.sync.end).toLocaleString('en-US'),'ticks; engine busy '+RD.pct(E.utilisation(sc.sync,S,L),0))+
      RD.stat('Asynchronous',Math.round(sc.async.end).toLocaleString('en-US'),'ticks; engine busy '+RD.pct(E.utilisation(sc.async,S,L),0))+
      RD.stat('Speed-up',RD.n(sc.sync.end/sc.async.end,2)+'×','same responses, same engine')+RD.stat('Stale samples',fr+' / '+L.length,'at most '+mx+' versions old')}
  Note.innerHTML='Lengths are real: the '+L.length+' responses of this page\'s rollouts, in order (mean '+Math.round(E.mean(L))+', longest '+Math.max(...L)+' tokens). <i class="nl i">illustrative</i> The rest is a model: '+S+' engine slots decoding one token per tick, batches of '+B+', a trainer taking '+TR+' ticks per batch, no time for scoring or weight transfer. Real speedups depend on all of these; AReaL reports up to 2.77×, PipelineRL about 2×.';
  RD.onRender(draw);RD.onResize(draw);draw();
})();
