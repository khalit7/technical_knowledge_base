// ---- Reading sections 8 to 13 and the mistakes: cache table, export table, the recompile storm, log lines, profiler views, flags ----
(function(){
  const D=XP.D, esc=XP.esc, f=XP.f;
  // 8. cache
  document.getElementById('xp-ck-line').textContent=D.cache.src.entries.line;
  document.getElementById('xp-ck-entries').innerHTML=D.cache.entries.map(e=>'<code>'+esc(e)+'</code>').join(', ');
  const what={cold:'Empty cache: compile, write',warm:'Same program and flags',dump_flag:'Adds --xla_dump_to=&lt;dir&gt;',xla_flag:'Adds --xla_cpu_enable_fast_math=true',donation:'Same step jitted without donate_argnums',threshold:'Small program, default 1 s threshold, new folder'};
  document.getElementById('xp-cache-tab').innerHTML='<thead><tr><th>Case</th><th>Result</th><th>Changed ingredients</th><th class="num">Files in cache</th><th class="num">Compile call, CPU s</th></tr></thead><tbody>'+
    D.cache.cases.map(c=>'<tr><td data-h="">'+what[c.key]+'</td><td data-h="Result">'+(c.hits?'<b class="ok">hit</b>':c.misses?'miss'+(c.key==='cold'?', written':', written'):'<b>not written</b> (compiled in under 1 s)')+'</td><td data-h="Changed">'+(c.key==='cold'?'<span class="mute">(first run)</span>':c.changed_entries&&c.changed_entries.length?c.changed_entries.map(e=>'<code>'+esc(e)+'</code>').join(', '):'none')+'</td><td data-h="Files" class="num">'+c.files+'</td><td data-h="CPU s" class="num">'+c.cpu_s.toFixed(2)+'</td></tr>').join('')+'</tbody>';
  // 9. AOT and export
  const E=D.exp;
  document.getElementById('xp-aot-err').textContent='compiled(params, x[:16])\n'+E.aot.wrong_shape_error;
  const ex=E.export, fr=E.fresh_process;
  const prow=(k,label)=>{const e=ex[k];return '<tr><td data-h="">'+label+'</td><td data-h="Serialized" class="num">'+XP.kb(e.serialized_bytes)+'</td><td data-h="StableHLO ops" class="num">'+f(e.stablehlo_ops)+'</td><td data-h="Custom calls">'+(e.custom_calls.length?esc(e.custom_calls.join(', ')):'none')+'</td><td data-h="Run on this CPU">'+(k==='cpu'?'yes: max difference '+fr.export_call.max_diff+' (fresh process, '+fr.export_call.cpu_s+' s CPU incl. compile)':k==='cpu+cuda+tpu'?'yes: max difference '+fr.multi_platform_call_on_cpu.max_diff:k==='tpu'?'<code>'+esc(fr.tpu_only_on_cpu_error)+'</code>':'<span class="mute">not tried</span>')+'</td></tr>'};
  document.getElementById('xp-exp-tab').innerHTML='<thead><tr><th>Exported for</th><th class="num">Serialized</th><th class="num">StableHLO ops</th><th>Custom calls</th><th>Run on this CPU</th></tr></thead><tbody>'+prow('cpu','CPU')+prow('cuda','CUDA')+prow('tpu','TPU')+prow('cpu+cuda+tpu','CPU, CUDA and TPU in one')+'</tbody>';
  document.getElementById('xp-exp-grow').textContent=f(ex['cpu+cuda+tpu'].stablehlo_ops-ex.cpu.stablehlo_ops);
  const P=E.shape_poly;
  document.getElementById('xp-poly').innerHTML='the exported input is <code>'+esc(P.in_aval_x)+'</code>, the output <code>'+esc(P.out_aval)+'</code>; called with batches of 2 and 8 it returns shapes ['+P.call_2.shape.join(', ')+'] and ['+P.call_8.shape.join(', ')+'], equal to <code>jit</code> (difference '+P.call_2.max_diff_vs_jit+'). The module adds '+P.shape_assertions+' shape assertions and dynamic operations ('+P.dynamic_ops.map(o=>'<code>'+esc(o)+'</code>').join(', ')+'); '+XP.kb(P.serialized_bytes)+' serialized.';
  const V=E.vjp;
  document.getElementById('xp-vjp').innerHTML=XP.kb(V.serialized_bytes_vjp1)+' against '+XP.kb(V.serialized_bytes_vjp0)+' without; <code>jax.grad</code> of the deserialized function matches <code>jax.grad</code> of the original within '+V.grad_max_diff.toExponential(1)+'.';
  // 10. the storm: same loop, exact shapes against buckets
  const ST=D.rec.storm;let smode='exact';
  const sh=document.getElementById('xp-storm-svg'), sc=document.getElementById('xp-storm-cnt'), scap=document.getElementById('xp-storm-cap');
  const calls=()=>smode==='exact'?ST.calls_exact:ST.calls_bucket;
  const med=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
  function sdraw(i){
    const C=calls(), W=RD.width(sh), H=170, pl=40, pb=22, pt=8, n=C.length, bw=(W-pl-6)/n;
    const maxv=Math.max(...ST.calls_exact.map(c=>c[3]),...ST.calls_bucket.map(c=>c[3]));
    const lg=v=>Math.log10(1+v), y=v=>H-pb-(H-pb-pt)*lg(v)/lg(maxv);
    let s='';
    [1,10,100].forEach(v=>{if(v<=maxv)s+='<line x1="'+pl+'" x2="'+(W-4)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(v)+3,v+' ms',{a:'end',fs:11})});
    const upto=Math.min(n,(i+1)*2);
    for(let k=0;k<upto;k++){const c=C[k];s+='<rect x="'+(pl+k*bw+0.5)+'" y="'+y(c[3])+'" width="'+Math.max(1,bw-1)+'" height="'+(H-pb-y(c[3]))+'" fill="'+(c[2]?'var(--c2)':'var(--c3)')+'"><title>L='+c[0]+' shape '+c[1]+': '+c[3]+' ms'+(c[2]?' (compiled)':'')+'</title></rect>'}
    s+=RD.t(pl,H-6,'call 1',{fs:11})+RD.t(W-6,H-6,'call 64 (L = 64)',{a:'end',fs:11});
    sh.innerHTML=RD.svg(W,H,s,'Time per call, log scale');
    let comp=0,tot=0;for(let k=0;k<upto;k++){comp+=C[k][2];tot+=C[k][3]}
    const R=ST.runs.map(r=>r[smode==='exact'?'exact':'bucketed']);
    sc.innerHTML=RD.stat('Calls',upto+' of '+n)+RD.stat('Compilations so far',String(comp))+RD.stat('Wall time so far',(tot/1000).toFixed(2)+' s','this repeat')+RD.stat('Compile time, median of 3',med(R.map(r=>r.compile_s)).toFixed(2)+' s','for all 64 calls');
    const last=C[upto-1];
    scap.innerHTML='<div class="t">Call '+upto+': prefix length '+last[0]+(smode==='bucket'?', padded to '+last[1]:'')+'</div><p>'+(last[2]?'A shape this function has not seen: trace, lower and compile again (orange).':'Shape already compiled: the cached executable runs (green).')+(upto>=n?' Total: '+comp+' compilations. Exact shapes: '+ST.runs[1].exact.compiles+'; buckets: '+ST.runs[1].bucketed.compiles+'.':'')+'</p>';
  }
  const san=RD.anim({card:'xp-storm-card',ctl:'xp-storm-ctl',n:32,draw:sdraw,ms:420,label:'Calls'});
  RD.seg(document.getElementById('xp-storm-seg'),m=>{smode=m;san.reset(32)});
  RD.onResize(()=>san.redraw());
  document.getElementById('xp-logc').textContent=D.rec.log.code+'\n\n# the first '+D.rec.log.messages.length+' log lines (WARNING level while the flag is on):\n'+D.rec.log.messages.join('\n')+'\n# print(g._cache_size()):\n'+D.rec.log.cache_size;
  // 11. profiler views
  const T=D.prof.tools;
  const what2=[['trace_viewer@','Trace viewer','A timeline: one row per thread (Python, the PJRT client, XLA worker threads) or, on TPU and GPU, per device stream, with every kernel as a bar named after its HLO instruction.'],
    ['overview_page','Overview page','Step time split into device compute, host time and idle time, with a recommendation.'],
    ['hlo_stats','HLO op stats','One row per HLO instruction: time, FLOP rate, memory bandwidth, and whether it is compute- or memory-bound.'],
    ['op_profile','Op profile','The same time grouped by category and program, as a tree.'],
    ['framework_op_stats','Framework op stats','Time per JAX operation name (the op_name XLA keeps in metadata).'],
    ['memory_profile','Memory profile','Device memory over time and the allocations alive at the peak.'],
    ['roofline_model','Roofline model','Each operation placed against the device\'s compute and bandwidth ceilings.']];
  document.getElementById('xp-prof-tools').innerHTML='<thead><tr><th>View</th><th>What it answers</th><th>On this CPU</th></tr></thead><tbody>'+what2.map(([k,n,w])=>{const t=T[k]||{};let o=t.ok?(k==='trace_viewer@'?'full timeline ('+XP.kb(t.bytes)+')':k==='hlo_stats'?(t.n_rows?t.n_rows+' rows':'<b>empty</b> (0 rows)'):k==='framework_op_stats'?(t.n_rows<=1?'<b>one IDLE row</b>':t.n_rows+' rows'):k==='op_profile'||k==='memory_profile'?'<b>empty</b> ('+t.bytes+' bytes)':k==='overview_page'?'filled; device type '+esc((t.device_type||[]).join(', ')):'returned '+XP.kb(t.bytes)):'failed';return '<tr><td data-h="">'+n+'</td><td data-h="Answers">'+w+'</td><td data-h="On this CPU">'+o+'</td></tr>'}).join('')+'</tbody>';
  // 12. flags
  const FD=D.flags.docs;
  document.getElementById('xp-flag-doc').innerHTML='<thead><tr><th>Flag</th><th>Default at the pin</th><th>Help text (abridged)</th></tr></thead><tbody>'+FD.map(d=>'<tr><td data-h=""><a href="'+d.url+'" target="_blank" rel="noopener noreferrer"><code>'+esc(d.name)+'</code></a></td><td data-h="Default">'+(d.default?'<code>'+esc(d.default.replace(/^opts\.(set|add)_/,'').replace(/;$/,'').slice(0,70))+'</code>':'<span class="mute">not set in the defaults</span>')+'</td><td data-h="Help">'+esc((d.help||'').slice(0,190))+((d.help||'').length>190?' ...':'')+'</td></tr>').join('')+'</tbody>';
  document.getElementById('xp-flag-run').innerHTML='<thead><tr><th>Setting</th><th class="num">Compile, CPU s</th><th class="num">Step, CPU s</th><th class="num">Step, wall s</th><th>Loss, steps 1 to 5</th><th class="num">Load</th></tr></thead><tbody>'+
    D.flags.runs.map(r=>'<tr><td data-h=""><code>'+esc(r.flags||'(default)')+'</code></td><td data-h="Compile" class="num">'+r.compile_cpu_s.toFixed(2)+'</td><td data-h="Step CPU" class="num">'+r.step_cpu_s.toFixed(3)+'</td><td data-h="Step wall" class="num">'+r.step_wall_s.toFixed(3)+'</td><td data-h="Loss" class="xp-q">'+r.losses.map(v=>v.toFixed(6)).join(' ')+'</td><td data-h="Load" class="num">'+r.load1+'</td></tr>').join('')+'</tbody>';
  // mistakes: real errors
  const sc2=k=>D.rec.sc.find(s=>s.key===k);
  document.getElementById('xp-mis-unhash').textContent=sc2('unhashable').error;
})();
