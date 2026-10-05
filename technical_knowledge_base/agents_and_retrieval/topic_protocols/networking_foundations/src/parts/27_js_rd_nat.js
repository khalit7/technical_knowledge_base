// ---- Reading section 9: a NAT gateway forgets an idle connection (before) or keepalive keeps it (after) ----
// Addresses are documentation ranges (RFC 1918 private, RFC 5737 public examples). Timer: AWS NAT gateway, 350 s idle.
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-nat-card'))return;const esc=RD.esc;
  let mode='off';
  const POD='10.0.1.23:41000',PUB='198.51.100.7:1024',API='203.0.113.10:443';
  // step: {t, title, text, arrows:[{a,b,lab,col}], entry: 'new'|'live'|'gone'|null, last}
  function steps(){
    const ka=mode==='on';const S=[];
    S.push({t:0,title:'The pod opens a connection',text:'The SYN leaves the pod from '+POD+'. The NAT gateway rewrites the source to its public address and a free port, '+PUB+', and writes the mapping into its table.',arrows:[['pod','nat','SYN from '+POD],['nat','api','SYN from '+PUB]],entry:'new',last:0});
    S.push({t:2,title:'The request streams, the mapping is in use',text:'Every packet in either direction refreshes the entry. The response streams back through the same mapping, rewritten to '+POD+'.',arrows:[['api','nat','tokens to '+PUB],['nat','pod','tokens to '+POD]],entry:'live',last:2});
    S.push({t:2,title:'The client returns the connection to its pool',text:'Nothing is sent now. TCP has no idea anything is wrong: both ends still hold an ESTABLISHED socket.',arrows:[],entry:'live',last:2});
    if(ka)S.push({t:302,title:'Keepalive probe at 300 s idle',text:'The socket was configured with TCP_KEEPIDLE = 300 s (below the gateway\'s 350 s). The kernel sends an empty probe; the server\'s kernel acknowledges it; the mapping is refreshed. Neither program did anything.',arrows:[['pod','nat','keepalive probe'],['nat','api','probe'],['api','nat','ACK'],['nat','pod','ACK']],entry:'live',last:302});
    else S.push({t:302,title:'300 s of silence',text:'Default keepalive would wait 7,200 s; this socket has none. The mapping ages.',arrows:[],entry:'live',last:2});
    if(ka)S.push({t:352,title:'350 s after the request: the mapping is only 50 s old',text:'The gateway\'s timer counts from the last packet, which was the probe.',arrows:[],entry:'live',last:302});
    else S.push({t:352,title:'350 s idle: the gateway deletes the mapping',text:'The NAT gateway times out the connection after 350 s of idleness. It tells neither end.',arrows:[],entry:'gone',last:2});
    if(ka)S.push({t:362,title:'The pooled connection is reused: it works',text:'The next request goes out on the same connection, through the same mapping, with no new handshake.',arrows:[['pod','nat','request'],['nat','api','request'],['api','nat','tokens'],['nat','pod','tokens']],entry:'live',last:362});
    else S.push({t:362,title:'The pooled connection is reused: reset',text:'The request reaches the gateway, which has no mapping for it, and answers with a reset (AWS documents RST, not FIN). The client sees "Connection reset by peer" (ECONNRESET), and must open a new connection: a new handshake, a new TLS handshake, and a retry it hopefully knows is safe.',arrows:[['pod','nat','request'],['nat','pod','RST','bad']],entry:'gone',last:2});
    S.push({t:362,title:ka?'After':'Before',text:ka?'Fix: keepalive (or an application ping) more often than the shortest idle timer on the path, or a pool that discards connections idle longer than it. Both are cheap; the failure they prevent shows up only in production, after quiet periods.':'This is the shape of "works in testing, fails after lunch": only connections idle longer than a middlebox timer break, and the error blames the peer.',arrows:[],entry:ka?'live':'gone',last:ka?362:2});
    return S;
  }
  let S=steps();
  function draw(i){
    const st=S[i];const el=$('rd-nat-svg');const W=Math.max(280,Math.min(760,RD.width(el))),H=150;
    const xs={pod:Math.min(60,W*0.13),nat:W/2,api:W-Math.min(60,W*0.13)};let s='';
    [['pod','Pod','10.0.1.23'],['nat','NAT gateway','198.51.100.7'],['api','API','203.0.113.10']].forEach(b=>{const x=xs[b[0]],bw=Math.min(110,W*0.26);
      s+='<rect x="'+(x-bw/2)+'" y="8" width="'+bw+'" height="34" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x,23,b[1],{a:'middle',fs:11.5,w:600})+RD.t(x,36,b[2],{a:'middle',fs:10,fill:'var(--mute)'})});
    st.arrows.forEach((a,k)=>{const x0=xs[a[0]],x1=xs[a[1]],y=58+k*22;const col=a[3]==='bad'?'var(--bad)':'var(--acc)';const dx=x1>x0?-7:7;
      s+='<line x1="'+x0+'" y1="'+y+'" x2="'+x1+'" y2="'+y+'" stroke="'+col+'" stroke-width="2"/><path d="M'+x1+' '+y+'l'+dx+' -4l0 8z" fill="'+col+'"/>'+RD.t((x0+x1)/2,y-4,esc(a[2]),{a:'middle',fs:W<420?9.5:10.5,fill:col})});
    s+=RD.t(W/2,H-6,'t = '+st.t+' s since the connection opened',{a:'middle',fs:11,fill:'var(--mute)'});
    const idle=st.t-st.last;
    const row=st.entry==='gone'?'<tr><td colspan="4" class="no">(no entry: deleted after 350 s idle)</td></tr>':
      '<tr'+(st.entry==='new'?' style="background:var(--hl)"':'')+'><td>'+POD+'</td><td>'+PUB+'</td><td>'+API+'</td><td class="num">'+idle+' s</td></tr>';
    el.innerHTML=RD.svg(W,H,s,'NAT gateway step')+'<div class="tw"><table><thead><tr><th>Inside (pod)</th><th>Outside (public)</th><th>Destination</th><th class="num">Idle</th></tr></thead><tbody>'+row+'</tbody></table></div>';
    $('rd-nat-cap').innerHTML='<div class="t">'+(i+1)+' of '+S.length+'. '+esc(st.title)+'</div><p>'+esc(st.text)+'</p>';
  }
  const h=RD.anim({card:'rd-nat-card',ctl:'rd-nat-ctl',n:S.length,draw,ms:2600,label:'NAT step'});
  RD.seg($('rd-nat-seg'),m=>{mode=m;S=steps();h.reset(S.length);h.play()});
  RD.onResize(()=>h.redraw());
})();
