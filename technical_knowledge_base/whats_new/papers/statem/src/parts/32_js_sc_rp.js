// ---- Scene (Replay tab): a real StateM run from the authors' released DeepSeek-V4-Flash trials, replayed on the runbook graph (renderer v2: the eight
// states as platforms on the floor, the agent as a ball, committed gotos as green edges with flowing dots, refused gotos as red glass plates across the
// edge where the host check held the run back, the camera moving in on a refused edge) ----
// Data: window.TRIALS.replays (src/audit_artifact.py on the release; six runs picked by the stated rule in each run's "why"). One step per recorded
// event, except that the run's start and its first in_hook are one step, so the longest run has 12 steps (the long-replay limit). The step list is
// generated from the same events and swapped with S3.stage(...).list when the run changes. Replaces the 2D replay (makeAnim rp) of 2026-10-03.
// window.SMRP exposes the steps for src/check_stages.mjs.
(function(){
  if(!document.getElementById('stg-rp')||typeof S3==='undefined'||!window.TRIALS)return;const {at,off,lerp,mix}=S3;
  const D=TRIALS,RP=D.replays,NODES=D.nodes;
  const EDGES=[['direct_solve','task_contract_check'],['direct_solve','handoff'],['task_contract_check','repair'],['task_contract_check','guard_evidence_check'],['task_contract_check','self_review'],['task_contract_check','handoff'],['self_review','soft_guard'],['soft_guard','handoff'],['self_review','repair'],['self_review','focused_guard'],['soft_guard','repair'],['soft_guard','focused_guard'],['focused_guard','guard_evidence_check'],['focused_guard','handoff'],['guard_evidence_check','handoff'],['guard_evidence_check','repair'],['repair','task_contract_check'],['repair','handoff']];
  const GRID={direct_solve:[0,0],task_contract_check:[1,0],self_review:[2,0],soft_guard:[3,0],focused_guard:[3,1],guard_evidence_check:[4,1],handoff:[5,0],repair:[1.5,1]};
  const SHORT={direct_solve:'solve',task_contract_check:'contract check',self_review:'self review',soft_guard:'soft guard',focused_guard:'focused guard',guard_evidence_check:'evidence check',repair:'repair',handoff:'handoff'};
  const POS=n=>{const g=GRID[n];return [(g[0]-2.5)*2.05,0,g[1]*2.4-1.2]};
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nice=n=>(n||'').replace(/_/g,' ');
  // steps: start and the first in_hook merged; the state after each step, with its title and explanation (as the 2D replay wrote them)
  RP.forEach(r=>{let cur=null,go=0,bl=0;const ev=r.events.slice();const out=[];
    ev.forEach((e,i)=>{const [t,k,f,to,stage,ch]=e;let title,cap,from=cur;
      if(k==='start'){cur=f;return}
      if(k==='in_hook'){const hk=ch.length?' Its '+ch.length+' commands put the state\'s context in front of the agent; their output, what the agent saw first, is below.':' The entry hook ran.';
        title=out.length?'in_hook of '+nice(f)+' runs':'the run starts in '+nice(f)+' and its in_hook runs';cap=((out.length?'':'StateM places the run in its first state.')+hk).trim()}
      else if(k==='goto'){go++;cur=to;title='goto '+nice(to)+': committed';const runs=ch.map(c=>c[0]+' ('+c[1].replace('_',' ')+')');cap='The edge '+nice(f)+' → '+nice(to)+' exists and the exit checks passed, so the transition was recorded and '+nice(to)+'\'s in_hook ran.'+(ch.length?' Checks and hooks with output: '+runs.join(', ')+'.':'')}
      else{bl++;title='goto '+nice(to)+': refused at the '+(stage||'check')+' stage';const fl=ch.filter(c=>!c[2]);cap=fl.length?'The host ran '+fl.map(c=>c[0]).join(', ')+' and it failed, so the run stays in '+nice(f)+'.':'No automatic check failed; the request waited only on a manual confirmation the run had to give explicitly (rerun with --yes after verifying), so it stays in '+nice(f)+'.'}
      out.push({t,title,cap,ev:e,cur,from,go,bl,kind:k==='goto_blocked'?'refused':k==='goto'?'goto':'hook'})});
    r.steps=out});
  window.SMRP=RP.map(r=>({task:r.task,trial:r.trial,reward:r.reward,steps:r.steps.map(s=>({t:s.t,kind:s.kind,from:s.ev[2],to:s.ev[3],cur:s.cur,go:s.go,bl:s.bl}))}));
  let ri=0;
  function draw(R,k,e){const P=R.P,narrow=R.W<520,r=RP[ri],S=r.steps[k],last=k===r.steps.length-1;R.grid(-6.2,6.2,-2.5,2.5,.5);
    const past=r.steps.slice(0,k+1),used={},refusedAt={};past.forEach((s,j)=>{if(s.kind==='goto'&&j<k)used[s.ev[2]+'>'+s.ev[3]]=1;if(s.kind==='refused')refusedAt[s.ev[2]+'>'+s.ev[3]]=(refusedAt[s.ev[2]+'>'+s.ev[3]]||0)+1});
    // a refused request is shown in close-up: the states off its edge fade out with their names, so nothing is cut at the card's edges
    const foc=S.kind==='refused'?[S.ev[2],S.ev[3]]:null,dim=foc?1-.85*(k===0?1:e):1;
    // the edges of the runbook, faint; edges already taken in green
    EDGES.forEach(([a,b])=>{const A=POS(a),B=POS(b),u=used[a+'>'+b];R.line([[A[0],.03,A[2]],[B[0],.03,B[2]]],{c:u?P.good:P.mute,w:u?2.6:1,a:(u?.95:.35)*(foc&&!(foc.includes(a)&&foc.includes(b))?dim:1)})});
    // the states
    NODES.forEach(n=>{const p=POS(n),on=S.cur===n,seen=past.some(s=>s.cur===n),fa=foc&&!foc.includes(n)?dim:1;
      R.box(p,[1.55,on?.24:.12,.78],{fill:on?mix(P.paper,P.acc,.35):seen?mix(P.paper,P.good,.18):P.paper,a:(on?1:seen?.9:.6)*fa});
      if(fa>.2)R.label([p[0],0,p[2]+.39],on&&!narrow?nice(n):SHORT[n],{mono:true,fs:narrow?11:12,dy:14,b:on,c:on?P.acc:seen?P.ink:P.mute,wide:on||narrow?0:1,a:(fa-.2)/.8})});
    // refused requests leave a red glass plate across their edge (the current one at full strength), a committed goto draws its edge with flowing dots
    Object.keys(refusedAt).forEach(key=>{const [a,b]=key.split('>'),A=POS(a),B=POS(b),dx=B[0]-A[0],dz=B[2]-A[2],L=Math.hypot(dx,dz)||1,nx=-dz/L,nz=dx/L,m=[A[0]+dx*.42,0,A[2]+dz*.42];
      const cur=S.kind==='refused'&&S.ev[2]===a&&S.ev[3]===b,a0=cur?(k===0?1:Math.min(1,.3+e)):.4;
      R.glass([m[0]-nx*.45,0,m[2]-nz*.45],[nx*.9,0,nz*.9],[0,.8,0],{c:P.bad,a:a0,nu:3,nv:3});
      if(cur)R.label([m[0],.8,m[2]],'✗ refused'+(refusedAt[key]>1?' ×'+refusedAt[key]:''),{mono:true,fs:12.5,b:1,al:'left',dx:16,dy:-14,c:P.bad})});
    let ag;const hp=n=>{const p=POS(n);return [p[0],.48,p[2]]};
    if(S.kind==='goto'){const A=hp(S.ev[2]),B=hp(S.ev[3]);R.arc(A,B,.5,{c:P.good,w:2.6,t:e});R.flowArc(A,B,.5,{c:P.good,a:.9,r:.065});ag=R.arcPt(A,B,.5,e)}
    else if(S.kind==='refused'){const A=hp(S.ev[2]),B=hp(S.ev[3]),u=e<.5?e*2:2-e*2,q=S3.lerp3(A,B,.36*u);ag=[q[0],q[1]+.25*Math.sin(Math.PI*u),q[2]];
      const g=S3.lerp3(A,B,.42);R.glow([g[0],.4,g[2]],.8,{c:P.bad,a:.55*Math.min(1,e*2)})}
    else ag=hp(S.cur);
    R.ball(ag,.2,{c:P.acc});R.glow(ag,.5,{c:P.acc,a:.35});
    // the clock and, at the last step, what the verifier said
    const cp=foc?(()=>{const A=POS(foc[0]),B=POS(foc[1]);return [Math.min(A[0],B[0])-1.3,1.3,Math.min(A[2],B[2])-.9]})():[-6,1.4,-1.9];
    R.label(cp,'t = '+S.t+' s · committed '+S.go+' · refused '+S.bl,{mono:true,fs:12.5,al:'left',b:1,c:P.ink});
    if(last){const p=hp(S.cur),ok=!!r.reward;R.label(p,ok?'verifier: pass':r.exc?'verifier: fail (timeout)':'verifier: fail',{fs:14,b:1,dy:-30,c:ok?P.good:P.bad,a:k===0?1:e})}
  }
  const full={cam:[.1,.92],bounds:[[-6.2,0,-1.9],[6.2,1.3,1.9]]};
  // on a phone the long graph turns into depth (the camera looks along it), so the states are large enough to carry their names
  const PH=()=>{const h=document.getElementById('stg-rp');return !!h&&h.clientWidth<520},fullV=()=>PH()?{cam:[1.25,.82],bounds:full.bounds}:full;
  const viewOf=k=>{const S=RP[ri].steps[k];if(!S||S.kind!=='refused')return fullV();const A=POS(S.ev[2]),B=POS(S.ev[3]);
    return {cam:[.16,.72],bounds:[[Math.min(A[0],B[0])-1.4,0,Math.min(A[2],B[2])-1],[Math.max(A[0],B[0])+1.4,1.2,Math.max(A[2],B[2])+1]]}};
  const st=S3.stage({id:'stg-rp',list:'sx-rp',fig:'a real StateM run · DeepSeek-V4-Flash',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1300,hold:4400,draw,view:viewOf,
    margin:w=>w<520?[14,10,14,10]:[20,16,16,16]});
  // the run picker, the run's outcome and its generated step list
  const sel=$('rpSel');RP.forEach((r,i)=>{const o=document.createElement('option');o.value='r'+i;o.textContent=r.task+' ('+(r.reward?'passed':r.exc?'timed out':'failed')+')';sel.appendChild(o)});
  $('rpJob').textContent=D.job;
  function load(i){ri=i;const r=RP[i],L=r.steps[r.steps.length-1];
    $('rpWhy').innerHTML='<b>Why this run:</b> '+esc(r.why)+'. Trial <span class="mono">'+esc(r.trial)+'</span>.';$('rpPrompt').textContent=r.prompt;
    $('rpOut').innerHTML='<b>Outcome:</b> verifier '+(r.reward?'pass':'fail'+(r.exc?' ('+esc(r.exc)+')':''))+' after '+r.sec+' s; '+L.go+' transitions committed, '+L.bl+' refused; cost '+usd(r.cost,3)+', '+fmt(r.in/1e6,2)+'M input tokens ('+fmt(100*r.cache/r.in,1)+'% cached), '+fmt(r.out)+' output.';
    $('sx-rp').innerHTML=r.steps.map(s=>'<li class="'+(s.kind==='refused'?'blk':s.kind==='goto'?'go':'')+'"><b>t = '+s.t+' s: '+esc(s.title)+'.</b> '+s.cap+(s.ev[5].length?'<div class="ck">'+s.ev[5].map(c=>(c[2]?'<i>✓</i> ':'<b>✗</b> ')+esc(c[0]+' ['+c[1]+']: '+c[3])).join('\n')+'</div>':'')+'</li>').join('')}
  load(0);st.list('sx-rp');
  sel.addEventListener('change',()=>{load(+sel.value.slice(1));st.list('sx-rp')});
  window.__rpLoad=n=>{const i=RP.findIndex(r=>r.trial===n);if(i<0)return;sel.value='r'+i;sel.dispatchEvent(new Event('change'));$('rp').scrollIntoView({block:'start'})};
})();
