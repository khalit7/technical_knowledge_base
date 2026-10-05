// ---- Orchestration lab: durable execution replay (LangGraph + SQLite checkpointer) ----
(function(){
  const D=window.ORCH,U=window.OU,esc=U.esc;if(!D||!D.lg)return;
  const L=D.lg,ev=L.events,CK=L.final.slice().sort((a,b)=>a.t-b.t);
  const NODES=[['read_and_test','read + test','code'],['diagnose','diagnose','llm'],['propose_fix','propose fix','llm'],['human_review','human review','human'],['apply_and_test','apply + test','code']];
  const hidN=h=>h?h.filter(x=>x[1]).length:0;
  const calls=Object.keys(L.calls).sort();
  const dg=ev.find(e=>e.what==='llm_done'&&e.node.startsWith('diagnose'));
  const pr=ev.filter(e=>e.what==='llm_done'&&e.node.startsWith('propose'));
  const kill=ev.find(e=>e.what==='SIGKILL');const pstart=ev.find(e=>e.node==='propose_fix'&&e.what==='start');
  const ends=CK.filter(c=>c.next.length===0);const endA=ends[0],endB=ends[1];
  // branch of each checkpoint: 1 if it descends from the forked (source "update") checkpoint
  const byId={};CK.forEach(c=>byId[c.id]=c);
  CK.forEach(c=>{let x=c,b=0;while(x){if(x.source==='update'){b=1;break}x=byId[x.parent]}c.br=b});
  // ---- recorded steps ----
  const S=[];let proc=0,paid=0,lost=0;const procs=[];
  function add(o){S.push(Object.assign({t:0,node:'',proc,paid,lost,procs:procs.map(p=>Object.assign({},p))},o))}
  ev.forEach(e=>{
    if(e.what==='process_start'&&e.cmd==='dump'){add({t:e.t,cap:'<b>Inspection</b> (a separate short process): <code>get_state_history</code> reads the thread back from SQLite: '+CK.filter(c=>c.t<=e.t).length+' checkpoints so far.'})}
    else if(e.what==='process_start'){proc++;procs.push({n:proc,cmd:e.cmd,st:'running'});
      const why={start:'<code>invoke({}, thread "fix-1")</code>: a new run.',resume:'<code>invoke(None, thread "fix-1")</code>: no input, so LangGraph loads the newest checkpoint of the thread and continues from its <code>next</code> node.',approve:'<code>invoke(Command(resume="approve"))</code>: the human\'s answer to the pending interrupt.',fork:'time travel: <code>get_state</code> at the checkpoint saved after <code>diagnose</code>, <code>update_state</code> to add one requirement to the diagnosis, then <code>invoke(None)</code> from the new checkpoint.',dump:'<code>get_state_history</code>: read every checkpoint of the thread back from SQLite.'}[e.cmd]||'';
      add({t:e.t,cap:'<b>Process '+proc+' starts</b> (a fresh Python interpreter): '+why})}
    else if(e.what==='start'){add({t:e.t,node:e.node,cap:'node <b>'+e.node+'</b> starts'+(e.node==='human_review'&&S.some(s=>s.node==='human_review')?': <b>again, from its first line</b>. On resume LangGraph re-runs the interrupted node; this time <code>interrupt()</code> returns the human\'s answer instead of pausing.':'')})}
    else if(e.what==='llm_done'){paid++;add({t:e.t,node:e.node.startsWith('diag')?'diagnose':'propose_fix',paid,cap:'model call done after '+e.secs+' s ('+U.fmt(e.input)+' tokens in, '+U.fmt(e.output)+' out, '+U.usd(e.cost)+'); LangGraph writes a checkpoint before the next node starts ("sync" durability)'})}
    else if(e.what==='SIGKILL'){paid++;lost++;procs[procs.length-1].st='killed';add({t:e.t,node:'propose_fix',paid,lost,cap:'<b>SIGKILL</b>, '+(e.t-pstart.t).toFixed(1)+' s into the fix call. The process and its model call die mid-flight: that call is paid for and its answer lost. What survives: '+L.after_kill.length+' checkpoints in the SQLite file, the newest saying next = <code>propose_fix</code>.',kill:1})}
    else if(e.what==='forked'){add({t:e.t,cap:'<b>Rewind.</b> The new checkpoint is a child of the one saved after <code>diagnose</code>: the first branch is untouched, and the tree now forks.'})}
    else if(e.what==='resumed'){add({t:e.t,node:'human_review',cap:'the interrupt returns <code>"'+esc(e.decision)+'"</code>'})}
    else if(e.what==='process_end'){const p=procs[procs.length-1];p.st=e.interrupt?'paused':'done';
      const fin=e.interrupt?null:(S.filter(s=>s.proc===proc).length&&CK.filter(c=>c.next.length===0&&c.t<=e.t+0.05).pop());
      add({t:e.t,cap:e.interrupt?'<b>interrupt()</b>: the graph pauses with the diff as its payload. The state, including the pending question, is saved and <b>the process exits</b>. Nothing is running while the human thinks (here the driver answered within a second; it could have been days).':'graph finished: visible tests '+(fin&&fin.passed?'<span class="orch-ok">pass</span>':'fail')+', hidden checks <b>'+hidN(fin&&fin.hidden)+'/6</b>'+(fin&&fin.br?' on the rewound branch, with the extra requirement':' on the first branch')+'. The test step restores core.py afterwards, so a later branch starts from the same files.'})}
  });
  // ---- derived "without a checkpointer": same recorded durations, restart from zero after the kill ----
  const W=[];{const dD=dg.secs,dP=pr[0].secs,k=kill.t-pstart.t;let t=0,pd=0,ls=0;const pc=[{n:1,cmd:'start',st:'running'}];
    const a=o=>W.push(Object.assign({proc:pc.length,paid:pd,lost:ls,procs:pc.map(p=>Object.assign({},p))},o));
    a({t:0,cap:'<b>Process 1 starts</b>. No checkpointer: the state lives only in this process\'s memory.'});
    a({t:0.01,node:'read_and_test',cap:'read + test'});a({t:0.05,node:'diagnose',cap:'diagnose starts'});
    t=dD;pd++;a({t,node:'diagnose',paid:pd,cap:'diagnose done after '+dD+' s (recorded duration). Held in memory only.'});
    t+=k;pd++;ls++;pc[0].st='killed';a({t,node:'propose_fix',paid:pd,lost:ls,kill:1,cap:'<b>SIGKILL</b> at the same moment. Everything is gone, including the paid diagnosis.'});
    pc.push({n:2,cmd:'start',st:'running'});t+=0.4;a({t,cap:'<b>Process 2</b> has to <code>invoke({})</code> again from the start.'});
    a({t:t+0.01,node:'read_and_test',cap:'read + test again'});t+=dD;pd++;ls++;a({t,node:'diagnose',paid:pd,lost:ls,cap:'<b>diagnose runs again</b>: another '+dD+' s and another model call for an answer we already had (and, with a non-deterministic model, possibly a different one).'});
    t+=dP;pd++;a({t,node:'propose_fix',paid:pd,cap:'fix proposed ('+dP+' s, recorded duration)'});
    a({t:t+0.01,node:'human_review',cap:'<b>human review without persistence</b>: the process must stay alive, holding the state in memory, for as long as the human takes. A restart or deploy during the wait loses the run again.'});
    a({t:t+0.5,node:'apply_and_test',cap:'apply + test'});pc[1].st='done';a({t:t+0.6,cap:'finished. No time travel: there is no saved history to go back to, so the second branch cannot exist.'});}
  // ---- drawing ----
  let mode='with',an=null,sel=null;
  const steps=()=>mode==='with'?S:W;
  function drawFlow(st,Wd){
    const hor=Wd>=560,n=NODES.length,bw=hor?Math.min(120,Wd/n-14):Math.min(200,Wd-120),bh=30;
    const H=hor?118:n*44+64;let s='';
    const pos=NODES.map((d,i)=>hor?{x:(i+.5)*Wd/n,y:26}:{x:Wd/2,y:16+i*44});
    NODES.forEach((d,i)=>{if(i){const a=pos[i-1],b=pos[i];s+=hor?'<line x1="'+(a.x+bw/2)+'" y1="'+(a.y+bh/2)+'" x2="'+(b.x-bw/2-3)+'" y2="'+(b.y+bh/2)+'" stroke="var(--mute)" marker-end="url(#orch-ar2)"/>':'<line x1="'+a.x+'" y1="'+(a.y+bh)+'" x2="'+b.x+'" y2="'+(b.y-3)+'" stroke="var(--mute)" marker-end="url(#orch-ar2)"/>'}
      const act=st.node===d[0];const c=d[2]==='llm'?'var(--c1)':d[2]==='human'?'var(--c5)':'var(--mute)';
      s+='<rect x="'+(pos[i].x-bw/2)+'" y="'+pos[i].y+'" width="'+bw+'" height="'+bh+'" rx="7" fill="'+(act?(st.kill?'var(--bad)':c):'var(--bg)')+'" stroke="'+(st.kill&&act?'var(--bad)':c)+'" stroke-width="'+(act?2.5:1.5)+'"/>';
      s+='<text x="'+pos[i].x+'" y="'+(pos[i].y+19)+'" text-anchor="middle" font-size="11" fill="'+(act?'var(--bg)':'var(--ink)')+'">'+d[1]+'</text>'});
    // process strip
    const py=hor?78:n*44+24;s+='<text x="0" y="'+(py+12)+'" font-size="10.5" fill="var(--mute)">processes</text>';
    const pw=Math.min(78,(Wd-70)/Math.max(5,st.procs.length)-6);
    st.procs.forEach((p,i)=>{const x=68+i*(pw+6);const col=p.st==='killed'?'var(--bad)':p.st==='running'?'var(--good)':p.st==='paused'?'var(--c5)':'var(--dim)';
      s+='<rect x="'+x+'" y="'+py+'" width="'+pw+'" height="18" rx="4" fill="'+col+'" opacity="'+(p.st==='done'?.6:1)+'"/><text x="'+(x+pw/2)+'" y="'+(py+13)+'" text-anchor="middle" font-size="10" fill="var(--bg)">'+p.n+' '+(pw>60?p.cmd:'')+'</text>'});
    return '<svg viewBox="0 0 '+Wd+' '+H+'" width="'+Wd+'" height="'+H+'" role="img" aria-label="Graph nodes and processes"><defs><marker id="orch-ar2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>'+s+'</svg>'}
  function drawTree(T,Wd,el,clickable){
    const vis=mode==='with'?CK.filter(c=>c.t<=T+0.02):[];const steps=[...new Set(CK.map(c=>c.step))].sort((a,b)=>a-b);
    const x0=26,sx=(Wd-x0-30)/(steps.length-1),y0=26,dy=46,H=y0+dy+40;const X=c=>x0+steps.indexOf(c.step)*sx,Y=c=>y0+c.br*dy;let s='';
    steps.forEach(st=>{s+='<text x="'+(x0+steps.indexOf(st)*sx)+'" y="12" text-anchor="middle" font-size="9.5" fill="var(--mute)">'+st+'</text>'});
    s+='<text x="'+(Wd-2)+'" y="12" text-anchor="end" font-size="9.5" fill="var(--mute)"></text>';
    CK.forEach(c=>{const p=byId[c.parent];if(p&&vis.includes(c))s+='<line x1="'+X(p)+'" y1="'+Y(p)+'" x2="'+X(c)+'" y2="'+Y(c)+'" stroke="var(--mute)"/>'});
    CK.forEach(c=>{const v=vis.includes(c);const col=c.interrupt?'var(--c5)':c.next.length===0?(hidN(c.hidden)===6?'var(--good)':'var(--c2)'):c.source==='update'?'var(--c4)':'var(--c1)';
      s+='<circle cx="'+X(c)+'" cy="'+Y(c)+'" r="'+(sel===c.id?8:6)+'" fill="'+(v?col:'none')+'" stroke="'+(v?col:'var(--dim)')+'" stroke-dasharray="'+(v?'':'2 2')+'" data-ck="'+c.id+'" style="cursor:pointer" tabindex="0"><title>checkpoint '+c.id+'</title></circle>'});
    if(vis.length){const e=vis.filter(c=>c.next.length===0);e.forEach(c=>{s+='<text x="'+(X(c)-10)+'" y="'+(Y(c)+22)+'" text-anchor="end" font-size="10.5" fill="var(--ink)">'+hidN(c.hidden)+'/6 hidden</text>'})}
    s+='<text x="'+x0+'" y="'+(H-6)+'" font-size="10" fill="var(--mute)">step number; top row: first run; bottom row: rewound branch</text>';
    el.innerHTML=mode==='with'?'<svg viewBox="0 0 '+Wd+' '+H+'" width="'+Wd+'" height="'+H+'" role="img" aria-label="Checkpoint tree">'+s+'</svg>':'<p class="small mute">Without a checkpointer there is nothing here: no rows, no history, nothing to resume or rewind.</p>'}
  function inspect(id){sel=id;const c=byId[id];if(!c)return;
    document.getElementById('orch-ckh').textContent='Checkpoint …'+c.id+' (step '+c.step+')';
    document.getElementById('orch-ck').innerHTML='<dl class="kv"><dt>source</dt><dd>'+c.source+(c.source==='update'?' (written by update_state: the edited diagnosis)':c.source==='input'?' (the input to the run)':' (written after a node finished)')+'</dd><dt>next</dt><dd>'+(c.next.length?'<code>'+c.next.join(', ')+'</code>':'nothing: the run is complete')+'</dd><dt>state keys</dt><dd>'+(c.keys.length?c.keys.join(', '):'empty')+'</dd><dt>pending interrupt</dt><dd>'+(c.interrupt?'yes: "Apply this patch?" with the diff':'no')+'</dd><dt>parent</dt><dd>'+(c.parent?'…'+c.parent:'none')+'</dd>'+(c.next.length===0?'<dt>result</dt><dd>visible tests '+(c.passed?'pass':'fail')+', hidden '+hidN(c.hidden)+'/6</dd>':'')+'</dl>'+
      (c.diagnosis?'<details class="orch-call"><summary><b>diagnosis</b> in this checkpoint</summary><pre>'+esc(c.diagnosis)+'</pre></details>':'')+(c.patch?'<details class="orch-call"><summary><b>patch</b> in this checkpoint</summary><pre>'+esc(c.patch)+'</pre></details>':'');
    if(an)an.redraw()}
  function draw(i){const st=steps()[i];const el=document.getElementById('orch-dsvg');const Wd=U.width(el);
    el.innerHTML=drawFlow(st,Wd)+'<div id="orch-dtree"></div>';drawTree(st.t,Wd,document.getElementById('orch-dtree'));
    document.getElementById('orch-dcap').innerHTML='<b>'+st.t.toFixed(1)+' s</b> '+st.cap;
    const nck=mode==='with'?CK.filter(c=>c.t<=st.t+0.02).length:0;
    document.getElementById('orch-dcnt').innerHTML=U.stat('model calls paid',st.paid,'')+U.stat('paid, answer lost',st.lost,mode==='with'?'the killed call':'killed call + repeated diagnosis')+U.stat('checkpoints saved',nck,'rows in SQLite')+U.stat('process',st.proc,'');
    const ft=document.getElementById('orch-tree');drawTree(1e9,U.width(ft),ft)}
  function rebuild(){const n=steps().length;if(an)an.reset(n);else an=U.anim({card:'orch-df',ctl:'orch-dc',n,label:'Durable execution step',draw,delay:()=>1500});
    document.getElementById('orch-dnote').innerHTML=mode==='with'?'Recorded: event log from the five processes, checkpoints read back from SQLite. Times are seconds from the first process start; the gaps between processes are the driver starting the next one.':'<b>Derived, not run:</b> the same recorded call durations, replayed as a plain script with no checkpointer would have to behave. The model call count assumes the restart is immediate.'}
  U.seg(document.getElementById('orch-dm'),m=>{mode=m;rebuild()});
  document.getElementById('t-orch').addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('[data-ck]');if(c)inspect(c.getAttribute('data-ck'))});
  document.getElementById('t-orch').addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest&&e.target.closest('[data-ck]');if(c)inspect(c.getAttribute('data-ck'))}});
  rebuild();inspect(CK.find(c=>c.interrupt).id);
  // findings
  const hr=ev.filter(e=>e.node==='human_review'&&e.what==='start').length;
  document.getElementById('orch-dfind').innerHTML=[
    '<b>Resume skipped finished work.</b> After the kill, process 2 went straight to <code>propose_fix</code>; <code>diagnose</code> ran once in the whole recording ('+dg.secs+' s, '+U.usd(dg.cost)+'), not twice.',
    '<b>The in-flight call was not saved.</b> '+calls.length+' model calls left recordings, but '+(calls.length+1)+' were started: the one killed after '+(kill.t-pstart.t).toFixed(1)+' s left nothing. A checkpoint is written after a node finishes, never in the middle.',
    '<b>Human pause = process exit.</b> Processes 2 and 4 ended at the interrupt with the question saved; processes 3 and 5 picked it up. <code>human_review</code> started '+hr+' times for 2 approvals: once to ask, once to receive the answer, on each branch.',
    '<b>Time travel changed the outcome.</b> The first branch\'s fix kept quotes around words (hidden '+hidN(endA&&endA.hidden)+'/6). Rewinding to the checkpoint after <code>diagnose</code>, adding one sentence to the diagnosis, and running forward gave '+hidN(endB&&endB.hidden)+'/6, for one more model call ('+pr[pr.length-1].secs+' s). The first branch is still in the database, untouched.',
    '<b>What it cost to store.</b> '+CK.length+' checkpoints for the whole tree; each one is the full state (files as text, diagnosis, patch), so state size times steps is what the database grows by. Keep large blobs out of graph state.'
  ].map(x=>'<li>'+x+'</li>').join('');
  U.onRender(()=>{if(an)an.redraw()});
})();
