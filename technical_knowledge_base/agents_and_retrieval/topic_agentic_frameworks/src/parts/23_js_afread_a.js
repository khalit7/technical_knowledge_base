// ---- Reading tab, part A: the layer map, the ownership axis, workflow against agent (data: window.AFREAD from 22_js_afread_data.js) ----
(function(){
const D=window.AFREAD,E=RD.esc;
const fmt$=v=>'$'+(v<0.1?v.toFixed(4):v.toFixed(3));
const fmtN=v=>Math.round(v).toLocaleString('en-US');

// 1) the layer map
const LAY={
 orch:'<b>Orchestration</b> decides what runs next: your code (a workflow), the model (an agent), or a graph that mixes both. It also holds the run\'s state between steps. Libraries: LangGraph, Pydantic AI, OpenAI Agents SDK, smolagents, Google ADK, CrewAI, Microsoft Agent Framework, Claude Agent SDK. Sections <a href="#rd-s1">1</a> to <a href="#rd-s5">5</a>.',
 gw:'<b>A gateway</b> is a proxy between your code and the providers: one API shape for every model, keys and spend limits per team, retries and fallbacks when a provider fails, one place to log every call. LiteLLM (self-hosted), OpenRouter (managed). Section <a href="#rd-s6">6</a>.',
 obs:'<b>Observability</b> records each run as a trace: a tree of timed steps (model calls, tool calls) with tokens and cost, so a bad run can be replayed and a bill attributed. Evals run scorers over those traces. OpenTelemetry GenAI conventions, Langfuse, LangSmith, Braintrust, Phoenix. Section <a href="#rd-s7">7</a>.',
 mem:'<b>Memory</b> keeps what should outlive one conversation (a user\'s preferences, facts that change over time) outside the context window and brings back only what is relevant. Mem0, Zep, Letta. Section <a href="#rd-s8">8</a>.'};
const mc=document.getElementById('afread-map-card'),md=document.getElementById('afread-map-det');
function pick(l){mc.querySelectorAll('button[data-l]').forEach(b=>b.classList.toggle('on',b.dataset.l===l));md.innerHTML=LAY[l]}
mc.addEventListener('click',e=>{const b=e.target.closest('button[data-l]');if(b)pick(b.dataset.l)});
pick('orch');

// 2) the ownership axis: who writes each piece at each position (this page's reading of each library's docs)
const PIECES=['The loop (call, run tool, repeat, stop)','Tool schemas','Order of steps','Saved state, resume after a crash','Pause for a human','Context trimming and compaction','Built-in tools (files, shell)','Permissions and sandbox','Where the loop runs'];
const Y='you',L='lib',V='ven';
const POS=[
 {n:'Plain API calls',ex:'the provider SDK, a while loop or your own DAG engine',
  c:[[Y,'you write it (about 15 lines)'],[Y,'hand-written JSON schema'],[Y,'your code, or the model inside your loop'],[Y,'you persist messages yourself'],[Y,'you block or save and resume'],[Y,'you trim'],[Y,'you write them'],[Y,'you'],[Y,'your process']],
  cap:'Everything is visible and nothing is hidden: the request is exactly the dictionary you built. You also build every feature below yourself. The {{Same agent|#t-same}} tab\'s version 1 is this position.'},
 {n:'Minimal loop library',ex:'Pydantic AI, OpenAI Agents SDK, smolagents, Google ADK',
  c:[[L,'Agent + run()'],[L,'from type hints or docstrings'],[L,'the model, plus handoffs or agents-as-tools'],[Y,'sessions keep history; crash recovery is mostly yours'],[Y,'some offer approval hooks; you wire them'],[Y,'mostly yours'],[Y,'yours (smolagents ships a few)'],[Y,'yours; smolagents offers sandboxed executors'],[Y,'your process']],
  cap:'The library writes the loop, the schemas and a typed result. You still own durability, approval and the environment. Prompt inflation starts here: the framework adds instructions or tools you did not write.'},
 {n:'Graph runtime',ex:'LangGraph, LlamaIndex Workflows',
  c:[[L,'prebuilt agent node, or your own nodes'],[L,'from type hints'],[Y,'you declare the graph; the runtime runs it'],[L,'checkpointer after every step'],[L,'interrupt() and resume'],[Y,'yours, with middleware hooks'],[Y,'yours'],[Y,'yours'],[Y,'your process, or their hosted platform']],
  cap:'You draw the control flow; the runtime saves state after every step, so crash recovery, human pauses of any length and replay from an old step come with it. Section 3.'},
 {n:'Harness as a library',ex:'Claude Agent SDK',
  c:[[L,'Claude Code\'s loop'],[L,'@tool, served in-process'],[L,'the model'],[L,'sessions you can resume'],[L,'a permission callback you write'],[L,'automatic compaction'],[L,'Read, Edit, Bash, Grep and more'],[L,'permission modes and rules; optional OS sandbox'],[Y,'your process or container']],
  cap:'You configure a finished agent instead of assembling one: you choose its tools, permissions and prompt. The loop is Claude Code\'s, so it is only as open as its settings.'},
 {n:'Hosted runtime',ex:'OpenAI Agents API, Claude Managed Agents',
  c:[[V,'the vendor\'s'],[Y,'you declare your custom tools'],[V,'the vendor\'s harness'],[V,'durable sessions on their side'],[V,'server-side permission policies'],[V,'the vendor compacts'],[V,'provided'],[V,'their policies, their or your sandbox'],[V,'the vendor\'s servers']],
  cap:'Buying the loop: you send a task and get events back. What you give up is exactly control flow and visibility; what you trace is what the vendor exports. Section 9.'}];
const pb=document.getElementById('afread-pos'),ow=document.getElementById('afread-own'),oc=document.getElementById('afread-own-cap');
pb.innerHTML=POS.map((p,i)=>'<button data-i="'+i+'">'+(i+1)+'. '+E(p.n)+'</button>').join('');
ow.innerHTML=PIECES.map((p,j)=>'<div class="r"><span>'+E(p)+'</span><span class="c" id="afread-own-'+j+'"></span></div>').join('');
const link=s=>s.replace(/\{\{([^|{}]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>');
function setPos(i){const p=POS[i];pb.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===i));
 p.c.forEach((c,j)=>{const el=document.getElementById('afread-own-'+j);el.className='c '+c[0];el.textContent=c[1]});
 oc.innerHTML='<div class="t">'+E(p.n)+' <span class="mute small">('+E(p.ex)+')</span></div><p>'+link(p.cap)+'</p>'}
pb.addEventListener('click',e=>{const b=e.target.closest('button');if(b)setPos(+b.dataset.i)});
RD.tabLinks(oc);setPos(0);

// 3) workflow against agent on the same input: who chose each step
const CH={diagnose:'Model call 1: diagnose (the script pasted core.py and the test output in)',gate:'Code gate: does the diagnosis name every failing test?',fix:'Model call 2: write the fixed functions',apply:'Code: write core.py',test:'Code: run the tests and the six hidden checks'};
const chain=D.chain.map(s=>({who:s.who,t:CH[s.node]||s.what}));
const ag=D.agent;
const N=Math.max(chain.length,ag.length)+1;
const L1=document.getElementById('afread-who-l'),R1=document.getElementById('afread-who-r');
L1.innerHTML=chain.map((s,i)=>'<div class="afread-step" id="afread-wl'+i+'"><span class="who '+s.who+'">'+(s.who==='model'?'model':'your code')+'</span><span>'+E(s.t)+'</span></div>').join('');
R1.innerHTML=ag.map((s,i)=>'<div class="afread-step" id="afread-wr'+i+'"><span class="who model">model chose</span><span><code>'+E(s.tool)+(s.arg?' '+E(s.arg.length>40?s.arg.slice(0,40)+'...':s.arg):'')+'</code><span class="r'+(s.err?' err':'')+'">'+E(s.res||'')+'</span></span></div>').join('');
const cap=document.getElementById('afread-who-cap'),out=document.getElementById('afread-who-out');
const A=D.runs.agent,C=D.runs.chain;
function capFor(i){
 if(i>=N-1)return['Both done','The chain ran the five steps its author wrote; the agent chose '+ag.length+' tool calls over '+A.turns+' turns. Both passed the visible tests and '+C.hidden+' of '+C.nhidden+' hidden checks.'];
 const l=chain[i],r=ag[i];let p=[];
 if(l)p.push('Workflow: '+l.t+'.');else p.push('Workflow: finished.');
 if(r){let s='Agent: the model asked for '+r.tool+(r.arg?' ('+(r.arg.length>50?r.arg.slice(0,50)+'...':r.arg)+')':'')+'.';
  if(r.err)s+=' The tool returned an error; the model reads it and tries something else, which no workflow author planned for.';
  else if(/tests/.test(r.arg)&&/FAIL/.test(r.res||''))s+=' It ran the tests itself and saw both failures.';
  else if(/tests/.test(r.arg))s+=' It checked its own work.';
  else if(r.tool==='Edit')s+=' An exact-string replacement, chosen by the model.';
  p.push(s)}
 return['Step '+(i+1),p.join(' ')]}
function draw(i){
 chain.forEach((s,j)=>document.getElementById('afread-wl'+j).className='afread-step'+(j===i?' on':j<i?' past':''));
 ag.forEach((s,j)=>document.getElementById('afread-wr'+j).className='afread-step'+(j===i?' on':j<i?' past':''));
 const c=capFor(i);cap.innerHTML='<div class="t">'+E(c[0])+'</div><p>'+E(c[1])+'</p>';
 const done=i>=N-1;
 out.innerHTML=RD.stat('Chain: model calls',String(C.calls),'plus three code steps')+RD.stat('Chain: time, cost',done?C.wall+' s, '+fmt$(C.cost):'...','tokens processed '+(done?fmtN(C.tokens):'...'))+
  RD.stat('Agent: turns',String(A.turns),ag.length+' tool calls')+RD.stat('Agent: time, cost',done?A.wall+' s, '+fmt$(A.cost):'...','tokens processed '+(done?fmtN(A.tokens):'...'))}
RD.anim({card:'afread-who-card',ctl:'afread-who-ctl',n:N,ms:1500,draw,label:'Step of the run'});
const ha=document.getElementById('afread-hid-ans');
if(ha){const both=['route','evalopt'].map(k=>D.runs[k]);ha.textContent='Routing ('+both[0].hidden+'/6, '+both[0].wall+' s) and evaluator-optimizer ('+both[1].hidden+'/6, '+both[1].wall+' s, '+fmt$(both[1].cost)+'); the unfixed code passes '+D.runs.baseline_hidden+'/6 and every other design 5/6.'}
})();
