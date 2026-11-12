// ---- Reading sections 8 to 10: the memory predict, checkpointing bars, compile budget bars, fused loss bars ----
(function(){
  const D=window.FST,U=window.FU,$=U.$;
  const M=D.mem.runs, get=(c,h)=>M.find(r=>r.config===c&&r.how===h);
  const CAT=[['PARAMETER','Parameters','var(--c1)'],['OPTIMIZER_STATE','Optimizer state','var(--c5)'],['GRADIENT','Gradients','var(--c3)'],
    ['ACTIVATION','Activations','var(--c2)'],['AUTOGRAD_DETAIL','Backward temporaries','var(--c4)'],['TEMPORARY','Temporaries','var(--c6)'],['INPUT','Batch','var(--mute)'],['UNKNOWN','Unknown','var(--dim)']];
  const MODES=[['plain','Plain'],['ckpt','Checkpoint every block'],['sac_mm','SAC: save matmuls'],['sac_attn','SAC: save attention only']];
  const NAME={plain:'plain',ckpt:'full checkpointing',sac_mm:'SAC saving matmuls',sac_attn:'SAC saving attention only'};
  // the step's memory over time is the 3D Fig. 4 (44_js_sc_mem.js)
  const big=get('big','plain');
  const pb=big.peak_by;
  U.predict('fst-pr-mem',1,'At the peak, activations hold '+U.mb(pb.ACTIVATION)+'; parameters, AdamW state and the gradients so far hold '+U.mb(pb.PARAMETER+pb.OPTIMIZER_STATE+pb.GRADIENT)+'. With context 256 and batch 8, every block saves several (8 &times; 256 &times; 512)-sized tensors and two (8 &times; 256 &times; 2048) ones (section 8 and the {{Memory budget|#t-mem}} tab count them), which outweighs 25.4M parameters. Halve the batch and the activations halve; the 16 bytes per parameter do not move.'.replace(/\{\{([^|]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>'));
  RD.tabLinks($('fst-pr-mem'));
  // ---- section 8: checkpointing bars ----
  const TC=D.time_ckpt&&D.time_ckpt.results;
  let ckdev='cpu';
  function ckDraw(){
    const rows=[];
    MODES.forEach(m=>{const r=get('big',m[0]);const t=TC&&TC.find(x=>x.how===m[0]&&x.device===ckdev);
      rows.push({nm:m[1],ml:'peak; backward '+U.comma(r.calls.bwd)+' ATen calls'+(t?'; step '+U.ms(t.median_ms):''),v:r.peak/1e6,txt:U.f1(r.peak/1e6)+' MB',col:m[0]==='plain'?'var(--c2)':'var(--c3)',hl:m[0]==='plain'})});
    U.bars($('fst-ck-bars'),rows,Math.max(...rows.map(r=>r.v)));
  }
  if(TC)U.seg($('fst-ck-seg'),[['cpu','Times on CPU'],['mps','Times on MPS']],d=>{ckdev=d;ckDraw()},'cpu');else ckDraw();
  const ck=get('big','ckpt'),sm=get('big','sac_mm'),sa=get('big','sac_attn');
  // ---- section 8: compile memory budget ----
  const BU=D.budget&&D.budget.runs;
  if(BU){const g=b=>BU.find(x=>x.budget===b);
    U.bars($('fst-budget-bars'),[['eager (no compile)',null,'var(--c2)'],['compiled, budget 1.0',1,'var(--c2)'],['compiled, budget 0.5',0.5,'var(--c5)'],['compiled, budget 0.2',0.2,'var(--c5)'],['compiled, budget 0.0',0,'var(--c3)'],['eager, checkpoint every block','ckpt','var(--c1)']].map(r=>{const v=g(r[1]).saved_activation_bytes;return {nm:r[0],v:v/1e6,txt:U.f1(v/1e6)+' MB',col:r[2]}}));}
  // ---- section 9: fused linear cross-entropy ----
  const vp=get('big_v50k','plain'),vr=get('big_v50k','lce_ref'),vl=get('big_v50k','lce'),vc=get('big_v50k','ckpt');
  U.bars($('fst-lce-bars'),[
    {nm:'Unfused',ml:'head, then cross_entropy',v:vp.peak/1e6,txt:U.f1(vp.peak/1e6)+' MB',col:'var(--c2)',hl:true},
    {nm:'Fused call, default',ml:'options=None: reference path',v:vr.peak/1e6,txt:U.f1(vr.peak/1e6)+' MB',col:'var(--c2)'},
    {nm:'Fused call, chunked',ml:'options=LinearCrossEntropyOptions()',v:vl.peak/1e6,txt:U.f1(vl.peak/1e6)+' MB',col:'var(--c3)'},
    {nm:'Checkpointing instead',ml:'every block, unfused loss',v:vc.peak/1e6,txt:U.f1(vc.peak/1e6)+' MB',col:'var(--c1)'}]);
  const TL=D.time_lce&&D.time_lce.results;
})();
