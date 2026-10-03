// ---- Core maths (pure functions, no DOM): penalised least squares on the diabetes data, the lasso path by LARS,
// elastic net by coordinate descent, gradient descent from zero (early stopping), a seeded PRNG, and a small MLP
// forward pass for the dropout tab. Checked against scikit-learn and PyTorch by check_core.mjs + recompute.py.
// Convention (glmnet and scikit-learn's Lasso/ElasticNet): minimise (1/2n)||y - Xb||^2 + lam*(rho*|b|_1 + (1-rho)/2*|b|^2).
// Ridge is rho = 0; scikit-learn's Ridge(alpha) uses ||y - Xb||^2 + alpha*|b|^2, so alpha = n*lam.
(function(G){
  const RG={};
  // mulberry32: a small seeded generator, replicated in recompute.py
  RG.rng=function(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
  RG.parse=function(raw){const rows=raw.split(';').map(r=>r.split(',').map(Number));
    return {X:rows.map(r=>r.slice(0,10)),y:rows.map(r=>r[10])}};
  // centre each column and scale it to unit length (Efron et al.'s (1.1)); y centred. Stats from the rows in idx.
  RG.stdz=function(X,y,idx){const p=X[0].length,n=idx.length,mu=new Array(p).fill(0),sc=new Array(p).fill(0);let my=0;
    idx.forEach(i=>{for(let j=0;j<p;j++)mu[j]+=X[i][j];my+=y[i]});for(let j=0;j<p;j++)mu[j]/=n;my/=n;
    idx.forEach(i=>{for(let j=0;j<p;j++)sc[j]+=(X[i][j]-mu[j])**2});for(let j=0;j<p;j++)sc[j]=Math.sqrt(sc[j])||1;
    return {mu,sc,my,f:(rows)=>rows.map(i=>X[i].map((v,j)=>(v-mu[j])/sc[j])),g:(rows)=>rows.map(i=>y[i]-my)}};
  // sufficient statistics: Gram matrix, X'y, y'y, n
  RG.stats=function(Xs,ys){const p=Xs[0].length,Gm=[...Array(p)].map(()=>new Array(p).fill(0)),c=new Array(p).fill(0);let yy=0;
    for(let i=0;i<Xs.length;i++){const r=Xs[i];for(let j=0;j<p;j++){c[j]+=r[j]*ys[i];for(let k=j;k<p;k++)Gm[j][k]+=r[j]*r[k]}yy+=ys[i]*ys[i]}
    for(let j=0;j<p;j++)for(let k=0;k<j;k++)Gm[j][k]=Gm[k][j];return {G:Gm,c,yy,n:Xs.length}};
  // solve A x = b (Gaussian elimination, partial pivoting)
  RG.solve=function(A,b){const n=b.length,M=A.map((r,i)=>r.slice().concat([b[i]]));
    for(let k=0;k<n;k++){let m=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[m][k]))m=i;[M[k],M[m]]=[M[m],M[k]];
      for(let i=k+1;i<n;i++){const f=M[i][k]/M[k][k];if(f)for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j]}}
    const x=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=M[i][n];for(let j=i+1;j<n;j++)s-=M[i][j]*x[j];x[i]=s/M[i][i]}return x};
  RG.rss=function(S,b){let q=0,l=0;for(let j=0;j<b.length;j++){l+=b[j]*S.c[j];for(let k=0;k<b.length;k++)q+=b[j]*S.G[j][k]*b[k]}return S.yy-2*l+q};
  RG.ols=function(S){return RG.solve(S.G,S.c)};
  RG.ridge=function(S,lam){const n=S.n,A=S.G.map((r,j)=>r.map((v,k)=>v/n+(j===k?lam:0)));return RG.solve(A,S.c.map(v=>v/n))};
  // elastic net (and lasso, rho = 1) by cyclic coordinate descent; warm start b0
  RG.enet=function(S,lam,rho,b0,tol){const p=S.c.length,n=S.n,b=b0?b0.slice():new Array(p).fill(0),l1=lam*rho,l2=lam*(1-rho);tol=tol||1e-13;
    const r=S.c.map((cj,j)=>cj-S.G[j].reduce((s,g,k)=>s+g*b[k],0)); // r = c - G b
    for(let it=0;it<100000;it++){let mx=0;
      for(let j=0;j<p;j++){const gjj=S.G[j][j],z=(r[j]+gjj*b[j])/n;const nb=Math.sign(z)*Math.max(0,Math.abs(z)-l1)/(gjj/n+l2);const d=nb-b[j];
        if(d!==0){for(let k=0;k<p;k++)r[k]-=S.G[k][j]*d;b[j]=nb;mx=Math.max(mx,Math.abs(d))}}
      if(mx<tol)break}
    return b};
  // the exact lasso path by least angle regression with the lasso modification (Efron et al. 2004, section 3.1).
  // Returns knots [{lam, b}] from lam_max (b = 0) down to lam = 0 (OLS); the path is linear in lam between knots.
  RG.lassoPath=function(S){const p=S.c.length,n=S.n,G=S.G;let b=new Array(p).fill(0),C=S.c.slice();
    let Cmax=Math.max(...C.map(Math.abs));const knots=[{lam:Cmax/n,b:b.slice(),ev:''}];const A=[];
    const j0=C.map(Math.abs).indexOf(Cmax);A.push(j0);knots[0].ev='+'+j0;
    for(let step=0;step<4*p&&Cmax>1e-10;step++){
      const s=A.map(j=>Math.sign(C[j]));const GA=A.map(j=>A.map(k=>G[j][k]));const w=RG.solve(GA,s);
      const AA=1/Math.sqrt(s.reduce((t,v,i)=>t+v*w[i],0));const wA=w.map(v=>v*AA);
      const a=[...Array(p)].map((_,j)=>A.reduce((t,k,i)=>t+G[j][k]*wA[i],0));
      let gam=Cmax/AA,add=-1,drop=-1;
      for(let j=0;j<p;j++){if(A.includes(j))continue;
        for(const g of [(Cmax-C[j])/(AA-a[j]),(Cmax+C[j])/(AA+a[j])])if(g>1e-12&&g<gam){gam=g;add=j}}
      A.forEach((j,i)=>{const g=-b[j]/wA[i];if(g>1e-12&&g<gam){gam=g;drop=j;add=-1}});
      A.forEach((j,i)=>{b[j]+=gam*wA[i]});for(let j=0;j<p;j++)C[j]-=gam*a[j];Cmax-=gam*AA;if(Cmax<1e-9)Cmax=0;
      let ev='';
      if(drop>=0){b[drop]=0;A.splice(A.indexOf(drop),1);ev='-'+drop}else if(add>=0){A.push(add);ev='+'+add}
      knots.push({lam:Cmax/n,b:b.slice(),ev});
      if(Cmax===0)break}
    return knots};
  // coefficients on the path at any lam (linear interpolation between knots is exact for the lasso)
  RG.pathAt=function(knots,lam){if(lam>=knots[0].lam)return knots[0].b.slice();
    for(let i=1;i<knots.length;i++){const k0=knots[i-1],k1=knots[i];if(lam>=k1.lam){const t=(k0.lam-lam)/(k0.lam-k1.lam||1);return k0.b.map((v,j)=>v+t*(k1.b[j]-v))}}
    return knots[knots.length-1].b.slice()};
  // gradient descent from b = 0 on (1/2n)||y - Xb||^2 with step eta: the early-stopping path; returns b after each step
  RG.gd=function(S,eta,steps){const p=S.c.length,n=S.n;let b=new Array(p).fill(0);const out=[b.slice()];
    for(let t=0;t<steps;t++){const g=S.c.map((cj,j)=>(cj-S.G[j].reduce((s,v,k)=>s+v*b[k],0))/n);b=b.map((v,j)=>v+eta*g[j]);out.push(b.slice())}return out};
  // largest eigenvalue of a symmetric matrix by power iteration (for the stable step size)
  RG.lmax=function(M){let v=M.map(()=>1),l=0;for(let i=0;i<500;i++){const w=M.map(r=>r.reduce((s,x,k)=>s+x*v[k],0));l=Math.hypot(...w);v=w.map(x=>x/l)}return l};
  // 2 x 2 helpers for the geometry panel
  RG.sub=function(S,ix){return {G:ix.map(j=>ix.map(k=>S.G[j][k])),c:ix.map(j=>S.c[j]),yy:S.yy,n:S.n}};
  // random train/test split: Fisher-Yates with the seeded generator; first m indices train
  RG.split=function(N,m,seed){const r=RG.rng(seed),ix=[...Array(N).keys()];for(let i=N-1;i>0;i--){const j=Math.floor(r()*(i+1));[ix[i],ix[j]]=[ix[j],ix[i]]}return {tr:ix.slice(0,m),te:ix.slice(m)}};
  // held-out mean squared error of a fit made on the standardised training rows, on the test rows (in y units)
  RG.heldout=function(D,sp){const z=RG.stdz(D.X,D.y,sp.tr),S=RG.stats(z.f(sp.tr),z.g(sp.tr)),T=RG.stats(z.f(sp.te),z.g(sp.te));
    // test rows are centred with the training mean of y, so T measures error on the test set directly
    return {S,T,z}};
  RG.mse=function(T,b){return RG.rss(T,b)/T.n};
  // ---- small MLP for the dropout tab: int8 weights with one scale per output unit ----
  RG.mlp=function(M){ // M: {sizes:[64,h1,h2,10], W:[base64 int8...], sc:[[...]], b:[[...]]}
    const L=[];for(let l=0;l<M.sizes.length-1;l++){const nin=M.sizes[l],nout=M.sizes[l+1],bin=atob(M.W[l]),W=new Float64Array(nin*nout);
      for(let o=0;o<nout;o++)for(let i=0;i<nin;i++){let q=bin.charCodeAt(o*nin+i);if(q>127)q-=256;W[o*nin+i]=q*M.sc[l][o]}
      L.push({nin,nout,W,b:M.b[l]})}
    return L};
  // forward pass. keep: per-layer keep probabilities applied to that layer's INPUT (layer 0 = the pixels);
  // mode 'scale' = weight scaling (inference, inverted dropout: plain pass), 'mask' = one thinned net with masks from rnd
  RG.fwd=function(L,x,keep,rnd,masks){let h=Array.from(x);const acts=[];
    for(let l=0;l<L.length;l++){const P=L[l];let hin=h;
      if(rnd&&keep[l]<1){hin=h.map((v,i)=>{const k=rnd()<keep[l];if(masks)(masks[l]=masks[l]||[])[i]=k;return k?v/keep[l]:0})}
      const z=new Array(P.nout);for(let o=0;o<P.nout;o++){let s=P.b[o];const off=o*P.nin;for(let i=0;i<P.nin;i++)s+=P.W[off+i]*hin[i];z[o]=s}
      if(l<L.length-1){h=z.map(v=>v>0?v:0);acts.push(h)}else{const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),t=e.reduce((a,b)=>a+b,0);return {p:e.map(v=>v/t),z,acts}}}
  };
  G.RG=RG;
})(typeof window!=='undefined'?window:globalThis);
