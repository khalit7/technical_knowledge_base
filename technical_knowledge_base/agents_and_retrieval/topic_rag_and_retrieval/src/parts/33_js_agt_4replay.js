// ---- Agentic lab: replay of real trajectories, same question under the pipeline, the agent loop and decomposition ----
(function(){
  const P=window.AGT,R=P.D&&P.D.replay,$=P.$,esc=P.esc;
  if(!R){return}
  let qi=0,mode='react',model=R.models[0],an=null;
  const MODES={single_k5:'Single shot, top 5',react:'Agent loop',decomp:'Decompose, then retrieve'};
  const sel=$('agt-rp-q');
  sel.innerHTML=R.items.map((it,i)=>'<option value="'+i+'">'+esc(it.label)+'</option>').join('');
  sel.addEventListener('change',()=>{qi=+sel.value;rebuild()});
  const cur=()=>R.items[qi].runs[model]&&R.items[qi].runs[model][mode];
  function evHtml(e,it){
    const G=new Set(it.gold_pids);
    const list=p=>'<ul>'+p.map(x=>'<li class="'+(G.has(x)?'g':'')+'">'+esc(R.titles[x]||x)+(G.has(x)?' (gold)':'')+'<span class="agt-small"> '+esc(R.snip[x]||'')+'</span></li>').join('')+'</ul>';
    switch(e.k){
      case 'think':return '<div class="k">Thought</div>'+esc(e.t);
      case 'decomp':return '<div class="k">Plan: two sub-questions</div>'+e.subs.map((s,i)=>'<div class="q">'+(i+1)+'. '+esc(s)+'</div>').join('');
      case 'search':return '<div class="k">Search</div><div class="q">'+esc(e.q)+'</div>';
      case 'obs':return '<div class="k">Results ('+e.p.length+' paragraphs)</div>'+list(e.p);
      case 'sub':return '<div class="k">Sub-answer</div>'+esc(e.t);
      case 'answer':return '<div class="k">Final answer</div><b>'+esc(e.t)+'</b>';
      case 'noaction':return '<div class="k">No valid action</div>'+esc(e.t);
    }return ''}
  const CLS={think:'th',decomp:'th',search:'se',obs:'ob',sub:'an',answer:'an',noaction:'an'};
  function draw(i){
    const it=R.items[qi],r=cur();const box=$('agt-rp-trace');
    if(!r){box.innerHTML='<p class="agt-small">No run recorded for this combination.</p>';return}
    box.innerHTML=r.events.map((e,j)=>'<div class="agt-ev '+CLS[e.k]+(j>i?' agt-fut':'')+(j===i?' agt-cur':'')+'">'+evHtml(e,it)+'</div>').join('');
    const e=r.events[i];
    const callsDone=r.calls.filter((c,j)=>j<=(maxCall(r,i)));
    const billed=callsDone.reduce((a,c)=>a+c.n_in,0),newp=callsDone.reduce((a,c)=>a+(c.n_in_new||0),0),out=callsDone.reduce((a,c)=>a+c.n_out,0);
    const secs=callsDone.reduce((a,c)=>a+c.seconds,0);
    const nsearch=r.events.slice(0,i+1).filter(x=>x.k==='search').length;
    const seen=new Set();r.events.slice(0,i+1).forEach(x=>{if(x.k==='obs')x.p.forEach(p=>seen.add(p))});
    const gseen=it.gold_pids.filter(p=>seen.has(p)).length;
    $('agt-rp-cnt').innerHTML=[['Generator calls',callsDone.length+' of '+r.calls.length],['Searches',nsearch],['Gold paragraphs seen',gseen+' of '+it.gold_pids.length],
      ['Input tokens billed',P.n0(billed)],['Of which prefilled',P.n0(newp)],['Seconds (generator)',secs.toFixed(1)]]
      .map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v">'+a[1]+'</div></div>').join('');
    // token bars: one per call, height = prompt tokens billed, darker part = newly prefilled
    const mx=Math.max(...R.items.map(x=>Math.max(0,...Object.values(x.runs).flatMap(m=>Object.values(m)).flatMap(z=>z.calls.map(c=>c.n_in)))));
    $('agt-rp-tk').innerHTML=r.calls.map((c,j)=>{const on=j<=maxCall(r,i);const h=Math.max(3,Math.round(66*c.n_in/mx));const hn=Math.round(h*(c.n_in_new||0)/c.n_in);
      return '<span title="call '+(j+1)+': '+c.n_in+' prompt tokens, '+(c.n_in_new||0)+' prefilled" style="height:'+(on?h:2)+'px;background:linear-gradient(to top,var(--c4) '+(on?hn:0)+'px,color-mix(in srgb,var(--c4) 35%,transparent) '+(on?hn:0)+'px)"></span>'}).join('')+
      '<span style="flex:'+Math.max(0,6-r.calls.length)+' 1 0;background:none"></span>';
    $('agt-rp-cap').innerHTML=cap(r,e,i,it);
  }
  function maxCall(r,i){let m=-1;r.events.slice(0,i+1).forEach(e=>{if(e.c!=null)m=Math.max(m,e.c)});return m}
  function cap(r,e,i,it){
    const last=i===r.events.length-1;
    const verdict=last?(' Gold answer: <b>'+esc(it.gold)+'</b>. '+(r.em?'<span class="agt-ok">Exact match.</span>':r.f1>0?'<span class="agt-bad">Partial (F1 '+r.f1.toFixed(2)+').</span>':'<span class="agt-bad">Wrong.</span>')):'';
    const c=e.c!=null?r.calls[e.c]:null;
    const tk=c?' This call: '+P.n0(c.n_in)+' prompt tokens (an API bills all of them; with the prompt cache only '+P.n0(c.n_in_new||0)+' were computed), '+c.n_out+' generated, '+c.seconds.toFixed(1)+' s.':'';
    switch(e.k){
      case 'think':return 'The model writes what it still needs before acting.'+tk+verdict;
      case 'decomp':return 'One call splits the question into two simpler ones; "#1" stands for the first answer.'+tk;
      case 'search':return mode==='single_k5'?'The pipeline searches once, with the question as typed. No model call yet.':'The search tool embeds this query and returns the 3 nearest paragraphs the agent has not seen yet (search time is milliseconds).';
      case 'obs':return 'Gold paragraphs are marked. '+(mode==='single_k5'?'All 5 go into one prompt.':'They are appended to the conversation, so every later call re-reads them.');
      case 'sub':return 'The model answers the sub-question from its 3 paragraphs; the answer is substituted into the next sub-question.'+tk;
      case 'answer':return 'The final answer.'+tk+verdict;
      case 'noaction':return 'The model wrote no parseable action; its text is taken as the answer.'+tk+verdict;
    }return ''}
  function rebuild(){const r=cur();const n=r?r.events.length:1;if(an)an.reset(n);an&&an.go(0);
    const it=R.items[qi];$('agt-rp-qtext').innerHTML='<b>'+esc(it.question)+'</b> <span class="agt-small">('+it.type+' question; gold paragraphs: '+it.gold_pids.map(p=>esc(R.titles[p])).join(' and ')+')</span>';
    const sum=Object.keys(MODES).map(m=>{const x=it.runs[model]&&it.runs[model][m];return x?'<tr><td>'+MODES[m]+'</td><td>'+esc(x.answer||'(none)')+'</td><td class="num">'+x.f1.toFixed(2)+'</td><td class="num">'+x.calls.length+'</td><td class="num">'+P.n0(x.calls.reduce((a,c)=>a+c.n_in+c.n_out,0))+'</td></tr>':''}).join('');
    $('agt-rp-sum').innerHTML='<div class="tw"><table><thead><tr><th>Same question, Qwen3-'+model.toUpperCase()+'</th><th>answer</th><th class="num">F1</th><th class="num">calls</th><th class="num">tokens</th></tr></thead><tbody>'+sum+'</tbody></table></div>';
  }
  an=P.anim({card:'agt-rp-card',ctl:'agt-rp-ctl',n:(cur()||{events:[1]}).events.length,draw,ms:2200,label:'Trajectory step'});
  P.seg($('agt-rp-mode'),v=>{mode=v;rebuild()});
  if(R.models.length>1)P.seg($('agt-rp-model'),v=>{model=v;rebuild()});else{const m=$('agt-rp-model');if(m)m.hidden=true}
  rebuild();
})();
