// ---- The harness, two ways: one illustrative long task run as model alone, inside StateM, inside AVO ----
(function(){
  const card=$('v-harness');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const T=(k,node)=>({k,node});
  // Turn kinds. Counted: waste = lost + repeat; checks = chk + chkf (run by the host, not the model); caught = chkf
  const KIND={plan:['var(--c1)','plan written'],work:['var(--c3)','work (edit, run, read)'],lost:['var(--bad)','redone after losing track'],repeat:['var(--c7)','a known dead end, repeated'],
    hook:['var(--c6)','state or memory loaded from outside the model'],chk:['var(--c5)','check run by the host, passed'],chkf:['var(--c5)','check run by the host, failed'],
    repair:['var(--c4)','repair'],sup:['var(--c2)','supervisor redirects'],stop:['var(--bad)','declares "done" with no check'],done:['var(--ink)','handoff or result recorded']};
  const M={
   alone:{name:'Model alone',nodes:null,steps:[
    {t:'Turns 1 to 2: the plan goes into the context',c:'The agent reads the task and writes a plan. With no control layer, that plan is text near the top of its context window, and that is the only place it exists.',turns:[T('plan'),T('plan')]},
    {t:'Turns 3 to 6: work',c:'The agent edits files and runs commands. Every turn appends tool output to the context.',turns:[T('work'),T('work'),T('work'),T('work')]},
    {t:'Turns 7 to 8: the plan recedes',c:'The plan is now a small, old part of a long context. The StateM paper names this pressure: "the control signal carried by a plan can weaken as the trace grows".',turns:[T('work'),T('work')]},
    {t:'Turns 9 to 11: the context is compacted',c:'To stay inside the window, the history is summarised. Which files had already been changed was in the dropped detail, so the agent spends three turns rediscovering its own progress. Failure mode 1: losing track of mutable state.',turns:[T('lost'),T('lost'),T('lost')],compact:true},
    {t:'Turns 12 to 14: a dead end, again',c:'The agent tries an approach that failed in an earlier run. Nothing carried that lesson across runs, so it is repeated. Failure mode 2: failing to reactivate lessons from earlier executions (the paper\'s "procedural-memory gap").',turns:[T('repeat'),T('repeat'),T('repeat')]},
    {t:'Turn 15: "done"',c:'The agent declares the task complete without running the project\'s tests. Failure modes 3 and 4: skipping a known procedure and stopping prematurely. Its own declaration is the only check, and "an agent\'s declaration of completion does not constitute independent verification".',turns:[T('stop')]},
    {t:'Result: the hidden test fails',c:'15 turns, 6 of them redone or repeated, and nothing other than the model ever checked the work. Same model in the other two runs; switch to StateM or AVO.',turns:[]}]},
   statem:{name:'StateM runbook',nodes:['Plan','Execute','Verify','Handoff','Repair'],steps:[
    {t:'Enter Plan: the in_hook loads the phase',c:'The runtime, not the model, holds the current state. Entering Plan injects that phase\'s instructions and the durable progress record. The agent plans, then asks for <code>goto Execute</code>: the runtime checks the edge exists, runs the before_transfer checks, persists the plan (out_hook), logs the transition, then runs Execute\'s in_hook.',turns:[T('hook','Plan'),T('plan','Plan'),T('plan','Plan'),T('chk','Plan')],store:['record: state Plan, entry 1','receipt: plan.md saved','logged: Plan to Execute']},
    {t:'Inside Execute: free to work',c:'Within a state the agent keeps its full autonomy: it reasons, calls tools, edits files and iterates. StateM controls the phases, not the micro-actions.',turns:[T('hook','Execute'),T('work','Execute'),T('work','Execute'),T('work','Execute'),T('work','Execute')],store:['record: state Execute, entry 2']},
    {t:'The phase stays recent',c:'The context grows as before, but the current phase and its obligations were injected when the state was entered, so they are recent rather than buried at the top.',turns:[T('work','Execute'),T('work','Execute')],store:['receipt: files changed']},
    {t:'Compaction: ask the runtime where we are',c:'After the same compaction, the agent queries StateM for its current state, prior transitions and recorded evidence, and resumes in one turn. Recovery restores the recorded control state; it cannot restore hidden model context or work that was never persisted.',turns:[T('hook','Execute')],compact:true,store:['query: Execute, 3 files done']},
    {t:'A lesson from an earlier run activates',c:'A finding from an earlier run\'s postmortem was promoted into the runbook as a versioned practice, so it fires at this phase as a precondition, and the dead end is skipped. (The specific practice here is illustrative.)',turns:[T('hook','Execute'),T('work','Execute')],store:['practice v3: skip approach B']},
    {t:'goto Verify: a test fails, the run goes to Repair',c:'Verify runs the tests as a command check, evaluated by the host and reproducible. They fail, so the move to Handoff is blocked; the runbook\'s edge routes the run to Repair, and Verify passes on the second try. The failure stays visible in the history instead of propagating.',turns:[T('chkf','Verify'),T('repair','Repair'),T('repair','Repair'),T('chk','Verify')],store:['check: tests failed (logged)','transition Verify to Repair','check: tests passed']},
    {t:'goto Handoff: completion recorded at a terminal state',c:'The before_transfer checks pass and completion is recorded only now, at the terminal state. 20 turns: more than the model alone used, but none redone, 4 host checks, 1 problem caught before handoff.',turns:[T('chk','Handoff'),T('done','Handoff')],store:['terminal: Handoff, complete']}]},
   avo:{name:'AVO: memory + supervisor',nodes:['Inspect','Plan','Implement','Evaluate','Supervisor'],steps:[
    {t:'Plan, with a memory outside the context',c:'The main agent inspects the task and plans. Beside it sits a persistent memory, outside the model\'s context, and a supervisor that watches the whole trajectory.',turns:[T('plan','Plan'),T('hook','Inspect')],store:['memory: (empty)']},
    {t:'Implement, then evaluate by running it',c:'Like other coding agents it edits code, runs commands and validates its work through execution: the feedback comes from tests, compilers and profilers, not from the model\'s opinion.',turns:[T('work','Implement'),T('work','Implement'),T('work','Implement'),T('chk','Evaluate')],store:['memory: try 1 + test output']},
    {t:'Every result is kept',c:'Persistent memory carries prior implementations, evaluation results, compiler and profiler outputs and accumulated reasoning forward (Nvidia\'s list).',turns:[T('work','Implement'),T('work','Implement'),T('chk','Evaluate')],store:['memory: try 2 + profiler']},
    {t:'Compaction: resume from memory',c:'After the same compaction the agent reads its memory and resumes "from the current state rather than repeatedly reconstructing the search".',turns:[T('hook','Inspect')],compact:true,store:['read: tries 1 to 2, results']},
    {t:'Going round in circles: the supervisor steps in',c:'The agent starts re-exploring a path it already tried. The supervisor "monitors the broader trajectory for stagnation or repeated unproductive cycles and can redirect the main agent toward alternative strategies". Nvidia\'s El Hallak: it nudges the agent when it "starts exploring a path that it might lead to a dead end, or re-explore a path that it had previously trod".',turns:[T('repeat','Implement'),T('repeat','Implement'),T('sup','Supervisor'),T('work','Implement'),T('work','Implement')],store:['supervisor: loop, redirect']},
    {t:'Evaluation catches a regression',c:'An evaluation fails and the agent revises; the result goes to memory like every other.',turns:[T('chkf','Evaluate'),T('work','Implement')],store:['memory: try 3 failed tests']},
    {t:'Result: passes',c:'19 turns, 2 of them a repeated path that the supervisor cut short, 4 evaluations run by executing the work. Nvidia stresses that its own experiment "does not isolate" the memory\'s contribution: this is the mechanism, not a measured effect.',turns:[T('chk','Evaluate'),T('done','Evaluate')],store:['result recorded']}]}
  };
  const st={m:'alone',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const DURT=650; // ms per turn at 1x
  const cl=v=>v<0?0:v>1?1:v;
  const nT=s=>Math.max(2,s.turns.length);
  function shown(){ // turns visible so far, and store lines so far
    const S=M[st.m].steps,out=[],store=[];let compactAt=-1;
    for(let i=0;i<=st.k;i++){const s=S[i],n=i<st.k?s.turns.length:Math.floor(s.turns.length*st.t+1e-9);
      if(s.compact&&(i<st.k||st.t>0))compactAt=out.length;
      for(let j=0;j<n;j++)out.push(s.turns[j]);
      if(s.store&&(i<st.k||st.t>=.5))store.push(...s.store)}
    return {out,store,compactAt}}
  function draw(){
    const mode=M[st.m],S=mode.steps,narrow=card.clientWidth<560,{out,store,compactAt}=shown();
    const MAXT=22,tx=narrow?6:24,W=narrow?Math.max(300,Math.round($('hsSvg').clientWidth||340)):780,pitch=narrow?Math.floor((W-2*tx)/MAXT):30,sq=pitch-3;
    let s='',y=16;
    s+='<text x="'+tx+'" y="'+y+'" font-size="11" fill="var(--mute)">'+(narrow?'Turns (1 square = 1 turn)':'Agent turns, one square per turn, the same scale in all three runs')+'</text>';
    y+=8;
    for(let i=0;i<MAXT;i++){const x=tx+i*pitch;s+='<rect x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(sq-1)+'" height="'+(sq-1)+'" rx="3" fill="none" stroke="var(--line)"/>'}
    out.forEach((u,i)=>{const x=tx+i*pitch,c=KIND[u.k][0];
      s+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" rx="3" fill="'+c+'"'+(u.k==='chkf'||u.k==='stop'?' stroke="var(--bad)" stroke-width="2.5"':'')+'><title>Turn '+(i+1)+': '+KIND[u.k][1]+'</title></rect>';
      if(u.k==='chkf'||u.k==='stop')s+='<text x="'+(x+sq/2)+'" y="'+(y+sq/2+4)+'" font-size="'+(narrow?10:13)+'" text-anchor="middle" fill="var(--bg)" font-weight="700">'+(u.k==='stop'?'?':'x')+'</text>';
      if(u.k==='chk')s+='<text x="'+(x+sq/2)+'" y="'+(y+sq/2+4)+'" font-size="'+(narrow?10:13)+'" text-anchor="middle" fill="var(--bg)" font-weight="700">✓</text>'});
    if(compactAt>=0){const x=tx+compactAt*pitch-2;s+='<path d="M'+x+' '+(y-4)+'v'+(sq+8)+'" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 2"/><text x="'+(x+3)+'" y="'+(y+sq+14)+'" font-size="11" fill="var(--mute)">compaction</text>'}
    y+=sq+26;
    // three panels
    const pw=narrow?W-2*tx:(W-2*tx-24)/3,ph=narrow?142:150;
    const px=i=>narrow?tx:tx+i*(pw+12),py=i=>narrow?y+i*(ph+14):y;
    // panel 1: context window
    {const x0=px(0),y0=py(0);s+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" rx="8" class="box"/><text x="'+(x0+10)+'" y="'+(y0+18)+'" font-size="12" font-weight="600">Inside the model: its context</text>';
      // segments: before compaction each turn is one unit; at compaction everything earlier becomes a 3-unit summary
      let seg=[];out.forEach((u,i)=>{if(i===compactAt){const hadPlan=seg.some(q=>q==='plan');seg=['sum','sum','sum'];if(st.m!=='alone')seg.push('inj');if(st.m==='alone'&&hadPlan)seg[0]='sumplan'}
        seg.push(u.k==='plan'?'plan':u.k==='hook'?'inj':'other')});
      const U=Math.max(16,seg.length),uw=(pw-20)/U;
      seg.forEach((q,i)=>{const c=q==='plan'?'var(--c1)':q==='inj'?'var(--c6)':q==='sum'?'var(--dim)':q==='sumplan'?'var(--dim)':'var(--acc2)';
        s+='<rect x="'+(x0+10+i*uw)+'" y="'+(y0+30)+'" width="'+Math.max(1,uw-1)+'" height="22" fill="'+c+'"'+(q==='sumplan'?' stroke="var(--c1)" stroke-dasharray="2 2"':'')+'/>'});
      const planIdx=seg.lastIndexOf('plan'),injIdx=seg.lastIndexOf('inj'),n=seg.length;
      let sig,why;
      if(!n){sig='';why=''}
      else if(st.m==='alone'){if(compactAt>=0&&out.length>compactAt){sig='plan: only a summary';why='plan survived only in the summary'}else if(planIdx<0){sig='';why=''}else{const age=n-1-planIdx;sig=age>5?'plan: old and far back':'plan: recent';why=age+' turns since the plan was written'}}
      else{const last=Math.max(planIdx,injIdx),age=n-1-last;sig=age<=4?'phase and obligations: recent':'phase info: '+age+' turns back';why=st.m==='statem'?'re-injected on each state entry':'memory read back after compaction'}
      s+='<text x="'+(x0+10)+'" y="'+(y0+70)+'" font-size="11.5">'+sig+'</text><text x="'+(x0+10)+'" y="'+(y0+86)+'" font-size="11" fill="var(--mute)">'+why+'</text>';
      s+='<rect x="'+(x0+10)+'" y="'+(y0+ph-30)+'" width="10" height="10" fill="var(--c1)"/><text x="'+(x0+24)+'" y="'+(y0+ph-21)+'" font-size="11" fill="var(--mute)">plan</text><rect x="'+(x0+58)+'" y="'+(y0+ph-30)+'" width="10" height="10" fill="var(--c6)"/><text x="'+(x0+72)+'" y="'+(y0+ph-21)+'" font-size="11" fill="var(--mute)">loaded from outside</text><rect x="'+(x0+10)+'" y="'+(y0+ph-16)+'" width="10" height="10" fill="var(--dim)"/><text x="'+(x0+24)+'" y="'+(y0+ph-7)+'" font-size="11" fill="var(--mute)">summary after compaction</text>'}
    // panel 2: control layer
    {const x0=px(1),y0=py(1);s+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" rx="8" class="box"/><text x="'+(x0+10)+'" y="'+(y0+18)+'" font-size="12" font-weight="600">Control layer</text>';
      const cur=out.length?out[out.length-1].node:null;
      if(!mode.nodes){s+='<text x="'+(x0+10)+'" y="'+(y0+46)+'" font-size="11.5">None: the plan is only text</text><text x="'+(x0+10)+'" y="'+(y0+62)+'" font-size="11.5">in the context, and the model</text><text x="'+(x0+10)+'" y="'+(y0+78)+'" font-size="11.5">alone decides when it is done.</text>'}
      else if(st.m==='statem'){const nw=(pw-20-18)/4,ny=y0+36,nh=26;
        ['Plan','Execute','Verify','Handoff'].forEach((nm,i)=>{const nx=x0+10+i*(nw+6);s+='<rect x="'+nx+'" y="'+ny+'" width="'+nw+'" height="'+nh+'" rx="5" class="'+(cur===nm?'boxa':'boxo')+'"/><text x="'+(nx+nw/2)+'" y="'+(ny+17)+'" font-size="11" text-anchor="middle">'+nm+'</text>';if(i<3)s+=ar(nx+nw,ny+nh/2,nx+nw+6,ny+nh/2)});
        const rx=x0+10+2*(nw+6)-nw*.5,ry=ny+48;s+='<rect x="'+rx+'" y="'+ry+'" width="'+nw+'" height="'+nh+'" rx="5" class="'+(cur==='Repair'?'boxa':'boxo')+'"/><text x="'+(rx+nw/2)+'" y="'+(ry+17)+'" font-size="11" text-anchor="middle">Repair</text>';
        s+=ar(x0+10+2*(nw+6)+nw*.3,ny+nh,rx+nw*.8,ry,true)+ar(rx,ry+nh/2,x0+10+(nw+6)+nw*.5,ny+nh,true);
        const nTr=out.filter((u,i)=>i>0&&u.node!==out[i-1].node).length;
        s+='<text x="'+(x0+10)+'" y="'+(y0+ph-22)+'" font-size="11" fill="var(--mute)">each goto: edge? checks? persist,</text><text x="'+(x0+10)+'" y="'+(y0+ph-8)+'" font-size="11" fill="var(--mute)">commit and log ('+nTr+' so far)</text>'}
      else{const nm=['Inspect','Plan','Implement','Evaluate'],cx=x0+pw/2,cy=y0+ph/2+14,rr=Math.min(pw/2-44,38);
        nm.forEach((q,i)=>{const a=-Math.PI/2+i*Math.PI/2,nx=cx+Math.cos(a)*rr*1.55,ny=cy+Math.sin(a)*rr*.95,bw=72,bh=21;s+='<rect x="'+(nx-bw/2)+'" y="'+(ny-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="5" class="'+(cur===q?'boxa':'boxo')+'"/><text x="'+nx+'" y="'+(ny+4)+'" font-size="11" text-anchor="middle">'+q+'</text>'});
        const supOn=cur==='Supervisor';s+='<rect x="'+(x0+pw-128)+'" y="'+(y0+6)+'" width="120" height="21" rx="5" class="'+(supOn?'boxa':'boxo')+'"/><text x="'+(x0+pw-68)+'" y="'+(y0+21)+'" font-size="11" text-anchor="middle">'+(supOn?'Supervisor: redirect':'Supervisor')+'</text>';
        s+=''}}
    // panel 3: outside the model
    {const x0=px(2),y0=py(2);s+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" rx="8" class="box"/><text x="'+(x0+10)+'" y="'+(y0+18)+'" font-size="12" font-weight="600">'+(st.m==='statem'?'Outside the model: durable record':st.m==='avo'?'Outside the model: persistent memory':'Outside the model')+'</text>';
      if(st.m==='alone')s+='<text x="'+(x0+10)+'" y="'+(y0+46)+'" font-size="11.5">Nothing. Progress, lessons and</text><text x="'+(x0+10)+'" y="'+(y0+62)+'" font-size="11.5">"done" all live in the context.</text>';
      else{const L=store.slice(-6);L.forEach((l,i)=>{s+='<text x="'+(x0+10)+'" y="'+(y0+38+i*17)+'" font-size="11" font-family="ui-monospace,Menlo,monospace" fill="'+(i===L.length-1?'var(--ink)':'var(--mute)')+'">'+l.replace(/&/g,'&amp;')+'</text>'})}}
    const H=narrow?py(2)+ph+6:y+ph+6;
    $('hsSvg').innerHTML=svgEl(W,H,s,'Agent run, '+mode.name);
    if(st.lk!==st.k||st.lm!==st.m){$('hsStep').textContent=mode.name+', step '+(st.k+1)+' of '+S.length+': '+S[st.k].t;$('hsCap').innerHTML=S[st.k].c;st.lk=st.k;st.lm=st.m}
    const waste=out.filter(u=>u.k==='lost'||u.k==='repeat').length,checks=out.filter(u=>u.k==='chk'||u.k==='chkf').length,caught=out.filter(u=>u.k==='chkf').length;
    const end=st.k===S.length-1&&st.t>=1;const outcome=end?(st.m==='alone'?'fails the hidden test':'passes'):(out.some(u=>u.k==='stop')?'declared done':'running');
    $('hsCnt').innerHTML=stat('Turns used',fmt(out.length),'illustrative')+stat('Redone or repeated',fmt(waste),'turns')+stat('Checks run outside the model',fmt(checks),st.m==='avo'?'evaluations by execution':st.m==='statem'?'host-evaluated':'none in this run')+stat('Problems caught before the end',fmt(caught),'')+stat('Outcome',outcome,'');
    const sc=$('hsScrub');sc.max=S.length*100;sc.value=Math.round((st.k+st.t)*100);
    const pb=$('hsPlay');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    const S=M[st.m].steps;st.t+=dt*st.spd/(DURT*nT(S[st.k]));if(st.t>=1){if(st.k<S.length-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('hsPlay').addEventListener('click',()=>{const S=M[st.m].steps;if(st.play){pause()}else{if(st.k===S.length-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<S.length-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('hsFwd').addEventListener('click',()=>{pause();st.k=Math.min(M[st.m].steps.length-1,st.k+(st.t>=1?1:0));st.t=1;draw()});
  $('hsBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('hsScrub').addEventListener('input',e=>{pause();const v=+e.target.value,S=M[st.m].steps;st.k=Math.min(S.length-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=S.length*100)st.t=1;draw()});
  $('hsSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('hsM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  draw();

  // ---- What the real runs measured: pairs per benchmark, never across benchmarks ----
  const P=[
    {h:'ARC-AGI-3, public set (25 games)',u:'%',max:100,rows:[{m:'Claude Opus 5',o:30,ol:'30% (ARC Prize, High effort)',n:100,nl:'100.00 RHAE in AVO'}],
     note:'Different setups (reasoning setting, harness, observation format); Nvidia says the pair is not a direct measurement of AVO\'s contribution. AVO solved all 183 levels in 6,624 actions against VISTA\'s 7,542 with the same model (12% fewer, derived).'},
    {h:'Terminal-Bench 2.1 (89 tasks, mean of 5 trials)',u:'%',max:100,lo:60,rows:[
      {m:'GPT-5.5 xhigh',o:83.1,n:92.1},{m:'GPT-5.6 Luna',o:76.7,n:85.4,nl:'85.4 (frozen runbook)'},{m:'GPT-5.6 Sol xhigh',o:84.9,n:95.28,nl:'95.3 raw',wh:[93.26,94.38]},{m:'DeepSeek-V4 Flash',o:82.7,n:88.1}],
     note:'Grey is each model\'s reference score as the paper reports it. Sol\'s whisker is the adjudicated range: 94.38% with four flagged trials scored zero, 93.26% with all nine. The runbook was developed on GPT-5.5 and transferred unchanged to GPT-5.6.'},
    {h:'API cost of runs near 88% on Terminal-Bench 2.1 ($, log scale)',u:'$',log:[5,2000],rows:[
      {m:'GPT-5.6 Sol max (reference)',o:574.68,ol:'$574.68 for 88.8%'},{m:'StateM + DeepSeek-V4 Flash',n:15,nl:'about $15 for 88.1%'},{m:'StateM + GPT-5.6 Sol xhigh',n:1062.95,nl:'$1,062.95 for 95.3% raw'}],
     note:'The issue paired $15 with the 95.3% Sol run; in the paper $15 is the DeepSeek run, 38.9 times cheaper than the Sol max reference at a similar score. Total DeepSeek spend including adaptation: $52.22 (11.0 times cheaper).'}];
  const pairsEl=$('hsPairs');
  function drawPairs(){pairsEl.innerHTML=P.map(p=>{
    const pos=v=>p.log?100*(Math.log10(v)-Math.log10(p.log[0]))/(Math.log10(p.log[1])-Math.log10(p.log[0])):100*(v-(p.lo||0))/(p.max-(p.lo||0));
    return '<div><h4>'+p.h+'</h4>'+p.rows.map(r=>'<div class="pr"><div>'+r.m+'</div><div class="tr">'+
      (r.o!=null?'<div class="b o'+(pos(r.o)>50?' in':'')+'" style="width:'+pos(r.o).toFixed(1)+'%"><span>'+(r.ol||r.o+'%')+'</span></div>':'')+
      (r.n!=null?'<div class="b n'+(pos(r.n)>50?' in':'')+'" style="width:'+pos(r.n).toFixed(1)+'%;'+(r.o==null?'top:0':'')+'"><span>'+(r.nl||r.n+'%')+'</span></div>':'')+
      (r.wh?'<div class="wh" style="left:'+pos(r.wh[0]).toFixed(1)+'%;width:'+(pos(r.wh[1])-pos(r.wh[0])).toFixed(1)+'%"></div>':'')+'</div></div>').join('')+
      (p.lo?'<div class="small mute">axis starts at '+p.lo+'%</div>':'')+'<p class="small mute" style="margin:4px 0 0">'+p.note+'</p></div>'}).join('')}
  drawPairs();
})();
