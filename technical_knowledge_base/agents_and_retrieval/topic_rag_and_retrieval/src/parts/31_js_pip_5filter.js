// ---- Pipeline lab: filtering inside vs after the search; query rewriting ----
(function(){
  const P=window.PIP,FI=P.D.filter,$=P.$,esc=P.esc;
  if(FI){
    const GS=Object.keys(FI.groups);let gi=GS.indexOf('10');if(gi<0)gi=0;
    const sl=$('pip-fi-g');sl.max=GS.length-1;sl.value=gi;
    function draw(){
      const G=GS[gi],R=FI.groups[G],n=FI.n_queries;
      $('pip-fi-gv').textContent=(100/ +G).toFixed(+G>20?0:0)+'% of the corpus (about '+P.n0(R.allowed_docs_mean)+' abstracts)';
      const rows=[['Filter inside the search (pre-filter)',R.pre.hit10,R.pre.returned_mean,0]].concat(Object.keys(R.post).map(N=>['Search top '+N+', then filter',R.post[N].hit10,R.post[N].returned_mean,R.post[N].empty]));
      $('pip-fi-tab').innerHTML='<thead><tr><th>Where the filter runs</th><th class="num">evidence in the 10 results</th><th class="num">results returned (mean of 10 asked)</th><th class="num">queries with no result</th></tr></thead><tbody>'+
        rows.map((r,i)=>'<tr'+(i===0?' style="font-weight:600"':'')+'><td>'+r[0]+'</td><td class="num">'+r[1]+' of '+n+'</td><td class="num">'+r[2].toFixed(2)+'</td><td class="num">'+r[3]+'</td></tr>').join('')+'</tbody>';
      const xs=GS.map(g=>(100/ +g)+'%');
      P.lines({el:$('pip-fi-chart'),xs,series:[{name:'pre-filter',color:'var(--c3)',ys:GS.map(g=>FI.groups[g].pre.returned_mean)},
        {name:'post-filter, top 10 fetched',color:'var(--c2)',ys:GS.map(g=>FI.groups[g].post['10'].returned_mean)},
        {name:'top 100 fetched',color:'var(--c5)',ys:GS.map(g=>FI.groups[g].post['100'].returned_mean)},
        {name:'top 1,000 fetched',color:'var(--c4)',ys:GS.map(g=>FI.groups[g].post['1000'].returned_mean)}],
        ymin:0,ymax:10,fmt:v=>v.toFixed(0),xlab:'share of the corpus the user may see',mark:gi,label:'results returned against filter selectivity',h:200});
    }
    sl.addEventListener('input',e=>{gi=+e.target.value;draw()});P.onRender(draw);draw();
  }
  // ---- query rewriting
  const Q=P.D.qtrans;if(!Q)return;
  const MODS=[['bm25','BM25'],['bge-small','bge-small'],['qwen3-emb-0.6b','Qwen3-Emb-0.6B']].filter(m=>Q[m[0]]);
  const V=[['original','claim as written'],['hyde','HyDE passage alone'],['hyde+claim','HyDE passage + claim'],['multi-query','multi-query (4 lists, RRF)']];
  $('pip-qt-tab').innerHTML='<thead><tr><th>Retriever</th><th>Query</th><th class="num">nDCG@10</th><th class="num">recall@10</th><th class="num">recall@100</th><th class="num">better / worse (queries)</th></tr></thead><tbody>'+
    MODS.map(m=>V.filter(v=>Q[m[0]][v[0]]).map(v=>{const r=Q[m[0]][v[0]],b=Q[m[0]].original;const d=r.ndcg10-b.ndcg10;
      return '<tr><td>'+m[1]+'</td><td>'+(m[0]==='bm25'&&v[0]==='hyde+claim'?'claim + HyDE passage (text)':v[1])+'</td><td class="num">'+P.f3(r.ndcg10)+(v[0]!=='original'?' <span class="mute">('+(d>=0?'+':'')+d.toFixed(3)+')</span>':'')+'</td><td class="num">'+P.f3(r.r10)+'</td><td class="num">'+P.f3(r.r100)+'</td><td class="num">'+(r.up!=null?r.up+' / '+r.down:'')+'</td></tr>'}).join('')).join('')+'</tbody>';
  const EX=P.D.qtrans_example;
  if(EX)$('pip-qt-ex').innerHTML='<details class="mist"><summary>What the generator wrote for claim '+EX.qid+'</summary><div class="b"><p class="small"><b>Claim:</b> '+esc(EX.claim)+'</p><p class="small"><b>HyDE passage</b> (the model invents details, including wrong ones; only its vocabulary is used):</p><div class="pip-prompt">'+esc(EX.hyde)+'</div><p class="small"><b>Three rewordings:</b></p><ul class="tight">'+EX.mq.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div></details>';
  const CV=P.D.qtrans_conv;
  if(CV){$('pip-qt-conv').innerHTML='<thead><tr><th>Follow-up the user typed</th><th>Rewrite by the generator</th>'+MODS.map(m=>'<th class="num">'+m[1]+': alone / chat / rewrite / claim</th>').join('')+'</tr></thead><tbody>'+
    CV.map((c,i)=>'<tr><td>'+esc(c.turn2)+'<div class="pip-small">after: '+esc(c.turn1)+'</div></td><td>'+esc(c.rewrite)+'</td>'+MODS.map(m=>{const r=Q[m[0]].conv[i],f=x=>x==null?'&gt;100':x;return '<td class="num">'+f(r.alone)+' / '+f(r.concat)+' / '+f(r.rewrite)+' / '+f(r.claim)+'</td>'}).join('')+'</tr>').join('')+'</tbody>'}
})();
