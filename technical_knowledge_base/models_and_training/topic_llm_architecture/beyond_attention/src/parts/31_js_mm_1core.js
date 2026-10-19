// ---- State vs KV cache: window.MM.cache(cfg, ctx, kvBytes, stateBytes). Uses the root Config calculator (window.CC,
// included unchanged) for every model type it knows; adds kimi_linear (KDA + MLA) and qwen3_5 (Gated DeltaNet +
// gated attention), a port of cache_ext() in src/mem/statecalc.py. check_data.py compares this with Python. ----
window.MM=(function(){
  function ext(cfg,ctx,kvb,sb){const c=cfg.text_config||cfg,mt=c.model_type||'';
    if(mt==='kimi_linear'){const la=c.linear_attn_config,L=c.num_hidden_layers;
      const nf=la.full_attn_layers.filter(i=>i<=L).length,nk=L-nf,h=la.num_heads,d=la.head_dim,k=la.short_conv_kernel_size;
      const st=nk*(h*d*d+3*h*d*(k-1))*sb,kv=nf*(c.kv_lora_rank+c.qk_rope_head_dim)*ctx*kvb;return {kv,state:st,total:kv+st}}
    if(mt==='qwen3_5_text'||mt==='qwen3_5_moe_text'){const lt=c.layer_types,nf=lt.filter(x=>x==='full_attention').length,nl=lt.filter(x=>x==='linear_attention').length;
      const st=nl*(c.linear_num_value_heads*c.linear_key_head_dim*c.linear_value_head_dim+(2*c.linear_num_key_heads*c.linear_key_head_dim+c.linear_num_value_heads*c.linear_value_head_dim)*(c.linear_conv_kernel_dim-1))*sb;
      const kv=nf*2*c.num_key_value_heads*c.head_dim*ctx*kvb;return {kv,state:st,total:kv+st}}
    return null}
  const specs=new Map();
  function cache(cfg,ctx,kvb,sb){kvb=kvb||2;sb=sb||4;const e=ext(cfg,ctx,kvb,sb);if(e)return e;
    if(!specs.has(cfg))specs.set(cfg,CC.normalise(cfg));return CC.cache(specs.get(cfg),ctx,kvb,sb)}
  function cross(cfg,kvb,sb){const s=cache(cfg,1,kvb,sb).state;if(!s||!cache(cfg,1,kvb,sb).kv)return null;
    let lo=1,hi=1<<24;if(cache(cfg,hi,kvb,sb).kv<s)return null;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(cache(cfg,mid,kvb,sb).kv>=s)hi=mid;else lo=mid+1}return lo}
  return {cache,cross};
})();
