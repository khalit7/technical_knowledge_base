// ---- Reading: traces, traceparent, sampling, exemplars, profiling ----
(function(){
  const D=window.DEMO,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  // ---------- typical trace ----------
  const typ=WF.byId(D.highlight.typical);
  WF.render($('tr-typ'),typ,{onSel:i=>{$('tr-typ-d').textContent=WF.detail(typ,i)}});
  $('tr-typ-d').textContent=WF.detail(typ,0);

  // ---------- traceparent ----------
  const errT=WF.byId(D.highlight.error);
  const retLine=D.xlogs[D.highlight.error].map(l=>JSON.parse(l)).find(o=>o.traceparent_received);
  const TP=retLine.traceparent_received;
  const client=errT.sp.find(s=>s[0]==='GET retrieval /search');
  const server=errT.sp.find(s=>s[0]==='GET /search');
  function parse(h){
    const m=/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(h);
    if(!m){const u=/^[0-9a-fA-F]{2}-[0-9a-fA-F]{32}-[0-9a-fA-F]{16}-[0-9a-fA-F]{2}$/.test(h);
      return {ok:false,why:u?'contains upper-case hex: the spec allows only lower-case, so a receiver must ignore it and start a new trace':'wrong shape: expected 2-32-16-2 lower-case hex characters separated by dashes (55 characters in all)'}}
    if(m[1]==='ff')return {ok:false,why:'version ff is invalid'};
    if(/^0+$/.test(m[2]))return {ok:false,why:'an all-zero trace-id is invalid; the receiver must ignore the header'};
    if(/^0+$/.test(m[3]))return {ok:false,why:'an all-zero parent-id is invalid; the receiver must ignore the header'};
    const f=parseInt(m[4],16);
    return {ok:true,v:m[1],tid:m[2],pid:m[3],fl:m[4],sampled:!!(f&1),random:!!(f&2)};
  }
  window.OBS_TP=parse;
  const P=parse(TP);
  const parts=[['v','version',P.v,'var(--c4)'],['t','trace-id',P.tid,'var(--c1)'],['p','parent-id',P.pid,'var(--c3)'],['f','trace-flags',P.fl,'var(--c2)']];
  const info={
    v:'<h3>version: '+P.v+'</h3><p class="small">1 byte, written as 2 hex characters. 00 is the format defined by the Recommendation; ff is forbidden. A receiver that sees a newer version reads the parts it understands.</p>',
    t:'<h3>trace-id: '+P.tid+'</h3><p class="small">16 bytes (32 hex characters) naming the whole trace. Every span of this request, in every service, carries it; it is also the <code>trace_id</code> in both services\' log lines for this request. All zeros is invalid. This one matches the trace\'s ID: <b>'+(P.tid===errT.id?'yes':'no')+'</b>.</p>',
    p:'<h3>parent-id: '+P.pid+'</h3><p class="small">8 bytes (16 hex characters): the ID of the <i>caller\'s</i> span, here chat-api\'s CLIENT span "GET retrieval /search" (its recorded span ID is <code>'+(client&&client[6]?client[6].id:'?')+'</code>: '+(client&&client[6]&&client[6].id===P.pid?'a match':'no match')+'). Retrieval\'s SERVER span "GET /search" records it as its parent, which is how the waterfall nests a span from another process.</p>',
    f:'<h3>trace-flags: '+P.fl+' = binary '+parseInt(P.fl,16).toString(2).padStart(8,'0')+'</h3><p class="small">Bit 0, <b>sampled</b> = '+(P.sampled?1:0)+': the caller is recording this trace, so downstream services should too (this is how head sampling stays consistent). Bit 1, <b>random</b> = '+(P.random?1:0)+': the right-most 7 bytes of the trace-id are random, a Level 2 addition that lets samplers use the ID as a random number. OpenTelemetry Python 1.45.0 sets both.</p>'};
  function showTp(k){$('tp-view').querySelectorAll('span[data-k]').forEach(s=>s.classList.toggle('on',s.dataset.k===k));$('tp-detail').innerHTML=info[k]}
  $('tp-view').innerHTML='<span class="d" style="font-family:inherit">traceparent:&nbsp;</span>'+parts.map((p,i)=>(i?'<span class="d">-</span>':'')+'<span data-k="'+p[0]+'" style="background:color-mix(in srgb,'+p[3]+' 22%,transparent)" title="'+p[1]+'">'+p[2]+'</span>').join('');
  $('tp-view').addEventListener('click',e=>{const s=e.target.closest('span[data-k]');if(s)showTp(s.dataset.k)});
  showTp('p');
  const inp=$('tp-in');inp.value=TP;
  function check(){const r=parse(inp.value.trim());
    $('tp-check').innerHTML=r.ok?'<span style="color:var(--good)">Valid.</span> trace-id '+r.tid+', parent span '+r.pid+', sampled '+(r.sampled?'yes':'no')+', random trace-id flag '+(r.random?'set':'not set')+'.':'<span style="color:var(--bad)">Invalid:</span> '+esc(r.why)+'.'}
  inp.addEventListener('input',check);check();

  // ---------- sampling ----------
  const S=D.sampling;
  const bar=(nm,v,max,c,lab)=>'<div class="row"><div class="nm" title="'+nm+'">'+nm+'</div><div class="track"><div class="fill" style="width:'+(100*v/max).toFixed(1)+'%;background:'+c+'"></div></div><div class="val">'+lab+'</div></div>';
  $('sp-bars').innerHTML='<div class="band">Traces stored, of '+S.incident_traces+'</div>'+
    bar('Keep everything',S.incident_traces,S.incident_traces,'var(--dim)','100%')+
    bar('Head, 10%',S.head10_kept,S.incident_traces,'var(--c1)',fmt(100*S.head10_kept/S.incident_traces,1)+'%')+
    bar('Tail policy',S.tail_kept,S.incident_traces,'var(--c3)',fmt(100*S.tail_kept/S.incident_traces,1)+'%')+
    '<div class="band">Of the '+S.interesting+' traces you want (error or over 1 s), kept</div>'+
    bar('Head, 10%',S.head10_kept_interesting,S.interesting,'var(--c1)',S.head10_kept_interesting+' of '+S.interesting)+
    bar('Tail policy',S.tail_kept_interesting,S.interesting,'var(--c3)',S.tail_kept_interesting+' of '+S.interesting);
  $('sp-note').textContent='Real trace IDs from the incident phase ('+S.incident_traces+' traces). Head rule: keep a trace if the lower 64 bits of its ID are below 10% of 2^64, as OpenTelemetry\'s TraceIdRatioBased sampler does. Tail rule: errors, plus anything over 1,000 ms, plus 5% of the rest by the same ID rule. Head sampling kept about 1 in 10 of everything, so about 1 in 10 of what mattered; tail sampling stored '+fmt(S.tail_kept/S.incident_traces*100)+'% of traces and every interesting one.';

  // ---------- exemplars ----------
  $('ex-text').textContent=D.metrics_om.filter(l=>l.indexOf('_bucket')>=0&&l.indexOf('http_request_duration')>=0).join('\n');
  $('ex-n').textContent=fmt(D.exemplars.n_exemplars);
  $('ex-top').textContent=fmt(+D.exemplars.top[0].value*1000)+' ms';

  // ---------- profiling ----------
  const B=D.bench;
  $('pf-bench').innerHTML=RD.stat('One span',fmt(B.span,1)+' &micro;s','start and end')+RD.stat('One JSON log line',fmt(B.json_log_line,1)+' &micro;s','format, redact, write')+
    RD.stat('Histogram observe',fmt(B.histogram_observe,2)+' &micro;s','')+RD.stat('Counter increment',fmt(B.counter_inc,2)+' &micro;s','')+
    RD.stat('Filtered DEBUG call',fmt(B.debug_log_filtered,2)+' &micro;s','level off: nearly free')+RD.stat('One request, all of it',fmt(B.one_request_all_telemetry,0)+' &micro;s','6 spans, 2 obs., 1 inc., 1 line');
  function drawFlame(){
    const el=$('pf-flame'),W=RD.width(el),RH=17;
    const root=D.flame,tot=root[1];let maxd=0;(function dd(n,d){maxd=Math.max(maxd,d);n[2].forEach(k=>dd(k,d+1))})(root,0);
    const H=(maxd+1)*RH+4;let b='';
    const pal=['var(--c2)','var(--c5)','var(--c1)','var(--c4)','var(--c6)','var(--c3)'];
    const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
    (function draw(n,x,d){const w=W*n[1]/tot,y=H-(d+1)*RH;
      const nm=d===0?'all samples ('+tot+')':n[0];const short=nm.replace(/ \(.*\)$/,'');
      b+='<g><title>'+esc(nm)+': '+n[1]+' samples, '+(100*n[1]/tot).toFixed(1)+'%</title><rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(.5,w-.5).toFixed(1)+'" height="'+(RH-1)+'" fill="'+(d===0?'var(--dim)':pal[hash(n[0])%pal.length])+'" opacity=".85"/>'+
        (w>short.length*6.2+6?RD.t(x+3,y+12,esc(short),{fs:10.5,fill:'var(--bg)'}):'')+'</g>';
      let cx=x;n[2].forEach(k=>{draw(k,cx,d+1);cx+=W*k[1]/tot})})(root,0,0);
    el.innerHTML=RD.svg(W,H,b,'Flame graph of emitting telemetry');
  }
  // share of samples by kind of telemetry, from the frames directly under one_request
  const top=D.flame[2][0];let sl=0,sm=0,ss=0;
  top[2].forEach(k=>{const n=k[0];if(/^info /.test(n))sl+=k[1];else if(/^(inc|observe|labels) /.test(n))sm+=k[1];else ss+=k[1]});
  const tt=sl+sm+ss;
  $('pf-note').textContent='Flame graph from '+fmt(B.profile_samples)+' real stack samples (one every millisecond for 6 s; frames under 0.5% folded into their parent; hover a frame for its share). Under one_request: span work '+fmt(100*ss/tt)+'%, the JSON log line '+fmt(100*sl/tt)+'%, metrics '+fmt(100*sm/tt)+'%. Timings are the best of 5 runs of 20,000 calls on an Apple-silicon laptop, Python 3.12.11; they vary by machine, language and SDK.';
  RD.onRender(drawFlame);RD.onResize(drawFlame);drawFlame();
})();
