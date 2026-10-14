// ---- Agentic lab: the router on a mixed set, and the small GraphRAG ----
(function(){
  const P=window.AGT,D=P.D,$=P.$,esc=P.esc;
  const R=D&&D.router;
  if(R&&$('agt-rt-table')){
    const names=['always pipeline','always agent','router: embed-LR','router: llm','oracle router'];
    const lab={'always pipeline':'Always the pipeline (top 5)','always agent':'Always the agent loop','router: embed-LR':'Router: logistic regression on the question vector','router: llm':'Router: Qwen3-1.7B says ONE or TWO','oracle router':'Oracle router (knows the true type)'};
    const max=Math.max(...names.map(n=>R[n].tok));
    $('agt-rt-table').innerHTML='<div class="tw"><table><thead><tr><th>Policy on '+(R.n_multi+R.n_single)+' questions ('+R.n_multi+' two-hop, '+R.n_single+' one-hop)</th><th class="num">routing accuracy</th><th class="num">sent to agent</th><th class="num">F1 all</th><th class="num">F1 two-hop</th><th class="num">F1 one-hop</th><th class="num">searches</th><th class="num">tokens</th><th class="num">s</th></tr></thead><tbody>'+
      names.map(n=>{const r=R[n];return '<tr><td>'+lab[n]+'</td><td class="num">'+(r.accuracy==null?'':P.pc(r.accuracy,0))+'</td><td class="num">'+r.to_agent+'</td><td class="num">'+r.f1.toFixed(3)+'</td><td class="num">'+r.f1_multi.toFixed(3)+'</td><td class="num">'+r.f1_single.toFixed(3)+'</td><td class="num">'+r.searches.toFixed(2)+'</td><td class="num">'+P.n0(r.tok)+'</td><td class="num">'+r.seconds.toFixed(2)+'</td></tr>'}).join('')+'</tbody></table></div>';
    P.onRender(()=>P.bars($('agt-rt-bars'),names.map((n,i)=>({name:lab[n].replace('Router: ','').replace(' (knows the true type)',''),v:R[n].tok,color:['var(--c1)','var(--c4)','var(--c6)','var(--c5)','var(--mute)'][i]})),max,v=>P.n0(v)));
  }
  const G=D&&D.graphrag;
  if(G&&$('agt-gr-cost')){
    const ix=G.index,cm=G.communities.meta,lo=G.local;
    $('agt-gr-cost').innerHTML=[['Paragraphs indexed',P.n0(ix.paragraphs)],['Their own tokens',P.n0(ix.corpus_tokens)],['Extraction tokens (in + out)',P.n0(ix.tok_in+ix.tok_out)],
      ['Extraction time',Math.round(ix.gen_seconds/60)+' min'],['Entities',P.n0(lo.entities)],['Communities summarised',cm.summarised+' (+'+P.n0(cm.tok_in+cm.tok_out)+' tokens)']]
      .map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v">'+a[1]+'</div></div>').join('');
    let k='3';
    function loc(){P.bars($('agt-gr-local'),[{name:'dense top '+k,v:lo.dense[k]/lo.n_q,color:'var(--c1)'},{name:'dense + graph hop',v:lo.graph[k]/lo.n_q,color:'var(--c6)'}],1,v=>P.pc(v,0));
      $('agt-gr-localn').textContent='Both gold paragraphs in the top '+k+': dense '+lo.dense[k]+' of '+lo.n_q+', with the graph hop '+lo.graph[k]+' of '+lo.n_q+'.'}
    P.seg($('agt-gr-k'),v=>{k=v;loc()});P.onRender(loc);
    $('agt-gr-ex').innerHTML=lo.examples.slice(0,4).map(e=>'<tr><td>'+esc(e.question)+'</td><td>'+e.dense3.map(esc).join('; ')+'</td><td>'+e.graph3.map(esc).join('; ')+'</td><td>'+e.gold.map(esc).join('; ')+'</td></tr>').join('');
    let gi=0;const gs=$('agt-gr-gq');gs.innerHTML=G.global.map((g,i)=>'<option value="'+i+'">'+esc(g.q)+'</option>').join('');
    function glob(){const g=G.global[gi];
      $('agt-gr-gans').innerHTML='<div class="agt-two"><div><div class="agt-small"><b>Community summaries, map then reduce</b>: '+g.graph.calls+' calls, '+P.n0(g.graph.tok_in+g.graph.tok_out)+' tokens, '+g.graph.seconds.toFixed(0)+' s; '+g.graph.notes_used+' summaries judged relevant</div><div class="agt-ans-box">'+esc(g.graph.answer)+'</div></div>'+
        '<div><div class="agt-small"><b>Plain retrieval, top 10 paragraphs</b>: 1 call, '+P.n0(g.naive.tok_in+g.naive.tok_out)+' tokens, '+g.naive.seconds.toFixed(0)+' s</div><div class="agt-ans-box">'+esc(g.naive.answer)+'</div></div></div>'}
    gs.addEventListener('change',()=>{gi=+gs.value;glob()});glob();
    $('agt-gr-comms').innerHTML=G.communities.list.slice(0,6).map(c=>'<tr><td class="num">'+c.size+'</td><td>'+c.top.map(esc).join(', ')+'</td><td>'+esc(c.summary)+'</td></tr>').join('');
  }
})();
