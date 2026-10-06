// ---- Recordings tab: pick a run, read its transcript, usage and cost check ----
(function(){
  const F=window.FSDK,R=F.runs,esc=RD.esc,X=window.FSDK_X;
  const INFO={
    s1_wire:['s1','Our four tools (in-process), a PreToolUse hook allowing the read-only ones, PostToolUse logging, can_use_tool allowing the rest. Wire logged.'],
    s2_deny:['s2','Same as s1, but the prompt also asks for a new test in tests/ and the callback makes tests/ read-only.'],
    s3_bare:['s3','The defaults written out: empty system prompt (one line about em-dashes), Claude Code\'s default tools, mode "default", no callback; only isolation added. Wire logged.'],
    s4_session:['s4','ClaudeSDKClient over two turns, a context-usage query, then resume and fork in new processes.'],
    s5_subagent:['s5','Sonnet 5.5 with Read, Edit, Bash and Agent, acceptEdits, one allow rule; a Haiku "test-runner" subagent defined in code.'],
    s6_structured:['s6','s1\'s setup plus output_format (a JSON schema of the changes made).'],
    s8_ts:['s8','s1 rewritten in TypeScript: zod schemas, the same hook and callback, persistSession false.'],
    s9_rewind:['s9','Built-in Read, Edit, Bash with acceptEdits and file checkpointing; after the run, rewind_files() to the prompt.']};
  document.getElementById('fr-emd').textContent=F.emdash;
  const pick=document.getElementById('fr-pick');
  pick.innerHTML=Object.keys(INFO).map((L,i)=>'<button data-l="'+L+'"'+(i===0?' class="on"':'')+'>'+INFO[L][0]+' '+L.split('_').slice(1).join(' ')+'</button>').join('');
  let cur='s1_wire';
  const short=v=>{const s=typeof v==='string'?v:JSON.stringify(v);return s.length>500?s.slice(0,500)+' [...]':s};
  const PRICE={'claude-haiku-4-5-20251001':[1,1.25,2,0.1,5],'claude-sonnet-5-5':[2,2.5,4,0.2,10]};
  function draw(){
    const r=R[cur],n=r.n,last=r.results[r.results.length-1];
    document.getElementById('fr-head').innerHTML='<p><b>'+INFO[cur][0]+'.</b> '+esc(INFO[cur][1])+'</p>';
    document.getElementById('fr-stats').innerHTML=RD.stat('Model',esc(n.model.replace('-20251001','')),'Claude Code '+n.cli)+RD.stat('Model calls (main)',n.n_calls,'first call '+X.fmt(n.first_call_in)+' tokens')+
      RD.stat('Result',esc(last.subtype),last.num_turns+' turns, '+last.denials+' refused')+RD.stat('Cost (estimate)',X.usd(last.cost),'wall '+n.wall_s+' s')+
      RD.stat('Tests afterwards',esc(n.tests_after||''),n.tests_unchanged?'test file unchanged':'test file changed');
    // usage table
    let h='<table><thead><tr><th>Result</th><th>Model</th><th class="num">input</th><th class="num">cache write</th><th class="num">cache read</th><th class="num">output</th><th class="num">cost (SDK)</th></tr></thead><tbody>';
    r.results.forEach(res=>{Object.entries(res.model_usage).forEach(([m,v])=>{h+='<tr><td>'+esc(res.phase||'final')+'</td><td>'+esc(m.replace('claude-','').replace('-20251001',''))+'</td><td class="num">'+X.fmt(v.inputTokens)+'</td><td class="num">'+X.fmt(v.cacheCreationInputTokens)+'</td><td class="num">'+X.fmt(v.cacheReadInputTokens)+'</td><td class="num">'+X.fmt(v.outputTokens)+'</td><td class="num">'+X.usd(v.costUSD,5)+'</td></tr>';});});
    h+='</tbody></table>';
    const chk=r.results.map(res=>{const ok1=Math.abs(res.residual_1h)<1e-6,ok5=Math.abs(res.residual_5m)<1e-6;
      return (res.phase||'final')+': reported '+X.usd(res.cost,5)+'; list-price sum '+(ok1?'matches with other models\' cache writes at the 1-hour price':ok5?'matches only with the subagent\'s cache writes at the 5-minute price':'differs by '+X.usd(res.residual_5m,5))+'. usage (main thread, this turn): '+X.fmt(res.usage_in)+' input tokens; model_usage: '+X.fmt(res.model_usage_in)+'.';});
    document.getElementById('fr-mu').innerHTML=h+'<p class="small mute">'+chk.map(esc).join('<br>')+'</p>';
    // transcript
    const showCb=document.getElementById('fr-cbs').checked;
    const ev=r.ev.filter(e=>showCb||e[0]!=='cb');
    document.getElementById('fr-ev').innerHTML=ev.map(e=>{
      const k=e[0],t=e[1]==null?'':Number(e[1]).toFixed(1)+' s',sub=e[2]?' sub':'',ph=(typeof e[e.length-1]==='string'&&/^(turn1|turn2|resume|fork)$/.test(e[e.length-1]))?' ['+e[e.length-1]+']':'';
      const head=(lab)=>'<div class="h">'+t+ph+' '+lab+(e[2]?' (subagent)':'')+'</div>';
      if(k==='think')return '<div class="fr-e'+sub+'">'+head('thinking (content not kept)')+'</div>';
      if(k==='text')return '<div class="fr-e k-text'+sub+'">'+head('assistant text')+'<pre>'+esc(e[3])+'</pre></div>';
      if(k==='call')return '<div class="fr-e k-call'+sub+'">'+head('tool call '+esc(e[5]||''))+'<b>'+esc(e[3])+'</b><pre>'+esc(short(e[4]))+'</pre></div>';
      if(k==='res')return '<div class="fr-e '+(e[5]?'k-err':'k-res')+sub+'">'+head('tool result '+esc(e[4]||'')+(e[5]?' (error)':''))+'<pre>'+esc(e[3]||'')+'</pre></div>';
      if(k==='user')return '<div class="fr-e k-sys">'+head('user')+'<pre>'+esc(e[3])+'</pre></div>';
      if(k==='cb')return '<div class="fr-e k-cb">'+head('your callback')+'<pre>'+esc(short(e[3]))+'</pre></div>';
      if(k==='denied')return '<div class="fr-e k-err'+(e[5]?' sub':'')+'">'+head('permission_denied')+esc(e[3])+' '+esc(e[4]||'')+'</div>';
      if(k==='task')return '<div class="fr-e k-sys">'+head('subagent '+esc(e[3]))+esc(e[4]||'')+'</div>';
      if(k==='init')return '<div class="fr-e k-sys">'+head('system/init')+'<pre>'+esc(short(e[3]))+'</pre></div>';
      if(k==='result')return '<div class="fr-e k-sys">'+head('result')+'<pre>'+esc(JSON.stringify(e[3],null,1))+'</pre></div>';
      return '';}).join('');
    document.getElementById('fr-diff').textContent=r.diff||'(no change)';
    document.getElementById('fr-argv').textContent=r.argv?'claude '+r.argv.map(a=>a===''?'""':/[\s"{}()*,]/.test(a)?"'"+a+"'":a).join(' '):'(TypeScript run: command not logged)';
  }
  pick.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.l;pick.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();});
  document.getElementById('fr-cbs').addEventListener('change',draw);
  // connectors and files
  const C=F.conn;let c='<table><thead><tr><th>Batch</th><th>strict_mcp_config</th><th>our server</th><th class="num">MCP servers</th><th class="num">tools</th><th class="num">input tokens</th><th class="num">cost</th></tr></thead><tbody>';
  [['1',C.batch1],['2',C.batch2]].forEach(([b,rs])=>rs.forEach(x=>{c+='<tr><td>'+b+'</td><td>'+x.strict_mcp_config+'</td><td>'+x.own_sdk_server+'</td><td class="num">'+x.mcp_servers+' ('+x.mcp_servers_connected+' connected)</td><td class="num">'+x.tools+'</td><td class="num">'+X.fmt(x.input_total)+'</td><td class="num">'+X.usd(x.cost_usd,4)+'</td></tr>';}));
  document.getElementById('fr-conn').innerHTML=c+'</tbody></table>';
  let f='<table><thead><tr><th>Run folder</th><th>File</th><th class="num">lines</th><th class="num">bytes</th></tr></thead><tbody>';
  Object.entries(F.files).forEach(([k,v])=>{if(!Array.isArray(v))return;v.forEach(x=>{f+='<tr><td>'+esc(k)+'</td><td><code>'+esc(x.file)+'</code></td><td class="num">'+X.fmt(x.lines)+'</td><td class="num">'+X.fmt(x.bytes)+'</td></tr>';});});
  document.getElementById('fr-files').innerHTML=f+'</tbody></table><p class="small mute">'+esc(F.files._note||'')+'. Folder s1-wire also holds a failed first attempt (a wrong model name) made while setting up; s7 is the connector counting.</p>';
  draw();
})();
