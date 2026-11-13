// ---- The paper tab: size reveal, training-data tiles, toy table, family table ----
(function(){
  const RC=window.PAPER.rc,D=RC.data,BR=RC.bridge;
  const M=v=>(v/1e6).toFixed(v>=1e8?1:v>=1e7?1:2)+'M',B=v=>(v/1e9).toFixed(2)+'B';
  const pc=(v,d)=>(100*v).toFixed(d==null?0:d)+'%';
  // 1. the architecture is the 3D stage Fig. 1 (31_js_sc_arch.js) since 2026-11-13; its code facts are its step list
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
})();
