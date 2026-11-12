// ---- Reading s3: the memory engine (mirrors mem_anim in src/recompute.py): one training step's memory under three ways of keeping activations.
// window.PMA drives Fig. 3 (42_js_sc_mem.js) and the FLOP and memory ledger tab; check/check_page.mjs checks it against recompute.py. ----
window.PMA=(function(){
  const X=window.CALCX,m=X.M.l8;
  function ffOf(m){return (m.layer_params-2*m.h-(m.h*m.nh*m.hd+2*m.h*m.nkv*m.hd+m.nh*m.hd*m.h))/(3*m.h)}
  function ledger(m,T){const h=m.h,L=m.L,f=ffOf(m);
    const proj=L*(2*h*m.nh*m.hd+2*h*m.nkv*m.hd),mlp=L*3*h*f,head=h*m.V,coreF=L*4*T*m.nh*m.hd;
    return {f:f,proj:6*proj,mlp:6*mlp,head:6*head,core_fwd:coreF,core_bwd_std:2*coreF,core_bwd_flash:2.5*coreF,six_n:6*m.P,six_n_matmul:6*(proj+mlp+head)}}
  function actLayerTok(m,T,mode){const h=m.h,f=ffOf(m);if(mode==='ckpt')return 2*h;
    const fl=16*h+4*m.nh*m.hd+4*m.nkv*m.hd+8*f+4*m.nh+8;return mode==='flash'?fl:fl-4*m.nh+6*m.nh*T+4*(m.nh-m.nkv)*m.hd}
  const actPostTok=m=>8*m.h+4*m.V+8;
  function memAnim(mode,T){T=T||8192;const h=m.h,V=m.V,L=m.L,lg=ledger(m,T),f=lg.f,S=16*m.P/8;
    const fwdL=(lg.proj+lg.mlp)/3/L*T+lg.core_fwd/L*T,bwdL=2*(lg.proj+lg.mlp)/3/L*T+(mode!=='eager'?lg.core_bwd_flash:2*lg.core_fwd)/L*T;
    const recL=fwdL-2*h*f*T,keep=actLayerTok(m,T,mode==='ckpt'?'ckpt':mode)*T,work=actLayerTok(m,T,'flash')*T,post=actPostTok(m)*T;
    const st=[{kind:'start',mem:S,act:0,post:0,rec:0,fl:0,flr:0}];let act=0,fl=0,flr=0;
    for(let i=0;i<L;i++){act+=keep;fl+=fwdL;st.push({kind:'fwd',layer:i+1,mem:S+act,act:act,post:0,rec:0,fl:fl,flr:flr})}
    fl+=2*h*V*T;st.push({kind:'loss',mem:S+act+post,act:act,post:post,rec:0,fl:fl,flr:flr});
    fl+=4*h*V*T;st.push({kind:'headbwd',mem:S+act+post,act:act,post:post,rec:0,fl:fl,flr:flr});
    for(let i=L;i>=1;i--){const rec=mode==='ckpt'?work:0;if(mode==='ckpt')flr+=recL;fl+=bwdL;
      st.push({kind:'bwd',layer:i,mem:S+act+rec,act:act,post:0,rec:rec,fl:fl,flr:flr});act-=keep}
    let pk=0;st.forEach(x=>{pk=Math.max(pk,x.mem)});return {steps:st,peak:pk,total_fl:fl+flr,states:S}}
  return {ffOf,ledger,actLayerTok,actPostTok,memAnim};
})();
