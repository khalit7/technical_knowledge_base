// ---- Reading section 2: before/after animation, what a passive observer sees in TLS 1.2 and TLS 1.3 ----
(function(){
  const D=window.D,fmt=TLS.fmt;
  const model={};
  ['tls12','tls13'].forEach(m=>{model[m]=TLS.flights(D.hs[m].recs,m==='tls13')});
  let mode='tls13';
  function caption(m,f,i,fls){
    const names=f.items.map(x=>x.t);
    const has=n=>names.some(x=>x.indexOf(n)===0);
    const reqIdx=fls.findIndex(g=>g.d==='c2s'&&g.items.some(x=>/HTTP request/.test(x.t)));
    const rtts=fls.slice(0,reqIdx).filter(g=>g.d==='s2c').length;
    if(has('ClientHello'))return ['Client: ClientHello, in clear','Server name api.llm.test, ALPN http/1.1, the cipher suites and two key shares (hybrid post-quantum and X25519). Anyone on the path reads all of it. Same bytes in both versions: it is the same client.'];
    if(m==='tls13'&&has('ServerHello'))return ['Server: ServerHello in clear, everything else already encrypted','The ServerHello carries the chosen suite and the server\'s key share; from it both sides derive handshake keys. EncryptedExtensions, the Certificate, CertificateVerify and Finished follow encrypted: the observer sees five records labelled application_data and their sizes.'];
    if(m==='tls12'&&has('ServerHello'))return ['Server: ServerHello, Certificate, ServerKeyExchange, ServerHelloDone, all in clear','The observer reads the certificate (subject CN=api.llm.test, issuer, validity) and the server\'s signed key-exchange parameters. Nothing is encrypted yet, and the client still cannot send the request.'];
    if(m==='tls12'&&has('ClientKeyExchange'))return ['Client: ClientKeyExchange in clear, then ChangeCipherSpec and an encrypted Finished','The client\'s half of the key exchange. It must now wait for the server\'s Finished before sending any request: the second round trip.'];
    if(m==='tls12'&&has('NewSessionTicket'))return ['Server: session ticket in clear, ChangeCipherSpec, encrypted Finished','Handshake complete after two round trips. In TLS 1.2 even the session ticket is visible.'];
    if(f.d==='c2s'&&names.some(x=>/HTTP request/.test(x)))return ['Client: the request, encrypted','The 277-byte HTTP request travels in one encrypted record. TLS round trips spent before it could leave: '+rtts+'.'+(m==='tls13'?' In TLS 1.3 it shares the burst with the client\'s Finished.':'')];
    if(f.stream)return ['Server: one encrypted record per token','The observer cannot read the tokens but sees one record per token, its size and timing (about 50 ms apart): the rhythm of generation.'];
    if(f.d==='s2c')return ['Server: '+(has('NewSessionTicket')?'a session ticket and ':'')+'the response begins','The response head and the first event, encrypted.'+(has('NewSessionTicket')?' The ticket allows a resumed handshake next time (section 3).':'')];
    return ['Step '+(i+1),''];
  }
  const st=document.getElementById('obs-stats'),fig=document.getElementById('obs-fig'),cap=document.getElementById('obs-cap');
  function draw(i){
    const fls=model[mode];i=Math.min(i,fls.length-1);
    TLS.render(fig,fls,i,{collapse:true});
    const c=caption(mode,fls[i],i,fls);
    cap.innerHTML='<div class="t">'+(i+1)+'/'+fls.length+'. '+c[0]+'</div><p>'+c[1]+'</p>';
    const upto=fls.slice(0,i+1);
    const sent=upto.reduce((a,f)=>a+f.bytes,0),vis=upto.reduce((a,f)=>a+f.items.filter(x=>x.vis).reduce((b,x)=>b+x.n,0),0);
    const certVis=upto.some(f=>f.items.some(x=>x.vis&&x.t==='Certificate'));
    const reqIdx=fls.findIndex(g=>g.d==='c2s'&&g.items.some(x=>/HTTP request/.test(x.t)));
    const rtts=fls.slice(0,Math.min(i,reqIdx)+1).filter(g=>g.d==='s2c').length;
    st.innerHTML=RD.stat('Bytes on the wire so far',fmt(sent),'both directions')+RD.stat('Readable by an observer',fmt(vis)+' B',(100*vis/sent).toFixed(0)+'% of bytes so far')+
      RD.stat('Certificate readable?',certVis?'<span class="no">yes</span>':'no',certVis?'subject, issuer, dates':'')+
      RD.stat('TLS round trips before the request',i>=reqIdx?String(fls.slice(0,reqIdx).filter(g=>g.d==='s2c').length):'waiting ('+rtts+' so far)',mode==='tls13'?'TLS 1.3: one':'TLS 1.2: two');
  }
  const a=RD.anim({card:'obs-card',ctl:'obs-ctl',n:model[mode].length,draw,ms:2200,label:'Handshake step'});
  RD.seg(document.getElementById('obs-mode'),m=>{mode=m;a.reset(model[m].length);a.play()});
})();
