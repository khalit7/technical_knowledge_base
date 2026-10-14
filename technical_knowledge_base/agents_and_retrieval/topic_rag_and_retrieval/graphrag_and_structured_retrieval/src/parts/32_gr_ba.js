// ---- Before/after lab (t-grba) ----
(function(){
  const D=window.GR,B=D.ba,E=GRL.esc,$=id=>document.getElementById(id);
  if(!$('ba-card'))return;
  const NAME={dense:'dense top 5 (bge-small)',hybrid:'hybrid RRF (BM25 + dense)',expand_title:'expand dense top 2 along title links',ppr_bipartite_pruned:'PPR, passages + phrases (HippoRAG 2 shape)'};
  const QA=D.qa&&D.qa['1.7b']?D.qa['1.7b'].examples:null;
  const si=k=>B.systems.indexOf(k);
  $('ba-a').innerHTML=B.systems.map(k=>'<option value="'+k+'"'+(k==='dense'?' selected':'')+'>'+E(NAME[k]||k)+'</option>').join('');
  $('ba-b').innerHTML=B.systems.map(k=>'<option value="'+k+'"'+(k==='expand_title'?' selected':'')+'>'+E(NAME[k]||k)+'</option>').join('');
  let a='dense',b='expand_title',list=[],cur=0;
  const both=(r,k)=>r.g.every(g=>r.top[si(k)].includes(g));
  function filt(){const f=$('ba-f').value;
    list=B.rows.map((r,i)=>i).filter(i=>{const r=B.rows[i];return f==='all'||(f==='win'&&both(r,b)&&!both(r,a))||(f==='loss'&&both(r,a)&&!both(r,b))||(f===r.t)});
    $('ba-q').innerHTML=list.length?list.map(i=>'<option value="'+i+'">'+(i+1)+'. '+E(B.rows[i].q.length>80?B.rows[i].q.slice(0,78)+'...':B.rows[i].q)+'</option>').join(''):'<option>none</option>';
    cur=list.length?list[0]:-1;
    const w=B.rows.filter(r=>both(r,b)&&!both(r,a)).length,l=B.rows.filter(r=>both(r,a)&&!both(r,b)).length;
    $('ba-note').innerHTML='Over all 200: both gold in the top 5 for '+B.rows.filter(r=>both(r,a)).length+' questions with A, '+B.rows.filter(r=>both(r,b)).length+' with B; B gains '+w+' and loses '+l+' <span class="meas">measured</span>.'+(QA?'':' Answers from each list are <span class="gr-pend">pending</span> (s_qa.py run 1.7b).');
    A.reset(7)}
  function col(el,k,r,i){const top=r.top[si(k)];
    el.innerHTML='<h4>'+E(NAME[k]||k)+'</h4>'+top.map((t,j)=>{const g=r.g.includes(t),lk=k==='expand_title'&&r.lk[t];
      return '<div class="ba-r'+(g?' gold':'')+(j>=i?' hid':'')+'"><span class="k">'+(j+1)+'</span><span>'+E(B.titles[t])+(g?' <b style="color:var(--c2)">gold</b>':'')+'</span>'+(lk&&i>=6?'<span class="ba-lk">linked from "'+E(B.titles[lk[0]])+'": '+E(lk[2])+'</span>':'')+'</div>'}).join('')+
      (QA&&QA[k]&&QA[k][r.id]&&i>=6?'<div class="ba-ans">Qwen3-1.7B answer: <b>'+E(QA[k][r.id][0])+'</b> (F1 '+QA[k][r.id][1]+')</div>':'')}
  function draw(i){if(cur<0){$('ba-qt').textContent='No question matches this filter.';$('ba-ca').innerHTML=$('ba-cb').innerHTML='';return}
    const r=B.rows[cur];
    $('ba-qt').innerHTML=E(r.q)+' <span class="small mute">('+(r.t==='b'?'bridge':'comparison')+'; answer: '+E(r.a)+'; gold: '+r.g.map(g=>E(B.titles[g])).join(' + ')+')</span>';
    col($('ba-ca'),a,r,Math.min(i,5));col($('ba-cb'),b,r,Math.min(i,5));if(i>=6){col($('ba-ca'),a,r,6);col($('ba-cb'),b,r,6)}
    const ga=r.top[si(a)].slice(0,Math.min(i,5)).filter(t=>r.g.includes(t)).length,gb=r.top[si(b)].slice(0,Math.min(i,5)).filter(t=>r.g.includes(t)).length;
    $('ba-cap').textContent=i===0?'The question. Both systems rank the same 9,760 paragraphs; nothing is generated at retrieval time.':i<=5?'Rank '+i+' of 5 on both sides.':
      (both(r,b)&&!both(r,a)?'B has both gold paragraphs and A does not: the second hop came '+(b==='expand_title'?'through a title mention.':'from the graph.'):both(r,a)&&!both(r,b)?'A has both and B does not: B traded a gold paragraph for a linked one.':both(r,a)?'Both systems have both gold paragraphs.':'Neither system has both gold paragraphs in its top 5.');
    $('ba-ctr').innerHTML='<span>gold found by A <b>'+ga+'</b> of 2</span><span>gold found by B <b>'+gb+'</b> of 2</span>'}
  const A=RD.anim({card:'ba-card',ctl:'ba-ctl',n:7,draw,ms:1200,label:'Rank'});
  $('ba-f').addEventListener('change',filt);
  $('ba-q').addEventListener('change',e=>{cur=+e.target.value;A.reset(7)});
  $('ba-a').addEventListener('change',e=>{a=e.target.value;filt()});
  $('ba-b').addEventListener('change',e=>{b=e.target.value;filt()});
  filt();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-grba']=[()=>A.redraw()];
})();
