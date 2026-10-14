// ---- Pipeline lab: BM25 vs dense vs hybrid, fusion sweeps, RRF calculator ----
(function(){
  const P=window.PIP,F=P.D.fusion,FT=P.D.fusion_tuned,$=P.$,esc=P.esc;
  if(!F)return;
  const MOD=[['minilm-l6','MiniLM-L6'],['bge-small','bge-small'],['gte-modernbert','gte-modernbert'],['qwen3-emb-0.6b','Qwen3-Emb-0.6B'],['colbert-small','ColBERT-small']];
  const MN=Object.fromEntries(MOD);
  let ds='scifact',model='qwen3-emb-0.6b',metric='ndcg10';
  $('pip-hy-model').innerHTML=MOD.map(m=>'<button data-v="'+m[0]+'"'+(m[0]===model?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+m[1]+'</button>').join('');
  const MET={ndcg10:'nDCG@10',r10:'recall@10',r100:'recall@100'};
  function draw(){
    const R=F[ds],T=FT&&FT[ds]&&FT[ds].models[model];
    const rows=[{name:'BM25 alone',v:R.single.bm25[metric],color:'var(--c5)'},{name:MN[model]+' alone',v:R.single[model][metric],color:'var(--c1)'},
      {name:'Hybrid, RRF k 60',v:R.rrf[model]['60'][metric],color:'var(--c3)',hl:true}];
    if(T)rows.push({name:'Hybrid, z-score, alpha '+T.zscore.best_on_tune+' (tuned on '+FT[ds].tune_split+')',v:T.zscore['test_'+metric.replace('ndcg10','ndcg10')]!=null?T.zscore['test_'+metric]:null,color:'var(--c4)'});
    const best=Object.entries(R.zscore[model]).reduce((a,b)=>b[1][metric]>a[1][metric]?b:a);
    rows.push({name:'z-score, best alpha on test ('+best[0]+'): a leak',v:best[1][metric],color:'var(--dim)'});
    const mx=Math.max(...rows.map(r=>r.v||0))*1.08;
    P.bars($('pip-hy-bars'),rows.filter(r=>r.v!=null),mx);
    const W=R.wins[model];
    $('pip-hy-wins').innerHTML='Per query (nDCG@10, RRF k 60 against '+esc(MN[model])+' alone): better on <b>'+W.vs_dense_up+'</b>, worse on <b>'+W.vs_dense_down+'</b>, equal on '+(R.n_queries-W.vs_dense_up-W.vs_dense_down)+' of '+R.n_queries+'. The two top-10 lists share '+R.overlap[model].toFixed(1)+' documents on average.';
    // k sweep
    const ks=Object.keys(R.rrf[model]);
    P.lines({el:$('pip-hy-k'),xs:ks,series:[{name:'RRF, '+MN[model]+' + BM25',color:'var(--c3)',ys:ks.map(k=>R.rrf[model][k][metric])},
      {name:MN[model]+' alone',color:'var(--c1)',ys:ks.map(()=>R.single[model][metric]),dash:1},{name:'BM25 alone',color:'var(--c5)',ys:ks.map(()=>R.single.bm25[metric]),dash:1}],
      ymin:yr(ks.map(k=>R.rrf[model][k][metric]).concat([R.single[model][metric],R.single.bm25[metric]]))[0],ymax:yr(ks.map(k=>R.rrf[model][k][metric]).concat([R.single[model][metric],R.single.bm25[metric]]))[1],
      xlab:'RRF constant k',mark:ks.indexOf('60'),label:'RRF k sweep',h:200});
    const al=Object.keys(R.minmax[model]);
    P.lines({el:$('pip-hy-a'),xs:al,series:[{name:'min-max',color:'var(--c2)',ys:al.map(a=>R.minmax[model][a][metric])},{name:'z-score',color:'var(--c4)',ys:al.map(a=>R.zscore[model][a][metric])},
      {name:'RRF k 60',color:'var(--c3)',ys:al.map(()=>R.rrf[model]['60'][metric]),dash:1}],
      ymin:yr(al.map(a=>R.minmax[model][a][metric]).concat(al.map(a=>R.zscore[model][a][metric])))[0],ymax:yr(al.map(a=>R.minmax[model][a][metric]).concat(al.map(a=>R.zscore[model][a][metric])))[1],
      xlab:'alpha, the dense weight (0 = BM25, 1 = dense)',label:'score fusion alpha sweep',h:200});
  }
  function yr(v){const lo=Math.min(...v),hi=Math.max(...v),pad=(hi-lo)*.15||.01;return [Math.max(0,lo-pad),Math.min(1,hi+pad)]}
  P.seg($('pip-hy-ds'),v=>{ds=v;draw()});P.seg($('pip-hy-model'),v=>{model=v;draw()});P.seg($('pip-hy-met'),v=>{metric=v;draw()});
  P.onRender(draw);
  // tuned table
  if(FT){$('pip-hy-tuned').innerHTML='<thead><tr><th>Set</th><th>Dense model</th><th class="num">dense alone</th><th class="num">RRF k 60</th><th class="num">RRF, k tuned</th><th class="num">min-max, tuned</th><th class="num">z-score, tuned</th></tr></thead><tbody>'+
    ['scifact','nfcorpus'].map(d=>['minilm-l6','bge-small','gte-modernbert','qwen3-emb-0.6b'].map(m=>{const T=FT[d].models[m],R=F[d];
      return '<tr><td>'+(d==='scifact'?'SciFact':'NFCorpus')+'</td><td>'+MN[m]+'</td><td class="num">'+P.f3(R.single[m].ndcg10)+'</td><td class="num">'+P.f3(R.rrf[m]['60'].ndcg10)+'</td><td class="num">'+P.f3(T.rrf.test_ndcg10)+' <span class="mute">(k '+T.rrf.best_on_tune+')</span></td><td class="num">'+P.f3(T.minmax.test_ndcg10)+' <span class="mute">('+T.minmax.best_on_tune+')</span></td><td class="num">'+P.f3(T.zscore.test_ndcg10)+' <span class="mute">('+T.zscore.best_on_tune+')</span></td></tr>'}).join('')).join('')+'</tbody>'}
  // ---- RRF calculator
  const RC=P.D.rrf_calc;if(!RC)return;
  let qi=0,kk=60;const KV=[1,2,5,10,20,40,60,100,200,500,1000];
  $('pip-rrf-q').innerHTML=RC.queries.map((q,i)=>'<option value="'+i+'">'+esc(q.claim)+'</option>').join('');
  function calc(){
    const q=RC.queries[qi],rel=new Set(q.rel),rb={},rd={};q.bm25.forEach((d,i)=>rb[d]=i+1);q.dense.forEach((d,i)=>rd[d]=i+1);
    const docs=[...new Set(q.bm25.concat(q.dense))];
    const sc=d=>(rb[d]?1/(kk+rb[d]):0)+(rd[d]?1/(kk+rd[d]):0);
    const fused=docs.sort((a,b)=>sc(b)-sc(a));
    const rk=(l,f)=>{for(let i=0;i<l.length;i++)if(rel.has(l[i]))return i+1;return null};
    $('pip-rrf-kv').textContent=kk;
    const g=fused.find(d=>rel.has(d));
    const term=(r)=>r?'1/('+kk+' + '+r+')':'0 (not in its top 30)';
    $('pip-rrf-fx').innerHTML=g?'Evidence abstract: score = '+term(rb[g])+' + '+term(rd[g])+' = <b>'+sc(g).toFixed(5)+'</b> &rarr; fused rank <b>'+(fused.indexOf(g)+1)+'</b> (BM25 rank '+(rb[g]||'over 30')+', dense rank '+(rd[g]||'over 30')+')':'The evidence abstract is in neither top 30.';
    $('pip-rrf-tab').innerHTML='<thead><tr><th class="num">fused</th><th>abstract</th><th class="num">BM25 rank</th><th class="num">dense rank</th><th class="num">RRF score</th></tr></thead><tbody>'+
      fused.slice(0,10).map((d,i)=>'<tr'+(rel.has(d)?' class="gold"':'')+'><td class="num">'+(i+1)+'</td><td class="t" title="'+esc(RC.titles[d])+'">'+esc(RC.titles[d])+'</td><td class="num">'+(rb[d]||'&gt;30')+'</td><td class="num">'+(rd[d]||'&gt;30')+'</td><td class="num">'+sc(d).toFixed(5)+'</td></tr>').join('')+'</tbody>';
    $('pip-rrf-sum').innerHTML='Evidence rank: BM25 <b>'+(rk(q.bm25)||'over 30')+'</b>, dense <b>'+(rk(q.dense)||'over 30')+'</b>, fused <b>'+(rk(fused)||'over 30')+'</b>.';
  }
  $('pip-rrf-q').addEventListener('change',e=>{qi=+e.target.value;calc()});
  $('pip-rrf-k').addEventListener('input',e=>{kk=KV[+e.target.value];calc()});
  calc();
})();
