// ---- The paper tab, part 1: numbers from recompute.py, the state hierarchy, the orchestration animation ----
const PT=window.PAPER.tables,RC=window.PAPER.rc;
const getp=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
document.querySelectorAll('[data-rc]').forEach(el=>{const v=getp(RC,el.dataset.rc);if(v==null){__jsErr('missing rc '+el.dataset.rc);return}
  el.textContent=el.dataset.f==='k'?Math.round(v/1000)+',000':typeof v==='number'?fmt(v,Number.isInteger(v)?0:2):String(v)});

// state hierarchy (Figure 2), click a level
(function(){const host=$('hierSvg');if(!host)return;let sel=2;
  const L=[['L3','Disk-backed state','history · artifacts · memories · skills · prompts · subagent specs','Refinement','var(--c5)',
      '<b>L3, disk-backed state.</b> The append-only event history, compaction records, kernel snapshots, the session tree, message queues and the versioned Continual Harness entries. It changes by <b>refinement</b>: an edit applied at a turn boundary, with its trigger and intended effect recorded, so it can be rolled back. Selected entries are assembled into the next supplemental prompt; everything else enters the context only when the REPL retrieves it.'],
    ['L2','REPL and subagents','code · tools · retained values · recursive session state','Agentic garbage collection','var(--c3)',
      '<b>L2, the persistent IPython REPL and live subagents.</b> Python values and tool outputs stay here, outside the context, until something serialises them into L1. The model itself creates, keeps, summarises or deletes REPL values and subagent sessions as the task changes: the paper calls this <b>agentic garbage collection</b>. Each subagent started with <code>rlm()</code> has its own context, kernel, history and workspace.'],
    ['L1','Active context','token-visible working state for one model invocation','Compaction','var(--c1)',
      '<b>L1, the active context.</b> The only state a model call can see. It changes by <b>compaction</b>, which replaces a conversational prefix with a summary and keeps the original events in L3 for retrieval from the REPL. Below the line, nothing reaches the model unless an operation serialises it here.'],
    ['L0','Model weights','learned computation and prior knowledge','Fine-tuning','var(--mute)',
      '<b>L0, the model weights.</b> Fixed during a run; only fine-tuning changes them. Prime Agent never touches L0: its self-improvement lives in L3. The paper\'s closing argument is that the next step is to change L0 too, by training models to use L1 to L3 well.']];
  function draw(w){const wide=w>=560,lw=wide?46:34,rw=wide?Math.min(190,w*.27):0,bh=wide?54:62,gap=6;let s='',y=4;
    L.forEach((l,i)=>{if(i===2){s+=ln2(0,y+1,w,y+1,'var(--bad)',{sw:1.5})+rc(w/2-104,y-8,208,18,'var(--bg)',{r:3})+tx(w/2,y+5,'model-context boundary',{fs:11,a:'middle',c:'var(--bad)',w:600});y+=14}
      const on=i===sel;s+='<g data-i="'+i+'" style="cursor:pointer" role="button" tabindex="0" aria-label="'+l[0]+' '+l[1]+'">';
      s+=rc(0,y,w,bh,on?'var(--acc2)':'var(--soft)',{s:on?l[4]:'var(--line)',sw:on?2:1,r:6});
      s+=tx(lw/2,y+bh/2+5,l[0],{fs:14,a:'middle',w:700,c:l[4]});
      s+=tx(lw+6,y+20,l[1],{fs:13,w:600});
      const sub=l[2],maxc=Math.floor((w-lw-rw-14)/6.2);
      if(sub.length<=maxc)s+=tx(lw+6,y+38,sub,{fs:11,c:'var(--mute)'});else{let a=sub.slice(0,maxc),cut=a.lastIndexOf(' · ');if(cut<10)cut=a.lastIndexOf(' ');s+=tx(lw+6,y+36,sub.slice(0,cut),{fs:11,c:'var(--mute)'})+tx(lw+6,y+50,sub.slice(cut).replace(/^ · /,'').slice(0,maxc),{fs:11,c:'var(--mute)'})}
      if(wide)s+=tx(w-rw+8,y+bh/2+4,l[3],{fs:12,w:600});else s+=tx(w-6,y+20,l[3],{fs:11,a:'end',c:l[4],w:600});
      s+='</g>';y+=bh+gap});
    host.innerHTML=svgW(w,y,s,'The four levels of Prime Agent state');
    host.querySelectorAll('g[data-i]').forEach(g=>{const go=()=>{sel=+g.dataset.i;draw(w)};g.addEventListener('click',go);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
    $('hierCap').innerHTML=L[sel][5]}
  fit(host,draw)})();

// orchestration: a blocking subagent tool call against rlm() handles and messages (illustrative, from §2.2-2.4 and Appendix B)
(function(){if(!$('orc'))return;
  // each step: c caption, L1 items, L2 values, L3 items, kids {name:state}, Q queue, t clock, b blocked units so far, rs re-sent contexts
  const old=[
    {t:'The task arrives',c:'The parent gets the job: audit an implementation and run its tests. In this harness a subagent is a tool, <code>task(prompt)</code>, that returns the child\'s final answer.',L1:['task'],L2:[],L3:[],K:{},Q:[],tm:0,b:0,rs:0},
    {t:'task(reviewer) blocks the parent',c:'The parent calls the reviewer tool and waits. The child runs for 3 time units; the parent can do nothing else in that turn.',L1:['task','call: reviewer'],L2:[],L3:[],K:{reviewer:'run'},Q:[],tm:3,b:3,rs:0},
    {t:'The whole answer is pasted into context',c:'The reviewer\'s full report comes back as the tool result and lands in the parent\'s context. The child is gone: it was a stateless completion.',L1:['task','call: reviewer','reviewer report (full)'],L2:[],L3:[],K:{reviewer:'gone'},Q:[],tm:4,b:3,rs:0},
    {t:'task(tester) blocks again',c:'Only now can the tester start, so the two independent jobs run one after the other.',L1:['task','call: reviewer','reviewer report (full)','call: tester'],L2:[],L3:[],K:{reviewer:'gone',tester:'run'},Q:[],tm:7,b:6,rs:0},
    {t:'The test log is pasted in too',c:'The tester\'s output, logs included, is the second large block in the context.',L1:['task','call: reviewer','reviewer report (full)','call: tester','test log (full)'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone'},Q:[],tm:8,b:6,rs:0},
    {t:'Compaction drops the details',c:'The context is full, so the harness compacts it into a summary. In a harness with no L3 store the original events are simply gone (an assumption of this illustration).',L1:['summary'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone'},Q:[],tm:9,b:6,rs:0},
    {t:'The follow-up needs a new reviewer',c:'To ask about error-handling edge cases, the parent must start a fresh reviewer and re-send the context, and block for it again.',L1:['summary','call: reviewer 2','reviewer 2 report'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone','reviewer 2':'gone'},Q:[],tm:13,b:9,rs:1},
    {t:'Done',c:'Same work, done in sequence: the parent spent most of the run waiting, every result passed through its context in full, and nothing survived compaction except the summary.',L1:['summary','call: reviewer 2','reviewer 2 report','answer'],L2:[],L3:[],K:{reviewer:'gone',tester:'gone','reviewer 2':'gone'},Q:[],tm:14,b:9,rs:1}];
  const neu=[
    {t:'The task arrives',c:'The same job in Prime Agent. The parent\'s only tool is its persistent IPython REPL; <code>rlm</code> is a function inside it.',L1:['task'],L2:[],L3:[],K:{},Q:[],tm:0,b:0,rs:0},
    {t:'rlm("Audit ...") returns a handle at once',c:'Calling <code>rlm</code> creates and schedules a subagent session with its own context, kernel and history, and returns a stable handle before the child finishes (§2.3). The handle is a Python value in L2.',L1:['task','code: rlm reviewer'],L2:['handle: reviewer'],L3:[],K:{reviewer:'run'},Q:[],tm:1,b:0,rs:0},
    {t:'rlm("Run the tests ...") starts the second child',c:'The second subagent starts while the first is still running: the two independent jobs run in parallel.',L1:['task','code: rlm reviewer','code: rlm tester'],L2:['handle: reviewer','handle: tester'],L3:[],K:{reviewer:'run',tester:'run'},Q:[],tm:2,b:0,rs:0},
    {t:'The parent keeps computing',c:'"The parent continues local computation while subagents run" (§2.3): here it reads the code itself, holding its notes as REPL values rather than in the context.',L1:['task','code: rlm reviewer','code: rlm tester','own notes'],L2:['handle: reviewer','handle: tester','notes (values)'],L3:[],K:{reviewer:'run',tester:'run'},Q:[],tm:3,b:0,rs:0},
    {t:'Compaction keeps the originals in L3',c:'Compaction replaces the prefix with a summary and keeps the original events in L3 for retrieval from the REPL (§2.2). The handles survive in L2. The reviewer finishes; its reply waits in the daemon queue, and the child goes idle, not away.',L1:['summary'],L2:['handle: reviewer','handle: tester','notes (values)'],L3:['events 1 to 4'],K:{reviewer:'idle',tester:'run'},Q:['reviewer: issues'],tm:4,b:0,rs:0},
    {t:'Messages arrive through the queue',c:'Results come back as agent-to-agent messages through daemon-mediated queues (§2.4). The parent parses them in Python and lets only what it needs into the context.',L1:['summary','reviewer: 3 issues'],L2:['handle: reviewer','handle: tester','notes (values)','review (value)'],L3:['events 1 to 4'],K:{reviewer:'idle',tester:'idle'},Q:['tester: failures'],tm:5,b:0,rs:0},
    {t:'A follow-up to the same reviewer',c:'<code>agent_message.send(..., receiver_name=review.name)</code> wakes the retained reviewer, which still has its own context: no re-sending, no new child (Appendix B).',L1:['summary','reviewer: 3 issues','sent follow-up'],L2:['handle: reviewer','handle: tester','notes (values)','review (value)','tests (value)'],L3:['events 1 to 4'],K:{reviewer:'run',tester:'idle'},Q:[],tm:6,b:0,rs:0},
    {t:'Done',c:'The reply is merged with the test results in Python and only the conclusion is serialised into the context. The parent never blocked, the children ran in parallel, and the full history is still on disk.',L1:['summary','reviewer: 3 issues','sent follow-up','answer'],L2:['handle: reviewer','handle: tester','notes (values)','review (value)','tests (value)','report (value)'],L3:['events 1 to 4','events 5 to 8'],K:{reviewer:'idle',tester:'idle'},Q:[],tm:8,b:0,rs:0}];
  const MODES={old,neu,new:neu};
  const KC={run:'var(--c3)',idle:'var(--soft)',gone:'none'};
  function chips(items,prev,x0,y0,w,col,e,big){let x=x0,y=y0,s='';const h=20;
    items.forEach(t=>{const fw=Math.min(w-8,t.length*6.4+14),fresh=prev.indexOf(t)<0;
      if(x+fw>x0+w){x=x0;y+=h+4}
      const op=fresh?e:1,isBig=big&&/\(full\)|report$/.test(t);
      s+=G(op,rc(x,y,fw,h,isBig?'var(--hl)':'var(--bg)',{s:col,sw:isBig?2:1,r:4})+tx(x+fw/2,y+14,t,{fs:11,a:'middle'}));x+=fw+4});
    return {s,y:y+h}}
  function draw(m,k,e,w){const st=MODES[m],S=st[k],P=k>0?st[k-1]:{L1:[],L2:[],L3:[],K:{},Q:[]};
    const lw=w<480?30:40,iw=w-lw-6;let s='',y=2;
    const band=(lab,col,items,prev,big)=>{const c=chips(items,prev,lw+6,y+6,iw-6,col,e,big);const h=Math.max(32,c.y-y+6);
      let o=rc(0,y,w,h,'var(--soft)',{s:'var(--line)',r:6})+tx(lw/2,y+h/2+5,lab,{fs:13,a:'middle',w:700,c:col});o+=c.s;y+=h+5;return o};
    s+=band('L1','var(--c1)',S.L1,P.L1,m==='old');
    // L2: values plus child sessions and the queue
    const kids=Object.keys(S.K);let l2=chips(S.L2,P.L2,lw+6,y+6,iw-6,'var(--c3)',e,false);
    let ky=(S.L2.length?l2.y+6:y+6),kx=lw+6,ks='';
    kids.forEach(n=>{const stt=S.K[n],fw=Math.min(iw-8,n.length*6.6+60);if(kx+fw>lw+6+iw-6){kx=lw+6;ky+=26}
      const fresh=!(n in P.K)||P.K[n]!==stt;ks+=G(fresh?Math.max(.35,e):1,rc(kx,ky,fw,22,KC[stt],{s:stt==='gone'?'var(--mute)':'var(--c3)',sw:1.4,r:5,da:stt==='gone'?'4 3':null})+tx(kx+8,ky+15,'child: '+n,{fs:11,c:stt==='gone'?'var(--mute)':null})+tx(kx+fw-6,ky+15,stt==='gone'?'gone':stt==='run'?'running':'idle',{fs:11,a:'end',c:'var(--mute)'}));kx+=fw+6});
    let qy=(kids.length?ky+28:ky),qs='';
    if(S.Q.length||m!=='old'){qs+=tx(lw+6,qy+14,'daemon queue:',{fs:11,c:'var(--mute)'});let qx=lw+6+92;
      if(!S.Q.length)qs+=tx(qx,qy+14,'(empty)',{fs:11,c:'var(--mute)'});
      S.Q.forEach(q=>{const fw=q.length*6.4+14;if(qx+fw>lw+iw){qx=lw+6;qy+=24}qs+=G(P.Q.indexOf(q)<0?e:1,rc(qx,qy,fw,20,'var(--acc2)',{r:4})+tx(qx+fw/2,qy+14,q,{fs:11,a:'middle'}));qx+=fw+4});qy+=22}
    const h2=Math.max(36,qy-y+6);
    s+=rc(0,y,w,h2,'var(--soft)',{s:'var(--line)',r:6})+tx(lw/2,y+h2/2+5,'L2',{fs:13,a:'middle',w:700,c:'var(--c3)'})+l2.s+ks+qs;y+=h2+5;
    s+=band('L3','var(--c5)',S.L3.length?S.L3:[m==='old'?'(no retained history)':'(empty)'],P.L3.length?P.L3:[m==='old'?'(no retained history)':'(empty)'],false);
    // parent timeline: one cell per time unit, blocked units marked
    const U=14,cw=Math.max(8,(iw-6)/U);s+=tx(0,y+14,'time',{fs:11,c:'var(--mute)'});
    for(let i=0;i<U;i++){const done=i<S.tm,blk=m==='old'&&(i<3||(i>=4&&i<7)||(i>=9&&i<12));s+=rc(lw+6+i*cw,y+3,cw-2,14,done?(blk?'var(--bad)':'var(--c1)'):'var(--line)',{r:2,op:done?.85:.5})}
    y+=22;s+=rc(lw+6,y,10,10,'var(--c1)',{r:2})+tx(lw+20,y+9,'parent working',{fs:11})+rc(lw+128,y,10,10,'var(--bad)',{r:2})+tx(lw+142,y+9,'parent blocked',{fs:11});y+=16;
    return svgW(w,y,s,'Orchestration animation')}
  function counters(m,k){const S=MODES[m][k];const alive=Object.values(S.K).filter(v=>v!=='gone').length;
    return stat('Time',S.tm+' units','illustrative')+stat('Parent blocked',S.b+' units','waiting on a child')+stat('Items in L1',String(S.L1.length),'context blocks')+stat('Children alive',String(alive),'addressable later')+stat('Contexts re-sent',String(S.rs),'for the follow-up')}
  makeAnim({id:'orc',modes:{old,new:neu},mode:'new',draw,counters,dur:2600});
})();
