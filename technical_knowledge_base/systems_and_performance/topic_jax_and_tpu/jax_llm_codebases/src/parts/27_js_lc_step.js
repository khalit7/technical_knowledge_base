// ---- Reading section 4 (moved from the One train step tab, 2026-10-23): MaxText's traced train step, stage by stage, against the running example ----
(function(){
  const U=LCU,esc=U.esc,$=id=>document.getElementById(id),T=LC.train,FN=T.s0.fns;
  const GHM='https://github.com/AI-Hypercomputer/maxtext/blob/1a95d1e5371021aab8d0574c53d2cca425474318/src/maxtext/';
  // stages: functions (by recorded name) that belong to each, what happens, and the running example's counterpart
  const S=[
    {fns:['train_step','HyperParameters.__getattr__'],re:['re_make_train_step','def train_step(params, opt_state, x, y):  a plain function of arrays']},
    {fns:['train_step.<locals>.diff_wrapper'],re:['re_value_and_grad','loss, grads = jax.value_and_grad(loss_fn)(params, x, y, cfg)']},
    {fns:['loss_fn','is_native'],re:['re_loss_fn','def loss_fn(params, x, y, cfg)']},
    {fns:['Transformer.__call__','NNXDecoder.__call__','NNXDecoder.get_remat_policy'],re:['re_apply','def apply(params, idx, cfg)']},
    {fns:['NNXDecoder._apply_embedding','NNXDecoder.embed_tokens','Embed.__call__','_maybe_move_embedding_to_device','logical_to_mesh_axes','logical_to_mesh_axes.<locals>.<genexpr>','logical_to_spec','logical_to_spec.<locals>.<genexpr>','_mesh_axes_free','remove_size_one_mesh_axis','remove_size_one_mesh_axis.<locals>.<genexpr>','get_functions'],re:['re_emb','x = params["tok_emb"][idx] + params["pos_emb"][:T]']},
    {fns:['NNXDecoder._apply_layers_sequentially','should_prevent_cse_in_remat','NNXDecoder._apply_layers_sequentially.<locals>.<lambda>','nnx_ensure_scan_leading_axis','nnx_ensure_scan_leading_axis.<locals>.<lambda>','nnx_ensure_scan_leading_axis.<locals>._op','NNXDecoder._apply_layers_sequentially.<locals>.layer_fn','nnx_remove_scan_axis','nnx_remove_scan_axis.<locals>.<lambda>','nnx_remove_scan_axis.<locals>._op','nnx_update_sharding_meta','nnx_remove_scan_axis.<locals>._op.<locals>.remove_fn','hoist_fsdp_weight_gather'],re:['re_apply','for p in params["blocks"]: x = block(p, x, cfg)   (a Python loop: traced four times)']},
    {fns:['Gpt3DecoderLayer.__call__','maybe_shard_with_logical','create_sharding','get_logical_axis_rules','maybe_shard_with_name','truncate_out_sharding','_compat_wsc'],re:['re_block','def block(p, x, cfg)']},
    {fns:['Gpt3LayerNorm.__call__'],re:['re_layer_norm','def layer_norm(p, x, eps)']},
    {fns:['Gpt3MultiHeadAttention.__call__','Gpt3MultiHeadAttention.projection','DenseGeneral.__call__','normalize_axes','normalize_axes.<locals>.<genexpr>','in_serve_mode','is_fp8_dtype','DenseGeneral._maybe_two_stage_all_gather','DenseGeneral.quant_dot_general','_compute_dot_general_nnx','_align_bias_with_output'],re:['re_linear','def linear(p, x): return x @ p["w"] + p["b"]']},
    {fns:['AttentionOp.__call__','AttentionOp.apply_attention','AttentionOp.check_attention_inputs','AttentionOp._context_parallel_size','AttentionOp._logical_to_mesh_axes','is_context_parallel_ulysses_requested','is_context_parallel_usp_requested','AttentionOp.apply_attention_dot','validate_compute_axis_order','AttentionOp.is_partition_in_decode','AttentionOp.qk_product','AttentionOp.generate_attention_mask','AttentionOp._maybe_shard_with_pspec','maybe_shard_with_pspec','apply_mask_to_logits','AttentionOp.compute_local_attention','AttentionOp.wv_product'],re:['re_softmax','a = jax.nn.softmax(s, axis=-1) @ v']},
    {fns:['MlpBlock.__call__','_convert_to_activation_function'],re:['re_gelu','jax.nn.gelu(linear(p["fc1"], x), approximate=False)']},
    {fns:['nnx_add_and_sync_scan_axis','nnx_add_and_sync_scan_axis.<locals>.<lambda>','nnx_add_and_sync_scan_axis.<locals>._op','NNXDecoder._reduce_mhc_streams','NNXDecoder.apply_output_head','NNXDecoder.apply_decoder_norm'],re:['re_head','return layer_norm(params["ln_f"], x, ...) @ params["head"]["w"]']},
    {fns:['finalize_deferred_intermediates','_cross_entropy_with_logits_fwd','_cross_entropy_with_logits_bwd'],re:['re_loss_fn','optax.softmax_cross_entropy_with_integer_labels(logits, y).mean()']},
    {fns:['train_step.<locals>.<lambda>','apply_gradient_clipping'],re:['re_clip','optax.clip_by_global_norm(cfg["clip"])  (first link of the chain)']},
    {fns:['TrainStateNNX.apply_gradients','_get_path_mask_fn.<locals>.mask_fn','_get_path_mask_fn.<locals>.mask_fn.<locals>._is_masked','_get_path_mask_fn.<locals>.mask_fn.<locals>._is_masked.<locals>.<genexpr>','create_learning_rate_schedule.<locals>.make_cos_schedule.<locals>.schedule'],re:['re_tx_update','updates, opt_state = tx.update(grads, opt_state, params); params = optax.apply_updates(params, updates)']},
    {fns:['l2norm_pytree','l2norm_pytree.<locals>.<lambda>'],re:['re_apply_updates','return params, opt_state, loss, optax.global_norm(grads)']},
    {fns:[],re:['re_jit','return jax.jit(train_step, donate_argnums=(0, 1))']}];
  // where each stage ends in the recorded order: cumulative distinct MaxText functions entered
  S.forEach(s=>{s.ix=FN.map((f,k)=>s.fns.includes(f[1])?k:-1).filter(i=>i>=0);s.upto=s.ix.length?Math.max(...s.ix)+1:FN.length});
  const covered=new Set([].concat(...S.map(s=>s.ix)));
  // the 17 stages are shown in 8 explained stretches (the long-replay rule: at most about 8 steps), one item each in #sx-st0
  const GR=[[0,1,2],[3,4],[5],[6,7,8],[9,10],[11,12],[13,14,15],[16]];
  const N1=3;
  const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  set('lc-v-st0-wall',T.s0.wall.toFixed(2));set('lc-v-st0-cpu',T.s0.cpu.toFixed(1));set('lc-v-st1-flax',U.num(T.s1.calls.flax||0));set('lc-v-st1-jax',U.num(T.s1.calls.jax||0));
  set('lc-v-st1-wall',T.s1.wall.toFixed(3));set('lc-v-st1-tot',U.num(sum(T.s1.calls)));set('lc-v-st0-tot',U.num(sum(T.s0.calls)));
  let mode='s0';
  const tot0=Object.values(T.s0.calls).reduce((a,b)=>a+b,0);
  function stack(i){
    const g=mode==='s0'?GR[i]:[];let cur=new Set([].concat(...g.map(j=>S[j].ix))),done=mode==='s0'?Math.max(...g.map(j=>S[j].upto)):0;
    const minD=Math.min(...FN.map(f=>f[3]));
    $('st-stack').innerHTML=FN.map((f,k)=>{const cls=mode==='s1'?'off':(cur.has(k)?'on':(k<done?'done':''));
      return '<div class="st-fn '+cls+'" style="padding-left:'+((f[3]-minD)*0.45).toFixed(2)+'em" title="'+esc(f[0]+':'+f[2])+'"><a href="'+GHM+f[0]+'#L'+f[2]+'" target="_blank" rel="noopener noreferrer">'+esc(f[1])+'</a> <span class="mute">'+esc(f[0].split('/').pop())+':'+f[2]+'</span></div>'}).join('');
    const on=$('st-stack').querySelector('.st-fn.on');if(on){const box=$('st-stack');box.scrollTop=Math.max(0,on.offsetTop-box.offsetTop-60)}
  }
  function draw(i){
    stack(i);
    if(mode==='s0'){const g=GR[i],seen=new Set(),lines=g.map(j=>S[j].re).filter(r=>!seen.has(r[1])&&seen.add(r[1]));
      $('st-re').innerHTML='<div class="small mute">The running example\'s step does the same here:</div>'+lines.map(r=>'<pre>'+esc(r[1])+'</pre><div class="small">'+U.ref(r[0])+'</div>').join('');
      const upto=Math.max(...g.map(j=>S[j].upto));
      $('st-cnt').innerHTML=RD.stat('MaxText functions entered',String(i===GR.length-1?FN.length:upto),'of '+FN.length+' in step 0')+RD.stat('Python calls, whole step',U.num(tot0),'MaxText '+U.num(T.s0.calls.maxtext)+', JAX '+U.num(T.s0.calls.jax)+', Flax '+U.num(T.s0.calls.flax))+RD.stat('Wall time, step 0',T.s0.wall.toFixed(2)+' s','trace + compile + run')}
    else{$('st-re').innerHTML='<div class="small mute">The running example\'s step 1 is the same: its jitted function is called with new arrays and the cached executable runs.</div><pre>params, opt_state, loss, gnorm = step(params, opt_state, x, y)</pre>';
      $('st-cnt').innerHTML=RD.stat('MaxText functions entered',String(T.s1.n_fns),'of '+FN.length)+RD.stat('Python calls, whole step',U.num(sum(T.s1.calls)),'JAX '+U.num(T.s1.calls.jax||0)+', Flax '+U.num(T.s1.calls.flax||0))+RD.stat('Wall time, step 1',T.s1.wall.toFixed(3)+' s','run only')}
  }
  const an=RD.anim({card:'st-card',ctl:'st-ctl',n:GR.length,draw:draw,label:'Stretch',list:'sx-st0',ms:4600});
  U.seg($('st-mode'),m=>{mode=m;$('sx-st0').hidden=m!=='s0';$('sx-st1').hidden=m==='s0';an.reset(m==='s0'?GR.length:N1,m==='s0'?'sx-st0':'sx-st1')});
  window.LC_STEP_CHECK={covered:covered.size,total:FN.length};
})();
