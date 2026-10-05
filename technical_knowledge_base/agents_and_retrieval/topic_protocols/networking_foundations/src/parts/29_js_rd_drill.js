// ---- Reading section 16: predict, then reveal. Each drill checks the choice and explains with the page's numbers. ----
(function(){
  const el=document.getElementById('rd-drills');if(!el)return;const esc=RD.esc;
  const r16=NF.path.runs.filter(r=>r.rcvbuf===16384&&!r.error);
  const g16=(r16.reduce((a,r)=>a+r.goodput_mbps,0)/r16.length).toFixed(1);
  const D=[
    {q:'A client pins SO_RCVBUF to 64 KB. The server is 100 ms away on a 10 Gbit/s path with no loss. Roughly what throughput will one connection get?',
     o:['About 10 Gbit/s','About 5 Mbit/s','About 640 Mbit/s','It depends only on the congestion window'],a:1,
     e:'Window over RTT: 65,536 &times; 8 / 0.1 s = 5.2 Mbit/s, whatever the link. Pinning the buffer also turned off autotuning. On this page\'s home line a 16 KB request ran at '+g16+' Mbit/s over a 19 ms path, as the same rule predicts.',s:'rd-win'},
    {q:'Your laptop\'s pings with 1,472 bytes of payload and Don\'t Fragment get "frag needed and DF set (MTU 1492)" from the home router. What is the largest payload that will pass?',
     o:['1,472','1,464','1,452','1,280'],a:1,e:'1,492 &minus; 20 (IPv4 header) &minus; 8 (ICMP header) = 1,464, which is what the binary search on this page found.',s:'rd-mtu'},
    {q:'A Python script calls an embedding API 1,000 times per second, opening a new connection each time, to one IP and port, from one Linux host with default settings. What breaks first?',
     o:['The API rate limit','Ephemeral ports: EADDRNOTAVAIL','The accept queue','Nothing; Linux reuses ports immediately'],a:1,
     e:'Each closed connection holds its port in TIME_WAIT for 60 s: 28,232 ports / 60 s &asymp; 470 new connections per second to one destination. Use a connection pool.',s:'rd-life'},
    {q:'A streaming endpoint sends one token every 50 ms to a client 100 ms away, with Nagle on. What does the client see?',
     o:['Tokens every 50 ms, shifted by 50 ms','Tokens in clumps, roughly one clump per round trip','Nothing until the stream ends','Exactly the same as with TCP_NODELAY'],a:1,
     e:'Nagle holds each small write while earlier data is unacknowledged; the ACK takes a round trip (plus any delayed ACK), so tokens accumulate and leave together.',s:'rd-small'},
    {q:'Seven of eight clients\' connect() calls succeed against a server whose listen backlog is full (macOS, this page\'s run). How many got an answer?',
     o:['Seven','Eight','Two','None'],a:2,e:'Only the two connections in the accept queue were served; the rest learned they had been dropped when they wrote or read. A successful connect does not mean the server will answer.',s:'rd-srv'},
    {q:'A pod\'s pooled connection to an external API through an AWS NAT gateway fails with "connection reset" after 6 idle minutes. Which fix works?',
     o:['Raise tcp_rmem','TCP keepalive every 300 s on that socket','Set TCP_NODELAY','Increase somaxconn'],a:1,
     e:'The gateway drops mappings idle for 350 s and answers later packets with RST. Probes (or app pings) every 300 s keep the mapping alive; default keepalive (7,200 s) is far too slow.',s:'rd-idle'},
    {q:'A QUIC client moves from Wi-Fi to mobile data mid-request. What does the server do with the next packet from the new address?',
     o:['Drops it: different 5-tuple','Sends RST','Recognises the connection ID, validates the new path, continues','Asks the client to redo the TLS handshake'],a:2,
     e:'QUIC names connections by connection IDs; the server sends PATH_CHALLENGE to the new address and keeps going. This page recorded it: both replies arrived on one connection.',s:'rd-quic'},
    {q:'A UDP receiver with a 64 KB buffer is busy for a moment while 5,000 datagrams of 1,200 bytes arrive. Roughly how many survive?',
     o:['All 5,000: the kernel queues them','About 50','About half','None'],a:1,
     e:'64 KB holds only a few dozen 1,200-byte datagrams (plus per-packet overhead); the measured run kept '+NF.local.udp_overflow.runs[0].received+' and the kernel counted '+NF.local.udp_overflow.runs[0].lost+' drops. UDP has no window to slow the sender.',s:'rd-udp'}];
  el.innerHTML=D.map((d,i)=>'<div class="drill" data-i="'+i+'"><div class="dq">'+(i+1)+'. '+d.q+'</div><div class="dopts">'+d.o.map((o,j)=>'<button data-j="'+j+'">'+o+'</button>').join('')+'</div><div class="dans" hidden></div></div>').join('');
  el.addEventListener('click',ev=>{const b=ev.target.closest('button[data-j]');if(!b)return;const box=b.closest('.drill');const d=D[+box.dataset.i];const j=+b.dataset.j;
    box.querySelectorAll('button[data-j]').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.j===d.a)x.classList.add('right')});if(j!==d.a)b.classList.add('wrong');
    const a=box.querySelector('.dans');a.hidden=false;a.innerHTML=(j===d.a?'<span class="ok">Right.</span> ':'<span class="no">Not quite.</span> ')+d.e+' <a href="#'+d.s+'">Section</a>';});
})();
