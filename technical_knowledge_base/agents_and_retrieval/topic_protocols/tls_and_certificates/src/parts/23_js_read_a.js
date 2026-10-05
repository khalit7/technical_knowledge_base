// ---- Reading: shared flight model, the one-screen figure, small numbers, DH toy, tables ----
window.TLS=(function(){
  const esc=RD.esc,fmt=n=>Number(n).toLocaleString('en-US');
  const LOCK='<svg viewBox="0 0 9 10" aria-hidden="true"><rect x="0.5" y="4.5" width="8" height="5" rx="1" fill="currentColor"/><path d="M2.3 4.5V3a2.2 2.2 0 0 1 4.4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  // a record as chips: what is inside, readable or encrypted
  function items(r,tls13){
    const out=[];
    if(r.o==='change_cipher_spec'){out.push({t:'ChangeCipherSpec',n:r.n+5,vis:true,cc:true});return out}
    if(r.m&&r.m.length){
      r.m.forEach(m=>out.push({t:m.t,n:m.v?m.n:r.n+5,vis:!!m.v,m}));
      return out}
    if(r.o==='application_data'&&r.i==='application_data')return [{t:(r.d==='c2s'?'HTTP request':'response'),n:r.n+5,vis:false,app:r.a}];
    if(r.o==='application_data'&&!tls13)return [{t:(r.d==='c2s'?'HTTP request':'response'),n:r.n+5,vis:false,app:r.n-24}];
    if(r.o==='handshake'&&!tls13)return [{t:'Finished',n:r.n+5,vis:false}];
    return [{t:r.o,n:r.n+5,vis:false}];
  }
  // consecutive records in one direction form a flight; the token stream is split off as its own group
  function flights(recs,tls13){
    const fl=[];let cur=null;
    recs.forEach(r=>{
      if(!cur||cur.d!==r.d||(r.t-cur.t0>20)){cur={d:r.d,t0:r.t,recs:[],items:[]};fl.push(cur)}
      cur.recs.push(r);items(r,tls13).forEach(x=>cur.items.push(x));
    });
    fl.forEach(f=>{f.bytes=f.recs.reduce((a,r)=>a+r.n+5,0);f.visBytes=f.items.filter(x=>x.vis).reduce((a,x)=>a+x.n,0)});
    // merge the per-token flights into one "stream" group
    const out=[];fl.forEach(f=>{const last=out[out.length-1];
      if(last&&last.stream&&f.d==='s2c'){last.recs=last.recs.concat(f.recs);last.items=last.items.concat(f.items);last.bytes+=f.bytes;return}
      if(f.d==='s2c'&&out.length&&out[out.length-1].d==='s2c'){f.stream=true}
      out.push(f)});
    return out;
  }
  function chip(x){
    if(x.cc)return '<span class="chip cc" title="compatibility record, no content">CCS</span>';
    return '<span class="chip '+(x.vis?'vis':'enc')+'" title="'+(x.vis?'readable by anyone on the path':'encrypted')+'">'+(x.vis?'':LOCK)+esc(x.t)+' <span class="mute">'+fmt(x.n)+'</span></span>';
  }
  function render(el,fls,upto,opt){
    opt=opt||{};let h='<div class="fl"><div class="end">Client</div><div></div><div class="end">Server</div>';
    fls.forEach((f,i)=>{
      const fut=upto!=null&&i>upto, on=upto!=null&&i===upto;
      let its=f.items;
      if(f.stream&&opt.collapse){const n=f.recs.length;its=[{t:n+' records: one per token, then the end',n:f.bytes,vis:false}]}
      h+='<div></div><div class="mid '+(f.d==='c2s'?'r':'l')+(fut?' fut':'')+(on?' on':'')+'">'+its.map(chip).join('')+'</div><div></div>';
    });
    el.innerHTML=h+'</div><div class="lg"><span><span class="chip vis">readable</span> anyone on the path can read it</span><span><span class="chip enc">'+LOCK+'encrypted</span> only sizes and timing visible</span><span>numbers are bytes on the wire, record headers included</span></div>';
  }
  return {items,flights,render,chip,fmt,LOCK};
})();

(function(){
  const D=window.D,fmt=TLS.fmt;
  const H=D.hs.tls13;
  // one-screen figure: the handshake and the first answer bytes, token records collapsed
  const fl13=TLS.flights(H.recs,true);
  TLS.render(document.getElementById('one-fig'),fl13,null,{collapse:true});
  // speed numbers
  const gbs=k=>(k*1000/1e9).toFixed(1)+' GB/s';
  document.getElementById('sp-aes').textContent=gbs(D.speed.aesgcm_kBps);
  document.getElementById('sp-cha').textContent=gbs(D.speed.chacha_kBps);
  document.getElementById('ml-ecdsa').textContent=fmt(Math.round(D.speed.ecdsa_sign/1000))+',000';
  const ck=H.checks,ckm=D.hs.mtls.checks;
  const yes=v=>v===true?'<span class="ok">matches</span>':'<span class="no">'+RD.esc(String(v))+'</span>';
  document.getElementById('hs-checks').innerHTML='server Finished '+yes(ck.finished_s2c)+', client Finished '+yes(ck.finished_c2s)+', server CertificateVerify signature '+(ck.certverify_s2c===true?'<span class="ok">valid</span>':yes(ck.certverify_s2c))+' (and in the mTLS recording the client\'s CertificateVerify '+(ckm.certverify_c2s===true?'<span class="ok">valid</span>':yes(ckm.certverify_c2s))+')';

  // Diffie-Hellman toy
  const g=5,mp=(b,e,m)=>{let r=1;b%=m;while(e>0){if(e&1)r=r*b%m;b=b*b%m;e>>=1}return r};
  function dh(){
    const p=+document.getElementById('dh-p').value,a=+document.getElementById('dh-a').value,b=+document.getElementById('dh-b').value;
    document.getElementById('dh-av').textContent=a;document.getElementById('dh-bv').textContent=b;
    const A=mp(g,a,p),B=mp(g,b,p),s1=mp(B,a,p),s2=mp(A,b,p);
    // how many exponents give the same public value: what an attacker would have to search
    let cands=[];for(let x=1;x<p;x++)if(mp(g,x,p)===A)cands.push(x);
    document.getElementById('dh-out').innerHTML='<div class="out">'+
      RD.stat('Client sends A = g<sup>a</sup> mod p',A,'5<sup>'+a+'</sup> mod '+p)+RD.stat('Server sends B = g<sup>b</sup> mod p',B,'5<sup>'+b+'</sup> mod '+p)+
      RD.stat('Client computes B<sup>a</sup> mod p',s1,'secret on the client')+RD.stat('Server computes A<sup>b</sup> mod p',s2,s1===s2?'<span class="ok">the same secret</span>':'')+'</div>'+
      '<p class="small">The attacker saw p = '+p+', g = 5, A = '+A+' and B = '+B+'. To get the secret it must find a from A: here it tries every exponent below '+p+' and finds '+cands.length+' candidate'+(cands.length>1?'s':'')+' ('+cands.slice(0,6).join(', ')+(cands.length>6?', ...':'')+'). With a 255-bit curve the same search would take longer than the age of the universe.</p>';
  }
  ['dh-p','dh-a','dh-b'].forEach(id=>document.getElementById(id).addEventListener('input',dh));dh();

  // HelloRetryRequest table
  const hr=D.hrr;
  document.getElementById('hrr-tab').innerHTML='<table><thead><tr><th>Client offers (key share for *)</th><th>Server accepts</th><th>HelloRetryRequest?</th><th>Negotiated</th><th class="num">ClientHello bytes</th><th class="num">Client Finished at</th></tr></thead><tbody>'+
    hr.cases.map(c=>'<tr><td><code>'+RD.esc(c.cg)+'</code></td><td><code>'+RD.esc(c.sg)+'</code></td><td>'+(c.hrr?'<span class="no">yes</span>':'no')+'</td><td>'+RD.esc((c.neg||'').replace('Negotiated TLS1.3 group: ','').replace('Peer Temp Key: ',''))+'</td><td class="num">'+c.ch.map(fmt).join(' + ')+'</td><td class="num">'+c.fin.toFixed(0)+' ms</td></tr>').join('')+
    '</tbody></table><p class="small mute">OpenSSL 3.6.5 s_client and s_server, a proxy adding '+hr.delay+' ms each way (one round trip = '+(2*hr.delay)+' ms). Times are from the first client byte at the proxy to the client\'s Finished leaving the proxy. A HelloRetryRequest adds about one round trip: compare rows 2 and 3. <code>src/lab/hrr.py</code></p>';

  // resumption cost bars
  const cm=D.cost.median,cp=D.cost.p90,keys=Object.keys(cm),mx=Math.max(...keys.map(k=>cm[k]));
  document.getElementById('cost-bars').innerHTML=keys.map((k,i)=>'<div class="row"><span class="nm" title="'+k+'">'+k+'</span><span class="track"><span class="fill" style="width:'+(100*cm[k]/mx).toFixed(1)+'%;background:var(--c'+(i+1)+')"></span></span><span class="val">'+cm[k].toFixed(2)+' ms</span></div>').join('')+
    '<p class="small mute">Median client-observed time per request over '+D.cost.n+' requests each (90th percentile: '+keys.map(k=>cp[k].toFixed(2)).join(', ')+' ms). All '+D.cost.resumed+' resumptions were accepted by the server.</p>';

  // the X.509 field table, from the api.anthropic.com leaf in the survey
  const host=D.pub.hosts.find(h=>h.host==='api.anthropic.com'),L=host.chain[0];
  const rows=[
    ['Subject',L.subject,'Who the certificate is about. Only informational now: names are checked in the SAN.'],
    ['Subject Alternative Name',L.san_first.join(', '),'The names the certificate is valid for ('+L.san_count+' here). The only place hostnames are matched.'],
    ['Issuer',L.issuer,'The CA that signed it. The next certificate in the chain must have this as its subject.'],
    ['Validity',L.not_before+' to '+L.not_after+' ('+L.validity_days.toFixed(0)+' days)','Outside this window every client refuses it.'],
    ['Public key',L.key,'The key whose private half signs CertificateVerify in every handshake.'],
    ['Signature algorithm',L.sig,'How the issuer signed this certificate.'],
    ['Extended Key Usage',L.eku.join(', '),'What it may be used for. serverAuth only: it cannot authenticate a client (section 7).'],
    ['Certificate policy',L.policy.join(', ')||'none','DV: the CA checked domain control only.'],
    ['Embedded SCTs',L.scts+' (two CT logs)','Proof it was published in Certificate Transparency logs (section 5).'],
    ['Revocation pointers',(L.crl_url?'CRL URL':'no CRL')+', '+(L.ocsp_url?'OCSP URL':'no OCSP URL'),'Where a client could check revocation (section 6).'],
    ['Issuer URL (AIA)',L.ca_issuers_url||'none','Where to download the issuer certificate; browsers use it to repair missing intermediates, most libraries do not.'],
    ['Size',fmt(L.der_bytes)+' bytes (DER)','Each certificate is sent in every full handshake.']];
  document.getElementById('x509-tab').innerHTML='<table><thead><tr><th>Field</th><th>Value</th><th>What it is for</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td style="overflow-wrap:anywhere"><code>'+RD.esc(r[1])+'</code></td><td>'+r[2]+'</td></tr>').join('')+'</tbody></table>';

  // the public survey table
  const short=s=>{const m=/CN=([^,]+)/.exec(s);return m?m[1]:s};
  document.getElementById('pub-tab').innerHTML='<table><thead><tr><th>Host</th><th>Leaf issued by</th><th>Leaf key</th><th class="num">Validity</th><th class="num">Sent</th><th>Last certificate sent</th><th>Key exchange</th></tr></thead><tbody>'+
    D.pub.hosts.map(h=>{const c=h.chain,last=c[c.length-1];const pq=/MLKEM/.test(h.group||'');
      return '<tr><td><code>'+h.host+'</code></td><td>'+RD.esc(short(c[0].issuer))+'</td><td>'+c[0].key+'</td><td class="num">'+c[0].validity_days.toFixed(0)+' d</td><td class="num">'+c.length+'</td><td>'+RD.esc(short(last.subject))+(last.subject===last.issuer?'':' <span class="mute">signed by '+RD.esc(short(last.issuer))+'</span>')+'</td><td>'+(pq?'<span class="ok">X25519MLKEM768</span>':'X25519')+'</td></tr>'}).join('')+'</tbody></table>';
})();
