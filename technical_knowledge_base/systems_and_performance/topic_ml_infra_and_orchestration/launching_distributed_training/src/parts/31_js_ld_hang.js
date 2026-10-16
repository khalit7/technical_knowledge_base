// ---- Hang triage (t-ldhang) ----
(function(){
const D=window.LD,$=id=>document.getElementById(id),esc=RD.esc,H=D.hang;
const C={
 rank0_extra:{name:'Case 1',bug:'rank 0 alone all-reduces a metric (a collective under <code>if rank == 0:</code>)',odd:0,
  q:'Seconds after step 5, one rank aborts and the other three report connection errors. What is wrong?',
  opts:[['A flaky network between two ranks',0],['One rank called a collective the others did not, so it was matched with their next one',1],['Rank 0 ran out of memory',0]],
  why:'Rank 0 issued an all-reduce of 4 bytes (one float) that the others never issued; gloo matched it with their next collective, DDP\'s gradient all-reduce, and rank 0 received far more data than it expected: "Received data size doesn\'t match expected size. Is there a distributed collective mismatch in your code?" (exit −6, SIGABRT). The others only see their peer vanish. The process died too fast for py-spy (it ran at 25 s).',
  fix:'Every rank calls the same collectives in the same order: compute the metric on all ranks and all-reduce it on all ranks, or keep rank-0-only work free of collectives.'},
 shape:{name:'Case 2',bug:'rank 3 all-reduces a tensor of shape [2] where the others use shape []',odd:3,
  q:'Nothing is logged for a minute after step 5, then all four ranks time out. py-spy shows the stacks below. Which rank is the odd one, and why?',
  opts:[['Rank 0: it is the master',0],['Rank 3: it is still in the metric all-reduce while the others have moved on into the next backward',1],['None: all four are waiting, so it is the network',0]],
  why:'Three ranks are in <code>backward</code> (DDP\'s gradient all-reduce of the next step); rank 3 is still in the all-reduce of line 94, the loss metric it built with a different shape. Sizes differ, the collective can never complete, and nothing reports it until the 60 s process-group timeout. TORCH_DISTRIBUTED_DEBUG=DETAIL would name both shapes, but crashes DDP on torch 2.14.1 (switch the toggle).',
  fix:'Build collective inputs the same way on every rank; check shapes with DETAIL on a reproduction without DDP.'},
 uneven:{name:'Case 3',bug:'rank 3 has one batch fewer, so its loop ends one step early',odd:3,
  q:'At the very end of an epoch three ranks fail with "Connection closed by peer ... typically caused by a remote worker crashing", but no rank logged a crash. What happened?',
  opts:[['A rank was killed by the out-of-memory killer',0],['One rank finished its loop early and exited normally; the others were still in a collective with it',1],['The store host went down',0]],
  why:'Rank 3 logged "end" after 11 steps and exited with code 0; the others were in step 12\'s collectives with it and lost the connection 0.4 to 0.9 s later. The message blames a crash because a closed socket looks the same either way.',
  fix:'Equal batches per rank (DistributedSampler with drop_last=True) or DDP\'s join() context manager for uneven inputs.'},
 stuck:{name:'Case 4',bug:'rank 1 blocks forever inside its data loader',odd:1,
  q:'After step 5 the job is silent. A minute later three ranks time out ("Timed out waiting 60000ms for recv operation"), one says nothing. Which rank is the culprit?',
  opts:[['The one that says nothing: it never reached the collective',1],['Rank 0, the first to time out',0],['All four equally',0]],
  why:'Three ranks sit in backward\'s gradient all-reduce; rank 1 is in <code>threading.Event.wait</code> inside <code>next_batch</code>. It is not in any collective, so it never times out; only the stacks or the flight recorder (rank 1 issued 15 collectives, the others 16: "missing ranks: {1}") name it.',
  fix:'A timeout on every blocking call in the data path, and a watchdog that dumps stacks when steps stop.'}};
const ORDER=['rank0_extra','shape','uneven','stuck'];
let cur='rank0_extra',dbg='OFF';const solved={};
function stacks(h,odd){const ks=Object.keys(h.pyspy).sort();if(!ks.length)return '<p class="small mute">No py-spy dump: the job had already ended at 25 s.</p>';
  return '<div class="hg-stk">'+ks.map(r=>{const main=[];let on=false;h.pyspy[r].forEach(l=>{if(/^Thread/.test(l)){on=/MainThread/.test(l);return}if(on)main.push(l.trim())});
    return '<div'+(+r===odd?' class="odd"':'')+'><b>rank '+r+(+r===odd?' (the odd one)':'')+'</b><pre>'+esc(main.join('\n'))+'</pre></div>'}).join('')+'</div>'}
function render(){const c=C[cur],h=H[cur+'_'+dbg];
  $('hg-pick').innerHTML=ORDER.map(k=>'<button data-k="'+k+'"'+(k===cur?' class="on"':'')+'>'+C[k].name+(solved[k]?' ✓':'')+'</button>').join('')+'<button data-k="ok"'+(cur==='ok'?' class="on"':'')+'>Baseline (no bug)</button>';
  if(cur==='ok'){const o=H['ok_'+dbg];$('hg-body').innerHTML='<div class="hg-box"><h4>Baseline</h4><p class="small">'+(dbg==='OFF'?'No bug: all 4 ranks ran 12 steps and exited 0 after '+o.wall+' s.':'The same healthy job with DETAIL: every rank died with exit code '+o.exitcodes.join(', ')+' (SIGSEGV) after '+o.wall+' s, before step 1, inside DDP\'s constructor (Reading tab, section 8).')+'</p></div>';return}
  let s='<div class="hg-box"><h4>What you see in the logs</h4><p class="small">Bug injected at step 5. Ranks that logged their last step: '+Object.entries(h.last_step).sort().map(([r,v])=>'rank '+r+' at step '+v).join(', ')+'. '+(h.ended.length?'Ended normally: rank '+h.ended.join(', ')+'. ':'')+'Job exit '+h.exit+' after '+h.wall+' s; worker exit codes in torchrun\'s report: '+(h.exitcodes.join(', ')||'none')+'.</p>';
  if(dbg==='DETAIL'){s+='<div class="hg-err">Every rank: Fatal Python error: Segmentation fault (exit code −11), before the first step.</div><p class="small">With TORCH_DISTRIBUTED_DEBUG=DETAIL this case never reached its bug: DDP\'s constructor crashed on every rank (torch 2.14.1 CPU builds, Reading tab section 8). What DETAIL reports when it works, on a two-rank reproduction without DDP:</p><div class="hg-err" style="border-left-color:var(--good)">'+esc(D.detail.mismatch_DETAIL.mismatch)+'</div></div>';$('hg-body').innerHTML=s;return}
  Object.entries(h.errors).sort((a,b)=>a[1].t-b[1].t).forEach(([r,e])=>{s+='<div class="hg-err">rank '+r+' (+'+e.t+' s): '+esc(e.type+': '+e.msg)+'</div>'});
  h.enforce.forEach(l=>{s+='<div class="hg-err">'+esc(l)+'</div>'});
  if(!Object.keys(h.errors).length&&!h.enforce.length)s+='<p class="small mute">No error messages.</p>';
  s+='</div><div class="hg-box"><h4>'+c.name+': '+esc(c.q)+'</h4><div class="opts" id="hg-opts">'+c.opts.map(o=>'<button data-r="'+o[1]+'">'+esc(o[0])+'</button>').join('')+'</div><div id="hg-ans"'+(solved[cur]?'':' hidden')+'>'+
   '<div class="ans"><b>The bug:</b> '+c.bug+'. '+c.why+'</div><p class="small"><b>Fix:</b> '+esc(c.fix)+'</p><h4>py-spy at +'+(h.pyspy_at||25)+' s, main thread of each rank</h4>'+stacks(h,c.odd)+
   (cur==='stuck'?'<h4>Flight recorder, dumped by the watchdog</h4><div class="tw"><table style="min-width:560px"><thead><tr><th>Rank</th><th class="num">Collectives recorded</th><th class="num">Last sequence number</th><th>Last op, sizes</th><th>State</th></tr></thead><tbody>'+
     Object.entries(D.fr.ranks).map(([r,v])=>'<tr'+(+r===c.odd?' style="color:var(--bad);font-weight:600"':'')+'><td>'+r+'</td><td class="num">'+v.n+'</td><td class="num">'+v.last_seq+'</td><td>'+esc(v.last_name)+' '+esc(JSON.stringify(v.last_sizes))+'</td><td>'+esc(v.state)+'</td></tr>').join('')+'</tbody></table></div><p class="small">Rank 1 is one collective behind. Sequence 16 is the gradient all-reduce of 112,577 values (the whole model in one DDP bucket); rank 1\'s last entry is the scalar loss all-reduce of the step before. <code>torchfrtrace</code> reached the same verdict, "missing ranks: {1}", once the gloo dump\'s group name was patched (Reading tab, section 8).</p>':'')+
   (Object.keys(h.watchdog).length?'<details class="mist"><summary>What the in-process watchdog wrote for rank '+c.odd+' (faulthandler)</summary><div class="b"><pre style="white-space:pre-wrap;font-size:11.5px">'+esc((h.watchdog[c.odd]||[]).join('\n'))+'</pre></div></details>':'')+'</div></div>';
  $('hg-body').innerHTML=s;
  $('hg-opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('hg-opts').querySelectorAll('button').forEach(x=>x.classList.toggle(x.dataset.r==='1'?'right':'wrong',x===b||x.dataset.r==='1'));solved[cur]=1;$('hg-ans').hidden=false;
    $('hg-pick').querySelector('button[data-k="'+cur+'"]').textContent=C[cur].name+' ✓'});
}
$('hg-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;render()});
RD.seg($('hg-dbg'),m=>{dbg=m;render()});
$('hg-sum').innerHTML=[['A collective on one rank only','abort on that rank, "connection closed" on the others',''+H.rank0_extra_OFF.errors[Object.keys(H.rank0_extra_OFF.errors)[0]].t+' s','gloo\'s size check ("collective mismatch")'],
 ['Different shapes','silence, then every rank times out',H.shape_OFF.errors['0'].t+' s (the pg timeout)','py-spy: the one rank in a different collective'],
 ['Uneven batches','"connection closed" after the short rank exits 0',H.uneven_OFF.errors['0'].t+' s','that rank\'s clean "end"; logs, not stacks'],
 ['A rank stuck in user code','silence, then all but one time out',H.stuck_OFF.errors['0'].t+' s (the pg timeout)','py-spy or the flight recorder (one collective behind)']].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>').join('');
render();
})();
