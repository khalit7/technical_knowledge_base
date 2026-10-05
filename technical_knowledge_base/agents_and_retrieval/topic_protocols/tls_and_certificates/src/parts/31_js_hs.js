// ---- Tab: Handshake, decrypted (record-by-record stepper) ----
(function(){
  const D=window.D,fmt=TLS.fmt,esc=RD.esc;
  let rec='tls13',view='obs';
  function keyOf(R,tls13){
    // which key protects each record: none, handshake keys, application keys (per direction)
    const st={c2s:'none',s2c:'none'};
    return R.recs.map(r=>{
      let k;
      if(!tls13){k=(r.o==='application_data'||(r.o==='handshake'&&!r.m))?'TLS 1.2 session keys':(r.o==='change_cipher_spec'?'none (switch signal)':'none');}
      else if(r.o!=='application_data')k='none';
      else{if(st[r.d]==='none')st[r.d]='handshake';k=st[r.d]==='handshake'?(r.d==='c2s'?'client':'server')+' handshake traffic key':(r.d==='c2s'?'client':'server')+' application traffic key';
        if((r.m||[]).some(m=>m.t==='Finished'))st[r.d]='app';}
      return k});
  }
  const sum=document.getElementById('hs-sum'),det=document.getElementById('hs-detail'),list=document.getElementById('hs-list');
  let keys=[],sel=0;
  function msgDetail(m){
    let h='<li><b>'+esc(m.t)+'</b> <span class="mute">'+fmt(m.n)+' bytes</span>';
    const x=m.hello;
    if(x){h+='<ul class="tight small">';
      if(x.sni)h+='<li>server_name: <code>'+esc(x.sni)+'</code></li>';
      if(x.alpn)h+='<li>alpn: <code>'+esc(x.alpn.join(', '))+'</code></li>';
      if(x.cipher_suites)h+='<li>cipher_suites: '+x.cipher_suites.map(c=>'<code>'+c+'</code>').join(' ')+'</li>';
      if(x.cipher_suite)h+='<li>cipher_suite chosen: <code>'+x.cipher_suite+'</code></li>';
      if(x.supported_versions)h+='<li>supported_versions: '+x.supported_versions.join(', ')+'</li>';
      if(x.supported_groups)h+='<li>supported_groups: '+x.supported_groups.join(', ')+'</li>';
      if(x.key_share)h+='<li>key_share: '+x.key_share.map(k=>k.group+' ('+fmt(k.bytes)+' B)').join(', ')+'</li>';
      if(x.signature_algorithms)h+='<li>signature_algorithms: '+x.signature_algorithms.filter(s=>!/^0x/.test(s)).slice(0,9).join(', ')+', ...</li>';
      if(x.psk_modes)h+='<li>psk_key_exchange_modes: '+x.psk_modes.join(', ')+'</li>';
      h+='<li class="mute">extensions in order: '+x.extensions.join(', ')+'</li></ul>'}
    if(m.ext)h+='<div class="small">extensions: '+m.ext.extensions.join(', ')+(m.ext.alpn?' (ALPN chosen: <code>'+esc(m.ext.alpn.join(','))+'</code>)':'')+'</div>';
    if(m.certs)h+='<ul class="tight small">'+m.certs.map((c,i)=>'<li>certificate '+i+': subject <code>'+esc(c.s||'(empty)')+'</code>, issuer <code>'+esc(c.i)+'</code>, '+fmt(c.b)+' B DER'+(c.san&&c.san.length?', SAN '+c.san.map(s=>'<code>'+esc(s)+'</code>').join(' '):'')+', expires '+c.na+'</li>').join('')+'</ul>';
    if(m.sigalg)h+='<div class="small">signature algorithm <code>'+m.sigalg+'</code>, '+m.sig_bytes+'-byte signature over 64 spaces + context string + transcript hash</div>';
    if(m.vd)h+='<div class="small">verify_data <code>'+m.vd+'...</code> (HMAC of the transcript hash; recomputed and matched)</div>';
    if(m.note)h+='<div class="small mute">'+esc(m.note)+'</div>';
    return h+'</li>';
  }
  function draw(i){
    const R=D.hs[rec],tls13=rec!=='tls12';sel=i;const r=R.recs[i];
    let h='<div class="an-cap"><div class="t">Record '+(i+1)+' of '+R.recs.length+': '+(r.d==='c2s'?'client to server':'server to client')+', '+r.t.toFixed(2)+' ms</div>';
    if(view==='obs'){
      h+='<p>Outer type <code>'+r.o+'</code>, '+fmt(r.n)+' bytes of payload. First bytes on the wire: <code style="overflow-wrap:anywhere">'+r.h.replace(/(..)/g,'$1 ').trim()+' ...</code></p>';
      const vis=(r.m||[]).filter(m=>m.v);
      h+=vis.length?'<p>Readable: '+vis.map(m=>'<b>'+m.t+'</b>').join(', ')+'.</p><ul class="tight">'+vis.map(msgDetail).join('')+'</ul>':(r.o==='change_cipher_spec'?'<p>A one-byte compatibility record.</p>':'<p class="mute">Ciphertext: an observer learns only the direction, the size and the time.</p>');
    }else{
      h+='<p>Protected by: <b>'+keys[i]+'</b>.'+(r.i?' Inner content type: <code>'+r.i+'</code>.':'')+'</p>';
      if(r.m)h+='<ul class="tight">'+r.m.map(msgDetail).join('')+'</ul>';
      else if(r.at)h+='<pre class="blk">'+esc(r.at)+(r.a>70?' ...':'')+'</pre><p class="small mute">'+fmt(r.a)+' bytes of HTTP inside; the record adds '+(r.n-r.a)+' bytes (content type and 16-byte tag).</p>';
      else if(r.o==='change_cipher_spec')h+='<p>'+esc(r.note||'')+'</p>';
      else if(!tls13)h+='<p class="mute">'+esc(r.note||'encrypted')+'. In TLS 1.2 each encrypted record carries an 8-byte explicit nonce and a 16-byte tag (24 bytes of overhead, against 17 in TLS 1.3).</p>';
    }
    det.innerHTML=h+'</div>';
    list.querySelectorAll('tr[data-i]').forEach(tr=>tr.style.background=+tr.dataset.i===i?'var(--acc2)':'');
  }
  function build(){
    const R=D.hs[rec],tls13=rec!=='tls12';keys=keyOf(R,tls13);
    const I=R.info;
    sum.innerHTML=RD.stat('Version, suite',I.version,esc(I.cipher))+RD.stat('Bytes on the wire',fmt(R.wire.c2s)+' / '+fmt(R.wire.s2c),'client to server / server to client')+
      RD.stat('Handshake done at',I.t_handshake_done_ms.toFixed(1)+' ms','loopback')+RD.stat('Checks',Object.keys(R.checks).length?Object.values(R.checks).filter(v=>v===true).length+' of '+Object.keys(R.checks).length+' pass':'not decrypted','Finished and CertificateVerify recomputed');
    list.innerHTML='<table><thead><tr><th>#</th><th>Dir</th><th class="num">ms</th><th>On the wire</th><th class="num">Bytes</th><th>Inside</th></tr></thead><tbody>'+
      R.recs.map((r,i)=>'<tr data-i="'+i+'" style="cursor:pointer"><td>'+(i+1)+'</td><td>'+(r.d==='c2s'?'C &rarr; S':'S &rarr; C')+'</td><td class="num">'+r.t.toFixed(1)+'</td><td><code>'+r.o+'</code></td><td class="num">'+fmt(r.n)+'</td><td class="small">'+
        TLS.items(r,tls13).map(x=>view==='obs'&&!x.vis?{t:'ciphertext',n:x.n,vis:false}:x).map(TLS.chip).join('')+'</td></tr>').join('')+'</tbody></table>';
  }
  list.addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(tr)A.go(+tr.dataset.i)});
  build();
  const A=RD.anim({card:'hs-card',ctl:'hs-ctl',n:D.hs[rec].recs.length,draw,ms:1600,label:'Record',tab:'t-hs'});
  RD.seg(document.getElementById('hs-rec'),m=>{rec=m;build();A.reset(D.hs[rec].recs.length)});
  RD.seg(document.getElementById('hs-view'),m=>{view=m;build();A.redraw()});
})();
