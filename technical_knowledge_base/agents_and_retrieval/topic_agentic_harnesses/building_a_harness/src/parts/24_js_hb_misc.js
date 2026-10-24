// ---- Reading, sections 3 and 4: parallel-call bars, the streamed run on a time axis, the interrupt ----
(function(){
  const H=window.HB; if(!H)return; const esc=RD.esc;
  // parallel bars: stacked share of replies with 1, 2, 3+ calls
  const pb=document.getElementById('hb-par-bars');
  if(pb&&H.par){
    const col=['var(--c1)','var(--c2)','var(--c4)'];
    HBV.hbars(pb,H.par.rows.map(r=>({label:r[0],max:1,segs:[1,2,3].map((k,i)=>({v:r[k]/(r[1]+r[2]+r[3]),c:col[i],t:r[k]+' replies with '+(k===3?'3 or more':k)+' calls'})),right:(r[2]+r[3])+' of '+(r[1]+r[2]+r[3])})),
      {max:1,label:'Replies by number of tool calls',legend:[[col[0],'one call'],[col[1],'two'],[col[2],'three or more; the number is replies with several calls']]});
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
  }
})();
// ---- section 5: error-message experiment bars ----
(function(){
  const H=window.HB, el=document.getElementById('hb-aci-bars'); if(!H||!H.aci||!el)return; const esc=RD.esc;
  const rows=H.aci.haiku_nothink||[]; if(!rows.length)return;
  const n=rows.length, lv=[['terse','"Edit failed."','var(--c2)'],['native','the applier\'s own message','var(--c5)'],['instructive','our diagnosis','var(--c3)']];
  HBV.hbars(el,lv.map(([k,lab,c])=>{const v=rows.filter(r=>r[k]).length;return {label:k+' ('+lab+')',segs:[{v:v/n,c,t:v+' of '+n}],right:v+' of '+n}}),{max:1,label:'Failed edits repaired by one retry, by error wording'});
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
  const rows=[];F.forEach(f=>{rows.push({head:FN[f]});ms.forEach((m,i)=>{let c=0,n=0;B.tasks.forEach(t=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;n++;if(a[0].res[B.primary[f]][1])c++});
    rows.push({label:SH(m),segs:[{v:n?c/n:0,c:col[i],t:c+' of '+n}],right:c+' of '+n})})});
  HBV.hbars(el,rows,{max:1,label:'Correct at the first attempt, by format and model'});
  document.getElementById('hb-ef-cap').innerHTML='Correct at the first attempt, by format; bars per model, top to bottom: '+ms.map((m,i)=>'<span style="color:'+col[i]+'">&#9632;</span> '+esc(m.label)).join('; ')+'. Some models ran a subset of the edits (n shown). <span class="meas">MEASURED</span>';
})();
// ---- section 7: what one retry recovered, per model ----
(function(){
  const H=window.HB,B=H&&H.bench,el=document.getElementById('hb-rec-bars'); if(!B||!el)return; const esc=RD.esc;
  const F=['exact','sr','udiff','whole','patch'];
  const ms=B.models.filter(m=>B.runs[m.id]);
  HBV.hbars(el,ms.map(m=>{let ref=0,rec=0;B.tasks.forEach(t=>F.forEach(f=>{const a=(B.runs[m.id][t.id]||{})[f];if(!a)return;const r1=a[0].res[B.primary[f]];if(!r1[0]){ref++;if(a[a.length-1].res[B.primary[f]][1])rec++}}));
    return {label:m.label.split(',')[0]+(m.label.includes('thinking on')?' (thinking on)':''),segs:[{v:ref?rec/ref:0,c:'var(--c3)',t:rec+' of '+ref}],right:rec+' of '+ref}}),{max:1,label:'Refusals repaired by one retry, per model'});
})();
// ---- section 10: stop numbers, computed from the runs ----
(function(){
  const H=window.HB,R=H&&H.stop,el=document.getElementById('hb-stop-stats'); if(!R||!el)return;
  const pass=R.filter(r=>r.passed).length;
  const early=R.filter(r=>!r.passed&&r.turns.length&&!r.turns[r.turns.length-1].calls.length).length;
  const by=rule=>R.filter(r=>r.rule===rule&&r.temp>0);
  el.innerHTML=RD.stat('runs','16'.replace('16',String(R.length)),'local model, three rules')+RD.stat('passing at the end',pass+' of '+R.length,'')+
    ['naive','careful','verify'].map(k=>RD.stat(k+' rule',by(k).filter(r=>r.passed).length+' of '+by(k).length+' pass','temperature 0.7, seeds 1 to 5')).join('');
})();
// ---- section 2: the action boundary (HB.boundary) ----
(function(){
  const H=window.HB,X=H&&H.boundary,el=document.getElementById('hb-bnd-bars'); if(!X||!el)return; const esc=RD.esc;
  const rows=[['turn1|nostop','Text protocol, turn 1, no stop sequence'],['turn1|stop','Text protocol, turn 1, stop sequence'],['turn2|nostop','Text protocol, turn 2, no stop sequence'],['turn2|stop','Text protocol, turn 2, stop sequence']];
  const B=X.B, nb=B.length, nu=B.filter(b=>b.user).length, nc=B.filter(b=>b.user&&b.call).length, nr=B.filter(b=>b.resp).length;
  const br=rows.filter(r=>X.A[r[0]]).map(([k,lab])=>{const a=X.A[k];return {label:lab,segs:[{v:a.past/a.n,c:'var(--bad)',t:a.past+' of '+a.n}],right:a.past+' of '+a.n}});
  if(nb)br.push({label:'Native template, continued past <|im_end|>',segs:[{v:nu/nb,c:'var(--bad)',t:nu+' of '+nb}],right:nu+' of '+nb});
  HBV.hbars(el,br,{max:1,label:'Samples in which the model wrote past its action'});
  const tot=Object.values(X.A).reduce((s,a)=>s+a.n,0), past=Object.values(X.A).reduce((s,a)=>s+a.past,0);
  const ex=X.example;
  const ww=document.getElementById('hb-bnd-warn');if(ww&&ex)ww.innerHTML='<pre class="hb-code">'+esc(ex.text)+'</pre>';
})();
