// ---- Loss maths: every formula the page plots or fits, in double precision. Pure functions, no DOM. ----
// Checked offline against PyTorch and SciPy by check_core.mjs + recompute.py (see src/README.md).
// Regression convention: u = y - yhat (the error). "Pull" psi(u) = -d loss / d yhat = d loss / d u:
// how hard a point drags the prediction towards itself. PyTorch conventions: MSELoss = u^2, L1Loss = |u|,
// HuberLoss(delta) = u^2/2 inside delta, delta(|u| - delta/2) outside.
(function(root){
const sgn=v=>v>0?1:v<0?-1:0;
const logcosh=u=>{const a=Math.abs(u);return a+Math.log1p(Math.exp(-2*a))-Math.LN2};
// ---- regression losses: rho(u, p) and psi(u, p); p = {delta, tau, y}
const REG={
  mse:{name:'MSE',rho:u=>u*u,psi:u=>2*u,w0:2},
  mae:{name:'MAE',rho:u=>Math.abs(u),psi:u=>sgn(u)},
  huber:{name:'Huber',rho:(u,p)=>{const a=Math.abs(u),d=p.delta;return a<=d?0.5*u*u:d*(a-0.5*d)},psi:(u,p)=>Math.max(-p.delta,Math.min(p.delta,u)),w0:1},
  logcosh:{name:'Log-cosh',rho:u=>logcosh(u),psi:u=>Math.tanh(u),w0:1},
  pinball:{name:'Pinball',rho:(u,p)=>u>=0?p.tau*u:(p.tau-1)*u,psi:(u,p)=>u>0?p.tau:u<0?p.tau-1:0},
  mape:{name:'MAPE',rho:(u,p)=>Math.abs(u)/Math.abs(p.y),psi:(u,p)=>sgn(u)/Math.abs(p.y)}
};
// second derivative of each smooth loss (what a Newton or XGBoost-style step divides by)
const HESS={mse:()=>2,huber:(u,p)=>Math.abs(u)<=p.delta?1:0,logcosh:u=>{const c=Math.cosh(u);return isFinite(c)?1/(c*c):0}};

// ---- straight-line fits y = a + b x
function fitLS(x,y,w){const n=x.length;let W=0,sx=0,sy=0;for(let i=0;i<n;i++){const wi=w?w[i]:1;W+=wi;sx+=wi*x[i];sy+=wi*y[i]}
  const mx=sx/W,my=sy/W;let sxx=0,sxy=0;for(let i=0;i<n;i++){const wi=w?w[i]:1,dx=x[i]-mx;sxx+=wi*dx*dx;sxy+=wi*dx*(y[i]-my)}
  const b=sxx>0?sxy/sxx:0;return {a:my-b*mx,b}}
// iteratively reweighted least squares, weight psi(u)/u: exact minimiser for convex rho with psi(u)/u non-increasing (Huber, log-cosh)
function fitIRLS(x,y,key,p){const L=REG[key];let f=fitLS(x,y);const n=x.length,w=new Array(n);
  for(let it=0;it<2000;it++){for(let i=0;i<n;i++){const u=y[i]-(f.a+f.b*x[i]);w[i]=Math.abs(u)<1e-12?L.w0:L.psi(u,p)/u}
    const g=fitLS(x,y,w);const d=Math.abs(g.a-f.a)+Math.abs(g.b-f.b);f=g;if(d<1e-14*(1+Math.abs(f.a)+Math.abs(f.b)))break}
  return f}
// weighted pinball (tau = 0.5: L1; weights 1/|y|: MAPE): the optimum of this linear programme is a line through two data points,
// so every pair is tried and the best kept (exact; ties keep the first found)
function fitL1(x,y,tau,wt){const n=x.length;let best=null,bv=Infinity;
  const obj=(a,b)=>{let s=0;for(let k=0;k<n;k++){const u=y[k]-(a+b*x[k]);s+=(wt?wt[k]:1)*(u>=0?tau*u:(tau-1)*u)}return s};
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(x[i]===x[j])continue;const b=(y[j]-y[i])/(x[j]-x[i]),a=y[i]-b*x[i],v=obj(a,b);
    if(best===null||v<bv-1e-12*Math.max(1,Math.abs(bv))){bv=v;best={a,b,i,j}}}
  if(!best){const c=wquant(y,tau,wt);best={a:c,b:0}}return best}
function fit(key,x,y,p){
  if(key==='mse')return fitLS(x,y);
  if(key==='huber'||key==='logcosh')return fitIRLS(x,y,key,p);
  if(key==='mae')return fitL1(x,y,0.5);
  if(key==='pinball')return fitL1(x,y,p.tau);
  if(key==='mape')return fitL1(x,y,0.5,y.map(v=>1/Math.abs(v)));
}
function objective(key,x,y,f,p){let s=0;for(let i=0;i<x.length;i++){const u=y[i]-(f.a+f.b*x[i]);s+=REG[key].rho(u,Object.assign({},p,{y:y[i]}))}return s/x.length}
// pull of each point on the intercept and on the slope at line f (the gradient of the summed loss is minus these sums)
function pulls(key,x,y,f,p){return x.map((xi,i)=>{const u=y[i]-(f.a+f.b*xi),ps=REG[key].psi(u,Object.assign({},p,{y:y[i]}));return {u,psi:ps,torque:ps*xi}})}

// ---- constant forecasts (location): the number each loss picks for a sample
function wquant(y,tau,wt){const idx=y.map((v,i)=>i).sort((i,j)=>y[i]-y[j]);let W=0;for(const i of idx)W+=wt?wt[i]:1;
  let c=0;for(const i of idx){c+=wt?wt[i]:1;if(c>=tau*W-1e-12*W)return y[i]}return y[idx[idx.length-1]]}
function mean(y){let s=0;for(const v of y)s+=v;return s/y.length}
function mlocation(y,psi){// solve sum psi(y - c) = 0, psi non-decreasing: bisection
  let lo=Math.min(...y),hi=Math.max(...y);const g=c=>{let s=0;for(const v of y)s+=psi(v-c);return s};
  for(let k=0;k<200;k++){const m=(lo+hi)/2;if(g(m)>0)lo=m;else hi=m}return (lo+hi)/2}
function location(key,y,p){
  if(key==='mse')return mean(y);
  if(key==='mae')return wquant(y,0.5);
  if(key==='pinball')return wquant(y,p.tau);
  if(key==='mape')return wquant(y,0.5,y.map(v=>1/Math.abs(v)));
  if(key==='huber')return mlocation(y,u=>REG.huber.psi(u,p));
  if(key==='logcosh')return mlocation(y,u=>Math.tanh(u));
}
function meanLoss(key,y,c,p){let s=0;for(const v of y)s+=REG[key].rho(v-c,Object.assign({},p,{y:v}));return s/y.length}

// ---- classification on the margin m = y f(x), y in {-1, +1}
const sig=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const softplus=z=>z>0?z+Math.log1p(Math.exp(-z)):Math.log1p(Math.exp(z));
const MARG={
  zero_one:{name:'0-1',phi:m=>m<=0?1:0,pull:()=>0},
  hinge:{name:'Hinge',phi:m=>Math.max(0,1-m),pull:m=>m<1?1:0},
  sqhinge:{name:'Squared hinge',phi:m=>{const t=Math.max(0,1-m);return t*t},pull:m=>2*Math.max(0,1-m)},
  logistic:{name:'Logistic (BCE)',phi:m=>softplus(-m),pull:m=>sig(-m)},
  exp:{name:'Exponential',phi:m=>Math.exp(-m),pull:m=>Math.exp(-m)},
  focal:{name:'Focal',phi:(m,g)=>{const p=sig(m),lp=-softplus(-m);return -Math.pow(1-p,g)*lp},
    pull:(m,g)=>{const p=sig(m),q=sig(-m),lp=-softplus(-m);return Math.pow(q,g+1)-g*p*Math.pow(q,g)*lp}}
};
// the score f* that minimises the expected loss when P(y = +1 | x) = eta, and the probability it implies
function condRisk(key,f,eta,g){const L=MARG[key];return eta*L.phi(f,g)+(1-eta)*L.phi(-f,g)}
function fstar(key,eta,g){
  if(key==='logistic')return Math.log(eta/(1-eta));
  if(key==='exp')return 0.5*Math.log(eta/(1-eta));
  if(key==='hinge')return eta>0.5?1:eta<0.5?-1:0;      // Bartlett et al. 2006, Example 3 (any value in [-1, 1] at eta = 1/2)
  if(key==='sqhinge')return 2*eta-1;
  // focal: numeric. Coarse grid, then golden-section on the bracket
  let bi=0,bv=Infinity;const G=[];for(let k=0;k<=4000;k++)G.push(-40+k*0.02);
  for(let k=0;k<G.length;k++){const v=condRisk(key,G[k],eta,g);if(v<bv){bv=v;bi=k}}
  let lo=G[Math.max(0,bi-1)],hi=G[Math.min(G.length-1,bi+1)];const r=(Math.sqrt(5)-1)/2;
  for(let k=0;k<200;k++){const c=hi-r*(hi-lo),d=lo+r*(hi-lo);if(condRisk(key,c,eta,g)<condRisk(key,d,eta,g))hi=d;else lo=c}
  return (lo+hi)/2}
function pstar(key,eta,g){const f=fstar(key,eta,g);
  if(key==='logistic'||key==='focal')return sig(f);if(key==='exp')return sig(2*f);return null}

// ---- GAN generator: gradient of its loss with respect to the discriminator's logit l on a fake sample, D = sigmoid(l)
// minimax: minimise log(1 - D)  -> d/dl = -D       non-saturating: minimise -log D -> d/dl = -(1 - D)
const GAN={minimax:l=>-sig(l),ns:l=>-sig(-l),lossMinimax:l=>-softplus(l),lossNS:l=>softplus(-l)};

// ---- z-loss (PaLM): coef * (log Z)^2, log Z = logsumexp(logits); gradient on logit i = 2 coef log Z softmax_i
function logsumexp(v){let m=-Infinity;for(const x of v)if(x>m)m=x;let s=0;for(const x of v)s+=Math.exp(x-m);return m+Math.log(s)}
function zloss(v,coef){const z=logsumexp(v);return {logZ:z,loss:coef*z*z,grad:v.map(x=>2*coef*z*Math.exp(x-z))}}
// bfloat16: round a float32 to the nearest bf16 (ties to even), and the gap between neighbouring bf16 values at v
const _f=new Float32Array(1),_u=new Uint32Array(_f.buffer);
function bf16(v){_f[0]=v;const x=_u[0];if((x&0x7f800000)===0x7f800000)return _f[0];const lsb=(x>>>16)&1;_u[0]=((x+0x7fff+lsb)>>>16)<<16;return _f[0]}
function bf16gap(v){const a=Math.abs(v);if(a===0)return 0;return Math.pow(2,Math.floor(Math.log2(a))-7)}

root.LF={sgn,logcosh,REG,HESS,fitLS,fitIRLS,fitL1,fit,objective,pulls,wquant,mean,location,meanLoss,sig,softplus,MARG,condRisk,fstar,pstar,GAN,logsumexp,zloss,bf16,bf16gap};
})(typeof window!=='undefined'?window:globalThis);
