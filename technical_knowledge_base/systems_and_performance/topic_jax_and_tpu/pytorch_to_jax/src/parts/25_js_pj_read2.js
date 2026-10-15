// ---- PyTorch to JAX page: the ladder animation, tolerances, float64, drift, GPT-2, mistakes, interview questions.
(function(){
  const J=window.PJ,H=J.hunt.variants,esc=RD.esc,s2=v=>PJU.fmt(v,'s2');
  // ---------------- the ladder: the correct port and one chosen port climb the same five rungs
  const RUNGS=[['logits','Logits',1e-5,'the forward pass (layers, defaults, weights)'],['loss0','Loss',1e-5,'the loss and its reduction'],
    ['grads','Gradients',1e-5,'the backward pass'],['step1','One step',1e-6,'the optimiser and its defaults'],['curve','300-step curve',1e-4,'everything, over time']];
  const ORDER=['ln_eps','gelu','fast_var','bf16','no_mask','mask_inverted','mask_inverted_finfo','transpose','init','loss_sum','decay_all','wd_default','b2_default','clip_after','clip_eps','sched_off','naive'];
  const sel=document.getElementById('pj-lad-v'),lad=document.getElementById('pj-lad'),cap=document.getElementById('pj-lad-cap');
  if(sel){
    sel.innerHTML=ORDER.filter(k=>H[k]).map(k=>'<option value="'+k+'">'+esc(H[k].label)+'</option>').join('');
    const val=(v,r)=>{if(r==='curve')return v.max_abs_loss_diff_vs_torch;if(r==='logits'&&v.rungs.logits_nan)return NaN;return v.rungs[r]};
    const pass=(x,t)=>x!=null&&isFinite(x)&&x<=t;
    const txt=x=>x==null||!isFinite(x)?'NaN':s2(x);
    function draw(i){const v=H[sel.value],c=H.correct;
      let h='<div class="h"></div><div class="h">correct port</div><div class="h">'+esc(sel.options[sel.selectedIndex].text.slice(0,40))+(sel.options[sel.selectedIndex].text.length>40?'...':'')+'</div>';
      RUNGS.forEach((r,k)=>{const show=k<i,cur=k===i-1;
        const a=val(c,r[0]),b=val(v,r[0]);
        const cls=x=>show?(pass(x,r[2])?'ok':'bad'):'wait';
        h+='<div class="rl">'+r[1]+'<br><span class="mute small">&le; '+r[2].toExponential().replace('e-','e-')+'</span></div><div class="c '+cls(a)+(cur?' cur':'')+'">'+(show?txt(a):'?')+'</div><div class="c '+cls(b)+(cur?' cur':'')+'">'+(show?txt(b):'?')+'</div>'});
      lad.innerHTML=h;
      let m;
      if(i===0)m='Both ports start from the PyTorch twin\'s initial weights and see batch 0. Each step compares one more thing with PyTorch; press play or step.';
      else{const r=RUNGS[i-1],b=val(v,r[0]),ok=pass(b,r[2]);
        const first=RUNGS.findIndex(rr=>!pass(val(v,rr[0]),rr[2]));
        m='<b>'+r[1]+'</b> checks '+r[3]+'. This port: '+txt(b)+(ok?', within the threshold.':', <b>fails</b>.')+(i-1===first?' This is the first failing rung: look at '+r[3]+'.':'');
        if(i===RUNGS.length){m+=first<0?' It passed every rung: the difference is harmless (validation '+PJU.fmt(v.val_300,'f4')+' against '+PJU.fmt(c.val_300,'f4')+').':' Validation after 300 steps: '+(v.val_300==null?'NaN':PJU.fmt(v.val_300,'f4'))+' against '+PJU.fmt(c.val_300,'f4')+' for the correct port.';
          if(r[0]==='curve'&&(v.rungs.step1!=null&&v.rungs.step1<5e-5&&v.rungs.step1>1e-6))m+=' Note the one-step rung: Adam\'s first update is the learning rate times the sign of the gradient, so it hides how large a gradient difference was.'}}
      cap.innerHTML=m}
    const a=RD.anim({card:'pj-lad-card',ctl:'pj-lad-ctl',n:RUNGS.length+1,draw,ms:1500,label:'Ladder rung'});
    sel.value='ln_eps';sel.addEventListener('change',()=>{a.reset(RUNGS.length+1);a.play()});a.redraw()}

  // ---------------- tolerance table by dtype
  const tol=document.getElementById('pj-tol');
  if(tol){const L=J.ladder,e=L.eps;const row=(nm,eps,d)=>'<tr><td>'+nm+'</td><td>'+s2(eps)+'</td>'+['logits','loss0','grads','step1','curve_max'].map(k=>'<td>'+(d&&d[k]!=null?s2(d[k]):'')+'</td>').join('')+'</tr>';
    tol.innerHTML='<thead><tr><th>Both twins in</th><th>machine epsilon</th><th>logits</th><th>loss</th><th>gradients</th><th>one step</th><th>100-step curve</th></tr></thead><tbody>'+
      row('float64',e.float64,L.correct_float64)+row('float32',e.float32,L.correct_float32)+
      '<tr><td>bfloat16</td><td>'+s2(e.bfloat16)+'</td><td colspan="5">logits against float32 PyTorch: PyTorch bf16 '+s2(L.bf16_logits.torch_bf16_vs_f32)+', JAX bf16 '+s2(L.bf16_logits.jax_bf16_vs_f32)+'; the two bf16 twins against each other '+s2(L.bf16_logits.torch_bf16_vs_jax_bf16)+' (largest logit '+PJU.fmt(L.bf16_logits.max_abs_logit,'f2')+')</td></tr></tbody>'}

  // ---------------- float64 bars
  const f64=document.getElementById('pj-f64');
  if(f64&&J.ladder.correct_float64){const L=J.ladder,rows=[];
    const R=[['logits','logits'],['loss0','loss'],['grads','gradients'],['step1','one step'],['curve_max','100-step curve']];
    const C=[['correct_float32','correct, float32','var(--c1)'],['correct_float64','correct, float64','var(--good)'],['correct_torchclip_float64','correct + PyTorch\'s clip formula, float64','var(--c6)'],['tanh_gelu_float32','tanh GELU bug, float32','var(--c2)'],['tanh_gelu_float64','tanh GELU bug, float64','var(--c4)']].filter(c=>L[c[0]]);
    let h='';R.forEach(r=>{h+='<div class="pj-grp">'+r[1]+'</div><div class="pj-f64g"></div>'});f64.innerHTML=h;
    const gs=f64.querySelectorAll('.pj-f64g');
    R.forEach((r,i)=>PJV.logbars(gs[i],C.map(c=>({nm:c[1],v:L[c[0]][r[0]],c:c[2]})),-17,-3));
    const t=document.getElementById('pj-f64-txt');
    const tc=L.correct_torchclip_float64;
    const amp=2e-5/1e-8,L64=L.correct_float64;
    t.innerHTML='In float64 the correct port\'s logits, loss and gradients agree to about 1e-15, the floor of float64 ('+s2(L64.logits)+', '+s2(L64.loss0)+', '+s2(L64.grads)+'). Yet one optimiser step later the weights differ by '+s2(L64.step1)+', and after 100 steps the losses by '+s2(L64.curve_max)+'. The amplifier is Adam. Its first update is lr x g / (|g| + eps); for a gradient much smaller than eps (1e-8), a change in g moves the update by lr / eps = '+PJU.fmt(amp,'int')+' times as much (lr = 2e-5 at step 0). '+s2(L64.grads)+' x '+PJU.fmt(amp,'int')+' = '+s2(L64.grads*amp)+', the measured one-step gap; the key biases, whose gradients agree to about 1e-20, move apart by '+s2(L64.step1_keybias)+', the same factor. After that, training compounds the gap like any chaotic iteration.'+
      (tc?' A second, smaller source is the clipping formula (PyTorch adds 1e-6 to the norm): with PyTorch\'s formula in the JAX twin the 100-step gap falls from '+s2(L64.curve_max)+' to '+s2(tc.curve_max)+'.':'')+' The test still separates cleanly: the tanh-GELU bug is the same size in both precisions ('+s2(L.tanh_gelu_float32.logits)+' and '+s2(L.tanh_gelu_float64.logits)+' in the logits; '+s2(L.tanh_gelu_float64.curve_max)+' in the 100-step curve against '+s2(L64.curve_max)+').'}

  // ---------------- drift by window (root's 4,000-step run)
  const dr=document.getElementById('pj-drift');
  if(dr){const W=J.root.twin_by_window;PJV.logbars(dr,W.map(w=>({nm:'steps '+w[0]+' to '+w[1],v:w[2],c:'var(--c1)'})),-6,-2);
    const d=J.root.twin_drift_last;
    document.getElementById('pj-drift-cap').innerHTML='Largest |training loss, PyTorch minus plain JAX| in each 500-step window, log scale; root Training lab, <code>src/train/out/twin_long.json</code> ('+esc(J.root.twin_machine)+', '+esc(J.root.twin_date)+'). At step '+d.step+' weights other than the key biases differ by '+s2(d.w_torch_vs_jax_excl_keybias)+', key biases by '+s2(d.w_torch_vs_jax_keybias)+', logits by '+s2(d.logits_torch_vs_jax)+' (largest logit '+PJU.fmt(d.max_abs_logit,'f1')+'); validation loss at '+J.root.twin_val_at[J.root.twin_val_at.length-1]+' steps: PyTorch '+PJU.fmt(J.root.twin_val.torch.slice(-1)[0],'f4')+', plain JAX '+PJU.fmt(J.root.twin_val.jax.slice(-1)[0],'f4')+', NNX '+PJU.fmt(J.root.twin_val.nnx.slice(-1)[0],'f4')+'.'}

  // ---------------- GPT-2
  const G=J.gpt2,hs=document.getElementById('pj-hf-stats');
  if(hs){hs.innerHTML=RD.stat('Logits vs transformers',s2(G.logits_maxdiff),'largest |logit| '+PJU.fmt(G.max_abs_logit,'f1')+', relative '+s2(G.logits_rel))+
      RD.stat('Top 5 next tokens',G.top5_agree?'same':'differ',G.top5_next.map(t=>JSON.stringify(t)).join(' '))+
      RD.stat('Greedy 20 tokens',G.greedy_same?'identical':'differ','"'+G.greedy_jax.replace(/\n/g,' ').slice(0,60)+'..."');
    const M=G.mistakes;
    document.getElementById('pj-hf-tab').innerHTML='<thead><tr><th>Port</th><th>max |logit difference|</th><th>greedy text</th></tr></thead><tbody>'+
      '<tr><td>correct (no transpose, tanh GELU, epsilon 1e-5, tied head)</td><td>'+s2(G.logits_maxdiff)+'</td><td>same: "'+esc(G.greedy_jax.replace(/\n/g,' '))+'"</td></tr>'+
      [['transpose','square Conv1D weights (c_proj, 768 x 768) transposed as if nn.Linear'],['exact_gelu','exact erf GELU'],['eps','LayerNorm epsilon 1e-6']].map(m=>
        '<tr><td>'+m[1]+'</td><td>'+s2(M[m[0]].logits_maxdiff)+'</td><td>'+(M[m[0]].greedy_same?'same':'differs from token '+M[m[0]].first_token_diverges+': "'+esc(M[m[0]].greedy.replace(/\n/g,' '))+'"')+'</td></tr>').join('')+
      '<tr><td>all Conv1D weights transposed</td><td colspan="2"><code>'+esc(G.transpose_all_error)+'</code></td></tr></tbody>'}

  // ---------------- mistakes table, from the recorded messages
  const mt=document.getElementById('pj-mist');
  if(mt){const D={};J.drills.drills.forEach(d=>D[d.id]=d);const c=(id,k)=>D[id].cands.find(x=>x.id===k);
    const rows=[
      ['Item assignment on a JAX array (<code>x[:, 0] = 0</code>)','<code>'+esc(c('inplace','a').out)+'</code>','<code>x = x.at[:, 0].set(0)</code>'],
      ['<code>.transpose(1, 2)</code> on a 4-D array','<code>'+esc(c('transpose','a').out)+'</code>','<code>jnp.swapaxes(x, 1, 2)</code>'],
      ['PyTorch weight copied into an NNX kernel unchanged','<code>'+esc(c('weights','a').out)+'</code> (and nothing at all for a square matrix)','transpose on the way in, by rule (section 3)'],
      ['bfloat16 tensor through numpy','<code>'+esc(J.convert.errors.bf16_numpy)+'</code>','safetensors, DLPack, or a view as int16'],
      ['Saving a transposed view with safetensors','<code>'+esc(J.convert.errors.noncontiguous_save.slice(0,95))+'...</code>','<code>.contiguous()</code>'],
      ['Strided tensor through DLPack','<code>'+esc(J.interop.t2j_strided_batch.error.slice(0,90))+'...</code>','<code>.contiguous()</code> first'],
      ['Padding labels (-100) into optax cross-entropy','no error; the loss is NaN','mask the rows and average over the rest'],
      ['<code>v, i = jnp.max(x, -1)</code> on a batch of 2','no error; v and i are the two rows\' maxima','<code>jnp.max</code> and <code>jnp.argmax</code>'],
      ['A JAX key reused for every draw','no error; the same numbers (and the same dropout mask) every time','split or <code>fold_in</code> the key; NNX\'s <code>Rngs</code> does it for you'],
      ['<code>jnp.var</code> for <code>torch.var</code>','no error; divides by n, not n - 1','<code>ddof=1</code>'],
      ['An <code>nn.MultiheadAttention</code> mask passed to JAX','no error; attends to the future (NaN with <code>-inf</code> fill)','invert it, or <code>is_causal=True</code>'],
      ['A token id past the vocabulary','no error; the lookup clamps to the last row','check ids against the vocabulary size on the host']];
    mt.innerHTML='<thead><tr><th>Mistake</th><th>What you see</th><th>Fix</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="small">'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody>'}

  // ---------------- interview questions
  const iq=document.getElementById('pj-iq');
  if(iq){const v=k=>PJU.fmt(PJU.get(k),'s2');
    const Q=[
      ['You ported a model and the JAX loss curve sits slightly below PyTorch\'s. Is the port better?','No: different, not better. A falling or lower loss proves nothing about a port. On the running example, optax\'s default b2 and Flax\'s default initialisers both gave a lower validation loss than PyTorch after 300 steps. Test equivalence on one batch first (logits, loss, gradients, one step), then judge curves.'],
      ['Logits differ by 1e-6 between your twins. Bug or not? How do you decide?','Rounding, if it is near float32 epsilon times the size of the numbers and the operations involved: the correct port here differs by '+v('hunt.variants.correct.rungs.logits')+' with logits near 1. Decisive test: rerun both in float64; rounding drops to about 1e-15 ('+v('ladder.correct_float64.logits')+' here), a bug stays the same size (the tanh GELU stays at '+v('ladder.tanh_gelu_float64.logits')+').'],
      ['Which rung catches an optimiser bug, and why not earlier?','The one-step rung or the curves. Logits, loss and gradients do not involve the optimiser, so they pass. Even one step can hide it, because Adam\'s first update is the learning rate times the sign of the gradient; wrong weight decay or b2 only shows after several steps.'],
      ['Why does nn.Linear\'s weight need a transpose into Flax, but GPT-2\'s weights do not?','nn.Linear stores [out, in] and computes x W^T; Flax stores [in, out] and computes x W. GPT-2 uses Hugging Face\'s Conv1D, which already stores [in, out] and computes x W. Read the layer class, not the framework name.'],
      ['The same JAX code gives different logits on a TPU than on your CPU. Why?','The TPU\'s DEFAULT matmul precision does float32 matmuls as one bfloat16 pass. Emulated on the running example: '+v('defaults.matmul_precision.emulated_bf16_inputs_init_max_logit_diff')+' at init, '+v('defaults.matmul_precision.emulated_bf16_inputs_trained500_max_logit_diff')+' on trained weights. Use precision=HIGHEST (or jax.default_matmul_precision) for equivalence tests, then decide what the production run needs.'],
      ['How do you test a port of a model that uses dropout?','Turn dropout off and run the whole ladder; masks come from different generators and can never match. Then turn it on and compare statistics against seed-to-seed variation, and check keys are not reused and eval mode is set.'],
      ['Design: your team will move a 7B PyTorch training codebase to TPUs. Plan the port.','1) Try torchax or PyTorch/XLA (TorchTPU when public) to see if the model runs at all and what it costs; 2) if porting, pick the target (MaxText or Tunix configs before hand-written code); 3) write the weight conversion as a rule with shape asserts and a bitwise round trip; 4) list every default (norm epsilon, activation, init, masks, optimiser decay and mask, clipping, schedule count, loss reduction) and set them explicitly; 5) ladder test on CPU in float32 and float64 on a small config, then on one TPU host with HIGHEST precision; 6) short twin runs, judged against seed variation; 7) only then bfloat16 and sharding, each its own comparison.'],
      ['When would you not port?','When the gain is not in JAX: GPU serving (vLLM, SGLang are PyTorch-first), dependence on PyTorch-only kernels, a codebase you only read, or a one-off TPU trial that torchax can run. Porting buys the compiler, sharding and TPU ecosystem at the cost of a second code base and a test you must keep.']];
    iq.innerHTML=Q.map(q=>'<details class="pj-box"><summary><b>'+q[0]+'</b></summary><p class="small">'+q[1]+'</p></details>').join('')}
})();
