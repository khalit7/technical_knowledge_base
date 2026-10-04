// ---- Computation engine for the page's two exact models (no drawing here) ----
// Checked against an independent Python implementation: src/recompute.py writes src/expected.json, src/check_engine.mjs compares.
(function(root){
  // seeded uniform random numbers (mulberry32), identical in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function gauss(r){const u1=r(),u2=r();return Math.sqrt(-2*Math.log(1-u1))*Math.cos(2*Math.PI*u2)}
  const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;

  // ================= 1. Driving: behaviour cloning against DAgger =================
  // lanes x in -4..4, heading h in -1..1; state index (x+4)*3+(h+1); action a in {-1,0,1}: h' = clamp(h+a), x' = clamp(x+h')
  const NS=27,SX=i=>Math.floor(i/3)-4,SH=i=>i%3-1,SI=(x,h)=>(x+4)*3+(h+1),ACTS=[-1,0,1];
  function step(i,a){const h=clamp(SH(i)+a,-1,1);return SI(clamp(SX(i)+h,-4,4),h)}
  // the expert steers back to its own lane (x = 0) and straightens up there
  function expert(i){const x=SX(i),h=SH(i),d=x===0?0:(x>0?-1:1);return clamp(d-h,-1,1)}
  // the learner predicts the expert's label at the nearest state it has data for (|dx| + |dh|, ties to the lower index)
  function label(i,data){let best=-1,bd=1e9;for(const j of data){const d=Math.abs(SX(j)-SX(i))+Math.abs(SH(j)-SH(i));if(d<bd){bd=d;best=j}}return expert(best)}
  // data: sorted array of state indices; returns the learner's action probabilities per state (wrong with probability eps)
  function policy(data,eps){const P=[];for(let i=0;i<NS;i++){const l=label(i,data);P.push(ACTS.map(a=>a===l?1-eps:eps/2))}return P}
  // exact propagation of the state distribution for T steps from (0, 0): per-step cost P(x != 0), mass outside the data, distributions
  function exact(data,eps,T){const pol=policy(data,eps),inD=new Uint8Array(NS);data.forEach(j=>inD[j]=1);
    let P=new Float64Array(NS);P[SI(0,0)]=1;const per=[],unl=[],dist=[Array.from(P)];
    for(let t=0;t<T;t++){const Q=new Float64Array(NS);
      for(let i=0;i<NS;i++){if(P[i]===0)continue;for(let k=0;k<3;k++)Q[step(i,ACTS[k])]+=P[i]*pol[i][k]}
      P=Q;let c=0,u=0;for(let i=0;i<NS;i++){if(SX(i)!==0)c+=P[i];if(!inD[i])u+=P[i]}per.push(c);unl.push(u);dist.push(Array.from(P))}
    let J=0;per.forEach(v=>J+=v);return {per,unl,dist,J}}
  function rollout(data,eps,T,r){let s=SI(0,0);const vis=[s];
    for(let t=0;t<T;t++){const l=label(s,data),u=r(),o=ACTS.filter(a=>a!==l);const a=u<1-eps?l:(u<1-eps/2?o[0]:o[1]);s=step(s,a);vis.push(s)}return vis}
  // DAgger (Ross, Gordon and Bagnell 2011, Algorithm 3.1, beta_i = I(i = 1)): round 1 is the expert's data, which never leaves (0, 0)
  function dagger(eps,T,rounds,m,seed){const D=new Set([SI(0,0)]),out=[[SI(0,0)]],r=rng(seed);
    for(let k=2;k<=rounds;k++){const cur=[...D].sort((a,b)=>a-b);for(let j=0;j<m;j++)rollout(cur,eps,T,r).forEach(i=>D.add(i));out.push([...D].sort((a,b)=>a-b))}
    return out}
  // one sampled trajectory of a learner (for the animation's single car), seeded
  function sample(data,eps,T,seed){return rollout(data,eps,T,rng(seed))}

  // ================= 2. Extrapolation error on a 1-D action =================
  const G=201,GRID=[];for(let g=0;g<G;g++)GRID.push(-1+2*g/(G-1));
  const KNOTS=[];for(let j=0;j<19;j++)KNOTS.push(Math.round((-0.9+0.1*j)*1e10)/1e10);
  const D=2+KNOTS.length,GAMMA=0.9,LAM=1e-3,NDATA=30,KIT=40,MU_B=-0.35,SD_B=0.12,SD_R=0.1;
  const rtrue=a=>1-2*(a-0.15)*(a-0.15);
  const phi=a=>{const f=[1,a];for(const k of KNOTS)f.push(Math.max(0,a-k));return f};
  function dataset(seed){const r=rng(seed),A=[],R=[];for(let i=0;i<NDATA;i++){const a=clamp(MU_B+SD_B*gauss(r),-1,1);A.push(a);R.push(rtrue(a)+SD_R*gauss(r))}return {A,R}}
  function solve(M,v){const n=v.length,A=M.map((row,i)=>row.concat([v[i]]));
    for(let c=0;c<n;c++){let p=c;for(let i=c+1;i<n;i++)if(Math.abs(A[i][c])>Math.abs(A[p][c]))p=i;const tmp=A[c];A[c]=A[p];A[p]=tmp;
      for(let i=0;i<n;i++){if(i===c)continue;const f=A[i][c]/A[c][c];for(let j=c;j<=n;j++)A[i][j]-=f*A[c][j]}}
    return A.map((row,i)=>row[n]/row[i])}
  const dot=(w,f)=>{let s=0;for(let j=0;j<D;j++)s+=w[j]*f[j];return s};
  const qval=(w,a)=>dot(w,phi(a));
  const FG=GRID.map(phi);
  // one fit: minimise 1/(2n) sum (Q(a_i) - y_i)^2 + ridge + alpha ((1/beta) log sum_g exp(beta Q(a_g)) - mean_i Q(a_i)); Newton when alpha > 0
  function fit(A,y,alpha,w0,beta){beta=beta==null?1:beta;const n=A.length,F=A.map(phi);
    const H0=[],b=[];for(let p=0;p<D;p++){const row=[];for(let q=0;q<D;q++){let s=0;for(let i=0;i<n;i++)s+=F[i][p]*F[i][q];row.push(s/n+(p===q&&p>0?LAM:0))}H0.push(row);
      let s=0;for(let i=0;i<n;i++)s+=F[i][p]*y[i];b.push(s/n)}
    if(alpha===0)return solve(H0,b);
    const fbar=[];for(let p=0;p<D;p++){let s=0;for(let i=0;i<n;i++)s+=F[i][p];fbar.push(s/n)}
    // the objective without its constant, for the damped Newton step (same summation order as recompute.py)
    const fobj=w=>{let s=0;for(let j=0;j<D;j++){let r=0;for(let k=0;k<D;k++)r+=H0[j][k]*w[k];s+=w[j]*(0.5*r-b[j]-alpha*fbar[j])}
      const q=FG.map(f=>dot(w,f));let mx=-Infinity;for(const v of q)if(v>mx)mx=v;let z=0;for(const v of q)z+=Math.exp(beta*(v-mx));return s+alpha*(mx+Math.log(z)/beta)};
    let w=w0.slice();
    for(let it=0;it<200;it++){const q=FG.map(f=>dot(w,f));let mx=-Infinity;for(const v of q)if(v>mx)mx=v;
      const e=q.map(v=>Math.exp(beta*(v-mx)));let z=0;for(const v of e)z+=v;const p=e.map(v=>v/z);
      const mu=[];for(let j=0;j<D;j++){let s=0;for(let g=0;g<G;g++)s+=p[g]*FG[g][j];mu.push(s)}
      const grad=[];for(let j=0;j<D;j++){let s=0;for(let k=0;k<D;k++)s+=H0[j][k]*w[k];grad.push(s-b[j]+alpha*(mu[j]-fbar[j]))}
      const Hs=[];for(let j=0;j<D;j++){const row=[];for(let k=0;k<D;k++){let s=0;for(let g=0;g<G;g++)s+=p[g]*FG[g][j]*FG[g][k];row.push(H0[j][k]+alpha*beta*(s-mu[j]*mu[k]))}Hs.push(row)}
      const dw=solve(Hs,grad),f0=fobj(w);let t=1,wn;
      while(true){wn=w.map((v,j)=>v-t*dw[j]);if(fobj(wn)<=f0||t<1e-12)break;t/=2}
      w=wn;let big=0;for(let j=0;j<D;j++)big=Math.max(big,Math.abs(t*dw[j]));
      if(big<1e-12)break}
    return w}
  // exact tau-expectile of a finite sample
  function expectile(xs,tau){const s=xs.slice().sort((a,b)=>a-b),n=s.length;
    for(let j=0;j<=n;j++){let lo=0,hi=0;for(let i=0;i<j;i++)lo+=s[i];for(let i=j;i<n;i++)hi+=s[i];
      const m=((1-tau)*lo+tau*hi)/((1-tau)*j+tau*(n-j));const a=j>0?s[j-1]:-Infinity,c=j<n?s[j]:Infinity;if(a<=m&&m<=c)return m}
    return s[n-1]}
  function support(A){let mu=0;A.forEach(a=>mu+=a);mu/=A.length;let v=0;A.forEach(a=>v+=(a-mu)*(a-mu));const sd=Math.sqrt(v/A.length);
    const sup=[];for(let g=0;g<G;g++)if(Math.abs(GRID[g]-mu)<=2*sd)sup.push(g);return {sup,mu,sd}}
  function softmax(v,beta,idx){let mx=-Infinity;for(const i of idx)if(v[i]>mx)mx=v[i];const e={};let z=0;for(const i of idx){e[i]=Math.exp(beta*(v[i]-mx));z+=e[i]}
    const p={};for(const i of idx)p[i]=e[i]/z;return p}
  // fitted Q iteration on the self-loop task; method 'naive' | 'bcq' | 'cql' | 'iql'
  function runX(method,seed,o){o=o||{};const alpha=o.alpha||0,tau=o.tau==null?0.9:o.tau,beta=o.beta==null?1:o.beta;
    const {A,R}=dataset(seed),S=support(A);let w=new Array(D).fill(0);const hist=[];
    const allG=[...Array(G).keys()],allD=[...Array(NDATA).keys()];
    for(let k=0;k<=KIT;k++){const qg=GRID.map(a=>qval(w,a)),qd=A.map(a=>qval(w,a));let pol,acts,t,bel=0,V=null;
      if(method==='iql'){V=expectile(qd,tau);pol=softmax(qd,beta,allD);acts=A;t=V;for(const i in pol)bel+=pol[i]*qd[i]}
      else{pol=softmax(qg,beta,method==='bcq'?S.sup:allG);acts=GRID;for(const i in pol)bel+=pol[i]*qg[i];t=bel}
      let tru=0;for(const i in pol)tru+=pol[i]*rtrue(acts[i]);tru/=(1-GAMMA);
      let mode=-1,pm=-1;for(const i of Object.keys(pol).map(Number).sort((a,b)=>a-b))if(pol[i]>pm){pm=pol[i];mode=i}
      hist.push({w:w.slice(),bel,true:tru,t,mode:acts[mode],qg,pol,V});
      if(k===KIT)break;
      const y=R.map(r=>r+GAMMA*t);w=fit(A,y,method==='cql'?alpha:0,w,beta)}
    let bs=-Infinity;S.sup.forEach(g=>{bs=Math.max(bs,rtrue(GRID[g]))});let beh=0;A.forEach(a=>beh+=rtrue(a));
    return {A,R,mu:S.mu,sd:S.sd,sup:S.sup,hist,beh:beh/NDATA/(1-GAMMA),bestSup:bs/(1-GAMMA),bestAll:1/(1-GAMMA)}}

  root.OF={rng,gauss,NS,SX,SH,SI,step,expert,label,policy,exact,dagger,sample,G,GRID,GAMMA,KIT,rtrue,dataset,expectile,runX,qval};
})(window);
