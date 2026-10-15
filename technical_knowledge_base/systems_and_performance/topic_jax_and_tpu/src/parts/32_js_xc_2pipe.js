// ---- Compiler lab, section 1: the five forms of one train step (animated), and where the operations come from ----
(function(){
  const X=window.XC,D=X.D,$=X.$;if(!$('xc-pipe-card'))return;
  const S=D.step,M=D.demo,TM=D.timing&&D.timing.step;
  const st=[
    {n:'Python',api:'your function: <code>jax.jit(train_step)</code>',txt:M.txt.py,cap:'The Python you wrote. Nothing has run yet; <code>jax.jit</code> only wrapped the function. In PyTorch this code would execute operation by operation, each launching a kernel.',
     cnt:[['Train step','one Python function'],['MLP block','3 small functions']],tc:'model_jax.py (the running example) and the demo wrapper in src/xla/fusion_demo.py'},
    {n:'jaxpr',api:'<code>jax.jit(f).trace(*args).jaxpr</code> (or <code>jax.make_jaxpr(f)(*args)</code>)',txt:M.txt.jaxpr,cap:'<b>Trace.</b> JAX ran the function once with tracers (shape and dtype only, no values) and recorded every primitive. Python control flow ran during tracing and left no trace; loops are unrolled. The backward pass is already here: <code>grad</code> is a transformation of the jaxpr, not a tape recorded at run time.',
     cnt:[['Train step',X.n0(S.jaxpr)+' equations'],['MLP block',M.eqns.length+' equations']],time:TM&&TM.trace_cpu,tc:'The MLP block\'s jaxpr, in full.'},
    {n:'StableHLO',api:'<code>jax.jit(f).lower(*args).as_text()</code>',txt:M.txt.shlo,cap:'<b>Lower.</b> Each primitive\'s lowering rule emits StableHLO operations. One equation can become several (explicit broadcasts and constants), and a nested <code>jit</code> becomes a separate function. This text is what JAX hands to the compiler, and what <code>jax.export</code> serialises.',
     cnt:[['Train step',X.n0(S.shlo)+' operations'],['MLP block',M.shloOps+' operations']],time:TM&&TM.lower_cpu,tc:'The first lines of the MLP block\'s StableHLO module.'},
    {n:'HLO',api:'<code>jax.jit(f).lower(*args).as_text(dialect="hlo")</code>',txt:M.txt.hlo,cap:'<b>Convert.</b> XLA\'s own form, still unoptimised. The MLP block grew from '+M.shloOps+' operations to '+M.hloInstr+' instructions: the exact GELU\'s <code>erfc</code> is expanded here into a polynomial of about 90 multiplies, adds, compares and selects.',
     cnt:[['Train step',X.n0(S.hlo)+' instructions'],['MLP block',M.hloInstr+' instructions']],tc:'The first lines of the MLP block\'s HLO module.'},
    {n:'Optimised HLO',api:'<code>jax.jit(f).lower(*args).compile().as_text()</code>',txt:M.txt.opt,cap:'<b>Optimise.</b> XLA\'s passes (section 3) simplify, deduplicate, assign layouts and fuse. What is left at the top level is a short list of kernels: here 4 for the MLP block, '+X.n0(S.kernels)+' for the whole step ('+X.n0(S.fusions)+' of them fusions).',
     cnt:[['Train step',X.n0(S.kernels)+' kernels'],['MLP block',M.kernels.length+' kernels']],time:TM&&TM.compile_cpu,tc:'The MLP block\'s optimised entry computation: parameters, then 4 kernels.'},
    {n:'Executable',api:'<code>compiled = jax.jit(f).lower(*args).compile()</code>; <code>compiled(*args)</code>',txt:'# XLA:CPU emits machine code through LLVM; GPU and TPU backends emit their own.\n# The dump directory (section 8) holds the object files:\n'+((D.passes&&D.passes.mlp_block&&D.passes.mlp_block.other)||[]).filter(f=>/\.o$/.test(f)).join('\n'),cap:'<b>Codegen.</b> Machine code for this CPU. The jitted function caches the executable, keyed on the argument shapes, dtypes and static arguments: later calls with the same signature skip every stage above and go straight here.',
     cnt:[['Train step',TM?X.sec(TM.steady_median)+' per call':'one executable'],['MLP block','one executable']],tc:'Object files XLA wrote for the MLP block\'s two loop fusions (the matmuls call the YNNPACK library).'}];
  const chips=$('xc-pipe-chips');
  chips.innerHTML=st.map((s,i)=>'<button data-i="'+i+'">'+(i?'&#8594; ':'')+X.esc(s.n)+'</button>').join('');
  let A;
  chips.addEventListener('click',e=>{const b=e.target.closest('button');if(b)A.go(+b.dataset.i)});
  function draw(i){const s=st[i];
    chips.querySelectorAll('button').forEach((b,j)=>{b.classList.toggle('on',j===i);b.classList.toggle('done',j<i)});
    $('xc-pipe-cap').innerHTML='<b>'+(i+1)+'/'+st.length+' '+X.esc(s.n)+'.</b> '+s.cap;
    $('xc-pipe-cnt').innerHTML=s.cnt.map(c=>'<div class="stat"><div class="k">'+X.esc(c[0])+'</div><div class="v">'+X.esc(c[1])+'</div></div>').join('')+
      (s.time!=null?'<div class="stat"><div class="k">CPU time for this stage, train step</div><div class="v">'+X.sec(s.time)+'</div><div class="d">median, rough (section 7)</div></div>':'');
    $('xc-pipe-api').innerHTML='How to print it: '+s.api;
    $('xc-pipe-txt').textContent=s.txt;$('xc-pipe-txtcap').textContent=s.tc;}
  A=X.anim({card:'xc-pipe-card',ctl:'xc-pipe-ctl',n:st.length,draw,ms:4200,label:'Stage'});

  // where the operations come from: forward, backward, optimiser
  const P=D.pieces,f=P.forward,fb=P.forward_backward,sp=P.step;
  const parts={eq:[f.jaxpr_eqns,fb.jaxpr_eqns-f.jaxpr_eqns,sp.jaxpr_eqns-fb.jaxpr_eqns],k:[f.kernels,fb.kernels-f.kernels,sp.kernels-fb.kernels],f:[f.flops,fb.flops-f.flops,sp.flops-fb.flops]};
  const nm=['Forward pass','Backward pass (from grad)','Clip + AdamW update'],col=['var(--c1)','var(--c4)','var(--c2)'];
  let mode='eq';
  function bars(){const v=parts[mode],tot=v.reduce((a,b)=>a+b,0),fmt=mode==='f'?X.gf:X.n0;
    $('xc-pc-bars').innerHTML=X.bars(v.map((x,i)=>({n:nm[i],v:x,c:col[i]})),x=>fmt(x));
    $('xc-pc-note').innerHTML='Share of the whole step: '+v.map((x,i)=>nm[i]+' '+(100*x/tot).toFixed(mode==='f'?2:0)+'%').join(', ')+'. '+
      (mode==='f'?'FLOPs from XLA\'s <code>cost_analysis()</code> (forward '+X.gf(f.flops)+'; the whole step '+X.gf(sp.flops)+', close to the "training costs 3 forward passes" rule: 3 x '+X.gf(f.flops)+' = '+X.gf(3*f.flops)+').':
       'The optimiser is most of the program but almost none of the arithmetic: 69 parameter arrays, each with its own chain of about '+Math.round(parts.eq[2]/69)+' equations (clipping, two moment updates, bias correction, weight decay, the update). On an accelerator those chains are memory-bound, which is why fused optimisers matter.');}
  X.seg($('xc-pc-seg'),v=>{mode=v;bars()});
  bars();
})();
