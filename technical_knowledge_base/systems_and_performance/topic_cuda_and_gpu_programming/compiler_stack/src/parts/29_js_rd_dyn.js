// ---- Reading: Dynamo graph, guards, the graph-break animation, explain table, recompilations ----
(function(){
  const D=window.CSD,T=D.tc,E=RD.esc;
  const short=l=>l.replace(/;\s+\w+(\s*=\s*\w+)*\s*=\s*None$/,'');
  document.getElementById('cs-fx').textContent=T.graph.map(short).join('\n');
  const g=T.guards;document.getElementById('cs-gN').textContent=g.length;
  document.getElementById('cs-guards').textContent=g.map(x=>x.replace(/^[|\s+-]+/,'').slice(0,260)).filter(x=>!/DIMENSION_DYNAMIC/.test(x)).join('\n');
  document.getElementById('cs-rlim').textContent=T.modes.recompile_limit;
  // graph-break animation
  const G1=[],G2=[];let cur=null;T.break_graphs.forEach(l=>{if(/=====/.test(l)){cur=cur===null?G1:G2;return}if(/TRACED GRAPH/.test(l))return;if(cur)cur.push(short(l))});
  const mark=(arr,re)=>arr.map(l=>'<span class="ln'+(re&&re.test(l)?' on':'')+'" style="display:block">'+E(l)+'</span>').join('');
  const reason=T.break_reason;
  const SB=[
    ['The call reaches Dynamo','CPython creates the frame for <code>with_print(x)</code> and, through the PEP 523 hook, hands it to Dynamo instead of running it. Dynamo starts reading the original bytecode.',()=>['Original bytecode ('+T.bc_orig.length+' instructions)',mark(T.bc_orig,null),'FX graph so far','(empty)'],[0,0,0]],
    ['Line 12 is traced into a graph','<code>x * 0.125</code> and <code>torch.softmax</code> are tensor operations: Dynamo records them instead of running them.',()=>['Original bytecode',mark(T.bc_orig,/^ 12|^\s+(12|32|34|36|40|42|44|52) /),'FX graph 1 (being built)',mark(G1,/mul|softmax/)],[0,0,0]],
    ['Line 13: print cannot be traced','Dynamo has no graph operation for <code>print</code>. Its log says why, and suggests fixes:',()=>['Original bytecode',mark(T.bc_orig,/^ 13|print|\('max prob'\)|printed from|POP_TOP/),'graph_breaks log',mark(reason,null)],[0,0,0]],
    ['Graph 1 is compiled; the bytecode is rewritten','Dynamo compiles what it has, then writes new bytecode for the frame: call the compiled graph, call <code>print</code> in ordinary Python, then call a generated <dfn>resume function</dfn> holding the rest of the original code. Highlighted: the three calls.',()=>['Modified bytecode ('+T.bc_mod.length+' instructions)',mark(T.bc_mod,/__compiled_fn|'print'|__resume_at/),'FX graph 1 (compiled)',mark(G1,null)],[1,0,1]],
    ['The resume function is traced too','The resume function is a normal Python function, so when the rewritten code calls it, the PEP 523 hook fires again and Dynamo traces it: graph 2 holds the <code>sum</code>.',()=>['Resume function: original bytecode ('+T.bc_resume_orig.length+' instructions)',mark(T.bc_resume_orig,/sum/),'FX graph 2',mark(G2,/sum/)],[2,1,2]],
    ['The next call: guards, then cached code','Called again with the same shape, both frames pass their guards and run their cached code. Every call still runs <code>print</code> in Python between two compiled graphs, and nothing is fused across the break.',()=>['What runs on every call','compiled graph 1  (mul, softmax)\nPython: print(...)\ncompiled graph 2  (sum)','',''],[2,1,2]]];
  const SF=[
    SB[0],SB[1],
    ['Line 13 under fullgraph=True: an error','With <code>fullgraph=True</code> nothing is split: the first thing Dynamo cannot trace raises. The exception <span class="ev run">run here</span>:',()=>['fullgraph=True, the same function',E('torch._dynamo.exc.'+T.fullgraph.with_print),'The same check on the other two functions',E('with_item: '+(T.fullgraph.with_item===null?'no error (the scalar is captured symbolically)':T.fullgraph.with_item)+'\nwith_branch: '+T.fullgraph.with_branch)],[0,0,0]],
    ['Fix it at the source, then keep fullgraph=True','Move the logging out of the compiled function, or use the hint in the log (<code>reorderable_logging_functions</code>); replace data-dependent <code>if</code> on tensors with <code>torch.where</code> or <code>torch.cond</code>. With no break, one graph covers the whole function, and the compiler can fuse across what used to be the break. <code>fullgraph=True</code> is how you keep it that way: a new break becomes a test failure, not a silent slowdown.',()=>['Hints from the log',mark(reason.filter(l=>/Hint/.test(l)),null),'For comparison: the running example, one graph',mark(T.graph.map(short),/mul|softmax|matmul/)],[1,0,1]]];
  let mode='b';const steps=()=>mode==='b'?SB:SF;
  function draw(i){const s=steps()[i],v=s[2]();
    document.getElementById('cs-dynCap').innerHTML='<div class="t">'+(i+1)+' of '+steps().length+': '+s[0]+'</div><p>'+s[1]+'</p>';
    document.getElementById('cs-dynLt').textContent=v[0];document.getElementById('cs-dynL').innerHTML=v[1];
    document.getElementById('cs-dynRt').textContent=v[2];document.getElementById('cs-dynR').innerHTML=v[3]||'';
    document.getElementById('cs-dynR').parentNode.style.display=v[2]?'':'none';
    document.getElementById('cs-dynCnt').innerHTML=RD.stat('graphs compiled',s[3][0])+RD.stat('graph breaks',s[3][1])+RD.stat('frames Dynamo handled',s[3][2]);
    const on=document.querySelector('#cs-dynL .on');if(on){const pre=document.getElementById('cs-dynL');pre.scrollTop=Math.max(0,on.offsetTop-pre.offsetTop-40)}}
  const an=RD.anim({card:'cs-dynCard',ctl:'cs-dynCtl',n:SB.length,draw:draw,ms:3200,label:'Dynamo step'});
  RD.seg(document.getElementById('cs-dynMode'),m=>{mode=m;an.reset(steps().length)});
  // explain table
  const X=T.explain;
  document.getElementById('cs-expl').innerHTML='<tr><th>Function</th><th class="num">graphs</th><th class="num">breaks</th><th class="num">ops in graphs</th><th>reason Dynamo gives</th></tr>'+
    Object.entries(X).map(([k,v])=>'<tr><td><code>'+k+'</code></td><td class="num">'+v.graphs+'</td><td class="num">'+v.breaks+'</td><td class="num">'+v.ops+'</td><td>'+(v.reasons.map(E).join('; ')||'<span class="mute">none</span>')+'</td></tr>').join('');
  // recompilation bars (log scale)
  function bars(){const el=document.getElementById('cs-recBars');const R=T.recompile_ms;const lg=v=>Math.log10(Math.max(v,0.1));const mx=lg(Math.max(...R.map(r=>r[1])));
    const lab=['first call: compile','new shape: recompile, now dynamic','new shape: reuse','new shape: reuse'];
    el.innerHTML=R.map((r,i)=>'<div class="cs-row"><div>'+r[0]+' rows <span class="mute small">'+lab[i]+'</span></div><div class="bar"><i style="width:'+Math.max(2,100*(lg(r[1])+1)/(mx+1)).toFixed(1)+'%"></i></div></div><div class="small" style="margin:-2px 0 4px 9.5em">'+r[1].toLocaleString('en-US')+' ms</div>').join('')+'<p class="small mute">Wall time of each call, log scale; CPU, 2 threads, torch 2.14.1; compile times on a GPU machine differ, the pattern does not.</p>';}
  bars();
  document.getElementById('cs-recLog').textContent=T.recompile_log.join('\n');
  document.getElementById('cs-scal').textContent=T.scalar.map(l=>l.replace(/^[|\s+-]+/,'')).join('\n');
})();
