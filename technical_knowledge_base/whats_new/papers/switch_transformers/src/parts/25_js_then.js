// ---- Then and now: Switch's eight recipe lines against six later papers and models ----
(function(){const AXS=window.PAPER.meta.ax;
  const LINES=['Experts per token','Experts per layer','Which FFN layers','Router scores','Load balancing','When an expert is full','Router precision','Extra router loss'];
  const HF=r=>'https://huggingface.co/'+r+'/blob/main/config.json';
  const S=(v,u,l,same)=>({v,u,l,same:!!same});// same: worded differently but Switch's choice
  const M=[
   {n:'Switch Transformer',y:'Jan 2021',c:'The starting recipe, as the paper and its released configurations write it.',cells:[
     S('1',AXS+'#S2.SS1','§2.1'),S('128 full-size FFNs (Base, Large, released XXL), 2,048 in Switch-C',AXS+'#S5.T9','Table 9'),S('every other (every layer in Switch-C)',AXS+'#S5.T9','Table 9'),
     S('softmax over all experts',AXS+'#S2.E1','Eq. 1'),S('α · N · Σ f·P, α = 0.01',AXS+'#S2.E4','Eq. 4'),S('capacity factor 1.0 to 1.25; overflow dropped to the residual',AXS+'#S2.SS2','§2.2'),
     S('float32 inside the router only',AXS+'#S2.SS4','§2.4'),S('none',AXS+'#S2.SS2','§2.2')]},
   {n:'GLaM',y:'Dec 2021',u:'https://arxiv.org/abs/2112.06905',c:'Google\'s 1.2T decoder-only MoE: "the Gating module dynamically selects two most relevant experts out of 64". Back to top-2, for quality.',cells:[
     S('2','https://arxiv.org/html/2112.06905v2#S4','§4'),S('64','https://arxiv.org/html/2112.06905v2#S4','§4'),S('every other','https://arxiv.org/html/2112.06905v2#S4','§4',1),S('softmax','https://arxiv.org/html/2112.06905v2#S4','§4',1),null,null,null,null]},
   {n:'ST-MoE',y:'Feb 2022',u:'https://arxiv.org/abs/2202.08906',c:'The same group\'s design guide: "we recommend top-2 routing with 1.25 capacity factor", revising Switch, since top-2 gained +0.004 over top-1 and the speed gap was negligible at 8x the scale. Adds the router z-loss; casts "all exponentiated tensors" to float32.',cells:[
     S('2','https://arxiv.org/html/2202.08906v2#S5.SS2','§5.2'),S('64 (ST-MoE-32B)','https://github.com/google/flaxformer/blob/main/flaxformer/t5x/configs/moe/models/st_moe_32b.gin','gin'),null,null,null,S('train capacity factor 1.25, eval 2.0','https://github.com/google/flaxformer/blob/main/flaxformer/t5x/configs/moe/models/st_moe_32b.gin','gin'),
     S('float32 for every exponentiated tensor','https://arxiv.org/html/2202.08906v2#S3.SS4','§3.4',1),S('router z-loss, 0.001','https://github.com/google/flaxformer/blob/main/flaxformer/t5x/configs/moe/models/st_moe_32b.gin','gin')]},
   {n:'MegaBlocks',y:'Nov 2022',u:'https://arxiv.org/abs/2211.15841',c:'A GPU training system rather than a model: block-sparse kernels that "never drop tokens", ending the choice between dropping and padding that the capacity factor forces.',cells:[
     null,null,null,null,null,S('dropless: block-sparse kernels, no capacity','https://arxiv.org/abs/2211.15841','abstract'),null,null]},
   {n:'Mixtral 8x7B',y:'Jan 2024',u:'https://arxiv.org/abs/2401.04088',c:'Open weights. Top-2 of 8 full-size SwiGLU experts in every layer, unlike GShard\'s every other block; gates are a softmax over the top-2 logits. Inference through vLLM with MegaBlocks kernels.',cells:[
     S('2',HF('mistralai/Mixtral-8x7B-v0.1'),'config'),S('8 full-size (14,336 wide)',HF('mistralai/Mixtral-8x7B-v0.1'),'config'),S('every layer','https://arxiv.org/html/2401.04088v1#S2','§2'),S('softmax over the top-2 logits','https://arxiv.org/html/2401.04088v1#S2','§2'),
     S('aux coefficient 0.02 in the released config',HF('mistralai/Mixtral-8x7B-v0.1'),'config'),S('MegaBlocks kernels (inference); training not stated','https://arxiv.org/html/2401.04088v1#S1','§1'),null,null]},
   {n:'DeepSeek-V3',y:'Dec 2024',u:'https://arxiv.org/abs/2412.19437',c:'Fine-grained and shared experts: 8 of 256 small routed experts plus one shared, sigmoid scores, and balance from a per-expert bias nudged by γ after each step instead of a loss, with a sequence-wise f·P loss at α = 0.0001 kept "just to avoid extreme imbalance". No tokens dropped in training or inference.',cells:[
     S('8 routed + 1 shared',HF('deepseek-ai/DeepSeek-V3'),'config'),S('256 small (2,048 wide, against 18,432 dense)',HF('deepseek-ai/DeepSeek-V3'),'config'),S('all but the first 3',HF('deepseek-ai/DeepSeek-V3'),'config'),S('sigmoid, renormalised over the chosen 8',HF('deepseek-ai/DeepSeek-V3'),'config'),
     S('bias balancing (γ = 0.001) + sequence f·P, α = 0.0001','https://arxiv.org/html/2412.19437v1#S4.SS2','§4.2'),S('no token dropping','https://arxiv.org/html/2412.19437v1#S2.SS1.SSS2','§2.1.2'),S('gating kept in BF16 or FP32 under FP8 training','https://arxiv.org/html/2412.19437v1#S3.SS3','§3.3',1),null]},
   {n:'Qwen3 MoE',y:'May 2025',u:'https://arxiv.org/abs/2505.09388',c:'128 fine-grained experts with 8 active and, unlike Qwen2.5-MoE, no shared expert; the f·P loss is back as the main mechanism but computed over the global batch "to encourage expert specialization".',cells:[
     S('8',HF('Qwen/Qwen3-30B-A3B'),'config'),S('128 small (768 wide, against 6,144 dense)',HF('Qwen/Qwen3-30B-A3B'),'config'),S('every layer',HF('Qwen/Qwen3-30B-A3B'),'config'),S('top-8 gates renormalised',HF('Qwen/Qwen3-30B-A3B'),'config'),
     S('global-batch f·P loss, coefficient 0.001','https://arxiv.org/html/2505.09388v1#S2','§2'),null,null,null]}];
  // carry: a cell left null keeps the previous model's value only for display as "not stated"
  const modes={t:M.map(m=>({t:m.n+' ('+m.y+')',c:m.c}))};
  function same(a,b){return a&&b&&a.v===b.v}
  function draw(md,k,e,W){const m=M[k],sw=M[0];
    const rows=LINES.map((l,i)=>{const c=m.cells[i],s0=sw.cells[i];const diff=k>0&&c&&!c.same&&c.v!==s0.v;
      const cell=c?escH(c.v)+(c.same?' <span class="small mute">(as Switch)</span>':'')+' <a class="small" href="'+c.u+'" target="_blank" rel="noopener noreferrer">'+c.l+'</a>':'<span class="mute">not stated</span>';
      return '<tr><td>'+l+'</td><td>'+escH(s0.v)+'</td>'+(k>0?'<td style="'+(diff?'background:var(--hl);':'')+'opacity:'+(0.35+0.65*e).toFixed(2)+'">'+cell+'</td>':'')+'</tr>'});
    return '<div style="overflow-x:auto"><table class="lt"><thead><tr><th>Line</th><th>Switch (2021)</th>'+(k>0?'<th>'+(m.u?'<a href="'+m.u+'" target="_blank" rel="noopener noreferrer">'+m.n+'</a>':m.n)+' ('+m.y+')</th>':'')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'}
  function counters(md,k){if(k===0)return stat('lines','8','the Switch recipe');const m=M[k];let st=0,ch=0;m.cells.forEach((c,i)=>{if(!c)return;st++;if(!c.same&&c.v!==M[0].cells[i].v)ch++});
    let ever=new Set();for(let j=1;j<=k;j++)M[j].cells.forEach((c,i)=>{if(c&&!c.same&&c.v!==M[0].cells[i].v)ever.add(i)});
    return stat('lines this source states',st+' of 8','the rest: not stated')+stat('of those, different from Switch',ch,'highlighted')+stat('lines changed by someone, 2021 to '+m.y.slice(-4),ever.size+' of 8',8-ever.size+' never changed in these sources')}
  makeAnim({id:'thn',modes,mode:'t',draw,counters,dur:3200})})();
