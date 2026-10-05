// ---- Reading section 3: the states of one TCP connection, step by step (ladder diagram) ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  // each step: [arrow or null {d:'c2s'|'s2c', lab, col}, client state, server state, title, text]
  const S=[
    [null,'CLOSED','LISTEN','Before anything','The server has called socket(), bind() and listen(): its kernel now answers SYNs on port 443. The client has no socket yet.'],
    [{d:'c2s',lab:'SYN  seq=x, MSS, wscale, SACK-ok, TS'},'SYN_SENT','LISTEN','connect(): SYN','The client kernel picks an ephemeral port and a random initial sequence number x, and offers its options. They can only be agreed now.'],
    [{d:'s2c',lab:'SYN-ACK  seq=y, ack=x+1, options'},'SYN_SENT','SYN_RECEIVED','SYN-ACK','The server picks its own sequence number y, acknowledges x+1 and answers with its options. A half-open connection waits in the SYN queue.'],
    [{d:'c2s',lab:'ACK ack=y+1 (+ the 277-byte request)'},'ESTABLISHED','ESTABLISHED','ACK, and the request rides along','One round trip after connect() started, both ends are ESTABLISHED. The connection moves to the accept queue until the server calls accept(). (Over HTTPS, the TLS handshake comes first.)'],
    [{d:'s2c',lab:'data: headers + 7 SSE events, one write per token'},'ESTABLISHED','ESTABLISHED','The response streams','Each token is a small write; each segment is acknowledged. Sections 4 to 7 are everything that can go wrong here.'],
    [{d:'s2c',lab:'FIN (server is done: Connection: close)'},'ESTABLISHED','FIN_WAIT_1','Server closes first','The running request asked for Connection: close, so after the last event the server calls close(): its kernel sends FIN, "no more data from me".'],
    [{d:'c2s',lab:'ACK of the FIN'},'CLOSE_WAIT','FIN_WAIT_2','The client acknowledges, its program has not closed yet','The client kernel acknowledges and the socket enters CLOSE_WAIT: the peer is done, and it is now up to the client program to call close(). A socket stuck here forever is a bug in the program, not the network.'],
    [{d:'c2s',lab:'FIN (client calls close())'},'LAST_ACK','FIN_WAIT_2','The client closes','The client program reads the end of the stream and closes: its FIN goes out and it waits for the last ACK.'],
    [{d:'s2c',lab:'ACK of the FIN'},'CLOSED','TIME_WAIT','The last ACK','The client is done. The server, which closed first, enters TIME_WAIT: it keeps the 5-tuple reserved for 2 MSL so a delayed old segment cannot leak into a new connection, and it can resend this ACK if it is lost.'],
    [null,'CLOSED','CLOSED (after 60 s on Linux)','TIME_WAIT expires','After 60 s on Linux (30 s on this Mac) the entry is gone. The eleventh state, CLOSING, happens only when both sides send FIN at the same moment.']];
  const card=$('rd-fsm-card');if(!card)return;
  function draw(i){
    const el=$('rd-fsm-svg');const W=Math.max(280,Math.min(760,RD.width(el))),rowH=26,T=40,H=T+rowH*(S.length-1)+28;
    const xc=Math.min(90,W*0.2),xs=W-Math.min(90,W*0.2);let s='';
    s+=RD.t(xc,16,'Client',{a:'middle',w:600,fs:12.5})+RD.t(xs,16,'Server',{a:'middle',w:600,fs:12.5});
    s+='<line x1="'+xc+'" x2="'+xc+'" y1="22" y2="'+(H-6)+'" stroke="var(--line)" stroke-width="2"/><line x1="'+xs+'" x2="'+xs+'" y1="22" y2="'+(H-6)+'" stroke="var(--line)" stroke-width="2"/>';
    let row=0;
    for(let k=0;k<=i;k++){const a=S[k][0];if(!a)continue;const y0=T+row*rowH,y1=y0+rowH-6;row++;
      const x0=a.d==='c2s'?xc:xs,x1=a.d==='c2s'?xs:xc;const cur=k===i;const col=cur?'var(--acc)':'var(--mute)';
      s+='<line x1="'+x0+'" y1="'+y0+'" x2="'+x1+'" y2="'+y1+'" stroke="'+col+'" stroke-width="'+(cur?2.2:1.3)+'"/>';
      const dx=a.d==='c2s'?-7:7;s+='<path d="M'+x1+' '+y1+'l'+dx+' -5l0 8z" fill="'+col+'"/>';
      const fs=W<420?9.5:10.5;s+=RD.t((x0+x1)/2,(y0+y1)/2-4,esc(a.lab),{a:'middle',fs,fill:cur?'var(--ink)':'var(--mute)',w:cur?600:400});}
    const st=S[i];
    s+='<rect x="'+(xc-Math.min(80,W*0.19))+'" y="'+(H-24)+'" width="'+Math.min(160,W*0.38)+'" height="20" rx="4" fill="var(--acc2)"/>'+RD.t(xc,H-10,esc(st[1]),{a:'middle',fs:11,w:600});
    s+='<rect x="'+(xs-Math.min(80,W*0.19))+'" y="'+(H-24)+'" width="'+Math.min(160,W*0.38)+'" height="20" rx="4" fill="var(--acc2)"/>'+RD.t(xs,H-10,esc(st[2]),{a:'middle',fs:W<420?9.5:11,w:600});
    el.innerHTML=RD.svg(W,H,s,'TCP connection states, step '+(i+1));
    $('rd-fsm-cap').innerHTML='<div class="t">'+(i+1)+' of '+S.length+'. '+esc(st[3])+'</div><p>'+esc(st[4])+'</p>';
  }
  const h=RD.anim({card:'rd-fsm-card',ctl:'rd-fsm-ctl',n:S.length,draw,ms:2200,label:'Connection step'});
  RD.onResize(()=>h.redraw());
})();
