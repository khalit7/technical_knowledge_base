// ---- Reading figures added on 2026-10-24: hero, annotated call, pagination, schema fan-out, idempotency, webhook,
// LLM formats, status-code decisions, balancer placement. Every SVG is drawn at the measured width and redrawn on resize.
(function(){
  const S=window.SA,esc=RD.esc,$=id=>document.getElementById(id);
  const CW=fs=>fs*0.56;                                  // approximate glyph width of the UI font
  function wrap(s,px,fs){const max=Math.max(6,Math.floor(px/CW(fs)));const out=[];let line='';
    String(s).split(' ').forEach(w=>{if(!line)line=w;else if((line+' '+w).length<=max)line+=' '+w;else{out.push(line);line=w}});if(line)out.push(line);return out}
  const T=(x,y,lines,o)=>{o=o||{};const fs=o.fs||12,lh=o.lh||fs*1.3;return lines.map((l,i)=>RD.t(x,y+i*lh,esc(l),Object.assign({},o,{fs}))).join('')};
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.r==null?7:o.r)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const MK='<defs><marker id="IDa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.col||'var(--mute)')+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>'};
  const draws=[];const reg=f=>{draws.push(f);f()};
  RD.onRender(()=>draws.forEach(f=>f()));RD.onResize(()=>draws.forEach(f=>f()));

  // ---- hero: the running request through three styles ----
  function hero(){const el=$('rd-herosvg');if(!el)return;const W=RD.width(el),fs=W<520?11.5:12.5;
    const nw=Math.min(250,Math.round(W*0.4)),lx=nw+28,lw=W-lx-4;
    const N=[['Your app','curl, an SDK, a browser','c1'],['API front door','auth, rate limits, idempotency, translation','c2'],['Router (L7)','picks a replica for each call','c4'],['Inference replicas','three copies of the model server','c3']];
    const E=[['REST + SSE over HTTPS: resources, versions, errors, pagination (2); an OpenAPI contract (3); Idempotency-Key (4); 429 and rate-limit headers (5); the provider format, Chat Completions, Responses or Messages (7)','c1'],
      ['gRPC: protobuf bytes (8), one HTTP/2 stream per call (9), a deadline that shrinks each hop (10), a status in the trailers and a retry policy (11)','c2'],
      ['Who answers: L4, L7 or client-side choice; keepalive and GOAWAY on long-lived connections (12, 13)','c4']];
    let y=8,body=MK.replace('IDa','hA');const ys=[],nhs=[];
    const lab=E.map(e=>wrap(e[0],lw,fs)),icon=nw>=200,sub=N.map((n,i)=>wrap(n[1],nw-24-(i===3&&icon?50:0),fs-1.5));
    N.forEach((n,i)=>{const nh=26+sub[i].length*(fs-1.5)*1.3+4;ys.push(y);nhs.push(nh);y+=nh;if(i<E.length)y+=Math.max(52,lab[i].length*fs*1.3+16)});
    const H=y+8;
    N.forEach((n,i)=>{const yy=ys[i],nh=nhs[i];body+=box(20,yy,nw,nh,{stroke:'var(--'+n[2]+')',sw:1.8});
      body+=RD.t(32,yy+19,esc(n[0]),{fs:fs+0.5,w:600})+T(32,yy+36,sub[i],{fs:fs-1.5,fill:'var(--mute)'});
      if(i===3&&icon){for(let k=0;k<3;k++)body+=box(nw-48+k*10,yy+8+k*4,26,16,{r:3,fill:'var(--soft)',stroke:'var(--c3)'})}
      if(i<E.length){const y1=yy+nh,y2=ys[i+1],mx=20+nw/2;body+=line(mx,y1+2,mx,y2-3,{col:'var(--'+E[i][1]+')',sw:2,arrow:'hA'});
        const ly=(y1+y2)/2-(lab[i].length-1)*fs*0.65+4;body+=T(lx,ly,lab[i],{fs});
        body+=line(mx+6,(y1+y2)/2,lx-6,(y1+y2)/2,{col:'var(--line)',sw:1,dash:'2 3'})}});
    // webhook back from the front door to the app
    const wy1=ys[1]+nhs[1]/2,wy0=ys[0]+nhs[0]/2;body+='<path d="M20,'+wy1+' C2,'+wy1+' 2,'+wy0+' 18,'+wy0+'" fill="none" stroke="var(--c5)" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#hA)"/>';
    body+=RD.t(9,(wy0+wy1)/2+4,'6',{fs:11,fill:'var(--c5)',w:600,a:'middle'});
    el.innerHTML=RD.svg(W,H,body,'The running request: your app calls the front door with REST and SSE, the front door calls a router with gRPC, the router picks one of three inference replicas; a dashed arrow labelled 6 is a webhook back to the app');
    el.insertAdjacentHTML('beforeend','<p class="small mute" style="margin:2px 0 0">Dashed arrow (6): when a batch ends, the front door calls <i>you</i>, a webhook. Other faces of the same services: gRPC-Web and Connect for browsers (14), GraphQL (15), JSON-RPC for MCP and A2A (16).</p>')}
  reg(hero);

  // ---- annotated call ----
  const AN=['Path: a plural noun for the resource collection, with the major version first. A v2 is a second API to run, so everything between majors must be additive.',
    'Dated version in a header: the server keeps old behaviour for clients that send an old date, and URLs never change. SDKs set it; a hand-written client that forgets it gets an error, not a surprise.',
    'Idempotency key: the client generates one UUID per logical action and repeats it on every retry, so the server can answer a repeat from its store instead of charging twice (section 4).',
    'Status: whose fault and whether to retry. 429 and 503 mean "yes, later"; 400 and 422 mean "no, fix the request".',
    'Retry-After: how long to wait, in seconds or as a date (section 5). A quota error omits it because waiting will not help.',
    'Request id: one per request, in a header and the body, written to your logs. "It failed" in a support ticket becomes one log search.',
    'Stable error type: code switches on it, so it is append-only and documented; clients must also handle types they have never seen.'];
  const ann=$('rd-anat');
  if(ann)ann.addEventListener('click',e=>{const s=e.target.closest('span[data-p]');if(!s)return;
    ann.querySelectorAll('span[data-p]').forEach(x=>x.classList.toggle('on',x===s));$('rd-anatinfo').innerHTML='<b>'+(+s.dataset.p+1)+'.</b> '+AN[+s.dataset.p]});

  // ---- pagination: offset against cursor while rows change ----
  (function(){const el=$('rd-pgsvg');if(!el)return;let mode=0;
    const states=[['c8','c7','c6','c5','c4','c3','c2','c1'],['c9','c8','c7','c6','c5','c4','c3','c2','c1'],['c9','c8','c7','c6','c4','c3','c2','c1']];
    // step: [db state index, page fetched (0 none) , event text]
    const ST=[[0,1],[1,0,'c9 is created'],[1,2],[2,0,'c5 is deleted'],[2,3],[2,9]];
    function pages(m){const res=[];let off=0,after=null;
      const fetch=(si)=>{const L=states[si];let rows;
        if(m===0){rows=L.slice(off,off+3);off+=3}else{const i=after?L.indexOf(after)+1:0;rows=L.slice(i,i+3);if(rows.length)after=rows[rows.length-1]}return rows};
      res[1]=fetch(0);res[2]=fetch(1);res[3]=fetch(2);return res}
    const CAP=[['Page 1','The user gets c8, c7, c6, the three newest chats. Offset remembers "skip 3"; the cursor remembers "after c6".'],
      ['A write between requests','Someone creates c9 at the top of the list. The user does not know.'],
      ['Page 2',''],['Another write','c5 is deleted.'],['Page 3',''],['What the user saw','']];
    function draw(i){const W=RD.width(el),fs=W<480?11:12,res=pages(mode),st=ST[i],L=states[st[0]];
      const upTo=i>=4?3:i>=2?2:1,seenRows=[];for(let p=1;p<=upTo;p++)res[p].forEach(r=>seenRows.push([r,p]));
      const cur=st[1]>0&&st[1]<9?st[1]:0,curRows=cur?res[cur]:[];
      const colW=Math.min(200,(W-30)/2),rh=24,x0=6,x1=x0+colW+24;let body='';
      body+=RD.t(x0,14,(W<560?'Database, newest first':'The list in the database, newest first'),{fs:fs,w:600})+RD.t(x1,14,(W<560?'Shown to the user':'What the user has been shown'),{fs:fs,w:600});
      L.forEach((r,k)=>{const y=24+k*rh,on=curRows.includes(r),isNew=(st[0]>=1&&r==='c9');
        const skipped=cur&&mode===0&&k<(cur-1)*3;
        body+=box(x0,y,colW,rh-4,{r:4,fill:on?'var(--acc2)':skipped?'var(--soft)':'var(--bg)',stroke:on?'var(--acc)':isNew?'var(--c5)':'var(--line)',dash:skipped?'3 2':null});
        body+=RD.t(x0+8,y+14,r+(isNew?'  (new)':''),{fs:fs});
        if(skipped)body+=RD.t(x0+colW-8,y+14,'skipped by offset',{fs:fs-1,a:'end',fill:'var(--mute)'});
        if(on)body+=RD.t(x0+colW-8,y+14,'page '+cur,{fs:fs-1,a:'end',fill:'var(--acc)',w:600})});
      if(i===3)body+=RD.t(x0+8,24+L.length*rh+12,'c5 deleted',{fs:fs-1,fill:'var(--bad)'});
      if(mode===1&&cur>1){const prev=res[cur-1][res[cur-1].length-1],k=L.indexOf(prev);if(k>=0){const y=24+k*rh+rh-2;body+=line(x0-4,y,x0+colW+4,y,{col:'var(--good)',sw:2});body+=RD.t(x0+colW-6,y-1,'cursor',{fs:fs-1.5,a:'end',fill:'var(--good)',w:600})}}
      const counts={};seenRows.forEach(([r])=>counts[r]=(counts[r]||0)+1);
      seenRows.forEach(([r,p],k)=>{const y=24+k*rh,dup=counts[r]>1;body+=box(x1,y,colW,rh-4,{r:4,fill:dup?'var(--hl)':'var(--bg)',stroke:dup?'var(--bad)':'var(--line)'});
        body+=RD.t(x1+8,y+14,'p'+p+'  '+r,{fs:fs})+(dup?RD.t(x1+colW-8,y+14,'shown twice',{fs:fs-1,a:'end',fill:'var(--bad)',w:600}):'')});
      const missing=i>=4?['c8','c7','c6','c4','c3','c2','c1'].filter(r=>!counts[r]):[];
      if(missing.length){const y=24+seenRows.length*rh+12;body+=RD.t(x1+4,y,'never shown: '+missing.join(', '),{fs:fs,fill:'var(--bad)',w:600})}
      const H=24+Math.max(L.length,seenRows.length+1)*rh+24;
      el.innerHTML=RD.svg(W,H,body,'Pagination: the list in the database beside what the user has been shown');
      let cap=CAP[i].slice();
      if(i===2)cap[1]=mode===0?'Offset skips 3 rows of the new list: c9, c8, c7. The user gets c6 again, then c5 and c4.':'The cursor asks for rows after c6: c5, c4, c3. The new row c9 does not disturb it.';
      if(i===4)cap[1]=mode===0?'Offset skips 6 rows: the list shrank, so the page starts at c2. c3 is never shown.':'The cursor asks for rows after c3: c2, c1. The deleted c5 simply is not there.';
      if(i===5)cap[1]=mode===0?'Offset showed one chat twice and never showed another, without any error. Both writes were ordinary.':'Every chat that existed was shown exactly once, whatever was written in between.';
      $('rd-pgcap').innerHTML='<div class="t">Step '+(i+1)+' of '+ST.length+': '+cap[0]+'</div><p>'+cap[1]+'</p>'}
    const A=RD.anim({card:'rd-pg',ctl:'rd-pgctl',n:ST.length,ms:1600,draw,label:'Step'});
    RD.seg($('rd-pgseg'),m=>{mode=+m;A.reset(ST.length)});reg(()=>A.redraw())})();

  // ---- schema fan-out ----
  function schema(){const el=$('rd-schemasvg');if(!el)return;const W=RD.width(el),fs=W<480?11.5:12.5;
    const O=[['Documentation','that cannot drift from the code'],['Client SDKs','generated for each language'],['Validation','at the gateway and in server stubs'],['Mocks and contract tests','before the server exists'],['A breaking-change diff in CI','fails the build when a field disappears']];
    const lw=Math.min(190,Math.round(W*0.36)),rx=lw+40,rw=W-rx-4,lh=(fs-1.5)*1.3;let body=MK.replace('IDa','sA');
    const sub=O.map(o=>wrap(o[1],rw-20,fs-1.5)),rh=sub.map(l=>26+l.length*lh),ys=[];let yy=4;rh.forEach(h=>{ys.push(yy);yy+=h+8});const H=yy;
    const ll=wrap('OpenAPI, .proto or SDL, reviewed like code',lw-24,fs-1.5),bh=34+ll.length*lh,cy=H/2;
    body+=box(4,cy-bh/2,lw,bh,{stroke:'var(--acc)',sw:2,fill:'var(--acc2)'})+RD.t(16,cy-bh/2+20,'The schema',{fs:fs+1,w:600})+T(16,cy-bh/2+38,ll,{fs:fs-1.5});
    O.forEach((o,k)=>{const y=ys[k];body+=line(lw+6,cy,rx-4,y+rh[k]/2,{col:'var(--acc)',sw:1.4,arrow:'sA'});
      body+=box(rx,y,rw,rh[k],{});body+=RD.t(rx+10,y+18,esc(o[0]),{fs,w:600})+T(rx+10,y+34,sub[k],{fs:fs-1.5,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,body,'One schema feeds documentation, client SDKs, validation, mocks and a breaking-change check in CI')}
  reg(schema);

  // ---- a small sequence-diagram renderer for the two steppers ----
  // lanes: names; msgs: {s (step), f, t (lane index), l (label), lost, self (box on lane f), col}
  function seq(el,lanes,msgs,step,label){const W=RD.width(el),fs=W<480?11:12,n=lanes.length,gap=(W-20)/n,X=k=>10+gap*k+gap/2;
    const lh=fs*1.25,lw=m=>m.self?Math.min(gap*1.8,W-20)-12:Math.min(W-12,Math.max(gap*Math.abs(m.t-m.f)-10,gap*1.5));
    const lab=msgs.map(m=>wrap(m.l,lw(m),fs));
    let y=36;const ys=msgs.map((m,i)=>{const yy=y;y+=lab[i].length*lh+(m.self?16:18);return yy});const H=y+6;
    let body=MK.replace('IDa','qA');
    lanes.forEach((l,k)=>{body+=box(X(k)-gap/2+6,4,gap-12,22,{r:5,fill:'var(--soft)'})+RD.t(X(k),19,esc(l),{fs,a:'middle',w:600})+line(X(k),26,X(k),H-4,{col:'var(--line)',sw:1.2,dash:'3 3'})});
    msgs.forEach((m,i)=>{if(m.s>step)return;const on=m.s===step,col=m.col?'var(--'+m.col+')':on?'var(--acc)':'var(--mute)',yy=ys[i],op=on?1:.55;
      body+='<g opacity="'+op+'">';
      if(m.self){const bw=Math.min(gap*1.8,W-20),bx=Math.max(4,Math.min(W-bw-4,X(m.f)-bw/2)),bh=lab[i].length*fs*1.25+8;
        body+=box(bx,yy,bw,bh,{r:5,fill:on?'var(--acc2)':'var(--bg)',stroke:col});body+=T(bx+6,yy+fs+2,lab[i],{fs})}
      else{const x1=X(m.f),x2=X(m.t),ly=yy+lab[i].length*lh+5,w2=lw(m)/2;const mid=Math.max(4+w2,Math.min(W-4-w2,(x1+x2)/2));
        body+=T(mid,yy+fs,lab[i],{fs,a:'middle'});
        if(m.lost){const xm=x1+(x2-x1)*0.55;body+=line(x1,ly,xm,ly,{col,sw:1.8,dash:'5 3'})+'<text x="'+xm+'" y="'+(ly+5)+'" font-size="16" text-anchor="middle" fill="var(--bad)" font-weight="700">&#215;</text>'}
        else body+=line(x1,ly,x2+(x2>x1?-3:3),ly,{col,sw:on?2.2:1.6,arrow:'qA'})}
      body+='</g>'});
    el.innerHTML=RD.svg(W,H,body,label)}

  // ---- idempotency: one message, a lost reply, a retry ----
  (function(){const el=$('rd-idemsvg');if(!el)return;let mode=0;
    const L=['Client','Front door','Store'];
    const M=m=>[{s:0,f:0,t:1,l:m?'POST /v1/messages, Idempotency-Key: k_7f3c':'POST /v1/messages (no key)'},
      {s:1,f:1,t:2,l:m?'INSERT key k_7f3c, fingerprint, status started (unique)':'nothing recorded about the attempt'},
      {s:2,f:2,self:1,l:m?'one transaction: msg_1 saved, 10 credits charged, key done, response stored':'msg_1 saved, 10 credits charged'},
      {s:3,f:1,t:0,lost:1,l:'201 Created, lost on the way back',col:'bad'},
      {s:4,f:0,t:1,l:m?'timeout at 30 s; same request, same key k_7f3c':'timeout at 30 s; same request again'},
      {s:5,f:1,t:2,l:m?'k_7f3c exists, fingerprint matches, status done':'msg_2 saved, 10 more credits charged',col:m?'good':'bad'},
      {s:6,f:1,t:0,l:m?'the stored 201, Idempotent-Replayed: true':'201 Created for a duplicate message',col:m?'good':'bad'}];
    const CAP=[['The request leaves','The user pressed Send once.'],['Before any work',''],['The work','The model answers and the credits are charged.'],['The reply is lost','A tunnel, a proxy reset, a phone that slept: the client cannot tell this from a request that never arrived.'],['The client retries','It must, or the user\'s message is lost.'],['The server sees the retry',''],['What the user ends up with','']];
    function draw(i){seq(el,L,M(mode),i,'Sequence diagram: client, front door and store, one message sent, the reply lost, and a retry');
      let c=CAP[i].slice();
      if(i===1)c[1]=mode?'The front door claims the key with an insert under a unique constraint, so of two simultaneous attempts exactly one wins.':'Without a key the server has no way to recognise a repeat later.';
      if(i===5)c[1]=mode?'The key is already done and the request fingerprint matches, so the server does no work: it answers from the store. (A different body under the same key would get 422; a retry while the first is still running, 409.)':'To the server this is a new message. The model runs again and the user pays again.';
      if(i===6)c[1]=mode?'One message, 10 credits, and the same response the first attempt would have returned.':'Two messages, 20 credits, and a duplicate in the chat.';
      $('rd-idemcap').innerHTML='<div class="t">Step '+(i+1)+' of 7: '+c[0]+'</div><p>'+c[1]+'</p>'}
    const A=RD.anim({card:'rd-idem',ctl:'rd-idemctl',n:7,ms:1700,draw,label:'Step'});
    RD.seg($('rd-idemseg'),m=>{mode=+m;A.reset(7)});reg(()=>A.redraw())})();

  // ---- webhook: one delivery that goes wrong in the usual way ----
  (function(){const el=$('rd-hooksvg');if(!el)return;
    const L=['Provider','Receiver','Queue'];
    const M=[{s:0,f:0,self:1,l:'batch msgbatch_1 ended; sign HMAC-SHA256(secret, "msg_2Kx.1729760000.<raw body>")'},
      {s:1,f:0,t:1,l:'POST, webhook-id: msg_2Kx, webhook-timestamp, webhook-signature: v1,...'},
      {s:2,f:1,self:1,l:'verify on raw bytes, timestamp within 5 min; then does the work inline (slow)'},
      {s:3,f:0,self:1,l:'no 2xx before the provider\'s timeout: attempt 1 failed',col:'bad'},
      {s:4,f:0,t:1,l:'retry after 5 s: same webhook-id, new signature'},
      {s:5,f:1,self:1,l:'webhook-id msg_2Kx already processed: 204, no second side effect',col:'good'},
      {s:6,f:1,t:2,l:'the better receiver: verify, record the id, enqueue',col:'good'},
      {s:6,f:1,t:0,l:'204 within milliseconds',col:'good'}];
    const CAP=[['The event','The provider builds the payload and signs the id, the timestamp and the exact bytes of the body.'],['Attempt 1','The signature headers travel with the body.'],['The receiver is slow','Verification is right; doing the work before answering is the mistake.'],['Timeout','The provider cannot know the work happened, so it must try again.'],['Attempt 2','The schedule backs off: immediately, 5 s, 5 min, 30 min, on up to 24 hours.'],['Dedupe','At-least-once delivery means the receiver, not the provider, guarantees "once".'],['The fix','Answer at once and let a worker do the work from the queue; the provider never times out.']];
    function draw(i){seq(el,L,M,i,'Sequence diagram of a webhook delivery: signed POST, slow receiver, provider timeout, retry, dedupe by webhook-id');
      $('rd-hookcap').innerHTML='<div class="t">Step '+(i+1)+' of 7: '+CAP[i][0]+'</div><p>'+CAP[i][1]+'</p>'}
    const A=RD.anim({card:'rd-hook',ctl:'rd-hookctl',n:7,ms:1700,draw,label:'Step'});reg(()=>A.redraw())})();

  // ---- LLM formats toggle ----
  (function(){const f=$('rd-llm');if(!f)return;RD.seg($('rd-llmseg'),m=>f.querySelectorAll('[data-f]').forEach(d=>d.hidden=d.dataset.f!==m))})();

  // ---- status codes: retry or not ----
  function codes(){const el=$('rd-codessvg');if(!el)return;const W=RD.width(el),fs=W<480?11:12;
    const R=[['14 UNAVAILABLE','Retry this call, with backoff: it normally was not processed','good'],
      ['8 RESOURCE_EXHAUSTED','Wait as told (RetryInfo, pushback), then retry; a quota will not clear by waiting','c5'],
      ['10 ABORTED','Retry the whole read-modify-write, not just this call','c5'],
      ['4 DEADLINE_EXCEEDED','Retry only if idempotent or keyed: the work may have happened','bad'],
      ['3 INVALID_ARGUMENT, 9 FAILED_PRECONDITION','Do not retry: fix the input, or the state','bad'],
      ['16 UNAUTHENTICATED, 7 PERMISSION_DENIED','Do not retry: fix the credentials or the grant','bad']];
    const cw=Math.min(250,Math.round(W*(W<480?0.5:0.42))),rx=cw+24,rw=W-rx-4;let y=4,body=MK.replace('IDa','cA');
    R.forEach(r=>{const a=wrap(r[0],cw-16,fs),b=wrap(r[1],rw-16,fs),h=Math.max(a.length,b.length)*fs*1.3+12;
      body+=box(4,y,cw,h,{r:5,fill:'var(--soft)'})+T(12,y+fs+4,a,{fs,w:600});
      body+=line(cw+6,y+h/2,rx-4,y+h/2,{col:'var(--'+r[2]+')',sw:1.8,arrow:'cA'});
      body+=box(rx,y,rw,h,{r:5,stroke:'var(--'+r[2]+')',sw:1.6})+T(rx+8,y+fs+4,b,{fs});y+=h+8});
    el.innerHTML=RD.svg(W,y,body,'Which gRPC status codes may be retried and at what scope')}
  reg(codes);

  // ---- where the balancing choice is made ----
  function lbd(){const el=$('rd-lbdsvg');if(!el||!S)return;const W=RD.width(el),fs=W<480?10.5:11.5;
    const cnt=k=>{const c=S.lb.counts[k].answers;return ['backend-1','backend-2','backend-3'].map(b=>c[b]||0)};
    const P=[['L4 balancer','one connection, chosen once',2,'l4'],['L7 balancer','one connection to the proxy; a choice per call',3,'l7'],['Client, pick_first (default)','three addresses known, one connection',0,'pf'],['Client, round_robin','one connection per replica',1,'rr']];
    const cols=W>=760?4:2,pw=(W-(cols-1)*10)/cols,ph=170;let body=MK.replace('IDa','lA');
    P.forEach((p,k)=>{const ox=(k%cols)*(pw+10),oy=Math.floor(k/cols)*(ph+10),c=cnt(p[2]);
      body+=box(ox+1,oy+1,pw-2,ph-2,{r:8});body+=RD.t(ox+8,oy+16,esc(p[0]),{fs:fs+0.5,w:600})+T(ox+8,oy+30,wrap(p[1],pw-16,fs-1).slice(0,2),{fs:fs-1,fill:'var(--mute)'});
      const cx=ox+18,cy=oy+100,rxp=ox+pw-46,bx=ox+pw*0.47;
      body+=box(cx-12,cy-12,30,24,{r:4,fill:'var(--soft)',stroke:'var(--c1)'})+RD.t(cx+3,cy+4,'C',{fs,a:'middle',w:600});
      const rys=[cy-38,cy,cy+38];
      rys.forEach((ry,j)=>{body+=box(rxp,ry-11,40,22,{r:4,fill:'var(--soft)',stroke:'var(--c3)'})+RD.t(rxp+20,ry+4,String(c[j]),{fs,a:'middle',w:600,fill:c[j]?'var(--ink)':'var(--mute)'})});
      const thick=(x1,y1,x2,y2)=>line(x1,y1,x2,y2,{col:'var(--acc)',sw:3});
      if(p[3]==='l4'||p[3]==='l7'){body+=box(bx-12,cy-14,24,28,{r:4,fill:'var(--bg)',stroke:'var(--c4)'})+RD.t(bx,cy+4,p[3]==='l4'?'L4':'L7',{fs:fs-1,a:'middle'});
        body+=thick(cx+18,cy,bx-12,cy);
        if(p[3]==='l4')body+=thick(bx+12,cy,rxp,rys[0]);else rys.forEach(ry=>body+=line(bx+12,cy,rxp-3,ry,{col:'var(--acc)',sw:1.8,arrow:'lA'}))}
      else if(p[3]==='pf')body+=thick(cx+18,cy,rxp,rys[0])+rys.slice(1).map(ry=>line(cx+18,cy,rxp,ry,{col:'var(--line)',sw:1,dash:'3 3'})).join('');
      else rys.forEach(ry=>body+=thick(cx+18,cy,rxp,ry));
      body+=RD.t(ox+8,oy+ph-10,'30 calls: '+c.join(' / '),{fs:fs-0.5,fill:'var(--mute)'})});
    const H=Math.ceil(P.length/cols)*(ph+10);
    el.innerHTML=RD.svg(W,H,body,'Four ways to choose a replica: L4 balancer, L7 balancer, client pick_first and client round_robin, with the measured calls per replica');
    el.insertAdjacentHTML('beforeend','<p class="small mute" style="margin:4px 0 0">Thick lines are TCP connections; the numbers on the replicas are the measured calls out of 30 (table below). Dashed: addresses the client knows but does not use.</p>')}
  reg(lbd);
})();
