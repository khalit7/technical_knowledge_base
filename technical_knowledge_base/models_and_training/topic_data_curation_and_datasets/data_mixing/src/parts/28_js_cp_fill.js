// ---- numbers in the Reading prose that come from the toy runs ----
(function(){
  const T=CPT.toy;if(!T)return;const S=T.summary,f=v=>v.toFixed(2);
  const m50=T.cpt['p1.0_r0.0'].map(x=>x[1][1]).reduce((a,b)=>a+b,0)/T.seeds.length;
  const V={toyParams:T.params.toLocaleString(),toyBaseEn:f(S.base.en),toyEn50:f(m50),
    toyRm25:String(S['p1.0_r0.25'].removed_pct),toyDeCost25:f(S['p1.0_r0.25'].de-S['p1.0_r0.0'].de)};
  document.querySelectorAll('[data-v]').forEach(el=>{const v=V[el.dataset.v];if(v!=null)el.textContent=v});
})();
