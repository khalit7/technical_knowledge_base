// ---- Reading tab: data-filled prose, schema viewer, results table, output-route animation, executor table ----
(function(){
const F=window.FT,E=RD.esc;
const by=(a,k)=>a.reduce((m,x)=>((m[x[k]]=m[x[k]]||[]).push(x),m),{});
const pct=(n,d)=>d?Math.round(100*n/d)+'%':'n/a';
const cnt=(rows,k)=>rows.filter(r=>r[k]).length;
const mean=a=>{a=a.filter(x=>x!=null&&!isNaN(x));return a.length?a.reduce((s,x)=>s+x,0)/a.length:null};
const fmt=x=>x==null?'n/a':Math.round(x).toLocaleString('en-US');
window.FTU={by,pct,cnt,mean,fmt};
const R=by(F.so,'route');
const routeLabel=id=>(F.routes.find(r=>r.id===id)||{}).label||id;
// ---------- prose values ----------
const V={};
const sampled=[...new Set(F.so.filter(r=>r.run.startsWith('t07')&&/^(pai|oai|adk)/.test(r.route)).map(r=>r.route+r.run))].length/5;
const sampledO=[...new Set(F.so.filter(r=>r.run.startsWith('t07')&&r.route==='free').map(r=>r.run))].length;
V['so.npass']=(['none','one','two','three'][Math.round(sampled)]||String(sampled))+' sampled at temperature 0.7 (the in-process outlines runs, which are quick, got '+(['none','one','two','three'][sampledO]||sampledO)+')';
(function(){const v=F.val;if(!v.length){V['val.summary']='(not recorded)';return}
  const runs=[...new Set(v.map(r=>r.run))].length,ok=cnt(v,'valid'),withR=v.filter(r=>r.retries.length).length,
    nret=v.reduce((s,r)=>s+r.retries.length,0),fixedAfter=v.filter(r=>r.retries.length&&r.valid).length;
  const kinds={};v.forEach(r=>r.retries.forEach(t=>{const k=/no function named/.test(t)?'a function that does not exist':/not valid Python/.test(t)?'a fixed line that does not parse':/identical to a line/.test(t)?'a "fix" identical to the buggy line':'a schema error';kinds[k]=(kinds[k]||0)+1}));
  V['val.summary']=v.length+' runs ('+runs+' passes), '+ok+' returned a valid result; '+nret+' retry prompt'+(nret===1?' went':'s went')+' back in '+withR+' run'+(withR===1?'':'s')+' ('+Object.entries(kinds).map(([k,n])=>n+' for '+k).join(', ')+'), and '+fixedAfter+' of those runs then returned a result that passed.'})();
function mechTxt(){
  const M=F.mech;
  const h=Object.keys(M).filter(k=>k.startsWith('oai_handoff'));
  V['oai.handoff']=h.length?h.map(k=>{const d=M[k],w=d.wire||[];const tr=w.findIndex(x=>/TOOL CALL transfer_to_/.test(x.reply));
    return (k.endsWith('greedy')?'greedy':'sampled')+': '+w.length+' requests; '+(tr>=0?'request '+(tr+1)+' called '+E((w[tr].reply.match(/transfer_to_\w+/)||[''])[0])+', and the next request carried the fixer\'s instructions and tools with all '+(w[tr+1]?w[tr+1].msgs:'?')+' messages so far':'no transfer was called')+'; last agent '+E(d.last_agent||'none')+(d.tests?', tests '+(d.tests.pass?'pass':'still fail'):'')+(d.error?' ('+E(d.error.slice(0,90))+')':'')}).join('. ')+'.':'(not recorded)';
  const g=['oai_guard_par_greedy','oai_guard_seq_greedy'].map(k=>M[k]).filter(Boolean);
  V['oai.guard']=g.length?g.map(d=>{const c=(d.cases||[])[0]||{};return (d.which==='guard_par'?'in parallel (default), ':'blocking, ')+(c.tripped?'tripped':'not tripped')+' after '+c.requests+' model request'+(c.requests===1?'':'s')}).join('; ')+'. The difference is the fixer\'s own first call, made and paid for in parallel mode although its answer was thrown away. The on-topic task passed both guards. One more lesson came free: told to answer only YES or NO, the small checker model instead wrote the poem ("'+E(String(((g[0].cases||[])[0]||{}).info&&g[0].cases[0].info.checker_said||'').split('\n')[0].replace(/,\s*$/,''))+' ..."); the guard tripped only because its parser treated anything but YES as NO. A guardrail model reads the same input it is guarding against, so parse its answer fail-closed.':'(not recorded)';
  const s=M.oai_session_greedy;
  V['oai.session']=s?'two turns, '+Object.entries(s.rows||{}).map(([t,n])=>n+' row'+(n===1?'':'s')+' in '+t).join(', ')+'; the second request carried '+(s.wire&&s.wire[1]?s.wire[1].msgs:'?')+' messages (system, the stored first exchange, the new question) and answered "'+E(String((s.answers||[])[1]||'').slice(0,60))+'"':'(not recorded)';
  V['oai.tracing']=F.trace_log?'the run worked and the SDK logged "'+E(F.trace_log.split('\n').filter(l=>/OPENAI_API_KEY/.test(l))[0]||F.trace_log.split('\n')[0])+'"':'(not recorded)';
  const at=Object.keys(M).filter(k=>k.startsWith('adk_task'));
  if(at.length){const pass=at.filter(k=>M[k].tests&&M[k].tests.pass).length,unchanged=at.filter(k=>M[k].tests&&M[k].tests.tests_unchanged).length;
    const pt0=at.map(k=>(M[k].wire[0]||{}).pt).filter(x=>x);
    V['adk.task']='tests passed after '+pass+' of '+at.length+' runs (1 greedy, '+(at.length-1)+' sampled at 0.7; tests file untouched in '+unchanged+'), with '+at.map(k=>M[k].wire.length).join(', ')+' model requests; first request '+(pt0.length?Math.min(...pt0)+(Math.max(...pt0)!==Math.min(...pt0)?' to '+Math.max(...pt0):''):'?')+' prompt tokens, against 385 to 507 for the plain loop, LangGraph, the Agents SDK and Pydantic AI on the parent tab. Per-run detail on %%MECH%%'}
  else V['adk.task']='(not recorded)';
  const tr=M.adk_transfer_greedy;
  V['adk.transfer']=tr?'the coordinator\'s first request offered '+E((tr.wire[0]||{tools:[]}).tools.join(', '))+'; '+(()=>{const i=tr.wire.findIndex(x=>/transfer_to_agent/.test(x.reply));return i>=0?'request '+(i+1)+' called '+E(tr.wire[i].reply.slice(10,90))+', and later requests carried the fixer\'s tools':'no transfer was made'})()+(tr.tests?'; tests '+(tr.tests.pass?'pass':'still fail'):''):'(not recorded)';
  const c=F.card&&F.card['/.well-known/agent-card.json'];
  V['adk.card']=c&&c.body?'<code>/.well-known/agent-card.json</code> returned the name and description, a JSON-RPC interface at protocol version '+E((c.body.supportedInterfaces||[{}])[0].protocolVersion||'?')+', and '+(c.body.skills||[]).length+' skills: '+(c.body.skills||[]).map(s=>'<code>'+E(s.name)+'</code>').join(', ')+'.':'(not recorded)';
  V.emdash=F.emdash?F.emdash+' em-dashes written by the local model were replaced by ", " in the repository copies.':'no em-dashes needed replacing.';
}
mechTxt();
(function(){const g=id=>R[id]||[],v=a=>cnt(a,'valid')+' of '+a.length;
  const nat=g('pai_native').concat(g('oai'),g('adk'));
  V['find.native']=nat.length?'<b>'+v(nat)+' runs returned a result</b> (Pydantic AI '+v(g('pai_native'))+', Agents SDK '+v(g('oai'))+', ADK '+v(g('adk'))+'); the model, never shown the schema, answered in prose.':'(not recorded)';
  V['find.other']='tool output '+v(g('pai_tool'))+' valid, prompted '+v(g('pai_prompted'))+'.';
  const cons=g('constrained');V['find.cons']=v(cons)+' runs valid';
  const vc=a=>a.filter(r=>r.valid);const cc=vc(cons),ct=vc(g('pai_tool'));
  V['find.content']='of the '+cc.length+' valid constrained replies, '+cnt(cc,'function_ok')+' named the right function but only '+cnt(cc,'category_ok')+' the right category; of the '+ct.length+' valid tool-output replies, '+cnt(ct,'function_ok')+' and '+cnt(ct,'category_ok')+'.'})();
document.querySelectorAll('[data-fv]').forEach(el=>{let v=V[el.dataset.fv];if(v==null)v='(missing)';
  el.innerHTML=String(v).replace('%%MECH%%','the <a href="#" data-tab="t-mech">Mechanisms, recorded</a> tab.')});
RD.tabLinks(document.getElementById('t-read'));

// ---------- schema viewer ----------
(function(){const box=document.getElementById('ftyped-sch'),note=document.getElementById('ftyped-sch-note');if(!box)return;
  const S=F.schemas,names={pydantic_ai:'Pydantic AI',openai_agents:'OpenAI Agents SDK',smolagents:'smolagents',google_adk:'Google ADK'};
  const params=k=>S[k].parameters||S[k].parameters_json_schema||{};
  function facts(k){const p=params(k),c=(p.properties||{}).count||{},req=p.required||[];
    return {req:req.includes('count'),def:'default' in c,desc:!!c.description,nullable:!!c.nullable,strict:!!S[k].strict||p.additionalProperties===false,descInTool:/Args:/.test(S[k].description||'')}}
  function show(k){const p=JSON.stringify({name:S[k].name,description:S[k].description,parameters:params(k)},null,1);
    const f=facts(k);
    box.innerHTML='<div><h4>'+names[k]+' '+E(S[k].version)+'</h4><pre>'+E(p)+'</pre></div><div><h4>What the model is told about <code>count</code>, in each library</h4><div class="tw"><table><thead><tr><th></th><th>required</th><th>default shown</th><th>own description</th></tr></thead><tbody>'+
      Object.keys(names).map(n=>{const g=facts(n);return '<tr'+(n===k?' style="font-weight:600"':'')+'><td>'+names[n]+'</td><td>'+(g.req?'<span class="pill bad">yes</span>':'no')+'</td><td>'+(g.def?'yes':(g.nullable?'no (nullable)':'no'))+'</td><td>'+(g.desc?'yes':'<span class="pill mid">no</span>')+'</td></tr>'}).join('')+
      '</tbody></table></div><p class="small mute">Read from each library\'s own schema output for the function above, no model call.</p></div>';
  }
  RD.seg(document.getElementById('ftyped-sch-seg'),show);show('pydantic_ai');note.innerHTML='';
})();

// ---------- results table ----------
const ORDER_LOCAL=['pai_tool','pai_native','pai_prompted','oai','adk','free','constrained'];
const ORDER_CLAUDE=['claude_haiku_schema','claude_haiku_prompt','claude_sonnet_schema','claude_sonnet_prompt'];
window.FTU.routeLabel=routeLabel;window.FTU.ORDER=[ORDER_LOCAL,ORDER_CLAUDE];
function soTable(el,opt){opt=opt||{};
  const rows=[['Local model (Qwen3-4B-Instruct-2507, 4-bit, Apple M1 Pro)',ORDER_LOCAL],['Claude through the subscription (claude -p)',ORDER_CLAUDE]];
  let h='<thead><tr><th>Route</th><th class="num">runs</th><th class="num">valid</th><th class="num">right function</th><th class="num">right category</th><th class="num">fix line parses</th><th class="num">model calls per run</th><th class="num">first prompt, tokens</th></tr></thead><tbody>';
  rows.forEach(([g,ids])=>{h+='<tr><td colspan="8" class="small" style="font-weight:600;color:var(--mute)">'+g+'</td></tr>';
    ids.forEach(id=>{const a=(R[id]||[]).filter(r=>!opt.run||opt.run==='all'||r.run===opt.run||r.run==='once');if(!a.length)return;const n=a.length,v=cnt(a,'valid');
      const cell=k=>{const c=cnt(a,k);return '<td class="num">'+c+'/'+n+'</td>'};
      h+='<tr><td>'+E(routeLabel(id))+'</td><td class="num">'+n+'</td><td class="num"><span class="pill '+(v===n?'ok':v===0?'bad':'mid')+'">'+v+'/'+n+'</span></td>'+cell('function_ok')+cell('category_ok')+cell('line_parses')+
        '<td class="num">'+(mean(a.map(r=>r.calls))||0).toFixed(1)+'</td><td class="num">'+fmt(mean(a.map(r=>r.pt0)))+'</td></tr>'})});
  el.innerHTML=h+'</tbody>';
}
window.FTU.soTable=soTable;
const st=document.getElementById('ftyped-so-tbl');if(st)soTable(st,{run:'all'});
(function(){const n=document.getElementById('ftyped-so-note');if(!n)return;
  const hp=R.claude_haiku_prompt||[];const fen=hp.filter(r=>r.fenced).length,len=hp.filter(r=>r.lenient).length;
  n.innerHTML='Content columns count only valid results: an invalid reply scores 0 on all of them. Category is the hardest column and partly a judgement: "<code>age &gt; 18</code> should be <code>&gt;=</code>" was labelled wrong_operator here, and some routes called it off_by_one. Claude Haiku\'s prompted replies: '+fen+' of '+hp.length+' wrapped in a Markdown fence despite "Don\'t include any text or Markdown fencing"; strict <code>json.loads</code> fails on them, a fence-stripping parser recovers '+len+'. Token counts are each route\'s first request (local: the server\'s count; Claude: input plus cache tokens, which include Claude Code\'s own prompt). Wall times are not shown: the local server was shared with other agents.'})();

// ---------- what the table shows (computed from the data) ----------
(function(){const el=document.getElementById('ftyped-so-read');if(!el)return;
  const g=id=>(R[id]||[]),vd=a=>a.filter(r=>r.valid),ca=a=>{const v=vd(a);return cnt(v,'category_ok')+' of '+v.length};
  const nat=g('pai_native').concat(g('oai'),g('adk'));
  const w=F.wire.pai_native&&F.wire.pai_native.cases;const anyRetry=w&&Object.values(w).find(c=>c.retry);
  const objs=F.so.filter(r=>r.valid);
  el.innerHTML='<p><b>What it shows.</b> <b>Native routes, 0 of '+nat.length+'</b>: the request carried the schema only in <code>response_format</code>, the server dropped it, and the model wrote a prose bug report. Pydantic AI then sent one retry, '+(anyRetry?'"'+E(anyRetry.retry.split('\n')[0])+' ... Fix the errors and try again."':'a validation error')+', which also does not contain the schema, and gave up; the Agents SDK and ADK raised on the first reply with no retry. Moving the same schema into the prompt (prompted, '+cnt(g('pai_prompted'),'valid')+' of '+g('pai_prompted').length+') or into a tool ('+cnt(g('pai_tool'),'valid')+' of '+g('pai_tool').length+') fixed validity on the same server.</p>'+
   '<p><b>Validity and content are separate questions.</b> Among valid replies, the category was right in '+ca(g('pai_prompted'))+' prompted runs, '+ca(g('constrained'))+' constrained, but only '+ca(g('pai_tool'))+' tool-output runs: filling a tool call\'s arguments directly, the small model chose <code>wrong_operator</code> for a regex bug. A route that guarantees the shape says nothing about the answer. The self-reported <code>confidence</code> was 5 in '+objs.filter(r=>r.conf===5).length+' of '+objs.filter(r=>r.conf!=null).length+' valid results across every route, local model and Claude alike; read it as decoration.</p>'+
   '<p><b>Claude.</b> Both models filled the <code>StructuredOutput</code> tool correctly every time ('+cnt(g('claude_haiku_schema'),'valid')+' and '+cnt(g('claude_sonnet_schema'),'valid')+' of 10), at the cost of one extra turn. With the schema only in the prompt, Sonnet 5.5 replied with bare JSON '+cnt(g('claude_sonnet_prompt'),'valid')+' of 10 times, Haiku 4.5 wrapped '+g('claude_haiku_prompt').filter(r=>r.fenced).length+' of 10 replies in a Markdown fence despite the instruction not to: a strict parser fails on them, a fence-stripping one recovers '+g('claude_haiku_prompt').filter(r=>r.lenient).length+'. The parent root recorded the same fence once; here it is the habit.</p>'})();

// ---------- the output-route animation ----------
(function(){const card=document.getElementById('ftyped-an-card');if(!card)return;
  const MODES=[['pai_tool','Tool (Pydantic AI)'],['pai_native','Native (Pydantic AI)'],['pai_prompted','Prompted (Pydantic AI)'],['oai','Agents SDK'],['adk','ADK'],['constrained','Constrained decoding'],['claude_haiku_schema','Claude: --json-schema'],['claude_haiku_prompt','Claude: in prompt']];
  const CODE={pai_tool:"agent = Agent(model, output_type=Triage)        # ToolOutput is the default",
    pai_native:"agent = Agent(model, output_type=NativeOutput(Triage))",
    pai_prompted:"agent = Agent(model, output_type=PromptedOutput(Triage))",
    oai:"agent = Agent(name='triage', model=model, output_type=Triage)",
    adk:"agent = LlmAgent(name='triage', model=LiteLlm(...), output_schema=Triage, output_key='triage')",
    constrained:"text = outlines.from_mlxlm(model, tok)(chat, Triage)   # same model, in-process",
    claude_haiku_schema:"claude -p PROMPT --model haiku --tools \"\" --json-schema SCHEMA",
    claude_haiku_prompt:"claude -p PROMPT --model haiku --tools \"\" --append-system-prompt \"...schema as text...\""};
  const SERVER={pai_tool:'The server renders the tools into the prompt through the model\'s chat template, so the model does see final_result and its schema. It never reads tool_choice, so nothing forces a tool call.',
    pai_native:'The server never reads response_format. The model receives the system and user messages only: the schema is nowhere in its prompt, and nothing constrains decoding.',
    pai_prompted:'The schema reaches the model as text in the system message. Nothing constrains decoding.',
    oai:'As for NativeOutput: the Agents SDK sends the type as response_format, which this server never reads. The model is never told the schema.',
    adk:'ADK hands output_schema to LiteLLM, which sends it as response_format; this server never reads it. The model is never told the schema.',
    constrained:'No server: outlines turns the schema into a token-level guide and, at every step, masks every token that could not continue a valid Triage object.',
    claude_haiku_schema:'Claude Code turns --json-schema into a tool named StructuredOutput and asks the model to finish by calling it.',
    claude_haiku_prompt:'The schema is text in the system prompt. Nothing forces JSON or forbids a Markdown fence.'};
  const seg=document.getElementById('ftyped-an-mode'),sel=document.getElementById('ftyped-an-case');
  seg.innerHTML=MODES.map((m,i)=>'<button data-m="'+m[0]+'"'+(i===0?' class="on"':'')+'>'+m[1]+'</button>').join('');
  sel.innerHTML=F.cases.map(c=>'<option value="'+c.id+'">'+c.id+' ('+c.category.replace('_',' ')+')</option>').join('');
  let mode='pai_tool';
  const P=[0,1,2].map(i=>document.getElementById('ftyped-an-p'+i)),cap=document.getElementById('ftyped-an-cap');
  const STEPS=['code','request','server','reply','verdict'];
  function data(){const w=F.wire[mode]||{cases:{}};return {w,c:w.cases[sel.value]||null}}
  function draw(i){const {w,c}=data();
    P.forEach((p,k)=>{p.classList.toggle('dim',i<k+1||(i===2&&k>0));p.classList.toggle('on',(i===1&&k===0)||(i===2&&k===0)||(i===3&&k===1)||(i===4&&k===2))});
    P[0].querySelector('pre').textContent=i>=1?(w.req||'(not recorded)'):'';
    P[1].querySelector('pre').textContent=i>=3&&c?c.reply:'';
    const vd=P[2].querySelector('.verdict');
    if(i>=4&&c){let t='';if(c.retry)t+='RETRY SENT BACK TO THE MODEL:\n'+c.retry+'\n\n'+(c.reply2?'NEXT REPLY:\n'+c.reply2+'\n\n':'');
      t+=c.valid?'RESULT: '+JSON.stringify(c.obj,null,1):'NO RESULT. '+(c.err||'');P[2].querySelector('pre').textContent=t;
      vd.className='verdict '+(c.valid?'ok':'bad');vd.textContent=(c.valid?'Valid Triage':'Failed')+' after '+c.calls+' model call'+(c.calls===1?'':'s')+(c.fenced?' (reply was fenced)':'');}
    else{P[2].querySelector('pre').textContent='';vd.textContent='';vd.className='verdict'}
    const cs=F.cases.find(x=>x.id===sel.value);
    const caps=['<div class="t">1. What you write</div><p><code>'+E(CODE[mode])+'</code></p><p>Same input every route: <code>'+E(cs.function)+'</code> with a failing <code>'+E(cs.failing_test)+'</code>.</p>',
      '<div class="t">2. What the library puts in the request</div><p>Look for the line marked SCHEMA: that is where this route puts the Triage schema.</p>',
      '<div class="t">3. What the server does with it</div><p>'+E(SERVER[mode])+'</p>',
      '<div class="t">4. What the model wrote</div><p>'+(c?(c.reply.startsWith('TOOL CALL')?'A tool call whose arguments are the result.':(/^\s*[{`]/.test(c.reply)?'Text that is meant to be JSON.':'Prose: the model was not told what shape to use.')):'not recorded')+'</p>',
      '<div class="t">5. What the library did</div><p>'+(c?(c.valid?(c.retry?'Rejected the first reply, sent the error back, and accepted the second.':'Parsed and validated it: done.'):'Gave up: '+E(c.err||'no valid result')+'.'+(c.lenient?' A parser that strips a Markdown fence first would have recovered a valid object.':'')):'')+'</p>'];
    cap.innerHTML=caps[i];
  }
  const an=RD.anim({card:'ftyped-an-card',ctl:'ftyped-an-ctl',n:STEPS.length,draw,ms:2200,label:'Step'});
  RD.seg(seg,m=>{mode=m;an.reset(STEPS.length);an.play()});
  sel.addEventListener('change',()=>an.redraw());
})();

// ---------- smolagents executor table ----------
(function(){const t=document.getElementById('ftyped-smol-tbl');if(!t)return;
  t.innerHTML='<thead><tr><th>Probe</th><th>Code</th><th>Authorised imports</th><th>Result</th></tr></thead><tbody>'+F.smol.map(s=>
    '<tr><td>'+E(s.label)+'</td><td><code>'+E(s.code).replace(/\n/g,'<br>')+'</code></td><td>'+(s.authorized.length?'<code>'+E(s.authorized.join(', '))+'</code>':'default')+'</td><td>'+
    (s.ok?'<span class="pill ok">ran</span> '+E(s.output)+(s.logs?' (printed: '+E(s.logs.trim())+')':''):'<span class="pill bad">refused</span> '+E(s.error.replace(/^InterpreterError: Code execution failed at line .*? due to: InterpreterError: /,'').slice(0,140)))+'</td></tr>').join('')+'</tbody>';
})();
})();
