// ---- Tab "One job, recorded": six recordings replayed step by step as a sequence diagram ----
(function(){
  const D=window.A2AD,esc=RD.esc,$=id=>document.getElementById(id);
  const ORDER=['mcp','main','resub','push','auth','cancel'];
  const LBL={mcp:'Before: MCP, Team A drives the tools',main:'After: A2A, Team A delegates',resub:'A2A: stream dropped',push:'A2A: push to a webhook',auth:'A2A: in-task auth',cancel:'A2A: cancel'};
  let mode='mcp';
  function caption(k,s,i,n){
    const T=s.title;
    if(s.dir==='hook')return ['Team B POSTs an update to Team A\'s webhook','The same StreamResponse object a stream would carry, with the per-task token and Team A\'s registered credentials in the headers. Team A answers 204.'];
    if(k==='mcp'){
      if(T.indexOf('tools/list')===0)return ['Team A lists Team B\'s tools','Every tool\'s name, description and JSON schemas go into Team A\'s model context, so its model can plan the calls.'];
      if(s.dir==='down'&&i===1)return ['The tool schemas arrive','Team A\'s model now knows Team B\'s building blocks: list_suites, load_checkpoint, run_shard. It has to plan the job itself.'];
      if(T.indexOf('tools/call')===0)return ['Team A\'s model calls one tool','One HTTP POST per step of Team B\'s pipeline. Look at the arguments in the raw message: Team A must know Team B\'s handle and shard numbers.'];
      return ['A tool result comes back','It goes straight into Team A\'s model context'+(s.note?' ('+s.note+')':'')+'. Each shard is another round trip and another result to read.']}
    if(T.indexOf('GET /.well-known')===0)return ['Discovery: Team A fetches the Agent Card','No credential is sent: the card is public.'];
    if(s.dir==='down'&&T.indexOf('200 OK')>0&&i===1&&k!=='resub')return ['The Agent Card arrives','Team A picks the first interface it supports (JSON-RPC) and reads the skills and the security scheme.'];
    if(T.indexOf('SendStreamingMessage')===0)return [i<4?'Team A sends the job, asking for a stream':'Team A answers in the same task','One JSON-RPC request; the response will be a stream of events. '+(i>=4?'The message carries the taskId and contextId of the waiting task.':'')];
    if(T.indexOf('SendMessage')===0)return ['Team A sends the job and registers a webhook','returnImmediately is true and taskPushNotificationConfig names Team A\'s webhook, its token and credentials.'];
    if(T.indexOf('text/event-stream')>0)return ['The stream opens','HTTP 200 with Content-Type text/event-stream: one response that stays open; each update is one data: line.'];
    if(T.indexOf('SubscribeToTask')===0)return ['Team A resubscribes to the task by id','The task never stopped. The first event of the new stream will be the whole task as it is now.'];
    if(T.indexOf('GetTask')===0)return ['Team A reads the task by id',k==='resub'?'Nobody is listening to a stream; the task is still working.':'A plain read of the task: state, artifacts and (unless limited) history.'];
    if(T.indexOf('CancelTask')===0)return ['Team A cancels the running task','The agent\'s cancel handler runs; the open stream will carry the final state too.'];
    if(T.indexOf('/oob/grant')>=0)return ['A person on Team A\'s side grants access','Scripted stand-in for a click on the agent\'s own grant page: the credential goes to the agent directly, not through the task\'s messages.'];
    if(s.state){const st=s.state.replace('TASK_STATE_','').toLowerCase().replace('_','-');
      const M={submitted:'The task exists: server-made id and contextId.',working:'Team B\'s agent is working; its status message says what it is doing.',
        'input-required':'Interrupted: the agent asks which suite. The SDK closes this stream; Team A must answer with a new request.',
        'auth-required':'Interrupted: the agent needs bucket access, granted out of band. This stream stays open while it waits.',
        completed:'Terminal: done. The stream closes.',canceled:'Terminal: canceled.'};
      if(s.title.indexOf('SSE')===0&&i===n-1||T.indexOf('200 OK')>0&&st==='completed')return ['The task, read back: '+st,'Final state with all artifacts.'];
      return ['Event: '+st,M[st]||'']}
    if(T.indexOf('artifactUpdate')>=0)return ['An artifact piece streams in',T.indexOf('scores')>=0?'The result as a data part: structured, parseable, flagged as scripted.':'A progress log built from appended chunks; lastChunk marks the final piece.'];
    if(T.indexOf('200 OK')>0)return ['A reply','See the raw message.'];
    return [T,''];
  }
  function counters(k,i){const st=D.scen[k].steps.slice(0,i+1);
    let up=0,down=0,req=0,ctx=0;st.forEach(s=>{if(s.dir==='up'){up+=s.bytes;req++}else if(s.dir==='down')down+=s.bytes;ctx+=s.ctx||0});
    const hooks=st.filter(s=>s.dir==='hook').length;
    return RD.stat('Recorded time',st[st.length-1].t.toLocaleString('en-US')+' ms','from the first request')+RD.stat('HTTP requests by Team A',req,'')+
      RD.stat('Bytes up / down',up.toLocaleString('en-US')+' / '+down.toLocaleString('en-US'),'through the tap')+
      (k==='mcp'||k==='main'?RD.stat('Text Team A\'s model must read',ctx.toLocaleString('en-US')+' chars','schemas, results, messages, artifacts'):k==='push'?RD.stat('Webhook POSTs',hooks,'received by Team A'):RD.stat('Task state',(st.filter(s=>s.state).pop()||{state:'none yet'}).state.replace('TASK_STATE_','').toLowerCase(),''))}
  function draw(i){const sc=D.scen[mode],S=sc.steps,s=S[i],el=$('rn-svg'),W=RD.width(el);
    const lx=W*0.12,rx=W*0.88,rh=24,H=S.length*rh+10;let b='';
    b+='<line x1="'+lx+'" y1="0" x2="'+lx+'" y2="'+H+'" stroke="var(--line)" stroke-width="2"/><line x1="'+rx+'" y1="0" x2="'+rx+'" y2="'+H+'" stroke="var(--line)" stroke-width="2"/>';
    const fs=W<480?9.5:11,maxc=Math.floor((rx-lx-20)/(fs*0.56));
    S.forEach((q,j)=>{if(j>i)return;const y=j*rh+16,cur=j===i,col=q.dir==='up'?'var(--c1)':q.dir==='hook'?'var(--c4)':'var(--c3)';
      const x1=q.dir==='up'?lx:rx,x2=q.dir==='up'?rx-6:lx+6;
      b+='<line x1="'+x1+'" y1="'+y+'" x2="'+x2+'" y2="'+y+'" stroke="'+col+'" stroke-width="'+(cur?2.6:1.3)+'"'+(q.dir==='hook'?' stroke-dasharray="5 3"':'')+' opacity="'+(cur?1:.55)+'"/>';
      b+=q.dir==='up'?'<path d="M'+(rx-6)+' '+(y-4)+' L'+rx+' '+y+' L'+(rx-6)+' '+(y+4)+'" fill="'+col+'"/>':'<path d="M'+(lx+6)+' '+(y-4)+' L'+lx+' '+y+' L'+(lx+6)+' '+(y+4)+'" fill="'+col+'"/>';
      let lab=q.title.replace('SSE event  ','').replace('  (text/event-stream: the stream stays open)',' (stream opens)').replace('TASK_STATE_','');
      if(lab.length>maxc)lab=lab.slice(0,maxc-1)+'…';
      b+=RD.t((lx+rx)/2,y-4,esc(lab),{a:'middle',fs:fs,w:cur?600:400,fill:cur?undefined:'var(--mute)'});
      b+=RD.t(2,y+4,(q.t>=1000?(q.t/1000).toFixed(2)+'s':Math.round(q.t)+''),{fs:9,fill:'var(--mute)'});});
    el.innerHTML=RD.svg(W,H,b,'Sequence of recorded messages');
    const c=caption(mode,s,i,S.length);
    $('rn-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+esc(c[0])+'</div><p>'+esc(c[1])+'</p>';
    $('rn-cnt').innerHTML=counters(mode,i);
    $('rn-hdr').textContent=(s.dir==='up'?'Team A to Team B':s.dir==='hook'?'Team B to Team A\'s webhook':'Team B to Team A')+', '+s.bytes.toLocaleString('en-US')+' bytes, at '+s.t+' ms';
    $('rn-raw').textContent=s.raw}
  const A=RD.anim({card:'rn-card',ctl:'rn-ctl',n:D.scen[mode].steps.length,draw,ms:1500,label:'Step',tab:'t-run'});
  $('rn-seg').innerHTML=ORDER.map(k=>'<button data-m="'+k+'"'+(k===mode?' class="on"':'')+'>'+esc(LBL[k])+'</button>').join('');
  RD.seg($('rn-seg'),m=>{mode=m;A.reset(D.scen[m].steps.length);A.play()});
  addEventListener('resize',()=>{const t=$('t-run');if(t&&!t.hidden)A.redraw()});
})();
