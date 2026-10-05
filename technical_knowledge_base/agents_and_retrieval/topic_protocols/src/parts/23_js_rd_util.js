// ---- Reading tab: recorded outputs into <pre data-rd-out>, and small helpers ----
(function(){
  const X=window.RDX||{txt:{},json:{}};
  document.querySelectorAll('#t-read pre[data-rd-out]').forEach(p=>{
    const k=p.getAttribute('data-rd-out');const t=X.txt[k];
    p.textContent=t==null?'(missing recording: '+k+')':t.replace(/\s+$/,'');
  });
  // a recorded JSON value, pretty-printed, into <pre data-rd-json="file.path.to.key">
  document.querySelectorAll('#t-read pre[data-rd-json]').forEach(p=>{
    const path=p.getAttribute('data-rd-json').split('.');let v=X.json;
    for(const k of path){v=v==null?v:v[k]}
    p.textContent=v==null?'(missing)':(typeof v==='string'?v:JSON.stringify(v,null,1));
  });
  // section 5: the request as sent (HTTP/1.1 bytes) and as curl reports it over HTTP/2
  const h1=document.getElementById('rd-h1req');if(h1)h1.textContent=(X.wire_request||'').replace(/\r\n/g,'\n');
  const h2=document.getElementById('rd-h2req');if(h2)h2.textContent=(X.txt.t3_curl_h2_v||'').split('\n').filter(l=>/^\* \[HTTP\/2\] \[1\]|^\* ALPN|^> |^< HTTP/.test(l)).join('\n');
  // section 6: the raw response bytes, chunk sizes included
  const r1=document.getElementById('rd-h1resp');if(r1)r1.textContent=(X.wire_response||'').replace(/\r\n/g,'↵\n');
  RD.X=X;
})();
