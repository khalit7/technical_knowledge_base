// ---- Wire lab tab: every captured exchange ----
(function(){
  const D=window.API_DATA,esc=RD.esc;
  const G=[
    ['Basics',[['health','The smallest exchange','A GET with no body and a two-field JSON answer. Notice how many bytes of headers surround 11 bytes of body.'],
      ['create','Create a chat','POST with a JSON body and a Bearer key; 201 Created with a Location header pointing at the new chat.'],
      ['get','Read it back','GET by ID, scoped to the caller: the query filters by id and owner.']]],
    ['Errors',[['create_noauth','No API key','401 with the WWW-Authenticate challenge RFC 9110 requires, and a problem details body.'],
      ['create_invalid','Invalid body (problem details)','Two failing fields reported at once, each with a JSON Pointer.'],
      ['create_invalid_default','Invalid body (FastAPI default)','The same request to a copy of the service without the custom handler: FastAPI\'s built-in shape, which echoes the input back.'],
      ['create_badjson','Body is not JSON','The body was cut off mid-string; the error says where parsing broke.'],
      ['get_missing','Unknown chat','404 problem details. The same answer is given for a chat that exists but belongs to someone else.'],
      ['list_badlimit','Page size over the cap','A query parameter fails validation: the error names the parameter instead of a body pointer.']]],
    ['Pagination',[['list_p1','First page','limit=2 returns two chats and a next_cursor.'],['list_p2','Second page','The cursor sent back returns the next two chats, continuing after the last one seen.']]],
    ['Idempotency',[['msg_nokey','No Idempotency-Key','This endpoint requires a key; 400 with a hint, as the IETF draft suggests.'],
      ['msg_first','First attempt','Message stored, 10 credits charged (990 left), response stored under the key.'],
      ['msg_retry','Retry with the same key','Same body, same key: the stored response comes back with Idempotent-Replayed: true. Still 990 credits: nothing ran twice.'],
      ['msg_mismatch','Same key, different message','The request hash differs from the one stored with the key: 422, use a new key.'],
      ['msg_concurrent_first','Slow first attempt','Against a copy of the service that takes 1 s per message. This one started first and finished with 201.'],
      ['msg_concurrent','Retry while the first is running','Sent 0.3 s after the slow attempt with the same key: the key row says started, so 409 Conflict.']]],
    ['Rate limits and streaming',[['rate_ok','Within the limit','201 with RateLimit-Policy and RateLimit headers (IETF draft-11).'],
      ['rate_limited','Over the limit','429 Too Many Requests with Retry-After.'],
      ['stream','A streamed reply','stream: true returns text/event-stream with chunked transfer encoding: one event per piece of text.']]]];
  const list=document.getElementById('wl-list');
  list.innerHTML=G.map(g=>'<div class="grp">'+g[0]+'</div><div class="wl-list">'+g[1].map(e=>{const c=+D.ex[e[0]].res.split(' ')[1];
    return '<button data-k="'+e[0]+'"><span class="c '+(c>=400?'e':'g')+'">'+c+'</span>'+esc(e[1])+'</button>'}).join('')+'</div>').join('');
  const meta={};G.forEach(g=>g[1].forEach(e=>meta[e[0]]=e));
  function curl(t){const hb=t.indexOf('\r\n\r\n');const hl=t.slice(0,hb).split('\r\n');const body=t.slice(hb+4);const m=hl[0].split(' ');
    const port=(hl.find(h=>/^Host:/i.test(h))||'').split(':').pop().trim();
    let s='curl -i'+(m[0]!=='GET'?' -X '+m[0]:'')+" 'http://localhost:"+port+m[1]+"'";
    hl.slice(1).forEach(h=>{if(/^(Host|User-Agent|Accept|Content-Length|Connection):/i.test(h))return;s+=" \\\n  -H '"+h+"'"});
    if(body)s+=" \\\n  -d '"+body+"'";return s}
  function show(k){list.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));const e=D.ex[k],x=document.getElementById('wl-x');
    document.getElementById('wl-title').textContent=meta[k][1];document.getElementById('wl-desc').textContent=meta[k][2];
    document.getElementById('wl-ms').textContent='('+e.ms+' ms end to end, including connecting)';
    RAW.render(document.getElementById('wl-req'),e.req,x);RAW.render(document.getElementById('wl-res'),e.res,x);x.textContent='Click a line.';
    document.getElementById('wl-curl').textContent=curl(e.req)}
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(b.dataset.k)});
  show('create');
})();
