// ---- Reading tab: sections 0 to 8 and 10 ----
(function(){
  const D=window.FLG,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=n=>Number(n).toLocaleString('en-US');
  const E1=n=>D.e1.find(g=>g.name===n);
  const REAL_EDGES=[['__start__','read_and_test'],['read_and_test','diagnose_word_count'],['read_and_test','diagnose_top_words'],['diagnose_word_count','propose_fix'],['diagnose_top_words','propose_fix'],['propose_fix','human_review'],['human_review','apply_and_test'],['apply_and_test','__end__']].map(([s,t])=>({s,t,cond:false}));
  window.FLG_REAL_EDGES=REAL_EDGES;

  // s0 findings
  const st=D.e3.runs;const sp=st.find(r=>r.saver==='sqlite'&&r.state==='Plain'),sd=st.find(r=>r.saver==='sqlite'&&r.state==='Delta');
  const ks=D.e2.scenarios.find(s=>s.kind==='kill'&&s.durability==='sync'),ke=D.e2.scenarios.find(s=>s.kind==='kill'&&s.durability==='exit');
  const A=D.e6.runs.A,B=D.e6.runs.B;
  const se=D.e4.cases.find(c=>c.name==='side_effect_before');const last=se.calls[se.calls.length-1].starts;
  const fl=[
    'A crash mid-step loses only the work still in flight: killed during a parallel step, the resumed process ran only the unfinished node, because the finished one’s output was saved as a pending write (section 5). With durability "exit" nothing was saved and the run had to start over.',
    'With real Claude Haiku 4.5 calls the same kill cost '+A.calls.length+' model calls to finish with a checkpointer writing each step and '+B.calls.length+' with "exit": the diagnosis that had already returned was paid for twice (section 5).',
    'Resuming after interrupt() re-runs the node from its first line: an e-mail sent before the interrupt went out '+last.email_sent+' times for one approval (section 6).',
    'Checkpoint storage grows with the square of the run length: '+fmt(sp.final.total)+' bytes in SQLite after 40 small agent steps, '+fmt(sd.final.total)+' with the beta DeltaChannel (section 4).',
    'Two parallel writes to a key without a reducer fail the step and leave the thread unreadable until repaired (section 3); two plain edges into one node make it run twice when the branches differ in length.'
  ];
  if(D.e7){const r=D.e7_check||null;fl.push('LangChain’s create_agent compiles to a LangGraph graph in which each middleware hook is a node; the human-approval middleware is an interrupt() over the pending tool calls (section 9).')}
  $('flg-findings').innerHTML=fl.map(s=>'<li>'+esc(s)+'</li>').join('');

  // s2 real graph
  const drawReal=()=>{const el=$('flg-g-real');el.innerHTML=FLGG.svg('real',REAL_EDGES,Math.min(RD.width(el),420),{})};
  RD.onRender(drawReal);RD.onResize(drawReal);drawReal();

  // s3 reducer animation
  let mode='fan_reducer';
  const pl=FLGS.mount({card:'flg-r-card',ctl:'flg-r-ctl',svgEl:$('flg-r-svg'),capEl:$('flg-r-cap'),tableEl:$('flg-r-tab'),counterEl:$('flg-r-cnt'),tab:'t-read',getGraph:()=>E1(mode),hidden:()=>false});
  RD.seg($('flg-r-mode'),m=>{mode=m;pl.reload()});
  RD.onResize(()=>pl.redraw());

  // s4 checkpoint picker
  const lin=E1('linear');
  $('flg-ck-pick').innerHTML=lin.steps.map((s,i)=>'<button data-i="'+i+'"'+(i===2?' class="on"':'')+'>step '+s.step+'</button>').join('');
  const showCk=i=>{const s=lin.steps[i];$('flg-ck-json').textContent=JSON.stringify({metadata:{source:s.source,step:s.step},channel_values:s.values,channel_versions:s.versions,versions_seen:s.seen,updated_channels:s.updated,pending_writes:s.writes.map(w=>[w.task,w.channel,w.value])},null,1)};
  $('flg-ck-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('flg-ck-pick').children].forEach(x=>x.classList.toggle('on',x===b));showCk(+b.dataset.i)});
  showCk(2);

  // s4 storage
  let sv='sqlite';
  const drawSt=()=>{const r=D.e3.runs.filter(x=>x.saver===sv);const p=r.find(x=>x.state==='Plain'),d=r.find(x=>x.state==='Delta');
    FLGC.growth($('flg-st-svg'),[{y:p.series,label:'add_messages',c:'var(--c2)'},{y:d.series,label:'DeltaChannel (beta)',c:'var(--c1)'}]);
    $('flg-st-out').innerHTML=RD.stat('add_messages, 40 steps',(p.final.total/1e6).toFixed(2)+' MB',fmt(p.final.total)+' bytes; get_state '+p.get_state_ms+' ms')+
      RD.stat('DeltaChannel, 40 steps',(d.final.total/1e3).toFixed(0)+' KB',fmt(d.final.total)+' bytes; get_state '+d.get_state_ms+' ms')+
      RD.stat('Ratio',(p.final.total/d.final.total).toFixed(1)+'×','same '+p.messages+' messages in the final state')};
  RD.seg($('flg-st-mode'),m=>{sv=m;drawSt()});RD.onRender(drawSt);RD.onResize(drawSt);drawSt();

  // s4 durability table
  const ov=D.e2.overhead;
  $('flg-dur-t').innerHTML='<thead><tr><th>Saver</th><th>durability</th><th class="num">ms per super-step</th><th class="num">200 steps</th><th class="num">checkpoints kept</th></tr></thead><tbody>'+
    ov.map(o=>'<tr><td>'+(o.saver==='sqlite'?'SQLite (file)':'InMemorySaver')+'</td><td><code>'+o.durability+'</code></td><td class="num">'+o.ms_per_step.toFixed(3)+'</td><td class="num">'+o.best_secs.toFixed(3)+' s</td><td class="num">'+o.checkpoints_kept+'</td></tr>').join('')+'</tbody>';

  // s5 kill table
  const procs=s=>{const by={};s.ran.forEach(r=>{(by[r.process]=by[r.process]||[]).push(r.node)});return by};
  $('flg-kill-t').innerHTML='<thead><tr><th>Case</th><th>Process 1 ran</th><th>Saved when it stopped</th><th>Process 2 (resume) ran</th></tr></thead><tbody>'+
    D.e2.scenarios.map(s=>{const p=procs(s);const r2=s.processes[1].stdout;
      return '<tr><td>'+(s.kind==='kill'?'SIGKILL, <code>'+s.durability+'</code>':'exception, <code>'+s.durability+'</code>')+'</td><td class="small">'+esc((p[1]||[]).join(', '))+'</td><td class="small">'+s.after_first.checkpoints+' checkpoints, '+s.after_first.writes+' writes</td><td class="small">'+
      (p[2]?esc(p[2].join(', ')):(r2&&!r2.ok?'<span style="color:var(--bad)">'+esc(r2.err)+'</span>':'nothing'))+'</td></tr>'}).join('')+'</tbody>';

  // s5 real lanes, both runs
  const drawR6=()=>{const el=$('flg-r6-svg');const W=RD.width(el);
    el.innerHTML='<div class="small"><b>durability="sync"</b></div>'+FLGC.lanes(A,W)+'<div class="small" style="margin-top:6px"><b>durability="exit"</b></div>'+FLGC.lanes(B,W);
    const a=FLGC.sums(A),b=FLGC.sums(B);
    $('flg-r6-out').innerHTML=RD.stat('Model calls started',a.calls+' vs '+b.calls,'sync vs exit; '+a.lost+' killed in each')+
      RD.stat('Calls that returned',a.done+' vs '+b.done,fmt(a.inp+a.out)+' vs '+fmt(b.inp+b.out)+' tokens in + out')+
      RD.stat('Cost equivalent','$'+a.cost.toFixed(4)+' vs $'+b.cost.toFixed(4),'total_cost_usd of the returned calls; thinking length varies call to call')};
  RD.onRender(drawR6);RD.onResize(drawR6);drawR6();

  // s6 interrupt animation
  const CODE={
    side_effect_before:['def review(state):','    send_email("patch ready")','    d = interrupt({"question": "Apply this patch?"})','    return {"decision": d}'],
    side_effect_after:['def review(state):','    d = interrupt({"question": "Apply this patch?"})','    if d == "approve":','        send_email("patch applied")','    return {"decision": d}']};
  const FR={
    side_effect_before:[[null,'invoke({}, config): propose runs, then review starts',{r:0,e:0}],[0,'review runs from its first line',{r:1,e:0}],[1,'the e-mail goes out',{r:1,e:1}],[2,'interrupt() raises: the state is saved and invoke returns the question',{r:1,e:1}],[null,'Later, maybe another process: invoke(Command(resume="approve"), config)',{r:1,e:1}],[0,'review runs again from its first line',{r:2,e:1}],[1,'the e-mail goes out a second time',{r:2,e:2}],[2,'interrupt() now returns "approve" instead of raising',{r:2,e:2}],[3,'the node returns; apply runs next',{r:2,e:2}]],
    side_effect_after:[[null,'invoke({}, config): propose runs, then review starts',{r:0,e:0}],[0,'review runs from its first line',{r:1,e:0}],[1,'interrupt() raises: the state is saved and invoke returns the question',{r:1,e:0}],[null,'Later, maybe another process: invoke(Command(resume="approve"), config)',{r:1,e:0}],[0,'review runs again from its first line',{r:2,e:0}],[1,'interrupt() now returns "approve"',{r:2,e:0}],[2,'the decision is approve',{r:2,e:0}],[3,'the e-mail goes out once, after the decision',{r:2,e:1}],[4,'the node returns',{r:2,e:1}]]};
  let im='side_effect_before';
  const rec=n=>{const c=D.e4.cases.find(x=>x.name===n);return c.calls[c.calls.length-1].starts};
  const drawI=i=>{const f=FR[im][Math.min(i,FR[im].length-1)];
    $('flg-i-code').innerHTML=CODE[im].map((l,k)=>'<span'+(k===f[0]?' class="hl"':'')+'>'+esc(l)+'</span>').join('\n');
    const r=rec(im);
    $('flg-i-cnt').innerHTML=RD.stat('review started',f[2].r,'recorded total: '+r.review)+RD.stat('e-mails sent',f[2].e,'recorded total: '+(r.email_sent||0));
    $('flg-i-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+FR[im].length+'</div><p>'+esc(f[1])+'</p>'};
  const ia=RD.anim({card:'flg-i-card',ctl:'flg-i-ctl',n:FR[im].length,draw:drawI,ms:1500,label:'Step through the interrupt'});
  RD.seg($('flg-i-mode'),m=>{im=m;ia.reset(FR[im].length)});

  // s6 rules table
  const C=n=>D.e4.cases.find(x=>x.name===n);
  const res=(c,k)=>{const x=c.calls[k];return x.ok?'':esc(x.error.split('\n')[0])};
  const two=C('two_in_one_node'),par=C('parallel'),one=C('parallel_one_value'),te=C('try_except'),nc=C('no_checkpointer'),sb=C('schema_bad'),stc=C('static_before');
  const rows=[
    ['Two interrupt() calls in one node','Three invokes: start, resume "tokenize", resume "yes". The node started '+two.calls[2].starts.ask+' times; answers '+esc(JSON.stringify(two.calls[2].result.value.answers))+'.','"Matching is strictly index-based": never reorder or skip interrupts conditionally.'],
    ['Interrupts in two parallel branches','One invoke returned '+par.calls[0].result.interrupts.length+' interrupts; resumed together with Command(resume={id: value, ...}); each node started '+par.calls[1].starts.fix_tokenize+' times.','Resume several pending interrupts by id in one call.'],
    ['The same, resumed with one plain value','<span style="color:var(--bad)">'+res(one,1)+'</span>','A single value works only when one interrupt is pending.'],
    ['interrupt() inside try/except Exception','No pause: the except branch caught '+esc(Object.keys(te.calls[0].starts).filter(k=>k.startsWith('caught_')).map(k=>k.slice(7)).join(''))+' and returned "'+esc(te.calls[0].result.value.decision)+'".','"Do not wrap interrupt calls in try/except" (bare except).'],
    ['No checkpointer','The first invoke still returned the interrupt payload; the resume failed: <span style="color:var(--bad)">'+res(nc,1)+'</span>.','A checkpointer is required to resume.'],
    ['response_schema=Approval (Pydantic, since 1.2.12)','A resume of {"approve": "maybe"} raised '+esc(sb.calls[1].error.split(':')[0])+'; a valid one was accepted; the node started '+sb.calls[2].starts.review+' times.','The resume value is validated; a bad one leaves the thread paused.'],
    ['compile(interrupt_before=["apply"])','The run stopped before apply with no interrupt payload; invoke(None) ran apply ('+stc.calls[1].starts.apply+' time).','A breakpoint for debugging, not for approvals.']];
  $('flg-int-t').innerHTML='<thead><tr><th>Case</th><th>What happened</th><th>Rule</th></tr></thead><tbody>'+rows.map(r=>'<tr><td class="small">'+r[0]+'</td><td class="small">'+r[1]+'</td><td class="small">'+r[2]+'</td></tr>').join('')+'</tbody>';

  // s7 streaming
  const DESC={values:'The whole state after each super-step.',updates:'Only what each node returned, one event per node.',custom:'Whatever nodes wrote with get_stream_writer(): here, two progress messages.',checkpoints:'One event per saved checkpoint, in the format of get_state(). Needs a checkpointer.',tasks:'A start and a finish event per task, with inputs, results and errors. Needs a checkpointer.',debug:'checkpoints and tasks together, with step numbers and timestamps.','updates+custom':'Two modes at once: (mode, data) pairs.',v2:'The same two modes with version="v2": typed {type, ns, data} dictionaries.'};
  const sm=D.e5.streams;
  $('flg-sm-pick').innerHTML=Object.keys(sm).map((k,i)=>'<button data-k="'+k+'"'+(i===1?' class="on"':'')+'>'+k+' <span class="mute">('+sm[k].count+')</span></button>').join('');
  const showSm=k=>{$('flg-sm-desc').innerHTML='<b>'+esc(k)+'</b>: '+esc(DESC[k]||'')+' '+sm[k].count+' events.';$('flg-sm-ev').textContent=sm[k].events.map(e=>JSON.stringify(e)).join('\n')};
  $('flg-sm-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('flg-sm-pick').children].forEach(x=>x.classList.toggle('on',x===b));showSm(b.dataset.k)});
  showSm('updates');

  // s8 subgraphs
  const sg=D.e5.subgraphs;const fmtS=o=>Object.entries(o).map(([k,v])=>k+' '+v).join(', ');
  $('flg-sub-t').innerHTML='<thead><tr><th>Subgraph used as</th><th>Started before the pause</th><th>Started in total after resume</th><th>Checkpoint namespaces</th></tr></thead><tbody>'+
    ['as_node','called_in_function'].map(k=>'<tr><td class="small">'+(k==='as_node'?'<code>add_node("fix_bug", subgraph)</code>':'a node function that calls <code>subgraph.invoke(...)</code>')+'</td><td class="small mono">'+esc(fmtS(sg[k].starts_after_pause))+'</td><td class="small mono">'+esc(fmtS(sg[k].starts_after_resume))+'</td><td class="small mono">'+esc(sg[k].namespaces.map(n=>n===''?'"" (parent)':n).join(', '))+'</td></tr>').join('')+'</tbody>';

  // s10 store
  $('flg-store-t').innerHTML='<thead><tr><th>Thread</th><th>User</th><th>Message</th><th>Answer</th></tr></thead><tbody>'+
    D.e5.store.log.map(r=>'<tr><td class="mono">'+esc(r.thread)+'</td><td class="mono">'+esc(r.user)+'</td><td class="small">'+esc(r.q)+'</td><td class="small">'+esc(r.a)+'</td></tr>').join('')+'</tbody>';

  const cli=$('flg-cli');if(cli)cli.textContent=D.e6.cli;
})();
