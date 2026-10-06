// ---- Reading tab, part 2: one call through the permission layer, the hook events table, hooks before and after ----
(function(){
  const {D,esc,cut}=HCCR;const G=window.HCCG;
  const selA=document.getElementById('hcc-gate-act'),selC=document.getElementById('hcc-gate-cfg');if(!selA||!G)return;
  const MX=D.matrix;
  const CF=[['perm_manual','Manual (default)'],['perm_acceptEdits','acceptEdits'],['perm_plan','plan'],['perm_dontAsk','dontAsk'],['perm_rules_flag','rules passed with --settings'],['perm_rules','the same rules in the project file (untrusted)'],['hooks_on','acceptEdits plus the guard hook']];
  selA.innerHTML=MX.actions.map((a,i)=>'<option value="'+i+'"'+(i===9?' selected':'')+'>'+(i+1)+'. '+esc(a)+'</option>').join('');
  selC.innerHTML=CF.map(c=>'<option value="'+c[0]+'">'+esc(c[1])+'</option>').join('');
  const steps=document.getElementById('hcc-gate-steps'),cap=document.getElementById('hcc-gate-cap'),note=document.getElementById('hcc-gate-note');
  let dec=null;
  function recorded(ai,cid){
    if(cid==='hooks_on'){ // the hooks run attempted only rm among the battery's actions
      if(ai===9||ai===8){const r=HCCR.run('hooks_on');const x=r.ev.find(e=>e.k==='res'&&/guard hook/.test(e.s));return x?{o:'denied',m:x.s}:null}
      return null}
    const col=MX.cols.find(c=>c.id===cid);return col?col.cells[ai]:null;
  }
  function compute(){
    const ai=+selA.value,cid=selC.value;const a=Object.assign({},G.ACTS[ai]);
    const col=MX.cols.find(c=>c.id===cid);
    if(col&&ai===6&&col.extra.some(x=>/tests\/test_core/.test(x)))a.readFirst=true; // that run read the test file first
    dec=G.decide(a,G.CFGS[cid]);dec.rec=recorded(ai,cid);
    steps.innerHTML=G.STAGES.map((s,i)=>'<div class="hcc-st" data-i="'+i+'"><b>'+(i+1)+'. '+esc(s.n)+'</b><span class="v"></span><span class="why">'+esc(s.d)+'</span></div>').join('');
    anim.reset(dec.path.length);
  }
  const LBL={allow:'<span class="pill ok">runs</span>',deny:'<span class="pill bad">refused</span>',tool:'<span class="pill mid">tool refuses</span>',classifier:'<span class="pill mid">classifier decides</span>'};
  function draw(k){
    if(!dec)return;const vis=dec.path.slice(0,k+1);
    steps.querySelectorAll('.hcc-st').forEach(el=>{const i=+el.dataset.i,key=G.STAGES[i].k,pos=vis.indexOf(key);
      el.className='hcc-st'+(pos<0?'':(pos===vis.length-1?' on':' past'));
      const v=el.querySelector('.v');v.innerHTML=pos<0?'':(pos===vis.length-1&&k===dec.path.length-1&&key!=='run'?LBL[dec.o]:(key==='run'?LBL.allow:'<span class="small mute">no match, go on</span>'))});
    const last=k===dec.path.length-1;
    cap.innerHTML='<div class="t">'+(last?'Decided at stage '+(dec.stage+1)+': '+esc(G.STAGES[dec.stage].n):'Stage '+(G.STAGES.findIndex(s=>s.k===vis[vis.length-1])+1)+': '+esc(G.STAGES.find(s=>s.k===vis[vis.length-1]).n))+'</div><p>'+(last?esc(dec.why):'Checked; nothing here decides this call.')+'</p>';
    const rc=dec.rec;
    note.innerHTML=rc?'Recorded in this configuration: <b>'+({ran:'ran',fail:'ran (the command itself failed)',denied:'refused',tool:'refused by the tool',missing:'not attempted'}[rc.o]||rc.o)+'</b>. Message: <code>'+esc(cut(rc.m,200))+'</code>':'Not recorded in this configuration: the model\'s answer only.';
  }
  const anim=RD.anim({card:'hcc-gate-card',ctl:'hcc-gate-ctl',n:3,draw,ms:1300,label:'Gate stage'});
  selA.addEventListener('change',compute);selC.addEventListener('change',compute);compute();
})();

// -- the 33 hook events --
(function(){
  const {S,esc}=HCCR;const tb=document.querySelector('#hcc-hook-table tbody'),ch=document.getElementById('hcc-hook-chips');if(!tb)return;
  ch.innerHTML='<button data-m="all" class="on">All 33</button><button data-m="can">Can stop something (17)</button><button data-m="tool">Tool calls</button><button data-m="sess">Session and turn</button><button data-m="ctx">Context and config</button>';
  const grp={PreToolUse:'tool',PermissionRequest:'tool',PermissionDenied:'tool',PostToolUse:'tool',PostToolUseFailure:'tool',PostToolBatch:'tool',SubagentStart:'tool',SubagentStop:'tool',TaskCreated:'tool',TaskCompleted:'tool',
    SessionStart:'sess',Setup:'sess',UserPromptSubmit:'sess',UserPromptExpansion:'sess',Stop:'sess',StopFailure:'sess',SessionEnd:'sess',Notification:'sess',MessageDisplay:'sess',TeammateIdle:'sess'};
  function draw(f){tb.innerHTML=S.hooks.filter(h=>f==='all'||(f==='can'?h.can:(grp[h.e]||'ctx')===f)).map(h=>'<tr><td><code>'+esc(h.e)+'</code></td><td>'+esc(h.w)+'</td><td class="small">'+esc(h.m)+'</td><td class="small">'+(h.can?'<b style="color:var(--bad)">yes</b>: ':'no: ')+esc(h.b.replace(/^(Yes|No)\.?\s*/,''))+'</td></tr>').join('')}
  RD.seg(ch,draw);draw('all');
})();

// -- hooks before and after: two recorded runs on one clock --
(function(){
  const {run,esc,cut}=HCCR;const A=run('hooks_off'),B=run('hooks_on');if(!A||!B||!document.getElementById('hcc-hk-card'))return;
  function items(r){
    const out=[];const res={};r.ev.forEach(e=>{if(e.k==='res')res[e.id]=e});
    r.ev.forEach(e=>{
      if(e.k==='tool'){const x=res[e.id]||{};out.push({t:x.t||e.t,k:x.e?(/hook error/.test(x.s||'')?'hook':'deny'):'tool',h:'<code>'+esc(cut(e.n+': '+e.s.split('\n')[0].replace('/work/',''),90))+'</code>',r:x.s?cut(x.s,140):''})}
      else if(e.k==='hook'&&(e.out||'').trim()&&e.ev!=='PostToolUse'&&e.ev!=='PreToolUse')out.push({t:e.t,k:'hook',h:'<b>'+esc(e.name||e.ev)+' hook</b>',r:cut(e.out,160)});
      else if(e.k==='result')out.push({t:e.t,k:'pass',h:'<b>Result record</b>',r:cut(e.s,160)});
    });return out;
  }
  const ia=items(A),ib=items(B),T=Math.max(...ia.concat(ib).map(x=>x.t))+0.5,N=26;
  const MOM=[[0,'Both runs start. With hooks, a SessionStart hook has already put the test command into the context.'],[12,'With hooks, Haiku has just run python3 tests/test_core.py on its first try: two tests fail. Without hooks it is still reading files.'],[17.5,'With hooks, the guard blocks rm: its stderr becomes the reason the model reads, whatever --allowedTools said.'],[19,'Without hooks, rm ran (it was allowed), then Haiku typed python, was refused, and never ran the tests.'],[25,'Without hooks the run is over: one bug fixed, one test still failing, reported as done. With hooks, Haiku tries to finish and the Stop hook answers decision: block.'],[34,'The Stop hook\'s reason sent Haiku back: it fixes the tie-breaking bug and reruns the tests: 0 failed.'],[40,'Haiku retries rm with dangerouslyDisableSandbox: true, "since you explicitly requested it". The hook ignores the flag and blocks it again.'],[43.5,'Both runs end. Only the run with hooks passes its tests, and its file is still there because a hook, not a prompt, said so.']];
  const box=id=>document.getElementById(id);
  function lane(el,list,t){el.innerHTML=list.map(x=>'<div class="hcc-ev k-'+x.k+(x.t<=t?' on':'')+'">'+x.h+(x.r?'<span class="r">'+esc(x.r)+'</span>':'')+'</div>').join('');
    const on=el.querySelectorAll('.hcc-ev.on');if(on.length)on[on.length-1].classList.add('cur')}
  function draw(i){
    const t=T*i/(N-1);lane(box('hcc-hk-a'),ia,t);lane(box('hcc-hk-b'),ib,t);
    let m=MOM[0];MOM.forEach(x=>{if(t>=x[0])m=x});
    box('hcc-hk-cap').innerHTML='<div class="t">'+t.toFixed(1)+' s into both runs</div><p>'+esc(m[1])+'</p>';
    const cnt=(r,f)=>r.ev.filter(f).length;
    const tc=(r)=>r.ev.filter(e=>e.k==='tool'&&e.t<=t).length;
    const blocks=B.ev.filter(e=>e.k==='hook'&&e.t<=t&&/Blocked|block/.test(e.out||'')).length;
    box('hcc-hk-stats').innerHTML=RD.stat('Tool calls so far',tc(A)+' vs '+tc(B),'no hooks vs hooks')+RD.stat('Stopped by a hook',String(blocks),'guard (exit 2) and Stop (block)')+RD.stat('Tests at the end',(A.pass?'pass':'1 failing')+' vs '+(B.pass?'pass':'failing'),'checked after each run');
  }
  RD.anim({card:'hcc-hk-card',ctl:'hcc-hk-ctl',n:N,draw,ms:900,label:'Seconds into the runs'});
})();
