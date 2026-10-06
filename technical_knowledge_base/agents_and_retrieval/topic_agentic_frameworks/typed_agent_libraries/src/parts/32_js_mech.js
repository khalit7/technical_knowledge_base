// ---- Mechanisms, recorded ----
(function(){
const F=window.FT,E=RD.esc,M=F.mech;
const NAMES={oai_handoff_greedy:'Agents SDK: handoff, greedy',oai_handoff_t07_1:'Agents SDK: handoff, sampled 0.7',oai_guard_par_greedy:'Agents SDK: input guardrail, parallel (default)',oai_guard_seq_greedy:'Agents SDK: input guardrail, blocking',oai_session_greedy:'Agents SDK: SQLite session, two turns',oai_tracing_greedy:'Agents SDK: default tracing, no OpenAI key',adk_transfer_greedy:'ADK: coordinator with two sub_agents',adk_task_greedy:'ADK: the running example, greedy',adk_task_t07_1:'ADK: the running example, sampled 1',adk_task_t07_2:'ADK: the running example, sampled 2',adk_task_t07_3:'ADK: the running example, sampled 3'};
const keys=Object.keys(NAMES).filter(k=>M[k]);
const sel=document.getElementById('ftyped-x-run');
sel.innerHTML=keys.map(k=>'<option value="'+k+'">'+E(NAMES[k])+'</option>').join('');
const box=document.getElementById('ftyped-x-reqs'),cap=document.getElementById('ftyped-x-cap'),sum=document.getElementById('ftyped-x-sum');
function who(s){const m=s.match(/internal name is "(\w+)"/);if(m)return m[1];if(/System context|route each request/.test(s))return /System context/.test(s)?'triage':'coordinator';if(/You explain code/.test(s))return 'explainer';if(/Decide whether the user/.test(s))return 'topic_check (guardrail)';if(/coding agent/.test(s))return 'fixer';if(/Answer briefly/.test(s))return 'assistant';return 'agent'}
function render(){const d=M[sel.value]||{wire:[]};const w=d.wire||[];
  box.innerHTML=w.map((x,i)=>'<div class="rq" id="ftyped-x-r'+i+'"><div class="h"><b>request '+(i+1)+'</b><span>agent: <b>'+E(who(x.sys))+'</b></span><span>'+x.msgs+' messages ('+E(x.roles.join(', '))+')</span><span>'+(x.pt||'?')+' prompt tokens, '+(x.ct||'?')+' out</span></div><div>'+(x.tools.length?x.tools.map(t=>'<span class="tl'+(/transfer/.test(t)?' tr':'')+'">'+E(t)+'</span>').join(''):'<span class="tl">no tools</span>')+(x.rf?'<span class="tl">response_format</span>':'')+'</div><pre>'+E(x.reply)+'</pre></div>').join('')||'<p class="small mute">No requests recorded.</p>';
  let s='';if(d.tests)s+='Tests after the run: <span class="pill '+(d.tests.pass?'ok':'bad')+'">'+(d.tests.pass?'pass':'fail')+'</span> ';if(d.last_agent)s+='last agent <code>'+E(d.last_agent)+'</code> ';if(d.error)s+='error: '+E(d.error);
  if(d.cases)s+=d.cases.map(c=>'"'+E(c.prompt.slice(0,40))+'": '+(c.tripped?'<span class="pill bad">tripped</span>':'<span class="pill ok">passed</span>')+' after '+c.requests+' request'+(c.requests===1?'':'s')).join('; ');
  if(sel.value.startsWith('oai_tracing')&&F.trace_log)s+='SDK log: <code>'+E(F.trace_log)+'</code>';
  sum.innerHTML=s+' <span class="mute">('+w.length+' requests)</span>';
  an.reset(Math.max(1,w.length))}
function draw(i){const d=M[sel.value]||{wire:[]},w=d.wire||[];
  w.forEach((x,k)=>{const el=document.getElementById('ftyped-x-r'+k);if(el){el.classList.toggle('fut',k>i);el.classList.toggle('cur',k===i)}});
  const x=w[i];if(!x){cap.innerHTML='';return}
  let t='<div class="t">Request '+(i+1)+' of '+w.length+': '+E(who(x.sys))+'</div><p>';
  if(x.tools.some(t=>/transfer/.test(t)))t+='The transfer tool is offered alongside the agent\'s own tools: to the model, a handoff is one more function. ';
  if(/TOOL CALL transfer/.test(x.reply))t+='The model chose the transfer tool: the library will switch agents and resend the history with the new agent\'s instructions and tools. ';
  else if(/TOOL CALL/.test(x.reply))t+='A tool call: the library runs it and appends the result. ';
  else t+='No tool call: for this agent that ends the turn. ';
  if(i>0&&w[i-1]&&who(w[i-1].sys)!==who(x.sys))t+='The speaker changed from '+E(who(w[i-1].sys))+' to '+E(who(x.sys))+', and the history came along ('+x.msgs+' messages).';
  cap.innerHTML=t+'</p>';
  const el=document.getElementById('ftyped-x-r'+i);if(el&&el.scrollIntoView&&box.contains(el)){const b=box.getBoundingClientRect(),r=el.getBoundingClientRect();if(r.top<b.top||r.bottom>b.bottom)box.scrollTop+=r.top-b.top-20}}
const an=RD.anim({card:'ftyped-x-card',ctl:'ftyped-x-ctl',n:1,draw,ms:1800,label:'Request',tab:'t-mech'});
sel.addEventListener('change',render);render();
// guard before/after
(function(){const g=document.getElementById('ftyped-x-guard');
  g.innerHTML=['oai_guard_par_greedy','oai_guard_seq_greedy'].map(k=>{const d=M[k];if(!d)return '<div class="sp"><p>not recorded</p></div>';const c=(d.cases||[])[0]||{};
    const w=(d.wire||[]).slice(0,c.requests||0);
    return '<div class="sp"><div class="n">'+(k.includes('par')?'parallel (default)':'blocking')+'</div><p>'+(c.tripped?'<span class="pill bad">tripwire</span>':'<span class="pill ok">passed</span>')+' after <b>'+c.requests+'</b> model request'+(c.requests===1?'':'s')+':</p><ol class="tight">'+w.map(x=>'<li>'+E(who(x.sys))+' ('+(x.pt||'?')+' prompt tokens): '+E(x.reply.slice(0,90))+'</li>').join('')+'</ol></div>'}).join('');})();
// session
(function(){const s=M.oai_session_greedy,el=document.getElementById('ftyped-x-sess');if(!s){el.innerHTML='<p class="small mute">not recorded</p>';return}
  el.innerHTML='<p class="small">SQLite tables and columns: '+Object.entries(s.tables||{}).map(([t,c])=>'<code>'+E(t)+'</code> ('+c.map(E).join(', ')+'; '+(s.rows||{})[t]+' rows)').join('; ')+'.</p><div class="tw"><table><thead><tr><th>#</th><th>stored item</th></tr></thead><tbody>'+(s.stored_items||[]).map((it,i)=>'<tr><td>'+(i+1)+'</td><td><code>'+E(JSON.stringify(it).slice(0,220))+'</code></td></tr>').join('')+'</tbody></table></div><p class="small">Answers: '+(s.answers||[]).map(a=>'"'+E(String(a).slice(0,80))+'"').join(', then ')+'.</p>'})();
})();
