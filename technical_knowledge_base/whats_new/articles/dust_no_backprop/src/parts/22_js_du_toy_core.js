// ---- The toy's arithmetic (prefix du): three zeroth-order estimates of one layer's weight gradient against the exact one.
// Runs in the page (window.DUT) and in node (src/toy/record.mjs loads this file to write the recorded curves);
// src/toy/toy_port.py is an independent Python port that check_page.mjs compares against.
// Network: x (16) -> h = W1 x (width H) -> tanh -> z = W2 tanh(h) (8 classes) -> cross-entropy, on T = 64 tokens.
// The estimated gradient is dL/dW1 for L = the sum of the 64 token losses. One draw = one forward pass of the batch.
//   'w'  weight-space ES: perturb W1 by sigma*E, reward = change in the batch loss, estimate = mean(reward*E)/sigma
//   'a1' activation noise at every token, one reward per pass (the batch loss change), estimate g_t = mean(reward*a_t)/sigma
//   'at' activation noise at every token, each token rewarded by its own loss change (Dust's per-token credit, gamma 0)
// 'a1' and 'at' use the same noise: only the credit differs. Baselines are the clean loss (Dust centres on the mean over draws).
(function(G){
  function rng(seed){let a=seed>>>0;
    const u=()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296};
    return {u,n:()=>{const u1=1-u(),u2=u();return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)}}}
  const DIN=16,C=8,T=64,SIG=0.01,KS=[1,2,4,8,16,32,64,128,256,512,1024,2048,4096];
  function setup(H,seed){const r=rng(seed*1000+H);const X=[],Y=[],W1=[],W2=[];
    for(let t=0;t<T;t++){const x=[];for(let i=0;i<DIN;i++)x.push(r.n());X.push(x);Y.push(Math.floor(r.u()*C))}
    for(let j=0;j<H;j++){const w=[];for(let i=0;i<DIN;i++)w.push(r.n()/Math.sqrt(DIN));W1.push(w)}
    for(let c=0;c<C;c++){const w=[];for(let j=0;j<H;j++)w.push(r.n()/Math.sqrt(H));W2.push(w)}
    return {H,X,Y,W1,W2,r}}
  function pre(W1,x,H){const h=new Float64Array(H);for(let j=0;j<H;j++){let s=0;const w=W1[j];for(let i=0;i<DIN;i++)s+=w[i]*x[i];h[j]=s}return h}
  function lossFromH(W2,h,y,H){const a=new Float64Array(H);for(let j=0;j<H;j++)a[j]=Math.tanh(h[j]);
    const z=new Float64Array(C);let m=-1e300;for(let c=0;c<C;c++){let s=0;const w=W2[c];for(let j=0;j<H;j++)s+=w[j]*a[j];z[c]=s;if(s>m)m=s}
    let se=0;for(let c=0;c<C;c++)se+=Math.exp(z[c]-m);return {loss:m+Math.log(se)-z[y],a,z,m,se}}
  // exact dL/dW1 (backprop by hand: dz = p - onehot, dh = W2^T dz * (1 - tanh^2), dW1 = sum_t dh_t x_t^T)
  function exact(S){const {H,X,Y,W1,W2}=S,Gr=new Float64Array(H*DIN),Hs=[],L0=[];
    for(let t=0;t<T;t++){const h=pre(W1,X[t],H);Hs.push(h);const f=lossFromH(W2,h,Y[t],H);L0.push(f.loss);
      const dz=new Float64Array(C);for(let c=0;c<C;c++)dz[c]=Math.exp(f.z[c]-f.m)/f.se-(c===Y[t]?1:0);
      for(let j=0;j<H;j++){let s=0;for(let c=0;c<C;c++)s+=W2[c][j]*dz[c];const d=s*(1-f.a[j]*f.a[j]);for(let i=0;i<DIN;i++)Gr[j*DIN+i]+=d*X[t][i]}}
    return {G:Gr,Hs,L0}}
  function cos(a,b){let ab=0,aa=0,bb=0;for(let i=0;i<a.length;i++){ab+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa>0&&bb>0?ab/Math.sqrt(aa*bb):0}
  // one run: cosines of the three estimates at every K in KS (prefix sums of the same 4,096 draws); also a few entries of one token's estimate
  function run(H,seed){const S=setup(H,seed),{X,Y,W1,W2}=S,E0=exact(S),Kmax=KS[KS.length-1],out={w:[],a1:[],at:[]};
    const r=rng(seed*7919+H*31+1);
    const L0sum=E0.L0.reduce((s,v)=>s+v,0);
    const accW=new Float64Array(H*DIN),acc1=[],accT=[];for(let t=0;t<T;t++){acc1.push(new Float64Array(H));accT.push(new Float64Array(H))}
    const tok=[];let ki=0;
    for(let k=1;k<=Kmax;k++){
      // weight-space draw: W1 + sigma E, one batch loss
      const E=new Float64Array(H*DIN);for(let i=0;i<E.length;i++)E[i]=r.n();
      const Wp=[];for(let j=0;j<H;j++){const w=[];for(let i=0;i<DIN;i++)w.push(W1[j][i]+SIG*E[j*DIN+i]);Wp.push(w)}
      let Lw=0;for(let t=0;t<T;t++)Lw+=lossFromH(W2,pre(Wp,X[t],H),Y[t],H).loss;
      const rw=Lw-L0sum;for(let i=0;i<E.length;i++)accW[i]+=rw*E[i];
      // activation draw: h_t + sigma a_t at every token
      const A=[],dl=new Float64Array(T);let Ls=0;
      for(let t=0;t<T;t++){const a=new Float64Array(H),hp=new Float64Array(H);for(let j=0;j<H;j++){a[j]=r.n();hp[j]=E0.Hs[t][j]+SIG*a[j]}
        A.push(a);const l=lossFromH(W2,hp,Y[t],H).loss;dl[t]=l-E0.L0[t];Ls+=dl[t]}
      for(let t=0;t<T;t++){const a=A[t];for(let j=0;j<H;j++){acc1[t][j]+=Ls*a[j];accT[t][j]+=dl[t]*a[j]}}
      if(k===KS[ki]){const f=1/(k*SIG);
        const gw=accW.map(v=>v*f),g1=new Float64Array(H*DIN),gt=new Float64Array(H*DIN);
        for(let t=0;t<T;t++)for(let j=0;j<H;j++){const v1=acc1[t][j]*f,vt=accT[t][j]*f;for(let i=0;i<DIN;i++){g1[j*DIN+i]+=v1*X[t][i];gt[j*DIN+i]+=vt*X[t][i]}}
        out.w.push(cos(gw,E0.G));out.a1.push(cos(g1,E0.G));out.at.push(cos(gt,E0.G));
        tok.push([0,1,2,3].map(j=>accT[0][j]*f));ki++}}
    // the exact error at token 0's hidden pre-activations (first four entries), for the worked numbers
    const t0=lossFromH(W2,E0.Hs[0],Y[0],H),dz=[];for(let c=0;c<C;c++)dz.push(Math.exp(t0.z[c]-t0.m)/t0.se-(c===Y[0]?1:0));
    const g0=[0,1,2,3].map(j=>{let s=0;for(let c=0;c<C;c++)s+=W2[c][j]*dz[c];return s*(1-t0.a[j]*t0.a[j])});
    return {H,seed,K:KS.slice(),cos:out,tok0:{exact:g0,est:tok}}}
  // fit the post's law cos(K) = cmax / sqrt(1 + c/K) with cmax = 1 (the toy's estimates are unbiased, so their ceiling is 1):
  // 1/cos^2 - 1 = c/K, least squares through the origin in x = 1/K over the points with cos >= 0.25 (below that the ratio is noise)
  function fit(K,cs){let sxy=0,sxx=0;for(let i=0;i<K.length;i++){if(!(cs[i]>=0.25))continue;const x=1/K[i],y=1/(cs[i]*cs[i])-1;sxy+=x*y;sxx+=x*x}
    return {cmax:1,c:sxy/sxx}}
  G.DUT={rng,setup,exact,run,fit,KS,DIN,C,T,SIG};
})(typeof window!=='undefined'?window:globalThis);
