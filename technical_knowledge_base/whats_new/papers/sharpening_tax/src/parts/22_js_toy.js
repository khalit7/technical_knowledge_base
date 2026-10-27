// ---- The PTGS toy engine (runs in the page and in node: toy_sweep.mjs, check_toy.mjs) ----
// A port of the authors' released toy (examples/ptgs_toy.py at commit 789ae06c of github.com/changdaeoh/sharpening-tax,
// CC BY-NC 4.0) and of their PTGS controller (ptgs/controller.py), written again here with a seeded mulberry32 stream
// instead of numpy's generator, so a run is reproducible in the browser. Same task design, same sizes, same
// learning rate (6.0, which the authors tuned on the fixed-temperature arm), same evaluation (128 rollouts at T = 1).
// Each task is a chain of L = 4 decisions with A = 6 choices; a rollout succeeds only if all four are right. Tasks
// come in 8 clusters that share a canonical answer; 30% of decisions are exceptions that only the task's own
// features can encode, so a task whose exceptions never succeed in a group gets no gradient and drifts to "never solved".
(function(G){
'use strict';
const CFG={nTasks:96,nClusters:8,L:4,A:6,exc:0.30,codeDim:24,init:2.6,steps:200,perStep:8,group:8,lr:6.0,evalN:128,evalT:1.0};
function rng(seed){let a=seed>>>0;const u=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  let spare=null;const n=()=>{if(spare!==null){const s=spare;spare=null;return s}let x=0;while(x<=1e-300)x=u();const y=u(),r=Math.sqrt(-2*Math.log(x));spare=r*Math.sin(2*Math.PI*y);return r*Math.cos(2*Math.PI*y)};
  const int=k=>Math.floor(u()*k);
  // Marsaglia and Tsang (2000) gamma sampler; shape < 1 boosted by U^(1/shape)
  const gam=k=>{if(k<1){const g=gam(k+1);return g*Math.pow(u(),1/k)}const d=k-1/3,c=1/Math.sqrt(9*d);for(;;){let x,v;do{x=n();v=1+c*x}while(v<=0);v=v*v*v;const U=u();if(U<1-0.0331*x*x*x*x)return d*v;if(Math.log(U)<0.5*x*x+d*(1-v+Math.log(v)))return d*v}};
  const beta=(a,b)=>{const x=gam(a),y=gam(b);return x/(x+y)};
  return {u,n,int,beta}}
function makeTasks(cfg,seed){const r=rng(1000003*seed+17),{nTasks:N,nClusters:C,L,A,codeDim:D}=cfg,d=C+D;
  const cluster=[],phi=[],canon=[],correct=[],nexc=[];
  for(let c=0;c<C;c++){canon.push([]);for(let l=0;l<L;l++)canon[c].push(r.int(A))}
  for(let i=0;i<N;i++){const c=r.int(C);cluster.push(c);const code=[];let s=0;for(let j=0;j<D;j++){const v=r.n();code.push(v);s+=v*v}s=Math.sqrt(s);
    const f=new Float64Array(d);f[c]=1;for(let j=0;j<D;j++)f[C+j]=code[j]/s;phi.push(f);
    const row=[];let ne=0;for(let l=0;l<L;l++){let a=canon[c][l];if(r.u()<cfg.exc)a=r.int(A);if(a!==canon[c][l])ne++;row.push(a)}correct.push(row);nexc.push(ne)}
  const W0=new Float64Array(L*A*d);for(let k=0;k<W0.length;k++)W0[k]=0.05*r.n();
  for(let c=0;c<C;c++)for(let l=0;l<L;l++)W0[(l*A+canon[c][l])*d+c]+=cfg.init;
  return {cfg,d,cluster,phi,canon,correct,nexc,W0}}
// decision probabilities at temperature T for task x: [L][A]
function probs(W,tk,x,T){const {L,A}=tk.cfg,d=tk.d,f=tk.phi[x],P=[];
  for(let l=0;l<L;l++){const z=new Float64Array(A);let m=-1e300;for(let a=0;a<A;a++){let s=0;const o=(l*A+a)*d;for(let j=0;j<d;j++)s+=W[o+j]*f[j];z[a]=s/T;if(z[a]>m)m=z[a]}
    let S=0;for(let a=0;a<A;a++){z[a]=Math.exp(z[a]-m);S+=z[a]}for(let a=0;a<A;a++)z[a]/=S;P.push(z)}return P}
// exact per-rollout success probability of task x at temperature T: product of the right action's probability
const pSucc=(W,tk,x,T)=>{const P=probs(W,tk,x,T);let p=1;for(let l=0;l<tk.cfg.L;l++)p*=P[l][tk.correct[x][l]];return p};
const entropy=P=>{let H=0;P.forEach(z=>{for(let a=0;a<z.length;a++)if(z[a]>0)H-=z[a]*Math.log(z[a])});return H/P.length};
function group(P,correct,n,r){const L=P.length,acts=[],succ=[];for(let i=0;i<n;i++){const a=[];let ok=1;for(let l=0;l<L;l++){const U=r.u();let c=0,k=0;for(;k<P[l].length-1;k++){c+=P[l][k];if(U<=c)break}a.push(k);if(k!==correct[l])ok=0}acts.push(a);succ.push(ok)}return {acts,succ}}
// W += lr * d/dW mean_i adv_i log pi_T(traj_i); d/dz_l = (onehot(a) - softmax(z_l / T)) / T
function pgStep(W,tk,x,P,acts,adv,T,lr){const {L,A}=tk.cfg,d=tk.d,f=tk.phi[x],n=acts.length;let sa=0;adv.forEach(v=>sa+=v);
  for(let l=0;l<L;l++){const oh=new Float64Array(A);for(let i=0;i<n;i++)oh[acts[i][l]]+=adv[i];
    for(let a=0;a<A;a++){const g=(oh[a]-sa*P[l][a])/(T*n),o=(l*A+a)*d;if(g!==0)for(let j=0;j<d;j++)if(f[j]!==0)W[o+j]+=lr*g*f[j]}}}
// PTGS controller: discounted Beta posterior per prompt, Thompson draw, tempering rule (Eq. 4)
const pivotAt=(step,total,p0,p1)=>{const u=Math.min(Math.max(step/Math.max(total,1),0),1);return p0*Math.pow(p1/p0,u)};
const tempFromP=(p,pv,tau,tref)=>{p=Math.min(Math.max(p,0),1);const h=(pv-p)/(p<=pv?pv:1-pv);return (tref||1)*Math.pow(tau,h)};
function ptgs(o){const st={tau:o.tau,gamma:o.gamma==null?0.95:o.gamma,p0:o.p0||0.25,p1:o.p1||0.5,pivot:o.p0||0.25,counts:{},r:rng(o.seed*7919+5)};
  st.setProgress=(s,T)=>{st.pivot=pivotAt(s,T,st.p0,st.p1)};
  st.ab=x=>{const c=st.counts[x]||[0,0];return [2*st.pivot+c[0],2*(1-st.pivot)+c[1]]};
  st.temp=x=>{const [a,b]=st.ab(x),p=st.r.beta(a,b);st.lastP=p;return tempFromP(p,st.pivot,st.tau,1)};
  st.update=(x,s,n)=>{const c=st.counts[x]||[0,0];st.counts[x]=[st.gamma*c[0]+s,st.gamma*c[1]+(n-s)]};
  return st}
// train one arm: 'fixed' (T = 1 for every group), 'globalT' (one hotter T), 'ptgs'
function train(tk,arm,seed,o){o=o||{};const cfg=tk.cfg,W=Float64Array.from(tk.W0),r=rng(10000+seed*31);
  const ctrl=arm==='ptgs'?ptgs({tau:o.tau||1.5,seed}):null,T0=arm==='globalT'?(o.globalT||1):1;
  const tr={any:[],mixed:[],temp:[],ent:[]},snap=o.snapAt!=null?{}:null;
  for(let s=0;s<cfg.steps;s++){if(ctrl)ctrl.setProgress(s,cfg.steps);const lo=(s*cfg.perStep)%cfg.nTasks;
    if(snap&&s===o.snapAt){snap.W=Float64Array.from(W);snap.counts=ctrl?JSON.parse(JSON.stringify(ctrl.counts)):null;snap.pivot=ctrl?ctrl.pivot:null;snap.batch=[];for(let j=0;j<cfg.perStep;j++)snap.batch.push((lo+j)%cfg.nTasks)}
    let sa=0,sm=0,st=0,se=0;
    for(let j=0;j<cfg.perStep;j++){const x=(lo+j)%cfg.nTasks,ab=ctrl?ctrl.ab(x):null,T=ctrl?ctrl.temp(x):T0,P=probs(W,tk,x,T),g=group(P,tk.correct[x],cfg.group,r);
      let k=0;g.succ.forEach(v=>k+=v);
      if(snap&&s===o.snapAt)snap.batch[j]={x,a:ab&&ab[0],b:ab&&ab[1],pHat:ctrl?ctrl.lastP:null,T,p1:pSucc(snap.W,tk,x,1),pT:pSucc(snap.W,tk,x,T),k,nexc:tk.nexc[x]};if(ctrl)ctrl.update(x,k,cfg.group);const m=k/cfg.group,adv=g.succ.map(v=>v-m);
      if(k>0&&k<cfg.group)pgStep(W,tk,x,P,g.acts,adv,T,o.lr||cfg.lr);sa+=k>0;sm+=k>0&&k<cfg.group;st+=T;se+=entropy(P)}
    tr.any.push(sa/cfg.perStep);tr.mixed.push(sm/cfg.perStep);tr.temp.push(st/cfg.perStep);tr.ent.push(se/cfg.perStep)}
  return {W,tr,snap}}
// evaluate: every task, 128 rollouts at T = 1 (no controller), the same seed for every arm
function evaluate(tk,W,seed,T){const cfg=tk.cfg,r=rng(777000+seed),c=[];for(let x=0;x<cfg.nTasks;x++){const P=probs(W,tk,x,T||cfg.evalT);let k=0;group(P,tk.correct[x],cfg.evalN,r).succ.forEach(v=>k+=v);c.push(k)}return c}
// unbiased pass@k and pass^k (Chen et al., 2021), mean over tasks, k = 1..K
function curves(c,n,K){const cov=new Float64Array(K),con=new Float64Array(K);c.forEach(ci=>{let q=1,h=1;for(let j=0;j<K;j++){q*=Math.max(0,n-ci-j)/(n-j);h*=Math.max(0,ci-j)/(n-j);cov[j]+=1-q;con[j]+=h}});
  for(let j=0;j<K;j++){cov[j]/=c.length;con[j]/=c.length}return {cov,con}}
const scal=(cov,K)=>{let A=0;for(let k=0;k<K-1;k++)A+=cov[K-1]-cov[k];return {A,S:A/((K-1)*(1-cov[0]))}};
G.TOY={CFG,rng,makeTasks,probs,pSucc,entropy,group,pgStep,pivotAt,tempFromP,ptgs,train,evaluate,curves,scal};
})(typeof window!=='undefined'?window:globalThis);
