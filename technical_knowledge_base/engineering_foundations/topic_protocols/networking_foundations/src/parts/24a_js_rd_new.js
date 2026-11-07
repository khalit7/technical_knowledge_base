// ---- Reading tab, 2D figures: the 5-tuple, traceroute stepper (step list sx-tr), round-trip budget (a slider widget). The hero is the 3D stage in 41_js_sc_hero.js ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-tuple'))return;
  const F=NFC.fmt,T=RD.t;
  const CI='var(--c2)',CT='var(--acc)',CP='var(--c3)';
  // the 5-tuple: three connections from one client to one server port
  function tuple(){
    const el=$('rd-tuple');const W=Math.max(280,Math.min(760,RD.width(el)));const bw=Math.min(150,W*0.27),H=168;let s='';
    s+='<rect x="2" y="24" width="'+bw+'" height="124" rx="6" class="box" fill="var(--soft)" stroke="var(--line)"/>'+T(2+bw/2,16,'client',{a:'middle',fs:12,w:600})+T(2+bw/2,92,'192.0.2.10',{a:'middle',fs:11});
    s+='<rect x="'+(W-2-bw)+'" y="24" width="'+bw+'" height="124" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+T(W-2-bw/2,16,'server',{a:'middle',fs:12,w:600})+T(W-2-bw/2,84,'203.0.113.5',{a:'middle',fs:11})+T(W-2-bw/2,100,'port 443',{a:'middle',fs:11,fill:'var(--c2)',w:600});
    [51234,51235,51236].forEach((p,i)=>{const y=48+i*38;const x0=2+bw,x1=W-2-bw;
      s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+x1+' '+y+'l-7 -4v8z" fill="var(--mute)"/>';
      s+=T(x0+4,y-5,'src port ',{fs:11,fill:'var(--mute)'})+T(x0+4+(W<480?48:52),y-5,String(p),{fs:11,fill:CT,w:600})+T(x1-4,y+14,'TCP, dst 443',{a:'end',fs:11,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'Three TCP connections between the same client address and server port, told apart only by the source port');
  }
  // traceroute: TTL 1, 2, 3, 4
  const NODES=[['laptop','192.0.2.10'],['router','192.0.2.1'],['ISP','198.51.100.1'],['transit','198.51.100.9'],['server','203.0.113.5']];
  const TR=[
    ['Send probes with TTL 1, 2, 3...','traceroute sends a probe whose TTL is 1, then 2, and so on. Each router subtracts one before forwarding; whoever brings it to zero drops it and says so.',0],
    ['TTL 1 dies at the first router','The home router decrements 1 to 0, drops the probe and sends ICMP "time exceeded" from its own address: line 1 of the output is 192.0.2.1.',1],
    ['TTL 2 dies one hop further','The first router forwards it with TTL 1; the ISP router takes it to 0 and replies. Each line of traceroute is a different probe, so the hops can come from different paths.',2],
    ['TTL 3: the transit router names itself','Each reply also gives a round-trip time to that hop. A router that is busy may answer ICMP slowly or not at all, which shows as * without any loss to real traffic.',3],
    ['TTL 4 reaches the server','The probe arrives with TTL 1 left; the destination answers instead of a router (an echo reply, or "port unreachable" for UDP probes), and traceroute stops. mtr repeats this continuously and counts loss per hop: loss that starts at a hop and continues to the end is real.',4]];
  function trDraw(i){
    const el=$('rd-tr-svg');const W=Math.max(280,Math.min(820,RD.width(el)));const n=NODES.length,L=40,R=40,dx=(W-L-R)/(n-1),y=74,H=140;let s='';
    for(let k=0;k<n-1;k++)s+='<line x1="'+(L+k*dx)+'" x2="'+(L+(k+1)*dx)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)" stroke-width="2"/>';
    const hop=TR[i][2];
    if(hop>0){s+='<line x1="'+L+'" x2="'+(L+hop*dx)+'" y1="'+(y-8)+'" y2="'+(y-8)+'" stroke="'+CT+'" stroke-width="2"/><path d="M'+(L+hop*dx-2)+' '+(y-8)+'l-7 -4v8z" fill="'+CT+'"/>';
      s+='<line x1="'+(L+hop*dx)+'" x2="'+L+'" y1="'+(y+8)+'" y2="'+(y+8)+'" stroke="var(--c2)" stroke-width="1.5" stroke-dasharray="5 3"/><path d="M'+(L+2)+' '+(y+8)+'l7 -4v8z" fill="var(--c2)"/>';
      s+=T(L+hop*dx/2,y-14,'probe, TTL '+hop,{a:'middle',fs:11,fill:CT,w:600})+T(L+hop*dx/2,y+24,hop<4?'ICMP time exceeded':'reply from the server',{a:'middle',fs:11,fill:'var(--c2)'})}
    NODES.forEach((nd,k)=>{const x=L+k*dx;const on=k===hop&&hop>0;s+='<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+(on?CT:'var(--soft)')+'" stroke="var(--mute)"/>';
      const up=k%2===0;s+=T(x,up?y-28:y+42,nd[0],{a:'middle',fs:11,w:600})+T(x,up?y-28+(-13):y+55,nd[1],{a:'middle',fs:11,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'traceroute step '+(i+1));
    const out=TR.slice(1,i+1).map((t,k)=>' '+(k+1)+'  '+NODES[k+1][1]).join('\n');
    $('rd-tr-out').textContent='$ traceroute 203.0.113.5\n'+(out||' (waiting for the first reply)');
  }
  const tr=RD.anim({card:'rd-tr-card',ctl:'rd-tr-ctl',n:TR.length,draw:trDraw,ms:4200,label:'traceroute step',list:'sx-tr'});
  // round-trip budget before the first response byte
  const CASES=[['New TCP + TLS 1.3 connection',[['TCP',CI],['TLS',CT],['request',CP]]],['Pooled (reused) connection',[['request',CP]]],['New QUIC connection',[['QUIC + TLS',CT],['request',CP]]],['QUIC 0-RTT (returning client)',[['request',CP]]]];
  function rtt(){
    const el=$('rd-rtt-svg');const r=+$('rd-rtt').value;$('rd-rtt-v').textContent=r+' ms';
    const W=Math.max(280,Math.min(880,RD.width(el)));const L=4,R=60,max=600,sc=(W-L-R)/max;const rowH=46;let s='';
    CASES.forEach((c,i)=>{const y=i*rowH+18;s+=T(L,y,c[0],{fs:11.5,w:600});let x=L;
      c[1].forEach(seg=>{const w=r*sc;s+='<rect x="'+x+'" y="'+(y+5)+'" width="'+w+'" height="18" fill="'+seg[1]+'" stroke="var(--bg)" opacity=".9"/>';
        if(w>(seg[0].length*6.5+8))s+=T(x+w/2,y+18,seg[0],{a:'middle',fs:11,fill:'var(--bg)',w:600});x+=w});
      s+=T(x+5,y+18,F(r*c[1].length)+' ms',{fs:11.5,w:600})});
    el.innerHTML=RD.svg(W,CASES.length*rowH+6,s,'Round trips before the first response byte for four kinds of connection');
  }
  $('rd-rtt').addEventListener('input',()=>{$('rd-rtt-pre').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.v===+$('rd-rtt').value));rtt()});
  $('rd-rtt-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('rd-rtt').value=b.dataset.v;$('rd-rtt').dispatchEvent(new Event('input'))});
  const all=()=>{tuple();rtt();tr.redraw()};
  RD.onRender(all);RD.onResize(all);all();
})();
