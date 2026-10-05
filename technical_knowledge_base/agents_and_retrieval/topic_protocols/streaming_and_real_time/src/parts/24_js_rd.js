// ---- Reading: SSE anatomy, Wikimedia extract, reconnect replay (section 6), cancellation table ----
(function(){
  const D=window.SDATA,esc=RD.esc;
  // SSE event anatomy
  const INFO={ev:'<b>event: content_block_delta</b> (26 characters plus a newline = 27 bytes) sets this event\'s type. A browser delivers it to addEventListener(\'content_block_delta\'), not to onmessage.',
    data:'<b>data:</b> one line of JSON: 6 bytes of <code>data: </code>, 83 bytes of JSON, 1 newline. The token "The" is 3 of the 83.',
    blank:'<b>The blank line</b> (1 byte) is the signal: only now does the parser deliver the event. A stream cut before it loses the whole event.'};
  const ann=document.getElementById('sse-ann'),info=document.getElementById('sse-info');
  if(ann)ann.addEventListener('click',e=>{const s=e.target.closest('span[data-p]');if(!s)return;
    ann.querySelectorAll('span[data-p]').forEach(x=>x.classList.toggle('on',x===s));info.innerHTML=INFO[s.dataset.p]});
  // Wikimedia extract
  const wm=document.getElementById('wm-pre');
  if(wm)wm.textContent='$ '+D.wm.cmd+'\n'+D.wm.headers.join('\n')+'\n\n'+D.wm.first_line+'\n\nevent: '+D.wm.event_type_line+'\nid: '+D.wm.ids[0]+'\ndata: {'+D.wm.data_keys.map(k=>'"'+k+'":...').join(',')+'}\n\n(field values not kept; '+D.wm.complete_events_in_4s+' events in 4 s)';
  // cancellation table
  const cr=document.getElementById('cancel-rows');
  if(cr){const L={think_careful0:['Naive','during a 3 s think'],think_careful1:['Careful','during a 3 s think'],tokens_careful0:['Naive','while tokens flow'],tokens_careful1:['Careful','while tokens flow']};
    cr.innerHTML=['think_careful0','think_careful1','tokens_careful0','tokens_careful1'].map(k=>{const c=D.cancel.find(x=>x.tag===k);const s=c.server;
      return '<tr><td>'+L[k][0]+'</td><td>'+L[k][1]+' (client read '+c.events_client_read+' event'+(c.events_client_read===1?'':'s')+')</td><td class="num">'+s.work_seconds.toFixed(2)+' s, '+s.events_written+' event'+(s.events_written===1?'':'s')+' written</td><td>'+esc(s.stopped_by)+'</td></tr>'}).join('')}
  // reconnect replay
  const card=document.getElementById('rc-card');if(!card)return;
  let mode='no_ids';
  const TXT=e=>e[2].replace(/ #\d+$/,'');
  function steps(){const sc=D.rc.scenarios[mode];return sc.client}
  function draw(i){
    const sc=D.rc.scenarios[mode],cl=sc.client.slice(0,i+1);
    let shown='',seen={},n=0;const toks=[];
    cl.forEach(e=>{if(e[1]==='content_block_delta'){const t=TXT(e);const key=t;const dup=seen[key];seen[key]=1;toks.push('<span'+(dup?' class="dup"':'')+'>'+esc(t).replace(/ /g,'&nbsp;')+'</span>')}});
    document.getElementById('rc-shot').innerHTML=toks.length?toks.join(''):'<span class="mute">(nothing yet)</span>';
    const e=sc.client[i];
    // server-side reconnects with Last-Event-ID up to this time
    const opens=sc.client.slice(0,i+1).filter(x=>x[1]==='open').length;
    const srv=sc.server.filter(r=>r.work===null);const thisOpen=srv[opens-1];
    let what='';
    if(e[1]==='open')what='Connection '+opens+' open'+(opens>1?'; the request carried Last-Event-ID: '+(thisOpen&&thisOpen.last_event_id!==null?thisOpen.last_event_id:'(none)'):'')+'.';
    else if(e[1]==='error')what=e[2]==='CLOSED'?'The server answered 204: EventSource fails the connection and stops for good (readyState CLOSED).':'The connection dropped; EventSource reports an error and will reconnect (readyState CONNECTING).';
    else if(e[1]==='message_start')what='message_start'+(e[2]?' (id '+e[2].replace(/^ #/,'')+')':'')+': the answer begins'+(opens>1?' again from the top':'')+'.';
    else if(e[1]==='message_stop')what='message_stop'+(e[2]?' (id '+e[2].replace(/^ #/,'')+')':'')+': the answer is complete.';
    else what='Token "'+esc(TXT(e).trim())+'"'+(e[2].match(/#\d+/)?' with id '+e[2].match(/#(\d+)/)[1]:'')+'.';
    document.getElementById('rc-cap').innerHTML='<div class="t">'+e[0].toFixed(3)+' s</div><p>'+what+'</p>';
    const reps=toks.filter(t=>t.indexOf('dup')>0).length;
    document.getElementById('rc-cnt').innerHTML=RD.stat('Connections opened',String(opens),'')+RD.stat('Tokens shown',String(toks.length),reps?reps+' of them repeats':'no repeats')+RD.stat('Last-Event-ID sent',String(srv.filter((r,k)=>k<opens&&r.last_event_id!==null).length),'reconnects that could resume');
  }
  const A=RD.anim({card:'rc-card',ctl:'rc-ctl',n:steps().length,draw,ms:900,label:'Step'});
  RD.seg(document.getElementById('rc-mode'),v=>{mode=v;A.reset(steps().length);A.play()});
})();
