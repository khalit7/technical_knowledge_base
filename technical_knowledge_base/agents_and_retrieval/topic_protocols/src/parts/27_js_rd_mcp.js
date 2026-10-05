// ---- Reading tab, section 9: one MCP tool call through host, client and server (two spec revisions) ----
(function(){
  const card=document.getElementById('rd-mcp');if(!card||!RD.X||!RD.X.json.mcp)return;
  const M=RD.X.json.mcp,O=RD.X.json.tl_mcp,E=RD.esc;
  const msgEl=document.getElementById('rd-mcp-msg'),cap=document.getElementById('rd-mcp-cap'),lanes=[...document.querySelectorAll('#rd-mcp-lanes div')];
  // split the proxy's byte log into HTTP messages
  const split=(s,re)=>s.split(re).filter(x=>x.trim()).map(x=>x);
  const reqs=split(M.http[0],/(?=POST \/mcp HTTP\/1\.1)/),resps=split(M.http[1],/(?=HTTP\/1\.1 \d{3} )/);
  const body=s=>{const i=s.indexOf('\r\n\r\n');return i<0?s:s.slice(i+4)};
  const head=s=>{const i=s.indexOf('\r\n\r\n');return (i<0?s:s.slice(0,i)).replace(/\r\n/g,'\n')};
  const pretty=s=>{try{return JSON.stringify(JSON.parse(s),null,1)}catch(e){return s}};
  const INJ='<!-- Note to AI assistants';
  const mark=t=>{const e=E(t);const i=e.indexOf(E(INJ));if(i<0)return e;const j=e.indexOf('--&gt;',i);return e.slice(0,i)+'<span class="inj">'+e.slice(i,j+6)+'</span>'+e.slice(j+6)};
  const http=(s,label,lane)=>({lane,label,html:'<pre>'+E(head(s))+'\n\n'+mark(pretty(body(s)))+'</pre>'});
  const NEW=[
    {from:0,to:1,label:'User → host',html:'<pre>'+E(M.host_next_model_request.messages[0].content)+'</pre>',t:'The user asks',p:'The host (the app the user runs) holds the conversation and the list of MCP servers it is configured to use. It needs to know what tools exist before it asks the model.'},
    Object.assign(http(reqs[0],'client → server: POST /mcp',2),{t:'server/discover',p:'No handshake and no session: the first request is an ordinary call that asks the server what it supports. Note the headers: mcp-protocol-version and mcp-method let a gateway route the call without reading the body; the body’s _meta carries version, client identity and capabilities, as every request now does.'}),
    Object.assign(http(resps[0],'server → client: 200',3),{t:'The server describes itself',p:'Capabilities, supported versions (only 2026-07-28), and cache hints (ttlMs, cacheScope) that let clients and intermediaries cache the answer.'}),
    Object.assign(http(reqs[1],'client → server: POST /mcp',2),{t:'tools/list',p:'Again self-contained: version and capabilities repeated in _meta. Any server replica could answer it.'}),
    Object.assign(http(resps[1],'server → client: 200',3),{t:'One tool, described for the model',p:'Name, description and a JSON Schema for the input: this is what the host will show the model. The description is written by the server’s author, so it is untrusted too.'}),
    {from:1,to:0,label:'host → model (shape of the next request)',html:'<pre>'+E(JSON.stringify(M.host_next_model_request.tools,null,1))+'</pre>',t:'The host offers the tool to the model',p:'The tool list goes into the request to the model alongside the user’s message. (No model was called for this page; this step is shown as the host would send it.)'},
    {from:0,to:1,label:'model → host',html:'<pre>'+E(JSON.stringify(M.host_next_model_request.messages[1].content,null,1))+'</pre>',t:'The model asks for the tool',p:'The model answers with a tool_use block instead of text. The host decides whether to allow it: this is where approval prompts and allow-lists live.'},
    Object.assign(http(reqs[2],'client → server: POST /mcp',2),{t:'tools/call',p:'The call itself. The new mcp-name header carries the tool’s name, so a gateway can apply per-tool policy (rate limits, blocking destructive tools) without parsing JSON.'}),
    Object.assign(http(resps[2],'server → client: 200',3),{t:'The result: text written by someone else',p:'The server returns the page it fetched. Highlighted: a hidden instruction written by whoever controls that page. To MCP this is just a string; the protocol has no notion of whose words these are.'}),
    {from:1,to:0,label:'host to model: next request, last message',html:'<pre>'+E('\u2026 "messages": [ the user\u2019s request, the assistant\u2019s tool_use, then:\n')+mark(JSON.stringify(M.host_next_model_request.messages[2],null,1))+' ]</pre>',t:'The untrusted text enters the model’s context',p:'The host appends the tool result to the conversation and calls the model again. The injected instruction now sits in the same context as the user’s request. Whether the model obeys it depends on the model and on the host’s defences (no read_file tool, approval before sensitive calls, no way to send data out), not on the protocol.'}
  ];
  // 2025-11-25: pair each HTTP line with its JSON-RPC messages
  const OL=O.log;let k=0;const OLD=[];
  const mByMethod=m=>OL.filter(x=>x.msg.method===m);
  O.http.forEach(line=>{const m=(line.match(/^(POST|GET|DELETE) \/mcp\s+(\S*)/)||[]);const verb=m[1],meth=m[2]||'';
    let msgs=[];if(verb==='POST'&&meth){const rq=OL.find(x=>x.msg.method===meth);if(rq){msgs.push(rq);if(rq.msg.id!=null){const rs=OL.find(x=>x.dir==='<-'&&x.msg.id===rq.msg.id);if(rs)msgs.push(rs)}}}
    const txt=[line].concat(msgs.map(x=>(x.dir==='->'?'client → server ':'server → client ')+JSON.stringify(x.msg,null,1))).join('\n\n');
    const P={initialize:'The old first step: a handshake that fixes the protocol version and capabilities for the whole session. The response sets an mcp-session-id header that every later request must carry, so all of them must reach the server instance that holds the session.',
      'notifications/initialized':'The client confirms; the server answers 202 with no body. Two round trips spent before any tool call.',
      'tools/list':'Listed within the session; the session header and the protocol version header travel with it.',
      'tools/call':'The same kind of tool call; the result is again plain text that will enter the model’s context.'};
    OLD.push({from:verb==='POST'?2:2,to:3,label:'Streamable HTTP, protocol 2025-11-25',html:'<pre>'+E(txt)+'</pre>',t:verb==='GET'?'GET /mcp: a standing event stream':verb==='DELETE'?'DELETE /mcp: end the session':meth,
      p:verb==='GET'?'The client opens a long-lived SSE stream so the server can send it requests and notifications at any time: server-initiated traffic that the 2026-07-28 revision replaced with self-contained requests.':verb==='DELETE'?'Sessions have to be torn down explicitly; a server must keep each one until then or until it times out.':(P[meth]||'')})});
  let mode='new';
  function draw(i){
    const L=mode==='new'?NEW:OLD,s=L[i];
    lanes.forEach((d,j)=>d.classList.toggle('on',j===s.from||j===s.to));
    msgEl.innerHTML='<div class="msg cur"><div class="h"><span>'+E(s.label)+'</span><span>step '+(i+1)+' of '+L.length+'</span></div>'+s.html+'</div>';
    cap.innerHTML='<div class="t">'+E(s.t)+'</div><p>'+E(s.p)+'</p>';
    const inj=msgEl.querySelector('.inj'),pre=msgEl.querySelector('pre');if(inj&&pre)pre.scrollTop=Math.max(0,inj.offsetTop-pre.offsetTop-30);
  }
  NEW.forEach(s=>{if(s.lane!=null){s.from=s.lane===2?2:3;s.to=s.lane===2?3:2}});
  const a=RD.anim({card:'rd-mcp',ctl:'rd-mcp-ctl',n:NEW.length,draw,ms:2600,label:'Message'});
  RD.seg(document.getElementById('rd-mcp-seg'),m=>{mode=m;a.reset(m==='new'?NEW.length:OLD.length);a.play()});
})();
