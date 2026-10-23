// ---- Reading sections 3 to 12: tables, bars and small panels, all from window.TCP ----
(function(){
  const {$,esc,comma,mb,med,bars,table,stat}=TU,D=TCP;
  const gl=a=>a.map(g=>'['+g.join(', ')+']').join(' ');
  // 3. nested graph breaks
  if($('tcp-nested-tbl'))$('tcp-nested-tbl').innerHTML=table(['Program','Default: graphs (ops in each)','nested_graph_breaks=True'],D.nested.map(c=>[esc(c.label),c.default.length+': '+gl(c.default),c.nested.length+': '+gl(c.nested)]));
  // 3. break kinds
  if($('tcp-brk-tbl'))$('tcp-brk-tbl').innerHTML=table(['Line added','Dynamo\'s reason','Broken: graphs / breaks','Fix','Fixed: graphs / breaks'],
    D.fix.map(k=>['<code>'+esc(k.label)+'</code>',esc(k.b.reason),k.b.graphs+' / '+k.b.breaks,esc(k.how),k.f.graphs+' / '+k.f.breaks+(k.f.breaks?' <span class="ann">still breaks</span>':'')]));
  // 4. dynamic shapes card
  const SN={default:'default (automatic dynamic)',static:'dynamic=False',dynamic_true:'dynamic=True',mark_dynamic:'mark_dynamic(min=2, max=64)',mark_unbacked:'mark_unbacked'};
  function dyn(k){const S=D.dyn.strat[k];
    const er=S.calls.find(c=>c.error);let h='';if(er)h+='<p class="small">Error at T = '+er.T+': <span class="ann">'+esc(er.error.split(' (')[0])+'</span></p>';
    h+='<p class="small"><b>'+S.calls[S.calls.length-1].total+' compiles in all.</b> Recompile reasons, as logged:</p><ul class="tight">'+(S.reasons.length?S.reasons.map(r=>'<li class="small"><code>'+esc(r.replace(/^Recompiling function forward in [^ ]+ triggered by the following guard failure\(s\): /,'').slice(0,190))+'</code></li>').join(''):'<li class="small">none</li>')+'</ul>';
    if(S.breaks.length)h+='<p class="small">Graph break logged: <code>'+esc(S.breaks[0].where)+'</code>: '+esc(S.breaks[0].explanation.replace('Explanation: ',''))+'</p>';
    $('tcp-dyn-out').innerHTML=h}
  if($('tcp-dyn-seg'))TU.seg($('tcp-dyn-seg'),Object.keys(SN).map(k=>[k,SN[k]]),dyn,'default');
  if($('tcp-limit')){const L=D.dyn.limit;$('tcp-limit').innerHTML=stat('Calls',L.per_call.length,'ten different strings')+stat('Compiles',L.per_call.reduce((a,b)=>a+b,0),'calls 1 to '+(L.per_call.lastIndexOf(1)+1))+stat('recompile_limit',L.recompile_limit,'config at 2.14.1')+stat('Calls 9 and 10','eager','no compile, no error');
    $('tcp-limit-msg').textContent=L.warning[0].split('\nTo diagnose')[0]}
  if($('tcp-unb-code')){const U=D.dyn.unb;const pick=c=>c.split('\n').filter(l=>/Sym\(|_assert_scalar|u\d|item|nonzero|getitem: "i64/.test(l)).map(l=>l.replace(/^\s+/,'  ').replace(/;\s+\w+ = .*$/,'')).join('\n');
    $('tcp-unb-code').textContent='# lengths.max().item() used to slice (capture_scalar_outputs=True), '+U.item_capture.graphs+' graph, '+U.item_capture.breaks+' breaks\n'+pick(U.item_capture.code)+'\n\n# torch.nonzero(x > 0) (capture_dynamic_output_shape_ops=True), '+U.nonzero_capture.graphs+' graph, '+U.nonzero_capture.breaks+' breaks\n'+pick(U.nonzero_capture.code)+'\n\n# defaults: .item() and nonzero() each break the graph ('+U.item_default.breaks+' and '+U.nonzero_default.breaks+' break)'}
  // 4. PGO
  if($('tcp-pgo')){const P=D.pgo,f=r=>r.compiles_per_call.join(' + ')+' compiles';$('tcp-pgo').textContent='without a job id, process 1: '+f(P[0])+', process 2: '+f(P[1])+'; with TORCH_COMPILE_JOB_ID set, process 1: '+f(P[2])+', process 2: '+f(P[3])+' (its first graph already had T as the symbol s75). Recorded, exp/pgo.sh.'}
  // 5. partitioner bars and the budget predict answer
    const st=D.steady,ba=$('tcp-budget-ans');
  if(ba)ba.dataset.html='<b>'+(st['budget_0.0'].median_ms/st.whole.median_ms).toFixed(2)+' times: '+st['budget_0.0'].median_ms+' ms against '+st.whole.median_ms+' ms</b> (budget 0.5: '+st['budget_0.5'].median_ms+' ms; medians of 5 x 20 steps, CPU, 4 threads, bench lock, load average about '+st.whole.load.toFixed(0)+'). Well under 2 times: only the forward work that the backward needs is repeated, and the step also holds the rest of the backward and the optimizer. For that it keeps no activation at all (34.81 MB to 0).';
  // 7. modes
  if($('tcp-modes-tbl'))$('tcp-modes-tbl').innerHTML=table(['mode','Inductor options it sets (list_mode_options, 2.14.1)'],Object.entries(D.modes).map(([k,v])=>['<code>'+k+'</code>',typeof v==='string'?esc(v):(Object.keys(v).length?Object.entries(v).map(([a,b])=>'<code>'+a+'='+b+'</code>').join(', '):'nothing (the defaults)')]));
  // 8. compiled autograd and DDP
  const CN={aot_nohook:'AOTAutograd backward',aot_hook:'AOTAutograd backward + a gradient hook',ca_nohook:'compiled autograd',ca_hook:'compiled autograd + the hook'};
  if($('tcp-ca-tbl'))$('tcp-ca-tbl').innerHTML=table(['Setup','Graphs handed to the backend (ops each)','AccumulateGrad nodes in a graph','Max gradient difference vs eager'],Object.entries(CN).map(([k,n])=>[n,D.ca[k].graphs.length+': '+D.ca[k].graphs.map(g=>g[0]).join(' + '),D.ca[k].graphs.reduce((a,g)=>a+g[1],0),D.ca[k].diff.toExponential(1)]));
  if($('tcp-ddp'))$('tcp-ddp').innerHTML=D.ddp.map(r=>stat(r.optimize_ddp?'ddp_optimizer, buckets '+r.bucket_cap_mb+' MB':'optimize_ddp=False',r.graphs+' graph'+(r.graphs>1?'s':''),'ops: '+r.ops_per_graph.join(' + '))).join('');
  // 11. export table
  if($('tcp-exp-tbl')){const E=D.exp;const rows=E.dyn.map(d=>[esc(d.label),d.ok?'exported; ranges '+Object.values(d.range_constraints).join(', '):'<span class="ann">'+esc(d.error_type)+'</span>: '+esc(d.error.split('\n').slice(0,2).join(' ').slice(0,170))]);
    Object.entries(E.cf).forEach(([k,v])=>rows.push([esc(k.replace('python_if','Python if on t.sum() > 0').replace('torch_cond','torch.cond').replace('_strict',', strict').replace('_nonstrict',', non-strict')),v.ok?'exported ('+v.ops.length+' ops)':'<span class="ann">'+esc(v.error_type)+'</span>: '+esc(v.error.split('\n')[0].slice(0,140))]));
    $('tcp-exp-tbl').innerHTML=table(['What was exported','Result, recorded'],rows)}
  // 12. tlparse and minifier
  if($('tcp-tl-tbl'))$('tcp-tl-tbl').innerHTML=table(['Compile id','Artifacts','Notable'],D.tl.compiles.filter(c=>c.id!=='[-/-]').map(c=>[c.id,c.artifacts.length,esc(Object.entries(c.notes).map(([k,v])=>{const l=v.split('\n').filter(l=>/Reason|Explanation|mismatch/.test(l))[0];return l?k.replace(/\.\w+$/,'')+': '+l:''}).filter(Boolean).join('; ').replace(/Graph Break Reason: /,'').slice(0,170))||(c.artifacts.some(a=>/resume_in/.test(a))?'resume function after the print':'compiled: Dynamo graph, AOT graphs, Inductor code, guards')]));
  if($('tcp-mini')){const M=D.mini;$('tcp-mini').innerHTML=stat('Started with',M.started[0]+' nodes')+stat('Shrinks',M.shrinks.map(s=>s.join(' to ')).join(', '))+stat('Queries',M.queries[0])+stat('Launcher time','about '+M.launcher_seconds+' s','one unlocked run');
    $('tcp-mini-code').textContent='# minimal repro written by the minifier (repro.py), forward only\n'+M.final_graph}
})();
