// ---- A toy Switch layer, trained live in the browser (also run by node in check_core.mjs) ----
// One feed-forward sub-block replaced by N expert FFNs (d -> h -> d, ReLU, no biases, as in T5) and a
// linear router W_r with no bias, exactly as §2.1 and Code Blocks 14 and 15 of the paper:
//   logits h(x) = x W_r, p = softmax(h) (computed in float64 here), expert = argmax p (top-1), or the
//   two largest for the top-2 MoE baseline (Eq. 2, gates not renormalised);
//   capacity C = ceil(T / N * CF) slots per expert; a token past its expert's capacity is dropped and
//   passes through the residual unchanged (position_in_expert = cumsum of the expert mask, batch order);
//   output y = x + p_i(x) E_i(x); loss = MSE(y, target) + alpha * N * sum_i f_i P_i (Eq. 4 to 6);
//   init: truncated normal, sigma = sqrt(s / fan_in), resampled beyond 2 sigma (§2.4).
// The task: tokens of K types (clusters in R^d); each type has its own residual map, target = x + A_k x.
// Adam instead of the paper's Adafactor (toy); everything is float64 and seeded, so the browser and
// node give identical numbers for the same settings.
const SW=(function(){
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function gauss(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function tnorm(r,sd){for(;;){const z=gauss(r);if(Math.abs(z)<=2)return z*sd}}
  // ---- the task ----
  function makeTask(o){const r=rng(o.taskSeed||7),d=o.d,K=o.K;const cen=[],A=[];
    for(let k=0;k<K;k++){const c=new Float64Array(d);let n=0;for(let j=0;j<d;j++){c[j]=gauss(r);n+=c[j]*c[j]}n=Math.sqrt(n);for(let j=0;j<d;j++)c[j]*=2.5/n;cen.push(c);
      const M=new Float64Array(d*d);for(let j=0;j<d*d;j++)M[j]=gauss(r)*0.8/Math.sqrt(d);A.push(M)}
    // type frequencies: equal, or skewed (Zipf, exponent 1) as words are
    const w=[];for(let k=0;k<K;k++)w.push(o.skew?1/(k+1):1);const s=w.reduce((a,b)=>a+b,0);const freq=w.map(v=>v/s);
    return {d,K,cen,A,freq,noise:o.noise==null?0.45:o.noise}}
  function sample(task,r,T){const d=task.d,X=new Float64Array(T*d),Y=new Float64Array(T*d),c=new Int32Array(T);
    for(let t=0;t<T;t++){let u=r(),k=0;while(k<task.K-1&&u>task.freq[k]){u-=task.freq[k];k++}c[t]=k;
      const C=task.cen[k],M=task.A[k];for(let j=0;j<d;j++)X[t*d+j]=C[j]+task.noise*gauss(r);
      for(let i=0;i<d;i++){let s=0;for(let j=0;j<d;j++)s+=M[i*d+j]*X[t*d+j];Y[t*d+i]=X[t*d+i]+s}}
    return {X,Y,c,T}}
  // ---- parameters ----
  function init(cfg,r){const {d,h,N}=cfg,s=cfg.initScale;const P={Wr:new Float64Array(d*N),W1:[],W2:[]};
    for(let j=0;j<d*N;j++)P.Wr[j]=tnorm(r,Math.sqrt(s/d));
    for(let e=0;e<N;e++){const a=new Float64Array(h*d),b=new Float64Array(d*h);for(let j=0;j<h*d;j++)a[j]=tnorm(r,Math.sqrt(s/d));for(let j=0;j<d*h;j++)b[j]=tnorm(r,Math.sqrt(s/h));P.W1.push(a);P.W2.push(b)}
    return P}
  const zerosLike=P=>({Wr:new Float64Array(P.Wr.length),W1:P.W1.map(a=>new Float64Array(a.length)),W2:P.W2.map(a=>new Float64Array(a.length))});
  // ---- forward and backward on one batch (the batch is one routing group) ----
  // returns loss parts, routing statistics and (if G given) accumulates gradients into G
  function pass(P,B,cfg,G,jit){const {d,h,N}=cfg,k=cfg.k||1,T=B.T,X=B.X,Y=B.Y,alpha=cfg.alpha;
    const C=Math.ceil(T/N*cfg.cf*k-1e-9);
    const p=new Float64Array(T*N),xr=new Float64Array(T*d);
    for(let t=0;t<T;t++){for(let j=0;j<d;j++)xr[t*d+j]=X[t*d+j]*(jit?jit[t*d+j]:1);
      let m=-1e300;const z=new Float64Array(N);for(let e=0;e<N;e++){let s=0;for(let j=0;j<d;j++)s+=xr[t*d+j]*P.Wr[j*N+e];z[e]=s;if(s>m)m=s}
      let S=0;for(let e=0;e<N;e++){z[e]=Math.exp(z[e]-m);S+=z[e]}for(let e=0;e<N;e++)p[t*N+e]=z[e]/S}
    // choices: first choice for every token, then (top-2) second choices; capacity filled in batch order, first choices first
    const ch=[];const first=new Int32Array(T),second=new Int32Array(T).fill(-1);
    for(let t=0;t<T;t++){let a=0;for(let e=1;e<N;e++)if(p[t*N+e]>p[t*N+a])a=e;first[t]=a;
      if(k===2){let b=a===0?1:0;for(let e=0;e<N;e++)if(e!==a&&p[t*N+e]>p[t*N+b])b=e;second[t]=b}}
    const fill=new Int32Array(N),keep=[];// keep: list of [t, e]
    let dropped=0;const dropTok=new Uint8Array(T);
    for(let t=0;t<T;t++){const e=first[t];if(fill[e]<C){fill[e]++;keep.push([t,e])}else{dropped++;dropTok[t]=1}}
    let dropped2=0;if(k===2)for(let t=0;t<T;t++){const e=second[t];if(fill[e]<C){fill[e]++;keep.push([t,e])}else dropped2++}
    // f (argmax fractions, Eq. 5) and P (mean probabilities, Eq. 6)
    const f=new Float64Array(N),Pm=new Float64Array(N);for(let t=0;t<T;t++){f[first[t]]+=1/T;for(let e=0;e<N;e++)Pm[e]+=p[t*N+e]/T}
    let aux=0;for(let e=0;e<N;e++)aux+=f[e]*Pm[e];aux*=alpha*N;
    // expert forward for kept assignments
    const out=new Float64Array(X);const cache=[];
    for(const [t,e] of keep){const W1=P.W1[e],W2=P.W2[e],a=new Float64Array(h),E=new Float64Array(d);
      for(let i=0;i<h;i++){let s=0;for(let j=0;j<d;j++)s+=W1[i*d+j]*X[t*d+j];a[i]=s>0?s:0}
      for(let i=0;i<d;i++){let s=0;for(let j=0;j<h;j++)s+=W2[i*h+j]*a[j];E[i]=s}
      const g=p[t*N+e];for(let i=0;i<d;i++)out[t*d+i]+=g*E[i];cache.push({t,e,a,E})}
    let mse=0;for(let j=0;j<T*d;j++){const r=out[j]-Y[j];mse+=r*r}mse/=T*d;
    const res={loss:mse+aux,mse,aux,f,Pm,dropped,dropped2,C,fill,first,dropTok};
    if(!G)return res;
    // backward
    const dout=new Float64Array(T*d);for(let j=0;j<T*d;j++)dout[j]=2*(out[j]-Y[j])/(T*d);
    const dp=new Float64Array(T*N);
    for(let t=0;t<T;t++)for(let e=0;e<N;e++)dp[t*N+e]+=alpha*N*f[e]/T;
    for(const c of cache){const {t,e,a,E}=c,g=p[t*N+e],W1=P.W1[e],W2=P.W2[e],G1=G.W1[e],G2=G.W2[e];
      let s=0;for(let i=0;i<d;i++)s+=dout[t*d+i]*E[i];dp[t*N+e]+=s;
      const dE=new Float64Array(d);for(let i=0;i<d;i++)dE[i]=g*dout[t*d+i];
      const da=new Float64Array(h);for(let i=0;i<d;i++)for(let j=0;j<h;j++){G2[i*h+j]+=dE[i]*a[j];da[j]+=W2[i*h+j]*dE[i]}
      for(let i=0;i<h;i++){if(a[i]<=0)continue;for(let j=0;j<d;j++)G1[i*d+j]+=da[i]*X[t*d+j]}}
    for(let t=0;t<T;t++){let sp=0;for(let e=0;e<N;e++)sp+=dp[t*N+e]*p[t*N+e];
      for(let e=0;e<N;e++){const dz=p[t*N+e]*(dp[t*N+e]-sp);if(dz===0)continue;for(let j=0;j<d;j++)G.Wr[j*N+e]+=xr[t*d+j]*dz}}
    return res}
  // ---- a training run: state you can advance a few steps at a time ----
  function run(cfg){const r=rng(cfg.seed*7919+13),task=makeTask(cfg),P=init(cfg,r);
    const st={cfg,task,P,m:zerosLike(P),v:zerosLike(P),step:0,r,dr:rng(cfg.seed*104729+5),log:[],
      test:sample(task,rng(99991),cfg.testN||2048)};return st}
  function adam(st,G){const lr=st.cfg.lr,b1=0.9,b2=0.999,eps=1e-8;st.step++;const c1=1-b1**st.step,c2=1-b2**st.step;
    const up=(w,g,m,v)=>{for(let j=0;j<w.length;j++){m[j]=b1*m[j]+(1-b1)*g[j];v[j]=b2*v[j]+(1-b2)*g[j]*g[j];w[j]-=lr*(m[j]/c1)/(Math.sqrt(v[j]/c2)+eps)}};
    up(st.P.Wr,G.Wr,st.m.Wr,st.v.Wr);for(let e=0;e<st.P.W1.length;e++){up(st.P.W1[e],G.W1[e],st.m.W1[e],st.v.W1[e]);up(st.P.W2[e],G.W2[e],st.m.W2[e],st.v.W2[e])}}
  function jitter(st,T){if(!st.cfg.jitter)return null;const d=st.cfg.d,j=new Float64Array(T*d),e=st.cfg.jitter;for(let i=0;i<T*d;i++)j[i]=1-e+2*e*st.dr();return j}
  function trainSteps(st,n){let last;for(let i=0;i<n;i++){const B=sample(st.task,st.dr,st.cfg.T),G=zerosLike(st.P);last=pass(st.P,B,st.cfg,G,jitter(st,st.cfg.T));adam(st,G);
      if(st.step%(st.cfg.logEvery||25)===0){const ev=evaluate(st);st.log.push({s:st.step,tr:last.mse,te:ev.mse,drop:last.dropped/st.cfg.T,edrop:ev.drop,maxf:Math.max(...ev.f)*st.cfg.N,f:Array.from(ev.f)})}}return last}
  // held-out: fresh tokens from the same task, routed in groups of T. Capacity at evaluation is cfg.evalCf
  // (2.0 by default, the released Switch-Base setting EVAL_EXPERT_CAPACITY_FACTOR); drops are counted.
  function evaluate(st,cfE){const cfg=Object.assign({},st.cfg,{cf:cfE||st.cfg.evalCf||2}),T=cfg.T,te=st.test,d=cfg.d,N=cfg.N;let mse=0,drop=0,n=0;const f=new Float64Array(N);const byType=[];
    for(let k=0;k<st.task.K;k++)byType.push(new Float64Array(N));
    for(let o=0;o+T<=te.T;o+=T){const B={X:te.X.subarray(o*d,(o+T)*d),Y:te.Y.subarray(o*d,(o+T)*d),T};const r=pass(st.P,B,cfg,null,null);
      mse+=r.mse;drop+=r.dropped;n++;for(let e=0;e<N;e++)f[e]+=r.f[e];for(let t=0;t<T;t++)byType[te.c[o+t]][r.first[t]]++}
    for(let e=0;e<N;e++)f[e]/=n;return {mse:mse/n,drop:drop/(n*T),f,byType}}
  // the floor and the ceiling: predicting the input unchanged, and the per-type linear maps exactly
  function identityMSE(st){const te=st.test,d=st.cfg.d;let s=0;for(let j=0;j<te.T*d;j++){const r=te.X[j]-te.Y[j];s+=r*r}return s/(te.T*d)}
  return {rng,makeTask,sample,init,pass,run,trainSteps,evaluate,identityMSE,zerosLike}})();
if(typeof module!=='undefined')module.exports=SW;
