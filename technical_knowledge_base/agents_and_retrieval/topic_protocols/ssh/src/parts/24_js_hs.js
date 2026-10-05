// ---- Section 1: one login, packet by packet, for four key exchanges (bars to scale), and the round-trip ladder.
(function(){
  const K=SSHD.kex;let mode='mlkem768x25519-sha256';
  const fig=document.getElementById('hs-fig'),cap=document.getElementById('hs-cap'),out=document.getElementById('hs-out');
  const SCALE=Math.max(...Object.values(K).flatMap(v=>v.packets.map(p=>p.bytes)));
  const fmt=n=>n.toLocaleString('en-GB');
  const short=s=>s.length>70?s.slice(0,70)+'…':s;
  function capFor(p,k){
    const who=p.dir==='c2s'?'The laptop':'The bastion';
    if(p.ev==='banner')return [who+' sends its identification string',RD.esc(p.name)+' ('+p.bytes+' bytes, plain text). Anyone on the path learns the software and version.'];
    if(p.ev==='encrypted_total')return [(p.dir==='c2s'?'Laptop to bastion':'Bastion to laptop')+': everything after NEWKEYS, encrypted',fmt(p.bytes)+' bytes: the service request, authentication (offer key, sign), one channel, the command and its exit status. An observer sees only sizes and timing.'];
    if(p.name==='KEXINIT')return [who+' sends KEXINIT ('+fmt(p.bytes)+' bytes)','Its key exchange list starts <code>'+RD.esc(short(p.kexlist))+'</code>. The client’s list also carries <code>ext-info-c</code> and <code>kex-strict-c-v00@openssh.com</code>, signals rather than algorithms (extension negotiation and the Terrapin fix).'];
    if(p.name.startsWith('KEX_ECDH_INIT')){const t={'mlkem768x25519-sha256':'a 32-byte X25519 public key plus a 1,184-byte ML-KEM-768 encapsulation key','sntrup761x25519-sha512':'a 32-byte X25519 public key plus an sntrup761 public key','curve25519-sha256':'one 32-byte X25519 public key','ecdh-sha2-nistp256':'one 65-byte P-256 public point'}[k];
      return ['The laptop sends its fresh public value ('+fmt(p.bytes)+' bytes)','For '+k+': '+t+'. Made for this connection only, then thrown away: that is forward secrecy.']}
    if(p.name.startsWith('KEX_ECDH_REPLY')){const t=k.startsWith('mlkem')?' its X25519 key and a 1,088-byte ML-KEM ciphertext':k.startsWith('sntrup')?' its X25519 key and an sntrup761 ciphertext':' its own public value';
      return ['The bastion replies ('+fmt(p.bytes)+' bytes)','It sends'+t+', its <b>host key</b>, and a signature with that host key over the exchange hash H. Both sides now hold the shared secret; the laptop checks the host key against known_hosts (section 3).']}
    if(p.name==='NEWKEYS')return [(p.dir==='c2s'?'The laptop':'The bastion')+' sends NEWKEYS','From the next packet this direction is encrypted (chacha20-poly1305 here). With strict key exchange the packet counter restarts at zero, which closes the Terrapin gap.'];
    return [p.name,''];
  }
  function draw(i){
    const P=K[mode].packets,w=Math.min(RD.width(fig),820),narrow=w<520;const lab=narrow?0:150,bw=w-lab-70,rh=narrow?34:24;let s='',plain=0,enc=0,kx=0;
    P.forEach((p,j)=>{const y=j*rh+4,on=j<=i,cur=j===i;const isEnc=p.ev==='encrypted_total';const len=Math.max(2,bw*p.bytes/SCALE);
      const x0=narrow?0:lab,yy=narrow?y+12:y;
      if(on){if(isEnc)enc+=p.bytes;else plain+=p.bytes;if(p.name.startsWith('KEX_ECDH'))kx+=p.bytes}
      const name=(p.dir==='c2s'?'→ ':'← ')+(p.ev==='banner'?'banner':isEnc?'encrypted (rest of login)':(/^(mlkem|sntrup)/.test(mode)?p.name.replace(/KEX_ECDH_(INIT|REPLY) \/ /,''):p.name.replace(/ \/ KEX_HYBRID_(INIT|REPLY)/,'')));
      s+=RD.t(narrow?0:lab-6,narrow?y+8:y+13,RD.esc(name),{fs:11,a:narrow?'start':'end',fill:on?'var(--ink)':'var(--dim)',w:cur?600:400});
      s+='<rect x="'+x0+'" y="'+(yy)+'" width="'+len+'" height="16" rx="3" fill="'+(isEnc?'var(--acc)':'var(--c5)')+'" opacity="'+(on?(cur?1:.75):.15)+'"/>';
      s+=RD.t(x0+len+5,yy+12,fmt(p.bytes)+' B',{fs:11,fill:on?'var(--ink)':'var(--dim)'});
    });
    fig.innerHTML=RD.svg(w,P.length*rh+8,s,'SSH login packets to scale, '+mode);
    const c=capFor(P[i],mode);cap.innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
    out.innerHTML=RD.stat('Plain-text bytes so far',fmt(plain),'visible to any observer')+RD.stat('Key exchange messages',fmt(kx)+' B','init + reply so far')+RD.stat('Encrypted bytes so far',fmt(enc),'sizes only')+RD.stat('Median login time',K[mode].median_ms+' ms','15 fresh logins, no added delay');
  }
  const A=RD.anim({card:'hs-card',ctl:'hs-ctl',n:K[mode].packets.length,draw,ms:1500,label:'Packet'});
  RD.seg(document.getElementById('hs-seg'),m=>{mode=m;A.reset(K[mode].packets.length);A.go(K[mode].packets.length-1)});
  RD.onResize(()=>A.redraw());
})();
// round-trip ladder from the 40 ms recording
(function(){
  const el=document.getElementById('rtt-fig');const E=SSHD.delay40;
  // group into rounds: a new round starts when a c2s packet follows a s2c one
  const rounds=[];let cur=null,last=null;E.forEach(e=>{if(!cur||(e.dir==='c2s'&&last==='s2c')){cur={ev:[]};rounds.push(cur)}cur.ev.push(e);last=e.dir});
  const LBL=['TCP connect, banners, server KEXINIT','client KEXINIT and key exchange, server NEWKEYS','client NEWKEYS, service request (ssh-userauth), accepted','authentication with method none: server lists methods','public key offered, server will accept it','signature sent, logged in','channel open (session), confirmed','command sent, exit status and channel close','client closes the connection'];
  function draw(){
    const w=Math.min(RD.width(el),760),narrow=w<520,T=Math.max(...E.map(e=>e.t))+10,H=narrow?420:360,top=24,ys=t=>top+(H-top-10)*t/T;
    const xl=narrow?40:90,xr=narrow?w*0.36:w*0.42;let s='';
    s+='<line x1="'+xl+'" y1="'+top+'" x2="'+xl+'" y2="'+H+'" stroke="var(--line)" stroke-width="2"/><line x1="'+xr+'" y1="'+top+'" x2="'+xr+'" y2="'+H+'" stroke="var(--line)" stroke-width="2"/>';
    s+=RD.t(xl,14,'laptop',{a:'middle',fs:11.5,w:600})+RD.t(xr,14,'bastion',{a:'middle',fs:11.5,w:600});
    for(let t=0;t<=T;t+=100){s+=RD.t(xl-6,ys(t)+4,t+' ms',{a:'end',fs:10,fill:'var(--mute)'})}
    E.forEach(e=>{const t=e.t;if(e.dir==='c2s'){s+='<line x1="'+xl+'" y1="'+ys(t)+'" x2="'+xr+'" y2="'+ys(t+3)+'" stroke="var(--c1)" stroke-width="1.6" marker-end="url(#ah1)"/>'}
      else{s+='<line x1="'+xr+'" y1="'+ys(Math.max(0,t-40))+'" x2="'+xl+'" y2="'+ys(t)+'" stroke="'+(e.ev==='encrypted'?'var(--acc)':'var(--c2)')+'" stroke-width="1.6" marker-end="url(#ah2)"/>'}});
    rounds.forEach((r,i)=>{const t0=r.ev[0].t,txt=(i+1)+'. '+(LBL[i]||'encrypted exchange'),fs=narrow?9.5:10.5,maxc=Math.floor((w-xr-12)/(fs*0.56));
      const words=txt.split(' ');let line='',ly=ys(t0)+4;words.forEach(wd=>{if((line+' '+wd).trim().length>maxc&&line){s+=RD.t(xr+8,ly,RD.esc(line.trim()),{fs});ly+=fs+2;line=wd}else line+=' '+wd});s+=RD.t(xr+8,ly,RD.esc(line.trim()),{fs})});
    s='<defs><marker id="ah1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--c1)"/></marker><marker id="ah2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--acc)"/></marker></defs>'+s;
    el.innerHTML=RD.svg(w,H+6,s,'Round trips of one SSH login with 40 ms added')+'<p class="small mute">'+rounds.length+' groups of packets, one round trip each (the first includes TCP setup). Laptop-to-bastion arrows are drawn at the time the relay saw them; bastion-to-laptop arrows start 40 ms earlier, where the added delay began. Labels 3 to 9 are inferred from order, sizes and the client\u2019s -vvv log, since that traffic is encrypted; the last group is one way.</p>';
  }
  draw();RD.onResize(draw);RD.onRender(draw);
})();
