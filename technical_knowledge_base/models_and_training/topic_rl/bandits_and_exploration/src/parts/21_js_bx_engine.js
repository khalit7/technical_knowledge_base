// ---- Computation engine for every visual on this page (no drawing here) ----
// Checked against an independent Python implementation: src/recompute.py writes src/expected.json, src/check_engine.mjs compares.
(function(root){
  // seeded uniform random numbers (mulberry32), identical in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function gauss(r){const u1=r(),u2=r();return Math.sqrt(-2*Math.log(1-u1))*Math.cos(2*Math.PI*u2)}
  // index of the largest value, ties broken uniformly at random with r (Sutton and Barto break ties randomly)
  function argmaxR(v,r){let m=-Infinity,c=0,a=0;for(let k=0;k<v.length;k++){if(v[k]>m){m=v[k];a=k;c=1}else if(v[k]===m)c++}
    if(c===1)return a;let j=Math.floor(r()*c);for(let k=0;k<v.length;k++)if(v[k]===m){if(j===0)return k;j--}return a}

  // ---- 1. E[max of n independent standard normals] = integral of x n phi(x) Phi(x)^(n-1) dx (the testbed's best possible reward for n = 10) ----
  function emax(n){const h=1e-3,lo=-9,M=Math.round(18/h);let Phi=0,prev=0,s=0;
    for(let i=0;i<=M;i++){const x=lo+i*h,ph=Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);if(i>0)Phi+=(prev+ph)*h/2;prev=ph;
      const f=x*n*ph*Math.pow(Math.min(1,Phi),n-1);s+=(i===0||i===M?0.5:1)*f*h}return s}

  // ---- 2. The 10-armed testbed (Sutton and Barto section 2.3) ----
  // One run = one bandit task. Three independent streams per run: the task (true values), the reward noise, the agent's own randomness.
  // cfg: {kind:'eps'|'ucb'|'grad'|'ts', eps, q0, alpha (constant step; sample average when absent), c, base (gradient baseline), off (mean of q*), walk (sd of a random walk on q*: nonstationary), k}
  function tbRun(cfg,run,steps,acc){
    const K=cfg.k||10,tr=rng(1000000+run),nr=rng(2000000+run),pr=rng(3000000+run);
    const q=new Float64Array(K);for(let k=0;k<K;k++)q[k]=cfg.walk?0:gauss(tr)+(cfg.off||0);
    const Q=new Float64Array(K).fill(cfg.q0||0),N=new Float64Array(K),H=new Float64Array(K),S=new Float64Array(K),pi=new Float64Array(K),U=new Float64Array(K);
    let rbar=0,best=0;if(!cfg.walk){for(let k=1;k<K;k++)if(q[k]>q[best])best=k;acc.maxq+=q[best]}
    for(let t=0;t<steps;t++){let a;
      if(cfg.walk){best=0;for(let k=1;k<K;k++)if(q[k]>q[best])best=k}
      if(cfg.kind==='eps'){if(pr()<cfg.eps)a=Math.floor(pr()*K);else a=argmaxR(Q,pr)}
      else if(cfg.kind==='ucb'){for(let k=0;k<K;k++)U[k]=N[k]===0?Infinity:Q[k]+cfg.c*Math.sqrt(Math.log(t+1)/N[k]);a=argmaxR(U,pr)}
      else if(cfg.kind==='ts'){for(let k=0;k<K;k++)U[k]=((cfg.off||0)+S[k])/(1+N[k])+gauss(pr)/Math.sqrt(1+N[k]);a=argmaxR(U,pr)}
      else{let mx=-Infinity;for(let k=0;k<K;k++)if(H[k]>mx)mx=H[k];let z=0;for(let k=0;k<K;k++){pi[k]=Math.exp(H[k]-mx);z+=pi[k]}
        for(let k=0;k<K;k++)pi[k]/=z;
        const u=pr();let cum=0;a=K-1;for(let k=0;k<K;k++){cum+=pi[k];if(u<cum){a=k;break}}
      }
      const R=q[a]+gauss(nr);acc.R[t]+=R;if(a===best)acc.O[t]+=1;N[a]++;
      if(cfg.kind==='grad'){
        // baseline: the average of all rewards including this one (the book's footnote 1 on p. 37: "the baseline also included R_t")
        rbar+=(R-rbar)/(t+1);const b=cfg.base?rbar:0,d=cfg.alpha*(R-b);
        for(let k=0;k<K;k++)H[k]+=k===a?d*(1-pi[k]):-d*pi[k]}
      else{Q[a]+=(cfg.alpha?cfg.alpha:1/N[a])*(R-Q[a]);S[a]+=R}
      if(cfg.walk)for(let k=0;k<K;k++)q[k]+=cfg.walk*gauss(tr)}
  }
  function tbNew(steps){return {R:new Float64Array(steps),O:new Float64Array(steps),maxq:0,runs:0}}
  // run runs [r0, r1) into acc
  function tbBatch(cfg,r0,r1,steps,acc){for(let r=r0;r<r1;r++){tbRun(cfg,r,steps,acc);acc.runs++}return acc}

  // ---- 3. One five-armed bandit, every strategy reading the same pre-drawn table (the Reading tab's before/after) ----
  // Arms pay their mean plus standard normal noise. Thompson sampling uses a N(0, 1) prior on each mean and known noise variance 1,
  // so its posterior after n pulls with reward sum s is N(s / (1 + n), 1 / (1 + n)); its draws come from the table's own normals z.
  const BANDIT={mu:[0.2,1.0,-0.4,1.5,0.6],T:300};
  function banditTable(seed){const r=rng(seed),T=BANDIT.T,K=BANDIT.mu.length,rew=[],u=[],ra=[],z=[];
    for(let t=0;t<T;t++){const row=[];for(let k=0;k<K;k++)row.push(BANDIT.mu[k]+gauss(r));rew.push(row)}
    for(let t=0;t<T;t++){u.push(r());ra.push(Math.floor(r()*K))}
    for(let t=0;t<T;t++){const row=[];for(let k=0;k<K;k++)row.push(gauss(r));z.push(row)}return {rew,u,ra,z}}
  // strategy: {kind:'greedy'|'eps'|'ucb'|'ts', eps, q0, c, alpha}
  function banditRun(tab,st){const K=BANDIT.mu.length,T=BANDIT.T,Q=new Array(K).fill(st.q0||0),N=new Array(K).fill(0),S=new Array(K).fill(0);
    const best=Math.max(...BANDIT.mu);let reg=0,tot=0;const hist=[];
    for(let t=0;t<T;t++){let a=-1,th=null,U=null;
      if(st.kind==='ucb'){for(let k=0;k<K;k++)if(N[k]===0){a=k;break}
        U=Q.map((q,k)=>N[k]===0?Infinity:q+st.c*Math.sqrt(Math.log(t+1)/N[k]));
        if(a<0){let bv=-Infinity;for(let k=0;k<K;k++)if(U[k]>bv){bv=U[k];a=k}}}
      else if(st.kind==='ts'){th=S.map((s,k)=>s/(1+N[k])+tab.z[t][k]/Math.sqrt(1+N[k]));let bv=-Infinity;for(let k=0;k<K;k++)if(th[k]>bv){bv=th[k];a=k}}
      else if(st.kind==='eps'&&tab.u[t]<st.eps)a=tab.ra[t];
      else{let bv=-Infinity;for(let k=0;k<K;k++)if(Q[k]>bv){bv=Q[k];a=k}}
      const R=tab.rew[t][a];N[a]++;S[a]+=R;Q[a]+=(R-Q[a])*(st.alpha?st.alpha:1/N[a]);reg+=best-BANDIT.mu[a];tot+=R;
      hist.push({a,R,Q:Q.slice(),N:N.slice(),S:S.slice(),th,U,reg,tot})}
    return hist}

  // ---- 4. Bernoulli bandit: regret against the Lai and Robbins lower bound ----
  function klB(p,q){const e=1e-15;p=Math.min(Math.max(p,e),1-e);q=Math.min(Math.max(q,e),1-e);return p*Math.log(p/q)+(1-p)*Math.log((1-p)/(1-q))}
  // the bound's constant: sum over suboptimal arms of gap / KL(p_a, p*); regret >= (this + o(1)) ln T
  function lrConst(p){const b=Math.max(...p);let s=0;for(const x of p)if(x<b)s+=(b-x)/klB(x,b);return s}
  // Gamma(a) for a >= 1 (Marsaglia and Tsang 2000) and Beta(a, b) from two gammas
  function gammaS(a,r){const d=a-1/3,c=1/Math.sqrt(9*d);for(;;){let x,v;do{x=gauss(r);v=1+c*x}while(v<=0);v=v*v*v;const u=r();
      if(u<1-0.0331*x*x*x*x)return d*v;if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v}}
  function betaS(a,b,r){const x=gammaS(a,r),y=gammaS(b,r);return x/(x+y)}
  // cfg: {kind:'greedy'|'eps'|'ucb1'|'ts', eps}; marks: steps at which to record cumulative expected regret (sum of gaps of arms pulled)
  function brRun(cfg,p,T,run,marks,acc){const K=p.length,nr=rng(5000000+run),pr=rng(6000000+run),b=Math.max(...p);
    const N=new Float64Array(K),S=new Float64Array(K),V=new Float64Array(K);let reg=0,m=0;
    for(let t=0;t<T;t++){let a;
      if(cfg.kind==='ts'){for(let k=0;k<K;k++)V[k]=betaS(1+S[k],1+N[k]-S[k],pr);a=argmaxR(V,pr)}
      else if(cfg.kind==='ucb1'){for(let k=0;k<K;k++)V[k]=N[k]===0?Infinity:S[k]/N[k]+Math.sqrt(2*Math.log(t)/N[k]);a=argmaxR(V,pr)}
      else{if(cfg.kind==='eps'&&pr()<cfg.eps)a=Math.floor(pr()*K);else{for(let k=0;k<K;k++)V[k]=N[k]===0?0.5:S[k]/N[k];a=argmaxR(V,pr)}}
      const x=nr()<p[a]?1:0;N[a]++;S[a]+=x;reg+=b-p[a];
      while(m<marks.length&&marks[m]===t+1){acc[m]+=reg;m++}}
    return acc}
  function logMarks(T,per){const s=new Set();for(let i=0;i<=per*Math.log10(T)+1e-9;i++)s.add(Math.max(1,Math.round(Math.pow(10,i/per))));s.add(T);return [...s].filter(x=>x<=T).sort((a,b)=>a-b)}

  // ---- 5. A sparse-reward gridworld: epsilon-greedy against a count bonus against optimistic starts ----
  // 14 x 7 cells, start (0,3); a small reward 0.1 at (2,1) and a large reward 1 at (13,3), both end the episode; 60 steps at most.
  // Tabular Q-learning, step 0.5, gamma 0.95, epsilon 0.1 (not in 'opt' mode). 'cnt' adds the intrinsic reward beta / sqrt(N(s')) with beta 0.2,
  // N counting visits to s' over all episodes so far; 'opt' starts every Q at 1 and acts greedily.
  const GX={W:14,H:7,start:[0,3],small:[2,1],big:[13,3],rs:0.1,rb:1,cap:60,alpha:0.5,g:0.95,eps:0.1,beta:0.2,q0:1};
  const MV=[[1,0],[-1,0],[0,1],[0,-1]];
  function gxRun(mode,seed,episodes,keep){const W=GX.W,Hh=GX.H,n=W*Hh,r=rng(7000000+seed);
    const Q=new Float64Array(n*4).fill(mode==='opt'?GX.q0:0),N=new Float64Array(n),out=[];let first=-1,nBig=0;
    const id=(x,y)=>y*W+x,sm=id(GX.small[0],GX.small[1]),bg=id(GX.big[0],GX.big[1]);const qq=new Float64Array(4);
    for(let ep=0;ep<episodes;ep++){let x=GX.start[0],y=GX.start[1],end=0;const path=keep?[id(x,y)]:null;
      for(let t=0;t<GX.cap;t++){const s=id(x,y);let a;
        if(mode!=='opt'&&r()<GX.eps)a=Math.floor(r()*4);else{for(let k=0;k<4;k++)qq[k]=Q[s*4+k];a=argmaxR(qq,r)}
        x=Math.min(W-1,Math.max(0,x+MV[a][0]));y=Math.min(Hh-1,Math.max(0,y+MV[a][1]));const s2=id(x,y);N[s2]++;if(keep)path.push(s2);
        const rew=s2===bg?GX.rb:s2===sm?GX.rs:0,ri=rew+(mode==='cnt'?GX.beta/Math.sqrt(N[s2]):0),term=s2===bg||s2===sm;
        let mx=-Infinity;if(!term)for(let k=0;k<4;k++)if(Q[s2*4+k]>mx)mx=Q[s2*4+k];
        Q[s*4+a]+=GX.alpha*(ri+(term?0:GX.g*mx)-Q[s*4+a]);if(term){end=s2===bg?2:1;break}}
      if(end===2){nBig++;if(first<0)first=ep}
      if(keep){const V=new Float64Array(n);for(let s=0;s<n;s++)V[s]=Math.max(Q[s*4],Q[s*4+1],Q[s*4+2],Q[s*4+3]);out.push({path,end,N:N.slice(),V,nBig,first})}}
    return keep?out:{first,nBig}}
  function gxSummary(mode,seeds,episodes){const firsts=[];let found=0;for(let s=1;s<=seeds;s++){const o=gxRun(mode,s,episodes,false);firsts.push(o.first);if(o.first>=0)found++}return {firsts,found}}

  root.BX={rng,gauss,argmaxR,emax,tbRun,tbNew,tbBatch,BANDIT,banditTable,banditRun,klB,lrConst,gammaS,betaS,brRun,logMarks,GX,gxRun,gxSummary};
})(typeof window!=='undefined'?window:globalThis);
