// ---- Reading section 5 (moved from the Control flow tab, 2026-10-23): a chooser (closed block) and every loop form measured.
(function(){
const J=window.JC, U=window.JCU, esc=RD.esc, $=id=>document.getElementById(id), C=J.cf;
const row=(n,v)=>C.loops.rows.find(r=>r.n===n&&r.variant===v);
const Q=[
 {id:'kind',q:'What do you need?',o:[['branch','choose between computations'],['loop','repeat a step']]},
 {id:'cheap',q:'Are all branches cheap (a few elementwise ops)?',o:[['y','yes'],['n','no, at least one is expensive']],when:s=>s.kind==='branch'},
 {id:'nway',q:'How many branches?',o:[['2','two'],['n','more than two, chosen by an integer']],when:s=>s.kind==='branch'},
 {id:'vb',q:'Will the predicate differ per example under vmap?',o:[['n','no (one decision per call or batch)'],['y','yes']],when:s=>s.kind==='branch'},
 {id:'known',q:'Is the number of steps known when the function is traced (a Python int)?',o:[['y','yes'],['n','no, it depends on data (convergence, early stop)']],when:s=>s.kind==='loop'},
 {id:'grad',q:'Do you need reverse-mode gradients through the loop?',o:[['y','yes'],['n','no']],when:s=>s.kind==='loop'},
 {id:'assoc',q:'Is the step an associative combine (cumulative sum or max, a linear recurrence h = a h + b)?',o:[['n','no'],['y','yes']],when:s=>s.kind==='loop'&&s.known==='y'},
 {id:'len',q:'How many steps, or how deep is the model?',o:[['s','a handful (under about 10)'],['l','tens to thousands']],when:s=>s.kind==='loop'&&s.known==='y'},
];
const st={kind:'loop',cheap:'n',nway:'2',vb:'n',known:'y',grad:'y',assoc:'n',len:'l'};
function rec(){const ms=(r,k)=>r?r[k]:NaN;
  if(st.kind==='branch'){let out='';
    if(st.cheap==='y')out='<b>jnp.where</b> (a <code>select_n</code>): compute both sides and pick elementwise. No branching overhead, vmaps and differentiates trivially. Watch the NaN-gradient trap if one side is invalid for some inputs (Reading section 7).';
    else out='<b>'+(st.nway==='n'?'lax.switch(index, [f0, f1, ...], x)':'lax.cond(pred, true_fn, false_fn, x)')+'</b>: both branches are compiled, only one runs.';
    if(st.vb==='y'&&st.cheap!=='y')out+=' <span style="color:var(--bad)">But under vmap with a per-example predicate it becomes a select and <b>every branch runs for every example</b>: measured '+C.cond_vmap.ms_pred_batched.toFixed(2)+' ms against '+C.cond_vmap.ms_pred_not_batched.toFixed(3)+' ms for a heavy branch never taken.</span> If the expensive branch is rare, restructure: compute it for a gathered subset, or decide per batch.';
    return out+' grad, jvp and vmap all work (measured table in section 5 above).'}
  if(st.known==='n'){if(st.grad==='y')return '<b>No primitive does this directly.</b> <code>lax.while_loop</code> runs a data-dependent number of steps but refuses reverse mode ("'+esc(C.support.while_loop.grad.split(':')[1].trim().split('.')[0])+'"). Options: a <code>lax.scan</code> to a fixed maximum length with a mask that freezes the carry once done (exact gradients, pays the maximum); or, for fixed points and solvers, a <code>custom_vjp</code> that differentiates the solution implicitly (Reading section 7: constant memory, gradients matched the unrolled loop).';
    return '<b>lax.while_loop(cond_fun, body_fun, init)</b>: run-time trip count, forward-mode differentiable, vmappable (a vmapped while runs until every example is done: counts '+esc(JSON.stringify(C.while_vmap.counts))+' all paid for the longest). Measured at 1,000 steps: compile '+ms(row(1000,'while_loop'),'compile_s').toFixed(2)+' s.'}
  if(st.assoc==='y')return '<b>lax.associative_scan(combine, elems)</b> if you run on a GPU or TPU and the sequence is long: about log2(n) parallel rounds instead of n sequential steps, at several times the total work (measured '+(C.assoc.rows[2].assoc_flops/(2*256*8192)).toFixed(1)+'x the FLOPs at n = 8,192). On a CPU, a plain <code>lax.scan</code> was faster at every length measured ('+C.assoc.rows[2].scan_ms.toFixed(2)+' ms against '+C.assoc.rows[2].assoc_ms.toFixed(2)+' ms at n = 8,192).';
  if(st.len==='s')return '<b>A Python for loop</b> is fine: it unrolls into the jaxpr, which XLA can optimise across iterations, and a handful of copies compiles quickly (n = 10: '+ms(row(10,'python for'),'compile_s').toFixed(2)+' s against '+ms(row(10,'scan'),'compile_s').toFixed(2)+' s for scan). Switch to scan as soon as the count grows.';
  return '<b>lax.scan(step, carry, xs)</b> (or <code>lax.fori_loop</code> with Python-int bounds, which becomes a scan): one compiled body whatever the length, reverse-differentiable, vmappable. Measured at 1,000 steps: compile '+ms(row(1000,'scan'),'compile_s').toFixed(2)+' s and '+row(1000,'scan').hlo_lines+' HLO lines, against '+ms(row(1000,'python for'),'compile_s').toFixed(1)+' s and '+row(1000,'python for').hlo_lines.toLocaleString('en-US')+' lines unrolled, for about the same run time. This is why model code scans over layers. Use <code>unroll=k</code> to trade compile time for cross-iteration optimisation on accelerators.'}
function drawQ(){let h='';Q.forEach(q=>{if(q.when&&!q.when(st))return;h+='<div style="margin:6px 0"><div class="small" style="font-weight:600">'+esc(q.q)+'</div><span class="seg" data-q="'+q.id+'">'+q.o.map(o=>'<button data-m="'+o[0]+'"'+(st[q.id]===o[0]?' class="on"':'')+'>'+esc(o[1])+'</button>').join('')+'</span></div>'});
  $('jccf-q').innerHTML=h;$('jccf-q').querySelectorAll('.seg').forEach(s=>RD.seg(s,m=>{st[s.dataset.q]=m;drawQ()}));
  $('jccf-out').innerHTML='<div class="t">Recommendation</div>'+rec()}
drawQ();
// measured bars
let metric='compile_s',n=1000;
const names={compile_s:'compile time',run_ms:'run time',hlo_lines:'optimised HLO lines',eqns_total:'jaxpr equations (with bodies)'};
function fmtM(v){return metric==='compile_s'?v.toFixed(v<1?3:1)+' s':metric==='run_ms'?v.toFixed(2)+' ms':Math.round(v).toLocaleString('en-US')}
function drawB(){const rows=C.loops.rows.filter(r=>r.n===n);U.bars($('jccf-bars'),rows.map(r=>({nm:r.variant,v:r[metric],txt:fmtM(r[metric]),c:r.variant==='python for'?'var(--c2)':'var(--c1)',hl:r.variant==='scan'})));
  $('jccf-cap').innerHTML=esc(names[metric])+' at n = '+n.toLocaleString('en-US')+'. Every form returned the same result as scan (largest difference '+U.sig(Math.max(...rows.map(r=>r.max_diff_vs_scan)),2)+'). '+(metric==='run_ms'||metric==='compile_s'?'Measured on Apple M1 Pro (CPU), shared machine, low priority; load average during the run '+U.sig(C.load_start,3)+' to '+U.sig(C.load_end,3)+'.':'Deterministic.')}
RD.seg($('jccf-metric'),m=>{metric=m;drawB()});RD.seg($('jccf-n'),m=>{n=+m;drawB()});drawB();
$('jccf-code').textContent=C.loops.cell+'\n\n'+Object.entries(C.loops.code).map(([k,v])=>'# '+k+'\n'+v).join('\n\n');
U.bars($('jccf-cv'),[{nm:'predicate not batched (cond kept)',v:C.cond_vmap.ms_pred_not_batched,txt:C.cond_vmap.ms_pred_not_batched.toFixed(3)+' ms',c:'var(--c3)'},
  {nm:'Python loop of 8 conds in one jit',v:C.cond_vmap.ms_python_loop_of_cond,txt:C.cond_vmap.ms_python_loop_of_cond.toFixed(3)+' ms',c:'var(--c1)'},
  {nm:'predicate batched (cond became select)',v:C.cond_vmap.ms_pred_batched,txt:C.cond_vmap.ms_pred_batched.toFixed(2)+' ms',c:'var(--c2)',hl:1}]);
})();
