// ---- Policy gradients and actor-critic: the exact computations behind every visual (window.PGE) ----
// Pure functions, no DOM. src/checks/dump_js.mjs runs this file in Node; src/checks/recompute.py is an
// independent Python implementation of the same functions and compares every output.
(function(root){
  // seeded uniform random numbers (mulberry32), identical in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function softmax(z){const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)}

  // ---- 1. One state, three actions, softmax over logits: the policy gradient with and without a baseline ----
  // (from Topic: rl's archived long Reading tab, unchanged)
  function pgStats(th,rew){const pi=softmax(th),V=pi.reduce((a,p,i)=>a+p*rew[i],0);
    const grad=pi.map((p,j)=>p*(rew[j]-V));// exact gradient of expected reward w.r.t. logits
    const varOf=b=>{let tot=0;for(let a=0;a<3;a++){const ga=pi.map((p,j)=>((j===a?1:0)-p)*(rew[a]-b));tot+=pi[a]*ga.reduce((s,x,j)=>s+(x-grad[j])*(x-grad[j]),0)}return tot};
    return {pi,V,grad,var0:varOf(0),varB:varOf(V)}}
  function pgRun(rew,eta,steps,seed,useB){const r=rng(seed);let th=[0,0,0];const hist=[];
    for(let k=0;k<steps;k++){const st=pgStats(th,rew),u=r();let a=0,acc=st.pi[0];while(u>=acc&&a<2){a++;acc+=st.pi[a]}
      const b=useB?st.V:0,g=st.pi.map((p,j)=>((j===a?1:0)-p)*(rew[a]-b));
      hist.push({th:th.slice(),pi:st.pi,V:st.V,a,g,grad:st.grad,var0:st.var0,varB:st.varB});th=th.map((t,j)=>t+eta*g[j])}
    const st=pgStats(th,rew);hist.push({th:th.slice(),pi:st.pi,V:st.V,a:-1,g:[0,0,0],grad:st.grad,var0:st.var0,varB:st.varB});return hist}
  // final expected reward of many seeded runs (seeds s0 .. s0+n-1), and the per-step 10th and 90th percentiles
  function pgSpread(rew,eta,steps,useB,s0,n){const runs=[];for(let s=s0;s<s0+n;s++)runs.push(pgRun(rew,eta,steps,s,useB).map(h=>h.V));
    const band=[];for(let k=0;k<=steps;k++){const v=runs.map(r=>r[k]).sort((a,b)=>a-b);band.push([v[Math.floor(0.1*n)],v[Math.floor(0.9*n)]])}
    return {finals:runs.map(r=>r[steps]),band}}

  // ---- 2. Any constant baseline b: the mean of the one-sample gradient never moves, its variance does ----
  // score of action a w.r.t. the logits is e_a - pi; the estimate is (R_a - b)(e_a - pi), drawn with probability pi_a.
  // Variance-minimising constant: b* = sum_a pi_a |e_a - pi|^2 R_a / sum_a pi_a |e_a - pi|^2.
  function baseVar(th,rew,b){const pi=softmax(th),V=pi.reduce((s,p,i)=>s+p*rew[i],0),grad=pi.map((p,j)=>p*(rew[j]-V));
    const sq=pi.map((p,a)=>pi.reduce((s,q,j)=>s+Math.pow((j===a?1:0)-q,2),0));// |e_a - pi|^2
    const vr=bb=>{let t=0;for(let a=0;a<3;a++){let s=0;for(let j=0;j<3;j++){const x=((j===a?1:0)-pi[j])*(rew[a]-bb)-grad[j];s+=x*x}t+=pi[a]*s}return t};
    const num=pi.reduce((s,p,a)=>s+p*sq[a]*rew[a],0),den=pi.reduce((s,p,a)=>s+p*sq[a],0),bs=num/den;
    // mean of the estimator at b (to show it is independent of b)
    const mean=[0,1,2].map(j=>pi.reduce((s,p,a)=>s+p*((j===a?1:0)-pi[j])*(rew[a]-b),0));
    return {pi,V,grad,mean,sq,v:vr(b),v0:vr(0),vV:vr(V),bs,vs:vr(bs)}}

  // ---- 3. Generalised advantage estimation on one recorded episode ----
  // R[t] is the reward after acting in s_t (t = 0..T-1), V[t] the critic's value of s_t; the state after the last step is terminal (0).
  function gae(R,V,g,lam){const T=R.length,d=[];for(let t=0;t<T;t++)d.push(R[t]+g*(t+1<T?V[t+1]:0)-V[t]);
    const A=new Array(T).fill(0);let run=0;for(let t=T-1;t>=0;t--){run=d[t]+g*lam*run;A[t]=run}
    // Monte Carlo return minus V, and the share each TD error contributes to A[0]
    const G=[];let gg=0;for(let t=T-1;t>=0;t--){gg=R[t]+g*gg;G[t]=gg}
    const w0=d.map((x,l)=>Math.pow(g*lam,l));
    return {d,A,G,mcA:G.map((x,t)=>x-V[t]),w0,parts0:d.map((x,l)=>w0[l]*x)}}
  // weight GAE puts on the k-step advantage estimator (k = 1..T, the last one absorbing the tail): (1 - lam) lam^(k-1)
  function gaeKWeights(lam,T){const w=[];for(let k=1;k<=T;k++)w.push(k<T?(1-lam)*Math.pow(lam,k-1):Math.pow(lam,T-1));return w}

  // ---- 4. PPO's clip on one sample: several gradient epochs (from Topic: rl's archived Reading tab, unchanged) ----
  function ppoL(r,A,e,clip){const u=r*A;if(!clip)return u;return Math.min(u,Math.max(1-e,Math.min(1+e,r))*A)}
  // gradient of the per-sample objective with respect to r: A where active, 0 where flat
  function ppoDL(r,A,e){return ((A>0&&r>1+e)||(A<0&&r<1-e))?0:A}
  function ppoRun(A,e,eta,epochs,clip){const th0=[0,0.5,-0.5],a=0,old=softmax(th0)[a];let th=th0.slice();const hist=[];
    for(let k=0;k<=epochs;k++){const pi=softmax(th),r=pi[a]/old,piO=softmax(th0);
      const kl=piO.reduce((s,p,j)=>s+p*Math.log(p/pi[j]),0);
      const active=!clip||!((A>0&&r>1+e)||(A<0&&r<1-e));
      hist.push({r,L:ppoL(r,A,e,clip),kl,active,pa:pi[a]});
      if(k===epochs)break;
      if(active){th=th.map((t,j)=>t+eta*A*r*((j===a?1:0)-pi[j]))}}
    return {old,hist}}

  // ---- 5. Maximum entropy on a one-dimensional continuous action (illustrative reward) ----
  // r(a) = sum_k h_k exp(-(a - c_k)^2 / (2 w_k^2)) - k a^2: a tall narrow bump, a lower wide one, and an effort cost
  // that keeps the problem well posed on the whole real line (without it a wide enough Gaussian is always worth more).
  const SAC={bumps:[[1.0,0.6,0.12],[0.75,-0.5,0.35]],k:0.5};
  function sacR(a){return SAC.bumps.reduce((s,[h,c,w])=>s+h*Math.exp(-(a-c)*(a-c)/(2*w*w)),0)-SAC.k*a*a}
  // expected reward of a Gaussian N(mu, s^2), in closed form
  function sacER(mu,s){return SAC.bumps.reduce((t,[h,c,w])=>t+h*w/Math.sqrt(s*s+w*w)*Math.exp(-(mu-c)*(mu-c)/(2*(s*s+w*w))),0)-SAC.k*(mu*mu+s*s)}
  const gaussH=s=>0.5*Math.log(2*Math.PI*Math.E*s*s);
  // the best Gaussian actor at temperature alpha: argmax E[r] + alpha H over a fixed grid (deterministic, same grid in Python)
  function sacGauss(alpha){let best=-Infinity,bm=0,bs=0;
    for(let i=0;i<=480;i++){const mu=-1.2+i*0.005;for(let j=0;j<=240;j++){const s=Math.exp(Math.log(0.002)+j*(Math.log(3)-Math.log(0.002))/240);
      const J=sacER(mu,s)+alpha*gaussH(s);if(J>best){best=J;bm=mu;bs=s}}}
    return {mu:bm,s:bs,J:best,ER:sacER(bm,bs),H:gaussH(bs)}}
  // the unrestricted soft-optimal policy pi(a) proportional to exp(r(a)/alpha), on a grid over [-3, 3]
  function sacBoltz(alpha){const n=801,lo=-3,hi=3,h=(hi-lo)/(n-1),xs=[],lw=[];
    for(let i=0;i<n;i++){const a=lo+i*h;xs.push(a);lw.push(sacR(a)/alpha)}
    const m=Math.max(...lw),w=lw.map(v=>Math.exp(v-m)),Z=w.reduce((s,v)=>s+v,0)*h,p=w.map(v=>v/Z);
    let ER=0,H=0;for(let i=0;i<n;i++){ER+=p[i]*sacR(xs[i])*h;if(p[i]>0)H-=p[i]*Math.log(p[i])*h}
    return {xs,p,ER,H}}
  // entropy of the best Gaussian and of the soft-optimal policy at n log-spaced temperatures from a0 to a1
  function sacCurve(a0,a1,n){const out=[];for(let i=0;i<n;i++){const a=Math.exp(Math.log(a0)+i*(Math.log(a1)-Math.log(a0))/(n-1));const g=sacGauss(a),b=sacBoltz(a);
      out.push({a,gH:g.H,gER:g.ER,gmu:g.mu,bH:b.H,bER:b.ER})}return out}
  // SAC's automatic temperature: the alpha at which the best Gaussian's entropy equals the target (bisection in log alpha)
  function sacAuto(target){let lo=Math.log(1e-4),hi=Math.log(10);
    for(let k=0;k<40;k++){const mid=(lo+hi)/2;if(sacGauss(Math.exp(mid)).H>target)hi=mid;else lo=mid}
    return Math.exp((lo+hi)/2)}

  // ---- 6. Sutton and Barto Example 13.1: the short corridor with switched actions ----
  // states 0, 1 (switched), 2, then the goal; reward -1 per step; actions right (0) and left (1);
  // every state has the same features, x(s, right) = [1, 0], x(s, left) = [0, 1], so the policy is one probability p of right.
  function corV(p){// exact values of the three states under "right with probability p"
    const v0=2*(2-p)/(p*(p-1));const v1=v0+1/p;const v2=-1+(1-p)*v1;return [v0,v1,v2]}
  const COR={pStar:2-Math.SQRT2,vStar:-(6+4*Math.SQRT2)};
  function corStep(s,a){// a = 0 right, 1 left; returns next state (3 = goal)
    const right=(s===1)?a===1:a===0;if(right)return s+1;return s===0?0:s-1}
  // the policy over (right, left) from theta, with an optional floor: if the smaller probability is below eps it is set to eps
  // (Zhang and Bondariev's reproduction does this with eps = 0.05 so that every episode ends; eps = 0 is the plain softmax)
  function corPi(th,eps){const pi=softmax(th);if(eps>0){const m=pi[0]<pi[1]?0:1;if(pi[m]<eps){pi[m]=eps;pi[1-m]=1-eps}}return pi}
  // one learning run. kind: 'rf' REINFORCE, 'rfb' REINFORCE with baseline v(s,w) = w, 'ac' one-step actor-critic with v(s,w) = w.
  // gamma = 1; theta starts at [-1.47, 1.47], so p(right) = 0.0502 (close to the epsilon-greedy-left policy, as in the reproduction).
  // Updates follow Sutton and Barto's boxed algorithms step by step. Returns the total reward and p(right) after every episode.
  // Episodes are cut at maxT steps (counted in 'cut'); with the floor they always end.
  function corRun(kind,at,aw,episodes,seed,eps,maxT){const r=rng(seed);let th=[-1.47,1.47],w=0,cut=0;
    const tot=new Float64Array(episodes),ps=new Float64Array(episodes+1);ps[0]=corPi(th,eps)[0];
    for(let e=0;e<episodes;e++){let s=0,T=0;const A=[];
      if(kind==='ac'){
        while(s!==3&&T<maxT){const pi=corPi(th,eps);const a=r()<pi[0]?0:1;const s2=corStep(s,a);T++;
          const d=-1+(s2===3?0:w)-w;w+=aw*d;th=[th[0]+at*d*((a===0?1:0)-pi[0]),th[1]+at*d*((a===1?1:0)-pi[1])];s=s2}
      }else{
        while(s!==3&&T<maxT){const pi=corPi(th,eps);const a=r()<pi[0]?0:1;A.push(a);s=corStep(s,a);T++}
        for(let t=0;t<T;t++){const G=-(T-t);const pi=corPi(th,eps),a=A[t];let d=G;
          if(kind==='rfb'){d=G-w;w+=aw*d}
          th=[th[0]+at*d*((a===0?1:0)-pi[0]),th[1]+at*d*((a===1?1:0)-pi[1])]}
      }
      if(s!==3)cut++;tot[e]=-T;ps[e+1]=corPi(th,eps)[0]}
    return {tot,ps,cut,w}}
  // average of n runs (seeds s0 .. s0 + n - 1)
  function corAvg(kind,at,aw,episodes,n,s0,eps,maxT){const m=new Float64Array(episodes),mp=new Float64Array(episodes+1);let cut=0;
    for(let k=0;k<n;k++){const o=corRun(kind,at,aw,episodes,s0+k,eps,maxT);for(let e=0;e<episodes;e++)m[e]+=o.tot[e]/n;for(let e=0;e<=episodes;e++)mp[e]+=o.ps[e]/n;cut+=o.cut}
    return {m,mp,cut}}

  root.PGE={rng,softmax,pgStats,pgRun,pgSpread,baseVar,gae,gaeKWeights,ppoL,ppoDL,ppoRun,SAC,sacR,sacER,gaussH,sacGauss,sacBoltz,sacCurve,sacAuto,corV,COR,corStep,corPi,corRun,corAvg};
})(typeof window!=='undefined'?window:globalThis);
