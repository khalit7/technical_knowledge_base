// ---- Reading tab: recomputed numbers into the prose, the design-space figure ----
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
// The configure-git-webserver before/after is the 3D stage in 31_js_sc_gw.js (2026-11-13).
