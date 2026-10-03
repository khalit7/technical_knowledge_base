// ---- The toy: preference tuning of a tiny language model, every quantity exact ----
// A "language" of 4-word movie reviews over 12 words (20,736 possible sequences). The policy is an
// autoregressive model: one softmax for word 1 and, at positions 2 to 4, one softmax per previous word
// (444 logits in all). The reference (the "SFT model") is a hand-written grammar with 3% of each row's
// mass spread uniformly, so every sequence has pi_ref > 0 (Theorem 1's assumption). The ground-truth
// reward is a fixed "sentiment classifier" p(positive | y) in [0, 1], as in the paper's IMDb setup.
// Because the space is small, E[r*], KL(pi || pi_ref) and the KL-optimal policy of Eq. 4 are computed
// exactly by enumeration. Runs in the browser and in node (check_engine.mjs, toy_sweep.mjs).
(function(root){
const W=['film','plot','cast','was','is','very','not','so','good','great','dull','bad'];
const V=W.length,L=4,N=V*V*V*V,NP=V+3*V*V;
const IX={};W.forEach((w,i)=>IX[w]=i);
const row=(t,prev)=>t===0?0:V+(t-1)*V*V+prev*V; // offset of the softmax used at position t
// --- reference policy: the grammar noun, verb, modifier, adjective ---
const EPS=0.03;
function refProbs(){const P=new Float64Array(NP);
  const put=(off,d)=>{let s=0;for(const k in d)s+=d[k];for(let j=0;j<V;j++)P[off+j]=EPS/V;for(const k in d)P[off+IX[k]]+=(1-EPS)*d[k]/s};
  const unif={};W.forEach(w=>unif[w]=1);
  put(row(0,0),{film:.4,plot:.35,cast:.25});
  for(let p=0;p<V;p++){
    put(row(1,p),[0,1,2].includes(p)?{was:.55,is:.45}:unif);
    put(row(2,p),[3,4].includes(p)?{very:.3,not:.45,so:.25}:unif);
    put(row(3,p),p===IX.not?{good:.45,great:.15,dull:.2,bad:.2}:(p===IX.very||p===IX.so)?{good:.22,great:.1,dull:.38,bad:.3}:unif);
  }return P}
const PREF=refProbs(),LREF=new Float64Array(NP);for(let i=0;i<NP;i++)LREF[i]=Math.log(PREF[i]);
// --- ground-truth reward: a fixed "sentiment classifier" ---
const ADJ={good:1.2,great:2.2,dull:-1.4,bad:-2.0},BIAS=-0.3;
const sig=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
const lsig=x=>x>=0?-Math.log1p(Math.exp(-x)):x-Math.log1p(Math.exp(x));
const words=id=>[Math.floor(id/(V*V*V)),Math.floor(id/(V*V))%V,Math.floor(id/V)%V,id%V];
const toId=ws=>((ws[0]*V+ws[1])*V+ws[2])*V+ws[3];
const text=id=>words(id).map(i=>W[i]).join(' ');
function score(ws){let s=BIAS;for(let t=0;t<L;t++){const a=ADJ[W[ws[t]]];if(a===undefined)continue;const pv=t?W[ws[t-1]]:'';s+=a*(pv==='not'?-0.7:(pv==='very'||pv==='so')?1.4:1)}return s}
const RSTAR=new Float64Array(N),WS=new Uint8Array(N*L);
for(let id=0;id<N;id++){const ws=words(id);for(let t=0;t<L;t++)WS[id*L+t]=ws[t];RSTAR[id]=sig(score(ws))}
const grammatical=id=>{const w=words(id);return w[0]<=2&&(w[1]===3||w[1]===4)&&w[2]>=5&&w[2]<=7&&w[3]>=8};
// --- policy helpers ---
function logSoftmax(th){const lp=new Float64Array(NP);
  const rows=[0];for(let t=1;t<L;t++)for(let p=0;p<V;p++)rows.push(row(t,p));
  for(const o of rows){let m=-1e300;for(let j=0;j<V;j++)if(th[o+j]>m)m=th[o+j];let s=0;for(let j=0;j<V;j++)s+=Math.exp(th[o+j]-m);const z=m+Math.log(s);for(let j=0;j<V;j++)lp[o+j]=th[o+j]-z}
  return lp}
const ROWS=(()=>{const r=[0];for(let t=1;t<L;t++)for(let p=0;p<V;p++)r.push(row(t,p));return r})();
function seqLogp(lp,id){let s=0,prev=0;for(let t=0;t<L;t++){const w=WS[id*L+t];s+=lp[row(t,prev)+w];prev=w}return s}
// add c * d logp(id) / d theta into g (needs lp): onehot minus softmax, per used row
function addGrad(g,lp,id,c,rowc){let prev=0;for(let t=0;t<L;t++){const w=WS[id*L+t],o=row(t,prev);g[o+w]+=c;rowc[o]=(rowc[o]||0)+c;prev=w}}
function finishGrad(g,lp,rowc){for(const k in rowc){const o=+k,c=rowc[k];for(let j=0;j<V;j++)g[o+j]-=c*Math.exp(lp[o+j])}}
// exact evaluation over all 20,736 sequences
function evaluate(th){const lp=logSoftmax(th);let er=0,kl=0,gram=0;const top=[];
  for(let id=0;id<N;id++){const a=seqLogp(lp,id),p=Math.exp(a);if(p===0)continue;er+=p*RSTAR[id];kl+=p*(a-seqLogp(LREF,id));if(grammatical(id))gram+=p;top.push([p,id])}
  top.sort((x,y)=>y[0]-x[0]);
  return {reward:er,kl:Math.max(0,kl),gram,top:top.slice(0,6).map(([p,id])=>({id,p,t:text(id),r:RSTAR[id]}))}}
// the KL-optimal policy of Eq. 4 for reward r (Float64Array over sequences), as a distribution over sequences
function optimal(r,beta){const lw=new Float64Array(N);let m=-1e300;
  for(let id=0;id<N;id++){lw[id]=seqLogp(LREF,id)+r[id]/beta;if(lw[id]>m)m=lw[id]}
  let z=0;for(let id=0;id<N;id++)z+=Math.exp(lw[id]-m);const logZ=m+Math.log(z);let er=0,kl=0;
  for(let id=0;id<N;id++){const lq=lw[id]-logZ,q=Math.exp(lq);er+=q*RSTAR[id];kl+=q*(lq-seqLogp(LREF,id))}
  return {reward:er,kl:Math.max(0,kl),logZ}}
// --- randomness, data ---
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function sample(lp,R){let prev=0,id=0;for(let t=0;t<L;t++){const o=row(t,prev);let u=R(),j=0,c=Math.exp(lp[o]);while(u>c&&j<V-1){j++;c+=Math.exp(lp[o+j])}id=id*V+j;prev=j}return id}
// the paper's IMDb recipe at toy scale: groups of 4 samples from pi_ref, all 6 pairs, labelled by the
// classifier (deterministic, as in App. C.1) or by Bradley-Terry draws with scale k; ties dropped.
function makeData(o){o=o||{};const G=o.groups||1000,R=rng(o.seed||1),lab=o.labels||'det',k=o.k||8,pairs=[];
  for(let g=0;g<G;g++){const s=[0,1,2,3].map(()=>sample(LREF,R));
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=s[i],b=s[j];if(a===b||RSTAR[a]===RSTAR[b]){if(lab==='bt')R();continue}
      let aw;if(lab==='bt')aw=R()<sig(k*(RSTAR[a]-RSTAR[b]));else aw=RSTAR[a]>RSTAR[b];
      pairs.push(aw?[a,b]:[b,a])}}
  return pairs}
// --- losses: coefficient dL/dlogpi for each sequence of a pair, as a function of the margin ---
// h = (log pi(yw) - log ref(yw)) - (log pi(yl) - log ref(yl)); u = beta * h
const LOSSES={
  dpo:{f:(u,b)=>-lsig(u),d:(u,b)=>-sig(-u)*b}, // dL/dh
  ipo:{f:(u,b,h)=>(h-1/(2*b))**2,d:(u,b,h)=>2*(h-1/(2*b))},
  cdpo:{f:(u,b,h,e)=>-(1-e)*lsig(u)-e*lsig(-u),d:(u,b,h,e)=>(-(1-e)*sig(-u)+e*sig(u))*b},
  hinge:{f:(u)=>Math.max(0,1-u),d:(u,b)=>u<1?-b:0}
};
// optimisers: Adam, or RMSprop as in the paper's App. B (with linear warmup)
function makeOpt(kind,lr,warm){const m=new Float64Array(NP),v=new Float64Array(NP);let t=0;
  return g=>{t++;const a=lr*(warm?Math.min(1,t/warm):1),d=new Float64Array(NP);
    if(kind==='rmsprop'){for(let i=0;i<NP;i++){v[i]=.99*v[i]+.01*g[i]*g[i];d[i]=-a*g[i]/(Math.sqrt(v[i])+1e-8)}}
    else{for(let i=0;i<NP;i++){m[i]=.9*m[i]+.1*g[i];v[i]=.999*v[i]+.001*g[i]*g[i];d[i]=-a*(m[i]/(1-.9**t))/(Math.sqrt(v[i]/(1-.999**t))+1e-8)}}
    return d}}
// one gradient of an offline pair loss on a batch of pairs (indices into data); returns {g, loss, stats}
function pairGrad(th,lp,data,idx,o){const g=new Float64Array(NP),rowc={};let loss=0,wsum=0,acc=0;const b=o.beta,B=idx.length;
  for(const i of idx){const [yw,yl]=data[i];const lw=seqLogp(lp,yw),ll=seqLogp(lp,yl);
    let cw,cl;
    if(o.method==='sft'){loss+=-lw;cw=-1;cl=0}
    else if(o.method==='unlikelihood'){loss+=-lw+o.alpha*ll;cw=-1;cl=o.alpha}
    else if(o.loss==='simpo'){const h=(lw-ll)/L,u=b*h-o.gamma;loss+=-lsig(u);const dh=-sig(-u)*b/L;cw=dh;cl=-dh;wsum+=sig(-u);if(h>0)acc++}
    else{const h=(lw-seqLogp(LREF,yw))-(ll-seqLogp(LREF,yl)),u=b*h,F=LOSSES[o.loss||'dpo'];
      loss+=F.f(u,b,h,o.eps||0);const dh=F.d(u,b,h,o.eps||0);cw=dh;cl=-dh;wsum+=sig(-u);if(h>0)acc++}
    addGrad(g,lp,yw,cw/B,rowc);addGrad(g,lp,yl,cl/B,rowc)}
  finishGrad(g,lp,rowc);return {g,loss:loss/B,w:wsum/B,acc:acc/B}}
// reward model r_phi: linear in the same 444 indicator features (one weight per row entry used), Eq. 2
function rmScore(phi,id){let s=0,prev=0;for(let t=0;t<L;t++){const w=WS[id*L+t];s+=phi[row(t,prev)+w];prev=w}return s}
function trainRM(data,o){o=o||{};const R=rng(o.seed||7),n=data.length,perm=[...Array(n).keys()];
  for(let i=n-1;i>0;i--){const j=Math.floor(R()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]]}
  const nv=Math.floor(n*.1),val=perm.slice(0,nv),tr=perm.slice(nv);let phi=new Float64Array(NP);const opt=makeOpt('adam',o.lr||0.05,0);
  const vacc=p=>{let a=0;for(const i of val)if(rmScore(p,data[i][0])>rmScore(p,data[i][1]))a++;return a/Math.max(1,nv)};
  let best={acc:-1,phi:null,epoch:0};const B=64,log=[];
  for(let ep=1;ep<=(o.epochs||3);ep++){for(let s=0;s<tr.length;s+=B){const bt=tr.slice(s,s+B),g=new Float64Array(NP);
      for(const i of bt){const [a,b]=data[i];const d=rmScore(phi,a)-rmScore(phi,b),c=-sig(-d)/bt.length;let pa=0,pb=0;
        for(let t=0;t<L;t++){const wa=WS[a*L+t],wb=WS[b*L+t];g[row(t,pa)+wa]+=c;g[row(t,pb)+wb]-=c;pa=wa;pb=wb}}
      const d=opt(g);for(let i=0;i<NP;i++)phi[i]+=d[i]}
    const va=vacc(phi);log.push(va);if(va>best.acc)best={acc:va,phi:phi.slice(),epoch:ep}}
  // normalise so that the mean reward over the data is zero (as prior work does, Section 3)
  let mu=0;for(const [a,b] of data)mu+=rmScore(best.phi,a)+rmScore(best.phi,b);mu/=2*n;
  const r=new Float64Array(N);for(let id=0;id<N;id++)r[id]=rmScore(best.phi,id)-mu;
  return {phi:best.phi,r,valAcc:best.acc,epoch:best.epoch,log}}
// PPO with a sequence-level KL penalty in the reward (the "standard approach" of Section 3):
// R(y) = r(y) - beta (log pi(y) - log ref(y)); advantage = R minus the batch mean, over the batch std;
// clipped surrogate, 4 epochs per batch; beta adapted towards a target KL (Ziegler et al.) when given.
function ppoStep(th,st,o,R){const lp=logSoftmax(th),B=o.batch||64,ys=[],lo=[];let beta=st.beta;
  for(let i=0;i<B;i++){const y=sample(lp,R);ys.push(y);lo.push(seqLogp(lp,y))}
  const rew=ys.map((y,i)=>o.reward[y]-beta*(lo[i]-seqLogp(LREF,y)));const mu=rew.reduce((a,b)=>a+b,0)/B;
  const sd=Math.sqrt(rew.reduce((a,b)=>a+(b-mu)**2,0)/B)+1e-8,A=rew.map(r=>(r-mu)/sd);
  let klb=0;for(let i=0;i<B;i++)klb+=lo[i]-seqLogp(LREF,ys[i]);klb/=B;
  const opt=st.opt;let cur=th;
  for(let e=0;e<4;e++){const l2=logSoftmax(cur),g=new Float64Array(NP),rowc={};
    for(let i=0;i<B;i++){const rho=Math.exp(seqLogp(l2,ys[i])-lo[i]);const clipped=(A[i]>0&&rho>1.2)||(A[i]<0&&rho<0.8);if(!clipped)addGrad(g,l2,ys[i],-rho*A[i]/B,rowc)}
    finishGrad(g,l2,rowc);const d=opt(g);cur=cur.slice();for(let i=0;i<NP;i++)cur[i]+=d[i]}
  if(o.targetKL){const err=Math.max(-.2,Math.min(.2,(klb-o.targetKL)/o.targetKL));st.beta=beta*(1+0.1*err)}
  st.samples+=B;return cur}
// a full training run; returns the evaluation trace (exact reward and KL every `every` steps)
// a training run as a stepper (the page trains in slices; run() does it all at once, identically)
function makeRunner(o){const R=rng(o.seed||3);let p=LREF.slice();const trace=[],every=o.every||20,data=o.data;
  const ev=(step,extra)=>{const e=evaluate(p);trace.push(Object.assign({step,reward:e.reward,kl:e.kl,gram:e.gram},extra||{}))};
  const seen=new Uint8Array(N);if(data)for(const [a,b] of data){seen[a]=1;seen[b]=1}
  const unseen=th=>{const lp=logSoftmax(th);let m=0;for(let id=0;id<N;id++)if(!seen[id])m+=Math.exp(seqLogp(lp,id));return m};
  const cnt={samples:0,fwd:0,pairs:0};ev(0,data?{unseen:unseen(p)}:{});let s=0;
  if(o.method==='ppo'){const st={beta:o.beta,opt:makeOpt('adam',o.lr||0.01,0),samples:0};
    return {trace,cnt,get theta(){return p},get step(){return s},get beta(){return st.beta},done:()=>s>=o.steps,
      next(){s++;p=ppoStep(p,st,o,R);cnt.samples=st.samples;cnt.fwd+=st.samples?(o.batch||64)*(2+4):0;if(s%every===0||s===o.steps)ev(s,{beta:st.beta,samples:st.samples,unseen:data?unseen(p):null})}}}
  const opt=makeOpt(o.opt||'rmsprop',o.lr||0.01,o.warm==null?20:o.warm),B=o.batch||64,n=data.length;let order=[],pos=n;
  return {trace,cnt,get theta(){return p},get step(){return s},done:()=>s>=o.steps,
    next(){s++;if(pos+B>n){order=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(R()*(i+1));[order[i],order[j]]=[order[j],order[i]]}pos=0}
      const idx=order.slice(pos,pos+B);pos+=B;const lp=logSoftmax(p),r=pairGrad(p,lp,data,idx,o),d=opt(r.g);p=p.slice();for(let i=0;i<NP;i++)p[i]+=d[i];
      cnt.fwd+=2*B;cnt.pairs+=B;if(s%every===0||s===o.steps){const lp2=logSoftmax(p);let cw=0,cl=0;for(const [a,b] of data){cw+=seqLogp(lp2,a)-seqLogp(LREF,a);cl+=seqLogp(lp2,b)-seqLogp(LREF,b)}
        ev(s,{loss:r.loss,w:r.w,acc:r.acc,chosen:cw/n,rejected:cl/n,fwd:cnt.fwd,unseen:unseen(p)})}}}}
function run(o){const r=makeRunner(o);while(!r.done())r.next();return {trace:r.trace,theta:r.theta,samples:r.cnt.samples}}
const API={W,V,L,N,NP,row,PREF,LREF,RSTAR,WS,words,toId,text,score,sig,lsig,grammatical,logSoftmax,seqLogp,addGrad,finishGrad,evaluate,optimal,rng,sample,makeData,LOSSES,makeOpt,pairGrad,rmScore,trainRM,ppoStep,run,makeRunner,EPS,ADJ,BIAS};
root.TOY=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
