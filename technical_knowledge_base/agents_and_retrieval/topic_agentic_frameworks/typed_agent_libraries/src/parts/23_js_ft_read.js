// ---- Reading tab: schema viewer, results table (closed block), output-route stepper, executor table ----
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
RD.tabLinks(document.getElementById('t-read'));

// ---------- schema viewer ----------
(function(){const box=document.getElementById('ftyped-sch');if(!box)return;
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
  RD.seg(document.getElementById('ftyped-sch-seg'),show);show('pydantic_ai');
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
  RD.seg(seg,m=>{mode=m;an.reset(STEPS.length)});   // a mode switch resets to step 1 and waits: never autoplays
  sel.addEventListener('change',()=>an.redraw());
})();

// ---------- smolagents executor table ----------
(function(){const t=document.getElementById('ftyped-smol-tbl');if(!t)return;
  t.innerHTML='<thead><tr><th>Probe</th><th>Code</th><th>Authorised imports</th><th>Result</th></tr></thead><tbody>'+F.smol.map(s=>
    '<tr><td>'+E(s.label)+'</td><td><code>'+E(s.code).replace(/\n/g,'<br>')+'</code></td><td>'+(s.authorized.length?'<code>'+E(s.authorized.join(', '))+'</code>':'default')+'</td><td>'+
    (s.ok?'<span class="pill ok">ran</span> '+E(s.output)+(s.logs?' (printed: '+E(s.logs.trim())+')':''):'<span class="pill bad">refused</span> '+E(s.error.replace(/^InterpreterError: Code execution failed at line .*? due to: InterpreterError: /,'').slice(0,140)))+'</td></tr>').join('')+'</tbody>';
})();
})();
