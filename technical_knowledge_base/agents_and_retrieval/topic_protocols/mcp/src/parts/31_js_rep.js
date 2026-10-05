// ---- Two replicas tab: the recorded confirm-then-delete call, animated request by request ----
(function(){
  const D=window.MCPD,E=RD.esc,$=id=>document.getElementById(id);
  const label=r=>(r.era==='legacy'?'2025-11-25 session':'2026-07-28')+', '+(r.lb==='rr'?'round robin':'affinity')+(r.era==='modern'?(r.key?', shared key':', per-process keys'):'');
  let cur=0,an=null;
  $('rp-seg').innerHTML=D.rep.map((r,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+E(label(r))+'</button>').join('');
  const rpc=t=>{const m=(t.rb||'').match(/"method":"([^"]+)"/);const res=(t.rb||'').match(/^\{"jsonrpc":"2\.0","id":\d+,"result"/);
    return t.m!=='POST'?t.m+' (HTTP)':(m?m[1]:(res?'response to the server\'s request':'?'))};
  function caption(r,t,phase){
    const meth=rpc(t),rep='replica '+t.rep;
    if(phase===0)return ['Client sends '+meth,'The balancer forwards this HTTP '+t.m+' to '+rep+'.'+(t.rh['mcp-session-id']?' It carries the session id '+t.rh['mcp-session-id'].slice(0,8)+'..., which only the replica that minted it knows.':'')+(t.rh['mcp-method']?' Headers mirror the body: Mcp-Method '+t.rh['mcp-method']+(t.rh['mcp-name']?', Mcp-Name '+t.rh['mcp-name']:'')+'.':'')];
    const sb=t.sb||'';
    if(t.st===404&&sb.indexOf('Session not found')>=0)return ['404 Session not found',rep+' never saw this session: it was created on the other replica. The spec says the client must start over with initialize, which will land somewhere else again.'];
    if(sb.indexOf('requestState')>=0&&sb.indexOf('error')>=0)return ['400: invalid requestState',rep+' cannot open the sealed requestState: the other replica sealed it with a key only that process knows. The retry is lost.'];
    if(sb.indexOf('"input_required"')>=0||sb.indexOf('inputRequests')>=0)return ['Input required: the server asks for confirmation',rep+' answers with an elicitation request and a sealed requestState, then forgets the call. The client asks the (scripted) user and sends the whole request again.'];
    if(sb.indexOf('elicitation/create')>=0)return ['The server asks over the open stream',rep+' sends elicitation/create on this request\'s event stream and waits, holding the call open; the result follows once the client POSTs the answer.'];
    if(meth==='initialize')return ['Session created on '+rep,'The reply sets Mcp-Session-Id. From now on this session exists only in '+rep+'\'s memory.'];
    if(sb.indexOf('deleted ')>=0)return ['Deleted, after confirmation',rep+' completed the call'+(r.era==='modern'?' from the retry alone: arguments, the user\'s answer and the sealed state were all in the request.':'.')];
    if(t.st===202)return ['202 Accepted',rep+' accepted a message that needs no answer.'];
    if(meth==='tools/list')return ['tools/list after the call','The SDK client re-lists tools to validate the structured result against the output schema.'];
    if(t.m==='GET')return ['GET stream opened','The legacy client opens a standing stream for server-initiated messages ('+t.st+').'];
    if(t.m==='DELETE')return ['Session closed','DELETE ends the session ('+t.st+').'];
    return [meth+': '+t.st,''];
  }
  function draw(i){
    const r=D.rep[cur],tr=r.trace,n=tr.length,last=i>=2*n;
    const W=RD.width($('rp-svg')),H=210,cx=[W*0.12,W*0.38,W*0.64,W*0.88];
    let b='';
    ['Client','Balancer','Replica A','Replica B'].forEach((s,k)=>{b+='<rect x="'+(cx[k]-Math.min(70,W*0.1))+'" y="6" width="'+Math.min(140,W*0.2)+'" height="26" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(cx[k],23,s,{a:'middle',fs:W<480?10:12,w:600});
      b+='<line x1="'+cx[k]+'" y1="34" x2="'+cx[k]+'" y2="'+(H-46)+'" stroke="var(--line)" stroke-dasharray="3 3"/>'});
    // memory boxes
    let sess={A:null,B:null};const completed=last?n:Math.floor(i/2)+(i%2);
    for(let k=0;k<completed;k++){const t=tr[k],sid=(t.sh||{})['mcp-session-id'];if(sid&&rpc(t)==='initialize')sess[t.rep]=sid;if(t.m==='DELETE'&&t.st<300)sess[t.rep]=null}
    ['A','B'].forEach((R,k)=>{const x=cx[2+k],txt=r.era==='legacy'?(sess[R]?'session '+sess[R].slice(0,6)+'...':'no sessions'):(r.key?'shared key':'own key');
      b+='<rect x="'+(x-Math.min(68,W*0.1))+'" y="'+(H-40)+'" width="'+Math.min(136,W*0.2)+'" height="30" rx="5" fill="'+(sess[R]?'var(--closed2)':'var(--bg)')+'" stroke="var(--line)"/>'+RD.t(x,H-21,txt,{a:'middle',fs:W<480?9:11})});
    if(!last){const k=Math.floor(i/2),t=tr[k],ph=i%2,y=60+ph*50,rx=cx[t.rep==='A'?2:3];
      const col=ph===0?'var(--acc)':(t.st<300?'var(--good)':'var(--bad)');
      const arrow=(x1,x2,yy)=>'<line x1="'+x1+'" y1="'+yy+'" x2="'+x2+'" y2="'+yy+'" stroke="'+col+'" stroke-width="2.5" marker-end="url(#rpa)"/>';
      b+='<defs><marker id="rpa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+col+'"/></marker></defs>';
      if(ph===0){b+=arrow(cx[0],cx[1],y)+arrow(cx[1],rx,y+14);b+=RD.t((cx[0]+cx[1])/2,y-6,E(rpc(t)),{a:'middle',fs:W<480?9:11})}
      else{b+=arrow(rx,cx[1],y+14)+arrow(cx[1],cx[0],y);b+=RD.t((cx[0]+cx[1])/2,y-6,String(t.st),{a:'middle',fs:11,w:600,fill:col})}
    }
    $('rp-svg').innerHTML=RD.svg(W,H,b,'Client, balancer and two replicas');
    // counters
    const done=last?n:Math.floor((i+1)/2);let reqs=0,fails=0,touched=new Set();
    for(let k=0;k<(last?n:Math.floor(i/2)+1);k++){reqs++;touched.add(tr[k].rep)}
    for(let k=0;k<done;k++)if(tr[k].st>=400)fails++;
    $('rp-cnt').innerHTML=RD.stat('HTTP requests',reqs)+RD.stat('Replicas reached',touched.size)+RD.stat('Error replies',fails)+RD.stat('Sessions held',Object.values(sess).filter(Boolean).length)+RD.stat('All 20 runs',r.ok+' of '+r.n+' succeeded');
    if(last){$('rp-cap').innerHTML='<div class="t">'+(r.ok===r.n?'The call completed':'The call failed')+'</div><p>'+E(label(r))+': '+r.ok+' of '+r.n+' runs succeeded'+(r.err.length?'; every failure: '+E(r.err.join('; ')):'')+'. Median '+r.ms+' ms per run.</p>';$('rp-msg').innerHTML='';return}
    const k=Math.floor(i/2),t=tr[k],c=caption(r,t,i%2);
    $('rp-cap').innerHTML='<div class="t">'+(k+1)+'/'+n+' '+E(c[0])+'</div><p>'+E(c[1])+'</p>';
    const hd=Object.entries(t.rh).filter(([a])=>a.startsWith('mcp')).map(([a,v])=>a+': '+v).join('\n');
    $('rp-msg').innerHTML='<div class="msg"><div class="h">'+t.m+' to replica '+t.rep+' (request)</div><pre>'+E((hd?hd+'\n\n':'')+(t.rb||'(no body)'))+'</pre></div>'+
      (i%2===1?'<div class="msg"><div class="h">reply '+t.st+'</div><pre>'+E(t.sb||'(no body)')+'</pre></div>':'');
  }
  function steps(){return 2*D.rep[cur].trace.length+1}
  an=RD.anim({card:'rp-card',ctl:'rp-ctl',n:steps(),draw,ms:1700,label:'Step through the call'});
  RD.seg($('rp-seg'),v=>{cur=+v;an.reset(steps());an.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rep']=window.TAB_RENDER['t-rep']||[]).push(()=>an.redraw());
  addEventListener('resize',()=>{const t=$('t-rep');if(t&&!t.hidden)an.redraw()});
})();
