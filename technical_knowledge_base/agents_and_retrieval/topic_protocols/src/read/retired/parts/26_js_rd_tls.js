// ---- Reading tab, section 4: the recorded TLS 1.3 handshake and request, and the same request in plain HTTP ----
(function(){
  const card=document.getElementById('rd-tls');if(!card||!RD.X||!RD.X.json.tls)return;
  const T=RD.X.json.tls,E=RD.esc;
  const msgEl=document.getElementById('rd-tls-msg'),tri=document.getElementById('rd-tls-tri'),cap=document.getElementById('rd-tls-cap'),cnt=document.getElementById('rd-tls-cnt');
  const L=T.tls.log;
  const recs=L.filter(e=>e.records);
  const hello=dir=>{for(const e of recs)for(const r of e.records)if(r.readable_by_eavesdropper&&e.dir===dir)return r.readable_by_eavesdropper};
  const CH=hello('client->server'),SH=hello('server->client');
  const done=L.find(e=>e.event==='handshake done');
  const decAfter=e=>{const i=L.indexOf(e),o=[];for(let j=i+1;j<L.length&&!L[j].records;j++)if(L[j].text_start!=null)o.push(L[j]);return o};
  const respRecs=recs.filter(e=>e.dir==='server->client').slice(1); // after the handshake flight
  const tickets=respRecs[0],dataRecs=respRecs.slice(1);
  const kb=x=>x.toLocaleString('en-US');
  const recLine=e=>'<div class="h"><span>'+(e.dir==='client->server'?'client → server':'server → client')+' at '+e.t_ms+' ms</span><span>'+kb(e.bytes)+' bytes on the wire</span></div><pre>'+
    e.records.map(r=>'record: '+r.type+(r.handshake?' ('+r.handshake+')':'')+', '+r.len+' B; header '+r.header+'; first bytes '+r.first_bytes.slice(0,24)+'…').join('\n')+'</pre>';
  // TLS steps: [records entry or null, caption, {c:[],e:[],s:[]} items added]
  const S=[];
  S.push({rec:null,t:'TCP connected ('+L[0].t_ms+' ms)',p:'The TCP handshake of section 3 is done. Nothing private has been sent yet, and everything so far was visible: the two IP addresses and ports.',
    c:['Wants to reach api.llm.test','Trusts Wire Lab Root CA (its trust store)'],e:['A connection 127.0.0.1:59xxx → 127.0.0.1:9443'],s:['Its certificate and private key']});
  S.push({rec:recs[0],t:'ClientHello: '+kb(recs[0].bytes)+' bytes, in the clear',p:'The client offers TLS 1.3, three ciphers and two key shares, and says which server and protocol it wants. Its private numbers never leave it.',
    c:['Private key-exchange numbers (secret)'],e:['Server name (SNI): '+CH.sni,'Protocol wanted (ALPN): '+CH.alpn.join(', '),'Ciphers offered: '+CH.cipher_suites.length,'Key shares: '+CH.key_share.map(k=>k.group+' '+k.bytes+' B').join(' + ')],s:['The client’s shares and offers']});
  const f=recs[1];
  S.push({rec:f,t:'ServerHello, then everything else encrypted',p:'The ServerHello is the last readable handshake message: it picks '+SH.cipher_suite+' and answers with its own '+SH.key_share[0].group+' share ('+SH.key_share[0].bytes+' B). Both sides can now compute the same secret; the eavesdropper cannot. The next four records are encrypted: EncryptedExtensions ('+f.records[1].len+' B), the Certificate chain ('+f.records[2].len+' B), CertificateVerify, a signature over the handshake ('+f.records[3].len+' B), and Finished ('+f.records[4].len+' B). An observer sees only "application_data" and lengths.',
    c:['Shared secret (from its private numbers + server share)','Certificate: CN='+done.peer_cert_subject.commonName+', issued by '+done.peer_cert_issuer.commonName],e:['Chosen cipher: '+SH.cipher_suite,'Server key share ('+SH.key_share[0].bytes+' B, public)','4 opaque records: '+f.records.slice(1).map(r=>r.len+' B').join(', ')],s:['Shared secret (same value)']});
  S.push({rec:recs[2],t:'Client verifies, sends Finished',p:'The client checked the chain up to the root it trusts, the name, the dates and the signature over the handshake, then sends its own Finished. The 1-byte change_cipher_spec record is a dummy kept so old middleboxes do not choke ({{RFC 9846, appendix D.4|https://www.rfc-editor.org/rfc/rfc9846#appendix-D.4}}). Handshake done at '+done.t_ms+' ms: '+done.version+', '+done.cipher+', ALPN '+done.alpn+'.',
    c:['Server proved its identity'],e:['2 more records: '+recs[2].records.map(r=>r.len+' B').join(', ')],s:['Client saw the same handshake (Finished matches)']});
  const req=recs[3];
  S.push({rec:req,t:'The request: one '+req.bytes+'-byte record',p:'The '+T.request_bytes+' bytes of HTTP (method, path, the API key, the JSON) travel as one encrypted record: '+req.records[0].len+' bytes of ciphertext plus a 5-byte header. Any changed byte would fail the 16-byte authentication tag.',
    c:['Sent: POST /v1/messages with x-api-key and the prompt'],e:['A '+req.bytes+'-byte record. Content: unknown'],s:['Received and decrypted: the full request, API key included']});
  S.push({rec:tickets,t:'Two session tickets',p:'The server sends two NewSessionTicket messages ('+tickets.records.map(r=>r.len+' B').join(', ')+') so a later connection can resume with less work ({{RFC 9846, section 4.7.1|https://www.rfc-editor.org/rfc/rfc9846#section-4.7.1}}).',
    c:['Tickets for resumption'],e:['2 records of '+tickets.records[0].len+' B'],s:[]});
  dataRecs.forEach((e,i)=>{const d=decAfter(e);const txt=d.map(x=>{const m=x.text_start.match(/"text":"([^"]*)"/);return m?'token "'+m[1]+'"':/HTTP\/1\.1 200/.test(x.text_start)?'HTTP/1.1 200, text/event-stream':/message_start/.test(x.text_start)?'event message_start':/message_stop/.test(x.text_start)?'event message_stop':/^0\r\n/.test(x.text_start)?'end of body (0 chunk)':x.text_start.slice(0,30)}).join(', ');
    const tok=d.some(x=>/text_delta/.test(x.text_start));
    S.push({rec:e,t:(i===0?'Response head and first event':tok?'A token arrives':'End of stream')+' at '+e.t_ms+' ms',
      p:(i===0?'The server answers 200 with text/event-stream and starts the stream. ':'')+(tok?'One SSE event per token, one TLS record per event. The eavesdropper cannot read it but sees its size ('+e.records.map(r=>r.len+5+' B').join(', ')+') and when it came.':'The last events, then the TLS close_notify alert.'),
      c:[txt?'Decrypted: '+txt:'(no new plaintext)'],e:['Records: '+e.records.map(r=>r.len+' B').join(', ')+' at '+e.t_ms+' ms'],s:[]})});
  // plain HTTP steps
  const P=T.plain.log;const P1=[];
  P1.push({t:'TCP connected ('+P[0].t_ms+' ms)',p:'The same TCP handshake. From here on, every byte is readable by anyone on the path.',c:['Wants to reach api.llm.test'],e:['A connection to port 9080'],s:[]});
  P.slice(1).forEach(x=>{const lines=x.text.replace(/\r\n/g,'\n').split('\n').filter(l=>l.trim()).slice(0,x.dir==='client->server'?8:3);
    const key=x.text.match(/x-api-key: (\S+)/i);
    P1.push({plain:x,t:(x.dir==='client->server'?'The request, '+x.bytes+' bytes in the clear':'Server sends '+x.bytes+' bytes at '+x.t_ms+' ms'),
      p:x.dir==='client->server'?'Everything the endpoints know, the eavesdropper knows too, including the API key. Anyone on the path could also change the prompt or the answer and neither side would notice.':'The answer, readable and changeable in transit.',
      c:[x.dir==='client->server'?'Sent: POST /v1/messages with x-api-key and the prompt':'Received '+x.bytes+' B'],e:lines.map(l=>(key&&l.includes(key[1]))?'<span class="leak">'+E(l)+'</span>':E(l)),s:[x.dir==='client->server'?'Received the same '+x.bytes+' bytes':'Sent '+x.bytes+' B'],raw:true})});
  let mode='tls';
  function items(list,i,k){const all=[];for(let j=0;j<=i;j++)(list[j][k]||[]).forEach(x=>all.push('<li'+(j===i?' class="new"':'')+'>'+(list[j].raw&&k==='e'?x:E(x))+'</li>'));const cut=all.length>7;return '<ul>'+(cut?'<li class="mute">\u2026 '+(all.length-7)+' earlier</li>':'')+all.slice(-7).join('')+'</ul>'}
  function draw(i){
    const list=mode==='tls'?S:P1,st=list[i];
    if(mode==='tls')msgEl.innerHTML=st.rec?'<div class="msg cur">'+recLine(st.rec)+'</div>':'';
    else msgEl.innerHTML=st.plain?'<div class="msg cur"><div class="h"><span>'+(st.plain.dir==='client->server'?'client → server':'server → client')+' at '+st.plain.t_ms+' ms</span><span>'+st.plain.bytes+' bytes</span></div><pre>'+E(st.plain.text.slice(0,600))+(st.plain.text.length>600?'…':'')+'</pre></div>':'';
    // keep only the latest few items per column so the panel stays short
    tri.innerHTML='<div><h5>Client knows</h5>'+items(list,i,'c')+'</div><div class="eve"><h5>Eavesdropper on the path sees</h5>'+items(list,i,'e')+'</div><div><h5>Server knows</h5>'+items(list,i,'s')+'</div>';
    cap.innerHTML='<div class="t">'+E(st.t)+'</div><p>'+st.p.replace(/\{\{([^|]+)\|([^}]+)\}\}/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')+'</p>';
    const upto=mode==='tls'?S.slice(0,i+1).filter(x=>x.rec):[];
    const wire=mode==='tls'?upto.reduce((a,x)=>a+x.rec.bytes,0):P1.slice(0,i+1).filter(x=>x.plain).reduce((a,x)=>a+x.plain.bytes,0);
    cnt.innerHTML=RD.stat('Bytes on the wire so far',kb(wire),mode==='tls'?'all records, both directions':'plain HTTP, both directions')+
      RD.stat('Readable by the eavesdropper',mode==='tls'?(i>=1?'names, sizes, timing':'addresses only'):'everything','')+
      RD.stat('Handshake cost',mode==='tls'?'1 round trip, '+kb(recs[0].bytes+recs[1].bytes+recs[2].bytes)+' B':'none','on top of TCP’s round trip');
  }
  const a=RD.anim({card:'rd-tls',ctl:'rd-tls-ctl',n:S.length,draw,ms:1700,label:'Record'});
  RD.seg(document.getElementById('rd-tls-seg'),m=>{mode=m;a.reset(m==='tls'?S.length:P1.length);a.play()});
})();
