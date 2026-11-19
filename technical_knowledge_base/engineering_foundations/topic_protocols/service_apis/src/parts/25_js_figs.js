// ---- Reading figures added on 2026-10-24: annotated call, schema fan-out, webhook, LLM formats, status-code decisions
// (the hero, idempotency and balancer figures became 3D stages on 2026-11-07; the pagination stepper was removed on 2026-11-19, its
// behaviour now told in prose and its cost owned by Query planning and performance). Every SVG is drawn at the measured width and redrawn on resize.
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

  // (the 2D hero became the 3D stage stg-hero on 2026-11-07, then the 2D sequence sq-hero on 2026-11-19: 41_js_sc_hero.js)

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

  // (the idempotency stepper became the 3D stage stg-idem on 2026-11-07, driven by the recorded toy: 42_js_sc_idem.js)

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
    function draw(i){seq(el,L,M,i,'Sequence diagram of a webhook delivery: signed POST, slow receiver, provider timeout, retry, dedupe by webhook-id');
}
    const A=RD.anim({card:'rd-hook',ctl:'rd-hookctl',n:7,draw,label:'Step',list:'sx-hook'});reg(()=>A.redraw())})();

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

  // (the balancer-placement diagram became the 3D stage stg-lb on 2026-11-07: 44_js_sc_lb.js)
})();
