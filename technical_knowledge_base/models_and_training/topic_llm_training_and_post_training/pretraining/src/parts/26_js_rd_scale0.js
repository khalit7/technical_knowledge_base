// ---- Reading, section 3: the scaling-law engine (no DOM; check_scale.mjs compares it with recompute.py) ----
// Constants as recompute.py holds them: Hoffmann et al. 2022 Approach 3 (unrounded, and as printed in Eq. 10), Besiroglu et al. 2024 refit;
// Kaplan et al. 2020 Table 6 as Chinchilla's Appendix D.4 reads it (C_min = C/2, one PF-day = 8.64e19 FLOPs).
window.PTS=(function(){
  const FITS={hoff:{E:1.6934,A:406.401,B:410.7228,al:0.33917084,be:0.2849083},
    hoffr:{E:1.69,A:406.4,B:410.7,al:0.34,be:0.28},
    besi:{E:1.8172,A:482.01,B:2085.43,al:0.3478,be:0.3658}};
  const PFD=8.64e19;
  const loss=(f,N,D)=>f.E+f.A/Math.pow(N,f.al)+f.B/Math.pow(D,f.be);
  function opt(f,C){const a=f.be/(f.al+f.be),G=Math.pow(f.al*f.A/(f.be*f.B),1/(f.al+f.be));
    const N=G*Math.pow(C/6,a),D=C/6/N;return {N,D,tpp:D/N,L:loss(f,N,D),a}}
  const kaplan=C=>1.3e9*Math.pow(C/2/PFD,0.73);
  // model size whose loss at k tokens per parameter equals L0 (bisection on log N, as recompute.py)
  function isoN(f,L0,k){let lo=1e6,hi=1e15;for(let i=0;i<200;i++){const m=Math.sqrt(lo*hi);if(loss(f,m,k*m)>L0)lo=m;else hi=m}return hi}
  function over(f,C0,k){const o=opt(f,C0),N=isoN(f,o.L,k),D=k*N,C=6*N*D;
    return {N,D,C_ratio:C/C0,serve_ratio:N/o.N,breakeven_tokens:N<o.N?(C-C0)/(2*(o.N-N)):null}}
  const floorN=(f,L0)=>Math.pow(f.A/(L0-f.E),1/f.al);
  // Sardana et al. 2024, Eq. 3: at the loss of the Chinchilla-optimal model of size Nc (on this fit's frontier), the N and D
  // on the iso-loss curve that minimise 6ND + 2N*Dinf (ternary search on log N, as recompute.py)
  function chinRef(f,Nc){const a=f.be/(f.al+f.be),G=Math.pow(f.al*f.A/(f.be*f.B),1/(f.al+f.be)),D=Math.pow(Nc/G,(1-a)/a)/G;return {N:Nc,D,L:loss(f,Nc,D)}}
  const isoD=(f,L0,N)=>{const r=L0-f.E-f.A/Math.pow(N,f.al);return r>0?Math.pow(f.B/r,1/f.be):Infinity};
  function sardana(f,Nc,Dinf){const c=chinRef(f,Nc),tot=N=>6*N*isoD(f,c.L,N)+2*N*Dinf;let lo=Math.log(Nc*0.05),hi=Math.log(Nc);
    for(let i=0;i<200;i++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(tot(Math.exp(m1))<tot(Math.exp(m2)))hi=m2;else lo=m1}
    const N=Math.exp(lo),D=isoD(f,c.L,N),T0=6*c.N*c.D+2*c.N*Dinf,T=6*N*D+2*N*Dinf;
    return {N,D,train:6*N*D,inf:2*N*Dinf,tot:T,c,c0:{train:6*c.N*c.D,inf:2*c.N*Dinf,tot:T0},saving:T0-T,saving_frac:1-T/T0}}
  return {FITS,loss,opt,kaplan,isoN,over,floorN,chinRef,isoD,sardana};
})();
