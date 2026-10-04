// ---- Engine for this page's own visuals (no DOM; also loaded by Node in src/checks/dump_mf.mjs, whose output src/checks/recompute.py matches bit for bit).
// 1. One episode, four learners: a 3 x 6 cliff, one recorded epsilon-greedy episode, and the Q-table updates of Monte Carlo, Sarsa, Expected Sarsa and Q-learning on it.
// 2. Small exact helpers for the Reading tab: lambda-return weights, one transition two targets, the chance of falling off the cliff edge.
// 3. Maximisation bias (Sutton and Barto, Example 6.7, Figure 6.5): Q-learning against Double Q-learning.
// 4. Off-policy Monte Carlo (Examples 5.4 and 5.5, Figures 5.3 and 5.4): ordinary against weighted importance sampling.
// Random numbers: mulberry32 streams keyed by (seed, purpose, run), the same generator as the lab engine.
(function(root){
'use strict';
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function hs(seed,a,b){return(seed*7919+a*104729+b*15485863+13)>>>0}
// a standard normal from two uniforms (Box-Muller, cosine branch only)
function gauss(r){const u=r(),v=r();return Math.sqrt(-2*Math.log(1-u))*Math.cos(2*Math.PI*v)}

// ================= 1. One episode, four learners =================
// 3 rows x 6 columns; start bottom left (12), goal bottom right (17), cliff 13..16. Actions in the book's order: up, down, right, left.
// Every move costs -1; a move into the cliff costs -100 and puts the agent back on the start; a move off the grid leaves it in place. Undiscounted.
const MR=3,MC=6,MS=12,MG=17,GA=[[-1,0],[1,0],[0,1],[0,-1]],AN=['up','down','right','left'];
function mCliff(s){return s>12&&s<17}
function mStep(s,a){const r=(s/MC)|0,c=s%MC;let nr=r+GA[a][0],nc=c+GA[a][1];if(nr<0||nr>=MR||nc<0||nc>=MC){nr=r;nc=c}const n=nr*MC+nc;
  if(mCliff(n))return{s2:MS,r:-100,done:false,hit:n};return{s2:n,r:-1,done:n===MG,hit:n}}
function mEps(Q,s,eps,r){const u=r();if(u<eps)return{a:(r()*4)|0,x:true};let b=-Infinity;const t=[];for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b){b=q;t.length=0;t.push(a)}else if(q===b)t.push(a)}
  return{a:t.length===1?t[0]:t[(r()*t.length)|0],x:false}}
function mMax(Q,s){let b=-Infinity;for(let a=0;a<4;a++)if(Q[s*4+a]>b)b=Q[s*4+a];return b}
function mExp(Q,s,eps){let b=-Infinity,nt=0;for(let a=0;a<4;a++){const q=Q[s*4+a];if(q>b){b=q;nt=1}else if(q===b)nt++}let e=0;for(let a=0;a<4;a++){const q=Q[s*4+a];e+=(eps/4+(q===b?(1-eps)/nt:0))*q}return e}
// the Q table at the start of the recorded episode: Q-learning for `pre` episodes (alpha 0.5, epsilon 0.1) from zeros
function mPrior(seed,pre){const r=rng(hs(seed,50,0)),Q=new Array(MR*MC*4).fill(0);
  for(let e=0;e<pre;e++){let s=MS,n=0;while(n<1000){const a=mEps(Q,s,0.1,r).a,st=mStep(s,a);n++;Q[s*4+a]+=0.5*(st.r+(st.done?0:mMax(Q,st.s2))-Q[s*4+a]);if(st.done)break;s=st.s2}}
  return Q}
// one episode, epsilon-greedy with respect to the prior table (held fixed, so all four learners see identical experience)
function mEpisode(Q,seed,eps,maxLen){const r=rng(hs(seed,51,0)),T=[];let s=MS,c=mEps(Q,s,eps,r);
  while(T.length<maxLen){const st=mStep(s,c.a);const step={s,a:c.a,x:c.x,r:st.r,s2:st.s2,hit:st.hit,done:st.done};
    if(!st.done){const c2=mEps(Q,st.s2,eps,r);step.a2=c2.a;step.x2=c2.x;c=c2}else{step.a2=-1;step.x2=false}
    T.push(step);if(st.done)break;s=st.s2}
  return T}
// the four learners on one recorded episode. Frames: 0 = before; frame t+1 = after step t; Monte Carlo updates only after the last step (every-visit, constant alpha, in time order).
function fourLearners(Q0,T,alpha,eps){const L={mc:Q0.slice(),sarsa:Q0.slice(),esarsa:Q0.slice(),q:Q0.slice()},F=[{t:-1,Q:{mc:L.mc.slice(),sarsa:L.sarsa.slice(),esarsa:L.esarsa.slice(),q:L.q.slice()},u:{}}];
  const G=new Array(T.length);let g=0;for(let t=T.length-1;t>=0;t--){g=T[t].r+g;G[t]=g}
  for(let t=0;t<T.length;t++){const st=T[t],k=st.s*4+st.a,u={};
    // Sarsa: the next action actually taken
    {const old=L.sarsa[k],boot=st.done?0:L.sarsa[st.s2*4+st.a2],tg=st.r+boot;L.sarsa[k]=old+alpha*(tg-old);u.sarsa={old,boot,tg,nw:L.sarsa[k]}}
    // Expected Sarsa: the average over the epsilon-greedy policy at the next state
    {const old=L.esarsa[k],boot=st.done?0:mExp(L.esarsa,st.s2,eps),tg=st.r+boot;L.esarsa[k]=old+alpha*(tg-old);u.esarsa={old,boot,tg,nw:L.esarsa[k]}}
    // Q-learning: the best next action under its own estimates
    {const old=L.q[k],boot=st.done?0:mMax(L.q,st.s2),tg=st.r+boot;L.q[k]=old+alpha*(tg-old);u.q={old,boot,tg,nw:L.q[k]}}
    // Monte Carlo: nothing until the episode ends, then every visited pair toward the return that followed it
    if(t===T.length-1){u.mc=[];for(let j=0;j<T.length;j++){const kk=T[j].s*4+T[j].a,old=L.mc[kk];L.mc[kk]=old+alpha*(G[j]-old);u.mc.push({t:j,k:kk,old,tg:G[j],nw:L.mc[kk]})}}
    F.push({t,Q:{mc:L.mc.slice(),sarsa:L.sarsa.slice(),esarsa:L.esarsa.slice(),q:L.q.slice()},u})}
  return{F,G}}
// the page's default: the first seed whose episode contains an exploratory move into the cliff from the edge row, with at most 30 steps
function mDefault(){const Q0=mPrior(1,30);for(let sd=1;sd<400;sd++){const T=mEpisode(Q0,sd,0.1,60);if(T.length<=30&&T[T.length-1].done&&T.some(s=>s.r===-100&&s.x&&s.a===1))return{seed:sd,Q0,T}}return null}

// ================= 2. Small exact helpers =================
// weights of the n-step returns in the lambda-return for an episode with `left` steps to go: (1-l) l^(n-1) for n < left, l^(left-1) on the full return
function lamWeights(l,left){const w=[];for(let n=1;n<left;n++)w.push((1-l)*Math.pow(l,n-1));w.push(Math.pow(l,left-1));return w}
// the n-step returns of an episode from time t: rewards R[t..], values V of the states S[t+1..] (terminal value 0)
function nReturns(R,Vnext,g){const out=[],T=R.length;for(let n=1;n<=T;n++){let s=0;for(let k=0;k<n;k++)s+=Math.pow(g,k)*R[k];if(n<T)s+=Math.pow(g,n)*Vnext[n-1];out.push(s)}return out}
function lamReturn(R,Vnext,g,l){const G=nReturns(R,Vnext,g),w=lamWeights(l,R.length);let s=0;for(let i=0;i<G.length;i++)s+=w[i]*G[i];return{G,w,v:s}}
// one transition, two (three) targets
function twoTargets(o){const qs=[o.qBest,o.qDown,o.qO1,o.qO2],sarsa=o.R+o.g*o.qAp,ql=o.R+o.g*Math.max(...qs);let b=Math.max(...qs),nt=qs.filter(q=>q===b).length;
  let es=0;qs.forEach(q=>{es+=(o.eps/4+(q===b?(1-o.eps)/nt:0))*q});const esT=o.R+o.g*es;
  return{sarsa:{tg:sarsa,nw:o.q+o.a*(sarsa-o.q)},q:{tg:ql,nw:o.q+o.a*(ql-o.q)},es:{tg:esT,nw:o.q+o.a*(esT-o.q),boot:es}}}
function cliffFall(eps,m,k){const p=eps/m,pass=Math.pow(1-p,k);return{p,pass,fall:1-pass}}

// ================= 3. Maximisation bias: Example 6.7 =================
// A: left (0) goes to B with reward 0; right (1) ends with 0. B: nb actions, each ends with a reward drawn from N(-0.1, 1). epsilon 0.1, alpha 0.1, gamma 1, estimates start at 0, ties broken at random.
function argmaxR(q,r){let b=-Infinity;const t=[];for(let i=0;i<q.length;i++){if(q[i]>b){b=q[i];t.length=0;t.push(i)}else if(q[i]===b)t.push(i)}return t.length===1?t[0]:t[(r()*t.length)|0]}
function epsPick(q,eps,r){if(r()<eps)return(r()*q.length)|0;return argmaxR(q,r)}
// one run; returns for each episode whether A chose left, and optionally the estimates after each episode
function mxRun(alg,seed,run,cfg,rec){const r=rng(hs(seed,alg==='q'?52:53,run)),nb=cfg.nb,eps=cfg.eps,al=cfg.alpha,E=cfg.episodes,left=new Uint8Array(E),out={left};
  const A1=[0,0],B1=new Array(nb).fill(0),A2=[0,0],B2=new Array(nb).fill(0);if(rec)out.tr=[];
  for(let e=0;e<E;e++){
    if(alg==='q'){const a=epsPick(A1,eps,r);left[e]=a===0?1:0;
      if(a===0){A1[0]+=al*(0+Math.max(...B1)-A1[0]);const b=epsPick(B1,eps,r),rw=-0.1+gauss(r);B1[b]+=al*(rw-B1[b])}else A1[1]+=al*(0-A1[1])}
    else{const sA=[A1[0]+A2[0],A1[1]+A2[1]],a=epsPick(sA,eps,r);left[e]=a===0?1:0;
      if(a===0){// update A's left with one table choosing the best action in B and the other valuing it
        if(r()<0.5){const bb=argmaxR(B1,r);A1[0]+=al*(0+B2[bb]-A1[0])}else{const bb=argmaxR(B2,r);A2[0]+=al*(0+B1[bb]-A2[0])}
        const sB=B1.map((v,i)=>v+B2[i]),b=epsPick(sB,eps,r),rw=-0.1+gauss(r);
        if(r()<0.5)B1[b]+=al*(rw-B1[b]);else B2[b]+=al*(rw-B2[b])}
      else{if(r()<0.5)A1[1]+=al*(0-A1[1]);else A2[1]+=al*(0-A2[1])}}
    if(rec)out.tr.push(alg==='q'?{A:A1.slice(),B:B1.slice()}:{A:[(A1[0]+A2[0])/2,(A1[1]+A2[1])/2],B:B1.map((v,i)=>(v+B2[i])/2),A1:A1.slice(),A2:A2.slice(),B1:B1.slice(),B2:B2.slice()})}
  return out}
function* mxJob(cfg){const E=cfg.episodes,R=cfg.runs,pq=new Float64Array(E),pd=new Float64Array(E);
  for(let run=0;run<R;run++){const a=mxRun('q',cfg.seed,run,cfg,false).left,b=mxRun('dq',cfg.seed,run,cfg,false).left;for(let e=0;e<E;e++){pq[e]+=a[e];pd[e]+=b[e]}if((run&63)===63||run===R-1)yield (run+1)/R}
  const q=[],d=[];for(let e=0;e<E;e++){q.push(pq[e]/R);d.push(pd[e]/R)}return{q,d}}
// expected maximum of N independent standard normals, by quadrature
function Phi(x){const t=1/(1+0.2316419*Math.abs(x)),d=0.3989422804014327*Math.exp(-x*x/2),p=d*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return x>0?1-p:p}
function emax(N){let s=0;const h=0.001;for(let x=-8;x<=8;x+=h)s+=x*N*0.3989422804014327*Math.exp(-x*x/2)*Math.pow(Phi(x),N-1)*h;return s}

// ================= 4. Off-policy Monte Carlo =================
// Blackjack (Example 5.1): infinite deck, face cards 10, ace 1 or 11; the dealer hits below 17 and sticks on 17 or more (a usable ace counts 11).
function card(r){return Math.min(10,1+((r()*13)|0))}
// the dealer's final sum from a showing card (22 means bust)
function dealer(show,r){let sum=show,ace=show===1;const h=card(r);sum+=h;if(h===1)ace=true;
  while(true){const soft=ace&&sum+10<=21?sum+10:sum;if(soft>=17)return soft>21?22:soft;const c=card(r);sum+=c;if(c===1)ace=true;if(sum>21)return 22}}
// Example 5.4: start with player sum 13 and a usable ace (ace counted 11 plus 2), dealer showing 2. Behaviour: hit or stick with probability 1/2. Target: stick only on 20 or 21.
// returns [rho, G] for one episode: rho = product over the player's decisions of pi(a|s) / b(a|s)
function bjEpisode(r,log){let sum=13,usable=true,rho=1;
  while(true){const hit=r()<0.5,want=sum<20;rho*=(hit===want)?2:0;
    if(!hit){if(log)log.push({a:'stick',sum,ok:hit===want});break}
    const c=card(r);if(log)log.push({a:'hit',sum,ok:hit===want,c});sum+=c;if(sum>21&&usable){sum-=10;usable=false}if(sum>21){if(log)log.push({bust:sum});return[rho,-1]}}
  const d=dealer(2,r);if(log)log.push({end:sum,d});const G=d===22||sum>d?1:sum===d?0:-1;return[rho,G]}
// one run, episode by episode, for the animation: the episode's decisions and the running estimates
function bjTrace(seed,E){const r=rng(hs(seed,61,0)),F=[];let num=0,den=0;for(let e=0;e<E;e++){const log=[],x=bjEpisode(r,log);num+=x[0]*x[1];den+=x[0];F.push({log,rho:x[0],G:x[1],num,den,vo:num/(e+1),vw:den>0?num/den:0})}return F}
// exact value of the start state under the target policy (recursion over the infinite deck)
function dealerDist(show){const memo={};function go(sum,ace){const k=sum+'|'+ace;if(memo[k])return memo[k];const soft=ace&&sum+10<=21?sum+10:sum;const out={17:0,18:0,19:0,20:0,21:0,22:0};
    if(soft>=17){out[soft>21?22:soft]=1;return memo[k]=out}
    for(let v=1;v<=10;v++){const p=v===10?4/13:1/13,s2=sum+v;if(s2>21){out[22]+=p;continue}const sub=go(s2,ace||v===1);for(const x in sub)out[x]+=p*sub[x]}
    return memo[k]=out}
  const out={17:0,18:0,19:0,20:0,21:0,22:0};for(let v=1;v<=10;v++){const p=v===10?4/13:1/13,s=show+v;const sub=go(s,show===1||v===1);for(const x in sub)out[x]+=p*sub[x]}return out}
function bjExact(){const D=dealerDist(2);const stick=s=>{let v=0;for(const x in D){const d=+x,p=D[x];v+=p*(d===22||s>d?1:s===d?0:-1)}return v};
  const memo={};function vp(sum,usable){const k=sum+'|'+usable;if(k in memo)return memo[k];if(sum>=20)return memo[k]=stick(sum);let v=0;
    for(let c=1;c<=10;c++){const p=c===10?4/13:1/13;let s=sum+c,u=usable;if(s>21&&u){s-=10;u=false}v+=p*(s>21?-1:vp(s,u))}return memo[k]=v}
  return vp(13,true)}
// many runs: mean squared error of the ordinary and weighted estimates after each episode, against `truth`
function* bjJob(cfg){const E=cfg.episodes,R=cfg.runs,so=new Float64Array(E),sw=new Float64Array(E);
  for(let run=0;run<R;run++){const r=rng(hs(cfg.seed,61,run));let num=0,den=0;
    for(let e=0;e<E;e++){const x=bjEpisode(r);num+=x[0]*x[1];den+=x[0];const vo=num/(e+1),vw=den>0?num/den:0;so[e]+=(vo-cfg.truth)*(vo-cfg.truth);sw[e]+=(vw-cfg.truth)*(vw-cfg.truth)}
    yield (run+1)/R}
  const o=[],w=[];for(let e=0;e<E;e++){o.push(so[e]/R);w.push(sw[e]/R)}return{o,w}}
// Example 5.5: one state; behaviour picks left or right with probability 1/2; left returns to s with probability 0.9 (reward 0) or ends with +1; right ends with 0.
// Target: always left (value 1). First-visit ordinary importance sampling; the estimate is recorded at log-spaced episode counts.
function ivEpisode(r){let rho=1;while(true){if(r()<0.5){return[0,0]}rho*=2;if(r()<0.1)return[rho,1]}}
function logPoints(N,per){const P=[];let last=0;for(let i=0;i<=per*Math.log10(N);i++){const n=Math.round(Math.pow(10,i/per));if(n>last&&n<=N){P.push(n);last=n}}if(P[P.length-1]!==N)P.push(N);return P}
function* ivJob(cfg){const N=cfg.episodes,P=logPoints(N,cfg.per||20),runs=[];
  for(let run=0;run<cfg.runs;run++){const r=rng(hs(cfg.seed,62,run));let num=0,den=0,j=0;const vo=[],vw=[];
    for(let e=1;e<=N;e++){const x=ivEpisode(r);num+=x[0]*x[1];den+=x[0];if(e===P[j]){vo.push(num/e);vw.push(den>0?num/den:0);j++}
      if((e&0x3FFFF)===0)yield (run+e/N)/cfg.runs}
    runs.push({vo,vw})}
  return{P,runs}}

const E={rng,hs,gauss,MR,MC,MS,MG,GA,AN,mCliff,mStep,mEps,mMax,mExp,mPrior,mEpisode,fourLearners,mDefault,lamWeights,nReturns,lamReturn,twoTargets,cliffFall,
  argmaxR,epsPick,mxRun,mxJob,Phi,emax,card,dealer,bjEpisode,bjTrace,dealerDist,bjExact,bjJob,ivEpisode,logPoints,ivJob};
root.MFE=E;if(typeof module!=='undefined'&&module.exports)module.exports=E;
})(typeof window!=='undefined'?window:globalThis);
