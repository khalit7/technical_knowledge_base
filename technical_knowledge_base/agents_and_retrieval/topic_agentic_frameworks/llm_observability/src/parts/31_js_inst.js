// ---- fobs: tab t-inst (eight instrumentations of one replayed run) ----
(function(){
  const {D,fmt,wf,esc}=FOBSU;
  const LV={required:'required',conditionally_required:'cond.',recommended:'recommended',opt_in:'opt-in',registry:'registry',gen_ai_other:'gen_ai, not in registry',other:'other'};
  let vi=0,si=0;
  const pick=document.getElementById('fobs-i-pick');
  pick.innerHTML=D.inst.map((v,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(v.label)+'</button>').join('');
  RD.seg(pick,m=>{vi=+m;si=0;render()});
  const col=k=>k==='gen_ai.inference.client'?'var(--c1)':k==='gen_ai.execute_tool.internal'?'var(--c3)':k==='gen_ai.invoke_agent.internal'?'var(--c5)':'var(--mute)';
  function depth(sp,i){let d=0,p=sp[i][2];while(p>=0){d++;p=sp[p][2]}return d}
  function renderWf(){const v=D.inst[vi],sp=v.spans,T=Math.max(...sp.map(s=>s[5]));
    wf(document.getElementById('fobs-i-wf'),sp.map((s,i)=>({name:(v.n_traces>1?'trace '+(s[3]+1)+': ':'')+s[0],depth:depth(sp,i),t0:s[4],t1:s[5],col:col(s[6]),cls:i===si?'new':''})),T,{axis:true});
    document.getElementById('fobs-i-wfnote').textContent=(v.n_traces>1?'Each span is the root of its own trace: '+v.n_traces+' traces for one run. ':'One trace. ')+'Replay timing (the replay server answered in about 0.4 s), not the recorded run\'s.'}
  function render(){const v=D.inst[vi],s=v.summary;
    document.getElementById('fobs-i-stats').innerHTML=RD.stat('Spans / traces',v.n_spans+' / '+v.n_traces,v.mode)+
      RD.stat('Agent root / tool spans',(s.agent_root?'yes':'no')+' / '+s.tool_spans,'')+
      RD.stat('Fake PII occurrences',s.pii_in_spans+s.pii_in_logs,s.pii_in_logs?'in log events, not spans':'in span attributes')+
      RD.stat('Attribute size',fmt(s.bytes/1000,1)+' KB','all spans')+
      RD.stat('Required attributes missing',s.required_missing.length?s.required_missing.join(', '):'none','checked on every span')+
      RD.stat('Langfuse stored',Object.entries(v.langfuse.types).map(([k,n])=>n+' '+k.toLowerCase()).join(', '),v.langfuse.gen_with_usage+' generations with usage');
    document.getElementById('fobs-i-list').innerHTML=v.spans.map((sp,i)=>'<div data-i="'+i+'" class="'+(i===si?'on':'')+'" style="padding-left:'+(8+depth(v.spans,i)*12)+'px">'+esc(sp[0])+'</div>').join('');
    renderWf();renderAttrs()}
  function renderAttrs(){const v=D.inst[vi],sp=v.spans[si];
    document.getElementById('fobs-i-head').innerHTML='<b>'+esc(sp[0])+'</b>, kind '+esc(sp[1])+(sp[6]?', convention type <code>'+esc(sp[6])+'</code>':', no convention type')+'; '+sp[8].length+' attributes, '+fmt(sp[9])+' bytes'+(sp[10]?', <span class="pill bad">'+sp[10]+' fake PII</span>':'')+(sp[7].length?' <span class="pill bad">missing required: '+esc(sp[7].join(', '))+'</span>':'');
    document.getElementById('fobs-i-attrs').innerHTML='<thead><tr><th>Key</th><th>Class</th><th>Value</th></tr></thead><tbody>'+sp[8].map(a=>'<tr><td class="av">'+esc(a[0])+'</td><td><span class="fobs-lvl '+a[2]+'">'+(LV[a[2]]||a[2])+'</span></td><td class="av">'+(a[1]?esc(a[1]):'<span class="mute">as on the first span of this kind</span>')+'</td></tr>').join('')+'</tbody>'}
  document.getElementById('fobs-i-list').addEventListener('click',e=>{const d=e.target.closest('div[data-i]');if(!d)return;si=+d.dataset.i;render()});
  // matrix
  const KEYS=['gen_ai.operation.name','gen_ai.provider.name','gen_ai.system','gen_ai.request.model','gen_ai.response.model','gen_ai.response.finish_reasons','gen_ai.usage.input_tokens','gen_ai.usage.output_tokens','gen_ai.usage.cache_read.input_tokens','gen_ai.conversation.id','server.address','gen_ai.input.messages','gen_ai.output.messages','gen_ai.tool.definitions'];
  const firstModel=v=>v.spans.find(s=>s[6]==='gen_ai.inference.client')||v.spans[0];
  document.getElementById('fobs-i-mx').innerHTML='<thead><tr><th>Attribute</th>'+D.inst.map(v=>'<th>'+esc(v.label)+'</th>').join('')+'</tr></thead><tbody>'+
    KEYS.map(k=>'<tr><td><code>'+esc(k)+'</code></td>'+D.inst.map(v=>{const has=firstModel(v)[8].some(a=>a[0]===k);return '<td class="'+(has?'y':'n')+'">'+(has?'yes':'no')+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
  // logs of openai-v2
  const o1=D.inst.find(v=>v.key==='otel_v2'),o2=D.inst.find(v=>v.key==='otel_v2_content');
  document.getElementById('fobs-i-logs').innerHTML='<p>openai-v2 also emitted <b>'+o1.logs.n+'</b> log events per run ('+o1.logs.names.map(n=>'<code>'+esc(n)+'</code>').join(', ')+'). With defaults, '+o1.logs.with_body+' carried a body with message structure (roles, tool-call names and ids) and '+o1.logs.pii+' contained the fake PII; with <code>OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true</code>, '+o2.logs.with_body+' carried a body and '+o2.logs.pii+' contained it, for example:</p><pre class="fobs-pre">'+esc(o2.logs.example||'')+'</pre><p class="small mute">With <code>OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental</code>, newer versions of the GenAI utilities take <code>SPAN_ONLY</code>, <code>EVENT_ONLY</code> or <code>SPAN_AND_EVENT</code> instead of <code>true</code> (documented, not run here).</p>';
  render();
  RD.onRenderTab('t-inst',renderWf);RD.onResize(renderWf,'t-inst');
})();
