// ---- Reading tab: recomputed numbers into the prose, the design-space figure, the git-webserver before/after ----
const RCV=PAPER.rc.v;
(function(){const V=RCV,pc=v=>fmt(v,1)+'%';
  const F={ds_pass:()=>fmt(V.ds_pass),ds_cov:()=>V.ds_cov,ds_zero:()=>V.ds_zero.join(' and '),ds_cost:()=>usd(V.ds_cost,2),ds_gap_cost:()=>usd(V.ds_gap_cost,2),
    ds_cache_share:()=>fmt(V.ds_cache_share,1)+'%',ds_retries:()=>V.ds_retries,t3_trials:()=>V.t3_trials,t3_pts:()=>fmt(V.t3_pts,1)+' points',
    nchecks:()=>PAPER.rc.checks.filter(c=>c.ok).length+' of '+PAPER.rc.checks.length,z_gpt55:()=>fmt(V.z_gpt55,1),z_gpt56:()=>fmt(V.z_gpt56,1),
    blk_share:()=>pc(V.blk_share),blk_events:()=>V.blk_events,se_bb_unpaired:()=>fmt(V.se_bb_unpaired,1),n_gates:()=>V.n_gates,gates_one_task:()=>V.gates_one_task,
    blk_rate:()=>pc(100*V.blk_pass/V.blk_n)+' of '+V.blk_n,nb_rate:()=>pc(100*V.nb_pass/V.nb_n)+' of '+V.nb_n,intro_389:()=>fmt(V.intro_389,2),
    ds_se_task:()=>fmt(V.ds_se_task,2)+' points',ds_se_binom:()=>fmt(V.ds_se_binom,2)};
  document.querySelectorAll('[data-rc]').forEach(el=>{const f=F[el.dataset.rc];el.textContent=f?f():'?'})})();

// Figure 1 rebuilt: x = explicit control / orchestration strength, y = agent autonomy (as drawn in the figure)
fit($('dsSvg'),w=>{const H=w<520?280:270,pl=34,pr=8,pt=14,pb=34,X=v=>pl+(w-pl-pr)*v,Y=v=>pt+(H-pt-pb)*(1-v);
  const acc={none:['Not externally editable or visible','var(--mute)','none'],part:['Partially visible or fragmented','var(--c5)','part'],user:['Editable by the user only','var(--c4)','user'],both:['Editable by both user and agent','var(--good)','both']};
  const P=[['Naive agent',.17,.62,'none','plan kept in context, no external control layer; easily stops in the middle'],['Codex / Claude Code',.45,.72,'part','soft plans and checklists; agent-owned soft control; no native stateful hooks'],
    ['StateM',.82,.76,'both','YAML + CLI + hooks; state as context-and-contract boundary; keeps the agent on track until finish'],['StateFlow',.55,.2,'user','finite-state-machine control layer; catch errors to fix'],['LangGraph',.85,.12,'user','graph-based orchestration; the control layer wraps the agents']];
  let s=ln2(X(0),Y(.5),X(1),Y(.5),'var(--line)',{sw:1.4})+ln2(X(.5),Y(0),X(.5),Y(1),'var(--line)',{sw:1.4});
  s+=tx(X(1),Y(.5)-6,'strong control →',{fs:11,a:'end',c:'var(--mute)'})+tx(X(0)+2,Y(.5)-6,'weak',{fs:11,c:'var(--mute)'});
  s+='<text x="12" y="'+Y(.5)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+Y(.5)+')">agent autonomy →</text>';
  s+=tx(X(.25),Y(.24),'who builds an agent here?',{fs:11,a:'middle',c:'var(--mute)'});
  const pts=P.map(p=>({x:X(p[1]),y:Y(p[2]),t:p[0],fs:12}));placeLabels(pts,w,H);pts.forEach(q=>{q.lx+=q.la==='start'?4:q.la==='end'?-4:0});
  P.forEach((p,i)=>{const a=acc[p[3]],x=X(p[1]),y=Y(p[2]);
    const sh=p[3]==='both'?'<circle cx="'+x+'" cy="'+y+'" r="8" fill="'+a[1]+'"/>':p[3]==='user'?rc(x-7,y-7,14,14,a[1],{r:2}):p[3]==='part'?'<circle cx="'+x+'" cy="'+y+'" r="7" fill="var(--bg)" stroke="'+a[1]+'" stroke-width="2.5"/>':'<circle cx="'+x+'" cy="'+y+'" r="7" fill="var(--bg)" stroke="'+a[1]+'" stroke-width="1.5" stroke-dasharray="3 2"/>';
    s+='<g style="cursor:help"><title>'+p[0]+': '+p[4]+'. Control layer: '+a[0].toLowerCase()+'.</title>'+sh+tx(pts[i].lx,pts[i].ly,p[0],{fs:12,a:pts[i].la,w:p[3]==='both'?600:null})+'</g>'});
  const mk=(k,x,y)=>{const a=acc[k];return k==='both'?'<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+a[1]+'"/>':k==='user'?rc(x-5,y-5,10,10,a[1],{r:2}):k==='part'?'<circle cx="'+x+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="'+a[1]+'" stroke-width="2.5"/>':'<circle cx="'+x+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="'+a[1]+'" stroke-width="1.5" stroke-dasharray="3 2"/>'};
  let lx=pl,ly=H+14,ls='';Object.keys(acc).forEach(k=>{const t=acc[k][0],lw=t.length*6.4+26;if(lx+lw>w&&lx>pl){lx=pl;ly+=18}ls+=mk(k,lx+6,ly-4)+tx(lx+16,ly,t,{fs:11});lx+=lw});
  $('dsSvg').innerHTML=svgW(w,ly+8,s+ls,'Design space of agent control layers')});

// ---- Before/after: configure-git-webserver without and with the checked goto (illustrative) ----
(function(){
  const W5=['bare repo /git/server','post-receive hook','sshd :22','nginx :8080','hello.html served'];
  // world: 0 absent, 1 up, 2 down
  const soft=[
    {t:'read the task, keep a plan in context',c:'The agent reads the prompt and writes a short plan and checklist into its own context: create a bare repository, a hook that deploys pushes to the web root, a web server on 8080, then test.',w:[0,0,0,0,0],st:'(no states)',ctx:[3,0],ev:''},
    {t:'build it',c:'Bare repository, post-receive hook, sshd and nginx come up. Thousands of tokens of commands and output now follow the plan in the context.',w:[1,1,1,1,0],st:'(no states)',ctx:[3,40],ev:''},
    {t:'test once: it works',c:'Clone, commit, push, curl: "hello world". The checklist item "tested" is ticked.',w:[1,1,1,1,1],st:'(no states)',ctx:[3,70],ev:'test passed'},
    {t:'tidy up for the user',c:'The agent resets the test commit so the user\'s own push will be the first, and restarts the web server while tidying. The server does not come back, and nothing re-checks it.',w:[1,1,1,2,0],st:'(no states)',ctx:[3,90],ev:''},
    {t:'declare done',c:'The plan says tested; the agent stops. A soft plan is advice: no part of the harness can refuse the stop or ask for fresh evidence.',w:[1,1,1,2,0],st:'stopped',ctx:[3,95],ev:'self-declared done'},
    {t:'the verifier runs',c:'Clone, commit, push, curl from a fresh client: connection refused on 8080. Score 0. The paper\'s baseline scored 0/5 on this task with GPT-5.5 although it "can configure Git, SSH, hooks, and an HTTP server".',w:[1,1,1,2,0],st:'stopped',ctx:[3,95],ev:'FAIL',res:0}];
  const sm=[
    {t:'start: direct_solve, in_hook',c:'StateM starts the run in its first state. The in_hook puts the visible task contract, the deadline and the state\'s focus at the end of the context, where it is recent.',w:[0,0,0,0,0],st:'direct_solve',ctx:[3,0,1],ev:'',go:0,bl:0,ck:1},
    {t:'build it',c:'Inside the state the agent works exactly as before: bare repository, hook, sshd, nginx.',w:[1,1,1,1,0],st:'direct_solve',ctx:[3,40,1],ev:'',go:0,bl:0,ck:1},
    {t:'goto task_contract_check',c:'Requested and committed: the edge exists and the exit checklist (self-attested) passes. The new state\'s in_hook asks for a contract receipt: artifact identity, checks run, remaining risk.',w:[1,1,1,1,0],st:'task_contract_check',ctx:[3,55,2],ev:'goto ok',go:1,bl:0,ck:3},
    {t:'test once, then tidy up',c:'Same as before: the test passes, the agent resets the test commit and restarts the web server, which does not come back.',w:[1,1,1,2,0],st:'task_contract_check',ctx:[3,80,2],ev:'',go:1,bl:0,ck:3},
    {t:'goto handoff: refused',c:'The edge to handoff runs the fixed end-to-end gate on the host: clone user@server:/git/server, commit hello.html, push master, curl http://server:8080/hello.html. Curl fails, so the goto is not committed and the run stays where it is, with the failed check recorded.',w:[1,1,1,2,0],st:'task_contract_check',ctx:[3,85,2],ev:'goto refused',go:2,bl:1,ck:4},
    {t:'repair',c:'The refusal names the failure. The agent restarts nginx detached so it outlives its shell, and records the fix in progress.md.',w:[1,1,1,1,0],st:'task_contract_check',ctx:[3,92,2],ev:'',go:2,bl:1,ck:4},
    {t:'goto handoff: committed',c:'The gate runs again from a fresh clone: push, deploy, curl returns "hello world". The receipt is fresh, the transition commits, and handoff\'s in_hook re-reads progress so the final reply is grounded in the durable state.',w:[1,1,1,1,1],st:'handoff',ctx:[3,96,3],ev:'goto ok',go:3,bl:1,ck:5},
    {t:'the verifier runs',c:'Same verifier, same model: pass. With StateM the paper reports 5/5 on this task for GPT-5.5; "StateM adds no new component-level capability in this case. It composes, checks, and closes capabilities already available to the model."',w:[1,1,1,1,1],st:'handoff',ctx:[3,96,3],ev:'PASS',res:1,go:3,bl:1,ck:5}];
  const ST=['direct_solve','task_contract_check','handoff'];
  makeAnim({id:'gw',mode:'sm',modes:{soft,sm},dur:3200,
    draw(m,k,e,w){const S=(m==='soft'?soft:sm)[k],P=(m==='soft'?soft:sm)[Math.max(0,k-1)],mix=(a,b)=>a+(b-a)*e;
      const narrow=w<560;let s='';
      // states row
      const y0=8;
      if(m==='sm'){const bw=(w-24)/3;ST.forEach((n,i)=>{const on=S.st===n,x=4+i*(bw+8);s+=rc(x,y0,bw,30,on?'var(--acc2)':'var(--soft)',{s:on?'var(--acc)':'var(--line)',sw:on?2:1})+tx(x+bw/2,y0+19,n.replace(/_/g,' '),{fs:narrow?11:12,a:'middle',w:on?600:null});
          if(i<2)s+=ln2(x+bw,y0+15,x+bw+8,y0+15,'var(--mute)');});
        if(S.ev==='goto refused'){const x=4+1*(bw+8)+bw;s+=tx(Math.min(w-4,x+4),y0+46,'✗ goto handoff refused',{fs:12,a:'end',c:'var(--bad)',w:600})}}
      else{s+=rc(4,y0,w-8,30,'var(--soft)',{s:'var(--line)'})+tx(w/2,y0+19,S.st==='stopped'?'stopped: no state, no gate':'one loop; the plan is text in the context',{fs:12,a:'middle',c:S.st==='stopped'?'var(--bad)':'var(--ink)'})}
      // world
      const wy=y0+58;s+=tx(4,wy,'Live system state',{fs:11,c:'var(--mute)'});
      const cols=narrow?2:5,cw=(w-8-(cols-1)*6)/cols;
      W5.forEach((n,i)=>{const r=Math.floor(i/cols),c=i%cols,x=4+c*(cw+6),y=wy+8+r*34,v=S.w[i];
        const col=v===1?'var(--open2)':v===2?'var(--bg)':'var(--soft)',st=v===1?'var(--good)':v===2?'var(--bad)':'var(--line)';
        s+=G(1,rc(x,y,cw,28,col,{s:st,sw:v===2?2:1,da:v===0?'3 3':null}))+tx(x+cw/2,y+18,(v===2?'✗ ':v===1?'✓ ':'')+n,{fs:11,a:'middle',c:v===2?'var(--bad)':'var(--ink)'})});
      // context bar: plan tokens vs execution tokens, with StateM's refreshed anchors
      const rows=narrow?3:1,cy=wy+8+rows*34+18;s+=tx(4,cy,narrow?'Context: plan (blue), output (grey)'+(m==='sm'?', anchor (green)':''):'Context (illustrative proportions): plan, then execution output'+(m==='sm'?', then the latest state anchor':''),{fs:11,c:'var(--mute)'});
      const bw2=w-8,tot=100,pl=S.ctx[0],ex=mix(P.ctx[1],S.ctx[1]);
      s+=rc(4,cy+6,bw2,16,'var(--soft)',{s:'var(--line)'})+rc(4,cy+6,bw2*pl/tot,16,'var(--acc)')+rc(4+bw2*pl/tot,cy+6,bw2*ex/tot,16,'var(--dim)',{r:0});
      if(m==='sm'){const ax=4+bw2*(pl+ex)/tot;s+=rc(ax,cy+6,Math.max(6,bw2*.03),16,'var(--good)')}
      const ry=cy+40;
      if(S.res!=null)s+=tx(w/2,ry+4,S.res?'Verifier: PASS':'Verifier: FAIL (score 0)',{fs:14,a:'middle',w:600,c:S.res?'var(--good)':'var(--bad)'});
      else if(S.ev)s+=tx(w/2,ry+4,S.ev,{fs:12,a:'middle',c:S.ev.indexOf('refused')>=0?'var(--bad)':'var(--mute)'});
      const H=ry+14;return svgW(w,H,s,'configure-git-webserver, '+(m==='soft'?'soft plan':'StateM'))},
    counters(m,k){const S=(m==='soft'?soft:sm)[k];
      if(m==='soft')return 'state <b>none</b> · transitions requested 0 · refused 0 · host checks run 0 · '+(S.res==null?'':'<b>result '+(S.res?'pass':'fail')+'</b>');
      return 'state <b>'+S.st+'</b> · transitions requested '+S.go+' · refused '+S.bl+' · host checks run '+S.ck+(S.res==null?'':' · <b>result pass</b>')}});
})();
