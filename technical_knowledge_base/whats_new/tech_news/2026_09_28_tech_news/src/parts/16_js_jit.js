// ---- Memory curated at write time against read time (JitMem), one illustrative bank, animated ----
(function(){
  const card=$('v-jit');if(!card)return;
  $('jtAnim').innerHTML=animCtl('jt',[['write','Write time (distil each run once)'],['read','Read time (JitMem)']]);
  // Four past runs (illustrative ALFWorld-style tasks); the fourth failed.
  const RUNS=[{n:'clean a mug, put it in the coffee machine',s:'clean a mug',ok:1,len:.9,ref:'Rinse items at the sink first'},
    {n:'heat an egg, put it in the fridge',s:'heat an egg',ok:1,len:1,ref:'Heat things in the microwave'},
    {n:'cool an apple, put it on the table',s:'cool an apple',ok:1,len:.75,ref:'Cool things in the fridge'},
    {n:'find two pens, put them in a drawer',s:'find two pens',ok:0,len:.85,ref:'Avoid searching shelves twice'}];
  const TASK='heat a potato, put it on the counter',TASKS='heat potato';
  // Measured on ALFWorld with a GPT-5.4 executor (JitMem paper, efficiency table): input tokens per episode and steps.
  const BASE=9.0,MEAS={write:{tok:19.7,steps:16.2,nm:'ReasoningBank'},read:{tok:9.8,steps:11.6,nm:'JitMem'}};
  const W_STEPS=[
    {t:'A finished run is distilled once',c:'The first run ends. A write-time method turns it straight away into one fixed artefact (a reflection, an insight, a skill) and keeps only that. It has to decide what will matter <b>before any future task is known</b>; the raw trace is not kept.',dur:1.3},
    {t:'Every run, the same way',c:'The other three runs are distilled the same way, the failed one included (it becomes an "avoid" lesson). The bank now holds four short, general lessons, each written for the task it came from.',dur:1.3},
    {t:'A new task arrives',c:'"Heat a potato and put it on the counter." Nothing in the bank was written with this task in mind.',dur:.8},
    {t:'Retrieve the closest lessons',c:'The lessons nearest the task by similarity are pulled into the prompt. They are generic ("heat things in the microwave"); the details that would help here (where the microwave was, what had to be opened first) were dropped at write time.',dur:1},
    {t:'Execute with the lessons in the prompt',c:'The executor runs with the retrieved lessons prepended. Measured on ALFWorld with a GPT-5.4 executor, ReasoningBank (a write-time method) used <b>19.7K input tokens and 16.2 steps</b> per episode against 9.0K and 17.8 with no memory at all.',dur:1.2}];
  const R_STEPS=[
    {t:'A finished run is stored whole',c:'The first run ends. JitMem keeps the <b>raw trajectory</b>, the task description and every observation and action, with no summary at all. An executor-as-judge decides whether it succeeded.',dur:1.3},
    {t:'Only successes go in, raw',c:'The other runs are stored the same way, except the failed one: only trajectories the judge marks successful are appended. Nothing is decided yet about what will matter.',dur:1.3},
    {t:'A new task arrives',c:'"Heat a potato and put it on the counter." This time the task is known before anything is curated.',dur:.8},
    {t:'Retrieve: BM25 over task descriptions',c:'The top raw trajectories are fetched by keyword match on their task descriptions only (BM25), here the egg run and the mug run.',dur:1},
    {t:'Curate now that the task is known',c:'A curator (Qwen3-8B, trained with GRPO on whether the executor then succeeds) reads the task and the retrieved traces and writes a <b>compact payload for this task</b>: the relevant past experience, what worked, specific guidance. The payload is used once and not stored.',dur:1.4},
    {t:'Execute with the payload only',c:'The frozen executor never sees the raw traces, only the payload. Measured on ALFWorld with a GPT-5.4 executor: <b>9.8K input tokens and 11.6 steps</b> per episode, barely more prompt than no memory (9.0K) and six fewer steps.',dur:1.2},
    {t:'Update: the new success is appended raw',c:'If the judge marks the run successful, its raw trajectory joins the bank, ready to be curated again for whatever task comes next.',dur:1}];
  const MODES={write:{name:'Write time',steps:W_STEPS},read:{name:'Read time (JitMem)',steps:R_STEPS}};
  const cl=v=>Math.max(0,Math.min(1,v)),e=t=>t<.5?2*t*t:1-2*(1-t)**2;
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  function txt(x,y,s,o){o=o||{};return '<text x="'+x+'" y="'+y+'" font-size="'+(o.fs||11.5)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.c?' fill="'+o.c+'"':'')+(o.w?' font-weight="600"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+esc(s)+'</text>'}
  function rect(x,y,w,h,f,o){o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="'+(o.rx==null?4:o.rx)+'" fill="'+f+'"'+(o.st?' stroke="'+o.st+'" stroke-width="'+(o.sw||1.5)+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+'/>'}
  function draw(st,mode){
    const m=st.m,k=st.k,t=e(cl(st.t)),box=$('jtSvg');
    const Wd=Math.max(300,Math.round(box.clientWidth||340)),narrow=Wd<600,W=narrow?Wd:760;
    // progress of each phase: p(i) = 0 before step i, t during, 1 after
    const p=i=>k>i?1:k<i?0:t;
    let s='',y=0;
    // layout
    const colW=narrow?W-4:236,gx=narrow?0:262;
    const L={runX:2,runY:26,bankX:narrow?2:gx,bankY:narrow?26+4*30+30:26,rowH:30,
      rightX:narrow?2:2*gx,rightY:narrow?26+9*30+60:26,rightW:narrow?W-4:W-2*gx-2};
    s+=txt(L.runX,16,'Past runs',{w:1,fs:12})+txt(L.bankX,L.bankY-10,'Memory bank: what is kept',{w:1,fs:12})+txt(L.rightX,L.rightY-10,'New task',{w:1,fs:12});
    const lenPx=v=>v*(colW-8);
    RUNS.forEach((r,i)=>{
      const ry=L.runY+i*L.rowH;
      // when is this run "finished"? run 0 at step 0, runs 1..3 during step 1
      const pr=i===0?p(0):cl(p(1)*3-(i-1));
      const op=m==='write'?1-.65*pr:1;
      s+=rect(L.runX,ry,lenPx(r.len),18,r.ok?'var(--c3)':'var(--bad)',{op:.28*op+.12});
      s+=txt(L.runX+6,ry+13,r.s+(r.ok?'':' (failed)'),{fs:11,op:op});
      // bank entry
      const by=L.bankY+i*L.rowH;
      if(pr>0){
        if(m==='write'){const w=lenPx(.42)*cl(pr*1.4);s+=rect(L.bankX,by,narrow?w*1.6:w*1.9,18,'var(--c4)',{op:.25+.2*pr});
          if(pr>.5)s+=txt(L.bankX+6,by+13,narrow?r.ref:r.ref,{fs:11,op:cl(pr*2-1)})}
        else if(r.ok){const w=lenPx(r.len)*cl(pr*1.3);s+=rect(L.bankX,by,w,18,'var(--c3)',{op:.3+.15*pr});
          if(pr>.5)s+=txt(L.bankX+6,by+13,r.s+': raw trace, whole',{fs:11,op:cl(pr*2-1)})}
        else if(pr>.3)s+=txt(L.bankX+6,by+13,'failed run: not stored',{fs:11,c:'var(--mute)',op:cl(pr*2-.6)});
      }
    });
    // new task
    const ty=L.rightY;
    const pt=p(2);
    if(pt>0){s+=rect(L.rightX,ty,L.rightW,22,'var(--acc2)',{op:pt});s+=txt(L.rightX+6,ty+15,narrow?'Task: '+TASK:TASK,{fs:11.5,op:pt,w:1})}
    // retrieval highlight: runs 1 (egg) and 0 (mug)
    const pr3=p(3);
    if(pr3>0){[1,0].forEach(i=>{const by=L.bankY+i*L.rowH;const w=m==='write'?(narrow?lenPx(.42)*1.6:lenPx(.42)*1.9):lenPx(RUNS[i].len);
      s+=rect(L.bankX-2,by-2,w+4,22,'none',{st:'var(--acc)',sw:2,op:pr3})});
      s+=txt(L.rightX,ty+40,m==='write'?'retrieved by similarity: 2 lessons':'retrieved by BM25: 2 raw traces',{fs:11,c:'var(--mute)',op:pr3})}
    // curator (read only)
    let py=ty+52;
    if(m==='read'){const pc=p(4);
      s+=rect(L.rightX,py,L.rightW,40,'none',{st:'var(--c5)',sw:1.5,op:.3+.7*pc,da:pc<1?'4 3':null});
      s+=txt(L.rightX+6,py+15,'Curator (trained on task success)',{fs:11.5,w:1,op:.4+.6*pc});
      s+=txt(L.rightX+6,py+31,pc>0?'payload: "egg run: microwave was shut, open it":'.slice(0,Math.max(10,Math.round((narrow?38:46)*pc))):'waits until a task is known',{fs:11,c:'var(--mute)',op:.5+.5*pc});
      py+=52}
    // prompt bar to scale
    const ex=m==='write'?p(4):p(5),M=MEAS[m],maxT=22.4,bw=L.rightW-4,sc=v=>bw*v/maxT;
    s+=txt(L.rightX,py+12,'Executor prompt, to scale',{fs:11.5,w:1});
    s+=rect(L.rightX,py+20,sc(BASE),18,'var(--dim)');s+=txt(L.rightX+6,py+33,'base 9.0K',{fs:11});
    if(ex>0){const extra=(M.tok-BASE)*ex;s+=rect(L.rightX+sc(BASE),py+20,sc(extra),18,m==='write'?'var(--c4)':'var(--c5)',{op:.75});
      const lab=(m==='write'?'+ lessons ':'+ payload ')+(M.tok-BASE).toFixed(1)+'K';
      const lx=L.rightX+sc(BASE)+sc(extra)+6;
      if(lx+lab.length*6.3<L.rightX+L.rightW)s+=txt(lx,py+33,lab,{fs:11,op:ex});else s+=txt(L.rightX+L.rightW,py+54,lab,{fs:11,a:'end',op:ex})}
    const H2=py+62;
    // update step (read)
    if(m==='read'&&p(6)>0){const by=L.bankY+4*L.rowH;s+=rect(L.bankX,by,lenPx(.8)*p(6),18,'var(--c3)',{op:.35});s+=txt(L.bankX+6,by+13,'new: heat potato, raw',{fs:11,op:p(6)})}
    const H=Math.max(H2,L.bankY+5*L.rowH+6,narrow?0:L.runY+4*L.rowH+6)+6;
    box.innerHTML=svgEl(W,H,s,'Memory curation, '+mode.name);
    // counters
    const done=m==='write'?ex>=1:ex>=1;
    const runsIn=m==='write'?Math.round(RUNS.length*cl(p(0)*.25+p(1)*.75)):Math.round(3*cl(p(0)/3+p(1)*2/3));
    $('jtCnt').innerHTML=stat('Kept in the bank',runsIn+(m==='write'?' lessons':' raw traces'),m==='write'?'one per finished run':'successes only')+
      stat('Curation done',m==='write'?runsIn+' times, task unknown':(p(4)>=1?'1 time, task known':'not yet'),m==='write'?'at write time':'at read time')+
      stat('Executor input tokens',done?M.tok.toFixed(1)+'K':'..','measured, ALFWorld, GPT-5.4 ('+M.nm+')')+
      stat('Steps per episode',done?M.steps.toFixed(1):'..','no memory: 17.8');
  }
  makeAnim({card,pre:'jt',modes:MODES,start:'write',dur:2600,draw});
})();
