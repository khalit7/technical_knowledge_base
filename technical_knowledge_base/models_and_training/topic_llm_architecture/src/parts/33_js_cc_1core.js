// Config calculator core: a line-by-line port of src/calc/calc.py (the Python reference).
// src/calc/check_js_equals_py.mjs runs this file and calc.py on every config in src/data/configs/ and requires equal results.
window.CC=(function(){
  const g=(c,keys,def)=>{for(const k of keys){if(c[k]!==undefined&&c[k]!==null)return c[k]}return def};
  const has=(c,k)=>c[k]!==undefined&&c[k]!==null;
  function normalise(cfg){
    const top=cfg,c=cfg.text_config||cfg;
    const mt=c.model_type||top.model_type||'';
    const s={model_type:mt,notes:[],vision:!!top.vision_config};
    if(mt==='gpt2'){
      const d=c.n_embd,L=c.n_layer,nh=c.n_head,V=c.vocab_size;
      Object.assign(s,{d,V,tied:true,pos_embed:(c.n_positions||1024)*d,norm_bias:true,final_norm:d});
      const lay={mix:{t:'attn',nh,nkv:nh,hd:Math.floor(d/nh),hdv:Math.floor(d/nh),bqkv:true,bo:true,qk:0,sinks:false,gate:false,win:0},
        ffn:{t:'mlp',ff:c.n_inner||4*d,bias:true},norms:4*d};
      s.layers=Array(L).fill(lay);return s;
    }
    if(mt==='mamba2'||(has(c,'ssm_cfg')&&has(c,'d_model'))){
      const d=c.d_model,L=c.n_layer,m=c.pad_vocab_size_multiple||1;let V=c.vocab_size;
      if(V%m)V+=m-V%m;
      const sc=c.ssm_cfg||{};const ds=sc.d_state||128,hd=sc.headdim||64,di=(sc.expand||2)*d;
      const mix={t:'mamba2',nh:Math.floor(di/hd),hd,ds,ng:sc.ngroups||1,k:sc.d_conv||4,cb:sc.conv_bias!==undefined?sc.conv_bias:true,
        pb:sc.bias||false,norm:sc.rmsnorm!==undefined?sc.rmsnorm:true};
      Object.assign(s,{d,V,tied:c.tie_embeddings!==undefined?c.tie_embeddings:true,final_norm:d});
      const ff=c.d_intermediate||0;
      s.layers=Array(L).fill({mix,ffn:ff?{t:'glu',ff,bias:false}:null,norms:d*(ff?2:1)});
      s.notes.push('vocab padded to a multiple of '+m);return s;
    }
    if(mt==='mamba'){
      const d=c.hidden_size,L=c.num_hidden_layers,V=c.vocab_size;
      const di=c.intermediate_size||(c.expand||2)*d;
      let dtr=c.time_step_rank!==undefined?c.time_step_rank:'auto';if(dtr==='auto')dtr=Math.ceil(d/16);
      const mix={t:'mamba1',di,ds:c.state_size||16,k:c.conv_kernel||4,dtr,cb:c.use_conv_bias!==undefined?c.use_conv_bias:true,pb:c.use_bias||false,xn:false};
      Object.assign(s,{d,V,tied:c.tie_word_embeddings!==undefined?c.tie_word_embeddings:true,final_norm:d});
      s.layers=Array(L).fill({mix,ffn:null,norms:d});return s;
    }
    const d=c.hidden_size,L=c.num_hidden_layers,V=c.vocab_size;
    const nh=c.num_attention_heads,nkv=g(c,['num_key_value_heads'],nh);
    const hd=g(c,['head_dim','attention_head_dim'],nh?Math.floor(d/nh):0);
    const ff=c.intermediate_size;
    const gemma=mt.startsWith('gemma');
    let tied=has(c,'tie_word_embeddings')?c.tie_word_embeddings:(has(top,'tie_word_embeddings')?top.tie_word_embeddings:gemma);
    if(['gemma','gemma2','gemma3','gemma3_text'].includes(mt))tied=true;
    Object.assign(s,{d,V,tied:!!tied,final_norm:d});
    const bqkv=!!c.attention_bias||['qwen2','qwen2_moe'].includes(mt);
    const bo=!!c.attention_bias&&!['glm4_moe','qwen2','qwen2_moe'].includes(mt);
    let qk=0;
    if(['qwen3','qwen3_moe','gemma3','gemma3_text','qwen3_next'].includes(mt)||(mt==='glm4_moe'&&c.use_qk_norm))qk=2*hd;
    if(['olmo2','olmo3'].includes(mt)||(mt==='minimax_m2'&&c.use_qk_norm&&c.qk_norm_type==='per_layer'))qk=nh*hd+nkv*hd;
    let win=c.sliding_window||0;
    let lt=c.layer_types;
    if(['gemma3','gemma3_text'].includes(mt)&&!lt){const p=c.sliding_window_pattern||6;lt=[];for(let i=0;i<L;i++)lt.push((i+1)%p===0?'full_attention':'sliding_attention')}
    if(mt==='gemma2'&&!lt){lt=[];for(let i=0;i<L;i++)lt.push(i%2===0?'sliding_attention':'full_attention')}
    if(mt==='llama4_text'){
      const nrl=c.no_rope_layers||[];const ch=c.attention_chunk_size||0;lt=[];
      for(let i=0;i<L;i++)lt.push((nrl.length&&nrl[i]&&ch)?'sliding_attention':'full_attention');
      win=ch;if(ch)s.notes.push('chunked attention ('+ch+') treated as a window of '+ch+' for cache and FLOPs');
    }
    function attn(i){
      let w=0;
      if(lt){w=lt[i]==='sliding_attention'?win:0}
      else if(['mistral','mixtral','qwen2','phi3'].includes(mt)&&(c.use_sliding_window!==undefined?c.use_sliding_window:true))w=win;
      return {t:'attn',nh,nkv,hd,hdv:hd,bqkv,bo,qk,sinks:mt==='gpt_oss',gate:mt==='qwen3_next',win:w};
    }
    const full=()=>Object.assign(attn(0),{win:0});
    let norms=2*d;if(['gemma2','gemma3','gemma3_text'].includes(mt))norms=4*d;
    const dense={t:'glu',ff,bias:!!c.mlp_bias};
    const layers=[];
    if(['deepseek_v2','deepseek_v3','deepseek_v32','kimi_k2'].includes(mt)){
      const E=c.n_routed_experts,v32=mt==='deepseek_v32';
      const mla={t:'mla',nh,ql:c.q_lora_rank||0,nope:c.qk_nope_head_dim,rope:c.qk_rope_head_dim,v:c.v_head_dim,kvl:c.kv_lora_rank,
        inh:v32?(c.index_n_heads||0):0,ihd:v32?(c.index_head_dim||0):0,itop:v32?(c.index_topk||0):0};
      const moe={t:'moe',E,k:c.num_experts_per_tok,ff:c.moe_intermediate_size,sff:(c.n_shared_experts||0)*c.moe_intermediate_size,
        sgate:false,rbias:false,cbias:c.topk_method==='noaux_tc',ebias:false};
      const fk=c.first_k_dense_replace||0,fr=c.moe_layer_freq||1;
      for(let i=0;i<L;i++)layers.push({mix:mla,ffn:(i>=fk&&i%fr===0)?moe:dense,norms});
      s.mtp=c.num_nextn_predict_layers||0;s.mtp_copy=true;s.layers=layers;return s;
    }
    if(mt==='nemotron_h'){
      const m2={t:'mamba2',nh:c.mamba_num_heads,hd:c.mamba_head_dim,ds:c.ssm_state_size,ng:c.n_groups,k:c.conv_kernel,
        cb:c.use_conv_bias!==undefined?c.use_conv_bias:true,pb:c.mamba_proj_bias||false,norm:true};
      for(const ch of c.hybrid_override_pattern){
        if(ch==='M')layers.push({mix:m2,ffn:null,norms:d});
        else if(ch==='*')layers.push({mix:full(),ffn:null,norms:d});
        else if(ch==='-')layers.push({mix:null,ffn:{t:'mlp',ff,bias:!!c.mlp_bias},norms:d});
      }
      s.layers=layers;return s;
    }
    if(mt==='granitemoehybrid'){
      const m2={t:'mamba2',nh:c.mamba_n_heads,hd:c.mamba_d_head,ds:c.mamba_d_state,ng:c.mamba_n_groups,k:c.mamba_d_conv,
        cb:c.mamba_conv_bias!==undefined?c.mamba_conv_bias:true,pb:c.mamba_proj_bias||false,norm:true};
      const E=c.num_local_experts||0;
      const f=E?{t:'moe',E,k:c.num_experts_per_tok,ff,sff:c.shared_intermediate_size||0,sgate:false,rbias:false,cbias:false,ebias:false}
        :{t:'glu',ff:c.shared_intermediate_size||0,bias:false};
      for(const t of c.layer_types)layers.push({mix:t==='mamba'?m2:full(),ffn:f,norms:2*d});
      s.layers=layers;return s;
    }
    if(mt==='jamba'){
      const di=(c.mamba_expand||2)*d;let dtr=c.mamba_dt_rank!==undefined?c.mamba_dt_rank:'auto';if(dtr==='auto')dtr=Math.ceil(d/16);
      const m1={t:'mamba1',di,ds:c.mamba_d_state,k:c.mamba_d_conv,dtr,cb:c.mamba_conv_bias!==undefined?c.mamba_conv_bias:true,pb:c.mamba_proj_bias||false,xn:true};
      const moe={t:'moe',E:c.num_experts,k:c.num_experts_per_tok,ff,sff:0,sgate:false,rbias:false,cbias:false,ebias:false};
      const ap=c.attn_layer_period||8,ao=c.attn_layer_offset!==undefined?c.attn_layer_offset:4;
      const ep=c.expert_layer_period||2,eo=c.expert_layer_offset!==undefined?c.expert_layer_offset:1;
      for(let i=0;i<L;i++)layers.push({mix:i%ap===ao?full():m1,ffn:i%ep===eo?moe:dense,norms:2*d});
      s.layers=layers;return s;
    }
    if(mt==='falcon_h1'){
      const di=c.mamba_d_ssm||c.mamba_expand*d;
      const m2={t:'mamba2',nh:c.mamba_n_heads,hd:Math.floor(di/c.mamba_n_heads),ds:c.mamba_d_state,ng:c.mamba_n_groups,k:c.mamba_d_conv,
        cb:c.mamba_conv_bias!==undefined?c.mamba_conv_bias:true,pb:c.mamba_proj_bias||false,norm:!!c.mamba_rms_norm};
      const a=full();
      for(let i=0;i<L;i++)layers.push({mix:a,mix2:m2,ffn:dense,norms:2*d});
      s.layers=layers;return s;
    }
    if(mt==='qwen3_next'){
      const gdn={t:'gdn',nk:c.linear_num_key_heads,nv:c.linear_num_value_heads,dk:c.linear_key_head_dim,dv:c.linear_value_head_dim,k:c.linear_conv_kernel_dim};
      const fi=c.full_attention_interval||4;
      let l2=c.layer_types;if(!l2){l2=[];for(let i=0;i<L;i++)l2.push((i+1)%fi===0?'full_attention':'linear_attention')}
      const moe={t:'moe',E:c.num_experts,k:c.num_experts_per_tok,ff:c.moe_intermediate_size,sff:c.shared_expert_intermediate_size||0,
        sgate:true,rbias:false,cbias:false,ebias:false};
      for(let i=0;i<L;i++)layers.push({mix:l2[i]==='full_attention'?full():gdn,ffn:moe,norms});
      s.layers=layers;s.mtp=has(c,'mtp_num_hidden_layers')?c.mtp_num_hidden_layers:1;s.mtp_copy=false;return s;
    }
    let moe=null;
    if(['mixtral','qwen3_moe','qwen2_moe','gpt_oss','llama4_text','minimax_m2','glm4_moe'].includes(mt)){
      const E=g(c,['num_local_experts','num_experts','n_routed_experts']);
      const k=g(c,['num_experts_per_tok','experts_per_token']);
      const eff=c.moe_intermediate_size||ff;let sff=0;
      if(mt==='llama4_text')sff=ff;
      if(mt==='glm4_moe')sff=(c.n_shared_experts||0)*eff;
      if(mt==='qwen2_moe')sff=c.shared_expert_intermediate_size||0;
      moe={t:'moe',E,k,ff:eff,sff,sgate:mt==='qwen2_moe',rbias:mt==='gpt_oss',cbias:['minimax_m2','glm4_moe'].includes(mt),ebias:mt==='gpt_oss'};
    }
    for(let i=0;i<L;i++){
      let f=dense;
      if(moe){
        if(['qwen3_moe','qwen2_moe'].includes(mt)){const st=c.decoder_sparse_step||1;f=(!(c.mlp_only_layers||[]).includes(i)&&(i+1)%st===0)?moe:dense}
        else if(mt==='llama4_text'){let ml=c.moe_layers;if(ml===undefined||ml===null){const st=c.interleave_moe_layer_step||1;ml=[];for(let j=st-1;j<L;j+=st)ml.push(j)}
          f=ml.includes(i)?moe:{t:'glu',ff:has(c,'intermediate_size_mlp')?c.intermediate_size_mlp:ff,bias:false}}
        else if(mt==='glm4_moe')f=i>=(c.first_k_dense_replace||0)?moe:dense;
        else f=moe;
      }
      layers.push({mix:attn(i),ffn:f,norms});
    }
    s.layers=layers;
    if(mt==='glm4_moe'){s.mtp=c.num_nextn_predict_layers||0;s.mtp_copy=true}
    if(mt==='minimax_m2'&&c.use_mtp)s.notes.push('MTP modules (num_mtp_modules='+c.num_mtp_modules+') are not in the released weights');
    if(['gemma','gemma2','gemma3','gemma3_text'].includes(mt))s.notes.push('tied embeddings (Gemma always ties)');
    s.norm_bias=false;
    return s;
  }
  function mixerParams(m,d){
    if(!m)return [0,0];
    if(m.t==='attn'){
      const q=d*m.nh*m.hd*(m.gate?2:1),kv=2*d*m.nkv*m.hd,o=m.nh*m.hdv*d;
      const oth=(m.bqkv?m.nh*m.hd*(m.gate?2:1)+2*m.nkv*m.hd:0)+(m.bo?d:0)+m.qk+(m.sinks?m.nh:0);
      return [q+kv+o,oth];
    }
    if(m.t==='mla'){
      const nh=m.nh,qh=m.nope+m.rope;let q,oth;
      if(m.ql){q=d*m.ql+m.ql*nh*qh;oth=m.ql}else{q=d*nh*qh;oth=0}
      const kv=d*(m.kvl+m.rope)+m.kvl*nh*(m.nope+m.v);oth+=m.kvl;
      const o=nh*m.v*d;let mm=q+kv+o;
      if(m.inh){mm+=(m.ql||d)*m.inh*m.ihd+d*m.ihd+d*m.inh;oth+=2*m.ihd}
      return [mm,oth];
    }
    if(m.t==='mamba2'){
      const di=m.nh*m.hd,gs=2*m.ng*m.ds;const inp=d*(2*di+gs+m.nh),out=di*d;const cd=di+gs;
      let oth=cd*m.k+(m.cb?cd:0)+3*m.nh+(m.norm?di:0);if(m.pb)oth+=2*di+gs+m.nh+d;
      return [inp+out,oth];
    }
    if(m.t==='mamba1'){
      const di=m.di,ds=m.ds,r=m.dtr;const mm=d*2*di+di*(r+2*ds)+r*di+di*d;
      let oth=di*m.k+(m.cb?di:0)+di+di*ds+di;if(m.pb)oth+=2*di+d;if(m.xn)oth+=r+2*ds;
      return [mm,oth];
    }
    if(m.t==='gdn'){
      const kd=m.nk*m.dk,vd=m.nv*m.dv;const mm=d*(2*kd+2*vd)+d*2*m.nv+vd*d;
      return [mm,(2*kd+vd)*m.k+2*m.nv+m.dv];
    }
    throw new Error('unknown mixer '+m.t);
  }
  function ffnParams(f,d){
    const r={dense:0,dense_o:0,routed:0,routed_o:0,shared:0,router:0,moe_o:0};
    if(!f)return r;
    if(f.t==='glu'){r.dense=3*d*f.ff;r.dense_o=f.bias?2*f.ff+d:0}
    else if(f.t==='mlp'){r.dense=2*d*f.ff;r.dense_o=f.bias?f.ff+d:0}
    else{const E=f.E;r.routed=E*3*d*f.ff;r.routed_o=f.ebias?E*(2*f.ff+d):0;r.shared=3*d*f.sff+(f.sgate?d:0);r.router=d*E;r.moe_o=(f.rbias?E:0)+(f.cbias?E:0)}
    return r;
  }
  const sumv=o=>Object.values(o).reduce((a,b)=>a+b,0);
  function params(spec){
    const d=spec.d,V=spec.V;
    const b={embedding:V*d+(spec.pos_embed||0),unembedding:spec.tied?0:V*d,attention:0,ssm:0,ffn_dense:0,moe_routed:0,moe_shared:0,router:0,
      norms:(spec.final_norm!==undefined?spec.final_norm:d)*(spec.norm_bias?2:1),biases_other:0};
    let actR=0,mm=0;
    for(const lay of spec.layers){
      b.norms+=lay.norms;
      for(const key of ['mix','mix2']){const m=lay[key];if(!m)continue;const [w,o]=mixerParams(m,d);
        if(m.t==='attn'||m.t==='mla')b.attention+=w+o;else b.ssm+=w+o;mm+=w}
      const f=ffnParams(lay.ffn,d);
      b.ffn_dense+=f.dense+f.dense_o;b.moe_routed+=f.routed+f.routed_o;b.moe_shared+=f.shared;b.router+=f.router+f.moe_o;
      mm+=f.dense+f.shared+f.router;
      if(lay.ffn&&lay.ffn.t==='moe'){const per=(f.routed+f.routed_o)/lay.ffn.E;actR+=per*lay.ffn.k;mm+=3*d*lay.ffn.ff*lay.ffn.k}
    }
    const total=sumv(b);const active=Math.round(total-b.moe_routed+actR);
    mm+=V*d;
    let mtp=0;
    if(spec.mtp){const last=spec.layers[spec.layers.length-1];const [w,o]=mixerParams(last.mix,d);const f=ffnParams(last.ffn,d);
      const one=w+o+sumv(f)+last.norms+2*d*d+3*d;mtp=spec.mtp*(one+(spec.mtp_copy?2*V*d:0))}
    return {breakdown:b,total,active,active_no_emb:active-b.embedding,active_no_emb_head:active-b.embedding-b.unembedding,matmul_active:Math.round(mm),mtp};
  }
  function attnCoef(m,mode){
    if(m.t==='attn')return 2*m.nh*(m.hd+m.hdv);
    if(m.t==='mla')return mode==='decode'?2*m.nh*(m.kvl+m.rope+m.kvl):2*m.nh*(m.nope+m.rope+m.v);
    return 0;
  }
  function stateFlops(m){
    if(m.t==='mamba2'){const di=m.nh*m.hd;return 6*di*m.ds+2*(di+2*m.ng*m.ds)*m.k}
    if(m.t==='mamba1')return 6*m.di*m.ds+2*m.di*m.k;
    if(m.t==='gdn')return 8*m.nv*m.dk*m.dv+2*(2*m.nk*m.dk+m.nv*m.dv)*m.k;
    return 0;
  }
  function span(m,L){if(m.t==='attn'&&m.win)return Math.min(L,m.win);if(m.t==='mla'&&m.itop)return Math.min(L,m.itop);return L}
  function sumSpan(m,S){const cap=(m.t==='attn'?m.win:m.t==='mla'?m.itop:0)||0;if(!cap||S<=cap)return S*(S+1)/2;return cap*(cap+1)/2+(S-cap)*cap}
  function flops(spec,ctx,p){
    p=p||params(spec);const dense=2*p.matmul_active;let dec=0,pre=0,st=0;
    for(const lay of spec.layers)for(const key of ['mix','mix2']){const m=lay[key];if(!m)continue;
      if(m.t==='attn'||m.t==='mla'){dec+=attnCoef(m,'decode')*span(m,ctx);pre+=attnCoef(m,'prefill')*sumSpan(m,ctx)/ctx;
        if(m.t==='mla'&&m.inh){dec+=2*m.inh*m.ihd*ctx;pre+=2*m.inh*m.ihd*(ctx+1)/2}}
      else st+=stateFlops(m)}
    return {weights:dense,decode_attn:dec,prefill_attn:pre,state:st,decode:dense+dec+st,prefill:dense+pre+st};
  }
  function cache(spec,ctx,kvb,sb){
    kvb=kvb===undefined?2:kvb;sb=sb===undefined?4:sb;let kv=0,st=0;
    for(const lay of spec.layers)for(const key of ['mix','mix2']){const m=lay[key];if(!m)continue;
      if(m.t==='attn')kv+=2*m.nkv*m.hd*span(m,ctx)*kvb;
      else if(m.t==='mla')kv+=(m.kvl+m.rope+m.ihd)*ctx*kvb;
      else if(m.t==='mamba2'){const di=m.nh*m.hd;st+=(di*m.ds+(di+2*m.ng*m.ds)*(m.k-1))*sb}
      else if(m.t==='mamba1')st+=(m.di*m.ds+m.di*(m.k-1))*sb;
      else if(m.t==='gdn')st+=(m.nv*m.dk*m.dv+(2*m.nk*m.dk+m.nv*m.dv)*(m.k-1))*sb}
    return {kv,state:st,total:kv+st};
  }
  return {normalise,params,flops,cache,mixerParams,ffnParams};
})();
