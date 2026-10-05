// ---- Tab "Inside torch.compile": real logs per program and stage ----
(function(){
  const D=window.CSD,T=D.tc,E=RD.esc,$=id=>document.getElementById(id);
  const short=l=>l.replace(/;\s+\w+(\s*=\s*\w+)*\s*=\s*None$/,'');
  const cut=L=>L.map(l=>l.length>170?l.slice(0,170)+' ...':l);
  const G1=[],G2=[];let cur=null;T.break_graphs.forEach(l=>{if(/=====/.test(l)){cur=cur===null?G1:G2;return}if(/TRACED GRAPH/.test(l))return;if(cur)cur.push(short(l))});
  const P={
    attn_like:{name:'softmax(x*0.125) @ w',src:T.src.attn_like,stages:{
      graph:[T.graph.map(short),'The FX graph Dynamo recorded (TORCH_LOGS=graph_code): three operations, with shapes and strides in each type annotation.'],
      guards:[T.guards.map(g=>g.replace(/^[|\s+-]+/,'')),'TORCH_LOGS=guards: the checks run before every reuse of this compiled graph.'],
      explain:[[JSON.stringify(T.explain.attn_like)],'torch._dynamo.explain: one graph, no breaks.'],
      code:[T.fusion_log.concat(['','# wrapper: call()'],T.cpp_call.map(l=>l.replace(/^ {8}/,'')),['','# kernel: '+T.cpp_name],T.cpp_kernel),'TORCH_LOGS=fusion,output_code: the scheduler’s fusion decisions, the Python wrapper, then the C++ kernel Inductor wrote for the CPU. The matmul is extern_kernels.mm.'],
      recompile:[T.recompile_log.concat(['','calls (rows, ms): '+T.recompile_ms.map(r=>r[0]+': '+r[1]).join(', ')]),'TORCH_LOGS=recompiles,dynamic: four calls with 64, 128, 256, 512 rows.']}},
    with_print:{name:'with a print',src:T.src.with_print,stages:{
      graph:[['# graph 1'].concat(G1,['','# graph 2 (the resume function)'],G2),'Two graphs: the code before the print, and the resume function after it.'],
      bytecode:[['# ORIGINAL BYTECODE ('+T.bc_orig.length+' instructions)'].concat(T.bc_orig,['','# MODIFIED BYTECODE ('+T.bc_mod.length+' instructions)'],T.bc_mod),'TORCH_LOGS=bytecode: what CPython would have run, and what Dynamo installed instead (the compiled graph, print, then __resume_at_...).'],
      breaks:[T.break_reason,'TORCH_LOGS=graph_breaks: the reason and the hints.'],
      explain:[[JSON.stringify(T.explain.with_print),'','fullgraph=True: '+T.fullgraph.with_print],'explain() counts; under fullgraph=True the same break is an exception.']}},
    with_item:{name:'with .item()',src:T.src.with_item,stages:{
      explain:[[JSON.stringify(T.explain.with_item),'','fullgraph=True: '+(T.fullgraph.with_item===null?'no error: .item() is captured as a symbolic scalar when one graph is required':T.fullgraph.with_item)],'A break by default (capture_scalar_outputs is False), but not under fullgraph=True.']}},
    with_branch:{name:'with if on a tensor',src:T.src.with_branch,stages:{
      explain:[[JSON.stringify(T.explain.with_branch),'','fullgraph=True: '+T.fullgraph.with_branch],'Data-dependent control flow: a break, or an error under fullgraph=True. torch.cond or torch.where keep it in the graph.']}},
    rmsnorm:{name:'RMSNorm, forward and backward',src:T.src.rmsnorm,stages:{
      aot:[['# Forward graph'].concat(T.aot_fwd.map(short),['','# Backward graph'],T.aot_bwd.map(short)),'TORCH_LOGS=aot_graphs: the partitioned joint graph. The forward returns the output plus x, w and rsqrt for the backward.'],
      code:[['# CPU kernels Inductor wrote: '+T.aot_kernels.join(', '),'','# GPU code generated without a device (stand-in driver; not runnable here):'].concat(T.triton_deco,T.triton_kernel,['','# trying to run it: '+T.triton_err]),'Inductor’s C++ for the CPU (one forward and one backward kernel), and the Triton kernel it writes for a GPU.'],
      cost:[T.cold.map((c,i)=>'cold run '+(i+1)+': first call '+c.first_s+' s, next call '+c.second_ms+' ms, eager '+c.eager_ms+' ms').concat(T.warm.map((c,i)=>'warm run '+(i+1)+': first call '+c.first_s+' s, next call '+c.second_ms+' ms, eager '+c.eager_ms+' ms'),['','load average: '+T.load.join(' ')]),'Compile latency, three fresh processes with an empty cache and three with the cache kept.']}},
    scaled:{name:'a float argument',src:T.src.scaled,stages:{
      guards:[T.scalar.map(l=>l.replace(/^[|\s+-]+/,'')),'TORCH_LOGS=recompiles,guards: first a guard on the value (s == 0.125), then a recompile that makes s symbolic.']}}};
  const ST=[['src','Python'],['bytecode','Bytecode'],['graph','FX graph'],['guards','Guards'],['breaks','Graph breaks'],['explain','explain()'],['recompile','Recompiles'],['aot','AOTAutograd'],['code','Generated code'],['cost','Compile cost']];
  const pipe={src:0,bytecode:1,graph:1,guards:1,breaks:1,explain:1,recompile:1,aot:2,code:3,cost:3};
  let prog='attn_like',stage='graph';
  $('tc-prog').innerHTML=Object.keys(P).map(k=>'<button data-m="'+k+'"'+(k===prog?' class="on"':'')+'>'+E(P[k].name)+'</button>').join('');
  function render(){const p=P[prog];if(stage!=='src'&&!p.stages[stage])stage=Object.keys(p.stages)[0];
    $('tc-stage').innerHTML=ST.map(s=>'<button data-m="'+s[0]+'"'+(s[0]===stage?' class="on"':'')+(s[0]==='src'||p.stages[s[0]]?'':' disabled')+'>'+s[1]+'</button>').join('');
    $('tc-pipe').innerHTML=['Python','Dynamo','AOTAutograd','Inductor'].map((n,i)=>'<span'+(pipe[stage]===i?' class="on"':'')+'>'+n+'</span>').join(' → ');
    const v=stage==='src'?[p.src,'The function, as compiled (src/code/tc_programs.py).']:p.stages[stage];
    $('tc-note').innerHTML=E(v[1]);$('tc-out').textContent=cut(v[0]).join('\n');}
  $('tc-prog').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;prog=b.dataset.m;$('tc-prog').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
  $('tc-stage').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;stage=b.dataset.m;render()});
  render();
})();
