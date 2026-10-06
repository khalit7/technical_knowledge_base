// Section 1: the pattern picker. Each pattern is drawn as nodes (model loops, code, stores) and edges
// (solid = control, dashed = what is passed). Layout in a 0..100 x 0..60 box, scaled to the card width.
(function(){
  const P={
    single:{name:'One agent',nodes:[['u','user',10,30,'c'],['a','agent',55,30,'m']],
      edges:[['u','a','s','task'],['a','a','d','its own tool results, all of them']],
      kv:[['Who decides','the one model, every step'],['Who sees what','everything it has read so far, in one growing context'],['Cost shape','each call resends the whole history: total tokens grow with the square of the number of steps (section 9)'],['Measured here','the single agent in sections 2 and 3']]},
    orch:{name:'Orchestrator-workers',nodes:[['l','lead',14,30,'m'],['w1','worker',62,8,'m'],['w2','worker',62,30,'m'],['w3','worker',62,52,'m']],
      edges:[['l','w1','s','brief'],['l','w2','s','brief'],['l','w3','s','brief'],['w1','l','d','report'],['w2','l','d',''],['w3','l','d','']],
      kv:[['Who decides','the lead model: how to split, whom to start, when to stop'],['Who sees what','each worker sees only its brief and its own reading; the lead sees briefs and reports'],['Cost shape','one start-up context per worker, plus the lead; contexts stay small, so the square-law growth is split'],['Examples','Claude Code subagents (the Agent tool), Anthropic\'s Research system, a LangGraph supervisor written as tool calls'],['Measured here','section 3 (lead with 6 auditors)']]},
    fanout:{name:'Fan-out workflow',nodes:[['c','your code',14,30,'c'],['w1','call',62,8,'m'],['w2','call',62,30,'m'],['w3','call',62,52,'m'],['g','merge (code)',88,30,'c']],
      edges:[['c','w1','s','slice 1'],['c','w2','s','slice 2'],['c','w3','s','slice 3'],['w1','g','d',''],['w2','g','d','answers'],['w3','g','d','']],
      kv:[['Who decides','your code: the split and the merge are fixed in advance'],['Who sees what','each call sees its slice, pasted in; nobody sees the whole'],['Cost shape','one call per slice, no lead, no exploration; the cheapest parallel design when the split is known'],['Examples','asyncio.gather over model calls, LangGraph Send, the parent page\'s "parallelisation" workflow'],['Measured here','section 4']]},
    board:{name:'Blackboard (shared store)',nodes:[['w1','agent',14,10,'m'],['w2','agent',14,50,'m'],['b','board',55,30,'s'],['w3','agent',92,10,'m'],['w4','agent',92,50,'m']],
      edges:[['w1','b','d','claim, post'],['w2','b','d',''],['w3','b','d','read'],['w4','b','d','']],
      kv:[['Who decides','nobody centrally: each agent takes the next unclaimed piece from the store'],['Who sees what','each agent sees its own work plus whatever it reads from the store'],['Cost shape','like workers, minus the lead; work balances itself; nothing filters what gets posted'],['Examples','Hearsay-II (1971 to 1976), Claude Code agent teams\' shared task list, Agora\'s Git graph, Anthropic\'s FLT proof graph'],['Measured here','section 5 (6 agents with atomic claims, then a check round)']]},
    handoff:{name:'Handoff',nodes:[['u','user',8,30,'c'],['t','triage',36,30,'m'],['b','billing',78,12,'m'],['x','tech',78,48,'m']],
      edges:[['u','t','s','message'],['t','b','s','transfer: whole history'],['t','x','s','']],
      kv:[['Who decides','the current agent, by calling a transfer tool; then the new agent owns the conversation'],['Who sees what','the receiving agent sees the whole conversation so far, under its own instructions and tools'],['Cost shape','one active agent at a time; no merge step; nothing runs in parallel'],['Examples','OpenAI Agents SDK handoffs (transfer_to_<agent>), langgraph-swarm'],['Measured here','section 6, local model']]},
    astool:{name:'Agents as tools',nodes:[['u','user',8,30,'c'],['m','manager',36,30,'m'],['b','billing',78,12,'m'],['x','tech',78,48,'m']],
      edges:[['u','m','s','message'],['m','b','s','tool call: a generated input'],['m','x','s',''],['b','m','d','result'],['x','m','d','']],
      kv:[['Who decides','the manager model, which keeps the conversation'],['Who sees what','a specialist sees only the input the manager wrote for it, not the conversation'],['Cost shape','manager calls plus one short run per specialist; the manager writes the reply'],['Examples','OpenAI Agents SDK Agent.as_tool, Claude Code subagents seen from the lead'],['Measured here','section 6, local model']]},
    debate:{name:'Debate',nodes:[['q','question',8,30,'c'],['a1','solver',42,8,'m'],['a2','solver',42,30,'m'],['a3','solver',42,52,'m'],['v','vote (code)',88,30,'c']],
      edges:[['q','a1','s',''],['q','a2','s','same question'],['q','a3','s',''],['a1','a2','d','each reads the others'],['a1','v','d',''],['a2','v','d','round 2 answers'],['a3','v','d','']],
      kv:[['Who decides','code runs the rounds; each solver revises after reading the others'],['Who sees what','round 1: only the question; round 2: the question plus every other solver\'s answer and reasoning'],['Cost shape','solvers x rounds calls, and round-2 prompts carry the other answers'],['Examples','Du et al. 2023 (three agents, two rounds), judge panels'],['Measured here','section 8 and the Debate lab']]},
    vote:{name:'Voting (self-consistency)',nodes:[['q','question',8,30,'c'],['a1','sample',48,8,'m'],['a2','sample',48,30,'m'],['a3','sample',48,52,'m'],['v','majority (code)',88,30,'c']],
      edges:[['q','a1','s',''],['q','a2','s','same question, independent'],['q','a3','s',''],['a1','v','d',''],['a2','v','d','answers'],['a3','v','d','']],
      kv:[['Who decides','code: the most common answer wins'],['Who sees what','each sample sees only the question'],['Cost shape','k independent calls; no prompt grows'],['Examples','self-consistency (Wang et al. 2022); the baseline debate papers compare against'],['Measured here','section 8 and the Debate lab']]}
  };
  const order=['single','orch','fanout','board','handoff','astool','debate','vote'];
  const seg=document.getElementById('fm-patseg');
  seg.innerHTML=order.map((k,i)=>'<button data-m="'+k+'"'+(i===1?' class="on"':'')+'>'+P[k].name+'</button>').join('');
  let cur='orch';
  const col={m:'var(--c1)',c:'var(--c5)',s:'var(--c3)'};
  function draw(){
    const p=P[cur],el=document.getElementById('fm-patsvg');
    const W=Math.min(RD.width(el),760),H=Math.round(Math.max(200,W*0.42));
    const sx=x=>Math.round(14+x/100*(W-28)),sy=y=>Math.round(18+y/60*(H-40));
    const narrow=W<520,fs=narrow?10:11.5,bw=Math.max(54,Math.min(104,W*0.16)),bh=26;
    const pos={};p.nodes.forEach(n=>pos[n[0]]=[sx(n[2]),sy(n[3])]);
    let s='<defs><marker id="fm-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    p.edges.forEach(e=>{
      const a=pos[e[0]],b=pos[e[1]];
      if(e[0]===e[1]){s+='<path d="M'+(a[0]+bw/2)+','+(a[1]-6)+' C'+(a[0]+bw/2+40)+','+(a[1]-46)+' '+(a[0]-10)+','+(a[1]-50)+' '+(a[0])+','+(a[1]-bh/2)+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3" marker-end="url(#fm-ar)"/>'+(narrow?'':RD.t(Math.min(W-6,a[0]+bw/2+4),a[1]-44,e[3],{fs:10.5,fill:'var(--mute)',a:'end'}));return}
      const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
      const off=(x,y,ux,uy)=>{const tx=Math.abs(ux)>1e-6?(bw/2+3)/Math.abs(ux):1e9,ty=Math.abs(uy)>1e-6?(bh/2+3)/Math.abs(uy):1e9,t=Math.min(tx,ty);return [x+ux*t,y+uy*t]};
      const ux=dx/L,uy=dy/L,p1=off(a[0],a[1],ux,uy),p2=off(b[0],b[1],-ux,-uy);
      const back=p.edges.some(f=>f[0]===e[1]&&f[1]===e[0]);const sh=back?(e[2]==='d'?8:-8):0;
      const nx=-uy*sh,ny=ux*sh;
      s+='<line x1="'+(p1[0]+nx)+'" y1="'+(p1[1]+ny)+'" x2="'+(p2[0]+nx)+'" y2="'+(p2[1]+ny)+'" stroke="var(--mute)"'+(e[2]==='d'?' stroke-dasharray="4 3"':'')+' marker-end="url(#fm-ar)"/>';
      if(e[3]&&!narrow){const mx=(p1[0]+p2[0])/2+nx*2.2,my=(p1[1]+p2[1])/2+ny*2.2+(back?(e[2]==='d'?10:-3):-4);s+=RD.t(Math.max(4,Math.min(W-4,mx)),my,e[3],{fs:10.5,fill:'var(--mute)',a:'middle'})}
    });
    p.nodes.forEach(n=>{const [x,y]=pos[n[0]];s+='<rect x="'+(x-bw/2)+'" y="'+(y-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="'+(n[4]==='s'?2:8)+'" fill="'+col[n[4]]+'" opacity=".9"/>'+RD.t(x,y+4,n[1],{fs:(n[1].length*fs*0.58>bw-6?fs*(bw-6)/(n[1].length*fs*0.58):fs).toFixed(1),fill:'var(--bg)',a:'middle',w:600})});
    el.innerHTML=RD.svg(W,H,s,p.name);
    document.getElementById('fm-patkv').innerHTML=p.kv.map(k=>'<dt>'+k[0]+'</dt><dd>'+k[1]+'</dd>').join('');
  }
  RD.seg(seg,m=>{cur=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
