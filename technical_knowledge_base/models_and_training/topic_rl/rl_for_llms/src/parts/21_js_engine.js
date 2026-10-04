// ---- The page's computations: pure functions, no DOM ----
// check_engine.mjs runs this file in Node and compares its outputs with inputs/recompute.json (from recompute.py).
(function(root){
  const sum=a=>a.reduce((s,x)=>s+x,0),mean=a=>sum(a)/a.length;
  // group-relative advantages: 'grpo' (divide by the population std), 'drgrpo' (no std), 'rloo' (leave-one-out mean)
  function groupAdv(r,kind){const G=r.length,m=mean(r);
    const sd=Math.sqrt(r.reduce((a,b)=>a+(b-m)*(b-m),0)/G);
    if(kind==='drgrpo')return {m,sd,A:r.map(x=>x-m)};
    if(kind==='rloo')return {m,sd,A:r.map(x=>x-(m*G-x)/(G-1))};
    return {m,sd,A:r.map(x=>sd>0?(x-m)/sd:0)}}
  // per-token weight each response's advantage gets in the loss: GRPO 1/(G|o_i|), Dr. GRPO 1/(G Lmax), DAPO token-mean 1/sum|o|
  function tokenWeights(A,L,kind){const G=A.length,Lmax=Math.max(...L),T=sum(L);
    return A.map((a,i)=>kind==='drgrpo'?a/(G*Lmax):kind==='token'?a/T:a/(G*L[i]))}
  // k3 = x - log x - 1 with x = pi_ref / pi_theta; plain one-sample estimate = log(pi_theta / pi_ref) = -log x
  const k3=x=>x-Math.log(x)-1,k1=x=>-Math.log(x);
  // GAE over tokens: rewards r[0..T-1], values V[0..T-1] (V after the last token is 0)
  function gae(r,V,gamma,lam){const T=r.length,A=new Array(T);let g=0;
    for(let t=T-1;t>=0;t--){const vn=t+1<T?V[t+1]:0,d=r[t]+gamma*vn-V[t];g=d+gamma*lam*g;A[t]=g}return A}
  // PPO-RLHF shaped reward: -beta * log-ratio on every token, plus the reward-model score on the last
  function shaped(lr,rm,beta){return lr.map((x,t)=>-beta*x+(t===lr.length-1?rm:0))}
  // DAPO soft overlong punishment
  function overlong(y,Lmax,Lc){Lmax=Lmax||16384;Lc=Lc||4096;if(y<=Lmax-Lc)return 0;if(y<=Lmax)return ((Lmax-Lc)-y)/Lc;return -1}
  // GSPO sequence ratio from per-token log-ratios
  const gspo=lrs=>Math.exp(mean(lrs));
  // truncated importance weight and masked (rejection) importance sampling
  const tis=(ratio,C)=>Math.min(ratio,C);
  const mis=(ratio,lo,hi)=>ratio>=lo&&ratio<=hi?ratio:0;
  // PPO clipped surrogate for one token
  function ppoL(r,A,elo,ehi){const u=r*A;return Math.min(u,Math.max(1-elo,Math.min(1+ehi,r))*A)}
  // ---- the rare-token toy: one sampled token (logit z) against the rest of the vocabulary (logit 0), advantage +1,
  // `steps` gradient steps on the same rollout under one objective. Exact gradient with respect to z.
  // mode: 'ppo' (clip 0.2/0.2), 'dapo' (0.2/0.28), 'cispo' (weight capped at 1.28, gradient never zeroed), 'none'
  function rareToken(p0,mode,eta,steps,A){A=A==null?1:A;const z0=Math.log(p0/(1-p0));let z=z0;const hist=[];
    const ehi=mode==='ppo'?0.2:0.28,elo=0.2;
    for(let k=0;k<=steps;k++){const p=1/(1+Math.exp(-z)),r=p/p0;let w;
      if(mode==='none')w=r;
      else if(mode==='cispo')w=Math.min(r,1+ehi);
      else{const act=A>0?r<1+ehi:r>1-elo;w=act?r:0}
      hist.push({p,r,w,active:w!==0});if(k===steps)break;
      z+=eta*A*w*(1-p)}// d/dz of [w * A * log p] with w held fixed (CISPO) or of r*A (PPO): both give w*A*(1-p)
    return hist}
  // pass@k for a problem with per-sample success probability p
  const passk=(p,k)=>1-Math.pow(1-p,k);
  // illustrative problem set for section 9, and the two RL transforms
  function pkProblems(){const P=[];for(let i=0;i<40;i++){P.push(i<8?0:Math.min(0.9,0.004*Math.pow(1.17,i-7)))}return P}
  function pkSharpen(p){return p>0.15?1-(1-p)*0.15:p*0.3}
  function pkExpand(p,i){return p===0?(i%4===0?0.03:0):pkSharpen(p)}
  function pkCurve(P,ks){return ks.map(k=>mean(P.map(p=>passk(p,k))))}
  // synchronous against asynchronous RL on one engine with S slots (one token per slot per tick) and a separate trainer
  // that takes TR ticks per batch of B responses. Responses are assigned in order to the earliest-free slot.
  function syncSched(L,S,B,TR){const jobs=[],train=[];let t0=0;
    for(let b=0;b*B<L.length;b++){const fr=new Array(S).fill(t0),idx=[];for(let i=b*B;i<Math.min(L.length,(b+1)*B);i++)idx.push(i);
      idx.forEach(i=>{let s=0;for(let k=1;k<S;k++)if(fr[k]<fr[s])s=k;jobs.push({i,b,s,a:fr[s],e:fr[s]+L[i],v:b});fr[s]+=L[i]});
      const ge=Math.max(...fr);train.push({b,a:ge,e:ge+TR});t0=ge+TR}
    return {jobs,train,end:t0}}
  function asyncSched(L,S,B,TR){const jobs=[],train=[],fr=new Array(S).fill(0);
    L.forEach((l,i)=>{let s=0;for(let k=1;k<S;k++)if(fr[k]<fr[s])s=k;jobs.push({i,b:Math.floor(i/B),s,a:fr[s],e:fr[s]+l});fr[s]+=l});
    let te=0;const nb=Math.ceil(L.length/B);
    for(let b=0;b<nb;b++){const ready=Math.max(...jobs.filter(j=>j.b===b).map(j=>j.e)),a=Math.max(ready,te);train.push({b,a,e:a+TR});te=a+TR}
    jobs.forEach(j=>{j.v=train.filter(t=>t.e<=j.a).length;j.stale=j.b-j.v});
    return {jobs,train,end:te}}
  function utilisation(sc,S,L){return sum(L)/(S*sc.end)}
  root.LLE={sum,mean,groupAdv,tokenWeights,k3,k1,gae,shaped,overlong,gspo,tis,mis,ppoL,rareToken,passk,pkProblems,pkSharpen,pkExpand,pkCurve,syncSched,asyncSched,utilisation};
})(typeof window!=='undefined'?window:globalThis);
