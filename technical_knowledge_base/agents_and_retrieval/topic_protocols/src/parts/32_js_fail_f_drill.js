// ---- Failure lab (t-fail): view switch, the "what would you check first?" drill, and the symptom-to-layer decision tree ----
(function(){
  const F=window.FL,$=id=>document.getElementById(id),esc=F.esc;
  // ---- view switch ----
  function mode(m){
    [...$('fl-mode').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.m===m));
    $('fl-browse').hidden=m!=='browse';$('fl-drillw').hidden=m!=='drill';$('fl-treew').hidden=m!=='tree';
    if(m==='drill'&&!ds.cur)next();if(m==='tree'&&!$('fl-tree').innerHTML)tree([]);
  }
  $('fl-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(b)mode(b.dataset.m)});
  function open(id){mode('browse');F.select(id,true)}
  // ---- drill ----
  const ds={order:[],k:0,cur:null,right:0,tried:0,picked:false};
  function shuffle(){ds.order=F.C.map(c=>c.id);for(let i=ds.order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ds.order[i],ds.order[j]]=[ds.order[j],ds.order[i]]}ds.k=0}
  function next(){if(!ds.order.length||ds.k>=ds.order.length)shuffle();ds.cur=F.byId[ds.order[ds.k++]];ds.picked=false;drill()}
  function drill(){
    const c=ds.cur,r=c.runs[0];
    $('fl-drill').innerHTML='<div class="small mute">Case '+ds.k+' of '+F.C.length+' (shuffled) &middot; score '+ds.right+' / '+ds.tried+'</div>'+
      '<div class="qq">'+esc(c.q)+'</div><div class="small mute">What the first client printed:</div>'+F.term(r)+
      '<div class="small" style="margin-top:8px"><b>Which layer failed first?</b></div><div class="fl-opts" id="fl-opts">'+
      F.LAYERS.map(l=>'<button data-l="'+l[0]+'">'+esc(l[0])+'</button>').join('')+'</div><div id="fl-ans"></div>'+
      '<div class="fl-opts"><button id="fl-reveal">Show the answer</button><button id="fl-next">Next case</button></div>';
    $('fl-opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||ds.picked)return;ds.picked=true;ds.tried++;
      const ok=b.dataset.l===c.layer;if(ok)ds.right++;b.classList.add(ok?'ok':'no');
      if(!ok)[...$('fl-opts').children].forEach(x=>{if(x.dataset.l===c.layer)x.classList.add('ok')});reveal()});
    $('fl-reveal').addEventListener('click',reveal);$('fl-next').addEventListener('click',next);
  }
  function reveal(){
    const c=ds.cur;$('fl-ans').innerHTML='<div class="fl-ans"><b>'+esc(c.layer)+': '+esc(c.t)+'.</b> '+c.a+'<br><span class="small">'+esc(c.cause)+'</span><br><a href="#" id="fl-open">Open the full case with every recorded run</a></div>';
    $('fl-open').addEventListener('click',e=>{e.preventDefault();open(c.id)});
    const s=document.querySelector('#fl-drill .small.mute');if(s)s.innerHTML='Case '+ds.k+' of '+F.C.length+' (shuffled) &middot; score '+ds.right+' / '+ds.tried;
  }
  // ---- decision tree: node = [question, [label, hint, next node id or case ids]] ----
  const T={
    root:['What did you see?',[
      ['An error before any HTTP status code','the client never got a response line',  'pre'],
      ['An HTTP status code, 4xx or 5xx','something answered over HTTP',               'status'],
      ['The answer started, then broke or stalled','streaming or long bodies',          'mid'],
      ['It works, but slowly or unevenly','latency, throughput, load',                 'slow'],
      ['An agent or MCP tool misbehaves','stdio, sessions, tool results',              'agent']]],
    pre:['Which words are in the error?',[
      ['could not resolve, ENOTFOUND, nodename nor servname, NXDOMAIN, SERVFAIL','DNS', 'dns'],
      ['connection refused, ECONNREFUSED (fails in milliseconds)','TCP',                ['refused']],
      ['timed out while connecting, ConnectTimeout (fails at your timeout)','TCP',     ['conn_timeout']],
      ['operation timed out with 0 bytes received, ReadTimeout','connected, no answer', ['read_timeout']],
      ['connection reset, empty reply, RemoteDisconnected','TCP or a closing peer',     ['reset','keepalive']],
      ['certificate, SSL, TLS, alert, ALPN','TLS',                                      'tls']]],
    dns:['What does dig say?',[
      ['status: NXDOMAIN','the name does not exist there',                              ['nxdomain','wrong_resolver']],
      ['status: SERVFAIL','the resolver failed',                                        ['servfail']],
      ['an answer, but the old address','caching',                                      ['stale_ttl']],
      ['answers, but slowly, and DNS servers are busy (Kubernetes)','search list',     ['ndots']]]],
    tls:['Which certificate or handshake message?',[
      ['certificate has expired','validity dates',                                      ['tls_expired']],
      ['not yet valid','clocks',                                                        ['tls_clock']],
      ['hostname mismatch, altnames, no alternative subject name','names',              ['tls_hostname']],
      ['unable to get local issuer, unable to verify the first certificate','trust chain',['tls_unknown_ca','tls_intermediate','dns_intercept']],
      ['Missing Authority Key Identifier (Python only)','strict checking',               ['tls_noaki']],
      ['no application protocol, missing selected ALPN','ALPN',                         ['tls_alpn']],
      ['certificate required, No required SSL certificate was sent','mTLS',             ['tls_mtls']]]],
    status:['Which status?',[
      ['401 Unauthorized','who are you? the token failed',                              ['jwt_expired','jwt_audience','jwt_clock','jwt_alg']],
      ['403 Forbidden','known, but not allowed',                                        ['jwt_scope']],
      ['400 during an OAuth login in the browser','redirect URI',                       ['oauth_redirect']],
      ['404 from an MCP endpoint','session',                                            ['mcp_session']],
      ['413','body too large for some hop',                                             ['http_413']],
      ['429','rate limited',                                                            ['http_429']],
      ['502','the proxy could not reach the server',                                    ['http_502']],
      ['504','the proxy gave up waiting',                                               ['http_504']]]],
    mid:['How does it break?',[
      ['it stops after a pause, about the same time every run','idle timeout',          ['sse_cut']],
      ['nothing for a while, then all the tokens at once','buffering',                  ['buffering']],
      ['bytes remaining, incomplete read, incomplete chunked read','truncated body',     ['short_body','sse_cut']],
      ['connection reset in the middle','the peer aborted',                             ['reset']]]],
    slow:['What is slow?',[
      ['one big transfer over a long link','window / RTT',                              ['window_rtt']],
      ['every small request takes about 40 ms','Nagle and delayed ACK',                 ['nagle']],
      ['latency grows in steps with concurrency; deadlines exceeded','stream limit',    ['max_streams']],
      ['one replica is hot, the others idle','L4 balancing of long connections',        ['grpc_pinning']],
      ['first requests from pods are slow; DNS servers busy','ndots',                   ['ndots']],
      ['old servers keep getting traffic after a move','DNS TTL, long-lived connections',['stale_ttl']]]],
    agent:['What does the agent or client show?',[
      ['Invalid JSON, or a stdio tool call hangs','stdout pollution',                  ['mcp_stdout']],
      ['404 Session not found','Streamable HTTP session',                               ['mcp_session']],
      ['401 or 403 from a remote MCP server','tokens',                                  ['jwt_audience','jwt_scope']],
      ['it did something nobody asked for after reading content','prompt injection',   ['prompt_injection']]]]};
  function tree(path){
    // path: list of chosen option indexes from the root
    let id='root',h='';
    for(let d=0;;d++){
      const n=T[id],pick=path[d];
      h+='<div class="fl-node"><div class="qq">'+esc(n[0])+'</div><div class="ch">'+n[1].map((o,i)=>'<button data-d="'+d+'" data-i="'+i+'" class="'+(pick===i?'on':'')+'">'+esc(o[0])+'<small>'+esc(o[1])+'</small></button>').join('')+'</div></div>';
      if(pick===undefined)break;
      const nx=n[1][pick][2];
      if(Array.isArray(nx)){h+='<div class="fl-leaf"><b>Look at:</b> '+nx.map(cid=>{const c=F.byId[cid];return F.tag(c.layer)+'<a href="#" data-open="'+cid+'">'+esc(c.t)+'</a>'}).join(' ')+'</div>';break}
      id=nx;
    }
    $('fl-tree').innerHTML=h;
    $('fl-tree').querySelectorAll('button[data-d]').forEach(b=>b.addEventListener('click',()=>{const d=+b.dataset.d;tree(path.slice(0,d).concat([+b.dataset.i]))}));
    $('fl-tree').querySelectorAll('a[data-open]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();open(a.dataset.open)}));
  }
  F.showMode=mode;
})();
