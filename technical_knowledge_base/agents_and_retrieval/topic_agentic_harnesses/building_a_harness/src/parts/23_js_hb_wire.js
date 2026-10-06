// ---- Reading, section 1: one tool call end to end, in tokens (data: HB.tok, HB.boundary) ----
(function(){
  const H=window.HB, T=H&&H.tok; if(!T||!document.getElementById('hb-wire'))return;
  const esc=RD.esc, toks=T.toks;
  const isSp=id=>id>=151643;
  // locate regions in the final request by its special tokens
  const idx=(id,from)=>{for(let i=from||0;i<toks.length;i++)if(toks[i][0]===id)return i;return -1};
  const IM_S=151644, IM_E=151645;
  const sysEnd=idx(IM_E,0);                       // end of system turn (tools inside)
  const userStart=idx(IM_S,sysEnd), userEnd=idx(IM_E,userStart);
  const asst1=idx(IM_S,userEnd);                  // <|im_start|> assistant (generation prompt of request 1)
  const genStart=asst1+2, genEnd=idx(IM_E,genStart);   // the model's reply, as the template re-renders it
  const resStart=idx(IM_S,genEnd), resEnd=idx(IM_E,resStart);
  const req2End=T.cuts[1];
  const B=H.boundary&&H.boundary.example;         // a recorded continuation past <|im_end|>
  const fakeToks=B?B.toks:[];
  const mode={m:'ok'};
  const stagesOk=['Request','Render','Prompt','Generate','Stop token','Parse','Results back'];
  const stagesBad=['Request','Render','Prompt','Generate','No stop','Invented turn','Consequence'];
  function strip(lo,hi,cls,extra){
    let h='';
    for(let i=lo;i<hi;i++){const t=toks[i];h+='<span class="'+(isSp(t[0])?'sp ':'')+(cls||'')+'" title="id '+t[0]+'">'+esc(t[1]).replace(/\n/g,'↵\n')+'</span>'}
    return h+(extra||'');
  }
  const stat=(k,v,d)=>RD.stat(k,v,d);
  const jsonReq=()=>'<pre class="hb-code" style="max-height:14em">'+esc(JSON.stringify({model:'mlx-community/Qwen3-4B-Instruct-2507-4bit',
      messages:[{role:'system',content:T.system},{role:'user',content:T.user.slice(0,60)+' ...'}],
      tools:T.tools.map(t=>({type:'function',function:{name:t.function.name,description:t.function.description.slice(0,40)+' ...',parameters:'{...}'}})),
      temperature:0.7},null,1))+'</pre>';
  const steps=()=>{
    const common=[
      {t:'1. The harness sends JSON',p:'Two messages (system, task) and four tool definitions, each a name, a description and a JSON Schema. Nothing here is text the model reads yet.',tok:()=>jsonReq(),st:[['messages','2',''],['tools','4','read_file, run_tests, edit_file, run_command']]},
      {t:'2. The server renders the system turn',p:'The chat template writes the system prompt, then "# Tools", the four definitions as JSON lines inside <tools></tools>, and the instruction to answer with <tool_call>{...}</tool_call>. Blue tokens are special tokens (one id each).',tok:()=>strip(0,sysEnd+1,''),st:[['system turn',(sysEnd+1).toLocaleString()+' tokens','tools included']]},
      {t:'3. ... then the task, and an open assistant turn',p:'The user turn holds the task and the file list; the prompt ends with <|im_start|>assistant and a newline: the model is invited to speak.',tok:()=>strip(userStart,asst1+2,''),st:[['prompt',(T.usage1.prompt_tokens).toLocaleString()+' tokens','the server reported '+T.usage1.prompt_tokens]]},
      {t:'4. The model generates two tool calls',p:'Token by token: a newline, <tool_call>, a JSON object naming read_file and its path, </tool_call>, and a second call for the test file. The server counted '+T.usage1.completion_tokens+' generated tokens.',tok:()=>strip(genStart-1,genEnd,'gen'),st:[['generated',T.usage1.completion_tokens+' tokens','server count']]}];
    if(mode.m==='ok')return common.concat([
      {t:'5. <|im_end|>: the boundary',p:'Token 151645 is one of the model\'s end-of-sequence ids (generation_config.json), so sampling stops here. Nothing after the call is generated: the result can only come from the harness.',tok:()=>strip(genStart-1,genEnd+1,'gen'),st:[['stop token','151645','<|im_end|>'],['finish_reason',esc(T.finish1),'from the server']]},
      {t:'6. The server parses the calls',p:'mlx-lm cuts the text between the tags and runs json.loads on it, then returns OpenAI-style tool_calls with an id each. The harness never sees the tags.',tok:()=>'<pre class="hb-code">'+esc(JSON.stringify(T.calls,null,1))+'</pre>',st:[['tool calls',String(T.calls.length),'in one reply (section 3)']]},
      {t:'7. Results come back as a user turn',p:'The harness runs both reads and appends two role "tool" messages. The template renders them inside one user turn, as <tool_response> blocks, without the ids. With the assistant turn and a new generation prompt, the next request is '+req2End.toLocaleString()+' tokens.',tok:()=>strip(resStart,Math.min(resEnd+1,resStart+140),'')+(resEnd-resStart>140?'<span class="dim"> ... '+(resEnd-resStart-140)+' more tokens</span>':''),st:[['next prompt',req2End.toLocaleString()+' tokens','the server reported '+req2End]]}]);
    const fake=B?B:null;
    return common.concat([
      {t:'5. Generation continues past <|im_end|>',p:fake?'Same prompt, same reply, sent as raw text to /v1/completions so nothing stops at the end-of-turn token. The model goes straight on and opens the next turn itself: <|im_start|>user, a restated task, then tool calls of its own (red tokens are the continuation).':'Recording pending.',tok:()=>strip(genStart-1,genEnd+1,'gen')+(fake?fakeToks.slice(0,40).map(t=>'<span class="fake'+(isSp(t[0])?' sp':'')+'" title="id '+t[0]+'">'+esc(t[1]).replace(/\n/g,'↵\n')+'</span>').join(''):''),st:fake?[['continued with',esc(fake.opener),'first tokens after the boundary']]:[]},
      {t:'6. It writes the user\'s turn, with calls inside',p:fake?esc(fake.caption):'',tok:()=>fake?'<pre class="hb-code">'+esc(fake.text)+'</pre>':'',st:fake?[['wrote a user turn',fake.n_fab+' of '+fake.n,'samples after this call']]:[]},
      {t:'7. Why it matters',p:'A harness that read past the boundary would treat words the model wrote for the user as the user\'s, and run calls the model made while playing the user. In the parent page\'s Loop lab the same failure took the other form: Claude Haiku, on a text protocol with no stop, wrote a fake tool result (a fake core.py), and then said the code "appears correct". The end-of-turn token, a stop sequence, or an API\'s stop_reason is what keeps observations honest (section 2).',tok:()=>'',st:[]}]);
  };
  const stage=document.getElementById('hb-wire-stage'),cap=document.getElementById('hb-wire-cap'),tk=document.getElementById('hb-wire-tok'),sts=document.getElementById('hb-wire-stats');
  let S=steps();
  function draw(i){
    const names=mode.m==='ok'?stagesOk:stagesBad;
    stage.innerHTML=names.map((n,k)=>'<div class="'+(k===i?'on':'')+(mode.m==='bad'&&k>=4&&k<=i?' bad':'')+'">'+n+'</div>').join('');
    const s=S[i];cap.innerHTML='<div class="t">'+esc(s.t)+'</div><p>'+s.p+'</p>';
    tk.innerHTML=s.tok();tk.scrollTop=tk.scrollHeight*(i===2?1:0);
    sts.innerHTML=s.st.map(x=>stat(x[0],x[1],x[2])).join('');
  }
  const an=RD.anim({card:'hb-wire',ctl:'hb-wire-ctl',n:S.length,draw,ms:2600,label:'Step of the tool call'});
  RD.seg(document.getElementById('hb-wire-mode'),m=>{mode.m=m;S=steps();an.reset(S.length);an.play()});
})();
