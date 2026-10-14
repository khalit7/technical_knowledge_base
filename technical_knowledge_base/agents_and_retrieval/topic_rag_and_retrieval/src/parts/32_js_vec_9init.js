// ---- Vector search lab: links to other tabs, text that depends on the metric run ----
(function(){
  const V=window.VEC,$=V.$,M=V.D.metric;
  V.goLinks($('t-vec'));
  const el=$('vec-mist-dot');
  if(el)el.innerHTML=M?'gte-modernbert-base returns vectors of length '+M.norms.doc_min.toFixed(1)+' to '+M.norms.doc_max.toFixed(1)+'. Ranked by raw dot product on SciFact, nDCG@10 is '+V.f3(M.metrics.dot['ndcg@10'])+' against '+V.f3(M.metrics.cosine['ndcg@10'])+' with cosine, and only '+V.pc(M.overlap10.cos_dot,0)+' of the top 10 agree. Normalise at write time, or use cosine.':'Normalise at write time, or use cosine.';
})();
