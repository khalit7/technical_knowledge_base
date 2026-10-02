// ---- Approach 3 in the browser: Huber loss on log-loss, L-BFGS with SciPy's stopping rules, the paper's grid of starts ----
// p = [a, b, e, alpha, beta]; prediction log L^ = LSE(a - alpha log N, b - beta log D, e); A, B, E = exp(a), exp(b), exp(e).
// Objective: sum (or, the bug, mean) over runs of Huber_delta(log L^ - log L). Checked against SciPy in check_fit.mjs.
(function(root){
  function objGrad(p,X,delta,mean){const n=X.lnN.length,a=p[0],b=p[1],e=p[2],al=p[3],be=p[4],g=[0,0,0,0,0];let f=0;
    for(let i=0;i<n;i++){const t1=a-al*X.lnN[i],t2=b-be*X.lnD[i],m=Math.max(t1,t2,e),e1=Math.exp(t1-m),e2=Math.exp(t2-m),e3=Math.exp(e-m),s=e1+e2+e3;
      const r=m+Math.log(s)-X.lnL[i],ar=Math.abs(r),h=ar<=delta?.5*r*r:delta*(ar-.5*delta),d=ar<=delta?r:(r>0?delta:-delta);
      f+=h;const w1=e1/s,w2=e2/s,w3=e3/s;g[0]+=d*w1;g[1]+=d*w2;g[2]+=d*w3;g[3]-=d*w1*X.lnN[i];g[4]-=d*w2*X.lnD[i]}
    if(mean){f/=n;for(let k=0;k<5;k++)g[k]/=n}
    return [f,g]}
  const dotv=(u,v)=>{let s=0;for(let i=0;i<u.length;i++)s+=u[i]*v[i];return s};
  // L-BFGS (memory 10). Stops like SciPy's L-BFGS-B defaults: relative reduction (f_k - f_k+1)/max(|f_k|,|f_k+1|,1) <= 1e7 * 2.2e-16,
  // or largest gradient component <= 1e-5. Backtracking line search with the Armijo condition.
  function lbfgs(F,x0,o){o=o||{};const M=o.m||10,ftol=(o.factr||1e7)*2.220446049250313e-16,pg=o.pgtol||1e-5,maxit=o.maxiter||15000;
    let x=x0.slice(),[f,g]=F(x),S=[],Y=[],it=0,why='max iterations';
    if(Math.max(...g.map(Math.abs))<=pg)return {x,f,it,why:'gradient'};
    for(it=1;it<=maxit;it++){
      // two-loop recursion
      let q=g.slice();const al=[];
      for(let i=S.length-1;i>=0;i--){const r=1/dotv(Y[i],S[i]),a=r*dotv(S[i],q);al[i]=a;for(let k=0;k<5;k++)q[k]-=a*Y[i][k]}
      let gam=S.length?dotv(S[S.length-1],Y[Y.length-1])/dotv(Y[Y.length-1],Y[Y.length-1]):1/Math.sqrt(dotv(g,g));
      for(let k=0;k<5;k++)q[k]*=gam;
      for(let i=0;i<S.length;i++){const r=1/dotv(Y[i],S[i]),b=r*dotv(Y[i],q);for(let k=0;k<5;k++)q[k]+=S[i][k]*(al[i]-b)}
      let d=q.map(v=>-v),gd=dotv(g,d);if(!(gd<0)){d=g.map(v=>-v);gd=-dotv(g,g);S=[];Y=[]}
      let t=1,xn,fn,gn,ok=false;
      for(let ls=0;ls<40;ls++){xn=x.map((v,k)=>v+t*d[k]);[fn,gn]=F(xn);if(isFinite(fn)&&fn<=f+1e-4*t*gd){ok=true;break}t*=.5}
      if(!ok){why='line search';break}
      const s=xn.map((v,k)=>v-x[k]),y=gn.map((v,k)=>v-g[k]);if(dotv(s,y)>1e-12*dotv(y,y)){S.push(s);Y.push(y);if(S.length>M){S.shift();Y.shift()}}
      const red=(f-fn)/Math.max(Math.abs(f),Math.abs(fn),1);x=xn;f=fn;g=gn;
      if(red<=ftol){why='relative reduction';break}
      if(Math.max(...g.map(Math.abs))<=pg){why='gradient';break}}
    return {x,f,it,why}}
  function prep(pts){return {lnN:pts.map(p=>Math.log(p[0])),lnD:pts.map(p=>Math.log(p[1]/(6*p[0]))),lnL:pts.map(p=>Math.log(p[2]))}}
  // the paper's grid (Appendix D.2): alpha, beta in {0,0.5,...,2}, e in {-1,-0.5,...,1}, a, b in {0,5,...,25}; 4,500 starts
  function grid(full){const r=[],A=full?[0,5,10,15,20,25]:[0,10,20],E=full?[-1,-.5,0,.5,1]:[-1,0,1],P=full?[0,.5,1,1.5,2]:[0,.5,1,2];
    for(const a of A)for(const b of A)for(const e of E)for(const al of P)for(const be of P)r.push([a,b,e,al,be]);return r}
  const named=p=>{const A=Math.exp(p[0]),B=Math.exp(p[1]),E=Math.exp(p[2]),alpha=p[3],beta=p[4];return {A,B,E,alpha,beta,a_exp:beta/(alpha+beta)}};
  // frontier of L = E + A/N^alpha + B/D^beta under C = 6ND (the paper's Eq. 4)
  function frontier(f,C){const G=Math.pow(f.alpha*f.A/(f.beta*f.B),1/(f.alpha+f.beta)),a=f.beta/(f.alpha+f.beta),N=G*Math.pow(C/6,a),D=Math.pow(C/6,1-a)/G;return {N,D,tpp:D/N}}
  const Lhat=(f,N,D)=>f.E+f.A/Math.pow(N,f.alpha)+f.B/Math.pow(D,f.beta);
  // fit from a list of starts, in chunks so the page stays responsive; cb(progress) and done(best)
  function fitStarts(X,starts,o,cb,done){let best=null,i=0;const F=p=>objGrad(p,X,o.delta,o.mean);
    function chunk(){const t0=Date.now();while(i<starts.length&&Date.now()-t0<(o.sync?1e9:40)){const r=lbfgs(F,starts[i]);if(isFinite(r.f)&&(!best||r.f<best.f))best=Object.assign(r,{start:starts[i]});i++}
      if(cb)cb(i/starts.length,best);if(i<starts.length){if(o.sync)chunk();else setTimeout(chunk,0)}else done(best)}
    chunk()}
  root.FIT={objGrad,lbfgs,prep,grid,named,frontier,Lhat,fitStarts};
})(typeof window!=='undefined'?window:globalThis);
