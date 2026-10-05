// ---- Reading, part B: the deadline animation, failures, retries, pings, balancing tables, GraphQL, drills, glossary ----
(function(){
  const S=window.SA,esc=RD.esc,set=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h};
  // ---- deadlines: one abandoned request, four endings ----
  const DL=S.deadline,FIRST=0.12,GAP=0.05,TMAX=2.4,STEP=0.1,N=Math.round(TMAX/STEP)+1;
  let mode=0;
  const tt=i=>FIRST+GAP*i;
  const NAMES={propagate:'deadline and cancellation propagated',none:'nothing propagated, plain loop',thread:'nothing propagated, worker thread'};
  function draw(step){
    const r=DL[mode],t=step*STEP,gone=r.client.gave_up_s,inf=r.inference,gw=r.gateway;
    const pct=x=>(100*x/TMAX).toFixed(2)+'%';
    const ticks=(n,col,cut)=>{let h='';for(let i=0;i<n;i++){const x=tt(i);if(x>t)break;h+='<i style="left:'+pct(x)+';background:'+(cut&&x>cut?'var(--bad)':col)+'"></i>'}return h};
    const lane=(nm,inner,end)=>'<div class="ln">'+nm+'</div><div class="tr">'+inner+(t>=gone?'<span class="cut" style="left:'+pct(gone)+'"></span>':'')+'<span class="now" style="left:'+pct(Math.min(t,TMAX))+'"></span></div>';
    const infEnd=Math.min(inf.dur_s,TMAX);
    set('rd-dlplot','<div class="dlg">'+
      lane('Client',ticks(r.client.tokens_received,'var(--c1)'))+
      lane('Gateway',ticks(Math.min(gw.tokens_forwarded,r.client.tokens_received+1),'var(--c4)'))+
      lane('Inference',ticks(inf.tokens_made,'var(--c3)',gone))+
      '<div class="ln"></div><div class="small mute" style="display:flex;justify-content:space-between"><span>0 s</span><span>time &rarr;</span><span>'+TMAX+' s</span></div></div>'+
      '<div class="leg"><span style="--sw:var(--c1)">token delivered to the user</span><span style="--sw:var(--c4)">forwarded by the gateway</span><span style="--sw:var(--c3)">generated</span><span style="--sw:var(--bad)">generated after the user left</span><span style="--sw:var(--bad)">red line: client gives up at '+gone+' s</span></div>');
    const madeBy=n=>{let k=0;for(let i=0;i<n;i++)if(tt(i)<=t)k++;return k};
    const made=madeBy(inf.tokens_made),after=Math.max(0,made-madeBy(Math.min(inf.tokens_made,r.client.tokens_received)));
    set('rd-dlcnt',RD.stat('Tokens to the user',Math.min(made,r.client.tokens_received)+(t>=gone?' (final: '+r.client.tokens_received+')':''),r.client.code)+
      RD.stat('Tokens generated',made+(t>=infEnd?' (final: '+inf.tokens_made+')':''),'inference service')+
      RD.stat('Generated for nobody',after,after?'GPU work wasted':'')+
      RD.stat('Deadline seen by the inference service',inf.time_remaining_s==null?'none':inf.time_remaining_s+' s',r.hop2_timeout?'grpc-timeout: '+r.hop2_timeout:'no grpc-timeout header'));
    let cap;
    if(t<FIRST)cap=['Prefill','The request crossed both hops; the inference service is computing the prompt before its first token (0.12 s here).'];
    else if(t<gone)cap=['Streaming','Each token goes inference &rarr; gateway &rarr; client, one length-prefixed message per token.'];
    else if(t<gone+STEP)cap=[r.cancel_at?'The user closes the tab':'The client\'s deadline expires',r.cancel_at?'The client cancels: an RST_STREAM (CANCEL) reaches the gateway.':'At '+r.deadline+' s the client ends the call with DEADLINE_EXCEEDED and resets the stream.'];
    else{const m=r.mode;
      if(m==='propagate')cap=['Downstream stops too',(r.hop2_timeout?'The inference service had its own deadline (grpc-timeout '+r.hop2_timeout+') and the gateway also cancelled it: ':'The gateway\'s cancel hook reset the downstream stream: ')+'it stopped after '+inf.tokens_made+' tokens, in '+inf.dur_s+' s.'];
      else if(m==='thread')cap=['Nobody tells the GPU','The worker thread keeps reading the downstream stream, so the inference service, which never got a deadline, generates all '+inf.tokens_made+' tokens over '+inf.dur_s+' s; '+(inf.tokens_made-r.client.tokens_received)+' of them for nobody.'];
      else cap=['Rescued by accident','No deadline or hook, yet the downstream call was cancelled at about '+Math.round(r.hop2_end[0].ms)+' ms: closing the gateway\'s generator freed the call object, and CPython cancels a call when it is freed. Run D shows what happens when that accident does not occur.'];}
    set('rd-dlcap','<div class="t">'+(['A','B','C','D'][mode])+'. '+NAMES[r.mode]+(r.cancel_at?' (user cancels at '+r.cancel_at+' s, no deadline)':'')+': '+cap[0]+'</div><p>'+cap[1]+'</p>');
  }
  let A=null;
  if(document.getElementById('rd-dl')){
    A=RD.anim({card:'rd-dl',ctl:'rd-dlctl',n:N,ms:420,draw,label:'Time step'});
    RD.seg(document.getElementById('rd-dlseg'),m=>{mode=+m;A.reset(N);A.play()});
  }
  // ---- failures as the client sees them ----
  const ft=document.getElementById('rd-fails');
  if(ft)ft.innerHTML=S.status.cases.filter(c=>c.id!=='too_many_pings').map(c=>'<div class="fc"><div class="h"><span>'+esc(c.what)+'</span><span><b>'+c.code+'</b> &middot; '+c.ms+' ms</span></div><div class="small mute"><code>'+esc(c.call)+'</code></div>'+(c.details?'<div><code>'+esc(c.details)+'</code></div>':'')+'</div>').join('');
  set('rd-retrylog',S.status.retry.map(x=>'at '+x.ms+' ms ('+(x.header?'<code>grpc-previous-rpc-attempts: '+x.header+'</code>':'first attempt')+', '+(x.failed?'UNAVAILABLE':'OK')+')').join(', then '));
  // ---- keepalive pings until GOAWAY ----
  const pg=S.status.pings;
  set('rd-pings','<div class="tw"><table class="small"><thead><tr><th class="num">ms</th><th>Direction</th><th>Frame</th></tr></thead><tbody>'+
    pg.map(f=>'<tr'+(f.type==='GOAWAY'?' style="background:var(--hl)"':'')+'><td class="num">'+f.ms.toFixed(1)+'</td><td>'+(f.dir==='c>s'?'client &rarr;':'&larr; server')+'</td><td><b>'+f.type+'</b>'+(f.flags&&f.flags.length?' '+f.flags.join(','):'')+(f.type==='GOAWAY'?': error '+f.error+' (ENHANCE_YOUR_CALM), last stream '+f.last_stream+', debug "'+esc(f.debug)+'"':'')+(f.type==='RSTSTREAM'?': error '+f.error:'')+'</td></tr>').join('')+
    '</tbody></table></div><p class="small mute"><span class="meas">measured</span> through the frame proxy; the call itself was waiting for its first token (8 s), so no DATA frames flowed.</p>');
  set('rd-refl',S.status.services.map(s=>'<code>'+esc(s)+'</code>').join(', '));
  // ---- balancing tables ----
  const B=['backend-1','backend-2','backend-3'];
  const lc=document.querySelector('#rd-lbcounts tbody');
  if(lc)lc.innerHTML=S.lb.counts.map(c=>'<tr><td>'+esc(c.setup)+'</td>'+B.map(b=>'<td class="num">'+(c.answers[b]||0)+'</td>').join('')+'<td class="small">'+esc(c.note)+'</td></tr>').join('');
  const ls=document.querySelector('#rd-lbscale tbody');
  if(ls)ls.innerHTML=S.lb.timelines.map(t=>{const a=t.after_join,tot=Object.values(a).reduce((x,y)=>x+y,0);
    return '<tr><td>'+esc(t.setup)+'</td><td>'+B.map(b=>b.replace('backend-','b')+': '+(a[b]||0)).join(', ')+'</td><td class="num">'+Math.round(100*(a['backend-3']||0)/tot)+'%</td></tr>'}).join('');
  const first3=t=>{const c=t.calls.find(x=>x[1]==='backend-3');return c?c[0]:null};
  const ta=S.lb.timelines.find(t=>t.max_connection_age_s),t7=S.lb.timelines.find(t=>/^L7/.test(t.setup));
  if(ta&&first3(ta)!=null)set('rd-b3age',first3(ta).toFixed(2));
  if(t7&&first3(t7)!=null)set('rd-b3l7',(first3(t7)-t7.backend3_joined_s).toFixed(2));
  // ---- GraphQL ----
  const n1=S.gql.n1;
  if(document.getElementById('rd-n1')){const mx=Math.max(...n1.map(x=>x.naive.db_calls));
    set('rd-n1','<div class="bars">'+n1.map(x=>['naive','batched'].map(k=>'<div class="row"><div class="nm" title="'+esc(x.query)+'">Q'+(n1.indexOf(x)+1)+', '+(k==='naive'?'naive':'DataLoader')+'</div><div class="track"><div class="fill" style="width:'+(100*x[k].db_calls/mx).toFixed(1)+'%;background:var(--'+(k==='naive'?'bad':'good')+')"></div></div><div class="val">'+x[k].db_calls+' calls</div></div>').join('')).join('')+'</div>'+
      '<p class="small mute">'+n1.map((x,i)=>'Q'+(i+1)+' ('+esc(x.label)+'): <code>'+esc(x.query)+'</code>').join('<br>')+'</p>')}
  const fb=document.querySelector('#rd-fan tbody');
  if(fb)fb.innerHTML=S.gql.fanout.map(f=>'<tr><td class="num">'+f.depth+'</td><td class="num">'+f.static_cost.toLocaleString('en-GB')+'</td><td class="num">'+f.db_calls+'</td></tr>').join('')+
    '<tr><td class="num">5 (first: 20, then 10)</td><td class="num">'+S.gql.limit.static_cost.toLocaleString('en-GB')+'</td><td class="num">not run: '+esc(S.gql.limit.verdict)+' (limit '+S.gql.limit.limit.toLocaleString('en-GB')+')</td></tr>';
  const pp=document.getElementById('rd-partial');
  if(pp){const r=S.gql.partial.result;pp.textContent=JSON.stringify({data:{models:r.data.models.map(m=>({name:m.name,evals:m.evals.slice(0,2).concat(m.evals.length>2?['... '+(m.evals.length-2)+' more']:[])}))},errors:r.errors.slice(0,2).concat(r.errors.length>2?['... '+(r.errors.length-2)+' more, one per failed field']:[])},null,1)}
  // ---- drills ----
  document.querySelectorAll('#t-read .drill').forEach(d=>{const rev=d.querySelector('.rev');
    d.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      d.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.o===d.dataset.ans)x.classList.add('right')});
      if(b.dataset.o!==d.dataset.ans)b.classList.add('wrong');rev.hidden=false}))});
  // ---- glossary from the terms defined in the text ----
  const G={'g-schema':'A machine-readable description of the messages and operations an API accepts.','g-idl':'Interface definition language: the language a schema is written in (.proto files, OpenAPI, GraphQL SDL).',
    'g-ser':'Turning an in-memory object into bytes and back (JSON, protobuf).','g-stream':'A sequence of messages in one call, instead of exactly one each way.',
    'g-deadline':'The time after which the caller no longer wants an answer; gRPC sends it as grpc-timeout and every hop passes on what is left.',
    'g-rpc':'Remote procedure call: calling a function in another process as if it were local.','g-stub':'Generated client code that turns a method call into a network request.',
    'g-servicer':'The server-side class you implement; generated code routes calls to it.','g-idem':'Doing it twice has the same effect as doing it once.',
    'g-replica':'One running copy of a service.','g-lb':'Choosing which replica handles a connection or a call.',
    'g-protobuf':'Protocol Buffers: Google\'s schema language and binary encoding.','g-fieldnum':'The number that identifies a protobuf field on the wire; never reuse one.',
    'g-wiretype':'The 3 low bits of a protobuf tag saying how to read the value: VARINT, LEN, I32, I64.','g-varint':'An integer in 7-bit groups, low first, top bit set on every byte but the last.',
    'g-trailer':'HTTP fields sent after the body; gRPC puts grpc-status there.','g-trailersonly':'A gRPC response with no messages: status, content type and grpc-status in one HEADERS frame.',
    'g-channel':'A gRPC client\'s handle on a target: resolves names, holds connections, multiplexes calls.','g-subchannel':'One connection from a channel to one backend address.',
    'g-svcconfig':'JSON configuration for a gRPC client: retry policy, load-balancing policy, timeouts per method.',
    'g-keepalive':'An HTTP/2 PING on a quiet connection to detect that it died.','g-resolver':'The GraphQL function that produces one field\'s value.',
    'g-n1':'One query for a list, then one per item: N+1 backend calls.','g-dataloader':'A per-request helper that batches and caches the keys resolvers ask for.',
    'g-persisted':'GraphQL queries registered in advance and sent by hash; the server rejects anything else.'};
  const gl=document.getElementById('rd-gl');
  if(gl){const items=[...document.querySelectorAll('#t-read dfn[id]')].map(d=>[d.textContent.trim(),d.id]).filter(x=>G[x[1]]);
    items.sort((a,b)=>a[0].localeCompare(b[0],'en',{sensitivity:'base'}));
    gl.innerHTML=items.map(x=>'<div><b><a href="#'+x[1]+'">'+esc(x[0])+'</a></b>: '+G[x[1]]+'</div>').join('')}
})();
