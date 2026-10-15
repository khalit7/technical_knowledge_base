// ---- Reading tab, part 1: recorded values in the prose, summary tiles, the five boxes, the config demo,
// the porting animation and table. Every number comes from window.LC (src/build_data.py). ----
(function(){
  const U=LCU, esc=U.esc, $=id=>document.getElementById(id);
  const set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
  U.fillRefs();
  const F=LC.fwd,T=LC.train,TX=LC.tunix,H=LC.hal;
  set('lc-v-fwd-tanh',U.sci(F.max_abs_logit_diff_vs_tanh_gelu_twin));
  set('lc-v-fwd-tanh2',U.sci(F.max_abs_logit_diff_vs_tanh_gelu_twin));
  set('lc-v-fwd-exact',U.sci(F.max_abs_logit_diff_vs_running_example_exact_gelu));
  set('lc-v-fwd-loss',F.loss_maxtext.toFixed(6));set('lc-v-fwd-loss-re',F.loss_running_example.toFixed(6));
  set('lc-v-tr-diff',U.sci(T.diff_twin));set('lc-v-tr-med',(T.step_med*1000).toFixed(0)+' ms');set('lc-v-tr-load',Math.round(T.load));
  set('lc-v-tx-diff',U.sci(TX.A.diff));
  set('lc-v-hal-diff',String(H.max_abs_diff_named_vs_plain_attention));
  set('lc-v-hal-err',esc(H.wrong_axis_error));
  const meshRun=LC.cfg.runs.find(r=>r.mesh_error);if(meshRun)set('lc-err-mesh',esc(meshRun.mesh_error));

  // summary tiles
  const sum=a=>Object.values(a).reduce((x,y)=>x+y,0);
  set('lc-one-stats',[
    RD.stat('MaxText train step against the plain-JAX twin',U.sci(T.diff_twin),'largest loss difference over '+T.steps+' steps of the running example'),
    RD.stat('Tunix PeftTrainer against the root NNX run',U.sci(TX.A.diff),'largest loss difference over 100 steps'),
    RD.stat('Running example built by MaxText',U.num(F.n_params_maxtext)+' params','the same count; logits within '+U.sci(F.max_abs_logit_diff_vs_tanh_gelu_twin)),
    RD.stat('Python calls, step 0 against step 1',U.num(sum(T.s0.calls))+' / '+U.num(sum(T.s1.calls)),'MaxText functions: '+T.s0.fns.length+' / '+T.s1.n_fns),
    RD.stat('Llama 2 7B sharded by MaxText\'s rules',U.num(LC.shard.cases[0].params)+' params',U.MB(LC.shard.cases[0].bytes_dev)+' per device, FSDP over '+LC.shard.devices),
    RD.stat('Haliax named attention against plain JAX',String(H.max_abs_diff_named_vs_plain_attention),'largest difference, block 0 of the running example')
  ].join(''));

  // the five boxes
  const five=[
    ['1. Configuration','<code>common.py</code> CFG dict','MaxText <code>configs/base.yml</code> + model YAML + pydantic','Tunix: Python dataclasses; Levanter: draccus dataclasses','<a href="#s-cfg">MaxText 1</a>'],
    ['2. Model','<code>model_jax.py</code> apply()','MaxText <code>models/</code> + <code>layers/nnx_decoders.py</code> (Flax NNX)','Tunix <code>models/</code> (NNX); Levanter <code>models/</code> (Equinox + Haliax)','<a href="#s-model">MaxText 2</a>'],
    ['3. Sharding','none (one device)','logical axis names + <code>logical_axis_rules</code>','Levanter: named axes + axis mapping dicts','<a href="#s-shard">MaxText 3</a>'],
    ['4. Train step','<code>make_train_step</code>: 6 lines, jit, donate','<code>trainers/pre_train/train.py</code> train_step','Tunix <code>PeftTrainer._train_step</code>','<a href="#s-step">MaxText 4</a>'],
    ['5. Data and checkpoints','numpy batches, no checkpoint','grain/HF/tfds/synthetic; Orbax v1','Levanter cache + TensorStore; Tunix Orbax','<a href="#s-remat">MaxText 5</a>']];
  set('lc-five',five.map(f=>'<div><b>'+f[0]+'</b><span class="mute">Running example:</span> '+f[1]+'<br><span class="mute">MaxText:</span> '+f[2]+'<br><span class="mute">Others:</span> '+f[3]+'<br>'+f[4]+'</div>').join(''));

  // config demo: the recorded parses
  const sel=$('lc-cfgdemo-sel'),out=$('lc-cfgdemo-out');
  if(sel){
    sel.innerHTML=LC.cfg.runs.map((r,i)=>'<option value="'+i+'">'+esc(r.label)+'</option>').join('');
    const show=()=>{const r=LC.cfg.runs[+sel.value];
      const ov=Object.keys(r.overrides).length?Object.entries(r.overrides).map(([k,v])=>k+'='+(Array.isArray(v)?'['+v.join(',')+']':v)).join(' '):'(none: base.yml as shipped)';
      let h='<p class="small"><span class="mute">Overrides:</span> <code>'+esc(ov)+'</code></p>';
      if(!r.ok){h+='<pre class="err">'+esc(r.error)+'</pre>'}
      else{const v=r.v;const rows=[['decoder_block',v.decoder_block],['emb_dim, mlp_dim',v.emb_dim+', '+v.mlp_dim],['heads (query, kv) x head_dim',v.num_query_heads+', '+v.num_kv_heads+' x '+v.head_dim],['layers',v.num_decoder_layers],['vocab_size',U.num(v.vocab_size)],
        ['global batch on '+LC.cfg.devices+' devices',v.global_batch_size_to_train_on],['ici_fsdp, ici_tensor (as parsed)',v.ici_fsdp_parallelism+', '+v.ici_tensor_parallelism],['mesh built',r.mesh?Object.entries(r.mesh).map(([a,n])=>a+' '+n).join(' x '):'<span class="lc-bad">failed</span>'],
        ['remat_policy, scan_layers',v.remat_policy+', '+v.scan_layers],['dtype, weight_dtype',v.dtype+', '+v.weight_dtype],['opt_type, learning_rate, adam_b2',v.opt_type+', '+v.learning_rate+', '+v.adam_b2],['attention',v.attention]];
        h+='<div class="tw"><table class="rd-cmp narrow"><tbody>'+rows.map(x=>'<tr><td class="mute">'+x[0]+'</td><td><code>'+x[1]+'</code></td></tr>').join('')+'</tbody></table></div>';
        if(r.mesh_error)h+='<pre class="err">'+esc(r.mesh_error)+'</pre>'}
      out.innerHTML=h};
    sel.addEventListener('change',show);show();
  }
  U.predict('lc-pr-cfg',2);U.predict('lc-pr-step',1);U.predict('lc-pr-remat',1);

  // ---------- porting animation: one tensor from PyTorch layout to MaxText layout ----------
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
  const shapes=F.shapes;
  const PORT={
    q:{name:'attention query weight',steps:[
      {cap:'<b>PyTorch.</b> Four separate tensors <code>blocks.{0..3}.attn.wq.weight</code>, each <code>[128 out, 128 in]</code>: <code>nn.Linear</code> stores the output dimension first and computes <code>x @ W.T</code>.',shape:'4 x [128, 128]',v:'pt'},
      {cap:'<b>Transpose.</b> MaxText\'s <code>DenseGeneral</code> stores <code>[in, out]</code> and computes <code>x @ W</code>, like Flax and the plain-JAX twin. The rows are now the input (<code>embed</code>) dimension.',shape:'4 x [128, 128]',v:'tr'},
      {cap:'<b>Name the output axes.</b> The 128 outputs are 4 heads of 32: reshape to <code>[embed, heads, kv] = [128, 4, 32]</code>. Each colour is one head; nothing moves in memory.',shape:'4 x [128, 4, 32]',v:'heads'},
      {cap:'<b>Stack the layers.</b> With <code>scan_layers=true</code> and <code>param_scan_axis=1</code>, the four layers become one array with the layer axis second: <code>[embed, layers, heads, kv]</code>. This is the tensor MaxText created, path <code>decoder.layers.self_attention.query.kernel</code>.',shape:'[128, 4, 4, 32]',v:'stack'},
      {cap:'<b>The bias follows.</b> <code>wq.bias [128]</code> per layer becomes <code>[heads, layers, kv] = [4, 4, 32]</code>. Then MaxText runs the forward pass on the first batch: logits within '+U.sci(F.max_abs_logit_diff_vs_tanh_gelu_twin)+' of the tanh-GELU twin.',shape:'[4, 4, 32]',v:'bias'}]},
    ln:{name:'LayerNorm scale',steps:[
      {cap:'<b>PyTorch.</b> <code>blocks.{0..3}.ln1.weight</code>, four vectors of 128 ones at initialisation; the output is <code>normalised x weight + bias</code>.',shape:'4 x [128]',v:'ln1'},
      {cap:'<b>Subtract 1.</b> <code>Gpt3LayerNorm</code> starts its scale at zeros and multiplies by <code>scale + 1</code>, so the stored value is the offset from 1. 1.0 becomes 0.0.',shape:'4 x [128]',v:'ln0'},
      {cap:'<b>Stack on axis 1:</b> <code>[norm, layers] = [128, 4]</code>, path <code>decoder.layers.pre_self_attention_norm.scale</code>.',shape:'[128, 4]',v:'lnstack'},
      {cap:'<b>Forget the subtraction</b> and every norm multiplies by 2.0: the model runs, the loss is wrong, nothing errors. Only a logits check catches it.',shape:'[128, 4]',v:'lnbad'}]},
    wi:{name:'MLP input weight',steps:[
      {cap:'<b>PyTorch.</b> <code>blocks.{0..3}.mlp.fc1.weight</code>, four <code>[512 out, 128 in]</code> matrices.',shape:'4 x [512, 128]',v:'wpt'},
      {cap:'<b>Transpose</b> to <code>[embed, mlp] = [128, 512]</code>.',shape:'4 x [128, 512]',v:'wtr'},
      {cap:'<b>Stack on axis 1:</b> <code>[embed, layers, mlp] = [128, 4, 512]</code>, path <code>decoder.layers.mlp.wi.kernel</code>. Logical names <code>("embed", "layers", "mlp")</code>, the same names the Llama weights carry in the sharding section.',shape:'[128, 4, 512]',v:'wstack'},
      {cap:'<b>The activation is not a tensor.</b> <code>mlp_activations=[gelu]</code> means <code>jax.nn.gelu</code>, the tanh form. Against the exact-GELU running example the logits differ by up to '+U.sci(F.max_abs_logit_diff_vs_running_example_exact_gelu)+'.',shape:'[128, 4, 512]',v:'wgelu'}]}};
  let pmode='q';
  function rect(x,y,w,h,fill,op,stroke){return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" fill="'+fill+'" fill-opacity="'+(op==null?.75:op)+'"'+(stroke?' stroke="'+stroke+'"':'')+'/>'}
  function grid(x,y,w,h,nr,nc){let s='';for(let i=1;i<nc;i++)s+='<line x1="'+(x+w*i/nc).toFixed(1)+'" y1="'+y+'" x2="'+(x+w*i/nc).toFixed(1)+'" y2="'+(y+h)+'" stroke="var(--bg)" stroke-width=".5" stroke-opacity=".6"/>';
    for(let i=1;i<nr;i++)s+='<line x1="'+x+'" y1="'+(y+h*i/nr).toFixed(1)+'" x2="'+(x+w)+'" y2="'+(y+h*i/nr).toFixed(1)+'" stroke="var(--bg)" stroke-width=".5" stroke-opacity=".6"/>';return s}
  function drawPort(i){
    const st=PORT[pmode].steps[i],W=U.width($('lc-port-svg')),t=RD.t;let s='',H=190;
    const lay=['layer 0','layer 1','layer 2','layer 3'];
    if(['pt','tr','heads'].includes(st.v)){
      const sz=Math.min(150,(W-40)/4-12),y0=30;
      for(let L=0;L<4;L++){const x=10+L*(sz+12);
        if(st.v==='heads'){for(let h=0;h<4;h++)s+=rect(x+h*sz/4,y0,sz/4,sz,COL[h])}else s+=rect(x,y0,sz,sz,'var(--c1)',st.v==='pt'?.45:.75);
        s+=grid(x,y0,sz,sz,16,16);
        if(st.v==='pt'){s+=rect(x,y0+sz*3/16,sz,sz/16,'var(--c2)',.95)}else{s+=rect(x+sz*3/16,y0,sz/16,sz,st.v==='heads'?'var(--ink)':'var(--c2)',st.v==='heads'?.35:.95)}
        s+=t(x+sz/2,y0-8,lay[L],{a:'middle',fs:11});
        s+=t(x+sz/2,y0+sz+14,st.v==='pt'?'cols: in 128':(st.v==='heads'?'4 heads x 32':'cols: out 128'),{a:'middle',fs:10,fill:'var(--mute)'});}
      s+=t(4,y0+sz/2,'',{});H=y0+sz+24;
      s+=t(10,H+2,st.v==='pt'?'rows: out 128 (highlighted row: output 3)':'rows: in = embed 128 (highlighted column: output 3)',{fs:10,fill:'var(--mute)'});H+=10;
    } else if(st.v==='stack'||st.v==='bias'){
      const bw=Math.min(W-30,640),bh=st.v==='bias'?60:120,x0=10,y0=26;
      if(st.v==='stack'){for(let L=0;L<4;L++)for(let h=0;h<4;h++){const x=x0+(L*4+h)*bw/16;s+=rect(x,y0,bw/16,bh,COL[h],.35+.15*L)}
        s+=grid(x0,y0,bw,bh,8,64);
        for(let L=0;L<4;L++){s+='<line x1="'+(x0+L*bw/4)+'" y1="'+(y0-4)+'" x2="'+(x0+L*bw/4)+'" y2="'+(y0+bh+4)+'" stroke="var(--ink)" stroke-width="1.2"/>';s+=t(x0+L*bw/4+bw/8,y0-8,lay[L],{a:'middle',fs:11})}
        s+=t(x0,y0+bh+16,'[embed 128, layers 4, heads 4, kv 32]: rows embed, then 4 layer groups of 4 heads x 32',{fs:10,fill:'var(--mute)'});H=y0+bh+26}
      else{for(let h=0;h<4;h++)for(let L=0;L<4;L++){s+=rect(x0+(h*4+L)*bw/16,y0,bw/16,bh,COL[h],.35+.15*L)}
        s+=grid(x0,y0,bw,bh,1,64);for(let h=0;h<4;h++)s+=t(x0+h*bw/4+bw/8,y0-8,'head '+h,{a:'middle',fs:11});
        s+=t(x0,y0+bh+16,'bias [heads 4, layers 4, kv 32]: heads first, then layers',{fs:10,fill:'var(--mute)'});H=y0+bh+26}
    } else if(st.v.startsWith('ln')){
      const bw=Math.min(W-30,560),y0=24,cw=bw/128;
      if(st.v==='lnstack'||st.v==='lnbad'){for(let L=0;L<4;L++){s+=rect(10,y0+L*22,bw,16,st.v==='lnbad'?'var(--bad)':'var(--dim)',st.v==='lnbad'?.5:.9);s+=t(14+bw,y0+L*22+12,lay[L],{fs:10})}
        s+=t(10,y0+4*22+12,st.v==='lnbad'?'stored 1.0 instead of 0.0: effective scale (1 + 1) = 2.0':'[norm 128, layers 4], every value 0.0: effective scale 0 + 1 = 1.0',{fs:10,fill:'var(--mute)'});H=y0+4*22+22}
      else{for(let L=0;L<4;L++){s+=rect(10,y0+L*22,bw,16,st.v==='ln1'?'var(--c3)':'var(--dim)',.85);s+=t(14+bw,y0+L*22+12,lay[L]+(st.v==='ln1'?': 1.0':': 0.0'),{fs:10})}
        H=y0+4*22+6}
    } else {
      const sz=Math.min(140,(W-40)/4-12),y0=30,tall=st.v==='wpt';
      if(st.v==='wstack'||st.v==='wgelu'){const bw=Math.min(W-30,640),bh=64;for(let L=0;L<4;L++)s+=rect(10+L*bw/4,y0,bw/4,bh,'var(--c3)',.35+.15*L);s+=grid(10,y0,bw,bh,4,64);
        for(let L=0;L<4;L++){s+='<line x1="'+(10+L*bw/4)+'" y1="'+(y0-4)+'" x2="'+(10+L*bw/4)+'" y2="'+(y0+bh+4)+'" stroke="var(--ink)" stroke-width="1.2"/>';s+=t(10+L*bw/4+bw/8,y0-8,lay[L],{a:'middle',fs:11})}
        s+=t(10,y0+bh+16,'[embed 128, layers 4, mlp 512]'+(st.v==='wgelu'?'  then jax.nn.gelu (approximate=True)':''),{fs:10,fill:st.v==='wgelu'?'var(--bad)':'var(--mute)'});H=y0+bh+26}
      else{const w=tall?sz/4:sz,h=tall?sz:sz/4;for(let L=0;L<4;L++){const x=10+L*(sz+12);s+=rect(x,y0,w,h,'var(--c3)',tall?.45:.75);s+=grid(x,y0,w,h,tall?16:4,tall?4:16);s+=t(x+sz/2,y0-8,lay[L],{a:'middle',fs:11})}
        s+=t(10,y0+(tall?sz:sz/4)+16,tall?'[out 512, in 128] (drawn 4 cells wide, 16 tall)':'[in 128, out 512]',{fs:10,fill:'var(--mute)'});H=y0+(tall?sz:sz/4)+26}
    }
    $('lc-port-svg').innerHTML=RD.svg(W,H,s,PORT[pmode].name+', step '+(i+1));
    $('lc-port-cap').innerHTML='<b>Step '+(i+1)+' of '+PORT[pmode].steps.length+'.</b> '+st.cap;
    const path={q:'decoder.layers.self_attention.query.kernel',ln:'decoder.layers.pre_self_attention_norm.scale',wi:'decoder.layers.mlp.wi.kernel'}[pmode];
    $('lc-port-cnt').innerHTML=RD.stat('Shape now',st.shape,'')+RD.stat('MaxText created',JSON.stringify(shapes[path]).replace(/,/g,', '),path)+RD.stat('Numbers','unchanged','reshapes and a transpose; the scale shifts by 1');
  }
  const pa=U.anim({card:'lc-port-card',ctl:'lc-port-ctl',n:PORT.q.steps.length,tab:'t-read',draw:drawPort,label:'Porting step'});
  U.seg($('lc-port-mode'),m=>{pmode=m;pa.reset(PORT[m].steps.length)});

  // mapping table (conversion rules used by runs/lc_fwd.py)
  const MAP=[['tok_emb.weight [65, 128]','token_embedder.embedding','none'],['pos_emb.weight [128, 128]','decoder.position_embedder.embedding','none'],
    ['blocks.i.ln1.weight [128]','decoder.layers.pre_self_attention_norm.scale','minus 1, stack on axis 1'],['blocks.i.ln1.bias [128]','decoder.layers.pre_self_attention_norm.bias','stack on axis 1'],
    ['blocks.i.attn.wq/wk/wv.weight [128, 128]','decoder.layers.self_attention.query/key/value.kernel','transpose, reshape [128, 4, 32], stack on axis 1'],
    ['blocks.i.attn.wq/wk/wv.bias [128]','decoder.layers.self_attention.query/key/value.bias','reshape [4, 32], stack on axis 1'],
    ['blocks.i.attn.wo.weight [128, 128]','decoder.layers.self_attention.out.kernel','transpose, reshape [4, 32, 128], stack on axis 1'],['blocks.i.attn.wo.bias [128]','decoder.layers.self_attention.out.bias','stack on axis 1'],
    ['blocks.i.ln2.weight / bias [128]','decoder.layers.mlp.mlp_layer_norm.scale / bias','scale minus 1; stack on axis 1 (the MLP block owns this norm)'],
    ['blocks.i.mlp.fc1.weight [512, 128] / bias','decoder.layers.mlp.wi.kernel / bias','transpose; stack on axis 1'],['blocks.i.mlp.fc2.weight [128, 512] / bias','decoder.layers.mlp.wo.kernel / bias','transpose; stack on axis 1'],
    ['ln_f.weight / bias [128]','decoder.decoder_norm.scale / bias','scale minus 1'],['head.weight [65, 128]','decoder.logits_dense.kernel','transpose']];
  const tb=document.querySelector('#lc-port-table tbody');
  if(tb)tb.innerHTML=MAP.map(r=>{const p=r[1].split(' / ')[0].replace('query/key/value','query');const shp=shapes[p]||shapes[p.replace(/\.(scale|kernel)$/,'.$1')];
    return '<tr><td><code>'+esc(r[0])+'</code></td><td><code>'+esc(r[1])+'</code>'+(shp?' <span class="mute small">'+esc(JSON.stringify(shp))+'</span>':'')+'</td><td>'+esc(r[2])+'</td></tr>'}).join('');
})();
