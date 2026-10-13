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
    let h='<div class="tw"><table class="rd-tbl tcp-tbl">'+table(['Call','T','Compiled','Result'],S.calls.map((c,i)=>[i+1,c.T,c.compiled?'<b>'+c.compiled+'</b>':'0',c.error?'<span class="ann">'+esc(c.error.split(' (')[0])+'</span>':(c.compiled?'new version':'reused')]))+'</table></div>';
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
  const B=D.aot.block,K=[['default','default_partition'],['mincut_1.0','min-cut, budget 1.0'],['mincut_0.5','min-cut, budget 0.5'],['mincut_0.2','min-cut, budget 0.2'],['mincut_0.0','min-cut, budget 0.0']];
  if($('tcp-part-bars')){bars($('tcp-part-bars'),K.map(([k,n],i)=>({nm:n,ml:B[k].bw_ops+' backward ops, '+B[k].recomputed.length+' recomputed',v:B[k].saved_bytes_activations,txt:mb(B[k].saved_bytes_activations),col:i?'var(--c3)':'var(--c2)',hl:k==='mincut_1.0'})),B.default.saved_bytes_activations);
    $('tcp-part-note').textContent='Bytes of activations kept for backward (parameters and the block input excluded: they are kept anyway). Recorded with torch 2.14.1, CPU, exp/aot.py.'}
  const st=D.steady,ba=$('tcp-budget-ans');
  if(ba)ba.dataset.html='<b>'+(st['budget_0.0'].median_ms/st.whole.median_ms).toFixed(2)+' times: '+st['budget_0.0'].median_ms+' ms against '+st.whole.median_ms+' ms</b> (budget 0.5: '+st['budget_0.5'].median_ms+' ms; medians of 5 x 20 steps, CPU, 4 threads, bench lock, load average about '+st.whole.load.toFixed(0)+'). Well under 2 times: only the forward work that the backward needs is repeated, and the step also holds the rest of the backward and the optimizer. For that it keeps no activation at all (34.81 MB to 0).';
  // 7. modes
  if($('tcp-modes-tbl'))$('tcp-modes-tbl').innerHTML=table(['mode','Inductor options it sets (list_mode_options, 2.14.1)'],Object.entries(D.modes).map(([k,v])=>['<code>'+k+'</code>',typeof v==='string'?esc(v):(Object.keys(v).length?Object.entries(v).map(([a,b])=>'<code>'+a+'='+b+'</code>').join(', '):'nothing (the defaults)')]));
  // 8. compiled autograd and DDP
  const CN={aot_nohook:'AOTAutograd backward',aot_hook:'AOTAutograd backward + a gradient hook',ca_nohook:'compiled autograd',ca_hook:'compiled autograd + the hook'};
  if($('tcp-ca-tbl'))$('tcp-ca-tbl').innerHTML=table(['Setup','Graphs handed to the backend (ops each)','AccumulateGrad nodes in a graph','Max gradient difference vs eager'],Object.entries(CN).map(([k,n])=>[n,D.ca[k].graphs.length+': '+D.ca[k].graphs.map(g=>g[0]).join(' + '),D.ca[k].graphs.reduce((a,g)=>a+g[1],0),D.ca[k].diff.toExponential(1)]));
  if($('tcp-ddp'))$('tcp-ddp').innerHTML=D.ddp.map(r=>stat(r.optimize_ddp?'ddp_optimizer, buckets '+r.bucket_cap_mb+' MB':'optimize_ddp=False',r.graphs+' graph'+(r.graphs>1?'s':''),'ops: '+r.ops_per_graph.join(' + '))).join('');
  // 9, 10. compile time bars
  const C=D.ct,fmt=s=>s.toFixed(2)+' s';
  if($('tcp-reg-bars')){const R=[['cold_whole_4','Whole model, 4 blocks'],['cold_regional_4','Per block, 4 blocks'],['cold_nested_4','Nested region, 4 blocks'],['cold_whole_8','Whole model, 8 blocks'],['cold_regional_8','Per block, 8 blocks'],['cold_nested_8','Nested region, 8 blocks']];
    bars($('tcp-reg-bars'),R.map(([k,n])=>({nm:n,ml:'runs '+C[k].runs.map(r=>r.first.toFixed(2)).join(', '),v:C[k].med,txt:fmt(C[k].med),col:/regional/.test(k)?'var(--c3)':/nested/.test(k)?'var(--c4)':'var(--c2)'})));
    $('tcp-reg-note').textContent='Median of 3 fresh processes, each with an empty cache directory; first step = compile + one training step. CPU, 4 threads, torch 2.14.1, load average '+Math.min(...R.flatMap(([k])=>C[k].runs.map(r=>r.load))).toFixed(1)+' to '+Math.max(...R.flatMap(([k])=>C[k].runs.map(r=>r.load))).toFixed(1)+'.'}
  if($('tcp-cache-bars')){const R=[['cold_whole_4_save','Cold (empty cache)'],['mega_whole_4','Mega-cache into an empty cache'],['warm_whole_4','Warm (same cache directory)']];
    bars($('tcp-cache-bars'),R.map(([k,n])=>({nm:n,ml:'FX graph hits '+C[k].runs[0].hit[0]+', AOT hits '+C[k].runs[0].hit[2]+'; C++ compile wait '+(C[k].runs[0].ts['async_compile.wait']||0).toFixed(2)+' s',v:C[k].med,txt:fmt(C[k].med),col:k==='warm_whole_4'?'var(--c3)':k==='mega_whole_4'?'var(--c5)':'var(--c2)'})));
    $('tcp-cache-note').textContent='Whole model, 4 blocks, median of 3 rounds; each round: a cold run that saved the mega-cache ('+comma(C.cold_whole_4_save.runs[0].mega)+' bytes), a warm run in the same directory, a mega-cache load into a new empty directory. CPU, bench lock.'}
  // 11. export table
  if($('tcp-exp-tbl')){const E=D.exp;const rows=E.dyn.map(d=>[esc(d.label),d.ok?'exported; ranges '+Object.values(d.range_constraints).join(', '):'<span class="ann">'+esc(d.error_type)+'</span>: '+esc(d.error.split('\n').slice(0,2).join(' ').slice(0,170))]);
    Object.entries(E.cf).forEach(([k,v])=>rows.push([esc(k.replace('python_if','Python if on t.sum() > 0').replace('torch_cond','torch.cond').replace('_strict',', strict').replace('_nonstrict',', non-strict')),v.ok?'exported ('+v.ops.length+' ops)':'<span class="ann">'+esc(v.error_type)+'</span>: '+esc(v.error.split('\n')[0].slice(0,140))]));
    $('tcp-exp-tbl').innerHTML=table(['What was exported','Result, recorded'],rows)}
  // 12. tlparse and minifier
  if($('tcp-tl-tbl'))$('tcp-tl-tbl').innerHTML=table(['Compile id','Artifacts','Notable'],D.tl.compiles.filter(c=>c.id!=='[-/-]').map(c=>[c.id,c.artifacts.length,esc(Object.entries(c.notes).map(([k,v])=>{const l=v.split('\n').filter(l=>/Reason|Explanation|mismatch/.test(l))[0];return l?k.replace(/\.\w+$/,'')+': '+l:''}).filter(Boolean).join('; ').replace(/Graph Break Reason: /,'').slice(0,170))||(c.artifacts.some(a=>/resume_in/.test(a))?'resume function after the print':'compiled: Dynamo graph, AOT graphs, Inductor code, guards')]));
  if($('tcp-mini')){const M=D.mini;$('tcp-mini').innerHTML=stat('Started with',M.started[0]+' nodes')+stat('Shrinks',M.shrinks.map(s=>s.join(' to ')).join(', '))+stat('Queries',M.queries[0])+stat('Launcher time','about '+M.launcher_seconds+' s','one unlocked run');
    $('tcp-mini-code').textContent='# minimal repro written by the minifier (repro.py), forward only\n'+M.final_graph}
})();
