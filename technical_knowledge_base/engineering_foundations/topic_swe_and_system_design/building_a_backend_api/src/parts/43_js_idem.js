// ---- Reading, section 10: idempotency keys, before and after, with the database state at every step ----
(function(){
  const D=window.API_DATA,esc=RD.esc;
  const body=t=>{const b=D.ex[t].res;return b.slice(b.indexOf('\r\n\r\n')+4)};
  const status=t=>D.ex[t].res.split('\r\n')[0].replace('HTTP/1.1 ','');
  const K='7f9c2a1e...',H1='hash a1f3',H2='hash 9c07';
  // each step: ev = [arrow, text] appended to the timeline; db changes; cap; client = what the client knows
  function build(list){let st={ev:[],msgs:[],credits:1000,keys:[],att:0,client:'waiting'};const out=[];
    list.forEach(s=>{st=JSON.parse(JSON.stringify(st));if(s.ev)st.ev.push(s.ev);if(s.msg)st.msgs.push(s.msg);if(s.charge)st.credits-=s.charge;
      if(s.key)st.keys.push(s.key);if(s.keyset)Object.assign(st.keys[st.keys.length-1],s.keyset);if(s.att)st.att+=s.att;if(s.client)st.client=s.client;
      st.cap=s.cap;st.hl=s.hl||'';out.push(st)});return out}
  const send=(txt,key)=>['c2s','POST /v1/chats/42/messages '+txt+(key?' + Idempotency-Key: '+key:'')];
  const S={
    lost:{
      before:build([
        {ev:send('"Summarise this article"'),att:1,cap:['The user presses Send','The client sends the message. No idempotency key.']},
        {ev:['srv','Stores msg_1, charges 10 credits'],msg:'msg_1 "Summarise this article"',charge:10,hl:'db',cap:['The server does the work','The message is stored and 10 credits are charged in the database. The model has answered.']},
        {ev:['lost','201 Created ... lost in a tunnel'],cap:['The response is lost','The server sent 201, but the phone lost signal. The server believes it is done.']},
        {ev:['c2s','(30 s timeout) retry: same POST again'],att:1,client:'timed out, retrying',cap:['The client times out and retries','From the client\'s side, "never arrived" and "done, reply lost" look identical. Retrying is the only way to get the reply.']},
        {ev:['srv','A new request: stores msg_2, charges 10 more'],msg:'msg_2 "Summarise this article"',charge:10,hl:'db',cap:['The server cannot tell it is a retry','Nothing distinguishes the retry from a new message. A second copy is stored and charged.']},
        {ev:['s2c','201 Created (msg_2)'],client:'got a reply',cap:['Double effect','The user saw one reply and paid for two. In payments this is the double charge on the root page (Step 4).']}]),
      after:build([
        {ev:send('"Summarise this article"','7f9c...'),att:1,cap:['The client makes a key, once','Before the first attempt the client generates a UUID for this one message and keeps it until it gets a definite answer.']},
        {ev:['srv','INSERT key row: started'],key:{k:K,st:'started',h:H1,res:''},hl:'keys',cap:['Claim the key','The server inserts (user, key) with the request\'s hash. The primary key guarantees only one attempt can claim it.']},
        {ev:['srv','BEGIN; store msg_1; charge 10; save response; COMMIT'],msg:'msg_1 "Summarise this article"',charge:10,keyset:{st:'done',res:'201 {id: msg_1, credits_left: 990}'},hl:'db keys',cap:['Work and record in one transaction','The message, the charge and the stored response commit together.']},
        {ev:['lost','201 Created ... lost in a tunnel'],cap:['The response is lost','Same failure as before.']},
        {ev:['c2s','(30 s timeout) retry with the same key 7f9c...'],att:1,client:'timed out, retrying',cap:['The client retries with the same key','Same body, same key.']},
        {ev:['srv','INSERT fails: key exists, done, hash matches'],hl:'keys',cap:['The key is already there','The insert hits the primary key. The row is done and the hash matches, so this is a genuine retry.']},
        {ev:['s2c',status('msg_retry')+' + Idempotent-Replayed: true (stored body)'],client:'got the reply',cap:['Replay, do not re-run','The stored response comes back. Real captured body: '+esc(body('msg_retry'))+'. One message, 10 credits.']}])},
    conc:{
      before:build([
        {ev:send('"Summarise this article"'),att:1,cap:['A slow request','The model takes longer than usual (say 40 s; illustrative).']},
        {ev:['srv','Worker 1: calling the model...'],cap:['Still working','The first attempt is running; nothing is stored yet.']},
        {ev:['c2s','(30 s timeout) retry: same POST again'],att:1,client:'timed out, retrying',cap:['The client gives up first','Its timeout is shorter than the model call.']},
        {ev:['srv','Worker 2: calling the model again...'],cap:['A second, parallel execution','A different worker picks up the retry and starts a second model call: twice the GPU time.']},
        {ev:['srv','Both finish: msg_1 and msg_2, 20 credits'],msg:'msg_1 "Summarise this article"',charge:20,hl:'db',cap:['Both commit','Two messages and two charges.']},
        {ev:['s2c','201 Created (msg_2); worker 1\'s 201 goes nowhere'],client:'got a reply',msgs2:1,cap:['Double effect, double cost','The first answer was computed, charged and thrown away.']}].map((s,i)=>i===4?Object.assign(s,{msg:'msg_1, msg_2 (two copies)'}):s)),
      after:build([
        {ev:send('"Summarise this article"','0b1d...'),att:1,cap:['A slow request, with a key','In the real capture, a copy of the service was made to take 1 s per message.']},
        {ev:['srv','INSERT key row: started; calling the model...'],key:{k:'0b1d7e44...',st:'started',h:H1,res:''},hl:'keys',cap:['Claimed and running','The key row says started.']},
        {ev:['c2s','retry with the same key 0b1d... (0.3 s later in the capture)'],att:1,client:'timed out, retrying',cap:['A retry arrives early','The first attempt has not finished.']},
        {ev:['s2c',status('msg_concurrent')+': still in progress'],client:'told to retry later',hl:'keys',cap:['409, no second execution','INSERT fails, the row says started: answer 409 Conflict. Real captured body: '+esc(body('msg_concurrent'))]},
        {ev:['srv','First attempt commits: msg_1, 10 credits, response saved'],msg:'msg_1 "Summarise this article"',charge:10,keyset:{st:'done',res:'201 {id: msg_1, ...}'},hl:'db keys',cap:['The first attempt finishes','One message, one charge, response stored.']},
        {ev:['c2s','after a backoff: retry with the same key'],att:1,cap:['The client backs off and retries','Backoff with jitter: the reliability page.']},
        {ev:['s2c','201 Created + Idempotent-Replayed: true'],client:'got the reply',cap:['Replayed','The client gets the first attempt\'s result. One model call in total.']}])},
    diff:{
      before:build([
        {ev:send('"Summarise this article"'),att:1,cap:['First message','No key.']},
        {ev:['srv','Stores msg_1, charges 10'],msg:'msg_1 "Summarise this article"',charge:10,hl:'db',cap:['Stored','']},
        {ev:['s2c','201 Created'],client:'got a reply',cap:['Answered','']},
        {ev:send('"Something else"'),att:1,cap:['A second, different message','Without keys there is nothing to confuse: a different message is simply a new request.']},
        {ev:['srv','Stores msg_2, charges 10'],msg:'msg_2 "Something else"',charge:10,hl:'db',cap:['Correct','Two messages, two charges, as intended. This scenario only matters once keys exist.']}]),
      after:build([
        {ev:send('"Summarise this article"','7f9c...'),att:1,cap:['First message, key 7f9c...','']},
        {ev:['srv','Key claimed; msg_1 stored; 10 charged; response saved'],key:{k:K,st:'done',h:H1,res:'201 {id: msg_1, ...}'},msg:'msg_1 "Summarise this article"',charge:10,hl:'db keys',cap:['Done and recorded','']},
        {ev:['s2c','201 Created'],client:'got a reply',cap:['Answered','']},
        {ev:send('"Something else"','7f9c... (bug: reused)'),att:1,cap:['A client bug: the key is reused','The app generated the key once per screen instead of once per message.']},
        {ev:['srv','INSERT fails; stored '+H1+' differs from '+H2],hl:'keys',cap:['The hash catches it','Same key, different request.']},
        {ev:['s2c',status('msg_mismatch')+': key reused'],client:'error: use a new key',cap:['422, nothing replayed','Without the hash check the server would replay the first answer and the user\'s second message would silently vanish. Real captured body: '+esc(body('msg_mismatch'))]}])}
  };
  let scn='lost',mode='before';const view=document.getElementById('rd-id-view');
  const arrow={c2s:['&#8594;','var(--c1)','client to server'],s2c:['&#8592;','var(--good)','server to client'],lost:['&#8603;','var(--bad)','lost'],srv:['&#9881;','var(--c4)','server']};
  function draw(i){const s=S[scn][mode][i];
    const tl='<div style="min-width:0"><div class="small mute">What happens</div>'+s.ev.map((e,k)=>{const a=arrow[e[0]];return '<div style="display:flex;gap:6px;align-items:baseline;font-size:12.5px;padding:2px 4px;border-radius:4px;'+(k===s.ev.length-1?'background:var(--hl);':'')+'"><span style="color:'+a[1]+';font-weight:700" title="'+a[2]+'">'+a[0]+'</span><span style="min-width:0;overflow-wrap:anywhere">'+esc(e[1])+'</span></div>'}).join('')+'</div>';
    const box=(t,on,inner)=>'<div style="border:1px solid '+(on?'var(--acc)':'var(--line)')+';border-radius:6px;padding:4px 7px;margin:0 0 5px;background:'+(on?'var(--acc2)':'var(--bg)')+'"><div class="small mute">'+t+'</div>'+inner+'</div>';
    const db='<div style="min-width:0"><div class="small mute">Server database</div>'+
      box('messages',s.hl.includes('db'),s.msgs.length?s.msgs.map(m=>'<div class="mono" style="font-size:12px;overflow-wrap:anywhere">'+esc(m)+'</div>').join(''):'<div class="small mute">(empty)</div>')+
      box('credits',s.hl.includes('db'),'<div class="mono" style="font-size:12px">alice: <b>'+s.credits+'</b></div>')+
      (mode==='after'?box('idempotency_keys',s.hl.includes('keys'),s.keys.length?s.keys.map(k=>'<div class="mono" style="font-size:12px;overflow-wrap:anywhere">'+esc(k.k)+' | <b>'+k.st+'</b> | '+k.h+(k.res?' | '+esc(k.res):'')+'</div>').join(''):'<div class="small mute">(empty)</div>'):'<div class="small mute">No idempotency table: nothing remembers earlier attempts.</div>')+'</div>';
    view.innerHTML='<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">'+tl+db+'</div>';
    document.getElementById('rd-id-cap').innerHTML='<div class="t">'+s.cap[0]+'</div><p>'+(s.cap[1]||'')+'</p>';
    const msgs=scn==='conc'&&mode==='before'&&i>=4?2:s.msgs.length;
    document.getElementById('rd-id-cnt').innerHTML=RD.stat('Attempts sent',s.att)+RD.stat('Messages stored',msgs)+RD.stat('Credits charged',1000-s.credits)+RD.stat('Client',esc(s.client))}
  const A=RD.anim({card:'rd-id-card',ctl:'rd-id-ctl',n:S.lost.before.length,draw,ms:2300,label:'Idempotency step'});
  const re=()=>{A.reset(S[scn][mode].length);A.play()};
  RD.seg(document.getElementById('rd-id-scn'),m=>{scn=m;re()});
  RD.seg(document.getElementById('rd-id-seg'),m=>{mode=m;re()});
  window.__IDEM=S;
})();
