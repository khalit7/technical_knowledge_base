// ---- Reading: numbers written into the prose from window.DDC (planner) and window.DDE (routing), and the predict-then-reveal boxes ----
(function(){
  const C=window.DDC;if(!C)return;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const row=(k,n,B)=>C.steps.find(r=>r.kind===k&&r.n===n&&r.B===B);
  const t1=row('tp',1,1),t8=row('tp',8,1),p8=row('pp',8,1),t2=row('tp',2,1),t8b=row('tp',8,64),r8=row('tp',1,8);
  const MB=b=>fmt(b/1e6,2)+' MB',KiB=b=>fmt(b/1024,0)+' KiB';
  set('dd-s0-tp',MB(C.tp_bytes['8'].per_token_sent)+' per token');
  set('dd-s0-tpt',fmt(t8.t_ms)+' ms instead of '+fmt(t1.t_ms)+' ms');
  set('dd-s0-ppt',fmt(p8.t_ms)+' ms, as on one GPU');
  set('dd-s0-ep',MB(C.ep.per_token));
  set('dd-s0-kv',fmt(C.ex_xfer.mib,0)+' MiB for a 2,000-token prompt');
  set('dd-s1-seq1',fmt(t1.seqs,0));set('dd-s1-seq2',fmt(t2.seqs,0));set('dd-s1-ratio',fmt(t2.seqs/t1.seqs,1));
  set('dd-pr1-v',fmt(t8.t_ms));
  set('dd-s3-ar',KiB(C.tp_bytes['8'].per_allreduce_sent));set('dd-s3-tok',MB(C.tp_bytes['8'].per_token_sent));
  set('dd-s3-speed',fmt(t1.t_ms/t8.t_ms));
  set('dd-s3-tps',fmt(64*1000/t8b.t_ms,0));set('dd-s3-rtps',fmt(8*8*1000/r8.t_ms,0));
  set('dd-s5-pl',fmt(C.ep.per_layer,0)+' bytes');set('dd-s5-pt',MB(C.ep.per_token));
  set('dd-s6-co',fmt(C.pdanim.co_dec));set('dd-s6-pd',fmt(C.pdanim.pd_dec));
  set('dd-s6-mib',fmt(C.ex_xfer.mib,0));set('dd-s6-ms',fmt(C.ex_xfer.ms.nic400));set('dd-s6-pre',fmt(C.prefill_ms['2000'],0));
  const E=window.DDE;
  if(E){const g=E.results.find(r=>r.G===8&&r.R===0&&r.kind==='naive'),e0=E.results.find(r=>r.G===8&&r.R===0&&r.kind==='eplb'),e16=E.results.find(r=>r.G===8&&r.R===16&&r.kind==='eplb');
    const mx=Math.max(...E.top_share);
    set('dd-s5-imb','the most popular expert of a layer takes up to '+fmt(100*mx)+'% of its choices (an even split would be '+fmt(100/E.E)+'%). Spread over 8 GPUs in the default order, the busiest GPU of a 512-token batch carries on average '+fmt(g.batch_mean,2)+' times the mean load, so about '+fmt(100*(1-1/g.batch_mean),0)+'% of the GPU time in the expert layers is spent waiting. EPLB planned on earlier text brings that to '+fmt(e0.batch_mean,2)+' times without extra slots and '+fmt(e16.batch_mean,2)+' times with 16 redundant experts.')}
  // predict, then reveal (every .pr box in the Reading tab with data-r on the right answer)
  document.querySelectorAll('#t-read .pr').forEach(box=>box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!b.parentNode.classList.contains('opts'))return;
    box.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.r)x.classList.add('right');else if(x===b)x.classList.add('wrong')});
    const a=box.querySelector('.ans');if(a)a.hidden=false}));
})();
