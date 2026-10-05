// ---- Part 3 (tl) Agent loop stepper: replays the recorded runs of c1_agent_loop.ts ----
(function(){
  const A=window.TL.agent,esc=RD.esc,$=id=>document.getElementById(id);
  const run=s=>A.runs.find(r=>r.scenario===s);
  const short=(s,n)=>s.length>n?s.slice(0,n-3)+'...':s;
  // frames: for each model call: send, reply, (tools); then the end
  function frames(r){
    const F=[],msgs=[{role:'user',blocks:[{k:'text',t:A.task}]}];
    r.steps.forEach((s,j)=>{
      F.push({kind:'send',step:s,n:msgs.length,msgs:msgs.slice(),newFrom:msgs.length});
      const reply={role:'assistant',blocks:s.content.map(b=>b.type==='text'?{k:'text',t:b.text}:{k:'tool_use',t:b.name+'('+JSON.stringify(b.input)+')'})};
      msgs.push(reply);
      F.push({kind:'reply',step:s,msgs:msgs.slice(),newFrom:msgs.length-1});
      if(s.stop==='tool_use'){
        const res={role:'user',blocks:s.results.map(x=>({k:'tool_result',t:x.content,err:!!x.is_error}))};
        if(j<r.steps.length-1){msgs.push(res);F.push({kind:'tools',step:s,msgs:msgs.slice(),newFrom:msgs.length-1})}
        else F.push({kind:'tools',step:s,msgs:msgs.slice(),newFrom:msgs.length,dropped:res});
      }
    });
    F.push({kind:'end',step:r.steps[r.steps.length-1],msgs:F[F.length-1].msgs,newFrom:1e9});
    return F}
  let mode='happy',FR=frames(run(mode));
  function msgHtml(m,isNew){return '<div class="tl-m '+m.role+(isNew?' new':'')+'"><div class="r">'+m.role+'</div>'+
    m.blocks.map(b=>'<div class="tl-b'+(b.err?' err':'')+'"><span class="k">'+(b.err?'tool_result, is_error':b.k)+'</span>'+esc(short(b.t,180))+'</div>').join('')+'</div>'}
  function draw(i){
    const r=run(mode),f=FR[i],s=f.step;
    $('tl-lp-msgs').innerHTML=f.msgs.map((m,k)=>msgHtml(m,k>=f.newFrom)).join('');
    let now='',cap='';
    if(f.kind==='send'){now='<h4>Request '+s.step+'</h4>POST /v1/messages with <b>'+f.n+'</b> message'+(f.n>1?'s':'')+', the tool list ('+A.tools.join(', ')+') and the model name. Everything before is resent.';
      cap='Model call '+s.step+': the whole conversation so far goes out again'+(s.step>1?' (the API keeps no state).':'.')}
    else if(f.kind==='reply'){now='<h4>Reply '+s.step+': stop_reason <code>'+esc(s.stop)+'</code></h4>'+s.content.map(b=>b.type==='text'?'<div>text: '+esc(b.text)+'</div>':'<div>tool_use <code>'+esc(b.name)+'</code> '+esc(JSON.stringify(b.input))+' <span class="mute">id '+esc(b.id)+'</span></div>').join('')+
        '<div class="small mute" style="margin-top:4px">usage: '+s.usage.in+' in, '+s.usage.out+' out (mock estimate)</div>';
      cap=s.stop==='tool_use'?'The model asks for '+s.content.filter(b=>b.type==='tool_use').length+' tool call'+(s.content.filter(b=>b.type==='tool_use').length>1?'s':'')+'. It runs nothing itself; the assistant turn is appended as is.':'stop_reason is '+s.stop+': the loop ends and the text is the answer.'}
    else if(f.kind==='tools'){const mx=Math.max(1,...s.results.map(x=>x.ms));
      now='<h4>Your code runs the tools</h4>'+s.results.map(x=>'<div class="tl-tool'+(x.is_error?' err':'')+'"><span class="bar" style="width:'+Math.max(2,Math.round(140*x.ms/Math.max(mx,500)))+'px"></span><span>'+x.ms+' ms'+(x.is_error?', error: ':': ')+esc(short(x.content,90))+'</span></div>').join('')+
        '<div class="small mute">wall time for this step: <b>'+s.wall+' ms</b>'+(s.results.length>1?' (Promise.all: the calls ran at the same time)':'')+'</div>';
      cap=f.dropped?'The tools ran, but this was step '+s.step+' of maxSteps = '+s.step+': the loop stops before sending the results back.':
        (s.results.some(x=>x.is_error)?'A tool failed; the error goes back as a tool_result with is_error: true, in one user message, for the model to read.':'All results go back in ONE user message, each tool_result carrying the id of its tool_use.')}
    else{now=r.answer?'<h4>Answer</h4>'+esc(r.answer):'<h4>Stopped</h4>'+esc(r.outcome)+'. The caller gets no answer, and the meter shows what the attempt cost.';
      cap=r.answer?'Done after '+r.steps.length+' model calls.':'The step limit is the only thing that ended this run.'}
    $('tl-lp-now').innerHTML=now;$('tl-lp-cap').innerHTML=esc(cap);
    const t=f.kind==='send'&&s.step===1?{in:0,out:0,usd:0}:(f.kind==='send'?r.steps[s.step-2].tot:s.tot);
    $('tl-lp-cnt').innerHTML='model calls <b>'+(f.kind==='send'?s.step-1:s.step)+'</b> (max 5) &middot; messages <b>'+f.msgs.length+'</b> &middot; tokens in <b>'+t.in+'</b> out <b>'+t.out+'</b> &middot; cost <b>$'+t.usd.toFixed(5)+'</b>';
  }
  const an=RD.anim({card:'tl-lp-card',ctl:'tl-lp-ctl',n:FR.length,draw,ms:1700,label:'Agent loop step'});
  RD.seg($('tl-lp-mode'),m=>{mode=m;FR=frames(run(m));an.reset(FR.length);an.play()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tl-loop']=window.TAB_RENDER['t-tl-loop']||[]).push(()=>an.redraw());
})();
