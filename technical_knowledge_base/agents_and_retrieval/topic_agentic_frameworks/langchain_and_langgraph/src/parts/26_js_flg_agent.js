// ---- Reading section 9: create_agent graphs and the two recorded local-model runs ----
(function(){
  const D=window.FLG,esc=RD.esc,$=id=>document.getElementById(id);
  const LB={'ModelCallLimitMiddleware.before_model':'CallLimit.before_model','ModelCallLimitMiddleware.after_model':'CallLimit.after_model','HumanInTheLoopMiddleware.after_model':'HITL.after_model'};
  let gm='agent_plain';
  const drawAg=()=>{const el=$('flg-ag-svg');const sh=gm==='agent_plain'?D.e7.shape_plain:D.e7.shape_mw;
    el.innerHTML=FLGG.svg(gm,sh.edges,Math.min(RD.width(el),460),{labels:LB});
    $('flg-ag-note').textContent=(sh.nodes.length-2)+' nodes: '+sh.nodes.filter(n=>!n.startsWith('__')).join(', ')+'. Dashed: conditional edges ('+sh.edges.filter(e=>e.cond).length+' of '+sh.edges.length+'). CallLimit = ModelCallLimitMiddleware, HITL = HumanInTheLoopMiddleware.'};
  RD.seg($('flg-ag-mode'),m=>{gm=m;drawAg()});RD.onRender(drawAg);RD.onResize(drawAg);drawAg();

  let tm='e7';
  const cut=(s,n)=>{s=String(s==null?'':s);return s.length>n?s.slice(0,n)+' ...':s};
  const drawTr=()=>{const r=D[tm];
    const writes=r.messages.filter(m=>m.type==='ai'&&Array.isArray(m.tool_calls)).flatMap(m=>m.tool_calls).filter(t=>t.name==='write_file');
    const decs=r.phases.flatMap(p=>p.decisions||[]);
    $('flg-tr-out').innerHTML=RD.stat('Model requests',r.requests.length,r.requests.reduce((a,q)=>a+(q.secs||0),0).toFixed(0)+' s incl. lock waits')+
      RD.stat('Approval interrupts',r.phases.filter(p=>p.hitl).length,decs.length?decs.map(d=>d.type).join(', '):(r.policy==='approve_all'?'approve (every time)':'none'))+
      RD.stat('write_file calls',writes.length,writes.map(w=>w.args.path).join(', '))+
      RD.stat('Tests after the run',r.final_tests_pass?'pass':'fail',r.policy==='check_path'?'1 of the 2 failing tests fixed':'no change to the real module');
    $('flg-tr-log').textContent=r.messages.map(m=>{let s='['+m.type+'] '+cut(m.content,m.type==='tool'?160:220).replace(/\n+/g,' ');
      if(Array.isArray(m.tool_calls)&&m.tool_calls.length)s+=(m.content?'\n      ':'')+m.tool_calls.map(t=>'calls '+t.name+'('+cut(JSON.stringify(t.args),110)+')').join('\n      ');return s}).join('\n');
    $('flg-tr-body').textContent=JSON.stringify(r.first_body,null,1);
    const h=r.phases.find(p=>p.hitl);$('flg-tr-hitl').textContent=h?JSON.stringify(h.hitl,null,1).replace(/("content": ")([^"]{0,160})[^"]*"/,'$1$2 ..."'):'(none)'};
  RD.seg($('flg-tr-mode'),m=>{tm=m;drawTr()});drawTr();

  const fn=D.e5.functional;$('flg-fn-c').textContent=Object.entries(fn.starts_after_retry).map(([k,v])=>k.replace('task.','')+' '+v).join(', ');
})();
