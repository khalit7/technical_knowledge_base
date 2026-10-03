// ---- The toy: multi-reward RL in a box (runs in the browser and in node) ----
// A policy answers questions by choosing a method (one of K; one is right for each question) and a reasoning
// length (one of M bins). Correctness needs the right method AND enough length for that question's difficulty;
// the length reward wants short answers. Rewards are rule-based and bounded in [0, 1], as the paper assumes.
// Advantages are built exactly as in the paper: GRPO (sum, then z-score per group), GDPO (z-score each objective
// per group, weighted sum, z-score over the batch), SA-MRPO (the same with w_k (1 - s_k)^gamma, s_k from the batch
// mean). One policy update per batch, so the clipped ratio is 1 and the surrogate's gradient is A * grad log pi.
(function(root){
const TOY={};
TOY.K=5;                                                      // methods per question
TOY.L=[150,300,500,750,1000,1300,1700,2200,3000,4100];         // reasoning length bins, tokens
TOY.M=TOY.L.length;
TOY.Q=200;                                                    // question types
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
TOY.rng=rng;
// the question bank: fixed (seed 7) for every run, so runs differ only in their sampling seed
TOY.bank=(function(){const r=rng(7),Q=TOY.Q,need=[],c0=[],h=[];
  for(let q=0;q<Q;q++){need.push(Math.exp(Math.log(150)+(Math.log(8000)-Math.log(150))*r()));c0.push(-1+3*r())}
  const lg=need.map(Math.log),mu=lg.reduce((a,b)=>a+b)/Q,sd=Math.sqrt(lg.reduce((a,b)=>a+(b-mu)**2,0)/Q);
  for(let q=0;q<Q;q++)h.push((lg[q]-mu)/sd);
  return {need,c0,h,star:need.map((_,q)=>q%TOY.K)}})();
// P(solve | right method, length L): saturating in L relative to the question's need
TOY.pok=(L,need)=>1-Math.exp(-1.6*L/need);
// the two settings: the length reward and the starting length habit
TOY.SET={
  budget:{name:'Binary budget (Table 1 style)',len:L=>L<=4000?1:0,phi0:[0.2,0.9,1.3,1.2,0.8,0.3,-0.3,-1.0,-1.9,-2.6],over:L=>L>4000},
  graded:{name:'Graded 1,024 to 2,048 (Table 2 style)',len:L=>L<=1024?1:L>=2048?0:(2048-L)/1024,phi0:[-2.2,-1.6,-1.0,-0.5,-0.1,0.3,0.6,0.8,0.7,0.4],over:L=>L>1024}};
function softmax(z){let m=-1e9;for(const v of z)if(v>m)m=v;const e=z.map(v=>Math.exp(v-m));const s=e.reduce((a,b)=>a+b);return e.map(v=>v/s)}
TOY.softmax=softmax;
TOY.init=function(setting){const S=TOY.SET[setting],B=TOY.bank;
  return {th:B.c0.map((c,q)=>{const z=new Array(TOY.K).fill(0);z[B.star[q]]=c;return z}),phi:S.phi0.slice(),chi:new Array(TOY.M).fill(0)}};
TOY.lenProbs=(P,q)=>softmax(P.phi.map((v,b)=>v+TOY.bank.h[q]*P.chi[b]));
// exact evaluation over every question (no sampling noise)
TOY.evaluate=function(P,setting){const S=TOY.SET[setting],B=TOY.bank;let c=0,l=0,ov=0,len=0;
  for(let q=0;q<TOY.Q;q++){const pa=softmax(P.th[q])[B.star[q]],pb=TOY.lenProbs(P,q);
    for(let b=0;b<TOY.M;b++){c+=pb[b]*pa*TOY.pok(TOY.L[b],B.need[q]);l+=pb[b]*S.len(TOY.L[b]);ov+=pb[b]*(S.over(TOY.L[b])?1:0);len+=pb[b]*TOY.L[b]}}
  const n=TOY.Q;return {acc:c/n,len:l/n,over:ov/n,tok:len/n}};
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const std=(a,m)=>{m=m==null?mean(a):m;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
TOY.mean=mean;TOY.std=std;
const EPS=1e-6;
// The advantage construction for one batch. R[k][i][j]: reward of objective k (0 correct, 1 length), query i, rollout j.
// cfg: {agg:'sum'|'dec', w:[wc,wl], gamma, only:'c'|undefined}. Returns {A (B x G), s, wt}.
TOY.advantages=function(R,cfg){const n=R.length,Bq=R[0].length,Gs=R[0][0].length,w=cfg.w||[1,1];
  if(cfg.only==='c'){const A=R[0].map(g=>{const m=mean(g),s=std(g,m);return g.map(r=>(r-m)/(s+EPS))});return {A,s:[0,0],wt:[1,0]}}
  if(cfg.agg==='sum'){const A=[];for(let i=0;i<Bq;i++){const g=[];for(let j=0;j<Gs;j++){let v=0;for(let k=0;k<n;k++)v+=w[k]*R[k][i][j];g.push(v)}const m=mean(g),s=std(g,m);A.push(g.map(r=>(r-m)/(s+EPS)))}return {A,s:[0,0],wt:w.slice()}}
  const s=[],wt=[];for(let k=0;k<n;k++){let t=0;for(const g of R[k])for(const r of g)t+=r;const sb=t/(Bq*Gs);s.push(sb);wt.push(w[k]*Math.pow(1-sb,cfg.gamma||0))}  // bounds [0,1]
  const At=[],e2=new Array(n).fill(0);for(let i=0;i<Bq;i++){const row=new Array(Gs).fill(0);for(let k=0;k<n;k++){const g=R[k][i],m=mean(g),sd=std(g,m);for(let j=0;j<Gs;j++){const v=wt[k]*(g[j]-m)/(sd+EPS);row[j]+=v;e2[k]+=v*v}}At.push(row)}
  const flat=[].concat(...At),m=mean(flat),sd=std(flat,m),et=e2.reduce((a,b)=>a+b,0);
  return {A:At.map(r=>r.map(v=>(v-m)/(sd+EPS))),s,wt,share:e2.map(v=>et?v/et:0)}};
// gradient of the loss  -(1/(B G)) sum_ij A_ij log pi(a_ij, b_ij | q_i)  (the clipped surrogate at ratio 1)
TOY.grad=function(P,qs,acts,A){const K=TOY.K,M=TOY.M,gth=P.th.map(()=>new Array(K).fill(0)),gphi=new Array(M).fill(0),gchi=new Array(M).fill(0);
  const Bq=qs.length,Gs=acts[0].length,sc=1/(Bq*Gs);
  for(let i=0;i<Bq;i++){const q=qs[i],pa=softmax(P.th[q]),pb=TOY.lenProbs(P,q),h=TOY.bank.h[q];
    for(let j=0;j<Gs;j++){const [a,b]=acts[i][j],c=-A[i][j]*sc;
      for(let x=0;x<K;x++)gth[q][x]+=c*((x===a?1:0)-pa[x]);
      for(let x=0;x<M;x++){const d=c*((x===b?1:0)-pb[x]);gphi[x]+=d;gchi[x]+=d*h}}}
  return {th:gth,phi:gphi,chi:gchi}};
TOY.METHODS={
  grpo:{n:'GRPO (sum first)',agg:'sum',w:[1,1]},
  gdpo:{n:'GDPO (γ = 0)',agg:'dec',w:[1,1],gamma:0},
  sa25:{n:'SA-MRPO γ = 0.25',agg:'dec',w:[1,1],gamma:0.25},
  sa50:{n:'SA-MRPO γ = 0.5',agg:'dec',w:[1,1],gamma:0.5},
  sa75:{n:'SA-MRPO γ = 0.75',agg:'dec',w:[1,1],gamma:0.75},
  sa100:{n:'SA-MRPO γ = 1',agg:'dec',w:[1,1],gamma:1},
  fw50:{n:'GDPO, w_len = 0.5',agg:'dec',w:[1,0.5],gamma:0},
  fw25:{n:'GDPO, w_len = 0.25',agg:'dec',w:[1,0.25],gamma:0},
  fw10:{n:'GDPO, w_len = 0.1',agg:'dec',w:[1,0.1],gamma:0},
  conly:{n:'Correctness only',only:'c'}};
// one training run. o: {setting, method (key or cfg), seed, steps, B, G, lr, every}
TOY.train=function(o){const S=TOY.SET[o.setting],cfg=typeof o.method==='string'?TOY.METHODS[o.method]:o.method,r=rng(o.seed||1);
  const T=o.steps||150,Bq=o.B||32,Gs=o.G||8,lr=o.lr||0.03,every=o.every||10,B=TOY.bank;
  const P=TOY.init(o.setting);const mo={th:P.th.map(z=>z.map(()=>0)),phi:P.phi.map(()=>0),chi:P.chi.map(()=>0)},ve={th:P.th.map(z=>z.map(()=>0)),phi:P.phi.map(()=>0),chi:P.chi.map(()=>0)};
  const log={step:[],bc:[],bl:[],s0:[],s1:[],w0:[],w1:[],mixC:[],mixL:[],shL:[],ev:[]};
  const sample=p=>{let u=r(),c=0;for(let x=0;x<p.length;x++){c+=p[x];if(u<c)return x}return p.length-1};
  const adam=(p,g,m,v,t)=>{for(let x=0;x<p.length;x++){m[x]=0.9*m[x]+0.1*g[x];v[x]=0.999*v[x]+0.001*g[x]*g[x];p[x]-=lr*(m[x]/(1-0.9**t))/(Math.sqrt(v[x]/(1-0.999**t))+1e-8)}};
  log.ev.push([0,TOY.evaluate(P,o.setting)]);
  for(let t=1;t<=T;t++){const qs=[],acts=[],Rc=[],Rl=[];
    for(let i=0;i<Bq;i++){const q=Math.floor(r()*TOY.Q);qs.push(q);const pa=softmax(P.th[q]),pb=TOY.lenProbs(P,q),ai=[],rc=[],rl=[];
      for(let j=0;j<Gs;j++){const a=sample(pa),b=sample(pb);ai.push([a,b]);const ok=a===B.star[q]&&r()<TOY.pok(TOY.L[b],B.need[q]);rc.push(ok?1:0);rl.push(S.len(TOY.L[b]))}
      acts.push(ai);Rc.push(rc);Rl.push(rl)}
    const ad=TOY.advantages([Rc,Rl],cfg),g=TOY.grad(P,qs,acts,ad.A);
    for(let q=0;q<TOY.Q;q++)adam(P.th[q],g.th[q],mo.th[q],ve.th[q],t);
    adam(P.phi,g.phi,mo.phi,ve.phi,t);adam(P.chi,g.chi,mo.chi,ve.chi,t);
    log.step.push(t);log.bc.push(mean([].concat(...Rc)));log.bl.push(mean([].concat(...Rl)));log.s0.push(ad.s[0]);log.s1.push(ad.s[1]);
    const ws=ad.wt[0]+ad.wt[1];log.w0.push(ws?ad.wt[0]/ws:0);log.w1.push(ws?ad.wt[1]/ws:0);
    log.mixC.push(mean(Rc.map(g=>std(g)>0?1:0)));log.mixL.push(mean(Rl.map(g=>std(g)>0?1:0)));log.shL.push(ad.share?ad.share[1]:null);
    if(t%every===0)log.ev.push([t,TOY.evaluate(P,o.setting)])}
  return {P,log,final:TOY.evaluate(P,o.setting)}};
if(typeof module!=='undefined')module.exports=TOY;else root.TOY=TOY;
})(typeof window!=='undefined'?window:globalThis);
