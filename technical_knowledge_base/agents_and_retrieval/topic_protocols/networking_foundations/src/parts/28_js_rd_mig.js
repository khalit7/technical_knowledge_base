// ---- Reading section 12: connection migration. QUIC: every recorded datagram (NF.quic.ladder). TCP: drawn from the spec. ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-mig-card'))return;const esc=RD.esc,F=NFC.fmt;
  const Q=NF.quic,L=Q.ladder;let mode='quic';
  const p0=L[0].port,p1=L.find(e=>e.frm==='client'&&e.port!==p0).port;
  const FR={crypto:'CRYPTO (TLS handshake bytes)',ack:'ACK',padding:'PADDING',stream:'STREAM (application data)',new_connection_id:'NEW_CONNECTION_ID',retire_connection_id:'RETIRE_CONNECTION_ID',
    handshake_done:'HANDSHAKE_DONE',path_challenge:'PATH_CHALLENGE',path_response:'PATH_RESPONSE',connection_close:'CONNECTION_CLOSE'};
  const TY={initial:'Initial',handshake:'Handshake','1RTT':'1-RTT'};
  function quicSteps(){const out=[];let moved=false;
    L.forEach((e,k)=>{
      if(!moved&&e.frm==='client'&&e.port!==p0){moved=true;out.push({move:true,title:'The client moves to a new UDP socket',text:'Source port '+p0+' becomes '+p1+' (what a NAT rebinding or a Wi-Fi to mobile switch looks like to the server). The client also switches to a fresh connection ID the server issued earlier, so an observer cannot link the two paths.'})}
      const fr=[].concat(...e.packets.map(p=>p.frames));const has=f=>fr.indexOf(f)>=0;
      let t;
      if(k===0)t='The client\'s first datagram: an Initial packet carrying the TLS ClientHello, padded to '+F(e.bytes)+' bytes ('+F(e.padded)+' of them padding), as RFC 9000 requires of a client\'s first flight.';
      else if(e.frm==='server'&&e.packets.some(p=>p.type==='handshake')&&has('crypto'))t='The server answers with an Initial (ServerHello) and a Handshake packet (certificate and Finished) coalesced in one '+F(e.bytes)+'-byte datagram: within the three-times limit, since it has received '+F(L[0].bytes)+' bytes.';
      else if(e.frm==='client'&&e.packets.some(p=>p.type==='handshake'))t='The client completes the handshake (its Finished in a Handshake packet) and already sends 1-RTT packets: one round trip after the first datagram the connection is ready for data.';
      else if(has('path_challenge'))t='';
      else if(has('path_response'))t='PATH_RESPONSE echoes the challenge: the new path is validated. The connection never stopped.';
      else if(has('handshake_done'))t='HANDSHAKE_DONE confirms the handshake to the client; NEW_CONNECTION_ID hands it spare IDs for later migration.';
      else if(has('connection_close'))t='The client closes the connection.';
      else if(has('stream')&&e.frm==='client')t=moved?'The second request ("after") goes out from the new port, on the same connection, with no handshake.':'The first request ("before") on stream 0.';
      else if(has('stream'))t='The echo comes back on the stream.';
      else t='An acknowledgement.';
      if(has('path_challenge'))t='The server sees its connection ID arrive from a new client port ('+p1+'). It sends the reply there, and challenges the new path: PATH_CHALLENGE (8 random bytes) rides with the echoed "after".';
      out.push({e,title:(e.frm==='client'?'Client to server':'Server to client')+', '+F(e.bytes)+' bytes: '+e.packets.map(p=>TY[p.type]||p.type).join(' + '),
        text:t+' Frames: '+[...new Set(fr)].map(f=>FR[f]||f).join(', ')+'.'})});
    return out}
  const TCP=[
    {a:'c2s',lab:'SYN',title:'TCP: handshake',text:'TCP names the connection by its 5-tuple, including the client port '+p0+'.'},
    {a:'s2c',lab:'SYN-ACK'},{a:'c2s',lab:'ACK + TLS ClientHello'},{a:'s2c',lab:'TLS ServerHello ... Finished'},{a:'c2s',lab:'TLS Finished + request "before"'},{a:'s2c',lab:'reply'},
    {move:true,title:'The client\'s address changes',text:'Port '+p0+' becomes '+p1+'. For TCP this is a different connection: the 5-tuple no longer matches any socket at the server.'},
    {a:'c2s',lab:'request "after" from port '+p1,title:'Old connection, new port',text:'The segment matches no connection at the server.'},
    {a:'s2c',lab:'RST',bad:true,title:'Reset',text:'The server kernel answers a segment that belongs to no connection with a reset (RFC 9293 s3.5.2). The application gets ECONNRESET.'},
    {a:'c2s',lab:'SYN (new connection)',title:'Start again',text:'A new TCP handshake: one round trip.'},{a:'s2c',lab:'SYN-ACK'},{a:'c2s',lab:'ACK + ClientHello'},{a:'s2c',lab:'ServerHello ... Finished',title:'And a new TLS handshake',text:'Another round trip (TLS 1.3; resumption can save some work but not the round trip).'},
    {a:'c2s',lab:'Finished + request "after"',title:'Retry',text:'Two round trips after the move, plus whatever time the application took to notice the reset and decide that retrying is safe.'},{a:'s2c',lab:'reply'}];
  TCP.forEach((s,k)=>{if(!s.title){s.title=k<6?'TCP: handshake and first request':'TCP: reconnect';s.text=s.text||'Illustrative: the order of messages, not recorded timing.'}});
  let S=quicSteps();
  function draw(i){
    const el=$('rd-mig-svg');const W=Math.max(280,Math.min(760,RD.width(el)));const isQ=mode==='quic';
    const rows=S.length,rowH=22,T=38,H=T+rows*rowH+10,xc=Math.min(80,W*0.18),xs=W-Math.min(80,W*0.18);let s='';
    s+=RD.t(xc,14,'Client',{a:'middle',w:600,fs:12})+RD.t(xs,14,'Server :30020',{a:'middle',w:600,fs:12});
    s+=RD.t(xc,28,'port '+p0,{a:'middle',fs:10,fill:'var(--mute)'});
    s+='<line x1="'+xc+'" x2="'+xc+'" y1="32" y2="'+(H-4)+'" stroke="var(--line)" stroke-width="2"/><line x1="'+xs+'" x2="'+xs+'" y1="32" y2="'+(H-4)+'" stroke="var(--line)" stroke-width="2"/>';
    for(let k=0;k<=i;k++){const st=S[k];const y=T+k*rowH+6;const cur=k===i;
      if(st.move){s+='<line x1="'+(xc-30)+'" x2="'+(xs+30)+'" y1="'+y+'" y2="'+y+'" stroke="var(--c5)" stroke-dasharray="4 3"/>'+RD.t(W/2,y-3,'client now on port '+p1,{a:'middle',fs:10.5,fill:'var(--c5)',w:600});continue}
      const c2s=isQ?st.e.frm==='client':st.a==='c2s';const x0=c2s?xc:xs,x1=c2s?xs:xc;const bad=!isQ&&st.bad;
      const col=bad?'var(--bad)':(cur?'var(--acc)':'var(--mute)');
      s+='<line x1="'+x0+'" y1="'+(y-6)+'" x2="'+x1+'" y2="'+(y+6)+'" stroke="'+col+'" stroke-width="'+(cur?2.2:1.2)+'"/><path d="M'+x1+' '+(y+6)+'l'+(c2s?-7:7)+' -4l0 7z" fill="'+col+'"/>';
      const lab=isQ?F(st.e.bytes)+' B: '+st.e.packets.map(p=>TY[p.type]||p.type).join('+'):st.lab;
      s+=RD.t((x0+x1)/2,y-1,esc(lab),{a:'middle',fs:W<420?9:10.5,fill:cur?'var(--ink)':'var(--mute)',w:cur?600:400})}
    el.innerHTML=RD.svg(W,H,s,'Connection migration ladder');
    const st=S[i];let extra='';
    if(isQ&&st.e)extra=' <span class="mute">(sent at '+F(st.e.t_send,2)+' ms, received at '+F(st.e.t_recv,2)+' ms after the first datagram)</span>';
    $('rd-mig-cap').innerHTML='<div class="t">'+(i+1)+' of '+S.length+'. '+esc(st.title)+'</div><p>'+esc(st.text)+extra+'</p>';
  }
  function note(){$('rd-mig-note').innerHTML=mode==='quic'?'<span class="meas">measured</span> aioquic '+esc(Q.aioquic)+', loopback, '+esc(Q.recorded)+': '+L.length+' datagrams, both replies received ("'+esc(Q.steps[1].reply)+'", "'+esc(Q.steps[3].reply)+'") on one connection. Rows are in time order; spacing is not to scale (each datagram\'s times are in its caption).':'<span class="ill">illustrative</span> the same move on TCP over TLS 1.3, drawn from RFC 9293 and RFC 9846; message order, not timing.'}
  const h=RD.anim({card:'rd-mig-card',ctl:'rd-mig-ctl',n:S.length,draw,ms:1700,label:'Datagram'});
  RD.seg($('rd-mig-seg'),m=>{mode=m;S=m==='quic'?quicSteps():TCP;note();h.reset(S.length);h.play()});
  note();RD.onResize(()=>h.redraw());
})();
