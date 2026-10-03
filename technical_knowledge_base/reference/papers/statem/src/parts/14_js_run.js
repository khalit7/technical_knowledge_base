// ---- Replay tab: real StateM histories from the released DeepSeek trials, and the 440-trial grid ----
(function(){
  const D=TRIALS,RP=D.replays,NODES=D.nodes;
  const EDGES=[['direct_solve','task_contract_check'],['direct_solve','handoff'],['task_contract_check','repair'],['task_contract_check','guard_evidence_check'],['task_contract_check','self_review'],['task_contract_check','handoff'],['self_review','soft_guard'],['soft_guard','handoff'],['self_review','repair'],['self_review','focused_guard'],['soft_guard','repair'],['soft_guard','focused_guard'],['focused_guard','guard_evidence_check'],['focused_guard','handoff'],['guard_evidence_check','handoff'],['guard_evidence_check','repair'],['repair','task_contract_check'],['repair','handoff']];
  const WIDE={direct_solve:[0,0],task_contract_check:[1,0],self_review:[2,0],soft_guard:[3,0],focused_guard:[3,1],guard_evidence_check:[4,1],handoff:[5,0],repair:[1.5,1]};
  const NARROW={direct_solve:[0,0],task_contract_check:[0,1],self_review:[0,2],soft_guard:[0,3],focused_guard:[1,3],guard_evidence_check:[1,4],handoff:[0,5],repair:[1,1.5]};
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nice=n=>(n||'').replace(/_/g,' ');
  // state after each event, and a title and caption per event
  RP.forEach(r=>{let cur=null,go=0,bl=0;r.steps=r.events.map(e=>{const [t,k,f,to,stage,ch]=e;let title,cap,from=cur;
      if(k==='start'){cur=f;title='run starts in '+nice(f)}
      else if(k==='in_hook'){title='in_hook of '+nice(f)+' runs';cap=ch.length?'What the entry hook put in front of the agent: '+ch.map(c=>'<span class="mono">'+esc(c[3])+'</span>').join(' · '):'The entry hook ran.'}
      else if(k==='goto'){go++;cur=to;title='goto '+nice(to)+': committed';const runs=ch.map(c=>c[0]+' ('+c[1].replace('_',' ')+')');cap='Edge '+nice(f)+' → '+nice(to)+' exists; exit checks passed; the transition was recorded and '+nice(to)+'\'s in_hook ran.'+(ch.length?' Checks and hooks with output: '+runs.join(', ')+'.':'')}
      else{bl++;title='goto '+nice(to)+': refused at the '+(stage||'check')+' stage';const fl=ch.filter(c=>!c[2]);cap=fl.length?'The host ran '+fl.map(c=>c[0]).join(', ')+' and it failed, so the run stays in '+nice(f)+'. Output: <span class="mono">'+esc(fl[0][3])+'</span>':'No automatic check failed; the request waited only on a manual confirmation the run had to give explicitly (rerun with --yes after verifying), so it stays in '+nice(f)+'.'}
      return {t:'t = '+t+' s: '+title,c:cap||'',ev:e,cur,from,go,bl,blocked:k==='goto_blocked'}})});
  const sel=$('rpSel');RP.forEach((r,i)=>{const o=document.createElement('option');o.value='r'+i;o.textContent=r.task+' ('+(r.reward?'passed':r.exc?'timed out':'failed')+')';sel.appendChild(o)});
  $('rpJob').textContent=D.job;
  const modes={};RP.forEach((r,i)=>modes['r'+i]=r.steps);
  let lastList='';
  function showMeta(i){const r=RP[i];$('rpWhy').innerHTML='<b>Why this run:</b> '+esc(r.why)+'. Trial <span class="mono">'+esc(r.trial)+'</span>.';$('rpPrompt').textContent=r.prompt}
  function list(i,k){const key=i+':'+k;if(key===lastList)return;lastList=key;const r=RP[i];
    $('rpList').innerHTML=r.steps.map((s,j)=>'<li class="'+(j===k?'cur ':'')+(j>k?'fut ':'')+(s.blocked?'blk':s.ev[1]==='goto'?'go':'')+'"><b>'+esc(s.t)+'</b>'+(s.ev[5].length?'<div class="ck">'+s.ev[5].map(c=>(c[2]?'<i>✓</i> ':'<b>✗</b> ')+esc(c[0]+' ['+c[1]+']: '+c[3])).join('\n')+'</div>':'')+'</li>').join('');const el=$('rpList'),c=el.querySelector('li.cur');if(c)el.scrollTop=Math.max(0,c.offsetTop-el.offsetTop-30)}
  const A=makeAnim({id:'rp',mode:'r0',modes,dur:2600,
    draw(m,k,e,w){const i=+m.slice(1),r=RP[i],S=r.steps[k],narrow=w<600,L=narrow?NARROW:WIDE;
      const cols=narrow?2:6,rows=narrow?6:2,bw=narrow?Math.min(170,(w-30)/2):Math.min(128,(w-20)/6-10),bh=34,gx=narrow?(w-2*bw)/3:(w-cols*bw)/(cols+1),gy=narrow?20:38,H=rows*(bh+gy)+12;
      const P=n=>{const p=L[n];return [gx+p[0]*(bw+gx),8+p[1]*(bh+gy)]},C=n=>{const p=P(n);return [p[0]+bw/2,p[1]+bh/2]};
      const used={};r.steps.slice(0,k+1).forEach(s=>{if(s.ev[1]==='goto')used[s.ev[2]+'>'+s.ev[3]]=1});
      let s='';EDGES.forEach(([a,b])=>{const [x1,y1]=C(a),[x2,y2]=C(b),u=used[a+'>'+b];s+=ln2(x1,y1,x2,y2,u?'var(--good)':'var(--line)',{sw:u?2.4:1,op:u?1:.8})});
      NODES.forEach(n=>{const [x,y]=P(n),on=S.cur===n,vis=r.steps.slice(0,k+1).some(t=>t.cur===n);
        s+=rc(x,y,bw,bh,on?'var(--acc2)':vis?'var(--soft)':'var(--bg)',{s:on?'var(--acc)':'var(--line)',sw:on?2:1})+tx(x+bw/2,y+bh/2+4,nice(n),{fs:11,a:'middle',w:on?600:null})});
      if(S.ev[1]==='goto'||S.blocked){const [x1,y1]=C(S.ev[2]),[x2,y2]=C(S.ev[3]);const f=S.blocked?Math.min(e,.5)*(e<.5?1:1):e,xx=x1+(x2-x1)*(S.blocked?Math.min(.45,e*.9):e),yy=y1+(y2-y1)*(S.blocked?Math.min(.45,e*.9):e);
        s+='<circle cx="'+xx.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="7" fill="'+(S.blocked?'var(--bad)':'var(--good)')+'"/>';
        if(S.blocked&&e>.5)s+=tx(xx,yy-10,'✗ refused',{fs:12,a:'middle',c:'var(--bad)',w:600})}
      return svgW(w,H,s,'Runbook state graph for '+r.task)},
    counters(m,k){const i=+m.slice(1),r=RP[i],S=r.steps[k],last=k===r.steps.length-1;list(i,k);
      return 'state <b>'+nice(S.cur)+'</b> · '+S.ev[0]+' s of '+r.sec+' s · transitions committed '+S.go+' · refused '+S.bl+(last?' · <b>verifier: '+(r.reward?'pass':'fail')+(r.exc?' ('+r.exc+')':'')+'</b> · cost '+usd(r.cost,3)+' · '+fmt(r.in/1e6,2)+'M input tokens ('+fmt(100*r.cache/r.in,1)+'% cached), '+fmt(r.out)+' output':'')}});
  showMeta(0);
  sel.addEventListener('change',()=>{const i=+sel.value.slice(1);showMeta(i);A.st.m=sel.value;A.st.k=0;A.st.t=RM?1:0;lastList='';A.draw();A.kick()});
  window.__rpLoad=n=>{const i=RP.findIndex(r=>r.trial===n);if(i<0)return;sel.value='r'+i;sel.dispatchEvent(new Event('change'));$('rp').scrollIntoView({block:'start'})};

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
