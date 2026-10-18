// ---- RoPE maths shared by the visuals: line-by-line ports of transformers' modeling_rope_utils.py (src/inputs/code_extracts.py), identical to src/recompute.py ----
window.ROPE=(function(){
  const baseInv=(base,dim)=>{const r=[];for(let i=0;i<dim/2;i++)r.push(1/Math.pow(base,2*i/dim));return r};
  // Position Interpolation: every frequency divided by s (positions m become m/s)
  const pi=(p,s)=>baseInv(p.base,p.dim).map(f=>f/s);
  // NTK-aware: raise the base, b' = b * s^(d/(d-2))
  const ntkBase=(p,s)=>p.base*Math.pow(s,p.dim/(p.dim-2));
  const ntk=(p,s)=>baseInv(ntkBase(p,s),p.dim);
  // Dynamic NTK as the YaRN paper defines it (section 3.3): the NTK-aware base with s = max(1, l'/L), l' the current length.
  // (transformers' "dynamic" type uses s_eff = s*l'/L - (s - 1) instead; not drawn here)
  const dynBase=(p,s,len)=>ntkBase(p,Math.max(1,len/p.L));
  const dyn=(p,s,len)=>baseInv(dynBase(p,s,len),p.dim);
  // YaRN ("NTK-by-parts" ramp on pair index between beta_fast and beta_slow rotations, plus temperature)
  function yarnRange(p,s){const bf=p.beta_fast||32,bs=p.beta_slow||1,d=p.dim,b=p.base,L=p.L;
    const corr=rot=>(d*Math.log(L/(rot*2*Math.PI)))/(2*Math.log(b));
    let lo=corr(bf),hi=corr(bs);if(p.truncate!==false){lo=Math.floor(lo);hi=Math.ceil(hi)}
    lo=Math.max(lo,0);hi=Math.min(hi,d-1);if(lo===hi)hi+=0.001;return [lo,hi]}
  function yarnRamp(p,s){const [lo,hi]=yarnRange(p,s),r=[];for(let i=0;i<p.dim/2;i++)r.push(Math.min(1,Math.max(0,(i-lo)/(hi-lo))));return r}
  const yarn=(p,s)=>{const rr=yarnRamp(p,s);return baseInv(p.base,p.dim).map((f,i)=>f/s*rr[i]+f*(1-rr[i]))};
  const mscale=(s,m)=>s<=1?1:0.1*(m||1)*Math.log(s)+1;
  // Llama 3.1 "llama3" type: keep wavelengths < L/high, divide by s beyond L/low, smooth in between
  function llama3(p,s){const lowF=p.low||1,highF=p.high||4,L=p.L,lw=L/lowF,hw=L/highF;
    return baseInv(p.base,p.dim).map(f=>{const wl=2*Math.PI/f;if(wl<hw)return f;if(wl>lw)return f/s;
      const sm=(L/wl-lowF)/(highF-lowF);return (1-sm)*f/s+sm*f})}
  // LongRoPE (Phi-3): one searched factor per pair
  const longrope=(p,which)=>{const fac=p[which||'long'];return fac?baseInv(p.base,p.dim).map((f,i)=>f/fac[i]):null};
  function method(p,m,s,len){
    if(m==='plain')return baseInv(p.base,p.dim);
    if(m==='pi')return pi(p,s);if(m==='ntk')return ntk(p,s);if(m==='dyn')return dyn(p,s,len||p.L);
    if(m==='yarn')return yarn(p,s);if(m==='llama3')return llama3(p,s);if(m==='longrope')return longrope(p,'long');return null}
  // the largest angle each pair reached at any distance below L in training; 2*pi means the whole circle was seen
  const seenArc=(p)=>baseInv(p.base,p.dim).map(f=>Math.min(2*Math.PI,p.L*f));
  return {baseInv,pi,ntk,ntkBase,dyn,dynBase,yarn,yarnRange,yarnRamp,mscale,llama3,longrope,method,seenArc};
})();
// T5's _relative_position_bucket (Mesh TensorFlow), as in transformers' modeling_t5.py
window.T5B=function(rel,bidirectional,nb,maxd){nb=nb||32;maxd=maxd||128;let b=0;
  if(bidirectional){nb=nb/2|0;if(rel>0)b+=nb;rel=Math.abs(rel)}else rel=-Math.min(rel,0);
  const me=nb/2|0;if(rel<me)return b+rel;
  const large=me+Math.trunc(Math.log(rel/me)/Math.log(maxd/me)*(nb-me));return b+Math.min(large,nb-1)};
