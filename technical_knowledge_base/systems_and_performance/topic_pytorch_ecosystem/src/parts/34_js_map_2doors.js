// ---- Ecosystem map: "Same step, five doors" (recorded call stacks, animated frame by frame) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc;
  const DOORS=[['plain','Plain loop'],['lightning','Lightning'],['hf','HF Trainer'],['acc','Accelerate'],['ddp','Accelerate, 2 processes']];
  let door='lightning',what='fwd';
  const kind=f=>f[0].startsWith('checks/')?'you':f[0].startsWith('model/')?'you':f[0].startsWith('torch/')?'torch':'lib';
  const LIBN={lightning:'Lightning',transformers:'Transformers',accelerate:'Accelerate'};
  function frames(){
    const fr=D.doors[door][what].slice();
    // the last three torch frames are nn.Module.__call__ machinery reaching the model's forward pre-hook; mark the model as the end
    return fr.concat([what==='fwd'?['model/model.py','','GPT.forward (the hook fires here)']:['torch/optim','','AdamW.step body (the hook fires here)']]);
  }
  function cap(i,fr){
    const f=fr[i],k=i===fr.length-1?'model':kind(f),d=D.doors[door];
    const top=fr[0];let t='';
    if(i===0)t='Your script calls '+(door==='plain'?'<code>train_step</code> from the model file: forward, backward, step, zero_grad, four lines.':door==='lightning'?'<code>trainer.fit(model, data)</code>. From here Lightning owns the loop.':door==='hf'?'<code>trainer.train()</code>. From here the HF Trainer owns the loop.':'the prepared model directly: <code>pm(x, y)</code>. Accelerate does not own the loop.');
    else if(i===fr.length-1)t=what==='fwd'?'The forward of the tiny GPT starts. Whatever door you came through, from here on the same operators run on the same tensors: that is why the losses match.':'The optimizer step starts. It is torch.optim.AdamW in every door, the same object the plain loop builds.';
    else if(k==='lib'){const lib=f[0].split('/')[0];
      if(f[2]==='step'&&f[0].includes('core/optimizer'))t='Lightning wraps your optimizer in a LightningOptimizer; its step() goes through the strategy and the precision plugin.';
      else if(f[2]==='_wrap_closure')t='The precision plugin runs the <b>closure</b>: the function that computes the loss and calls backward. The optimizer calls it from inside its own step(). This is why forward appears under optimizer.step in Lightning.';
      else if(f[2]==='optimizer_step')t=(LIBN[lib]||lib)+': <code>'+esc(f[2])+'</code>, one layer of dispatch (module hook, strategy or precision plugin) before the real optimizer.';
      else if(f[2]==='training_step'&&lib==='lightning')t='The strategy calls your LightningModule\'s <code>training_step</code>. With DDP or FSDP this is where the wrapped module is called instead.';
      else if(f[2]==='compute_loss')t='HF Trainer: <code>compute_loss</code> calls <code>model(**inputs)</code> and reads <code>outputs["loss"]</code>. A model that returns a tuple would hand it the logits instead.';
      else t=(LIBN[lib]||lib)+': <code>'+esc(f[2])+'</code> in <code>'+esc(f[0])+'</code> line '+f[1]+'.';}
    else if(k==='torch'){
      if(f[0].includes('parallel/distributed'))t='<code>DistributedDataParallel.'+esc(f[2])+'</code>: the core DDP class Accelerate handed back. Before forward it may sync buffers; during backward its hooks all-reduce gradient buckets.';
      else if(f[0].includes('optim/optimizer'))t='<code>torch.optim.Optimizer</code>\'s step wrapper (it runs the step hooks; this tab\'s recorder is one).';
      else if(f[0].includes('optim/adam'))t='Adam\'s step, which first calls the closure it was given (Lightning\'s), and only then updates weights.';
      else if(f[0].includes('_contextlib'))t='A context-manager decorator from torch.utils: enables or disables grad mode around the closure.';
      else t='<code>nn.Module.__call__</code> machinery (<code>'+esc(f[2])+'</code>): runs hooks, then forward.';}
    else t='Your code: <code>'+esc(f[2])+'</code>.';
    return t;
  }
  let ctl;
  function draw(i){
    const fr=frames(),n=fr.length,el=$('map-d-stack');
    el.innerHTML=fr.map((f,j)=>{const k=j===n-1?(what==='fwd'?'model':'torch'):kind(f);
      return '<div class="map-fr k-'+k+(j>i?' hid':'')+(j===i?' now':'')+'"><span class="d">'+(j+1)+'</span><span class="f">'+esc(f[0])+(f[1]?':'+f[1]:'')+' <b>'+esc(f[2])+'</b></span></div>'}).join('');
    const shown=fr.slice(0,i+1);
    $('map-d-n').textContent=(i+1)+' / '+n;
    $('map-d-nd').textContent='call depth to '+(what==='fwd'?'forward':'optimizer.step');
    $('map-d-lib').textContent=shown.filter((f,j)=>j<n-1&&kind(f)==='lib').length;
    const L=D.doors[door].losses;
    $('map-d-loss').textContent=L.map(x=>x.toFixed(5)).join(', ');
    const P=D.doors.plain.losses;
    $('map-d-lossd').textContent=door==='ddp'?'rank 0; each rank had its own batch, so only step 1 matches the plain loop':(L.every((x,j)=>x===P[j])?'identical to the plain loop':'differs from the plain loop');
    $('map-d-cap').innerHTML=cap(i,fr);
  }
  function setDoor(d){door=d;$('map-door-seg').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.d===d));ctl.reset(frames().length,M.RM?frames().length-1:0)}
  function init(){
    $('map-door-seg').innerHTML=DOORS.map(([k,t])=>'<button data-d="'+k+'"'+(k===door?' class="on"':'')+'>'+t+'</button>').join('');
    $('map-door-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(b){setDoor(b.dataset.d)}});
    $('map-door-what').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;what=b.dataset.w;
      $('map-door-what').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setDoor(door)});
    ctl=M.anim({card:'map-d-stack',n:frames().length,draw,ms:650,play:'map-d-play',back:'map-d-back',fwd:'map-d-fwd',scrub:'map-d-scrub',speed:'map-d-speed'});
    ctl.reset(frames().length,M.RM?frames().length-1:0);
    const h=D.checks.defaults.hf_trainer,p=D.checks.defaults.lightning;
    $('map-def-hf').innerHTML='<code>max_grad_norm='+h.max_grad_norm+'</code> (gradient clipping on), <code>learning_rate='+h.learning_rate+'</code> with a <code>'+M.esc(h.lr_scheduler_type)+'</code> schedule, <code>optim="'+M.esc(h.optim)+'"</code> and <code>seed='+h.seed+'</code>; the run replaced the optimizer and scheduler, set <code>max_grad_norm=0</code> and read batches in order';
    $('map-def-pl').innerHTML='<code>gradient_clip_val='+p.gradient_clip_val+'</code>, <code>precision="'+M.esc(p.precision)+'"</code>, <code>accumulate_grad_batches='+p.accumulate_grad_batches+'</code>';
    const P=D.doors.plain.losses.map(x=>x.toFixed(5)).join(', ');
    M.predict('map-pr1','a','All four single-process doors give '+P+'. The libraries add loops, hooks and logging around the step, but forward, backward and AdamW are the same PyTorch calls on the same tensors. They match only because the HF run turned off its default gradient clipping and shuffling (see the box under the animation).');
  }
  init();
  M.onRender(()=>draw(ctl.i));
})();
