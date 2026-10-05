// ---- All maths as pure functions (also loaded by src/check_js.mjs in Node and compared with recompute.py and data/sampler.py) ----
window.VI=(function(){
  const LN2PI=Math.log(2*Math.PI);
  // mulberry32 uniforms and Box-Muller normals (one normal per two uniforms), identical to data/sampler.py
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
  // ---- the two trained networks: int8 rows with per-row scales, SiLU MLP 21 -> W -> W -> W -> 2 ----
  const NF=8,FREQ=[];for(let k=0;k<NF;k++)FREQ.push(Math.pow(2,k)*Math.PI);
  function decode(L){return L.map(l=>{const raw=atob(l.q),w=new Float64Array(l.o*l.i);
    for(let r=0;r<l.o;r++)for(let c=0;c<l.i;c++){let q=raw.charCodeAt(r*l.i+c);if(q>127)q-=256;w[r*l.i+c]=q*l.s[r]}
    return {o:l.o,i:l.i,w,b:Float64Array.from(l.b)}})}
  const NETS={};
  function nets(){if(!NETS.eps&&window.VIDM){NETS.eps=decode(VIDM.eps.L);NETS.flow=decode(VIDM.flow.L)}return NETS}
  // forward pass for n points stored flat in X (x0,y0,x1,y1,...); writes 2n outputs into out
  function net(L,X,n,lev,c,out){const h0=new Float64Array(2+2*NF+3);for(let k=0;k<NF;k++){const a=lev*FREQ[k]/16;h0[2+k]=Math.sin(a);h0[2+NF+k]=Math.cos(a)}
    h0[2+2*NF+c]=1;let bufA=new Float64Array(64),bufB=new Float64Array(64);
    // precompute layer-1 contribution of the conditioning (same for every point)
    const L1=L[0],base=new Float64Array(L1.o);for(let r=0;r<L1.o;r++){let s=L1.b[r];for(let k=2;k<L1.i;k++)s+=L1.w[r*L1.i+k]*h0[k];base[r]=s}
    for(let p=0;p<n;p++){const x=X[2*p],y=X[2*p+1];let cur=bufA.length<L1.o?new Float64Array(L1.o):bufA;
      for(let r=0;r<L1.o;r++){const s=base[r]+L1.w[r*L1.i]*x+L1.w[r*L1.i+1]*y;cur[r]=s/(1+Math.exp(-s))}
      let nxt=bufB;
      for(let li=1;li<L.length;li++){const l=L[li];if(nxt.length<l.o)nxt=new Float64Array(l.o);
        for(let r=0;r<l.o;r++){let s=l.b[r];const off=r*l.i;for(let k=0;k<l.i;k++)s+=l.w[off+k]*cur[k];nxt[r]=li<L.length-1?s/(1+Math.exp(-s)):s}
        const t=cur;cur=nxt;nxt=t}
      out[2*p]=cur[0];out[2*p+1]=cur[1]}}
  function guided(L,X,n,lev,c,w,out,tmp){if(c===2||w===0){net(L,X,n,lev,c,out);return}
    net(L,X,n,lev,c,out);net(L,X,n,lev,2,tmp);for(let i=0;i<2*n;i++)out[i]=(1+w)*out[i]-w*tmp[i]}
  const tsteps=S=>{const a=[];if(S<=1)return[T];for(let i=0;i<S;i++)a.push(Math.round(1+(T-1)*i/(S-1)));return a};
  // A sampler as a step function, so long runs can be sliced across animation frames.
  // o: {method:'ddpm'|'ddim'|'flow', sched, S, c, w, n, seed, X0 (optional starting noise)}
  function sampler(o){const N=nets(),r=rng(o.seed),n=o.n,X=new Float64Array(2*n),E=new Float64Array(2*n),U=new Float64Array(2*n);
    if(o.X0)X.set(o.X0);else for(let i=0;i<2*n;i++)X[i]=r.g();
    const ts=tsteps(o.S),ab=SCH[o.sched||'linear'];let k=o.method==='flow'?0:o.S-1,done=false;
    function step(){if(done)return false;
      if(o.method==='flow'){const t=1-k/o.S;guided(N.flow,X,n,2*t-1,o.c,o.w,E,U);for(let i=0;i<2*n;i++)X[i]-=E[i]/o.S;k++;if(k>=o.S)done=true;return !done}
      const t=ts[k],at=ab[t-1],ap=k>0?ab[ts[k-1]-1]:1;guided(N.eps,X,n,Math.log(at/(1-at))/12,o.c,o.w,E,U);
      if(o.method==='ddim'){for(let i=0;i<2*n;i++){let x0=(X[i]-Math.sqrt(1-at)*E[i])/Math.sqrt(at);x0=Math.max(-3,Math.min(3,x0));const e=(X[i]-Math.sqrt(at)*x0)/Math.sqrt(1-at);X[i]=Math.sqrt(ap)*x0+Math.sqrt(1-ap)*e}}
      else{const al=at/ap,be=1-al,sig=k>0?Math.sqrt((1-ap)/(1-at)*be):0;
        if(k>0){for(let i=0;i<2*n;i++)U[i]=0;for(let p=0;p<n;p++){U[2*p]=r.g();U[2*p+1]=r.g()}}
        const c0=Math.sqrt(ap)*be/(1-at),c1=Math.sqrt(al)*(1-ap)/(1-at);for(let i=0;i<2*n;i++){let x0=(X[i]-Math.sqrt(1-at)*E[i])/Math.sqrt(at);x0=Math.max(-3,Math.min(3,x0));X[i]=c0*x0+c1*X[i]+(k>0?sig*U[i]:0)}}
      k--;if(k<0)done=true;return !done}
    return {X,step,get done(){return done},get k(){return k},total:o.S}}
  function sample(o){const s=sampler(o);while(s.step()){}return s.X}
  // ---- evaluation: distance to the noiseless arcs (standardised units), as data/sampler.py ----
  const ARC=[[],[]];for(let i=0;i<4000;i++){const th=Math.PI*i/3999;ARC[0].push([(Math.cos(th)-0.5)/0.7,(Math.sin(th)-0.25)/0.7]);ARC[1].push([(1-Math.cos(th)-0.5)/0.7,(0.5-Math.sin(th)-0.25)/0.7])}
  function score(X,c,thr){thr=thr||0.2;const n=X.length/2;let on=0,match=0;
    for(let p=0;p<n;p++){const d=[0,1].map(a=>{let m=1e9;for(const q of ARC[a]){const dx=X[2*p]-q[0],dy=X[2*p+1]-q[1],dd=dx*dx+dy*dy;if(dd<m)m=dd}return Math.sqrt(m)});
      if(Math.min(d[0],d[1])<thr)on++;if(c<2&&(d[0]<=d[1]?0:1)===c)match++}
    return {on:on/n,match:c<2?match/n:null}}
  // data: two moons as in data/diffusion.py (noise 0.06, centred at (0.5, 0.25), scaled by 1/0.7), drawn with the page RNG
  function moons(n,seed){const r=rng(seed),X=new Float64Array(2*n),Y=new Int8Array(n);
    for(let p=0;p<n;p++){const y=p%2,th=Math.PI*r();let a=y?1-Math.cos(th):Math.cos(th),b=y?0.5-Math.sin(th):Math.sin(th);
      a+=0.06*r.g();b+=0.06*r.g();X[2*p]=(a-0.5)/0.7;X[2*p+1]=(b-0.25)/0.7;Y[p]=y}return {X,Y}}
  return {rng,lognorm,klg,modelA,modelB,klStd,cavi,abar,SCH,T,nets,net,guided,tsteps,sampler,sample,score,moons,decode};
})();
