// ---- Reading tab: number cards, prefix calculator, recorded outputs, measured charts ----
(function(){
  const NF=window.NF,esc=RD.esc,f=NFC.fmt;
  const $=id=>document.getElementById(id);
  const C1='var(--c1)',C2='var(--c2)',C3='var(--c3)',C4='var(--c4)',MU='var(--mute)';

  // twelve numbers
  const runs=NF.path.runs.filter(r=>!r.error);
  const conn=runs.map(r=>r.connect_ms);
  const q0=NF.quic.datagrams[0];
  const nums=[
    ['1 round trip','to open a TCP connection; measured '+f(Math.min(...conn),1)+' to '+f(Math.max(...conn),1)+' ms here','rd-life'],
    ['window / RTT','the most one connection can carry; 64 KB over 19 ms is 27.6 Mbit/s','rd-win'],
    ['65,535 bytes','largest window without the scaling option: 5.2 Mbit/s at 100 ms','rd-win'],
    ['10 segments','initial congestion window (RFC 6928)','rd-cc'],
    ['200 ms','Linux minimum retransmission timeout (1 s initial)','rd-rel'],
    ['3 duplicate ACKs','trigger fast retransmit','rd-rel'],
    ['40 ms','Linux minimum delayed ACK: the Nagle stall','rd-small'],
    ['60 s, 470 per s','Linux TIME_WAIT, and the new-connection rate it allows per destination','rd-life'],
    ['4,096','Linux somaxconn since 5.4 (this Mac: '+esc(NF.local.backlog.somaxconn)+')','rd-srv'],
    ['350 s','AWS NAT gateway idle timeout, against 2 h 11 min for default keepalive','rd-idle'],
    [f(NF.mtu.v4.path_mtu)+' bytes','path MTU measured from this laptop (Ethernet 1,500; IPv6 minimum 1,280)','rd-mtu'],
    [f(q0.bytes)+' bytes','QUIC client\'s first datagram, padded (measured)','rd-quic']];
  $('rd-nums').innerHTML=nums.map(n=>'<a class="stat" href="#'+n[2]+'" style="text-decoration:none;color:inherit"><div class="v">'+n[0]+'</div><div class="d">'+n[1]+'</div></a>').join('');

  // prefix calculator
  const RES=[['10.0.0.0/8','private (RFC 1918)'],['172.16.0.0/12','private (RFC 1918)'],['192.168.0.0/16','private (RFC 1918)'],['100.64.0.0/10','shared address space for carrier-grade NAT (RFC 6598)'],['169.254.0.0/16','link-local (RFC 3927); 169.254.169.254 is cloud instance metadata'],['127.0.0.0/8','loopback'],['224.0.0.0/4','multicast'],['0.0.0.0/8','"this network"']];
  function parse(s){const m=String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);if(!m)return null;
    const o=m.slice(1,5).map(Number);if(o.some(x=>x>255))return null;const p=m[5]==null?32:+m[5];if(p>32)return null;
    const ip=((o[0]*16777216)+(o[1]<<16>>>0)+(o[2]<<8)+o[3])>>>0;const size=Math.pow(2,32-p);const net=Math.floor(ip/size)*size;return {ip,p,net,last:net+size-1,size}}
  const dq=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255].join('.');
  function cidr(){const a=parse($('rd-cidr-a').value),b=parse($('rd-cidr-b').value);const out=$('rd-cidr-out');
    if(!a){out.innerHTML=RD.stat('Prefix','not a valid IPv4 prefix','write it as a.b.c.d/n');return}
    const cls=RES.filter(r=>{const x=parse(r[0]);return a.net>=x.net&&a.last<=x.last}).map(r=>r[1]);
    let h=RD.stat('Network',dq(a.net)+'/'+a.p,a.ip!==a.net?'you typed a host inside it':'')+RD.stat('Range',dq(a.net)+' to '+dq(a.last),'')+
      RD.stat('Addresses',f(a.size),'2^(32 &minus; '+a.p+')')+RD.stat('Kind',cls.length?esc(cls[0]):'public (globally routed)','');
    if(b){const ov=!(b.last<a.net||b.net>a.last);h+=RD.stat('Overlap with '+dq(b.net)+'/'+b.p,ov?'<span class="no">overlaps</span>':'<span class="ok">no overlap</span>',ov?'cannot be peered or routed side by side without renumbering':'safe to peer')}
    else if($('rd-cidr-b').value.trim())h+=RD.stat('Second prefix','not valid','');
    out.innerHTML=h}
  ['rd-cidr-a','rd-cidr-b'].forEach(id=>$(id).addEventListener('input',cidr));cidr();

  // TCP stream versus UDP datagrams
  const bd=NF.local.boundaries;
  $('rd-bound').textContent='three writes:   '+bd.writes.map(w=>JSON.stringify(w)).join(', ')+'\nTCP reads:      '+bd.tcp_reads.map(w=>JSON.stringify(w)).join(', ')+'   ('+bd.tcp_reads.length+' read)\nUDP reads:      '+bd.udp_reads.map(w=>JSON.stringify(w)).join(', ')+'   ('+bd.udp_reads.length+' reads)';

  // window over RTT: measured against predicted
  const label=b=>b==='auto'?'autotuned':f(b/1024)+' KB';
  const pred=r=>r.rcv_wnd*8/(r.srtt_ms/1000)/1e6;
  function winbars(){
    const el=$('rd-winbars');const groups=[16384,65536,262144,'auto'];
    const W=Math.max(280,Math.min(880,RD.width(el))),H=230,L=46,R=10,T=14,B=40,ymax=60;
    const gw=(W-L-R)/groups.length;const Y=v=>T+(1-Math.min(v,ymax)/ymax)*(H-T-B);let s='';
    NFC.ticks(0,ymax,4).forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+3.5,v,{a:'end',fs:10.5,fill:MU})});
    s+='<text x="12" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((T+H-B)/2)+')">Mbit/s</text>';
    groups.forEach((g,i)=>{const rs=runs.filter(r=>r.rcvbuf===g);const x0=L+i*gw;
      const pm=rs.reduce((a,r)=>a+pred(r),0)/rs.length,mm=rs.reduce((a,r)=>a+r.goodput_mbps,0)/rs.length;
      const bw=Math.min(34,gw*0.3);
      s+='<rect x="'+(x0+gw/2-bw-2)+'" y="'+Y(pm)+'" width="'+bw+'" height="'+(Y(0)-Y(pm))+'" fill="var(--c4)" opacity=".55"/>';
      if(pm>ymax)s+=RD.t(x0+gw/2-bw/2-2,T+10,f(pm,0)+'&#8593;',{a:'middle',fs:10,fill:C4});
      s+='<rect x="'+(x0+gw/2+2)+'" y="'+Y(mm)+'" width="'+bw+'" height="'+(Y(0)-Y(mm))+'" fill="var(--c1)"/>';
      rs.forEach((r,j)=>{s+='<circle cx="'+(x0+gw/2+2+bw*(j+1)/(rs.length+1))+'" cy="'+Y(r.goodput_mbps)+'" r="2.6" fill="var(--ink)"/>'});
      s+=RD.t(x0+gw/2,H-B+15,label(g),{a:'middle',fs:11});s+=RD.t(x0+gw/2,H-B+28,'window '+f(rs[0].rcv_wnd/1024,0)+' KB',{a:'middle',fs:10,fill:MU})});
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--mute)"/>';
    el.innerHTML=RD.svg(W,H,s,'Predicted window over RTT against measured goodput for four receive buffers')+
      '<div class="hmleg"><span><svg width="12" height="10"><rect width="12" height="10" fill="var(--c4)" opacity=".55"/></svg>predicted: window / smoothed RTT (mean of 3 runs)</span><span><svg width="12" height="10"><rect width="12" height="10" fill="var(--c1)"/></svg>measured goodput (mean; dots are the runs)</span></div>';
  }
  function wintab(){
    $('rd-wintab').innerHTML='<table><thead><tr><th>Buffer</th><th class="num">Window (B)</th><th class="num">Smoothed RTT</th><th class="num">RTT at end</th><th class="num">Predicted</th><th class="num">Measured</th><th class="num">Ratio</th></tr></thead><tbody>'+
      runs.map(r=>'<tr><td>'+label(r.rcvbuf)+'</td><td class="num">'+f(r.rcv_wnd)+'</td><td class="num">'+r.srtt_ms+' ms</td><td class="num">'+r.rttcur_ms+' ms</td><td class="num">'+f(pred(r),1)+'</td><td class="num">'+f(r.goodput_mbps,1)+'</td><td class="num">'+f(r.goodput_mbps/pred(r),2)+'</td></tr>').join('')+'</tbody></table>';
  }
  function wndplot(){
    const s=NF.path.series;const pts=s.wnd.map(p=>[p[0],p[1]/1024]);const xmax=Math.min(1600,pts[pts.length-1][0]);
    NFC.plot({el:$('rd-wndplot'),h:210,x:[0,xmax],y:[0,Math.ceil(Math.max(...pts.map(p=>p[1]))/200)*200],xl:'ms since the request was sent (first byte at '+f(s.first_byte_ms,0)+' ms)',yl:'KB',
      series:[{pts:pts.filter(p=>p[0]<=xmax),col:C3,label:'advertised receive window (tcpi_rcv_wnd), autotuned run 1'}]});
  }
  function loadplot(){
    const d=NF.loaded;const pts=d.pings.map(p=>[p[0],p[2]]);
    NFC.plot({el:$('rd-loadplot'),h:210,x:[0,Math.ceil(pts[pts.length-1][0])],y:[0,Math.ceil(Math.max(...pts.map(p=>p[1]))/10)*10],xl:'seconds',yl:'ping RTT (ms)',
      bands:[{x0:d.download.start_s,x1:d.download.end_s,col:'var(--c2)',label:'25 MB download, '+f(d.download.mbps,1)+' Mbit/s'}],
      hlines:[{y:d.idle_median_ms,col:C3,label:'idle median '+f(d.idle_median_ms,1)+' ms'},{y:d.loaded_median_ms,col:C2,label:'loaded median '+f(d.loaded_median_ms,1)+' ms'}],
      series:[{pts,col:C1,dots:true,w:1.2}]});
  }
  // TCP_NODELAY defaults
  const nd=NF.local.nodelay.tcp_nodelay;
  const ndl={asyncio_client:'asyncio client (open_connection)',asyncio_server_accepted:'asyncio server, accepted socket (start_server)',plain_socket_default:'plain socket.socket()'};
  $('rd-nodelay').innerHTML='<table><thead><tr><th>Socket (Python '+esc(NF.local.nodelay.python)+', macOS)</th><th>TCP_NODELAY</th></tr></thead><tbody>'+Object.keys(ndl).map(k=>'<tr><td>'+ndl[k]+'</td><td>'+(nd[k]?'<span class="ok">on</span>':'<span class="no">off (Nagle active)</span>')+'</td></tr>').join('')+'</tbody></table>';
  // accept queue
  const bl=NF.local.backlog;
  $('rd-backlog').innerHTML='<table><thead><tr><th>Client</th><th>connect()</th><th>send request</th><th>read reply</th></tr></thead><tbody>'+bl.clients.map(c=>{const ok=c.reply==='ok';
    return '<tr><td>'+c.client+'</td><td>'+(c.connect==='ok'?'<span class="ok">ok</span> '+c.connect_ms+' ms':'<span class="no">'+esc(c.connect)+'</span>')+'</td><td>'+(c.send?(c.send==='ok'?'ok':'<span class="no">'+esc(c.send)+'</span>'):'')+'</td><td>'+(c.reply?(ok?'<span class="ok">"ok" from the server</span>':'<span class="no">'+esc(c.reply)+'</span>'):'')+'</td></tr>'}).join('')+'</tbody></table><div class="small mute">listen(2), kern.ipc.somaxconn '+esc(bl.somaxconn)+'; the server accepted afterwards: '+bl.accepted_later.map(x=>'"'+esc(x)+'"').join(', ')+'.</div>';
  // path MTU probes
  function mtuplot(){
    const pr=NF.mtu.v4.probes.slice().sort((a,b)=>a.size-b.size);const ok=pr.filter(p=>p.ok),no=pr.filter(p=>!p.ok);
    NFC.plot({el:$('rd-mtuplot'),h:150,x:[1160,1480],y:[0,2],noy:true,xl:'ping payload, bytes (+28 = packet)',yl:'',
      vlines:[{x:NF.mtu.v4.largest_payload,col:C3,label:'largest passing: '+NF.mtu.v4.largest_payload}],
      marks:ok.map(p=>({x:p.size,y:1.3,col:C3})).concat(no.map(p=>({x:p.size,y:0.7,col:C2,shape:'x'}))),
      series:[]});
    const el=$('rd-mtuplot');el.insertAdjacentHTML('beforeend','<div class="hmleg"><span style="color:var(--c3)">&#9679; reply received</span><span style="color:var(--c2)">&#10005; dropped ('+no.length+' probes: "frag needed" from the router, or refused locally above 1,472)</span></div>');
    const first=pr.find(p=>!p.ok&&/frag needed/.test(p.out));
    $('rd-mtuicmp').textContent=first?('$ '+first.cmd+'\n'+first.out.split('\n').slice(0,2).join('\n')):'';
  }
  // UDP drops
  function udpdrop(){const u=NF.local.udp_overflow.runs;
    NFC.bars($('rd-udpdrop'),[].concat(...u.map(r=>[{name:f(r.so_rcvbuf_effective/1024)+' KB buffer: received',v:r.received,col:C3,txt:f(r.received)},{name:f(r.so_rcvbuf_effective/1024)+' KB buffer: dropped',v:r.lost,col:C2,txt:f(r.lost)}])),5000);
    $('rd-udpdrop').insertAdjacentHTML('beforeend','<div class="small mute">Of '+f(u[0].sent)+' datagrams each run. The kernel\'s "dropped due to full socket buffers" counter rose by exactly the number lost ('+u.map(r=>f(r.kernel_counter_delta)).join(' and ')+').</div>')}
  const draws=[winbars,wintab,wndplot,loadplot,mtuplot,udpdrop];
  const all=()=>draws.forEach(d=>{try{d()}catch(e){window.__jsErr&&__jsErr('chart: '+e.message)}});
  RD.onRender(all);RD.onResize(all);all();
})();
