// ---- Reading tab, part 2: the hook events table, hooks before and after (one call through the permission layer is the scene 41_js_sc_gate.js) ----
// -- the 33 hook events --
(function(){
  const {S,esc}=HCCR;const tb=document.querySelector('#hcc-hook-table tbody'),ch=document.getElementById('hcc-hook-chips');if(!tb)return;
  ch.innerHTML='<button data-m="all" class="on">All 33</button><button data-m="can">Can stop something (17)</button><button data-m="tool">Tool calls</button><button data-m="sess">Session and turn</button><button data-m="ctx">Context and config</button>';
  const grp={PreToolUse:'tool',PermissionRequest:'tool',PermissionDenied:'tool',PostToolUse:'tool',PostToolUseFailure:'tool',PostToolBatch:'tool',SubagentStart:'tool',SubagentStop:'tool',TaskCreated:'tool',TaskCompleted:'tool',
    SessionStart:'sess',Setup:'sess',UserPromptSubmit:'sess',UserPromptExpansion:'sess',Stop:'sess',StopFailure:'sess',SessionEnd:'sess',Notification:'sess',MessageDisplay:'sess',TeammateIdle:'sess'};
  function draw(f){tb.innerHTML=S.hooks.filter(h=>f==='all'||(f==='can'?h.can:(grp[h.e]||'ctx')===f)).map(h=>'<tr><td><code>'+esc(h.e)+'</code></td><td>'+esc(h.w)+'</td><td class="small">'+esc(h.m)+'</td><td class="small">'+(h.can?'<b style="color:var(--bad)">yes</b>: ':'no: ')+esc(h.b.replace(/^(Yes|No)\.?\s*/,''))+'</td></tr>').join('')}
  RD.seg(ch,draw);draw('all');
})();

// -- hooks before and after: two recorded runs on one clock, in eight stretches (the step list #sx-hk explains each) --
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
  const ia=items(A),ib=items(B),T=Math.max(...ia.concat(ib).map(x=>x.t))+0.5;
  // the end of each stretch, in seconds since both runs started (one per step-list item)
  const C=[1,13,18,21,27,37,41,T];
  const box=id=>document.getElementById(id);
  function lane(el,list,t0,t){el.innerHTML=list.map(x=>'<div class="hcc-ev k-'+x.k+(x.t<=t?' on':'')+(x.t<=t&&x.t>t0?' cur':'')+'">'+x.h+(x.r?'<span class="r">'+esc(x.r)+'</span>':'')+'</div>').join('')}
  function draw(i){
    const t=C[i],t0=i?C[i-1]:-1;lane(box('hcc-hk-a'),ia,t0,t);lane(box('hcc-hk-b'),ib,t0,t);
    const tc=(r)=>r.ev.filter(e=>e.k==='tool'&&e.t<=t).length;
    const blocks=B.ev.filter(e=>e.k==='hook'&&e.t<=t&&/Blocked|block/.test(e.out||'')).length;
    box('hcc-hk-stats').innerHTML=RD.stat('Seconds into both runs',(i===C.length-1?Math.max(...ia.concat(ib).map(x=>x.t)):t).toFixed(1)+' s','end of this stretch')+RD.stat('Tool calls so far',tc(A)+' vs '+tc(B),'no hooks vs hooks')+RD.stat('Stopped by a hook',String(blocks),'guard (exit 2) and Stop (block)');
  }
  RD.anim({card:'hcc-hk-card',ctl:'hcc-hk-ctl',n:C.length,draw,ms:5600,label:'Stretch of the runs',list:'sx-hk'});
})();
