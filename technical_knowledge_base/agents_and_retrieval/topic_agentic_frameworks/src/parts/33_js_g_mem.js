// ---- Production stack (t-ops): memory layers on one multi-session conversation ----
(function(){
  const D=window.OPS,U=window.OPU,esc=U.esc;if(!D||!U||!D.memory||!document.getElementById('ops-memf'))return;
  const M=D.memory,B=M.build,V=window.OPS_V=window.OPS_V||{};
  const SESS=M.sessions,QS=M.questions;
  const SYS=[['none','No memory'],['full','Full history pasted in'],['facts','Facts (Mem0-style)'],['graph','Temporal graph (Zep-style)'],['paging','Paging (Letta-style)']];
  // ---------- build animation: step 0 = before any session, steps 1..4 = after each session ----------
  function conv(i){
    document.getElementById('ops-memconv').innerHTML=SESS.map((s,k)=>'<div class="ops-conv'+(k===i-1?' cur':'')+'"'+(k>=i?' style="opacity:.45"':'')+'><b>Session '+(k+1)+', '+s.date+'</b>'+
      s.turns.filter(t=>t[0]==='user').map(t=>'<div class="u">Sam: '+esc(t[1])+'</div>').join('')+'</div>').join('');
  }
  function stores(i){
    let f='<h4>Facts</h4>',g='<h4>Temporal graph</h4>',p='<h4>Core block (always in context)</h4>';
    if(i===0){f+='<p class="small mute">empty</p>';g+='<p class="small mute">empty</p>';p+='<p class="small mute">empty</p>'}
    else{
      const fb=B.facts[i-1],ops=fb.ops||[];const upd={},add={};ops.forEach(o=>{if(o.op==='ADD')add[o.id]=1;if(o.op==='UPDATE')upd[o.id]=o.old});
      f+=Object.entries(fb.store).map(([k,v])=>'<div class="it'+(add[k]?' add':upd[k]?' upd':'')+'">'+esc(v)+(upd[k]?'<div class="d">was: '+esc(upd[k])+'</div>':'')+'</div>').join('')||'<p class="small mute">empty</p>';
      f+=ops.filter(o=>o.op==='DELETE').map(o=>'<div class="it del">'+esc(o.old)+'</div>').join('');
      f+='<p class="small mute">This session: '+['ADD','UPDATE','DELETE','NOOP'].map(k=>ops.filter(o=>o.op===k).length+' '+k).join(', ')+'</p>';
      const gb=B.graph[i-1];
      g+=gb.edges.map(e=>'<div class="it'+(e.invalid_at?' inv':(gb.added.indexOf(e.id)>=0?' add':''))+'">'+esc(e.fact)+'<div class="d">'+esc(e.subject)+' '+esc(e.relation)+' '+esc(e.object)+' &middot; valid from '+e.valid_at+(e.invalid_at?' until '+e.invalid_at:'')+'</div></div>').join('')||'<p class="small mute">empty</p>';
      const pb=B.paging[i-1];
      p+='<div class="it">'+esc(pb.core||'(empty)').replace(/\n/g,'<br>')+'</div><div class="d small mute">'+(pb.core||'').length+' of 300 characters</div>';
      if(pb.archival.length)p+='<h4 style="margin-top:6px">Archival (searched on demand)</h4>'+pb.archival.map(a=>'<div class="it">'+esc(a)+'</div>').join('');
      p+='<p class="small mute">This session the model made '+pb.actions.length+' memory tool call'+(pb.actions.length===1?'':'s')+': '+esc(pb.actions.map(a=>a.tool.replace('_memory_','.')+(a.result!=='ok'?' (failed)':'')).join(', ')||'none')+'.</p>';
    }
    document.getElementById('ops-memstores').innerHTML='<div class="ops-store">'+f+'</div><div class="ops-store">'+g+'</div><div class="ops-store">'+p+'</div>';
  }
  const caps=['Before the first session every store is empty. Step forward: the same four conversations go into all three stores.',
    'Session 1: Sam, the project, LiteLLM, the old test command, a preference for short answers.',
    'Session 2: a fallback model, and Priya wants a weekly cost report.',
    'Session 3: two facts change. The test command is now pytest; LiteLLM is replaced by OpenRouter. Watch what each store does with the old values.',
    'Session 4: Priya leaves, Dana is the manager, and the budget is capped. The cost report now belongs to someone else, which no single message says.'];
  function draw(i){conv(i);stores(i);document.getElementById('ops-memcap').innerHTML='<b>Step '+i+' of 4.</b> '+caps[i]}
  U.anim({card:'ops-memf',ctl:'ops-memc',n:5,label:'Session',draw,delay:()=>3200});
  // ---------- question matrix ----------
  let on=null;
  function mx(){
    let h='<tr><th>Question</th>'+SYS.map(s=>'<th class="c">'+s[1]+'</th>').join('')+'</tr>';
    QS.forEach((q,qi)=>{h+='<tr><td>'+esc(q.q)+'<br><span class="small mute">'+esc(q.kind)+'</span></td>'+SYS.map(([k])=>{const a=M.systems[k][qi];
      return '<td data-k="'+k+'|'+qi+'" class="'+(a.pass?'p':'f')+(on===k+'|'+qi?' on':'')+'">'+(a.pass?'&#10003;':'&#10007;')+'</td>'}).join('')+'</tr>'});
    h+='<tr><td><b>Right</b></td>'+SYS.map(([k])=>'<td class="c"><b>'+M.systems[k].filter(a=>a.pass).length+' / '+QS.length+'</b></td>').join('')+'</tr>';
    const ctx=k=>{const c=M.calls.filter(x=>x.tag===k+'.answer');return c.length?Math.round(c.reduce((a,x)=>a+x.in,0)/c.length):0};
    h+='<tr><td>Prompt tokens per answer (mean)</td>'+SYS.map(([k])=>'<td class="c">'+U.fmt(ctx(k))+'</td>').join('')+'</tr>';
    const wr=k=>{const c=M.calls.filter(x=>x.tag.startsWith(k+'.')&&!x.tag.endsWith('.answer'));return c.length?c.length+' calls, '+U.fmt(c.reduce((a,x)=>a+x.in+x.out,0))+' tokens':'none'};
    h+='<tr><td>Model work to write memory (4 sessions)</td>'+SYS.map(([k])=>'<td class="c small">'+wr(k)+'</td>').join('')+'</tr>';
    document.getElementById('ops-mx').innerHTML=h;
    const det=document.getElementById('ops-mxdet');
    if(on){const [k,qi]=on.split('|');const a=M.systems[k][+qi];
      det.innerHTML='<div class="ops-code"><b>'+esc(SYS.find(s=>s[0]===k)[1])+'</b>, asked "'+esc(QS[+qi].q)+'"\n\n'+esc(a.answer)+(a.searches&&a.searches.length?'\n\nMemory searches it made: '+esc(a.searches.map(s=>s.tool+'("'+s.query+'") found '+s.hits.length).join('; ')):(k==='paging'?'\n\nIt answered from the core block without searching.':''))+'</div>'}
    else det.innerHTML='';
  }
  document.getElementById('ops-mx').addEventListener('click',e=>{const td=e.target.closest('td[data-k]');if(!td)return;on=td.dataset.k;mx()});
  mx();
  // ---------- findings ----------
  const S=k=>M.systems[k].filter(a=>a.pass).length;
  V['mem.full']=String(S('full'));
  const callsOf=k=>M.calls.filter(x=>x.tag.startsWith(k+'.')&&!x.tag.endsWith('.answer'));
  const ctxTok=k=>{const c=M.calls.filter(x=>x.tag===k+'.answer');return c.length?Math.round(c.reduce((a,x)=>a+x.in,0)/c.length):0};
  const fx=M.calls.filter(x=>x.tag==='facts.extract');
  const lost=B.facts.map((s,i)=>({i,s})).filter(o=>!o.s.extracted.length);
  const lostRaw=lost.length?fx[lost[0].i].raw:'';
  const ge=B.graph[B.graph.length-1].edges,inv=ge.filter(e=>e.invalid_at);
  const wrong=['e4','e8','e9'].filter(id=>ge.some(e=>e.id===id&&e.invalid_at));
  const pa=M.systems.paging,pq=QS.findIndex(q=>q.id==='q_old_tests');
  const fa=M.systems.facts,fq=QS.findIndex(q=>q.id==='q_tests'),fg=QS.findIndex(q=>q.id==='q_gateway_before');
  document.getElementById('ops-memfind').innerHTML='<h3>What happened, store by store</h3><ul>'+
    '<li><b>No memory: '+S('none')+' of 5</b>, and that one is the keyword grader being fooled: with nothing to go on, the model listed "<code>pytest</code> or <code>npm test</code>", which contains the right word. Read the answers, not only the ticks.</li>'+
    '<li><b>Full history: '+S('full')+' of 5</b>, at '+U.fmt(ctxTok('full'))+' prompt tokens per answer against '+U.fmt(ctxTok('graph'))+' for the graph and '+U.fmt(ctxTok('facts'))+' for the facts. Four short sessions fit easily; this is the baseline a memory layer must beat once history stops fitting, and the reason not to add one before it does.</li>'+
    '<li><b>Facts: '+S('facts')+' of 5.</b> In session '+(lost.length?lost[0].i+1:'?')+' the extraction call answered with a bulleted list instead of JSON ("'+esc(lostRaw.slice(0,110))+'..."), the parser found no facts, and the change of test command and gateway was <i>silently lost</i>. So the store still said <code>tests/test_core.py</code> and LiteLLM; asked how to run the tests it answered "'+esc(fa[fq].answer.slice(0,60))+'", and asked about the gateway it invented one: "'+esc(fa[fg].answer.slice(0,70))+'...". It answered the past test command correctly only because the update never happened. Production memory layers ask for structured output (JSON mode or a tool call) for exactly this reason, and should log every write.</li>'+
    '<li><b>Temporal graph: '+S('graph')+' of 5</b>, the only layer to answer both "what is it now" and "what was it before, and when did it change", because invalidated edges keep their dates. Its invalidation step still made mistakes: of '+inv.length+' edges it closed, '+wrong.length+' were still true by our reading (the Qwen fallback, and both OpenRouter edges, closed when Priya left). The answers survived because the model reasons over dates, but the graph is only as good as the model that edits it.</li>'+
    '<li><b>Paging: '+S('paging')+' of 5.</b> The model kept a tidy core block, rewriting it with <code>core_memory_replace</code> each session, so current facts were always in view at no retrieval cost. Asked for the test command at the start of September it answered from the core block ("'+esc(pa[pq].answer.slice(0,70))+'") without searching the conversation log it had a tool for: replacing a line forgets the old value, and the model did not know what it did not know.</li>'+
    '<li><b>Writing memory costs model calls:</b> facts '+callsOf('facts').length+', graph '+callsOf('graph').length+', paging '+callsOf('paging').length+' calls for four sessions, paid after every conversation whether or not the memory is ever read.</li></ul>';
})();
