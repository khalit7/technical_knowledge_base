// ---- Reading section 1: LangChain's Runnables from E8 (the hero is the 3D stage 41_js_sc_hero.js since 2026-11-06) ----
(function(){
  const D=window.FLG,esc=RD.esc,$=id=>document.getElementById(id);
  // section 1: one invoke through prompt | model | parser
  const E=D.e8;if(!E||!$('flg-lc-pipe'))return;
  const msgs=E.messages.map(m=>'['+m.type+'] '+m.content).join('\n');
  const st=E.chain.steps;
  $('flg-lc-pipe').innerHTML=
    '<div class="v">'+esc(JSON.stringify(E.input))+'</div>'+
    '<div class="ar">&#8595; input dict</div>'+
    '<div class="c"><b>'+esc(st[0])+'</b> fills its two message templates</div>'+
    '<div class="ar">&#8595; ChatPromptValue: the exact messages the model receives</div>'+
    '<div class="v">'+esc(msgs)+'</div>'+
    '<div class="c"><b>chat model</b> ('+esc(st[1]==='Probe'?'FakeListChatModel':st[1])+' here; ChatOpenAI, ChatAnthropic and the rest in real use)</div>'+
    '<div class="ar">&#8595; AIMessage</div>'+
    '<div class="v">AIMessage(content='+esc(JSON.stringify(E.answer))+')</div>'+
    '<div class="c"><b>'+esc(st[2])+'</b> takes <code>.content</code></div>'+
    '<div class="ar">&#8595; str: the value chain.invoke() returns</div>'+
    '<div class="v">'+esc(JSON.stringify(E.answer))+'</div>';
  const rn=E.runnables;
  $('flg-lc-rn').textContent=rn[0].methods.join(', ')+' (checked on '+rn.map(r=>r.cls==='Probe'?'the chat model':r.cls).join(', ')+'; all '+rn.filter(r=>r.is_runnable).length+' pass isinstance(x, Runnable))';
  $('flg-lc-tool').textContent=JSON.stringify(E.tool_schema,null,1);
  $('flg-lc-ret').textContent=E.retrieved.map((d,i)=>'Document '+(i+1)+' ('+d.file+'):\n'+d.text).join('\n\n');
  const o=E.overhead_us,f=E.frames;
  $('flg-lc-cost').innerHTML=RD.stat('chain.invoke()',Math.round(o.lcel_best)+' µs','per call, best of '+o.reps+' runs of '+o.calls.toLocaleString('en-US')+' calls; median '+Math.round(o.lcel_median)+' µs')+
    RD.stat('Two plain functions',o.plain_best.toFixed(2)+' µs','same messages, same answer')+
    RD.stat('Frames down to the model',f.lcel+' vs '+f.plain,esc(f.lcel_names.join(' → ')))+
    RD.stat('Share of a 1 s model call',(o.lcel_best/1e4).toFixed(3)+'%','= '+Math.round(o.lcel_best)+' µs / 1,000,000 µs');
  $('flg-lc-us').textContent='about '+Math.round(o.lcel_best-o.plain_best)+' µs';
  $('flg-lc-fr').textContent=f.lcel+' framework frames ('+f.lcel_names.join(' → ')+') where the plain version has '+f.plain;
})();
