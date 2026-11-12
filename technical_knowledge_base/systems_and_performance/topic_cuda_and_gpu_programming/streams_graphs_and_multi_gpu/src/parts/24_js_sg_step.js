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
// The same step both ways on one time axis (static since 2026-11-12; Fig. 3 on the left of it steps through the mechanism)
(function(){
  const $=id=>document.getElementById(id);if(!$('sg-st-fig'))return;
  function draw(){const c=SGM.cfgFromData(),A=SGM.step(c,false,0),B=SGM.step(c,true,0),tmax=Math.max(A.total,B.total)*1.02,ev=[];
    [[A,'a'],[B,'b']].forEach(([r,p])=>r.events.forEach(e=>ev.push([p+e[0],e[1],e[2],e[3]==='forward'||e[3]==='backward'||e[3]==='optimizer'?e[3]:(e[3]==='bucket '+SG.step.n_buckets?'last':''),e[3]==='optimizer'?'var(--c3)':undefined])));
    SGT.lanes({el:$('sg-st-fig'),lanes:[['acompute','no overlap: compute'],['acomm','no overlap: NCCL'],['bcopy','overlapped: copy'],['bcompute','overlapped: compute'],['bcomm','overlapped: NCCL']],ev,tmax,unit:'ms',lw:150,
      marks:[[B.total,B.total.toFixed(1)+' ms'],[A.total,A.total.toFixed(1)+' ms']],label:'one training step without and with overlap'})}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
