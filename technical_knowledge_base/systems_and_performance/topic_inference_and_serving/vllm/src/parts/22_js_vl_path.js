// ---- Reading, section 1: one request through vLLM's processes (step animation), and sync against async scheduling ----
(function(){
  const G='https://github.com/vllm-project/vllm/blob/v0.31.0/';
  const L=(f,n,txt)=>'<a href="'+G+f+'#L'+n+'" target="_blank" rel="noopener noreferrer">'+(txt||f.replace(/^vllm\//,'')+' L'+n)+'</a>';
  // lanes and boxes
  const lanes=[
    {t:'Client',b:[['cl','Your app: POST /v1/completions, stream: true']]},
    {t:'API server process',b:[['rt','api_router.create_completion'],['sv','OpenAIServingCompletion'],['ip','AsyncLLM.add_request: InputProcessor (tokenize)'],['op','OutputProcessor (detokenize, stop strings)'],['cc','AsyncMPClient (ZMQ, msgpack)'],['oh','output_handler task']]},
    {t:'Engine core process',b:[['it','input thread, input_queue'],['bl','run_busy_loop'],['sc','Scheduler.schedule'],['mr','executor, worker, model runner'],['uo','Scheduler.update_from_output'],['ot','output_queue, output thread']]}
  ];
  // steps: [box ids lit, token chip, title, text]
  const S=[
    [['cl'],'text','The client sends one request','A JSON body with the prompt and <span class="mono">stream: true</span>. FastAPI routes it to '+L('vllm/entrypoints/openai/completion/api_router.py',47,'create_completion (api_router.py L47)')+'.'],
    [['rt','sv'],'text','The serving layer builds sampling parameters','<span class="mono">OpenAIServingCompletion.create_completion</span> ('+L('vllm/entrypoints/openai/completion/serving.py',109,'serving.py L109')+') turns the request into SamplingParams and calls <span class="mono">engine_client.generate()</span> ('+L('vllm/entrypoints/openai/completion/serving.py',203,'L203')+'), an async generator.'],
    [['ip'],'token ids','Tokenize, in the API server','<span class="mono">AsyncLLM.add_request</span> runs the InputProcessor ('+L('vllm/v1/engine/async_llm.py',449,'async_llm.py L449')+'): chat template and tokenizer, on this process\'s CPU. It also creates the request\'s own output queue, a RequestOutputCollector ('+L('vllm/v1/engine/async_llm.py',495,'L495')+').'],
    [['op','cc'],'token ids','Register, then send to the engine','The OutputProcessor gets an incremental detokenizer for this request ('+L('vllm/v1/engine/async_llm.py',547,'L547')+'); then '+L('vllm/v1/engine/async_llm.py',550,'add_request_async (L550)')+' sends an EngineCoreRequest, msgpack over a ZeroMQ socket ('+L('vllm/v1/engine/core_client.py',1259,'core_client.py L1259')+').'],
    [['it'],'token ids','Engine core: an I/O thread receives it','A dedicated input thread decodes the message and puts it on a Python queue ('+L('vllm/v1/engine/core.py',1754,'core.py L1754')+'), so socket work never blocks the loop.'],
    [['bl'],'request','The busy loop picks it up','Each loop iteration first drains the input queue ('+L('vllm/v1/engine/core.py',1496,'_process_input_queue, L1496')+'), so new requests join between steps; <span class="mono">Scheduler.add_request</span> ('+L('vllm/v1/core/sched/scheduler.py',2557,'scheduler.py L2557')+') appends it to the waiting queue and its full blocks are hashed for the prefix cache.'],
    [['bl','sc'],'decision','schedule(): who runs, how many tokens','The scheduler fills a token budget: running requests first, then waiting ones, allocating KV blocks for each ('+L('vllm/v1/core/sched/scheduler.py',562,'scheduler.py L562')+'). Our request is admitted and gets its prompt (or a chunk of it). Section 2 opens this function.'],
    [['mr'],'tensors','The model runs','<span class="mono">execute_model</span> ('+L('vllm/v1/engine/core.py',641,'core.py L641')+') goes through the executor to the worker\'s model runner: build input ids, positions and block tables, run the forward pass ('+L('vllm/v1/worker/gpu/model_runner.py',1676,'model_runner.py L1676')+'), then sample one token per request ('+L('vllm/v1/worker/gpu/model_runner.py',2050,'L2050')+').'],
    [['uo'],'token id','update_from_output(): append, check, free','The sampled id is appended to the request; EOS, stop token ids and max_tokens are checked here; a finished request\'s blocks go back to the pool ('+L('vllm/v1/core/sched/scheduler.py',1967,'scheduler.py L1967')+').'],
    [['ot'],'token id','Outputs leave the engine','The step\'s outputs for every running request go on the output queue ('+L('vllm/v1/engine/core.py',1526,'L1526')+'); an output thread sends them over ZeroMQ ('+L('vllm/v1/engine/core.py',1856,'L1856')+'). The loop is already scheduling the next step.'],
    [['oh','op'],'text','Detokenize, check stop strings','The API server\'s output_handler task ('+L('vllm/v1/engine/async_llm.py',813,'async_llm.py L813')+') hands them to <span class="mono">process_outputs</span> ('+L('vllm/v1/engine/output_processor.py',646,'output_processor.py L646')+'): incremental detokenizing and stop-string checks ('+L('vllm/v1/engine/output_processor.py',720,'L720')+'), then a put into this request\'s collector ('+L('vllm/v1/engine/output_processor.py',745,'L745')+').'],
    [['sv','cl'],'text','Stream it out, and repeat','<span class="mono">generate()</span> yields from that collector ('+L('vllm/v1/engine/async_llm.py',735,'L735')+'); the serving layer writes one server-sent event. Steps 7 to 12 repeat once per output token until the request finishes.']
  ];
  const lanesEl=document.getElementById('vl-path-lanes');
  lanesEl.innerHTML=lanes.map((l,i)=>'<div class="vl-lane"><h5>'+l.t+'</h5>'+l.b.map(b=>'<div class="vl-box" id="vl-pb-'+b[0]+'">'+b[1]+'</div>').join('')+'</div>').join('');
  const cap=document.getElementById('vl-path-cap'),cnt=document.getElementById('vl-path-cnt');
  const laneOf={};lanes.forEach((l,i)=>l.b.forEach(b=>laneOf[b[0]]=i));
  function draw(i){
    const s=S[i];
    lanesEl.querySelectorAll('.vl-box').forEach(b=>{b.classList.remove('on');b.querySelectorAll('.vl-tok').forEach(t=>t.remove())});
    s[0].forEach((id,k)=>{const b=document.getElementById('vl-pb-'+id);b.classList.add('on');if(k===s[0].length-1)b.insertAdjacentHTML('beforeend','<span class="vl-tok">'+s[1]+'</span>')});
    cap.innerHTML='<div class="t">'+(i+1)+'. '+s[2]+'</div><p>'+s[3]+'</p>';
    // counters: process hops and ZMQ messages so far
    let hops=0,prev=-1,zmq=0;for(let k=0;k<=i;k++){const ln=laneOf[S[k][0][0]];if(prev>=0&&ln!==prev){hops++;if((prev===1&&ln===2)||(prev===2&&ln===1))zmq++}prev=laneOf[S[k][0][S[k][0].length-1]]}
    cnt.innerHTML=RD.stat('Step',(i+1)+' / '+S.length)+RD.stat('Process now',lanes[laneOf[s[0][s[0].length-1]]].t)+RD.stat('ZeroMQ messages so far',String(zmq),'each way, one per request in, one per step out')+RD.stat('What travels',s[1]);
  }
  RD.tabLinks(cap);
  RD.anim({card:'vl-path-card',ctl:'vl-path-ctl',n:S.length,draw,ms:2600,label:'Request path step'});

  // ---- sync vs async scheduling timeline ----
  const svgEl=document.getElementById('vl-async-svg'),acap=document.getElementById('vl-async-cap'),acnt=document.getElementById('vl-async-cnt');
  let mode='sync';const C=3,Gt=10,NS=4; // ms
  // build event list per mode: [lane 0 cpu/1 gpu, start, dur, label, step]
  function events(m){const ev=[];
    if(m==='sync'){let t=0;for(let k=1;k<=NS;k++){ev.push([0,t,C,'schedule '+k,k]);ev.push([1,t+C,Gt,'forward '+k,k]);ev.push([0,t+C+Gt,1,'update '+k,k]);t+=C+Gt+1}}
    else{ // schedule k+1 while forward k runs; update k after forward k
      let g=C;ev.push([0,0,C,'schedule 1',1]);for(let k=1;k<=NS;k++){ev.push([1,g,Gt,'forward '+k,k]);if(k<NS)ev.push([0,g,C,'schedule '+(k+1),k+1]);ev.push([0,g+Gt,1,'update '+k,k]);g+=Gt}}
    return ev.sort((a,b)=>a[1]-b[1]||a[0]-b[0])}
  function frames(m){const ev=events(m);return ev.map((e,i)=>i)}
  function adraw(i){
    const ev=events(mode),w=RD.width(svgEl),end=Math.max(...events('sync').map(e=>e[1]+e[2]));
    const x0=70,sc=(w-x0-10)/end,h=96;let b='';
    b+=RD.t(4,32,'CPU',{fill:'var(--mute)'})+RD.t(4,72,'GPU',{fill:'var(--mute)'});
    ev.forEach((e,k)=>{if(k>i)return;const y=e[0]?54:14,x=x0+e[1]*sc,ww=Math.max(2,e[2]*sc-1);
      const col=e[0]?'var(--acc)':(e[3].startsWith('update')?'var(--c4)':'var(--good)');
      b+='<rect x="'+x+'" y="'+y+'" width="'+ww+'" height="26" rx="3" fill="'+col+'" opacity="'+(k===i?1:.55)+'"></rect>';
      if(ww>34)b+=RD.t(x+3,y+17,e[3],{fill:'var(--bg)',fs:10})});
    // gpu idle shading up to current time
    const tnow=ev[i][1]+ev[i][2];let busy=0;ev.forEach((e,k)=>{if(k<=i&&e[0]===1)busy+=e[2]});
    b+='<line x1="'+(x0+tnow*sc)+'" x2="'+(x0+tnow*sc)+'" y1="8" y2="'+(h-6)+'" stroke="var(--bad)" stroke-dasharray="3 3"></line>';
    svgEl.innerHTML=RD.svg(w,h,b,'CPU and GPU timelines for four engine steps');
    const e=ev[i];
    const txt=mode==='sync'?{schedule:'The engine core schedules, then waits: the GPU is idle while the CPU decides.',forward:'The GPU runs the step; the CPU waits for its result before it can do anything for the next step.',update:'Only now can the sampled tokens be appended and the next step be scheduled.'}
      :{schedule:'With a batch queue of 2, the engine core schedules the next step while the GPU is still running the current one.',forward:'The GPU goes straight from one forward pass to the next: the scheduling for it was done in the shadow of the previous one.',update:'The previous step\'s tokens are applied while the GPU is already busy.'};
    acap.innerHTML='<div class="t">'+e[3]+'</div><p>'+txt[e[3].split(' ')[0]]+'</p>';
    const doneSteps=ev.filter((x,k)=>k<=i&&x[3].startsWith('update')).length;
    acnt.innerHTML=RD.stat('Time',tnow+' ms')+RD.stat('GPU busy',Math.round(100*busy/Math.max(1,tnow))+'%')+RD.stat('Steps finished',doneSteps+' of '+NS)+RD.stat('Total for 4 steps',(mode==='sync'?NS*(C+Gt+1):C+NS*Gt+1)+' ms','sync '+NS*(C+Gt+1)+' ms against async '+(C+NS*Gt+1)+' ms');
  }
  const an=RD.anim({card:'vl-async-card',ctl:'vl-async-ctl',n:frames('sync').length,draw:adraw,ms:1100,label:'Timeline event'});
  RD.seg(document.getElementById('vl-async-seg'),m=>{mode=m;an.reset(frames(m).length);an.play()});
  RD.onResize(()=>an.redraw());
})();
