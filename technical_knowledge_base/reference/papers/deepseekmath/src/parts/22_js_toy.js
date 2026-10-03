// ---- The toy: two-digit addition with one scratch step, and every method of the paper's Table 10 ----
// Runs in the browser and in node (toy_sweep.mjs). Deterministic: every random draw comes from a seeded mulberry32.
// Question q = (a, b), a and b in 0..9. Output o = 3 digits: o1 = scratch (a correct process writes the units digit of a + b),
// o2 o3 = the answer as two digits. Reward (the verifier, a rule): 1 if 10*o2 + o3 = a + b, else 0. Process reward: step 1 is
// correct if o1 is the units digit, step 2 if the answer is. The policy is one small MLP shared by the three positions.
var TOY=(function(){
const NI=41,NH=64,NO=10,L=3;            // inputs: a and b as thermometers (a >= 1 .. a >= 9: 9 + 9), position (3), o1 (10), o2 (10)
const NP=NI*NH+NH+NH*NO+NO;              // 3,338 parameters
const NV=NI*NH+NH+NH+1;                  // critic (PPO's value model): the same trunk, a scalar head: 2,753 parameters
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function init(n,nout,seed){const r=rng(seed),p=new Float64Array(n);const s1=1/Math.sqrt(NI),s2=1/Math.sqrt(NH);
  for(let i=0;i<NI*NH;i++)p[i]=gauss(r)*s1;for(let i=NI*NH+NH;i<NI*NH+NH+NH*nout;i++)p[i]=gauss(r)*s2;return p}
const newPolicy=seed=>init(NP,NO,seed),newCritic=seed=>init(NV,1,seed);
// active input indices for (a, b, position t, prefix): thermometers make a + b a linear function of the inputs, so addition can generalise to unseen pairs
function feats(a,b,t,o1,o2){const f=[];for(let i=0;i<a;i++)f.push(i);for(let i=0;i<b;i++)f.push(9+i);f.push(18+t);if(t>=1)f.push(21+o1);if(t>=2)f.push(31+o2);return f}
// forward: returns {h, z} (hidden tanh and output pre-activations)
function fwd(p,f,nout){const h=new Float64Array(NH),bo=NI*NH,wo=bo+NH,oo=wo+NH*nout;
  for(let j=0;j<NH;j++){let s=p[bo+j];for(const i of f)s+=p[i*NH+j];h[j]=Math.tanh(s)}
  const z=new Float64Array(nout);for(let k=0;k<nout;k++){let s=p[oo+k];for(let j=0;j<NH;j++)s+=h[j]*p[wo+j*nout+k];z[k]=s}return {h,z}}
function softmax(z){let m=-1e9;for(const v of z)if(v>m)m=v;const e=z.map(v=>Math.exp(v-m));let s=0;for(const v of e)s+=v;return e.map(v=>v/s)}
function probs(p,a,b,t,o1,o2){return softmax(fwd(p,feats(a,b,t,o1,o2),NO).z)}
// backward of sum_k dz[k] * z[k] into grad g (scaled)
function bwd(p,g,f,h,dz,nout){const bo=NI*NH,wo=bo+NH,oo=wo+NH*nout;const dh=new Float64Array(NH);
  for(let k=0;k<nout;k++){const d=dz[k];if(!d)continue;g[oo+k]+=d;for(let j=0;j<NH;j++){g[wo+j*nout+k]+=d*h[j];dh[j]+=d*p[wo+j*nout+k]}}
  for(let j=0;j<NH;j++){const d=dh[j]*(1-h[j]*h[j]);if(!d)continue;g[bo+j]+=d;for(const i of f)g[i*NH+j]+=d}}
// add w * d/dθ log π(tok | ...) to g
function addLogp(p,g,a,b,t,o1,o2,tok,w){const f=feats(a,b,t,o1,o2),{h,z}=fwd(p,f,NO),pr=softmax(z);const dz=pr.map((v,k)=>w*((k===tok?1:0)-v));bwd(p,g,f,h,dz,NO);return pr[tok]}
function value(c,a,b,t,o1,o2){return fwd(c,feats(a,b,t,o1,o2),1).z[0]}
function addValue(c,g,a,b,t,o1,o2,w){const f=feats(a,b,t,o1,o2),{h}=fwd(c,f,1);bwd(c,g,f,h,[w],1)}
const sum=q=>q[0]+q[1],units=q=>sum(q)%10;
const correct=(q,o)=>10*o[1]+o[2]===sum(q)?1:0;
const stepOK=(q,o)=>o[0]===units(q)?1:0;
function sample(p,q,r,temp){const o=[];for(let t=0;t<L;t++){let pr=probs(p,q[0],q[1],t,o[0],o[1]);if(temp&&temp!==1){const z=pr.map(v=>Math.pow(v,1/temp));const s=z.reduce((x,y)=>x+y,0);pr=z.map(v=>v/s)}
  let u=r(),k=0;for(;k<NO-1;k++){u-=pr[k];if(u<0)break}o.push(k)}return o}
function greedy(p,q){const o=[];for(let t=0;t<L;t++){const pr=probs(p,q[0],q[1],t,o[0],o[1]);let k=0;for(let j=1;j<NO;j++)if(pr[j]>pr[k])k=j;o.push(k)}return o}
// exact distribution over the answer (0..99) for one question: sums over the 1,000 outputs
function answerDist(p,q){const d=new Float64Array(100);const p0=probs(p,q[0],q[1],0);
  for(let i=0;i<NO;i++){if(p0[i]<1e-12)continue;const p1=probs(p,q[0],q[1],1,i);for(let j=0;j<NO;j++){const pij=p0[i]*p1[j];if(pij<1e-14)continue;const p2=probs(p,q[0],q[1],2,i,j);for(let k=0;k<NO;k++)d[10*j+k]+=pij*p2[k]}}return d}
function seqLogp(p,q,o){let s=0;for(let t=0;t<L;t++)s+=Math.log(probs(p,q[0],q[1],t,o[0],o[1])[o[t]]);return s}
// ---- data: all 100 questions are both the SFT and the RL set (a held-out split did not transfer at this scale; see the page) ----
const ALLQ=[];for(let a=0;a<10;a++)for(let b=0;b<10;b++)ALLQ.push([a,b]);
// SFT demonstrations: four per question, written by careless annotators. Without a carry all four are right. With a carry
// (45 questions) some forget it and write only the units digit, so 7 + 7 is answered "04": one of four when a + b is 10 to 14
// (25 questions), three of four when it is 15 or 16 (17 questions: the wrong answer is the majority), all four when it is 17
// or 18 (3 questions: the demonstrations never show the right answer).
const BAD=s=>s>=17?4:s>=15?3:s>=10?1:0;
function sftDemos(qs){const D=[];for(const q of qs){const s=sum(q),u=s%10,bad=BAD(s);for(let k=0;k<4;k++)D.push([q,k<bad?[u,0,u]:[u,Math.floor(s/10),u]])}return D}
// ---- Adam ----
function adam(n,lr){return {m:new Float64Array(n),v:new Float64Array(n),t:0,lr,b1:.9,b2:.999}}
function step(p,g,o,clip){if(clip){let s=0;for(const v of g)s+=v*v;s=Math.sqrt(s);if(s>clip)for(let i=0;i<g.length;i++)g[i]*=clip/s}
  o.t++;const c1=1-Math.pow(o.b1,o.t),c2=1-Math.pow(o.b2,o.t);
  for(let i=0;i<p.length;i++){o.m[i]=o.b1*o.m[i]+(1-o.b1)*g[i];o.v[i]=o.b2*o.v[i]+(1-o.b2)*g[i]*g[i];p[i]+=o.lr*(o.m[i]/c1)/(Math.sqrt(o.v[i]/c2)+1e-8)}}
// ---- the "Instruct" model: SFT from scratch on the demonstrations (gradient ascent on mean log-likelihood) ----
function trainSFT(train,cfg){cfg=cfg||{};const p=newPolicy(cfg.seed||1),o=adam(NP,cfg.lr||0.01),D=sftDemos(train),r=rng((cfg.seed||1)+7);const B=cfg.batch||32,S=cfg.steps||400;
  for(let s=0;s<S;s++){const g=new Float64Array(NP);for(let b=0;b<B;b++){const [q,y]=D[Math.floor(r()*D.length)];for(let t=0;t<L;t++)addLogp(p,g,q[0],q[1],t,y[0],y[1],y[t],1/(L*B))}step(p,g,o)}return p}
// ---- evaluation (exact): mean P(correct) = Pass@1 at temperature 1; Pass@K = 1 - (1 - p)^K; Maj@K by seeded simulation ----
function evaluate(p,qs,opt){opt=opt||{};let acc=0,proc=0,carryForget=0,nc=0,greedyAcc=0;const per=[];
  for(const q of qs){const d=answerDist(p,q),pc=d[sum(q)];acc+=pc;per.push({q,pc,d});
    if(sum(q)>=10){nc++;carryForget+=d[units(q)]}
    const p0=probs(p,q[0],q[1],0);proc+=p0[units(q)];if(opt.greedy)greedyAcc+=correct(q,greedy(p,q))}
  const n=qs.length,res={acc:acc/n,step1:proc/n,forget:nc?carryForget/nc:0,per};if(opt.greedy)res.greedy=greedyAcc/n;return res}
const KS=[1,4,8,16,32,64];
function passK(per,k){let s=0;for(const x of per)s+=1-Math.pow(1-x.pc,k);return s/per.length}
function majK(per,k,trials,seed){const r=rng(seed||99);let s=0;
  for(const x of per){const cum=new Float64Array(100);let c=0;for(let i=0;i<100;i++){c+=x.d[i];cum[i]=c}const tgt=sum(x.q);let win=0;
    for(let tr=0;tr<trials;tr++){const cnt=new Int32Array(100);for(let j=0;j<k;j++){const u=r()*c;let lo=0,hi=99;while(lo<hi){const m=(lo+hi)>>1;if(cum[m]<u)lo=m+1;else hi=m}cnt[lo]++}
      let best=0;for(let i=0;i<100;i++)if(cnt[i]>best)best=cnt[i];if(cnt[tgt]===best){let ties=0;for(let i=0;i<100;i++)if(cnt[i]===best)ties++;win+=1/ties}}
    s+=win/trials}return s/per.length}
// ---- the methods (Table 10), one training step each. ctx holds the policy, reference, critic, optimisers, offline data ----
// Every method's update is Σ GC(q, o, t) ∇ log π(o_t), averaged as (1/B)(1/G)(1/|o|) as in Eq. 5 of the paper.
const METHODS={
  sft:{name:'SFT (more demonstrations)',online:false,reward:'none (human selection)',models:1,gc:'1'},
  rft:{name:'RFT (offline)',online:false,reward:'rule',models:1,gc:'1 if correct, else 0'},
  onrft:{name:'Online RFT',online:true,reward:'rule',models:1,gc:'1 if correct, else 0'},
  dpo:{name:'DPO (offline pairs)',online:false,reward:'rule',models:2,gc:'σ(β(log-ratio of o− minus o+)), on o+ and minus on o−'},
  ppo:{name:'PPO (critic, GAE)',online:true,reward:'rule',models:3,gc:'A_t from GAE with a learned value model'},
  grpo:{name:'GRPO, outcome (OS)',online:true,reward:'rule',models:2,gc:'(r − mean)/std + β(π_ref/π − 1)'},
  grpops:{name:'GRPO, process (PS)',online:true,reward:'rule, per step',models:2,gc:'Σ later normalised step rewards + β(π_ref/π − 1)'},
  drgrpo:{name:'Dr. GRPO (no std)',online:true,reward:'rule',models:2,gc:'r − mean + β(π_ref/π − 1)'}
};
function makeCtx(base,train,method,cfg){const c={method,cfg,train,p:Float64Array.from(base),ref:Float64Array.from(base),opt:adam(NP,cfg.lr),r:rng(cfg.seed),samples:0,steps:0,critic:null,copt:null,tokens:0};
  if(method==='ppo'){c.critic=newCritic(cfg.seed+101);c.copt=adam(NV,cfg.vlr||cfg.lr*3)}
  if(method==='sft')c.D=sftDemos(train);
  if(method==='rft'||method==='dpo'){// offline: sample K outputs per question once from the SFT model
    const r=rng(cfg.seed+55),K=cfg.G;c.D=[];c.P=[];
    for(const q of train){const os=[];for(let k=0;k<K;k++){os.push(sample(base,q,r))}c.samples+=K;
      const good=os.filter(o=>correct(q,o)),bad=os.filter(o=>!correct(q,o));
      for(const o of good)c.D.push([q,o]);
      if(good.length&&bad.length)for(let k=0;k<Math.min(good.length,bad.length);k++)c.P.push([q,good[k],bad[k],seqLogp(base,q,good[k]),seqLogp(base,q,bad[k])])}}
  return c}
function grad(c){const cfg=c.cfg,B=cfg.batch,G=cfg.G,beta=cfg.beta,g=new Float64Array(NP),p=c.p,r=c.r;let info={g};const rec=c.rec?(c.rec.length=0,c.rec):null;
  const pick=()=>c.train[Math.floor(r()*c.train.length)];
  const m=c.method;
  if(m==='sft'||m==='rft'){const D=c.D;if(!D.length)return info;
    for(let b=0;b<B*G;b++){const [q,y]=D[Math.floor(r()*D.length)];if(rec)rec.push({q,o:y});for(let t=0;t<L;t++)addLogp(p,g,q[0],q[1],t,y[0],y[1],y[t],1/(L*B*G))}}
  else if(m==='dpo'){const P=c.P;if(!P.length)return info;
    for(let b=0;b<B;b++){const [q,yw,yl,rw,rl]=P[Math.floor(r()*P.length)];if(rec)rec.push({q,yw,yl});
      const lw=seqLogp(p,q,yw),ll=seqLogp(p,q,yl);const zz=beta*((lw-rw)-(ll-rl))/L;const w=1/(1+Math.exp(zz));// σ(−z)
      for(let t=0;t<L;t++){addLogp(p,g,q[0],q[1],t,yw[0],yw[1],yw[t],beta*w/(L*B));addLogp(p,g,q[0],q[1],t,yl[0],yl[1],yl[t],-beta*w/(L*B))}}}
  else {// online methods: sample G outputs per question from the current policy (π_old = π: one update per batch)
    let rs=0;const cg=m==='ppo'?new Float64Array(NV):null;if(cg)info.cg=cg;
    for(let b=0;b<B;b++){const q=pick(),os=[];for(let k=0;k<G;k++)os.push(sample(p,q,r));c.samples+=G;
      const R=os.map(o=>correct(q,o));rs+=R.reduce((x,y)=>x+y,0);if(rec)rec.push({q,os,R});
      let A;// per-output, per-token coefficient
      if(m==='onrft'){A=os.map((o,i)=>[R[i],R[i],R[i]]);if(R.every(v=>v===0))info.zero=(info.zero||0)+1}
      else if(m==='grpo'||m==='drgrpo'){const mu=R.reduce((x,y)=>x+y,0)/G;const sd=Math.sqrt(R.reduce((x,y)=>x+(y-mu)*(y-mu),0)/(G-1));
        A=R.map(v=>{const a=m==='drgrpo'?(v-mu):(sd>0?(v-mu)/sd:0);return [a,a,a]});if(!(sd>0))info.zero=(info.zero||0)+1}
      else if(m==='grpops'){const S1=os.map(o=>stepOK(q,o)),all=S1.concat(R);const mu=all.reduce((x,y)=>x+y,0)/all.length;const sd=Math.sqrt(all.reduce((x,y)=>x+(y-mu)*(y-mu),0)/(all.length-1));
        const nz=v=>sd>0?(v-mu)/sd:0;if(all.every(v=>v===all[0]))info.zero=(info.zero||0)+1;A=os.map((o,i)=>{const a1=nz(S1[i]),a2=nz(R[i]);return [a1+a2,a2,a2]})}
      else if(m==='ppo'){// reward: rule reward at the last token minus a per-token KL penalty β log(π/π_ref) at every token; GAE(γ = 1, λ)
        const lam=cfg.lam;A=[];
        for(const [i,o] of os.entries()){const V=[],rt=[];
          for(let t=0;t<L;t++){V.push(value(c.critic,q[0],q[1],t,o[0],o[1]));const lp=Math.log(probs(p,q[0],q[1],t,o[0],o[1])[o[t]]),lr=Math.log(probs(c.ref,q[0],q[1],t,o[0],o[1])[o[t]]);rt.push(-beta*(lp-lr)+(t===L-1?R[i]:0))}
          const adv=[0,0,0];let gae=0;for(let t=L-1;t>=0;t--){const nv=t<L-1?V[t+1]:0,d=rt[t]+nv-V[t];gae=d+lam*gae;adv[t]=gae}
          A.push(adv);for(let t=0;t<L;t++){const ret=adv[t]+V[t];addValue(c.critic,cg,q[0],q[1],t,o[0],o[1],(ret-V[t])/(L*B*G))}}
        }
      for(const [i,o] of os.entries())for(let t=0;t<L;t++){let w=A[i][t];
        if(m==='grpo'||m==='grpops'||m==='drgrpo'){const pr=probs(p,q[0],q[1],t,o[0],o[1])[o[t]],pf=probs(c.ref,q[0],q[1],t,o[0],o[1])[o[t]];w+=beta*(pf/pr-1)}
        if(w)addLogp(p,g,q[0],q[1],t,o[0],o[1],o[t],w/(L*B*G))}}
    info.reward=rs/(B*G)}
  return info}
function trainStep(c){const info=grad(c);if(info.cg)step(c.critic,info.cg,c.copt);step(c.p,info.g,c.opt,c.cfg.clip||0);c.steps++;return info}
// run a method for S steps from the base model on all 100 questions, evaluating exactly every E steps
function run(base,method,cfg,S,E,onEval){const c=makeCtx(base,ALLQ,method,cfg),hist=[];
  const ev=()=>{const e=evaluate(c.p,ALLQ);const h={step:c.steps,samples:c.samples,acc:e.acc,forget:e.forget,step1:e.step1,kl:klRef(c)};hist.push(h);if(onEval)onEval(h,c,e)};
  ev();for(let s=0;s<S;s++){trainStep(c);if((s+1)%E===0)ev()}return {c,hist}}
// exact sequence-level KL(π ‖ π_ref) averaged over the training questions
function klRef(c){let s=0;for(const q of c.train){const p0=probs(c.p,q[0],q[1],0),f0=probs(c.ref,q[0],q[1],0);
  for(let i=0;i<NO;i++){const p1=probs(c.p,q[0],q[1],1,i),f1=probs(c.ref,q[0],q[1],1,i);for(let j=0;j<NO;j++){const p2=probs(c.p,q[0],q[1],2,i,j),f2=probs(c.ref,q[0],q[1],2,i,j);
    for(let k=0;k<NO;k++){const pp=p0[i]*p1[j]*p2[k];if(pp<1e-15)continue;s+=pp*Math.log(pp/(f0[i]*f1[j]*f2[k]))}}}}return s/c.train.length}
return {BAD,grad,NI,NH,NO,L,NP,NV,rng,newPolicy,newCritic,feats,fwd,softmax,probs,addLogp,value,addValue,sample,greedy,answerDist,seqLogp,ALLQ,sftDemos,adam,step,trainSFT,evaluate,KS,passK,majK,METHODS,makeCtx,trainStep,run,klRef,correct,stepOK,sum,units}})();
// the shipped base ("Instruct") model: float32 weights in base64, written by toy_sweep.mjs
TOY.decode=function(b64){const bin=typeof atob==='function'?atob(b64):Buffer.from(b64,'base64').toString('binary');const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return Float64Array.from(new Float32Array(u.buffer))};
if(typeof module!=='undefined')module.exports=TOY;
