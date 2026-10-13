// ---- Reading section 0: the summary table's measured cells ----
(function(){
  const D=window.FST,U=window.FU,$=U.$;
  const M=D.mem.runs,get=(c,h)=>M.find(r=>r.config===c&&r.how===h);
  const b=get('big','plain'),ck=get('big','ckpt'),vp=get('big_v50k','plain'),vl=get('big_v50k','lce');
  const pb=b.peak_by;
  $('fst-s0-mem').innerHTML='Larger variant: peak '+U.mb(b.peak)+', of which '+U.mb(pb.ACTIVATION)+' saved activations, '+U.mb(pb.PARAMETER+pb.OPTIMIZER_STATE)+' weights and AdamW state';
  const TC=D.time_ckpt&&D.time_ckpt.results;const t=(h,d)=>TC&&TC.find(x=>x.how===h&&x.device===d);
  $('fst-s0-ck').innerHTML='Checkpointing every block: peak '+U.mb(ck.peak)+' ('+(100*(1-ck.peak/b.peak)).toFixed(0)+'% lower)'+(TC?', step +'+(100*(t('ckpt','cpu').median_ms/t('plain','cpu').median_ms-1)).toFixed(0)+'% on CPU':'');
  $('fst-s0-lce').innerHTML='Vocabulary 50,257: peak '+U.mb(vp.peak)+' &rarr; '+U.mb(vl.peak)+' with the chunked loss; the default call saves nothing';
  const sv=(d,T,h)=>D.attn.saved.find(x=>x.device===d&&x.T===T&&x.how===h).saved_bytes;
  $('fst-s0-att').innerHTML='CPU: a flash-style kernel, '+U.mb(sv('cpu',2048,'sdpa'))+' kept at 2,048 positions against '+U.mb(sv('cpu',2048,'manual'))+' written out; MPS: always the math path; FlexAttention inference-only here';
  const P=D.ao.ptq_big_after_150_steps,g=n=>P.find(r=>r.config.startsWith(n));
  $('fst-s0-ao').innerHTML='int8 weight-only: Linear weights '+U.mb(P[0].linear_bytes)+' &rarr; '+U.mb(g('Int8WeightOnly').linear_bytes)+'; float8 training and MX need GPUs not present here';
  const TT=D.time_timer&&D.time_timer.results;
  if(TT)$('fst-s0-t1').innerHTML='A 2,048-square matmul on MPS: '+U.ms(TT.mps_no_sync_ms)+' without a synchronize, '+U.ms(TT.timer.median_ms)+' with Timer';
})();
