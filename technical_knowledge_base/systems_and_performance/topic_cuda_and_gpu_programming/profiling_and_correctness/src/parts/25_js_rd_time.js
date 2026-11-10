// ---- Reading section 1: the numbers of Fig. 1 (one matmul timed four ways, measured medians; the scene is 40_js_sc_time.js) and the predict boxes ----
(function(){
  const A=PCD.timing.async,f=MC.fmtN;
  const L=A.host_nosync_ms.median,G=A.event_ms.median,S=A.host_sync_ms.median,Q=A.host_queued_ms.median;
  // predict boxes (all sections)
  document.querySelectorAll('#t-read .pr').forEach(pr=>pr.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    pr.querySelectorAll('button[data-a]').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.right)x.classList.add('right')});
    if(!b.dataset.right)b.classList.add('wrong');pr.querySelector('.ans').hidden=false}));
  // numbers in prose come from the data
  const V={q_ms:f(Q,2),sync_ms:f(S,3),tiny_ev:f(PCD.timing.tiny.event_ms.median,3),tiny_sync:f(PCD.timing.tiny.per_op_sync_ms.median,3),
    tiny_batch_us:f(PCD.timing.tiny.batched_ms_per_op.median*1000,2),
    t_L:f(L,2),t_G:f(G,2),t_S:f(S,2),t_ratio:f(G/L,0),q_mult:f(Q/G,1)};
  window.RDV=Object.assign(window.RDV||{},V);
})();
