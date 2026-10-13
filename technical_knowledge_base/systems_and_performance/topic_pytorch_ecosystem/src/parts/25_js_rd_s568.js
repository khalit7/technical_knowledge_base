// ---- Reading tab, sections 5, 6 and 8: compile bars, the bottleneck before/after, the custom-op result; predict-then-reveal ----
(function(){
  const D=window.RDD,fmt=n=>Number(n).toLocaleString('en-US');
  // ---------- section 5: step time, eager against compiled ----------
  const cb=document.getElementById('rd-cmp-bars');
  if(cb){const ORD={cpu:['eager','compiled','compiled, max-autotune','compiled, reduce-overhead','compiled + compiled optimizer','eager, fused AdamW','compiled, fused AdamW'],
      mps:['eager','compiled','eager, fused AdamW','compiled, fused AdamW']};
    function show(dev){const v=D.comp[dev],r=D.comp[dev+'_rng'],base=v.eager,mx=Math.max(...ORD[dev].map(k=>v[k]));
      cb.innerHTML=ORD[dev].map(k=>{const sp=base/v[k];return '<div class="row'+(k==='eager'?' hl':'')+'"><div class="nm">'+k+'<span class="ml">'+(k==='eager'?'baseline':(sp>=1?sp.toFixed(2)+'&times; faster':(1/sp).toFixed(2)+'&times; slower'))+'</span></div><div class="track"><div class="fill" style="width:'+(100*v[k]/mx).toFixed(1)+'%;background:'+(k.includes('fused')?'var(--c3)':k==='eager'?'var(--c1)':'var(--c4)')+'"></div></div><div class="val">'+v[k].toFixed(2)+' ms<span class="ml">'+r[k][0].toFixed(1)+' to '+r[k][1].toFixed(1)+'</span></div></div>'}).join('');
      document.getElementById('rd-cmp-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, PyTorch 2.14.1, one training step of the running example, median of 5 trials of 20 steps after warm-up (range under each value); load average '+D.comp['load_'+dev].join(', ')+' ({{Compile lab|#t-comp}}, section 8). '+(dev==='cpu'?'max-autotune kept the BLAS library for every matrix multiply; reduce-overhead records CUDA graphs, which do not exist on a CPU.':'Inductor writes Metal shaders on MPS; the fused optimizer is where most of the gain comes from.')}
    RD.seg(document.getElementById('rd-cmp-seg'),show);show('cpu');
    // the note contains a tab link written by script
    RD.tabLinks(document.getElementById('rd-cmp-card'));
  }
  // ---------- section 6: phases before and after the fix ----------
  const pb=document.getElementById('rd-prf-bars');
  if(pb){const ph=D.phases.cpu,fo=D.opt.cpu,fused=D.comp.cpu['eager, fused AdamW'];
    const after=ph.fwd+ph.bwd+fo.fused;
    const SW=()=>Math.max(120,RD.width(pb)-70);
    const COL={fwd:'var(--c1)',bwd:'var(--c2)',opt:'var(--c5)'};
    const seg=(k,v,tot,hl)=>'<span style="width:'+(100*v/tot).toFixed(2)+'%;background:'+COL[k]+';'+(hl?'outline:2px solid var(--ink);outline-offset:-2px':'')+'">'+(v/tot*SW()>110?{fwd:'forward ',bwd:'backward ',opt:'optimizer '}[k]+v.toFixed(1):v/tot*SW()>40?v.toFixed(1):'')+'</span>';
    const S=[
      {t:'Measure the phases first',p:'Forward '+ph.fwd.toFixed(2)+' ms, backward '+ph.bwd.toFixed(2)+' ms, optimizer '+ph.opt.toFixed(2)+' ms: '+ph.step.toFixed(2)+' ms per step.',hl:'',after:0},
      {t:'The surprise: the optimizer is a quarter of the step',p:'AdamW takes '+(100*ph.opt/ph.step).toFixed(0)+'% of the step. The default for-loop implementation makes 486 operator calls per step, against 142 for the whole forward.',hl:'opt',after:0},
      {t:'The fix: one argument, fused=True',p:'The fused AdamW does the whole update in one kernel: '+fo.forloop.toFixed(2)+' ms becomes '+fo.fused.toFixed(2)+' ms ('+(fo.forloop/fo.fused).toFixed(1)+' times faster; foreach, '+fo.foreach.toFixed(2)+' ms, does not help on the CPU). Predicted step: '+after.toFixed(2)+' ms.',hl:'opt',after:1},
      {t:'Measure again',p:'Measured with the fused optimizer: '+fused.toFixed(2)+' ms per step, '+(ph.step/fused).toFixed(2)+' times faster, matching the prediction. torch.compile, by contrast, gave nothing here (section 5): fix the bottleneck you measured, not the one you expect.',hl:'',after:2}];
    function draw(i){const s=S[i],tot=ph.step;
      let h='<div class="split"><div>Before</div><div class="sb">'+seg('fwd',ph.fwd,tot)+seg('bwd',ph.bwd,tot)+seg('opt',ph.opt,tot,s.hl==='opt'&&!s.after)+'</div>';
      h+='<div>After</div><div class="sb" style="width:'+(s.after?(100*(s.after===2?fused:after)/tot).toFixed(1):0)+'%;transition:width .5s">'+(s.after?seg('fwd',ph.fwd,after)+seg('bwd',ph.bwd,after)+seg('opt',fo.fused,after,s.hl==='opt'):'')+'</div></div>';
      h+='<div class="out">'+RD.stat('Step, before',ph.step.toFixed(2)+' ms','for-loop AdamW')+RD.stat('Optimizer share',(100*(s.after?fo.fused/after:ph.opt/ph.step)).toFixed(0)+'%',s.after?'after the fix':'before')+RD.stat('Step, after',s.after===2?fused.toFixed(2)+' ms':s.after?after.toFixed(2)+' ms':'&hellip;',s.after===2?'measured':s.after?'predicted':'')+'</div>';
      pb.innerHTML=h;document.getElementById('rd-prf-cap').innerHTML='<div class="t">'+(i+1)+' / '+S.length+'. '+s.t+'</div><p>'+s.p+'</p>'}
    RD.anim({card:'rd-prf-card',ctl:'rd-prf-ctl',n:S.length,draw,ms:3000,label:'Bottleneck step'});
  }
  // ---------- section 8: the custom-op result ----------
  const eo=document.getElementById('rd-ext-out');
  if(eo){const c=D.customop;
    eo.innerHTML=RD.stat('Before: graphs',c.plain.graphs,c.plain.breaks+' graph breaks')+RD.stat('After: graphs',c.custom_op.graphs,c.custom_op.breaks+' graph breaks')+RD.stat('Same result',c.same_result?'yes':'no','eager values compared');
    document.getElementById('rd-ext-why').textContent='"'+(c.plain.reasons[0]||'')+'"'}
  // ---------- predict, then reveal ----------
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ok=+pr.dataset.ok,ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
      if(+b.dataset.a!==ok)b.classList.add('wrong');ans.hidden=false}))});
})();
