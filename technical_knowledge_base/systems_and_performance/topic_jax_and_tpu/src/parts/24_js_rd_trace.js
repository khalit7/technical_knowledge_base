// ---- Reading tab, section 2: the same train step called four times, PyTorch eager against JAX jit ----
(function(){
  const card=document.getElementById('rd-tr-card');if(!card)return;
  const T=window.RDJ.trace,meas=T.ops!=null&&T.kernels!=null;
  const N=meas?T.ops:60,F=meas?T.kernels:12,K=T.torchKernels!=null?T.torchKernels:N;
  const unit=Math.max(1,Math.ceil(Math.max(N,K)/48));
  const lanesEl=document.getElementById('rd-tr-lanes'),cnt=document.getElementById('rd-tr-cnt');
  let mode='both';
  document.getElementById('rd-tr-note').innerHTML=(meas?
    '<span class="meas">measured</span> on the running example\'s whole train step (forward, backward, clipping and AdamW; Compiler lab): '+N.toLocaleString('en-US')+' primitives in its jaxpr become '+F.toLocaleString('en-US')+' kernels after XLA ('+T.fusions+' of them fusions, the rest matmuls); the PyTorch twin runs '+K.toLocaleString('en-US')+' aten operators that do work per eager step (views, allocations and scalar reads excluded; 1,309 top-level calls counting them, Training lab).':
    '<span class="ill">illustrative</span> counts (60 operations, 12 fused kernels) until the Compiler lab measures the running example.')+
   ' One box = '+unit+' operation'+(unit>1?'s':'')+'. Timing is not to scale: the point is what runs, not how long.';
  const calls=['f32[B,T] batch','same shape','same shape','new sequence length'];
  // per step: which events have happened (the step texts are the list sx-tr in 20_read_b.html). Events per call: pt (eager run), jt (trace), jc (compile), jr (run)
  const steps=[
   {ev:[]},
   {ev:[[0,'pt']]},
   {ev:[[0,'pt'],[0,'jt']]},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc']]},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr']]},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr'],[1,'pt'],[1,'jr']]},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr'],[1,'pt'],[1,'jr'],[2,'pt'],[2,'jr']]},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr'],[1,'pt'],[1,'jr'],[2,'pt'],[2,'jr'],[3,'pt'],[3,'jt'],[3,'jc'],[3,'jr']]}];
  function boxes(n,cls){let s='';for(let i=0;i<Math.ceil(n/unit);i++)s+='<span class="'+cls+'" style="width:7px"></span>';return s}
  function lane(name,kind,ev){
    let rows='';
    for(let c=0;c<4;c++){
      const mine=ev.filter(e=>e[0]===c&&e[1][0]===kind[0]).map(e=>e[1]);
      if(!mine.length){rows+='<div class="small mute" style="margin:2px 0">call '+(c+1)+': not yet</div>';continue}
      let b='';
      if(mine.includes('pt'))b+=boxes(K,'py');
      if(mine.includes('jt'))b+=boxes(N,'tr');
      if(mine.includes('jc'))b+='<span class="cp" style="width:46px" title="compile"></span>';
      if(mine.includes('jr'))b+=boxes(F,'fx');
      rows+='<div class="small" style="margin:2px 0">call '+(c+1)+' <span class="mute">('+calls[c]+')</span><div class="rd-ops">'+b+'</div></div>';
    }
    return '<div class="rd-lane"><div class="h">'+name+'</div>'+rows+'</div>';
  }
  function draw(i){
    const ev=steps[i].ev;
    let h='';
    if(mode!=='jx')h+=lane('PyTorch eager','p',ev);
    if(mode!=='pt')h+=lane('JAX jit','j',ev);
    lanesEl.innerHTML=h;
    const n=k=>ev.filter(e=>e[1]===k).length;
    const ptOps=n('pt')*K,jxPy=n('jt')*N,tr=n('jt'),cp=n('jc'),jk=n('jr')*F;
    cnt.innerHTML=(mode!=='jx'?RD.stat('PyTorch: ops run from Python',ptOps.toLocaleString('en-US'))+RD.stat('PyTorch: kernels launched',ptOps.toLocaleString('en-US')):'')+
      (mode!=='pt'?RD.stat('JAX: ops run from Python',jxPy.toLocaleString('en-US'),'only while tracing')+RD.stat('JAX: traces, compiles',tr+', '+cp)+RD.stat('JAX: kernels launched',jk.toLocaleString('en-US')):'');
  }
  const A=RD.anim({card:'rd-tr-card',ctl:'rd-tr-ctl',n:steps.length,draw,ms:4200,label:'Animation step',list:'sx-tr'});
  RD.seg(document.getElementById('rd-tr-mode'),m=>{mode=m;A.redraw()});
})();
