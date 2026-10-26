// ---- Reading tab, part 2: BM25 (worked example, saturation explorer, k1 x b grid, tokenisation), learned sparse, fusion
(function(){
  const $=id=>document.getElementById(id),D=RP.D,E=RP.esc,f3=RP.f3;
  // 2.1 worked example
  const X=D.bm25_example;
  if(X&&X.docs)$('rp-bmex').innerHTML='<p class="small" style="margin:4px 0"><b>Claim:</b> '+E(X.claim)+' &#8594; terms after stopwords and stemming: '+X.tokens.map(t=>'<code>'+E(t)+'</code>').join(' ')+' (N = '+RP.fmt(X.N)+' abstracts, avgdl = '+X.avgdl+' terms)</p>'+
    '<table class="rp-t"><thead><tr><th>term</th><th class="num">df</th><th class="num">idf</th>'+X.docs.map(d=>'<th class="num">'+(d.relevant?'relevant':'not relevant')+' (|D| '+d.len+'): tf &#8594; idf &middot; tfc</th>').join('')+'</tr></thead><tbody>'+
    X.tokens.map((t,i)=>{const a=X.docs[0].terms[i];return '<tr><td><code>'+E(t)+'</code></td><td class="num">'+a.df+'</td><td class="num">'+a.idf.toFixed(2)+'</td>'+X.docs.map(d=>{const z=d.terms[i];return '<td class="num">'+z.tf+' &#8594; '+z.contrib.toFixed(2)+'</td>'}).join('')+'</tr>'}).join('')+
    '<tr class="hl"><td colspan="3">score (rank in BM25\'s list)</td>'+X.docs.map(d=>'<td class="num">'+d.score.toFixed(2)+' (rank '+d.rank+')</td>').join('')+'</tr></tbody></table>'+
    '<p class="small mute">'+X.docs.map(d=>(d.relevant?'Relevant: ':'Not relevant: ')+'&ldquo;'+E(d.title)+'&rdquo;').join('; ')+'. Scores equal the recorded bm25s run ('+X.docs.map(d=>d.recorded_score.toFixed(3)).join(', ')+'). <span class="meas">measured</span></p>';
  // 2.2 k1 x b grid
  const B=D.bm25||{};const hs={ds:'scifact',sp:'test'};
  function heat(){const R=B[hs.ds];if(!R)return;const K1=[0.2,0.4,0.6,0.9,1.2,1.5,2,3,5],BS=[0,0.2,0.4,0.6,0.75,0.9,1];
    const vals=[];K1.forEach(k=>BS.forEach(b=>vals.push(R.grid[k+'|'+b][hs.sp].ndcg10)));const lo=Math.min(...vals),hi=Math.max(...vals);
    const best=R.best_on_tune.k1b;
    let h='<table class="rp-heat" style="border-collapse:collapse;width:100%;min-width:420px"><thead><tr><th>k1 \\ b</th>'+BS.map(b=>'<th>'+b+'</th>').join('')+'</tr></thead><tbody>';
    K1.forEach(k=>{h+='<tr><th>'+k+'</th>'+BS.map(b=>{const v=R.grid[k+'|'+b][hs.sp].ndcg10,t=(v-lo)/((hi-lo)||1);const key=k+'|'+b;
      const st='background:color-mix(in srgb,var(--c1) '+Math.round(8+72*t)+'%,var(--bg));'+(key==='1.2|0.75'?'outline:2px solid var(--ink);outline-offset:-2px;':'')+(key===best?'box-shadow:inset 0 0 0 3px var(--c2);':'');
      return '<td class="cell" style="'+st+'" title="k1 '+k+', b '+b+'">'+v.toFixed(3)+'</td>'}).join('')+'</tr>'});
    $('rp-heat').innerHTML=h+'</tbody></table>'}
  RD.seg($('rp-heat-ds'),m=>{hs.ds=m;heat()});RD.seg($('rp-heat-sp'),m=>{hs.sp=m;heat()});heat();
  // 2.3 tokenisation table
  if(B.scifact){const names=Object.keys(B.scifact.tokenisation);
    $('rp-tokvar-rows').innerHTML=names.map(n=>{const a=B.scifact.tokenisation[n],c=B.nfcorpus.tokenisation[n];
      return '<tr'+(n.indexOf('default')>=0?' class="hl"':'')+'><td>'+E(n)+'</td><td class="num">'+a.ndcg10.toFixed(3)+'</td><td class="num">'+a.r100.toFixed(3)+'</td><td class="num">'+c.ndcg10.toFixed(3)+'</td><td class="num">'+RP.fmt(a.vocab)+'</td></tr>'}).join('')}
  // 3 learned sparse example
  const SP=D.sparse||{};
  if(SP.scifact&&SP.scifact.example_doc&&$('rp-sparse-ex')){const ex=SP.scifact.example_doc;
    $('rp-sparse-ex').innerHTML='<p class="small" style="margin:4px 0">The heaviest 20 terms the model wrote for one SciFact abstract (&ldquo;'+E(ex.title)+'&rdquo;); <b>bold</b> = a term that does not appear anywhere in the abstract\'s text (expansion).</p><p class="small">'+
      ex.top_terms.map(([t,w,inn])=>(inn?'':'<b>')+'<code>'+E(t)+'</code> '+w.toFixed(2)+(inn?'':'</b>')).join(' &middot; ')+'</p>'}
  // 4.2 margins
  const FD=D.fd||{};
  function margin(){const el=$('rp-margin-chart');const sf=FD.scifact;if(!sf)return;
    const rows=[['BM25',sf.margin_bm25,'var(--c2)'],['Qwen3-Embedding',sf.margin_dense['qwen3-emb-0.6b'],'var(--c1)']];
    el.innerHTML=rows.map(([n,m,c])=>'<div style="font-size:12.5px;margin:6px 0 2px"><b>'+n+'</b>: top-1 relevant, by margin quintile (smallest margins first)</div>'+
      RP.bars(m.map((q,i)=>({name:'Q'+(i+1)+': '+q.lo.toFixed(2)+' to '+q.hi.toFixed(2),v:q.p_top1_rel,color:c})),1,v=>(100*v).toFixed(0)+'%')).join('')}
  // 4.4 family table
  const FU=D.fu&&D.fu.agg;const MN={rrf:'RRF',wrrf:'weighted RRF',minmax:'min-max (CombSUM)',zscore:'z-score',combmnz:'CombMNZ',combmax:'CombMAX',borda:'Borda',raw:'raw sum'};
  function fam(ds){if(!FU)return;const A=FU[ds],ms=Object.keys(A.models);
    const best={};ms.forEach(m=>{best[m]=Math.max(...Object.values(A.models[m].methods).map(x=>x.test))});
    let h='<table class="rp-t"><thead><tr><th>method</th>'+ms.map(m=>'<th class="num">'+m+'<br><span class="mute">alone '+f3(A.models[m].single)+'</span></th>').join('')+'</tr></thead><tbody>';
    Object.keys(MN).forEach(k=>{h+='<tr><td>'+MN[k]+'</td>'+ms.map(m=>{const v=A.models[m].methods[k];return '<td class="num">'+(v.test===best[m]?'<b>'+f3(v.test)+'</b>':f3(v.test))+' <span class="mute">('+v.best+')</span></td>'}).join('')+'</tr>'});
    $('rp-fam').innerHTML=h+'<tr><td class="mute">BM25 alone</td><td class="num mute" colspan="'+ms.length+'">'+f3(A.bm25)+'</td></tr></tbody></table>'}
  RD.seg($('rp-fam-ds'),fam);fam('scifact');
  // 4.5 fuse then rerank
  const T=FD.scifact&&FD.scifact.ftr;
  if(T){const names=['bm25 only','dense only','rrf k60','z-score a0.6','weighted rrf'];
    $('rp-ftr').innerHTML='<table class="rp-t"><thead><tr><th>first stage (SciFact, Qwen3-Embedding + BM25)</th><th class="num">before reranking</th><th class="num">rerank top 10</th><th class="num">top 20</th><th class="num">top 30</th></tr></thead><tbody>'+
      names.map(n=>'<tr><td>'+n+'</td><td class="num">'+f3(T[n+'|10'].before.ndcg10)+'</td>'+[10,20,30].map(K=>'<td class="num">'+f3(T[n+'|'+K].after.ndcg10)+'</td>').join('')+'</tr>').join('')+'</tbody></table><p class="small mute">nDCG@10, 300 test claims; Qwen3-Reranker-0.6B scores recorded by the setup and the root\'s runs (no unscored pairs). <span class="meas">measured</span></p>'}
  RD.onRender(()=>{margin()});RD.onResize(()=>{margin()});
})();
