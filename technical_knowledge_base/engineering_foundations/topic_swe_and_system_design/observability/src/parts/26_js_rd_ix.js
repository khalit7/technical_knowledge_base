// ---- Reading: one incident, debugged two ways (before/after animation on the real run) ----
(function(){
  const D=window.DEMO,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const ms=v=>fmt(v*1000)+' ms';
  const I=D.inst,slow=WF.byId(D.highlight.slow),err=WF.byId(D.highlight.error);
  const sp=(t,n)=>t.sp.find(s=>s[0]===n);
  const sCli=sp(slow,'GET retrieval /search'),sLook=sp(slow,'vector index lookup'),sModel=sp(slow,'model call (simulated)');
  const eSrv=sp(err,'GET /search');const eEnd=eSrv[3]+eSrv[4];
  const R=D.replicas,r3=R['incident/r3-cold'];
  // requests in the incident phase, from the load generator's record
  const inc=[];for(let i=0;i<D.reqs.length;i+=3){const t=D.reqs[i];if(t>=90&&t<180)inc.push({t,ms:D.reqs[i+1],s:D.reqs[i+2]})}
  const nErr=inc.filter(r=>r.s>=500).length,nSlow=inc.filter(r=>r.s<500&&r.ms>800).length;
  const slowest=inc.filter(r=>r.s<500).sort((a,b)=>b.ms-a.ms).slice(0,5);
  const logbox=(lines,hl)=>'<div class="logbox">'+lines.map(l=>'<div class="'+(l.indexOf('"level":"ERROR"')>=0?'e':'')+(hl&&hl(l)?' hl':'')+'" title="'+esc(l)+'">'+esc(LOGC(l))+'</div>').join('')+'</div>';
  const A=[
    {c:85,t:'Normal: one graph, the average',p:'The service dashboard shows average latency: about '+ms(I.normal.avg)+'. Your toolkit is this graph and a log search.',ev:()=>'',k:['none','average, logs','0 of '+nSlow]},
    {c:180,t:'The incident: the average rises',p:'Average latency climbs to about '+ms(I.incident.avg)+' (+'+fmt(100*(I.incident.avg/I.normal.avg-1))+'%). Is every request a bit slower, or are some much slower? The average cannot say.',ev:()=>'',k:['"things are slower"','average, logs','0 of '+nSlow]},
    {c:180,t:'Open the logs',p:'Fourteen consecutive chat-api lines from the incident (lines over 800 ms highlighted for you; nothing highlights them for the engineer). Every successful request says "request served" with its total duration; nothing says where the time went.',ev:()=>logbox(D.stream,l=>/"duration_ms":(\d{4}|[89]\d\d)\./.test(l)),k:['"things are slower"','average, logs','0 of '+nSlow]},
    {c:180,t:'Search for errors',p:'level = ERROR finds '+nErr+' lines in the 90-second incident, all "request failed: retrieval timed out". A lead, but errors are '+fmt(100*nErr/inc.length,1)+'% of requests, while '+nSlow+' successful requests also took over 800 ms.',ev:()=>logbox(D.stream.filter(l=>l.indexOf('"level":"ERROR"')>=0)),k:['retrieval timeouts?','average, logs','0 of '+nSlow]},
    {c:180,t:'The slow successes have no story',p:'Sorting the successful requests by duration finds them, but each is one number. Retrieval? The model? The database? A log line written at the end of a request cannot split its time.',ev:()=>'<div class="tw"><table><thead><tr><th>Request at</th><th class="num">Duration</th><th>Status</th><th>Where the time went</th></tr></thead><tbody>'+slowest.map(r=>'<tr><td>+'+fmt(r.t,1)+' s</td><td class="num">'+fmt(r.ms)+' ms</td><td>'+r.s+'</td><td class="mu">unknown</td></tr>').join('')+'</tbody></table></div>',k:['retrieval timeouts?','average, logs','0 of '+nSlow]},
    {c:225,t:'It recovers; the cause stays unknown',p:'The cold replica warms and latency returns. The write-up can only say "retrieval sometimes timed out and things were slower". Next step: add logging, redeploy, and wait for it to happen again.',ev:()=>'',k:['unknown','average, logs','0 of '+nSlow]}];
  const B=[
    {c:85,t:'Normal: p50 and p99 from the histogram',p:'Same service, same moment. p50 about '+ms(I.normal.p50)+', p99 about '+ms(I.normal.p99)+' (histogram estimates).',ev:()=>'',k:['none','p50, p99, traces','0 of '+nSlow]},
    {c:180,t:'The incident: only the tail moves',p:'p50 barely moves ('+ms(I.incident.p50)+'); p99 jumps to '+ms(I.incident.p99)+'. Not everyone is slower: a minority of requests is much slower. That narrows the question to "what do the slow ones have in common?"',ev:()=>'',k:['the slowest few %','p50, p99, traces','0 of '+nSlow]},
    {c:180,mark:1,t:'Follow an exemplar to a trace',p:'The dot on the p99 line is an exemplar: a real request\'s trace ID stored with the bucket it landed in. It opens this trace: '+fmt(slow.dur)+' ms in total.',ev:()=>'<div class="wf" id="ix-wf"></div>',wf:[slow,null],k:['the slowest few %','p50, p99, traces','1 of '+nSlow]},
    {c:180,mark:1,t:'The waterfall points at one span',p:'Of '+fmt(slow.dur)+' ms, the call to retrieval took '+fmt(sCli[4])+' ms, nearly all of it inside "vector index lookup" ('+fmt(sLook[4])+' ms) on replica r3-cold. The model call took a normal '+fmt(sModel[4])+' ms.',ev:()=>'<div class="wf" id="ix-wf"></div><div class="kvs" id="ix-kv"></div>',wf:[slow,'vector index lookup'],k:['retrieval, replica r3-cold','p50, p99, traces','1 of '+nSlow]},
    {c:180,mark:1,t:'An error trace from the same minute',p:'chat-api timed out at '+fmt(err.dur)+' ms and answered 503; retrieval kept working until '+fmt(eEnd)+' ms on a request nobody was waiting for. Two findings: the same slow replica, and a missing deadline.',ev:()=>'<div class="wf" id="ix-wf"></div>',wf:[err,'GET /search'],k:['retrieval, replica r3-cold','p50, p99, traces','2 of '+nSlow]},
    {c:225,t:'Confirm across all requests, then act',p:'Group every retrieval lookup in the incident by its replica attribute: r1 and r2 answered in a median of about '+fmt(R['incident/r1'].median_ms)+' ms; all '+r3.n+' lookups on r3-cold took over 500 ms (median '+fmt(r3.median_ms)+' ms). Action: drain r3-cold. Tail sampling kept every one of the '+D.sampling.interesting+' slow or failed traces to check against.',ev:()=>'<div class="tw"><table><thead><tr><th>Replica (incident phase)</th><th class="num">Lookups</th><th class="num">Median</th><th class="num">p99</th></tr></thead><tbody>'+['r1','r2','r3-cold'].map(k=>{const x=R['incident/'+k];return '<tr><td>'+k+'</td><td class="num">'+x.n+'</td><td class="num">'+fmt(x.median_ms,1)+' ms</td><td class="num">'+fmt(x.p99_ms,1)+' ms</td></tr>'}).join('')+'</tbody></table></div>',k:['replica r3-cold, confirmed','p50, p99, traces','all '+nSlow]}];
  let mode='a';
  const ser=m=>m==='a'?[{pts:D.series.avg,color:'var(--c5)',label:'average latency (s)'}]:[{pts:D.series.p50,color:'var(--good)',label:'p50 (s)'},{pts:D.series.p99,color:'var(--bad)',label:'p99 (s)'}];
  function draw(i){
    const S=(mode==='a'?A:B)[i];
    LC($('ix-chart'),{series:ser(mode),x0:0,x1:225,y1:1.6,band:[90,180],cursor:S.c,h:170,yfmt:v=>v.toFixed(1)+' s',marks:S.mark?[[slow.t,slow.dur/1000]]:null,label:'Latency over the demo run'});
    $('ix-cap').innerHTML='<div class="t">'+(i+1)+'. '+S.t+'</div><p>'+S.p+'</p>';
    $('ix-ev').innerHTML=S.ev();
    if(S.wf){const t=S.wf[0];WF.render($('ix-wf'),t,{hl:S.wf[1],onSel:j=>{const kv=$('ix-kv');if(kv)kv.textContent=WF.detail(t,j)}});
      const kv=$('ix-kv');if(kv){const j=t.sp.findIndex(s=>s[0]===S.wf[1]);kv.textContent=WF.detail(t,j)}}
    $('ix-cnt').innerHTML=RD.stat('Best guess at the cause',S.k[0])+RD.stat('Signals in use',S.k[1])+RD.stat('Slow requests explained',S.k[2],'successful requests over 800 ms');
  }
  const an=RD.anim({card:'ix-card',ctl:'ix-ctl',n:6,draw,ms:4200,label:'Incident step'});
  RD.seg($('ix-seg'),m=>{mode=m;an.reset(6);an.play()});
  $('ix-r3n').textContent=r3.n;$('ix-r3m').textContent=fmt(r3.median_ms);
  RD.onResize(()=>an.redraw());
})();
