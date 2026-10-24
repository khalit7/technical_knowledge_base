// ---- Reading: message anatomy, recorded outputs, small tables, drills, glossary ----
(function(){
  const D=window.HD,esc=RD.esc;
  // key numbers in the one-screen table come from the recordings
  const h2f=D.h2.frames.filter(f=>f.type==='HEADERS'&&f.dir==='out');
  const h3f=D.h3.frames.filter(f=>f.type==='HEADERS'&&f.dir==='out');
  const req=D.h1.request,body=req.split('\r\n\r\n')[1];
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('rd-k-h1',req.length-body.length);set('rd-k-h2',h2f[0].len);set('rd-k-h2b',h2f[1].len);set('rd-k-h3',h3f[0].len);set('rd-k-h3b',h3f[1].len);

  // ---- anatomy of the request and response ----
  const INFO={
    method:'<b>Method.</b> POST: "process this body". Not safe, not idempotent, so a retry is not automatically harmless (section 2).',
    target:'<b>Request target.</b> The path on the server, <code>/v1/messages</code>. In HTTP/2 and 3 this travels as the <code>:path</code> pseudo-header.',
    version:'<b>Protocol version.</b> HTTP/1.1. HTTP/2 and HTTP/3 have no start line at all: the version is chosen before any request, by ALPN in the TLS handshake.',
    host:'<b>Host.</b> Which site on this server. Mandatory in HTTP/1.1 (400 without it); becomes <code>:authority</code> in HTTP/2 and 3.',
    ctype:'<b>content-type.</b> What the body is: JSON here. The response says <code>text/event-stream</code>, the SSE format.',
    key:'<b>x-api-key.</b> The credential, in a custom header (other APIs use <code>authorization: Bearer ...</code>). A placeholder here. Proxies and logs see headers, which is why keys leak through logging.',
    clen:'<b>content-length: 117.</b> The body is exactly 117 bytes. This is how the server knows where this request ends and the next one on the same connection begins.',
    conn:'<b>connection: close.</b> A hop-by-hop field: "close this connection after the response". Without it HTTP/1.1 keeps the connection open for the next request.',
    blank:'<b>Empty line.</b> CR LF on its own: the head is over, the body (if any) starts.',
    body:'<b>Body.</b> The JSON request: model, max_tokens, stream: true, and the user message.',
    status:'<b>Status line.</b> Version and status code 200. The reason phrase after the code is optional and this server sends none.',
    rh:'<b>Response header field.</b> <code>cache-control: no-cache</code> keeps caches from reusing a generation; <code>alt-svc</code> advertises HTTP/3; <code>x-request-id</code> identifies this request in the server\'s logs.',
    te:'<b>Transfer-Encoding: chunked.</b> The server does not know the length of an answer it has not generated yet, so the body comes in chunks, each prefixed by its size.',
    csize:'<b>Chunk size, in hexadecimal.</b> <code>81</code> = 129 bytes follow. A chunk of size 0 ends the body. Over HTTP/2 the same bytes would be a DATA frame with a 9-byte binary header instead.',
    ev:'<b>One SSE event.</b> <code>event:</code> and <code>data:</code> lines ended by a blank line. The SDK parses these; the HTTP layer only sees bytes.'
  };
  function line(s,key){return '<span data-p="'+key+'">'+esc(s)+'</span><span class="cr">&#8629;</span>\n'}
  function reqHTML(){
    const [head,b]=req.split('\r\n\r\n');const L=head.split('\r\n');let h='';
    const sl=L[0].split(' ');
    h+='<span data-p="method">'+esc(sl[0])+'</span> <span data-p="target">'+esc(sl[1])+'</span> <span data-p="version">'+esc(sl[2])+'</span><span class="cr">&#8629;</span>\n';
    const map={host:'host','content-type':'ctype','x-api-key':'key','content-length':'clen',connection:'conn'};
    L.slice(1).forEach(l=>{h+=line(l,map[l.split(':')[0].toLowerCase()]||'rh')});
    h+='<span data-p="blank"><span class="cr">&#8629;</span></span>\n<span data-p="body">'+esc(b)+'</span>';
    return h;
  }
  function resHTML(){
    const r=D.h1.response,i=r.indexOf('\r\n\r\n'),head=r.slice(0,i),rest=r.slice(i+4);
    const L=head.split('\r\n');let h=line(L[0],'status');
    L.slice(1).forEach(l=>{h+=line(l,/^transfer-encoding/i.test(l)?'te':(/^connection/i.test(l)?'conn':(/^content-type/i.test(l)?'ctype':'rh')))});
    h+='<span data-p="blank"><span class="cr">&#8629;</span></span>\n';
    // first two chunks only
    let p=0;for(let k=0;k<2;k++){const e=rest.indexOf('\r\n',p);const sz=rest.slice(p,e);const n=parseInt(sz,16);
      h+=line(sz,'csize');h+='<span data-p="ev">'+esc(rest.slice(e+2,e+2+n))+'</span><span class="cr">&#8629;</span>\n';p=e+2+n+2}
    h+='<span class="mute">... five more chunks (four tokens, message_stop), then</span>\n<span data-p="csize">0</span><span class="cr">&#8629;</span>\n<span class="cr">&#8629;</span>';
    return h;
  }
  const txt=document.getElementById('rd-anat-txt'),info=document.getElementById('rd-anat-info');
  function anat(m){txt.innerHTML=m==='req'?reqHTML():resHTML();info.innerHTML='Tap a highlighted part.'}
  txt.addEventListener('click',e=>{const s=e.target.closest('[data-p]');if(!s)return;txt.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));
    txt.querySelectorAll('[data-p="'+s.dataset.p+'"]').forEach(x=>x.classList.add('on'));info.innerHTML=INFO[s.dataset.p]||''});
  RD.seg(document.getElementById('rd-anat-seg'),anat);anat('req');

  // ---- recorded conditional request ----
  const c=document.getElementById('rd-cond');if(c)c.textContent=D.conditional.trim();

  // ---- SETTINGS table ----
  const st=D.h2.frames.filter(f=>f.type==='SETTINGS'&&f.settings&&f.settings.length);
  const names=[...new Set(st.flatMap(f=>f.settings.map(x=>x[0])))];
  const val=(f,n)=>{const x=f.settings.find(s=>s[0]===n);return x?x[1].toLocaleString('en-US'):'(not sent)'};
  const cl=st.find(f=>f.dir==='out'),sv=st.find(f=>f.dir==='in');
  document.getElementById('rd-settings').innerHTML='<thead><tr><th>Setting</th><th class="num">Client sent</th><th class="num">Server sent</th></tr></thead><tbody>'+
    names.map(n=>'<tr><td><code>'+n+'</code></td><td class="num">'+val(cl,n)+'</td><td class="num">'+val(sv,n)+'</td></tr>').join('')+'</tbody>';

  // ---- drills: predict, then reveal ----
  document.querySelectorAll('#t-read .drill').forEach(d=>{
    const rev=d.querySelector('.rev');
    d.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      d.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.o===d.dataset.ans)x.classList.add('right')});
      if(b.dataset.o!==d.dataset.ans)b.classList.add('wrong');rev.hidden=false}));
  });

  // ---- glossary: every term defined in the text, in alphabetical order, linking back ----
  const G={
    'g-msg':'A request or a response: start line, header fields, empty line, optional body.',
    'g-start':'The first line: method, target and version (request) or version and status (response). HTTP/1.1 only.',
    'g-field':'One name: value pair in a message head (a "header").',
    'g-body':'The content after the head: a JSON request, a stream of events, a file.',
    'g-client':'The program that sends requests.','g-server':'The program that answers them.',
    'g-origin':'The server that actually owns the resource; everything else in between is an intermediary.',
    'g-inter':'A proxy, gateway or tunnel that receives a message and sends it on.',
    'g-hop':'One leg of the path between two HTTP participants; each hop is its own connection.',
    'g-scheme':'The first part of a URL (https), which fixes the protocol and default port.',
    'g-auth':'The host and optional port in a URL; :authority in HTTP/2 and 3.',
    'g-path':'The part of the URL that names the resource on the server.',
    'g-pseudo':'HTTP/2 and 3 fields starting with a colon that replace the start line (:method, :path, :status).',
    'g-chunked':'HTTP/1.1 body framing for unknown lengths: pieces prefixed by their size in hex, ended by a zero-size piece.',
    'g-method':'The kind of operation a request asks for (GET, POST, PUT, DELETE...).',
    'g-safe':'A method that asks for no change on the server.',
    'g-idem':'A method whose effect is the same whether sent once or several times.',
    'g-status':'The three-digit result code of a response; the first digit is its class.',
    'g-cache':'A stored copy of a response that may be reused.',
    'g-validator':'An ETag or date the client sends back to ask whether its copy is still current.',
    'g-persist':'A connection kept open for further requests (keep-alive).',
    'g-trailer':'Header fields sent after the body.',
    'g-pipe':'Sending further HTTP/1.1 requests on a connection before the earlier responses arrive.',
    'g-pool':'A set of open connections a client reuses for its requests.',
    'g-frame':'The unit of HTTP/2 and 3: a typed, length-prefixed piece of a stream.',
    'g-stream':'One request and its response inside a shared HTTP/2 or 3 connection.',
    'g-preface':'The fixed 24 bytes a client sends to start HTTP/2.',
    'g-hpack':'HTTP/2 header compression: static table, dynamic table, Huffman code.',
    'g-window':'Bytes a sender may send before waiting for credit (flow control).',
    'g-quic':'A transport over UDP with TLS 1.3 built in and independent streams; HTTP/3 runs on it.',
    'g-qpack':'HTTP/3 header compression; table updates go on a separate stream so streams can arrive in any order.',
    'g-proxy':'Any HTTP participant between client and origin that receives and re-sends messages.',
    'g-idemkey':'A unique id sent with a non-idempotent request so the server can recognise and deduplicate a retry.'
  };
  const items=[...document.querySelectorAll('#t-read dfn[id]')].filter(d=>G[d.id]).map(d=>({id:d.id,t:d.textContent}));
  items.sort((a,b)=>a.t.localeCompare(b.t));
  document.getElementById('rd-gl').innerHTML=items.map(x=>'<div><b><a href="#'+x.id+'">'+esc(x.t)+'</a></b>: '+G[x.id]+'</div>').join('');
})();
