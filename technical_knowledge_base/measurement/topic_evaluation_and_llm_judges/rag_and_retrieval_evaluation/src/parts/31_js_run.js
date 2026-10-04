// ---- Tab: Score a real retrieval run. Metrics recomputed from the stored ranks of labelled passages (mirrored by src/recompute.py) ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  let ds='scifact',qi=0;
  const S=RDATA.sys;
  function table(){
    const B=RDATA.beir[ds],k=+$('rn-k').value,exp=$('rn-gain').value==='exp';
    $('rn-about').textContent=B.name+': '+B.docs.toLocaleString('en-US')+' documents, '+B.nq+' test queries, '+B.pairs.toLocaleString('en-US')+' labelled relevant pairs ('+(B.pairs/B.nq).toFixed(1)+' per query; grades '+B.grades.join(', ')+'). With that many labels per query, precision@'+k+' can be at most '+Math.min(1,B.pairs/B.nq/k).toFixed(2)+' on average.';
    let h='<thead><tr><th>System</th><th class="num">nDCG@10</th><th class="num">recall@'+k+'</th><th class="num">hit@'+k+'</th><th class="num">precision@'+k+'</th><th class="num">MRR@10</th></tr></thead><tbody>';
    const R=S.map((s,i)=>RUN.agg(ds,i,k,exp));const best=f=>Math.max(...R.map(r=>r[f]));
    S.forEach((s,i)=>{const r=R[i],c=f=>'<td class="num">'+(r[f]===best(f)?'<b>':'')+r[f].toFixed(4)+(r[f]===best(f)?'</b>':'')+'</td>';
      h+='<tr><td>'+RUN.SN[s]+'</td>'+c('ndcg')+c('recall')+c('hit')+c('prec')+c('mrr')+'</tr>'});
    $('rn-table').innerHTML=h+'</tbody>';
    const P=B.pub,lin=RUN.agg(ds,0,100,false),dn=RUN.agg(ds,3,100,false),l10=RUN.agg(ds,0,10,false),d10=RUN.agg(ds,3,10,false);
    $('rn-repro').innerHTML='<b>Reproduces published numbers independently</b> (linear gain): BM25 nDCG@10 '+l10.ndcg.toFixed(4)+' and recall@100 '+lin.recall.toFixed(4)+' against '+P.bm25_lucene.by+' '+P.bm25_lucene.ndcg10.toFixed(4)+' and '+P.bm25_lucene.r100.toFixed(4)+
      ' (<a href="https://github.com/castorini/anserini/tree/master/docs/reproduce/from-document-collection" target="_blank" rel="noopener noreferrer">Anserini BEIR regressions</a>; BEIR paper Table 2: '+P.beir_bm25.toFixed(3)+'); dense nDCG@10 '+d10.ndcg.toFixed(4)+' and recall@100 '+dn.recall.toFixed(4)+' against '+P.dense_minilm.ndcg10.toFixed(4)+' and '+P.dense_minilm.r100.toFixed(4)+
      ' (<a href="https://github.com/embeddings-benchmark/results/tree/main/results/sentence-transformers__all-MiniLM-L6-v2" target="_blank" rel="noopener noreferrer">MTEB results repository</a>, revision 8b3219a9). Our BM25 is a Python reimplementation (same stopwords and Porter stemmer, not Lucene\'s exact analyzer), so a gap in the third decimal is expected.';
  }
  function qopts(){const sm=RDATA.beir[ds].sample;$('rn-q').innerHTML=sm.map((s,i)=>'<option value="'+i+'">['+s.grp+'] '+esc(s.t.length>70?s.t.slice(0,70)+'...':s.t)+'</option>').join('');qi=0;$('rn-q').value=0}
  function qview(){
    const B=RDATA.beir[ds],s=B.sample[qi],Q=B.Q[s.i],T=B.titles;
    let h='<div class="card"><div class="ttl">'+esc(s.t)+'</div><div class="small mute">'+Q[0]+' labelled passage'+(Q[0]>1?'s':'')+'; group: '+s.grp+'</div>';
    // per-query metrics for the three shown systems
    const show=['bm25_lucene','dense_minilm','hybrid_rrf'];
    h+='<div class="tw"><table><thead><tr><th>System</th><th class="num">first hit</th><th class="num">recall@10</th><th class="num">nDCG@10</th></tr></thead><tbody>';
    show.forEach(sy=>{const si=S.indexOf(sy),fl=Q[3][si];let first=0,c=0,d=0;for(let j=0;j<fl.length;j+=2){const rk=fl[j];if(!first||rk<first)first=rk;if(rk<=10){c++;d+=fl[j+1]/Math.log2(rk+1)}}
      h+='<tr><td>'+RUN.SS[sy]+'</td><td class="num">'+(first?first:'&gt;100')+'</td><td class="num">'+(c/Q[0]).toFixed(3)+'</td><td class="num">'+(d/Q[1]).toFixed(3)+'</td></tr>'});
    h+='</tbody></table></div><div class="grid">';
    show.forEach(sy=>{h+='<div><div class="band">'+RUN.SS[sy]+' top 10</div><ol class="rl">'+s.top[sy].map((d,i)=>'<li class="'+(s.gold[d]?'g':'')+'"><span class="r">'+(i+1)+'</span><span>'+(s.gold[d]?'<b>['+s.gold[d]+']</b> ':'')+esc((T[d]||d)+((T[d]||'').length>=60?'...':''))+'</span></li>').join('')+'</ol></div>'});
    h+='</div></div>';$('rn-qv').innerHTML=h;
  }
  RD.seg($('rn-set'),m=>{ds=m;table();qopts();qview()});
  $('rn-k').addEventListener('change',table);$('rn-gain').addEventListener('change',table);
  $('rn-q').addEventListener('change',e=>{qi=+e.target.value;qview()});
  $('rn-prev').addEventListener('click',()=>{const n=RDATA.beir[ds].sample.length;qi=(qi+n-1)%n;$('rn-q').value=qi;qview()});
  $('rn-next').addEventListener('click',()=>{const n=RDATA.beir[ds].sample.length;qi=(qi+1)%n;$('rn-q').value=qi;qview()});
  RD.onRender(()=>{if(!$('rn-table').innerHTML){table();qopts();qview()}},'t-run');
})();
