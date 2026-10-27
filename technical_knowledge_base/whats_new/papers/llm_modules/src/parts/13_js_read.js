// ---- The paper tab: architecture diagram, size reveal, training-data tiles, toy table, family table ----
(function(){
  const RC=window.PAPER.rc,D=RC.data,BR=RC.bridge;
  const M=v=>(v/1e6).toFixed(v>=1e8?1:v>=1e7?1:2)+'M',B=v=>(v/1e9).toFixed(2)+'B';
  const pc=(v,d)=>(100*v).toFixed(d==null?0:d)+'%';
  // 1. architecture, as model.py builds it
  const NODES=[
    {id:'tok',t:'Query tokens',s:'Qwen2 tokenizer, 151,646 tokens',k:'in',code:'qwen_tokenizer(full_text) (lines 415 to 426); the pair uses Qwen2\'s tokenizer throughout'},
    {id:'qwen',t:'Qwen2-1.5B, frozen',s:'28 blocks, width 1536 · '+B(RC.qwen_params),k:'fz',code:'Qwen2ForCausalLM.from_pretrained("Qwen/Qwen2-1.5B"); every parameter requires_grad = False; run under torch.no_grad() (lines 140 to 148, 182)'},
    {id:'pre',t:'pre_proj on hidden_states[-1]',s:'1536 → 1536 · '+M(BR.pre_proj),k:'tr',code:'hidden_states = outputs.hidden_states[-1]; pre_projected_states = self.pre_proj(hidden_states) (lines 190 to 193). Qwen2\'s own output layer is never used.'},
    {id:'split',pair:[{id:'inter',t:'intermediate MLP: g',s:'1536 → 1152 → 768 · '+M(BR.intermediate),k:'tr',code:'Linear, LayerNorm, GELU, Linear, LayerNorm (lines 171 to 178). Its output is the stream g that the cross-attention updates: the "small model side" of the cross-attention is itself made from Qwen2\'s states.'},
      {id:'proj',t:'proj',s:'1536 → 768 · '+M(BR.proj),k:'tr',code:'projected_states = self.proj(pre_projected_states) (line 196), added back after the two cross-attention layers (line 210).'}]},
    {id:'xa',t:'2 × Enhanced Cross-Attention',s:'Q from g, K and V from pre_proj · '+M(BR.per_enhanced_layer)+' each',k:'tr',code:'CrossAttentionLayer (8 heads, LayerNorm on both inputs, mask = padding only), CrossAttentionAdapter (768 → 256 → 768), gate = sigmoid(Linear([g, out])), out = gate * a + (1 - gate) * g, then g = g + out (lines 19 to 130, 204 to 207). Per layer: cross-attention '+M(BR.cross_attention)+', adapter '+M(BR.adapter)+', gate '+M(BR.gate)+'.'},
    {id:'add',t:'g + proj',s:'768 wide, one vector per token',k:'tr',code:'final_states = gptneo_states + projected_states (line 210). This is all GPT-Neo ever sees.'},
    {id:'neo',t:'GPT-Neo-125M body, random weights',s:'12 blocks, width 768 · '+M(RC.neo_blocks)+' trained',k:'tr',code:'GPTNeoForCausalLM(gptneo_config): built from the config, not from_pretrained (line 220). Inputs are inputs_embeds, so its token embeddings ('+M(RC.neo_wte)+') are never used; positional embeddings zeroed at the start (line 227); sequences cut to 2,048 positions (lines 246 to 250).'},
    {id:'head',t:'new output layer',s:'768 → 151,646 · '+M(RC.new_lm_head),k:'tr',code:'self.new_lm_head = nn.Linear(768, len(qwen_tokenizer), bias=False) (line 232): '+pc(RC.head_share_of_trained)+' of all trained parameters.'},
    {id:'out',t:'Next-token logits',s:'trained on every token, system prompt included',k:'in',code:'labels = input_ids (line 435); cross-entropy on shifted logits, padding ignored (lines 643 to 659).'}];
  let sel='xa';
  function arDraw(w){const W=Math.max(300,w),bh=50,gap=18,x0=8,bw=W-16;let y=6,s='';const col={fz:'var(--closed2)',tr:'var(--acc2)',in:'var(--soft)'},str={fz:'var(--closed)',tr:'var(--acc)',in:'var(--line)'};
    const box=(n,x,yy,ww)=>{const on=n.id===sel;s+='<g class="arn" data-id="'+n.id+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+n.t+'">'+rc(x,yy,ww,bh,col[n.k],{s:on?'var(--ink)':str[n.k],sw:on?2.2:1.2,r:7})+
      tx(x+10,yy+20,n.t,{fs:13,w:600})+tx(x+10,yy+38,n.s,{fs:11.5,c:'var(--mute)'})+'</g>'};
    NODES.forEach((n,i)=>{if(i)s+=ln2(W/2,y-gap+2,W/2,y-2,'var(--mute)');
      if(n.pair){const hw=(bw-10)/2;box(n.pair[0],x0,y,hw);box(n.pair[1],x0+hw+10,y,hw)}else box(n,x0,y,bw);
      if(n.id==='qwen')s+=tx(W-14,y+20,'frozen',{fs:11,a:'end',c:'var(--closed)',w:600});
      if(n.id==='pre')s+=tx(W-14,y+20,'trained',{fs:11,a:'end',c:'var(--acc)',w:600});
      y+=bh+gap});
    const H=y-gap+6;$('arSvg').innerHTML=svgW(W,H,s,'The CombinedModel as model.py builds it');
    $('arSvg').querySelectorAll('.arn').forEach(g=>{const go=()=>{sel=g.dataset.id;arDraw(w);info()};g.addEventListener('click',go);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}
  function info(){let n=NODES.find(x=>x.id===sel);if(!n)NODES.forEach(x=>{if(x.pair)x.pair.forEach(p=>{if(p.id===sel)n=p})});$('arOut').innerHTML='<b>'+n.t+'.</b> '+n.code}
  info();
  // 2. size reveal
  function sizeBars(){const rows=[['GPT-Neo-125M as published',RC.neo_params,'var(--c5)'],['trained by the pair (gets gradients)',RC.trained_params,'var(--acc)'],['Qwen2-1.5B alone',RC.qwen_params,'var(--closed)'],['the pair, run to answer',RC.inference_params,'var(--bad)']];
    const mx=Math.max(...rows.map(r=>r[1]));
    $('prSizeBars').innerHTML='<div class="bars">'+rows.map(r=>'<div class="row"><span class="nm" title="'+r[0]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:'+r[2]+'"></span></span><span class="val">'+B(r[1])+'</span></div>').join('')+'</div><p class="small mute">Recounted from the configs and model.py (recompute.py); the stored checkpoint matches the count to 0.003%, see ~[the recount|tab:t-tables:ev-params]~.</p>'.replace(/~\[([^|]+)\|tab:([^:]+):([^\]]+)\]~/,'<a href="#" data-tab="$2" data-to="$3">$1</a>');
    $('prSizeBars').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('#tabs button[data-t='+a.dataset.tab+']').click();const t=$(a.dataset.to);if(t)t.scrollIntoView({block:'start'})}))}
  PRED_REVEAL['pr-size']=sizeBars;
  // 3. training data tiles
  $('trStats').innerHTML=stat('Rows in Bespoke-Stratos-17k',fmt(D.rows),'median '+fmt(D.tokens_median)+' tokens with the system prompt')+
    stat('Kept by the 4,096-token filter',pc(D.share_rows_le_4096),'the rest are never used')+
    stat('Training examples per epoch',fmt(D.epoch2.train),'30% subset, filtered, 90%; batch size 1')+
    stat('Kept examples cut at 2,048',pc(D.share_kept_rows_over_2048),pc(D.share_kept_tokens_beyond_2048)+' of all kept tokens never trained')+
    stat('Loss tokens that are the system prompt',pc(D.loss_share_system_prompt,1),D.system_tokens+' tokens, identical in every example');
  // 4. the toy table
  function toyTable(){const T=window.TOY;if(!T||!T.runs)return;const R=T.runs;
    const f=(v,k,p)=>{const xs=R[v].map(r=>r.test[k]),m=xs.reduce((a,b)=>a+b,0)/xs.length,lo=Math.min(...xs),hi=Math.max(...xs);
      return p?Math.round(100*m)+'% <span class="mute">('+Math.round(100*lo)+' to '+Math.round(100*hi)+')</span>':m.toFixed(2)+' <span class="mute">('+lo.toFixed(2)+' to '+hi.toFixed(2)+')</span>'};
    let h='<thead><tr><th>Variant</th><th class="num">Generates right</th><th class="num">Teacher-forced right</th><th class="num">Future scrambled</th><th class="num">Teacher-forced loss</th><th class="num">LR</th></tr></thead><tbody>';
    T.vars.forEach(v=>{if(!R[v])return;h+='<tr'+(v==='released'||v==='causal'?' style="font-weight:600"':'')+'><td>'+T.names[v]+'</td><td class="num">'+f(v,'gen_acc',1)+'</td><td class="num">'+f(v,'tf_eq',1)+'</td><td class="num">'+f(v,'tf_eq_scrambled',1)+'</td><td class="num">'+f(v,'loss')+'</td><td class="num">'+R[v][0].lr+'</td></tr>'});
    $('toyTab').innerHTML=h+'</tbody>'}
  toyTable();
  // 5. the family
  const FAM=[
    ['This paper (2025)','Qwen2-1.5B','a bridge (2 gated cross-attention layers), a randomly initialised GPT-Neo-sized decoder, a new output layer','the new decoder','sigmoid gate, about 0.5 at the start','2 prompts, one sample each'],
    ['Flamingo (2022), ~[§2.2|https://arxiv.org/html/2204.14198#S2.SS2]~','a vision encoder and a language model','a Perceiver Resampler and gated cross-attention layers inserted between the frozen LM\'s blocks','the frozen language model','tanh(α), α = 0 at the start: begins as the unchanged LM','\"numerous benchmarks\", few-shot, against fine-tuned models'],
    ['CALM (2024), ~[§3.1|https://arxiv.org/html/2401.02412v1#S3.SS1]~','an anchor LLM (PaLM2-XS or S) and an augmenting model (PaLM2-XXS)','projections and cross-attention at several layers; the anchor queries the augmenting model','the frozen anchor','none (residual)','translation, arithmetic and code benchmarks, against fine-tuned anchors'],
    ['Adapters (2019), ~[abstract|https://arxiv.org/abs/1902.00751]~','BERT','small bottleneck layers inside every block','the same model','none','GLUE: within 0.4% of full fine-tuning with 3.6% parameters per task'],
    ['Distillation (2015), ~[abstract|https://arxiv.org/abs/1503.02531]~','nothing at inference','a student trained on the teacher\'s outputs','the student, alone','not applicable','the student is measured alone']];
  const L=s=>s.replace(/~\[([^|\]]+)\|([^\]]+)\]~/g,(m,t,u)=>A(u,t));
  $('famTab').innerHTML='<thead><tr><th>Design</th><th>Frozen</th><th>Trained</th><th>Generates</th><th>Gate</th><th>Evaluated on</th></tr></thead><tbody>'+FAM.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i===0?' style="font-weight:600"':'')+'>'+L(c)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  onTab('t-read',()=>{fit($('arSvg'),arDraw)});
})();
