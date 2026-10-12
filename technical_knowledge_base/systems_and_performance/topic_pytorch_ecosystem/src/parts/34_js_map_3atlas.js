// ---- Ecosystem map: Atlas (filterable cards and a detail panel) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc;
  const F={layer:new Set(),status:new Set(),task:'',q:''};
  let sel='torchtitan';
  const APIN={};D.api.forEach(([k,t])=>APIN[k]=t);
  // status as of a date (used by the release timeline): entries with a dated change
  M.statusAt=function(a,date){
    const born=a.first&&a.first[0];
    if(born&&date<born&&a.id!=='functorch')return 'unborn';
    const ch={torchtune:[['2025-07-15','deprecated']],torchaudio:[['2025-10-15','maintenance']],
      torchserve:[['2025-08-06','archived']],torchtext:[['2025-09-10','archived']],functorch:[['2023-03-15','merged']],nemo:[['2026-08-07','maintenance']]}[a.id];
    if(ch){let s='active';ch.forEach(([d,v])=>{if(date>=d)s=v});return s}
    if(a.status==='quiet'){const q=new Date(Date.parse(a.date)+365*864e5).toISOString().slice(0,10);return date>=q?'quiet':'active'}
    return a.status;
  };
  function match(a){
    if(F.layer.size&&!F.layer.has(a.layer))return false;
    if(F.status.size&&!F.status.has(a.status))return false;
    if(F.task&&!(a.tasks||[]).includes(F.task))return false;
    if(F.q){const q=F.q.toLowerCase();if(!(a.name+' '+a.one+' '+a.owner+' '+a.id).toLowerCase().includes(q))return false}
    return true;
  }
  function chips(id,list,set,label){
    const el=$(id);el.innerHTML='<span class="lbl">'+label+'</span>'+list.map(([k,t])=>'<button data-k="'+k+'">'+esc(t)+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;set.has(k)?set.delete(k):set.add(k);b.classList.toggle('on',set.has(k));draw()});
  }
  function evHtml(a){
    const ev=D.ev[a.id];if(!ev)return '<p class="small mute">Not scanned (see "Checks and limits").</p>';
    const ks=Object.keys(ev);if(!ks.length)return '<p class="small mute">The scan found none of the core APIs below in its Python source.</p>';
    return '<div>'+ks.map(k=>'<button class="map-chip" data-ev="'+k+'"><b>'+esc(APIN[k])+'</b> '+ev[k][0]+' file'+(ev[k][0]>1?'s':'')+'</button>').join('')+'</div><span class="map-ev" id="map-a-evl">Click a chip for a real line from the source.</span>';
  }
  function depHtml(a){
    const d=D.deps[a.id];if(!d||!Object.keys(d).length)return '';
    return '<dt>Imports</dt><dd>'+Object.entries(d).sort((x,y)=>y[1]-x[1]).map(([k,v])=>esc(k)+' ('+v+')').join(', ')+' <span class="mute small">files</span></dd>';
  }
  function chkHtml(a){
    const C=D.checks;let t='';
    if(a.id==='torchao')t='quantize_ with '+esc(C.torchao.config)+' on the 16 non-tied Linear layers: weights became <code>'+esc(C.torchao.after_type)+'</code> (a TorchAOBaseTensor subclass of torch.Tensor holding int8 <code>qdata</code> '+C.torchao.inner.qdata[1].join(' x ')+' and float32 <code>scale</code> per row); loss '+C.torchao.loss_fp32+' became '+C.torchao.loss_int8wo+', largest logit change '+C.torchao.max_abs_logit_diff.toFixed(4)+'.';
    else if(a.id==='peft')t='LoRA r = 8 on qkv, attn.proj, fc and mlp.proj of the plain-PyTorch tiny GPT: '+M.nf(C.peft.trainable_params)+' trainable of '+M.nf(C.peft.total_params)+' ('+C.peft.trainable_pct+'%), exactly 4 x 8 x (1024 + 512 + 1280 + 1280) = '+M.nf(C.peft.trainable_expected)+'; step-0 loss '+C.peft.loss_step0+' equals the base model\'s because B starts at zero.';
    else if(a.id==='transformers')t='A GPT2LMHeadModel built from a config with the running example\'s shape has exactly '+M.nf(C.gpt2.params)+' parameters, the same count as the hand-written model, picks attention "'+esc(C.gpt2.attn_implementation)+'", and ties the output head. LlamaConfig ships a tensor-parallel plan: '+Object.entries(C.llama_tp).map(([k,v])=>k.replace('layers.*.','')+' '+v).join(', ')+'. Trainer holds an <code>'+esc(C.trainer.accelerator_type)+'</code>.';
    else if(a.id==='trl')t='SFTTrainer, DPOTrainer, GRPOTrainer and RewardTrainer all inherit from <code>transformers.trainer.Trainer</code> (via trl\'s _BaseTrainer).';
    else if(a.id==='lightning')t='Same losses as the plain loop for 3 steps ('+C.lightning.losses.join(', ')+'); one process uses SingleDeviceStrategy; Fabric with strategy="ddp" on 2 CPU processes wraps the model in <code>'+esc(C.dist.lightning_fabric_ddp.inner_module_type)+'</code>.';
    else if(a.id==='accelerate')t='prepare() on 2 CPU processes (gloo) returned <code>'+esc(C.dist.accelerate_ddp.prepared_model_type)+'</code>. Asking for FSDP2 with cpu=True still returned DDP: '+esc(C.dist.accelerate_fsdp2_request.note)+'.';
    else if(a.id==='executorch')t='torch.export of the tiny GPT gave '+C.executorch.export_nodes+' operator calls; lowering to XNNPACK made '+C.executorch.delegates+' delegate calls and left '+C.executorch.non_delegated.length+' kinds of op on the portable CPU kernels (embedding and layer_norm among them); the .pte file is '+M.fmtB(C.executorch.pte_bytes)+' (float32 weights: 3.19M x 4 bytes = 12.75 MB) and the ExecuTorch runtime\'s logits differ from eager by at most '+C.executorch.runtime.max_abs_diff_vs_eager.toExponential(1)+'.';
    else return '';
    return '<dt>Measured</dt><dd><span class="map-lbl m">measured</span> '+t+'</dd>';
  }
  function detail(){
    const a=M.byId[sel],el=$('map-det');if(!a){el.innerHTML='';return}
    const rel=a.ver?esc(a.ver)+' <span class="mute">('+esc(a.date)+', PyPI)</span>':'<span class="mute">no PyPI package of its own</span>';
    el.innerHTML='<h3>'+esc(a.name)+' '+M.st(a.status)+'</h3><p style="margin:2px 0 6px">'+esc(a.one)+'</p><dl class="kv">'+
      '<dt>Layer</dt><dd>'+esc((M.LAYERS.find(l=>l[0]===a.layer)||[a.layer,a.layer])[1])+'</dd>'+
      '<dt>Owner</dt><dd>'+esc(a.owner)+'</dd><dt>Licence</dt><dd>'+esc(a.lic)+'</dd>'+
      '<dt>Latest</dt><dd>'+rel+(a.torchreq&&a.torchreq.length?' <span class="mute small">requires '+esc(a.torchreq.join(', '))+'</span>':'')+'</dd>'+
      '<dt>Status</dt><dd>'+esc(a.statusNote)+' '+M.link('source',a.statusSrc)+(a.archived?' <span class="mute small">(GitHub: archived)</span>':a.pushed?' <span class="mute small">(last push '+esc(a.pushed)+')</span>':'')+'</dd>'+
      '<dt>Calls into core</dt><dd>'+esc(a.wraps||'')+(D.ev[a.id]?' <span class="map-lbl s">source</span>':'')+evHtml(a)+'</dd>'+depHtml(a)+chkHtml(a)+
      '<dt>Choose when</dt><dd>'+esc(a.when)+'</dd>'+(a.avoid?'<dt>Avoid for</dt><dd>'+esc(a.avoid)+'</dd>':'')+
      '<dt>Links</dt><dd>'+(a.repo?M.link('GitHub','https://github.com/'+a.repo):'')+(a.pypi?' . '+M.link('PyPI','https://pypi.org/project/'+a.pypi+'/'):'')+'</dd></dl>';
    el.querySelectorAll('[data-ev]').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('[data-ev]').forEach(x=>x.classList.toggle('on',x===b));
      const r=D.ev[a.id][b.dataset.ev];$('map-a-evl').textContent=r[2]+'   ('+r[0]+' files, '+r[1]+' matches)'}));
  }
  function draw(){
    const list=D.atlas.filter(match);
    $('map-f-count').textContent=list.length+' of '+D.atlas.length+' libraries';
    $('map-cards').innerHTML=list.map(a=>'<button class="map-card'+(a.id===sel?' sel':'')+'" data-id="'+a.id+'"><span class="nm">'+esc(a.name)+'</span>'+M.st(a.status)+'<span class="ln">'+esc(a.one.length>110?a.one.slice(0,a.one.lastIndexOf(' ',106))+' ...':a.one)+'</span><span class="vr">'+(a.ver?esc(a.ver)+' . '+esc(a.date):'in core')+'</span></button>').join('')||'<p class="mute">Nothing matches.</p>';
    detail();
  }
  M.selectLib=function(id){sel=id;draw();const c=document.querySelector('#map-cards [data-id="'+id+'"]');if(c)c.scrollIntoView({block:'nearest'})};
  function init(){
    chips('map-f-layer',M.LAYERS,F.layer,'Layer');
    chips('map-f-status',M.STATUS.map(s=>[s,s]),F.status,'Status');
    $('map-f-task').innerHTML=M.TASKS.map(([k,t])=>'<option value="'+k+'">'+t+'</option>').join('');
    $('map-f-task').addEventListener('change',e=>{F.task=e.target.value;draw()});
    $('map-f-q').addEventListener('input',e=>{F.q=e.target.value.trim();draw()});
    $('map-cards').addEventListener('click',e=>{const b=e.target.closest('.map-card');if(b){sel=b.dataset.id;draw();const d=$('map-det');if(d.getBoundingClientRect().top>innerHeight*0.6)d.scrollIntoView({block:'start',behavior:M.RM?'auto':'smooth'})}});
    draw();
  }
  init();
})();
