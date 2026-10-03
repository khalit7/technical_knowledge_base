// ---- Estimator lab, part a: the engine. Four tabular experiments from Sutton and Barto (2nd ed., 2018), seeded and deterministic.
// Pure functions only, no DOM: the same file runs in Node for src/lab/dump_js.mjs, whose output src/lab/check.py compares with a Python port.
// Every random draw comes from mulberry32 streams keyed by (seed, purpose, index), so a run replays identically and the Python port can match it bit for bit.
(function(root){
'use strict';
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function hs(seed,a,b){return(seed*7919+a*104729+b*15485863+13)>>>0}

// ================= 1. Gridworld of Example 4.1 (4 x 4, corners terminal, reward -1 per step, undiscounted) =================
// actions in the book's order: up, down, right, left; a move off the grid leaves the state unchanged
const GA=[[-1,0],[1,0],[0,1],[0,-1]];
function gwNext(s,a){const r=(s/4)|0,c=s%4,nr=r+GA[a][0],nc=c+GA[a][1];return(nr<0||nr>3||nc<0||nc>3)?s:nr*4+nc}
function gwTerm(s){return s===0||s===15}
// one synchronous sweep of iterative policy evaluation for policy pi (pi[s][a] probabilities); Figure 4.1 uses the equiprobable policy
function gwEval(V,pi){const W=V.slice();for(let s=1;s<15;s++){let v=0;for(let a=0;a<4;a++)v+=pi[s][a]*(-1+V[gwNext(s,a)]);W[s]=v}return W}
// one synchronous sweep of value iteration
function gwVI(V){const W=V.slice();for(let s=1;s<15;s++){let m=-Infinity;for(let a=0;a<4;a++){const q=-1+V[gwNext(s,a)];if(q>m)m=q}W[s]=m}return W}
// actions within tol of the best one-step lookahead (the arrows of Figure 4.1's right column)
function gwGreedy(V,tol){const out=[];for(let s=0;s<16;s++){if(gwTerm(s)){out.push([]);continue}let m=-Infinity;const q=[];for(let a=0;a<4;a++){q.push(-1+V[gwNext(s,a)]);if(q[a]>m)m=q[a]}
  out.push([0,1,2,3].filter(a=>q[a]>=m-(tol==null?1e-9:tol)))}return out}
function gwRandomPi(){const p=[];for(let s=0;s<16;s++)p.push([0.25,0.25,0.25,0.25]);return p}
// exact targets: v_pi of the random policy (sweeps to a fixed point) and v* (minus the steps to the nearest corner)
function gwTargets(){let V=new Array(16).fill(0);const pi=gwRandomPi();for(let k=0;k<5000;k++){const W=gwEval(V,pi);let d=0;for(let s=0;s<16;s++)d=Math.max(d,Math.abs(W[s]-V[s]));V=W;if(d<1e-13)break}
  const S=[];for(let s=0;s<16;s++){const r=(s/4)|0,c=s%4;S.push(-Math.min(r+c,6-r-c))}return{vpi:V,vstar:S}}
// A "method" advances by one unit of work per frame: 56 model look-ups (14 states x 4 actions), i.e. one sweep, or 56 sampled transitions.
function gwMethod(kind,opt){opt=opt||{};const pi0=gwRandomPi();
  const M={kind,V:new Array(16).fill(0),frames:0,looks:0,samples:0,episodes:0,phase:'',done:false};
  if(kind==='eval'){M.step=function(){if(M.done)return;const W=gwEval(M.V,pi0);let d=0;for(let s=0;s<16;s++)d=Math.max(d,Math.abs(W[s]-M.V[s]));M.V=W;M.frames++;M.looks+=56;M.phase='sweep '+M.frames;if(d<1e-4){M.done=true;M.phase+=', converged (largest change below 0.0001)'}}}
  else if(kind==='vi'){M.step=function(){if(M.done)return;const W=gwVI(M.V);let d=0;for(let s=0;s<16;s++)d=Math.max(d,Math.abs(W[s]-M.V[s]));M.V=W;M.frames++;M.looks+=56;M.phase='sweep '+M.frames;if(d<1e-4){M.done=true;M.phase+=', no change: converged'}}}
  else if(kind==='pi'){let pi=pi0,ev=0;M.iter=0;M.phase='evaluate the random policy';
    M.step=function(){if(M.done)return;M.frames++;M.looks+=56;
      if(M.mode!=='improve'){const W=gwEval(M.V,pi);let d=0;for(let s=0;s<16;s++)d=Math.max(d,Math.abs(W[s]-M.V[s]));M.V=W;ev++;M.phase='policy '+M.iter+': evaluation sweep '+ev;if(d<1e-4){M.mode='improve';M.phase+=', evaluated'}}
      else{const g=gwGreedy(M.V,1e-9),np=[];let same=true;
        for(let s=0;s<16;s++){const row=[0,0,0,0],cur=pi[s].indexOf(1);if(!gwTerm(s))row[cur>=0&&g[s].includes(cur)?cur:g[s][0]]=1;else row[0]=0.25,row[1]=0.25,row[2]=0.25,row[3]=0.25;np.push(row);for(let a=0;a<4;a++)if(row[a]!==pi[s][a])same=false}
        if(same){M.done=true;M.phase='improvement changes nothing: policy '+M.iter+' is optimal'}else{pi=np;M.iter++;ev=0;M.mode='eval';M.phase='improvement: greedy policy '+M.iter}}}}
  else{// sampled episodes of the random policy from a uniformly random non-terminal start; TD(0) with step alpha, or first-visit Monte Carlo sample averages
    const r=rng(hs(opt.seed||1,11,0)),al=opt.alpha==null?0.1:opt.alpha,sum=new Array(16).fill(0),cnt=new Array(16).fill(0);let s=-1,ep=[];M.cur=-1;
    M.step=function(){for(let k=0;k<56;k++){if(s<0){s=1+((r()*14)|0);ep=[]}
        const a=(r()*4)|0,s2=gwNext(s,a);M.samples++;
        if(kind==='td')M.V[s]+=al*(-1+M.V[s2]-M.V[s]);else ep.push(s);
        s=s2;if(gwTerm(s)){M.episodes++;if(kind==='mc'){const T=ep.length,first=new Array(16).fill(-1);for(let t=0;t<T;t++)if(first[ep[t]]<0)first[ep[t]]=t;
            for(let t=T-1;t>=0;t--){if(first[ep[t]]===t){const q=ep[t];sum[q]+=-(T-t);cnt[q]++;M.V[q]=sum[q]/cnt[q]}}}s=-1}}
      M.frames++;M.cur=s;M.phase=M.episodes+' episodes, '+M.samples+' sampled steps'}}
  return M}
function gwRms(V,T){let q=0;for(let s=1;s<15;s++){const d=V[s]-T[s];q+=d*d}return Math.sqrt(q/14)}

// ================= 2 and 3. Random walks (Example 6.2: 5 states, Example 7.1: 19 states) =================
// states 0..n+1, 0 and n+1 terminal; start in the middle; each step left or right with probability 1/2
function walk(r,n){let s=(n+1)/2;const S=[s];while(s>0&&s<n+1){s+=r()<0.5?-1:1;S.push(s)}return S}
const TV5=[0,1/6,2/6,3/6,4/6,5/6,0];
function rms5(V){let q=0;for(let i=1;i<=5;i++){const d=V[i]-TV5[i];q+=d*d}return Math.sqrt(q/5)}
// online updates on one episode S (5-state walk: reward 1 on reaching state 6, else 0; undiscounted)
function td0(V,S,a){for(let t=0;t+1<S.length;t++){const s=S[t],s2=S[t+1],rw=s2===6?1:0;V[s]+=a*(rw+V[s2]-V[s])}}
function mcA(V,S,a){const G=S[S.length-1]===6?1:0;for(let t=0;t+1<S.length;t++){const s=S[t];V[s]+=a*(G-V[s])}}
// batch fixed points over all episodes so far (what repeated presentation with a small alpha converges to; check.py iterates to confirm)
function batchMC(st){const V=[0,.5,.5,.5,.5,.5,0];for(let i=1;i<=5;i++)if(st.cnt[i]>0)V[i]=st.sumG[i]/st.cnt[i];return V}
function batchTD(st){// certainty equivalence: n_s V(s) = R_s + sum_s' N[s][s'] V(s') over visited non-terminal states, solved by Gaussian elimination
  const vis=[];for(let i=1;i<=5;i++)if(st.n[i]>0)vis.push(i);const m=vis.length,A=[],b=[];
  for(let i=0;i<m;i++){const s=vis[i],row=[];for(let j=0;j<m;j++)row.push((i===j?st.n[s]:0)-st.N[s*7+vis[j]]);A.push(row);b.push(st.R[s])}
  for(let k=0;k<m;k++)for(let i=k+1;i<m;i++){const f=A[i][k]/A[k][k];if(f===0)continue;for(let j=k;j<m;j++)A[i][j]-=f*A[k][j];b[i]-=f*b[k]}
  const x=new Array(m).fill(0);for(let i=m-1;i>=0;i--){let s=b[i];for(let j=i+1;j<m;j++)s-=A[i][j]*x[j];x[i]=s/A[i][i]}
  const V=[0,.5,.5,.5,.5,.5,0];for(let i=0;i<m;i++)V[vis[i]]=x[i];return V}
function batchAdd(st,S){const G=S[S.length-1]===6?1:0;for(let t=0;t+1<S.length;t++){const s=S[t],s2=S[t+1];st.sumG[s]+=G;st.cnt[s]++;st.n[s]++;st.N[s*7+s2]++;if(s2===6)st.R[s]+=1}}
function batchState(){return{sumG:new Array(7).fill(0),cnt:new Array(7).fill(0),n:new Array(7).fill(0),N:new Array(49).fill(0),R:new Array(7).fill(0)}}
function walks5(seed,run,E){const r=rng(hs(seed,21,run)),W=[];for(let e=0;e<E;e++)W.push(walk(r,5));return W}
// methods: [{k:'td'|'mc'|'btd'|'bmc', a:alpha}]; every method sees the same walks in a run. Returns mean RMS after 0..E episodes.
function* rw5Job(cfg){const E=cfg.episodes,R=cfg.runs,ms=cfg.methods,acc=ms.map(()=>new Array(E+1).fill(0));
  for(let run=0;run<R;run++){const W=walks5(cfg.seed,run,E);
    ms.forEach((m,mi)=>{let V=[0,.5,.5,.5,.5,.5,0];const st=batchState();acc[mi][0]+=rms5(V);
      for(let e=0;e<E;e++){const S=W[e];if(m.k==='td')td0(V,S,m.a);else if(m.k==='mc')mcA(V,S,m.a);else{batchAdd(st,S);V=m.k==='btd'?batchTD(st):batchMC(st)}acc[mi][e+1]+=rms5(V)}});
    yield (run+1)/R}
  return acc.map(a=>a.map(v=>v/R))}
// one run, recorded step by step for the animation: TD(0) and constant-alpha MC on the same walks
function rw5Trace(seed,E,aTD,aMC){const W=walks5(seed,0,E),F=[];const Vt=[0,.5,.5,.5,.5,.5,0],Vm=Vt.slice();
  F.push({e:0,t:-1,pos:3,Vt:Vt.slice(),Vm:Vm.slice(),ut:-1,um:[]});
  for(let e=0;e<E;e++){const S=W[e],T=S.length-1;
    for(let t=0;t<T;t++){const s=S[t],s2=S[t+1],rw=s2===6?1:0,old=Vt[s];Vt[s]+=aTD*(rw+Vt[s2]-Vt[s]);
      const fr={e:e+1,t,pos:s2,from:s,Vt:Vt.slice(),Vm:Vm.slice(),ut:s,old,tgt:rw+(s2===6||s2===0?0:Vt[s2]),um:[],T};
      if(t===T-1){const G=s2===6?1:0,um=[];for(let k=0;k<T;k++){const q=S[k];um.push([q,Vm[q]]);Vm[q]+=aMC*(G-Vm[q])}fr.Vm=Vm.slice();fr.um=um;fr.G=G}
      F.push(fr)}}
  return F}

// 19-state walk: reward -1 on the left exit, +1 on the right, values start at 0; true value of state i is (i - 10) / 10
const TV19=[];for(let i=0;i<=20;i++)TV19.push(i===0||i===20?0:(i-10)/10);
function rms19(V){let q=0;for(let i=1;i<=19;i++){const d=V[i]-TV19[i];q+=d*d}const r=Math.sqrt(q/19);return r===r?r:Infinity}
function walks19(seed,run,E){const r=rng(hs(seed,31,run)),W=[];for(let e=0;e<E;e++)W.push(walk(r,19));return W}
const R19=S=>S[S.length-1]===20?1:-1;
// n-step TD (Section 7.1): V(S_tau) updated at time tau+n-1 toward G = V(S_tau+n) if tau+n < T, else the final reward (all other rewards are 0)
function nstep(V,S,n,a){const T=S.length-1,RT=R19(S);for(let tau=0;tau<T;tau++){const G=tau+n<T?V[S[tau+n]]:RT,s=S[tau];V[s]+=a*(G-V[s])}}
// off-line lambda-return (Section 12.1): targets from the values held at the start of the episode, applied at its end in time order
function lret(V,S,l,a){const T=S.length-1,RT=R19(S),G=new Array(T);G[T-1]=RT;for(let t=T-2;t>=0;t--)G[t]=(1-l)*V[S[t+1]]+l*G[t+1];
  for(let t=0;t<T;t++){const s=S[t];V[s]+=a*(G[t]-V[s])}}
// TD(lambda) with accumulating traces (Section 12.2), tabular, gamma = 1
function tdl(V,S,l,a){const T=S.length-1,z=new Array(21).fill(0);for(let t=0;t<T;t++){const s=S[t],s2=S[t+1];for(let i=1;i<=19;i++)z[i]*=l;z[s]+=1;
    const d=(s2===20?1:s2===0?-1:0)+(s2===0||s2===20?0:V[s2])-V[s],ad=a*d;for(let i=1;i<=19;i++)V[i]+=ad*z[i]}}
const FAM={nstep:{f:nstep,ps:[1,2,4,8,16,32,64,128,256,512],nm:'n'},lret:{f:lret,ps:[0,0.4,0.8,0.9,0.95,0.975,0.99,1],nm:'λ'},tdl:{f:tdl,ps:[0,0.4,0.8,0.9,0.95,0.975,0.99,1],nm:'λ'}};
// the alpha grid of the 19-state sweeps: finer near 0, where the curves for large n and lambda rise steeply
const ALPHAS=[0,0.01,0.02,0.03,0.04,0.05,0.075,0.1];for(let k=3;k<=20;k++)ALPHAS.push(Math.round(k*50)/1000);
function alphas(step){const A=[];for(let k=0;k*step<=1+1e-12;k++)A.push(Math.round(k*step*1000)/1000);return A}
// mean over runs and the first E episodes of the RMS error at the end of each episode, for every (parameter, alpha); the same walks for every setting
function* rw19Job(cfg){const fam=FAM[cfg.fam],ps=cfg.ps||fam.ps,as=cfg.as||ALPHAS,R=cfg.runs,E=cfg.episodes||10,W=[];
  for(let run=0;run<R;run++)W.push(walks19(cfg.seed,run,E));
  const out=ps.map(()=>new Array(as.length).fill(0));let k=0;const K=ps.length*as.length;
  for(let pi=0;pi<ps.length;pi++)for(let ai=0;ai<as.length;ai++){let acc=0;
    for(let run=0;run<R;run++){const V=new Array(21).fill(0);for(let e=0;e<E;e++){fam.f(V,W[run][e],ps[pi],as[ai]);acc+=rms19(V)}}
    out[pi][ai]=acc/(R*E);k++;yield k/K}
  return{ps,as,err:out}}
// episode `ep` of run 0, step by step, for the credit animation: n-step TD and TD(lambda) side by side (earlier episodes run first).
// Frame t holds the values after time step t; n-step TD's last n-1 updates come after the walk has ended, as in the box of Section 7.1.
function rw19Trace(seed,ep,n,lam,a){const W=walks19(seed,0,ep+1),Vn=new Array(21).fill(0),Vl=new Array(21).fill(0);
  for(let e=0;e<ep;e++){nstep(Vn,W[e],n,a);tdl(Vl,W[e],lam,a)}
  const S=W[ep],T=S.length-1,RT=R19(S),z=new Array(21).fill(0),F=[{t:-1,pos:S[0],Vn:Vn.slice(),Vl:Vl.slice(),z:z.slice(),un:-1,dl:0}],last=Math.max(T-1,T+n-2);
  for(let t=0;t<=last;t++){const fr={t,pos:S[Math.min(t+1,T)],from:t<T?S[t]:S[T],un:-1,dl:null};
    const tau=t-n+1;if(tau>=0&&tau<T){const s=S[tau],G=tau+n<T?Vn[S[tau+n]]:RT;fr.un=s;fr.tau=tau;fr.Gn=G;fr.oldn=Vn[s];fr.boot=tau+n<T?S[tau+n]:-1;Vn[s]+=a*(G-Vn[s])}
    if(t<T){const s=S[t],s2=S[t+1];for(let i=1;i<=19;i++)z[i]*=lam;z[s]+=1;const d=(s2===20?1:s2===0?-1:0)+(s2===0||s2===20?0:Vl[s2])-Vl[s],ad=a*d;for(let i=1;i<=19;i++)Vl[i]+=ad*z[i];fr.dl=d}
    fr.Vn=Vn.slice();fr.Vl=Vl.slice();fr.z=z.slice();F.push(fr)}
  return{S,T,F,RT}}

// ================= 4. Cliff walking (Example 6.6): 4 x 12, start bottom-left, goal bottom-right, cliff between =================
const CW=12,CH=4,CS=36,CG=47;
function clStep(s,a){const r=(s/CW)|0,c=s%CW;let nr=r+GA[a][0],nc=c+GA[a][1];if(nr<0||nr>=CH||nc<0||nc>=CW){nr=r;nc=c}const n=nr*CW+nc;
  if(nr===3&&nc>0&&nc<11)return[CS,-100,false,n];return[n,-1,n===CG,n]}
function clCliff(s){const r=(s/CW)|0,c=s%CW;return r===3&&c>0&&c<11}
function epsGreedy(Q,s,eps,r){if(r()<eps)return(r()*4)|0;let b=-Infinity;const ties=[];for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b){b=q;ties.length=0;ties.push(a)}else if(q===b)ties.push(a)}
  return ties.length===1?ties[0]:ties[(r()*ties.length)|0]}
function clMax(Q,s){let b=-Infinity;for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b)b=q}return b}
function clExp(Q,s,eps){let b=-Infinity,nt=0;for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b){b=q;nt=1}else if(q===b)nt++}let e=0;for(let a=0;a<4;a++){const q=Q[s*4+a];e+=(eps/4+(q===b?(1-eps)/nt:0))*q}return e}
const ALG=['sarsa','q','esarsa'];
// one run of `alg` for E episodes; rec=true keeps each episode's path and the Q table before it (for the animation)
function clRun(alg,seed,run,cfg,rec){const r=rng(hs(seed,40+ALG.indexOf(alg),run)),eps=cfg.eps,al=cfg.alpha,E=cfg.episodes,Q=new Array(48*4).fill(0),ret=new Array(E),out={ret};
  if(rec){out.paths=[];out.Qs=[]}
  for(let e=0;e<E;e++){if(rec)out.Qs.push(Q.slice());let s=CS,G=0,n=0;const path=rec?[s]:null;let a=epsGreedy(Q,s,eps,r);
    while(true){const st=clStep(s,a),s2=st[0],rw=st[1],done=st[2];G+=rw;n++;if(rec){path.push(st[3]);if(rw===-100)path.push(CS)}
      if(done){Q[s*4+a]+=al*(rw-Q[s*4+a]);break}
      if(alg==='sarsa'){const a2=epsGreedy(Q,s2,eps,r);Q[s*4+a]+=al*(rw+Q[s2*4+a2]-Q[s*4+a]);s=s2;a=a2}
      else{const tg=alg==='q'?clMax(Q,s2):clExp(Q,s2,eps);Q[s*4+a]+=al*(rw+tg-Q[s*4+a]);s=s2;a=epsGreedy(Q,s,eps,r)}
      if(n>=100000)break}
    ret[e]=G;if(rec)out.paths.push(path)}
  out.Q=Q;return out}
// the greedy path from the start (ties to the first action in book order); length, or -1 if it falls or loops
function clGreedyPath(Q){let s=CS;const P=[s];for(let k=0;k<60;k++){let b=-Infinity,ba=0;for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b){b=q;ba=a}}const st=clStep(s,ba);
    if(st[1]===-100)return{len:-1,path:P};s=st[0];P.push(s);if(st[2])return{len:P.length-1,path:P}}return{len:-1,path:P}}
// exact expected return from the start of the epsilon-greedy policy around Q (ties split evenly), by iterative policy evaluation
function clEvalEps(Q,eps){const pi=[];for(let s=0;s<48;s++){let b=-Infinity,nt=0;for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b){b=q;nt=1}else if(q===b)nt++}
    const row=[];for(let a=0;a<4;a++)row.push(eps/4+(Q[s*4+a]===b?(1-eps)/nt:0));pi.push(row)}
  let V=new Array(48).fill(0);for(let k=0;k<200000;k++){let d=0;const W=V.slice();for(let s=0;s<48;s++){if(s===CG||clCliff(s))continue;let v=0;for(let a=0;a<4;a++){const st=clStep(s,a);v+=pi[s][a]*(st[1]+(st[2]?0:V[st[0]]))}W[s]=v;d=Math.max(d,Math.abs(v-V[s]))}V=W;if(d<1e-10)break}
  return V[CS]}
// Q* of the deterministic grid: minus the steps to the goal (stepping into the cliff: -100, back to the start)
function clQstar(){const d=new Array(48).fill(Infinity);d[CG]=0;let fr=[CG];
  while(fr.length){const nf=[];for(const g of fr)for(let s=0;s<48;s++){if(d[s]<Infinity||clCliff(s))continue;for(let a=0;a<4;a++){const st=clStep(s,a);if(st[1]===-1&&st[0]===g){d[s]=d[g]+1;nf.push(s);break}}}fr=nf}
  const Q=new Array(192).fill(0);for(let s=0;s<48;s++){if(clCliff(s)||s===CG)continue;for(let a=0;a<4;a++){const st=clStep(s,a);Q[s*4+a]=st[2]?-1:(st[1]===-100?-100-d[CS]:-1-d[st[0]])}}return Q}
// many runs of two algorithms: mean return per episode, and per run the final greedy path length
function* clJob(cfg){const E=cfg.episodes,R=cfg.runs,algs=cfg.algs,mean=algs.map(()=>new Array(E).fill(0)),plen=algs.map(()=>[]),late=algs.map(()=>0);
  for(let run=0;run<R;run++){algs.forEach((al,i)=>{const o=clRun(al,cfg.seed,run,cfg,false);for(let e=0;e<E;e++)mean[i][e]+=o.ret[e];plen[i].push(clGreedyPath(o.Q).len)});yield (run+1)/R}
  return{mean:mean.map(m=>m.map(v=>v/R)),plen}}

const E={rng,hs,GA,gwNext,gwTerm,gwEval,gwVI,gwGreedy,gwRandomPi,gwTargets,gwMethod,gwRms,walk,TV5,rms5,td0,mcA,batchMC,batchTD,batchAdd,batchState,walks5,rw5Job,rw5Trace,
  TV19,rms19,walks19,nstep,lret,tdl,FAM,alphas,ALPHAS,rw19Job,rw19Trace,R19,CW,CH,CS,CG,clStep,clCliff,epsGreedy,clRun,clGreedyPath,clEvalEps,clQstar,clJob,ALG};
root.LBE=E;if(typeof module!=='undefined'&&module.exports)module.exports=E;
})(typeof window!=='undefined'?window:globalThis);
