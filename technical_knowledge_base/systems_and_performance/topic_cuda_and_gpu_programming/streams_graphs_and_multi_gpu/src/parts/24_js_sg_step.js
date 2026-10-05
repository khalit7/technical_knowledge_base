// ---- The training-step model (a port of step_model in recompute.py) and the Reading animation ----
window.SGM=(function(){
  // GPT-2-style parameter list in model.parameters() order; tied: the output layer reuses wte
  function params(h,L,V,ctx,tied){
    const blk=[2*h,3*h*h+3*h,h*h+h,2*h,4*h*h+4*h,4*h*h+h],p=[['wte',V*h],['wpe',ctx*h]];
    for(let l=0;l<L;l++)blk.forEach((n,i)=>p.push(['b'+l+'.'+i,n]));
    p.push(['lnf',2*h]);if(!tied)p.push(['head',V*h]);
    return {p,blk:blk.reduce((a,b)=>a+b,0)};
  }
  // c: {h,L,V,ctx,tied,tokens,gpus,peak,mfu,busbw,grad_bytes,cap,first_cap,pcie,hbm,opt_bytes_per_param,batch_bytes}
  function step(c,overlap,slow){
    slow=slow||0;const P=params(c.h,c.L,c.V,c.ctx,c.tied),N=P.p.reduce((a,x)=>a+x[1],0);
    const rate=c.peak*c.mfu,fwd=2*N*c.tokens/rate,bwd=2*fwd,mmHead=c.V*c.h,tot=mmHead+c.L*P.blk;
    const tHead=bwd*mmHead/tot,ready={lnf:tHead};if(!c.tied)ready.head=tHead;
    for(let l=c.L-1;l>=0;l--){const t=tHead+bwd*(c.L-l)*P.blk/tot;for(let i=0;i<6;i++)ready['b'+l+'.'+i]=t}
    ready.wpe=ready.wte=bwd;
    const buckets=[];let cur=[],cap=c.first_cap;
    for(let i=P.p.length-1;i>=0;i--){cur.push(P.p[i]);if(cur.reduce((a,x)=>a+x[1],0)*c.grad_bytes>=cap){buckets.push(cur);cur=[];cap=c.cap}}
    if(cur.length)buckets.push(cur);
    const g=c.gpus,ar=b=>b*2*(g-1)/g/c.busbw+(c.alpha||0),copy=c.batch_bytes/c.pcie,opt=N*c.opt_bytes_per_param/c.hbm,ev=[];
    let t=0;
    if(!overlap){ev.push(['copy',0,copy,'batch H2D']);t=copy}else ev.push(['copy',0,copy,'batch H2D (prefetched last step)']);
    ev.push(['compute',t,t+fwd,'forward']);const t0=t+fwd;
    const bl=buckets.map(b=>[Math.max(...b.map(x=>ready[x[0]])),b.reduce((a,x)=>a+x[1],0)*c.grad_bytes]);
    let tOpt;
    if(overlap){const bs=bwd*(1+slow);ev.push(['compute',t0,t0+bs,'backward']);let tc=t0;
      bl.forEach((b,i)=>{const s=Math.max(t0+b[0]*(1+slow),tc);tc=s+ar(b[1]);ev.push(['comm',s,tc,'bucket '+(i+1)])});
      tOpt=Math.max(t0+bs,tc)}
    else{ev.push(['compute',t0,t0+bwd,'backward']);let tc=t0+bwd;bl.forEach((b,i)=>{const s=tc;tc=s+ar(b[1]);ev.push(['comm',s,tc,'bucket '+(i+1)])});tOpt=tc}
    ev.push(['compute',tOpt,tOpt+opt,'optimizer']);
    const total=tOpt+opt,comm=bl.reduce((a,b)=>a+ar(b[1]),0);
    const ms=x=>x*1e3;
    return {N,fwd:ms(fwd),bwd:ms(bwd),opt:ms(opt),copy:ms(copy),comm:ms(comm),total:ms(total),
      exposed:ms(total-fwd-bwd*(1+(overlap?slow:0))-opt-(overlap?0:copy)),buckets:bl.map(b=>[ms(b[0]),b[1]]),
      events:ev.map(e=>[e[0],ms(e[1]),ms(e[2]),e[3]])};
  }
  function cfgFromData(){const c=Object.assign({},SG.step.cfg);return Object.assign(c,{h:768,L:12,V:50257,ctx:1024,tied:true})}
  return {params,step,cfgFromData};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('sg-st-card'))return;
  let mode='serial',seq=[],res=null,an=null;
  const lanes=[['copy','copy stream'],['compute','compute stream'],['comm','NCCL stream']];
  function build(){const c=SGM.cfgFromData();res=SGM.step(c,mode==='overlap',0);
    const other=SGM.step(c,mode!=='overlap',0);
    // steps: one per event, in order of end time
    seq=res.events.map((e,i)=>({e,i})).sort((a,b)=>a.e[2]-b.e[2]||a.i-b.i);
    res.tmax=Math.max(res.total,other.total)*1.02;
  }
  function caption(e){const L=e[3];
    if(L.startsWith('batch'))return mode==='serial'?['Copy the batch in','The input ids cross PCIe on the compute stream before the forward can start. It is '+SG.step.cfg.batch_bytes.toLocaleString('en-US')+' bytes, so the bar is a hairline: for LLMs the copy is not the problem.']:['Batch already on the GPU','It was copied on a separate stream with non_blocking=True from pinned memory during the previous step; the forward does not wait.'];
    if(L==='forward')return ['Forward','2N FLOPs per token at the assumed 40% MFU: '+(e[2]-e[1]).toFixed(1)+' ms.'];
    if(L==='backward')return ['Backward',mode==='serial'?'Twice the forward. The NCCL stream sits idle: no gradient is sent until backward is over.':'Twice the forward. As each bucket of gradients completes, DDP hands it to the NCCL stream, which all-reduces it while backward continues.'];
    if(L.startsWith('bucket')){const n=+L.split(' ')[1],nb=SG.step.n_buckets,b=res.buckets[n-1],mb=(b[1]/1048576).toFixed(1);
      return [L+' of '+nb+' ('+mb+' MiB)',mode==='serial'?'All-reduced after backward, while every SM waits.':(n<nb?'Ready at '+b[0].toFixed(1)+' ms into backward; all-reduced under the backward compute.':'The last bucket holds the tied token embedding, complete only when backward ends: its all-reduce cannot hide.')]}
    if(L==='optimizer')return ['Optimizer step','Waits for every bucket. Step done at '+res.total.toFixed(2)+' ms.'];
    return [L,''];
  }
  function draw(i){const el=$('sg-st-fig');const shown=new Set(seq.slice(0,i+1).map(x=>x.i));const t=seq[i].e[2];
    const ev=res.events.map((e,k)=>[e[0],e[1],e[2],e[3]==='forward'||e[3]==='backward'||e[3]==='optimizer'?e[3]:'',e[3]==='optimizer'?'var(--c3)':undefined,!shown.has(k)]);
    SGT.lanes({el,lanes,ev,tmax:res.tmax,unit:'ms',lw:104,marks:[[t,t.toFixed(1)+' ms']],label:'training step timeline'});
    const c=caption(seq[i].e);$('sg-st-capt').innerHTML='<div class="t">Step '+(i+1)+' of '+seq.length+': '+RD.esc(c[0])+'</div><p>'+RD.esc(c[1])+'</p>';
    const commDone=res.events.filter((e,k)=>shown.has(k)&&e[0]==='comm').reduce((a,e)=>a+e[2]-e[1],0);
    $('sg-st-cnt').innerHTML=RD.stat('Clock',t.toFixed(2)+' ms','this step so far')+RD.stat('All-reduce done',commDone.toFixed(2)+' / '+res.comm.toFixed(2)+' ms',SG.step.n_buckets+' buckets')+
      RD.stat('Step time',res.total.toFixed(2)+' ms',mode==='serial'?'nothing overlapped':'overlapped, '+res.exposed.toFixed(2)+' ms comm exposed');
  }
  build();
  an=RD.anim({card:'sg-st-card',ctl:'sg-st-ctl',n:seq.length,ms:1300,label:'Training step',draw});
  RD.seg($('sg-st-seg'),m=>{mode=m;build();an.reset(seq.length);an.play()});
  RD.onResize(()=>an.redraw());
})();
