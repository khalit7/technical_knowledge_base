// ---- fobs: Reading sections 2 to 9 (conventions explorer, tables, cost, sampling and redaction animations) ----
(function(){
  const {D,fmt,esc}=FOBSU;
  // Section 2: conventions explorer
  const sel=document.getElementById('fobs-sem-type'),lv=document.getElementById('fobs-sem-lvl');
  sel.innerHTML=D.sem.spans.map((s,i)=>'<option value="'+i+'"'+(s.type==='gen_ai.inference.client'?' selected':'')+'>'+esc(s.type.replace('gen_ai.',''))+'</option>').join('');
  const LV={required:'required',conditionally_required:'cond.',recommended:'recommended',opt_in:'opt-in'};
  function sem(){const s=D.sem.spans[+sel.value],f=lv.value;
    const at=s.attrs.filter(a=>f==='all'||(f==='required'?(a[1]==='required'||a[1]==='conditionally_required'):a[1]===f));
    document.getElementById('fobs-sem-head').innerHTML='<b>'+esc(s.type)+'</b>, kind '+esc(String(s.kind).toUpperCase())+'. '+esc(s.brief)+' <span class="mute">('+s.attrs.length+' attributes; '+at.length+' shown)</span>';
    document.getElementById('fobs-sem-tab').innerHTML='<thead><tr><th>Attribute</th><th>Level</th><th>What it is</th></tr></thead><tbody>'+(at.length?'':'<tr><td colspan="3" class="mute">No attribute of this span type is at this level.</td></tr>')+at.map(a=>
      '<tr><td class="mono"><code>'+esc(a[0])+'</code>'+(a[2]?' <span class="fobs-sr" title="sampling-relevant">S</span>':'')+'</td><td><span class="fobs-lvl '+a[1]+'">'+(LV[a[1]]||a[1])+'</span>'+(a[4]?'<div class="small mute">'+esc(a[4])+'</div>':'')+'</td><td class="small">'+esc(a[3])+'</td></tr>').join('')+'</tbody>';
  }
  sel.addEventListener('change',sem);lv.addEventListener('change',sem);sem();

  // Section 3: instrumentation summary
  const rows=D.inst.map(v=>{const s=v.summary;const pii=s.pii_in_spans+s.pii_in_logs;
    return '<tr><td><b>'+esc(v.label)+'</b><div class="small mute">'+esc(v.package)+'</div></td><td class="num">'+s.model_spans+' / '+s.tool_spans+' / '+(s.agent_root?'yes':'no')+'</td><td class="num">'+v.n_traces+'</td>'+
      '<td class="num">'+(pii?'<span class="pill bad">'+pii+(s.pii_in_logs?' (in log events)':'')+'</span>':'<span class="pill ok">0</span>')+'</td><td class="num">'+fmt(s.bytes/1000,1)+'</td>'+
      '<td class="small">'+Object.entries(v.langfuse.types).map(([k,n])=>n+' '+k.toLowerCase()).join(', ')+'</td></tr>'});
  document.getElementById('fobs-inst-sum').innerHTML='<thead><tr><th>Variant</th><th class="num">Model calls / tools / root</th><th class="num">Traces</th><th class="num">Fake PII</th><th class="num">KB</th><th>Langfuse</th></tr></thead><tbody>'+rows.join('')+'</tbody>';

  // Section 4: what Langfuse stored
  document.getElementById('fobs-lf-tab').innerHTML='<thead><tr><th>Variant</th><th>Observations</th><th class="num">Generations with usage</th><th class="num">With input text</th><th>Session</th><th>First generation\'s usage</th></tr></thead><tbody>'+
    D.inst.map(v=>{const l=v.langfuse,g=l.first_generation||{};
      return '<tr><td>'+esc(v.label)+'</td><td class="small">'+Object.entries(l.types).map(([k,n])=>n+' '+k.toLowerCase()).join(', ')+'</td><td class="num">'+l.gen_with_usage+'</td><td class="num">'+l.with_input+'</td><td class="small">'+(l.sessions.length?'yes':'no')+'</td><td class="small mono">'+esc(JSON.stringify(g.usage||{}))+'</td></tr>'}).join('')+'</tbody>';

  // Section 9: scores
  const sc=D.scores.runs;
  document.getElementById('fobs-sc-tab').innerHTML='<thead><tr><th>Run</th><th class="num">tests_pass</th><th class="num">summary_complete</th><th class="num">turns</th><th class="num">cost_usd</th></tr></thead><tbody>'+
    sc.map(r=>'<tr><td>'+esc(r.label)+'</td><td class="num">'+r.scores.tests_pass+'</td><td class="num">'+r.scores.summary_complete+(r.key==='manual'?' <span class="pill bad">wrong</span>':'')+'</td><td class="num">'+r.scores.turns+'</td><td class="num">'+(r.scores.cost_usd!=null?'$'+r.scores.cost_usd:'n/a')+'</td></tr>').join('')+'</tbody>';

  // Section 7: policy table
  const c=D.samp.configs;
  const put=(id,n)=>{const e=document.getElementById(id);e.textContent=n?n+' of 49':'dropped';e.className='fobs-kept '+(n?'y':'n')};
  put('fobs-p-ae-f',c.any_error.kept_by_trace['failed run']||0);put('fobs-p-ae-s',c.any_error.kept_by_trace['successful run']||0);
  put('fobs-p-ro-f',c.root_outcome.kept_by_trace['failed run']||0);put('fobs-p-ro-s',c.root_outcome.kept_by_trace['successful run']||0);
})();

// Section 6: cost, three ways into Langfuse
(function(){
  const {D,fmt}=FOBSU;const C=D.cost;
  const KC={input:'var(--c1)',input_cached_tokens:'var(--c6)',input_cache_creation:'var(--c5)',input_cache_creation_1h:'var(--c2)',output:'var(--c3)'};
  const KN={input:'fresh input',input_cached_tokens:'cache read',input_cache_creation:'cache write (priced as 5 min)',input_cache_creation_1h:'cache write (priced as 1 h)',output:'output'};
  function parts(way){const sum={};C.ways[way].gens.forEach(g=>{Object.entries(g[1]||{}).forEach(([k,v])=>{if(k!=='total')sum[k]=(sum[k]||0)+v})});return sum}
  const max=C.result*1.08;
  const steps=[
    {t:'The reference',d:'Claude Code reported total_cost_usd = $'+C.result+' for the run: '+fmt(C.usage.input_tokens)+' fresh input, '+fmt(C.usage.cache_creation_input_tokens)+' cache-write (all 1-hour), '+fmt(C.usage.cache_read_input_tokens)+' cache-read and '+fmt(C.usage.output_tokens)+' output tokens across 8 model calls.',rows:['ref']},
    {t:'1. Raw spans',d:'Sent as Claude Code wrote them. Langfuse recognised the model on all 8 llm_request spans and made them generations, but found no gen_ai.usage.* attributes (Claude Code names its counts input_tokens, cache_read_tokens, cache_creation_tokens), so usage was empty and cost $0.',rows:['ref','raw']},
    {t:'2. Renamed to the GenAI conventions',d:'A collector transform (OTTL) wrote gen_ai.usage.input_tokens as the sum of all three input kinds, plus cache_read and cache_write. Langfuse split them into buckets and priced them: $'+C.ways.mapped.total.toFixed(8)+', '+fmt(100*(1-C.ways.mapped.total/C.result),1)+'% short. The cache writes were priced at the 5-minute rate.',rows:['ref','raw','mapped']},
    {t:'3. Cache lifetime made explicit',d:'A second transform passed the counts in Langfuse\'s own usage_details attribute with the key input_cache_creation_1h. Langfuse now prices the writes at 2x: $'+C.ways.ttl.total.toFixed(7)+', equal to the reference.',rows:['ref','raw','mapped','ttl']},
    {t:'4. A third source agrees',d:'Claude Code\'s own claude_code.cost.usage metric, summed over its '+C.metric.exports+' delta exports, is $'+C.metric.sum_usd+'. Three independent totals, one number.',rows:['ref','raw','mapped','ttl','metric']}];
  const view=document.getElementById('fobs-a6-view');
  function bar(label,segs,total,note){const w=s=>(s/max*100).toFixed(2)+'%';
    return '<div class="fobs-cost"><div>'+label+'</div><div class="tk">'+segs.map(([k,v])=>'<span style="width:'+w(v)+';background:'+(KC[k]||'var(--mute)')+'" title="'+(KN[k]||k)+': $'+v.toFixed(6)+'"></span>').join('')+'</div><div class="v">$'+total.toFixed(total?5:0)+'</div></div>'+(note?'<div class="small mute" style="margin:-2px 0 6px">'+note+'</div>':'')}
  function draw(i){const st=steps[i];let h='';
    const ref=C.usage,refSegs=[['input',ref.input_tokens*1e-6],['input_cached_tokens',ref.cache_read_input_tokens*1e-7],['input_cache_creation_1h',ref.cache_creation_input_tokens*2e-6],['output',ref.output_tokens*5e-6]];
    st.rows.forEach(r=>{
      if(r==='ref')h+=bar('Reported by the run',refSegs,C.result);
      else if(r==='metric')h+=bar('Cost metric',[['output',C.metric.sum_usd]],C.metric.sum_usd,'one total, no breakdown by kind');
      else{const p=parts(r),ord=['input','input_cached_tokens','input_cache_creation','input_cache_creation_1h','output'];h+=bar({raw:'Langfuse, raw',mapped:'Langfuse, GenAI names',ttl:'Langfuse, 1 h key'}[r],ord.filter(k=>k in p).map(k=>[k,p[k]]),C.ways[r].total)}});
    h+='<div class="fobs-legend">'+Object.entries({input:1,input_cached_tokens:1,input_cache_creation:1,input_cache_creation_1h:1,output:1}).map(([k])=>'<span><i style="background:'+KC[k]+'"></i>'+KN[k]+'</span>').join('')+'</div>';
    view.innerHTML=h}
  // the step list on the left (sx-cost) explains each step; steps[].t and .d are kept as the bars' reference
  RD.anim({card:'fobs-a6',ctl:'fobs-a6-ctl',n:steps.length,draw,ms:4800,label:'Step',list:'sx-cost'});
})();

// Section 7: tail sampling on a timeline, in four explained stretches per setup (step lists sx-samp-*); each stretch plays the
// spans arriving between its start and end time, unless motion is reduced or the reader jumped
(function(){
  const {D}=FOBSU;const S=D.samp.sent,E=D.samp.emitted_seconds_after_replay_start;
  const first=S[0][1],rootAt=E.root_span_sent_at,err1=E.first_error_span_sent_at;
  const CF={short:{dec:first+5,kept:D.samp.configs.short.kept,emit:null,list:'sx-samp-short',ts:[first,first+5,err1,rootAt]},
    short_cached:{dec:first+5,kept:D.samp.configs.short_cached.kept,emit:null,list:'sx-samp-short',ts:[first,first+5,err1,rootAt]},
    long:{dec:first+60,kept:D.samp.configs.long.kept,emit:E.long,list:'sx-samp-long',ts:[first,err1,rootAt,first+60]},
    root:{dec:rootAt+2,kept:D.samp.configs.root.kept,emit:E.root,list:'sx-samp-root',ts:[first,err1,rootAt,rootAt+2]}};
  let mode='short',raf=0,shown=0;const TMAX=64;
  const card=document.getElementById('fobs-a7'),view=document.getElementById('fobs-a7-view');
  function frame(now){const c=CF[mode],w=RD.width(view),h=132,pl=8,pr=8,x=t=>pl+(w-pl-pr)*t/TMAX;
    let b='<rect x="'+pl+'" y="20" width="'+(w-pl-pr)+'" height="60" fill="var(--soft)"/>';
    const decided=now>=c.dec-1e-9,keep=c.kept>0;
    S.forEach(s=>{if(s[1]>now)return;
      const colr=s[2]?'var(--bad)':(decided?(keep?'var(--good)':'var(--mute)'):'var(--acc)');
      b+='<line x1="'+x(s[1]).toFixed(1)+'" x2="'+x(s[1]).toFixed(1)+'" y1="'+(s[2]?24:40)+'" y2="76" stroke="'+colr+'" stroke-width="'+(s[2]?2.5:1.5)+'" opacity="'+(decided&&!keep?0.45:1)+'"/>'});
    b+='<line x1="'+x(Math.min(now,TMAX))+'" x2="'+x(Math.min(now,TMAX))+'" y1="14" y2="86" stroke="var(--ink)" stroke-dasharray="2 2"/>';
    if(c.dec<=TMAX)b+='<line x1="'+x(c.dec)+'" x2="'+x(c.dec)+'" y1="10" y2="90" stroke="'+(decided?(keep?'var(--good)':'var(--bad)'):'var(--mute)')+'" stroke-width="2"'+(decided?'':' stroke-dasharray="4 3"')+'/>'+RD.t(Math.min(x(c.dec)+4,w-92),12,decided?(keep?'decision: keep':'decision: drop'):'decision due',{fs:12,fill:decided?(keep?'var(--good)':'var(--bad)'):'var(--mute)'});
    for(let s=0;s<=60;s+=10)b+=RD.t(x(s),108,s+' s',{a:'middle',fs:11,fill:'var(--mute)'});
    const n=S.filter(s=>s[1]<=now).length;
    b+=RD.t(pl+2,128,'t = '+now.toFixed(1)+' s · '+n+' of '+S.length+' spans arrived'+(decided?(keep?' · kept '+c.kept:' · dropped'):''),{fs:12,fill:'var(--ink)'});
    view.innerHTML=RD.svg(w,h+2,b,'Spans arriving at the collector over time, and when the sampling decision is made');shown=now}
  function draw(i){const c=CF[mode],to=c.ts[i];cancelAnimationFrame(raf);
    const from=i>0?c.ts[i-1]:0;
    if(RD.RM||!card.classList.contains('rd-fwd')||to<=from){frame(to);return}
    const t0=performance.now(),dur=Math.min(2600,400+(to-from)*90);
    const go=now=>{const u=Math.min(1,(now-t0)/dur);frame(from+(to-from)*u);if(u<1)raf=requestAnimationFrame(go)};raf=requestAnimationFrame(go)}
  const A=RD.anim({card:'fobs-a7',ctl:'fobs-a7-ctl',n:4,draw,ms:5200,label:'Stretch',list:'sx-samp-short'});
  RD.seg(document.getElementById('fobs-a7-mode'),m=>{const was=CF[mode].list;mode=m;const l=CF[m].list;
    ['sx-samp-short','sx-samp-long','sx-samp-root'].forEach(id=>document.getElementById(id).hidden=id!==l);A.reset(4,l)});
  RD.onResize(()=>A.redraw());
})();

// Section 8: one span through each redaction policy
(function(){
  const {D,esc,fmt}=FOBSU;let mode='before';
  const view=document.getElementById('fobs-a8-view');
  const R=D.red,X=D.redex,LB=D.red.login_by_key;
  const hl=s=>esc(s).replace(/(dana\.reyes@example\.com|ACCT-4417-2290|user@example\.invalid)/g,'<span class="bad">$1</span>').replace(/(\*\*\*\*)/g,'<span class="hl">$1</span>').replace(/( user  wheel)/g,'<span class="bad">$1</span>');
  function spanBox(s){return '<div><b class="small">'+esc(s.name)+'</b><pre class="fobs-pre">'+Object.entries(s.attrs).map(([k,v])=>'<span class="cm">'+esc(k)+':</span> '+hl(String(v))).join('\n')+
    (s.events.length?'\n<span class="cm">event '+esc(s.events[0].name)+':</span>\n'+Object.entries(s.events[0].attrs).map(([k,v])=>'  <span class="cm">'+esc(k)+':</span> '+hl(String(v))).join('\n'):'')+'</pre></div>'}
  function draw(){const r=R[mode],ex=X[mode];
    const login=Object.entries(LB[mode]).filter(([k])=>k!=='attr:user.email').reduce((a,[,v])=>a+v,0);
    const t='<div class="tw"><table><thead><tr><th>Trace</th><th class="num">Fake e-mail</th><th class="num">Fake account id</th><th class="num">Login name in paths and output</th><th class="num">Attribute KB</th></tr></thead><tbody>'+
      '<tr><td>Claude Code, content on</td><td class="num">'+r.claude_code.hits.email.attr+'</td><td class="num">'+r.claude_code.hits.account_id.attr+'</td><td class="num">'+login+'</td><td class="num">'+fmt(r.claude_code.attr_bytes/1000,1)+'</td></tr>'+
      '<tr><td>Hand-instrumented loop, content on</td><td class="num">'+(r.agent.hits.email.attr+r.agent.hits.email.event)+'</td><td class="num">'+(r.agent.hits.account_id.attr+r.agent.hits.account_id.event)+'</td><td class="num">'+(r.agent.hits.login_name.attr+r.agent.hits.login_name.event)+'</td><td class="num">'+fmt(r.agent.attr_bytes/1000,1)+'</td></tr></tbody></table></div>';
    const note={before:'What reached the collector. The account e-mail was already replaced by a placeholder on its way out of the capture file; in the real trace it sat on all '+D.cc.content_cc_spans+' Claude Code spans. Login-name hits are shown here as "user".',
      mask:'blocked_values with four patterns (e-mail, account id, home folder in two spellings), every key kept, summary: debug. The processor added redaction.masked.* attributes saying what it changed.',
      hash:'The same patterns with hash_function: hmac-sha256 (the key must be at least 32 bytes; a shorter one fails config validation, measured). Matches become digests: stable, so still joinable.',
      allowlist:'allow_all_keys: false with 24 structural keys allowed (operation, model, token counts, tool name, status fields). Everything else is removed, in span and event attributes alike.'}[mode];
    view.innerHTML='<p class="small">'+note+'</p>'+t+'<div class="fobs-two">'+ex.map(spanBox).join('')+'</div>'}
  RD.seg(document.getElementById('fobs-a8-mode'),m=>{mode=m;draw()});
  draw();
})();
