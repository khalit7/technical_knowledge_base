// ---- MCP with and without sessions: one client, a gateway, three instances, the same calls ----
(function(){
  const card=$('v-mcp');if(!card)return;
  const R=(o)=>Object.assign({rt:1,hs:0,parse:0,fail:0,hold:0},o);
  const OLD=[
    R({t:'Open a session: initialize',to:'A',hs:1,parse:1,req:'POST /mcp\n{"method":"initialize", "params":{protocolVersion, capabilities, clientInfo}}',res:'200  Mcp-Session-Id: S1',sess:{A:'S1'},
      c:'Before any work the client must run the initialize exchange. The gateway can only see a JSON-RPC body, so it parses it, then sends the request to any instance; instance A creates session S1 and returns its id in the Mcp-Session-Id header.'}),
    R({t:'Confirm it: initialized',to:'A',hs:1,parse:1,req:'POST /mcp  Mcp-Session-Id: S1\n{"method":"notifications/initialized"}',res:'202',sess:{A:'S1'},
      c:'The second half of the handshake. From now on the client is pinned: every request carries S1, and the gateway must route it to A, the only instance that holds S1 ("a client was pinned to whichever instance held its session").'}),
    R({t:'List the tools',to:'A',parse:1,req:'POST /mcp  Mcp-Session-Id: S1\n{"method":"tools/list"}',res:'200  [search, fetch, approve_refund]',sess:{A:'S1'},
      c:'Two round trips spent before the first useful call. To apply a rule per method (rate limits, logging) the gateway has to parse the body, because the method name is only in there.'}),
    R({t:'Search',to:'A',parse:1,req:'POST /mcp  Mcp-Session-Id: S1\n{"method":"tools/call", "params":{"name":"search", ...}}',res:'200  results',sess:{A:'S1'},
      c:'A tool call. B and C sit idle for this client however busy A is: load balancing is "impractical" when the state lives on one instance.'}),
    R({t:'Deploy: instance A restarts',to:null,rt:0,restart:'A',sess:{},req:'(no request)',res:'',
      c:'A new version rolls out and A restarts. Session S1 lived in A\'s memory, so it is gone. Infrastructure had to "preserve sessions, drain or migrate them" to avoid this; here it did not.'}),
    R({t:'Search again: the session is gone',to:'A',parse:1,fail:1,req:'POST /mcp  Mcp-Session-Id: S1\n{"method":"tools/call", "params":{"name":"search", ...}}',res:'404  session not found',sess:{},restarted:'A',
      c:'The next call still carries S1 and is still routed to A, which no longer knows it. The call fails.'}),
    R({t:'Start over: a new session',to:'B',hs:1,rt:2,parse:2,req:'POST /mcp  {"method":"initialize", ...}\nPOST /mcp  Mcp-Session-Id: S2  {"method":"notifications/initialized"}',res:'200  Mcp-Session-Id: S2   then 202',sess:{B:'S2'},restarted:'A',
      c:'The client re-runs both halves of the handshake, lands on B and is now pinned to B with session S2. Two more round trips that do no work.'}),
    R({t:'Retry the search',to:'B',parse:1,req:'POST /mcp  Mcp-Session-Id: S2\n{"method":"tools/call", "params":{"name":"search", ...}}',res:'200  results',sess:{B:'S2'},restarted:'A',
      c:'The retried search succeeds on B.'}),
    R({t:'A call that needs approval: hold the line',to:'B',parse:1,hold:1,req:'POST /mcp  Mcp-Session-Id: S2\n{"method":"tools/call", "params":{"name":"approve_refund", ...}}',res:'stream held open: server asks the human (elicitation), then answers',sess:{B:'S2'},restarted:'A',
      c:'The server needs a human\'s answer before it can finish. It sends that request back over a stream it keeps open, so the connection, the session and instance B all stay tied up for as long as the human takes.'}),
    R({t:'Result',to:null,rt:0,req:'',res:'',sess:{B:'S2'},restarted:'A',
      c:'Six calls cost 9 round trips, 4 of them handshake; every request\'s body was parsed to route it; one call failed because an instance restarted; one connection was held open waiting for a human. Now switch to the version without sessions.'})];
  const NEW=[
    R({t:'List the tools, no handshake',to:'B',req:'POST /mcp  MCP-Protocol-Version  client identity  capabilities\nMcp-Method: tools/list\n{"method":"tools/list"}',res:'200  [search, fetch, approve_refund]',sess:{},
      c:'No initialize, no session id. The request carries the protocol version, client identity and capabilities it needs, plus the new mandatory header Mcp-Method. The gateway reads the header, never the body, and sends the request to whichever instance is free.'}),
    R({t:'Search, routed by header',to:'C',req:'POST /mcp\nMcp-Method: tools/call   Mcp-Name: search\n{"method":"tools/call", "params":{"name":"search", ...}}',res:'200  results',sess:{},
      c:'A tool call arrives as Mcp-Method: tools/call and Mcp-Name: search, so a gateway, rate limiter or firewall can act per method or per tool with the rules it already applies to every other API. This one goes to C.'}),
    R({t:'Search again, anywhere',to:'A',req:'POST /mcp\nMcp-Method: tools/call   Mcp-Name: search\n{...}',res:'200  results',sess:{},
      c:'"Any request can land on any instance." Load spreads across all three.'}),
    R({t:'Deploy: instance A restarts',to:null,rt:0,restart:'A',sess:{},req:'(no request)',res:'',
      c:'The same restart. A held no protocol session, so there is nothing to lose, drain or migrate; the gateway simply stops sending to A while it is down.'}),
    R({t:'Search: unaffected',to:'B',req:'POST /mcp\nMcp-Method: tools/call   Mcp-Name: search\n{...}',res:'200  results',sess:{},restarted:'A',
      c:'The next search goes to B and succeeds. The client never noticed the restart.'}),
    R({t:'A call that needs approval: answer later',to:'C',req:'POST /mcp\nMcp-Method: tools/call   Mcp-Name: approve_refund\n{...}',res:'input_required: "Approve a refund of $40?"',sess:{},restarted:'A',
      c:'Server-initiated requests become Multi Round-Trip Requests: instead of holding a stream open, the server returns input_required and the request ends. Nothing waits on the server while the human decides.'}),
    R({t:'Retry with the answer',to:'B',req:'POST /mcp\nMcp-Method: tools/call   Mcp-Name: approve_refund\n{... "input": "approved"}',res:'200  refund approved',sess:{},restarted:'A',
      c:'The client collects the answer and retries the call with it; any instance can complete it. Approval is two requests instead of one held connection: simpler to run, though the wait for the human now sits between two calls rather than inside one.'}),
    R({t:'Result',to:null,rt:0,req:'',res:'',sess:{},restarted:'A',
      c:'The same six calls cost 6 round trips (one extra for the approval, none for a handshake); the gateway routed every one on headers; the restart cost nothing; no connection was held. What is left is close to a plain HTTP API, which is the "MCP is dead" argument: the rest of the protocol (a standard tool contract that model providers back) is what its defenders say still justifies it.'})];
  const modes={old:{name:'With sessions',steps:OLD},new:{name:'Without sessions',steps:NEW}};
  function render(st){
    const S=modes[st.m].steps,step=S[st.k],t=st.t,W=Math.min(780,boxW($('mcSvg'),340)),narrow=W<560;
    const cw=narrow?66:110,gw=narrow?72:120,iw=narrow?86:150,ih=narrow?44:40,gap=narrow?10:16,top=14,H=top+3*ih+2*gap+12;
    const cx=4,gx=Math.round((W-cw-iw)/2+cw/2-gw/2)+4,ix=W-iw-4,midY=top+(3*ih+2*gap)/2;
    const iy=n=>top+'ABC'.indexOf(n)*(ih+gap);
    let s='';
    const box=(x,y,w,h,label,sub,cls)=>{let r='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="var(--mute)"'+(cls==='down'?' stroke-dasharray="4 3" opacity=".6"':'')+(cls==='hot'?' stroke="var(--acc)" stroke-width="2"':'')+'/>';
      r+='<text x="'+(x+w/2)+'" y="'+(y+(sub?h/2-2:h/2+4))+'" font-size="12" text-anchor="middle" font-weight="600">'+label+'</text>';
      if(sub)r+='<text x="'+(x+w/2)+'" y="'+(y+h/2+13)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+sub+'</text>';return r};
    // links
    ['A','B','C'].forEach(n=>{s+='<line x1="'+(gx+gw)+'" y1="'+midY+'" x2="'+ix+'" y2="'+(iy(n)+ih/2)+'" stroke="var(--line)" stroke-width="1.5"/>'});
    s+='<line x1="'+(cx+cw)+'" y1="'+midY+'" x2="'+gx+'" y2="'+midY+'" stroke="var(--line)" stroke-width="1.5"/>';
    const csub=st.m==='old'?(st.k===0&&t<.5?'no session yet':st.k<4?'pinned to A':st.k<6?'still holds S1':st.k===6&&t<.5?'re-opening':'pinned to B'):'any instance';
    s+=box(cx,midY-ih/2,cw,ih,'Client',csub,'');
    s+=box(gx,midY-ih/2,gw,ih,'Gateway',step.to?(st.m==='old'?'parses body':'reads headers'):'','');
    ['A','B','C'].forEach(n=>{const ss=step.sess&&step.sess[n];const isDown=step.restart===n&&t<.6;const restarted=step.restarted===n||(step.restart===n&&t>=.6);
      const sub=isDown?'restarting':ss?'session '+ss:restarted?(st.m==='old'?'restarted, S1 lost':'restarted'):'no session';
      s+=box(ix,iy(n),iw,ih,'Instance '+n,sub,isDown?'down':step.to===n?'hot':'')});
    // the moving request: client -> gateway -> instance (t 0..0.5), then back (0.5..1)
    if(step.to){const p=t<.5?t/.5:(1-t)/.5;const tx=ix,ty=iy(step.to)+ih/2;let x,y;
      if(p<.45){const q=p/.45;x=cx+cw+(gx-cx-cw)*q;y=midY}else if(p<.55){x=gx+gw*(p-.45)/.1;y=midY}else{const q=(p-.55)/.45;x=gx+gw+(tx-gx-gw)*q;y=midY+(ty-midY)*q}
      const col=step.fail&&t>=.5?'var(--bad)':t<.5?'var(--acc)':'var(--good)';
      s+='<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+col+'"/>'}
    $('mcSvg').innerHTML=svgEl(W,H,s,'MCP request flow, '+modes[st.m].name);
    $('mcReq').innerHTML=step.req?'<div><span class="nl">Request</span><pre>'+escH(step.req)+'</pre></div>'+(step.res?'<div><span class="nl">Reply</span><pre class="'+(step.fail?'bad':'')+'">'+escH(step.res)+'</pre></div>':''):'<div class="small mute">'+(step.restart?'Instance '+step.restart+' restarts.':'Totals for the six calls.')+'</div>';
    let rt=0,hs=0,parse=0,fail=0,hold=0;for(let k=0;k<=st.k;k++){const s2=S[k];if(k<st.k||t>=.5){rt+=s2.rt;hs+=s2.hs*(s2.rt>1?2:1);parse+=s2.parse;fail+=s2.fail;hold+=s2.hold}}
    $('mcCnt').innerHTML=stat('Round trips',fmt(rt),'HTTP requests and replies')+stat('Handshake round trips',fmt(hs),'initialize and initialized')+stat('Bodies parsed by the gateway',fmt(parse),st.m==='old'?'to learn the method':'routing on Mcp-Method, Mcp-Name')+stat('Calls failed by the restart',fmt(fail),'')+stat('Connections held for a human',fmt(hold),st.m==='old'?'elicitation over an open stream':'input_required, then retry');
  }
  stepAnim({card,pre:'mc',modes,dur:1900,render});
})();
