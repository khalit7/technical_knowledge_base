// ---- Idea: one real trajectory, imitated or rebuilt and re-solved (before/after) ----
(function(){
  if(!$('fl')||!window.TRACES)return;
  const C=TRACES[0],R=RP.run(C),N=R.events.length;
  const e0=R.e0_files,known=R.known_only.length,held=Object.keys(R.created).length+R.held.filter(p=>!(p in R.created)).length;
  const MED_REP=2,MED_COMP=13; // Table 13, terminal pool medians
  const T4=PAPER.tables.t4.rows;const base=+T4[0][4],imit=+T4[1][4],res=+T4[2][4];
  const KC={'read-pre':'var(--c3)','read-part':'var(--c6)','read-held':'var(--c2)','write-new':'var(--c4)','write-mod':'var(--c4)','edit':'var(--c4)','list':'var(--c5)','run':'var(--bad)','look':'var(--dim)'};
  const S={
    imit:[
      {t:'One recorded trajectory',c:'A real row of LFM2-Terminal: '+N+' commands typed by DeepSeek-V3.2 in the Terminus-2 harness on a generated task ("'+C.task.split('\n')[0].replace(/^#+\s*/,'').slice(0,70)+'"). Each cell is one command, coloured by what it did.'},
      {t:'Keep it as a demonstration',c:'Imitation turns the trace straight into one SFT record. No environment is rebuilt, so the trace can never be run again, re-asked or checked.'},
      {t:'Nobody checks it',c:'Its quality is capped by the model that produced it, and "we cannot check whether the changes it made to the codebase are actually correct" (§1).'},
      {t:'Train on 35.8k such traces',c:'Qwen3.5-27B fine-tuned on 35.8k source trajectories averages '+imit+' on Terminal-Bench 2.1 over two scaffolds: below the untrained model\'s '+base+' (Table 4).'}],
    resolve:[
      {t:'One recorded trajectory',c:'The same trace: '+N+' commands by DeepSeek-V3.2 in Terminus-2.'},
      {t:'Replay to the earliest version',c:'Deterministic replay keeps the files the trace shows before the agent changed them: here '+e0+' file'+(e0===1?'':'s')+' with content, '+known+' more known only by name from a listing, and '+held+' file'+(held===1?'':'s')+' held back as the agent\'s own work. The paper\'s terminal pool has a median of '+MED_REP+' replayed files.'},
      {t:'Complete the workspace',c:'A completion agent creates the missing project around that evidence, solvable but not solved. In the terminal pool the median workspace grows from '+MED_REP+' to '+MED_COMP+' files (mean 2.9 to 22.4, Table 13); the squares show those medians, since this trace\'s completed workspace is not published.'},
      {t:'Judge: is it sufficient?',c:'A read-only judge asks whether the workspace gives a capable agent enough context for the recovered task. After completion, 93.5% of terminal workspaces pass (Table 2).'},
      {t:'Re-query',c:'Pose tasks on it: the recovered original intent, new single-workspace tasks, cross-workspace tasks with a related project, or a multi-round session. The comparison in Table 4 uses Intent Recovery, without verifier filtering.'},
      {t:'A stronger teacher re-solves',c:'Qwen3.7-Max (74.5 on TB2.1 itself) solves the task inside the rebuilt container in the Claude Code scaffold. Its trajectory, not the original one, becomes the training record.'},
      {t:'Train on 35.8k re-solved tasks',c:'Same volume, same template: '+res+' on average, against '+imit+' for imitation and '+base+' for the base (Table 4). The gap mixes two changes, the rebuilt environment and the stronger demonstrator; the paper does not separate them.'}]};
  function draw(m,k,e,w){let s='';const L=S[m].length;
    const vis=i=>i<k?1:i===k?Math.max(.14,e):.14;
    // 1. the trajectory strip, to scale (one cell per command)
    const cw=Math.min(16,(w-20)/N-2);
    R.events.forEach((x,i)=>{s+=rc(10+i*(cw+2),26,cw,14,KC[x.kind],{r:2})});
    s+=tx(10,16,'source trajectory: '+N+' commands (DeepSeek-V3.2, Terminus-2)',{fs:11.5,c:'var(--mute)'});
    const y2=64;
    if(m==='imit'){
      s+=G(vis(1),ar2(w/2,46,w/2,y2+4)+rc(w/2-110,y2+6,220,30,'var(--soft)',{s:'var(--line)'})+tx(w/2,y2+26,'1 SFT record, as recorded',{fs:12,a:'middle'}));
      s+=G(vis(2),tx(w/2,y2+58,'no environment · not re-runnable · not verified',{fs:12,a:'middle',c:'var(--bad)'}));
      s+=G(vis(3),bars(y2+80,w,[['base (no SFT)',base,'var(--dim)'],['imitate the traces',imit,'var(--c2)']]));
      return svgW(w,y2+80+3*30+10,s,'Imitating a trajectory')}
    // rebuild and re-solve
    const sq=14,g=4,row=Math.max(6,Math.floor((w-20)/(sq+g)));
    const drawSq=(n,y,c,da,off)=>{let t='';for(let i=0;i<n;i++){const x=10+((i+(off||0))%row)*(sq+g),yy=y+Math.floor((i+(off||0))/row)*(sq+g);t+=rc(x,yy,sq,sq,da?'none':c,{r:2,s:c,da:da?'2 2':null})}return t};
    const y3=y2+28;
    s+=G(vis(1),tx(10,y2+12,'replayed workspace Ê0 (this trace)',{fs:11.5,c:'var(--mute)'})+drawSq(e0,y2+18,'var(--c3)')+drawSq(known,y2+18,'var(--c5)',1,e0)+drawSq(held,y2+18,'var(--c2)',1,e0+known+1));
    const yc=y3+30;
    const grow=k>2?MED_COMP:k===2?Math.round(MED_REP+(MED_COMP-MED_REP)*e):MED_COMP;
    s+=G(k>=2?1:.14,tx(10,yc,(w<600?'completed Ê (pool median, ':'completed workspace Ê (terminal-pool median, ')+grow+' files)',{fs:11.5,c:'var(--mute)'})+drawSq(Math.min(grow,MED_REP),yc+6,'var(--c3)')+drawSq(Math.max(0,grow-MED_REP),yc+6,'var(--c1)',0,MED_REP));
    const yj=yc+6+Math.ceil(MED_COMP/row)*(sq+g)+16;
    s+=G(vis(3),rc(10,yj-13,150,20,'var(--open2)',{s:'var(--open)'})+tx(85,yj+1,'judged sufficient',{fs:12,a:'middle',c:'var(--open)'})+tx(170,yj+1,'93.5% of terminal workspaces',{fs:11,c:'var(--mute)'}));
    const yq=yj+22,names=['Intent Recovery','Single-WS','Cross-WS','Multi-Round'],qw=Math.min(150,(w-20-18)/4);
    let q='';names.forEach((n,i)=>{const on=i===0;q+=rc(10+i*(qw+6),yq,qw,24,on?'var(--acc2)':'var(--soft)',{s:on?'var(--acc)':'var(--line)'})+tx(10+i*(qw+6)+qw/2,yq+16,n,{fs:11.5,a:'middle',w:on?600:null})});
    s+=G(vis(4),q);
    const yt=yq+40;
    s+=G(vis(5),tx(10,yt,w<600?'teacher re-solves: Qwen3.7-Max':'teacher re-solves: Qwen3.7-Max in the rebuilt container, Claude Code scaffold',{fs:11.5,c:'var(--mute)'})+rc(10,yt+6,Math.min(w-20,(cw+2)*N*1.3),14,'var(--c1)',{r:2,op:.55,da:'4 3',s:'var(--c1)'}));
    s+=G(vis(6),bars(yt+32,w,[['base (no SFT)',base,'var(--dim)'],['imitate the traces',imit,'var(--c2)'],['rebuild and re-solve',res,'var(--c3)']]));
    return svgW(w,yt+32+3*30+12,s,'Rebuilding an environment from a trajectory and re-solving it')}
  function ar2(x1,y1,x2,y2){return ln2(x1,y1,x2,y2,'var(--mute)')+'<path d="M'+(x2-4)+','+(y2-6)+'L'+x2+','+y2+'L'+(x2+4)+','+(y2-6)+'" fill="none" stroke="var(--mute)"/>'}
  function bars(y,w,rows){const lw=Math.min(150,w*.36),bw=w-lw-60,sx=v=>lw+bw*v/60;let s=tx(lw,y-4,'Terminal-Bench 2.1, average of two scaffolds (%)',{fs:11,c:'var(--mute)'});
    rows.forEach(([n,v,c],i)=>{const yy=y+4+i*28;s+=tx(lw-8,yy+13,n,{fs:11.5,a:'end'})+rc(lw,yy,sx(v)-lw,18,c,{r:3})+tx(sx(v)+6,yy+13,v.toFixed(1),{fs:12,w:600})});
    return s}
  function counters(m,k){if(m==='imit')return stat('Environments rebuilt','0','')+stat('Demonstrator','DeepSeek-V3.2','the source agent')+stat('Checked by tests','no','')+stat('TB2.1 after SFT',k>=3?imit.toFixed(1):'?','Table 4, average');
    return stat('Environments rebuilt',k>=2?'1':'0',k>=3?'judged sufficient':'')+stat('Demonstrator',k>=5?'Qwen3.7-Max':'(not yet)','the teacher')+stat('Checked by tests','not in this arm','Intent Recovery is unfiltered')+stat('TB2.1 after SFT',k>=6?res.toFixed(1):'?','Table 4, average')}
  makeAnim({id:'fl',mode:'resolve',modes:S,draw,counters,dur:3200});
})();
