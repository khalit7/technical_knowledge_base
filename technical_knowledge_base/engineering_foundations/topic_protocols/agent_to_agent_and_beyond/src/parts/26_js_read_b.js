// ---- Reading tab, part 2: task states (graph), the dropped stream, errors, in-task auth stats, UCP profile and checkout statuses (graph) ----
(function(){
  const D=window.A2AD,esc=RD.esc,$=id=>document.getElementById(id);
  const S=k=>D.scen[k].steps;
  const find=(k,f)=>S(k).find(f);
  // ---------- task states ----------
  const ST={
    SUBMITTED:{band:'Active',m:'Accepted, not started yet.',out:'The agent starts work (working), or rejects it.',ev:find('main',s=>s.state==='TASK_STATE_SUBMITTED')},
    WORKING:{band:'Active',m:'The agent is doing the work; status messages and artifact pieces may stream.',out:'The agent: to an interrupted state, or to a terminal one. The client can cancel.',ev:find('main',s=>s.state==='TASK_STATE_WORKING')},
    INPUT_REQUIRED:{band:'Interrupted',m:'The agent needs something from the client (here: which suite).',out:'The client sends a message with the same taskId and contextId.',ev:find('main',s=>s.state==='TASK_STATE_INPUT_REQUIRED')},
    AUTH_REQUIRED:{band:'Interrupted',m:'The agent needs an authorization it must get out of band (here: read access to a bucket).',out:'Whoever can grant it, directly to the agent; the agent then continues by itself.',ev:find('auth',s=>s.state==='TASK_STATE_AUTH_REQUIRED')},
    COMPLETED:{band:'Terminal',m:'Done; results are in the artifacts.',out:'Nothing: terminal. A new message in the same context starts a new task.',ev:find('main',s=>s.state==='TASK_STATE_COMPLETED'&&s.title.indexOf('SSE')===0)},
    FAILED:{band:'Terminal',m:'The agent tried and could not finish.',out:'Nothing: terminal. Retrying (as a new task) may work.',ev:null},
    CANCELED:{band:'Terminal',m:'Stopped at the client\'s request (CancelTask).',out:'Nothing: terminal.',ev:find('cancel',s=>s.state==='TASK_STATE_CANCELED'&&s.title.indexOf('SSE')===0)},
    REJECTED:{band:'Terminal',m:'The agent decided not to do it (here: a delete request to an evaluation agent).',out:'Nothing: terminal. Retrying unchanged is pointless.',ev:{raw:D.rejected}}};
  const C={Active:'var(--c1)',Interrupted:'var(--c2)',Terminal:'var(--c3)'};
  const NODES={};Object.keys(ST).forEach(k=>NODES[k]={label:k.toLowerCase().replace('_','-'),col:C[ST[k].band]});
  const POS={SUBMITTED:[[.15,1],[.25,1]],WORKING:[[.5,1],[.75,1]],INPUT_REQUIRED:[[.3,0],[.25,0]],AUTH_REQUIRED:[[.7,0],[.75,0]],
    REJECTED:[[.125,2],[.25,2]],COMPLETED:[[.375,2],[.75,2]],FAILED:[[.625,2],[.25,3]],CANCELED:[[.875,2],[.75,3]]};
  Object.keys(POS).forEach(k=>{NODES[k].wide=POS[k][0];NODES[k].narrow=POS[k][1]});
  let cur='INPUT_REQUIRED';
  function drawSt(){RDF.graph({el:'rd-st-svg',nodes:NODES,sel:cur,title:'The eight A2A task states',onPick:k=>{cur=k;drawSt()},
      bands:[{label:'interrupted: waiting for someone',c:'var(--c2)',wide:[0,0],narrow:[0,0]},{label:'active',wide:[1,1],narrow:[1,1]},{label:'terminal: no way out',wide:[2,2],narrow:[2,3]}],
      edges:[['SUBMITTED','WORKING'],['WORKING','INPUT_REQUIRED',{both:true}],['WORKING','AUTH_REQUIRED',{both:true}],['SUBMITTED','REJECTED'],['WORKING','COMPLETED'],['WORKING','FAILED',{wideOnly:true}],['WORKING','CANCELED',{wideOnly:true}]]});
    const s=ST[cur];
    $('rd-st-det').innerHTML='<h3><code>TASK_STATE_'+cur+'</code> <span class="small mute">('+s.band.toLowerCase()+')</span></h3><dl class="kv"><dt>Meaning</dt><dd>'+esc(s.m)+'</dd><dt>Way out</dt><dd>'+esc(s.out)+'</dd></dl>'+
      (s.ev?'<div class="small mute">The recorded event:</div><pre class="raw">'+esc(s.ev.raw)+'</pre>':'<p class="small mute">Not recorded: the scripted agent never fails.</p>')}
  RD.onRender(drawSt);RD.onResize(drawSt);drawSt();
  // ---------- the dropped stream ----------
  function drawResub(){const el=$('rd-resub-svg'),W=RD.width(el),R=S('resub');
    const T=Math.max(...R.map(s=>s.t))*1.04,x=t=>40+(W-60)*t/T,H=118;
    const rows={1:28,2:60,3:92};
    const row=s=>s.title.indexOf('GetTask')===0||(s.conn===1)?2:s.conn===0?1:3;
    let b='';
    [[0,'stream 1'],[1,'GetTask'],[2,'stream 2']].forEach(([i,l],j)=>{b+=RD.t(4,[28,60,92][j]+4,l,{fs:10,fill:'var(--mute)'})});
    const s1end=Math.max(...R.filter(s=>s.conn===0).map(s=>s.t));
    const s2=R.filter(s=>s.conn===2).map(s=>s.t);
    b+='<line x1="'+x(0)+'" y1="28" x2="'+x(s1end)+'" y2="28" stroke="var(--c1)" stroke-width="3"/>';
    b+='<line x1="'+x(Math.min(...s2))+'" y1="92" x2="'+x(Math.max(...s2))+'" y2="92" stroke="var(--c3)" stroke-width="3"/>';
    b+='<rect x="'+x(s1end)+'" y="10" width="'+Math.max(2,x(Math.min(...s2))-x(s1end))+'" height="96" fill="var(--hl)" opacity=".45"/>';
    b+=RD.t((x(s1end)+x(Math.min(...s2)))/2,20,'nobody listening',{a:'middle',fs:10});
    R.forEach(s=>{const y=s.conn===0?28:s.conn===1?60:92;const c=s.dir==='up'?'var(--mute)':s.title.indexOf('artifact')>=0?'var(--c4)':'var(--c1)';
      b+='<circle cx="'+x(s.t)+'" cy="'+y+'" r="4" fill="'+c+'"><title>'+esc(s.t+' ms: '+s.title)+'</title></circle>'});
    [0,1000,2000,3000].forEach(t=>{if(t<=T){b+='<line x1="'+x(t)+'" y1="104" x2="'+x(t)+'" y2="108" stroke="var(--mute)"/>'+RD.t(x(t),117,t/1000+' s',{a:'middle',fs:10,fill:'var(--mute)'})}});
    el.innerHTML=RD.svg(W,H+4,b,'Timeline of the dropped stream and the resubscription');
    const r=D.resub;
    $('rd-resub-txt').innerHTML='Stream 1 delivered '+r.first.length+' events (last at '+r.first[r.first.length-1][0]+' ms), then the client hung up. GetTask in the gap: <code>'+r.mid_state+'</code>. SubscribeToTask at '+r.second[0][0]+' ms: first event <code>'+r.second[0][1]+'</code> (the snapshot), then '+(r.second.length-1)+' live events to completion. Purple dots are artifact pieces.'}
  RD.onRender(drawResub);RD.onResize(drawResub);drawResub();
  // ---------- errors ----------
  const NAMES={message_to_completed_task:'Message to a completed task',cancel_completed_task:'Cancel a completed task',unknown_task:'GetTask, unknown id',other_callers_task:'GetTask on another caller\'s task (Team C token)',
    context_mismatch:'taskId with the wrong contextId',unsupported_version:'A2A-Version: 9.9',no_version_header_means_0_3:'Empty A2A-Version header',v0_3_method_name:'0.3-style message/send',malformed_json:'Truncated JSON body',
    unknown_method:'Unknown method tasks/delete',rest_get_task:'HTTP+JSON: GET /tasks/{id} (works)',rest_unknown_task:'HTTP+JSON: GET /tasks/no-such-task'};
  let eSel=0;
  function errs(){$('rd-err-t').innerHTML='<thead><tr><th>Request</th><th class="num">HTTP</th><th class="num">Code</th><th>Reason / message</th></tr></thead><tbody>'+
    D.errors.map((e,i)=>'<tr data-i="'+i+'" style="cursor:pointer'+(i===eSel?';background:var(--acc2)':'')+'"><td>'+esc(NAMES[e.name]||e.name)+'</td><td class="num">'+e.status+'</td><td class="num">'+(e.code==null?'':e.code)+'</td><td><code>'+esc(e.reason||'')+'</code> '+esc((e.message||'').slice(0,70))+'</td></tr>').join('')+'</tbody>';
    const e=D.errors[eSel];$('rd-err-raw').textContent=e.req+'\n\n'+e.resp}
  $('rd-err-t').addEventListener('click',ev=>{const tr=ev.target.closest('tr[data-i]');if(!tr)return;eSel=+tr.dataset.i;errs()});errs();
  // ---------- in-task auth ----------
  const au=D.inauth,ar=find('auth',s=>s.state==='TASK_STATE_AUTH_REQUIRED');
  $('rd-auth-stats').innerHTML=RD.stat('Stream open while waiting',au.open?'yes':'no','checked about 1 s after auth-required')+RD.stat('Grant arrived at',au.grant_ms.toLocaleString('en-US')+' ms','scripted "person" clicking allow')+RD.stat('Final state',au.final.replace('TASK_STATE_','').toLowerCase(),'same stream, no new request');
  // ---------- UCP profile ----------
  const U=D.ucp,caps=Object.keys(U.capabilities),svc=U.services['dev.ucp.shopping']||[];
  $('rd-ucp-stats').innerHTML=RD.stat('Version',U.version,'older: '+Object.keys(U.supported_versions||{}).join(', '))+RD.stat('Shopping transports',svc.map(s=>s.transport).join(', '),'no REST or A2A at this store')+
    RD.stat('Capabilities and extensions',caps.length,caps.filter(k=>U.capabilities[k][0].extends).length+' are extensions')+RD.stat('Payment handlers',Object.keys(U.payment_handlers).length,Object.keys(U.payment_handlers).join(', '));
  $('rd-ucp-prof').textContent=JSON.stringify({ucp:U},null,1);
  // ---------- UCP checkout statuses ----------
  const CO={incomplete:['Missing information or issues to fix. Read messages[], fix, Update Checkout.','var(--c1)'],
    requires_escalation:['Needs the buyer: information the API cannot collect, or the buyer\'s own review. The business MUST give a continue_url; hand off.','var(--c2)'],
    ready_for_complete:['Everything present, nothing outstanding. The platform may call Complete Checkout.','var(--c6)'],
    complete_in_progress:['Complete Checkout accepted; the business is placing the order. No new Update or Complete; poll Get Checkout.','var(--c4)'],
    completed:['Order placed; the order object is present.','var(--c3)'],
    canceled:['Invalid or expired, possible from any state. Start a new session if needed.','var(--mute)']};
  let coSel='requires_escalation';
  const CN={incomplete:{wide:[.12,0],narrow:[.25,0]},requires_escalation:{wide:[.38,1],narrow:[.75,0]},ready_for_complete:{wide:[.38,0],narrow:[.25,1]},
    complete_in_progress:{wide:[.64,0],narrow:[.25,2]},completed:{wide:[.88,0],narrow:[.75,3]},canceled:{wide:[.88,1],narrow:[.25,3]}};
  Object.keys(CN).forEach(k=>{CN[k].label=k;CN[k].col=CO[k][1]});
  function drawCo(){RDF.graph({el:'rd-co-svg',nodes:CN,sel:coSel,title:'UCP checkout statuses',onPick:k=>{coSel=k;drawCo()},
      edges:[['incomplete','requires_escalation',{both:true}],['incomplete','ready_for_complete'],['ready_for_complete','complete_in_progress'],['complete_in_progress','completed'],
        ['requires_escalation','completed',{c:'var(--c2)',dash:true,label:'buyer on continue_url',dx:12,dy:20,n:{dx:-8,dy:4,a:'end'}}]]});
    $('rd-co-det').innerHTML='<b><code>'+coSel+'</code></b>: '+esc(CO[coSel][0])}
  RD.onRender(drawCo);RD.onResize(drawCo);drawCo();
})();
