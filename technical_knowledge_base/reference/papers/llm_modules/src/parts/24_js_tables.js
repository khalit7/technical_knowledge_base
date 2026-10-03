// ---- The evidence tab: Table 1 and the transcripts, the data audit, the parameter recount, the context claim ----
(function(){
  const P=window.PAPER,TB=P.tables,RC=P.rc,D=RC.data;
  const pc=(v,d)=>(100*v).toFixed(d==null?0:d)+'%',esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const yes=b=>b?'<span class="ok">yes</span>':'<span class="no">no</span>';
  // Table 1 as printed
  $('t1Tab').innerHTML='<thead><tr><th>Model (Table 1)</th><th>Response</th><th>Note</th></tr></thead><tbody>'+TB.t1.map(r=>'<tr><td>'+r.model+'</td><td>'+esc(r.response)+'</td><td>'+r.note+'</td></tr>').join('')+'</tbody>';
  // the transcripts
  let sel=TB.transcripts.length-1;
  function trDraw(){$('trTab').innerHTML='<thead><tr><th>Transcript</th><th>Prompt</th><th>Answer</th><th>Reasoned</th><th>Markers</th></tr></thead><tbody>'+TB.transcripts.map((r,i)=>'<tr data-i="'+i+'" tabindex="0" style="cursor:pointer'+(i===sel?';background:var(--acc2)':'')+'"><td>'+r.model+' #'+r.req+'</td><td>'+r.task+'</td><td>'+yes(r.answer)+'</td><td>'+yes(r.reasoned)+'</td><td>'+yes(r.tags)+'</td></tr>').join('')+'</tbody>';
    $('trTab').querySelectorAll('tr[data-i]').forEach(tr=>{const go=()=>{sel=+tr.dataset.i;trDraw()};tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go()}})});
    const r=TB.transcripts[sel];$('trOut').innerHTML='<b>'+r.model+', request '+r.req+'.</b> Prompt: '+(r.system?'the system prompt, then ':'no system prompt; ')+esc(r.format)+'.<br>Excerpt: <span class="mono">'+esc(r.excerpt)+'</span><br>This page\'s grade: '+r.grade+'.'}
  trDraw();
  // the data audit
  $('dStats').innerHTML=stat('Rows',fmt(D.rows),'median '+fmt(D.tokens_median)+', mean '+fmt(D.tokens_mean)+', 90th percentile '+fmt(D.tokens_p90)+' tokens')+
    stat('Dropped by the 4,096 filter',pc(1-D.share_rows_le_4096,1),'of all rows; never trained')+
    stat('Trained tokens per kept example',fmt(D.trained_tokens_mean),'mean, after the 2,048 cut')+
    stat('Rows ever trained on',fmt(D.rows_ever_trained_if_reshuffled_every_epoch),pc(D.share_ever_trained)+' of the dataset, if the subset is redrawn every epoch');
  function bars(){const kept=D.share_rows_le_4096,cut=kept*D.share_kept_rows_over_2048,whole=kept-cut;
    const row=(n,segs)=>'<div class="row"><span class="nm" title="'+n+'">'+n+'</span><span class="track">'+(()=>{let x=0;return segs.map(([v,c,t])=>{const s='<span class="fill" title="'+t+' '+pc(v,1)+'" style="left:'+(100*x).toFixed(2)+'%;width:'+(100*v).toFixed(2)+'%;background:'+c+'"></span>';x+=v;return s}).join('')})()+'</span><span class="val"></span></div>';
    $('dBars').innerHTML='<div class="bars">'+row('Rows of the dataset',[[whole,'var(--acc)','trained whole'],[cut,'var(--c5)','trained, cut at 2,048'],[1-kept,'var(--dim)','dropped (over 4,096)']])+
      row('Loss tokens',[[D.loss_share_answer,'var(--acc)','the answer'],[D.loss_share_user_question,'var(--c4)','the question'],[D.loss_share_system_prompt,'var(--bad)','the fixed system prompt']])+'</div>'+
      '<div class="leg"><span><i style="background:var(--acc)"></i>rows trained whole: '+pc(whole,1)+'</span><span><i style="background:var(--c5)"></i>cut at 2,048: '+pc(cut,1)+'</span><span><i style="background:var(--dim)"></i>dropped: '+pc(1-kept,1)+'</span></div>'+
      '<div class="leg"><span><i style="background:var(--acc)"></i>answer tokens: '+pc(D.loss_share_answer,1)+'</span><span><i style="background:var(--c4)"></i>question: '+pc(D.loss_share_user_question,1)+'</span><span><i style="background:var(--bad)"></i>system prompt: '+pc(D.loss_share_system_prompt,1)+'</span></div>'}
  bars();
  // validation overlap by scenario
  function ov(w){const s=+$('ovS').value,sc=D.scenarios[s-1],W=Math.max(300,w),H=200,pl=40,pr=10,pt=10,pb=34,X=e=>pl+(W-pl-pr)*(e-1)/14,Y=v=>pt+(H-pt-pb)*(1-v);let g='';
    $('ovSv').textContent=s===15?'15 (never redrawn before the end)':s;
    for(let k=0;k<=4;k++){g+=ln2(pl,Y(k/4),W-pr,Y(k/4),'var(--line)')+tx(pl-5,Y(k/4)+4,(25*k)+'%',{fs:11,a:'end',c:'var(--mute)'})}
    for(let e=1;e<=15;e+=2)g+=tx(X(e),H-pb+15,e,{fs:11,a:'middle',c:'var(--mute)'});g+=tx((pl+W-pr)/2,H-4,'epoch',{fs:11,a:'middle',c:'var(--mute)'});
    g+='<polyline fill="none" stroke="var(--bad)" stroke-width="2" points="'+sc.val_seen.map((v,i)=>X(i+1).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>';
    sc.val_seen.forEach((v,i)=>g+='<circle cx="'+X(i+1).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" fill="var(--bad)"/>');
    $('ovSvg').innerHTML=svgW(W,H,g,'Share of each epoch\'s validation examples already trained on');
    const last=sc.val_seen[14];$('ovOut').innerHTML='Share of each epoch\'s validation examples that were trained on in an earlier epoch. With the first redraw after epoch '+s+', the final validation loss is computed on examples of which <b>'+pc(last)+'</b> were trained on; '+fmt(sc.distinct_trained)+' distinct examples are trained on in all.'}
  $('ovS').addEventListener('input',()=>refit($('ovSvg')));
  // parameter recount
  const BR=RC.bridge,M=v=>fmt(v);
  const rows=[['Qwen2-1.5B (frozen)',RC.qwen_params,'runs','no','embeddings 151,936 × 1536 tied with the output; 28 blocks with grouped-query attention (2 key-value heads)'],
    ['pre_proj',BR.pre_proj,'runs','yes','1536 × 1536 + bias'],['proj',BR.proj,'runs','yes','1536 × 768 + bias'],['intermediate MLP',BR.intermediate,'runs','yes','1536 → 1152 → 768 with two LayerNorms'],
    ['2 Enhanced Cross-Attention layers',2*BR.per_enhanced_layer,'runs','yes','each: cross-attention '+M(BR.cross_attention)+', adapter '+M(BR.adapter)+', gate '+M(BR.gate)],
    ['GPT-Neo blocks and final norm',RC.neo_blocks,'runs','yes','12 blocks of width 768, randomly initialised'],['GPT-Neo positional embeddings',RC.neo_params-RC.neo_wte-RC.neo_blocks,'runs','yes','2,048 × 768, zeroed at the start'],
    ['GPT-Neo token embeddings',RC.neo_wte,'never used','no gradient','50,257 × 768; inputs arrive as embeddings'],['new output layer',RC.new_lm_head,'runs','yes','768 × 151,646, no bias']];
  $('pTab').innerHTML='<thead><tr><th>Part</th><th class="num">Parameters</th><th>At inference</th><th>Trained</th><th>Shape</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+M(r[1])+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td class="small" style="min-width:13em">'+r[4]+'</td></tr>').join('')+
    '<tr style="font-weight:600"><td>Trained</td><td class="num">'+M(RC.trained_params)+'</td><td></td><td></td><td></td></tr><tr style="font-weight:600"><td>Run to answer</td><td class="num">'+M(RC.inference_params)+'</td><td>'+RC.inference_vs_qwen+' × Qwen2</td><td></td><td></td></tr><tr style="font-weight:600"><td>Stored in the checkpoint</td><td class="num">'+M(RC.stored_params)+'</td><td></td><td></td><td></td></tr></tbody>';
  $('pChk').innerHTML='Check: '+M(RC.stored_params)+' parameters × 4 bytes = '+M(RC.checkpoint_fp32_bytes_expected)+' bytes; the released <code>model_checkpoint.pth</code> is '+M(RC.checkpoint_bytes_actual)+' bytes ('+A('https://huggingface.co/api/models/kkolomeitsev/llm-modules/tree/main','Hugging Face listing')+'), '+M(RC.checkpoint_bytes_actual-RC.checkpoint_fp32_bytes_expected)+' bytes more (0.003%, the file format\'s overhead). So the checkpoint holds every weight, the frozen Qwen2 included, in 32-bit floats, and the count above is the model that was trained. Defaults reproduce the file size independently.';
  const pb=[['trained',RC.trained_params,'var(--acc)'],['run to answer',RC.inference_params,'var(--bad)'],['Qwen2-1.5B alone',RC.qwen_params,'var(--closed)'],['GPT-Neo-125M',RC.neo_params,'var(--c5)']],pm=Math.max(...pb.map(r=>r[1]));
  $('pBars').innerHTML='<div class="bars">'+pb.map(r=>'<div class="row"><span class="nm">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/pm).toFixed(1)+'%;background:'+r[2]+'"></span></span><span class="val">'+(r[1]/1e9).toFixed(2)+'B</span></div>').join('')+'</div>';
  // the context claim
  const C=RC.context,L=(t,u)=>A(u,t);
  $('cTab').innerHTML='<thead><tr><th>Source</th><th>Says</th></tr></thead><tbody>'+
    '<tr><td>The paper, '+L('§2','https://arxiv.org/html/2502.08213v1#S2')+'</td><td>the method handles "longer input sequences (e.g., 128K tokens in Qwen2 versus 2K tokens in GPT-Neo)"</td></tr>'+
    '<tr><td>The author\'s '+L('blog','https://k-kolomeitsev.github.io/LLM-Modules/')+'</td><td>"such a combination can process the same amount of context as the large model (in my case, 125k tokens), whereas the small model can handle only a 2048-token context window"</td></tr>'+
    '<tr><td>Qwen2 release '+L('blog','https://qwenlm.github.io/blog/qwen2/')+'</td><td>context length 32K for Qwen2-0.5B and Qwen2-1.5B; 128K only for Qwen2-7B and Qwen2-72B</td></tr>'+
    '<tr><td>Qwen2-1.5B '+L('config.json','https://huggingface.co/Qwen/Qwen2-1.5B/blob/main/config.json')+'</td><td>max_position_embeddings '+fmt(C.qwen_config_max_positions)+', larger than the 32K the release blog states</td></tr>'+
    '<tr><td>model.py, '+L('lines 246 to 250','https://github.com/k-kolomeitsev/LLM-Modules/blob/main/model.py')+'</td><td><b>'+fmt(C.neo_positions)+' tokens</b>: GPT-Neo has 2,048 positions, and the code keeps only the first 2,048 states. Once a text passes 2,048 tokens, generation keeps reading its next token from position 2,048\'s output, so the pair\'s working context is GPT-Neo\'s, not Qwen2\'s.</td></tr></tbody>';
  onTab('t-tables',()=>{fit($('ovSvg'),ov)});
})();
