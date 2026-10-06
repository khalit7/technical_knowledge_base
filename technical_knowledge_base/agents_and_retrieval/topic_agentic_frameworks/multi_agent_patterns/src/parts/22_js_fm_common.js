// Shared helpers for this page and every number quoted in prose: prose spans <span class="fm-v" data-v="key">
// are filled from window.FM (the recordings), so the text cannot drift from the data.
window.FMU=(function(){
  const nf=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const usd=x=>'$'+(x>=1?nf(x,2):x>=0.1?nf(x,3):nf(x,4));
  const secs=x=>x>=90?nf(x/60,1)+' min':nf(x,0)+' s';
  const tok=x=>x>=1e6?nf(x/1e6,2)+'M':x>=1e4?nf(x/1e3,0)+'K':nf(x,0);
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
  const times=x=>nf(x,1)+' times';
  const DN={single:'One agent',multi:'Lead + 6 auditors',fanout:'Fan-out workflow',board:'Blackboard',boardv:'Blackboard + check (shown the claim)',boardb:'Blackboard + blind check',boardsharp:'Blackboard, sharp brief',checkshown:'Check only, shown the claim',checkblind:'Check only, blind'};
  const A=FM.audit.runs;
  const runs=(d,m)=>A.filter(r=>r.design===d&&(m||'haiku')===r.model).sort((a,b)=>String(a.rep).localeCompare(String(b.rep)));
  const lanePeak=r=>Math.max.apply(null,r.lanes.map(l=>l.peak));
  return {nf,usd,secs,tok,mean,times,DN,runs,lanePeak};
})();
(function(){
  const U=FMU,A=FM.audit,V={};
  const R=FM.root;
  V['root.s.cost']=U.usd(R.s.cost);V['root.m.cost']=U.usd(R.m.cost);V['root.cost_x']=U.nf(R.m.cost/R.s.cost,1)+'x';
  V['root.s.wall']=U.nf(R.s.wall,1)+' s';V['root.m.wall']=U.nf(R.m.wall,1)+' s';V['root.wall_x']=U.nf(R.m.wall/R.s.wall,1)+'x';
  V['root.s.proc']=U.nf(R.s.proc);V['root.m.proc']=U.nf(R.m.proc);V['root.proc_x']=U.nf(R.m.proc/R.s.proc,1)+'x';
  V['root.s.hid']=R.s.hid+' of '+R.s.nhid;V['root.m.hid']=R.m.hid+' of '+R.m.nhid;
  V['n_cc_runs']=U.nf(FM.n_sessions);
  V['deb.n']=FM.debate.puzzles.length;V['ho.n']=FM.handoffs.length;
  const C=FM.corpus;V['aud.mod']=C.modules;V['aud.kb']=U.nf(C.bytes/1024,0)+' KB';V['aud.claims']=U.nf(A.claims);V['aud.bugs']=A.truth.length;
  V['aud.lmin']=C.lines_min;V['aud.lmax']=C.lines_max;
  // module text in tokens: the fan-out prompts carry exactly the module text plus a measured frame
  const f1=U.runs('fanout')[0];
  if(f1){const ins=f1.lanes.map(l=>l.calls[0][1]);V['aud.tok']=U.nf(Math.round((ins.reduce((a,b)=>a+b,0)-ins.length*FM.probe.overhead)/1000))+',000';}
  V['aud.ovh']=U.nf(FM.probe.overhead);
  const so=U.runs('single','sonnet')[0];
  if(so){V['aud.sonnet.peak']=U.nf(U.lanePeak(so));V['aud.sonnet.calls']=so.lanes[0].calls.length;V['aud.sonnet.cost']=U.usd(so.tot.cost);V['aud.sonnet.wall']=U.secs(so.wall);V['aud.sonnet.tp']=so.tp;}
  const s=U.runs('single');
  if(s[0]){V['aud.s1.partial']=s[0].lanes[0].partial;V['aud.s1.calls']=s[0].lanes[0].calls.length;V['aud.s1.reads']=s[0].lanes[0].reads}
  if(s[1]){V['aud.s2.reads']=new Set(s[1].lanes[0].calls.flatMap(c=>c[2]).filter(t=>t[0]==='Read').map(t=>t[1].split(' ')[0])).size}
  const m=U.runs('multi'),fa=U.runs('fanout');
  {const mx=m.map(r=>r.fp).filter(x=>x>0);if(mx.length)V['aud.multi3.x']=mx.join(' and ');}
  if(m.length){V['aud.multi.leadpeak']=U.nf(Math.max.apply(null,m.map(r=>r.lanes[0].peak)));}
  const mc=d=>U.mean(U.runs(d).map(r=>r.tot.cost)),mw=d=>U.mean(U.runs(d).map(r=>r.wall));
  if(m.length&&s.length)V['aud.multi_vs_single']=U.nf(mc('multi')/mc('single'),1)+' times';
  if(fa.length&&m.length){V['aud.fan1.cost']=U.usd(fa[0].tot.cost);V['aud.fan1_vs_multi']=U.nf(100*fa[0].tot.cost/mc('multi'),0)+'%';}
  if(m.length&&fa.length){V['aud.fan_vs_multi']=U.nf(100*mc('fanout')/mc('multi'),0)+'%';V['aud.fan_vs_multi_wall']=U.nf(100*mw('fanout')/mw('multi'),0)+'%';}
  // handoffs
  const H=FM.handoffs,pt=r=>r.reqs.reduce((a,x)=>a+(x.usage.prompt_tokens||0),0);
  const ht=H.filter(r=>r.design==='handoff'),at=H.filter(r=>r.design==='as_tool');
  if(ht.length&&at.length)V['ho.tok_x']=U.nf(U.mean(at.map(pt))/U.mean(ht.map(pt)),1)+' times';
  V['ho.claim']=H.filter(r=>r.score.reply_claims_refund).length;V['ho.refund']=H.filter(r=>r.score.refund_done).length;
  window.FMV=V;
  if(window.FM_EXTRA_V)window.FM_EXTRA_V(V);
  document.querySelectorAll('.fm-v').forEach(e=>{const k=e.dataset.v;if(k in V)e.textContent=V[k];else{e.textContent='?';e.classList.add('fm-miss')}});
  // the table in "In one screen"
  const tb=document.querySelector('#fm-sum tbody');
  if(tb){const ac=d=>{const r=U.runs(d);return r.length?r.map(x=>x.tp).join(', ')+' of 16 found':''};
    const rows=[['One agent','the model','everything it read, in one context','audit: '+ac('single')+' (it skipped what did not fit)','#rs3'],
      ['Orchestrator-workers','the lead model','each worker: its brief and its reading; lead: the reports','audit: '+ac('multi')+', about '+(V['aud.multi_vs_single']||'?')+' the single agent\'s cost','#rs3'],
      ['Fan-out workflow','your code','each call: its slice','audit: '+ac('fanout')+', the cheapest parallel design','#rs4'],
      ['Blackboard','nobody: agents claim work from a store','own work plus the store','audit: all found, plus up to 170 reports outside the brief; a sharp brief removed them','#rs5'],
      ['Handoff','the current agent, by a transfer call','the receiver gets the whole history','support desk: the second problem dropped in every run (local model)','#rs6'],
      ['Agents as tools','the manager model','a specialist gets only its generated input','support desk: both problems handled (local model)','#rs6'],
      ['Parallel writers','your code','each writer: the spec, not the other\'s code','open spec: halves fitted in 1 of 3 runs; contract first: 3 of 3','#rs7'],
      ['Debate and voting','your code runs rounds','solvers read each other\'s answers (debate) or nothing (voting)','30 logic puzzles: one sample 21, vote of 5 27, debate 29, one judge call 29','#rs8']];
    tb.innerHTML=rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td><a href="'+r[4]+'">'+r[4].replace('#rs','')+'</a></td></tr>').join('')}
})();
