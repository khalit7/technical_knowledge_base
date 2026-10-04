// ---- Reading: the real-run table (nDCG@10, recall@10, recall@100 for every system and set) and the reproduction line ----
(function(){
  const t=document.getElementById('rd-real-tab');if(!t)return;
  const SETS=['scifact','nfcorpus','fiqa'],S=RDATA.sys,f=x=>x.toFixed(3);
  let h='<thead><tr><th>System</th>'+SETS.map(d=>'<th class="num">'+RDATA.beir[d].name+'<br><small>nDCG@10 / R@10 / R@100</small></th>').join('')+'</tr></thead><tbody>';
  S.forEach((s,i)=>{h+='<tr><td>'+RUN.SN[s]+'</td>'+SETS.map(d=>{const a=RUN.agg(d,i,10,false),b=RUN.agg(d,i,100,false);return '<td class="num">'+f(a.ndcg)+' / '+f(a.recall)+' / '+f(b.recall)+'</td>'}).join('')+'</tr>'});
  t.innerHTML=h+'</tbody>';
  document.getElementById('rd-real-note').textContent='Computed in your browser from the stored ranks of every labelled passage in the top 100; src/recompute.py checks these against the full Python runs. R@k is recall@k.';
  let r='';
  SETS.forEach((d,j)=>{const B=RDATA.beir[d],P=B.pub,a=RUN.agg(d,0,10,false),b=RUN.agg(d,0,100,false),c=RUN.agg(d,3,10,false),e=RUN.agg(d,3,100,false);
    r+=(j?' ':'')+'<b>'+B.name+'</b>: BM25 '+a.ndcg.toFixed(4)+' and R@100 '+b.recall.toFixed(4)+' against Anserini '+P.bm25_lucene.ndcg10.toFixed(4)+' and '+P.bm25_lucene.r100.toFixed(4)+'; MiniLM '+c.ndcg.toFixed(4)+' and '+e.recall.toFixed(4)+' against MTEB '+P.dense_minilm.ndcg10.toFixed(4)+' and '+P.dense_minilm.r100.toFixed(4)+'.'});
  document.getElementById('rd-real-repro').innerHTML=r+' The dense run matches MTEB\'s published results to the fourth decimal; our BM25 lands within 0.004 of <a href="https://github.com/castorini/anserini/tree/master/docs/reproduce/from-document-collection" target="_blank" rel="noopener noreferrer">Anserini\'s flat regressions</a> (a Python reimplementation, not Lucene\'s exact analyzer). The BEIR paper\'s own BM25 (0.665, 0.325, 0.236) indexed title and text as separate fields, a slightly different system.';
})();
