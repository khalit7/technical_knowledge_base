// ---- Reading, sections 3 and 4: parallel-call bars, the streamed run on a time axis, the interrupt ----
(function(){
  const H=window.HB; if(!H)return; const esc=RD.esc;
  // parallel bars: stacked share of replies with 1, 2, 3+ calls
  const pb=document.getElementById('hb-par-bars');
  if(pb&&H.par){
    const col=['var(--c1)','var(--c2)','var(--c4)'];
    pb.innerHTML=H.par.rows.map(r=>{const n=r[1]+r[2]+r[3];
      return '<div class="row"><span>'+esc(r[0])+'</span><span class="tr">'+[1,2,3].map((k,i)=>{const left=[1,2,3].slice(0,i).reduce((s,j)=>s+r[j],0)/n*100;
        return '<span class="f" style="left:'+left+'%;width:'+(r[k]/n*100)+'%;background:'+col[i]+'" title="'+r[k]+' replies with '+(k===3?'3 or more':k)+' calls"></span>'}).join('')+
        '</span><span class="v">'+(r[2]+r[3])+' of '+n+'</span></div>'}).join('')+
      '<div class="small mute" style="margin-top:4px"><span style="color:var(--c1)">&#9632;</span> one call &nbsp; <span style="color:var(--c2)">&#9632;</span> two &nbsp; <span style="color:var(--c4)">&#9632;</span> three or more; the number is replies with several calls</div>';
  }
  // the streamed run
  const host=document.getElementById('hb-strm-svg');
  function drawStream(){
    if(!host||!H.cc||!H.cc.stream)return;
    const C=H.cc.stream, w=RD.width(host), L=Math.min(150,w*0.3), R=10, top=18, rowH=30;
    const tmax=Math.max(...C.map(c=>Math.max(c.end||0,...c.blocks.map(b=>b.result||0))))+500;
    const x=t=>L+(w-L-R)*t/tmax;
    let g='';
    for(let s=0;s<=tmax;s+=5000){g+='<line x1="'+x(s)+'" x2="'+x(s)+'" y1="'+(top-6)+'" y2="'+(top+C.length*rowH)+'" stroke="var(--line)"/>'+RD.t(x(s),top-8,(s/1000)+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    C.forEach((c,i)=>{const y=top+i*rowH+6;
      const label=c.blocks.filter(b=>b.kind==='tool_use').map(b=>b.name).join(', ')||'final answer';
      g+=RD.t(4,y+12,'call '+(i+1)+': '+esc(label),{fs:11});
      g+='<rect x="'+x(c.start)+'" y="'+y+'" width="'+Math.max(2,x(c.end)-x(c.start))+'" height="16" rx="3" fill="var(--acc2)" stroke="var(--acc)"/>';
      const tb=c.blocks.filter(b=>b.kind==='tool_use');
      tb.forEach((b,j)=>{g+='<rect x="'+x(b.start)+'" y="'+(y+3)+'" width="'+Math.max(2,x(b.stop)-x(b.start)-(j<tb.length-1?1.5:0))+'" height="10" rx="2" fill="'+(j%2?'var(--c4)':'var(--c1)')+'"><title>'+esc(b.name)+' arguments streaming: '+b.deltas+' input_json_delta events</title></rect>'});
      tb.forEach(b=>{
        if(b.result)g+='<circle cx="'+x(b.result)+'" cy="'+(y+8)+'" r="4.5" fill="var(--c3)" stroke="var(--bg)"><title>result of '+esc(b.name)+' at '+(b.result/1000).toFixed(2)+' s</title></circle>';
      });
    });
    host.innerHTML=RD.svg(w,top+C.length*rowH+6,g,'Timeline of a streamed Claude Code run');
    const two=C.find(c=>c.blocks.filter(b=>b.kind==='tool_use').length>1);
    const note=document.getElementById('hb-strm-note');
    if(two&&note){const b=two.blocks.filter(b=>b.kind==='tool_use');
      note.innerHTML='<p class="small"><b>Read the fourth row.</b> The model asked for two <code>Edit</code>s in one reply. The first Edit\'s arguments finished streaming at '+(b[0].stop/1000).toFixed(2)+' s and its result came back at '+(b[0].result/1000).toFixed(2)+' s, while the second Edit was still streaming (until '+(b[1].stop/1000).toFixed(2)+' s). Claude Code ran the first call '+((b[1].stop-b[0].result)/1000).toFixed(2)+' s before the reply was complete. The whole run: '+H.cc.stream_result.num_turns+' turns, '+(H.cc.stream_result.duration_ms/1000).toFixed(1)+' s, $'+H.cc.stream_result.total_cost_usd.toFixed(4)+' at list prices; '+C.reduce((s,c)=>s+c.blocks.reduce((t,b)=>t+b.deltas,0),0)+' argument deltas in all.</p>'}
  }
  if(host){RD.onRender(drawStream);RD.onResize(drawStream);drawStream()}
  // the interrupt
  const ib=document.getElementById('hb-intr-body');
  if(ib&&H.cc&&H.cc.interrupt){
    const rows=H.cc.interrupt, task=rows.filter(r=>r.phase==='task'), fol=rows.filter(r=>r.phase==='follow');
    const show=r=>{const m=r.msg;
      if(r.class==='HarnessEvent')return '<tr><td class="num">'+r.t.toFixed(2)+' s</td><td><b>our script</b></td><td><code>client.interrupt()</code></td></tr>';
      if(r.class==='ResultMessage')return '<tr><td class="num">'+r.t.toFixed(2)+' s</td><td>result</td><td><code>subtype: "'+esc(m.subtype)+'"</code>, <code>is_error: '+m.is_error+'</code>, '+m.num_turns+' turns</td></tr>';
      const c=(m.content||[])[0]||{}; let what='';
      if(c.thinking!==undefined)what='(thinking)';else if(c.name)what='tool call <code>'+esc(c.name)+'</code> '+esc(JSON.stringify(c.input));
      else if(c.tool_use_id)what='tool result for that call, <code>is_error: '+c.is_error+'</code>: "'+esc(String(c.content))+'"';
      else if(c.text!==undefined)what='"'+esc(c.text)+'"';
      return '<tr><td class="num">'+r.t.toFixed(2)+' s</td><td>'+(r.class==='UserMessage'?'written by Claude Code':'model')+'</td><td>'+what+'</td></tr>'};
    ib.innerHTML='<div class="tw"><table><thead><tr><th class="num">Time</th><th>From</th><th>What</th></tr></thead><tbody>'+task.map(show).join('')+'</tbody></table></div>';
    const ans=fol.find(r=>r.class==='AssistantMessage'&&(r.msg.content||[]).some(c=>c.text));
    const a=document.getElementById('hb-intr-ans');
    if(a&&ans)a.innerHTML='"'+esc(ans.msg.content.find(c=>c.text).text)+'" The harness-written result is what lets the model know; without it the API would reject the next request, and with a vaguer one the model could assume the command ran.';
  }
})();
// ---- section 5: error-message experiment bars ----
(function(){
  const H=window.HB, el=document.getElementById('hb-aci-bars'); if(!H||!H.aci||!el)return; const esc=RD.esc;
  const rows=H.aci.haiku_nothink||[]; if(!rows.length)return;
  const n=rows.length, lv=[['terse','"Edit failed."','var(--c2)'],['native','the applier\'s own message','var(--c5)'],['instructive','our diagnosis','var(--c3)']];
  el.innerHTML=lv.map(([k,lab,c])=>{const v=rows.filter(r=>r[k]).length;
    return '<div class="row"><span>'+esc(k)+' <span class="mute small">('+lab+')</span></span><span class="tr"><span class="f" style="width:'+(v/n*100)+'%;background:'+c+'"></span></span><span class="v">'+v+' of '+n+'</span></div>'}).join('');
  const ex=rows.find(r=>r.instructive&&!r.native&&r.format==='udiff');
  const note=document.getElementById('hb-aci-note');
  if(ex&&note)note.innerHTML='<details class="drill"><summary><b>One case, three messages</b> ('+esc(ex.task)+', unified diff): only the instructive one led to a patch that applied.</summary><div><p><b>native:</b> <code>'+esc(ex.native_msg)+'</code></p><p><b>instructive:</b></p><pre class="hb-code">'+esc(ex.instructive_msg)+'</pre></div></details>';
})();
// ---- section 6: correct at the first attempt, per format and model ----
(function(){
  const H=window.HB,B=H&&H.bench,el=document.getElementById('hb-ef-bars'); if(!B||!el)return; const esc=RD.esc;
  const F=['exact','sr','udiff','whole','patch'],FN={exact:'Exact replace',sr:'SEARCH/REPLACE',udiff:'Unified diff (git apply)',whole:'Whole file',patch:'apply_patch'};
  const col=['var(--c1)','var(--c6)','var(--c4)','var(--c3)'];
  const ms=B.models.filter(m=>B.runs[m.id]);
  const SH=m=>m.backend==='local'?'Qwen3 4B, local':(m.label.includes('Sonnet')?'Sonnet':'Haiku')+(m.label.includes('thinking on')?', thinking':'');
  el.innerHTML=F.map(f=>'<div style="font-weight:600;font-size:13px;margin:8px 0 2px">'+FN[f]+'</div>'+ms.map((m,i)=>{let c=0,n=0;B.tasks.forEach(t=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;n++;if(a[0].res[B.primary[f]][1])c++});
    return '<div class="row"><span>'+esc(SH(m))+'</span><span class="tr"><span class="f" style="width:'+(n?c/n*100:0)+'%;background:'+col[i]+'"></span></span><span class="v">'+c+' of '+n+'</span></div>'}).join('')).join('');
  document.getElementById('hb-ef-cap').innerHTML='Correct at the first attempt, by format; bars per model, top to bottom: '+ms.map((m,i)=>'<span style="color:'+col[i]+'">&#9632;</span> '+esc(m.label)).join('; ')+'. Some models ran a subset of the edits (n shown). <span class="meas">MEASURED</span>';
})();
// ---- section 7: what one retry recovered, per model ----
(function(){
  const H=window.HB,B=H&&H.bench,el=document.getElementById('hb-rec-bars'); if(!B||!el)return; const esc=RD.esc;
  const F=['exact','sr','udiff','whole','patch'];
  const ms=B.models.filter(m=>B.runs[m.id]);
  el.innerHTML=ms.map(m=>{let ref=0,rec=0;B.tasks.forEach(t=>F.forEach(f=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;const r1=a[0].res[B.primary[f]];if(!r1[0]){ref++;if(a[a.length-1].res[B.primary[f]][1])rec++}}));
    return '<div class="row"><span>'+esc(m.label.split(',')[0])+(m.label.includes('thinking on')?' (thinking)':'')+'</span><span class="tr"><span class="f" style="width:'+(ref?rec/ref*100:0)+'%;background:var(--c3)"></span></span><span class="v">'+rec+' of '+ref+'</span></div>'}).join('');
  document.getElementById('hb-rec-cap').innerHTML='Edits refused by the applier at the first attempt that were correct after the applier\'s own error was sent back once, per model, all formats together <span class="meas">MEASURED</span>.';
})();
// ---- section 8: stop-lab numbers, computed from the runs ----
(function(){
  const H=window.HB,R=H&&H.stop,el=document.getElementById('hb-stop-stats'); if(!R||!el)return;
  const pass=R.filter(r=>r.passed).length;
  const early=R.filter(r=>!r.passed&&r.turns.length&&!r.turns[r.turns.length-1].calls.length).length;
  const by=rule=>R.filter(r=>r.rule===rule&&r.temp>0);
  el.innerHTML=RD.stat('runs','16'.replace('16',String(R.length)),'local model, three rules')+RD.stat('passing at the end',pass+' of '+R.length,'')+
    ['naive','careful','verify'].map(k=>RD.stat(k+' rule',by(k).filter(r=>r.passed).length+' of '+by(k).length+' pass','temperature 0.7, seeds 1 to 5')).join('');
  const cap=5, res=R.map(r=>{let c=Math.min(cap,r.turns.length);return r.turns[c-1]?r.turns[c-1].pass:0});
  const d=document.getElementById('hb-stop-drill');
  const lost=R.filter((r,i)=>r.passed&&!res[i]).map(r=>r.id);
  if(d)d.innerHTML=res.filter(Boolean).length+' of '+R.length+' (against '+pass+' with no cap). The passing runs had fixed both bugs by turn 4 or 5 and ended within a turn or two, so a cap of 5 loses only '+(lost.length?lost.join(', ')+', the run that needed the verifier\'s extra turns':'nothing')+'. Caps lose exactly the runs that were still making progress, which is why a cap should be generous and the verifier strict, not the other way round. Try other values in the Stop lab.';
})();
// ---- section 2: the action boundary (HB.boundary) ----
(function(){
  const H=window.HB,X=H&&H.boundary,el=document.getElementById('hb-bnd-bars'); if(!X||!el)return; const esc=RD.esc;
  const rows=[['turn1|nostop','Text protocol, turn 1, no stop sequence'],['turn1|stop','Text protocol, turn 1, stop sequence'],['turn2|nostop','Text protocol, turn 2, no stop sequence'],['turn2|stop','Text protocol, turn 2, stop sequence']];
  const B=X.B, nb=B.length, nu=B.filter(b=>b.user).length, nc=B.filter(b=>b.user&&b.call).length, nr=B.filter(b=>b.resp).length;
  el.innerHTML=rows.filter(r=>X.A[r[0]]).map(([k,lab])=>{const a=X.A[k];
    return '<div class="row"><span>'+esc(lab)+'</span><span class="tr"><span class="f" style="width:'+(a.past/a.n*100)+'%;background:var(--bad)"></span></span><span class="v">'+a.past+' of '+a.n+'</span></div>'}).join('')+
    (nb?'<div class="row"><span>Native template, continued past &lt;|im_end|&gt;</span><span class="tr"><span class="f" style="width:'+(nu/nb*100)+'%;background:var(--bad)"></span></span><span class="v">'+nu+' of '+nb+'</span></div>':'');
  const tot=Object.values(X.A).reduce((s,a)=>s+a.n,0), past=Object.values(X.A).reduce((s,a)=>s+a.past,0);
  document.getElementById('hb-bnd-note').innerHTML='<p class="small">Red: samples in which the model kept writing after its action <span class="meas">MEASURED</span>. In the chat endpoint the local model ended its turn right after the <code>ACTION</code> line in '+(tot-past)+' of '+tot+' samples, with or without a stop sequence: its own end-of-turn token did the work. When the same model was let past that token, it wrote the next turn itself in '+nu+' of '+nb+' samples'+(()=>{const st={};B.forEach(b=>{const k=b.state;st[k]=st[k]||[0,0,{}];st[k][0]++;st[k][1]+=b.user;const e=b.raw.trim().slice(0,13);st[k][2][e]=(st[k][2][e]||0)+1});
    return ' ('+Object.entries(st).map(([k,v])=>esc(k)+': '+v[1]+' of '+v[0]).join('; ')+'). Every user turn it wrote came after its first call; after the later calls it ended at once with an end-of-text or an empty turn. Two of the planned 20 samples were lost when the shared server crashed.'})()+'</p>';
  const ex=X.example;
  document.getElementById('hb-bnd-warn').innerHTML=nb?('It did not invent a tool result'+(nr?' (only '+nr+' of '+nb+' contained a <code>&lt;tool_response&gt;</code>)':'')+'. It wrote a <i>user</i> turn: '+nu+' of '+nb+' continuations opened with <code>&lt;|im_start|&gt;user</code>, usually restating the task, and '+nc+' of them then asked for tool calls inside that user turn, which the server parsed as real <code>tool_calls</code>. The section 1 animation replays one ("Boundary ignored").'+(ex?'<pre class="hb-code">'+esc(ex.text)+'</pre>':'')):'';
})();
