// ---- Tab: Certificate dissector (real chains, field explanations, client-side checks with faults) ----
window.CERTCHK=(function(){
  // RFC 9525: exact match, or a wildcard as the whole left-most label matching exactly one label
  function nameMatch(name,sans){
    name=name.toLowerCase();
    return sans.some(s=>{s=String(s).toLowerCase();if(s===name)return true;
      if(s.indexOf('*.')===0){const rest=s.slice(2),i=name.indexOf('.');return i>0&&name.slice(i+1)===rest}return false});
  }
  // returns [{id, label, state: pass|fail|skip, detail, err}]
  function run(h,o){
    const chain=o.drop&&h.chain.length>1?[h.chain[0]]:h.chain.slice();
    const out=[],T=Date.parse(o.date+'T12:00:00Z');
    // 1. path to a trusted root
    let path=true,why='';
    const last=chain[chain.length-1];
    if(o.drop&&h.chain.length>1){path=false;why='the leaf\'s issuer "'+chain[0].issuer+'" was not sent, and it is not a root in the store'}
    else if(o.store){path=false;why='the chain ends at "'+(last.subject===last.issuer?last.subject:last.issuer)+'", which is not in this client\'s store'}
    out.push({label:'Build a path from the leaf to a trusted root',state:path?'pass':'fail',detail:path?chain.length+' certificate'+(chain.length>1?'s':'')+' sent; the last one\'s issuer is a root in the store':why,
      err:o.drop?'unable to get local issuer certificate (verify error 20); Node: UNABLE_TO_VERIFY_LEAF_SIGNATURE':'unable to get local issuer certificate (verify error 20), or self-signed certificate in certificate chain (19)'});
    // 2. CA flags on every certificate above the leaf
    const caok=chain.slice(1).every(c=>c.ca);
    out.push({label:'Every issuer certificate says CA:TRUE',state:path?(caok?'pass':'fail'):'skip',detail:chain.length>1?chain.slice(1).map(c=>(c.ca?'CA':'not a CA')).join(', '):'no issuer certificate to check',err:'invalid CA certificate (24)'});
    // 3. dates
    const bad=chain.find(c=>T>Date.parse(c.not_after+'T23:59:59Z')||T<Date.parse(c.not_before+'T00:00:00Z'));
    out.push({label:'Every certificate is within its validity dates on '+o.date,state:bad?'fail':'pass',detail:bad?'"'+bad.subject+'" is valid '+bad.not_before+' to '+bad.not_after:'leaf valid until '+chain[0].not_after,
      err:bad&&T<Date.parse(bad.not_before)?'certificate is not yet valid (9)':'certificate has expired (10)'});
    // 4. name
    const L=chain[0],nm=nameMatch(o.name,L.san||[]);
    out.push({label:'The dialled name '+o.name+' matches a SAN',state:nm?'pass':'fail',detail:'SANs: '+(L.san||[]).slice(0,6).join(', ')+((L.san||[]).length>6?' and '+((L.san||[]).length-6)+' more':''),err:'Hostname mismatch (62); Python: certificate verify failed: Hostname mismatch; Node: ERR_TLS_CERT_ALTNAME_INVALID'});
    // 5. EKU
    const eku=(L.eku||[]).indexOf('serverAuth')>=0;
    out.push({label:'Extended Key Usage allows serverAuth',state:eku?'pass':'fail',detail:(L.eku||[]).join(', '),err:'unsupported certificate purpose (26)'});
    // 6. key strength
    const ks=/^EC/.test(L.key)||(/^RSA-(\d+)/.test(L.key)&&+RegExp.$1>=2048);
    out.push({label:'Leaf key is strong enough',state:ks?'pass':'fail',detail:L.key,err:'ee key too small'});
    // 7. CT (browsers)
    const need=L.validity_days<=180?2:3;
    out.push({label:'Certificate Transparency: at least '+need+' SCTs (Chrome policy for a '+L.validity_days.toFixed(0)+'-day certificate)',state:L.scts>=need?'pass':'fail',detail:L.scts+' embedded SCTs. Browsers only: curl, Python and Node do not check CT.',err:'NET::ERR_CERTIFICATE_TRANSPARENCY_REQUIRED (Chrome)'});
    return out;
  }
  return {nameMatch,run};
})();

(function(){
  const D=window.D,esc=RD.esc,fmt=TLS.fmt,H=D.pub.hosts;
  const hs=document.getElementById('ce-host');hs.innerHTML=H.map((h,i)=>'<option value="'+i+'">'+h.host+'</option>').join('');
  let hi=0,ci=0;
  const day0=Date.parse('2026-10-05T12:00:00Z'),dstr=d=>new Date(day0+d*864e5).toISOString().slice(0,10);
  const short=s=>{const m=/CN=([^,]+)/.exec(s);return m?m[1]:s};
  function fields(c,i,n){
    const role=i===0?'leaf (the server itself)':(c.subject===c.issuer?'root (self-signed)':(i===n-1?'last certificate sent: an intermediate or a cross-signed root':'intermediate'));
    const rows=[['Role',role],['Subject',c.subject],['Issuer',c.issuer],['Validity',c.not_before+' to '+c.not_after+' ('+c.validity_days.toFixed(0)+' days)'],['Public key',c.key],['Signature',c.sig],['Basic constraints',c.ca?'CA:TRUE (may sign certificates)':'CA:FALSE (end entity)']];
    if(i===0)rows.push(['SANs ('+c.san_count+')',(c.san||[]).join(', ')],['Extended key usage',(c.eku||[]).join(', ')||'none'],['Policy',(c.policy||[]).join(', ')||'none'],['SCTs',String(c.scts)],['OCSP URL',c.ocsp_url?'yes':'no'],['CRL URL',c.crl_url||'none']);
    if(c.ca_issuers_url)rows.push(['Issuer download (AIA)',c.ca_issuers_url]);
    rows.push(['Size',fmt(c.der_bytes)+' bytes DER']);
    const help={'Role':'Leaf, intermediate or root decides which checks apply.','Subject':'Informational; for the leaf, names are matched against SANs only.','Issuer':'Must equal the subject of the next certificate up.','Validity':'Checked against the client\'s clock.','Basic constraints':'Only CA:TRUE certificates may sign others.','Extended key usage':'serverAuth for servers; clientAuth for mTLS clients.','SCTs':'Certificate Transparency proofs, required by Chrome and Safari.','Issuer download (AIA)':'Browsers fetch missing intermediates from here; most libraries do not.'};
    return '<dl class="kv">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd style="overflow-wrap:anywhere">'+esc(r[1])+(help[r[0]]?'<div class="small mute">'+help[r[0]]+'</div>':'')+'</dd>').join('')+'</dl>';
  }
  function draw(){
    const h=H[hi];
    document.getElementById('ce-chain').innerHTML=h.chain.map((c,i)=>'<button class="cbox'+(i===ci?' sel':'')+'" data-i="'+i+'"><div class="nm">'+(i+1)+'. '+esc(short(c.subject))+'</div><div class="fl2">issued by '+esc(short(c.issuer))+' &middot; '+c.key+' &middot; '+c.validity_days.toFixed(0)+' days &middot; '+fmt(c.der_bytes)+' B</div></button>').join('')+
      '<div class="small mute">'+esc(h.proto)+', '+esc(h.cipher)+', key exchange '+esc((h.group||'').replace(', 253 bits',''))+'</div>';
    document.getElementById('ce-fields').innerHTML=fields(h.chain[ci],ci,h.chain.length);
    check();
  }
  function names(){
    const h=H[hi].host,parts=h.split('.'),o=[h,'x.'+h,'a.b.'+h];
    if(parts.length>2)o.push(parts.slice(1).join('.'));
    const L=H[hi].chain[0];(L.san||[]).filter(s=>/^\*\./.test(s)).slice(0,1).forEach(w=>{o.push('svc.'+w.slice(2),'a.b.'+w.slice(2))});
    document.getElementById('ce-name').innerHTML=[...new Set(o)].map(n=>'<option>'+n+'</option>').join('');
  }
  function check(){
    const d=+document.getElementById('ce-date').value,date=dstr(d);document.getElementById('ce-dv').textContent=date+(d?' (+'+d+' days)':' (today)');
    const res=CERTCHK.run(H[hi],{date,name:document.getElementById('ce-name').value,drop:document.getElementById('ce-drop').checked,store:document.getElementById('ce-store').checked});
    document.getElementById('ce-checks').innerHTML=res.map(r=>'<li class="'+r.state+'"><b>'+esc(r.label)+'</b><div class="small mute" style="overflow-wrap:anywhere">'+esc(r.detail)+'</div></li>').join('');
    const f=res.find(r=>r.state==='fail'&&!/Transparency/.test(r.label));
    document.getElementById('ce-verdict').innerHTML=f?'<div class="co warn"><div class="t">A library client refuses the connection</div>Error: <code>'+esc(f.err)+'</code></div>':'<div class="co key"><div class="t">Verified</div>Every check passes; the handshake would continue to CertificateVerify.</div>';
  }
  document.getElementById('ce-chain').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b){ci=+b.dataset.i;draw()}});
  hs.addEventListener('change',()=>{hi=+hs.value;ci=0;names();draw()});
  ['ce-date','ce-name','ce-drop','ce-store'].forEach(id=>{const el=document.getElementById(id);el.addEventListener('input',check);el.addEventListener('change',check)});
  names();draw();
})();
