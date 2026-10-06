// ---- Wire lab: replay of the recorded stdin/stdout lines of runs s1 and s3 ----
(function(){
  const F=window.FSDK,esc=RD.esc;
  let L='s1_wire',only=false,rows=[];
  const get=(s,k)=>{const m=new RegExp('"'+k+'": "([^"]*)"').exec(s||'');return m?m[1]:''};
  function label(w){
    const [t,dir,type,sub,rid,names,body]=w;
    if(type==='control_request'){
      if(sub==='mcp_message'){const m=get(body,'method'),n=m==='tools/call'?get(body,'name'):'';return 'mcp_message: '+m+(n?' '+n:'');}
      if(sub==='hook_callback')return 'hook_callback '+get(body,'callback_id')+': '+get(body,'hook_event_name')+' '+get(body,'tool_name').replace('mcp__repo__','');
      if(sub==='can_use_tool')return 'can_use_tool: '+get(body,'tool_name').replace('mcp__repo__','')+'?';
      return sub;
    }
    if(type==='control_response'){const b=body||'';
      if(/"behavior": "allow"/.test(b))return 'answer '+rid+': allow';
      if(/"behavior": "deny"/.test(b))return 'answer '+rid+': deny';
      if(/permissionDecision": "allow"/.test(b))return 'answer '+rid+': hook says allow';
      if(/"tools": \[/.test(b))return 'answer '+rid+': 4 tool schemas';
      if(/"content": /.test(b))return 'answer '+rid+': tool output';
      if(/current_permission_mode/.test(b))return 'answer '+rid+': session ready';
      return 'answer '+rid+(b==='{}'?': {} (no objection)':'');}
    if(type==='assistant')return 'model: '+(names?'calls '+names.split(',').map(n=>n.replace('mcp__repo__','')).join(', '):sub);
    if(type==='user')return sub==='prompt'?'your prompt':(sub==='tool_result'?'tool result into the transcript':'user: '+sub);
    if(type==='system')return 'system: '+sub;
    if(type==='result')return 'result: '+sub;
    return type;
  }
  function kind(w){return w[2]==='control_request'?(w[1]==='out'?'q':'a'):(w[2]==='control_response'?(w[1]==='in'?'a':'m'):'m')}
  function caption(w){
    const [t,dir,type,sub]=w;
    if(type==='control_request'&&dir==='in')return ['You open the session','The SDK sends initialize with the ids of your hook callbacks (hook_0 for PreToolUse, hook_1 for PostToolUse); agents and skill filters would go here too.'];
    if(type==='control_request'&&sub==='mcp_message')return ['Claude Code calls your in-process MCP server','A JSON-RPC message for the server named "repo" that lives in your process; the SDK runs your @tool function and answers on stdin.'];
    if(type==='control_request'&&sub==='hook_callback')return ['Claude Code runs your hook','Before and after every tool call it asks your callback; the read-only tools are allowed here and never reach can_use_tool.'];
    if(type==='control_request'&&sub==='can_use_tool')return ['Claude Code asks permission','Nothing earlier settled this call (no allow rule, mode default), so it asks your can_use_tool.'];
    if(type==='control_response'&&dir==='in')return ['Your process answers','The answer echoes the request id; Claude Code waits for it before going on.'];
    if(type==='control_response')return ['Claude Code answers initialize','Shortened here: it also lists commands, models and the account.'];
    if(type==='assistant')return ['A model message is relayed','One line per content block; all blocks of one model call share an id.'];
    if(type==='user'&&sub==='tool_result')return ['A tool result is relayed','Claude Code ran the tool (or got its output from you) and shows the result it gave the model.'];
    if(type==='user')return ['The prompt goes down','Streamed as a user message on stdin.'];
    if(type==='system'&&sub==='permission_denied')return ['A refusal','Nobody was asked: the call needed approval and there is no callback, so Claude Code refused it and told the model.'];
    if(type==='system')return ['Session start','The init record: model, tools, permission mode, Claude Code version.'];
    if(type==='result')return ['The end','The result message: subtype, turns, cost and usage, refusals.'];
    return [type,''];
  }
  function build(){rows=F.wire[L].filter(w=>!only||w[2]==='control_request'||w[2]==='control_response');}
  const box=document.getElementById('fw-rows'),cap=document.getElementById('fw-cap'),body=document.getElementById('fw-body'),stats=document.getElementById('fw-stats');
  function draw(i){
    const w=rows[i];if(!w)return;const lo=Math.max(0,i-11);
    box.innerHTML=rows.slice(lo,i+1).map((r,j)=>{const k=kind(r),cur=lo+j===i,lab=esc(label(r));
      const left=r[1]==='in'?'<span class="fw-msg '+k+'" title="'+lab+'">'+lab+'</span>':'<span></span>';
      const right=r[1]==='out'?'<span class="fw-msg '+k+'" title="'+lab+'">'+lab+'</span>':'<span></span>';
      return '<div class="fw-row'+(cur?' cur':'')+'"><span class="tm">'+Number(r[0]).toFixed(2)+'</span>'+left+'<span class="ar">'+(r[1]==='in'?'&#8594;':'&#8592;')+'</span>'+right+'</div>';}).join('');
    const c=caption(w);cap.innerHTML='<div class="t">Line '+(i+1)+' of '+rows.length+': '+esc(c[0])+'</div><p>'+esc(c[1])+'</p>';
    body.textContent=(w[6]||'(message line: see the Recordings tab for its content)');
    const done=rows.slice(0,i+1);const n=f=>done.filter(f).length;
    stats.innerHTML=RD.stat('Elapsed',Number(w[0]).toFixed(1)+' s','')+RD.stat('Questions to your process',n(r=>r[2]==='control_request'&&r[1]==='out'),'hooks, permission, MCP')+
      RD.stat('Your answers',n(r=>r[2]==='control_response'&&r[1]==='in'),'')+RD.stat('Model messages relayed',n(r=>r[2]==='assistant'),'one per content block')+
      RD.stat('Refusals',n(r=>r[2]==='system'&&r[3]==='permission_denied'),L==='s3_bare'?'nobody to ask':'');
  }
  build();
  const A=RD.anim({card:'fw-card',ctl:'fw-ctl',n:rows.length,draw,ms:900,label:'Wire line',tab:'t-wire'});
  RD.seg(document.getElementById('fw-mode'),m=>{L=m;build();A.reset(rows.length);A.play();});
  document.getElementById('fw-ctl-only').addEventListener('change',e=>{only=e.target.checked;build();A.reset(rows.length);});
})();
