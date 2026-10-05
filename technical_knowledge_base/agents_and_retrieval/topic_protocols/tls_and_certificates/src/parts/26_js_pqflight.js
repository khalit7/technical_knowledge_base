// ---- Reading section 8: before/after animation, the server's first flight against TCP's initial window ----
// Packets of 1,460 bytes of TLS payload; TCP may send 10 before the first acknowledgement returns (RFC 6928).
(function(){
  const D=window.D,fmt=TLS.fmt,MSS=1460,IW=10;
  const MODES=[['tls13','ECDSA P-256 (today)'],['rsa','RSA-2048'],['mldsa44','ML-DSA-44'],['mldsa65','ML-DSA-65']];
  const PART=['ServerHello','ChangeCipherSpec','EncryptedExtensions','Certificate','CertificateVerify','Finished'];
  const COL={ServerHello:'var(--c5)',ChangeCipherSpec:'var(--dim)',EncryptedExtensions:'var(--c6)',Certificate:'var(--c1)',CertificateVerify:'var(--c2)',Finished:'var(--c3)'};
  document.getElementById('fl-mode').innerHTML=MODES.map((m,i)=>'<button data-m="'+m[0]+'"'+(i===0?' class="on"':'')+'>'+m[1]+'</button>').join('');
  let mode='tls13';
  function model(m){
    const F=D.flight[m],segs=[];let off=0;
    PART.forEach(p=>{if(F.parts[p]){segs.push({p,a:off,b:off+F.parts[p]});off+=F.parts[p]}});
    const n=Math.ceil(F.total/MSS),steps=[];
    for(let k=1;k<=n;k++){if(k===IW+1)steps.push({wait:true,k:IW});steps.push({k})}
    return {F,segs,n,steps};
  }
  let M=model(mode);
  const fig=document.getElementById('fl-fig'),cap=document.getElementById('fl-cap'),st=document.getElementById('fl-stats');
  function box(i,on){
    const a=i*MSS,b=Math.min((i+1)*MSS,M.F.total);
    const inner=M.segs.filter(s=>s.b>a&&s.a<b).map(s=>'<span title="'+s.p+'" style="flex:'+(Math.min(s.b,b)-Math.max(s.a,a))+';background:'+COL[s.p]+'"></span>').join('');
    return '<div style="border:1px solid var(--line);border-radius:4px;height:26px;display:flex;overflow:hidden;opacity:'+(on?1:.15)+';width:'+(100*(b-a)/MSS).toFixed(1)+'%">'+inner+'</div>';
  }
  function draw(i){
    const s=M.steps[i],sent=s.k,rows=Math.max(2,Math.ceil(M.n/IW));
    let h='<div class="small mute" style="margin:4px 0">Each box is one TCP segment of up to 1,460 bytes; the first row is the initial window of 10.</div>';
    for(let r=0;r<rows;r++){
      h+='<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span class="small mute" style="width:5.4em;flex:none">'+(r===0?'round trip 1':'round trip '+(r+1))+'</span><div style="display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px;flex:1">';
      for(let c=0;c<IW;c++){const k=r*IW+c;h+=k<M.n?'<div style="display:flex">'+box(k,k<sent)+'</div>':'<div></div>'}
      h+='</div></div>';
    }
    h+='<div class="lg">'+PART.filter(p=>M.F.parts[p]).map(p=>'<span><svg width="10" height="10"><rect width="10" height="10" fill="'+COL[p]+'"/></svg>'+p+' '+fmt(M.F.parts[p])+' B</span>').join('')+'</div>';
    fig.innerHTML=h;
    const rt=sent>IW||(s.wait)?2:1;
    let t,p;
    if(s.wait){t='Window full: wait one round trip';p='The server has sent 10 segments and must wait for the client\'s acknowledgement before sending more. The handshake cannot finish until the rest arrives: this is the extra round trip.'}
    else if(sent===M.n){t='Flight complete: '+fmt(M.F.total)+' bytes in '+M.n+' segment'+(M.n>1?'s':'');p=M.n<=IW?'Everything fits in the first window: the handshake still takes one round trip.':'The flight needed a second round trip of the congestion window, on every new connection.'}
    else{t='Segment '+sent+' of '+M.n;p=sent===1?'ServerHello and its 1,120-byte hybrid key share fill most of the first segment.':'Certificate chain ('+M.F.chain.map(fmt).join(' + ')+' bytes of certificates) and the '+fmt(M.F.sig)+'-byte CertificateVerify signature.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    st.innerHTML=RD.stat('Server first flight',fmt(M.F.total)+' B','measured, record headers included')+RD.stat('Certificate message',fmt(M.F.parts.Certificate)+' B','leaf + intermediate')+RD.stat('Segments needed',M.n,'initial window: '+IW)+RD.stat('Round trips for this flight',sent<=IW&&!s.wait&&M.n<=IW?'1':(sent>IW||s.wait?'2':'1 so far'),M.n>IW?'one more than ECDSA':'');
  }
  const a=RD.anim({card:'fl-card',ctl:'fl-ctl',n:M.steps.length,draw,ms:900,label:'Segment'});
  RD.seg(document.getElementById('fl-mode'),m=>{mode=m;M=model(m);a.reset(M.steps.length);a.play()});
})();
