// ---- Performance calculator (t-calc): checks table, drills, in-tab navigation ----
(function(){
  const X=window.CALCX,$=id=>document.getElementById(id),M=X.M,C=X.C;
  function fmtCheck(c){const v=c.ours;
    if(c.fmt==='pct')return X.sig(v*100,3)+'%';if(c.fmt==='usd')return X.fUSD(v);if(c.fmt==='bytes')return Math.round(v).toLocaleString('en-US')+' B';
    if(c.fmt==='params')return X.sig(v/1e9,4)+'B';if(c.fmt==='gb')return X.sig(v/1e9,3)+' GB';if(c.fmt==='days')return X.sig(v,4)+' days';if(c.fmt==='tps')return X.sig(v,3)+' tokens/s';
    return X.fE(v)+' FLOPs'}
  function checks(){
    $('calc-chk').innerHTML=X.D.checks.map(c=>{const src=/^https?:/.test(c.src)?'<a href="'+c.src+'" target="_blank" rel="noopener noreferrer">'+X.esc(c.pub)+'</a>':X.esc(c.pub)+' <small>('+X.esc(c.src)+')</small>';
      return '<tr><td>'+X.esc(c.what)+'<br><small>'+X.esc(c.note)+'</small></td><td class="num">'+fmtCheck(c)+'</td><td>'+src+'</td></tr>'}).join('');
  }
  const h100=C.h100.peak.bf16*1e12;
  function drills(){
    const l8=M.l8,l70=M.l70,l405=M.l405;
    const st8=16*l8.P/1e9,C405=6*l405.P*15.6e12,d405=C405/(16384*h100*0.41)/86400,card405=30.84e6/16384/24;
    const dec70=X.decode({model:'l70',chip:'h100',chips:8,fmt:'bf16',prec:'bf16',kvb:2,batch:1,ctx:16,eff:1});
    const kv70=X.kvSeq(l70,131072,2)/1e9,cb=X.crossover({model:'l8',chip:'h100',chips:1,fmt:'bf16',prec:'bf16',kvb:2,ctx:16,eff:1});
    const S=2*l8.P,nv=X.allreduce(S,8,450),ib=X.allreduce(S,8,50),mfu=50000*6*8e9/(8*h100);
    const gh70=6*l70.P*1.4e12/(h100*0.4)/3600,cost70=gh70*C.h100.price,oss=X.weightBytes(M.oss120,'native')/1e9;
    const Q=[
      {q:'You want to fully fine-tune Llama 3.1 8B with mixed-precision Adam. How much memory do the model states alone need?',o:['16 GB','32 GB','128 GB','512 GB'],a:2,
       w:'16 bytes per parameter (2 BF16 weights + 2 BF16 gradients + 4 FP32 master + 4 + 4 Adam moments) x 8.03B = <b>'+X.sig(st8)+' GB</b>, before activations. It does not fit one 80 GB H100; ZeRO-3/FSDP over 8 GPUs leaves '+X.sig(st8/8)+' GB each, and LoRA keeps only the 16 GB base plus small adapters.'},
      {q:'Llama 3 405B was trained on 15.6T tokens. Roughly how many FLOPs?',o:['3.8e23','3.8e24','3.8e25','3.8e26'],a:2,
       w:'6 x N x D = 6 x 405.85e9 x 15.6e12 = <b>'+X.fE(C405)+'</b>; the paper says 3.8e25. Say the rule out loud in an interview: 2 FLOPs per parameter per token forward, 4 backward.'},
      {q:'At the 41% MFU the paper reports on 16,384 H100s, how long is that run?',o:['about 1 week','about 1 month','about 2 months','about 7 months'],a:2,
       w:'C / (GPUs x peak x MFU) = '+X.fE(C405)+' / (16,384 x 989.5e12 x 0.41) = <b>'+X.sig(d405,3)+' days</b>. The model card\'s 30.84M GPU hours spread over 16,384 GPUs is '+X.sig(card405,3)+' days: the gap is restarts, smaller-scale stages and everything that is not steady state.'},
      {q:'Llama 3.1 70B in BF16 on an 8x H100 server with tensor parallelism 8. Best possible tokens/s for a single user (batch 1, short context)?',o:['about 20','about 190','about 1,900','about 19,000'],a:1,
       w:'Each token must read every weight once: 141 GB over 8 x 3.35 TB/s = '+X.sig(dec70.t_ms)+' ms, so <b>'+X.sig(dec70.tps)+' tokens/s</b> at most. The compute (2 x 70.6B FLOPs) would take '+X.sig(dec70.t_cmp_ms*1000)+' microseconds: decode at batch 1 is entirely a memory-bandwidth problem.'},
      {q:'One user sends a 128K-token context to Llama 3.1 70B (BF16 KV cache). How big is that user\'s KV cache?',o:['about 4 GB','about 43 GB','about 160 GB','about 1.3 TB'],a:1,
       w:'2 (K, V) x 80 layers x 8 KV heads x 128 x 2 bytes = 320 KiB per token; x 131,072 tokens = <b>'+X.sig(kv70)+' GB</b>. Grouped-query attention already cut this 8x (64 query heads share 8 KV heads); with 64 KV heads it would be '+X.sig(kv70*8)+' GB.'},
      {q:'Llama 3.1 8B in BF16 on one H100, very short contexts. From roughly what batch size does decode become compute-bound?',o:['8','64','300','3,000'],a:2,
       w:'Each weight byte read is reused once per sequence in the batch; the H100 needs 989.5 / 3.35 = 295 FLOPs per byte to stay busy, and BF16 gives 1 FLOP per byte per sequence. The exact crossover with this model\'s small KV reads is <b>batch '+cb+'</b>. At 4K-token contexts it never happens: each sequence\'s own cache keeps decode memory-bound.'},
      {q:'All-reduce the BF16 gradients of an 8B model (16 GB) across 8 GPUs. NVLink (450 GB/s each way) against one 400 Gb/s NIC per GPU?',o:['same time','about 2x slower on the NIC','about 9x slower on the NIC','about 100x slower on the NIC'],a:2,
       w:'Ring: 2 x 7/8 x 16 GB / bandwidth = <b>'+X.fT(nv)+'</b> over NVLink and <b>'+X.fT(ib)+'</b> over 50 GB/s: the ratio is just 450 / 50 = 9. Hidden behind a 1-second backward pass, the first is free and the second is not.'},
      {q:'Your 8B model trains at 50,000 tokens/s on 8 H100s. What is the MFU?',o:['15%','30%','45%','60%'],a:1,
       w:'Model FLOP/s = 50,000 x 6 x 8e9 = 2.4e15; peak = 8 x 989.5e12 = 7.9e15; MFU = <b>'+X.pct(mfu)+'</b>: respectable, with room to grow (40 to 45% is very good for dense training at scale).'},
      {q:'Train a 70B model on 1.4T tokens (Chinchilla-optimal) at 40% MFU on H100s rented at $3.99 per GPU-hour. Roughly what does the compute cost?',o:['$0.2M','$1.7M','$17M','$170M'],a:1,
       w:'6 x 70.55e9 x 1.4e12 = '+X.fE(6*l70.P*1.4e12)+' FLOPs; at 0.4 x 989.5 TFLOP/s per GPU that is '+X.sig(gh70/1e3,3)+'K GPU-hours, x $3.99 = <b>'+X.fUSD(cost70)+'</b> (on-demand list price, 2026-10-05; no failures, no experiments, no data or staff).'},
      {q:'gpt-oss-120b has 116.8B parameters, yet its model card says it runs on a single 80 GB GPU. How?',o:['it is distilled to 20B','only active experts are loaded','experts are stored in 4-bit MXFP4','it streams weights from CPU'],a:2,
       w:'The expert weights (most of the parameters) ship in MXFP4: 4-bit values in blocks of 32 sharing one 8-bit scale, 4.25 bits each. Everything else stays BF16. Total: <b>'+X.sig(oss)+' GB</b>. All 128 experts must be resident because any token may pick any of them; only '+X.sig(M.oss120.Pact/1e9,3)+'B parameters are active per token, which is why it is also fast.'}];
    $('calc-drills').innerHTML=Q.map((d,i)=>'<div class="calc-pr" data-i="'+i+'"><div class="calc-q">'+(i+1)+'. '+d.q+'</div><div class="calc-opts">'+d.o.map((t,j)=>'<button data-j="'+j+'">'+X.esc(t)+'</button>').join('')+'</div><div class="calc-ans" hidden></div></div>').join('');
    [...document.querySelectorAll('#calc-drills .calc-pr')].forEach(box=>{const d=Q[+box.dataset.i];
      box.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const j=+b.dataset.j;
        box.querySelectorAll('button').forEach(x=>{x.classList.remove('calc-right','calc-wrong');if(+x.dataset.j===d.a)x.classList.add('calc-right')});
        if(j!==d.a)b.classList.add('calc-wrong');const an=box.querySelector('.calc-ans');an.hidden=false;an.innerHTML=(j===d.a?'<b>Right.</b> ':'<b>Not quite.</b> ')+d.w}))});
  }
  function init(){
    checks();drills();
    document.querySelectorAll('#t-calc [data-calcjump]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=$(a.dataset.calcjump);if(t)t.scrollIntoView({block:'start',behavior:X.RM?'auto':'smooth'})}));
    $('calc-srcs').innerHTML='Sources: chip peaks, memory and links from vendor pages fetched 2026-10-05 (listed in the Chip atlas); model shapes from each model\'s config.json on Hugging Face (Llama 3.1 through the unsloth mirrors, since Meta\'s repositories are gated; the 405B mirror\'s 8 KV heads match the paper\'s Table 3); activation memory from <a href="https://arxiv.org/abs/2205.05198" target="_blank" rel="noopener noreferrer">Korthikanti et al. 2022</a>; MFU definition from <a href="https://arxiv.org/abs/2204.02311" target="_blank" rel="noopener noreferrer">PaLM, Appendix B</a>; ring costs from <a href="https://github.com/NVIDIA/nccl-tests/blob/master/doc/PERFORMANCE.md" target="_blank" rel="noopener noreferrer">nccl-tests</a>; NVFP4 from <a href="https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/" target="_blank" rel="noopener noreferrer">NVIDIA\'s NVFP4 post</a>; QLoRA\'s 4.127 bits from the <a href="https://arxiv.org/abs/2305.14314" target="_blank" rel="noopener noreferrer">QLoRA paper</a>; prices from <a href="https://lambda.ai/pricing" target="_blank" rel="noopener noreferrer">Lambda</a> and <a href="https://cloud.google.com/tpu/pricing" target="_blank" rel="noopener noreferrer">Google Cloud TPU pricing</a>, on demand, 2026-10-05. Python reference and checks: src/calc/ in the repository.';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
