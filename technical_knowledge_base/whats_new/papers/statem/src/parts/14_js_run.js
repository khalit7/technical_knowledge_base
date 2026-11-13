// ---- Replay tab: the 440-trial grid (the replay itself is the 3D stage in 32_js_sc_rp.js, which defines window.__rpLoad) ----
(function(){
  const D=TRIALS,RP=D.replays,NODES=D.nodes;
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nice=n=>(n||'').replace(/_/g,' ');
  // ---- grid of all trials ----
  const per={};D.rows.forEach(r=>{(per[D.tasks[r[0]]]=per[D.tasks[r[0]]]||[]).push(r)});
  const V=RCV;
  $('gridStats').innerHTML=stat('trials passed',V.ds_pass+' / 440',fmt(100*V.ds_pass/440,2)+'%; paper 392/440 = 89.09%')+stat('tasks solved at least once',V.ds_cov+' / 88','all five passed: '+V.ds_all5)+stat('recorded API cost',usd(V.ds_cost,2),fmt(V.ds_cache_share,1)+'% of input tokens cached')+stat('runs with a refused goto',V.blk_n+' / 440',V.blk_events+' refusals; '+V.ds_timeouts+' agent timeouts');
  let order='name',selT=null;
  function grid(){let ts=Object.keys(per);const ps=t=>per[t].reduce((a,r)=>a+r[2],0),bs=t=>per[t].reduce((a,r)=>a+r[10],0);
    if(order==='pass')ts.sort((a,b)=>ps(a)-ps(b)||a.localeCompare(b));else if(order==='blk')ts.sort((a,b)=>bs(b)-bs(a)||a.localeCompare(b));else ts.sort();
    $('grid5').innerHTML=ts.map(t=>'<button class="tk'+(t===selT?' sel':'')+'" data-task="'+t+'" title="'+t+': '+ps(t)+'/5 passed"><span class="dots">'+per[t].map(r=>'<i class="'+(r[2]?'p':'')+(r[10]?' b':'')+'"></i>').join('')+'</span><span class="n">'+t+'</span></button>').join('');
    $('grid5').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{selT=b.dataset.task;grid();detail(selT)}))}
  function detail(t){const rows=per[t],d=$('gridDet');d.hidden=false;const rp=RP.map(r=>r.trial);
    d.innerHTML='<h3>'+t+'</h3><div class="tw"><table><thead><tr><th>trial</th><th>verifier</th><th class="num">cost</th><th class="num">time</th><th class="num">goto</th><th class="num">refused</th><th>route, gate</th><th>ended in</th></tr></thead><tbody>'+
      rows.map(r=>{const n=t+'__'+r[1];return '<tr><td class="mono">'+r[1]+(rp.includes(n)?' <a href="#" data-rp="'+n+'">replay</a>':'')+'</td><td>'+(r[2]?'pass':r[8]===1?'fail (timeout)':'fail')+'</td><td class="num">'+usd(r[3],3)+'</td><td class="num">'+r[7]+' s</td><td class="num">'+r[9]+'</td><td class="num">'+r[10]+'</td><td>'+(r[13]||'none recorded')+(r[14].length?': '+r[14].join(', '):'')+'</td><td>'+nice(NODES[r[12]])+'</td></tr>'}).join('')+'</tbody></table></div>';
    d.querySelectorAll('a[data-rp]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();__rpLoad(a.dataset.rp)}))}
  segBind('gridM',m=>{order=m;grid()});grid();
  $('gridNote').innerHTML='Not shown: <code>gpt2-codegolf</code>, excluded from the released job; the paper reports it 0/5 at the standard timeout and 3/5 with an extended one (not released). Route "none recorded" means the run wrote no risk route; a gate is a task-family check the run selected (18 different gates, '+V.gates_one_task+' of them selected on only one task).';
})();
