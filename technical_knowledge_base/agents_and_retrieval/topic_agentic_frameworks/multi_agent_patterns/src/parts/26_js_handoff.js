// Section 6: what each agent was sent, request by request, for a handoff and for agents-as-tools (local model, proxy log).
(function(){
  const H=FM.handoffs;if(!H||!H.length)return;
  const esc=RD.esc;
  let design='handoff';
  const runOf=d=>H.find(r=>r.design===d&&String(r.rep)==='1')||H.find(r=>r.design===d);
  const who=a=>{const m=/You (?:are the |run a |are part of )?(.*)/.exec(a||'');let s=(m?m[1]:a)||'agent';
    if(/billing/i.test(s))return 'billing';if(/technical/i.test(s))return 'tech';if(/triage/i.test(s))return 'triage';if(/support desk/i.test(s))return 'manager';return s.slice(0,30)};
  const roleName={system:'system',user:'user',assistant:'assistant',tool:'tool result'};
  function draw(i){
    const r=runOf(design),q=r.reqs[i],prev=i>0?r.reqs[i-1]:null;
    const view=document.getElementById('fm-hoview');
    const ag=who(q.agent);
    const prevSame=prev&&who(prev.agent)===ag?prev.msgs.length:0;
    const msgs=q.msgs.map((m,k)=>{const cls={system:'sys',user:'usr',assistant:'ast',tool:'tool'}[m[0]]||'usr';
      let body=m[0]==='system'?esc(m[1].split('\n\n').slice(-1)[0].slice(0,140)):esc((m[1]||'').slice(0,150));
      if(m[2]&&m[2].length)body+=(body?' ':'')+'<i>calls '+m[2].map(esc).join(', ')+'</i>';
      return '<div class="'+cls+(k>=prevSame&&i>0?' new':'')+'"><b>'+roleName[m[0]]+':</b> '+(body||'<i>(empty)</i>')+'</div>'}).join('');
    const reply=q.calls.length?q.calls.map(c=>'<div class="ast"><b>tool call:</b> '+esc(c[0])+' '+esc(c[1]||'')+'</div>').join(''):'<div class="ast"><b>text:</b> '+esc((q.reply||'').slice(0,300))+'</div>';
    view.innerHTML='<div class="fm-box"><h4>Request '+(i+1)+' of '+r.reqs.length+': sent to <b>'+esc(ag)+'</b></h4><div class="small mute">Tools offered: '+(q.tools.length?q.tools.map(esc).join(', '):'none')+'; '+(q.usage.prompt_tokens||0)+' prompt tokens</div><div class="fm-msgs">'+msgs+'</div></div>'+
      '<div class="fm-box"><h4>What it answered</h4><div class="fm-msgs">'+reply+'</div></div>';
    let cap='';
    const allCalls=r.reqs.slice(0,i+1).flatMap(x=>x.calls.map(c=>c[0]));
    if(i===0&&design!=='as_tool')cap='The triage agent sees the customer message and two transfer tools. It calls both: the message has two problems.';
    else if(i===0)cap='The manager sees the customer message and two tools that wrap the specialists. It calls both.';
    else if(design!=='as_tool'&&ag==='billing'&&i===1)cap='Billing now owns the conversation. Its context is the whole history so far, including the second transfer, answered by the SDK with "Multiple handoffs detected, ignoring this one." It has no way to reach tech in the plain design.';
    else if(design==='as_tool'&&(ag==='billing'||ag==='tech')&&q.msgs.length<=3)cap=ag+' runs as a tool: it receives only the input the manager wrote for it, not the customer\'s words or the other problem.';
    else if(!q.calls.length)cap=ag+' writes text and stops. '+(r.reqs.length-1===i?'Final reply to the customer: '+esc((r.final||'').slice(0,160))+((r.final||'').length>160?'...':''):'');
    else cap=ag+' calls '+q.calls.map(c=>c[0]).join(', ')+'.';
    document.getElementById('fm-hocap').innerHTML='<div class="t">'+(design==='as_tool'?'Agents as tools':design==='handoff'?'Handoff':'Handoff, mesh')+', step '+(i+1)+'</div><p>'+cap+'</p>';
    const tok=r.reqs.slice(0,i+1).reduce((a,x)=>a+(x.usage.prompt_tokens||0),0);
    const tools=allCalls.filter(n=>!/^transfer_to|^ask_/.test(n));
    document.getElementById('fm-hocnt').innerHTML=RD.stat('Requests so far',(i+1)+' / '+r.reqs.length,'')+RD.stat('Prompt tokens so far',tok.toLocaleString('en-US'),'')+RD.stat('Real tools called',tools.length?tools.join(', '):'none','');
  }
  const A=RD.anim({card:'fm-hocard',ctl:'fm-hoctl',n:runOf(design).reqs.length,draw,ms:2600,label:'Request'});
  RD.seg(document.getElementById('fm-hoseg'),m=>{design=m;A.reset(runOf(m).reqs.length)});
  // summary table
  const ds=[['handoff','Handoff'],['handoff_mesh','Handoff, mesh'],['as_tool','Agents as tools']];
  document.querySelector('#fm-hotab tbody').innerHTML=ds.map(([d,n])=>{const rs=H.filter(r=>r.design===d);
    const c=f=>rs.filter(f).length+' of '+rs.length;
    const rq=[...new Set(rs.map(r=>r.reqs.length))].join(', ');const tk=[...new Set(rs.map(r=>r.reqs.reduce((a,x)=>a+(x.usage.prompt_tokens||0),0)))].join(', ');
    return '<tr><td>'+n+'</td><td class="num">'+rs.length+'</td><td class="num">'+rq+'</td><td class="num">'+tk+'</td><td>'+c(r=>r.tool_calls.some(t=>t[0]==='lookup_invoice'))+'</td><td>'+c(r=>r.tool_calls.some(t=>t[0]==='check_status'))+'</td><td>'+c(r=>r.score.refund_done)+'</td><td>'+c(r=>r.score.reply_claims_refund)+'</td></tr>'}).join('');
})();
