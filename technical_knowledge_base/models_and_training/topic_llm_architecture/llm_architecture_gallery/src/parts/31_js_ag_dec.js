// ---- Decode a config tab: the fields read, what they set, the arithmetic, and a layer-by-layer animation ----
(function(){
  const G=window.AG;if(!G||!document.getElementById('dc-sel'))return;
  const {rows,by,$,fmt,fmtB,esc,A}=G;const T=131072;
  const ROLE=[[/^(num_hidden_layers|n_layer|num_layers|n_layers|num_blocks)$/,'number of layers'],
    [/^(layer_types|layers_block_type|hybrid_override_pattern|attn_type_list|linear_attn_config|hybrid_layer_pattern|gqa_layers|local_layer_ids|sliding_window_pattern|sliding_window_period|full_attention_interval|global_attn_every_n|layer_group_size|compress_ratios|architectures|model_type|no_rope_layers|attention_chunk_size)$/,'mixer strip'],
    [/^(index_|indexer_)/,'trained sparse (indexer)'],
    [/^(num_key_value_heads|num_kv_heads|num_attention_groups|head_dim|attention_head_dim|kv_lora_rank|qk_rope_head_dim|qk_nope_head_dim|global_head_dim|num_global_key_value_heads|attention_k_eq_v|v_head_dim|swa_)/,'cache per layer'],
    [/^(num_attention_heads|n_head|num_heads|hidden_size|n_embd|d_model)$/,'shape'],
    [/^(sliding_window|sliding_window_size)$/,'window'],
    [/^(linear_|mamba_|ssm_state_size)/,'recurrent state'],
    [/(expert|moe|mlp_|first_k_dense|dense|top_k|topk|share_expert)/,'FFN strip, experts'],
    [/(rope|rotary|nope|position_embedding|d_rel|use_rope)/,'position strip'],
    [/^num_kv_shared_layers$/,'cross-layer KV sharing'],[/^(total_ut_steps|num_loops)$/,'looped passes'],
    [/(intermediate_size|ffn_hidden_size|hidden_dim)/,'FFN width'],[/./,'size and context']];
  const role=k=>ROLE.find(x=>x[0].test(k))[1];
  const sel=$('dc-sel');
  const groups=[['2026','Released in 2026'],['2025','Released in 2025'],['2024','2024 and earlier'],['x','Not in the gallery']];
  const key=r=>r.x?'x':r.dt>='2026'?'2026':r.dt>='2025'?'2025':'2024';
  const list=rows.slice().sort((a,b)=>a.n.toLowerCase()<b.n.toLowerCase()?-1:1);
  sel.innerHTML=groups.map(g=>'<optgroup label="'+g[1]+'">'+list.filter(r=>key(r)===g[0]).map(r=>'<option value="'+esc(r.n)+'">'+esc(r.n)+(r.mix?'':' (no config)')+'</option>').join('')+'</optgroup>').join('');
  const order=[...sel.options].map(o=>o.value);
  let cur='Gemma 3 27B',anim=null;
  function val(v){const s=JSON.stringify(v);return s.length>1200?s.slice(0,1200)+' …':s}
  function card(r){const f=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':'';
    return '<h3>'+esc(r.n)+'</h3><div class="small mute">'+esc(r.co||'')+' · released '+r.dt+' <span class="ag-lab gal">gallery</span></div><dl class="kv">'+
      f('Scale',esc(r.sc||''))+f('Attention',esc(r.att||''))+f('Layer mix',esc(r.mixg||''))+f('Context',esc(r.cx||''))+f('Licence',esc(r.lic||''))+f('KV per token (card)',esc(r.galtxt||''))+
      f('Links',[r.cfg?A(r.cfg,r.nest==='params.json'?'params.json':'config.json'):'',r.tr?A(r.tr,'technical report'):''].filter(Boolean).join(' · '))+'</dl>'+(r.xn?'<p class="small mute">'+esc(r.xn)+'</p>':'')}
  function out(r){
    if(!r.mix)return '<div class="ag-box ag-bunc"><div class="t">No config this page can read</div>'+esc(r.why||'')+'. The gallery\'s card says '+esc(r.galtxt||'nothing')+' per token.</div>';
    let h='<div class="dc-lab">The three strips (layer 0 on the left)</div><div class="dc-big">'+G.strips(r)+'</div><div class="ag-leg">'+G.legend()+'</div>';
    const cnt={};[...r.mix].forEach(c=>cnt[c]=(cnt[c]||0)+1);
    h+='<p class="small">'+Object.keys(cnt).map(c=>'<b>'+cnt[c]+'</b> '+G.MIXN[c]).join(', ')+'.</p>';
    if(r.kv){const x=G.explain(r);
      h+='<div class="dc-lab">KV cache per token, bf16, every growing layer at full cost</div><div class="tw"><table class="dc-ar"><thead><tr><th>Layer kind</th><th class="num">Layers</th><th>Per layer, per token</th><th class="num">Subtotal</th></tr></thead><tbody>'+
        x.lines.map(l=>'<tr><td>'+G.MIXN[l.c]+'</td><td class="num">'+l.n+'</td><td class="small">'+esc(l.ph)+' = '+fmt(l.per)+' B</td><td class="num">'+fmt(l.sub)+' B</td></tr>').join('')+
        ((r.passes||1)>1?'<tr><td colspan="3">× '+r.passes+' looped passes, each with its own cache</td><td></td></tr>':'')+
        '<tr><td colspan="3"><b>Total</b>'+(r.shared?' (the last '+r.shared+' layers reuse earlier caches and add nothing)':'')+'</td><td class="num"><b>'+fmt(x.total)+' B = '+fmtB(x.total)+'</b></td></tr></tbody></table></div>';
      h+='<p class="small">Gallery card: '+esc(r.galtxt||'not listed')+' · '+G.statusTxt(r)+'</p>';
      if(r.status==='differs')h+='<div class="ag-box '+(r.kind==='conv'?'ag-bchk':'ag-bcorr')+'"><div class="t">'+(r.kind==='conv'?'A convention, not an error':'Correction')+'</div>The gallery\'s figure reconstructs as '+esc(r.galhow)+' = '+fmt(r.galbytes)+' bytes. '+esc(r.why)+'</div>';
      if(r.idx)h+='<p class="small">Trained-sparse indexer keys, a second growing cache: '+r.mix.split('').filter(c=>c==='D').length+' layers × '+fmt(r.idx/r.mix.split('').filter(c=>c==='D').length)+' B = '+fmtB(r.idx)+' per token'+(r.galidx?' (included in the gallery\'s figure).':' (not in the gallery\'s figure for this model).')+'</p>';
      const sb=G.stateB(r);
      h+='<div class="out">'+G.stat('One request at 131,072 tokens',fmtB(G.cache(r,T,false)+G.idxAt(r,T)),'every layer at full cost')+G.stat('With windows credited',fmtB(G.cache(r,T,true)+G.idxAt(r,T)),r.W?'window '+fmt(r.W)+' tokens':'no windowed layers')+(sb?G.stat('Plus fixed state',fmtB(sb),'FP32, matrix state only'):'')+'</div>';
    }else if(r.kvc){const k=r.kvc;
      h+='<div class="ag-box ag-bchk"><div class="t">Compressed caches: rebuilt in the gallery\'s convention</div>'+k.csa+' layers compress 4 tokens into one 512-number entry (CSA), '+k.hca+' compress 128 (HCA)'+(k.win?', '+k.win+' keep only their '+k.W+'-token window':'')+': '+k.csa+' × 512 × 2 / 4 + '+k.hca+' × 512 × 2 / 128 = '+fmt(k.main)+' B = '+fmtB(k.main)+' per token, against the card\'s '+esc(r.galtxt)+'. Left out, as the gallery does: indexer keys ('+fmt(k.idx)+' B per token) and every layer\'s bounded '+k.W+'-token window. This page\'s strips mark these layers as trained sparse.</div>';
    }else h+='<div class="ag-box ag-bunc"><div class="t">'+(r.kvnote?'Cache not rebuilt':'No growing cache')+'</div>'+esc(r.kvnote||'Every layer is recurrent: the state is fixed whatever the context. The gallery lists '+(r.galtxt||'0 B')+'.')+'</div>';
    const pre=r.ffn.length-r.ffn.replace(/^d+/,'').length;
    h+='<div class="dc-lab">Experts and position</div><p class="small">'+(r.E?r.E+' routed experts, '+(r.k||'?')+' per token'+(r.sh?', '+r.sh+' shared':', no shared expert')+(pre?(pre>1?', first '+pre+' layers dense':', first layer dense'):'')+(r.dffe?', expert width '+fmt(r.dffe):'')+'.':'Dense FFN in every layer.')+' '+
      (r.theta?'RoPE base '+(typeof r.theta==='number'?fmt(r.theta):esc(r.theta))+(r.scale?', scaling '+esc(r.scale):'')+'. ':'')+
      ((r.pos.match(/N/g)||[]).length?(r.pos.match(/N/g)||[]).length+' layers with no positional encoding. ':'')+((r.pos.match(/P/g)||[]).length&&!r.dc?(r.pos.match(/P/g)||[]).length+' layers with partial RoPE. ':'')+'</p>';
    if(r.note)h+='<p class="small mute">'+esc(r.note)+'.</p>';
    return h}
  function json(r){if(!r.fields)return '<span class="mute">No saved config.</span>';
    return '{\n'+Object.keys(r.fields).map(k=>'  <span class="k">"'+esc(k)+'"</span>: '+esc(val(r.fields[k]))+'<span class="r">sets: '+role(k)+'</span>').join('')+'}'}
  // layer-by-layer accumulation, card convention against windows credited at 131,072 tokens
  function setAnim(r){const ok=!!(r.mix&&r.kv);const n=ok?G.own(r)+1:1;
    const per=i=>r.per[r.mix[i]]||0,cred=i=>{const c=r.mix[i];return per(i)*(c==='S'&&r.W?Math.min(T,r.W)/T:1)};
    function draw(s){const svg=$('dc-anSvg');if(!ok){svg.innerHTML='';$('dc-anT').textContent='Nothing to accumulate';$('dc-anP').textContent=r.mix?'This model\'s cache is not rebuilt layer by layer (compressed or recurrent).':'No config.';$('dc-anC').innerHTML='';return}
      const W=G.width(svg),L=r.L,cw=(W-20)/L,h=72;let a=0,b=0;for(let i=0;i<s;i++){a+=per(i);b+=cred(i)}
      const full=G.explain(r).total/(r.passes||1);let q='';
      for(let i=0;i<L;i++){const c=r.mix[i],on=i<s,cls={G:'var(--c1)',S:'var(--c6)',M:'var(--c3)',D:'var(--c4)',L:'var(--c5)',H:'var(--c2)',F:'var(--dim)'}[c];
        q+='<rect x="'+(10+i*cw).toFixed(1)+'" y="4" width="'+Math.max(1,cw-1).toFixed(1)+'" height="14" fill="'+cls+'" opacity="'+(on?1:.18)+'"/>'}
      const bw=W-20;q+='<rect x="10" y="30" width="'+bw+'" height="12" rx="2" fill="var(--soft)"/><rect x="10" y="30" width="'+(bw*a/full).toFixed(1)+'" height="12" rx="2" fill="var(--acc)"/>';
      q+='<rect x="10" y="52" width="'+bw+'" height="12" rx="2" fill="var(--soft)"/><rect x="10" y="52" width="'+Math.max(0,bw*b/full).toFixed(1)+'" height="12" rx="2" fill="var(--c6)"/>';
      svg.innerHTML='<svg viewBox="0 0 '+W+' '+h+'" width="'+W+'" height="'+h+'" role="img" aria-label="Cache accumulated over the first '+s+' layers">'+q+'</svg>';
      const i=s-1,c=i>=0?r.mix[i]:null;
      $('dc-anT').textContent=s===0?'Before layer 0':'Layer '+i+': '+G.MIXN[c];
      $('dc-anP').innerHTML=s===0?'Nothing stored yet. Press play to walk the '+(n-1)+' layers that can keep a cache.':(per(i)?'Keeps '+fmt(per(i))+' bytes per token ('+esc((r.ph||{})[c]||'')+')'+(c==='S'&&r.W?'; at 131,072 tokens it holds only its last '+fmt(r.W)+', so on average '+fmt(cred(i),1)+' bytes per token.':'.'):'Adds nothing that grows with context'+(c==='L'||c==='H'?' (a fixed state instead).':'.'));
      $('dc-anC').innerHTML=G.stat('Card convention, so far',fmtB(a*(r.passes||1)),'blue bar')+G.stat('Windows credited at 131,072, so far',fmtB(b*(r.passes||1)),'teal bar')+G.stat('Layers walked',s+' of '+(n-1),'')}
    if(!anim)anim=G.anim({card:'dc-an',ctl:'dc-anCtl',n,draw:i=>curDraw(i),ms:Math.max(60,Math.min(500,9000/n)),tab:'t-dec',label:'Layer'});
    curDraw=draw;anim.reset(n)}
  let curDraw=()=>{};
  function show(n){const r=by[n];if(!r)return;cur=n;sel.value=n;
    $('dc-card').innerHTML=card(r);$('dc-json').innerHTML=json(r);
    $('dc-src').innerHTML=r.repo?'Read from '+esc(r.repo)+(r.nest?' (inside '+esc(r.nest)+')':'')+'.':'';
    $('dc-out').innerHTML=out(r);pred();setAnim(r)}
  function pred(){const on=$('dc-pred').checked;$('dc-outwrap').classList.toggle('dc-hide',on);
    $('dc-rev').innerHTML=on?'<button id="dc-revb">Reveal the decoding</button>':'';if(on)$('dc-revb').addEventListener('click',()=>{$('dc-pred').checked=false;pred()})}
  sel.addEventListener('change',()=>show(sel.value));
  $('dc-prev').addEventListener('click',()=>show(order[(order.indexOf(cur)-1+order.length)%order.length]));
  $('dc-next').addEventListener('click',()=>show(order[(order.indexOf(cur)+1)%order.length]));
  $('dc-pred').addEventListener('change',pred);
  window.AGDEC={open(n){const b=document.querySelector('#tabs button[data-t="t-dec"]');if(b)b.click();show(n);$('tabs').scrollIntoView({block:'start'})}};
  show(cur);G.drills($('t-dec'));
  G.onTab('t-dec',()=>{if(anim)anim.redraw()});
  let rw=0;addEventListener('resize',()=>{const w=$('dc-anSvg').clientWidth;if(!$('t-dec').hidden&&w&&Math.abs(w-rw)>30){rw=w;if(anim)anim.redraw()}});
})();
