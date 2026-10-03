// ---- Reading: numbers in the prose, filled from the sample statistics (recompute.py) ----
(function(){
  const S=window.AL_DATA.sft;
  const pct=x=>(100*x).toFixed(1)+'%';
  const v={median_total:S.median_total.toLocaleString('en-US'),mean_total:Math.round(S.mean_total).toLocaleString('en-US'),over:S.over,
    pad8:pct(S.pad_eff['8']),pad16:pct(S.pad_eff['16']),pack:pct(S.pack_eff),cross:pct(S.cross_share),
    p10:S.loss_p10.toLocaleString('en-US'),p90:S.loss_p90.toLocaleString('en-US'),wr:(S.loss_p90/S.loss_p10).toFixed(1)+' times'};
  document.querySelectorAll('[data-al]').forEach(e=>{const k=e.dataset.al;if(k in v)e.textContent=v[k];else throw new Error('no value for '+k)});
})();
