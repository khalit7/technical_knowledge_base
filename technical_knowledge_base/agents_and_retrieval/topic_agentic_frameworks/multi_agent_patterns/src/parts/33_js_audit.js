// Audit lab: run picker, lanes, stats, briefs or board claims, and the found/missed matrix.
(function(){
  const U=FMU,A=FM.audit,esc=RD.esc;
  const order=['single','multi','fanout','board','boardv','boardb','boardsharp','checkshown','checkblind'];
  const runs=[];order.forEach(d=>U.runs(d).forEach(r=>runs.push(r)));U.runs('single','sonnet').forEach(r=>runs.push(r));
  const lab=r=>(U.DN[r.design]||r.design)+(r.model==='sonnet'?', Sonnet':'')+' '+r.rep;
  const setv=(k,v)=>document.querySelectorAll('#t-audit .fm-v[data-v="'+k+'"]').forEach(e=>{e.textContent=v;e.classList.remove('fm-miss')});
  setv('aud.nruns',runs.length);
  let cur=0;
  const chips=document.getElementById('fma-chips');
  chips.innerHTML=runs.map((r,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+lab(r)+'</button>').join('');
  function stats(r){
    const calls=r.lanes.reduce((a,l)=>a+l.calls.length,0),reads=r.lanes.reduce((a,l)=>a+l.reads,0),part=r.lanes.reduce((a,l)=>a+l.partial,0);
    document.getElementById('fma-stats').innerHTML=RD.stat('Planted found',r.tp+' of 16','recall '+U.nf(100*r.tp/16,0)+'%')+RD.stat('Other reports',r.fp,r.found?U.nf(100*r.tp/r.found,0)+'% of reports are planted bugs':'')+
      RD.stat('Cost equivalent',U.usd(r.tot.cost),'total_cost_usd')+RD.stat('Wall time',U.secs(r.wall),'')+RD.stat('Model calls',calls,r.lanes.length+' loop'+(r.lanes.length>1?'s':''))+
      RD.stat('Largest context',U.nf(U.lanePeak(r)),'tokens in one call')+RD.stat('Reads',reads,part?part+' partial':'all whole files')+RD.stat('Tokens processed',U.tok(r.tot.processed),'output '+U.tok(r.tot.output)+' (thinking '+U.tok(r.tot.thinking)+')');
  }
  function extra(r){
    let h='';
    if(r.briefs&&r.briefs.length){h+='<h3>The briefs the lead wrote</h3><p class="small">Our instruction asked for six groups of eight; these are the six prompts the lead model actually sent to its auditors (Anthropic: a brief needs "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries").</p>'+
      r.briefs.map((b,i)=>'<details class="qa"'+(i===0?' open':'')+'><summary>Brief '+(i+1)+'</summary><div class="fma-brief">'+esc(b)+'</div></details>').join('')}
    if(r.claims){const by={};Object.values(r.claims).forEach(c=>{by[c[0]]=(by[c[0]]||0)+1});
      h+='<h3>Who claimed what</h3><p class="small">Modules claimed per agent from the shared board (no lead assigned them): '+Object.keys(by).sort().map(k=>k+' '+by[k]).join(', ')+'. Faster agents took more.</p>'}
    if(r.vt){const v=r.vt;h+='<h3>The check round</h3><p class="small">'+r.posted+' findings posted, '+r.verdicts+' verdicts. Planted bugs kept '+v.real_kept+', planted bugs rejected '+v.real_dropped+'; other reports kept '+v.false_kept+', other reports rejected '+v.false_dropped+(v.unchecked?', unchecked '+v.unchecked:'')+'.</p>'}
    if(r.wrong&&r.wrong.length){h+='<details class="qa"><summary>The '+r.fp+' other reports: '+Object.entries(r.xk||{}).map(([k,v])=>v+' '+({ratio:'"can exceed 1"',valueerror:'"never raises ValueError"',thread:'thread safety',other:'other'}[k]||k)).join(', ')+' (first 60 names)</summary><div class="small">'+r.wrong.map(w=>esc(w.replace('fleetops/',''))).join(', ')+'</div></details>'}
    document.getElementById('fma-extra').innerHTML=h;
  }
  function matrix(){
    const t=document.getElementById('fma-matrix');
    t.innerHTML='<thead><tr><th class="l">Planted bug</th><th class="l">Kind</th>'+runs.map((r,i)=>'<th title="'+esc(lab(r))+'"'+(i===cur?' class="sel"':'')+'>'+(i+1)+'</th>').join('')+'</tr></thead><tbody>'+
      A.truth.map(k=>'<tr><td class="l">'+esc(k.replace('fleetops/',''))+'</td><td class="l">'+A.kinds[k]+'</td>'+runs.map(r=>r.hit.includes(k)?'<td class="y">&#10003;</td>':'<td class="n">&middot;</td>').join('')+'</tr>').join('')+
      '<tr><td class="l"><b>found</b></td><td></td>'+runs.map(r=>'<td><b>'+r.tp+'</b></td>').join('')+'</tr><tr><td class="l"><b>other</b></td><td></td>'+runs.map(r=>'<td>'+r.fp+'</td>').join('')+'</tr></tbody>';
  }
  function show(){const r=runs[cur];stats(r);FMLanes.svg(document.getElementById('fma-lanes'),r,{});extra(r);matrix()}
  chips.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=+b.dataset.i;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));show()});
  RD.onRenderTab('t-audit',show);RD.onResize(()=>FMLanes.svg(document.getElementById('fma-lanes'),runs[cur],{}),'t-audit');
})();
