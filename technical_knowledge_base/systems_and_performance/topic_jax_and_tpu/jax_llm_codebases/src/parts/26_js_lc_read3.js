// ---- Reading tab, part 3: loss-difference chart, remat table, MFU table, LoRA, GRPO placement animation, Levanter table ----
(function(){
  const U=LCU, esc=U.esc, $=id=>document.getElementById(id), t=RD.t, T=LC.train;
  // line chart helper: series [{y:[...], color, label, dash}], log or linear y
  function chart(el,series,o){
    const W=U.width(el),H=o.h||220,L=48,R=10,Tp=12,Bm=30,pw=W-L-R,ph=H-Tp-Bm;
    const n=Math.max(...series.map(s=>s.y.length));
    const tr=v=>o.log?Math.log10(Math.max(v,o.floor)):v;
    const y0=o.log?Math.log10(o.floor):o.ymin,y1=o.log?Math.log10(o.ymax):o.ymax;
    const X=i=>L+pw*i/(n-1),Y=v=>Tp+ph*(1-(tr(v)-y0)/(y1-y0));
    let s='<rect x="'+L+'" y="'+Tp+'" width="'+pw+'" height="'+ph+'" fill="none" stroke="var(--line)"/>';
    if(o.log){for(let e=Math.ceil(y0);e<=y1;e++){const y=Tp+ph*(1-(e-y0)/(y1-y0));s+='<line x1="'+L+'" y1="'+y.toFixed(1)+'" x2="'+(L+pw)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)"/>'+t(L-4,y+3,'1e'+e,{a:'end',fs:9.5,fill:'var(--mute)'})}}
    else{for(let k=0;k<=4;k++){const v=o.ymin+(o.ymax-o.ymin)*k/4,y=Y(v);s+='<line x1="'+L+'" y1="'+y.toFixed(1)+'" x2="'+(L+pw)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)"/>'+t(L-4,y+3,v.toFixed(o.dp||2),{a:'end',fs:9.5,fill:'var(--mute)'})}}
    for(let k=0;k<=4;k++){const i=Math.round((n-1)*k/4);s+=t(X(i),H-Bm+14,String(i),{a:'middle',fs:9.5,fill:'var(--mute)'})}
    s+=t(L+pw/2,H-4,o.xl||'step',{a:'middle',fs:10,fill:'var(--mute)'});
    series.forEach(se=>{let d='';se.y.forEach((v,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||1.6)+'"'+(se.dash?' stroke-dasharray="4 3"':'')+'/>'});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart')+'<div class="lc-leg">'+series.map(se=>'<span><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>').join('')+'</div>';
  }
  // ---------- variant chart ----------
  const VAR={none:['MaxText\'s settings (the matched twin)','var(--mute)'],exact_gelu:['exact GELU','var(--c1)'],decay_everything:['every leaf decayed (adamw_mask: [])','var(--c4)'],
    warmup_from_step1:['warmup from step 1 (lr 1e-3/50 at step 0)','var(--c2)'],running_example_settings:['all three: the running example\'s settings','var(--c3)']};
  let vsel='none';
  function drawVar(){const base=T.twin.map((v,i)=>Math.abs(v-T.mt[i]));
    const ser=[{y:base,color:'var(--mute)',label:'twin with MaxText\'s settings: max '+U.sci(T.diff_twin).replace('&minus;','-')}];
    if(vsel!=='none'){const v=T.var[vsel];ser.push({y:v.map((x,i)=>Math.abs(x-T.mt[i])),color:VAR[vsel][1],label:VAR[vsel][0]+': max '+U.sci(T.var_diff[vsel]).replace('&minus;','-'),w:2})}
    chart($('lc-var-svg'),ser,{log:true,floor:1e-8,ymax:1,label:'Loss difference from MaxText per step'});
    const cap={none:'The twin with tanh GELU, warmup from 0 and decay on the seven kernels only tracks MaxText\'s step to float32 rounding for all 200 steps (zeros are drawn at 1e-8). Choose a setting to switch back.',
      exact_gelu:'Exact GELU alone: the curves separate slowly, '+U.sci(T.var_diff.exact_gelu)+' at most. The activation matters for an equivalence test, hardly for training.',
      decay_everything:'Decaying biases, norm scales and embeddings too (MaxText\'s default mask): the gap grows steadily as decay accumulates, '+U.sci(T.var_diff.decay_everything)+' by step 200.',
      warmup_from_step1:'A schedule that starts at 1e-3/50 instead of 0: one step of phase. The gap peaks at '+U.sci(T.var_diff.warmup_from_step1)+' early, while the learning rate ramps, then shrinks.',
      running_example_settings:'All three switched back: this is the root\'s running example as published, and it differs from MaxText\'s run by up to '+U.sci(T.var_diff.running_example_settings)+', almost all of it the warmup.'}[vsel];
    $('lc-var-cap').innerHTML=cap}
  U.seg($('lc-var-seg'),m=>{vsel=m;drawVar()});drawVar();U.onTab('t-read',drawVar);RD.onResize(drawVar);

  // ---------- remat ----------
  const RR=LC.remat.rows;
  const rtb=document.querySelector('#lc-remat-tab tbody');
  rtb.innerHTML=RR.map(r=>'<tr><td><code>'+r.remat_policy+'</code></td><td>'+r.scan_layers+'</td><td class="num">'+(r.temp_bytes/1e6).toFixed(1)+' MB</td><td class="num">'+(r.flops/1e9).toFixed(2)+' G'+(r.scan_layers?'<sup>*</sup>':'')+'</td><td class="num">'+r.compile_s.toFixed(2)+' s</td><td class="num">'+U.num(r.hlo_lines)+'</td><td class="num">'+r.losses.map(x=>x.toFixed(4)).join(', ')+'</td></tr>').join('')+
    '<tr><td colspan="7" class="small mute"><sup>*</sup> loop body counted once by XLA\'s cost analysis.</td></tr>';
  function drawRemat(){const el=$('lc-remat-svg'),W=U.width(el),rows=RR.filter(r=>r.scan_layers),mx=Math.max(...rows.map(r=>r.temp_bytes));
    const L=Math.min(170,W*.42),bw=W-L-70;let s='';
    rows.forEach((r,i)=>{const y=6+i*22,w=bw*r.temp_bytes/mx;s+=t(L-6,y+12,r.remat_policy,{a:'end',fs:10.5});s+='<rect x="'+L+'" y="'+y+'" width="'+w.toFixed(1)+'" height="15" rx="2" fill="var(--c'+(r.remat_policy==='full'?2:1)+')" fill-opacity=".7"/>'+t(L+w+4,y+12,(r.temp_bytes/1e6).toFixed(1)+' MB',{fs:10})});
    el.innerHTML=RD.svg(W,rows.length*22+10,s,'XLA temporary memory per remat policy, scanned')+'<p class="small mute">XLA temporary bytes of the compiled step, scanned layers. The unrolled rows in the table give the FLOPs: full 28.90 G against minimal 24.61 G.</p>'}
  drawRemat();U.onTab('t-read',drawRemat);RD.onResize(drawRemat);

  // ---------- MFU ----------
  const mtb=document.querySelector('#lc-mfu-tab tbody');
  const nm={'llama2-70b':'Llama 2 70B','llama3.1-8b':'Llama 3.1 8B','llama3.1-70b':'Llama 3.1 70B','llama3.1-405b':'Llama 3.1 405B','mixtral-8x7b':'Mixtral 8x7B','mixtral-8x22b':'Mixtral 8x22B'};
  mtb.innerHTML=LC.mfu.rows.map(r=>{const c=Math.abs(r.implied_mfu_pct-r.published_mfu_pct)<=0.0201,o=Math.abs(r.implied_mfu_noncausal_pct-r.published_mfu_pct)<=0.0201;
    return '<tr><td>'+nm[r.model]+' <span class="mute small">'+r.tier+'</span></td><td>'+r.chip+', '+U.num(r.seq)+'</td><td class="num">'+r.published_mfu_pct+'%</td><td class="num">'+U.num(r.published_tokens_per_s)+'</td><td class="num'+(c?' lc-ok':'')+'">'+r.implied_mfu_pct.toFixed(2)+'%</td><td class="num'+(o?' lc-ok':'')+'">'+r.implied_mfu_noncausal_pct.toFixed(2)+'%</td></tr>'}).join('')+
    '<tr><td colspan="6" class="small mute">Green: within 0.02 points of the published MFU. Training FLOPs per token (current count): '+LC.mfu.rows.filter((r,i,a)=>a.findIndex(x=>x.model===r.model)===i).map(r=>nm[r.model]+' '+(r.tflop_per_token_x1e6/1e6).toFixed(3)+' GFLOP (attention '+r.attention_share_pct.toFixed(1)+'%)').join('; ')+'.</td></tr>';

  // ---------- LoRA ----------
  const B=LC.tunix.B,ltb=document.querySelector('#lc-lora-tab tbody');
  const LB={lora_r4:'LoRA rank 4',lora_r16:'LoRA rank 16',full_ft:'full fine-tuning'};
  ltb.innerHTML=['lora_r4','lora_r16','full_ft'].map(k=>{const v=B[k];return '<tr><td>'+LB[k]+'</td><td class="num">'+U.num(v.trainable)+'</td><td class="num">'+(v.trainable_frac*100).toFixed(2)+'%</td><td class="num">'+v.val_before.toFixed(4)+'</td><td class="num">'+v.val_after.toFixed(4)+'</td></tr>'}).join('');
  function drawLora(){const all=[].concat(...['lora_r4','lora_r16','full_ft'].map(k=>B[k].loss));
    chart($('lc-lora-svg'),[{y:B.lora_r4.loss,color:'var(--c1)',label:'LoRA rank 4'},{y:B.lora_r16.loss,color:'var(--c3)',label:'LoRA rank 16'},{y:B.full_ft.loss,color:'var(--c2)',label:'full fine-tuning'}],
      {ymin:Math.floor(Math.min(...all)*10)/10,ymax:Math.ceil(Math.max(...all)*10)/10,h:190,dp:1,xl:'step (training batches 500 to 599)',label:'Training loss, LoRA against full fine-tuning'})}
  drawLora();U.onTab('t-read',drawLora);RD.onResize(drawLora);

  // ---------- GRPO through RLCluster ----------
  const G=[
    {k:'prompts',cap:'<b>A batch of prompts</b> arrives from the data iterator. The learner asks the cluster for completions.',on:['data']},
    {k:'gen',cap:'<b>Generate</b> (<code>rl_cluster.generate</code>): the <b>rollout</b> role samples <code>num_generations</code> completions per prompt (default 2) with the vanilla JAX sampler, vLLM or SGLang-JAX.',on:['rollout']},
    {k:'reward',cap:'<b>Score</b>: reward functions (Python, often a verifier) give each completion a scalar.',on:['reward']},
    {k:'ref',cap:'<b>Reference log-probabilities</b> (<code>get_ref_per_token_logps</code>) on the <b>reference</b> role\'s mesh, for the KL penalty (beta = 0.04 by default). With LoRA the reference is the actor\'s frozen backbone, so no second copy.',on:['ref']},
    {k:'adv',cap:'<b>Advantages</b>: each completion\'s reward minus its group\'s mean, divided by the group\'s sample standard deviation plus 1e-6 (the "grpo" estimator, '+U.ref('tunix_adv_std')+'). No critic model.',on:['learner']},
    {k:'train',cap:'<b>Update the actor</b> (<code>update_actor</code>): a PeftTrainer step on the <b>actor</b> role\'s mesh with the clipped objective (epsilon = 0.2) plus the KL term.',on:['actor']},
    {k:'sync',cap:'',on:['actor','rollout']}];
  let gm='co';
  function drawGrpo(i){const el=$('lc-grpo-svg'),W=U.width(el),st=G[i],co=gm==='co';let s='';
    const H=200,box=(id,x,y,w,h,lab,sub)=>{const hot=st.on.includes(id);s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(hot?'var(--acc2)':'var(--soft)')+'" stroke="'+(hot?'var(--acc)':'var(--line)')+'" stroke-width="'+(hot?2:1)+'"/>'+t(x+w/2,y+h/2-2,lab,{a:'middle',fs:11.5,w:600})+(sub?t(x+w/2,y+h/2+13,sub,{a:'middle',fs:9.5,fill:'var(--mute)'}):'')};
    const bw=Math.min(130,(W-40)/4);
    if(co){s+='<rect x="6" y="40" width="'+(W-12)+'" height="'+(H-48)+'" rx="10" fill="none" stroke="var(--c3)" stroke-dasharray="5 3"/>'+t(14,56,'one mesh: actor, rollout, reference share devices',{fs:10,fill:'var(--c3)'});
      box('actor',16,70,bw,46,'actor','trainer (NNX)');box('rollout',26+bw,70,bw,46,'rollout','same weights');box('ref',36+2*bw,70,bw,46,'reference','frozen');box('reward',46+3*bw,70,Math.min(bw,W-60-3*bw),46,'reward','Python fns');}
    else{const half=(W-18)/2;s+='<rect x="6" y="40" width="'+half+'" height="'+(H-48)+'" rx="10" fill="none" stroke="var(--c3)" stroke-dasharray="5 3"/>'+t(14,56,'mesh A: training',{fs:10,fill:'var(--c3)'});
      s+='<rect x="'+(12+half)+'" y="40" width="'+half+'" height="'+(H-48)+'" rx="10" fill="none" stroke="var(--c2)" stroke-dasharray="5 3"/>'+t(20+half,56,'mesh B: generation',{fs:10,fill:'var(--c2)'});
      const w2=Math.min(120,(half-30)/2);box('actor',16,70,w2,46,'actor','trainer');box('ref',26+w2,70,w2,46,'reference','frozen');box('rollout',22+half,70,w2,46,'rollout','vLLM TPU copy');box('reward',32+half+w2,70,Math.min(w2,half-40-w2),46,'reward','Python fns');}
    box('data',16,6,Math.min(140,W/3),26,'prompts','');box('learner',W-16-Math.min(170,W/2.4),6,Math.min(170,W/2.4),26,'learner: advantages','');
    if(st.k==='sync'){const y=150;if(co)s+=t(16,y,'sync_weights: actor and rollout share one backbone, nothing to copy',{fs:11,fill:'var(--good)'});
      else{const half=(W-18)/2;s+='<path d="M'+(16+60)+',122 C '+(16+60)+',170 '+(22+half+40)+',170 '+(22+half+40)+',122" fill="none" stroke="var(--bad)" stroke-width="2.4" marker-end="url(#lcArr)"/>'+t(W/2,y+30,'sync_weights: actor parameters copied to the rollout engine every step',{a:'middle',fs:11,fill:'var(--bad)'})}}
    const defs='<defs><marker id="lcArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--bad)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+s,'GRPO step '+(i+1));
    $('lc-grpo-cap').innerHTML='<b>Step '+(i+1)+' of '+G.length+'.</b> '+(st.k==='sync'?(co?'<b>Sync weights</b> (<code>sync_weights</code>): colocated, the actor and rollout are the same NNX model on the same mesh (the backbone-sharing map), so the next generation already sees the update; no transfer.':'<b>Sync weights</b> (<code>sync_weights</code>): disaggregated, the rollout engine holds its own copy, so the actor\'s parameters (only the LoRA ones if LoRA is on) are pushed to it after every step. That transfer is the price of running generation and training on separate chips.'):st.cap)}
  const ga=U.anim({card:'lc-grpo-card',ctl:'lc-grpo-ctl',n:G.length,tab:'t-read',draw:drawGrpo,label:'GRPO step',ms:1700});
  U.seg($('lc-grpo-mode'),m=>{gm=m;ga.reset(G.length)});

  // ---------- Levanter against MaxText ----------
  const lv=LC.hal.levanter_param_specs,rx=LC.shard.cases[4].rows;
  const dropLayer=sp=>{const inner=sp.slice(2,-1);const parts=[];let d=0,cur='';for(const ch of inner){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&d===0){parts.push(cur.trim());cur=''}else cur+=ch}parts.push(cur.trim());if(parts.length>2)parts.splice(1,1);return 'P('+parts.join(', ')+')'};
  const pair=[['mlp c_fc [embed, mlp]','decoder.layers.mlp.wi.kernel'],['mlp c_proj [mlp, embed]','decoder.layers.mlp.wo.kernel'],['attn c_attn [embed, qkv, heads, head_size]','decoder.layers.self_attention.query.kernel'],['attn c_proj [heads, head_size, embed]','decoder.layers.self_attention.out.kernel'],['token embedding [vocab, embed]','token_embedder.embedding']];
  const ltab=document.querySelector('#lc-lev-tab tbody');
  ltab.innerHTML=pair.map(([a,b])=>{const r=rx.find(x=>x.name===b);return '<tr><td>'+esc(a)+'</td><td><code>'+esc(lv[a])+'</code></td><td><code>'+esc(r?(b.includes('.layers.')?dropLayer(r.spec):r.spec):'?')+'</code> <span class="mute small">'+esc(b.split('.').slice(-2).join('.'))+(r&&r.error?', vocab 65 indivisible':'')+'</span></td></tr>'}).join('');
})();
