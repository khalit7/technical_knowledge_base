// ---- Moved from the root Failure lab (2026-10-19): the backward-time probe (its Slurm straggler animation was replaced on 2026-10-24 by the measured replay in section 8) ----
(function(){
  const H=window.FLH&&window.FLH('t-read'),D=window.FL_DATA;if(!H||!D)return;const $=H.$;
  function probe(){
    const el=$('fl-pb-svg');if(!el)return;const P=D.probe;const mx=Math.max(...P.backward_median_ms.flat());
    let h='<div class="bars">';
    P.slow_ms.forEach((s,k)=>{h+='<div class="small" style="margin:6px 0 2px;font-weight:600">'+(s?'Rank 3 sleeps '+s+' ms per step':'No straggler')+'</div>';
      P.backward_median_ms[k].forEach((v,r)=>{const hl=s&&r===3;h+='<div class="row'+(hl?' hl':'')+'"><span class="nm">rank '+r+(hl?' (slow)':'')+'</span><span class="track"><span class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:'+(hl?'var(--bad)':'var(--acc)')+'"></span></span><span class="val">'+v.toFixed(1)+' ms</span></div>'})});
    el.innerHTML=h+'</div>';
  }
  probe();H.onRender(probe);
})();
