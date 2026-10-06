// ---- fobs: shared values, waterfall drawer, Reading section 1 (three views of one run, the three-process trace) ----
window.FOBSU=(function(){
  const D=window.FOBS,esc=RD.esc;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const cc=D.cc.spans,llm=cc.filter(s=>s[3]==='claude_code.llm_request');
  const a0=llm[0][7];
  const inst=k=>D.inst.find(v=>v.key===k);
  const lb=D.red.login_by_key.before;
  const V={
    'run.n':D.run.length,
    'cc.nspans':cc.length,'cc.ccspans':D.cc.cc_spans,'cc.contentEvents':D.cc.content_events,
    'cc.contentGrowth':fmt(100*(D.cc.bytes_content-D.cc.bytes_default)/D.cc.bytes_default),
    'cc.c1in':fmt(a0.input_tokens),'cc.c1cr':fmt(a0.cache_read_tokens),'cc.c1cw':fmt(a0.cache_creation_tokens),
    'cc.c1sum':fmt(a0.input_tokens+a0.cache_read_tokens+a0.cache_creation_tokens),
    'sem.nspans':D.sem.spans.length,'sem.nops':D.sem.ops.length,'sem.nmetrics':D.sem.metrics.length,
    'inst.flatTraces':inst('otel_v2').n_traces,
    'inst.kbManual':fmt(inst('manual').summary.bytes/1000,1),'inst.kbContent':fmt(inst('manual_content').summary.bytes/1000,1),
    'inst.kbOI':fmt(inst('openinference').summary.bytes/1000,1),
    'stack.gb':fmt(D.stack.images_gb_total,1),'stack.ram':fmt(D.stack.ram_gib,1),
    'cost.result':'$'+D.cost.result,'cost.turns':D.cost.turns,'cost.exports':D.cost.metric.exports,
    'cost.in':fmt(D.cost.usage.input_tokens),'cost.cw':fmt(D.cost.usage.cache_creation_input_tokens),
    'cost.cr':fmt(D.cost.usage.cache_read_input_tokens),'cost.out':fmt(D.cost.usage.output_tokens),
    'cost.recomp':((D.cost.usage.input_tokens*1+D.cost.usage.cache_creation_input_tokens*2+D.cost.usage.cache_read_input_tokens*0.1+D.cost.usage.output_tokens*5)/1e6).toFixed(7),
    'red.loginBefore':Object.entries(lb).filter(([k])=>k!=='attr:user.email').reduce((a,[,v])=>a+v,0),
    'red.allowRemovedCC':D.red.allowlist.claude_code.summary_attrs['redaction.redacted.count'],
    'scores.n':D.scores.read_back
  };
  function fill(root){(root||document).querySelectorAll('.fobs-v').forEach(el=>{const k=el.dataset.v;if(k in V)el.textContent=V[k];else el.textContent='?'})}
  fill();
  // Waterfall: rows [{name, depth, t0, t1, col, err, cls, tip}], T = total seconds
  function wf(el,rows,T,o){o=o||{};
    el.innerHTML='<div class="fobs-wf">'+rows.map(r=>{
      const l=Math.max(0,r.t0/T*100),w=Math.max(0.4,(r.t1-r.t0)/T*100);
      return '<div class="r'+(r.err?' err':'')+(r.cls?' '+r.cls:'')+'" title="'+esc(r.tip||r.name)+'"><div class="nm" style="padding-left:'+(r.depth*9)+'px">'+esc(r.name)+'</div>'+
        '<div class="tk"><span class="b" style="left:'+l.toFixed(2)+'%;width:'+Math.min(w,100-l).toFixed(2)+'%;background:'+r.col+'"></span></div></div>'}).join('')+
      (o.axis?'<div class="r"><div></div><div class="small mute" style="display:flex;justify-content:space-between"><span>0 s</span><span>'+fmt(T,0)+' s</span></div></div>':'')+'</div>';
  }
  return {D,V,fill,fmt,wf,esc};
})();

// Section 1: one run, three views (logs, auto spans, agent trace)
(function(){
  const {D,fmt,wf,esc}=FOBSU;
  // operations in order with real model durations; tools drawn tiny
  const ops=[];let t=0;
  D.run.forEach(c=>{ops.push({k:'chat',c,t0:t,t1:t+c.secs});t+=c.secs;
    c.tools.forEach(tl=>{ops.push({k:'tool',name:tl[0],args:tl[1],t0:t,t1:t+0.3});t+=0.3})});
  const T=t;let mode='tree';
  const view=document.getElementById('fobs-a1-view'),cap=document.getElementById('fobs-a1-cap');
  const stamp=s=>{const x=Math.round(s);return '12:00:'+String(x%60).padStart(2,'0').replace(/^/,'')+(x>=60?' (+'+Math.floor(x/60)+'m)':'')};
  function draw(i){
    const shown=ops.slice(0,i+1),cur=ops[i];
    if(mode==='logs'){
      view.innerHTML='<div class="fobs-log">'+shown.map((o,j)=>'<div'+(j===i?' class="new"':'')+'>'+esc(o.k==='chat'?
        'INFO model call '+o.c.call+': '+o.c.in+' in / '+o.c.out+' out ('+(o.c.tools.length?'asked for '+o.c.tools.map(x=>x[0]).join(', '):'final answer')+')':
        'INFO tool '+o.name+' '+o.args)+'</div>').join('')+'</div>';
    }else if(mode==='flat'){
      const rows=[];let n=0;
      shown.forEach((o,j)=>{if(o.k==='chat'){n++;rows.push({name:'trace '+n+': chat',depth:0,t0:o.t0,t1:o.t1,col:'var(--c1)',cls:j===i?'new':''})}});
      wf(view,rows,T,{axis:true});
      view.insertAdjacentHTML('beforeend','<div class="small mute">'+rows.length+' separate trace'+(rows.length>1?'s':'')+', '+shown.filter(o=>o.k==='tool').length+' tool call'+(shown.filter(o=>o.k==='tool').length===1?'':'s')+' not recorded</div>');
    }else{
      const end=shown[shown.length-1].t1;
      const rows=[{name:'invoke_agent textstats-fixer',depth:0,t0:0,t1:end,col:'var(--c5)'}];
      shown.forEach((o,j)=>rows.push({name:o.k==='chat'?'chat (call '+o.c.call+')':'execute_tool '+o.name,depth:1,t0:o.t0,t1:o.t1,col:o.k==='chat'?'var(--c1)':'var(--c3)',cls:j===i?'new':''}));
      wf(view,rows,T,{axis:true});
    }
    const what=cur.k==='chat'?'<b>Model call '+cur.c.call+'</b>: '+fmt(cur.c.in)+' prompt tokens ('+fmt(cur.c.cached)+' served from the server\'s prompt cache), '+cur.c.out+' generated, '+cur.c.secs+' s. '+(cur.c.tools.length?'It asks for '+cur.c.tools.map(x=>'<code>'+esc(x[0])+'</code>').join(', ')+'.':'No tool call: this is the final answer.'):
      '<b>Tool call <code>'+esc(cur.name)+'</code></b> '+esc(cur.args)+'.';
    const lens={logs:'In the log you see the lines, but not which call asked for which tool, or which run they belong to.',
      flat:'Auto spans record this call\'s model, tokens and time, each in a separate trace; tool calls are invisible.',
      tree:'In the agent trace every call hangs under the run, in order, with its parent: cost and time add up per run.'}[mode];
    cap.innerHTML='<p class="t">Step '+(i+1)+' of '+ops.length+'</p><p>'+what+'</p><p class="small mute">'+lens+'</p>';
  }
  const A=RD.anim({card:'fobs-a1',ctl:'fobs-a1-ctl',n:ops.length,draw,ms:1100,label:'Operation'});
  RD.seg(document.getElementById('fobs-a1-mode'),m=>{mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
})();

// Section 1: the three-process trace (app > Claude Code > test runner)
(function(){
  const {D,wf}=FOBSU;
  const S=D.cc.spans,by={};S.forEach(s=>by[s[0]]=s);
  const hide=new Set(['claude_code.tool.blocked_on_user','claude_code.tool.execution']);
  const col=s=>s[2]==='fixer-app'?'var(--c5)':s[2]==='test-runner'?'var(--c4)':s[3]==='claude_code.llm_request'?'var(--c1)':s[3]==='claude_code.tool'?'var(--c3)':'var(--c6)';
  // depth with hidden spans collapsed: a test-runner span hangs under its tool span
  function vparent(s){let p=by[s[1]];while(p&&hide.has(p[3]))p=by[p[1]];return p}
  function depth(s){let d=0,p=vparent(s);while(p){d++;p=vparent(p)}return d}
  const T=Math.max(...S.map(s=>s[5]));
  const rows=S.filter(s=>!hide.has(s[3])).map(s=>{const a=s[7];let nm=s[3].replace('claude_code.','');
    if(a.tool_name)nm+=' '+a.tool_name;
    // an ERROR span sits under a tool span we collapsed: mark its tool
    const kids=S.filter(k=>k[1]===s[0]&&hide.has(k[3]));const err=s[6]===2||kids.some(k=>k[6]===2);
    return {name:nm,depth:depth(s),t0:s[4],t1:s[5],col:col(s),err,tip:s[2]+': '+s[3]}});
  function draw(){wf(document.getElementById('fobs-x3-wf'),rows,T,{axis:true})}
  document.getElementById('fobs-x3-leg').innerHTML=[['var(--c5)','fixer-app (our application)'],['var(--c6)','Claude Code interaction'],['var(--c1)','Claude Code model request'],['var(--c3)','Claude Code tool'],['var(--c4)','test-runner (python3 under Bash)']].map(x=>'<span><i style="background:'+x[0]+'"></i>'+x[1]+'</span>').join('')+'<span><i style="outline:2px solid var(--bad);background:none"></i>a span with status ERROR</span>';
  document.getElementById('fobs-x3-note').textContent='Each tool span\'s two children (time blocked on a permission decision, and execution) are folded into it; '+S.filter(s=>hide.has(s[3])).length+' spans folded, '+S.length+' in the trace. Recorded 6 October 2026, Claude Haiku 4.5 through Claude Code 2.1.291.';
  draw();RD.onRender(draw);
})();
