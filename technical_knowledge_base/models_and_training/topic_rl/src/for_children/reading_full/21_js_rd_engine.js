// ---- Reading tab: the exact computations behind every Reading visual (window.RDE) ----
// Pure functions, no DOM. src/read/check_engine.mjs runs this file in Node and compares every output
// with src/read/recompute.py (an independent Python implementation) via src/read/expected.json.
(function(root){
  // seeded uniform random numbers (mulberry32), identical in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function gauss(r){const u1=r(),u2=r();return Math.sqrt(-2*Math.log(1-u1))*Math.cos(2*Math.PI*u2)}
  // solve A x = b by Gaussian elimination with partial pivoting
  function solve(A,b){const n=b.length,M=A.map((r,i)=>r.concat([b[i]]));
    for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
      for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/M[c][c];for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
    return M.map((r,i)=>r[n]/r[i])}

  // ---- 1. Silver's student Markov reward process (Lecture 2). Sleep is terminal (value 0). ----
  const MRP={names:['Class 1','Class 2','Class 3','Pass','Pub','Facebook'],
    R:[-2,-2,-2,10,1,-1],
    // P[s] = list of [successor index, probability]; index 6 is Sleep
    P:[[[1,.5],[5,.5]],[[2,.8],[6,.2]],[[3,.6],[4,.4]],[[6,1]],[[0,.2],[1,.4],[2,.4]],[[5,.9],[0,.1]]]};
  function mrpValues(g){const n=6,A=[],b=[];for(let s=0;s<n;s++){const row=new Array(n).fill(0);row[s]=1;
      MRP.P[s].forEach(([t,p])=>{if(t<n)row[t]-=g*p});A.push(row);b.push(MRP.R[s])}
    return solve(A,b)}
  // one sampled episode from a start state: list of states visited and the discounted return
  function mrpEpisode(start,g,r){let s=start,G=0,d=1;const path=[s],rew=[];
    for(let k=0;k<1000&&s<6;k++){const R=MRP.R[s];G+=d*R;d*=g;rew.push(R);let u=r(),acc=0,nx=MRP.P[s][MRP.P[s].length-1][0];
      for(const [t,p] of MRP.P[s]){acc+=p;if(u<acc){nx=t;break}}s=nx;path.push(s)}
    return {path,rew,G}}

  // ---- 2. The student MDP: states C1, C2, C3, Facebook; two actions each ----
  // A[s] = [[name, reward, [[succ,prob],...]], ...]; successor 4 is the end (Sleep, or Pass then Sleep)
  const MDP={names:['Class 1','Class 2','Class 3','Facebook'],
    A:[[['Study',-2,[[1,1]]],['Facebook',-1,[[3,1]]]],
       [['Study',-2,[[2,1]]],['Sleep',0,[[4,1]]]],
       [['Study',10,[[4,1]]],['Pub',1,[[0,.2],[1,.4],[2,.4]]]],
       [['Quit',0,[[0,1]]],['Facebook',-1,[[3,1]]]]]};
  // pi[s] = probability of the first action in state s
  function mdpEval(pi,g){const n=4,A=[],b=[];for(let s=0;s<n;s++){const row=new Array(n).fill(0);row[s]=1;let rb=0;
      MDP.A[s].forEach((a,i)=>{const w=i?1-pi[s]:pi[s];rb+=w*a[1];a[2].forEach(([t,p])=>{if(t<n)row[t]-=g*w*p})});A.push(row);b.push(rb)}
    const V=solve(A,b);return {V,Q:qFrom(V,g)}}
  function qFrom(V,g){return MDP.A.map(acts=>acts.map(a=>a[1]+g*a[2].reduce((s,[t,p])=>s+p*(t<4?V[t]:0),0)))}
  function mdpOptimal(g){let V=[0,0,0,0];for(let k=0;k<5000;k++){const Q=qFrom(V,g),nv=Q.map(q=>Math.max(...q));
      const d=Math.max(...nv.map((v,i)=>Math.abs(v-V[i])));V=nv;if(d<1e-13)break}return {V,Q:qFrom(V,g)}}

  // ---- 3. A five-armed bandit; every strategy sees the same reward for the same arm at the same step ----
  const BANDIT={mu:[0.2,1.0,-0.4,1.5,0.6],T:300};
  function banditTable(seed){const r=rng(seed),T=BANDIT.T,K=BANDIT.mu.length,rew=[],u=[],ra=[];
    for(let t=0;t<T;t++){const row=[];for(let k=0;k<K;k++)row.push(BANDIT.mu[k]+gauss(r));rew.push(row)}
    for(let t=0;t<T;t++){u.push(r());ra.push(Math.floor(r()*K))}return {rew,u,ra}}
  // strategy: {kind:'greedy'|'eps'|'ucb', eps, q0, c, alpha (constant step size; sample average when absent)}
  function banditRun(tab,st){const K=BANDIT.mu.length,T=BANDIT.T,Q=new Array(K).fill(st.q0||0),N=new Array(K).fill(0);
    const best=Math.max(...BANDIT.mu);let reg=0,tot=0;const hist=[];
    for(let t=0;t<T;t++){let a;
      if(st.kind==='ucb'){a=-1;for(let k=0;k<K;k++)if(N[k]===0){a=k;break}
        if(a<0){let bv=-Infinity;for(let k=0;k<K;k++){const v=Q[k]+st.c*Math.sqrt(Math.log(t+1)/N[k]);if(v>bv){bv=v;a=k}}}}
      else if(st.kind==='eps'&&tab.u[t]<st.eps)a=tab.ra[t];
      else{let bv=-Infinity;for(let k=0;k<K;k++)if(Q[k]>bv){bv=Q[k];a=k}}
      const R=tab.rew[t][a];N[a]++;Q[a]+=(R-Q[a])*(st.alpha?st.alpha:1/N[a]);reg+=best-BANDIT.mu[a];tot+=R;
      hist.push({a,R,Q:Q.slice(),N:N.slice(),reg,tot})}
    return hist}

  // ---- 4. Russell and Norvig's 4x3 world: value iteration against Q-learning from samples ----
  // cells (x,y), x 0..3, y 0..2; wall (1,1); terminals (3,2) +1 and (3,1) -1; reward -0.04 per step; gamma 1;
  // the intended move happens with 0.8, each perpendicular move with 0.1; bumping a wall stays put.
  const GW=(function(){const S=[];for(let y=0;y<3;y++)for(let x=0;x<4;x++)if(!(x===1&&y===1))S.push([x,y]);
    const idx=(x,y)=>S.findIndex(c=>c[0]===x&&c[1]===y);
    const D=[[0,1],[1,0],[0,-1],[-1,0]];// up, right, down, left
    const term={};term[idx(3,2)]=1;term[idx(3,1)]=-1;
    function mv(s,d){const [x,y]=S[s],nx=x+D[d][0],ny=y+D[d][1];const j=idx(nx,ny);return j<0?s:j}
    // outcomes of action a: [[succ,prob],...]
    function out(s,a){return [[mv(s,a),.8],[mv(s,(a+1)%4),.1],[mv(s,(a+3)%4),.1]]}
    return {S,idx,D,term,mv,out,start:idx(0,0),r:-0.04}})();
  function gwQ(V,s){return [0,1,2,3].map(a=>GW.r+GW.out(s,a).reduce((t,[n,p])=>t+p*V[n],0))}
  function gwValueIteration(K){const n=GW.S.length;let V=new Array(n).fill(0);Object.keys(GW.term).forEach(s=>V[s]=GW.term[s]);
    const hist=[V.slice()];for(let k=0;k<K;k++){const nv=V.map((v,s)=>s in GW.term?v:Math.max(...gwQ(V,s)));V=nv;hist.push(V.slice())}return hist}
  // Q-learning with epsilon-greedy behaviour, exploring starts (each episode starts in a random non-terminal cell)
  // and step size 1/N(s,a)^0.8; snapshots at the listed episode counts
  const GW_NONT=GW.S.map((c,i)=>i).filter(i=>!(i in GW.term));
  function gwQLearning(seed,eps,marks){const r=rng(seed),n=GW.S.length,Q=[],N=[];for(let s=0;s<n;s++){Q.push([0,0,0,0]);N.push([0,0,0,0])}
    const snaps=[],last=marks[marks.length-1];let samples=0;
    for(let e=1;e<=last;e++){let s=GW_NONT[Math.floor(r()*GW_NONT.length)];const path=[s];
      for(let k=0;k<500&&!(s in GW.term);k++){let a;const u=r(),ua=r();
        if(u<eps)a=Math.floor(ua*4);else{a=0;for(let b=1;b<4;b++)if(Q[s][b]>Q[s][a])a=b}
        const v=r();const d=v<.8?a:v<.9?(a+1)%4:(a+3)%4;const s2=GW.mv(s,d);
        const tgt=GW.r+(s2 in GW.term?GW.term[s2]:Math.max(...Q[s2]));N[s][a]++;Q[s][a]+=(tgt-Q[s][a])/Math.pow(N[s][a],0.8);samples++;s=s2;path.push(s)}
      if(marks.indexOf(e)>=0)snaps.push({ep:e,samples,V:Q.map((q,s)=>s in GW.term?GW.term[s]:Math.max(...q)),pol:Q.map(q=>q.indexOf(Math.max(...q))),path})}
    return snaps}

  // ---- 5. One episode, every target (the old page's worked example, generalised) ----
  // p: {g, lam, n, R:[R1,R2,R3], V:[V0,V1,V2], alpha, pDP}
  function targets(p){const g=p.g,R=p.R,V=p.V,T=3;
    const nstep=n=>{let G=0;for(let k=0;k<Math.min(n,T);k++)G+=Math.pow(g,k)*R[k];if(n<T)G+=Math.pow(g,n)*V[n];return G};
    const mc=nstep(T),td=nstep(1),two=nstep(2),nn=nstep(p.n);
    const w=[(1-p.lam),(1-p.lam)*p.lam,p.lam*p.lam];const lam=w[0]*td+w[1]*two+w[2]*mc;
    const dp=p.pDP*(R[0]+g*V[1])+(1-p.pDP)*0;
    return {mc,td,two,nn,lam,w,dp,reinforce:mc,reinforceB:mc-V[0],delta:td-V[0],
      upd:t=>V[0]+p.alpha*(t-V[0])}}
  // group-relative advantages: kind 'grpo' (divide by population std), 'drgrpo' (no std), 'rloo' (leave-one-out mean)
  function groupAdv(r,kind){const G=r.length,m=r.reduce((a,b)=>a+b,0)/G;
    const sd=Math.sqrt(r.reduce((a,b)=>a+(b-m)*(b-m),0)/G);
    if(kind==='drgrpo')return {m,sd,A:r.map(x=>x-m)};
    if(kind==='rloo')return {m,sd,A:r.map(x=>x-(m*G-x)/(G-1))};
    return {m,sd,A:r.map(x=>sd>0?(x-m)/sd:0)}}

  // ---- 6. The bias-variance dial, exactly: a three-step chain, each step pays 1 with probability q ----
  // the critic's estimates of S1 and S2 are off by err; target for S0 is the lambda-return. Exact over all 8 outcomes.
  function dial(g,q,err,lam){const V2=q,V1=q+g*q,V0=q+g*q+g*g*q,h1=V1+err,h2=V2+err;let E=0,E2=0;
    for(let o=0;o<8;o++){const R=[o&1,(o>>1)&1,(o>>2)&1],pr=R.reduce((a,x)=>a*(x?q:1-q),1);
      const G1=R[0]+g*h1,G2=R[0]+g*R[1]+g*g*h2,G3=R[0]+g*R[1]+g*g*R[2];const t=(1-lam)*G1+(1-lam)*lam*G2+lam*lam*G3;E+=pr*t;E2+=pr*t*t}
    const bias=E-V0,vr=E2-E*E;return {V0,bias,b2:bias*bias,vr,mse:bias*bias+vr}}

  // ---- 7. The deadly triad: Sutton and Barto's w -> 2w example (section 11.2) ----
  // off-policy: only the w -> 2w transition is ever updated. on-policy: each visit to the w state is followed by the
  // 2w state's own update, a transition to the end with reward 0.
  function triad(g,alpha,mode,steps){let w=10;const ws=[w];for(let k=0;k<steps;k++){
      w=w+alpha*(g*2*w-w)*1;if(mode==='on')w=w+alpha*(0-2*w)*2;ws.push(w)}return ws}

  // ---- 8. Maximisation bias: E[max of N independent N(0, s^2) estimates] by numerical integration ----
  function phi(x){return Math.exp(-x*x/2)/Math.sqrt(2*Math.PI)}
  // standard normal CDF from the Numerical Recipes erfc approximation (relative error below 1.2e-7)
  function Phi(x){const z=Math.abs(x)/Math.SQRT2,t=1/(1+0.5*z);
    const ans=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
    return x>=0?1-ans/2:ans/2}
  function emax(N){let s=0;const h=0.001;for(let x=-8;x<=8;x+=h)s+=x*N*phi(x)*Math.pow(Phi(x),N-1)*h;return s}

  // ---- 9. Policy gradient on a three-action softmax policy (one state), with and without a baseline ----
  // rewards are deterministic per action; offset c is added to every reward. Same random stream for both runs.
  function softmax(z){const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)}
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
  // ---- 10. PPO's clip on one batch: several gradient epochs on the same sample ----
  // surrogate for one sampled action a with advantage A: L = min(r A, clip(r,1-e,1+e) A), r = pi(a)/pi_old(a)
  function ppoL(r,A,e,clip){const u=r*A;if(!clip)return u;return Math.min(u,Math.max(1-e,Math.min(1+e,r))*A)}
  function ppoRun(A,e,eta,epochs,clip){const th0=[0,0.5,-0.5],a=0,old=softmax(th0)[a];let th=th0.slice();const hist=[];
    for(let k=0;k<=epochs;k++){const pi=softmax(th),r=pi[a]/old,piO=softmax(th0);
      const kl=piO.reduce((s,p,j)=>s+p*Math.log(p/pi[j]),0);
      const active=!clip||!((A>0&&r>1+e)||(A<0&&r<1-e));
      hist.push({r,L:ppoL(r,A,e,clip),kl,active,pa:pi[a]});
      if(k===epochs)break;
      if(active){// d r / d theta_j = r (1[j=a] - pi_j)
        th=th.map((t,j)=>t+eta*A*r*((j===a?1:0)-pi[j]))}}
    return {old,hist}}

  root.RDE={rng,gauss,solve,MRP,mrpValues,mrpEpisode,MDP,mdpEval,mdpOptimal,BANDIT,banditTable,banditRun,
    GW,gwQ,gwValueIteration,gwQLearning,targets,groupAdv,dial,triad,emax,Phi,softmax,pgStats,pgRun,pgSpread,ppoL,ppoRun};
})(typeof window!=='undefined'?window:globalThis);
