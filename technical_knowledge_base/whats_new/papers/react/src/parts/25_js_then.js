// ---- Then and now: one step of the Apple Remote episode in six generations of wire format ----
(function(){
const OBS='Could not find [Front Row]. Similar: [\'Front Row Seat to Earth\', \'Front Row Motorsports\', \'Front Row (software)\', ...]';
const q=s=>esc(s);
const ER=[
 {t:'October 2022: the ReAct paper (PaLM-540B, few-shot text)',
  wire:'<span class="k">Thought 2:</span> Apple Remote was originally designed to control the Front Row media center program. I need to search Front Row next and find what other device can control it.\n<span class="x">Action 2:</span> Search[Front Row]\n<span class="o">Observation 2:</span> '+q(OBS),
  who:['the model, imitating six human exemplars','free text, split on "Action 2:"','string rules in the harness','6 exemplar trajectories ('+fmt(PAPER.rc.prompt_words['HotpotQA ReAct'])+' words)']},
 {t:'November 2022: LangChain\'s zero-shot ReAct agent',
  wire:'<span class="k">Thought:</span> I need to search Front Row next and find what other device can control it.\n<span class="x">Action:</span> Search\n<span class="x">Action Input:</span> Front Row\n<span class="o">Observation:</span> '+q(OBS),
  who:['the model, from a format instruction','free text, tool name and input on two lines','regular expressions in the framework','none: a zero-shot instruction']},
 {t:'June 2023: function calling',
  wire:'{"role": "assistant", "content": null,\n <span class="x">"function_call"</span>: {"name": "search", "arguments": "{\\"entity\\": \\"Front Row\\"}"}}\n{<span class="o">"role": "function"</span>, "name": "search", "content": "'+q(OBS.replace(/'/g,"\\'"))+'"}',
  who:['optional: the model may emit text first, or not','a JSON object, trained into the model','none: the API returns structured fields','tool schemas in the request']},
 {t:'2024: tool-use content blocks',
  wire:'{"role": "assistant", "content": [\n  {<span class="k">"type": "text"</span>, "text": "The remote was made for Front Row. I need to search Front Row next."},\n  {<span class="x">"type": "tool_use"</span>, "id": "toolu_01", "name": "search", "input": {"entity": "Front Row"}}]}\n{"role": "user", "content": [\n  {<span class="o">"type": "tool_result"</span>, "tool_use_id": "toolu_01", "content": "'+q(OBS)+'"}]}',
  who:['the model, as a visible text block','a typed tool_use block','none','tool schemas; tool use trained in']},
 {t:'2025: reasoning models think between tool calls',
  wire:'{"role": "assistant", "content": [\n  {<span class="k">"type": "thinking"</span>, "thinking": "Front Row is the program the remote was built for. Search it next; if the title is missing, try the software page.", "signature": "..."},\n  {<span class="x">"type": "tool_use"</span>, "id": "toolu_02", "name": "search", "input": {"entity": "Front Row"}}]}\n{"role": "user", "content": [{<span class="o">"type": "tool_result"</span>, "tool_use_id": "toolu_02", "content": "..."}]}\n<span class="k">(the next assistant turn opens with another thinking block)</span>',
  who:['the model, as RL-trained reasoning tokens','a typed tool call','none','reinforcement learning on tasks, no exemplars']},
 {t:'2025 to 2026: the harness loop',
  wire:'<span class="k">while True:</span>\n    reply = model(messages, tools)          # thinks, then maybe calls tools\n    messages.append(reply)\n    if not reply.tool_calls: break          # the finish action\n    for call in reply.tool_calls:\n        messages.append(<span class="o">run(call)</span>)        # the observation',
  who:['the model','typed tool calls, often several at once','none','training, plus the harness\'s system prompt']}];
const steps=ER.map(e=>({t:e.t,c:''})); // each generation's explanation is the static step list sx-th in 06_then.html
const K=['Who writes the thought','How the action is emitted','Who parses it','What the model learns the format from'];
const draw=(m,k,e)=>{const E=ER[k];return '<pre class="wire" style="opacity:'+(0.3+0.7*e).toFixed(2)+'">'+E.wire+'</pre><dl class="wh2">'+K.map((x,i)=>'<dt>'+x+'</dt><dd>'+esc(E.who[i])+'</dd>').join('')+'</dl>'};
const counters=(m,k)=>stat('Generation',(k+1)+' of '+ER.length,ER[k].t.split(':')[0])+stat('Parsing by the harness',k<2?'string rules':'none','actions arrive '+(k<2?'as text':'as structured calls'))+stat('Exemplars in the prompt',k===0?'6':'0',k===0?'hand-written trajectories':'tools are described instead');
makeAnim({id:'th',modes:{x:steps},mode:'x',lists:{x:'sx-th'},draw,counters,dur:4200}); // the six generations are explained in the step list sx-th (06_then.html)
})();
