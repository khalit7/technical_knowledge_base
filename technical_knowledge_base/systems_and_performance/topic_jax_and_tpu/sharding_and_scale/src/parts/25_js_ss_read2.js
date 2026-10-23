// ---- Reading tab, part 2: context-parallel animation, cost calculator, formula check, mesh, multi-host, debugging, old page ----
(function(){
  const U=SSU, esc=U.esc, $=id=>document.getElementById(id);
  // ---------- context parallelism: ring vs all-gather on the same 8 x 8 grid of (query block, key block) ----------
  (function(){
    $('ss-cp-code').textContent=SS.code.ring;
    const N=8, CP=SS.cp, blk=CP.running_example.ring.collectives['collective-permute'].bytes/14; // one K or V block
    let mode='ring';
    const steps=()=>mode==='ring'?N+1:3;
    function cell(d,j,done,now,held){
      if(j>d)return {f:'var(--soft)',o:1,t:'masked: key block '+j+' is later than query block '+d};
      if(now)return {f:'var(--acc)',o:1,t:'computing now'};
      if(done)return {f:j===d?'var(--c3)':'var(--c1)',o:.55,t:'done'};
      return {f:held?'var(--c5)':'var(--bg)',o:held?.6:1,t:held?'held, not computed yet':'not yet seen'};
    }
    function draw(i){
      const el=$('ss-cp-svg'),W=U.width(el),lab=86,cw=Math.min(40,(W-lab-10)/N),H=N*cw+34;
      let s=RD.t(lab+N*cw/2,12,'key / value block (which device it started on)',{a:'middle',fs:11});
      for(let j=0;j<N;j++)s+=RD.t(lab+j*cw+cw/2,28,j,{a:'middle',fs:11});
      let comp=0,sent=0,held=1,work=new Array(N).fill(0);
      for(let d=0;d<N;d++){const y=32+d*cw;s+=RD.t(lab-6,y+cw/2+4,'device '+d,{a:'end',fs:11});
        for(let j=0;j<N;j++){let done=false,now=false,hd=false;
          if(mode==='ring'){const t=i-1;for(let u=0;u<=t&&u<N;u++){if((d-u+N)%N===j){if(u<t)done=true;else now=true}}hd=(i>0&&i<=N&&(d-(i-1)+N)%N===j)||(i===0&&j===d)}
          else{if(i>=1)hd=true;if(i===2)now=j<=d;if(i===0)hd=j===d}
          const c=cell(d,j,done,now,hd);
          s+='<rect x="'+(lab+j*cw+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(cw-2)+'" rx="3" fill="'+c.f+'" fill-opacity="'+c.o+'" stroke="var(--line)"><title>device '+d+', block '+j+': '+c.t+'</title></rect>';}}
      if(mode==='ring'){const t=Math.min(i,N);sent=Math.max(0,i-1)*2*blk;held=1;comp=i===0?0:Math.min(i,N);
        for(let d=0;d<N;d++)for(let u=0;u<Math.min(i,N);u++){if((d-u+N)%N<=d)work[d]++}}
      else{sent=i>=1?2*(N-1)*blk:0;held=i>=1?N:1;comp=i>=2?1:0;if(i>=2)for(let d=0;d<N;d++)work[d]=d+1}
      el.innerHTML=RD.svg(lab+N*cw+6,H,s,'Query blocks by key blocks for causal attention split over 8 devices');
      const capR=['<b>Start.</b> Each device holds its own 16 tokens: queries, keys and values for one block of the sequence. Grey cells are masked by causality and will never be computed.'];
      for(let t=0;t<N;t++)capR.push('<b>Step '+(t+1)+' of '+N+'.</b> Device d holds the K/V block that started on device (d &minus; '+t+') mod 8'+(t===0?' (its own: the triangular diagonal block)':'')+'. It updates its running max, denominator and numerator, then passes the block right with <code>ppermute</code>'+(t===N-1?'; done: divide numerator by denominator':'')+'. '+(t>0?'Devices whose block now comes from a later position skip the work (masked).':''));
      const capA=['<b>Start.</b> Each device holds its own block of queries, keys and values.','<b>All-gather.</b> Every device receives the 7 other K and V blocks in one collective: it now holds the whole sequence\'s keys and values.','<b>Compute.</b> Each device attends its queries to every earlier key at once, with the causal mask shifted by its offset. Device 7 does 8 blocks of work, device 0 one.'];
      $('ss-cp-cap').innerHTML=(mode==='ring'?capR:capA)[i];
      $('ss-cp-cnt').innerHTML=RD.stat('bytes received per device',U.MB(sent),'measured block: '+U.MB(blk))+RD.stat('K/V blocks held per device',held+' of 8','')+RD.stat('work done, device 0 / device 7',work[0]+' / '+work[7]+' blocks','');
    }
    const an=U.anim({tab:'t-read',card:'ss-cp-card',ctl:'ss-cp-ctl',n:steps(),draw,ms:1500,label:'Step'});
    U.seg($('ss-cp-mode'),v=>{mode=v;an.reset(steps())});RD.onResize(()=>an.redraw());
    const R=CP.running_example,Lg=CP.long.methods,nm={propagate:'Propagation (jit)',allgather:'All-gather (shard_map)',ring:'Ring (shard_map)'};
    const cs=c=>Object.keys(c).map(k=>U.chip(k,k+' x'+c[k].count+', '+U.MB(c[k].bytes))).join(' ');
    $('ss-cp-meas').innerHTML='<div class="tw"><table><thead><tr><th>Method</th><th>Forward collectives</th><th>Backward collectives</th><th class="num">Error</th><th class="num">Temp per device, 128 tokens</th><th class="num">Temp per device, 8,192 tokens</th></tr></thead><tbody>'+
      Object.keys(nm).map(k=>'<tr><td>'+nm[k]+'</td><td>'+cs(R[k].collectives)+'</td><td>'+cs(R[k].grad_collectives)+'</td><td class="num">'+U.sci(R[k].max_abs_err)+' / '+U.sci(R[k].grad_max_abs_err)+'</td><td class="num">'+U.MB(R[k].temp_bytes_per_device)+'</td><td class="num">'+U.MB(Lg[k].temp_bytes_per_device)+'</td></tr>').join('')+
      '</tbody></table></div><p class="ss-src"><span class="meas">measured</span> Error: largest difference from one-device attention, output / gradients. The 8,192-token input is random (1 sequence, 4 heads, head dimension 32). Note the backward of the hand-written all-gather: JAX transposes <code>all_gather</code> into <code>psum_scatter</code>, so a true reduce-scatter appears even on CPU, which never forms one from an all-reduce by itself.</p>';
  })();

  // ---------- collective cost calculator ----------
  (function(){
    const al=1e-6, SZ=[['running example gradients',3305472],['scaled-up gradients',101670912],['Llama 3 8B, bfloat16 gradients',8030261248*2]];
    function draw(){
      const k=+$('ss-cc-n').value,n=Math.pow(2,k),Wl=+$('ss-cc-link').value,Wb=2*Wl;
      $('ss-cc-nv').textContent=n;
      const X=Math.pow(2,Math.ceil(k/2)),Y=n/X;
      const ring=V=>2*Math.max(al*n/2,V/Wb),tor=V=>2*Math.max(al*(X+Y)/2,V/(2*Wb)),tree=V=>2*Math.log2(n)*al+2*V/Wb;
      const el=$('ss-cc-svg'),W=U.width(el),H=230,ml=52,mr=10,mt=10,mb=34,pw=W-ml-mr,ph=H-mt-mb;
      const x0=3,x1=11,ys=[-6,1];  // log10 bytes 1 KB..100 GB, log10 seconds 1us..10s
      const px=v=>ml+(Math.log10(v)-x0)/(x1-x0)*pw,py=t=>mt+(1-(Math.log10(t)-ys[0])/(ys[1]-ys[0]))*ph;
      let s='';for(let e=x0;e<=x1;e++){const x=px(Math.pow(10,e));s+='<line x1="'+x+'" x2="'+x+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--line)"/>'+RD.t(x,H-18,['1 KB','','100 KB','','10 MB','','1 GB','','100 GB'][e-3],{a:e===x1?'end':'middle',fs:10.5})}
      for(let e=ys[0];e<=ys[1];e++){const y=py(Math.pow(10,e));s+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(ml-4,y+4,{'-6':'1 &micro;s','-5':'10 &micro;s','-4':'100 &micro;s','-3':'1 ms','-2':'10 ms','-1':'100 ms','0':'1 s','1':'10 s'}[e],{a:'end',fs:10.5})}
      s+=RD.t(ml+pw/2,H-3,'message size (bytes all-reduced)',{a:'middle',fs:11});
      const curves=[['ring (1 axis)',ring,'var(--c2)'],['2-D torus ('+X+' x '+Y+')',tor,'var(--c1)'],['tree (&alpha;-&beta;)',tree,'var(--c4)']];
      curves.forEach(c=>{let d='';for(let i=0;i<=80;i++){const v=Math.pow(10,x0+(x1-x0)*i/80);const t=Math.min(Math.max(c[1](v),1e-6),10);d+=(i?'L':'M')+px(v).toFixed(1)+','+py(t).toFixed(1)}s+='<path d="'+d+'" fill="none" stroke="'+c[2]+'" stroke-width="2"/>'});
      SZ.forEach((z,i)=>{const x=px(z[1]);s+='<line x1="'+x+'" x2="'+x+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(x+3,mt+12+i*13,String.fromCharCode(97+i),{fs:11,w:600})});
      el.innerHTML=RD.svg(W,H,s,'All-reduce time against message size for ring, 2-D torus and tree');
      $('ss-cc-leg').innerHTML=curves.map(c=>'<span><i style="background:'+c[2]+'"></i>'+c[0]+'</span>').join('');
      const V=SZ[1][1];
      $('ss-cc-note').innerHTML='Marked: '+SZ.map((z,i)=>'<b>'+String.fromCharCode(97+i)+'</b> '+z[0]+' ('+U.MB(z[1])+')').join(', ')+'. At (b) on '+n+' devices: ring '+fmt(ring(V))+', 2-D torus '+fmt(tor(V))+', tree '+fmt(tree(V))+'. Assumptions: &alpha; = 1 &micro;s per hop, W<sub>bidi</sub> = 2 &times; the one-way link ('+(Wl/1e9)+' GB/s, scaling book table), a full ring with wraparound, no overlap with compute. <span class="der">derived</span>: a calculation, not a measurement.';
    }
    const fmt=t=>t<1e-3?(t*1e6).toFixed(1)+' &micro;s':t<1?(t*1e3).toFixed(2)+' ms':t.toFixed(2)+' s';
    $('ss-cc-n').addEventListener('input',draw);$('ss-cc-link').addEventListener('change',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();

  // ---------- formula check table ----------
  (function(){
    const FM={dp:'AR = P',fsdp:'AG = P; AR (TPU: RS) = P',hsdp:'AG = P; AR = P + P/f',tp:'AR = 2LA + 4LA + P<sub>dev</sub>',tp8:'AR = 2LA + 4LA'};
    const sum=o=>o?Object.values(o).reduce((a,b)=>a+b,0):0;
    $('ss-fc-t').querySelector('tbody').innerHTML=SS.fcheck.rows.filter(r=>r.id!=='single').map(r=>'<tr><td>'+(r.config==='big'?'25.4M':'0.83M')+'</td><td>'+esc(r.label)+'</td><td>'+(FM[r.id]||'not predicted: the FSDP x TP layout mixes both, with a resharding warning')+'</td><td class="num">'+(r.predicted?U.MB(sum(r.predicted)):'')+'</td><td class="num">'+U.MB(sum(r.measured))+'</td><td class="num">'+(r.ratio_measured_over_predicted?r.ratio_measured_over_predicted.toFixed(4):'')+'</td></tr>').join('');
  })();

  // torus error, multi-host summary
  (function(){const s=SS.torus.slices.find(x=>x.name.startsWith('v5p-4x4x4'));const m=s.meshes.find(x=>x.mesh.join()==='8,8');
    $('ss-torus-err').textContent=m.error.split('. The size')[0];
    const M=SS.multi.normal,p=M.processes;
    $('ss-multi-sum').innerHTML='Process 0 sees devices '+p[0].device_ids.join(', ')+' and owns '+p[0].addressable_shards.map(a=>a[0]).join(', ')+'; process 1 owns '+p[1].addressable_shards.map(a=>a[0]).join(', ')+'. The compiled step has '+p[0].hlo_all_reduce+' all-reduce, as on one host. Over 20 steps both processes report identical losses, within '+U.sci(M.max_abs_loss_diff_vs_one_device)+' of the one-device run on the same batches (wall time '+M.wall_s+' s for both processes including start-up, shared machine).';
  })();

  // ---------- debugging toolkit ----------
  (function(){
    const D=SS.debug,P=SS.prop.full.fsdp_naive.shardy;
    const rows=[
      ['Where does this array live?','<code>jax.debug.visualize_array_sharding(w)</code> (rich text; outside jit)','<pre>'+esc(D.visualize_fc1_fsdp_tp)+'</pre>The running example\'s fc1 weight [128, 512] as <code>P(\'data\', \'model\')</code> on (2, 4): each device holds '+esc(D.shard_shapes.join(', '))+'.'],
      ['What did the compiler choose for an intermediate?','<code>jax.debug.inspect_array_sharding(x, callback=print)</code> inside jit (runs at compile time)',Object.entries(D.inspect_hidden).map(e=>'MLP hidden layer, '+esc(e[0])+': <code>'+esc(e[1])+'</code>').join('<br>')],
      ['What is the sharding type?','<code>jax.typeof(x)</code> on an Explicit mesh','<code>'+esc(D.typeof['x @ w'])+'</code>'],
      ['Which collectives, how big, from which line?','<code>jit(f).lower(*a).compile().as_text()</code>, grouped by source line','See below: the surprise all-gathers of the unconstrained FSDP step.'],
      ['How much memory per device?','<code>compiled.memory_analysis()</code>','Arguments, outputs, aliases, temp. On CPU, use the temp field: <code>peak_memory_in_bytes</code> leaves it out (root Compiler lab).'],
      ['What did propagation decide, op by op?','<code>XLA_FLAGS=--xla_dump_to=DIR --xla_dump_hlo_pass_re=shardy-xla|sharding-propagation</code>','One file per module after the pass; section 3\'s stepper is built from these. Dumps contain absolute paths: scrub before sharing.'],
      ['Did the partitioner give up somewhere?','XLA warnings on stderr','<code>[SPMD] Involuntary full rematerialization</code>, printed for the FSDP x tensor layout.'],
      ['Do all hosts agree?','<code>jax.experimental.multihost_utils.assert_equal</code>; <code>device_put</code> runs it for you on replicated inputs','See section 12.']];
    $('ss-dbg-t').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="small">'+r[2]+'</td></tr>').join('').replace(/\{\{([^|{}]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>');
    RD.tabLinks($('ss-dbg-t'));
    const ag=P.filter(r=>r[0]==='all-gather'&&/model_jax\.py:68/.test(r[1]));
    $('ss-surprise').innerHTML=ag.map(r=>r[3]+' all-gathers at <code>model_jax.py:68</code> ('+r[2]+', '+U.MB(r[4])+' in all)').join(' and ')+', the line <code>return linear(p["fc2"], jax.nn.gelu(linear(p["fc1"], x), approximate=False))</code>';
  })();

  // ---------- old page ----------
  $('ss-old').innerHTML=[
    '<b>"<code>from jax.shard_map import shard_map</code>"</b>: wrong module path. Use <code>jax.shard_map</code> (top level since 0.8.0); <code>jax.experimental.shard_map</code> still imports with a deprecation warning.',
    '<b>"<code>jax.make_mesh((8, 4), ...)</code>" followed by Auto-style code</b>: since the switch announced in 0.8.1, <code>make_mesh</code> creates Explicit axes (<code>'+esc(SS.source.refs.make_mesh_explicit_default.file)+':'+SS.source.refs.make_mesh_explicit_default.line+'</code>); the old snippet now needs <code>axis_types</code> or the Explicit-mode fixes above.',
    '<b>"<code>jax.experimental.shard</code> APIs moved to <code>jax.sharding</code>"</b>: in 0.11.2 <code>jax.experimental.shard</code> does not exist (ModuleNotFoundError, checked); the explicit-sharding API is <code>jax.sharding.auto_axes</code>, <code>explicit_axes</code>, <code>get_abstract_mesh</code> and top-level <code>jax.reshard</code>, <code>jax.set_mesh</code>, <code>jax.typeof</code>.',
    '<b>"Optimiser state inherits the param sharding automatically ... ZeRO-1 falls out for free"</b>: only if you give the optimizer state shardings (as every run here does) or leave it to propagation. ZeRO-1 means optimizer state sharded while parameters stay replicated, which you have to annotate separately; MaxText has a flag for it (<code>shard_optimizer_over_data</code>).',
    '<b>FSDP "all-gather params before use, reduce-scatter grads"</b>: right on TPU and GPU; on CPU the reduce-scatter appears as all-reduce plus slice. And XLA chose to gather each weight once per step and keep it for the backward pass, not twice.',
    '<b>"<code>pmap</code> is legacy (since JAX 0.8 to 0.10 it is a wrapper over jit + shard_map)"</b>: precisely, "in maintenance mode" since 0.8.0 and always implemented with <code>jit(shard_map)</code> since 0.10.0. "pmap only handled one device axis per host cleanly" was dropped: unsourced.',
    '<b>Pipeline parallelism "via shard_map stages ... the last resort"</b>: kept, sharpened: MaxText\'s pipeline is a <code>jax.vmap</code> over stages plus <code>shard_map</code> + <code>ppermute</code> rotations, with circular repeats; the scaling book calls pipelining less essential on TPUs. Built and measured here.',
    '<b>Multi-host "(usually) 4 local chips" per host</b>: dropped (not checked against a primary source here). "No explicit rank-conditional code except around I/O" kept with the JAX docs\' warning that a <code>device_put</code> under <code>if process_index() == 0</code> deadlocks.',
    '<b>Added</b> (absent from the old page): how GSPMD and Shardy propagate, measured differences between them, Explicit mode on a real model, HSDP, context, pipeline and expert parallelism run for real, cost formulas checked against compiled byte counts, mesh choice for a slice, a multi-process run, and the debugging toolkit.'].map(x=>'<li>'+x+'</li>').join('');
})();
