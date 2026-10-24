// ---- Reading, section 9: SIGTERM with three things in flight (recorded; API_DATA.runs.shutdown[0] default, [1] timeout 1 s) ----
window.SHUT=(function(){
  const card=document.getElementById('rd-sd-card');if(!card)return null;
  const R=window.API_DATA.runs.shutdown,esc=RD.esc,svg=document.getElementById('rd-sd-svg'),cap=document.getElementById('rd-sd-cap');
  const LANES=[['srv','uvicorn and the app'],['slow','3 s request'],['bg','3 s background job'],['keep','idle keep-alive connection'],['new','new connection']];
  const res=r=>r===200?'200 OK':r;
  function events(v){const s=R[v],c=s.clients,E=[];const se=n=>(s.server_events.find(e=>e.ev.startsWith(n))||{}).ms,lg=n=>(s.uvicorn_log.find(e=>e.log.includes(n))||{}).ms;
    E.push({ms:c.keepalive_first.sent_ms,l:'keep',t:'A client makes a request on a keep-alive connection',p:'Answer '+res(c.keepalive_first.result)+' at '+c.keepalive_first.done_ms+' ms; the connection then stays open and idle, ready for the next request.'});
    E.push({ms:se('slow request: handler starts'),l:'slow',t:'A 3 s request starts',p:'Sent at '+c.slow_request.sent_ms+' ms; the handler starts at '+se('slow request: handler starts')+' ms and will need until about 3,200 ms.'});
    E.push({ms:se('job: background work starts'),l:'bg',t:'A request leaves a 3 s background job running',p:'Its response came back at '+c.bg_job.done_ms+' ms ('+res(c.bg_job.result)+'); the job keeps running in the same process.'});
    E.push({ms:s.sigterm_ms,l:'srv',t:'SIGTERM arrives',p:'What Kubernetes sends when it stops a pod. The signal handler only sets a flag.'});
    E.push({ms:lg('Shutting down'),l:'srv',t:'uvicorn starts shutting down',p:'"Shutting down" at '+lg('Shutting down')+' ms: the main loop checks the flag every 0.1 s. It closes the listening socket and asks every connection to shut down after its current response.'});
    E.push({ms:c.new_connection_after_sigterm.sent_ms,l:'new',t:'A new connection is refused',p:esc(c.new_connection_after_sigterm.result)+' at '+c.new_connection_after_sigterm.sent_ms+' ms. A load balancer that still routes here gets errors, which is why a preStop sleep exists.'});
    E.push({ms:c.keepalive_after_sigterm.sent_ms,l:'keep',t:'The idle keep-alive connection is gone',p:'A request on it at '+c.keepalive_after_sigterm.sent_ms+' ms fails with '+esc(c.keepalive_after_sigterm.result)+': uvicorn closed it because it had nothing in flight. Clients must retry such requests on a new connection, elsewhere.'});
    if(s.timeout_graceful_shutdown){
      E.push({ms:lg('Cancel'),l:'srv',t:'The timeout expires: running tasks are cancelled',p:'"Cancel 2 running task(s), timeout graceful shutdown exceeded" at '+lg('Cancel')+' ms, about 1 s after shutdown began.'});
      E.push({ms:c.slow_request.done_ms,l:'slow',t:'The slow request is cut',p:'The client gets no response: '+esc(c.slow_request.result)+' at '+c.slow_request.done_ms+' ms. The background job is cancelled at the same moment.'});
    }else{
      E.push({ms:c.slow_request.done_ms,l:'slow',t:'The slow request finishes normally',p:res(c.slow_request.result)+' at '+c.slow_request.done_ms+' ms: graceful shutdown waited for it. Then uvicorn logs "Waiting for background tasks to complete".'});
      E.push({ms:se('job: background work done'),l:'bg',t:'The background job finishes too',p:'Done at '+se('job: background work done')+' ms: uvicorn waits for tasks after connections.'});
    }
    E.push({ms:se('lifespan shutdown'),l:'srv',t:'Lifespan shutdown runs',p:'The code after the lifespan <code>yield</code> (close the pool) runs at '+se('lifespan shutdown')+' ms.'});
    E.push({ms:s.exit_ms,l:'srv',t:'The process exits',p:'At '+s.exit_ms+' ms, '+(s.exit_ms-s.sigterm_ms).toLocaleString('en-US')+' ms after SIGTERM, well inside the 30 s grace period. Exit status: killed by SIGTERM (uvicorn re-raises the signal it caught).'});
    E.sort((a,b)=>a.ms-b.ms);return E}
  let v=0,E=events(0);
  function draw(i){const s=R[v],W=RD.width(svg),pad=8,lab=W<560?0:170,x0=pad+lab,x1=W-pad-6,max=3600,sc=t=>x0+(x1-x0)*Math.max(0,t)/max,lh=lab?26:38;let b='';
    const ly={};LANES.forEach((l,k)=>{const y=6+k*lh;ly[l[0]]=y+(lab?4:16);b+=lab?RD.t(pad,y+15,l[1],{fs:12,fill:'var(--ink)'}):RD.t(pad,y+10,l[1],{fs:11,fill:'var(--mute)'});
      b+='<line x1="'+x0+'" y1="'+(ly[l[0]]+6)+'" x2="'+x1+'" y2="'+(ly[l[0]]+6)+'" stroke="var(--line)"/>'});
    const H=6+LANES.length*lh+20,now=E[i].ms;
    // sigterm line
    if(now>=s.sigterm_ms){const x=sc(s.sigterm_ms);b+='<line x1="'+x+'" y1="4" x2="'+x+'" y2="'+(H-18)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(x+3,H-20,'SIGTERM',{fs:11,fill:'var(--bad)'})}
    // spans so far
    const c=s.clients,span=(l,a,z,col)=>{if(now<a)return;b+='<rect x="'+sc(a)+'" y="'+ly[l]+'" width="'+Math.max(2,sc(Math.min(z,now))-sc(a))+'" height="12" rx="2" fill="'+col+'" opacity=".8"/>'};
    span('slow',c.slow_request.sent_ms,c.slow_request.done_ms,'var(--c5)');
    const bgEnd=(s.server_events.find(e=>e.ev.startsWith('job: background work'))&&s.server_events.filter(e=>e.ev.startsWith('job: background work')).pop().ms)||s.exit_ms;
    span('bg',c.bg_job.done_ms,bgEnd,'var(--c4)');span('keep',c.keepalive_first.done_ms,s.timeout_graceful_shutdown?c.keepalive_after_sigterm.sent_ms:c.keepalive_after_sigterm.sent_ms,'var(--line)');
    E.forEach((e,k)=>{if(k>i)return;const x=sc(e.ms),y=ly[e.l]+6;b+='<circle cx="'+x+'" cy="'+y+'" r="'+(k===i?6:4)+'" fill="'+(k===i?'var(--acc)':'var(--mute)')+'"/>'});
    [0,1000,2000,3000].forEach(t=>b+=RD.t(sc(t),H-4,t.toLocaleString('en-US')+' ms',{fs:11,fill:'var(--mute)',a:t?'middle':'start'}));
    svg.innerHTML=RD.svg(W,H,b,'Timeline lanes for the server, a slow request, a background job, an idle connection and a new connection around SIGTERM');
    cap.innerHTML='<div class="t">'+E[i].t+' <span class="small mute">('+E[i].ms.toLocaleString('en-US')+' ms; step '+(i+1)+' of '+E.length+')</span></div><p>'+E[i].p.replace(/\b(\d{4,})( ms)/g,(m,a,u)=>(+a).toLocaleString('en-US')+u)+'</p>'}
  const an=RD.anim({card:'rd-sd-card',ctl:'rd-sd-ctl',n:E.length,draw,ms:1800,label:'Event'});
  RD.seg(document.getElementById('rd-sd-seg'),m=>{v=+m;E=events(v);an.reset(E.length)});
  RD.onResize(()=>an.redraw());
  return {events};
})();
