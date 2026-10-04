// ---- Shared: fill data-v numbers, render code excerpts from the real app.py, render raw HTTP with line explanations ----
window.RAW=(function(){
  const D=window.API_DATA,esc=RD.esc;
  // derived values used in the text (checked by recompute.py)
  const deep=D.pg.res[D.pg.res.length-1];
  D.pg.deep_off=Math.round(deep.off);D.pg.deep_ks=deep.ks;
  const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
  document.querySelectorAll('[data-v]').forEach(el=>{let v=get(D,el.dataset.v);if(Array.isArray(v))v=v.join(', ');el.textContent=v==null?'?':String(v)});
  // code excerpts: data-src="start marker|end marker" (first end after start), with real line numbers
  const lines=D.src.split('\n');
  document.querySelectorAll('.code[data-src]').forEach(el=>{
    const [a,b]=el.dataset.src.split('|');let i=lines.findIndex(l=>l.includes(a));if(i<0){el.textContent='(excerpt not found)';return}
    let j=i;while(j<lines.length&&!lines[j].includes(b))j++;
    el.innerHTML=lines.slice(i,j+1).map((l,k)=>{let h=esc(l);const c=h.indexOf('# ');if(c>=0&&!/["']/.test(l.slice(l.indexOf('# ')))) h=h.slice(0,c)+'<span class="cm">'+h.slice(c)+'</span>';
      return '<span class="n">'+(i+k+1)+'</span>'+h}).join('\n')});
  const H={
    'host':'Host: which site this request is for. One server (one IP address) can host many names, so HTTP/1.1 requires it.',
    'user-agent':'User-Agent: which program sent the request. Useful in logs; never trust it for security.',
    'accept':'Accept: the media types the client can read. */* means anything.',
    'authorization':'Authorization: the credential. "Bearer" (RFC 6750) means: whoever holds this key is let in. Here an API key; it could be an OAuth access token. Section 11.',
    'content-type':'Content-Type: what the body is. application/json for data, application/problem+json for RFC 9457 errors, text/event-stream for a stream.',
    'content-length':'Content-Length: the body size in bytes, so the receiver knows where the message ends and the next one could begin on the same connection.',
    'connection':'Connection: close asks to close the TCP connection after this exchange (the capture script sends it so each exchange is separate). Real clients keep connections open and reuse them, saving the TCP and TLS handshakes.',
    'idempotency-key':'Idempotency-Key: a UUID the client generated for this one logical action and resends on every retry. The server stores the result under it (section 10).',
    'date':'date: when the server produced the response, always in GMT.',
    'server':'server: the software that answered. Many teams remove it, since it tells attackers what you run.',
    'location':'location: the URL of the resource that was just created. RFC 9110 pairs it with 201 Created.',
    'www-authenticate':'WWW-Authenticate: required on every 401 (RFC 9110 §11.6.1). It tells the client which authentication scheme to use: here Bearer.',
    'retry-after':'retry-after: how many seconds to wait before trying again (or an HTTP date). Sent with 429 and 503.',
    'ratelimit-policy':'RateLimit-Policy (IETF draft-11): the quota: "burst" allows q=5 requests per w=5 seconds.',
    'ratelimit':'RateLimit (IETF draft-11): where this client stands: r = requests remaining, t = seconds until the quota resets.',
    'idempotent-replayed':'Idempotent-Replayed: true says this is the stored response of an earlier attempt with the same key, not a new execution. Stripe uses the same header.',
    'cache-control':'cache-control: no-cache asks proxies and browsers not to cache or hold back this response. Important for streams.',
    'transfer-encoding':'Transfer-Encoding: chunked. The server does not know the total length in advance (the reply is still being generated), so the body is sent in chunks, each preceded by its size in hexadecimal and ended by a zero-size chunk.'
  };
  const ST={200:'Success, with a result.',201:'Created: a new resource exists; see location.',400:'Bad request: the client must fix something (here, the missing Idempotency-Key).',401:'Not authenticated: no valid credential.',404:'Not found, or not yours: the API does not reveal which.',409:'Conflict: a request with this idempotency key is still running. Retry later.',422:'Unprocessable: well-formed HTTP, but the content failed validation. The reason phrase printed is the older "Unprocessable Entity"; RFC 9110 calls 422 "Unprocessable Content".',429:'Too many requests: rate limited. Wait for retry-after.'};
  const MT={GET:'GET reads. Safe and idempotent: clients and proxies may retry it freely.',POST:'POST creates or acts. Neither safe nor idempotent: two POSTs can create two things, which is why section 10 exists.'};
  function explainLine(l,kind,ctx){
    if(kind==='first'){
      const m=l.match(/^(GET|POST|PUT|PATCH|DELETE) (\S+) HTTP\/1\.1/);if(m)return '<b>Request line.</b> '+MT[m[1]]+' The path <code>'+esc(m[2])+'</code> names the resource'+(m[2].includes('?')?'; after <code>?</code> comes the query string (parameters such as limit and cursor)':'')+'. HTTP/1.1 is the wire format (RFC 9112).';
      const s=l.match(/^HTTP\/1\.1 (\d+) (.*)$/);if(s)return '<b>Status line: '+s[1]+'.</b> '+(ST[+s[1]]||'')+' The first digit is the class: 2xx success, 4xx client error, 5xx server error.';
    }
    if(kind==='hdr'){const n=l.split(':')[0].toLowerCase();return H[n]||('Header '+esc(l.split(':')[0])+'.')}
    if(kind==='blank')return 'The empty line (just \\r\\n) ends the headers. Everything after it is the body.';
    if(kind==='chunk')return /^0$/.test(l.trim())?'A zero-size chunk: the end of the body. The stream is over.':'Chunk size in hexadecimal: 0x'+esc(l.trim())+' = '+parseInt(l.trim(),16)+' bytes follow. Added by chunked transfer encoding, removed by every HTTP client before your code sees the data.';
    if(kind==='sse'){if(l.startsWith('event:'))return 'SSE field <code>event</code>: the event type (message_start, delta, message_stop). Clients dispatch on it.';
      if(l.startsWith('data:'))return 'SSE field <code>data</code>: the payload, here JSON with the next piece of text.';
      if(l.startsWith('id:'))return 'SSE field <code>id</code>: a browser reconnecting sends the last one it saw in a Last-Event-ID header, so the server could resume.';
      return 'A blank line inside the stream: it ends one event, which the client now dispatches.'}
    if(kind==='body'){
      if(ctx.ctype.includes('problem+json'))return 'Body: an RFC 9457 problem details object. <code>type</code> is the stable, machine-readable error identity; <code>title</code> and <code>detail</code> are for humans; extension members such as <code>errors</code> add structure (section 7).';
      if(ctx.req)return 'Body: the JSON the client sends. FastAPI parses it and validates it against a pydantic model before the route runs (section 5).';
      if(l.includes('next_cursor'))return 'Body: one page of results plus <code>next_cursor</code>. Send it back to get the following page; null means the end (section 8).';
      if(l.includes('"detail":['))return 'Body: FastAPI\'s default validation error: a list with the location (loc), message and the rejected input of each failing field.';
      return 'Body: the JSON result. Server-set fields (id, created_at) come back so the client does not need a second request.';
    }
    return '';
  }
  // render raw text into el; returns nothing; click shows explanation in xel
  function render(el,text,xel,opt){opt=opt||{};
    const isReq=!/^HTTP\//.test(text);const hb=text.indexOf('\r\n\r\n');const head=hb<0?text:text.slice(0,hb);let body=hb<0?'':text.slice(hb+4);
    const hl=head.split('\r\n');const ctype=((hl.find(h=>/^content-type:/i.test(h))||'').toLowerCase());const chunked=hl.some(h=>/^transfer-encoding: chunked/i.test(h));
    const rows=[];hl.forEach((l,i)=>rows.push([l,i===0?'first':'hdr']));
    if(!opt.headOnly){rows.push(['','blank']);
      if(chunked){body.split('\r\n').forEach((l,i,a)=>{if(i===a.length-1&&l==='')return;
        if(/^[0-9a-f]+$/i.test(l.trim())&&l.trim()!=='')rows.push([l,'chunk']);else l.split('\n').forEach(x=>{if(x===''&&rows.length&&rows[rows.length-1][1]==='sse'&&rows[rows.length-1][0]==='')return;rows.push([x,'sse'])})})}
      else if(body){let pretty=body;try{if(ctype.includes('json')||isReq)pretty=JSON.stringify(JSON.parse(body),null,1)}catch(e){}
        if(opt.compact)pretty=body;pretty.split('\n').forEach(l=>rows.push([l,'body']))}}
    const ctx={ctype,req:isReq};
    el.innerHTML=rows.map((r,i)=>{let h=esc(r[0]);if(r[1]==='first'){h=h.replace(/^(HTTP\/1\.1 )(\d+)/,(m,a,b)=>a+'<span class="st'+(+b>=400?' e':'')+'">'+b+'</span>')}
      else if(r[1]==='hdr'){h=h.replace(/^([^:]+):/,'<span class="k">$1</span>:')}else if(r[1]!=='first')h='<span class="bd">'+(h||' ')+'</span>';
      return '<span class="ln" data-i="'+i+'">'+(h||' ')+'</span>'}).join('');
    if(xel){el.onclick=e=>{const s=e.target.closest('.ln');if(!s)return;document.querySelectorAll('.raw .ln.on').forEach(x=>x.classList.remove('on'));s.classList.add('on');
      const r=rows[+s.dataset.i];xel.innerHTML=explainLine(r[0],r[1],ctx)||'This line is part of the body.'}}
  }
  // static blocks: data-body="key" shows just the body; data-res="key" the full response
  document.querySelectorAll('.raw[data-body]').forEach(el=>{const t=D.ex[el.dataset.body].res;const b=t.slice(t.indexOf('\r\n\r\n')+4);let p=b;try{p=JSON.stringify(JSON.parse(b),null,1)}catch(e){}el.textContent=p});
  document.querySelectorAll('.raw[data-res]').forEach(el=>render(el,D.ex[el.dataset.res].res,null,{headOnly:!!el.dataset.headonly}));
  return {render,explainLine};
})();
