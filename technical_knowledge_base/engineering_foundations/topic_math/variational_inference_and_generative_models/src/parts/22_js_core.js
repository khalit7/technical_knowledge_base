// ---- All maths as pure functions (also loaded by src/check_js.mjs in Node and compared with recompute.py) ----
window.VI=(function(){
  const LN2PI=Math.log(2*Math.PI);
  // mulberry32 uniforms and Box-Muller normals (one normal per two uniforms), as the two-moons sampler on Diffusion from zero
  function rng(seed){let a=seed>>>0;const r=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
    r.g=()=>{const u=1-r(),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};return r}
  const lognorm=(x,m,v)=>-0.5*(LN2PI+Math.log(v))-(x-m)*(x-m)/(2*v);
  const klg=(m1,v1,m2,v2)=>0.5*(Math.log(v2/v1)+(v1+(m1-m2)*(m1-m2))/v2-1);
  // ---- model A: z ~ N(0,1), x|z ~ N(z, s2) ----
  function modelA(x,s2,m,v){
    const logpx=lognorm(x,0,1+s2),pm=x/(1+s2),pv=s2/(1+s2);
    const eLik=-0.5*(LN2PI+Math.log(s2))-((x-m)*(x-m)+v)/(2*s2),ePri=-0.5*LN2PI-(m*m+v)/2,ent=0.5*(LN2PI+1+Math.log(v));
    const elbo=eLik+ePri+ent;return {logpx,pm,pv,eLik,ePri,ent,elbo,gap:klg(m,v,pm,pv),klPrior:klg(m,v,0,1),recon:eLik}}
  // ---- model B: z ~ N(0,1), x|z ~ N(z^2, s2), by quadrature on a grid ----
  function modelB(x,s2,m,v,n){n=n||2401;const lo=-6,hi=6,dz=(hi-lo)/(n-1);const z=new Float64Array(n),lj=new Float64Array(n);let mx=-1e300;
    for(let i=0;i<n;i++){z[i]=lo+i*dz;lj[i]=lognorm(x,z[i]*z[i],s2)+lognorm(z[i],0,1);if(lj[i]>mx)mx=lj[i]}
    let Z=0;for(let i=0;i<n;i++)Z+=Math.exp(lj[i]-mx);const logpx=Math.log(Z*dz)+mx;
    let elbo=0;for(let i=0;i<n;i++){const lq=lognorm(z[i],m,v);const q=Math.exp(lq);if(q>0)elbo+=q*(lj[i]-lq)*dz}
    const post=new Float64Array(n);for(let i=0;i<n;i++)post[i]=Math.exp(lj[i]-logpx);
    return {logpx,elbo,gap:logpx-elbo,z,post}}
  // ---- Gaussian KL to N(0, I), diagonal ----
  const klStd=(mu,sig)=>mu.reduce((s,m,i)=>s+0.5*(m*m+sig[i]*sig[i]-1-Math.log(sig[i]*sig[i])),0);
  // ---- CAVI for a Gaussian with unknown mean and precision (Bishop 2006, 10.1.3) ----
  function cavi(d,mu0,lam0,a0,b0,iters){const n=d.length,S=d.reduce((a,b)=>a+b,0),S2=d.reduce((a,b)=>a+b*b,0),xbar=S/n;
    const muN=(lam0*mu0+n*xbar)/(lam0+n),aN=a0+(n+1)/2;let Et=1;const h=[];
    for(let k=0;k<iters;k++){const lamN=(lam0+n)*Et;const Em=muN,Em2=muN*muN+1/lamN;
      const bN=b0+0.5*(S2-2*Em*S+n*Em2+lam0*(Em2-2*mu0*Em+mu0*mu0));h.push({lamN,bN,EtPrev:Et});Et=aN/bN;h[h.length-1].Et=Et}
    const sxx=S2-n*xbar*xbar,lp=lam0+n,ap=a0+n/2,bp=b0+0.5*sxx+lam0*n*(xbar-mu0)*(xbar-mu0)/(2*(lam0+n));
    return {muN,aN,h,exact:{mu:muN,lam:lp,a:ap,b:bp,varMu:bp/(lp*(ap-1)),Et:ap/bp,varT:ap/(bp*bp)}}}
  // ---- diffusion schedules (Ho et al. 2020 linear; Nichol and Dhariwal 2021 cosine, beta clipped at 0.999) ----
  const T=1000;const SCH={};
  (function(){const l=new Float64Array(T);let p=1;for(let t=0;t<T;t++){const b=1e-4+(0.02-1e-4)*t/(T-1);p*=1-b;l[t]=p}SCH.linear=l;
    const c=new Float64Array(T),f=t=>Math.pow(Math.cos((t/T+0.008)/1.008*Math.PI/2),2);let q=1;
    for(let t=1;t<=T;t++){const b=Math.min(Math.max(1-(f(t)/f(0))/(f(t-1)/f(0)),0),0.999);q*=1-b;c[t-1]=q}SCH.cosine=c})();
  const abar=(s,t)=>SCH[s][t-1];
  // data: two moons as in Diffusion from zero src/moons/diffusion.py (noise 0.06, centred at (0.5, 0.25), scaled by 1/0.7), drawn with the page RNG
  function moons(n,seed){const r=rng(seed),X=new Float64Array(2*n),Y=new Int8Array(n);
    for(let p=0;p<n;p++){const y=p%2,th=Math.PI*r();let a=y?1-Math.cos(th):Math.cos(th),b=y?0.5-Math.sin(th):Math.sin(th);
      a+=0.06*r.g();b+=0.06*r.g();X[2*p]=(a-0.5)/0.7;X[2*p+1]=(b-0.25)/0.7;Y[p]=y}return {X,Y}}
  return {rng,lognorm,klg,modelA,modelB,klStd,cavi,abar,SCH,T,moons};
})();
