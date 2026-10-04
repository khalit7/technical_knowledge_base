// ---- Shared: dataset-level retrieval metrics from stored ranks (used by the Reading table and the run tab; mirrored by src/recompute.py) ----
window.RUN=(function(){
  const SN={bm25_lucene:'BM25 (Lucene-style, k1 0.9, b 0.4)',bm25_lucene_es:'BM25 (same, k1 1.2, b 0.75)',bm25okapi:'rank_bm25 BM25Okapi, as installed',dense_minilm:'Dense: all-MiniLM-L6-v2',hybrid_rrf:'Hybrid: BM25 + dense, RRF k=60'};
  const SS={bm25_lucene:'BM25',bm25_lucene_es:'BM25 (1.2, 0.75)',bm25okapi:'rank_bm25',dense_minilm:'Dense MiniLM',hybrid_rrf:'Hybrid RRF'};
  // per-query record: [ngold, idcg10 linear, idcg10 exponential, per system [rank, grade, rank, grade, ...] for labelled passages ranked <= 100]
  function agg(ds,si,k,exp){
    const Q=RDATA.beir[ds].Q;let r=0,h=0,p=0,m=0,n=0;
    for(const q of Q){const fl=q[3][si];let c=0,first=0,d=0;
      for(let j=0;j<fl.length;j+=2){const rk=fl[j],g=fl[j+1];if(rk<=k)c++;if(rk<=10){if(!first||rk<first)first=rk;d+=(exp?Math.pow(2,g)-1:g)/Math.log2(rk+1)}}
      r+=c/q[0];h+=c>0?1:0;p+=c/k;m+=first?1/first:0;n+=d/(exp?q[2]:q[1])}
    const N=Q.length;return {recall:r/N,hit:h/N,prec:p/N,mrr:m/N,ndcg:n/N};
  }
  return {SN,SS,agg};
})();
