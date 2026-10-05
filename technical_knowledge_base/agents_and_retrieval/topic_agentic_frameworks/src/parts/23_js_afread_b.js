// ---- Reading tab, part B: numbers in prose, structured output before/after, multi-agent bars, records to spans, decision chart ----
(function(){
const D=window.AFREAD,E=RD.esc;
const fmt$=v=>'$'+(v<0.1?v.toFixed(4):v.toFixed(3));
const fmtN=v=>Math.round(v).toLocaleString('en-US');
D.so={dIn:D.soB.inp-D.soA.inp};

// numbers quoted in prose come from the data: <span data-afv="path" data-f="$|n">
document.querySelectorAll('#t-read [data-afv]').forEach(el=>{
 let v=el.dataset.afv.split('.').reduce((o,k)=>o==null?o:o[k],D);
 if(v==null){el.textContent='?';return}
 const f=el.dataset.f;el.textContent=f==='$'?fmt$(v):typeof v==='number'?(Number.isInteger(v)?fmtN(v):String(v)):String(v)});

// 1) structured output: the same request, prompt-only JSON against a schema tool
(function(){
 const card=document.getElementById('afread-so-card');if(!card)return;
 const view=document.getElementById('afread-so-view'),cap=document.getElementById('afread-so-cap'),out=document.getElementById('afread-so-out');
 let mode='A';
 const A=D.soA,B=D.soB;
 const pretty=o=>JSON.stringify(o,null,1);
 const rawA=A.text,lines=rawA.split('\n');
 const rawAhl='<span class="hl">'+E(lines[0])+'</span>\n'+E(lines.slice(1,-1).join('\n'))+'\n<span class="hl">'+E(lines[lines.length-1])+'</span>';
 const tu=B.tool_calls[0]||{name:'?',input:{}};
 const S={
  A:[
   {t:'1. The request',p:'Built-in tools off (the init record lists tools: '+JSON.stringify(A.tools)+'). The schema exists only as a sentence at the end of the prompt: "Reply with JSON only, an object {"bugs": [...]}..."',v:'<pre class="afread-raw">init.tools = '+E(JSON.stringify(A.tools))+'\nmodel = '+E(A.model)+'</pre>'},
   {t:'2. The reply arrives as text',p:'The content is right: both bugs, the right functions, correct fixed lines. But the first and last lines (highlighted) are a Markdown code fence the prompt did not ask for.',v:'<pre class="afread-raw">'+rawAhl+'</pre>'},
   {t:'3. Your code parses it',p:'json.loads on the raw text fails at the very first character. Nothing is wrong with the model\'s answer; it is just not data yet.',v:'<pre class="afread-raw">json.loads(reply)\n&rarr; '+E(A.parse)+'</pre><span class="afread-verdict bad">not parseable as returned</span>'},
   {t:'4. What you now have to write',p:'Strip fences, parse, validate every field against the schema, and on failure send the error back and ask again, with a retry cap and a metric. This is the code Pydantic AI\'s output validation and ModelRetry write for you.',v:'<pre class="afread-raw">text = strip_fences(reply)\nobj = json.loads(text)          # may still fail\nerrors = validate(obj, schema)  # missing field? wrong enum?\nif errors: ask again with the errors (at most 2 or 3 times)</pre>'}],
  B:[
   {t:'1. The schema becomes a tool',p:'With --json-schema the CLI adds one tool, named in the init record: '+JSON.stringify(B.tools)+'. Its input schema is our result schema. Same prompt text otherwise, built-in tools still off.',v:'<pre class="afread-raw">init.tools = '+E(JSON.stringify(B.tools))+'\nschema.required = '+E(JSON.stringify(D.schema.required))+', bugs[].required = '+E(JSON.stringify(D.schema.properties.bugs.items.required))+'</pre>'},
   {t:'2. The model calls the tool',p:'It writes a short explanation as text, then a tool_use block whose input is the result. Tool-calling models are trained to fill a schema\'s arguments, so the fields arrive as JSON, not prose.',v:'<pre class="afread-raw">'+E((B.alltext[0]||'').slice(0,240))+'...\n\ntool_use '+E(tu.name)+' input =\n'+E(pretty(tu.input).slice(0,700))+'</pre>'},
   {t:'3. The harness validates and answers',p:'The tool result the model gets back: "'+(B.tool_results[0]||'')+'". The run ends there: '+B.turns+' turns, one model call.',v:'<pre class="afread-raw">tool_result: '+E(B.tool_results[0]||'')+'</pre>'},
   {t:'4. Data, not text',p:'The final result record carries structured_output, already parsed: '+(B.structured&&B.structured.bugs?B.structured.bugs.length:0)+' bugs, each with the four required fields.',v:'<pre class="afread-raw">result.structured_output.bugs[0].function = '+E(JSON.stringify(B.structured.bugs[0].function))+'\nresult.structured_output.bugs[1].fixed_line = '+E(JSON.stringify(B.structured.bugs[1].fixed_line.trim()))+'</pre><span class="afread-verdict ok">parsed object, schema-checked</span>'}]};
 function stats(){const R=mode==='A'?A:B;
  out.innerHTML=RD.stat('Turns',String(R.turns),'')+RD.stat('Input tokens',fmtN(R.inp),'fresh + cache write')+RD.stat('Output tokens',fmtN(R.out),fmtN(R.think)+' of them thinking')+RD.stat('Time, cost',(R.ms/1000).toFixed(1)+' s, '+fmt$(R.cost),'claude -p, Haiku 4.5')}
 function draw(i){const s=S[mode][i];view.innerHTML=s.v;cap.innerHTML='<div class="t">'+E(s.t)+'</div><p>'+E(s.p)+'</p>';stats()}
 const an=RD.anim({card:'afread-so-card',ctl:'afread-so-ctl',n:4,ms:2600,draw,label:'Step'});
 RD.seg(document.getElementById('afread-so-seg'),m=>{mode=m;an.reset(4);an.play()});
})();

// 2) multi-agent: one agent against a lead with two subagents, same input
(function(){
 const box=document.getElementById('afread-ma-bars');if(!box)return;
 const one=D.runs.agent,multi=D.runs.multi,note=document.getElementById('afread-ma-note');
 const M={tokens:['Tokens processed',r=>r.tokens,fmtN],cost:['Cost equivalent',r=>r.cost,fmt$],wall:['Wall time (s)',r=>r.wall,v=>v+' s'],hidden:['Hidden checks passed (of 6)',r=>r.hidden,v=>v+'/6']};
 function draw(m){const d=M[m],a=d[1](one),b=d[1](multi),mx=m==='hidden'?6:Math.max(a,b);
  box.innerHTML=[['One agent',a,'var(--c2)'],['Lead + 2 subagents',b,'var(--c5)']].map(r=>'<div class="row"><span class="nm">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:'+r[2]+'"></span></span><span class="val">'+d[2](r[1])+'</span></div>').join('');
  note.textContent=m==='hidden'?'Both fixed the visible tests and the same 5 of 6 hidden checks.':d[0]+': the split run used '+(b/a).toFixed(1)+' times the single agent. Tokens include cache reads (most of them, billed at a tenth of the input price), which is why cost grows by a different factor than tokens. One recording each, Haiku 4.5, 5 Oct 2026.'}
 RD.seg(document.getElementById('afread-ma-seg'),draw);draw('tokens');
})();

// 3) records to spans: the structured-output run as an OpenTelemetry-style trace
(function(){
 const rec=document.getElementById('afread-tr-rec');if(!rec)return;
 const tree=document.getElementById('afread-tr-tree'),cap=document.getElementById('afread-tr-cap'),B=D.soB;
 const R=B.records.filter(r=>r[0]!=='rate_limit_event');
 const lab={'system init':'system / init','assistant ':'assistant','user ':'user / tool_result','result success':'result / success'};
 const kinds=['system / init','assistant (thinking)','assistant (text)','assistant (tool_use)','user (tool_result)','result'];
 rec.innerHTML=kinds.map((k,i)=>'<div class="afread-step" id="afread-tr-r'+i+'"><span class="who code">'+(i+1)+'</span><span><code>'+E(k)+'</code></span></div>').join('');
 const tu=B.tool_calls[0]||{name:'?'};
 const SP=[
  ['root','invoke_agent','gen_ai.operation.name = invoke_agent; gen_ai.request.model = '+B.model],
  ['','chat '+B.model,'gen_ai.operation.name = chat'],
  ['tool','execute_tool '+tu.name,'gen_ai.operation.name = execute_tool; gen_ai.tool.name = '+tu.name]];
 tree.innerHTML=SP.map((s,i)=>'<span class="sp '+s[0]+'" id="afread-tr-s'+i+'" style="margin-left:'+(i===0?0:i===1?14:28)+'px"><b>'+E(s[1])+'</b><span class="a" id="afread-tr-a'+i+'">'+E(s[2])+'</span></span>').join('');
 const C=[
  ['The run starts','The init record names the model and the tool list. Open the root span: one agent invocation.',[0]],
  ['A model call begins','A thinking block streams. Open a chat span under the root: one request to the model.',[0,1]],
  ['Text streams','Same message, more content. The streamed message usage shows placeholder counts here; do not read tokens from it.',[0,1]],
  ['The model asks for a tool','A tool_use block ends the message (finish reason: tool use). Close the chat span; open an execute_tool span for '+tu.name+'.',[0,1,2]],
  ['The tool answers','The tool_result arrives; close the execute_tool span with its result.',[0,1,2]],
  ['The run ends','The result record carries the real usage: '+fmtN(B.inp)+' input tokens (almost all a cache write) and '+fmtN(B.out)+' output tokens, '+(B.ms/1000).toFixed(1)+' s, '+fmt$(B.cost)+'. Put them on the chat span as gen_ai.usage.input_tokens and gen_ai.usage.output_tokens, and close the root.',[0,1,2]]];
 function draw(i){kinds.forEach((k,j)=>document.getElementById('afread-tr-r'+j).className='afread-step'+(j===i?' on':j<i?' past':''));
  SP.forEach((s,j)=>document.getElementById('afread-tr-s'+j).classList.toggle('on',C[i][2].indexOf(j)>=0));
  document.getElementById('afread-tr-a1').textContent=i>=5?'gen_ai.operation.name = chat; gen_ai.usage.input_tokens = '+B.inp+'; gen_ai.usage.output_tokens = '+B.out:'gen_ai.operation.name = chat';
  document.getElementById('afread-tr-a2').textContent=i>=4?'gen_ai.operation.name = execute_tool; gen_ai.tool.name = '+tu.name+'; result: '+(B.tool_results[0]||''):SP[2][2];
  cap.innerHTML='<div class="t">'+E(C[i][0])+'</div><p>'+E(C[i][1])+'</p>'}
 RD.anim({card:'afread-tr-card',ctl:'afread-tr-ctl',n:C.length,ms:1900,draw,label:'Record'});
})();

// 4) decision chart: five questions, stated rules
(function(){
 const q=document.getElementById('afread-dc-q');if(!q)return;const out=document.getElementById('afread-dc-out');
 const Q=[['steps','Are the steps known in advance?',[['known','Yes, a fixed sequence'],['open','No, they depend on what is found']]],
  ['dur','Must a run survive crashes or wait for people?',[['no','No, rerun from scratch is fine'],['yes','Yes']]],
  ['env','What does it act on?',[['api','APIs and data'],['comp','Files, shell, code']]],
  ['prov','Model providers?',[['one','One provider is fine'],['many','Must switch providers']]],
  ['ops','Will you operate sandboxes and sessions?',[['self','Yes, we run our own'],['buy','We would rather not']]]];
 const st={steps:'open',dur:'no',env:'comp',prov:'many',ops:'self'};
 q.innerHTML=Q.map(x=>'<div class="qq" data-k="'+x[0]+'">'+E(x[1])+'<div class="opts">'+x[2].map(o=>'<button data-v="'+o[0]+'">'+E(o[1])+'</button>').join('')+'</div></div>').join('');
 function rec(){let r,why=[];
  if(st.ops==='buy'&&st.prov==='one'){r='A hosted runtime (Claude Managed Agents, OpenAI Agents API).';why.push('You do not want to operate sandboxes and sessions, and one provider is acceptable: buy the loop (section 9). You accept the vendor\'s control flow and trace export.')}
  else{
   if(st.ops==='buy')why.push('A hosted runtime would tie you to one vendor, which conflicts with switching providers, so this keeps the loop in your hands.');
   if(st.steps==='known'){r=st.dur==='yes'?'A workflow on a durable runtime: LangGraph with a checkpointer, or your job system or Temporal with one model call per activity.':'A workflow in plain code behind a gateway.';
    why.push('Known steps: a workflow is cheaper, bounded and auditable (section 1).');if(st.dur==='yes')why.push('Crash recovery and human pauses: checkpoints (section 3).')}
   else if(st.dur==='yes'){r='An agent inside a graph runtime: LangGraph\'s prebuilt agent node with a checkpointer and interrupts.';why.push('Open-ended steps need an agent; durability needs saved state after every step (section 3).')}
   else if(st.env==='comp'&&st.prov==='one'){r='The Claude Agent SDK, or a finished harness (see the harness root).';why.push('Work on a computer with one provider: a mature loop with file tools, compaction and permissions beats writing your own (section 2).')}
   else if(st.env==='comp'){r='Your own loop or a minimal library (Pydantic AI, OpenAI Agents SDK, smolagents) with your own file tools and a real sandbox.';why.push('Work on a computer across providers: keep the loop portable, and contain the tools yourself.')}
   else{r='A minimal typed loop (Pydantic AI, OpenAI Agents SDK), or a plain loop.';why.push('Tool calls over APIs: typed tools and results for little code (sections 2 and 4).')}}
  why.push('Always: a gateway once there is more than one team or provider (section 6), and traces from the first day (section 7).');
  out.innerHTML='<b>'+E(r)+'</b><ul class="tight">'+why.map(w=>'<li>'+E(w)+'</li>').join('')+'</ul>'}
 function sync(){q.querySelectorAll('.qq').forEach(d=>d.querySelectorAll('button').forEach(b=>b.classList.toggle('on',st[d.dataset.k]===b.dataset.v)));rec()}
 q.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st[b.closest('.qq').dataset.k]=b.dataset.v;sync()});
 sync();
})();
})();
