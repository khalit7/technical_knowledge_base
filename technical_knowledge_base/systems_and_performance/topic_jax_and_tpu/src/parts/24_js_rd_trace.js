// ---- Reading tab, section 2: the same train step called four times, PyTorch eager against JAX jit ----
(function(){
  const card=document.getElementById('rd-tr-card');if(!card)return;
  const T=window.RDJ.trace,meas=T.ops!=null&&T.fusions!=null;
  const N=meas?T.ops:60,F=meas?T.fusions:12,K=T.torchKernels!=null?T.torchKernels:N;
  const unit=Math.max(1,Math.ceil(Math.max(N,K)/48));
  const lanesEl=document.getElementById('rd-tr-lanes'),cnt=document.getElementById('rd-tr-cnt'),cap=document.getElementById('rd-tr-cap');
  let mode='both';
  document.getElementById('rd-tr-note').innerHTML=(meas?
    '<span class="meas">measured</span> on the running example\'s train step: '+N.toLocaleString('en-US')+' primitives in its jaxpr, '+F+' fusions in the optimised HLO (Compiler lab)'+(T.torchKernels!=null?', '+K+' kernels launched by the PyTorch twin per eager step':'; PyTorch eager is drawn launching one kernel per primitive (an approximation)')+'.':
    '<span class="ill">illustrative</span> counts (60 operations, 12 fused kernels) until the Compiler lab measures the running example.')+
    ' One box = '+unit+' operation'+(unit>1?'s':'')+'. Timing is not to scale: the point is what runs, not how long.';
  const calls=['f32[B,T] batch','same shape','same shape','new sequence length'];
  // per step: which events have happened. Events per call: pt (eager run), jt (trace), jc (compile), jr (run)
  const steps=[
   {ev:[],t:'Before the first call',p:'Both frameworks hold the same model and the same batch. Watch what Python does on each call.'},
   {ev:[[0,'pt']],t:'Call 1, PyTorch: every operation goes through Python',p:'Eager mode runs the step line by line: each operation is dispatched from Python and launches its own kernel the moment it is reached.'},
   {ev:[[0,'pt'],[0,'jt']],t:'Call 1, JAX: trace',p:'jit runs the Python function once with tracers (shapes and dtypes only) and records every primitive into a jaxpr. Nothing has been computed yet.'},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc']],t:'Call 1, JAX: compile',p:'XLA compiles the whole step, forward, backward and optimiser update together, fusing chains of operations into fewer kernels. This is the slow part of the first call.'},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr']],t:'Call 1, JAX: run the executable',p:'The compiled program runs as '+F+' fused kernels. The executable is cached under the signature: shapes, dtypes and static arguments.'},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr'],[1,'pt'],[1,'jr']],t:'Call 2, same shapes',p:'PyTorch dispatches every operation from Python again. JAX finds the signature in its cache: the Python function does not run at all (a print inside it would stay silent).'},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr'],[1,'pt'],[1,'jr'],[2,'pt'],[2,'jr']],t:'Call 3, same shapes',p:'The steady state: JAX pays no Python cost per operation, and its kernels are fewer because they are fused.'},
   {ev:[[0,'pt'],[0,'jt'],[0,'jc'],[0,'jr'],[1,'pt'],[1,'jr'],[2,'pt'],[2,'jr'],[3,'pt'],[3,'jt'],[3,'jc'],[3,'jr']],t:'Call 4, a new sequence length',p:'PyTorch does not care. For JAX this is a new signature: trace again, compile again. A batch whose length changes every step recompiles every step, which is why JAX code pads to a few fixed lengths (buckets).'}];
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
    cap.innerHTML='<div class="t">'+steps[i].t+'</div><p>'+steps[i].p+'</p>';
  }
  const A=RD.anim({card:'rd-tr-card',ctl:'rd-tr-ctl',n:steps.length,draw,ms:2200,label:'Animation step'});
  RD.seg(document.getElementById('rd-tr-mode'),m=>{mode=m;A.redraw()});
})();
