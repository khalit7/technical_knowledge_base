// ---- Noisy quadratic model (Zhang et al. 2019): exact expected loss of SGD under a schedule, and of schedule-free SGD ----
// d = 10 coordinates, curvatures h_i = 10^(-2i/9) (condition number 100), x_0 = 1, gradient noise with covariance sigma^2 H.
// Everything is linear in the noise, so the mean and variance of each coordinate follow exact recursions (no sampling).
// checks/nqm_check.py compares these with 4,000 seeded runs of torch.optim.SGD and schedulefree.SGDScheduleFree.
(function(G){
  const D=10,H=[];for(let i=0;i<D;i++)H.push(Math.pow(10,-2*i/(D-1)));
  const SIG=0.3;
  // learning-rate multiplier at step t (0-based) for a run of T steps
  function mult(kind,t,T){
    if(kind==='cosine')return 0.5*(1+Math.cos(Math.PI*t/T));
    if(kind==='wsd'){const Dd=Math.round(0.2*T),s=T-Dd;return t<s?1:1-Math.sqrt((t-s)/Dd)}
    return 1;
  }
  // SGD: per coordinate mean mu and variance s; returns expected loss after every step (index 0 = start)
  function sgd(kind,T,lr){const mu=H.map(()=>1),s=H.map(()=>0);const L=new Float64Array(T+1);
    const loss=()=>{let a=0;for(let i=0;i<D;i++)a+=0.5*H[i]*(mu[i]*mu[i]+s[i]);return a};L[0]=loss();
    for(let t=0;t<T;t++){const e=lr*mult(kind,t,T);for(let i=0;i<D;i++){const r=1-e*H[i];mu[i]*=r;s[i]=r*r*s[i]+e*e*SIG*SIG*H[i]}L[t+1]=loss()}
    return L}
  // WSD branch: constant to step S = T - round(0.2T), then the 1-sqrt cooldown; the constant prefix is shared by every branch
  // schedule-free SGD (momentum beta): state (y, z) per coordinate, mean vector and 2x2 covariance; loss at x = y/beta + (1 - 1/beta) z
  function sf(T,lr,beta){beta=beta||0.9;const L=new Float64Array(T+1);const w0=1/beta,w1=1-1/beta;
    const m=H.map(()=>[1,1]),P=H.map(()=>[0,0,0]);// P = [Vyy, Vyz, Vzz]
    const loss=()=>{let a=0;for(let i=0;i<D;i++){const mx=w0*m[i][0]+w1*m[i][1];const vx=w0*w0*P[i][0]+2*w0*w1*P[i][1]+w1*w1*P[i][2];a+=0.5*H[i]*(mx*mx+vx)}return a};
    L[0]=loss();
    for(let k=0;k<T;k++){const c=1/(k+1),a=lr*(beta*(1-c)-1);
      for(let i=0;i<D;i++){const h=H[i];const A00=1-c+a*h,A01=c,A10=-lr*h,A11=1,b0=a,b1=-lr;
        const y=m[i][0],z=m[i][1];m[i]=[A00*y+A01*z,A10*y+A11*z];
        const [p00,p01,p11]=P[i];
        // A P A^T
        const q00=A00*(A00*p00+A01*p01)+A01*(A00*p01+A01*p11);
        const q01=A00*(A10*p00+A11*p01)+A01*(A10*p01+A11*p11);
        const q11=A10*(A10*p00+A11*p01)+A11*(A10*p01+A11*p11);
        const n=SIG*SIG*h;P[i]=[q00+b0*b0*n,q01+b0*b1*n,q11+b1*b1*n]}
      L[k+1]=loss()}
    return L}
  G.NQM={D,H,SIG,mult,sgd,sf};
})(typeof window!=='undefined'?window:globalThis);
