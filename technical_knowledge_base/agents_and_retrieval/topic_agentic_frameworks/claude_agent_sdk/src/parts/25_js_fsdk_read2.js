// ---- Reading tab, section 9: cost bars and the connector counts ----
(function(){
  const F=window.FSDK,R=F.runs,esc=RD.esc,X=window.FSDK_X;
  function bars(el,rows,max,fmtv){
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+(r.sub?'<span class="mute small" style="display:block;font-size:11px;line-height:1.2">'+esc(r.sub)+'</span>':'')+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*r.v/max).toFixed(2)+'%;background:'+(r.col||'var(--acc)')+'"></span></span><span class="val">'+fmtv(r.v)+'</span></div>').join('');
  }
  const NAMES={s1_wire:['s1 our tools, hook, callback','fixed'],s2_deny:['s2 callback denies tests/','fixed, test not added'],s3_bare:['s3 defaults, nobody answers','not fixed: 6 refusals'],
    s4_session:['s4 two turns, resume, fork','fixed'],s5_subagent:['s5 Sonnet + Haiku subagent','fixed'],s6_structured:['s6 structured output','fixed'],s8_ts:['s8 TypeScript version of s1','fixed'],s9_rewind:['s9 built-in tools, then rewind','fixed, then rewound']};
  const rows=Object.keys(NAMES).map(L=>{const rs=R[L].results;const c=rs[rs.length-1].cost;return {name:NAMES[L][0],sub:NAMES[L][1]+' ('+R[L].n.model.replace('claude-','').replace('-20251001','')+')',v:c,col:L==='s3_bare'?'var(--bad)':'var(--acc)'};});
  bars(document.getElementById('fsdk-cost'),rows,Math.max(...rows.map(r=>r.v)),v=>X.usd(v));
  // connector counts
  const C=F.conn,cr=[];
  const lab=r=>(r.strict_mcp_config?'strict':'not strict')+(r.own_sdk_server?', + our server':'');
  C.batch1.forEach(r=>cr.push({name:'batch 1, '+lab(r),sub:r.mcp_servers+' servers, '+r.tools+' tools, '+X.usd(r.cost_usd),v:r.input_total,col:r.strict_mcp_config?'var(--good)':'var(--bad)'}));
  C.batch2.forEach(r=>cr.push({name:'batch 2, '+lab(r),sub:r.mcp_servers+' servers, '+r.tools+' tools, '+X.usd(r.cost_usd),v:r.input_total,col:r.strict_mcp_config?'var(--good)':'var(--bad)'}));
  bars(document.getElementById('fsdk-conn'),cr,Math.max(...cr.map(r=>r.v)),v=>X.fmt(v));

})();
