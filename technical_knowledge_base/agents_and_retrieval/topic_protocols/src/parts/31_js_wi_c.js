// ---- On the wire: 4. head-of-line blocking, 5. TLS 1.2 vs 1.3, 6. cold vs resumed vs kept alive, 7. reproduce ----
(function(){
  const {D,$,esc,f1,f0,ms,svg,tx,width,anim,seg}=WI,H=D.hol;
  const P=[['h1','HTTP/1.1','one TCP connection: requests wait their turn'],['h2','HTTP/2','three streams on one TCP connection'],['h3','HTTP/3','three streams on one QUIC connection']];
  const NM=['A','B','C'],COL=['var(--c1)','var(--c3)','var(--c4)'];
  let mode='loss',a=null;const STEP=20;
  const tmaxOf=()=>Math.max(...P.map(p=>Math.max(...[0,1,2].map(i=>Math.max(...H[mode+'_'+p[0]].tokens[i])))))*1.04;
  function draw(k){
    const el=$('wi-hol'),w=width(el),narrow=w<560,L=narrow?24:136,Rr=8,lane=13,gh=3*lane+26,top=6,tmax=tmaxOf(),now=k*STEP;
    const x=t=>L+(w-L-Rr)*t/tmax,h=top+P.length*gh+22;let b='';
    const step=[50,100,200,250,500].find(s=>tmax/s<=(narrow?5:9))||500;
    for(let t=0;t<=tmax;t+=step)b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+top+'" y2="'+(h-18)+'" stroke="var(--line)"/>'+tx(x(t),h-5,t+(t?'':' ms'),{a:t?'middle':'start',fill:'var(--mute)',fs:10});
    P.forEach((p,g)=>{const R=H[mode+'_'+p[0]],B=H['base_'+p[0]],y0=top+g*gh;
      b+=narrow?tx(2,y0+10,'<tspan font-weight="600">'+p[1]+'</tspan> <tspan fill="var(--mute)">'+p[2]+'</tspan>',{fs:10.5}):tx(L-24,y0+22,p[1],{a:'end',w:600})+tx(L-24,y0+35,p[0]==='h1'?'one at a time':p[0]==='h2'?'shared TCP':'shared QUIC',{a:'end',fill:'var(--mute)',fs:10});
      [0,1,2].forEach(i=>{const y=y0+(narrow?16:6)+i*lane+6;
        b+=tx(narrow?14:L-8,y+4,NM[i],{a:'end',fs:10,fill:'var(--mute)'});
        const s=R.sent[i];if(now>s)b+='<line x1="'+x(s)+'" x2="'+x(Math.min(now,R.tokens[i][4]))+'" y1="'+y+'" y2="'+y+'" stroke="'+COL[i]+'" stroke-opacity=".35" stroke-width="2"/>';
        R.tokens[i].map((t,j)=>[t,j]).sort((p,q)=>((p[0]-B.tokens[i][p[1]]>20)-(q[0]-B.tokens[i][q[1]]>20))).forEach(([t,j])=>{const late=mode==='loss'&&t-B.tokens[i][j]>20;
          if(late&&now>=B.tokens[i][j])b+='<circle cx="'+x(B.tokens[i][j])+'" cy="'+y+'" r="3.5" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"/>';
          if(now>=t)b+='<circle cx="'+x(t)+'" cy="'+y+'" r="4" fill="'+(late?'var(--bad)':COL[i])+'"><title>'+NM[i]+' token '+(j+1)+' at '+f1(t)+' ms'+(late?' ('+f0(t-B.tokens[i][j])+' ms late)':'')+'</title></circle>'});
        if(mode==='loss'&&i===0&&now>=B.tokens[0][1]){const X=x(B.tokens[0][1]);b+='<path d="M'+(X-4)+' '+(y-10)+' l8 8 M'+(X+4)+' '+(y-10)+' l-8 8" stroke="var(--bad)" stroke-width="2"/>'}
      })});
    b+='<line x1="'+x(Math.min(now,tmax))+'" x2="'+x(Math.min(now,tmax))+'" y1="'+top+'" y2="'+(h-18)+'" stroke="var(--ink)" stroke-opacity=".5"/>';
    el.innerHTML=svg(w,h,b,'Token arrivals for three requests over HTTP/1.1, HTTP/2 and HTTP/3');
    panel();
  }
  function panel(){
    const rows=P.map(p=>{const R=H[mode+'_'+p[0]],B=H['base_'+p[0]];
      const late=[0,1,2].map(i=>Math.max(0,...R.tokens[i].map((t,j)=>t-B.tokens[i][j])));
      return '<tr><td>'+p[1]+'</td>'+[0,1,2].map(i=>'<td class="num">'+f0(R.tokens[i][4])+(mode==='loss'?'<br><span class="mute">'+(late[i]>20?'+'+f0(late[i])+' ms late':'on time')+'</span>':'')+'</td>').join('')+'</tr>'}).join('');
    $('wi-hol-panel').innerHTML='<h4>'+(mode==='loss'?'One lost packet: who had to wait':'No loss: the baseline')+'</h4><div class="tw"><table class="wi-t"><tr><th></th><th class="num">A done at</th><th class="num">B done at</th><th class="num">C done at</th></tr>'+rows+'</table></div>'+
      (mode==='loss'?'<p><b>HTTP/2:</b> the lost bytes belonged to A, but TCP hands bytes to the app strictly in order, so B\'s and C\'s tokens that arrived meanwhile sat in the kernel until the gap was filled: all three stalled (head-of-line blocking at the transport). <b>HTTP/3:</b> QUIC orders bytes per stream, so only A waited; B and C carried on. <b>HTTP/1.1</b> on one connection never had B and C in flight: they started only after A ended, so the whole batch took about three times longer, loss or not. (Browsers open up to six connections to dodge this; each costs its own handshakes.)</p>':'<p>Without loss HTTP/2 and HTTP/3 behave the same: three answers interleaved on one connection, each token about '+f0(D.server.token_gap_s*1000)+' ms after the last. HTTP/1.1 on one connection runs them back to back.</p>')+
      '<p class="wi-src">Times in ms from the first request, as seen by the app. Dashed circles: where a token arrived in the no-loss run. Source: <code>raw/hol/</code>.</p>'}
  function how(){const q=H.quic_packets,m=H.quic_missing_pn[0];const ev3=H.loss_h3.event,ev2=H.loss_h2.event;
    // a retransmission fills a gap: a stream-0 frame whose offset is below an offset already received on stream 0
    let mx=-1,lostRe=null;q.forEach(p=>p.stream.forEach(s=>{if(s[0]!==0)return;if(s[1]<mx&&!lostRe)lostRe=p;mx=Math.max(mx,s[1])}));
    const off=lostRe?lostRe.stream.find(s=>s[0]===0)[1]:0,nextP=lostRe?q.find(p=>p.pn<lostRe.pn&&p.stream.some(s=>s[0]===0&&s[1]>off)):null;
    $('wi-hol-how').innerHTML='<p><b>Delay.</b> <code>netem.py</code> sits between client and server on 127.0.0.1 and holds every chunk (TCP) or datagram (UDP) for 25 ms in each direction.</p>'+
      '<p><b>HTTP/3: a real loss.</b> The proxy dropped one UDP datagram from server to client: the first one of exactly '+ev3.bytes+' bytes, which is the size of a packet carrying " sky" (encrypted packets still give away their length, and token lengths differ). The client\'s own QUIC log shows packet number '+m+' never arrived'+(lostRe&&nextP?'; request A\'s bytes from offset '+lostRe.stream.find(s=>s[0]===0)[1]+' (" sky") came again in packet '+lostRe.pn+', '+f1(lostRe.t_ms)+' ms into the connection, after packet '+nextP.pn+' had already brought A\'s next token, which had to wait for it':'')+'. QUIC noticed the gap when later packets were acknowledged and resent the data (RFC 9002 section 6.1): A\'s token came <b>'+H.stall_ms+' ms</b> late.</p>'+
      '<p><b>HTTP/1.1 and HTTP/2: a simulated loss.</b> A proxy cannot drop a TCP segment: the two kernels would resend it below our view. So the proxy reproduces what the app sees after a TCP loss: it held the first '+ev2.bytes+'-byte chunk (A\'s " sky" on HTTP/2; '+H.loss_h1.event.bytes+' bytes on HTTP/1.1) for the same '+H.stall_ms+' ms QUIC needed, and every byte behind it waited too, because TCP delivers in order. Same lost data, same recovery time; the only difference is who has to wait. Real TCP often takes longer on a sparse stream like token streaming: with too few packets after the loss to trigger a fast retransmit it falls back to a timer (RFC 8985, RFC 6298).</p>'}
  seg($('wi-hol-seg'),m=>{mode=m;a.reset(Math.ceil(tmaxOf()/STEP)+1);a.go(Math.ceil(tmaxOf()/STEP));});
  a=anim({card:'wi-hol-card',ctl:'wi-hol-ctl',n:Math.ceil(tmaxOf()/STEP)+1,draw,ms:110,label:'Time'});
  a.go(Math.ceil(tmaxOf()/STEP));how();
})();

// ---- 5. TLS 1.2 vs 1.3 ladder ----
(function(){
  const {D,$,esc,f1,f0,ms,svg,tx,width,anim}=WI,S=D.hs,OW=25;
  const pick=k=>S[k][0];
  function flights(r){const out=[];r.msgs.forEach(m=>{const [dir,name,len,t]=m;const l=out[out.length-1];
      if(l&&l.dir===dir&&Math.abs(t-l.t)<4){l.names.push(name);l.len+=len;l.t=Math.max(l.t,t)}else out.push({dir,names:[name],len,t})});
    // the HTTP request and the first byte of the answer
    out.push({dir:'out',names:['HTTP request'],len:null,t:r.tls_ms+0.05,http:1});out.push({dir:'in',names:['first byte of the answer'],len:null,t:r.first_byte_ms,http:1});
    return out.sort((a,b)=>(a.dir==='out'?a.t:a.t-OW)-(b.dir==='out'?b.t:b.t-OW))}
  const runs=[['TLS 1.2',pick('tls12_netem')],['TLS 1.3',pick('tls13_netem')]];
  const F=runs.map(r=>flights(r[1]));
  const n=Math.max(...F.map(f=>f.length));
  function draw(k){const el=$('wi-tls'),w=width(el),two=w>=600,cw=two?(w-12)/2:w,tmax=Math.max(...runs.map(r=>r[1].first_byte_ms))+8,ph=two?300:240;
    const y=t=>24+(ph-34)*t/tmax;let b='';
    runs.forEach((r,c)=>{const ox=two?c*(cw+12):0,oy=two?0:c*(ph+10),cx=ox+cw*0.2,sx=ox+cw*0.8;
      b+=tx(ox+cw/2,oy+12,r[0]+': '+(c?'one round trip':'two round trips')+' before the request',{a:'middle',w:600});
      b+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(oy+20)+'" y2="'+(oy+ph-4)+'" stroke="var(--mute)"/><line x1="'+sx+'" x2="'+sx+'" y1="'+(oy+20)+'" y2="'+(oy+ph-4)+'" stroke="var(--mute)"/>'+tx(cx,oy+ph+8,'client',{a:'middle',fill:'var(--mute)',fs:10})+tx(sx,oy+ph+8,'server',{a:'middle',fill:'var(--mute)',fs:10});
      // shaded TLS part
      b+='<rect x="'+(cx-6)+'" y="'+(oy+y(r[1].tcp_ms))+'" width="4" height="'+(y(r[1].tls_ms)-y(r[1].tcp_ms))+'" fill="var(--wi-tls)"/>'+tx(cx-9,oy+y(r[1].tls_ms),f0(r[1].tls_ms-r[1].tcp_ms)+' ms',{a:'end',fs:10,fill:'var(--wi-tls)',w:600});
      F[c].forEach((f,i)=>{if(i>k)return;const out=f.dir==='out',t1=out?f.t:f.t-OW,t2=out?f.t+OW:f.t,x1=out?cx:sx,x2=out?sx:cx,y1=oy+y(t1),y2=oy+y(t2);
        const col=f.http?'var(--wi-wait)':'var(--acc)';
        b+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+(i===k?2.4:1.4)+'"/><circle cx="'+x2+'" cy="'+y2+'" r="2.5" fill="'+col+'"/>';
        const lab=f.names.join(', ')+(f.len?' ('+f.len+' B)':'');
        b+=tx((x1+x2)/2,(y1+y2)/2-3,esc(lab.length>(two?44:56)?lab.slice(0,two?42:54)+'...':lab),{a:'middle',fs:9.5,fill:i===k?'var(--ink)':'var(--mute)'})});
    });
    el.innerHTML=svg(w,two?ph+14:2*ph+24,b,'Ladder diagram of the TLS 1.2 and TLS 1.3 handshakes');
    const lines=runs.map((r,c)=>{const f=F[c][Math.min(k,F[c].length-1)];return '<b>'+r[0]+'</b>: '+esc(f.names.join(', '))+(f.len?', '+f.len+' bytes':'')+', '+(f.dir==='out'?'sent':'received')+' at '+ms(f.t)});
    $('wi-tls-panel').innerHTML='<div class="wi-step">Flight '+(k+1)+' of '+n+'</div>'+lines.join('<br>')+'<p class="wi-src">Time runs down. Arrows slope because each direction takes '+OW+' ms. Message names and sizes from OpenSSL\'s message callback in <code>wire_client.py</code>; times measured at the client. Source: <code>raw/tls1.2_netem.json</code>, <code>raw/tls1.3_netem.json</code>.</p>'}
  anim({card:'wi-tls-card',ctl:'wi-tls-ctl',n,draw,ms:1300,label:'Flight'});
  // the summary table, emulated and public
  const row=(lab,k)=>{const r=S[k],c=r[0],rs=r.slice(1);const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor(a.length/2)]};
    const hs=x=>x.tls_ms-x.tcp_ms;return '<tr><td>'+lab+'</td><td class="num">'+f1(c.tcp_ms)+'</td><td class="num">'+f1(hs(c))+'</td><td class="num">'+f1(med(rs.map(hs)))+'</td><td class="num">'+(c.hs_bytes?c.hs_bytes.out+' / '+c.hs_bytes.in:'')+'</td><td class="num">'+(rs[0].hs_bytes?rs[0].hs_bytes.out+' / '+rs[0].hs_bytes.in:'')+'</td></tr>'};
  $('wi-tls-tab').innerHTML='<table class="wi-t"><tr><th>Path, version</th><th class="num">TCP connect</th><th class="num">TLS cold</th><th class="num">TLS resumed (median)</th><th class="num">Bytes out / in, cold</th><th class="num">resumed</th></tr>'+
    row('Emulated 50 ms, TLS 1.2','tls12_netem')+row('Emulated 50 ms, TLS 1.3','tls13_netem')+row('www.cloudflare.com, TLS 1.2','tls12_public')+row('www.cloudflare.com, TLS 1.3','tls13_public')+'</table>'+
    '<p class="wi-src">Milliseconds; bytes counted on the wire until the handshake completed. Against the public host the TCP connect is a real round trip (about '+f0(S.tls13_public[0].tcp_ms)+' ms), and TLS 1.2 costs about two of them where TLS 1.3 costs one. A TLS 1.2 resumption saves a round trip; a TLS 1.3 resumption does not (it is one round trip either way) but skips the certificate and its check, and with 0-RTT could send the request in the first flight (RFC 8446 section 2.3, which warns that 0-RTT data can be replayed). TLS 1.3 sends more bytes here because the client offers a post-quantum key share of over a kilobyte. Source: <code>raw/tls*_netem.json</code>, <code>raw/public_tls*_cloudflare.json</code>.</p>';
})();

// ---- 6. cold, resumed, kept alive ----
(function(){
  const {D,$,esc,f1,f0,ms,svg,tx,width,anim}=WI,S=D.hs;
  const med=a=>{a=a.filter(x=>x!=null).slice().sort((x,y)=>x-y);return a[Math.floor(a.length/2)]};
  const cold=S.resume_netem[0],res=S.resume_netem.slice(1),ka=S.keepalive_netem.slice(1),h3=D.waterfall.netem.h3.median;
  const rows=[
    {lab:'Cold: new TCP + full TLS 1.3',segs:[['TCP',cold.tcp_ms,'var(--wi-tcp)'],['TLS',cold.tls_ms,'var(--wi-tls)'],['request to first byte',cold.first_byte_ms,'var(--wi-wait)']],bytes:cold.hs_bytes},
    {lab:'Resumed: new TCP + TLS with a ticket',segs:[['TCP',med(res.map(r=>r.tcp_ms)),'var(--wi-tcp)'],['TLS',med(res.map(r=>r.tls_ms)),'var(--wi-tls)'],['request to first byte',med(res.map(r=>r.first_byte_ms)),'var(--wi-wait)']],bytes:res[0].hs_bytes},
    {lab:'Kept alive: same connection',segs:[['request to first byte',med(ka.map(r=>r.first_byte_ms)),'var(--wi-wait)']]},
    {lab:'HTTP/3 cold: QUIC + TLS together',segs:[['QUIC + TLS',h3.tls,'url(#wi-hatch2)'],['request to first byte',h3.fb,'var(--wi-wait)']]}];
  const tmax=Math.max(...rows.map(r=>r.segs[r.segs.length-1][1]))*1.08,STEP=4,n=Math.ceil(tmax/STEP)+1;
  function draw(k){const el=$('wi-res'),w=width(el),narrow=w<560,L=narrow?4:230,Rr=8,rh=narrow?40:30,h=rows.length*rh+26,now=k*STEP;
    const x=t=>L+(w-L-Rr)*Math.min(t,tmax)/tmax;let b='<defs><pattern id="wi-hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--wi-tcp)"/><rect x="3" width="3" height="6" fill="var(--wi-tls)"/></pattern></defs>';
    for(let t=0;t<=tmax;t+=20)b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="0" y2="'+(h-18)+'" stroke="var(--line)"/>'+tx(x(t),h-5,t+(t?'':' ms'),{a:t?'middle':'start',fill:'var(--mute)',fs:10});
    rows.forEach((r,i)=>{const y=i*rh+(narrow?16:6);b+=narrow?tx(L,y-4,esc(r.lab),{fs:11,w:600}):tx(L-8,y+13,esc(r.lab),{a:'end',fs:11.5});let p=0;
      r.segs.forEach(s=>{const e=Math.min(s[1],now);if(e>p)b+='<rect x="'+x(p)+'" y="'+y+'" width="'+(x(e)-x(p))+'" height="18" fill="'+s[2]+'"><title>'+esc(s[0])+' until '+f1(s[1])+' ms</title></rect>';p=Math.max(p,s[1])});
      const end=r.segs[r.segs.length-1][1];if(now>=end)b+=tx(x(end)+4,y+13,f0(end)+' ms',{fs:10.5,w:600})});
    el.innerHTML=svg(w,h,b,'Time to the first byte: cold, resumed, kept alive');
  }
  anim({card:'wi-res-card',ctl:'wi-res-ctl',n,draw,ms:45,label:'Time'});
  const h3r=S.h3_resume_netem.filter(r=>r.label!=='cold');
  $('wi-res-panel').innerHTML='<p><b>Kept alive wins:</b> the second request on an open connection gets its first byte after one round trip ('+ms(med(ka.map(r=>r.first_byte_ms)))+'), against '+ms(cold.first_byte_ms)+' for a cold connection. That is why SDKs keep a connection pool and why a proxy that closes idle connections quietly adds a handshake to the next call. <b>TLS 1.3 resumption</b> saved the certificate ('+cold.hs_bytes.in+' bytes in from the server cold, '+res[0].hs_bytes.in+' resumed) but no time: still one round trip. TCP connect is near zero in this emulation only because our proxy answers it; on a real path add one round trip to the first two bars.</p>'+
    '<p class="wi-src">HTTP/3 resumption and 0-RTT were attempted and not measured: the server we used (hypercorn '+esc((D.env.hypercorn||'').split(' ')[0])+') issued no QUIC session tickets, so all '+h3r.length+' reconnections were full handshakes (resumed: '+h3r.map(r=>String(r.resumed)).join(', ')+'). Source: <code>raw/resume_netem.json</code>, <code>raw/keepalive_netem.json</code>, <code>raw/h3_resume_netem.json</code>, <code>raw/h3_0rtt_netem.json</code>.</p>';
})();

// ---- 7. reproduce ----
(function(){
  const {D,$,esc}=WI,E=D.env;
  $('wi-repro').innerHTML='<p>Everything above is rebuilt from files in the repository: <code>src/wire/</code> holds the server (<code>llm_server.py</code>, <code>serve.sh</code>, <code>make_ca.sh</code>), the clients (<code>wire_client.py</code>, <code>h3_client.py</code>, <code>hol_client.py</code>, <code>raw_h1.py</code>), the network emulator (<code>netem.py</code>, <code>hol.sh</code>), <code>run_all.sh</code> which reruns every capture into <code>raw/</code>, <code>build_data.py</code> which turns <code>raw/</code> into this tab\'s data, and <code>check_wire.py</code> which confirms the page shows exactly those files. The running example is defined in <code>src/wire/REQUEST.md</code>.</p>'+
    '<pre class="wrap">sh src/wire/run_all.sh &lt;scratch dir&gt;   # needs a venv with h2, hypercorn, aioquic\npython3 src/wire/build_data.py && sh src/build.sh && python3 src/wire/check_wire.py</pre>'+
    '<div class="tw"><table class="wi-t">'+['date_utc','machine','os','load_avg','python','python_ssl','hypercorn','curl','openssl_cli','dig'].map(k=>'<tr><td class="k">'+esc(k)+'</td><td>'+esc(E[k]||'')+'</td></tr>').join('')+'</table></div>'+
    '<h3>What this does not show</h3><ul class="tight"><li><b>No packet capture.</b> Capturing packets needs administrator rights, so TCP\'s SYN, SYN-ACK and ACK are timed around <code>connect()</code>, not seen; TCP and IP header sizes come from the standards. Everything above TCP (TLS records, HTTP/2 frames, QUIC packets) is recorded by our own clients, which see the bytes before the kernel does.</li>'+
    '<li><b>Loopback and Python.</b> On one laptop the "network" costs microseconds and Python costs milliseconds, so the loopback waterfall measures the software, and HTTP/3 in aioquic (pure Python) is slower than a production QUIC stack would be.</li>'+
    '<li><b>An emulated path is clean.</b> A fixed 25 ms each way, no jitter, no bandwidth limit, no congestion control at work, and a TCP loss simulated rather than real (section 4).</li>'+
    '<li><b>Public timings are one laptop, one day, one network</b> ('+esc(E.date_utc)+'), against hosts\' nearest servers; another place gives other numbers.</li>'+
    '<li><b>The server is a stand-in:</b> its pauses are fixed, a real model\'s are not, and the real API sends more event types (content_block_start, ping, message_delta, ...).</li></ul>';
})();
