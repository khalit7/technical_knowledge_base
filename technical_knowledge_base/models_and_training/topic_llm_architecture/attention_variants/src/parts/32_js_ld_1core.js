// Cache ladder: per-layer arithmetic of what a token stores and what one decoded token reads (window.AVLC).
// Checked by src/ladder/check_ladder.mjs against the root Config calculator (CC.cache) and the gallery's V4-Pro figure.
window.AVLC=(function(){
  function layer(g,L){
    // returns numbers stored (whole context), numbers read by one decoded token, attention-core FLOPs; gdn in bytes
    if(g.kind==='attn'){const e=g.win?Math.min(L,g.win):L;const s=2*g.nkv*g.hd*e;
      return {store:s,read:s,flops:4*g.nq*g.hd*e,entries:e,readEntries:e}}
    if(g.kind==='mla'){const n=g.topk?Math.min(L,g.topk):L;const idx=g.idx_dim||0;
      return {store:(g.dc+g.dr+idx)*L,read:(g.dc+g.dr)*n+(g.topk?idx*L:0),
        flops:2*g.nq*(g.dc+g.dr)*n+2*g.nq*g.dc*n+(g.topk?2*g.idx_heads*idx*L:0),entries:L,readEntries:n}}
    if(g.kind==='comp'){const E=Math.floor(L/g.ratio),w=Math.min(L,g.win),idx=g.idx_dim||0;const n=g.topk?Math.min(E,g.topk):E;
      return {store:g.entry*(E+w)+idx*E,read:g.entry*(n+w)+(g.topk?idx*E:0),
        flops:4*g.nq*g.entry*(n+w)+(g.topk?2*g.idx_heads*idx*E:0),entries:E+w,readEntries:n+w}}
    if(g.kind==='gdn'){return {storeBytes:g.state_bytes_layer,readBytes:g.state_bytes_layer,store:0,read:0,flops:0,entries:0,readEntries:0,fixed:true}}
    return {store:0,read:0,flops:0,entries:0,readEntries:0};
  }
  function rung(r,L,bpn){
    bpn=bpn||2;let sb=0,rb=0,fl=0,fixed=0,nl=0;
    for(const g of r.groups){const x=layer(g,L);nl+=g.n;
      sb+=g.n*((x.store||0)*bpn+(x.storeBytes||0));rb+=g.n*((x.read||0)*bpn+(x.readBytes||0));fl+=g.n*x.flops;if(x.fixed)fixed+=g.n*x.storeBytes}
    return {storeBytes:sb,readBytes:rb,flops:fl,fixedBytes:fixed,layers:nl,perToken:L?(sb-fixed)/L:0};
  }
  function roof(x,gpu){const tm=x.readBytes/(gpu.hbm_tb_s*1e12),tc=x.flops/(gpu.bf16_dense_tflops*1e12);return {tm,tc,t:Math.max(tm,tc),bound:tc>tm?'compute':'memory'}}
  const fmtB=b=>b>=1024**3?(b/1024**3).toFixed(b>=10*1024**3?1:2)+' GiB':b>=1024**2?(b/1024**2).toFixed(b>=10*1024**2?1:2)+' MiB':b>=1024?(b/1024).toFixed(1)+' KiB':Math.round(b)+' B';
  const fmtF=f=>f>=1e12?(f/1e12).toFixed(2)+' TFLOP':f>=1e9?(f/1e9).toFixed(2)+' GFLOP':f>=1e6?(f/1e6).toFixed(1)+' MFLOP':Math.round(f)+' FLOP';
  const fmtT=s=>s>=1e-3?(s*1e3).toFixed(2)+' ms':(s*1e6).toFixed(1)+' µs';
  return {layer,rung,roof,fmtB,fmtF,fmtT};
})();
