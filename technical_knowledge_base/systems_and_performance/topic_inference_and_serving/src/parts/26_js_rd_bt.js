// ---- Reading tab, section 3: throughput against batch size (derived for the running example; measured on the M1 Pro) ----
(function(){
  const R=window.RDD,el=document.getElementById('rd-bt-bars'),m1=document.getElementById('rd-bt-m1');if(!el)return;
  const num=s=>+String(s).replace(/,/g,'');
  function row(nm,ml,v,mx,val,c){return '<div class="row"><div class="nm">'+nm+'<span class="ml">'+ml+'</span></div><div class="track"><div class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:var('+c+')"></div></div><div class="val">'+val+'</div></div>'}
  function draw(){
    const mx=Math.max(...R.batch.map(b=>b.tot));
    el.innerHTML='<div class="small" style="font-weight:600;margin:2px 0">H200, Llama 3.1 70B FP8 <span class="der">derived</span></div>'+R.batch.map(b=>row(b.B+(b.B===1?' user':' users'),RDX.nf(b.t_ms,1)+' ms per step, '+RDX.nf(b.per)+' tok/s each',b.tot,mx,RDX.nf(b.tot)+' tok/s','--c3')).join('');
    const M=R.meas,pts=[[1,num(M.bb1)],[8,num(M.bb8)],[64,num(M.bb64)]],mm=Math.max(...pts.map(p=>p[1]));
    m1.innerHTML='<div class="small" style="font-weight:600;margin:8px 0 2px">M1 Pro, Qwen3-0.6B Q4_K_M <span class="meas">measured here</span></div>'+pts.map(p=>row(p[0]+(p[0]===1?' sequence':' sequences'),'',p[1],mm,RDX.nf(p[1])+' tok/s','--good')).join('');
  }
  RD.onRender(draw);draw();
})();
