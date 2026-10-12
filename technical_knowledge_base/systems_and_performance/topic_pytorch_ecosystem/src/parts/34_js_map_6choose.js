// ---- Ecosystem map: chooser, list of checks, interview questions ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc,A=M.byId;
  const n=(id,k)=>((D.ev[id]||{})[k]||[0])[0];
  const dep=(id,k)=>(D.deps[id]||{})[k]||0;
  const nm=id=>'<a href="#map-s-atlas" data-sel="'+id+'">'+esc(A[id].name)+'</a> '+M.st(A[id].status);
  function rec(task,scale,hw){
    const R={main:null,alt:null,avoid:null,note:''};
    if(hw==='tpu'){R.main={t:'Leave this map',ids:[],why:['TPUs are programmed through XLA; this topic does not cover PyTorch/XLA. See [[jax-and-tpu]] for the TPU stack.']};return R}
    const mac=hw==='mac',amd=hw==='amd';
    switch(task){
    case 'pretrain':
      if(mac){R.main={t:'Plain PyTorch loop',ids:['torch'],why:['Pretraining at any useful scale needs GPUs; on a Mac or CPU you can learn the loop and run every distributed API on gloo, as the [[Distributed lab]] does, but not train a real LLM.']};break}
      R.main={t:scale==='one'?'Plain PyTorch with torch.compile':'torchtitan',ids:scale==='one'?['torch']:['torchtitan'],why:scale==='one'?['One GPU needs no parallelism framework: the loop is 60 lines (the running example), torch.compile fuses it ([[Compile lab]]).']:['Its source calls fully_shard in '+n('torchtitan','fsdp2')+' files, DTensor in '+n('torchtitan','dtensor')+', pipelining in '+n('torchtitan','pp')+', context parallel in '+n('torchtitan','cp')+' and DCP in '+n('torchtitan','dcp')+': every PyTorch-native parallelism, composed on one DeviceMesh.','Active, 0.3.0 on '+A.torchtitan.date+'; PyTorch says its own LLM training is being consolidated there (torchforge README).',amd?'Its README links an optimized AMD fork (2025/11).':'Float8, MXFP8 and NVFP4 training through torchao (components/quantization/float8.py imports torchao.float8; README features list).']};
      R.alt=scale==='multi'&&!amd?{t:'Megatron Core (with Megatron Bridge)',ids:['megatron'],why:['For thousands of NVIDIA GPUs and MoE: its own tensor-parallel layers, DDP and Megatron-FSDP, an optional wrapper over core FSDP2 ('+n('megatron','fsdp2')+' files), Transformer Engine in '+dep('megatron','transformer_engine')+' files. NVIDIA-only in practice.']}:{t:'Lightning ModelParallelStrategy, or Accelerate with FSDP2',ids:['lightning','accelerate'],why:['Both hand you the same core FSDP2 and TP; you keep more structure (Lightning) or your own loop (Accelerate).']};
      R.avoid={t:'Avoid',ids:['torchtune','composer','fairscale'],why:['torchtune stopped development (2025-07-15); Composer has had no release since '+A.composer.date+'; FairScale none since 2022.']};
      break;
    case 'full':
      R.main={t:scale==='one'?'HF Trainer (or TRL SFTTrainer)':'Accelerate with FSDP2, or Axolotl',ids:scale==='one'?['transformers','trl']:['accelerate','axolotl'],why:['You start from a Hub checkpoint, so the model definition comes from Transformers anyway.','Measured here: the HF Trainer and Accelerate produce the plain loop\'s exact losses when their defaults are matched.',scale==='one'?'':'Accelerate calls fully_shard when fsdp_version=2 (on GPUs; on CPU it falls back to DDP, measured); Axolotl wires the same thing from a YAML file (fully_shard in '+n('axolotl','fsdp2')+' files).'].filter(Boolean)};
      R.alt={t:scale==='multi'?'torchtitan (if it has your architecture)':'DeepSpeed ZeRO-3 with offload',ids:[scale==='multi'?'torchtitan':'deepspeed'],why:[scale==='multi'?'Better scaling and composable TP/PP; supported models are listed in its README.':'When the model does not fit even sharded: ZeRO-3 can offload parameters and optimizer state to CPU or NVMe. Its own engine, not FSDP (0 FSDP files).']};
      R.avoid={t:'Avoid',ids:['torchtune'],why:['No longer maintained.']};
      if(mac)R.note='On Apple Silicon only small models fit; use MPS with the HF Trainer on one device. No FSDP: Accelerate on CPU gives DDP.';
      break;
    case 'lora':
      R.main={t:scale==='one'?'Unsloth, or PEFT + TRL':'Axolotl, or PEFT + TRL with Accelerate',ids:scale==='one'?['unsloth','peft','trl']:['axolotl','peft','trl'],why:['PEFT injects the adapters (measured: r = 8 trains '+M.nf(D.checks.peft.trainable_params)+' of '+M.nf(D.checks.peft.total_params)+' parameters of the tiny GPT); TRL\'s SFTTrainer is a transformers.Trainer subclass (measured).',scale==='one'?'Unsloth patches the model with Triton kernels ('+n('unsloth','afunc')+' files with autograd.Function) to save memory on one GPU; it imports PEFT in '+dep('unsloth','peft')+' files and TRL in '+dep('unsloth','trl')+'.':'Axolotl imports PEFT in '+dep('axolotl','peft')+' files and TRL in '+dep('axolotl','trl')+': a configuration layer over the same pieces, with FSDP2 and DeepSpeed options.']};
      R.alt={t:'Plain PyTorch + PEFT',ids:['peft'],why:['PEFT works on any nn.Module (measured on the plain running example), so you can keep your own loop.']};
      R.avoid={t:'Avoid',ids:['torchtune'],why:['Its LoRA recipes are fine to read, but nothing new will ship.']};
      if(mac||amd)R.note=(mac?'Unsloth and its Triton kernels need a GPU backend; on a Mac use PEFT + TRL on MPS for small models.':'Unsloth and Liger are Triton kernels written and tuned for NVIDIA first; check their ROCm notes before relying on them.');
      break;
    case 'rl':
      R.main={t:scale==='multi'?'verl':'TRL (GRPOTrainer with vLLM generation)',ids:[scale==='multi'?'verl':'trl'],why:scale==='multi'?['Built for many GPUs: a Ray controller ('+dep('verl','ray')+' files), FSDP or Megatron training backends (Megatron in '+dep('verl','megatron')+' files), vLLM or SGLang rollouts ('+dep('verl','vllm')+' and '+dep('verl','sglang')+' files).']:['GRPOTrainer is a transformers.Trainer subclass (measured), so it runs anywhere Accelerate does; it imports vLLM in '+dep('trl','vllm')+' files for fast generation.']};
      R.alt={t:'torchtitan\'s TitanRL',ids:['torchtitan'],why:['New (2026/08): reuses torchtitan models and kernels across training and vLLM generation; for teams already on torchtitan.']};
      R.avoid={t:'Avoid',ids:['torchforge'],why:['Development paused; its README points to torchtitan.']};
      break;
    case 'quant':
      R.main={t:'torchao',ids:['torchao'],why:['PyTorch\'s own quantization moved here (torch.ao.quantization deprecated in 2.8, PT2E removed from core in 2.11).','Measured: int8 weight-only turned each Linear weight into an '+esc(D.checks.torchao.after_type)+' tensor subclass; loss moved from '+D.checks.torchao.loss_fp32+' to '+D.checks.torchao.loss_int8wo+'.','Transformers, Axolotl, Unsloth and ExecuTorch all import it ('+dep('transformers','torchao')+', '+dep('axolotl','torchao')+', '+dep('unsloth','torchao')+', '+dep('executorch','torchao')+' files).']};
      R.alt={t:'Formats and precision theory',ids:[],why:['Which format to use and why belongs to [[Quantization and Precision]].']};
      R.avoid={t:'Avoid',ids:['torch'],why:['torch.ao.quantization and quantized dtypes (deprecated in 2.8 and 2.13).']};
      break;
    case 'edge':
      R.main={t:'ExecuTorch',ids:['executorch','torchao'],why:['Part of PyTorch Core since 2026-04-07; measured here: the tiny GPT exported, lowered to XNNPACK and run in the ExecuTorch runtime with logits within '+D.checks.executorch.runtime.max_abs_diff_vs_eager.toExponential(1)+' of eager.','Quantize first with torchao (ExecuTorch imports it in '+dep('executorch','torchao')+' files).']};
      R.alt={t:'ONNX export',ids:['onnx'],why:['When the target runtime is ONNX Runtime; torch.onnx.export has used torch.export by default since 2.9.']};
      R.avoid={t:'Avoid',ids:['torch'],why:['TorchScript for deployment: deprecated, with visible warnings since 2.14. See [[Model formats]] for the file formats.']};
      break;
    case 'serve':
      R.main={t:'vLLM or SGLang',ids:['vllm','sglang'],why:['Both pin an exact torch (torch==2.13.0 in their latest releases), so install them in their own environment.','Engines, batching and KV cache belong to [[Topic: inference-and-serving]].']};
      R.avoid={t:'Avoid',ids:['torchserve'],why:['Archived, no security patches.']};
      break;
    case 'kernel':
      R.main={t:mac?'Not on this hardware':'Triton, or Helion',ids:mac?[]:['triton','helion'],why:mac?['Triton and Helion target GPUs (CUDA, ROCm, XPU). On a Mac, torch.compile already generates fused code for MPS and CPU; see the [[Compile lab]].']:['Helion compiles to Triton (it imports triton in '+dep('helion','triton')+' files) and autotunes tile sizes; write Triton directly when you need full control.','Register the kernel with torch.library (custom_op or triton_op) so torch.compile treats it as one operator instead of breaking the graph; [[Triton and Gluon]] and [[Writing kernels]] own the details.']};
      R.alt={t:'A kernel someone already wrote',ids:['kernels','liger'],why:['The Hugging Face kernels hub and Liger Kernel cover norms, RoPE, SwiGLU and fused cross-entropy; core now has nn.LinearCrossEntropyLoss (2.13).']};
      break;
    default:
      R.main={t:'Plain PyTorch, then read torchtitan',ids:['torch','torchtitan'],why:['Every library on this map ends in the same calls (the five doors above); learn the calls first.','torchtitan is the shortest path from the core distributed APIs to a real run: '+n('torchtitan','fsdp2')+' FSDP2 files, '+n('torchtitan','pp')+' pipelining files, '+n('torchtitan','flex')+' FlexAttention files.']};
      R.alt={t:'Lightning for structure',ids:['lightning'],why:['Adds loops, callbacks and checkpointing without changing the maths (measured identical losses).']};
    }
    return R;
  }
  const LK={'jax-and-tpu':'3c65c17b0d0d81ecbc04eea6aa45ea1a','Quantization and Precision':'3c65c17b0d0d817b8f41ff66fba4cd0e','Model formats':'3cd5c17b0d0d81ea815aedfa052e4919','Topic: inference-and-serving':'3c65c17b0d0d81c08b3bc95ff45c7b13','Triton and Gluon':'3c65c17b0d0d81729d15ed4d1a4461b3','Writing kernels':'3c65c17b0d0d81b9ab89c1bb7238cb6c'};
  const TB={'Distributed lab':'t-dist','Compile lab':'t-comp'};
  const lk=s=>esc(s).replace(/\[\[([^\]]+)\]\]/g,(m,t)=>LK[t]?M.link(t,'https://app.notion.com/p/'+LK[t]):TB[t]?'<a href="#" data-tab="'+TB[t]+'">'+t+'</a>':t);
  function block(b,cls){if(!b)return '';
    return '<div class="map-rec '+cls+'"><h4>'+(cls==='av'?'Avoid':cls==='alt'?'Alternative: ':'Recommended: ')+(cls==='av'?'':esc(b.t))+'</h4>'+(b.ids.length?'<div>'+b.ids.map(nm).join(' &nbsp; ')+'</div>':'')+'<ul class="tight">'+b.why.map(w=>'<li>'+lk(w)+'</li>').join('')+'</ul></div>'}
  function draw(){
    const r=rec($('map-ch-task').value,$('map-ch-scale').value,$('map-ch-hw').value),o=$('map-ch-out');
    o.innerHTML=block(r.main,'')+block(r.alt,'alt')+block(r.avoid,'av')+(r.note?'<div class="co warn"><div class="t">Hardware note</div>'+lk(r.note)+'</div>':'')+'<p class="small mute">Editorial judgement from the evidence on this tab, 2026-10-12. Counts are files in each library\'s latest released source.</p>';
    o.querySelectorAll('[data-sel]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();M.selectLib(a.dataset.sel);$('map-s-atlas').scrollIntoView({block:'start'})}));
    o.querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b)b.click()}));
  }
  function checks(){
    const C=D.checks,v=C.versions;
    const li=[
      ['Same step, five doors','plain loop, Lightning '+esc(C.lightning.version)+', HF Trainer '+esc(v.transformers)+', Accelerate '+esc(v.accelerate)+' on 1 and 2 processes: losses and call stacks','c_stacks.py'],
      ['Wrapper classes','Accelerate and Lightning Fabric on 2 CPU processes (gloo) both return torch DistributedDataParallel; Accelerate ignores an FSDP plugin on CPU','c_dist.py'],
      ['HF stack','PEFT LoRA on the plain model, a GPT-2 of the same shape built from a config, Trainer to Accelerate, TRL class hierarchy','c_hf.py'],
      ['Defaults','HF Trainer and Lightning defaults read from the installed packages','c_defaults.py'],
      ['torchao '+esc(C.torchao.torchao),'int8 weight-only quantize_ on the tiny GPT','c_torchao.py'],
      ['ExecuTorch 1.5.1','export, lower to XNNPACK, run the .pte in the runtime (installed with --no-deps plus three small dependencies)','c_executorch.py'],
      ['Reference','the plain loop for three steps','c_plain.py']];
    $('map-k-list').innerHTML='<div class="tw"><table><thead><tr><th>Check</th><th>What it ran</th><th>Script</th></tr></thead><tbody>'+li.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td><code>'+r[2]+'</code></td></tr>').join('')+'</tbody></table></div><p class="small mute">'+esc(C.env.machine)+', Python '+esc(C.env.python)+', torch '+esc(C.env.torch)+'. Source scan: '+Object.keys(D.ev).length+' libraries\' latest wheels or source archives from PyPI, downloaded 2026-10-12.</p>';
  }
  function iq(){
    const Q=[
      ['Is a model trained with Lightning or the HF Trainer different from one trained in a plain loop?','Not in its maths: they call the same forward, backward and optimizer. Differences come from defaults (the HF Trainer clips gradients at 1.0, uses a linear schedule and shuffles). Measured here: identical losses once those are matched.'],
      ['What is the difference between DeepSpeed ZeRO-3 and FSDP2?','Both shard parameters, gradients and optimizer state. FSDP2 is PyTorch core, per-parameter DTensor sharding with fully_shard; ZeRO-3 is DeepSpeed\'s own engine with CPU/NVMe offload. DeepSpeed 0.19.7\'s source does not use FSDP at all.'],
      ['What replaced TorchScript?','torch.compile for speed inside Python, torch.export for a whole-graph artefact you deploy (AOTInductor, ExecuTorch, ONNX). TorchScript warns from 2.10 and raises a visible FutureWarning from 2.14.'],
      ['Where did torch.ao.quantization go?','To torchao: deprecated in 2.8, PT2E flow removed from core in 2.11. torchao quantizes by swapping weights for tensor subclasses.'],
      ['Which library would you use for a 70B pretraining run on 512 H100s, and why not torchtune?','torchtitan (PyTorch-native FSDP2+TP+PP+CP, float8) or Megatron Core (maximum NVIDIA performance, MoE). torchtune was a fine-tuning library and stopped development in July 2025.'],
      ['What does accelerate.prepare() return in a 2-process DDP launch?','torch.nn.parallel.DistributedDataParallel, the core class, wrapping your model. Accelerate chooses and configures core wrappers; it does not reimplement them.'],
      ['Which projects does the PyTorch Foundation host?','PyTorch, vLLM and DeepSpeed (May 2025), Ray (October 2025), Helion and Safetensors (April 2026). ExecuTorch became part of PyTorch Core in April 2026.']];
    $('map-iq').innerHTML=Q.map(q=>'<details class="mist"><summary>'+esc(q[0])+'</summary><div class="b">'+esc(q[1])+'</div></details>').join('');
  }
  function init(){['map-ch-task','map-ch-scale','map-ch-hw'].forEach(id=>$(id).addEventListener('change',draw));draw();checks();iq()}
  init();
})();
