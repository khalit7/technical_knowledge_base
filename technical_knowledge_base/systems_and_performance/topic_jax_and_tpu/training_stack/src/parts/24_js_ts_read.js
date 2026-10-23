// ---- training_stack Reading tab: tables, the scan animation, small charts ----
(function(){
  const U=TSU,D=U.D,N=D.nnx,c=s=>'<code>'+U.esc(s)+'</code>';
  // graphdef stats
  const st=document.getElementById('ts-gd-stats');
  if(st)st.innerHTML=RD.stat('graphdef nodes',N.E1.n_nodes,'modules, lists, Variables')+RD.stat('graphdef attributes',N.E1.n_attributes,'names, static values, node links')+
    RD.stat('state leaves',N.E1.num_leaves,'arrays (all nnx.Param)')+RD.stat('parameters',U.int(N.E1.n_params),'numbers in those arrays');
  U.table('ts-gd-types',[['Kind'],['Type'],['Count',1]],N.E1.node_types.map(r=>[r[0],c(r[1]),r[2]]));
  // RNG table
  const E3=N.E3;
  U.table('ts-rng-t',[['Call pattern'],['Dropout masks differ between two calls?'],['RngCount after the two calls']],[
    ['eager: '+c('model(x); model(x)'),U.fmt(E3.eager_two_calls_differ,'yes'),E3.eager_counts.join(', ')],
    [c('nnx.jit')+' function, called twice',U.fmt(E3.nnx_jit_two_calls_differ,'yes'),E3.nnx_jit_counts.join(', ')],
    [c('jax.jit')+' on (graphdef, state), state not returned',U.fmt(E3.pure_jit_without_return_differ,'yes')+' <b>(bug)</b>','unchanged in the caller'],
    [c('jax.jit')+' returning '+c('nnx.state(m)'),U.fmt(E3.pure_jit_with_return_differ,'yes'),'advanced in the returned state'],
    [c('model.eval()')+' then two calls',(E3.eval_mode_equal?'no (identical outputs)':'yes'),E3.eval_count_after+' (not used)']]);
  // jit log
  U.table('ts-jit-t',[['Call'],['Traces so far',1],['StepCount after',1]],N.E5.log.map(r=>[typeof r.call==='number'?'call '+(r.call+1):r.call,r.traces,r.calls_var]));
  // sharding table
  const SH=D.shard.params.filter(r=>/^(blocks\.0\.(attn\.w[qo]|mlp)|tok_emb|head|blocks\.0\.ln1\.scale)/.test(r.path));
  U.table('ts-shard-t',[['Parameter'],['Shape'],['Logical axes'],['Spec on the mesh'],['Shard per device'],['Copies',1]],
    SH.map(r=>[c(r.path),U.shape(r.shape),r.logical?r.logical.map(x=>x==null?'none':x).join(', '):'none',c(r.spec),U.shape(r.shard),r.devices_holding_copy]));
  // checkpoint variants
  if(D.ckpt){const V=D.ckpt.variants,lab={all:'everything',no_data:'all but the data iterator',no_opt:'all but the optimiser state',no_rng:'all but the RNG streams',params_only:'Params only'};
    U.table('ts-ckv-t',[['Restored'],['Same run, bit for bit?'],['First loss off by',1],['Largest loss gap',1],['Largest parameter gap at step 160',1],['Iterator / RNG count / opt step at resume']],
      Object.keys(V).map(k=>{const v=V[k];return [lab[k],v.bitwise_equal?'<b>yes</b>':'no',v.first_loss_diff?U.ex(v.first_loss_diff,1):'0',v.max_loss_diff?U.ex(v.max_loss_diff,1):'0',v.param_maxdiff?U.ex(v.param_maxdiff,1):'0',
        'batch '+v.iterator_state.next_index+' / '+v.rng_count+' / '+v.opt_step]}));}
  if(D.ckpt_mesh){const M=D.ckpt_mesh.targets;
    U.table('ts-mesh-t',[['Restored onto'],['Devices',1],['fc1 kernel spec'],['Shard'],['Restored arrays bitwise equal'],['Steps 20 to 39 equal to the uninterrupted run'],['Largest parameter gap at step 40',1]],
      Object.keys(M).map(k=>{const m=M[k];return [k,m.n_devices,c(m.fc1_spec),U.shape(m.fc1_shard),m.restored_bitwise?'yes':'no',m.continued_bitwise_equal_ref?'<b>yes, bit for bit</b>':'no (drifts by rounding)',m.param_maxdiff_vs_ref?U.ex(m.param_maxdiff_vs_ref,1):'0']}));}
  // grain pipelines
  if(D.grain){const G=D.grain.G1_equal,y=b=>b?'same':'<b>different</b>';
    U.table('ts-gpipe-t',[['Pipeline'],['2 workers vs 0'],['4 workers vs 0']],[
      ['A: '+c('MapDataset ... .batch(32).to_iter_dataset().mp_prefetch(w)'),y(G.A['0_2']),y(G.A['0_4'])],
      ['B: '+c('MapDataset ... .to_iter_dataset().batch(32).mp_prefetch(w)'),y(G.B['0_2']),y(G.B['0_4'])],
      ['C: '+c('MapDataset ... .filter(f).to_iter_dataset().mp_prefetch(w).batch(32)'),y(G.C['0_2']),y(G.C['0_4'])],
      ['D: as C without the filter',y(G.D['0_2']),y(G.D['0_4'])],
      ['grain.DataLoader(IndexSampler, Batch), worker_count',y(G.DL['0_2']),'not run']]);}
  // fp16 tables
  if(D.mixed){const M1=D.mixed.M1.rows;
    U.table('ts-fp16-t',[['Compute dtype'],['Loss scale S',1],['Gradients that became 0',1],['Not finite',1],['Median relative error',1]],
      M1.map(r=>[r.dtype,r.scale===1?'1':'2<sup>'+Math.round(Math.log2(r.scale))+'</sup>',U.int(r.underflow_to_zero),U.int(r.nonfinite),(r.rel_err_median*100).toFixed(3)+'%']));
    const RR=D.mixed.M2.runs;
    U.table('ts-fp16run-t',[['Run'],['Validation loss',1],['Steps skipped',1]],Object.keys(RR).map(k=>[k==='static'?'fp16, static scale 2<sup>12</sup>':k==='dynamic'?'fp16, dynamic scale':k,RR[k].val_end.toFixed(4),RR[k].skipped]));}
  // optimiser runs table
  const S9=D.opt.S9.runs;
  U.table('ts-optrun-t',[['Optimiser'],['Validation loss at 300',1],['Optimiser state (numbers)',1],['CPU time (s)',1]],Object.keys(S9).map(k=>[k,S9[k].val_end.toFixed(4),U.int(S9[k].state_floats),S9[k].cpu_s]));
  // full script
  if(D.full){const R=D.full.runs,vals=r=>r.log.filter(l=>l.val_loss!=null);
    const code=document.getElementById('ts-full-code');if(code)code.textContent=D.full_code||'';
    U.table('ts-full-t',[['Run'],['Started at'],['Validation loss at 100, 200, 300, 400'],['Checkpoints kept'],['Best step']],
      [['A, uninterrupted',0,vals(R.A).map(l=>l.val_loss.toFixed(4)).join(', '),R.A.kept_steps.join(', '),R.A.best],
       ['B, stopped after 250',0,vals(R.B).map(l=>l.val_loss.toFixed(4)).join(', '),R.B.kept_steps.join(', '),R.B.best],
       ['C, same command again',R.C.log.length?200:'?',vals(R.C).map(l=>l.val_loss.toFixed(4)).join(', '),R.C.kept_steps.join(', '),R.C.best]]);
    const s=document.getElementById('ts-full-sum');
    if(s)s.innerHTML='Recorded result: B+C '+(D.full.final_bitwise_equal_A_vs_BC?'<b>bit-identical</b>':'<b>not identical</b>')+' to A. With <code>LatestN(1)</code> and <code>BestN(n=2)</code> the directory kept steps '+R.A.kept_steps.join(', ')+'. Wall time on the shared CPU: A '+D.full.times_s.A+' s, B '+D.full.times_s.B+' s, C '+D.full.times_s.C+' s, including process start and compilation (rough).';}

  // ---- charts, drawn when the tab is visible ----
  function charts(){
    const e=document.getElementById('ts-optrun-svg');
    if(e&&e.offsetParent!==null){const ks=Object.keys(S9);U.lines(e,ks.map((k,i)=>({name:k,color:U.COL[i],pts:S9[k].losses,dash:i===2?'5 3':null})),{label:'training loss of four optimisers',ylab:'loss',h:230})}
    const f=document.getElementById('ts-fp16-svg');
    if(f&&f.offsetParent!==null&&D.mixed){const RR=D.mixed.M2.runs,base=RR.f32.losses;
      U.lines(f,['fp16 no scaling','static','dynamic'].map((k,i)=>({name:k==='static'?'fp16, static 2^12':k==='dynamic'?'fp16, dynamic':k,color:U.COL[i+1],pts:RR[k].losses.map((p,j)=>[p[0],p[1]-base[j][1]])})),{zero:1,dec:3,label:'loss minus float32 loss',h:200})}
  }
  RD.onRender(charts);RD.onResize(charts);
  // charts inside closed <details> have no width until opened: redraw everything on open
  document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));

  // ---- scan before/after animation ----
  const rows=N.E7.rows,byKey={};rows.forEach(r=>byKey[r.kind+r.layers]=r);
  const per=(byKey.unrolled8.jaxpr_top_eqns-byKey.unrolled4.jaxpr_top_eqns)/4,base=byKey.unrolled4.jaxpr_top_eqns-4*per;
  let depth=4,mode='unrolled';
  const svg=document.getElementById('ts-scan-svg'),cap=document.getElementById('ts-scan-cap'),stats=document.getElementById('ts-scan-stats');
  function nsteps(){return mode==='unrolled'?depth+2:4}
  function draw(i){if(!svg)return;const W=Math.max(280,svg.clientWidth||600),H=200,maxE=byKey.unrolled16.jaxpr_top_eqns;
    const r=byKey[mode+depth];let s='',eq;
    const barW=W-150;
    s+=RD.t(6,16,'Python traces',{fs:11,fill:'var(--mute)'});
    if(mode==='unrolled'){
      const traced=Math.min(depth,Math.max(0,i-0));const bh=Math.min(10,120/depth);
      for(let k=0;k<depth;k++){const y=26+k*(bh+2),on=k<traced;s+='<rect x="6" y="'+y+'" width="86" height="'+bh+'" rx="2" fill="'+(on?'var(--c1)':'var(--soft)')+'" stroke="var(--line)"/>'}
      s+=RD.t(6,26+depth*(bh+2)+12,traced+' of '+depth+' blocks',{fs:10.5,fill:'var(--mute)'});
      eq=i===0?0:Math.round(base+per*traced);if(i>=depth+1)eq=r.jaxpr_top_eqns;
    }else{
      const on=i>=1;s+='<rect x="6" y="26" width="86" height="14" rx="2" fill="'+(on?'var(--c3)':'var(--soft)')+'" stroke="var(--line)"/>';
      s+=RD.t(6,56,'1 block body',{fs:10.5,fill:'var(--mute)'});
      if(i>=2)s+='<path d="M96 33 C 130 10, 130 60, 96 40" fill="none" stroke="var(--c3)" stroke-width="1.6"/>'+RD.t(112,64,'lax.scan x'+depth,{fs:10.5,fill:'var(--c3)'});
      eq=i===0?0:r.jaxpr_top_eqns;
    }
    const X=140,w=v=>Math.max(1,v/maxE*(barW-10));
    s+=RD.t(X,16,(W<520?'jaxpr equations (to scale)':'top-level jaxpr equations (bar to scale, 16-layer unrolled = full width)'),{fs:10.5,fill:'var(--mute)'});
    s+='<rect x="'+X+'" y="26" width="'+w(eq)+'" height="16" fill="'+(mode==='scan'?'var(--c3)':'var(--c1)')+'"/>'+RD.t(X+w(eq)+4,38,U.int(eq),{fs:11});
    const done=i>=nsteps()-1;
    s+=RD.t(X,70,'optimised HLO lines',{fs:10.5,fill:'var(--mute)'});
    const maxH=byKey.unrolled16.hlo_lines;const hv=done?r.hlo_lines:0;
    s+='<rect x="'+X+'" y="78" width="'+Math.max(1,hv/maxH*(barW-10))+'" height="16" fill="var(--c4)"/>'+RD.t(X+Math.max(1,hv/maxH*(barW-10))+4,90,done?U.int(hv):'(after compile)',{fs:11});
    s+=RD.t(X,122,'parameter layout',{fs:10.5,fill:'var(--mute)'});
    s+=RD.t(X,140,mode==='unrolled'?'fc1.kernel: '+depth+' x [128, 512]':'fc1.kernel: [' +depth+', 128, 512]',{fs:11});
    svg.innerHTML=RD.svg(W,H-40,s,'unrolled versus scanned layers');
    const C=mode==='unrolled'?
      (i===0?'Before: a Python for loop over '+depth+' blocks. Tracing runs the loop.':i<=depth?'Tracing block '+i+' of '+depth+': its operations are appended to the jaxpr again (about '+Math.round(per)+' top-level equations per block, derived from the 4- and 8-layer counts).':'Done: '+U.int(r.jaxpr_top_eqns)+' equations, '+U.int(r.hlo_lines)+' HLO lines, compiled in '+r.compile_s+' s (rough). Grows with every layer.'):
      ['After: blocks created by nnx.vmap, so every parameter has a leading axis of '+depth+'.','nnx.scan traces the block body once, with one slice of the stacked parameters.','XLA runs that body '+depth+' times in a loop; the jaxpr has '+r.jaxpr_top_eqns+' top-level equations whatever the depth.','Done: '+U.int(r.hlo_lines)+' HLO lines, compiled in '+r.compile_s+' s (rough). The same at 4, 8 and 16 layers.'][i];
    cap.textContent=C;
    stats.innerHTML=RD.stat('layers',depth,'')+RD.stat('jaxpr equations (final)',U.int(r.jaxpr_top_eqns),mode)+RD.stat('HLO lines',U.int(r.hlo_lines),'optimised')+RD.stat('compile time',r.compile_s+' s','rough, loaded CPU');
  }
  if(svg){const A=RD.anim({card:'ts-scan-card',ctl:'ts-scan-ctl',n:nsteps(),draw,ms:1100,label:'Tracing step'});
    RD.seg(document.getElementById('ts-scan-depth'),v=>{depth=+v;A.reset(nsteps())});
    RD.seg(document.getElementById('ts-scan-mode'),v=>{mode=v;A.reset(nsteps())});
    RD.onResize(()=>A.redraw());}
})();
