// ---- Reading top and section 1: the hero figure (static, drawn at the measured width) and LangChain's Runnables from E8 ----
(function(){
  const D=window.FLG,esc=RD.esc,$=id=>document.getElementById(id);
  // hero: LangChain -> StateGraph -> Pregel super-step loop -> checkpointer, with resume
  function hero(){
    const el=$('flg-hero');if(!el)return;const W=Math.min(RD.width(el),760);const L=8,R=W-8;
    const aid='flgHeroA'+(++window.FLG_UID),aidC='flgHeroC'+window.FLG_UID,aidG='flgHeroG'+window.FLG_UID;
    let b='<defs>'+[[aid,'var(--mute)'],[aidC,'var(--acc)'],[aidG,'var(--good)']].map(([i,c])=>'<marker id="'+i+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="'+c+'"/></marker>').join('')+'</defs>';
    const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||8)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"/>'};
    const chips=(list,y0,hiIdx)=>{let x=L+10,y=y0,s='';list.forEach((t,i)=>{const w=Math.round(t.length*6.3+16);if(x+w>R-10){x=L+10;y+=24}
      s+=box(x,y,w,19,{rx:9,fill:i===hiIdx?'var(--acc2)':'var(--soft)',stroke:i===hiIdx?'var(--acc)':'var(--line)'})+RD.t(x+w/2,y+13.5,esc(t),{a:'middle',fs:11});x+=w+6});return {s,h:y-y0+19}};
    const down=(x,y1,y2,lab,col,mk)=>'<line x1="'+x+'" y1="'+y1+'" x2="'+x+'" y2="'+(y2-2)+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.6" marker-end="url(#'+(mk||aid)+')"/>'+(lab?RD.t(x+6,(y1+y2)/2+4,esc(lab),{fs:10.5,fill:col||'var(--mute)'}):'');
    let y=4;
    // band 1: LangChain
    let c=chips(['init_chat_model','@tool','retriever','prompt | model | parser','create_agent + middleware'],y+24,4);
    let h=c.h+32;b+=box(L,y,R-L,h,{fill:'var(--bg)'})+RD.t(L+10,y+16,'LangChain 1.x (section 1, 9)',{fs:12,w:600})+c.s;
    const ax=Math.round(W*0.62);b+=down(ax,y+h,y+h+26,'create_agent builds one');y+=h+26;
    // band 2: StateGraph
    c=chips(['State + reducers','nodes','edges','compile()'],y+24,-1);h=c.h+32;
    b+=box(L,y,R-L,h)+RD.t(L+10,y+16,'LangGraph StateGraph (section 2)',{fs:12,w:600})+c.s;
    b+=down(ax,y+h,y+h+26,'compile() returns');y+=h+26;
    // band 3: one super-step
    const bh=42,gap=22,bw=Math.floor((R-L-20-2*gap)/3),bt=y+50;h=bt-y+bh+12;
    b+=box(L,y,R-L,h)+RD.t(L+10,y+16,'Pregel runtime: one super-step (section 3)',{fs:12,w:600});
    const cx=[0,1,2].map(i=>L+10+i*(bw+gap)+bw/2);
    const lab=[['plan','what is triggered?'],['execute','in parallel'],['update','reducers merge']];
    lab.forEach((t,i)=>{b+=box(cx[i]-bw/2,bt,bw,bh,{fill:i===2?'var(--acc2)':'var(--soft)',stroke:i===2?'var(--acc)':'var(--line)'})+RD.t(cx[i],bt+17,t[0],{a:'middle',fs:12,w:600})+RD.t(cx[i],bt+33,esc(t[1]),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    for(let i=0;i<2;i++)b+='<line x1="'+(cx[i]+bw/2+2)+'" y1="'+(bt+bh/2)+'" x2="'+(cx[i+1]-bw/2-3)+'" y2="'+(bt+bh/2)+'" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#'+aid+')"/>';
    // loop arc over the boxes: update back to plan
    b+='<path d="M'+cx[2]+','+(bt-1)+' C'+cx[2]+','+(bt-26)+' '+cx[0]+','+(bt-26)+' '+cx[0]+','+(bt-3)+'" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#'+aid+')"/>'+RD.t(cx[1],bt-6,'next super-step',{a:'middle',fs:10.5,fill:'var(--mute)'});
    // gap to the database: pending writes, checkpoint, resume
    const g0=y+h,g1=g0+42;
    b+='<line x1="'+cx[1]+'" y1="'+(bt+bh)+'" x2="'+cx[1]+'" y2="'+(g1-2)+'" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#'+aidC+')"/>'+RD.t(cx[1]+6,g0+15,'pending writes',{fs:10.5,fill:'var(--acc)',w:600});
    b+='<line x1="'+cx[2]+'" y1="'+(bt+bh)+'" x2="'+cx[2]+'" y2="'+(g1-2)+'" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#'+aidC+')"/>'+RD.t(cx[2]-6,g0+33,'checkpoint',{a:'end',fs:10.5,fill:'var(--acc)',w:600});
    b+='<line x1="'+cx[0]+'" y1="'+g1+'" x2="'+cx[0]+'" y2="'+(bt+bh+3)+'" stroke="var(--good)" stroke-width="1.8" marker-end="url(#'+aidG+')"/>'+RD.t(cx[0]+6,g0+24,'resume',{fs:10.5,fill:'var(--good)',w:600});
    // band 4: the checkpointer
    y=g1;h=50;b+=box(L,y,R-L,h,{fill:'var(--acc2)',stroke:'var(--acc)',sw:2})+RD.t(L+10,y+19,'Checkpointer: SQLite or Postgres (sections 4, 5)',{fs:12,w:600,fill:'var(--ink)'})+
      RD.t(L+10,y+37,W<430?'thread_id: checkpoints 0, 1, 2 ... + writes':'thread_id → checkpoint 0, 1, 2 ... plus each step’s pending writes',{fs:11,fill:'var(--ink)'});
    y+=h+4;
    el.innerHTML=RD.svg(W,y,b,'LangChain builds a StateGraph; compile gives a Pregel runtime that loops plan, execute, update and saves pending writes and a checkpoint per super-step; resume loads the last checkpoint');
  }
  RD.onRender(hero);RD.onResize(hero);hero();

  // section 1: one invoke through prompt | model | parser
  const E=D.e8;if(!E||!$('flg-lc-pipe'))return;
  const msgs=E.messages.map(m=>'['+m.type+'] '+m.content).join('\n');
  const st=E.chain.steps;
  $('flg-lc-pipe').innerHTML=
    '<div class="v">'+esc(JSON.stringify(E.input))+'</div>'+
    '<div class="ar">&#8595; input dict</div>'+
    '<div class="c"><b>'+esc(st[0])+'</b> fills its two message templates</div>'+
    '<div class="ar">&#8595; ChatPromptValue: the exact messages the model receives</div>'+
    '<div class="v">'+esc(msgs)+'</div>'+
    '<div class="c"><b>chat model</b> ('+esc(st[1]==='Probe'?'FakeListChatModel':st[1])+' here; ChatOpenAI, ChatAnthropic and the rest in real use)</div>'+
    '<div class="ar">&#8595; AIMessage</div>'+
    '<div class="v">AIMessage(content='+esc(JSON.stringify(E.answer))+')</div>'+
    '<div class="c"><b>'+esc(st[2])+'</b> takes <code>.content</code></div>'+
    '<div class="ar">&#8595; str: the value chain.invoke() returns</div>'+
    '<div class="v">'+esc(JSON.stringify(E.answer))+'</div>';
  const rn=E.runnables;
  $('flg-lc-rn').textContent=rn[0].methods.join(', ')+' (checked on '+rn.map(r=>r.cls==='Probe'?'the chat model':r.cls).join(', ')+'; all '+rn.filter(r=>r.is_runnable).length+' pass isinstance(x, Runnable))';
  $('flg-lc-tool').textContent=JSON.stringify(E.tool_schema,null,1);
  $('flg-lc-ret').textContent=E.retrieved.map((d,i)=>'Document '+(i+1)+' ('+d.file+'):\n'+d.text).join('\n\n');
  const o=E.overhead_us,f=E.frames;
  $('flg-lc-cost').innerHTML=RD.stat('chain.invoke()',Math.round(o.lcel_best)+' µs','per call, best of '+o.reps+' runs of '+o.calls.toLocaleString('en-US')+' calls; median '+Math.round(o.lcel_median)+' µs')+
    RD.stat('Two plain functions',o.plain_best.toFixed(2)+' µs','same messages, same answer')+
    RD.stat('Frames down to the model',f.lcel+' vs '+f.plain,esc(f.lcel_names.join(' → ')))+
    RD.stat('Share of a 1 s model call',(o.lcel_best/1e4).toFixed(3)+'%','= '+Math.round(o.lcel_best)+' µs / 1,000,000 µs');
  $('flg-lc-us').textContent='about '+Math.round(o.lcel_best-o.plain_best)+' µs';
  $('flg-lc-fr').textContent=f.lcel+' framework frames ('+f.lcel_names.join(' → ')+') where the plain version has '+f.plain;
})();
