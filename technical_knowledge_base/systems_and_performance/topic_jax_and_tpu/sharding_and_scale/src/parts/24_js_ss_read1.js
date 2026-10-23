// ---- Reading tab, part 1 (sections 0 to 6): one-screen table, source refs, propagation diff, drill, explicit ladder, strategies chart ----
(function(){
  const U=SSU, esc=U.esc, $=id=>document.getElementById(id);
  // source references: <span id="ss-ref-KEY"> -> file:line at the pinned version
  const REF={mm:'make_mesh_explicit_default',sdy:'shardy_flag',aa:'auto_axes',mtmode:'mt_shard_mode',x1:'xla_cpu_shardy',x2:'xla_cpu_gspmd',
    x3:'xla_gpu_arr',gerr:'gather_err',cerr:'contracting_err',cps:'mt_cp_strategy',cpb:'mt_cp_balance',mtaxes:'mt_mesh_axes',mtdcn:'mt_dcn_tensor',
    mtrules:'mt_rules',dist:'dist_init',gloo:'cpu_coll_default',mapl:'make_array_pl',rag:'mt_moe_ragged',
    mk:'make_mesh',dup:'dup_spec',wsc:'wsc',n2g:'named_to_gspmd',n2s:'named_to_sdy',smap:'shard_map',ag:'all_gather',ps:'psum_scatter',a2a:'all_to_all',pp:'ppermute'};
  document.querySelectorAll('[id^="ss-ref-"]').forEach(el=>{const k=REF[el.id.slice(7)];if(k)el.innerHTML=U.ref(k)});

  // one-screen table (scaled-up model)
  const big=SS.scale.configs.big.layouts, byId={};big.forEach(l=>byId[l.id]=l);
  const sumK=(l)=>{const o={};l.collectives.forEach(c=>{o[c[0]]=(o[c[0]]||0)+c[4]});return o};
  const collTxt=l=>{const o=sumK(l);const ks=Object.keys(o);return ks.length?ks.map(k=>U.chip(k,k+' '+U.MB(o[k]))).join(' '):'none'};
  const ROWS=[
    ['Data parallel','#s-strat','the batch','batch <code>P(\'data\')</code>, weights <code>P()</code>','dp','DDP'],
    ['FSDP (ZeRO-3)','#s-strat','batch, and every weight and optimizer state','weights <code>P(\'data\', None)</code>, plus a constraint on the residual stream','fsdp','FSDP2 <code>fully_shard</code>'],
    ['HSDP','#s-strat','FSDP inside groups, replicas across them','mesh <code>(replica, fsdp)</code>, batch <code>P((\'replica\',\'fsdp\'))</code>','hsdp','FSDP2 with a 2-D mesh'],
    ['Tensor (Megatron)','#s-strat','weight matrices by column then row; heads','<code>P(None,\'model\')</code> then <code>P(\'model\',None)</code>','tp','<code>parallelize_module</code>, ColwiseParallel / RowwiseParallel'],
    ['FSDP x tensor','#s-strat','both of the above on two mesh axes','weights <code>P(\'data\',\'model\')</code>','fsdp_tp','2-D DeviceMesh, FSDP2 + TP'],
  ];
  const tb=$('ss-one-t').querySelector('tbody');
  tb.innerHTML=ROWS.map(r=>{const l=byId[r[4]];return '<tr><td><a href="'+r[1]+'">'+r[0]+'</a></td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+collTxt(l)+'</td><td class="num">'+U.MB(l.param_bytes_per_device+l.opt_bytes_per_device)+'</td><td>'+r[5]+'</td></tr>'}).join('')+
    '<tr><td><a href="#s-cp">Context</a></td><td>the sequence</td><td><code>shard_map</code>: ring of <code>ppermute</code>, or all-gather K, V</td><td>'+U.chip('collective-permute','permute: K, V blocks')+'</td><td class="num">as data parallel</td><td>Context Parallel (experimental)</td></tr>'+
    '<tr><td><a href="#s-pipe">Pipeline</a></td><td>the layers, over time</td><td><code>shard_map</code> loop with <code>ppermute</code></td><td>'+U.chip('collective-permute','permute: activations')+'</td><td class="num">layers / stages</td><td><code>torch.distributed.pipelining</code></td></tr>'+
    '<tr><td><a href="#s-moe">Expert</a></td><td>the experts of an MoE layer</td><td><code>shard_map</code> with two <code>all_to_all</code></td><td>'+U.chip('all-to-all','all-to-all: tokens')+'</td><td class="num">experts / devices</td><td>no core API (torchtitan, Megatron-Core)</td></tr>';

  // typeof
  const t=SS.debug.typeof;$('ss-typeof').textContent='jax.typeof(w)      '+t.w+'\njax.typeof(x)      '+t.x+'\njax.typeof(x @ w)  '+t['x @ w'];

  // propagation differences on the whole step
  (function(){
    const F=SS.prop.full, names={tp:'Data 2 x tensor 4',fsdp_naive:'FSDP, weights annotated only',seq:'Sequence sharded'};
    const tot=a=>a.reduce((s,r)=>[s[0]+r[3],s[1]+r[4]],[0,0]);
    let h='<div class="tw"><table><thead><tr><th>Layout (root lab)</th><th class="num">Shardy</th><th class="num">GSPMD</th><th>Where they differ most (by source line, both directions summed)</th></tr></thead><tbody>';
    Object.keys(F).forEach(id=>{
      const a=F[id].shardy,b=F[id].gspmd,ta=tot(a),tb2=tot(b);
      const by={};const add=(rows,sg)=>rows.forEach(r=>{const k=r[0]+' at '+r[1];by[k]=(by[k]||0)+sg*r[4]});add(a,1);add(b,-1);
      const top=Object.entries(by).filter(e=>Math.abs(e[1])>1e5).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1])).slice(0,3)
        .map(e=>'<code>'+esc(e[0])+'</code>: '+(e[1]>0?'Shardy ':'GSPMD ')+'+'+U.MB(Math.abs(e[1]))).join('; ');
      h+='<tr><td>'+names[id]+'</td><td class="num">'+ta[0]+' ('+U.MB(ta[1])+')</td><td class="num">'+tb2[0]+' ('+U.MB(tb2[1])+')</td><td class="small">'+top+'</td></tr>'});
    h+='</tbody></table></div><p class="ss-src">Collective count (bytes: summed result sizes) in the full train step, Shardy (default) against GSPMD, same annotations, <code>src/runs/ss_prop.py</code>. <code>_tree_math.py</code> and <code>update.py</code> are optax 0.2.8: Adam\'s moment updates (<code>'+esc(SS.source.refs.optax_moment.file)+':'+SS.source.refs.optax_moment.line+'</code>), the global norm (<code>:'+SS.source.refs.optax_tree_sum.line+'</code>) and <code>apply_updates</code> (<code>'+esc(SS.source.refs.optax_apply.file)+':'+SS.source.refs.optax_apply.line+'</code>); <code>model_jax.py</code> lines 45 to 47 are LayerNorm, 51 the linear layer, 57 the head split, 68 the MLP.</p>';
    $('ss-propdiff').innerHTML=h;
  })();

  // predict-then-reveal
  function drill(id,right,ans){const el=$(id);if(!el)return;el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===right)x.classList.add('right')});
    if(+b.dataset.a!==right)b.classList.add('wrong');const a=el.querySelector('.ans');a.hidden=false;a.innerHTML=ans})}
  (function(){const F=SS.prop.full.tp,tot=a=>a.reduce((s,r)=>[s[0]+r[3],s[1]+r[4]],[0,0]),a=tot(F.shardy),b=tot(F.gspmd);
    const opt=F.gspmd.filter(r=>/_tree_math|update\.py/.test(r[1])&&r[0]==='all-gather').reduce((s,r)=>s+r[3],0);
    const ln=F.gspmd.filter(r=>/model_jax\.py:4[567]/.test(r[1])&&r[0]==='all-gather').reduce((s,r)=>s+r[3],0);
    drill('ss-pr1',1,'GSPMD: '+b[0]+' collectives ('+U.MB(b[1])+') against Shardy\'s '+a[0]+' ('+U.MB(a[1])+'). '+opt+' of GSPMD\'s all-gathers come from optax\'s Adam update and <code>apply_updates</code> on the small replicated parameters (LayerNorm scales, biases): GSPMD split that elementwise arithmetic over the idle <code>model</code> axis and then gathered the results back. Another '+ln+' all-gathers sit in LayerNorm, which it split along the feature dimension. Shardy left both replicated.')})();
  window.SS_drill=drill;

  // explicit ladder
  (function(){
    const runs=SS.explicit.runs, NAMES={'null':'As written for Auto mode','emb':'Embedding gather given out_sharding','dp':'Embedding gather given out_sharding','fsdp':'Plus jax.reshard(w, P()) before each use','tp':'Plus out_sharding on the row-parallel matmuls'};
    function draw(lay){
      const rs=runs.filter(r=>r.layout===lay);
      $('ss-ex-steps').innerHTML=rs.map((r,i)=>{
        let h='<div class="ss-card"><h4>'+(i+1)+'. '+esc(NAMES[String(r.fix)])+' '+(r.ok?'<span class="meas">traces, compiles, runs</span>':'<span class="unc">ShardingTypeError at trace time</span>')+'</h4>';
        if(!r.ok)h+='<pre class="err">'+esc(r.error)+'</pre>';
        else{const c=r.collectives;h+='<p class="small">Collectives: '+Object.keys(c).map(k=>U.chip(k,k+' x'+c[k].count+', '+U.MB(c[k].bytes))).join(' ')+'; loss within '+U.sci(r.abs_loss_diff_vs_one_device)+' of one device. Gradient types: '+Object.entries(r.grad_types).map(e=>'<code>'+esc(e[0])+'</code> <code>'+esc(e[1])+'</code>').join(', ')+'.</p>'}
        if(r.types&&r.types.length)h+='<div class="tw"><table class="narrow"><thead><tr><th>Intermediate (block 0)</th><th>jax.typeof while tracing</th></tr></thead><tbody>'+r.types.map(t=>'<tr><td>'+esc(t[0])+'</td><td><code>'+esc(t[1])+'</code></td></tr>').join('')+'</tbody></table></div>';
        return h+'</div>'}).join('');
    }
    U.seg($('ss-ex-lay'),draw);draw('dp');
  })();

  // strategies chart
  (function(){
    let cfg='big',met='bytes';
    const SHORT={single:'One device',dp:'Data parallel 8',fsdp:'FSDP 8',hsdp:'HSDP 2 x 4',tp:'Data 2 x TP 4',tp8:'TP 8',fsdp_tp:'FSDP 2 x TP 4'};
    const KC={'all-reduce':'var(--c2)','all-gather':'var(--c1)','reduce-scatter':'var(--c3)','all-to-all':'var(--c4)','collective-permute':'var(--c6)'};
    const MC={params:'var(--c1)',opt:'var(--c4)',temp:'var(--c5)'};
    function draw(){
      const el=$('ss-st-svg');const W=U.width(el);const L=SS.scale.configs[cfg].layouts;
      const lab=Math.min(170,Math.max(110,W*0.3)),bw=W-lab-70,rh=26,H=L.length*rh+10;
      const rows=L.map(l=>{if(met==='bytes'){const o={};l.collectives.forEach(c=>o[c[0]]=(o[c[0]]||0)+c[4]);return {l,parts:Object.entries(o).map(e=>[e[0],e[1],KC[e[0]]])}}
        return {l,parts:[['params',l.param_bytes_per_device,MC.params],['Adam state',l.opt_bytes_per_device,MC.opt],['temp (activations, scratch)',l.memory.temp_size_in_bytes,MC.temp]]}});
      const mx=Math.max(...rows.map(r=>r.parts.reduce((s,p)=>s+p[1],0)),1);
      let s='';rows.forEach((r,i)=>{const y=i*rh+4;s+=RD.t(lab-6,y+15,esc(SHORT[r.l.id]||r.l.label),{a:'end',fs:11.5});let x=lab;let tot=0;
        r.parts.forEach(p=>{const w=p[1]/mx*bw;s+='<rect x="'+x+'" y="'+(y+3)+'" width="'+Math.max(0,w)+'" height="16" fill="'+p[2]+'"><title>'+esc(p[0])+': '+U.MB(p[1])+'</title></rect>';x+=w;tot+=p[1]});
        s+=RD.t(x+4,y+15,tot?U.MB(tot):'none',{fs:11})});
      el.innerHTML=RD.svg(W,H,s,met==='bytes'?'Bytes moved per step by collective kind':'Memory per device');
      $('ss-st-leg').innerHTML=met==='bytes'?Object.keys(KC).slice(0,2).concat(['collective-permute']).map(k=>'<span><i style="background:'+KC[k]+'"></i>'+k+'</span>').join(''):
        Object.entries({params:'parameters',opt:'Adam state',temp:'temp (activations, scratch)'}).map(e=>'<span><i style="background:'+MC[e[0]]+'"></i>'+e[1]+'</span>').join('');
      const c=SS.scale.configs[cfg];
      $('ss-st-note').innerHTML=(met==='bytes'?'Logical bytes per train step, summed over the step, from the compiled HLO. ':'Parameters and Adam state from each array\'s shard shape; temp from <code>memory_analysis().temp_size_in_bytes</code> (on CPU, <code>peak_memory_in_bytes</code> leaves temp out). One device\'s temp ('+U.MB(c.layouts[0].memory.temp_size_in_bytes)+') is for the whole batch. ')+
        '<span class="meas">measured</span> '+U.num(c.params)+' parameters, '+c.cfg.batch+' x '+c.cfg.ctx+' tokens per step, float32. Compile times '+Math.min(...c.layouts.map(l=>l.compile_wall_s))+' to '+Math.max(...c.layouts.map(l=>l.compile_wall_s))+' s wall: measured on Apple M1 Pro (CPU), shared machine, low priority; not meaningful for TPU.';
    }
    U.seg($('ss-st-cfg'),v=>{cfg=v;draw()});U.seg($('ss-st-met'),v=>{met=v;draw()});
    RD.onRender(draw);RD.onResize(draw);draw();
  })();
  $('ss-invol').textContent=(SS.debug.involuntary_warning[0]||'').replace(/^spmd_partitioner\.cc:\d+\]\s*/,'').split('. As the last resort')[0]+'. As the last resort, SPMD will replicate the tensor and then partition it ...';
})();
