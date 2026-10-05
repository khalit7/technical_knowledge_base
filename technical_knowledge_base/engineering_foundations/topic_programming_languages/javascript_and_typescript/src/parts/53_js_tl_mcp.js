// ---- Part 3 (tl) MCP message flow: replays the recorded JSON-RPC messages (stdio) and HTTP exchanges ----
(function(){
  const M=window.TL.mcp,esc=RD.esc,$=id=>document.getElementById(id);
  const WHAT={
    'initialize':'The client opens the session: it proposes a protocol version and says what it supports (capabilities) and who it is.',
    'notifications/initialized':'A notification (no id, so no reply): the client confirms it is ready. Only now may normal requests flow.',
    'tools/list':'Discovery: which tools does the server offer? The answer carries each tool\'s JSON Schema, built from the zod shape.',
    'tools/call':'The client calls a tool by name with arguments. The server validates them against the schema, then runs the handler.',
    'resources/read':'The client reads a resource by URI. Resources are data the application chooses to load, not functions the model calls.',
    'prompts/get':'The client fetches a prompt template with its arguments filled in, ready to send to a model.'
  };
  function respCap(req,msg){
    if(!req)return 'A response.';
    const r=msg.result,e=msg.error;
    if(e)return 'An error response to request '+msg.id+' ('+req.method+'): JSON-RPC error '+e.code+'.';
    if(req.method==='initialize')return 'The server answers with the protocol version it accepts ('+r.protocolVersion+'), its capabilities (tools, resources, prompts, each with listChanged) and its name.';
    if(req.method==='tools/call')return r.isError?'Result for request '+msg.id+' with isError: true. The tool failed (or its input was invalid), and the failure is data the model can read, not a protocol error.':'Result for request '+msg.id+': the tool\'s output as a list of content items (here one text item holding JSON).';
    return 'Result for request '+msg.id+' ('+req.method+').'}
  function stdioFrames(){const byId={};return M.stdio.map(x=>{const m=x.msg;if(m.method&&m.id!==undefined)byId[m.id]=m;
    let cap;if(x.dir==='->')cap=(m.id!==undefined?'Request id '+m.id+', ':'')+'<code>'+esc(m.method)+'</code>: '+esc(WHAT[m.method]||'');
    else cap=esc(respCap(byId[m.id],m));
    if(x.dir==='->'&&m.method==='tools/call')cap+=' Arguments: <code>'+esc(JSON.stringify(m.params.arguments))+'</code>.';
    return {dir:x.dir,label:m.method||('result id '+m.id),json:m,cap,http:null}})}
  function httpFrames(){const L=M.httpLog,F=[];
    M.http.forEach(line=>{const meth=(line.match(/^(\w+) /)||[])[1],rpc=(line.match(/\/mcp\s+([\w\/]+)\s/)||[])[1];
      const req=rpc?L.find(x=>x.dir==='->'&&x.msg.method===rpc):null,res=req&&req.msg.id!==undefined?L.find(x=>x.dir==='<-'&&x.msg.id===req.msg.id):null;
      let cap;
      if(meth==='GET')cap='The client opens a long-lived GET on the same endpoint: an SSE stream on which the server may send its own requests and notifications later (none in this session).';
      else if(meth==='DELETE')cap='The client ends the session explicitly: DELETE with the session id. The server forgets the session.';
      else if(rpc==='initialize')cap='The first POST carries the initialize request and no session id. The response is an SSE stream holding the result, and its mcp-session-id header names the new session.';
      else if(rpc==='notifications/initialized')cap='A notification needs no answer: the server replies 202 Accepted with an empty body. From now on every request carries mcp-session-id and mcp-protocol-version headers.';
      else cap='<code>'+esc(rpc)+'</code> as an HTTP POST; the JSON-RPC response comes back in the response body as an SSE event. '+esc(WHAT[rpc]||'');
      F.push({dir:'->',label:meth+' /mcp'+(rpc?' '+rpc:''),json:req?req.msg:null,cap,http:line});
      if(res)F.push({dir:'<-',label:'result id '+res.msg.id,json:res.msg,cap:esc(respCap(req.msg,res.msg)),http:null})});
    return F}
  let mode='stdio',FR=stdioFrames();
  function draw(i){const f=FR[i];
    $('tl-mc-arr').className='tl-arrow '+(f.dir==='->'?'r':'l');
    $('tl-mc-arr').innerHTML='<div class="lb">'+esc(f.label)+'</div><div class="ln"></div>';
    $('tl-mc-c').classList.toggle('on',f.dir==='<-');$('tl-mc-s').classList.toggle('on',f.dir==='->');
    $('tl-mc-cap').innerHTML='<b>'+(i+1)+'/'+FR.length+'</b> '+(f.dir==='->'?'client to server':'server to client')+'. '+f.cap;
    $('tl-mc-http').innerHTML=f.http?'<div class="tl-http">'+esc(f.http)+'</div>':'';
    $('tl-mc-json').textContent=f.json?JSON.stringify(f.json,null,2):'(no JSON-RPC body)';
    $('tl-mc-hist').innerHTML=FR.map((g,k)=>'<span class="'+(k===i?'cur':'')+'">'+(g.dir==='->'?'&rarr; ':'&larr; ')+esc(g.label)+'</span>').join('');
  }
  const an=RD.anim({card:'tl-mc-card',ctl:'tl-mc-ctl',n:FR.length,draw,ms:2000,label:'MCP message'});
  RD.seg($('tl-mc-mode'),m=>{mode=m;FR=m==='stdio'?stdioFrames():httpFrames();an.reset(FR.length);an.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tl-mcp']=window.TAB_RENDER['t-tl-mcp']||[]).push(()=>an.redraw());
})();
