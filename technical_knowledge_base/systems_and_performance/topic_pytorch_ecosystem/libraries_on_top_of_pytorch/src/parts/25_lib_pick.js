// ---- Chooser (Reading, section 10) and porting checklist (section 2); were their own tab: an editorial chooser with reasons, and a porting checklist of defaults ----
(function(){
  if(!document.getElementById('pk-out'))return;
  const $=id=>document.getElementById(id), D=window.LIB;
  const st={task:'pre',scale:'1',hw:'nv',own:'some'};
  const ds=D.tr.ds_z3, dl=D.dl;
  const F={
    clip:'the Trainer\'s default clip at 1.0 was active on '+dl.clip_active+' of '+dl.steps+' steps of the running example (section 2)',
    acc:'the Trainer with a transformers model and torchtitan divide by the token count; Accelerate, Lightning and a Trainer with a plain module give a mean of means, 59% gradient error on unequal micro-batches (section 3)',
    titan:'torchtitan 0.3.0 trained on this Mac\'s CPU only after four patches (Triton import, device, FlexAttention backward, gloo reduce op); on NVIDIA none are needed (section 6)',
    tdef:'torchtitan computes in bf16 through FSDP2 even on one rank, clips at 1.0, decays weights on every parameter, and leaves the seed unset in its debug config (section 6)',
    v5:'transformers v5 loads weights in their saved dtype (often bf16) unless you pass dtype (section 4)',
    trl:'TRL configs turn on gradient checkpointing and bf16 and lower the learning rate (2e-5 SFT, 1e-6 DPO and GRPO) on top of the Trainer\'s defaults (section 4)',
    ax:'Axolotl 0.20.0 pins transformers 5.17.0 and torch at most 2.14.0, defaults to a cosine schedule and masks prompt tokens (section 8)',
    uns:'Unsloth replaces transformers\' forward methods with Triton-kernel versions, needs a GPU (an MLX path on Apple Silicon), and caps transformers at 5.17.0 (section 8)',
    ds:'DeepSpeed 0.19.3 and later clip at 1.0 by default; ZeRO stages reproduced DDP\'s losses with clipping off; ZeRO-3 called .item() '+'hundreds of times in 3 steps (section 7)',
    pl:'Lightning\'s FSDPStrategy is FSDP1; FSDP2 is ModelParallelStrategy, where you call fully_shard yourself; it matched DDP\'s losses here (section 5)',
    acc2:'Accelerate returned DDP on 2 CPU processes; with an FSDP plugin on GPUs it calls fully_shard per block, then embedding, then a [final norm, head] group (section 4)',
    dead:'torchtune is no longer maintained (July 2025) and torchforge is paused (section 9)',
    flex:'FlexAttention has no backward on CPU or MPS at torch 2.14.1, so HF\'s flex_attention and torchtitan\'s default attention cannot train there (sections 4, 6)'
  };
  function pick(){const {task,scale,hw,own}=st;let s,alt,avoid,why=[],set=[];
    const mac=hw==='mac';
    if(task==='pre'){
      if(mac){s='A plain PyTorch loop (FSDP2 on gloo across processes to learn the API)';alt='torchtitan with this page\'s four CPU patches, to read its loop running';avoid='torchtune';why=[F.titan,F.flex];set=['FSDP2 needs mesh=init_device_mesh("cpu", ...) on macOS (root Distributed lab)'];}
      else if(own==='none'&&hw==='nv'&&scale==='many'){s='Megatron Core recipes (NVIDIA\'s stack)';alt='torchtitan';avoid='torchtune, NeMo for LLMs (now speech only)';why=['Megatron Core is GPU-optimised with its own DDP, its own FSDP and an FSDP2 wrapper (section 9)',F.dead];set=['Read the recipe\'s parallel layout against Distributed Training\'s memory maths'];}
      else{s='torchtitan, forked';alt=hw==='nv'?'Megatron Core when committed to NVIDIA at the largest scale':'Megatron Core is NVIDIA-only; stay with torchtitan (it has ROCm code paths, not run here)';avoid='torchtune (dead), torchforge (paused), Lightning for frontier-scale parallelism';why=['FSDP2, TP, PP, CP and EP on one DeviceMesh, written to be edited (section 6)',F.tdef,F.dead];set=['debug.seed','training.mixed_precision_param','training.max_norm','the activation checkpointing policy','the optimizer\'s weight-decay groups'];}
    } else if(task==='ft'||task==='lora'){
      const lora=task==='lora';
      if(mac){s=lora?'PEFT LoRA in a plain HF Trainer or Accelerate loop on MPS':'HF Trainer (or Accelerate) on MPS, small models';alt='Unsloth\'s MLX path (not PyTorch; not run here)';avoid='Axolotl (GPU packages, pinned stack), HF flex_attention for training';why=[F.flex,F.v5,F.uns];set=['dtype at load','max_grad_norm','learning_rate and schedule'];}
      else if(own==='none'){s=lora&&scale==='1'&&hw==='nv'?'Unsloth (single-GPU speed) or Axolotl':'Axolotl (YAML)';alt='TRL SFTTrainer with PEFT, a few lines of Python';avoid='torchtune';why=[F.ax,lora?F.uns:F.trl,F.clip];set=['learning_rate (Axolotl requires it)','lr_scheduler (Axolotl: cosine)','max_grad_norm','train_on_inputs','a separate environment per tool'];}
      else if(own==='all'){s='An Accelerate loop around a transformers model'+(lora?' with PEFT':'');alt=scale==='1'?'a plain PyTorch loop':'FSDP2 directly under torchrun';avoid='a framework you then fight';why=[F.acc2,F.acc,F.v5];set=['token-weighted loss under accumulation','clipping','dtype at load'];}
      else{s='TRL SFTTrainer'+(lora?' with PEFT':'')+' (or the HF Trainer)';alt=scale==='many'?'Accelerate with the FSDP2 plugin, or DeepSpeed ZeRO-3 when you need CPU or NVMe offload':'Axolotl for a config file';avoid='torchtune';why=[F.trl,F.clip,F.acc,scale==='1'?F.v5:F.ds];set=['learning_rate','max_grad_norm','gradient_checkpointing','bf16','train_sampling_strategy'];}
    } else if(task==='rl'){
      if(scale==='many'){s='A scale-out RL stack (verl, OpenRLHF, SkyRL: Topic: llm-training-and-post-training)';alt='TRL GRPOTrainer with vLLM rollouts';avoid='torchforge (paused)';why=[F.dead,F.trl];set=['GRPO\'s learning rate (TRL default 1e-6)','clipping','the rollout engine\'s dtype against the trainer\'s'];}
      else{s='TRL GRPOTrainer';alt='Axolotl\'s GRPO trainer (a TRL subclass)';avoid='torchforge (paused)';why=[F.trl,F.ax];set=['learning_rate (1e-6)','gradient_checkpointing (on)','bf16 (on)','max_grad_norm (1.0)'];}
      if(mac){avoid+=', anything needing vLLM on this Mac';}
    } else if(task==='res'){
      s=own==='all'?'A plain PyTorch loop':own==='none'?'Lightning Trainer':'Lightning Fabric';alt=own==='all'?'Lightning Fabric for launch and precision only':'Accelerate';avoid='DeepSpeed unless you need offload';why=[F.pl,'Lightning with defaults matched the plain loop to five decimals over 150 steps (section 2)',F.clip];set=['gradient_clip_val (off by default)','max_steps or max_epochs (1000 epochs if neither)','precision'];
    } else {s='A plain PyTorch loop, then the root\'s labs, then torchtitan\'s source';alt='this page\'s What calls what tab, to see what each library does on your behalf';avoid='starting from a config tool';why=['the libraries add no maths: matched settings gave identical losses (section 1)',F.titan];set=['nothing: you own every default'];}
    if(hw==='amd'&&task!=='pre'){why.push('AMD: everything here is PyTorch-level and ROCm builds of PyTorch exist; Unsloth\'s and torchtitan\'s Triton kernels depend on Triton\'s ROCm backend (not run here)');}
    return {s,alt,avoid,why,set}}
  function render(){const r=pick();$('pk-out').innerHTML='<h4>'+r.s+'</h4><div class="small"><span class="pk-tag">alternative</span>'+r.alt+'</div><div class="small"><span class="pk-tag">avoid</span>'+r.avoid+'</div><b class="small">Why (each reason is a recorded fact on this page)</b><ul>'+r.why.map(w=>'<li>'+w+'</li>').join('')+'</ul><b class="small">Set these explicitly when you adopt it</b><ul>'+r.set.map(w=>'<li>'+(/ /.test(w)?w:'<code>'+w+'</code>')+'</li>').join('')+'</ul>'}
  [['pk-task','task'],['pk-scale','scale'],['pk-hw','hw'],['pk-own','own']].forEach(([id,k])=>RD.seg($(id),m=>{st[k]=m;render()}));
  render();
  // porting checklist
  const L={plain:'Plain loop (this page)',hf:'HF Trainer 5.19.0',sft:'TRL SFTTrainer 1.15.0',pl:'Lightning 2.6.6',acc:'Accelerate 1.15.0',ds:'DeepSpeed 0.19.7',titan:'torchtitan 0.3.0',ax:'Axolotl 0.20.0'};
  const ROWS=['Data order','Clipping','Optimizer','Learning rate','Adam betas','Weight decay','Schedule','Precision','Accumulation loss','Activation checkpointing'];
  const Y='your choice';
  const V={plain:['in order (yours)','off','AdamW for-loop (yours)','6e-4','(0.9, 0.95)','0.1, matrices only','constant','float32','yours','off'],
    hf:['random, seed 42','1.0','AdamW fused','5e-5','(0.9, 0.999)','0 (biases and norms excluded if set)','linear to 0, no warmup','checkpoint dtype (v5 "auto")','token count if forward takes **kwargs, else / steps','off'],
    sft:['random, seed 42','1.0','AdamW fused','2e-5','(0.9, 0.999)','0 (biases and norms excluded if set)','linear to 0, no warmup','bf16 (if fp16 not set)','token count (transformers model)','on'],
    pl:[Y+' (+ DistributedSampler)','off',Y,Y,Y,Y,Y,'32-true','/ accumulate_grad_batches','off'],
    acc:[Y+' (sharded per rank)','off unless you call clip_grad_norm_',Y,Y,Y,Y,Y,'float32 unless mixed_precision','/ gradient_accumulation_steps','off'],
    ds:[Y,'1.0 (0 up to 0.19.2)',Y+' or config',Y,Y,Y,Y+' or config','float32 unless fp16 or bf16 in config','/ gradient_accumulation_steps (engine)','off'],
    titan:['its dataloader, in order','1.0','AdamW fused','8e-4 (debug config)','(0.9, 0.95)','0.1, every parameter','warmup then linear decay to 0','bf16 compute, fp32 reduce','global token count','selective, per op (debug config)'],
    ax:['random, seed 42','1.0 (unset, Trainer default)','AdamW fused','required in YAML','(0.9, 0.999)','0','cosine','from YAML','token count (transformers model)','from YAML']};
  const opts=Object.keys(L).map(k=>'<option value="'+k+'">'+L[k]+'</option>').join('');
  $('pk-from').innerHTML=opts;$('pk-to').innerHTML=opts;$('pk-from').value='plain';$('pk-to').value='hf';
  function port(){const a=$('pk-from').value,b=$('pk-to').value;$('pk-h1').textContent=L[a];$('pk-h2').textContent=L[b];let n=0;
    $('pk-tbl').innerHTML=ROWS.map((r,i)=>{const d=V[a][i]!==V[b][i];if(d)n++;return '<tr><td>'+r+'</td><td>'+V[a][i]+'</td><td'+(d?' class="df"':'')+'>'+V[b][i]+'</td></tr>'}).join('');
    $('pk-note').textContent=a===b?'Same library on both sides.':n+' of '+ROWS.length+' settings differ (highlighted). Set each one explicitly in the new setup, then check that the first few losses match the old run before changing anything on purpose.'}
  $('pk-from').addEventListener('change',port);$('pk-to').addEventListener('change',port);port();
})();
